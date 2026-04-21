# CareerForge Pro

### AI-First Resume Architect

CareerForge Pro is an enterprise-grade web application designed to construct Applicant Tracking System (ATS) optimized resumes. The system leverages advanced Generative AI to analyze job descriptions, extract critical keywords, and intelligently rewrite resume content to maximize candidate match rates.

## System Architecture

The platform is built on an AI-MERN Hybrid Stack. It prioritizes containerized deployment and rapid Large Language Model orchestration for a seamless user experience.

- **Frontend:** React 18, Custom State Management, CSS Modules
- **Backend:** Node.js, Express, MongoDB Atlas
- **AI Orchestration:** Google GenAI SDK utilizing the Gemini 2.5 Flash production model
- **Infrastructure:** Fully containerized with Docker Compose

## Repository Structure

```
careerforge-pro/
├── client/                 # React Frontend Interface
│   ├── src/
│   │   ├── components/     # Reusable UI modules
│   │   ├── hooks/          # Custom React hooks
│   │   ├── store/          # Application state management
│   │   ├── types/          # Data type definitions
│   │   ├── App.css         # Global styling
│   │   ├── App.js          # Main application component
│   │   └── index.js        # React entry point
│   ├── .dockerignore
│   ├── .env
│   ├── Dockerfile
│   └── package.json
├── server/                 # Node.js/Express Backend API
│   ├── src/                # Backend source code modules
│   ├── .dockerignore
│   ├── .env
│   ├── Dockerfile
│   ├── index.js            # Express server and AI routing
│   └── package.json
├── docker-compose.yml      # Multi-container orchestration
└── README.md
```

## Feature Milestones

### Week 1: Builder Core

- **Live Split-Screen Interface:** The application provides real-time synchronization between form inputs and the generated ATS document preview.
- **Comprehensive Schema:** The database utilizes structured data models for personal details, professional experience, technical skills, and education.
- **Centralized State:** The frontend employs scalable state management to handle complex and nested resume data structures without performance degradation.

### Week 2: AI Orchestration

- **JD Analysis Agent:** The backend parses target job descriptions to extract and rank high-priority technical keywords using semantic analysis.
- **Optimizer Agent:** The system rewrites specific resume bullet points using the STAR method (Situation, Task, Action, Result). It seamlessly integrates target keywords while maintaining a professional tone.
- **Output Sanitization:** A custom middleware pipeline strips markdown artifacts and enforces strict single-bullet responses from the AI model to ensure UI stability.

## Local Development

### Prerequisites

- Docker and Docker Compose
- Google Gemini API Key
- MongoDB Atlas Cluster URI

### Installation Steps

1. **Clone the repository:** Initialize the project locally.

2. **Configure environment variables:** Create a `.env` file in the server directory and provide the required credentials.

   ```
   PORT=5000
   MONGODB_URI=your_atlas_connection_string
   GEMINI_API_KEY=AIzaSy_your_valid_key
   ```

3. **Initialize the containers:** Use Docker to build and orchestrate the full stack.

   ```bash
   docker compose up --build -d
   ```

4. **Access the application:**
   - Frontend Interface: http://localhost:3001
   - Backend API: http://localhost:5000

## API Reference

### Extract Keywords

Analyzes a raw job description text and returns an array of prioritized technical terms.

- **Endpoint:** `POST /api/analyze-jd`
- **Payload:** `{ "jdText": "string" }`
- **Response:** `{ "keywords": ["react", "node.js", "mongodb"] }`

### Optimize Content

Rewrites user content to match industry standards and includes specific keywords.

- **Endpoint:** `POST /api/optimize`
- **Payload:** `{ "text": "string", "sectionType": "string", "targetKeywords": ["string", "string"] }`
- **Response:** `{ "optimizedText": "string" }`