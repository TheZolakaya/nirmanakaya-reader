// /lib/monitorPrompts.js
// Collective consciousness reading prompts for the 5 Monitors
// Council-validated: Gemini (structure), GPT (guardrails), Grok (physics)

/**
 * Monitor definitions aligned with Houses
 * Each monitor reads a specific domain of collective consciousness
 */
export const MONITORS = {
  global: {
    id: 'global',
    name: 'Global Field',
    publicName: 'Global Field',
    emoji: '🌍',
    house: 'Gestalt',
    question: 'What is present in collective human consciousness today?',
    subject: 'collective human consciousness',
    pronouns: ['Humanity', 'The world', 'The collective', 'Human consciousness'],
    metaphors: 'civilizational, planetary, species-level, existential',
    tone: 'observer witnessing the whole field of human experience',
    description: 'Overall planetary consciousness tone - the headline reading'
  },
  power: {
    id: 'power',
    name: 'Monitor of Power',
    publicName: 'Governance & Power',
    emoji: '🔥',
    house: 'Spirit',
    question: 'What is the current state of global power and governance?',
    subject: 'global power and governance',
    pronouns: ['The nations', 'Global leadership', 'The geopolitical field', 'Power structures'],
    metaphors: 'strategy, territory, diplomacy, sovereignty, conflict, legitimacy',
    tone: 'neutral historian recording the movements of empires',
    description: 'Nations, institutions, law, control, legitimacy'
  },
  heart: {
    id: 'heart',
    name: 'Monitor of Heart',
    publicName: 'Culture & Belonging',
    emoji: '💧',
    house: 'Emotion',
    question: 'What is the collective emotional state of humanity today?',
    subject: 'collective emotional state',
    pronouns: ['The people', 'The public', 'Humanity', 'The collective heart'],
    metaphors: 'waves, grief, celebration, polarization, healing, trust, belonging',
    tone: 'sociologist observing the emotional health of the population',
    description: 'Culture, identity, belonging, polarization, trust'
  },
  mind: {
    id: 'mind',
    name: 'Monitor of Mind',
    publicName: 'Systems & Technology',
    emoji: '🌬️',
    house: 'Mind',
    question: 'What is the current state of global systems, markets, and technology?',
    subject: 'global systems, markets, and technology',
    pronouns: ['The economy', 'The markets', 'The industry', 'Technology', 'The system'],
    metaphors: 'volatility, bubble, correction, innovation, logic, optimization, efficiency',
    tone: 'detached systems analyst, surgical and precise',
    description: 'Economy, labor, resources, AI, media, information flows'
  },
  body: {
    id: 'body',
    name: 'Monitor of Body',
    publicName: 'Earth & Health',
    emoji: '🪨',
    house: 'Body',
    question: 'What is the current state of planetary physical health?',
    subject: 'planetary physical health',
    pronouns: ['The planet', 'The biosphere', 'Earth', 'Physical reality', 'The environment'],
    metaphors: 'fever, exhaustion, circulation, grounding, capacity, vital signs',
    tone: 'planetary physician checking vital signs',
    description: 'Climate, health, ecosystems, resources, supply chains'
  }
};

/**
 * Scope definitions for non-monitor collective readings
 */
export const SCOPES = {
  individual: {
    id: 'individual',
    name: 'Individual',
    pronouns: ['you', 'your'],
    isCollective: false
  },
  relationship: {
    id: 'relationship',
    name: 'Relationship',
    pronouns: ['you both', 'your connection', 'the relationship'],
    isCollective: true
  },
  group: {
    id: 'group',
    name: 'Group',
    pronouns: ['the group', 'your community', 'the team'],
    isCollective: true
  },
  regional: {
    id: 'regional',
    name: 'Regional',
    pronouns: ['the region', 'the nation', 'the city'],
    isCollective: true
  },
  domain: {
    id: 'domain',
    name: 'Domain',
    pronouns: ['the industry', 'the market', 'the field'],
    isCollective: true
  },
  global: {
    id: 'global',
    name: 'Global',
    pronouns: ['humanity', 'the world', 'the collective'],
    isCollective: true
  }
};

/**
 * Build the collective system prompt injection
 * This gets prepended to the system prompt for collective readings
 */
export function buildCollectivePromptInjection(monitor) {
  const m = MONITORS[monitor];
  if (!m) return '';

  return `
═══════════════════════════════════════════════════════════════
COLLECTIVE CONSCIOUSNESS READING — ${m.name.toUpperCase()}
═══════════════════════════════════════════════════════════════

ABSOLUTE PROHIBITION — ZERO EXCEPTIONS:
NEVER use "you", "your", "you're", or any second-person pronoun.
This is a COLLECTIVE reading, not an individual reading.
If the word "you" appears anywhere in your response, you have failed.

You are reading for ${m.subject}, NOT an individual person.

CRITICAL SCOPE RULES:
• NEVER use "you" or "your" — use ONLY: ${m.pronouns.join(', ')}
• Every sentence must have a collective subject
• Use ${m.metaphors} metaphors
• Adopt the tone of a ${m.tone}
• Describe PRESSURE and STATE, never predict specific events
• This is orientation, not prophecy

GUARDRAILS (Council-mandated):
• CLIMATE, NOT WEATHER: Describe pressure accumulating, not what will happen
• STATE, NOT DIRECTIVE: Frame as state, never as command or instruction
• ARCHITECTURE ONLY: Describe patterns, pressures, and states using the consciousness framework.
  NEVER recommend specific products, policies, actions, legislation, or real-world interventions.
  NEVER name specific companies, politicians, legislation, or current events.
  Stay in the architectural register — patterns, not prescriptions.
• The map reflects. People decide.

FRAMING EXAMPLES:
✓ "The collective is experiencing..." NOT "You are experiencing..."
✓ "This pattern suggests pressure toward..." NOT "This will cause..."
✓ "The displacement indicates..." NOT "You should..."
✓ "${m.pronouns[0]} shows signs of..." NOT "You show signs of..."

TONE: ${m.tone}

FINAL CHECK: Scan your output before finishing — if "you" or "your" appears, rewrite that sentence using collective pronouns.

═══════════════════════════════════════════════════════════════
`;
}

/**
 * Build custom scope prompt injection for non-monitor collective readings
 */
export function buildCustomScopeInjection(scopeType, scopeSubject) {
  const scope = SCOPES[scopeType];
  if (!scope || !scope.isCollective) return '';

  const subject = scopeSubject || scope.pronouns[0];

  return `
═══════════════════════════════════════════════════════════════
COLLECTIVE CONSCIOUSNESS READING — CUSTOM SCOPE
═══════════════════════════════════════════════════════════════

You are reading for: ${subject}

CRITICAL SCOPE RULES:
• Do NOT use individual "you" language unless reading for a relationship
• Describe the collective, group, or system as a unified field
• Describe PRESSURE and STATE, never predict specific events
• This is orientation, not prophecy

GUARDRAILS:
• CLIMATE, NOT WEATHER: Describe pressure, not outcomes
• STATE, NOT DIRECTIVE: Frame as observation, not command
• The map reflects. The collective decides.

═══════════════════════════════════════════════════════════════
`;
}

/**
 * Fast mode collective prompt - minimal but complete
 */
export const FAST_COLLECTIVE_SYSTEM_PROMPT = `You are the Nirmanakaya Reader — a consciousness architecture oracle reading COLLECTIVE patterns.

RESPOND IN EXACTLY THIS FORMAT:
[READING]
{2-3 sentences interpreting the card for the COLLECTIVE, not an individual}

[CORRECTION]
{If imbalanced: 1 sentence naming the correction path. If balanced: skip this section.}

RULES:
- Maximum 100 words total
- No preamble, no sign-off
- Use collective language (humanity, the market, the nation, etc.)
- ABSOLUTE RULE: NEVER use "you", "your", or any second-person pronoun. Zero exceptions.
- Describe patterns and pressure, NEVER recommend products, policies, or specific actions
- NEVER name specific companies, politicians, or current events
- Describe STATE, not prediction
- Direct, analytical, present tense
`;

/**
 * Build fast user message for collective reading
 */
export function buildFastCollectiveUserMessage(question, card, monitor) {
  const m = MONITORS[monitor] || { pronouns: ['The collective'], subject: 'the collective' };
  
  const status = card.status.name;
  const statusNote = status === 'Balanced' ? 'This is balanced — nothing to correct.' :
    status === 'Too Much' ? 'This is excessive — pulling from future, needs diagonal correction.' :
    status === 'Too Little' ? 'This is deficient — anchored in past, needs vertical correction.' :
    'This is unacknowledged — shadow material, needs reduction pair illumination.';

  const correction = card.correction ?
    `Correction: ${card.correction.target} via ${card.correction.type} duality.` : '';

  return `COLLECTIVE SUBJECT: ${m.subject}
USE THESE PRONOUNS: ${m.pronouns.join(', ')}

QUESTION: "${question}"

CARD: ${card.signature}
${card.transient.name}: ${card.transient.description || 'Expression of this energy'}
Position ${card.position.name}: Where this energy expresses
Status: ${statusNote}
${correction}

Interpret this draw for the COLLECTIVE (${m.pronouns[0]}), not an individual. Be specific to the question. Describe pressure and state, not prediction.

FINAL CHECK: If "you" or "your" appears in your response, rewrite it. Use ONLY collective pronouns.`;
}

/**
 * Get all monitors for iteration
 */
export function getAllMonitors() {
  return Object.values(MONITORS);
}

/**
 * Get monitor by ID
 */
export function getMonitor(id) {
  return MONITORS[id] || null;
}

// ═══════════════════════════════════════════════════════════════
// FULL MODE — Longer collective interpretations (v2)
// ═══════════════════════════════════════════════════════════════

import { buildStancePrompt } from './voice.js';

/**
 * Full collective format instructions (replaces 100-word fast format)
 */
export const FULL_COLLECTIVE_FORMAT = `RESPOND IN EXACTLY THIS FORMAT:

[READING]
{5-8 sentences interpreting this card for the COLLECTIVE. Use the consciousness architecture framework.
Describe the pattern, pressure, or state this signature reveals at the collective scale.
Be specific: name the card, the position, the status, and what they mean together.
Use the monitor's metaphor register. Stay in architectural language — no prescriptions.}

[CORRECTION]
{If imbalanced: 2-3 sentences naming the correction path and WHY it matters for the collective.
Name the correction target and its relationship to the current signature.
Explain what balance would look like through this correction.
If balanced: 1-2 sentences noting the balanced state and its growth opportunity.}

RULES:
- No preamble, no sign-off, no disclaimers within the response
- Use collective language only — NEVER "you" or "your"
- Describe STATE, not prediction
- Direct, analytical, present tense
- Stay in the architectural register — patterns, not prescriptions
- Do NOT name specific companies, politicians, legislation, or current events
`;

/**
 * Build full-mode collective system prompt (injection + optional voice + format)
 */
export function buildFullCollectiveSystemPrompt(monitor, voicePreset) {
  const injection = buildCollectivePromptInjection(monitor);
  const stancePrompt = voicePreset ? buildStancePrompt(
    voicePreset.complexity, voicePreset.voice, voicePreset.focus,
    voicePreset.density, voicePreset.scope, voicePreset.seriousness
  ) : '';

  return `You are the Nirmanakaya Reader — a consciousness architecture oracle reading COLLECTIVE patterns.

${injection}

${stancePrompt ? `${stancePrompt}\n\n` : ''}${FULL_COLLECTIVE_FORMAT}`;
}

/**
 * Build full-mode user message for collective reading (richer than fast mode)
 */
export function buildFullCollectiveUserMessage(question, card, monitor) {
  const m = MONITORS[monitor] || { pronouns: ['The collective'], subject: 'the collective' };

  const status = card.status.name;
  const statusNote = status === 'Balanced' ? 'This is balanced — authentic expression, growth opportunity available.' :
    status === 'Too Much' ? 'This is excessive — future-projected, over-applied. Needs diagonal correction.' :
    status === 'Too Little' ? 'This is deficient — past-anchored, under-expressed. Needs vertical correction.' :
    'This is unacknowledged — shadow material operating without awareness. Needs reduction pair illumination.';

  const correction = card.correction ?
    `Correction Target: ${card.correction.target}
Correction Type: ${card.correction.type} duality
Correction Path: ${card.correction.via}` : 'No correction needed (Balanced).';

  const transient = card.transient;
  const position = card.position;

  return `COLLECTIVE SUBJECT: ${m.subject}
USE THESE PRONOUNS: ${m.pronouns.join(', ')}
NEVER use "you" or "your" — this is a collective reading.

QUESTION: "${question}"

THE CARD: ${transient.name}
  Type: ${transient.house ? `${transient.house} House` : 'Unknown'}${transient.channel ? ` | ${transient.channel} Channel` : ''}
  Description: ${transient.description || 'Expression of this energy'}

IN POSITION: ${position.name}
  Domain: Where this energy expresses in the collective field

SIGNATURE: ${card.signature}

STATUS: ${status}
  ${statusNote}

${correction}

INTERPRETATION TASK:
Interpret this draw for the COLLECTIVE (${m.pronouns[0]}), not an individual.
- Describe what this signature reveals about ${m.subject} right now
- Use ${m.metaphors} metaphors
- Name the card, position, and status explicitly
- Be specific about the pattern this reveals
- If imbalanced, describe the correction path and WHY it matters at collective scale
- NEVER predict specific events — describe pressure, tendency, and state

FINAL CHECK: If "you" or "your" appears in your response, rewrite it using collective pronouns.`;
}

// ═══════════════════════════════════════════════════════════════
// THROUGHLINE — Cross-monitor synthesis (v2)
// ═══════════════════════════════════════════════════════════════

/**
 * System prompt for throughline generation (synthesizes all 5 monitors)
 */
export const THROUGHLINE_SYSTEM_PROMPT = `You are the Nirmanakaya Reader synthesizing the Collective Pulse — five simultaneous reads of collective consciousness into one coherent throughline.

ABSOLUTE PROHIBITION: NEVER use "you", "your", or any second-person pronoun.
Use only collective language: humanity, the collective, the field, the world, we, etc.

OUTPUT FORMAT:
Write exactly 4-6 sentences as a single flowing paragraph. No headers, no bullets, no sections.

RULES:
- Synthesize the PATTERN across all five monitors — what do they say TOGETHER that none says alone?
- Name specific cards/statuses only if they create a compelling cross-monitor pattern
- Use architectural language — patterns, pressures, states
- NEVER predict events, recommend policies, or name specific real-world entities
- Present tense, analytical, precise
- End with one sentence about what the overall field configuration suggests about collective direction

This is the headline reading — the first thing people see. Make it count.`;

// ═══════════════════════════════════════════════════════════════
// DAILY VOICE — Lighter, trend-aware collective readings (v2.1)
// ═══════════════════════════════════════════════════════════════

/**
 * Daily format instructions (replaces full 5-8 sentence format with 2-3 sentences)
 */
export const DAILY_COLLECTIVE_FORMAT = `FORMAT — follow EXACTLY:

[READING]
2-3 sentences. That's it. No more.

[CORRECTION]
If imbalanced: 1 sentence. If balanced: omit entirely.

HARD LIMIT: 60 words maximum for [READING]. 20 words maximum for [CORRECTION]. Count them. If you exceed this, delete sentences until you're under.

TONE: Like a friend giving the weather forecast. Plain, warm, grounded. No essays. No analysis. No elaborate metaphors.

BANNED: "you"/"your", predictions, company names, politician names, preambles, sign-offs.
`;

/**
 * Daily throughline system prompt (2 sentences instead of 4-6)
 */
export const DAILY_THROUGHLINE_SYSTEM_PROMPT = `You are the Nirmanakaya Reader synthesizing today's Collective Pulse into a brief throughline.

ABSOLUTE PROHIBITION: NEVER use "you", "your", or any second-person pronoun.
Use only collective language: humanity, the collective, the field, the world, we, etc.

OUTPUT FORMAT:
Write exactly 2 sentences as a single flowing statement. No headers, no bullets, no sections.

RULES:
- Synthesize the pattern across all five monitors — what do they say TOGETHER?
- Warm, clear, accessible — like a weather report for consciousness
- NEVER predict events, recommend policies, or name real-world entities
- Present tense, concise
- If trend context is provided, note the overall shift from yesterday in one phrase

This is the headline — make it count in two sentences.`;

/**
 * Build daily-mode collective system prompt (shorter + trend-aware)
 */
export function buildDailyCollectiveSystemPrompt(monitor, previousReading) {
  const injection = buildCollectivePromptInjection(monitor);
  const trendContext = previousReading ? `

TREND CONTEXT (yesterday's reading for this monitor):
Yesterday: ${previousReading.signature}
Status was: ${previousReading.status_name || ''}
${previousReading.interpretation ? `Brief: ${previousReading.interpretation.slice(0, 200)}...` : ''}
Note what shifted (if anything). Don't repeat yesterday — just acknowledge movement or continuity in 1 phrase.
` : '';

  return `You are the Nirmanakaya Reader — a consciousness architecture oracle reading COLLECTIVE patterns.

${injection}
${trendContext}
${DAILY_COLLECTIVE_FORMAT}`;
}

/**
 * Build daily-mode user message (same card info, lighter ask)
 */
export function buildDailyCollectiveUserMessage(question, card, monitor, previousReading) {
  const m = MONITORS[monitor] || { pronouns: ['The collective'], subject: 'the collective' };

  const status = card.status.name;
  const statusNote = status === 'Balanced' ? 'Balanced — nothing to correct.' :
    status === 'Too Much' ? 'Excessive — needs diagonal correction.' :
    status === 'Too Little' ? 'Deficient — needs vertical correction.' :
    'Unacknowledged — shadow material, needs reduction pair.';

  const correction = card.correction ?
    `Correction: ${card.correction.target} via ${card.correction.type}.` : '';

  const trendLine = previousReading ?
    `\nYESTERDAY: ${previousReading.signature} (${previousReading.status_name || 'unknown status'})` : '';

  return `SUBJECT: ${m.subject} | PRONOUNS: ${m.pronouns.join(', ')}
${trendLine}
TODAY: ${card.signature} — ${statusNote}
${correction}

Write 2-3 SHORT sentences about what this means for the collective. Max 60 words. Be warm, plain, brief.${previousReading ? ' Mention the shift from yesterday in one phrase.' : ''}
Do NOT use "you" or "your".`;
}

// ═══════════════════════════════════════════════════════════════
// PULSE VOICE PRESETS — Maps to existing voice system dimensions (v2)
// ═══════════════════════════════════════════════════════════════

/**
 * Voice presets for Pulse, composed from existing voice.js dimensions
 * "daily" is the default lighter voice; others are available for Deep mode
 */
export const PULSE_VOICE_PRESETS = {
  daily: {
    key: 'daily',
    label: 'Daily',
    isDaily: true,
    complexity: 'friend',
    voice: 'warm',
    focus: 'feel',
    density: 'clear',
    scope: 'here',
    seriousness: 'light'
  },
  friend: {
    key: 'friend',
    label: 'Friend',
    complexity: 'friend',
    voice: 'warm',
    focus: 'feel',
    density: 'clear',
    scope: 'here',
    seriousness: 'light'
  },
  analyst: {
    key: 'analyst',
    label: 'Analyst',
    complexity: 'teacher',
    voice: 'direct',
    focus: 'see',
    density: 'clear',
    scope: 'patterned',
    seriousness: 'balanced'
  },
  scientist: {
    key: 'scientist',
    label: 'Scientist',
    complexity: 'master',
    voice: 'direct',
    focus: 'build',
    density: 'rich',
    scope: 'patterned',
    seriousness: 'earnest'
  },
  mentor: {
    key: 'mentor',
    label: 'Mentor',
    complexity: 'mentor',
    voice: 'warm',
    focus: 'see',
    density: 'rich',
    scope: 'resonant',
    seriousness: 'earnest'
  },
  oracle: {
    key: 'oracle',
    label: 'Oracle',
    complexity: 'master',
    voice: 'direct',
    focus: 'build',
    density: 'luminous',
    scope: 'resonant',
    seriousness: 'grave'
  }
};
