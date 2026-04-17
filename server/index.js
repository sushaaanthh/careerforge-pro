require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();

// --- MIDDLEWARE ---
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// --- ENV VALIDATION ---
if (!process.env.GEMINI_API_KEY) {
    console.error("❌ Missing GEMINI_API_KEY in .env file");
    process.exit(1);
}

// --- GEMINI INIT (Official SDK) ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- DB CONNECTION ---
const connectDatabase = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB Atlas');
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
    }
};
connectDatabase();

// --- HELPER: Gemini Call Wrapper ---
const generateAIResponse = async (prompt) => {
    try {
        // Using Gemini 1.5 Flash as per Q4 Roadmap mandate
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("❌ Gemini Error:", error?.message || error);
        throw new Error("AI request failed");
    }
};

// ===============================
// 🚀 1. JD ANALYSIS AGENT (Week 2/3 Mandate)
// ===============================
app.post('/api/analyze-jd', async (req, res) => {
    const { jdText } = req.body;

    if (!jdText) {
        return res.status(400).json({ error: "No Job Description provided." });
    }

    try {
        const prompt = `
            You are an expert Technical Recruiter and ATS system.
            Task: Extract the TOP 15 most important keywords from the job description.
            Rules:
            - Only return comma-separated keywords
            - No explanation, no numbering, no markdown
            - Focus on: skills, tools, technologies, and frameworks.
            Job Description:
            ${jdText}
        `;

        const keywordsText = await generateAIResponse(prompt);

        // Clean and format keywords into an array
        const keywords = keywordsText
            .split(',')
            .map(k => k.trim())
            .filter(k => k.length > 0);

        res.json({ keywords });

    } catch (error) {
        res.status(500).json({ error: "Failed to analyze Job Description." });
    }
});

// ===============================
// 🚀 2. OPTIMIZATION AGENT (The "Magic" Button)
// ===============================
app.post('/api/optimize', async (req, res) => {
    const { text, sectionType, targetKeywords } = req.body;

    if (!text) {
        return res.status(400).json({ error: "No text provided." });
    }

    try {
        let keywordInstruction = "";
        if (targetKeywords && targetKeywords.length > 0) {
            keywordInstruction = `Naturally include these keywords where relevant: ${targetKeywords.join(', ')}`;
        }

        const prompt = `
            You are an elite resume optimizer for CareerForge Pro.
            Rewrite the following content for the '${sectionType}' section.
            Rules:
            - Use strong action verbs and the STAR method.
            - Ensure it is ATS optimized.
            - Keep it concise.
            - ${keywordInstruction}
            Input: ${text}
        `;

        const optimizedText = await generateAIResponse(prompt);
        res.json({ optimizedText: optimizedText.trim() });

    } catch (error) {
        res.status(500).json({ error: "Optimization failed." });
    }
});

// --- HEALTH CHECK ---
app.get('/health', (req, res) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});