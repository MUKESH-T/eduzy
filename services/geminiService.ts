import { GoogleGenAI, Schema, Type } from '@google/genai';
import { Track, Question, AssessmentResult, Course, SkillLevel } from '../types';

const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;

const getAI = () => {
  if (!apiKey) {
    throw new Error('Gemini API key is not configured. Add GEMINI_API_KEY to .env.local and restart the dev server.');
  }

  return new GoogleGenAI({ apiKey });
};

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

const safeParseJSON = (text: string | undefined, context: string) => {
  if (!text) {
    throw new Error(`AI returned empty response for ${context}`);
  }

  try {
    const cleaned = text.replace(/```json\s*/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (error) {
    console.error(`JSON Parse Error in ${context}:`, error);
    throw new Error(`Failed to parse valid JSON for ${context}`);
  }
};

export const generateInitialAssessment = async (track: Track): Promise<Question[]> => {
  const response = await getAI().models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Create a programming skills assessment for ${track}. Include 5 MCQs, 3 fill-in-the-blanks, and 2 logic questions. Return JSON.`,
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
  const qaSummary = questions.map(question => ({
    question: question.text,
    correctAnswer: question.correctAnswer,
    userAnswer: userAnswers[question.id] || 'No Answer',
    type: question.type,
  }));

  const response = await getAI().models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Evaluate this student's ${track} assessment. Questions and answers: ${JSON.stringify(qaSummary)}. Determine a score from 0-100, classify as Beginner or Advanced, provide feedback, and list weak areas.`,
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
  const response = await getAI().models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Generate a personalized ${track} course for a ${level} learner focused on these weak areas: ${weakAreas.join(', ')}. Create exactly 5 concise modules with lesson content, code examples, a video recommendation, and interactive activities. Return JSON.`,
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
    id: `course-${Date.now()}`,
  };
};

export const generateFinalAssessment = async (track: Track, level: SkillLevel): Promise<Question[]> => {
  const response = await getAI().models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Create a challenging final certification exam for ${track} at ${level} level with 5 MCQs, 3 short-answer questions, and 2 code logic questions. Return JSON.`,
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
      systemInstruction: 'You are EDUZY, a friendly and helpful AI programming tutor. Help the student with their course, debug code, and explain concepts simply. Keep answers concise.',
    },
    history,
  });

  return chat.sendMessageStream({ message });
};
