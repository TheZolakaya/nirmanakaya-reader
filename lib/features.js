// lib/features.js — THE FEATURE REGISTRY AND THE TIERS (founder, 2026-10-14: "componentize things… associated with specific tiers…
// packages of capabilities that are enticing to users and also unpack as they go"). Every capability the reader can show is listed
// here once, with its tier and the one line a person reads on its locked face. A tier is BOUGHT (profiles.tier) or EARNED (closed
// readings); admins hold tier 9. Nothing is mounted by name anymore — the page asks has('glisten', tier).
// Pure: no imports, safe on the client and the server.

export const TIERS = {
  1: { name: 'The reading', line: 'one card, the way through, a question back — and the four doors' },
  2: { name: 'The voices', line: 'the reading told by a friend, a coach, a storyteller; read aloud; and the Glistener' },
  3: { name: 'The instrument', line: 'the full reader and the map laid open' },
  9: { name: 'The house', line: 'the admins' },
};

// How a tier is EARNED: closed readings (Summarize and wrap it up) that open it. Absent = cannot be earned, only granted.
export const EARN = { 2: 3 };

export const FEATURES = {
  reading:    { tier: 1, name: 'The reading',       line: 'one card, the way through, a question back' },
  fit:        { tier: 1, name: 'The fit row',       line: "That's it · Close, not it · That's not me · I don't understand" },
  how:        { tier: 1, name: 'How do you know?',  line: 'the four facts from the map, and how the Reader read them' },
  moves:      { tier: 1, name: 'The moves',         line: 'Clarify · Unpack · Example · Find it · Recommend' },
  doors:      { tier: 1, name: 'The four doors',    line: 'Go deeper · Face the dragon · The medicine · One small step' },
  minimap:    { tier: 1, name: 'The map',           line: 'where the card lives, where it landed, where the medicine is' },
  toldBy:     { tier: 2, name: 'Told by',           line: 'the same reading told by a friend, a coach, a storyteller' },
  readBy:     { tier: 2, name: 'Read by',           line: 'the reading read aloud, in a voice you choose' },
  glisten:    { tier: 2, name: 'Glisten',           line: 'let a question find its shape before you ask it' },
  fullReader: { tier: 3, name: 'The full reader',   line: 'every card, every path, the whole instrument' },
  compose:    { tier: 9, name: 'Composition',       line: 'the sixteen laws, composed' },
  promptFlag: { tier: 9, name: 'Prompt sets',       line: 'the house tries a prompt' },
};

export const earnedTier = (closedReadings) => {
  const n = Number(closedReadings) || 0; let t = 1;
  for (const [tier, need] of Object.entries(EARN)) if (n >= need) t = Math.max(t, Number(tier));
  return t;
};

/** The tier a person holds: admins 9; else the greater of the granted tier and the earned one. */
export const tierFor = ({ isAdmin = false, profileTier = 1, closedReadings = 0 } = {}) => (isAdmin ? 9 : Math.max(Number(profileTier) || 1, earnedTier(closedReadings)));

// .780 (founder, 2026-10-14): "make it wide open for now. I just wanted us to start bucketizing and thinking about tiers." While OPEN is true every
// signed-in person holds everything; the registry and the tiers stay as the map for the intentional unfolding to come (the first-reading walk-through, the help overlay).
export const OPEN = process.env.NEXT_PUBLIC_TIERS_OPEN !== '0';
export const has = (key, tier) => OPEN || (FEATURES[key]?.tier ?? 99) <= (Number(tier) || 1);

/** The locked face's second line: how this opens. */
export const opensHow = (key, closedReadings = null) => {
  const f = FEATURES[key]; if (!f) return '';
  const need = EARN[f.tier];
  if (need) return `opens after ${need} readings${closedReadings != null ? ` · ${Math.min(need, Number(closedReadings) || 0)} of ${need} so far` : ''}`;
  return `opens at tier ${f.tier}`;
};
