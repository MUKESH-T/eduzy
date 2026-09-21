# EDUZY - AI Powered Learning Platform

EDUZY is an AI-powered learning platform designed to help students improve their programming skills through personalized learning paths. Instead of following a generic course, EDUZY identifies weak areas in a student's chosen programming language and generates a customized roadmap using Gemini AI.

The platform provides AI-generated course content, interactive assessments, an intelligent chatbot for doubt clarification, and final evaluations to measure learning progress.

---

## ✨ Features

- 🤖 AI-generated personalized learning roadmap
- 📚 Structured programming course generation
- 📝 AI-powered quizzes and assessments
- 💬 Eduzy AI Chatbot for doubt clarification
- 🎯 Final AI-generated evaluation
- ☁️ Cloud-based data storage using Firebase

---

## 🚀 Tech Stack

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS

### Backend
- Node.js

### Database
- Firebase Cloud Firestore

### AI
- Gemini API

---

## 📌 Project Goal

The primary objective of EDUZY is to provide personalized programming education. The platform analyzes the student's selected programming language and creates a structured learning path that focuses on improving weak concepts instead of teaching everything from scratch.

---

## ⚙️ Installation

### Prerequisites

- Node.js
- npm

### Clone the Repository

```bash
https://github.com/MUKESH-T/eduzy.git
cd eduzy
```

### Install Dependencies

```bash
npm install
```

### Configure Environment Variables

`.env.local` is intentionally ignored by Git so an API key is not uploaded to GitHub. Copy the example file and add your own key:

```env
copy .env.example .env.local
```

Then edit `.env.local`:

```env
GEMINI_API_KEY=your_actual_gemini_api_key
```

Restart the Vite server after changing the key. Never commit `.env.local`, a real API key, or a built bundle containing an unrestricted key.

### GitHub Deployment

This application calls Gemini directly from the browser. Vite embeds `GEMINI_API_KEY` into the frontend build, so a GitHub Actions secret can prevent the key from appearing in the repository but cannot keep it secret from users of the deployed website.

For a public deployment, use a backend or serverless API proxy and keep the Gemini key on that server. For a private demo, you can provide `GEMINI_API_KEY` as a GitHub Actions secret during the build, but restrict and monitor that key in Google AI Studio.

### Run the Application

```bash
npm run dev
```

---

## 📂 Project Structure

```
src/
├── components/
├── pages/
├── hooks/
├── services/
├── utils/
├── assets/
└── App.tsx
```

---

## 🔮 Future Improvements

- Progress tracking dashboard
- Coding playground
- AI code reviewer
- Achievement badges
- Leaderboards
- Multi-language learning support

---

## 👨‍💻 Author

Mukesh T
