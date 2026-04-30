// === SYSTEM CONSTANTS ===
// Statuses, Channels, Houses, Roles, color mappings, and structural lookups

// === GOVERNANCE MAP ===
// governor archetype → house it governs
// Derived from architecture: Gestalt positions govern the four manifest houses
export const GOVERNANCE_MAP = {
  10: { house: 'Gestalt', label: 'Source governs Gestalt' },   // Wheel → Gestalt (root governor)
  0:  { house: 'Spirit',  label: 'Potential governs Spirit' },
  19: { house: 'Mind',    label: 'Actualization governs Mind' },
  20: { house: 'Emotion', label: 'Awareness governs Emotion' },
  1:  { house: 'Body',    label: 'Will governs Body' }
};

// === WHEEL/WORLD ASSOCIATION ===
// Derived from diagonal pairs within each house: sum=19 → Wheel, sum=21 → World
// Gestalt: 0+19=19→Wheel, 1+20=21→World
// Spirit:  2+17=19→Wheel, 3+18=21→World
// Mind:    4+15=19→Wheel, 5+16=21→World
// Emotion: 6+13=19→Wheel, 7+14=21→World
// Body:    8+11=19→Wheel, 9+12=21→World
export const WHEEL_WORLD_ASSOCIATION = {
  0: 'Wheel',  1: 'World',
  2: 'Wheel',  3: 'World',
  4: 'Wheel',  5: 'World',
  6: 'Wheel',  7: 'World',
  8: 'Wheel',  9: 'World',
  10: 'Wheel', // Portal — IS Wheel
  11: 'Wheel', 12: 'World',
  13: 'Wheel', 14: 'World',
  15: 'Wheel', 16: 'World',
  17: 'Wheel', 18: 'World',
  19: 'Wheel', 20: 'World',
  21: 'World'  // Portal — IS World
};

// === BOUND NUMBER PROPERTIES ===
// Each pip number (1-10) has a canonical keyword, house pair, and inner/outer polarity.
// Numbers pair: 1&10=Gestalt, 2&9=Spirit, 3&8=Mind, 4&7=Emotion, 5&6=Body
// Span = distance between inner and outer number — encodes house quality
// (tight span = concrete/Body, wide span = abstract/Gestalt)
export const BOUND_NUMBER_PROPERTIES = {
  1:  { keyword: "Beginning/Perfection", house: "Gestalt", polarity: "inner", span: 9 },
  2:  { keyword: "Balanced/Decisive",    house: "Spirit",  polarity: "inner", span: 7 },
  3:  { keyword: "Primal/Expansive",     house: "Mind",    polarity: "inner", span: 5 },
  4:  { keyword: "Peace/Stillness",       house: "Emotion", polarity: "inner", span: 3 },
  5:  { keyword: "Internal/Personal",    house: "Body",    polarity: "inner", span: 1 },
  6:  { keyword: "External/Shared",      house: "Body",    polarity: "outer", span: 1 },
  7:  { keyword: "Gathering/Reaping",    house: "Emotion", polarity: "outer", span: 3 },
  8:  { keyword: "Unfathomable/Deep",     house: "Mind",    polarity: "outer", span: 5 },
  9:  { keyword: "Abundance/Myriad",     house: "Spirit",  polarity: "outer", span: 7 },
  10: { keyword: "Completion/Finality",  house: "Gestalt", polarity: "outer", span: 9 }
};

// === ROLE PROPERTIES ===
// Each royal role operates in a specific domain house
// Role determines domain, suit determines channel — intersection reveals the parent major
export const ROLE_PROPERTIES = {
  Initiate: { domain: "Spirit",  traditional: "Page",   span: 30, boundNumbers: [2, 9], keywords: ["learning", "exploring", "aspiring", "asking"] },
  Catalyst: { domain: "Mind",    traditional: "Knight",  span: 22, boundNumbers: [3, 8], keywords: ["moving", "transforming", "cutting through", "initiating"] },
  Steward:  { domain: "Emotion", traditional: "Queen",   span: 14, boundNumbers: [4, 7], keywords: ["holding", "maintaining", "relating", "receiving"] },
  Executor: { domain: "Body",    traditional: "King",    span: 6,  boundNumbers: [5, 6], keywords: ["completing", "embodying", "governing", "grounding"] }
};

// === ROYAL NICKNAMES ===
// Role x Channel intersection names (from Royal Practice Guides)
export const ROYAL_NICKNAMES = {
  "Initiate-Intent": "The Spark",        "Initiate-Cognition": "The Student",
  "Initiate-Resonance": "The Dreamer",   "Initiate-Structure": "The Apprentice",
  "Catalyst-Intent": "The Warrior",      "Catalyst-Cognition": "The Strategist",
  "Catalyst-Resonance": "The Romantic",  "Catalyst-Structure": "The Pioneer",
  "Steward-Intent": "The Inspirer",      "Steward-Cognition": "The Analyst",
  "Steward-Resonance": "The Empath",     "Steward-Structure": "The Provider",
  "Executor-Intent": "The Commander",    "Executor-Cognition": "The Judge",
  "Executor-Resonance": "The Healer",    "Executor-Structure": "The Builder"
};

// === INNER/OUTER HORIZON ===
// Positions 0-9 = Inner (Creation phase), 11-20 = Outer (Operation phase)
// Portals 10 and 21 are thresholds — they ARE the boundary
export const INNER_OUTER_HORIZON = {
  0: 'inner',  1: 'inner',  2: 'inner',  3: 'inner',  4: 'inner',
  5: 'inner',  6: 'inner',  7: 'inner',  8: 'inner',  9: 'inner',
  10: 'threshold', // Ingress portal
  11: 'outer', 12: 'outer', 13: 'outer', 14: 'outer',
  15: 'outer', 16: 'outer', 17: 'outer', 18: 'outer',
  19: 'outer', 20: 'outer',
  21: 'threshold'  // Egress portal
};

export const STATUSES = {
  1: { name: "Balanced", orientation: "Now-aligned", desc: "Authentic expression", prefix: "" },
  2: { name: "Too Much", orientation: "Future-projected", desc: "Over-expressing", prefix: "Too Much" },
  3: { name: "Too Little", orientation: "Past-anchored", desc: "Under-expressing", prefix: "Too Little" },
  4: { name: "Unacknowledged", orientation: "Shadow", desc: "Operating without awareness", prefix: "Unacknowledged" }
};

// Extended status info for popups
export const STATUS_INFO = {
  1: {
    name: "Balanced",
    orientation: "Now-aligned",
    description: "Authentic expression — the function is operating correctly, present-centered, integrated.",
    extended: "When an archetype is balanced, it expresses naturally without excess or deficiency. There's no correction needed because the energy is flowing appropriately for the moment. This is the optimal state — full presence without distortion."
  },
  2: {
    name: "Too Much",
    orientation: "Future-projected",
    description: "Over-expressing — anxiety, control, pushing ahead of natural timing.",
    extended: "Too Much indicates future-projection: energy is pushed forward, grasping at what hasn't arrived. Often shows up as anxiety, fear, or the need to control outcomes. The correction is the Diagonal partner — the opposite pole that counterbalances the excess and rotates runaway momentum back into alignment."
  },
  3: {
    name: "Too Little",
    orientation: "Past-anchored",
    description: "Under-expressing — withdrawn, avoidant, not fully arriving in the present.",
    extended: "Too Little indicates past-anchoring: energy is withdrawn, held back, caught in what was rather than what is. Often shows up as regret, shame, or guilt keeping you from fully arriving in the present. The correction is the Vertical partner — the same archetypal identity at the other scale, which restores recursion and reconnects you to your complete capacity."
  },
  4: {
    name: "Unacknowledged",
    orientation: "Shadow",
    description: "Operating without awareness — steering without conscious integration.",
    extended: "Unacknowledged is shadow operation: this energy is running but you can't see it. It's influencing behavior without consent or alignment. The correction is the Reduction pair — returning to the generating source to make the shadow visible."
  }
};

// Channel data for popups
export const CHANNELS = {
  Intent: {
    name: "Intent",
    traditional: "Wands",
    element: "Fire",
    description: "Directed will and action — the channel of purposeful movement toward chosen ends.",
    extended: "Intent is the fire channel — energy directed toward goals. It governs motivation, drive, ambition, and the capacity to move from vision to action. When healthy, Intent provides momentum without burning out. When imbalanced, it becomes either aggressive pushing or paralyzed inaction."
  },
  Cognition: {
    name: "Cognition",
    traditional: "Swords",
    element: "Air",
    description: "Mental clarity and understanding — the channel of thought, analysis, and perception.",
    extended: "Cognition is the air channel — the realm of mind, thought, and clarity. It governs how we perceive, analyze, communicate, and understand. When healthy, Cognition provides clear seeing without over-thinking. When imbalanced, it becomes either mental chaos or cold disconnection."
  },
  Resonance: {
    name: "Resonance",
    traditional: "Cups",
    element: "Water",
    description: "Emotional attunement and connection — the channel of feeling and relationship.",
    extended: "Resonance is the water channel — the realm of emotion, intuition, and connection. It governs how we feel, relate, and attune to others. When healthy, Resonance provides deep feeling without drowning. When imbalanced, it becomes either emotional flooding or numbness."
  },
  Structure: {
    name: "Structure",
    traditional: "Pentacles",
    element: "Earth",
    description: "Material form and manifestation — the channel of building, resources, and embodiment.",
    extended: "Structure is the earth channel — the realm of form, matter, and practical reality. It governs resources, health, work, and physical manifestation. When healthy, Structure provides stability without rigidity. When imbalanced, it becomes either hoarding or instability."
  }
};

// House data for popups
export const HOUSES = {
  Gestalt: {
    name: "Gestalt",
    members: [0, 1, 19, 20],
    governor: 10,
    description: "The integrative whole — identity, will, actualization, and awareness.",
    extended: "Gestalt contains the archetypes of unified selfhood: Potential (0), Will (1), Actualization (19), and Awareness (20). Governed by Source (10), this house represents the complete self — not as a collection of parts, but as an integrated whole that is more than the sum of its components."
  },
  Spirit: {
    name: "Spirit",
    members: [2, 3, 17, 18],
    governor: 0,
    description: "Inner knowing and aspiration — wisdom, nurturing, inspiration, and imagination.",
    extended: "Spirit contains the archetypes of deep knowing: Wisdom (2), Nurturing (3), Inspiration (17), and Imagination (18). Governed by Potential (0), this house represents our connection to meaning, purpose, and the sources of guidance that transcend rational analysis."
  },
  Mind: {
    name: "Mind",
    members: [4, 5, 15, 16],
    governor: 19,
    description: "Pattern and structure — order, culture, abstraction, and breakthrough.",
    extended: "Mind contains the archetypes of mental organization: Order (4), Culture (5), Abstraction (15), and Breakthrough (16). Governed by Actualization (19), this house represents how we structure reality through thought, language, and systems."
  },
  Emotion: {
    name: "Emotion",
    members: [6, 7, 13, 14],
    governor: 20,
    description: "Feeling and drive — compassion, motivation, change, and balance.",
    extended: "Emotion contains the archetypes of feeling and motivation: Compassion (6), Drive (7), Change (13), and Balance (14). Governed by Awareness (20), this house represents our capacity to feel, connect, and be moved toward action."
  },
  Body: {
    name: "Body",
    members: [8, 9, 11, 12],
    governor: 1,
    description: "Form and practice — fortitude, discipline, equity, and sacrifice.",
    extended: "Body contains the archetypes of embodied practice: Fortitude (8), Discipline (9), Equity (11), and Sacrifice (12). Governed by Will (1), this house represents how we manifest in physical reality through endurance, skill, fairness, and release."
  },
  Portal: {
    name: "Portal",
    members: [10, 21],
    governor: 10, // Wheel governs itself (ungoverned root); World governed by Wheel (composite)
    composite: true, // World (21) has composite governance: primary = Wheel, contributive = everything
    description: "Threshold of entry and exit — cycles of beginning and completion.",
    extended: "Portal contains the archetypes of transition: Source (10) as Ingress and Creation (21) as Egress. Source is the ungoverned root governor — the Wheel that turns everything. Creation is governed by Wheel primarily but receives from all positions (composite governance). These are the thresholds through which consciousness enters and exits the system."
  }
};

// Role data for Agent popups
export const ROLES = {
  Initiate: {
    name: "Initiate",
    traditional: "Page",
    description: "Fresh engagement with the channel's energy — curious, learning, discovering.",
    extended: "The Initiate represents the beginning of conscious work with a channel's energy. Like a student encountering a discipline for the first time, there's freshness, curiosity, and the potential for growth. The Initiate brings enthusiasm and openness, though the energy is not yet fully integrated or mature."
  },
  Catalyst: {
    name: "Catalyst",
    traditional: "Knight",
    description: "Energy in motion — active, pursuing, creating change through momentum.",
    extended: "The Catalyst represents the channel's energy in dynamic motion. Like a knight charging forward, this role embodies active pursuit and transformation through action. The Catalyst creates change, sometimes dramatically, by applying the channel's energy with force and direction."
  },
  Steward: {
    name: "Steward",
    traditional: "Queen",
    description: "Mature holding of the energy — nurturing, sustaining, creating conditions for growth.",
    extended: "The Steward represents the channel's energy held with maturity and care. Like a queen who tends to her realm, this role nurtures and sustains the energy, creating conditions for others to flourish. The Steward embodies receptive mastery — power through presence rather than force."
  },
  Executor: {
    name: "Executor",
    traditional: "King",
    description: "Mastery and authority — directing, deciding, embodying the channel's fullest expression.",
    extended: "The Executor represents the channel's energy at its most masterful and authoritative. Like a king who commands with earned wisdom, this role directs the energy with full knowledge of its nature and consequences. The Executor embodies active mastery — the ability to wield the channel's power decisively."
  }
};

// === BEING GROUPS (What?) ===
// Latin square dimension 2: the four kinds of experiential substance
// Each group contains one member from every Practice, Activity, Stage, and Identity
// Derived March 23-24, 2026 — Four Dimensions Process Walk Derivation
export const BEING_GROUPS = {
  Mantle: {
    name: "Mantle",
    question: "What?",
    verb: "Create",
    cycle: "The Creator's Cycle",
    spatial: "What operates beneath you",
    members: [8, 7, 15, 18],  // Fortitude, Drive, Abstraction, Imagination
    stages: { Seed: 8, Medium: 7, Fruition: 15, Feedback: 18 },
    description: "Force — the tectonic layer. Processes that operate beneath the surface without asking permission.",
    extended: "Mantle contains the archetypes of underlying force: Fortitude (Body/Structure), Drive (Emotion/Intent), Abstraction (Mind/Cognition), Imagination (Spirit/Resonance). Like the Earth's mantle — the dynamic convective layer beneath the crust where tectonic forces shape the surface. The Creator's Cycle: endurance becomes momentum, momentum reveals hidden pattern, hidden pattern becomes vision, vision renews endurance."
  },
  Torch: {
    name: "Torch",
    question: "What?",
    verb: "Understand",
    cycle: "The Transmission Cycle",
    spatial: "What passes through you",
    members: [2, 5, 13, 12],  // Wisdom, Culture, Change, Sacrifice
    stages: { Seed: 2, Medium: 5, Fruition: 13, Feedback: 12 },
    description: "Knowing — thresholds crossed. What is received, carried, and transmitted forward.",
    extended: "Torch contains the archetypes of transmission: Wisdom (Spirit/Cognition), Culture (Mind/Resonance), Change (Emotion/Structure), Sacrifice (Body/Intent). A torch is received, carried through darkness, and passed forward — the light passes through the carrier, illuminating what it touches. The Transmission Cycle: silent perception becomes teachable form, teaching transforms, transformation demands physical surrender, surrender empties you for the next perception."
  },
  Vessel: {
    name: "Vessel",
    question: "What?",
    verb: "Hold",
    cycle: "The Stewardship Cycle",
    spatial: "What you hold around you",
    members: [4, 3, 11, 14],  // Order, Nurturing, Equity, Balance
    stages: { Seed: 4, Medium: 3, Fruition: 11, Feedback: 14 },
    description: "Form — containment and stewardship. Right relationship between parts, held together.",
    extended: "Vessel contains the archetypes of holding: Order (Mind/Intent), Nurturing (Spirit/Structure), Equity (Body/Resonance), Balance (Emotion/Cognition). A vessel holds, carries, maintains shape so something can exist inside it. The Stewardship Cycle: blueprint becomes living home, living home meets reality and calibrates, calibration finds dynamic equilibrium, equilibrium reveals where the blueprint needs redesigning."
  },
  Clearing: {
    name: "Clearing",
    question: "What?",
    verb: "Release",
    cycle: "The Liberation Cycle",
    spatial: "What falls away from you",
    members: [6, 9, 17, 16],  // Compassion, Discipline, Inspiration, Breakthrough
    stages: { Seed: 6, Medium: 9, Fruition: 17, Feedback: 16 },
    description: "Freedom — stripping away. The open space that results when layers of protection fall.",
    extended: "Clearing contains the archetypes of liberation: Compassion (Emotion/Resonance), Discipline (Body/Cognition), Inspiration (Spirit/Intent), Breakthrough (Mind/Structure). A clearing is where density has been removed and light enters. The Liberation Cycle: heart cracks open, openness met with rigorous investigation, investigation becomes radiance, whatever resists the light gets struck — leaving you permeable again."
  }
};

// === IDENTITY GROUPS (Who?) ===
// Latin square dimension 3: the four postures of self relative to center
// Each group contains one member from every Practice, Activity, Stage, and Being
// Derived March 23-24, 2026 — Four Dimensions Process Walk Derivation
export const IDENTITY_GROUPS = {
  Composure: {
    name: "Composure",
    question: "Who?",
    verb: "Center",
    cycle: "The Centering Cycle",
    center: "Holds center",
    members: [8, 5, 17, 14],  // Fortitude, Culture, Inspiration, Balance
    stages: { Seed: 8, Medium: 5, Fruition: 17, Feedback: 14 },
    description: "Centered presence — the gyroscope. Steady through continuous, quiet motion.",
    extended: "Composure contains the archetypes of centered presence: Fortitude (Body/Structure), Culture (Mind/Resonance), Inspiration (Spirit/Intent), Balance (Emotion/Cognition). No archetype of destruction in this group — Fortitude tames with open hands, Culture channels patiently, Inspiration radiates calmly, Balance pours without spilling. The Centering Cycle: plant your feet, find your lineage, become what people navigate by, keep pouring without emptying."
  },
  Conviction: {
    name: "Conviction",
    question: "Who?",
    verb: "Act",
    cycle: "The Conviction Cycle",
    center: "Acts from center",
    members: [2, 7, 11, 16],  // Wisdom, Drive, Equity, Breakthrough
    stages: { Seed: 2, Medium: 7, Fruition: 11, Feedback: 16 },
    description: "Clarity that commits — decisive, unhesitating. Every one fully committed to what it perceives as true.",
    extended: "Conviction contains the archetypes of decisive action: Wisdom (Spirit/Cognition), Drive (Emotion/Intent), Equity (Body/Resonance), Breakthrough (Mind/Structure). The High Priestess KNOWS, the Chariot CHARGES, Justice RULES, the Tower STRIKES. The Conviction Cycle: perceive clearly, knowing becomes unstoppable motion, momentum meets reality and is weighed, what fails the test gets struck — the rubble becomes ground for cleaner perception."
  },
  Exploration: {
    name: "Exploration",
    question: "Who?",
    verb: "Venture",
    cycle: "The Exploration Cycle",
    center: "Ventures from center",
    members: [4, 9, 13, 18],  // Order, Discipline, Change, Imagination
    stages: { Seed: 4, Medium: 9, Fruition: 13, Feedback: 18 },
    description: "Navigating the unknown — four responses to uncertainty. Claiming, walking into, surrendering to, and living in what cannot be seen.",
    extended: "Exploration contains the archetypes of venturing: Order (Mind/Intent), Discipline (Body/Cognition), Change (Emotion/Structure), Imagination (Spirit/Resonance). Each engages the unknown differently — the Emperor claims it, the Hermit walks into it, Death surrenders to it, the Moon lives in it. The Exploration Cycle: claim sovereignty over the question, walk into claimed territory alone, what you find transforms you, the Moon's reflective pool shows what the old you couldn't see."
  },
  Communion: {
    name: "Communion",
    question: "Who?",
    verb: "Merge",
    cycle: "The Communion Cycle",
    center: "Dissolves center into other",
    members: [6, 3, 15, 12],  // Compassion, Nurturing, Abstraction, Sacrifice
    stages: { Seed: 6, Medium: 3, Fruition: 15, Feedback: 12 },
    description: "Dissolved boundaries — entanglement with another. Maximum enmeshment, the opposite of Composure.",
    extended: "Communion contains the archetypes of dissolved boundaries: Compassion (Emotion/Resonance), Nurturing (Spirit/Structure), Abstraction (Mind/Cognition), Sacrifice (Body/Intent). Lovers merge, Empress holds creation inseparably, Devil reveals the chains, Hanged Man surrenders will. The Communion Cycle: resonance cracks you open, entanglement becomes fertile, the living bond casts a shadow revealing chains, seeing the chains you choose — offering up the unconscious version so what remains can be chosen rather than compelled."
  }
};

// === DIMENSION PROCESS KEYS ===
// The verb for each group within each dimension — used for dimensional address sentences
export const DIMENSION_VERBS = {
  Practice: { Spirit: "Witness", Mind: "Channel", Emotion: "Will", Body: "Embody" },
  Activity: { Intent: "Point", Cognition: "Distinguish", Resonance: "Connect", Structure: "Build" },
  Being:    { Mantle: "Create", Torch: "Understand", Vessel: "Hold", Clearing: "Release" },
  Identity: { Composure: "Center", Conviction: "Act", Exploration: "Venture", Communion: "Merge" }
};

// House colors matching Channel scheme
export const HOUSE_COLORS = {
  Gestalt: { border: 'border-amber-500/50', bg: 'bg-amber-950/30', text: 'text-amber-400' },
  Spirit: { border: 'border-violet-500/50', bg: 'bg-violet-950/30', text: 'text-violet-400' },
  Mind: { border: 'border-cyan-500/50', bg: 'bg-cyan-950/30', text: 'text-cyan-400' },
  Emotion: { border: 'border-blue-500/50', bg: 'bg-blue-950/30', text: 'text-blue-400' },
  Body: { border: 'border-green-500/50', bg: 'bg-green-950/30', text: 'text-green-400' },
  Portal: { border: 'border-rose-500/50', bg: 'bg-rose-950/30', text: 'text-rose-400' }
};

// Status indicator colors (smaller, secondary)
export const STATUS_COLORS = {
  1: 'text-emerald-400 bg-emerald-500/20',
  2: 'text-amber-400 bg-amber-500/20',
  3: 'text-sky-400 bg-sky-500/20',
  4: 'text-violet-400 bg-violet-500/20'
};

export const CHANNEL_CROSSINGS = {
  2: { Cognition: "Intent", Intent: "Cognition", Resonance: "Structure", Structure: "Resonance" },
  3: { Cognition: "Structure", Intent: "Resonance", Resonance: "Intent", Structure: "Cognition" },
  4: { Cognition: "Resonance", Intent: "Structure", Resonance: "Cognition", Structure: "Intent" }
};

export const CHANNEL_COLORS = {
  Intent: "text-orange-400",
  Cognition: "text-cyan-400",
  Resonance: "text-blue-400",
  Structure: "text-green-400"
};

// Process Stage data for popups (Seed, Medium, Fruition, Feedback)
export const PROCESS_STAGES = {
  Seed: {
    name: "Seed",
    character: "Yang-pure",
    position: "The beginning",
    yinYang: "Black, bottom left",
    season: "Spring",
    breath: "First breath in",
    description: "Initiates the cycle — pure Yang energy, the spark that begins.",
    extended: "Seed initiates the cycle. Pure Yang energy, the spark that begins. Like spring, like the first breath in. The Seed doesn't know where things will go — it creates the conditions for something to happen."
  },
  Medium: {
    name: "Medium",
    character: "Yin-in-Yang",
    position: "Growth through relationship",
    yinYang: "White, bottom right",
    season: "Summer",
    breath: "Held breath",
    description: "Carries and develops — the sustained work of becoming.",
    extended: "Medium carries and develops. Yin-within-Yang, the sustained work of becoming. Like summer, like the held breath. The Medium transmits energy from beginning toward completion."
  },
  Fruition: {
    name: "Fruition",
    character: "Yin-pure",
    position: "The maturation",
    yinYang: "White, top right",
    season: "Autumn",
    breath: "Full exhale",
    description: "Completes the expression — pure Yin energy, the harvest of what was seeded.",
    extended: "Fruition completes the expression. Pure Yin energy, the harvest of what was seeded. Like autumn, like the full exhale. Fruition is where potential becomes actual."
  },
  Feedback: {
    name: "Feedback",
    character: "Yang-in-Yin",
    position: "Return to source",
    yinYang: "Black, top left",
    season: "Winter",
    breath: "Pause before the next breath",
    description: "Integrates and returns — the learning that feeds the next cycle.",
    extended: "Feedback integrates and returns. Yang-within-Yin, the learning that feeds the next cycle. Like winter, like the pause before the next breath. Feedback closes the loop and prepares for new beginning."
  }
};

// Portal type data for popups (Ingress/Egress - NOT process stages)
export const PORTAL_TYPES = {
  Ingress: {
    name: "Ingress",
    archetype: 10,
    archetypeName: "Source (The Wheel of Fortune)",
    position: "The Turn",
    description: "Where potential enters the system — the portal of reception.",
    extended: "Ingress is where potential enters the system, the portal of reception. Source (10) governs the Gestalt House and marks where consciousness enters operation. Creation complete, operation begins."
  },
  Egress: {
    name: "Egress",
    archetype: 21,
    archetypeName: "Creation (The World)",
    position: "The Completion",
    description: "Where processed experience exits the system — the portal of contribution.",
    extended: "Egress is where processed experience exits the system, the portal of contribution. Creation (21) marks completion — the dance ends where it can begin again. Operation complete, cycle closes."
  }
};
