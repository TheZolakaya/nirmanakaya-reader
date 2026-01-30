// lib/locusPrompts.js
// Locus Control — prompt injections for reading focus beyond "Just Me"
//
// NEW MODEL (v2): Subjects-based. Users add names/entities as chips (up to 5).
// The AI infers the dynamic (family, romance, work, etc.) from the question
// context and the subjects provided. No rigid categories.
//
// Empty subjects array = "Just Me" = NO injection = existing behavior unchanged.

// ─────────────────────────────────────────────────────────────────────────────
// SUBJECT-BASED INJECTION — dynamically built from user-provided names/entities
// ─────────────────────────────────────────────────────────────────────────────

function buildSubjectsInjection(subjects) {
  const count = subjects.length;
  const nameList = subjects.map(s => `"${s}"`).join(', ');
  const isPlural = count > 1;
  const subjectPhrase = isPlural
    ? `the following people/entities: ${nameList}`
    : nameList;

  return `
═══════════════════════════════════════════════════════════════
LOCUS: FOCUSED READING — ${nameList}
═══════════════════════════════════════════════════════════════

This reading extends BEYOND the reader alone.
The reader has identified ${subjectPhrase} as the focus of this reading.

THE READER'S LENS:
- The reader is the one receiving this reading — always address them as "you"
- Everything is interpreted through the reader's perspective and experience
- The reader may be part of the system they're asking about, or observing it
- "You" = the reader. Use subject names when referring to others.

USING NAMES:
${subjects.map(s => `- Reference "${s}" by name naturally — weave it into the reading`).join('\n')}
- Use names at the start and at key interpretive moments
- Do NOT overuse names — natural language flow matters
- When the dynamic involves multiple subjects, name them in relation to each other
  (e.g., "between ${subjects[0]}${count > 1 ? ` and ${subjects[count - 1]}` : ''}", "your connection with ${subjects[0]}")

DYNAMIC INFERENCE:
- Infer the nature of the relationship/system from the reader's question and the subjects
- Do NOT assume: the question will reveal if this is romantic, familial, professional, or other
- Adapt pronouns, metaphors, and framing to match the inferred dynamic:
  ${isPlural ? `• Multiple people → system/group dynamics, roles, tensions, shared patterns` : `• Single person → interpersonal dynamic, connection, tension, resonance`}
  • Romantic → polarity, intimacy, dance, mirroring, attunement
  • Family → inheritance, patterns, roles, boundaries, generations, roots
  • Professional → alignment, mission, roles, coordination, friction
  • Friendship → trust, reciprocity, growth, distance, loyalty
  • Abstract entity → the entity as living system, the reader's relationship to it

AGENCY/AUTHORSHIP:
- The reader is ONE participant, not the controller of the whole system
- Frame levers as: "what you can influence from where you stand"
- ${isPlural
    ? 'Acknowledge: systems with multiple actors have their own momentum'
    : `Acknowledge: you cannot control ${subjects[0]}'s experience, only your side`}
- Never imply the reader can force outcomes on others

ETHICS FRAMING (include once, naturally):
"This reading reflects the field as you experience it — others in this dynamic may sense different patterns."
`;
}

// ─────────────────────────────────────────────────────────────────────────────
// BACKWARD COMPAT — convert old locus/locusDetail to subjects array
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert old-style locus category + detail into a subjects array.
 * Used when loading stored readings that predate the subjects model.
 *
 * @param {string} locus - Old category: 'individual'|'relationship'|'family'|'team'|'community'|'custom'
 * @param {string} locusDetail - Old detail text
 * @returns {string[]} Array of subject strings
 */
export function locusToSubjects(locus, locusDetail) {
  if (!locus || locus === 'individual') return [];

  // If detail was provided, it's the most specific info we have
  if (locusDetail) return [locusDetail];

  // Category-only fallback — use generic label so AI still gets context
  const labels = {
    relationship: 'your relationship',
    family: 'your family',
    team: 'your team',
    community: 'your community'
  };
  return labels[locus] ? [labels[locus]] : [];
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT — builds injection from subjects array
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the locus prompt injection from a subjects array.
 * Returns empty string when subjects is empty (= "Just Me", no injection).
 *
 * @param {string[]} subjects - Array of names/entities (0-5 items)
 * @returns {string} Prompt injection string, or '' if no injection needed
 */
export function buildLocusInjection(subjects) {
  if (!subjects || !Array.isArray(subjects) || subjects.length === 0) return '';

  // Filter out empty strings and cap at 5
  const cleaned = subjects.filter(s => s && s.trim()).slice(0, 5).map(s => s.trim());
  if (cleaned.length === 0) return '';

  return buildSubjectsInjection(cleaned);
}
