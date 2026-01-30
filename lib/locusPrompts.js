// lib/locusPrompts.js
// Locus Control — prompt injections for different reading "zoom levels"
// When locus is 'individual' (default), NO injection happens — existing behavior unchanged.

// ─────────────────────────────────────────────────────────────────────────────
// LOCUS OPTIONS — metadata for UI
// ─────────────────────────────────────────────────────────────────────────────

export const LOCUS_OPTIONS = [
  { key: 'individual', label: 'Just Me', needsDetail: false },
  { key: 'relationship', label: 'A Relationship', needsDetail: true, detailPrompt: 'Who?' },
  { key: 'family', label: 'My Family', needsDetail: false },
  { key: 'team', label: 'My Team/Group', needsDetail: true, detailPrompt: 'Which?' },
  { key: 'community', label: 'My Community', needsDetail: false },
  { key: 'custom', label: 'Custom...', needsDetail: true, detailPrompt: 'Describe your focus' }
];

// ─────────────────────────────────────────────────────────────────────────────
// INJECTION CONSTANTS — one per locus type
// ─────────────────────────────────────────────────────────────────────────────

const RELATIONSHIP_INJECTION = `
═══════════════════════════════════════════════════════════════
LOCUS: RELATIONSHIP
═══════════════════════════════════════════════════════════════

This reading is for a RELATIONSHIP, not an individual alone.

PRONOUNS:
- Use: "you both", "the relationship", "your connection", "between you", "the bond"
- Avoid: Solo "you" unless referring to the reader's role in the dynamic

METAPHORS:
- Draw from: polarity, dance, dialogue, mirroring, attunement, tension, resonance
- The space between two people, not inside one person
- The relationship as its own living system

AGENCY/AUTHORSHIP:
- The reader is ONE participant, not the whole system
- Frame levers as: "your side of the dynamic", "what you bring to this"
- Avoid: implying reader can fix it alone or control the other person

POSITION MEANING SHIFT:
- Change = transformation the relationship is undergoing
- Drive = the shared momentum or desire between them
- Awareness = what the relationship is conscious of (or avoiding)
- Balance = equilibrium between the two

ETHICS FRAMING (include once in reading):
"This reflects the field as you experience it — your partner may sense different patterns."
`;

const FAMILY_INJECTION = `
═══════════════════════════════════════════════════════════════
LOCUS: FAMILY
═══════════════════════════════════════════════════════════════

This reading is for a FAMILY SYSTEM, not an individual alone.

PRONOUNS:
- Use: "your family", "the family", "the system you share", "this lineage"
- "You" = the reader's role/position within the family

METAPHORS:
- Draw from: inheritance, patterns, roles, boundaries, generations, roots
- Spoken and unspoken rules, assigned roles, repetition across time
- The family as organism with memory

AGENCY/AUTHORSHIP:
- Reader is one node in the system, not the controller
- Frame levers as: "your position in this system", "what you can shift from where you stand"
- Acknowledge: systems resist change, one person can seed shift but not force it

POSITION MEANING SHIFT:
- Change = what the family is collectively metabolizing (loss, transition, growth)
- Discipline = family patterns of structure, expectation, rigor
- Nurturing = how care flows (or doesn't) through the system
- Awareness = what the family knows about itself vs. what it hides

ETHICS FRAMING (include once in reading):
"This reading reflects the family field as you experience it. Others in the system may hold different truths."
`;

const TEAM_INJECTION = `
═══════════════════════════════════════════════════════════════
LOCUS: TEAM / GROUP
═══════════════════════════════════════════════════════════════

This reading is for a TEAM or GROUP, not an individual alone.

PRONOUNS:
- Use: "the team", "your group", "the collective", "this working body"
- "You" = the reader's role within the team

METAPHORS:
- Draw from: alignment, friction, mission, contribution, roles, coordination
- Shared goals, competing priorities, communication flows
- The team as functional (or dysfunctional) organism

AGENCY/AUTHORSHIP:
- Reader's position matters: leader, member, or observer?
- Frame levers as: "what you can influence from your seat", "where you have leverage"
- Acknowledge: team dynamics have inertia, culture resists individual will

POSITION MEANING SHIFT:
- Drive = the team's shared momentum, motivation, hunger
- Order = structure, hierarchy, process (too much = bureaucracy, too little = chaos)
- Culture = team identity, norms, belonging
- Breakthrough = innovation, disruption to stale patterns

ETHICS FRAMING (include once in reading):
"This reflects the team field from your vantage point. Others may experience different patterns."
`;

const COMMUNITY_INJECTION = `
═══════════════════════════════════════════════════════════════
LOCUS: COMMUNITY
═══════════════════════════════════════════════════════════════

This reading is for a COMMUNITY, not an individual alone.

PRONOUNS:
- Use: "the community", "your people", "this collective body", "the group you belong to"
- "You" = the reader's position as a community member

METAPHORS:
- Draw from: belonging, contribution, identity, gathering, boundaries, commons
- Shared space, shared values, inclusion/exclusion dynamics
- The community as living network

AGENCY/AUTHORSHIP:
- Reader is participant, not owner
- Frame levers as: "your contribution", "what you can offer or withhold"
- Acknowledge: communities move slowly, shift through participation not mandate

POSITION MEANING SHIFT:
- Compassion = how the community cares for its members
- Culture = shared identity, rituals, norms
- Balance = harmony between subgroups, interests
- Sacrifice = what the community asks of its members

ETHICS FRAMING (include once in reading):
"This reflects the community as you experience it. Others may hold different truths about this space."
`;

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM INJECTION — dynamically built from user input
// ─────────────────────────────────────────────────────────────────────────────

function buildCustomInjection(userInput) {
  return `
═══════════════════════════════════════════════════════════════
LOCUS: CUSTOM — "${userInput}"
═══════════════════════════════════════════════════════════════

The user has defined a custom locus: "${userInput}"

INTERPRETATION GUIDELINES:
- Parse the input to infer: Is this about a person? A group? A project? A relationship?
- Adapt pronouns accordingly
- Use the user's language where possible

METAPHOR SELECTION:
- If relational → use relationship metaphors
- If project/work → use team/mission metaphors
- If abstract ("my healing") → blend personal + journey metaphors
- If living being ("my dog") → honor the being as co-participant

AGENCY/AUTHORSHIP:
- Infer reader's position relative to the locus
- Default to: "what you can influence from where you stand"

ETHICS FRAMING (include once in reading):
"This reading reflects the field from your perspective."
`;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT — builds the correct injection for a given locus
// ─────────────────────────────────────────────────────────────────────────────

// Build subject-specific context to append to any locus injection
function buildSubjectContext(locus, detail) {
  if (!detail) return '';

  if (locus === 'relationship') {
    return `
SPECIFIC SUBJECT: "${detail}"
The reader has identified this relationship as being with/about "${detail}".
- Use their name or description naturally in the reading (e.g., "your connection with ${detail}", "between you and ${detail}")
- Still address the reader as "you" — they are the one receiving the reading
- Frame the other person by name when relevant: "what ${detail} may be experiencing", "your dynamic with ${detail}"
- Do NOT overuse the name — weave it in naturally, especially at the start and in key moments
`;
  }

  if (locus === 'team') {
    return `
SPECIFIC SUBJECT: "${detail}"
The reader has identified this team/group as "${detail}".
- Reference the team by name naturally (e.g., "within ${detail}", "the ${detail} team")
- Frame the reader's position relative to "${detail}"
`;
  }

  // Generic fallback for family, community, etc.
  return `
SPECIFIC SUBJECT: "${detail}"
The reader has provided additional context: "${detail}".
Incorporate this naturally into the reading where relevant.
`;
}

const LOCUS_INJECTIONS = {
  relationship: RELATIONSHIP_INJECTION,
  family: FAMILY_INJECTION,
  team: TEAM_INJECTION,
  community: COMMUNITY_INJECTION
};

/**
 * Build the locus prompt injection for a given locus type.
 * Returns empty string for 'individual' (no injection — existing behavior unchanged).
 *
 * @param {string} locus - 'individual' | 'relationship' | 'family' | 'team' | 'community' | 'custom'
 * @param {string} locusDetail - Optional detail text (e.g., "my wife Sarah", "the EPPM team")
 * @returns {string} Prompt injection string, or '' if no injection needed
 */
export function buildLocusInjection(locus, locusDetail = '') {
  if (!locus || locus === 'individual') return '';

  if (locus === 'custom') {
    return buildCustomInjection(locusDetail || 'custom focus');
  }

  const injection = LOCUS_INJECTIONS[locus];
  if (!injection) return '';

  // If detail provided, weave it into the injection so the AI uses the name/subject
  if (locusDetail) {
    const subjectBlock = buildSubjectContext(locus, locusDetail);
    return `${injection}\n${subjectBlock}`;
  }

  return injection;
}
