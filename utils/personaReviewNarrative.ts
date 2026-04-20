import type { TargetPersona } from '../types';

/**
 * Human-readable paragraphs summarizing the generated persona so users can verify
 * the model understood their setup (without reading the raw API instruction text).
 */
export function buildPersonaReviewParagraphs(
  persona: TargetPersona,
  targetJobDescription: string
): string[] {
  const jd = targetJobDescription.trim();
  const paragraphs: string[] = [];

  let intro = `You will practice with ${persona.name}, who works as ${persona.role} at ${persona.company}.`;
  if (persona.background.trim()) {
    intro += ` ${persona.background.trim()}`;
  }
  paragraphs.push(intro);

  if (persona.personality.trim()) {
    paragraphs.push(
      `In the simulation, they come across as: ${persona.personality.trim()}`
    );
  }

  if (jd) {
    paragraphs.push(
      `Your side of the conversation is oriented toward this job / career context: ${jd}`
    );
  }

  if (persona.demographicCuesPresent === true) {
    const band = persona.voiceAgeBand ?? 'middle';
    const gender =
      persona.voiceType === 'feminine' ? 'a feminine' : 'a masculine';
    paragraphs.push(
      `Voice: You described the contact with enough gender or age detail for the app to use ${gender} voice in a ${band} age register (U.S. English).`
    );
  } else {
    paragraphs.push(
      `Voice: Your description did not include explicit gender or age cues about the contact, so the simulation uses the default male U.S. English voice. If that does not match who you had in mind, go back and add clear cues (e.g. gender and/or life stage) in your target-person text.`
    );
  }

  return paragraphs;
}
