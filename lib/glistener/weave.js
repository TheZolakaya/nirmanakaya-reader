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

Write a single short MYTHIC narrative using all 10 words exactly once.

CRITICAL CONSTRAINTS:
- Write like a creation myth, parable, or archetypal journey
- Use timeless, universal imagery: thresholds, vessels, paths, flames, seeds, depths, heights
- NO specific professions (no surgeons, scientists, lawyers, teachers)
- NO modern technology or medical terms
- NO specific places or time periods
- Characters should be archetypes: "the wanderer", "one who waits", "the keeper", "a figure"
- The narrative must include tension, movement, or choice
- Include at least one directional shift (but, until, when, then, yet)
- The field speaks through you - reverent, layered, dreamlike

Words to include: ${wordList}

Write the tale. Nothing else.`;
}

/**
 * Step C: Integration - extract universal pattern
 */
export function buildIntegrationPrompt(transmission) {
  return `Extract the UNIVERSAL PATTERN from this mythic tale:

"${transmission}"

Rules:
- Identify the archetypal tension (e.g., holding vs releasing, staying vs leaving, knowing vs trusting)
- Name the core movement or choice without making it specific
- Use words like: something, somewhere, someone, a part of me, what I've been carrying
- NO specific scenarios (no jobs, relationships, projects, decisions)
- NO literal interpretation
- 2-3 sentences about the universal human pattern
- Stay abstract and applicable to anyone's life`;
}

/**
 * Crystal: Question distillation
 */
export function buildCrystalPrompt(integration) {
  return `From this universal pattern, produce exactly ONE question:

"${integration}"

CRITICAL RULES:
- Must be first-person ("I", "my", "me")
- Must be UNIVERSAL - could apply to anyone's life situation
- Use archetypal language: what am I holding, where does my path lead, what threshold, what am I refusing to see
- NO specific scenarios (no treatments, documents, research, relationships, jobs)
- NO proper nouns or technical terms
- The question should feel like it could be asked by anyone at a crossroads
- Must end with a question mark

GOOD examples:
- "What am I holding that needs to be released?"
- "Where does my path diverge from what I've known?"
- "What threshold am I refusing to cross?"
- "What would change if I stopped waiting?"

BAD examples (too specific):
- "Should I continue the treatment?"
- "Do I take the new job?"
- "Should I forgive them?"

Write only the question.`;
}

/**
 * Plain language toggle (post-crystal)
 */
export function buildPlainLanguagePrompt(transmission) {
  return `Explain the universal meaning of this mythic tale:

"${transmission}"

- Use everyday language but stay universal
- Describe the archetypal pattern (holding/releasing, staying/leaving, knowing/trusting)
- Do NOT invent specific scenarios or situations
- Keep it applicable to anyone's life
- 2-3 sentences`;
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
