export interface TargetPersona {
  name: string;
  role: string;
  background: string;
  personality: string;
  company: string;
  voiceType: 'masculine' | 'feminine';
  /** True when setup text explicitly described the contact's gender and/or age. Omitted on older saved sessions. */
  demographicCuesPresent?: boolean;
  /** Age register for Live API voice when demographicCuesPresent is true */
  voiceAgeBand?: 'youthful' | 'middle' | 'mature';
}

export interface SessionData {
  user?: string;
  targetProfile: string;
  jobDescription: string;
  persona?: TargetPersona;
  previousFeedback?: FeedbackData;
  /** Accumulated user notes about AI agent behavior; shapes Live system instructions on retry/next run. */
  agentPromptAdjustments?: string;
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

/** Per-dimension scores (0–20 each); same rubric as Session Review radar labels */
export interface FeedbackDimensionScores {
  confidence: number;
  clarity: number;
  engagement: number;
  research: number;
  impact: number;
}

export interface FeedbackData {
  /** Sum of the five dimension scores (0–100); kept in sync in app code */
  score: number;
  /** Present for new sessions; older saved history may omit */
  dimensionScores?: FeedbackDimensionScores;
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
