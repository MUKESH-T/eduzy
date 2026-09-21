export type Track = 'Python' | 'Java' | 'C++';
export type SkillLevel = 'Beginner' | 'Advanced';

export interface User {
  name: string;
  email: string;
  preferences: string;
}

export interface Question {
  id: number;
  text: string;
  type: 'mcq' | 'fill_blank' | 'logic';
  options?: string[];
  correctAnswer: string; // Used for internal validation or passed to AI
}

export interface AssessmentResult {
  score: number;
  level: SkillLevel;
  feedback: string;
  weakAreas: string[];
}

export interface Activity {
  type: 'quiz' | 'output_prediction' | 'fix_error' | 'drag_drop' | 'mini_puzzle';
  prompt: string;
  data?: string[]; // For drag drop items, or options
  correctAnswer: string;
  hint?: string;
}

export interface Module {
  id: string;
  title: string;
  description: string;
  content: string; // Markdown supported
  examples: string[];
  videoRecommendation: {
    title: string;
    searchQuery: string;
  };
  activities: Activity[];
}

export interface Course {
  id: string;
  track: Track;
  level: SkillLevel;
  modules: Module[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}
<<<<<<< HEAD
=======

export interface CertificateRecord {
  id: string;
  track: Track;
  level: SkillLevel;
  score: number;
  date: string;
  userName: string;
}
>>>>>>> ae5520bf0e2d24334e05a6e15e53058baafaa16d
