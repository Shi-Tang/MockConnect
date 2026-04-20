/** Model used for JSON persona extraction in Setup (must match Setup API call). */
export const PERSONA_GENERATION_MODEL = 'gemini-3-flash-preview';

/**
 * Exact text sent as `contents` to generate the networking persona from user descriptions.
 * Single source of truth for transparency review UI and API calls.
 */
export function buildPersonaGenerationContents(
  targetPersonDescription: string,
  targetJobDescription: string
): string {
  return `Create a professional networking persona from:
          Target Person Description: ${targetPersonDescription}
          Target Job Description: ${targetJobDescription}

          demographicCuesPresent:
          Set true ONLY if the user EXPLICITLY describes the networking CONTACT (the person they will practice speaking with) with traits that matter for voice: gender (e.g. woman, female, man, male, she/her, he/him), age or life stage (e.g. 20s, 60s, teenager, retiree, senior, "in her sixties"), or clear voice/age cues about that contact.
          Set false if there are no such explicit cues—do NOT infer gender or age from job title alone (e.g. "engineer", "PM" without gender/age is NOT a cue).

          When demographicCuesPresent is false:
          - Set voiceType to "masculine" and voiceAgeBand to "middle" (the app will use the default male voice).

          When demographicCuesPresent is true:
          - Set voiceType to match the contact's described gender (masculine or feminine).
          - Set voiceAgeBand to youthful (roughly under ~35), middle (roughly 35–54), or mature (roughly 55+) based on the contact's described age or life stage. If age is unspecified but gender is, use middle.

          Infer name, role, background, personality, and company from the descriptions. Do not invent protected-class traits beyond what the user wrote.`;
}
