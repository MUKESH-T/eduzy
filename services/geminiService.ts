import { GoogleGenAI, Schema, Type } from "@google/genai";
import { Track, Question, AssessmentResult, Course, SkillLevel, Module, Activity } from '../types';

const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;

const getAI = () => {
  if (!apiKey) {
    throw new Error('Gemini API key is not configured. Add GEMINI_API_KEY to .env.local and restart the dev server.');
  }

  return new GoogleGenAI({ apiKey });
};

// --- Schemas ---

const assessmentSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.INTEGER },
          text: { type: Type.STRING },
          type: { type: Type.STRING, enum: ['mcq', 'fill_blank', 'logic'] },
          options: { type: Type.ARRAY, items: { type: Type.STRING } },
          correctAnswer: { type: Type.STRING },
        },
        required: ['id', 'text', 'type', 'correctAnswer'],
      },
    },
  },
};

const evaluationSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    score: { type: Type.NUMBER },
    level: { type: Type.STRING, enum: ['Beginner', 'Advanced'] },
    feedback: { type: Type.STRING },
    weakAreas: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ['score', 'level', 'feedback', 'weakAreas'],
};

const courseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    track: { type: Type.STRING },
    level: { type: Type.STRING },
    modules: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          content: { type: Type.STRING },
          examples: { type: Type.ARRAY, items: { type: Type.STRING } },
          videoRecommendation: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              searchQuery: { type: Type.STRING },
            },
          },
          activities: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, enum: ['quiz', 'output_prediction', 'fix_error', 'drag_drop', 'mini_puzzle'] },
                prompt: { type: Type.STRING },
                data: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctAnswer: { type: Type.STRING },
                hint: { type: Type.STRING },
              },
              required: ['type', 'prompt', 'correctAnswer'],
            },
          },
        },
        required: ['id', 'title', 'content', 'activities'],
      },
    },
  },
  required: ['modules'],
};

// --- Helpers ---

const safeParseJSON = (text: string | undefined, context: string) => {
  if (!text) {
    throw new Error(`AI returned empty response for ${context}`);
  }
  try {
    // Remove markdown code blocks if present
    const cleaned = text.replace(/```json\s*/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error(`JSON Parse Error in ${context}:`, e);
    console.log("Raw text:", text);
    throw new Error(`Failed to parse valid JSON for ${context}`);
  }
};

// --- API Calls ---

export const generateInitialAssessment = async (track: Track): Promise<Question[]> => {
  const prompt = `
    Create a programming skills assessment for ${track}.
    Include 5 MCQs, 3 Fill-in-the-blanks, and 2 Logic/problem-solving questions.
    The questions should range from basic syntax to intermediate logic to help classify a learner as Beginner or Advanced.
    Return JSON.
  `;

  const response = await getAI().models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: assessmentSchema,
    },
  });

  const data = safeParseJSON(response.text, 'Initial Assessment');
  return data.questions || [];
};

export const evaluateAssessment = async (
  track: Track,
  questions: Question[],
  userAnswers: Record<number, string>
): Promise<AssessmentResult> => {
  // Construct a summary of Q&A for the AI to grade
  const qaSummary = questions.map(q => ({
    question: q.text,
    correctAnswer: q.correctAnswer,
    userAnswer: userAnswers[q.id] || "No Answer",
    type: q.type
  }));

  const prompt = `
    Evaluate this student's ${track} assessment.
    Here are the questions and answers: ${JSON.stringify(qaSummary)}.
    
    Determine the score (0-100).
    Classify as 'Beginner' or 'Advanced'.
    - Beginner: Needs foundational learning.
    - Advanced: Can skip basics, strong syntax and logic.
    Provide feedback and list weak areas.
  `;

  const response = await getAI().models.generateContent({
    model: 'gemini-3-pro-preview', // Complex reasoning task
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: evaluationSchema,
    },
  });

  return safeParseJSON(response.text, 'Evaluation') as AssessmentResult;
};

export const generateCourse = async (
  track: Track,
  level: SkillLevel,
  weakAreas: string[]
): Promise<Course> => {
  const prompt = `
    Generate a personalized ${track} course for a ${level} learner.
    Focus on improving these weak areas: ${weakAreas.join(', ')}.
    Create exactly 5 modules.
    
    Each module must have:
    - Concise lesson content (Markdown friendly, keep it brief to avoid response truncation)
    - Code examples
    - A video recommendation title and search query
    - Interactive activities (Quiz, Fix Code, Output Prediction, etc.)
    
    IMPORTANT for Activities:
    - Make 'mini_puzzle' very simple and easy to solve (e.g., "What keyword is used to define a function?"). The answer should be a single word or short phrase.
    
    For Beginners: Start from basics.
    For Advanced: Focus on deeper concepts, memory management, advanced OOP, or concurrency depending on the language.
  `;

  const response = await getAI().models.generateContent({
    model: 'gemini-3-pro-preview', // Complex generation task
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: courseSchema,
      maxOutputTokens: 8192,
    },
  });

  const courseData = safeParseJSON(response.text, 'Course Generation');
  return {
    ...courseData,
    track,
    level,
    id: `course-${Date.now()}`
  };
};

export const generateFinalAssessment = async (track: Track, level: SkillLevel): Promise<Question[]> => {
  const prompt = `
    Create a FINAL certification exam for ${track} (${level} Level).
    Include:
    - 5 MCQs (Theory)
    - 3 Short Answer / Fill in blank (Theory)
    - 2 Code Logic Problems (Multiple choice or fill blank for simplicity in auto-grading).
    
    Make it challenging.
  `;

  const response = await getAI().models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: assessmentSchema,
    },
  });

  const data = safeParseJSON(response.text, 'Final Assessment');
  return data.questions || [];
};

export const getTutorResponseStream = async (
  history: { role: 'user' | 'model'; parts: { text: string }[] }[],
  message: string
) => {
    const chat = getAI().chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: "You are EDUZY, a friendly and helpful AI programming tutor. Help the student with their course, debug code, and explain concepts simply. Keep answers concise.",
        },
        history: history
    });

    return await chat.sendMessageStream({ message });
};