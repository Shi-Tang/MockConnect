/**
 * Shared rubric for Session Review UI and for the Gemini feedback scoring prompt.
 * Each dimension is scored 0–20; the headline total is the sum (0–100).
 * Keep FEEDBACK_RUBRIC descriptions in sync — they power hover text and the evaluator prompt.
 */

import type { FeedbackDimensionScores } from '../types';

/** Max points per dimension; five dimensions sum to overall 0–100 */
export const DIMENSION_MAX = 20;

export const FEEDBACK_DIMENSION_KEYS = [
  'confidence',
  'clarity',
  'engagement',
  'research',
  'impact',
] as const;

export type FeedbackDimensionKey = (typeof FEEDBACK_DIMENSION_KEYS)[number];

/** Radar chart / UI labels (PascalCase) */
export const DIMENSION_LABEL: Record<FeedbackDimensionKey, string> = {
  confidence: 'Confidence',
  clarity: 'Clarity',
  engagement: 'Engagement',
  research: 'Research',
  impact: 'Impact',
};

/** What each dimension measures — same copy in hover panel and LLM rubric */
export const FEEDBACK_RUBRIC: Record<FeedbackDimensionKey, { description: string }> = {
  confidence: {
    description:
      'How steady and self-assured you sounded—fewer long pauses, hedging, or trailing off when the stakes felt high.',
  },
  clarity: {
    description:
      'How easy it was to follow your pitch and answers: structure, concrete examples, and whether you stayed on topic.',
  },
  engagement: {
    description:
      'How much you kept the exchange alive: listening cues, follow-up questions, and back-and-forth instead of one-line replies.',
  },
  research: {
    description:
      'Signals that you used the setup you configured—persona, role, and job context—rather than generic talking points.',
  },
  impact: {
    description:
      'Whether you moved toward a goal (referral, follow-up, fit) instead of stopping at small talk.',
  },
};

export const RADAR_SCORING_EXPLANATION =
  'How your score is shown: each dimension is scored from 0–20 using the rubric below. The headline overall score (0–100) is the sum of those five scores. Hover labels use the same descriptions as the evaluator.';

export const RADAR_AXIS_LABELS = [
  'Confidence',
  'Clarity',
  'Engagement',
  'Research',
  'Impact',
] as const;

export type RadarAxisLabel = (typeof RADAR_AXIS_LABELS)[number];

/** For hover text — keyed by chart labels */
export const RADAR_AXIS_INFO: Record<RadarAxisLabel, { description: string }> = {
  Confidence: FEEDBACK_RUBRIC.confidence,
  Clarity: FEEDBACK_RUBRIC.clarity,
  Engagement: FEEDBACK_RUBRIC.engagement,
  Research: FEEDBACK_RUBRIC.research,
  Impact: FEEDBACK_RUBRIC.impact,
};

const LABEL_TO_KEY: Record<RadarAxisLabel, FeedbackDimensionKey> = {
  Confidence: 'confidence',
  Clarity: 'clarity',
  Engagement: 'engagement',
  Research: 'research',
  Impact: 'impact',
};

export function isRadarAxisLabel(v: string): v is RadarAxisLabel {
  return (RADAR_AXIS_LABELS as readonly string[]).includes(v);
}

export function clampDimensionScore(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(DIMENSION_MAX, Math.round(n)));
}

/** Sum of five dimension scores (0–100). */
export function sumDimensionScores(d: FeedbackDimensionScores): number {
  return (
    clampDimensionScore(d.confidence) +
    clampDimensionScore(d.clarity) +
    clampDimensionScore(d.engagement) +
    clampDimensionScore(d.research) +
    clampDimensionScore(d.impact)
  );
}

export function normalizeDimensionScores(raw: Partial<FeedbackDimensionScores> | undefined): FeedbackDimensionScores {
  if (raw == null) {
    return {
      confidence: 0,
      clarity: 0,
      engagement: 0,
      research: 0,
      impact: 0,
    };
  }
  const nums = FEEDBACK_DIMENSION_KEYS.map((k) => Number(raw[k]) || 0);
  const maxV = Math.max(0, ...nums);
  const sumV = nums.reduce((a, b) => a + b, 0);
  /** Earlier builds stored 0–100 per dimension; map to 0–20 */
  const legacyPerDim100 = maxV > DIMENSION_MAX || sumV > 100.5;
  const mapVal = (v: number) =>
    legacyPerDim100 ? clampDimensionScore(v / 5) : clampDimensionScore(v);
  return {
    confidence: mapVal(Number(raw.confidence) || 0),
    clarity: mapVal(Number(raw.clarity) || 0),
    engagement: mapVal(Number(raw.engagement) || 0),
    research: mapVal(Number(raw.research) || 0),
    impact: mapVal(Number(raw.impact) || 0),
  };
}

/**
 * Older saved feedback may only have `score`. Split total 0–100 into five integers 0–20 that sum exactly to `score`.
 */
export function legacyDimensionScoresFromTotal(score0to100: number): FeedbackDimensionScores {
  const s = Math.max(0, Math.min(100, Math.round(score0to100)));
  const base = Math.floor(s / 5);
  const rem = s - base * 5;
  const out = {} as FeedbackDimensionScores;
  FEEDBACK_DIMENSION_KEYS.forEach((k, i) => {
    out[k] = base + (i < rem ? 1 : 0);
  });
  return out;
}

/** Radar chart rows: each axis 0–20; `fullMark` 20 for radius scale */
export function buildRadarChartData(feedback: {
  score: number;
  dimensionScores?: FeedbackDimensionScores;
}): { subject: string; A: number; fullMark: number }[] {
  const ds = feedback.dimensionScores ?? legacyDimensionScoresFromTotal(feedback.score);
  return RADAR_AXIS_LABELS.map((label) => {
    const key = LABEL_TO_KEY[label];
    return { subject: label, A: clampDimensionScore(ds[key]), fullMark: DIMENSION_MAX };
  });
}

/** Short line for JSON schema `description` fields — ties each field to the same text as the UI tooltip */
export function dimensionScoreFieldSchemaLine(key: FeedbackDimensionKey): string {
  const label = DIMENSION_LABEL[key];
  return `Integer 0–${DIMENSION_MAX} inclusive (user only). Same standard as Session Review tooltip for **${label}**: ${FEEDBACK_RUBRIC[key].description}`;
}

/** Build the dimension-scoring section for the feedback `generateContent` prompt */
export function buildFeedbackDimensionRubricPrompt(): string {
  const lines = FEEDBACK_DIMENSION_KEYS.map((key) => {
    const label = DIMENSION_LABEL[key];
    const { description } = FEEDBACK_RUBRIC[key];
    return `        - **${label}** (JSON field \`${key}\`): ${description}`;
  }).join('\n');

  return `
        SCORING RUBRIC — For EACH of the five dimensions below, assign a single INTEGER from 0 to ${DIMENSION_MAX} (inclusive) for the USER only (not the simulated contact). The five integers MUST use exactly the same meaning as the Session Review UI (the text after each label is what users see when they hover that dimension).

${lines}

        Total score: The headline overall score is the SUM of the five integers (minimum 0, maximum 100). Output only these five numbers inside \`dimensionScores\`; the application will compute the sum. Do not output a separate overall score field.
`.trim();
}
