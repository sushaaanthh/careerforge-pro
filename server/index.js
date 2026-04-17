require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const connectDatabase = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB Atlas');
    } catch (error) {
        console.error('Database connection failed:', error.message);
    }
};
connectDatabase();

// --- SHARED: Model Factory ---
// FIX: gemini-1.5-flash is deprecated (EOL early 2025). Use gemini-2.0-flash.
// gemini-2.0-flash is faster, cheaper, and the current stable default.
// If you need extended context or complex reasoning, use: gemini-2.5-pro-preview-05-06
const getModel = () => genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// --- 1. JD ANALYSIS AGENT ---
app.post('/api/analyze-jd', async (req, res) => {
    const { jdText } = req.body;
    if (!jdText) return res.status(400).json({ error: "No Job Description provided." });

    try {
        const model = getModel();
        const prompt = `
            You are an expert Technical Recruiter and ATS System.
            Analyze the following Job Description and extract the top 15 most critical keywords (skills, technologies, methodologies, and core competencies).
            Return EXACTLY a comma-separated list of these keywords in plain text. Do not use markdown, bullet points, or introductory text.
            Job Description: ${jdText}
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const keywordsText = response.text().trim();
        const keywords = keywordsText.split(',').map(k => k.trim()).filter(k => k.length > 0);

        res.json({ keywords });
    } catch (error) {
        console.error("JD Analysis Error:", error);
        // Expose the underlying Gemini error message in dev so you can debug faster
        res.status(500).json({
            error: "Failed to analyze Job Description.",
            detail: process.env.NODE_ENV !== 'production' ? error.message : undefined
        });
    }
});

// --- 2. OPTIMIZATION ROUTE ---
app.post('/api/optimize', async (req, res) => {
    const { text, sectionType, targetKeywords } = req.body;

    if (!text) {
        return res.status(400).json({ error: "No text provided for optimization." });
    }

    try {
        const model = getModel();

        let keywordInstruction = "";
        if (targetKeywords && targetKeywords.length > 0) {
            keywordInstruction = `CRITICAL: Naturally incorporate as many of these target keywords as logically possible without sounding robotic: ${targetKeywords.join(', ')}`;
        }

        const prompt = `
            You are an elite Career Coach and Resume Expert. 
            Rewrite the following bullet point from the '${sectionType}' section of a resume.
            Requirements:
            1. Use strong action verbs.
            2. Follow the STAR method (Situation, Task, Action, Result).
            3. Ensure it is ATS-friendly and concise.
            4. Do not include introductory text, just provide the rewritten bullet point.
            ${keywordInstruction}

            Raw Input: ${text}
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const optimizedText = response.text().trim();

        res.json({ optimizedText });
    } catch (error) {
        console.error("Gemini API Error:", error);
        res.status(500).json({
            error: "Failed to connect to the AI Brain.",
            detail: process.env.NODE_ENV !== 'production' ? error.message : undefined
        });
    }
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server executing on port ${PORT}`);
});