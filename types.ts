
export enum AppState {
  LOGIN = 'LOGIN',
  DASHBOARD = 'DASHBOARD',
  SETUP = 'SETUP',
  SIMULATION = 'SIMULATION',
  FEEDBACK = 'FEEDBACK'
}

export interface TargetPersona {
  name: string;
  role: string;
  background: string;
  personality: string;
  company: string;
  voiceType: 'masculine' | 'feminine';
}

export interface SessionData {
  user?: string;
  targetProfile: string;
  jobDescription: string;
  demographicPreference?: string;
  persona?: TargetPersona;
  previousFeedback?: FeedbackData;
}

export interface PracticeRecord {
  id: string;
  user: string;
  timestamp: number;
  duration: number; // in seconds
  session: SessionData;
  messages: MessageLog[];
  feedback: FeedbackData;
}

export interface FeedbackData {
  score: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  conversationSummary: string;
  difficultyAdjustment: string;
}

export interface MessageLog {
  role: 'user' | 'model';
  text: string;
}
