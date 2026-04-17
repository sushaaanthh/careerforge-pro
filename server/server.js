const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini with your API Key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// The "Magic Button" Endpoint
app.post('/api/optimize', async (req, res) => {
    const { text, sectionType } = req.body;

    if (!text) {
        return res.status(400).json({ error: "No text provided for optimization." });
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        // Professional Prompt Engineering
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