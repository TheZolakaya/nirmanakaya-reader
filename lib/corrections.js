// === CORRECTION LOGIC ===
// CANONICAL CORRECTION LOOKUP TABLES
// Source: lib/CANONICAL_78_CORRECTIONS.md
// DO NOT USE FORMULAS - these are authoritative lookup values

import { ARCHETYPES, BOUNDS, AGENTS } from './archetypes.js';

// GROWTH_PAIRS (Balanced state - growth opportunity)
// GROWTH IS THE TWIN (R-48, founder 2026-11-02): swap Fire↔Air and Earth↔Water in all four dimensions (Practice, Activity,
// Being, Identity). It keeps the stage on all sixteen manifest seats and never lands on a V, D or R pair. The transpose
// (house↔designator) was the rule from 2021 to 2026-11-02; it equals the twin on the eight still-stage seats, marked (Transpose).
// The four PURE cards' pairs are twins too (founder-gaveled 2026-09-27, applied 2026-10-02): Compassion 6 ↔ Fortitude 8, Abstraction 15 ↔ Inspiration 17.
// The Soul house grows one-way into the pure card of its designator (same gavel): 0→17, 1→8, 19→15, 20→6.
// The portals grow into each other (2026-08-10). No archetype grows into itself any more.
export const GROWTH_PAIRS = {
  0: 17,     // Potential → Inspiration (Soul-house growth into the pure card of its designator, one-way)
  1: 8,      // Will → Fortitude (Soul-house growth, one-way)
  2: 4,      // Wisdom → Authority (Transpose)
  3: 5,      // Nurturing → Culture (Twin, R-48; was 12 Faith by the transpose)
  4: 2,      // Authority → Wisdom (Transpose)
  5: 3,      // Culture → Nurturing (Twin, R-48; was 14 Tune by the transpose)
  6: 8,      // Compassion → Fortitude (pure growth pair, Seed–Seed)
  7: 9,      // Drive → Discipline (Twin, R-48; was 18 Imagination by the transpose)
  8: 6,      // Fortitude → Compassion (pure growth pair, Seed–Seed)
  9: 7,      // Discipline → Drive (Twin, R-48; was 16 Breakthrough by the transpose)
  10: 21,  // Source → Creation (founder-gaveled 2026-08-10: the doors grow into each other)
  11: 13,    // Equity → Transformation (Transpose)
  12: 14,    // Faith → Tune (Twin, R-48; was 3 Nurturing by the transpose)
  13: 11,    // Transformation → Equity (Transpose)
  14: 12,    // Tune → Faith (Twin, R-48; was 5 Culture by the transpose)
  15: 17,    // Abstraction → Inspiration (pure growth pair, Fruition–Fruition)
  16: 18,    // Breakthrough → Imagination (Twin, R-48; was 9 Discipline by the transpose)
  17: 15,    // Inspiration → Abstraction (pure growth pair, Fruition–Fruition)
  18: 16,    // Imagination → Breakthrough (Twin, R-48; was 7 Drive by the transpose)
  19: 15,    // Actualization → Abstraction (Soul-house growth, one-way)
  20: 6,     // Recognition → Compassion (Soul-house growth, one-way)
  21: 10   // Creation → Source (founder-gaveled 2026-08-10: the doors grow into each other)
};

// Build ARCHETYPE_BOUNDS dynamically from BOUNDS data
// Maps archetype ID to { inner: boundId, outer: boundId }
function buildArchetypeBoundsMap() {
  const mapping = {};
  for (const [id, bound] of Object.entries(BOUNDS)) {
    const arch = bound.archetype;
    if (!mapping[arch]) mapping[arch] = {};
    // Inner: Ace-5 (numbers 1-5), Outer: 6-10
    const polarity = bound.number <= 5 ? 'inner' : 'outer';
    mapping[arch][polarity] = parseInt(id);
  }
  return mapping;
}
const ARCHETYPE_BOUNDS = buildArchetypeBoundsMap();

// CANONICAL BOUND GROWTH - Direct lookup from B20 BUG FIX spec
// Maps balanced Bound ID to growth target Bound ID
// R-49, keep-side (founder 2026-11-02): a manifest bound grows into the twin parent's bound on the SAME side (inner stays
// inner, outer stays outer). Why, Lumen's law: λ = side XOR the parent's half (Seed/Bridge 0, Fruition/Feedback 1) is kept by
// every medicine; V, D and R cross the half, so they cross the side; the twin keeps the stage, so it keeps the side.
// The 8 Soul-row bounds (Aces and 10s) grow into the family's partner (0→17, 1→8, 19→15, 20→6). Their side follows R-70
// (founder 2026-11-06, the half rule): same side when the parent's growth stays in its half, opposite when it crosses.
// Potential 0→17 (Seed→Fruition) and Recognition 20→6 (Feedback→Seed) cross, so they flip (rows unchanged); Will 1→8
// (Bridge→Seed) and Actualization 19→15 (Fruition→Fruition) stay in their half, so they keep the side (rows 32, 41, 52, 61).
// B20 FIX: Corrected 5 values (24, 25, 28, 29, 38) per canonical derivation
const BOUND_GROWTH_TARGETS = {
  // WANDS
  22: 30,    // Ace of Wands (Activation, inner of Potential) → 9 of Wands (Resilience, outer of Inspiration)
  23: 34,    // 2 of Wands (Orientation, inner of Inspiration) → 3 of Swords (Calculation, inner of Abstraction) — R-49 keep-side: the twin parent's bound, same side (Lumen's law: side XOR half kept); was 39
  24: 33,    // 3 of Wands (Assertion, inner of Authority) → 2 of Swords (Reflection, inner of Wisdom) — R-49 keep-side: the twin parent's bound, same side (Lumen's law: side XOR half kept); was 40
  25: 36,    // 4 of Wands (Alignment, inner of Drive) → 5 of Swords (Honing, inner of Discipline) — R-49 keep-side: the twin parent's bound, same side (Lumen's law: side XOR half kept); was 50
  26: 35,    // 5 of Wands (Dedication, inner of Faith) → 4 of Swords (Repose, inner of Tune) — R-49 keep-side: the twin parent's bound, same side (Lumen's law: side XOR half kept); was 60
  27: 38,    // 6 of Wands (Honor, outer of Faith) → 7 of Swords (Reconciliation, outer of Tune) — R-49 keep-side: the twin parent's bound, same side (Lumen's law: side XOR half kept); was 53
  28: 37,    // 7 of Wands (Resolve, outer of Drive) → 6 of Swords (Guidance, outer of Discipline) — R-49 keep-side: the twin parent's bound, same side (Lumen's law: side XOR half kept); was 43
  29: 40,    // 8 of Wands (Command, outer of Authority) → 9 of Swords (Discernment, outer of Wisdom) — R-49 keep-side: the twin parent's bound, same side (Lumen's law: side XOR half kept); was 33
  30: 39,    // 9 of Wands (Resilience, outer of Inspiration) → 8 of Swords (Immersion, outer of Abstraction) — R-49 keep-side: the twin parent's bound, same side (Lumen's law: side XOR half kept); was 34
  31: 23,    // 10 of Wands (Realization, outer of Potential) → 2 of Wands (Orientation, inner of Inspiration)
  // SWORDS
  32: 34,    // Ace of Swords (Perception, inner of Actualization) → 3 of Swords (Calculation, inner of Abstraction) — R-70 half rule: Fruition→Fruition stays in the closing half, so the side is kept; was 39
  33: 24,    // 2 of Swords (Reflection, inner of Wisdom) → 3 of Wands (Assertion, inner of Authority) — R-49 keep-side: the twin parent's bound, same side (Lumen's law: side XOR half kept); was 29
  34: 23,    // 3 of Swords (Calculation, inner of Abstraction) → 2 of Wands (Orientation, inner of Inspiration) — R-49 keep-side: the twin parent's bound, same side (Lumen's law: side XOR half kept); was 30
  35: 26,    // 4 of Swords (Repose, inner of Tune) → 5 of Wands (Dedication, inner of Faith) — R-49 keep-side: the twin parent's bound, same side (Lumen's law: side XOR half kept); was 49
  36: 25,    // 5 of Swords (Honing, inner of Discipline) → 4 of Wands (Alignment, inner of Drive) — R-49 keep-side: the twin parent's bound, same side (Lumen's law: side XOR half kept); was 59
  37: 28,    // 6 of Swords (Guidance, outer of Discipline) → 7 of Wands (Resolve, outer of Drive) — R-49 keep-side: the twin parent's bound, same side (Lumen's law: side XOR half kept); was 54
  38: 27,    // 7 of Swords (Reconciliation, outer of Tune) → 6 of Wands (Honor, outer of Faith) — R-49 keep-side: the twin parent's bound, same side (Lumen's law: side XOR half kept); was 44
  39: 30,    // 8 of Swords (Immersion, outer of Abstraction) → 9 of Wands (Resilience, outer of Inspiration) — R-49 keep-side: the twin parent's bound, same side (Lumen's law: side XOR half kept); was 23
  40: 29,    // 9 of Swords (Discernment, outer of Wisdom) → 8 of Wands (Command, outer of Authority) — R-49 keep-side: the twin parent's bound, same side (Lumen's law: side XOR half kept); was 24
  41: 39,    // 10 of Swords (Clarity, outer of Actualization) → 8 of Swords (Immersion, outer of Abstraction) — R-70 half rule: Fruition→Fruition stays in the closing half, so the side is kept; was 34
  // CUPS
  42: 48,    // Ace of Cups (Receptivity, inner of Recognition) → 7 of Cups (Allure, outer of Compassion)
  43: 54,    // 2 of Cups (Merge, inner of Imagination) → 3 of Pentacles (Formation, inner of Breakthrough) — R-49 keep-side: the twin parent's bound, same side (Lumen's law: side XOR half kept); was 28
  44: 53,    // 3 of Cups (Celebration, inner of Culture) → 2 of Pentacles (Stewardship, inner of Nurturing) — R-49 keep-side: the twin parent's bound, same side (Lumen's law: side XOR half kept); was 38
  45: 56,    // 4 of Cups (Reverie, inner of Compassion) → 5 of Pentacles (Steadfastness, inner of Fortitude) — R-49 keep-side: the twin parent's bound, same side (Lumen's law: side XOR half kept); was 57
  46: 55,    // 5 of Cups (Conscience, inner of Equity) → 4 of Pentacles (Preservation, inner of Transformation) — R-49 keep-side: the twin parent's bound, same side (Lumen's law: side XOR half kept); was 58
  47: 58,    // 6 of Cups (Reciprocity, outer of Equity) → 7 of Pentacles (Harvest, outer of Transformation) — R-49 keep-side: the twin parent's bound, same side (Lumen's law: side XOR half kept); was 55
  48: 57,    // 7 of Cups (Allure, outer of Compassion) → 6 of Pentacles (Support, outer of Fortitude) — R-49 keep-side: the twin parent's bound, same side (Lumen's law: side XOR half kept); was 56
  49: 60,    // 8 of Cups (Passage, outer of Culture) → 9 of Pentacles (Flourishing, outer of Nurturing) — R-49 keep-side: the twin parent's bound, same side (Lumen's law: side XOR half kept); was 35
  50: 59,    // 9 of Cups (Fulfillment, outer of Imagination) → 8 of Pentacles (Commitment, outer of Breakthrough) — R-49 keep-side: the twin parent's bound, same side (Lumen's law: side XOR half kept); was 25
  51: 45,    // 10 of Cups (Completion, outer of Recognition) → 4 of Cups (Reverie, inner of Compassion)
  // PENTACLES
  52: 56,    // Ace of Pentacles (Definition, inner of Will) → 5 of Pentacles (Steadfastness, inner of Fortitude) — R-70 half rule: Bridge→Seed stays in the opening half, so the side is kept; was 57
  53: 44,    // 2 of Pentacles (Stewardship, inner of Nurturing) → 3 of Cups (Celebration, inner of Culture) — R-49 keep-side: the twin parent's bound, same side (Lumen's law: side XOR half kept); was 27
  54: 43,    // 3 of Pentacles (Formation, inner of Breakthrough) → 2 of Cups (Merge, inner of Imagination) — R-49 keep-side: the twin parent's bound, same side (Lumen's law: side XOR half kept); was 37
  55: 46,    // 4 of Pentacles (Preservation, inner of Transformation) → 5 of Cups (Conscience, inner of Equity) — R-49 keep-side: the twin parent's bound, same side (Lumen's law: side XOR half kept); was 47
  56: 45,    // 5 of Pentacles (Steadfastness, inner of Fortitude) → 4 of Cups (Reverie, inner of Compassion) — R-49 keep-side: the twin parent's bound, same side (Lumen's law: side XOR half kept); was 48
  57: 48,    // 6 of Pentacles (Support, outer of Fortitude) → 7 of Cups (Allure, outer of Compassion) — R-49 keep-side: the twin parent's bound, same side (Lumen's law: side XOR half kept); was 45
  58: 47,    // 7 of Pentacles (Harvest, outer of Transformation) → 6 of Cups (Reciprocity, outer of Equity) — R-49 keep-side: the twin parent's bound, same side (Lumen's law: side XOR half kept); was 46
  59: 50,    // 8 of Pentacles (Commitment, outer of Breakthrough) → 9 of Cups (Fulfillment, outer of Imagination) — R-49 keep-side: the twin parent's bound, same side (Lumen's law: side XOR half kept); was 36
  60: 49,    // 9 of Pentacles (Flourishing, outer of Nurturing) → 8 of Cups (Passage, outer of Culture) — R-49 keep-side: the twin parent's bound, same side (Lumen's law: side XOR half kept); was 26
  61: 57     // 10 of Pentacles (Achievement, outer of Will) → 6 of Pentacles (Support, outer of Fortitude) — R-70 half rule: Bridge→Seed stays in the opening half, so the side is kept; was 56
};

// CANONICAL AGENT GROWTH - Direct lookup from B20 BUG FIX spec
// Maps balanced Agent ID to growth target Agent ID
// R-49 (founder 2026-11-02): an agent grows into the twin parent's agent, nothing added. The role swaps with the house
// (Initiate↔Catalyst, Steward↔Executor) and the agent's inner/outer, its parent's half, is kept (Lumen's law, as for the bounds).
const AGENT_GROWTH_TARGETS = {
  62: 67,    // Page of Wands (Inspiration) → Knight of Swords (Abstraction)
  63: 66,    // Knight of Wands (Authority) → Page of Swords (Wisdom)
  64: 69,    // Queen of Wands (Drive) → King of Swords (Discipline) — R-49: the twin parent's agent; was 70 Page of Cups
  65: 68,    // King of Wands (Faith) → Queen of Swords (Tune) — R-49: the twin parent's agent; was 74 Page of Pentacles
  66: 63,    // Page of Swords (Wisdom) → Knight of Wands (Authority)
  67: 62,    // Knight of Swords (Abstraction) → Page of Wands (Inspiration)
  68: 65,    // Queen of Swords (Tune) → King of Wands (Faith) — R-49: the twin parent's agent; was 71 Knight of Cups
  69: 64,    // King of Swords (Discipline) → Queen of Wands (Drive) — R-49: the twin parent's agent; was 75 Knight of Pentacles
  70: 75,    // Page of Cups (Imagination) → Knight of Pentacles (Breakthrough) — R-49: the twin parent's agent; was 64 Queen of Wands
  71: 74,    // Knight of Cups (Culture) → Page of Pentacles (Nurturing) — R-49: the twin parent's agent; was 68 Queen of Swords
  72: 77,    // Queen of Cups (Compassion) → King of Pentacles (Fortitude)
  73: 76,    // King of Cups (Equity) → Queen of Pentacles (Transformation)
  74: 71,    // Page of Pentacles (Nurturing) → Knight of Cups (Culture) — R-49: the twin parent's agent; was 65 King of Wands
  75: 70,    // Knight of Pentacles (Breakthrough) → Page of Cups (Imagination) — R-49: the twin parent's agent; was 69 King of Swords
  76: 73,    // Queen of Pentacles (Transformation) → King of Cups (Equity)
  77: 72     // King of Pentacles (Fortitude) → Queen of Cups (Compassion)
};

// CANONICAL AGENT DIAGONAL (Too Much)
// FOUNDER-RULED PATTERN (2026-07-27): agents inherit their underlying archetype's
// correction geometry wholesale — the target is the RESIDENT AGENT of
// DIAGONAL_PAIRS[agent.archetype]. Rank is preserved automatically: the archetype
// rank-quads {2,3,17,18}=Initiate, {4,5,15,16}=Catalyst, {6,7,13,14}=Steward,
// {8,9,11,12}=Executor are each closed under the diagonal pairing. Diagonal crosses
// Intent↔Cognition and Resonance↔Structure.
// BUG FIX 2026-07-27: the previous table applied a ROLE_FLIP that belongs only to
// REDUCTION geometry (whose mod-9 pairs genuinely cross the rank quads). All 16
// entries were wrong. Caught live by the founder (Executor corrects Executor).
const AGENT_DIAGONAL_TARGETS = {
  62: 66,    // Initiate of Intent (Inspiration 17) → Initiate of Cognition (Wisdom 2)
  63: 67,    // Catalyst of Intent (Authority 4) → Catalyst of Cognition (Abstraction 15)
  64: 68,    // Steward of Intent (Drive 7) → Steward of Cognition (Tune 14)
  65: 69,    // Executor of Intent (Faith 12) → Executor of Cognition (Discipline 9)
  66: 62,    // Initiate of Cognition (Wisdom 2) → Initiate of Intent (Inspiration 17)
  67: 63,    // Catalyst of Cognition (Abstraction 15) → Catalyst of Intent (Authority 4)
  68: 64,    // Steward of Cognition (Tune 14) → Steward of Intent (Drive 7)
  69: 65,    // Executor of Cognition (Discipline 9) → Executor of Intent (Faith 12)
  70: 74,    // Initiate of Resonance (Imagination 18) → Initiate of Structure (Nurturing 3)
  71: 75,    // Catalyst of Resonance (Culture 5) → Catalyst of Structure (Breakthrough 16)
  72: 76,    // Steward of Resonance (Compassion 6) → Steward of Structure (Transformation 13)
  73: 77,    // Executor of Resonance (Equity 11) → Executor of Structure (Fortitude 8)
  74: 70,    // Initiate of Structure (Nurturing 3) → Initiate of Resonance (Imagination 18)
  75: 71,    // Catalyst of Structure (Breakthrough 16) → Catalyst of Resonance (Culture 5)
  76: 72,    // Steward of Structure (Transformation 13) → Steward of Resonance (Compassion 6)
  77: 73     // Executor of Structure (Fortitude 8) → Executor of Resonance (Equity 11)
};

// CANONICAL AGENT VERTICAL (Too Little)
// FOUNDER-RULED PATTERN (2026-07-27): agents inherit their underlying archetype's
// correction geometry wholesale — the target is the RESIDENT AGENT of
// VERTICAL_PAIRS[agent.archetype]. Rank is preserved automatically (the sum-20
// vertical pairing is closed on each rank-quad). Vertical crosses Intent↔Structure
// and Cognition↔Resonance: what you lack, your same-rank counterpart across the
// polarity axis holds.
// BUG FIX 2026-07-27: the previous table was entry-for-entry identical to
// AGENT_REDUCTION_TARGETS — reduction geometry (mod-9, rank-flipping) had been
// copied into the vertical slot under a mistaken universal ROLE_FLIP pattern,
// and the 2026-05-13 note shows CANONICAL_78_CORRECTIONS.md line 305 was edited
// to FIT that wrong pattern. All 16 entries were wrong. Caught live by the
// founder: Too Little Executor of Structure corrects via the Executor of Intent
// (Fortitude 8 → vertical 12 Faith → its resident Executor), never a rank flip.
const AGENT_VERTICAL_TARGETS = {
  62: 74,    // Initiate of Intent (Inspiration 17) → Initiate of Structure (Nurturing 3)
  63: 75,    // Catalyst of Intent (Authority 4) → Catalyst of Structure (Breakthrough 16)
  64: 76,    // Steward of Intent (Drive 7) → Steward of Structure (Transformation 13)
  65: 77,    // Executor of Intent (Faith 12) → Executor of Structure (Fortitude 8)
  66: 70,    // Initiate of Cognition (Wisdom 2) → Initiate of Resonance (Imagination 18)
  67: 71,    // Catalyst of Cognition (Abstraction 15) → Catalyst of Resonance (Culture 5)
  68: 72,    // Steward of Cognition (Tune 14) → Steward of Resonance (Compassion 6)
  69: 73,    // Executor of Cognition (Discipline 9) → Executor of Resonance (Equity 11)
  70: 66,    // Initiate of Resonance (Imagination 18) → Initiate of Cognition (Wisdom 2)
  71: 67,    // Catalyst of Resonance (Culture 5) → Catalyst of Cognition (Abstraction 15)
  72: 68,    // Steward of Resonance (Compassion 6) → Steward of Cognition (Tune 14)
  73: 69,    // Executor of Resonance (Equity 11) → Executor of Cognition (Discipline 9)
  74: 62,    // Initiate of Structure (Nurturing 3) → Initiate of Intent (Inspiration 17)
  75: 63,    // Catalyst of Structure (Breakthrough 16) → Catalyst of Intent (Authority 4)
  76: 64,    // Steward of Structure (Transformation 13) → Steward of Intent (Drive 7)
  77: 65     // Executor of Structure (Fortitude 8) → Executor of Intent (Faith 12)
};

// CANONICAL AGENT REDUCTION (Unacknowledged) - Direct lookup from CANONICAL_78_CORRECTIONS.md
// Source: lib/CANONICAL_78_CORRECTIONS.md "Agents Complete Reference" table, "Unacknowledged →" column
// Pattern: archetype REDUCTION_PAIRS partner agent (which inherently flips polarity Inner↔Outer)
const AGENT_REDUCTION_TARGETS = {
  62: 77,    // Page of Wands → King of Pentacles
  63: 76,    // Knight of Wands → Queen of Pentacles
  64: 75,    // Queen of Wands → Knight of Pentacles
  65: 74,    // King of Wands → Page of Pentacles
  66: 73,    // Page of Swords → King of Cups
  67: 72,    // Knight of Swords → Queen of Cups
  68: 71,    // Queen of Swords → Knight of Cups
  69: 70,    // King of Swords → Page of Cups
  70: 69,    // Page of Cups → King of Swords
  71: 68,    // Knight of Cups → Queen of Swords
  72: 67,    // Queen of Cups → Knight of Swords
  73: 66,    // King of Cups → Page of Swords
  74: 65,    // Page of Pentacles → King of Wands
  75: 64,    // Knight of Pentacles → Queen of Wands
  76: 63,    // Queen of Pentacles → Knight of Wands
  77: 62     // King of Pentacles → Page of Wands
};

// Build ARCHETYPE_AGENTS dynamically from AGENTS data
// Maps archetype ID to { inner: agentId|undefined, outer: agentId|undefined }
function buildArchetypeAgentsMap() {
  const mapping = {};
  for (const [id, agent] of Object.entries(AGENTS)) {
    const arch = agent.archetype;
    if (!mapping[arch]) mapping[arch] = {};
    // Inner: Initiate (Page), Catalyst (Knight)
    // Outer: Steward (Queen), Executor (King)
    const polarity = ['Initiate', 'Catalyst'].includes(agent.role) ? 'inner' : 'outer';
    mapping[arch][polarity] = parseInt(id);
  }
  return mapping;
}
const ARCHETYPE_AGENTS = buildArchetypeAgentsMap();

// DIAGONAL_PAIRS (Too Much correction)
export const DIAGONAL_PAIRS = {
  0: 19,   // Potential → Actualization
  1: 20,   // Will → Recognition
  2: 17,   // Wisdom → Inspiration
  3: 18,   // Nurturing → Imagination
  4: 15,   // Authority → Abstraction
  5: 16,   // Culture → Breakthrough
  6: 13,   // Compassion → Transformation
  7: 14,   // Drive → Tune
  8: 11,   // Fortitude → Equity
  9: 12,   // Discipline → Faith
  10: 21,  // Source (Portal) → Creation (the other door; founder-gaveled 2026-09-27, applied 2026-10-02)
  11: 8,   // Equity → Fortitude
  12: 9,   // Faith → Discipline
  13: 6,   // Transformation → Compassion
  14: 7,   // Tune → Drive
  15: 4,   // Abstraction → Authority
  16: 5,   // Breakthrough → Culture
  17: 2,   // Inspiration → Wisdom
  18: 3,   // Imagination → Nurturing
  19: 0,   // Actualization → Potential
  20: 1,   // Recognition → Will
  21: 10   // Creation (Portal) → Source (the other door; founder-gaveled 2026-09-27, applied 2026-10-02)
};

// VERTICAL_PAIRS (Too Little correction)
export const VERTICAL_PAIRS = {
  0: 20,   // Potential → Recognition
  1: 19,   // Will → Actualization
  2: 18,   // Wisdom → Imagination
  3: 17,   // Nurturing → Inspiration
  4: 16,   // Authority → Breakthrough
  5: 15,   // Culture → Abstraction
  6: 14,   // Compassion → Tune
  7: 13,   // Drive → Transformation
  8: 12,   // Fortitude → Faith
  9: 11,   // Discipline → Equity
  10: 21,  // Source (Portal) → Creation (the other door; founder-gaveled 2026-09-27, applied 2026-10-02)
  11: 9,   // Equity → Discipline
  12: 8,   // Faith → Fortitude
  13: 7,   // Transformation → Drive
  14: 6,   // Tune → Compassion
  15: 5,   // Abstraction → Culture
  16: 4,   // Breakthrough → Authority
  17: 3,   // Inspiration → Nurturing
  18: 2,   // Imagination → Wisdom
  19: 1,   // Actualization → Will
  20: 0,   // Recognition → Potential
  21: 10   // Creation (Portal) → Source (the other door; founder-gaveled 2026-09-27, applied 2026-10-02)
};

// REDUCTION_PAIRS (Unacknowledged correction)
// null means no reduction pair exists for that position
// Reduction = one-step digit reduction (n → digit sum), the mod-9 descent.
// Manifest 16: the ±9 twin (antipode). Frame & portals (founder-ruled 2026-07-13,
// POSIT_Frozen_And_Fluid): every double-digit signature reduces one step —
// 10→1 (the Wheel back to Will), 19→10 (Actualization remembers Source),
// 20→2 (Judgement leans back to Wisdom, the first manifest archetype),
// 21→3 (Creation remembers Nurturing). 0 and 1 are the ground floor: red(0)=0,
// red(1)=1 — they do not descend; self-reference (isSelf) is correct, not a gap.
// AMENDED (founder-gaveled 2026-09-27, applied 2026-10-02): the OUTSIDE SIX step down nine and wrap at the bottom —
// 0→18, 1→19, 10→1, 19→10, 20→11, 21→12. No archetype reduces to itself any more; the manifest sixteen are unchanged.
export const REDUCTION_PAIRS = {
  0: 18,    // Potential → Imagination (step down nine, wrap)
  1: 19,    // Will → Actualization (step down nine, wrap)
  2: 11,    // Wisdom → Equity
  3: 12,    // Nurturing → Faith
  4: 13,    // Authority → Transformation
  5: 14,    // Culture → Tune
  6: 15,    // Compassion → Abstraction
  7: 16,    // Drive → Breakthrough
  8: 17,    // Fortitude → Inspiration
  9: 18,    // Discipline → Imagination
  10: 1,    // Source → Will (the Wheel back to Will)
  11: 2,    // Equity → Wisdom
  12: 3,    // Faith → Nurturing
  13: 4,    // Transformation → Authority
  14: 5,    // Tune → Culture
  15: 6,    // Abstraction → Compassion
  16: 7,    // Breakthrough → Drive
  17: 8,    // Inspiration → Fortitude
  18: 9,    // Imagination → Discipline
  19: 10,   // Actualization → Source (19→10, the first rung of the root-1 spine)
  20: 11,   // Recognition → Equity (step down nine)
  21: 12    // Creation → Faith (step down nine)
};

// Simple lookup-based correction - NO FORMULAS
// Every signature in every state points somewhere (no nulls)
export function getArchetypeCorrection(transientPosition, status) {
  if (status === 1) {
    // Balanced → Growth partner (or self if null)
    const growthTarget = GROWTH_PAIRS[transientPosition];
    if (growthTarget === null) {
      // Self-reference for Gestalt/Portal archetypes
      return { type: "growth", target: transientPosition, isSelf: true };
    }
    return { type: "growth", target: growthTarget, isSelf: false };
  }

  if (status === 2) {
    // Too Much → Diagonal partner
    const target = DIAGONAL_PAIRS[transientPosition];
    return target !== undefined ? { type: "diagonal", target, isSelf: false } : null;
  }

  if (status === 3) {
    // Too Little → Vertical partner
    const target = VERTICAL_PAIRS[transientPosition];
    return target !== undefined ? { type: "vertical", target, isSelf: false } : null;
  }

  if (status === 4) {
    // Unacknowledged → Reduction pair (or self if null)
    const target = REDUCTION_PAIRS[transientPosition];
    if (target === null) {
      // Self-reference for archetypes without reduction pairs
      return { type: "reduction", target: transientPosition, isSelf: true };
    }
    return { type: "reduction", target, isSelf: false };
  }

  return null;
}

// Get all Bounds and Agents that express/embody a given Archetype
export function getAssociatedCards(archetypeId) {
  const bounds = Object.entries(BOUNDS)
    .filter(([_, b]) => b.archetype === archetypeId)
    .map(([id, b]) => ({ id: parseInt(id), ...b, type: 'Bound' }));
  const agents = Object.entries(AGENTS)
    .filter(([_, a]) => a.archetype === archetypeId)
    .map(([id, a]) => ({ id: parseInt(id), ...a, type: 'Agent' }));
  return { bounds, agents };
}

// R-70 (founder 2026-11-06): the half of the process a stage sits in. Seed and Bridge (also named Medium) = opening;
// Fruition and Feedback = closing. The doors (Ingress, Egress) have no half and no bounds.
function stageHalf(stage) {
  if (stage === 'Seed' || stage === 'Bridge' || stage === 'Medium') return 'opening';
  if (stage === 'Fruition' || stage === 'Feedback') return 'closing';
  return null;
}

// Bound correction follows the archetype path; the side follows the half rule (R-70)
// Example: Too Little 6 of Wands (Faith) → 5 of Pentacles (Fortitude) (Feedback→Seed crosses the half, so the side flips)
// For BALANCED bounds: Use canonical lookup table (BOUND_GROWTH_TARGETS)
export function getBoundCorrection(bound, status) {
  // For BALANCED status, use canonical lookup table directly
  // This ensures correct growth targets without relying on dynamic calculation
  if (status === 1) {
    const growthTargetId = BOUND_GROWTH_TARGETS[bound.id];

    if (growthTargetId === null) {
      // (no bound is null since 2026-10-02; kept as a guard)
      return {
        type: "growth",
        targetId: bound.id,
        targetBound: bound,
        isSelf: true
      };
    }

    if (growthTargetId !== undefined) {
      const targetBound = BOUNDS[growthTargetId];
      return {
        type: "growth",
        targetId: growthTargetId,
        targetBound: targetBound,
        isSelf: false
      };
    }
    // Fallback to dynamic calculation if not in canonical table
  }

  // For imbalanced states (status !== 1), use dynamic calculation
  // 1. Get the Bound's associated Archetype
  const archetypeId = bound.archetype;

  // 2. Get the Archetype's correction partner
  const archetypeCorrection = getArchetypeCorrection(archetypeId, status);
  if (!archetypeCorrection) return null;

  // 2a. Bug fix 2026-05-13: When the archetype-level correction is a
  // self-reference (Gestalt archetypes 0/1/19/20 have null REDUCTION_PAIRS),
  // the bound is also a self-reference per canonical. Without this guard
  // the polarity-flip logic below incorrectly returns the opposite-polarity
  // bound in the same Gestalt archetype (Ace ↔ 10 swap), which contradicts
  // CANONICAL_78_CORRECTIONS.md (Aces/10s Unacknowledged are marked self).
  if (archetypeCorrection.isSelf) {
    return {
      type: archetypeCorrection.type,
      targetId: bound.id,
      targetBound: bound,
      isSelf: true
    };
  }

  const targetArchetypeId = archetypeCorrection.target;

  // 3. Determine the target side by the HALF RULE (R-70, founder 2026-11-06), one side rule for all forty Bounds.
  // Lumen's law: λ = side XOR the parent's half is kept by every medicine. The opening half is Seed and Bridge
  // (Medium), the closing half is Fruition and Feedback. When the parent archetype's medicine stays within its half,
  // the bound keeps its side (inner stays inner, outer stays outer); when it crosses halves, the bound crosses sides.
  // On the manifest sixteen, Too Much / Too Little / Unacknowledged always cross the half, so they flip as before;
  // the one Soul-row case that stays in its half here is Recognition 20 → Equity 11 at Unacknowledged (Feedback→Fruition).
  // Inner: numbers 1-5 (Ace through 5), Outer: numbers 6-10
  const isInner = bound.number <= 5;
  const sourceHalf = stageHalf(ARCHETYPES[archetypeId]?.function);
  const targetHalf = stageHalf(ARCHETYPES[targetArchetypeId]?.function);
  const sameHalf = sourceHalf !== null && sourceHalf === targetHalf;
  const targetPolarity = sameHalf ? (isInner ? 'inner' : 'outer') : (isInner ? 'outer' : 'inner');

  // 4. Get the corresponding Bound from target Archetype
  const targetBoundMapping = ARCHETYPE_BOUNDS[targetArchetypeId];
  if (!targetBoundMapping) {
    // The family's partner has no bounds — a portal (Actualization → Source at Unacknowledged). The bound refers to the
    // portal itself, as its family does (founder 2026-10-02: the Gestalt bounds work like their families).
    const portal = getComponent(targetArchetypeId);
    return {
      type: archetypeCorrection.type,
      targetId: targetArchetypeId,
      targetBound: portal,
      isPortal: true,
      isSelf: false
    };
  }

  const targetBoundId = targetBoundMapping[targetPolarity];
  if (!targetBoundId) {
    // Self-reference if no target exists at that polarity
    return {
      type: archetypeCorrection.type,
      targetId: bound.id,
      targetBound: bound,
      isSelf: true
    };
  }

  const targetBound = BOUNDS[targetBoundId];
  return {
    type: archetypeCorrection.type,
    targetId: targetBoundId,
    targetBound: targetBound,
    isSelf: false
  };
}

// Agent correction - ALL FOUR STATES use canonical lookup tables
// Source: lib/CANONICAL_78_CORRECTIONS.md "Agents Complete Reference" table
//
// Previously the imbalanced branch used a dynamic derivation
// (channel-shift + same-role) that produced wrong answers because
// it held court rank constant when navigating to a target archetype
// whose resident agent has a different role. The canonical pattern is
// archetype-pair + ROLE_FLIP (Initiate↔Executor, Catalyst↔Steward).
// Replaced with direct lookups against canonical to match the
// established AGENT_GROWTH_TARGETS pattern. Bug fix 2026-05-13.
export function getAgentCorrection(agent, status) {
  let targetAgentId;
  let type;

  if (status === 1) {
    type = "growth";
    targetAgentId = AGENT_GROWTH_TARGETS[agent.id];
  } else if (status === 2) {
    type = "diagonal";
    targetAgentId = AGENT_DIAGONAL_TARGETS[agent.id];
  } else if (status === 3) {
    type = "vertical";
    targetAgentId = AGENT_VERTICAL_TARGETS[agent.id];
  } else if (status === 4) {
    type = "reduction";
    targetAgentId = AGENT_REDUCTION_TARGETS[agent.id];
  } else {
    return null;
  }

  // Self-reference fallback if agent ID is missing from the lookup
  // (shouldn't happen for canonical IDs 62-77)
  if (targetAgentId === undefined) {
    return {
      type,
      target: agent.archetype,
      targetAgentId: agent.id,
      targetAgent: agent,
      isSelf: true
    };
  }

  const targetAgent = AGENTS[targetAgentId];
  // The archetype-level target is the target agent's underlying archetype
  // (kept for callers that surface the archetype path alongside the agent answer)
  const targetArchetypeId = targetAgent?.archetype;

  return {
    type,
    target: targetArchetypeId,
    targetAgentId,
    targetAgent,
    isSelf: false
  };
}

export function getComponent(id) {
  if (id < 22) return { ...ARCHETYPES[id], type: "Archetype", id };
  if (id < 62) return { ...BOUNDS[id], type: "Bound", id };
  return { ...AGENTS[id], type: "Agent", id };
}

export function getFullCorrection(transientId, status) {
  const trans = getComponent(transientId);
  if (trans.type === "Archetype") return getArchetypeCorrection(transientId, status);
  if (trans.type === "Bound") return getBoundCorrection(trans, status);
  if (trans.type === "Agent") return getAgentCorrection(trans, status);
  return null;
}

export function getCorrectionText(correction, trans, status) {
  if (!correction) return null;

  // Determine correction type based on correction.type or status
  let correctionType;
  if (correction.type === 'growth') {
    correctionType = 'GROWTH';
  } else if (correction.type === 'diagonal' || status === 2) {
    correctionType = 'DIAGONAL';
  } else if (correction.type === 'vertical' || status === 3) {
    correctionType = 'VERTICAL';
  } else if (correction.type === 'reduction' || status === 4) {
    correctionType = 'REDUCTION';
  }

  // Handle self-references (recursion points - Gestalt/Portal in balance)
  if (correction.isSelf) {
    if (trans.type === "Bound" && correction.targetBound) {
      return `${correction.targetBound.name} (self - recursion point)`;
    }
    if (trans.type === "Agent" && correction.targetAgent) {
      return `${correction.targetAgent.name} (self - recursion point)`;
    }
    const arch = ARCHETYPES[correction.target];
    if (arch) {
      return `${arch.name} (self - recursion point)`;
    }
    return `${trans.name} (self - recursion point)`;
  }

  // For Bounds, show the target Bound
  if (trans.type === "Bound" && correction.targetBound) {
    const targetBound = correction.targetBound;
    const label = correctionType === "REDUCTION" ? "pair" : correctionType === "GROWTH" ? "opportunity" : "duality";
    return `${targetBound.name} via ${correctionType} ${label}`;
  }

  // For Agents, show the target Agent
  if (trans.type === "Agent" && correction.targetAgent) {
    const label = correctionType === "REDUCTION" ? "pair" : correctionType === "GROWTH" ? "opportunity" : "duality";
    return `${correction.targetAgent.name} via ${correctionType} ${label}`;
  }

  // For Archetypes, show the target Archetype
  if (correction.target !== undefined) {
    const targetArchetype = ARCHETYPES[correction.target];
    if (targetArchetype) {
      const label = correctionType === "REDUCTION" ? "pair" : correctionType === "GROWTH" ? "opportunity" : "duality";
      return `${targetArchetype.name} via ${correctionType} ${label}`;
    }
  }

  if (correction.targets) {
    return correction.targets.map(t => {
      const arch = ARCHETYPES[t];
      return arch ? `${arch.name}` : null;
    }).filter(Boolean).join(", ");
  }
  return null;
}

export function getCorrectionTargetId(correction, trans) {
  if (!correction) return null;
  if (trans.type === "Bound" && correction.targetId !== undefined) return correction.targetId;
  // For Agents, return the target Agent ID (not just the Archetype)
  if (trans.type === "Agent" && correction.targetAgentId !== undefined) return correction.targetAgentId;
  if (correction.target !== undefined) return correction.target;
  if (correction.targets && correction.targets.length > 0) return correction.targets[0];
  return null;
}
