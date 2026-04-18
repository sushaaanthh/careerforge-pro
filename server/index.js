require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const { GoogleGenAI } = require("@google/genai");

const app = express();

app.use(cors({ origin: '*' }));
app.use(helmet());
app.use(express.json());

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

            // Small backoff to smooth intermittent model/API availability blips.
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
    if (!single) {
        single = cleaned;
    }

    if (single.length > 280) {
        single = `${single.slice(0, 277).trim()}...`;
    }

    return single;
}

// Database Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB Atlas'))
    .catch(err => console.error('MongoDB Error:', err));

// --- JD ANALYSIS AGENT ---
app.post('/api/analyze-jd', async (req, res) => {
    const { jdText } = req.body;
    if (!jdText) return res.status(400).json({ error: "No text provided." });

    try {
        const prompt = `Extract the top 15 technical keywords from this Job Description. Return ONLY a comma-separated list. No intro, no markdown. JD: ${jdText}`;

        const keywordsText = await generateAIResponse(prompt);

        const keywords = keywordsText.split(',').map(k => k.trim()).filter(k => k.length > 0);
        res.json({ keywords });
    } catch (error) {
        console.error("CRITICAL AI ERROR:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// --- OPTIMIZATION AGENT ---
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
        res.json({ optimizedText });
    } catch (error) {
        console.error("OPTIMIZATION ERROR:", error.message);
        res.status(500).json({ error: error.message || "Optimization failed." });
    }
});

const PORT = 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`AI Server active on port ${PORT}`));