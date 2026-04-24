require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const { GoogleGenAI } = require("@google/genai");
const puppeteer = require('puppeteer');
const Stripe = require('stripe');

const app = express();

app.use(cors({
    origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(helmet());

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

const UserSchema = new mongoose.Schema({
    externalUserId: { type: String, index: true },
    email: { type: String, index: true },
    isPro: { type: Boolean, default: false }
}, { timestamps: true });
const User = mongoose.models.User || mongoose.model('User', UserSchema);

const mockUsers = new Map();
const mockFiles = new Map();

function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
}

function hasUsableStripeKey() {
    const key = String(process.env.STRIPE_SECRET_KEY || '').trim();
    return Boolean(key) && key.length > 20 && !/xxx/i.test(key);
}

function getOrCreateUser(email) {
    const key = normalizeEmail(email);
    if (!key) return null;

    if (!mockUsers.has(key)) {
        mockUsers.set(key, { email: key, isPro: false });
        mockFiles.set(key, [
            { id: 'f1', name: 'Resume_v1.pdf', updatedAt: new Date().toISOString() },
            { id: 'f2', name: 'CoverLetter_v1.txt', updatedAt: new Date().toISOString() }
        ]);
    }
    return mockUsers.get(key);
}

async function persistProAccess({ userId, email }) {
    const normalizedEmail = normalizeEmail(email);

    if (mongoose.connection.readyState === 1 && (userId || normalizedEmail)) {
        const filter = userId ? { externalUserId: userId } : { email: normalizedEmail };
        const update = {
            isPro: true,
            ...(userId ? { externalUserId: userId } : {}),
            ...(normalizedEmail ? { email: normalizedEmail } : {})
        };

        try {
            await User.findOneAndUpdate(
                filter,
                { $set: update },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
        } catch (dbError) {
            console.error('Pro access persistence failed:', dbError.message);
        }
    }

    if (normalizedEmail) {
        const user = getOrCreateUser(normalizedEmail);
        if (user) {
            user.isPro = true;
            mockUsers.set(normalizedEmail, user);
        }
    }
}

async function generateAIResponse(prompt) {
    const maxRetries = 2;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const result = await genAI.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
            });

            const text = result.text?.trim?.() || "";
            if (!text) {
                throw new Error("Gemini returned an empty response.");
            }

            return text;
        } catch (error) {
            const errorMessage = String(error?.message || "");
            const isRetriable =
                error?.status === 429 ||
                error?.status === 503 ||
                /429|503|UNAVAILABLE|RESOURCE_EXHAUSTED|overloaded/i.test(errorMessage);

            if (!isRetriable || attempt === maxRetries) {
                throw error;
            }

            await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
        }
    }

    throw new Error("Gemini request failed after retries.");
}

function sanitizeOptimizedText(text) {
    return String(text || "")
        .replace(/```[\s\S]*?```/g, " ")
        .replace(/\*\*/g, "")
        .replace(/`/g, "")
        .replace(/\r?\n+/g, " ")
        .replace(/^\s*(Here are|Here's|Below are)[^:]*:\s*/i, "")
        .replace(/\[[^\]]*\]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function forceSingleBullet(text) {
    const cleaned = sanitizeOptimizedText(text)
        .replace(/Option\s*\d+\s*:?/gi, " ")
        .replace(/\b(Situation|Task|Action|Result|Key Takeaways?)\s*:?/gi, " ")
        .replace(/\bS\/T\b\s*:?/gi, " ")
        .replace(/^[-*]\s*/g, "")
        .trim();

    const sentences = cleaned
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .filter((s) => !/^(Here are|Below are|Option\s*\d+)/i.test(s))
        .filter((s) => !/(Be Specific|Quantify|Show\s+How)/i.test(s));

    let single = sentences.slice(0, 2).join(" ").trim();
    if (!single) single = cleaned;
    if (single.length > 280) single = `${single.slice(0, 277).trim()}...`;

    return single;
}

app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    if (!stripe) return res.status(500).send('Stripe not configured.');

    const signature = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
        return res.status(400).send('Missing Stripe signature or webhook secret.');
    }

    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const paidUserId = String(session?.metadata?.userId || '').trim();
        const paidEmail = normalizeEmail(session?.metadata?.userEmail || session?.customer_details?.email);

        await persistProAccess({ userId: paidUserId, email: paidEmail });
    }

    return res.json({ received: true });
});

app.use(express.json({ limit: '2mb' }));

if (process.env.MONGODB_URI) {
    mongoose.connect(process.env.MONGODB_URI)
        .then(() => console.log('Connected to MongoDB Atlas'))
        .catch(err => console.error('MongoDB Error:', err));
} else {
    console.warn('MONGODB_URI is not set. Skipping MongoDB connection.');
}

app.get('/api/me', async (req, res) => {
    const email = normalizeEmail(req.query.email);
    if (!email) return res.status(400).json({ error: 'email query param is required' });

    const user = getOrCreateUser(email);
    if (mongoose.connection.readyState === 1) {
        try {
            const mongoUser = await User.findOne({ email }).lean();
            if (mongoUser) {
                user.isPro = Boolean(mongoUser.isPro);
                mockUsers.set(email, user);
            }
        } catch (error) {
            console.error('Mongo user lookup failed:', error.message);
        }
    }

    return res.json({ user, files: mockFiles.get(email) || [] });
});

app.post('/api/create-checkout-session', async (req, res) => {
    try {
        if (!stripe || !hasUsableStripeKey()) {
            return res.status(500).json({ error: 'Stripe is not configured with a valid test key.' });
        }

        const userId = String(req.body?.userId || '').trim();
        const email = normalizeEmail(req.body?.email);
        if (!userId) return res.status(400).json({ error: 'userId is required.' });

        if (email) {
            getOrCreateUser(email);
        }

        if (mongoose.connection.readyState === 1) {
            try {
                await User.findOneAndUpdate(
                    { externalUserId: userId },
                    {
                        $setOnInsert: {
                            externalUserId: userId,
                            email: email || undefined,
                            isPro: false
                        }
                    },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                );
            } catch (dbError) {
                console.error('Checkout pre-create Mongo upsert failed:', dbError.message);
            }
        }

        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'inr',
                    unit_amount: 49900,
                    product_data: {
                        name: 'CareerForge Pro Upgrade',
                        description: 'One-time Pro access upgrade'
                    }
                },
                quantity: 1
            }],
            success_url: 'http://localhost:3005/dashboard?session_id={CHECKOUT_SESSION_ID}',
            cancel_url: 'http://localhost:3005/dashboard',
            customer_email: email || undefined,
            metadata: {
                userId,
                userEmail: email || ''
            }
        });

        return res.json({ url: session.url, sessionId: session.id });
    } catch (error) {
        console.error('Stripe checkout error:', error.message);
        return res.status(500).json({ error: 'Unable to create checkout session.' });
    }
});

app.post('/api/analyze-jd', async (req, res) => {
    const { jdText } = req.body;
    if (!jdText) return res.status(400).json({ error: "No text provided." });

    try {
        const prompt = `Extract the top 15 technical keywords from this Job Description. Return ONLY a comma-separated list. No intro, no markdown. JD: ${jdText}`;
        const keywordsText = await generateAIResponse(prompt);
        const keywords = keywordsText.split(',').map(k => k.trim()).filter(k => k.length > 0);
        return res.json({ keywords });
    } catch (error) {
        console.error("CRITICAL AI ERROR:", error.message);
        return res.status(500).json({ error: error.message });
    }
});

app.post('/api/optimize', async (req, res) => {
    const { text, sectionType, targetKeywords } = req.body;
    try {
        const prompt = `Rewrite this ${sectionType} bullet point using STAR.
Return ONLY one final rewritten bullet in plain text.
Do not include options, labels, headings, markdown, quotes, or explanations.
Keep it concise (1-2 sentences) and professional.
Include these keywords when relevant: ${targetKeywords?.join(', ') || ''}
Original text: ${text}`;

        const optimizedTextRaw = await generateAIResponse(prompt);
        const optimizedText = forceSingleBullet(optimizedTextRaw);
        return res.json({ optimizedText });
    } catch (error) {
        console.error("OPTIMIZATION ERROR:", error.message);
        return res.status(500).json({ error: error.message || "Optimization failed." });
    }
});

app.post('/api/generate-cover-letter', async (req, res) => {
    const { jdText, resumeText, fullName } = req.body;
    if (!jdText) return res.status(400).json({ error: 'Job description is required.' });

    try {
        const prompt = `You are an expert recruiter and career writer.
Write a tailored, professional cover letter in plain text (no markdown).
Length: 3-4 short paragraphs.
Tone: concise, confident, modern.
Candidate name: ${fullName || 'Candidate'}
Candidate resume context: ${resumeText || 'Not provided'}
Target job description: ${jdText}`;

        const coverLetter = await generateAIResponse(prompt);
        return res.json({ coverLetter: String(coverLetter || '').trim() });
    } catch (error) {
        console.error("COVER LETTER ERROR:", error.message);
        return res.status(500).json({ error: error.message || "Cover letter generation failed." });
    }
});

app.post('/api/generate-pdf', async (req, res) => {
    const { htmlContent } = req.body;
    if (!htmlContent) return res.status(400).json({ error: "Missing HTML content." });

    let browser;
    try {
        browser = await puppeteer.launch({
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--single-process',
                '--no-zygote'
            ]
        });

        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

        const pdf = await page.pdf({
            format: 'A4',
            printBackground: true
        });

        const pdfBuffer = Buffer.from(pdf);
        res.set('Content-Type', 'application/pdf');
        res.set('Content-Length', String(pdfBuffer.length));
        return res.end(pdfBuffer);
    } catch (error) {
        console.error("PDF Generation Error:", error.message);
        return res.status(500).json({ error: 'Puppeteer failed', details: error.message });
    } finally {
        if (browser) await browser.close();
    }
});

const PORT = 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`AI Server active on port ${PORT}`));