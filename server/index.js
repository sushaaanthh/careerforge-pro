require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const Groq = require('groq-sdk');
const puppeteer = require('puppeteer');
const Stripe = require('stripe');
const Resume = require('./src/models/models');

const app = express();

app.use(cors({
        origin: ['https://careerforge-pro-alpha.vercel.app', 'http://localhost:3005'],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(helmet());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
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

function normalizeResumeItem(item, fallbackKeys = {}) {
    const source = item || {};

    return {
        school: source.school || source.institution || fallbackKeys.school || '',
        city: source.city || source.location || fallbackKeys.city || '',
        country: source.country || fallbackKeys.country || '',
        degree: source.degree || source.title || fallbackKeys.degree || '',
        grades: source.grades || source.percentage || fallbackKeys.grades || '',
        date: source.date || source.duration || fallbackKeys.date || '',
        role: source.role || fallbackKeys.role || '',
        company: source.company || fallbackKeys.company || '',
        desc: source.desc || source.description || fallbackKeys.desc || '',
        name: source.name || source.title || fallbackKeys.name || '',
        items: source.items || fallbackKeys.items || '',
        category: source.category || fallbackKeys.category || ''
    };
}

function normalizeResumePayload(body = {}) {
    const resumeData = body.resumeData && typeof body.resumeData === 'object' ? body.resumeData : body;
    const parsedData = body.parsedData && typeof body.parsedData === 'object' ? body.parsedData : {
        Education: resumeData.education || [],
        Experience: resumeData.experience || [],
        Skills: resumeData.skills || []
    };

    return {
        ownerEmail: normalizeEmail(body.ownerEmail || resumeData.email || parsedData?.email),
        title: String(body.title || resumeData.name || parsedData?.name || 'Untitled Resume').trim() || 'Untitled Resume',
        resumeData,
        parsedData,
        personalInfo: {
            fullName: resumeData.name || parsedData?.name || '',
            email: normalizeEmail(resumeData.email || parsedData?.email),
            linkedin: body.linkedin || '',
            github: body.github || ''
        },
        education: Array.isArray(resumeData.education) ? resumeData.education.map((item) => normalizeResumeItem(item)) : [],
        experience: Array.isArray(resumeData.experience) ? resumeData.experience.map((item) => normalizeResumeItem(item)) : [],
        skills: Array.isArray(resumeData.skills) ? resumeData.skills.map((item) => normalizeResumeItem(item)) : [],
        projects: Array.isArray(resumeData.projects) ? resumeData.projects.map((item) => normalizeResumeItem(item)) : [],
        atsScore: Number(body.atsScore || resumeData.atsScore || 0)
    };
}

function serializeResume(resume) {
    return {
        id: String(resume._id),
        ownerEmail: resume.ownerEmail || '',
        title: resume.title || 'Untitled Resume',
        resumeData: resume.resumeData || {},
        parsedData: resume.parsedData || {},
        personalInfo: resume.personalInfo || {},
        education: resume.education || [],
        experience: resume.experience || [],
        skills: resume.skills || [],
        projects: resume.projects || [],
        atsScore: resume.atsScore || 0,
        createdAt: resume.createdAt,
        updatedAt: resume.updatedAt
    };
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
    return callGroqWithRetry(prompt);
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

async function generateWithSystemInstruction({ systemInstruction, contents }) {
    return callGroqWithRetry({
        systemInstruction,
        contents
    });
}

async function callGroqWithRetry(prompt, retries = 3, delay = 2000) {
    try {
        let messages = [];

        if (typeof prompt === 'object' && prompt !== null && !Array.isArray(prompt)) {
            if (prompt.systemInstruction) {
                messages.push({ role: 'system', content: prompt.systemInstruction });
            }
            if (prompt.contents) {
                messages.push({ role: 'user', content: prompt.contents });
            }
        } else if (typeof prompt === 'string') {
            messages.push({ role: 'user', content: prompt });
        }

        if (messages.length === 0) {
            throw new Error('No valid prompt provided.');
        }

        const completion = await groq.chat.completions.create({
            model: 'llama-3.1-8b-instant',
            messages,
            temperature: 0.7,
            max_tokens: 2048
        });

        const text = completion.choices[0]?.message?.content?.trim() || '';
        if (!text) {
            throw new Error('Groq returned an empty response.');
        }

        return text;
    } catch (error) {
        console.log('[Groq Error Caught]', { 
            errorMessage: error?.message, 
            errorStatus: error?.status,
            errorCode: error?.code,
            errorType: error?.type,
            errorKeys: Object.keys(error || {})
        });

        const status = Number(error?.status || error?.response?.status || error?.code);
        const errorCode = String(error?.code || error?.type || '');
        const errorMessage = String(error?.message || '');
        const isHighDemand = errorMessage.includes('high demand') || errorMessage.includes('UNAVAILABLE') || errorMessage.includes('overloaded') || errorMessage.includes('503') || errorMessage.includes('Service Unavailable');
        const isRetryable = status === 503 || status === 429 || errorCode === 'rate_limit_exceeded' || errorCode === 'overloaded' || isHighDemand;

        console.log(`[Groq] Error detected - Status: ${status}, Code: ${errorCode}, Retryable: ${isRetryable}, Retries left: ${retries}`);

        if (isRetryable && retries > 0) {
            console.log(`[Groq] Retrying... waiting ${delay}ms before retry #${4 - retries}`);
            await new Promise((resolve) => setTimeout(resolve, delay));
            return callGroqWithRetry(prompt, retries - 1, delay * 2);
        }

        if (isRetryable) {
            throw new Error('AI is currently experiencing high demand. Please try again in a few moments.');
        }

        throw error;
    }
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

app.get('/api/resumes', async (req, res) => {
    try {
        const email = normalizeEmail(req.query.email);
        const query = email ? { ownerEmail: email } : {};

        const resumes = mongoose.connection.readyState === 1
            ? await Resume.find(query).sort({ updatedAt: -1 }).lean()
            : [];

        return res.json({ resumes: resumes.map(serializeResume) });
    } catch (error) {
        console.error('Fetch resumes failed:', error.message);
        return res.status(500).json({ error: 'Unable to fetch resumes.' });
    }
});

app.post('/api/resumes', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ error: 'MongoDB is not connected.' });
        }

        const payload = normalizeResumePayload(req.body || {});
        if (!payload.ownerEmail && !payload.title) {
            return res.status(400).json({ error: 'Resume data is required.' });
        }

        const resume = await Resume.create(payload);
        return res.status(201).json({ resume: serializeResume(resume.toObject()) });
    } catch (error) {
        console.error('Save resume failed:', error.message);
        return res.status(500).json({ error: 'Unable to save resume.' });
    }
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
        const keywordsText = await callGroqWithRetry(prompt);
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

        let optimizedTextRaw;
        let lastError;
        
        // Retry loop with exponential backoff (5 attempts for high demand resilience)
        for (let attempt = 1; attempt <= 5; attempt++) {
            try {
                optimizedTextRaw = await callGroqWithRetry(prompt);
                break; // Success, exit loop
            } catch (err) {
                lastError = err;
                const errorMsg = String(err?.message || '');
                const isHighDemand = errorMsg.includes('high demand') || errorMsg.includes('UNAVAILABLE') || errorMsg.includes('Service Unavailable');
                
                if (isHighDemand && attempt < 5) {
                    // Exponential backoff: 3s, 6s, 9s, 12s
                    const waitMs = attempt * 3000;
                    console.log(`[/api/optimize] Attempt ${attempt}/5 failed - waiting ${waitMs}ms before retry...`);
                    await new Promise((resolve) => setTimeout(resolve, waitMs));
                } else if (!isHighDemand) {
                    throw err;
                }
            }
        }
        
        if (!optimizedTextRaw && lastError) {
            throw lastError;
        }

        const optimizedText = forceSingleBullet(optimizedTextRaw);
        return res.json({ optimizedText });
    } catch (error) {
        console.error("OPTIMIZATION ERROR:", error.message);
        const errorMsg = String(error?.message || '');
        const message = errorMsg.includes('high demand') || errorMsg.includes('UNAVAILABLE')
            ? 'AI is currently experiencing high demand. Please try again in a moment.'
            : error.message || 'Optimization failed.';
        return res.status(500).json({ error: message });
    }
});

app.post('/api/generate-cover-letter', async (req, res) => {
    const jdText = String(req.body?.jdText || '').trim();
    const resumeData = req.body?.resumeData || req.body?.parsedResumeData || {};

    if (!jdText) {
        return res.status(400).json({ error: 'Job description is required.' });
    }

    if (!resumeData || Object.keys(resumeData).length === 0) {
        return res.status(400).json({ error: 'Parsed resume data is required.' });
    }

    try {
        const systemInstruction = 'You are an expert executive recruiter. Write a professional, 3-paragraph cover letter based on the provided resume and Job Description. Paragraph 1: State the target role and an immediate hook based on the user\'s top achievement. Paragraph 2: Map the user\'s specific skills to the core requirements of the JD. Paragraph 3: A strong call to action. Output ONLY the plain text of the letter. No Markdown, no conversational filler.';
        const contents = `Resume data:\n${JSON.stringify(resumeData, null, 2)}\n\nJob Description:\n${jdText}`;

        const coverLetter = await callGroqWithRetry({
            systemInstruction,
            contents
        });

        return res.json({ coverLetter: String(coverLetter || '').trim() });
    } catch (error) {
        console.error('COVER LETTER ERROR:', error.message);
        return res.status(500).json({ error: error.message || 'Cover letter generation failed.' });
    }
});

app.post('/api/generate-pdf', async (req, res) => {
    const { htmlContent } = req.body;
    if (!htmlContent) return res.status(400).json({ error: "Missing HTML content." });

    let browser;
    try {
        const launchOptions = {
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage'
            ]
        };
        
        // Only set executablePath if explicitly provided in env
        if (process.env.PUPPETEER_EXECUTABLE_PATH) {
            launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
        }
        
        browser = await puppeteer.launch(launchOptions);

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