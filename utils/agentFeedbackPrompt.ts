/**
 * Turns free-form (and optional chip) user feedback about the AI agent into
 * explicit system-instruction bullets for the Live session.
 */
export function buildAgentFeedbackSystemBlock(raw: string | undefined): string {
  const text = raw?.trim();
  if (!text) return '';

  const t = text.toLowerCase();
  const directives: string[] = [];

  if (
    /\brude\b|harsh|cold|curt|abrasive|condescending|dismissive|unprofessional tone|bad attitude/.test(
      t
    )
  ) {
    directives.push(
      'Tone: stay consistently professional and respectful. Avoid curt, dismissive, or condescending phrasing; remain collegial even when skeptical or pushing back.'
    );
  }

  if (
    /background|unfam|didn'?t know|ignored|setup|configuration|didn'?t read|off[\s-]?topic|forgot|persona|what i (wrote|described)/.test(
      t
    )
  ) {
    directives.push(
      'Context: actively ground your replies in the Target Person Description and the user\'s Job Description they configured. Refer to specific details (role, company, goals) so you clearly "know" their setup.'
    );
  }

  if (/vague|generic|not specific|surface|shallow/.test(t)) {
    directives.push(
      'Specificity: prefer concrete reactions and references over generic networking platitudes when possible.'
    );
  }

  if (/interrupt|rushed|dominat|talked over|didn'?t listen|cut off/.test(t)) {
    directives.push(
      'Pacing: leave room for the user to finish; avoid monologues or cutting them off.'
    );
  }

  if (/too nice|too easy|unrealistic|not challenging/.test(t)) {
    directives.push(
      'Difficulty: keep realism—politely skeptical when appropriate—but still follow the tone and context rules above.'
    );
  }

  directives.push(`User note (verbatim): ${text}`);

  return `
        User feedback about YOUR performance as the simulated contact (apply on top of all other rules):
        ${directives.map((d) => `- ${d}`).join('\n        ')}
      `;
}

export function mergeAgentFeedbackNotes(
  previous: string | undefined,
  addition: string | undefined
): string | undefined {
  const next = addition?.trim();
  if (!next) return previous?.trim() || undefined;
  const prev = previous?.trim();
  if (!prev) return next;
  return `${prev}\n---\n${next}`;
}
