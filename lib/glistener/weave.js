/**
 * Glistener Weave Module
 * Prompt templates for AI interpretation passes
 */

/**
 * Step A: Symbolism - functional mapping
 */
export function buildSymbolismPrompt(bones) {
  const wordList = bones.map((b, i) => `${i + 1}. ${b.word}`).join('\n');

  return `You are given 10 words selected by constraint. These are "bones" - raw symbolic material.

For each word:
- Describe its FUNCTION (what it does, enables, or changes)
- Do not interpret emotionally
- One sentence per word
- No metaphors

Words:
${wordList}

Respond with exactly 10 numbered bullet points, one per word.`;
}

/**
 * Step B: Transmission - mythic tale
 */
export function buildTransmissionPrompt(bones, symbolism) {
  const wordList = bones.map(b => b.word).join(', ');

  return `You have 10 symbolic bones and their functions:

${symbolism}

Write a single short narrative using all 10 words exactly once.

Constraints:
- The narrative must include tension, movement, or choice
- Include at least one directional shift (e.g., "but", "until", "when", "then", "instead", "yet")
- No abstract states without action
- No interpretation or explanation
- The field speaks through you - reverent, layered, non-linear

Words to include: ${wordList}

Write the tale. Nothing else.`;
}

/**
 * Step C: Integration - plain meaning
 */
export function buildIntegrationPrompt(transmission) {
  return `Translate this symbolic tale into plain language:

"${transmission}"

Rules:
- No metaphor
- No poetry
- Explain what situation, tension, or decision is being described
- 3-5 sentences
- Speak directly about what's happening`;
}

/**
 * Crystal: Question distillation
 */
export function buildCrystalPrompt(integration) {
  return `From this grounded meaning, produce exactly ONE question:

"${integration}"

Rules:
- Must be first-person ("I", "my", or implied)
- Must involve action, choice, or responsibility
- Must end with a question mark
- No statements. No advice. No preamble.

Write only the question.`;
}

/**
 * Plain language toggle (post-crystal)
 */
export function buildPlainLanguagePrompt(transmission) {
  return `Rewrite this mythic tale as a simple paragraph:

"${transmission}"

- Use everyday language
- Keep all meaning intact
- No poetry or metaphor
- 3-4 sentences`;
}

/**
 * Validate transmission has directional shift
 */
export function validateTransmission(text) {
  const markers = /\b(but|until|when|then|instead|yet|however|although)\b/i;
  return markers.test(text);
}

/**
 * Validate crystal is a question
 */
export function validateCrystal(text) {
  const trimmed = text.trim();
  if (!trimmed.endsWith('?')) return false;
  if (trimmed.split('?').length > 2) return false; // multiple questions
  return true;
}
