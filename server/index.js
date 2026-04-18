require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();

// Force CORS to be completely open for local development
app.use(cors({ origin: '*' }));
app.use(helmet());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Database Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB Atlas'))
    .catch(err => console.error('❌ MongoDB Error:', err));

// --- 🚀 JD ANALYSIS AGENT ---
app.post('/api/analyze-jd', async (req, res) => {
    const { jdText } = req.body;
    if (!jdText) return res.status(400).json({ error: "No text provided." });

    try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-8b" });
        
        const prompt = `Extract the top 15 technical keywords from this Job Description. Return ONLY a comma-separated list. No intro, no markdown. JD: ${jdText}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const keywordsText = response.text().trim();

        const keywords = keywordsText.split(',').map(k => k.trim()).filter(k => k.length > 0);
        res.json({ keywords });
    } catch (error) {
        console.error("❌ CRITICAL AI ERROR:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// --- 🚀 OPTIMIZATION AGENT ---
app.post('/api/optimize', async (req, res) => {
    const { text, sectionType, targetKeywords } = req.body;
    try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-8b" });
        const prompt = `Rewrite this ${sectionType} bullet point using the STAR method. Include these keywords if possible: ${targetKeywords?.join(', ')}. Text: ${text}`;
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        res.json({ optimizedText: response.text().trim() });
    } catch (error) {
        res.status(500).json({ error: "Optimization failed." });
    }
});

const PORT = 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 AI Server active on port ${PORT}`));