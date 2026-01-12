// === MODE SYSTEM ===
// Mode declarations and constraints for Reflect/Discover/Forge governance

export const MODES = {
  REFLECT: 'reflect',
  DISCOVER: 'discover',
  FORGE: 'forge',
  EXPLORE: 'explore'  // DTP mode - Direct Token Protocol
};

export const MODE_CONSTRAINTS = {
  reflect: {
    label: 'Reflect',
    operation: 'consume',
    coreQuestion: 'What is already happening?',
    allowedVerbs: [
      'is', 'appears', 'shows up as', 'is operating',
      'is oriented toward', 'tends to', 'is currently configured',
      'is expressing through'
    ],
    bannedVerbs: [
      'should', 'need to', 'must', 'fix', 'change',
      'build', 'stop', 'start', 'choose', 'decide'
    ],
    canSurfaceLevers: false,
    canAskQuestions: false,
    requiresTransitionMarker: false
  },
  discover: {
    label: 'Discover',
    operation: 'consume_to_latent_create',
    coreQuestion: 'Where is authorship already available?',
    allowedVerbs: [
      'is already doing', 'is available', 'is active', 'is holding',
      'is capable of', 'is positioned to', 'could be claimed',
      'is present without being named'
    ],
    conditionalVerbs: ['step in', 'lean into', 'step back', 'name', 'claim'],
    bannedVerbs: [
      'do this', 'replace', 'implement', 'build X',
      'correct Y', 'stop doing Z'
    ],
    canSurfaceLevers: true,
    canAskQuestions: true, // ONE present-tense question only
    requiresTransitionMarker: true // when approaching action
  },
  forge: {
    label: 'Forge',
    operation: 'create',
    coreQuestion: 'What changes when intention is asserted?',
    allowedVerbs: [
      'I am choosing', 'I am asserting', 'I am building',
      'I am withdrawing', 'I am holding', 'I am shaping',
      'I am testing', 'I am committing to', 'I am releasing'
    ],
    bannedVerbs: [
      'guarantee', 'ensure', 'will cause', 'make happen', 'force'
    ],
    requiresOwnership: true, // first-person or attributed to user intent
    requiresAuthorshipReturn: true,
    canSurfaceLevers: true,
    canAskQuestions: true
  },
  explore: {
    label: 'Explore',
    operation: 'discover_tokens',
    coreQuestion: 'What is active for you right now?',
    allowedVerbs: [
      'is expressing as', 'is structured by', 'is shaped through',
      'is currently configured', 'is operating', 'points to'
    ],
    bannedVerbs: [
      'will cause', 'means that', 'will lead to', 'destiny',
      'should', 'need to', 'must'
    ],
    canSurfaceLevers: true,
    canAskQuestions: false,  // DTP is declarative, not inquiry
    requiresTransitionMarker: false
  }
};

// Safety valve: fallback to Reflect under uncertainty
export function fallbackReflectOutput(context) {
  return {
    mode: 'reflect',
    content: `What is currently operating here cannot be clearly expressed within governance constraints. The configuration is present but requires your direct attention rather than interpretation.`,
    fallback: true
  };
}

// Canonical transition markers for Discover -> Forge boundary
export const TRANSITION_MARKERS = [
  "These are authorship locations — not instructions.",
  "No action is required; these are points of available authorship.",
  "Nothing needs to be done. This names where choice already exists.",
  "This is visibility, not direction."
];

// Authorship return closures for Forge mode
export const AUTHORSHIP_CLOSURES = [
  "Authorship remains with you.",
  "Observe what changes next."
];

// Map reading mode selection to interpretation mode
export const READING_MODE_TO_INTERPRETATION_MODE = {
  'reflect': 'reflect',
  'discover': 'discover',
  'forge': 'forge',
  'explore': 'explore'
};

// Get mode constraints for a given mode
export function getModeConstraints(mode) {
  return MODE_CONSTRAINTS[mode] || MODE_CONSTRAINTS.discover;
}

// Check if a mode allows lever surfacing
export function canSurfaceLevers(mode) {
  const constraints = getModeConstraints(mode);
  return constraints.canSurfaceLevers;
}

// Check if a mode allows questions
export function canAskQuestions(mode) {
  const constraints = getModeConstraints(mode);
  return constraints.canAskQuestions;
}

// Get the core question for a mode
export function getCoreQuestion(mode) {
  const constraints = getModeConstraints(mode);
  return constraints.coreQuestion;
}
