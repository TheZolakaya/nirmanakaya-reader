// === SPREAD DEFINITIONS ===
// Durable spreads (fixed positions) and random spreads

export const DURABLE_SPREADS = {
  arc: {
    name: "Arc",
    count: 3,
    frames: [
      { name: "Situation", house: "Mind", meaning: "what is" },
      { name: "Movement", house: "Spirit", meaning: "what's in motion" },
      { name: "Integration", house: "Gestalt", meaning: "what completes" }
    ],
    description: "Situation → Movement → Integration"
  },
  quadraverse: {
    name: "Quadraverse",
    count: 4,
    frames: [
      { name: "Spirit", house: "Spirit", meaning: "inner knowing" },
      { name: "Mind", house: "Mind", meaning: "pattern and structure" },
      { name: "Emotion", house: "Emotion", meaning: "feeling and drive" },
      { name: "Body", house: "Body", meaning: "form and practice" }
    ],
    description: "The four aspects of self"
  },
  fiveHouse: {
    name: "Five Houses",
    count: 5,
    frames: [
      { name: "Gestalt", house: "Gestalt", meaning: "the integrative whole" },
      { name: "Spirit", house: "Spirit", meaning: "inner knowing" },
      { name: "Mind", house: "Mind", meaning: "pattern and structure" },
      { name: "Emotion", house: "Emotion", meaning: "feeling and drive" },
      { name: "Body", house: "Body", meaning: "form and practice" }
    ],
    description: "Your five domains of experience"
  }
};

export const RANDOM_SPREADS = {
  one: { name: "One", count: 1 },
  two: { name: "Two", count: 2 },
  three: { name: "Three", count: 3 },
  four: { name: "Four", count: 4 },
  five: { name: "Five", count: 5 }
};

// Mode helper text
export const MODE_HELPER_TEXT = {
  reflect: "Static positions, dynamic interpretation — you choose where to look",
  discover: "Dynamic positions, dynamic interpretation — the system shows what you need",
  forge: "Declaration mode — state an intention and iterate through action"
};

// === REFLECT MODE SPREADS ===
// Static spreads with fixed positions and interpretation lenses
// Positions never diagnose — they locate. Status reveals condition.

export const REFLECT_SPREADS = {
  // === 1 CARD SPREADS ===
  'single-focus': {
    id: 'single-focus',
    name: 'Single Focus',
    count: 1,
    positions: [
      {
        id: 1,
        name: "What's Present",
        lens: "This signature is what's most active in your field right now. Read it as: the energy that's HERE."
      }
    ],
    whenToUse: "When you need one clear signal",
    whatYoullSee: "The one thing that's most active right now and how it's expressing"
  },
  'core': {
    id: 'core',
    name: 'Core',
    count: 1,
    positions: [
      {
        id: 1,
        name: "What's Central",
        lens: "This signature is what's at the center beneath the noise. Read it as: the essential truth of this moment."
      }
    ],
    whenToUse: "When everything feels noisy and you need center",
    whatYoullSee: "What's actually driving this moment — the real priority"
  },
  'invitation': {
    id: 'invitation',
    name: 'Invitation',
    count: 1,
    positions: [
      {
        id: 1,
        name: "What's Available",
        lens: "This signature is what's ready and waiting for your attention. Read it as: what's being offered to you."
      }
    ],
    whenToUse: "When you're open but don't know what's available",
    whatYoullSee: "Where the opening is — what's ready for you to engage"
  },
  'ground': {
    id: 'ground',
    name: 'Ground',
    count: 1,
    positions: [
      {
        id: 1,
        name: "What's Solid",
        lens: "This signature is where your foundation actually lives. Read it as: your source of stability."
      }
    ],
    whenToUse: "When you feel unmoored and need stability",
    whatYoullSee: "What you can count on right now — where your actual stability lives"
  },

  // === 2 CARD SPREADS ===
  'ground-sky': {
    id: 'ground-sky',
    name: 'Ground & Sky',
    count: 2,
    positions: [
      {
        id: 1,
        name: "Foundation",
        lens: "This signature is how your practical, grounded reality is expressing. Read it as: what's solid beneath you."
      },
      {
        id: 2,
        name: "Aspiration",
        lens: "This signature is how your higher aim or vision is expressing. Read it as: what you're reaching toward."
      }
    ],
    whenToUse: "When balancing practical reality with aspiration",
    whatYoullSee: "Whether what you're building toward is supported by where you're building from"
  },
  'inner-outer': {
    id: 'inner-outer',
    name: 'Inner & Outer',
    count: 2,
    positions: [
      {
        id: 1,
        name: "Internal",
        lens: "This signature is how your inner state is functioning. Read it as: what's happening inside."
      },
      {
        id: 2,
        name: "External",
        lens: "This signature is how you're showing up in the world. Read it as: what others see and experience."
      }
    ],
    whenToUse: "When inside doesn't match outside",
    whatYoullSee: "Where your inner experience matches your outer life — and where there's a gap"
  },
  'give-receive': {
    id: 'give-receive',
    name: 'Give & Receive',
    count: 2,
    positions: [
      {
        id: 1,
        name: "Offering",
        lens: "This signature is how your giving/output channel is functioning. Read it as: what you're putting out."
      },
      {
        id: 2,
        name: "Receiving",
        lens: "This signature is how your receiving/input channel is functioning. Read it as: what you're letting in."
      }
    ],
    whenToUse: "When exchange feels off",
    whatYoullSee: "Which direction is flowing and which is restricted — output, input, or both"
  },
  'self-other': {
    id: 'self-other',
    name: 'Self & Other',
    count: 2,
    positions: [
      {
        id: 1,
        name: "Self",
        lens: "This signature is how you're holding yourself in this dynamic. Read it as: your energy in the relationship."
      },
      {
        id: 2,
        name: "Other",
        lens: "This signature is how the other is showing up. Read it as: their energy as it meets you."
      }
    ],
    whenToUse: "When navigating any relationship dynamic",
    whatYoullSee: "How you're actually showing up vs how they're actually showing up — separate, clear"
  },

  // === 3 CARD SPREADS ===
  'arc': {
    id: 'arc',
    name: 'Arc',
    count: 3,
    positions: [
      {
        id: 1,
        name: "Situation",
        lens: "This signature is the current state of affairs. Read it as: where things stand now."
      },
      {
        id: 2,
        name: "Movement",
        lens: "This signature is what's in motion or shifting. Read it as: what's actively changing."
      },
      {
        id: 3,
        name: "Integration",
        lens: "This signature is where things are heading to resolve. Read it as: how this wants to complete."
      }
    ],
    whenToUse: "When something is in motion",
    whatYoullSee: "Where it is, what's shifting, and how it's integrating"
  },
  'time-lens': {
    id: 'time-lens',
    name: 'Time Lens',
    count: 3,
    positions: [
      {
        id: 1,
        name: "Completing",
        lens: "This signature is what's finishing or resolving. Read it as: what's concluding."
      },
      {
        id: 2,
        name: "Present",
        lens: "This signature is what's fully here now. Read it as: what's alive in this moment."
      },
      {
        id: 3,
        name: "Emerging",
        lens: "This signature is what's coming into form. Read it as: what's becoming."
      }
    ],
    whenToUse: "When in transition and timing feels blurred",
    whatYoullSee: "What's ending, what's here, and what's beginning — your position in transition"
  },
  'creation': {
    id: 'creation',
    name: 'Creation',
    count: 3,
    positions: [
      {
        id: 1,
        name: "Seed",
        lens: "This signature is the origin impulse of what you're making. Read it as: the initial spark."
      },
      {
        id: 2,
        name: "Process",
        lens: "This signature is how the creation is developing. Read it as: the work in progress."
      },
      {
        id: 3,
        name: "Fruit",
        lens: "This signature is what's being produced. Read it as: what's coming into form."
      }
    ],
    whenToUse: "When making something and want to check the process",
    whatYoullSee: "Whether the original spark, the current work, and the emerging result are aligned"
  },
  'foundation': {
    id: 'foundation',
    name: 'Foundation',
    count: 3,
    positions: [
      {
        id: 1,
        name: "Root",
        lens: "This signature is what's underneath everything. Read it as: the deepest support."
      },
      {
        id: 2,
        name: "Trunk",
        lens: "This signature is the main structural element. Read it as: what holds things up."
      },
      {
        id: 3,
        name: "Branch",
        lens: "This signature is what extends outward. Read it as: what's reaching and growing."
      }
    ],
    whenToUse: "When you want to understand what supports what",
    whatYoullSee: "What's holding things up and whether the support structure is sound"
  },

  // === 4 CARD SPREADS ===
  'quadraverse': {
    id: 'quadraverse',
    name: 'Quadraverse',
    count: 4,
    positions: [
      {
        id: 1,
        name: "Spirit",
        lens: "This signature is how your Spirit dimension is expressing. Read it as: inspiration, purpose, fire."
      },
      {
        id: 2,
        name: "Mind",
        lens: "This signature is how your Mind dimension is expressing. Read it as: thought, clarity, air."
      },
      {
        id: 3,
        name: "Emotion",
        lens: "This signature is how your Emotion dimension is expressing. Read it as: feeling, connection, water."
      },
      {
        id: 4,
        name: "Body",
        lens: "This signature is how your Body dimension is expressing. Read it as: action, form, earth."
      }
    ],
    whenToUse: "When you want a full-system elemental check",
    whatYoullSee: "How each of your four elements is expressing — which is thriving, which is strained, which is quiet"
  },
  'relationship': {
    id: 'relationship',
    name: 'Relationship',
    count: 4,
    positions: [
      {
        id: 1,
        name: "Self As I Am",
        lens: "This signature is how you actually are in this relationship. Read it as: your authentic state."
      },
      {
        id: 2,
        name: "Self As I Act",
        lens: "This signature is how you're behaving in this relationship. Read it as: your actions and presentation."
      },
      {
        id: 3,
        name: "Other As They Are",
        lens: "This signature is how the other actually is. Read it as: their authentic state."
      },
      {
        id: 4,
        name: "The Field",
        lens: "This signature is the space between you. Read it as: the relationship itself as an entity."
      }
    ],
    whenToUse: "When a relationship needs clarity without blame",
    whatYoullSee: "Your real state, your behavior, their real state, and the dynamic between — separated out"
  },
  'decision': {
    id: 'decision',
    name: 'Decision',
    count: 4,
    positions: [
      {
        id: 1,
        name: "Expression",
        lens: "This signature is what this choice would express about you. Read it as: what it says."
      },
      {
        id: 2,
        name: "Cost",
        lens: "This signature is what this choice requires you to release. Read it as: what you'd give up."
      },
      {
        id: 3,
        name: "Strength",
        lens: "This signature is what this choice would strengthen. Read it as: what grows from it."
      },
      {
        id: 4,
        name: "Remainder",
        lens: "This signature is what this choice leaves unchanged. Read it as: what stays the same either way."
      }
    ],
    whenToUse: "When weighing a significant choice",
    whatYoullSee: "What a choice would say about you, cost you, build for you, and leave unchanged"
  },
  'cycle': {
    id: 'cycle',
    name: 'Cycle',
    count: 4,
    positions: [
      {
        id: 1,
        name: "Initiation",
        lens: "This signature is the beginning energy of your process. Read it as: how it started."
      },
      {
        id: 2,
        name: "Development",
        lens: "This signature is the growth phase. Read it as: how it's building."
      },
      {
        id: 3,
        name: "Culmination",
        lens: "This signature is the peak or turning point. Read it as: where it crests."
      },
      {
        id: 4,
        name: "Integration",
        lens: "This signature is how it resolves and absorbs. Read it as: how it completes."
      }
    ],
    whenToUse: "When tracking where you are in a process",
    whatYoullSee: "Where you actually are in the process — starting, building, peaking, or completing"
  },

  // === 5 CARD SPREADS ===
  'five-houses': {
    id: 'five-houses',
    name: 'Five Houses',
    count: 5,
    positions: [
      {
        id: 1,
        name: "Gestalt",
        lens: "This signature is how your wholeness/integration is expressing. Read it as: your overall coherence."
      },
      {
        id: 2,
        name: "Spirit",
        lens: "This signature is how your Spirit house is expressing. Read it as: purpose, meaning, inspiration."
      },
      {
        id: 3,
        name: "Mind",
        lens: "This signature is how your Mind house is expressing. Read it as: thought, analysis, understanding."
      },
      {
        id: 4,
        name: "Emotion",
        lens: "This signature is how your Emotion house is expressing. Read it as: feeling, relating, connecting."
      },
      {
        id: 5,
        name: "Body",
        lens: "This signature is how your Body house is expressing. Read it as: action, health, material reality."
      }
    ],
    whenToUse: "When life feels broadly off but unclear where",
    whatYoullSee: "A full diagnostic — how each of your five houses is expressing"
  },
  'project': {
    id: 'project',
    name: 'Project',
    count: 5,
    positions: [
      {
        id: 1,
        name: "Vision",
        lens: "This signature is how the project's vision is expressing. Read it as: the guiding intention."
      },
      {
        id: 2,
        name: "Structure",
        lens: "This signature is how the project's structure is expressing. Read it as: the framework holding it."
      },
      {
        id: 3,
        name: "Energy",
        lens: "This signature is how the project's energy is expressing. Read it as: the fuel and momentum."
      },
      {
        id: 4,
        name: "Movement",
        lens: "This signature is how the project's movement is expressing. Read it as: progress and direction."
      },
      {
        id: 5,
        name: "Completion",
        lens: "This signature is how the project's completion is expressing. Read it as: the finish line and outcome."
      }
    ],
    whenToUse: "When creative work feels unclear",
    whatYoullSee: "How each dimension of the project is expressing — where it's flowing, where it's strained"
  },
  'alignment': {
    id: 'alignment',
    name: 'Alignment',
    count: 5,
    positions: [
      {
        id: 1,
        name: "Desire",
        lens: "This signature is what you want. Read it as: your authentic longing."
      },
      {
        id: 2,
        name: "Requirement",
        lens: "This signature is what's being asked of you. Read it as: what life/situation needs from you."
      },
      {
        id: 3,
        name: "Integrity",
        lens: "This signature is where you're in alignment. Read it as: where you're whole and true."
      },
      {
        id: 4,
        name: "Growth",
        lens: "This signature is where you're expanding. Read it as: your edge of development."
      },
      {
        id: 5,
        name: "Gift",
        lens: "This signature is what's available as a result. Read it as: what becomes possible."
      }
    ],
    whenToUse: "When feeling out of sync with life",
    whatYoullSee: "Whether what you want, what's required, and what you're doing are pointed the same direction"
  },
  'journey': {
    id: 'journey',
    name: 'Journey',
    count: 5,
    positions: [
      {
        id: 1,
        name: "Origin",
        lens: "This signature is where you started. Read it as: the beginning point."
      },
      {
        id: 2,
        name: "Path",
        lens: "This signature is the way you're traveling. Read it as: the route itself."
      },
      {
        id: 3,
        name: "Terrain",
        lens: "This signature is what you're navigating through. Read it as: what requires attention."
      },
      {
        id: 4,
        name: "Resource",
        lens: "This signature is what you have available. Read it as: your assets and support."
      },
      {
        id: 5,
        name: "Destination",
        lens: "This signature is where you're heading. Read it as: what you're moving toward."
      }
    ],
    whenToUse: "When navigating toward something and need orientation",
    whatYoullSee: "Where you are on the path — origin, route, terrain, resource, and direction"
  },

  // === 6 CARD SPREADS ===
  'life-domains': {
    id: 'life-domains',
    name: 'Life Domains',
    count: 6,
    positions: [
      {
        id: 1,
        name: "Self",
        lens: "This signature is how your relationship with yourself is expressing. Read it as: self-connection."
      },
      {
        id: 2,
        name: "Relationships",
        lens: "This signature is how your relationships are expressing. Read it as: connection with others."
      },
      {
        id: 3,
        name: "Work",
        lens: "This signature is how your work/career is expressing. Read it as: vocation and contribution."
      },
      {
        id: 4,
        name: "Body",
        lens: "This signature is how your physical life is expressing. Read it as: health, energy, embodiment."
      },
      {
        id: 5,
        name: "Meaning",
        lens: "This signature is how your sense of meaning is expressing. Read it as: purpose and significance."
      },
      {
        id: 6,
        name: "Play",
        lens: "This signature is how your play/rest is expressing. Read it as: joy, leisure, restoration."
      }
    ],
    whenToUse: "When you want a broad check-in across all major areas",
    whatYoullSee: "How each domain of life is expressing — which is thriving, which is strained, which is quiet"
  },
  'full-cycle': {
    id: 'full-cycle',
    name: 'Full Cycle',
    count: 6,
    positions: [
      {
        id: 1,
        name: "Seed",
        lens: "This signature is the seed phase. Read it as: what's been planted."
      },
      {
        id: 2,
        name: "Sprout",
        lens: "This signature is the sprouting phase. Read it as: what's breaking through."
      },
      {
        id: 3,
        name: "Growth",
        lens: "This signature is the growth phase. Read it as: what's developing."
      },
      {
        id: 4,
        name: "Bloom",
        lens: "This signature is the bloom phase. Read it as: what's flowering."
      },
      {
        id: 5,
        name: "Harvest",
        lens: "This signature is the harvest phase. Read it as: what's ready to be gathered."
      },
      {
        id: 6,
        name: "Rest",
        lens: "This signature is the rest phase. Read it as: what's composting or dormant."
      }
    ],
    whenToUse: "When tracking a complete process from beginning to end",
    whatYoullSee: "Which phase of the natural cycle is active and which is being skipped or rushed"
  },
  'spheres': {
    id: 'spheres',
    name: 'Spheres',
    count: 6,
    positions: [
      {
        id: 1,
        name: "Self",
        lens: "This signature is your innermost sphere. Read it as: your core."
      },
      {
        id: 2,
        name: "Intimate",
        lens: "This signature is your intimate sphere. Read it as: closest relationships."
      },
      {
        id: 3,
        name: "Family",
        lens: "This signature is your family sphere. Read it as: family of origin and chosen family."
      },
      {
        id: 4,
        name: "Community",
        lens: "This signature is your community sphere. Read it as: friends, neighbors, tribes."
      },
      {
        id: 5,
        name: "Work",
        lens: "This signature is your work sphere. Read it as: colleagues, profession, contribution."
      },
      {
        id: 6,
        name: "World",
        lens: "This signature is your world sphere. Read it as: society, humanity, the whole."
      }
    ],
    whenToUse: "When decisions or energy affect multiple levels",
    whatYoullSee: "How your energy and presence shifts from your core out to the wider world"
  },
  'integration': {
    id: 'integration',
    name: 'Integration',
    count: 6,
    positions: [
      {
        id: 1,
        name: "Conscious",
        lens: "This signature is what's conscious. Read it as: what you already see clearly."
      },
      {
        id: 2,
        name: "Unconscious",
        lens: "This signature is what's unconscious. Read it as: what's operating beneath awareness."
      },
      {
        id: 3,
        name: "Emerging",
        lens: "This signature is what's emerging. Read it as: what's coming into consciousness."
      },
      {
        id: 4,
        name: "Ready",
        lens: "This signature is what's ready. Read it as: what's available to work with now."
      },
      {
        id: 5,
        name: "Waiting",
        lens: "This signature is what's waiting. Read it as: what's not yet time for."
      },
      {
        id: 6,
        name: "Gift",
        lens: "This signature is the gift available. Read it as: what becomes possible through integration."
      }
    ],
    whenToUse: "When doing deep work on what's conscious and what isn't",
    whatYoullSee: "What's conscious, what's hidden, what's emerging, and what's available to work with"
  }
};

// Spreads organized by card count for UI selection
export const SPREADS_BY_COUNT = {
  1: ['single-focus', 'core', 'invitation', 'ground'],
  2: ['ground-sky', 'inner-outer', 'give-receive', 'self-other'],
  3: ['arc', 'time-lens', 'creation', 'foundation'],
  4: ['quadraverse', 'relationship', 'decision', 'cycle'],
  5: ['five-houses', 'project', 'alignment', 'journey'],
  6: ['life-domains', 'full-cycle', 'spheres', 'integration']
};

// Mode explanations for ? popover
export const MODE_EXPLANATIONS = {
  reflect: "Static positions, dynamic interpretation. You choose what territory to examine — the system reveals what's actually happening there. Use when you know WHERE to look but want to see HOW it's functioning.",
  discover: "Dynamic positions, dynamic interpretation. The system decides what you need to see. Positions are drawn randomly from the 22 Archetypes. Use when you're open to receiving what the architecture wants to show you.",
  forge: "Declaration mode. State an intention, draw one card, iterate through action. The card becomes your working partner for creating something specific. Use when you know what you want to build."
};
