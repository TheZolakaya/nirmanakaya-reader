// === POSTURE SYSTEM ===
// Postures replace "modes" — they govern engagement intent (what questions are asked of reality)
// Posture is INDEPENDENT of Voice (how it's spoken) and Frame (where positional context comes from)
//
// UI labels: Reflect / Discover / Forge / Integrate
// Internal (process stage): Seed / Medium / Fruition / Feedback
//
// Structurally grounded in the canon's process cycle and correction geometry:
//   Seed (Reflect) ↔ Illumination — correction for Unacknowledged
//   Medium (Discover) ↔ Restoration — correction for Too Little
//   Fruition (Forge) ↔ Counter-force — correction for Too Much
//   Feedback (Integrate) ↔ Balanced/Here — return to Now

export const POSTURES = {
  REFLECT: 'reflect',
  DISCOVER: 'discover',
  FORGE: 'forge',
  INTEGRATE: 'integrate'
};

export const POSTURE_CONSTRAINTS = {
  reflect: {
    label: 'Reflect',
    processStage: 'Seed',
    operation: 'witness',
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
    requiresTransitionMarker: false,
    requiresOwnership: false,
    requiresAuthorshipReturn: false
  },
  discover: {
    label: 'Discover',
    processStage: 'Medium',
    operation: 'recognize_capacity',
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
    canAskQuestions: true,
    requiresTransitionMarker: true,
    requiresOwnership: false,
    requiresAuthorshipReturn: false
  },
  forge: {
    label: 'Forge',
    processStage: 'Fruition',
    operation: 'claim',
    coreQuestion: 'What changes when intention is asserted?',
    allowedVerbs: [
      'I am choosing', 'I am asserting', 'I am building',
      'I am withdrawing', 'I am holding', 'I am shaping',
      'I am testing', 'I am committing to', 'I am releasing'
    ],
    bannedVerbs: [
      'guarantee', 'ensure', 'will cause', 'make happen', 'force'
    ],
    canSurfaceLevers: true,
    canAskQuestions: true,
    requiresTransitionMarker: false,
    requiresOwnership: true,
    requiresAuthorshipReturn: true
  },
  integrate: {
    label: 'Integrate',
    processStage: 'Feedback',
    operation: 'diagnose_and_connect',
    coreQuestion: 'What came back? How does it connect?',
    allowedVerbs: [
      'connects to', 'feeds back into', 'integrates with',
      'closes the loop on', 'returns to', 'reveals the pattern',
      'completes through', 'links back to'
    ],
    bannedVerbs: [
      'must integrate', 'need to process', 'should connect',
      'have to resolve', 'force closure'
    ],
    canSurfaceLevers: true,
    canAskQuestions: true,
    requiresTransitionMarker: false,
    requiresOwnership: false,
    requiresAuthorshipReturn: false
  }
};

// Canonical transition markers for Discover -> Forge boundary
export const TRANSITION_MARKERS = [
  "These are authorship locations — not instructions.",
  "No action is required; these are points of available authorship.",
  "Nothing needs to be done. This names where choice already exists.",
  "This is visibility, not direction."
];

// Authorship return closures for Forge posture
export const AUTHORSHIP_CLOSURES = [
  "Authorship remains with you.",
  "Observe what changes next."
];

// Safety valve: fallback to Reflect under uncertainty
export function fallbackReflectOutput(context) {
  return {
    posture: 'reflect',
    content: `What is currently operating here cannot be clearly expressed within governance constraints. The configuration is present but requires your direct attention rather than interpretation.`,
    fallback: true
  };
}

// Get posture constraints
export function getPostureConstraints(posture) {
  return POSTURE_CONSTRAINTS[posture] || POSTURE_CONSTRAINTS.discover;
}

// Check if a posture allows lever surfacing
export function canSurfaceLevers(posture) {
  return getPostureConstraints(posture).canSurfaceLevers;
}

// Check if a posture allows questions
export function canAskQuestions(posture) {
  return getPostureConstraints(posture).canAskQuestions;
}

// Get the core question for a posture
export function getCoreQuestion(posture) {
  return getPostureConstraints(posture).coreQuestion;
}

// Get the process stage name for a posture
export function getProcessStage(posture) {
  return getPostureConstraints(posture).processStage;
}

// Map posture to its process stage for structural lookups
export const POSTURE_TO_PROCESS_STAGE = {
  reflect: 'Seed',
  discover: 'Medium',
  forge: 'Fruition',
  integrate: 'Feedback'
};

// === V1 READING PRESETS ===
// Named bundles of layer settings. New users get doors; power users find the cockpit.
// Each preset sets: frameSource, posture, cardCount, persona, humor, showArchitecture

export const READING_PRESETS = {
  quick: {
    name: 'Read',
    description: 'One signature, architecture positions',
    icon: '◎',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    settings: {
      frameSource: 'architecture',
      posture: 'discover',
      cardCount: 1,
      persona: 'friend',
      humor: 5,
      showArchitecture: false
    }
  },
  deep: {
    name: 'Deep',
    description: 'Three signatures, full depth available',
    icon: '◈',
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/30',
    settings: {
      frameSource: 'architecture',
      posture: 'discover',
      cardCount: 3,
      persona: 'none',
      humor: 5,
      showArchitecture: false
    }
  },
  forge: {
    name: 'Forge',
    description: 'One signature, action-oriented',
    icon: '◆',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    settings: {
      frameSource: 'architecture',
      posture: 'forge',
      cardCount: 1,
      persona: 'none',
      humor: 3,
      showArchitecture: false
    }
  },
  explore: {
    name: 'From Your Words',
    description: 'AI extracts themes from your situation',
    icon: '◇',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    settings: {
      frameSource: 'dynamic',
      posture: 'discover',
      persona: 'none',
      humor: 5,
      showArchitecture: false
    }
  }
};
