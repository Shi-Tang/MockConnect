import { FeedbackData, SessionData } from '../types';

/** Logged-in name; survives refresh so deep links like /dashboard work after login */
export const STORAGE_USER_KEY = 'mockconnect_user';

/** Persisted after a completed session (same browser tab) for /feedback deep links */
export const STORAGE_LAST_FEEDBACK_KEY = 'mockconnect_last_feedback';

export const PREVIEW_SESSION: SessionData = {
  user: 'Preview',
  targetProfile: 'Senior Product Manager seeking strategic product leadership roles.',
  jobDescription: 'Product management at a growth-stage B2B SaaS; cross-functional leadership.',
  persona: {
    name: 'Alex Rivera',
    role: 'Head of Product',
    background: 'Scaled multiple 0→1 product lines in enterprise software.',
    personality: 'Direct, curious, expects concise answers.',
    company: 'Northbridge Labs',
    voiceType: 'masculine',
  },
};

/** Sample Session Review for UI work when no run has finished in this tab */
export const PREVIEW_FEEDBACK: FeedbackData = {
  score: 0,
  dimensionScores: {
    confidence: 0,
    clarity: 0,
    engagement: 0,
    research: 0,
    impact: 0,
  },
  strengths: [],
  weaknesses: [
    'Issue Detected: No input provided by the user.',
    'Issue Detected: Failure to initiate a professional introduction.',
    'Issue Detected: Lack of engagement with the networking contact.',
  ],
  suggestions: [
    'Start the conversation with a strong elevator pitch highlighting your Senior Product Manager experience.',
    'Prepare strategic questions about the company’s product roadmap and Alex’s specific role.',
    'Actively drive the conversation toward a follow-up or referral rather than remaining silent.',
  ],
  conversationSummary:
    'The user provided no dialogue in the conversation log. Consequently, there was no opportunity to evaluate their networking skills, clarity of pitch, or ability to build rapport with Alex Rivera. The simulation ended without any interaction from the user.',
  difficultyAdjustment:
    'Next session will be adjusted: Maintain current difficulty level. Participation is required before difficulty can be accurately assessed.',
};

export function loadStoredFeedback(): FeedbackData | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_LAST_FEEDBACK_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as FeedbackData;
  } catch {
    return null;
  }
}

export function persistLastFeedback(data: FeedbackData): void {
  try {
    sessionStorage.setItem(STORAGE_LAST_FEEDBACK_KEY, JSON.stringify(data));
  } catch {
    /* ignore quota / private mode */
  }
}

/** Cold /simulation: use preview persona when setup was skipped (e.g. dev URL jump). */
export function mergeSessionForSimulation(session: SessionData, username: string): SessionData {
  const hasSetup =
    session.persona &&
    session.targetProfile.trim().length > 0 &&
    session.jobDescription.trim().length > 0;
  if (hasSetup) return session;
  return {
    ...PREVIEW_SESSION,
    ...session,
    persona: session.persona ?? PREVIEW_SESSION.persona,
    user: session.user ?? (username || PREVIEW_SESSION.user),
  };
}
