import { GoogleGenAI, Schema, Type } from "@google/genai";
import { Track, Question, AssessmentResult, Course, SkillLevel, Module, Activity } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const MODEL_NAME = 'gemini-flash-lite-latest'; // Gemini 2.5 Flash Lite

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
    score: { type: Type.INTEGER },
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
                     hint: { type: Type.STRING }
                 },
                 required: ['type', 'prompt', 'correctAnswer']
             }
          }
        },
        required: ['id', 'title', 'content', 'activities'],
      },
    },
  },
  required: ['modules'],
};

// --- Helpers ---

const safeParseJSON = (text: string) => {
  try {
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    if (!cleaned) return null;
    return JSON.parse(cleaned);
  } catch (e) {
    console.warn("JSON Parse Failed, attempting manual fix", e);
    return null;
  }
};

// --- API Methods ---

export const generateInitialAssessment = async (track: Track, forcedLevel?: SkillLevel): Promise<Question[]> => {
  // RULE: Exactly 10 questions: 5 MCQs, 5 Fill-in-the-blanks.
  let prompt = `Generate a proficiency assessment for ${track} programming. 
  It must have EXACTLY 10 questions:
  - 5 MCQs
  - 5 Fill-in-the-blanks
  
  Do not include logic/coding questions here. Focus on syntax and basic concepts.`;

  if (forcedLevel === 'Advanced') {
      prompt += `\nIMPORTANT: The user is retaking this course. Generate ADVANCED level questions only. Challenge their knowledge deeply.`;
  }

  prompt += `\nOutput JSON format matching the schema.`;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: assessmentSchema,
    },
  });

  const data = safeParseJSON(response.text);
  return data?.questions || [];
};

export const evaluateAssessment = async (
  track: Track, 
  questions: Question[], 
  answers: Record<number, string>
): Promise<AssessmentResult> => {
  
  const prompt = `Evaluate this ${track} assessment.
  Questions: ${JSON.stringify(questions)}
  User Answers: ${JSON.stringify(answers)}
  
  Determine:
  1. Score (0-100) based on correctness.
  2. Skill Level: 'Beginner' (<70%) or 'Advanced' (>=70%).
  3. Feedback: Brief, encouraging summary.
  4. Weak Areas: List 2-3 topics to focus on.
  
  Return JSON.`;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: evaluationSchema,
    },
  });

  const data = safeParseJSON(response.text);
  return data || { score: 0, level: 'Beginner', feedback: "Error evaluating", weakAreas: [] };
};

export const generateCourse = async (
    track: Track, 
    level: SkillLevel, 
    weakAreas: string[]
): Promise<Course> => {
    // Reduce scope slightly to ensure fit within context if needed, but 5 modules is requested.
    const prompt = `Create a personalized ${track} course for a ${level} learner.
    Weak Areas to address: ${weakAreas.join(', ')}.
    Generate EXACTLY 5 Modules.
    
    Each module must have:
    - Clear Title & Description
    - Educational Content (keep it concise, markdown supported)
    - 2 Code Examples
    - Video Recommendation (Title + Search Query)
    - 3 Interactive Activities (Mixed types: quiz, output_prediction, fix_error, drag_drop, mini_puzzle).
    
    For 'mini_puzzle' and 'fix_error', ensure the 'correctAnswer' is SHORT (1-2 words) to make validation easy.
    For 'drag_drop', 'correctAnswer' should be the correct order joined by text or simply the first item.

    Return JSON matching schema.`;

    const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: courseSchema,
        },
    });

    const data = safeParseJSON(response.text);
    
    // Defensive coding: ensure activities array exists
    const modules = (data?.modules || []).map((m: any) => ({
        ...m,
        activities: m.activities || []
    }));

    return {
        id: `course-${Date.now()}`,
        track,
        level,
        modules
    };
};

export const generateFinalAssessment = async (track: Track, level: SkillLevel): Promise<Question[]> => {
    // RULE: AT LEAST 10 Questions: 6 Theory, 4 Coding
    const prompt = `Create a Final Certification Exam for ${track} (${level}).
    It must have EXACTLY 10 Questions:
    - 6 Theory Questions (MCQs or Short Answer).
    - 4 Coding Logic Questions (Descriptive solution required, ranging from easy to advanced).
    
    The coding questions should ask for logic/pseudocode or specific outputs.
    Return JSON.`;

    const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: assessmentSchema,
        },
    });

    const data = safeParseJSON(response.text);
    return data?.questions || [];
};

export const getTutorResponseStream = async (history: any[], message: string) => {
    // Using flash lite for chat interactions
    const chat = ai.chats.create({
        model: MODEL_NAME,
        history,
        config: {
            systemInstruction: "You are EDUZY, a friendly and helpful programming tutor. Keep answers concise and educational."
        }
    });

    return chat.sendMessageStream({ message });
};

// --- PROCTORING ---

export const detectPeopleCount = async (imageBase64: string): Promise<number> => {
  try {
      const response = await ai.models.generateContent({
          model: MODEL_NAME,
          contents: {
              parts: [
                  { inlineData: { mimeType: "image/jpeg", data: imageBase64 } },
                  { text: "How many people are visible in this webcam frame? Return ONLY a JSON object: {\"count\": number}." }
              ]
          },
          config: {
              responseMimeType: "application/json",
              responseSchema: {
                  type: Type.OBJECT,
                  properties: { count: { type: Type.INTEGER } }
              }
          }
      });
      
      const data = safeParseJSON(response.text);
      return data?.count ?? 0;
  } catch (e) {
      console.error("Proctoring check failed", e);
      return 0; // Fail safe
  }
};