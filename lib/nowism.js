// === NOWISM GOVERNANCE ===
// Detects temporal language in custom frame labels and generates
// a Nowism governance block for the AI prompt.
//
// Core principle: Nirmanakaya reads ONLY the present moment.
// "Past" = current influence of historical patterns on NOW
// "Future" = present directional attitude toward what is not yet
//
// We reframe, not forbid. Meet the user where they are,
// then the AI reads through Nowism automatically.

// Temporal patterns to detect (case-insensitive)
const PAST_PATTERNS = [
  /\bpast\b/i, /\byesterday\b/i, /\bhistor/i, /\bwhat was\b/i,
  /\bwhere i'?ve been\b/i, /\borigin/i, /\broot\b/i, /\bfoundation\b/i,
  /\bbefore\b/i, /\bprevious/i, /\bbackground\b/i, /\bmemor/i,
  /\bchildhood\b/i, /\blegacy\b/i, /\bheritage\b/i, /\bwhat happened\b/i,
  /\bwhat led\b/i, /\bsource\b/i, /\bwhere.+came from\b/i
];

const FUTURE_PATTERNS = [
  /\bfuture\b/i, /\btomorrow\b/i, /\bwhat'?s (coming|next|ahead)\b/i,
  /\bwhere.+(headed|going)\b/i, /\boutcome\b/i, /\bdestination\b/i,
  /\bwhat will\b/i, /\bwhat could\b/i, /\bpotential\b/i, /\bbecoming\b/i,
  /\bhope\b/i, /\bfear\b/i, /\bgoal\b/i, /\bdream\b/i, /\baspiration\b/i,
  /\bwhat if\b/i, /\bpossibilit/i, /\bnext step/i, /\bpath forward\b/i
];

/**
 * Detect if any labels contain temporal language.
 * Returns { hasTemporal, pastLabels, futureLabels }
 */
export function detectTemporalLabels(labels) {
  if (!labels || !Array.isArray(labels)) return { hasTemporal: false, pastLabels: [], futureLabels: [] };

  const pastLabels = [];
  const futureLabels = [];

  for (const label of labels) {
    if (!label) continue;
    if (PAST_PATTERNS.some(p => p.test(label))) pastLabels.push(label);
    if (FUTURE_PATTERNS.some(p => p.test(label))) futureLabels.push(label);
  }

  return {
    hasTemporal: pastLabels.length > 0 || futureLabels.length > 0,
    pastLabels,
    futureLabels
  };
}

/**
 * Build Nowism governance block for the AI prompt.
 * Only returns content if temporal labels are detected.
 */
export function buildNowismGovernance(labels) {
  const { hasTemporal, pastLabels, futureLabels } = detectTemporalLabels(labels);
  if (!hasTemporal) return '';

  let block = `NOWISM GOVERNANCE — TEMPORAL REFRAME:
This system reads ONLY the present moment. The user has framed positions using temporal language — honor their frame, but interpret through NOW.\n`;

  if (pastLabels.length > 0) {
    block += `
Positions framed as past (${pastLabels.map(l => `"${l}"`).join(', ')}):
Read as: the current influence of historical patterns on the present moment.
- If imbalanced: this is where regret, shame, unprocessed weight, or attachment to what was is CURRENTLY operating
- If balanced: this is integrated learning, wisdom that is ACTIVELY informing present choices
Do NOT narrate history. Name what the past-pattern is doing RIGHT NOW.\n`;
  }

  if (futureLabels.length > 0) {
    block += `
Positions framed as future (${futureLabels.map(l => `"${l}"`).join(', ')}):
Read as: the present directional attitude toward what is not yet.
- If imbalanced: this is where anxiety, fear, grasping, or avoidance is CURRENTLY being projected forward
- If balanced: this is intentional orientation — planning energy being expressed NOW
Do NOT predict. Name what the forward-projection is doing RIGHT NOW.\n`;
  }

  return block;
}
