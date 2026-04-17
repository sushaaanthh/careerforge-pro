require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Database Connection
const connectDatabase = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB Atlas');
    } catch (error) {
        console.error('Database connection failed:', error.message);
        // We don't exit(1) here so the AI still works even if DB is down
    }
};
connectDatabase();

// --- AI OPTIMIZATION ROUTE ---
app.post('/api/optimize', async (req, res) => {
    const { text, sectionType } = req.body;

    if (!text) {
        return res.status(400).json({ error: "No text provided for optimization." });
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
        
        const prompt = `
            You are an elite Career Coach and Resume Expert. 
            Rewrite the following bullet point from the '${sectionType}' section of a resume.
            Requirements:
            1. Use strong action verbs (e.g., 'Spearheaded', 'Optimized', 'Architected').
            2. Follow the STAR method (Situation, Task, Action, Result).
            3. Ensure it is ATS-friendly and concise.
            4. Do not include introductory text, just provide the rewritten bullet point.

            Raw Input: ${text}
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const optimizedText = response.text().trim();

        res.json({ optimizedText });
    } catch (error) {
        console.error("Gemini API Error:", error);
        res.status(500).json({ error: "Failed to connect to the AI Brain." });
    }
});

// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server executing on port ${PORT}`);
});