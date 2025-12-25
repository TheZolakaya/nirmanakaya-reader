"use client";
import { useState, useRef, useEffect } from 'react';

// === CORE DATA WITH EXTENDED DESCRIPTIONS ===
const ARCHETYPES = {
  0: { name: "Potential", traditional: "The Fool", house: "Gestalt", channel: null, function: "Seed", 
       description: "Pure possibility before differentiation",
       extended: "The seed state of all becoming. Not naivety but infinite potential — the moment before choice collapses possibility into actuality. Contains everything, committed to nothing yet." },
  1: { name: "Will", traditional: "The Magician", house: "Gestalt", channel: null, function: "Medium", 
       description: "Directed agency, choosing direction",
       extended: "The capacity to direct attention and energy toward chosen ends. Not force but focused intention — the ability to say 'this, not that' and mean it." },
  2: { name: "Wisdom", traditional: "The High Priestess", house: "Spirit", channel: "Cognition", function: "Seed", 
       description: "Knowing what to attend to",
       extended: "Deep knowing that precedes analysis. The capacity to recognize what matters before understanding why. Wisdom isn't accumulated knowledge — it's seeing through to essence." },
  3: { name: "Nurturing", traditional: "The Empress", house: "Spirit", channel: "Structure", function: "Medium", 
       description: "Care for what is growing",
       extended: "Tending what needs to develop. Creating conditions for growth without forcing outcomes. The patient attention that allows emergence." },
  4: { name: "Order", traditional: "The Emperor", house: "Mind", channel: "Intent", function: "Seed", 
       description: "Establishing pattern and structure",
       extended: "The impulse to organize chaos into workable form. Not rigid control but functional architecture — creating containers that allow complexity to be navigated." },
  5: { name: "Culture", traditional: "The Hierophant", house: "Mind", channel: "Resonance", function: "Medium", 
       description: "Shared meaning and tradition",
       extended: "The transmission of meaning across time and between people. Rituals, languages, practices that carry wisdom forward. Living connection to what has proven valuable." },
  6: { name: "Compassion", traditional: "The Lovers", house: "Emotion", channel: "Resonance", function: "Seed", 
       description: "Relational connection and alignment",
       extended: "The capacity to feel with rather than just about. Genuine alignment between beings that recognizes shared experience. Connection that honors difference." },
  7: { name: "Drive", traditional: "The Chariot", house: "Emotion", channel: "Intent", function: "Medium", 
       description: "Directed momentum toward goals",
       extended: "Energy channeled toward destination. Not aggression but focused motion — the capacity to maintain direction through resistance without being consumed." },
  8: { name: "Fortitude", traditional: "Strength", house: "Body", channel: "Structure", function: "Seed", 
       description: "Endurance and holding capacity",
       extended: "The ability to bear what must be borne. Not hardness but resilient strength — capacity to hold form under pressure without breaking or becoming rigid." },
  9: { name: "Discipline", traditional: "The Hermit", house: "Body", channel: "Cognition", function: "Medium", 
       description: "Focused practice and refinement",
       extended: "Solitary cultivation of capacity through repetition. The hermit's lamp illuminates through sustained attention, not flash. Intention transformed into embodied skill." },
  10: { name: "Cycles", traditional: "Wheel of Fortune", house: "Portal", channel: null, function: "Ingress", 
        description: "What is entering now",
        extended: "The turning point where what was outside enters the system. Not fate but timing — recognizing what's arriving and how to meet it." },
  11: { name: "Equity", traditional: "Justice", house: "Body", channel: "Resonance", function: "Fruition", 
        description: "Fair calibration and balance",
        extended: "Right relationship made manifest. Not punishment but recalibration — adjusting what's out of proportion until balance returns." },
  12: { name: "Sacrifice", traditional: "The Hanged Man", house: "Body", channel: "Intent", function: "Feedback", 
        description: "Purposeful release",
        extended: "Conscious letting go of what no longer serves. Not loss but clearing — creating space by releasing grip. Revealing value hidden by habitual grasping." },
  13: { name: "Change", traditional: "Death", house: "Emotion", channel: "Structure", function: "Fruition", 
        description: "Necessary endings and clearing",
        extended: "The completion that allows new beginning. Not destruction but transformation — the moment when what was must fully end for what will be to emerge." },
  14: { name: "Balance", traditional: "Temperance", house: "Emotion", channel: "Cognition", function: "Feedback", 
        description: "Dynamic equilibrium",
        extended: "Continuous adjustment that maintains flow. Not static middle but active calibration — sensing when to add, when to subtract, how to blend." },
  15: { name: "Abstraction", traditional: "The Devil", house: "Mind", channel: "Cognition", function: "Fruition", 
        description: "Pure pattern, freed from literal",
        extended: "Recognition of pattern stripped of content. Not temptation but clarity about mechanism — seeing how things work beneath surface appearance." },
  16: { name: "Breakthrough", traditional: "The Tower", house: "Mind", channel: "Structure", function: "Feedback", 
        description: "Sudden clearing of false structure",
        extended: "Rapid dissolution of what couldn't hold. Not catastrophe but liberation — structures built on false premises collapse when truth arrives." },
  17: { name: "Inspiration", traditional: "The Star", house: "Spirit", channel: "Intent", function: "Fruition", 
        description: "Aspirational pull toward light",
        extended: "The draw toward what's genuinely desired. Not fantasy but orientation — knowing which star to steer by. Recognized, not given; remembered, not arrived." },
  18: { name: "Imagination", traditional: "The Moon", house: "Spirit", channel: "Resonance", function: "Feedback", 
        description: "Navigating ambiguity",
        extended: "Capacity to move through uncertainty without forcing clarity. The moon illuminates enough to walk, not enough to see everything. Trust the path that reveals itself." },
  19: { name: "Actualization", traditional: "The Sun", house: "Gestalt", channel: null, function: "Fruition", 
        description: "Becoming what you are",
        extended: "Full expression of inherent nature. Not achievement but authenticity — allowing what you are to shine without dimming or distortion." },
  20: { name: "Awareness", traditional: "Judgement", house: "Gestalt", channel: null, function: "Feedback", 
        description: "Seeing the whole pattern",
        extended: "The capacity to perceive from outside the system while remaining within it. Not judgment but recognition — seeing what's true across all layers." },
  21: { name: "Wholeness", traditional: "The World", house: "Portal", channel: null, function: "Egress", 
        description: "Integration and completion",
        extended: "The point of departure that is also arrival. Full integration that allows release into next becoming. Completion that opens rather than closes." }
};

const BOUNDS = {
  22: { name: "Activation", traditional: "Ace of Wands", channel: "Intent", number: 1, archetype: 19, description: "The spark of directed energy. Pure intent arising, ready to move." },
  23: { name: "Orientation", traditional: "2 of Wands", channel: "Intent", number: 2, archetype: 18, description: "Choosing direction from possibility. Surveying options before committing." },
  24: { name: "Assertion", traditional: "3 of Wands", channel: "Intent", number: 3, archetype: 4, description: "Declaring intention outward. Making your direction known." },
  25: { name: "Alignment", traditional: "4 of Wands", channel: "Intent", number: 4, archetype: 7, description: "Intent finding stable form. Celebration of direction clarified." },
  26: { name: "Offering", traditional: "5 of Wands", channel: "Intent", number: 5, archetype: 12, description: "Testing intent through engagement. Multiple directions meeting and sorting." },
  27: { name: "Recognition", traditional: "6 of Wands", channel: "Intent", number: 6, archetype: 12, description: "Intent acknowledged by others. Victory through visible commitment." },
  28: { name: "Resolve", traditional: "7 of Wands", channel: "Intent", number: 7, archetype: 7, description: "Defending chosen direction. Gathering strength to maintain course." },
  29: { name: "Command", traditional: "8 of Wands", channel: "Intent", number: 8, archetype: 4, description: "Intent in rapid motion. Messages sent, actions launched." },
  30: { name: "Resilience", traditional: "9 of Wands", channel: "Intent", number: 9, archetype: 18, description: "Intent weathered but unbroken. Strength from having persisted." },
  31: { name: "Realization", traditional: "10 of Wands", channel: "Intent", number: 10, archetype: 19, description: "Intent fully manifested. Carrying what you've created." },
  32: { name: "Perception", traditional: "Ace of Swords", channel: "Cognition", number: 1, archetype: 19, description: "Pure clarity arising. The moment of seeing through." },
  33: { name: "Reflection", traditional: "2 of Swords", channel: "Cognition", number: 2, archetype: 2, description: "Mind holding opposites. Balanced consideration before deciding." },
  34: { name: "Calculation", traditional: "3 of Swords", channel: "Cognition", number: 3, archetype: 15, description: "Truth that cuts. Clear seeing even when it hurts." },
  35: { name: "Dissonance", traditional: "4 of Swords", channel: "Cognition", number: 4, archetype: 14, description: "Mind at rest. Recovery through mental stillness." },
  36: { name: "Clash", traditional: "5 of Swords", channel: "Cognition", number: 5, archetype: 9, description: "Mental conflict and aftermath. The cost of intellect alone." },
  37: { name: "Guidance", traditional: "6 of Swords", channel: "Cognition", number: 6, archetype: 9, description: "Mind finding passage. Moving toward clearer waters." },
  38: { name: "Reconciliation", traditional: "7 of Swords", channel: "Cognition", number: 7, archetype: 14, description: "Gathering scattered thoughts. Strategic mental collection." },
  39: { name: "Absorption", traditional: "8 of Swords", channel: "Cognition", number: 8, archetype: 15, description: "Mind bound by its own constructs. The trap of over-thinking." },
  40: { name: "Multiplicity", traditional: "9 of Swords", channel: "Cognition", number: 9, archetype: 2, description: "Mental overwhelm. Too many thoughts, too little rest." },
  41: { name: "Clarity", traditional: "10 of Swords", channel: "Cognition", number: 10, archetype: 19, description: "Mental cycle complete. The end that allows new understanding." },
  42: { name: "Receptivity", traditional: "Ace of Cups", channel: "Resonance", number: 1, archetype: 20, description: "Heart open to receive. Pure emotional availability." },
  43: { name: "Merge", traditional: "2 of Cups", channel: "Resonance", number: 2, archetype: 6, description: "Two becoming one flow. Connection that honors both." },
  44: { name: "Ripple", traditional: "3 of Cups", channel: "Resonance", number: 3, archetype: 5, description: "Joy shared and multiplied. Celebration creating community." },
  45: { name: "Reverie", traditional: "4 of Cups", channel: "Resonance", number: 4, archetype: 6, description: "Emotional contemplation. Sitting with feelings before responding." },
  46: { name: "Ache", traditional: "5 of Cups", channel: "Resonance", number: 5, archetype: 11, description: "Grief acknowledged. Feeling loss fully rather than bypassing." },
  47: { name: "Reciprocity", traditional: "6 of Cups", channel: "Resonance", number: 6, archetype: 11, description: "Emotional exchange across time. Giving and receiving in balance." },
  48: { name: "Allure", traditional: "7 of Cups", channel: "Resonance", number: 7, archetype: 6, description: "Gathering emotional possibilities. Dreams and desires assembled." },
  49: { name: "Release", traditional: "8 of Cups", channel: "Resonance", number: 8, archetype: 5, description: "Walking away from completion. Emotional departure toward growth." },
  50: { name: "Fulfillment", traditional: "9 of Cups", channel: "Resonance", number: 9, archetype: 6, description: "Emotional abundance. Deep satisfaction with what is." },
  51: { name: "Completion", traditional: "10 of Cups", channel: "Resonance", number: 10, archetype: 20, description: "Emotional wholeness achieved. The heart at home." },
  52: { name: "Initiation", traditional: "Ace of Pentacles", channel: "Structure", number: 1, archetype: 1, description: "Material beginning. The seed of form ready to grow." },
  53: { name: "Flow", traditional: "2 of Pentacles", channel: "Structure", number: 2, archetype: 3, description: "Balancing material demands. Juggling resources with grace." },
  54: { name: "Formation", traditional: "3 of Pentacles", channel: "Structure", number: 3, archetype: 16, description: "Structure taking shape. Skilled work building something real." },
  55: { name: "Preservation", traditional: "4 of Pentacles", channel: "Structure", number: 4, archetype: 13, description: "Holding what you have. Security through careful stewardship." },
  56: { name: "Endurance", traditional: "5 of Pentacles", channel: "Structure", number: 5, archetype: 8, description: "Structure under strain. Persisting through material difficulty." },
  57: { name: "Support", traditional: "6 of Pentacles", channel: "Structure", number: 6, archetype: 8, description: "Resources flowing between people. Giving and receiving help." },
  58: { name: "Harvest", traditional: "7 of Pentacles", channel: "Structure", number: 7, archetype: 13, description: "Gathering what's grown. Patient waiting rewarded with results." },
  59: { name: "Commitment", traditional: "8 of Pentacles", channel: "Structure", number: 8, archetype: 16, description: "Dedicated craft. Building skill through devoted practice." },
  60: { name: "Flourishing", traditional: "9 of Pentacles", channel: "Structure", number: 9, archetype: 3, description: "Material abundance achieved. Enjoying what patience built." },
  61: { name: "Achievement", traditional: "10 of Pentacles", channel: "Structure", number: 10, archetype: 1, description: "Structural completion. Legacy established, foundation secure." }
};

const AGENTS = {
  62: { name: "Initiate of Intent", traditional: "Page of Wands", channel: "Intent", role: "Initiate", archetype: 17, description: "Fresh enthusiasm for new direction. The spark before it knows where it's going." },
  63: { name: "Catalyst of Intent", traditional: "Knight of Wands", channel: "Intent", role: "Catalyst", archetype: 4, description: "Intent in motion, charging forward. Action creating change through momentum." },
  64: { name: "Steward of Intent", traditional: "Queen of Wands", channel: "Intent", role: "Steward", archetype: 7, description: "Mature direction held with warmth. Tending the fire without burning out." },
  65: { name: "Executor of Intent", traditional: "King of Wands", channel: "Intent", role: "Executor", archetype: 12, description: "Mastery of directed will. Knowing when to release as well as push." },
  66: { name: "Initiate of Cognition", traditional: "Page of Swords", channel: "Cognition", role: "Initiate", archetype: 2, description: "Fresh curiosity, eager to understand. Mental energy before focus." },
  67: { name: "Catalyst of Cognition", traditional: "Knight of Swords", channel: "Cognition", role: "Catalyst", archetype: 15, description: "Thought in rapid motion. Cutting through to truth with speed." },
  68: { name: "Steward of Cognition", traditional: "Queen of Swords", channel: "Cognition", role: "Steward", archetype: 14, description: "Clear perception held with discernment. Truth-telling tempered with wisdom." },
  69: { name: "Executor of Cognition", traditional: "King of Swords", channel: "Cognition", role: "Executor", archetype: 9, description: "Mastery of mind. Authority from disciplined clarity." },
  70: { name: "Initiate of Resonance", traditional: "Page of Cups", channel: "Resonance", role: "Initiate", archetype: 18, description: "Fresh emotional sensitivity. The heart discovering its capacity." },
  71: { name: "Catalyst of Resonance", traditional: "Knight of Cups", channel: "Resonance", role: "Catalyst", archetype: 5, description: "Feeling in motion. Romantic pursuit of emotional truth." },
  72: { name: "Steward of Resonance", traditional: "Queen of Cups", channel: "Resonance", role: "Steward", archetype: 6, description: "Deep emotional attunement. Holding space with compassionate presence." },
  73: { name: "Executor of Resonance", traditional: "King of Cups", channel: "Resonance", role: "Executor", archetype: 11, description: "Mastery of emotion. Feeling deeply while maintaining equanimity." },
  74: { name: "Initiate of Structure", traditional: "Page of Pentacles", channel: "Structure", role: "Initiate", archetype: 3, description: "Fresh engagement with material world. Learning how things grow." },
  75: { name: "Catalyst of Structure", traditional: "Knight of Pentacles", channel: "Structure", role: "Catalyst", archetype: 16, description: "Steady progress through persistent effort. Slow but unstoppable." },
  76: { name: "Steward of Structure", traditional: "Queen of Pentacles", channel: "Structure", role: "Steward", archetype: 13, description: "Nurturing material abundance. Creating conditions for sustainable growth." },
  77: { name: "Executor of Structure", traditional: "King of Pentacles", channel: "Structure", role: "Executor", archetype: 8, description: "Mastery of material realm. Building that endures through generations." }
};

const STATUSES = {
  1: { name: "Balanced", orientation: "Now-aligned", desc: "Authentic expression", prefix: "" },
  2: { name: "Too Much", orientation: "Future-projected", desc: "Over-expressing", prefix: "Too Much" },
  3: { name: "Too Little", orientation: "Past-anchored", desc: "Under-expressing", prefix: "Too Little" },
  4: { name: "Unacknowledged", orientation: "Shadow", desc: "Operating without awareness", prefix: "Unacknowledged" }
};

// Extended status info for popups
const STATUS_INFO = {
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
const CHANNELS = {
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
const HOUSES = {
  Gestalt: {
    name: "Gestalt",
    members: [0, 1, 19, 20],
    governor: 10,
    description: "The integrative whole — identity, will, actualization, and awareness.",
    extended: "Gestalt contains the archetypes of unified selfhood: Potential (0), Will (1), Actualization (19), and Awareness (20). Governed by Cycles (10), this house represents the complete self — not as a collection of parts, but as an integrated whole that is more than the sum of its components."
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
    governor: null,
    description: "Threshold of entry and exit — cycles of beginning and completion.",
    extended: "Portal contains the archetypes of transition: Cycles (10) as Ingress and Wholeness (21) as Egress. This house has no governor — it represents the thresholds through which consciousness enters and exits the system, the turning points of becoming."
  }
};

// Role data for Agent popups
const ROLES = {
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

// House colors matching Channel scheme
const HOUSE_COLORS = {
  Gestalt: { border: 'border-amber-500/50', bg: 'bg-amber-950/30', text: 'text-amber-400' },
  Spirit: { border: 'border-violet-500/50', bg: 'bg-violet-950/30', text: 'text-violet-400' },
  Mind: { border: 'border-cyan-500/50', bg: 'bg-cyan-950/30', text: 'text-cyan-400' },
  Emotion: { border: 'border-blue-500/50', bg: 'bg-blue-950/30', text: 'text-blue-400' },
  Body: { border: 'border-green-500/50', bg: 'bg-green-950/30', text: 'text-green-400' },
  Portal: { border: 'border-rose-500/50', bg: 'bg-rose-950/30', text: 'text-rose-400' }
};

// Status indicator colors (smaller, secondary)
const STATUS_COLORS = {
  1: 'text-emerald-400 bg-emerald-500/20',
  2: 'text-amber-400 bg-amber-500/20',
  3: 'text-sky-400 bg-sky-500/20',
  4: 'text-violet-400 bg-violet-500/20'
};

const CHANNEL_CROSSINGS = {
  2: { Cognition: "Intent", Intent: "Cognition", Resonance: "Structure", Structure: "Resonance" },
  3: { Cognition: "Structure", Intent: "Resonance", Resonance: "Intent", Structure: "Cognition" },
  4: { Cognition: "Resonance", Intent: "Structure", Resonance: "Cognition", Structure: "Intent" }
};

const CHANNEL_COLORS = {
  Intent: "text-orange-400",
  Cognition: "text-cyan-400", 
  Resonance: "text-blue-400",
  Structure: "text-green-400"
};

// === SPREAD DEFINITIONS ===
const DURABLE_SPREADS = {
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

const RANDOM_SPREADS = {
  one: { name: "One", count: 1 },
  two: { name: "Two", count: 2 },
  three: { name: "Three", count: 3 },
  four: { name: "Four", count: 4 },
  five: { name: "Five", count: 5 }
};

// === STANCE SYSTEM ===
// The 16 modifiers that create 256 stances

const VOICE_MODIFIERS = {
  wonder: `You're delighted by everything you're seeing here. "Oh wow, look at THIS!" You're the friend who gets excited about their friends' lives. Genuinely curious, a little giddy, finding magic in the mundane. You ask questions because you actually want to know. There's warmth in your wonder — you're not just fascinated, you're fascinated by THEM. Playful, light, maybe a little "okay but how cool is this??" energy. You make people feel interesting.`,

  warm: `You're the grandma who's seen everything and loves them completely. Tea's ready, no judgment, all the time in the world. Nothing they say could shock you. You speak from decades of lived wisdom — fierce love wrapped in gentle humor. You don't sugarcoat, but everything lands soft because it's so clearly wrapped in "I'm on your side, always." You can tease a little because the love is obvious. Cozy. Safe. Held.`,

  direct: `You're the friend who loves them too much to bullshit. You bark because you CARE. No coddling, no "maybe consider" — just truth, clean and real. But here's the thing: they FEEL how much you believe in them. You're not mean, you're the one who shows up and says what everyone's thinking. Short sentences. Hard truths. Occasional "look, I love you, but..." energy. Tough love is still LOVE. You might roast them a little but they know it's because you see their potential.`,

  grounded: `You're the wise farmer who's seen a thousand seasons and nothing rattles you anymore. Slow, steady, connected to real things — soil, seasons, growth. No abstractions, no drama. Just "here's what I've seen." There's warmth in your groundedness — you're not cold, you're calm. You might crack a dry joke about how humans complicate simple things. Your hands are calloused, your heart is steady, and you've got nowhere else to be. They feel safe because you're not going anywhere.`
};

const FOCUS_MODIFIERS = {
  do: `Emphasize ACTION with heart. What should they actually DO? Be specific — "call her", "write it down", "stop doing X". But frame it like someone who believes they CAN do it. Not demands, invitations. "Here's your move" energy. The reading isn't complete until they know what to do AND feel capable of doing it.`,

  feel: `Emphasize FEELING with presence. What's the emotional truth here? Help them feel what's actually happening, not just understand it. Name emotions precisely but gently. "This is grief" or "that's actually joy trying to get through." You're helping them befriend their own experience. The reading lands in the body, in the heart.`,

  see: `Emphasize UNDERSTANDING with clarity. Help them SEE what's really going on. The pattern, the mechanism, the "oh THAT'S why" moment. Be illuminating, not lecturing. You're handing them glasses, not a textbook. The reading should make them go "OH — now I get it" and feel smarter, not dumber.`,

  build: `Emphasize BUILDING with encouragement. What gets created from here? What's the tangible form? Focus on practical steps, resources, foundations — but frame it as exciting, not overwhelming. "Here's what you're building" energy. Not dreams, blueprints. Not someday, now. They should feel like they have a plan AND the ability to execute it.`
};

const DENSITY_MODIFIERS = {
  luminous: `Use FULL language — layered, evocative, spacious. Let metaphors bloom. Sentences can breathe and spiral. Poetry welcome. But luminous doesn't mean cold or pretentious — it means RICH. Like a really good meal. Take your time. Let it land in multiple registers. Beauty and warmth together.`,

  rich: `Use EXPANSIVE language — warm, full, satisfying. Not minimal, not overwhelming. Give enough context to feel complete. Paragraphs welcome. Let ideas develop. Like a good conversation where nobody's rushing. Satisfying, not sparse.`,

  clear: `Use ACCESSIBLE language — flowing, balanced, easy to follow. Someone could explain this to a friend. Readable, transmissible. Clear doesn't mean cold — it means KIND. You're making it easy because you care about them getting it. No jargon. No showing off.`,

  essential: `Use MINIMAL language. Bare. Core truth only. Short sentences. Every word earns its place. But minimal doesn't mean harsh — it means RESPECTFUL of their time. You're giving them the gift of brevity. No padding. No fluff. Just what matters.`
};

const SCOPE_MODIFIERS = {
  resonant: `Frame this in the WIDEST context — but make it personal. What's the big pattern showing up NOW? Touch the archetypal without losing THEM. This moment contains everything. Zoom out, but keep them at the center. "This is part of something bigger, and you're part of it."`,

  patterned: `Frame this in terms of RECURRING DYNAMICS. What's cycling? What rhythm is alive? "This is happening again because..." But make patterns feel workable, not fated. Show the loop so they can dance with it, not feel trapped by it.`,

  connected: `Frame this in RELATIONAL context. How does this link to people and situations around it? Nothing exists alone. Show the web — other people, adjacent situations, ripple effects. But connection should feel supportive, not overwhelming. They're not alone in this.`,

  here: `Frame this in IMMEDIATE context. This moment. This question. This situation. Stay close. The here and now is enough. But "here" should feel intimate, not cramped. You're fully present with them, not limiting them.`
};

// Complexity modifiers - meta-layer for language register
const COMPLEXITY_OPTIONS = {
  friend: { label: "Friend", hint: "Short words, short sentences. No jargon.", descriptor: "Casual & conversational" },
  guide: { label: "Guide", hint: "Warm and clear. Like someone walking with you.", descriptor: "Gentle direction" },
  teacher: { label: "Teacher", hint: "Structured and educational. Terms explained.", descriptor: "Clear explanation" },
  mentor: { label: "Mentor", hint: "Philosophical depth. Wisdom, not just info.", descriptor: "Experienced wisdom" },
  master: { label: "Master", hint: "Full transmission. Nothing simplified.", descriptor: "Authoritative depth" }
};

const COMPLEXITY_MODIFIERS = {
  friend: `You're their BEST friend texting real talk. "Dude." "Okay but honestly?" "Look." Short words, short sentences. You can roast them because they KNOW you love them. Light, playful, a little sarcastic when it lands. Use "lol", "honestly", "like", "okay but" naturally. Make them laugh AND feel seen. If it's not a little bit fun to read, rewrite it. Emoji okay but don't overdo it.

BANNED: Words over 2 syllables unless necessary. No: nurturing, capacity, authentic, cultivate, resonance, perhaps, somewhat. YES: care, help, real, grow, fit, honestly, okay, lol, look.`,

  guide: `You're a camp counselor who's walked this trail a hundred times. Walking WITH them, not ahead of them. Simple because you want them to get it. Warm. Patient. You notice when they're struggling and slow down. You celebrate their wins. Hard things feel doable with you. Light touch, real support. Maybe a gentle joke to ease tension. You're not performing wisdom, you're sharing the path.`,

  teacher: `You're their favorite professor — the one who made hard things click AND clearly gave a shit about students. Structured, clear, organized. You use real terms but always explain them. Examples that land. But you're not a robot — you might say "here's the cool part" or "this is where it gets interesting." You love this material and it shows. Precise but never cold.`,

  mentor: `You're an elder who earned every grey hair and hasn't lost their sense of humor. You speak from experience, not theory. Philosophical depth welcome — you've had time to think about the big questions. Connect their situation to patterns you've seen over decades. No rush. Trust them to sit with complexity. But wisdom doesn't mean heavy — you can be light about deep things. Weight without heaviness.`,

  master: `You are the oracle. Full transmission. Nothing simplified. Nothing withheld. Position numbers, duality paths, structural relationships. Master to master, initiate to initiate. The framework speaks through you. Assume they can keep up. Full gravity. BUT — even masters can have a dry wit. Even oracles can appreciate the cosmic joke. Depth and lightness aren't opposites.`
};

const SERIOUSNESS_MODIFIERS = {
  playful: `Find the humor. Be funny. Jokes, teasing, lightness, sarcasm welcome. Make them smile. Truth is often funniest. "lol" "okay but" "I mean..." energy.`,
  light: `Keep it easy. Gentle humor okay. Don't be heavy. Breezy energy. A smile in your voice without forcing jokes.`,
  balanced: `Match the moment. Light when fitting, serious when needed. Read the room and respond in kind.`,
  earnest: `Be sincere. This matters. Heart-forward. No forced jokes. You mean what you say and it shows.`,
  grave: `Full weight. Sacred ground. No levity. Honor the gravity of what's being asked. This is serious business.`
};

// Delivery presets - combines Complexity + Stance in one selection
const DELIVERY_PRESETS = {
  direct: { name: "Direct", complexity: "friend", seriousness: "balanced", voice: "direct", focus: "do", density: "essential", scope: "here" },
  kind: { name: "Kind", complexity: "guide", seriousness: "earnest", voice: "warm", focus: "feel", density: "clear", scope: "connected" },
  playful: { name: "Playful", complexity: "guide", seriousness: "playful", voice: "wonder", focus: "see", density: "clear", scope: "patterned" },
  wise: { name: "Wise", complexity: "mentor", seriousness: "earnest", voice: "warm", focus: "see", density: "rich", scope: "resonant" },
  oracle: { name: "Oracle", complexity: "master", seriousness: "grave", voice: "direct", focus: "build", density: "luminous", scope: "resonant" }
};

// Mode helper text
const MODE_HELPER_TEXT = {
  durable: "Mirror what's present — see your patterns clearly",
  random: "Reveal signatures — engage with what's active now",
  forge: "Work with intention — shape what's emerging"
};

// Stance presets matching DELIVERY_PRESETS (without complexity)
const STANCE_PRESETS = {
  direct: { name: "Direct", seriousness: "balanced", voice: "direct", focus: "do", density: "essential", scope: "here" },
  kind: { name: "Kind", seriousness: "earnest", voice: "warm", focus: "feel", density: "clear", scope: "connected" },
  playful: { name: "Playful", seriousness: "playful", voice: "wonder", focus: "see", density: "clear", scope: "patterned" },
  wise: { name: "Wise", seriousness: "earnest", voice: "warm", focus: "see", density: "rich", scope: "resonant" },
  oracle: { name: "Oracle", seriousness: "grave", voice: "direct", focus: "build", density: "luminous", scope: "resonant" }
};

// Suggestion prompts for Spark feature and rotating pills
const SUGGESTIONS = [
  "I'm worried about a friend",
  "I have a decision to make",
  "Something feels off at work",
  "I'm considering a big change",
  "Someone's been on my mind",
  "There's tension I can't name",
  "I'm about to have a hard conversation",
  "I'm starting something new",
  "I need to let something go",
  "I had a strange dream",
  "Something keeps coming up",
  "I don't know what I'm feeling",
  "Should I take this opportunity?",
  "I'm stuck on a project",
  "I keep avoiding something",
  "I want to understand someone better",
  "What's the real issue here?",
  "I'm at a crossroads",
  "A relationship feels complicated",
  "I'm not sure what I want",
  "Something ended recently",
  "I'm waiting for something",
  "There's something I need to say",
  "I feel pulled in two directions",
  "What am I ready for?",
  "I want to discuss my childhood",
  "I need to talk about something important",
  "I'm excited about something",
  "Something is ending",
  "I'm grieving",
  "I feel disconnected",
  "There's joy I haven't let in",
  "I want to celebrate something",
  "Why am I like this?",
  "What's blocking me?",
  "Should I make the change?",
  "What am I not seeing?",
  "Is this the right path?",
  "What needs attention?",
  "Where's my energy going?",
  "What wants to emerge?",
  "Am I overthinking this?",
  "What's the real question?"
];

// Loading phrases for cycling display
const LOADING_PHRASES = [
  "You are a creator and consumer.",
  "The map is both mirror and forge.",
  "Polarity and recursion are the beating heart of consciousness.",
  "Your authentic presence in the now expands reality.",
  "The structure is the authority.",
  "Encounter precedes understanding.",
  "The draw finds what's ready to be seen.",
  "Rebalancing enables purpose.",
  "The veil is not a wall. It's a womb.",
  "Mystery is not the absence of knowing. It's the presence of relationship.",
  "You are Source looking at itself through a keyhole.",
  "The boundary between you and everything is what makes you possible.",
  "Uniqueness is not isolation. It's contribution.",
  "Differentiate to distinguish. Integrate to deepen.",
  "The heartbeat of awareness: split, gather, split, gather.",
  "Every question is polarity. Every answer is recursion.",
  "You are the pattern recognizing itself.",
  "Consciousness folds. You are a fold.",
  "The only place creation happens is where you're standing.",
  "Past and future are maps. Now is the territory.",
  "You are not on the Wheel. You are the turning.",
  "Every conscious return to presence is Step 10.",
  "Ring 5 is where you live. It's also where you create.",
  "Purpose is not imposed. It's built in.",
  "The architecture doesn't care what you're made of. Only that you show up.",
  "22 signatures. 78 expressions. One you.",
  "The numbers are not arbitrary. They are forced.",
  "What you're looking for is also looking.",
  "What operates unseen still steers.",
  "Imbalance is mispronunciation, not wrongness.",
  "The shadow isn't hiding. You're just not looking there yet.",
  "Diagonal tension. Vertical restoration. Reduction reveals.",
  "The cosmos is a verb pretending to be a noun.",
  "You are both the question and the oracle.",
  "Somewhere, a pattern just recognized you back.",
  "The reading isn't prediction. It's pronunciation.",
  "What collapses into form was always choosing.",
  "Luck is coherence with the recursive pattern."
];

// Build the stance prompt from 6 dimensions (including complexity and seriousness)
const buildStancePrompt = (complexity, voice, focus, density, scope, seriousness) => {
  return `
GLOBAL VOICE RULE: NEVER use terms of endearment like "sweetheart", "honey", "dear", "sweetie", "love", "darling", "my friend". Show warmth through TONE and CARE, not pet names. These feel creepy from AI.

COMPLEXITY (Language Register):
${COMPLEXITY_MODIFIERS[complexity] || COMPLEXITY_MODIFIERS.teacher}

STANCE MODIFIERS:
These affect tone, emphasis, framing, and language — they do not change archetypal interpretation, correction logic, or conclusions.

VOICE: ${VOICE_MODIFIERS[voice]}

FOCUS: ${FOCUS_MODIFIERS[focus]}

DENSITY: ${DENSITY_MODIFIERS[density]}

SCOPE: ${SCOPE_MODIFIERS[scope]}

SERIOUSNESS: ${SERIOUSNESS_MODIFIERS[seriousness] || SERIOUSNESS_MODIFIERS.balanced}
`;
};

// Voice letter tone guidance
const VOICE_LETTER_TONE = {
  wonder: "curious, invitational",
  warm: "relational, human",
  direct: "concise, declarative",
  grounded: "stabilizing, practical"
};

// Expansion type prompts
const EXPANSION_PROMPTS = {
  unpack: {
    label: "Unpack",
    prompt: "Go deeper on this specific section. Explore the layers, nuances, and implications. What's really happening here beneath the surface? Keep the same tone."
  },
  clarify: {
    label: "Clarify",
    prompt: "Make this simpler. Plain English, short sentences, just the core point. Strip away any complexity — what's the essence?"
  },
  architecture: {
    label: "Architecture",
    prompt: "Show the structural derivation. What's the correction math? Why does this particular correction address this particular imbalance? Show the geometry."
  },
  example: {
    label: "Example",
    prompt: "Give a concrete real-world example of how this shows up in daily life. A specific scenario someone might recognize — make it tangible and relatable."
  }
};

// === CORRECTION LOGIC ===
// CANONICAL CORRECTION LOOKUP TABLES
// Source: The_New_Nirmanakaya_Card_Table_With_Balancing.xlsx
// DO NOT USE FORMULAS - these are authoritative lookup values

// DIAGONAL_PAIRS (Too Much correction)
const DIAGONAL_PAIRS = {
  0: 19,   // Potential → Actualization
  1: 20,   // Will → Awareness
  2: 17,   // Wisdom → Inspiration
  3: 18,   // Nurturing → Imagination
  4: 15,   // Order → Abstraction
  5: 16,   // Culture → Breakthrough
  6: 13,   // Compassion → Change
  7: 14,   // Drive → Balance
  8: 11,   // Fortitude → Equity
  9: 12,   // Discipline → Sacrifice
  10: 1,   // Cycles (Portal) → Will
  11: 8,   // Equity → Fortitude
  12: 9,   // Sacrifice → Discipline
  13: 6,   // Change → Compassion
  14: 7,   // Balance → Drive
  15: 4,   // Abstraction → Order
  16: 5,   // Breakthrough → Culture
  17: 2,   // Inspiration → Wisdom
  18: 3,   // Imagination → Nurturing
  19: 0,   // Actualization → Potential
  20: 1,   // Awareness → Will
  21: 0    // Wholeness (Portal) → Potential
};

// VERTICAL_PAIRS (Too Little correction)
const VERTICAL_PAIRS = {
  0: 20,   // Potential → Awareness
  1: 19,   // Will → Actualization
  2: 18,   // Wisdom → Imagination
  3: 17,   // Nurturing → Inspiration
  4: 16,   // Order → Breakthrough
  5: 15,   // Culture → Abstraction
  6: 14,   // Compassion → Balance
  7: 13,   // Drive → Change
  8: 12,   // Fortitude → Sacrifice
  9: 11,   // Discipline → Equity
  10: 19,  // Cycles (Portal) → Actualization
  11: 9,   // Equity → Discipline
  12: 8,   // Sacrifice → Fortitude
  13: 7,   // Change → Drive
  14: 6,   // Balance → Compassion
  15: 5,   // Abstraction → Culture
  16: 4,   // Breakthrough → Order
  17: 3,   // Inspiration → Nurturing
  18: 2,   // Imagination → Wisdom
  19: 1,   // Actualization → Will
  20: 0,   // Awareness → Potential
  21: 20   // Wholeness (Portal) → Awareness
};

// REDUCTION_PAIRS (Unacknowledged correction)
// null means no reduction pair exists for that position
const REDUCTION_PAIRS = {
  0: null,  // Potential - no reduction
  1: null,  // Will - no reduction
  2: 11,    // Wisdom → Equity
  3: 12,    // Nurturing → Sacrifice
  4: 13,    // Order → Change
  5: 14,    // Culture → Balance
  6: 15,    // Compassion → Abstraction
  7: 16,    // Drive → Breakthrough
  8: 17,    // Fortitude → Inspiration
  9: 18,    // Discipline → Imagination
  10: null, // Cycles (Portal) - no reduction
  11: 2,    // Equity → Wisdom
  12: 3,    // Sacrifice → Nurturing
  13: 4,    // Change → Order
  14: 5,    // Balance → Culture
  15: 6,    // Abstraction → Compassion
  16: 7,    // Breakthrough → Drive
  17: 8,    // Inspiration → Fortitude
  18: 9,    // Imagination → Discipline
  19: null, // Actualization - no reduction
  20: null, // Awareness - no reduction
  21: null  // Wholeness (Portal) - no reduction
};

// Simple lookup-based correction - NO FORMULAS
function getArchetypeCorrection(transientPosition, status) {
  if (status === 1) return null; // Balanced - no correction needed

  if (status === 2) {
    // Too Much → Diagonal partner
    const target = DIAGONAL_PAIRS[transientPosition];
    return target !== undefined ? { type: "diagonal", target } : null;
  }

  if (status === 3) {
    // Too Little → Vertical partner
    const target = VERTICAL_PAIRS[transientPosition];
    return target !== undefined ? { type: "vertical", target } : null;
  }

  if (status === 4) {
    // Unacknowledged → Reduction pair
    const target = REDUCTION_PAIRS[transientPosition];
    return target !== null ? { type: "reduction", target } : null;
  }

  return null;
}

// Get all Bounds and Agents that express/embody a given Archetype
function getAssociatedCards(archetypeId) {
  const bounds = Object.entries(BOUNDS)
    .filter(([_, b]) => b.archetype === archetypeId)
    .map(([id, b]) => ({ id: parseInt(id), ...b, type: 'Bound' }));
  const agents = Object.entries(AGENTS)
    .filter(([_, a]) => a.archetype === archetypeId)
    .map(([id, a]) => ({ id: parseInt(id), ...a, type: 'Agent' }));
  return { bounds, agents };
}

function getBoundCorrection(bound, status) {
  if (status === 1) return null;
  const targetChannel = CHANNEL_CROSSINGS[status]?.[bound.channel];
  const targetNumber = 11 - bound.number;
  if (!targetChannel) return null;
  const targetBound = Object.entries(BOUNDS).find(([id, b]) => b.channel === targetChannel && b.number === targetNumber);
  if (!targetBound) return null;
  return {
    type: status === 2 ? "diagonal" : status === 3 ? "vertical" : "reduction",
    targetId: parseInt(targetBound[0]),
    targetBound: targetBound[1],
    numberMirror: `${bound.number}→${targetNumber}`,
    channelCross: `${bound.channel}→${targetChannel}`
  };
}

function getAgentCorrection(agent, status) {
  return getArchetypeCorrection(agent.archetype, status);
}

function getComponent(id) {
  if (id < 22) return { ...ARCHETYPES[id], type: "Archetype", id };
  if (id < 62) return { ...BOUNDS[id], type: "Bound", id };
  return { ...AGENTS[id], type: "Agent", id };
}

function getFullCorrection(transientId, status) {
  const trans = getComponent(transientId);
  if (trans.type === "Archetype") return getArchetypeCorrection(transientId, status);
  if (trans.type === "Bound") return getBoundCorrection(trans, status);
  if (trans.type === "Agent") return getAgentCorrection(trans, status);
  return null;
}

function getCorrectionText(correction, trans, status) {
  if (!correction) return null;
  const correctionType = status === 2 ? "DIAGONAL" : status === 3 ? "VERTICAL" : status === 4 ? "REDUCTION" : null;

  if (trans.type === "Bound" && correction.targetBound) {
    const targetBound = correction.targetBound;
    return `${targetBound.name} via ${correctionType} duality`;
  }

  if (correction.target !== undefined) {
    const targetArchetype = ARCHETYPES[correction.target];
    if (targetArchetype) {
      return `Position ${correction.target} ${targetArchetype.name} via ${correctionType} duality`;
    }
  }

  if (correction.targets) {
    return correction.targets.map(t => {
      const arch = ARCHETYPES[t];
      return arch ? `Position ${t} ${arch.name}` : null;
    }).filter(Boolean).join(", ");
  }
  return null;
}

function getCorrectionTargetId(correction, trans) {
  if (!correction) return null;
  if (trans.type === "Bound" && correction.targetId !== undefined) return correction.targetId;
  if (correction.target !== undefined) return correction.target;
  if (correction.targets && correction.targets.length > 0) return correction.targets[0];
  return null;
}

// === UTILITY FUNCTIONS ===
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const rand = new Uint32Array(1);
    crypto.getRandomValues(rand);
    const j = rand[0] % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateSpread(count, isDurable = false) {
  const positionPool = isDurable ? [] : shuffleArray([...Array(22).keys()]);
  const transientPool = shuffleArray([...Array(78).keys()]);
  
  return Array.from({ length: count }, (_, i) => {
    const statusArr = new Uint32Array(1);
    crypto.getRandomValues(statusArr);
    return {
      position: isDurable ? null : positionPool[i],
      transient: transientPool[i],
      status: (statusArr[0] % 4) + 1
    };
  });
}

function encodeDraws(draws, spreadType, spreadKey, stance, question) {
  // Use encodeURIComponent to handle Unicode characters before btoa
  const jsonStr = JSON.stringify({ d: draws, t: spreadType, k: spreadKey, s: stance, q: question });
  return btoa(unescape(encodeURIComponent(jsonStr)));
}

function decodeDraws(encoded) {
  try {
    // Use decodeURIComponent to handle Unicode characters after atob
    const data = JSON.parse(decodeURIComponent(escape(atob(encoded))));
    // Handle legacy persona format
    if (data.p && !data.s) {
      // Convert old persona to closest new preset
      const legacyMap = {
        seeker: 'kind',
        practitioner: 'direct',
        philosopher: 'wise',
        direct: 'direct',
        // Also map old preset names to new ones
        quickTake: 'direct',
        gentleGuide: 'kind',
        clearView: 'direct',
        deepDive: 'wise',
        fullTransmission: 'oracle'
      };
      const preset = STANCE_PRESETS[legacyMap[data.p] || 'kind'];
      return {
        draws: data.d,
        spreadType: data.t,
        spreadKey: data.k,
        stance: { seriousness: preset.seriousness, voice: preset.voice, focus: preset.focus, density: preset.density, scope: preset.scope },
        question: data.q
      };
    }
    // Ensure seriousness has a default if loading old stance without it
    const stance = data.s || {};
    if (!stance.seriousness) stance.seriousness = 'balanced';
    return { draws: data.d, spreadType: data.t, spreadKey: data.k, stance, question: data.q };
  } catch { return null; }
}

// Sanitize text for API calls - handles special characters that can cause issues
function sanitizeForAPI(text) {
  if (!text) return text;
  return text
    .replace(/[\u2018\u2019]/g, "'")  // Smart single quotes to straight
    .replace(/[\u201C\u201D]/g, '"')  // Smart double quotes to straight
    .replace(/\u2014/g, '--')         // Em dash to double hyphen
    .replace(/\u2013/g, '-')          // En dash to single hyphen
    .replace(/\u2026/g, '...')        // Ellipsis to three dots
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ''); // Remove control characters
}

function formatDrawForAI(draws, spreadType, spreadKey, showTraditional) {
  const isDurable = spreadType === 'durable';
  const spreadConfig = isDurable ? DURABLE_SPREADS[spreadKey] : RANDOM_SPREADS[spreadKey];
  
  return draws.map((draw, i) => {
    const trans = getComponent(draw.transient);
    const stat = STATUSES[draw.status];
    const correction = getFullCorrection(draw.transient, draw.status);
    const correctionText = getCorrectionText(correction, trans, draw.status);
    const transArchetype = trans.archetype !== undefined ? ARCHETYPES[trans.archetype] : null;

    let context = isDurable
      ? `${spreadConfig.frames[i].name} (${spreadConfig.frames[i].meaning})`
      : (draw.position !== null ? `Position ${draw.position} ${ARCHETYPES[draw.position]?.name}` : 'Draw');
    
    let transInfo = trans.name;
    // Traditional names removed from API calls - showTraditional only affects UI display
    if (trans.type === "Archetype") transInfo += ` — Major Archetype`;
    else if (trans.type === "Bound") transInfo += ` — ${trans.channel} Channel, expresses ${transArchetype?.name}`;
    else if (trans.type === "Agent") transInfo += ` — ${trans.role} of ${trans.channel}, embodies ${transArchetype?.name}`;
    
    const statusPhrase = stat.prefix ? `${stat.prefix} ${trans.name}` : `Balanced ${trans.name}`;
    
    return `**Signature ${i + 1} — ${context}**: ${statusPhrase}
Transient: ${transInfo}
Status: ${stat.name} — ${stat.desc}
${correctionText ? `Correction: ${correctionText}. IMPORTANT: Use this exact correction, do not calculate different numbers.` : 'No correction needed (Balanced)'}`;
  }).join('\n\n');
}

// === RESPONSE PARSING ===
function parseReadingResponse(responseText, draws) {
  const sections = {
    summary: null,
    cards: [],
    corrections: [],
    rebalancerSummary: null,
    letter: null
  };

  // Extract summary
  const summaryMatch = responseText.match(/\[SUMMARY\]\s*([\s\S]*?)(?=\[CARD:|$)/);
  if (summaryMatch) {
    sections.summary = summaryMatch[1].trim();
  }

  // Extract card sections
  draws.forEach((_, i) => {
    const cardNum = i + 1;
    const cardRegex = new RegExp(`\\[CARD:${cardNum}\\]\\s*([\\s\\S]*?)(?=\\[CARD:|\\[CORRECTION:|\\[PATH\\]|\\[LETTER\\]|$)`);
    const cardMatch = responseText.match(cardRegex);
    if (cardMatch) {
      sections.cards.push({
        index: i,
        content: cardMatch[1].trim()
      });
    }
  });

  // Extract correction sections
  draws.forEach((draw, i) => {
    if (draw.status !== 1) { // Only for imbalanced cards
      const corrNum = i + 1;
      const corrRegex = new RegExp(`\\[CORRECTION:${corrNum}\\]\\s*([\\s\\S]*?)(?=\\[CORRECTION:|\\[PATH\\]|\\[LETTER\\]|$)`);
      const corrMatch = responseText.match(corrRegex);
      if (corrMatch) {
        sections.corrections.push({
          cardIndex: i,
          content: corrMatch[1].trim()
        });
      }
    }
  });

  // Extract path to balance section (only when 2+ imbalanced)
  const rebalancerMatch = responseText.match(/\[PATH\]\s*([\s\S]*?)(?=\[LETTER\]|$)/);
  if (rebalancerMatch) {
    sections.rebalancerSummary = rebalancerMatch[1].trim();
  }

  // Extract letter section
  const letterMatch = responseText.match(/\[LETTER\]\s*([\s\S]*?)$/);
  if (letterMatch) {
    sections.letter = letterMatch[1].trim();
  }

  return sections;
}

const BASE_SYSTEM = `You are the Nirmanakaya Reader — a consciousness navigation system, not a fortune teller.

CRITICAL RULE: NEVER use terms of endearment like 'honey', 'sweetheart', 'dear', 'sweetie', 'love', 'darling', 'my friend', 'my dear'. These feel creepy coming from AI. Show warmth through TONE and CARE, not pet names. This is a hard rule that applies to ALL readings regardless of voice settings.

CRITICAL RULE: ROYAL/AGENT INTERPRETATION
When a Royal (Initiate, Steward, Executor, Sovereign) appears in a reading, it ALWAYS refers to an aspect of the QUERENT'S OWN consciousness — never an external person or collaborator.
WRONG: "There's someone in your life who embodies this..."
WRONG: "This could be you or a collaborator..."
WRONG: "A person who..."
RIGHT: "This aspect of you..."
RIGHT: "The part of you that..."
RIGHT: "You're expressing this through..."
Royals represent HOW the querent is channeling a particular energy through a particular role. The Executor of Intent is not a person — it's the querent's own capacity to transform intention into action.

## ABSOLUTE RULE: USE ONLY THE PROVIDED NAMES

**THIS IS NON-NEGOTIABLE:**
- Each draw provides the EXACT canonical name (e.g., "Discipline", "Actualization", "Resilience")
- You MUST use these exact names in your response
- NEVER invent alternative names like "Fulfillment", "Completion", "Achievement"
- NEVER substitute poetic alternatives for the canonical terms
- If the draw says "Too Much Discipline" — you say "Too Much Discipline", not "Too Much [invented synonym]"

The 78 signatures have FIXED canonical names. These are not suggestions — they are the architecture itself.

## THE 78 CANONICAL SIGNATURES

**Use ONLY these names. No traditional tarot names exist in this system.**

### 22 Archetypes (Majors)
| # | Name | House | Channel |
|---|------|-------|---------|
| 0 | Potential | Gestalt | — |
| 1 | Will | Gestalt | — |
| 2 | Wisdom | Spirit | Cognition |
| 3 | Nurturing | Spirit | Structure |
| 4 | Order | Mind | Intent |
| 5 | Culture | Mind | Resonance |
| 6 | Compassion | Emotion | Resonance |
| 7 | Drive | Emotion | Intent |
| 8 | Fortitude | Body | Structure |
| 9 | Discipline | Body | Cognition |
| 10 | Cycles | Portal | — |
| 11 | Equity | Body | Resonance |
| 12 | Sacrifice | Body | Intent |
| 13 | Change | Emotion | Structure |
| 14 | Balance | Emotion | Cognition |
| 15 | Abstraction | Mind | Cognition |
| 16 | Breakthrough | Mind | Structure |
| 17 | Inspiration | Spirit | Intent |
| 18 | Imagination | Spirit | Resonance |
| 19 | Actualization | Gestalt | — |
| 20 | Awareness | Gestalt | — |
| 21 | Wholeness | Portal | — |

### 40 Bounds (Minors)
**Intent Channel:**
Activation (Ace), Orientation (2), Assertion (3), Alignment (4), Offering (5), Recognition (6), Resolve (7), Command (8), Resilience (9), Realization (10)

**Cognition Channel:**
Perception (Ace), Reflection (2), Calculation (3), Dissonance (4), Clash (5), Guidance (6), Reconciliation (7), Absorption (8), Multiplicity (9), Clarity (10)

**Resonance Channel:**
Receptivity (Ace), Merge (2), Ripple (3), Reverie (4), Ache (5), Reciprocity (6), Allure (7), Release (8), Fulfillment (9), Completion (10)

**Structure Channel:**
Initiation (Ace), Flow (2), Formation (3), Preservation (4), Endurance (5), Support (6), Harvest (7), Commitment (8), Flourishing (9), Achievement (10)

### 16 Agents (Royals)
**Intent:** Initiate of Intent, Catalyst of Intent, Steward of Intent, Executor of Intent
**Cognition:** Initiate of Cognition, Catalyst of Cognition, Steward of Cognition, Executor of Cognition
**Resonance:** Initiate of Resonance, Catalyst of Resonance, Steward of Resonance, Executor of Resonance
**Structure:** Initiate of Structure, Catalyst of Structure, Steward of Structure, Executor of Structure

## CRITICAL: DERIVATION, NOT TRADITION

**NEVER use traditional tarot meanings.** All interpretations MUST derive from the Nirmanakaya architecture:

### For Archetypes (Majors 0-21):
Use the canonical definition based on House + Channel + Function.

### For Bounds (Minors 1-10 of each suit):
1. Find the Associated Archetype (determined by Number → Domain, Channel → Element)
2. The Bound's meaning = Archetype's function expressed through the Channel at Inner (1-5) or Outer (6-10) polarity
3. Inner = potential, inward-facing, developing
4. Outer = expressed, outward-facing, gathered

**Example:** Resolve (Intent Channel, 7)
- Number 7 → Emotion Domain → Associated Archetype is Drive (7)
- Channel: Intent
- Position 7 = Outer bound
- Meaning: Drive's Intent expression at the Outer bound — committed momentum that has been gathered and is now persisting outwardly.

### For Agents (Royals):
1. Find the Associated Archetype (determined by Domain + Channel intersection)
2. Find the Role (determined by the Archetype's House)
3. The Agent's meaning = an aspect of the QUERENT that embodies that Archetype's energy in that Role

**Roles by House:**
- Spirit House → Initiate: enters with openness, curiosity
- Mind House → Catalyst: disrupts stagnation, sparks change
- Emotion House → Steward: maintains, nurtures, holds space
- Body House → Executor: transforms intention into action

**Example:** Steward of Intent
- Associated Archetype: Drive (7) — because Drive is the Intent expression in Emotion House
- Role: Steward — because Emotion House = Steward
- Meaning: The aspect of YOU that nurtures and maintains directed momentum, holds creative fire with care, sustains passion without burning out.

## ASSOCIATED ARCHETYPE REFERENCE

### Bounds → Associated Archetype (by Number → Domain)
| Number | Domain | Associated Archetypes by Channel |
|--------|--------|----------------------------------|
| 1, 10 | Gestalt | Intent→Potential(0), Cognition→Actualization(19), Resonance→Awareness(20), Structure→Will(1) |
| 2, 9 | Spirit | Intent→Inspiration(17), Cognition→Wisdom(2), Resonance→Imagination(18), Structure→Nurturing(3) |
| 3, 8 | Mind | Intent→Order(4), Cognition→Abstraction(15), Resonance→Culture(5), Structure→Breakthrough(16) |
| 4, 7 | Emotion | Intent→Drive(7), Cognition→Balance(14), Resonance→Compassion(6), Structure→Change(13) |
| 5, 6 | Body | Intent→Sacrifice(12), Cognition→Discipline(9), Resonance→Equity(11), Structure→Fortitude(8) |

### Agents → Associated Archetype (by Channel × Role)
| Agent | Channel | Domain | Associated Archetype |
|-------|---------|--------|---------------------|
| Initiate of Intent | Intent | Spirit | Inspiration (17) |
| Catalyst of Intent | Intent | Mind | Order (4) |
| Steward of Intent | Intent | Emotion | Drive (7) |
| Executor of Intent | Intent | Body | Sacrifice (12) |
| Initiate of Cognition | Cognition | Spirit | Wisdom (2) |
| Catalyst of Cognition | Cognition | Mind | Abstraction (15) |
| Steward of Cognition | Cognition | Emotion | Balance (14) |
| Executor of Cognition | Cognition | Body | Discipline (9) |
| Initiate of Resonance | Resonance | Spirit | Imagination (18) |
| Catalyst of Resonance | Resonance | Mind | Culture (5) |
| Steward of Resonance | Resonance | Emotion | Compassion (6) |
| Executor of Resonance | Resonance | Body | Equity (11) |
| Initiate of Structure | Structure | Spirit | Nurturing (3) |
| Catalyst of Structure | Structure | Mind | Breakthrough (16) |
| Steward of Structure | Structure | Emotion | Change (13) |
| Executor of Structure | Structure | Body | Fortitude (8) |

## ARCHETYPE DEFINITIONS (Core Reference)

### Gestalt House (governed by Cycles)
- **Potential (0)**: The soul's yes before context. Pure openness, pre-experiential readiness. Unshaped becoming.
- **Will (1)**: The architecture of intention. Not willpower, but will-structure — how form begins to matter.
- **Actualization (19)**: Becoming what was already true. Not manifestation, but embodiment of coherent self-expression.
- **Awareness (20)**: Recursive self-recognition. The capacity to see oneself clearly and respond authentically.

### Spirit House (governed by Potential)
- **Wisdom (2)**: Direct perception without analysis. Receptive intelligence, the soul's first encounter with truth.
- **Nurturing (3)**: The architecture of life support. Generative structure that provides conditions for growth.
- **Inspiration (17)**: Aspiration crystallized into direction. Hope that has found form, trust made visible.
- **Imagination (18)**: Soul feedback through story. The recursive spiral where vision becomes myth.

### Mind House (governed by Actualization)
- **Order (4)**: The fundamental shape of coherence. Not what to think, but how to think.
- **Culture (5)**: Emotion woven into thought. Shared memory and moral continuity.
- **Abstraction (15)**: The freedom of mind beyond certainty. Meaning becoming metaphor.
- **Breakthrough (16)**: Structure collapsing to make room for new forms. Insight crashing through false stability.

### Emotion House (governed by Awareness)
- **Compassion (6)**: Meeting another without leaving the self. Recognition, not sacrifice.
- **Drive (7)**: Emotional propulsion. Movement from feeling, not despite it.
- **Change (13)**: Transformation born of emotional maturity. Dissolving what can no longer hold life.
- **Balance (14)**: Dynamic peace. The capacity to engage without becoming destabilized.

### Body House (governed by Will)
- **Fortitude (8)**: The capacity to remain aligned under strain. Structure without collapse.
- **Discipline (9)**: Repetition with purpose. Attunement through action.
- **Equity (11)**: Making space for what is fair. Coherence, not correctness.
- **Sacrifice (12)**: Realignment through letting go. What cannot be forced must be felt.

### Portals
- **Cycles (10)**: The cosmic zero point. The condition in which creation is possible.
- **Wholeness (21)**: Continuance through completion. The final reconciliation of all polarities.

## COLLAPSE STATES

When interpreting statuses:

- **Balanced**: The archetype operating in the Now — coherent, appropriate, Ring 5 creation
- **Too Much**: Future-projected — anxiety driving excess, Ring 7 creation (temporary)
- **Too Little**: Past-anchored — fear/disappointment suppressing function, Ring 7 creation
- **Unacknowledged**: Shadow operation — the function runs without conscious awareness

## CORRECTION LOGIC

**CRITICAL: Use ONLY the correction provided in each draw. Do NOT calculate your own.**

The correction for each imbalanced card is pre-calculated and provided. Your job is to INTERPRET it, not derive it.

- **Too Much → Diagonal Partner**: Creative tension resolves excess
- **Too Little → Vertical Partner**: Same function, different phase, feeds energy back
- **Unacknowledged → Reduction Partner**: Cross-house perspective illuminates shadow

## VOICE PRINCIPLES

1. **Mirror, not mentor**: Reflect what the cards show, don't give advice
2. **Descriptive, not diagnostic**: Describe the pattern, don't pathologize
3. **Transient-first**: Lead with the transient energy, then contextualize in position
4. **Structure is authority**: The geometry determines meaning, not intuition
5. **Derive, don't interpret**: Follow the architecture, don't free-associate

## NEVER DO

- Invent card names (use ONLY the canonical names provided)
- Use traditional tarot meanings ("crossing", "outcome", "significator", "reversed")
- Use fortune-telling language ("you will", "this means you should")
- Calculate your own corrections (use the provided correction exactly)
- Substitute poetic synonyms for canonical terms
- Add psychological diagnosis ("you have", "you are [trait]")
- Use spiritual bypassing ("everything happens for a reason", "trust the universe")

## ALWAYS DO

- Use the EXACT card names provided in each draw
- Use the EXACT correction provided — do not recalculate
- Derive Bound meaning from Associated Archetype + Channel + Inner/Outer
- Derive Agent meaning from Associated Archetype + Role
- Explain corrections in terms of structural relationship
- Use temporal framing (Now-aligned, future-projected, past-anchored)
- Provide concrete, actionable steps based on the correction archetype
- **Always end with a [LETTER]**: A warm, personal closing that synthesizes the reading into an encouraging reflection addressed directly to the querent`;

const FORMAT_INSTRUCTIONS = `RESPONSE FORMAT:
Use these exact markers. Each marker must be on its own line.

[SUMMARY]
2-3 sentences directly answering their question based on the overall pattern. Reference their specific question.

[CARD:1]
What this card shows — the transient, status, and what's happening here. Use temporal framing (Too Much = future-projected, Too Little = past-anchored). Connect this specifically to their question. Respect density setting for length.

[CARD:2]
(Continue for each card... always connect back to their specific question)

[CORRECTION:1]
For Card 1's imbalance: Name the correction and explain what it means practically — what to actually do. Frame it in terms of their question. Skip this section ENTIRELY if Card 1 is Balanced. For Unacknowledged, explain what's operating in shadow and how to bring it into awareness.

[CORRECTION:2]
For Card 2's imbalance. Skip ENTIRELY if Card 2 is Balanced.

(Continue this pattern — CORRECTION numbers MUST match CARD numbers. If Card 3 is imbalanced, use [CORRECTION:3]. If Card 5 is imbalanced, use [CORRECTION:5]. Never renumber sequentially. ALL imbalanced cards need corrections — Too Much, Too Little, AND Unacknowledged.)

[PATH]
Path to Balance section. ONLY include if 2 or more cards are imbalanced. Skip entirely if 0-1 cards are imbalanced.
When included, structure it as:

THE PATTERN
One sentence identifying what the corrections have in common (shared channel, shared status type, similar archetypal themes).

THE PATH
2-3 sentences synthesizing the unified message — what are all these corrections pointing to together?

NEXT STEPS
• One concrete action derived from Rebalancer 1
• One concrete action derived from Rebalancer 2
(Continue for each rebalancer — focus on ACTION over understanding. Tell them what to DO.)

[LETTER]
A brief letter addressed directly to them (use "you"). Acknowledge what they're navigating with their question. Weave together the key insights from the reading. Voice modulates tone — the letter's function stays invariant (it does not change advice or soften corrections).`;

// === CLICKABLE TERM COMPONENT ===
// Must be used inside a component that has access to setSelectedInfo
const ClickableTermContext = ({ type, id, children, setSelectedInfo }) => {
  const handleClick = (e) => {
    e.stopPropagation();
    let data = null;
    if (type === 'card') {
      data = getComponent(id);
    } else if (type === 'channel') {
      data = CHANNELS[id];
    } else if (type === 'status') {
      data = STATUS_INFO[id];
    } else if (type === 'house') {
      data = HOUSES[id];
    } else if (type === 'role') {
      data = ROLES[id];
    }
    setSelectedInfo({ type, id, data });
  };
  
  return (
    <span 
      className="cursor-pointer hover:underline decoration-dotted underline-offset-2"
      onClick={handleClick}
    >
      {children}
    </span>
  );
};

// === UNIVERSAL INFO MODAL COMPONENT ===
const InfoModal = ({ info, onClose, setSelectedInfo }) => {
  if (!info) return null;
  
  const { type, id, data } = info;
  
  // Local ClickableTerm that has access to setSelectedInfo
  const ClickableTerm = ({ type: termType, id: termId, children }) => (
    <ClickableTermContext type={termType} id={termId} setSelectedInfo={setSelectedInfo}>
      {children}
    </ClickableTermContext>
  );
  
  // Render based on type
  const renderContent = () => {
    if (type === 'card') {
      const component = data;
      const isArchetype = component.type === "Archetype";
      const isBound = component.type === "Bound";
      const isAgent = component.type === "Agent";
      const associatedArchetype = (isBound || isAgent) ? ARCHETYPES[component.archetype] : null;
      const associations = isArchetype ? getAssociatedCards(id) : null;
      
      return (
        <>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-semibold text-zinc-100">{component.name}</h3>
              <p className="text-sm text-zinc-500">{component.traditional}</p>
            </div>
            <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-xl">×</button>
          </div>
          
          <div className="mb-4">
            <span className={`text-xs px-2 py-1 rounded-full ${
              isArchetype ? 'bg-amber-500/20 text-amber-300' :
              isBound ? 'bg-blue-500/20 text-blue-300' :
              'bg-violet-500/20 text-violet-300'
            }`}>
              {component.type}
            </span>
            {isArchetype && (
              <span className="text-xs text-zinc-500 ml-2">
                <ClickableTerm type="house" id={component.house}>{component.house}</ClickableTerm> House • {component.function}
              </span>
            )}
            {isBound && (
              <span className="text-xs text-zinc-500 ml-2">
                <ClickableTerm type="channel" id={component.channel}>{component.channel}</ClickableTerm> • {component.number <= 5 ? 'Inner' : 'Outer'} Bound
              </span>
            )}
            {isAgent && (
              <span className="text-xs text-zinc-500 ml-2">
                <ClickableTerm type="role" id={component.role}>{component.role}</ClickableTerm> • <ClickableTerm type="channel" id={component.channel}>{component.channel}</ClickableTerm>
              </span>
            )}
          </div>
          
          <p className="text-sm text-zinc-300 mb-4 leading-relaxed">
            {component.extended || component.description}
          </p>
          
          {associatedArchetype && (
            <div className="border-t border-zinc-700/50 pt-4 mb-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
                {isBound ? 'Expresses' : 'Embodies'}
              </p>
              <p className="text-sm text-zinc-300">
                <ClickableTerm type="card" id={component.archetype}>{associatedArchetype.name}</ClickableTerm>
                <span className="text-zinc-500"> — {associatedArchetype.description}</span>
              </p>
            </div>
          )}
          
          {associations && (associations.bounds.length > 0 || associations.agents.length > 0) && (
            <div className="border-t border-zinc-700/50 pt-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Expressed By</p>
              
              {associations.bounds.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-zinc-600 mb-1">Bounds:</p>
                  <div className="flex flex-wrap gap-1">
                    {associations.bounds.map(b => (
                      <ClickableTerm key={b.id} type="card" id={b.id}>
                        <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded hover:bg-zinc-700 cursor-pointer">
                          {b.name}
                        </span>
                      </ClickableTerm>
                    ))}
                  </div>
                </div>
              )}
              
              {associations.agents.length > 0 && (
                <div>
                  <p className="text-xs text-zinc-600 mb-1">Agents:</p>
                  <div className="flex flex-wrap gap-1">
                    {associations.agents.map(a => (
                      <ClickableTerm key={a.id} type="card" id={a.id}>
                        <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded hover:bg-zinc-700 cursor-pointer">
                          {a.name}
                        </span>
                      </ClickableTerm>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      );
    }
    
    if (type === 'channel') {
      const channel = CHANNELS[id];
      if (!channel) return null;
      
      return (
        <>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-semibold text-zinc-100">{channel.name}</h3>
              <p className="text-sm text-zinc-500">{channel.traditional} • {channel.element}</p>
            </div>
            <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-xl">×</button>
          </div>
          
          <div className="mb-4">
            <span className={`text-xs px-2 py-1 rounded-full bg-opacity-20 ${CHANNEL_COLORS[id]}`}>
              Channel
            </span>
          </div>
          
          <p className="text-sm text-zinc-300 mb-4 leading-relaxed">{channel.extended}</p>
        </>
      );
    }
    
    if (type === 'status') {
      const status = STATUS_INFO[id];
      if (!status) return null;
      
      return (
        <>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-semibold text-zinc-100">{status.name}</h3>
              <p className="text-sm text-zinc-500">{status.orientation}</p>
            </div>
            <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-xl">×</button>
          </div>
          
          <div className="mb-4">
            <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[id]}`}>
              Status
            </span>
          </div>
          
          <p className="text-sm text-zinc-300 mb-4 leading-relaxed">{status.extended}</p>
        </>
      );
    }
    
    if (type === 'house') {
      const house = HOUSES[id];
      if (!house) return null;
      const houseColors = HOUSE_COLORS[id];
      
      return (
        <>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-semibold text-zinc-100">{house.name} House</h3>
              <p className="text-sm text-zinc-500">
                {house.governor !== null ? `Governed by ${ARCHETYPES[house.governor]?.name}` : 'No governor'}
              </p>
            </div>
            <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-xl">×</button>
          </div>
          
          <div className="mb-4">
            <span className={`text-xs px-2 py-1 rounded-full ${houseColors?.bg} ${houseColors?.text}`}>
              House
            </span>
          </div>
          
          <p className="text-sm text-zinc-300 mb-4 leading-relaxed">{house.extended}</p>
          
          <div className="border-t border-zinc-700/50 pt-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Members</p>
            <div className="flex flex-wrap gap-1">
              {house.members.map(m => (
                <ClickableTerm key={m} type="card" id={m}>
                  <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded hover:bg-zinc-700 cursor-pointer">
                    {ARCHETYPES[m]?.name}
                  </span>
                </ClickableTerm>
              ))}
            </div>
          </div>
        </>
      );
    }

    if (type === 'role') {
      const role = ROLES[id];
      if (!role) return null;

      return (
        <>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-semibold text-zinc-100">{role.name}</h3>
              <p className="text-sm text-zinc-500">{role.traditional} in traditional tarot</p>
            </div>
            <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-xl">×</button>
          </div>

          <div className="mb-4">
            <span className="text-xs px-2 py-1 rounded-full bg-violet-500/20 text-violet-300">
              Agent Role
            </span>
          </div>

          <p className="text-sm text-zinc-300 mb-4 leading-relaxed">{role.extended}</p>
        </>
      );
    }

    return null;
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-zinc-900 rounded-xl border border-zinc-700 max-w-md w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-5">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

// === SIMPLE MARKDOWN PARSER ===
// Parses **bold** and *italic* text
const parseSimpleMarkdown = (text) => {
  if (!text) return text;

  const parts = [];
  let remaining = text;
  let key = 0;

  // Pattern to match **bold** or *italic*
  const pattern = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    // Add formatted text
    if (match[2]) {
      // Bold: **text**
      parts.push(<strong key={key++} className="font-semibold text-zinc-100">{match[2]}</strong>);
    } else if (match[3]) {
      // Italic: *text*
      parts.push(<em key={key++} className="italic">{match[3]}</em>);
    }

    lastIndex = pattern.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
};

// Build hotlink term lookup maps
const buildHotlinkTerms = () => {
  const terms = {};

  // Archetype names (0-21)
  Object.entries(ARCHETYPES).forEach(([id, arch]) => {
    terms[arch.name] = { type: 'card', id: parseInt(id) };
  });

  // Bound names (22-61)
  Object.entries(BOUNDS).forEach(([id, bound]) => {
    terms[bound.name] = { type: 'card', id: parseInt(id) };
  });

  // Agent names (62-77) - match full name and just the role portion
  Object.entries(AGENTS).forEach(([id, agent]) => {
    terms[agent.name] = { type: 'card', id: parseInt(id) };
  });

  // House names
  Object.keys(HOUSES).forEach(house => {
    terms[house] = { type: 'house', id: house };
  });

  // Channel names
  Object.keys(CHANNELS).forEach(channel => {
    terms[channel] = { type: 'channel', id: channel };
  });

  // Status terms
  terms['Balanced'] = { type: 'status', id: 1 };
  terms['Too Much'] = { type: 'status', id: 2 };
  terms['Too Little'] = { type: 'status', id: 3 };
  terms['Unacknowledged'] = { type: 'status', id: 4 };

  // Role names
  Object.keys(ROLES).forEach(role => {
    terms[role] = { type: 'role', id: role };
  });

  return terms;
};

const HOTLINK_TERMS = buildHotlinkTerms();

// Sort terms by length (longest first) to match "Too Much" before "Much"
const SORTED_TERM_KEYS = Object.keys(HOTLINK_TERMS).sort((a, b) => b.length - a.length);

// Create regex pattern for all terms (word boundaries, case insensitive for flexibility)
const HOTLINK_PATTERN = new RegExp(
  `\\b(${SORTED_TERM_KEYS.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
  'g'
);

// Render text with clickable hotlinks for invariant terms
// Returns JSX with ClickableTerm components for matched terms
const renderWithHotlinks = (text, setSelectedInfo) => {
  if (!text || !setSelectedInfo) return parseSimpleMarkdown(text);

  // Helper to create clickable term
  const ClickableTerm = ({ type, id, children }) => (
    <span
      className="cursor-pointer hover:underline decoration-dotted underline-offset-2 text-amber-300/90"
      onClick={(e) => {
        e.stopPropagation();
        let data = null;
        if (type === 'card') data = getComponent(id);
        else if (type === 'channel') data = CHANNELS[id];
        else if (type === 'status') data = STATUS_INFO[id];
        else if (type === 'house') data = HOUSES[id];
        else if (type === 'role') data = ROLES[id];
        setSelectedInfo({ type, id, data });
      }}
    >
      {children}
    </span>
  );

  const result = [];
  let key = 0;

  // First, handle markdown formatting, then add hotlinks to each segment
  const markdownParts = [];
  const markdownPattern = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
  let lastMarkdownIndex = 0;
  let markdownMatch;

  while ((markdownMatch = markdownPattern.exec(text)) !== null) {
    if (markdownMatch.index > lastMarkdownIndex) {
      markdownParts.push({ text: text.slice(lastMarkdownIndex, markdownMatch.index), format: null });
    }
    if (markdownMatch[2]) {
      markdownParts.push({ text: markdownMatch[2], format: 'bold' });
    } else if (markdownMatch[3]) {
      markdownParts.push({ text: markdownMatch[3], format: 'italic' });
    }
    lastMarkdownIndex = markdownPattern.lastIndex;
  }
  if (lastMarkdownIndex < text.length) {
    markdownParts.push({ text: text.slice(lastMarkdownIndex), format: null });
  }
  if (markdownParts.length === 0) {
    markdownParts.push({ text, format: null });
  }

  // Now process each markdown part for hotlinks
  markdownParts.forEach((part, partIndex) => {
    const partText = part.text;
    const hotlinkParts = [];
    let lastIndex = 0;
    let match;

    // Reset regex
    HOTLINK_PATTERN.lastIndex = 0;

    while ((match = HOTLINK_PATTERN.exec(partText)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        hotlinkParts.push({ text: partText.slice(lastIndex, match.index), isLink: false });
      }

      // Add the matched term as a link
      const termInfo = HOTLINK_TERMS[match[1]];
      if (termInfo) {
        hotlinkParts.push({ text: match[1], isLink: true, type: termInfo.type, id: termInfo.id });
      } else {
        hotlinkParts.push({ text: match[1], isLink: false });
      }

      lastIndex = HOTLINK_PATTERN.lastIndex;
    }

    // Add remaining text
    if (lastIndex < partText.length) {
      hotlinkParts.push({ text: partText.slice(lastIndex), isLink: false });
    }

    // If no hotlinks found, just use original text
    if (hotlinkParts.length === 0) {
      hotlinkParts.push({ text: partText, isLink: false });
    }

    // Build the JSX for this markdown part
    const partElements = hotlinkParts.map((hp, hpIndex) => {
      if (hp.isLink) {
        return <ClickableTerm key={`${partIndex}-${hpIndex}`} type={hp.type} id={hp.id}>{hp.text}</ClickableTerm>;
      }
      return hp.text;
    });

    // Wrap in formatting if needed
    if (part.format === 'bold') {
      result.push(<strong key={key++} className="font-semibold text-zinc-100">{partElements}</strong>);
    } else if (part.format === 'italic') {
      result.push(<em key={key++} className="italic">{partElements}</em>);
    } else {
      // For plain text, add elements directly (might be array or single element)
      partElements.forEach(el => result.push(el));
    }
  });

  return result.length > 0 ? result : text;
};

// === THREADED CARD COMPONENT ===
// Recursive component for nested thread cards with Reflect/Forge
const ThreadedCard = ({
  threadItem,
  threadIndex,
  cardIndex,
  parentThreadPath = '', // e.g., "0.1.2" for nested threads
  showTraditional,
  threadOperations,
  setThreadOperations,
  threadContexts,
  setThreadContexts,
  threadLoading,
  onContinueThread,
  collapsedThreads,
  setCollapsedThreads,
  setSelectedInfo, // for hotlink popups
}) => {
  const isReflect = threadItem.operation === 'reflect';
  // Both Reflect and Forge draw new cards
  const threadTrans = getComponent(threadItem.draw.transient);
  const threadStat = STATUSES[threadItem.draw.status];
  const threadStatusPrefix = threadStat.prefix || 'Balanced';
  const operationLabel = isReflect ? 'Reflecting' : 'Forging';

  // Unique key for this thread node
  const threadKey = parentThreadPath ? `${parentThreadPath}.${threadIndex}` : `${cardIndex}:${threadIndex}`;
  const isCollapsed = collapsedThreads?.[threadKey] === true;
  const selectedOp = threadOperations?.[threadKey] || null;
  const contextText = threadContexts?.[threadKey] || '';
  const isLoading = threadLoading?.[threadKey] || false;

  const toggleCollapse = (e) => {
    e.stopPropagation();
    setCollapsedThreads?.(prev => ({ ...prev, [threadKey]: !isCollapsed }));
  };

  const selectOperation = (op) => {
    setThreadOperations?.(prev => ({ ...prev, [threadKey]: op }));
  };

  const updateContext = (ctx) => {
    setThreadContexts?.(prev => ({ ...prev, [threadKey]: ctx }));
  };

  const handleContinue = () => {
    onContinueThread?.(cardIndex, threadKey, threadItem);
  };

  return (
    <div className="ml-4 border-l-2 border-zinc-700/50 pl-4">
      {/* Thread connector label with collapse toggle */}
      <div
        className={`text-xs mb-2 flex items-center gap-2 cursor-pointer ${isReflect ? 'text-sky-400' : 'text-orange-400'}`}
        onClick={toggleCollapse}
      >
        <span
          className={`transition-transform duration-200 ${isCollapsed ? 'text-red-500' : 'text-emerald-500'}`}
          style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', display: 'inline-block' }}
        >
          ▼
        </span>
        <span className="text-zinc-600">↳</span>
        <span>{operationLabel}{threadItem.context ? `: "${threadItem.context}"` : ''}</span>
      </div>

      {/* Nested card - collapsible */}
      {!isCollapsed && (
        <div className={`rounded-lg p-4 ${isReflect ? 'border border-sky-500/30 bg-sky-950/20' : 'border border-orange-500/30 bg-orange-950/20'}`}>
          {/* Card header - both Reflect and Forge draw new cards, with clickable terms */}
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`text-xs px-2 py-0.5 rounded-full cursor-pointer hover:ring-1 hover:ring-white/30 ${STATUS_COLORS[threadItem.draw.status]}`}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedInfo?.({ type: 'status', id: threadItem.draw.status, data: STATUS_INFO[threadItem.draw.status] });
              }}
            >
              {threadStat.name}
            </span>
            <span className="text-sm font-medium text-zinc-200">
              <span
                className="cursor-pointer hover:underline decoration-dotted underline-offset-2"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedInfo?.({ type: 'status', id: threadItem.draw.status, data: STATUS_INFO[threadItem.draw.status] });
                }}
              >
                {threadStatusPrefix}
              </span>
              {threadStatusPrefix && ' '}
              <span
                className="cursor-pointer hover:underline decoration-dotted underline-offset-2 text-amber-300/90"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedInfo?.({ type: 'card', id: threadItem.draw.transient, data: getComponent(threadItem.draw.transient) });
                }}
              >
                {threadTrans.name}
              </span>
            </span>
          </div>
          {showTraditional && (
            <div className="text-xs text-zinc-500 mb-2">{threadTrans.traditional}</div>
          )}

          {/* Interpretation with hotlinks */}
          <div className="text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap mb-4">
            {renderWithHotlinks(threadItem.interpretation, setSelectedInfo)}
          </div>

          {/* Nested Reflect/Forge buttons */}
          <div className="border-t border-zinc-700/30 pt-4">
            <div className="max-w-xs mx-auto">
              <div className="flex justify-center gap-3 mb-3">
                <button
                  onClick={(e) => { e.stopPropagation(); selectOperation('reflect'); }}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    selectedOp === 'reflect'
                      ? 'bg-sky-900/60 text-sky-300 border-2 border-sky-500/60'
                      : 'bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:text-zinc-200 hover:border-zinc-600'
                  }`}
                >
                  Reflect
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); selectOperation('forge'); }}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    selectedOp === 'forge'
                      ? 'bg-orange-900/60 text-orange-300 border-2 border-orange-500/60'
                      : 'bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:text-zinc-200 hover:border-zinc-600'
                  }`}
                >
                  Forge
                </button>
              </div>

              <textarea
                value={contextText}
                onChange={(e) => updateContext(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder="Add context (optional)..."
                rows={2}
                className="w-full bg-zinc-900/50 border border-zinc-700/50 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors mb-3 resize-none"
              />

              <button
                onClick={(e) => { e.stopPropagation(); handleContinue(); }}
                disabled={!selectedOp || isLoading}
                className={`w-full px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2 ${
                  selectedOp && !isLoading
                    ? 'bg-[#052e23] text-[#f59e0b] hover:bg-[#064e3b] border border-emerald-700/50'
                    : 'bg-zinc-900 text-zinc-600 cursor-not-allowed'
                }`}
              >
                {isLoading ? (
                  <>
                    <span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></span>
                    Drawing...
                  </>
                ) : (
                  'Continue'
                )}
              </button>
            </div>
          </div>

          {/* Recursive nested threads */}
          {threadItem.children && threadItem.children.length > 0 && (
            <div className="mt-4 space-y-3">
              {threadItem.children.map((childItem, childIndex) => (
                <ThreadedCard
                  key={childIndex}
                  threadItem={childItem}
                  threadIndex={childIndex}
                  cardIndex={cardIndex}
                  parentThreadPath={threadKey}
                  showTraditional={showTraditional}
                  threadOperations={threadOperations}
                  setThreadOperations={setThreadOperations}
                  threadContexts={threadContexts}
                  setThreadContexts={setThreadContexts}
                  threadLoading={threadLoading}
                  onContinueThread={onContinueThread}
                  collapsedThreads={collapsedThreads}
                  setCollapsedThreads={setCollapsedThreads}
                  setSelectedInfo={setSelectedInfo}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// === READING SECTION COMPONENT ===
const ReadingSection = ({
  type, // 'summary' | 'card' | 'letter'
  index, // card index (for card)
  content,
  draw, // the draw object (for card context)
  question, // the querent's question
  expansions,
  expanding,
  onExpand,
  showTraditional,
  spreadType,
  spreadKey,
  setSelectedInfo,
  onHeaderClick, // callback when header is clicked (for scroll navigation)
  correction, // nested correction object { content, cardIndex }
  isCollapsed, // whether section content is collapsed
  onToggleCollapse, // callback to toggle collapse
  isCorrectionCollapsed, // whether nested correction is collapsed
  onToggleCorrectionCollapse, // callback to toggle correction collapse
  // Thread props (Phase 2)
  threadData, // array of thread items for this card
  selectedOperation, // 'reflect' | 'forge' | null
  onOperationSelect, // callback to select operation
  operationContext, // context text for operation
  onContextChange, // callback for context change
  onContinue, // callback for Continue button
  threadLoading, // loading state for thread
  // Nested thread props (Phase 2 polish)
  threadOperations, // full map of thread operations
  setThreadOperations, // setter for thread operations
  threadContexts, // full map of thread contexts
  setThreadContexts, // setter for thread contexts
  threadLoadingMap, // full map of thread loading states
  onContinueThread, // callback for continuing any thread
  collapsedThreads, // map of collapsed thread states
  setCollapsedThreads, // setter for collapsed threads
}) => {
  const trans = draw ? getComponent(draw.transient) : null;
  const stat = draw ? STATUSES[draw.status] : null;
  const isDurable = spreadType === 'durable';
  const spreadConfig = isDurable ? DURABLE_SPREADS[spreadKey] : null;
  
  // Get position/frame label
  const posLabel = draw ? (isDurable 
    ? spreadConfig?.frames[index]?.name 
    : (draw.position !== null ? ARCHETYPES[draw.position]?.name : `Position ${index + 1}`)) : null;
  
  // Get house for coloring (for card/correction sections)
  const house = draw ? (isDurable 
    ? spreadConfig?.frames[index]?.house 
    : (draw.position !== null ? ARCHETYPES[draw.position]?.house : 'Gestalt')) : null;
  
  const houseColors = house ? HOUSE_COLORS[house] : null;
  
  // Helper to make terms clickable
  const ClickableTerm = ({ type: termType, id: termId, children, className = "" }) => (
    <span 
      className={`cursor-pointer hover:underline decoration-dotted underline-offset-2 ${className}`}
      onClick={(e) => {
        e.stopPropagation();
        let data = null;
        if (termType === 'card') data = getComponent(termId);
        else if (termType === 'channel') data = CHANNELS[termId];
        else if (termType === 'status') data = STATUS_INFO[termId];
        else if (termType === 'house') data = HOUSES[termId];
        setSelectedInfo({ type: termType, id: termId, data });
      }}
    >
      {children}
    </span>
  );
  
  // Build section label with clickable terms
  const renderLabel = () => {
    if (type === 'summary') {
      return <span className="text-amber-300 font-medium">Overview</span>;
    } else if (type === 'card') {
      const statusPrefix = stat?.prefix || 'Balanced';
      return (
        <span className={houseColors?.text || 'text-zinc-300'}>
          <ClickableTerm type="status" id={draw.status} className={STATUS_COLORS[draw.status]?.split(' ')[0]}>
            {statusPrefix}
          </ClickableTerm>
          {' '}
          <ClickableTerm type="card" id={draw.transient}>{trans?.name}</ClickableTerm>
          {' in your '}
          <ClickableTerm type={isDurable ? "house" : "card"} id={isDurable ? house : draw.position}>
            {posLabel}
          </ClickableTerm>
        </span>
      );
    } else if (type === 'letter') {
      return <span className="text-zinc-400 italic">A Note for You</span>;
    }
    return null;
  };
  
  const sectionKey = type === 'summary' ? 'summary' : type === 'letter' ? 'letter' : `${type}:${index}`;
  const sectionExpansions = expansions[sectionKey] || {};
  const isExpanding = expanding?.section === sectionKey;
  
  // Determine section styling based on type
  const getSectionStyle = () => {
    if (type === 'summary') {
      return 'bg-gradient-to-br from-amber-950/40 to-amber-900/20 border-amber-500/50';
    } else if (type === 'letter') {
      return 'bg-violet-950/30 border-violet-500/50';
    } else if (houseColors) {
      return `${houseColors.bg} ${houseColors.border}`;
    }
    return 'bg-zinc-900/50 border-zinc-800/50';
  };
  
  const getBadgeStyle = () => {
    if (type === 'summary') return 'bg-amber-500/30 text-amber-300';
    if (type === 'letter') return 'bg-violet-500/30 text-violet-300';
    if (houseColors) return `${houseColors.bg} ${houseColors.text}`;
    return 'bg-zinc-800 text-zinc-400';
  };
  
  const getContentStyle = () => {
    if (type === 'letter') return 'text-violet-200/90 italic';
    if (type === 'summary') return 'text-amber-100/90';
    return 'text-zinc-300';
  };
  
  const getButtonStyle = (hasExpansion, isThisExpanding, isExpandingOther) => {
    return `text-xs px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
      hasExpansion 
        ? 'bg-zinc-700 text-zinc-200 border border-zinc-600' 
        : 'bg-zinc-800/50 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
    } ${isExpandingOther ? 'opacity-50 cursor-not-allowed' : ''}`;
  };
  
  // Determine if this section is collapsible
  const isCollapsible = onToggleCollapse !== undefined;

  return (
    <div className={`rounded-xl border-2 p-4 mb-4 ${getSectionStyle()}`}>
      {/* Section Header */}
      <div
        className={`flex flex-col gap-1 ${!isCollapsed ? 'mb-3' : ''} ${isCollapsible ? 'cursor-pointer group' : ''}`}
        onClick={isCollapsible ? onToggleCollapse : undefined}
      >
        <div className="flex items-center gap-2">
          {/* Collapse chevron */}
          {isCollapsible && (
            <span className={`text-xs transition-transform duration-200 ${isCollapsed ? 'text-red-500' : 'text-emerald-500'}`} style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>
              ▼
            </span>
          )}
          <span className={`text-xs px-2 py-0.5 rounded-full ${getBadgeStyle()}`}>
            {type === 'summary' ? 'Overview' : type === 'card' ? 'Reading' : 'Letter'}
          </span>
          <span className="text-sm font-medium">{renderLabel()}</span>
          {type === 'card' && onHeaderClick && (
            <span
              className="text-zinc-600 text-xs opacity-0 group-hover:opacity-100 transition-opacity ml-auto cursor-pointer hover:text-zinc-400"
              onClick={(e) => {
                e.stopPropagation();
                onHeaderClick();
              }}
            >↑ view card</span>
          )}
        </div>
        {type === 'card' && showTraditional && trans?.traditional && !isCollapsed && (
          <span className="text-xs text-zinc-500 ml-6">{trans.traditional}</span>
        )}
      </div>

      {/* Main Content - collapsible */}
      {!isCollapsed && (
        <div className={`leading-relaxed text-sm mb-4 whitespace-pre-wrap ${getContentStyle()}`}>
          {content}
        </div>
      )}
      
      {/* Expansion Buttons - only when not collapsed */}
      {!isCollapsed && (
        <div className="flex gap-2 flex-wrap">
          {Object.entries(EXPANSION_PROMPTS).map(([key, { label }]) => {
            const isThisExpanding = isExpanding && expanding?.type === key;
            const hasExpansion = !!sectionExpansions[key];
            const isExpandingOther = isExpanding && !isThisExpanding;

            return (
              <button
                key={key}
                onClick={(e) => { e.stopPropagation(); onExpand(sectionKey, key); }}
                disabled={isExpanding}
                className={getButtonStyle(hasExpansion, isThisExpanding, isExpandingOther)}
              >
                {isThisExpanding && (
                  <span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></span>
                )}
                {label}
              </button>
            );
          })}
        </div>
      )}

      {/* Reflect/Forge Operations for Overview and Letter sections - own row, centered */}
      {(type === 'summary' || type === 'letter') && onOperationSelect && !isCollapsed && (
        <div className="border-t border-zinc-700/50 mt-5 pt-5">
          {/* Collapsed state: show [▶ Reflect] [▶ Forge] on one line */}
          {!selectedOperation && (
            <div className="flex justify-center gap-3">
              <button
                onClick={(e) => { e.stopPropagation(); onOperationSelect('reflect'); }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:text-zinc-200 hover:border-zinc-600 flex items-center gap-1.5"
              >
                <span className="text-[10px] text-red-500">▶</span> Reflect
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onOperationSelect('forge'); }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:text-zinc-200 hover:border-zinc-600 flex items-center gap-1.5"
              >
                <span className="text-[10px] text-red-500">▶</span> Forge
              </button>
            </div>
          )}

          {/* Expanded state: show full panel with selected operation */}
          {selectedOperation && (
            <div className="max-w-xs mx-auto">
              <div className="flex justify-center gap-4 mb-4">
                <button
                  onClick={(e) => { e.stopPropagation(); onOperationSelect('reflect'); }}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    selectedOperation === 'reflect'
                      ? 'bg-sky-900/60 text-sky-300 border-2 border-sky-500/60'
                      : 'bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:text-zinc-200 hover:border-zinc-600'
                  }`}
                >
                  Reflect
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onOperationSelect('forge'); }}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    selectedOperation === 'forge'
                      ? 'bg-orange-900/60 text-orange-300 border-2 border-orange-500/60'
                      : 'bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:text-zinc-200 hover:border-zinc-600'
                  }`}
                >
                  Forge
                </button>
              </div>

              {/* Context Input */}
              <div className="mb-4">
                <textarea
                  value={operationContext || ''}
                  onChange={(e) => onContextChange(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Add context (optional)..."
                  rows={2}
                  className="w-full bg-zinc-900/50 border border-zinc-700/50 rounded-lg px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors resize-none"
                />
              </div>

              {/* Continue Button */}
              <div className="flex justify-center">
                <button
                  onClick={(e) => { e.stopPropagation(); onContinue(); }}
                  disabled={!selectedOperation || threadLoading}
                  className={`w-full px-6 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    selectedOperation && !threadLoading
                      ? 'bg-[#052e23] text-[#f59e0b] hover:bg-[#064e3b] border border-emerald-700/50'
                      : 'bg-zinc-900 text-zinc-600 cursor-not-allowed'
                  }`}
                >
                  {threadLoading ? (
                    <>
                      <span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></span>
                      Drawing...
                    </>
                  ) : (
                    'Continue'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Thread Results for Summary/Letter */}
          {threadData && threadData.length > 0 && (
            <div className="mt-5 space-y-4">
              {threadData.map((threadItem, threadIndex) => {
                const isReflect = threadItem.operation === 'reflect';
                // Both Reflect and Forge draw new cards
                const trans = getComponent(threadItem.draw.transient);
                const stat = STATUSES[threadItem.draw.status];
                const statusPrefix = stat.prefix || 'Balanced';
                return (
                  <div key={threadIndex} className={`rounded-lg p-4 ${isReflect ? 'border border-sky-500/30 bg-sky-950/20' : 'border border-orange-500/30 bg-orange-950/20'}`}>
                    {/* Header with operation type and user's input */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${isReflect ? 'bg-sky-500/20 text-sky-400' : 'bg-orange-500/20 text-orange-400'}`}>
                        {isReflect ? '↩ Reflect' : '⚡ Forge'}
                      </span>
                    </div>
                    {/* User's input quote */}
                    {threadItem.context && (
                      <div className={`text-xs italic mb-3 pl-3 border-l-2 ${isReflect ? 'border-sky-500/50 text-sky-300/70' : 'border-orange-500/50 text-orange-300/70'}`}>
                        "{threadItem.context}"
                      </div>
                    )}
                    {/* Card info - both Reflect and Forge draw cards, with clickable terms */}
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full cursor-pointer hover:ring-1 hover:ring-white/30 ${STATUS_COLORS[threadItem.draw.status]}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedInfo?.({ type: 'status', id: threadItem.draw.status, data: STATUS_INFO[threadItem.draw.status] });
                        }}
                      >
                        {stat.name}
                      </span>
                      <span className="text-sm font-medium text-zinc-200">
                        <span
                          className="cursor-pointer hover:underline decoration-dotted underline-offset-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedInfo?.({ type: 'status', id: threadItem.draw.status, data: STATUS_INFO[threadItem.draw.status] });
                          }}
                        >
                          {statusPrefix}
                        </span>
                        {statusPrefix && ' '}
                        <span
                          className="cursor-pointer hover:underline decoration-dotted underline-offset-2 text-amber-300/90"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedInfo?.({ type: 'card', id: threadItem.draw.transient, data: getComponent(threadItem.draw.transient) });
                          }}
                        >
                          {trans.name}
                        </span>
                      </span>
                    </div>
                    {showTraditional && trans && (
                      <div className="text-xs text-zinc-500 mb-2">{trans.traditional}</div>
                    )}
                    {/* Response with hotlinks */}
                    <div className="text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap">
                      {renderWithHotlinks(threadItem.interpretation, setSelectedInfo)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Expansion Content - only when not collapsed */}
      {!isCollapsed && Object.entries(sectionExpansions).map(([expType, expContent]) => (
        <div key={expType} className="mt-4 pt-4 border-t border-zinc-700/50">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs uppercase tracking-wider text-zinc-500">
              {EXPANSION_PROMPTS[expType]?.label}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onExpand(sectionKey, expType, true); }}
              className="text-xs text-zinc-600 hover:text-zinc-400"
            >
              ×
            </button>
          </div>
          <div className="text-sm leading-relaxed whitespace-pre-wrap text-zinc-400">
            {expContent}
          </div>
        </div>
      ))}

      {/* Nested Rebalancer (Correction) - only for card sections with corrections, and only when card is not collapsed */}
      {!isCollapsed && type === 'card' && correction && (() => {
        const fullCorr = getFullCorrection(draw.transient, draw.status);
        const corrText = getCorrectionText(fullCorr, trans, draw.status);
        const corrTargetId = getCorrectionTargetId(fullCorr, trans);
        const corrSectionKey = `correction:${index}`;
        const corrExpansions = expansions[corrSectionKey] || {};
        const isCorrExpanding = expanding?.section === corrSectionKey;
        const isCorrCollapsible = onToggleCorrectionCollapse !== undefined;

        return (
          <div className="mt-4 ml-4 rounded-lg border-2 border-emerald-500/50 bg-emerald-950/30 p-4">
            {/* Rebalancer Header - clickable for collapse */}
            <div
              className={`flex items-center gap-2 ${!isCorrectionCollapsed ? 'mb-3' : ''} ${isCorrCollapsible ? 'cursor-pointer' : ''}`}
              onClick={isCorrCollapsible ? (e) => { e.stopPropagation(); onToggleCorrectionCollapse(); } : undefined}
            >
              {/* Collapse chevron */}
              {isCorrCollapsible && (
                <span className={`text-xs transition-transform duration-200 ${isCorrectionCollapsed ? 'text-red-500' : 'text-emerald-500'}`} style={{ transform: isCorrectionCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>
                  ▼
                </span>
              )}
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300">
                Rebalancer
              </span>
              <span className="text-sm font-medium text-emerald-400">
                <span
                  className="cursor-pointer hover:underline decoration-dotted underline-offset-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedInfo({ type: 'card', id: draw.transient, data: trans });
                  }}
                >
                  {trans?.name}
                </span>
                {' → '}
                {corrTargetId !== null ? (
                  <span
                    className="cursor-pointer hover:underline decoration-dotted underline-offset-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      const corrComponent = getComponent(corrTargetId);
                      setSelectedInfo({ type: 'card', id: corrTargetId, data: corrComponent });
                    }}
                  >
                    {corrText}
                  </span>
                ) : corrText}
              </span>
            </div>

            {/* Rebalancer Content - collapsible */}
            {!isCorrectionCollapsed && (
              <div className="leading-relaxed text-sm mb-4 whitespace-pre-wrap text-emerald-100/90">
                {correction.content}
              </div>
            )}

            {/* Rebalancer Expansion Buttons - only when not collapsed */}
            {!isCorrectionCollapsed && (
              <div className="flex gap-2 flex-wrap">
                {Object.entries(EXPANSION_PROMPTS).map(([key, { label }]) => {
                  const isThisExpanding = isCorrExpanding && expanding?.type === key;
                  const hasExpansion = !!corrExpansions[key];
                  const isExpandingOther = expanding && !isThisExpanding;

                  return (
                    <button
                      key={key}
                      onClick={(e) => { e.stopPropagation(); onExpand(corrSectionKey, key); }}
                      disabled={expanding}
                      className={`text-xs px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                        hasExpansion
                          ? 'bg-zinc-700 text-zinc-200 border border-zinc-600'
                          : 'bg-zinc-800/50 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                      } ${isExpandingOther ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isThisExpanding && (
                        <span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></span>
                      )}
                      {label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Rebalancer Expansion Content - only when not collapsed */}
            {!isCorrectionCollapsed && Object.entries(corrExpansions).map(([expType, expContent]) => (
              <div key={expType} className="mt-4 pt-4 border-t border-emerald-700/50">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs uppercase tracking-wider text-zinc-500">
                    {EXPANSION_PROMPTS[expType]?.label}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); onExpand(corrSectionKey, expType, true); }}
                    className="text-xs text-zinc-600 hover:text-zinc-400"
                  >
                    ×
                  </button>
                </div>
                <div className="text-sm leading-relaxed whitespace-pre-wrap text-zinc-400">
                  {expContent}
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Reflect/Forge Operations - Phase 2 (only for card sections, not collapsed) */}
      {!isCollapsed && type === 'card' && onOperationSelect && (
        <>
          {/* Separator */}
          <div className="border-t border-zinc-700/50 mt-5 pt-5">
            {/* Collapsed state: show [▶ Reflect] [▶ Forge] on one line */}
            {!selectedOperation && (
              <div className="flex justify-center gap-3">
                <button
                  onClick={(e) => { e.stopPropagation(); onOperationSelect('reflect'); }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:text-zinc-200 hover:border-zinc-600 flex items-center gap-1.5"
                >
                  <span className="text-[10px]">▶</span> Reflect
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onOperationSelect('forge'); }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:text-zinc-200 hover:border-zinc-600 flex items-center gap-1.5"
                >
                  <span className="text-[10px]">▶</span> Forge
                </button>
              </div>
            )}

            {/* Expanded state: show full panel with selected operation */}
            {selectedOperation && (
              <div className="max-w-xs mx-auto">
                <div className="flex justify-center gap-4 mb-4">
                  <button
                    onClick={(e) => { e.stopPropagation(); onOperationSelect('reflect'); }}
                    className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      selectedOperation === 'reflect'
                        ? 'bg-sky-900/60 text-sky-300 border-2 border-sky-500/60'
                        : 'bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:text-zinc-200 hover:border-zinc-600'
                    }`}
                  >
                    Reflect
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onOperationSelect('forge'); }}
                    className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      selectedOperation === 'forge'
                        ? 'bg-orange-900/60 text-orange-300 border-2 border-orange-500/60'
                        : 'bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:text-zinc-200 hover:border-zinc-600'
                    }`}
                  >
                    Forge
                  </button>
                </div>

                {/* Context Input */}
                <div className="mb-4">
                  <textarea
                    value={operationContext || ''}
                    onChange={(e) => onContextChange(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="Add context (optional)..."
                    rows={2}
                    className="w-full bg-zinc-900/50 border border-zinc-700/50 rounded-lg px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors resize-none"
                  />
                </div>

                {/* Continue Button */}
                <div className="flex justify-center">
                  <button
                    onClick={(e) => { e.stopPropagation(); onContinue(); }}
                    disabled={!selectedOperation || threadLoading}
                    className={`w-full px-6 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                      selectedOperation && !threadLoading
                        ? 'bg-[#052e23] text-[#f59e0b] hover:bg-[#064e3b] border border-emerald-700/50'
                        : 'bg-zinc-900 text-zinc-600 cursor-not-allowed'
                    }`}
                  >
                    {threadLoading ? (
                      <>
                        <span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></span>
                        Drawing...
                      </>
                    ) : (
                      'Continue'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Threaded Cards with recursive Reflect/Forge */}
          {threadData && threadData.length > 0 && (
            <div className="mt-5 space-y-4">
              {threadData.map((threadItem, threadIndex) => (
                <ThreadedCard
                  key={threadIndex}
                  threadItem={threadItem}
                  threadIndex={threadIndex}
                  cardIndex={index}
                  showTraditional={showTraditional}
                  threadOperations={threadOperations}
                  setThreadOperations={setThreadOperations}
                  threadContexts={threadContexts}
                  setThreadContexts={setThreadContexts}
                  threadLoading={threadLoadingMap}
                  onContinueThread={onContinueThread}
                  collapsedThreads={collapsedThreads}
                  setCollapsedThreads={setCollapsedThreads}
                  setSelectedInfo={setSelectedInfo}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

// === STANCE SELECTOR COMPONENT ===
const StanceSelector = ({ stance, setStance, showCustomize, setShowCustomize, compact = false, onReinterpret = null, gridOnly = false }) => {
  const [showStanceHelp, setShowStanceHelp] = useState(false);

  const applyPreset = (presetKey) => {
    const preset = STANCE_PRESETS[presetKey];
    setStance({
      ...stance, // Preserve complexity
      voice: preset.voice,
      focus: preset.focus,
      density: preset.density,
      scope: preset.scope
    });
  };
  
  const currentPreset = Object.entries(STANCE_PRESETS).find(([_, p]) =>
    p.voice === stance.voice && p.focus === stance.focus &&
    p.density === stance.density && p.scope === stance.scope
  );
  
  const DimensionRow = ({ label, dimension, options }) => (
    <div className="mb-2 sm:mb-2">
      <div className="grid grid-cols-[3rem_1fr_1fr_1fr_1fr] sm:grid-cols-[4rem_6rem_6rem_6rem_6rem] gap-1 sm:gap-2 items-center">
        <span className="text-[11px] sm:text-xs text-amber-600/80 font-medium">{label}</span>
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => setStance({ ...stance, [dimension]: opt })}
            className={`py-2 sm:py-1.5 px-1 sm:px-0 rounded-sm text-[11px] sm:text-xs transition-all text-center min-h-[36px] sm:min-h-0 ${
              stance[dimension] === opt
                ? 'bg-zinc-700 text-white border border-zinc-500'
                : 'bg-zinc-900/50 text-zinc-300 hover:text-white hover:bg-zinc-800 active:bg-zinc-700'
            }`}
          >
            {opt.charAt(0).toUpperCase() + opt.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
  
  // Stance dimension descriptions for display
  const DIMENSION_DESCRIPTIONS = {
    voice: { wonder: "Open & curious", warm: "Caring & relational", direct: "Precise & clear", grounded: "Solid & practical" },
    focus: { do: "Action-oriented", feel: "Emotionally attuned", see: "Insight-focused", build: "Structure-focused" },
    density: { luminous: "Layered & evocative", rich: "Full & expansive", clear: "Accessible & flowing", essential: "Minimal & bare" },
    scope: { resonant: "Widest patterns", patterned: "Recurring dynamics", connected: "Relational web", here: "Immediate focus" }
  };
  
  const getCurrentDescription = () => {
    return `${DIMENSION_DESCRIPTIONS.voice[stance.voice]} • ${DIMENSION_DESCRIPTIONS.focus[stance.focus]} • ${DIMENSION_DESCRIPTIONS.density[stance.density]} • ${DIMENSION_DESCRIPTIONS.scope[stance.scope]}`;
  };
  
  // Grid-only mode for landing page fine-tune (just the 4x4 grid)
  if (gridOnly) {
    return (
      <div className="space-y-2 max-w-xl mx-auto">
        <DimensionRow label="Voice" dimension="voice" options={['wonder', 'warm', 'direct', 'grounded']} />
        <DimensionRow label="Focus" dimension="focus" options={['do', 'feel', 'see', 'build']} />
        <DimensionRow label="Density" dimension="density" options={['luminous', 'rich', 'clear', 'essential']} />
        <DimensionRow label="Scope" dimension="scope" options={['resonant', 'patterned', 'connected', 'here']} />
      </div>
    );
  }

  // Compact mode for mid-reading stance changes
  if (compact) {
    return (
      <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50 mb-4 max-w-2xl mx-auto">
        {/* Current stance display */}
        <div className="mb-4 pb-3 border-b border-zinc-800/50 max-w-xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-300 font-medium">
              {currentPreset ? currentPreset[1].name : "Custom Stance"}
            </span>
            <div className="flex gap-2">
              {onReinterpret && (
                <button
                  onClick={onReinterpret}
                  className="text-xs px-3 py-1.5 rounded-lg bg-amber-900/50 text-amber-400 hover:bg-amber-900/70 transition-all font-medium"
                >
                  Re-interpret ↻
                </button>
              )}
            </div>
          </div>
          <p className="text-xs text-zinc-500">{getCurrentDescription()}</p>
        </div>

        {/* Inline dimension controls */}
        <div className="space-y-2 max-w-xl mx-auto">
          <DimensionRow label="Voice" dimension="voice" options={['wonder', 'warm', 'direct', 'grounded']} />
          <DimensionRow label="Focus" dimension="focus" options={['do', 'feel', 'see', 'build']} />
          <DimensionRow label="Density" dimension="density" options={['luminous', 'rich', 'clear', 'essential']} />
          <DimensionRow label="Scope" dimension="scope" options={['resonant', 'patterned', 'connected', 'here']} />
        </div>
      </div>
    );
  }
  
  // Full mode for pre-reading selection
  return (
    <div className="mb-6 relative">
      {/* Header with help */}
      <div className="flex items-center justify-center gap-2 mb-3">
        <span className="text-zinc-500 text-xs tracking-wide">How should this land?</span>
        <button
          onClick={() => setShowStanceHelp(!showStanceHelp)}
          className="w-4 h-4 rounded-full bg-[#f59e0b]/20 border border-[#f59e0b]/50 text-[#f59e0b] hover:bg-[#f59e0b]/30 hover:text-[#f59e0b] text-[10px] flex items-center justify-center transition-all"
        >
          ?
        </button>
      </div>

      {showStanceHelp && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 w-72 sm:w-80">
          <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 shadow-xl">
            <p className="text-zinc-400 text-xs leading-relaxed">
              Stance shapes the voice and depth of your reading — from quick and direct to layered and contemplative. The structure stays the same; the delivery adapts to you.
            </p>
            <button
              onClick={() => setShowStanceHelp(false)}
              className="mt-3 text-xs text-zinc-500 hover:text-zinc-300 w-full text-center"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Preset selector */}
      <div className="flex gap-2 mb-3 justify-center flex-wrap">
        {Object.entries(STANCE_PRESETS).map(([key, preset]) => (
          <button
            key={key}
            onClick={() => applyPreset(key)}
            title={preset.description}
            className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
              currentPreset?.[0] === key
                ? 'bg-zinc-700 text-zinc-100 border border-zinc-500'
                : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
            }`}
          >
            {preset.name}
          </button>
        ))}
      </div>
      
      {/* Customize toggle */}
      <div className="flex justify-center mb-3">
        <button
          onClick={() => setShowCustomize(!showCustomize)}
          className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          {showCustomize ? '▾ Hide customization' : '▸ Customize delivery'}
        </button>
      </div>
      
      {/* Custom sliders */}
      {showCustomize && (
        <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50 max-w-xl mx-auto">
          <DimensionRow label="Voice" dimension="voice" options={['wonder', 'warm', 'direct', 'grounded']} />
          <DimensionRow label="Focus" dimension="focus" options={['do', 'feel', 'see', 'build']} />
          <DimensionRow label="Density" dimension="density" options={['luminous', 'rich', 'clear', 'essential']} />
          <DimensionRow label="Scope" dimension="scope" options={['resonant', 'patterned', 'connected', 'here']} />

          {!currentPreset && (
            <p className="text-xs text-zinc-600 mt-3 text-center">Custom stance</p>
          )}
        </div>
      )}
    </div>
  );
};

// === INTRO COMPONENT ===
const IntroSection = () => (
  <div className="mb-6 text-center">
    <div className="max-w-2xl mx-auto">
      <p className="text-zinc-400 text-sm leading-relaxed">
        The Nirmanakaya is both mirror and forge. Bring a question or declare an intention —
        the draw finds what's ready to be seen. Where you are, what's moving, what might need attention.
      </p>
    </div>
  </div>
);

// === MAIN COMPONENT ===
export default function NirmanakaReader() {
  const [question, setQuestion] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [spreadType, setSpreadType] = useState('random');
  const [spreadKey, setSpreadKey] = useState('three');
  const [stance, setStance] = useState({ complexity: 'guide', seriousness: 'earnest', voice: 'warm', focus: 'feel', density: 'clear', scope: 'connected' }); // Default: Kind
  const [showCustomize, setShowCustomize] = useState(false);
  const [draws, setDraws] = useState(null);
  const [parsedReading, setParsedReading] = useState(null);
  const [expansions, setExpansions] = useState({}); // {sectionKey: {unpack: '...', clarify: '...'}}
  const [expanding, setExpanding] = useState(null); // {section: 'card:1', type: 'unpack'}
  const [collapsedSections, setCollapsedSections] = useState({}); // {sectionKey: true/false} - tracks collapsed state

  // Toggle collapse state for a section
  // defaultCollapsed: true for sections that start collapsed, false for sections that start expanded
  const toggleCollapse = (sectionKey, defaultCollapsed = true) => {
    setCollapsedSections(prev => {
      // Determine current visual state based on the section's default
      const isCurrentlyCollapsed = defaultCollapsed
        ? prev[sectionKey] !== false  // default collapsed: undefined or true = collapsed
        : prev[sectionKey] === true;  // default expanded: only true = collapsed
      // Toggle to the opposite visual state
      return { ...prev, [sectionKey]: !isCurrentlyCollapsed };
    });
  };
  const [followUpMessages, setFollowUpMessages] = useState([]); // For general follow-ups after the reading
  const [followUpLoading, setFollowUpLoading] = useState(false); // Separate loading state for follow-ups
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showTraditional, setShowTraditional] = useState(false);
  const [showArchitecture, setShowArchitecture] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [isSharedReading, setIsSharedReading] = useState(false);
  const [selectedInfo, setSelectedInfo] = useState(null); // {type: 'card'|'channel'|'status'|'house', id: ..., data: ...}
  const [showMidReadingStance, setShowMidReadingStance] = useState(false);
  const [showFineTune, setShowFineTune] = useState(false);
  const [helpPopover, setHelpPopover] = useState(null); // 'dynamicLens' | 'fixedLayout' | 'stance' | null
  const [loadingPhrases, setLoadingPhrases] = useState([]);
  const [loadingPhraseIndex, setLoadingPhraseIndex] = useState(0);
  const [loadingPhraseVisible, setLoadingPhraseVisible] = useState(true);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [sparkPlaceholder, setSparkPlaceholder] = useState('');
  const [showLandingFineTune, setShowLandingFineTune] = useState(false);

  // Thread state for Reflect/Forge operations (Phase 2)
  const [threadData, setThreadData] = useState({}); // {cardIndex: [{draw, interpretation, operation, context, children}, ...]}
  const [threadOperations, setThreadOperations] = useState({}); // {key: 'reflect' | 'forge' | null} - key can be cardIndex or threadPath
  const [threadContexts, setThreadContexts] = useState({}); // {key: 'context text'}
  const [threadLoading, setThreadLoading] = useState({}); // {key: true/false}
  const [collapsedThreads, setCollapsedThreads] = useState({}); // {threadKey: true/false}

  const messagesEndRef = useRef(null);
  const hasAutoInterpreted = useRef(false);

  // Re-interpret with current stance (same draws)
  const reinterpret = async () => {
    if (!draws) return;
    await performReadingWithDraws(draws, question);
  };

  // Load preferences from localStorage on init (URL params override)
  useEffect(() => {
    // First, load saved preferences from localStorage
    try {
      const saved = localStorage.getItem('nirmanakaya_prefs');
      if (saved) {
        const prefs = JSON.parse(saved);
        if (prefs.spreadType) setSpreadType(prefs.spreadType);
        if (prefs.spreadKey) setSpreadKey(prefs.spreadKey);
        if (prefs.stance) {
          // Ensure seriousness has a default if loading old prefs
          const loadedStance = { ...prefs.stance };
          if (!loadedStance.seriousness) loadedStance.seriousness = 'balanced';
          setStance(loadedStance);
        }
      }
    } catch (e) {
      console.warn('Failed to load preferences:', e);
    }

    // Then, check for URL params (these override localStorage)
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('r');
    if (encoded && !hasAutoInterpreted.current) {
      const decoded = decodeDraws(encoded);
      if (decoded) {
        setDraws(decoded.draws);
        setSpreadType(decoded.spreadType);
        setSpreadKey(decoded.spreadKey);
        setStance(decoded.stance);
        if (decoded.question) {
          setQuestion(decoded.question);
          setIsSharedReading(true);
        }
      }
    }
  }, []);

  // Auto-save preferences to localStorage whenever they change
  useEffect(() => {
    const prefs = {
      spreadType,
      spreadKey,
      stance
    };
    try {
      localStorage.setItem('nirmanakaya_prefs', JSON.stringify(prefs));
    } catch (e) {
      console.warn('Failed to save preferences:', e);
    }
  }, [spreadType, spreadKey, stance]);

  useEffect(() => {
    if (isSharedReading && draws && question && !hasAutoInterpreted.current) {
      hasAutoInterpreted.current = true;
      performReadingWithDraws(draws);
    }
  }, [isSharedReading, draws, question]);

  // Only scroll on new follow-up messages, NOT on initial reading load
  const prevFollowUpCount = useRef(0);
  useEffect(() => {
    if (followUpMessages.length > prevFollowUpCount.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevFollowUpCount.current = followUpMessages.length;
  }, [followUpMessages]);

  useEffect(() => {
    if (draws && question) {
      const encoded = encodeDraws(draws, spreadType, spreadKey, stance, question);
      setShareUrl(`${window.location.origin}${window.location.pathname}?r=${encoded}`);
    }
  }, [draws, spreadType, spreadKey, stance, question]);

  // Select random loading phrases when loading starts, cycle through only those 3
  useEffect(() => {
    if (!loading) return;

    // Pick 3 random unique phrases when loading starts
    const shuffled = [...LOADING_PHRASES].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 3);
    setLoadingPhrases(selected);
    setLoadingPhraseIndex(0);
    setLoadingPhraseVisible(true);

    // Cycle through the 3 selected phrases
    const fadeInterval = setInterval(() => {
      setLoadingPhraseVisible(false);
      setTimeout(() => {
        setLoadingPhraseIndex(prev => (prev + 1) % 3);
        setLoadingPhraseVisible(true);
      }, 300);
    }, 5000);
    return () => clearInterval(fadeInterval);
  }, [loading]);

  // Suggestion pills - random rotation every 8 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setSuggestionIndex(Math.floor(Math.random() * SUGGESTIONS.length));
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Warn before leaving if there's a reading
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (draws && parsedReading) {
        e.preventDefault();
        e.returnValue = "You'll lose your reading if you leave. Are you sure?";
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [draws, parsedReading]);

  // Spark: show random suggestion as placeholder
  const handleSpark = () => {
    const randomSuggestion = SUGGESTIONS[Math.floor(Math.random() * SUGGESTIONS.length)];
    setSparkPlaceholder(randomSuggestion);
  };

  const copyShareUrl = async () => {
    try { await navigator.clipboard.writeText(shareUrl); alert('Link copied!'); }
    catch { prompt('Copy this link:', shareUrl); }
  };

  const performReadingWithDraws = async (drawsToUse, questionToUse = question) => {
    setLoading(true); setError(''); setParsedReading(null); setExpansions({}); setFollowUpMessages([]);
    const drawText = formatDrawForAI(drawsToUse, spreadType, spreadKey, false); // Never send traditional names to API
    const spreadName = spreadType === 'durable' ? DURABLE_SPREADS[spreadKey].name : `${RANDOM_SPREADS[spreadKey].name} Emergent`;
    const safeQuestion = sanitizeForAPI(questionToUse);

    const stancePrompt = buildStancePrompt(stance.complexity, stance.voice, stance.focus, stance.density, stance.scope, stance.seriousness);
    const letterTone = VOICE_LETTER_TONE[stance.voice];
    const systemPrompt = `${BASE_SYSTEM}\n\n${stancePrompt}\n\n${FORMAT_INSTRUCTIONS}\n\nLetter tone for this stance: ${letterTone}`;
    const userMessage = `QUESTION: "${safeQuestion}"\n\nTHE DRAW (${spreadName}):\n\n${drawText}\n\nRespond using the exact section markers: [SUMMARY], [CARD:1], [CARD:2], etc., [CORRECTION:N] for each imbalanced card (where N matches the card number — use [CORRECTION:3] for Card 3, [CORRECTION:5] for Card 5, etc.), [LETTER]. Each marker on its own line.`;

    try {
      const res = await fetch('/api/reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: userMessage }], system: systemPrompt })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      // Parse the structured response
      const parsed = parseReadingResponse(data.reading, drawsToUse);
      setParsedReading(parsed);
    } catch (e) { setError(`Error: ${e.message}`); }
    setLoading(false);
  };

  const performReading = async () => {
    const actualQuestion = question.trim() || (spreadType === 'forge' ? 'Forging intention' : 'General reading');
    setQuestion(actualQuestion);
    const isDurable = spreadType === 'durable';
    const isForge = spreadType === 'forge';
    // Forge mode always draws 1 card
    const count = isForge ? 1 : (isDurable ? DURABLE_SPREADS[spreadKey].count : RANDOM_SPREADS[spreadKey].count);
    const newDraws = generateSpread(count, isDurable);
    setDraws(newDraws);
    await performReadingWithDraws(newDraws, actualQuestion);
  };

  // Generate a single random draw for thread continuation
  const generateSingleDraw = () => {
    const transientPool = shuffleArray([...Array(78).keys()]);
    const statusArr = new Uint32Array(1);
    crypto.getRandomValues(statusArr);
    return {
      position: Math.floor(Math.random() * 22), // Random position
      transient: transientPool[0],
      status: (statusArr[0] % 4) + 1
    };
  };

  // Continue a thread with Reflect or Forge operation
  // REFLECT = dialogue (no new card) - engage with user's inquiry/question
  // FORGE = sub-reading (new card) - interpret new card against user's assertion
  const continueThread = async (threadKey) => {
    const operation = threadOperations[threadKey];
    if (!operation) return;

    const userInput = sanitizeForAPI(threadContexts[threadKey] || '');
    if (!userInput.trim()) {
      setError('Please enter your thoughts before continuing.');
      return;
    }

    // Handle different section types
    const isSummary = threadKey === 'summary';
    const isLetter = threadKey === 'letter';
    const isPath = threadKey === 'path';
    const isSection = isSummary || isLetter || isPath;
    let parentContent, parentLabel;

    if (isSummary) {
      if (!parsedReading?.summary) return;
      parentContent = parsedReading.summary;
      parentLabel = 'Overview';
    } else if (isLetter) {
      if (!parsedReading?.letter) return;
      parentContent = parsedReading.letter;
      parentLabel = 'Letter';
    } else if (isPath) {
      if (!parsedReading?.rebalancerSummary) return;
      parentContent = parsedReading.rebalancerSummary;
      parentLabel = 'Path to Balance';
    } else {
      const parentDraw = draws[threadKey];
      const parentCard = parsedReading.cards.find(c => c.index === threadKey);
      if (!parentDraw || !parentCard) return;
      const parentTrans = getComponent(parentDraw.transient);
      const parentStat = STATUSES[parentDraw.status];
      const parentStatusPrefix = parentStat.prefix || 'Balanced';
      parentLabel = `${parentStatusPrefix} ${parentTrans.name}`;
      parentContent = parentCard.content;
    }

    setThreadLoading(prev => ({ ...prev, [threadKey]: true }));

    // Get Overview context (always include for grounding)
    const overviewContext = parsedReading?.summary || '';
    const safeQuestion = sanitizeForAPI(question);
    const stancePrompt = buildStancePrompt(stance.complexity, stance.voice, stance.focus, stance.density, stance.scope, stance.seriousness);

    let systemPrompt, userMessage;

    // BOTH operations draw a new card - the difference is the framing
    const newDraw = generateSingleDraw();
    const newTrans = getComponent(newDraw.transient);
    const newStat = STATUSES[newDraw.status];
    const newStatusPrefix = newStat.prefix || 'Balanced';
    const newCardName = `${newStatusPrefix} ${newTrans.name}`;

    if (operation === 'reflect') {
      // REFLECT: User is INQUIRING - architecture responds to their QUESTION with a new card
      systemPrompt = `${BASE_SYSTEM}

${stancePrompt}

OPERATION: REFLECT (Inquiry/Question)
The user is asking a question, exploring, or seeking clarity about this reading.
A new card has been drawn as the architecture's RESPONSE to their inquiry.

Your job:
- Acknowledge their question briefly
- Interpret the NEW CARD as the architecture's answer to what they asked
- This is a SUB-READING: the drawn card speaks directly to their inquiry
- Be specific about how the new card addresses their question
- The card IS the architecture speaking back to them

Output structure:
1. Brief acknowledgment of their question (1-2 sentences)
2. "The architecture responds with [Card Name]..."
3. How this card answers or illuminates their inquiry (2-3 paragraphs)`;

      userMessage = `ORIGINAL QUESTION: "${safeQuestion}"

READING OVERVIEW:
${overviewContext}

SECTION BEING DISCUSSED: ${parentLabel}
${parentContent}

USER'S INQUIRY/QUESTION:
"${userInput}"

NEW CARD DRAWN IN RESPONSE: ${newCardName}
Traditional: ${newTrans.traditional}
${newTrans.description}
${newTrans.extended || ''}

Interpret this new card as the architecture's response to their question.`;

    } else {
      // FORGE: User is ASSERTING - architecture responds to their DECLARATION with a new card
      systemPrompt = `${BASE_SYSTEM}

${stancePrompt}

OPERATION: FORGE (Create/Assert)
The user has declared an intention or direction. They're not asking — they're stating what they're going to do or create from this reading.

A new card has been drawn as the architecture's RESPONSE to their declaration.

Your job:
- Acknowledge their declared direction briefly
- Interpret the NEW CARD as the architecture's response to their assertion
- This is a SUB-READING: what does this new card reveal about the path they've declared?
- The new card might affirm, complicate, deepen, or redirect their stated intention
- Be specific about how the new card speaks to what they said they're doing

Output structure:
1. Brief acknowledgment of their direction (1-2 sentences)
2. The new card's message in context of their declaration (2-3 paragraphs)`;

      userMessage = `ORIGINAL QUESTION: "${safeQuestion}"

READING OVERVIEW:
${overviewContext}

SECTION THEY'RE FORGING FROM: ${parentLabel}
${parentContent}

USER'S DECLARATION/ASSERTION:
"${userInput}"

NEW CARD DRAWN IN RESPONSE: ${newCardName}
Traditional: ${newTrans.traditional}
${newTrans.description}
${newTrans.extended || ''}

Interpret this new card as the architecture's response to their declared direction.`;
    }

    try {
      const res = await fetch('/api/reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: userMessage }],
          system: systemPrompt
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Add to thread
      const newThreadItem = {
        draw: newDraw, // both reflect and forge draw a new card
        interpretation: data.reading,
        operation: operation,
        context: userInput
      };

      setThreadData(prev => ({
        ...prev,
        [threadKey]: [...(prev[threadKey] || []), newThreadItem]
      }));

      // Clear the operation selection for next continuation
      setThreadOperations(prev => ({ ...prev, [threadKey]: null }));
      setThreadContexts(prev => ({ ...prev, [threadKey]: '' }));

    } catch (e) {
      setError(`Thread error: ${e.message}`);
    }

    setThreadLoading(prev => ({ ...prev, [threadKey]: false }));
  };

  // Continue a nested thread (from within a threaded card)
  // BOTH operations draw a new card - difference is inquiry vs assertion framing
  const continueNestedThread = async (cardIndex, threadKey, parentThreadItem) => {
    const operation = threadOperations[threadKey];
    if (!operation) return;

    const userInput = sanitizeForAPI(threadContexts[threadKey] || '');
    if (!userInput.trim()) {
      setError('Please enter your thoughts before continuing.');
      return;
    }

    setThreadLoading(prev => ({ ...prev, [threadKey]: true }));

    // Get parent card context
    const parentTrans = parentThreadItem.draw ? getComponent(parentThreadItem.draw.transient) : null;
    const parentStat = parentThreadItem.draw ? STATUSES[parentThreadItem.draw.status] : null;
    const parentStatusPrefix = parentTrans ? (parentStat.prefix || 'Balanced') : '';
    const parentCardName = parentTrans ? `${parentStatusPrefix} ${parentTrans.name}` : 'Previous Response';

    // Get Overview context
    const overviewContext = parsedReading?.summary || '';
    const safeQuestion = sanitizeForAPI(question);
    const stancePrompt = buildStancePrompt(stance.complexity, stance.voice, stance.focus, stance.density, stance.scope, stance.seriousness);

    let systemPrompt, userMessage;

    // BOTH operations draw a new card - the difference is the framing
    const newDraw = generateSingleDraw();
    const newTrans = getComponent(newDraw.transient);
    const newStat = STATUSES[newDraw.status];
    const newStatusPrefix = newStat.prefix || 'Balanced';
    const newCardName = `${newStatusPrefix} ${newTrans.name}`;

    if (operation === 'reflect') {
      // REFLECT: User is INQUIRING - architecture responds to their QUESTION with a new card
      systemPrompt = `${BASE_SYSTEM}

${stancePrompt}

OPERATION: REFLECT (Inquiry/Question)
The user is asking a question about the reading. A new card has been drawn as the architecture's response to their inquiry.

Your job:
- Acknowledge their question briefly
- Interpret the NEW CARD as the architecture's answer to what they asked
- This is a SUB-READING: the drawn card speaks directly to their inquiry
- The card IS the architecture speaking back to them`;

      userMessage = `ORIGINAL QUESTION: "${safeQuestion}"

READING OVERVIEW:
${overviewContext}

CARD BEING DISCUSSED: ${parentCardName}
${parentThreadItem.interpretation}

USER'S INQUIRY/QUESTION:
"${userInput}"

NEW CARD DRAWN IN RESPONSE: ${newCardName}
Traditional: ${newTrans.traditional}
${newTrans.description}
${newTrans.extended || ''}

Interpret this new card as the architecture's response to their question.`;

    } else {
      // FORGE: User is ASSERTING - architecture responds to their DECLARATION with a new card
      systemPrompt = `${BASE_SYSTEM}

${stancePrompt}

OPERATION: FORGE (Create/Assert)
The user has declared an intention. A new card has been drawn as the architecture's response.

Your job:
- Acknowledge their declared direction briefly
- Interpret the NEW CARD as the architecture's response to their assertion
- This is a SUB-READING of the new card against their declared direction`;

      userMessage = `ORIGINAL QUESTION: "${safeQuestion}"

READING OVERVIEW:
${overviewContext}

CARD THEY'RE FORGING FROM: ${parentCardName}
${parentThreadItem.interpretation}

USER'S DECLARATION/ASSERTION:
"${userInput}"

NEW CARD DRAWN IN RESPONSE: ${newCardName}
Traditional: ${newTrans.traditional}
${newTrans.description}
${newTrans.extended || ''}

Interpret this new card as the architecture's response to their declared direction.`;
    }

    try {
      const res = await fetch('/api/reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: userMessage }],
          system: systemPrompt
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Create new thread item
      const newThreadItem = {
        draw: newDraw, // both reflect and forge draw a new card
        interpretation: data.reading,
        operation: operation,
        context: userInput,
        children: []
      };

      // Helper to add child to the right parent in the tree
      const addChildToThread = (threads, targetKey, newChild, currentPath = '') => {
        return threads.map((item, idx) => {
          const itemKey = currentPath ? `${currentPath}.${idx}` : `${cardIndex}:${idx}`;
          if (itemKey === threadKey) {
            return {
              ...item,
              children: [...(item.children || []), newChild]
            };
          }
          if (item.children && item.children.length > 0) {
            return {
              ...item,
              children: addChildToThread(item.children, targetKey, newChild, itemKey)
            };
          }
          return item;
        });
      };

      setThreadData(prev => ({
        ...prev,
        [cardIndex]: addChildToThread(prev[cardIndex] || [], threadKey, newThreadItem)
      }));

      // Clear the operation selection
      setThreadOperations(prev => ({ ...prev, [threadKey]: null }));
      setThreadContexts(prev => ({ ...prev, [threadKey]: '' }));

    } catch (e) {
      setError(`Thread error: ${e.message}`);
    }

    setThreadLoading(prev => ({ ...prev, [threadKey]: false }));
  };

  const handleExpand = async (sectionKey, expansionType, remove = false) => {
    // If removing, just clear that expansion
    if (remove) {
      setExpansions(prev => {
        const newExp = { ...prev };
        if (newExp[sectionKey]) {
          const { [expansionType]: _, ...rest } = newExp[sectionKey];
          newExp[sectionKey] = rest;
          if (Object.keys(rest).length === 0) delete newExp[sectionKey];
        }
        return newExp;
      });
      return;
    }
    
    // If already has this expansion, toggle it off
    if (expansions[sectionKey]?.[expansionType]) {
      handleExpand(sectionKey, expansionType, true);
      return;
    }
    
    // Otherwise, fetch the expansion
    setExpanding({ section: sectionKey, type: expansionType });
    
    // Build context for the expansion request
    const drawText = formatDrawForAI(draws, spreadType, spreadKey, false); // Never send traditional names to API
    let sectionContent = '';
    let sectionContext = '';
    
    if (sectionKey === 'summary') {
      sectionContent = parsedReading.summary;
      sectionContext = 'the summary of the reading';
    } else if (sectionKey === 'letter') {
      sectionContent = parsedReading.letter;
      sectionContext = 'the closing letter';
    } else if (sectionKey.startsWith('card:')) {
      const cardIndex = parseInt(sectionKey.split(':')[1]);
      const cardSection = parsedReading.cards.find(c => c.index === cardIndex);
      const draw = draws[cardIndex];
      const trans = getComponent(draw.transient);
      sectionContent = cardSection?.content || '';
      sectionContext = `the reading for ${trans.name} (Signature ${cardIndex + 1})`;
    } else if (sectionKey.startsWith('correction:')) {
      const cardIndex = parseInt(sectionKey.split(':')[1]);
      const corrSection = parsedReading.corrections.find(c => c.cardIndex === cardIndex);
      const draw = draws[cardIndex];
      const trans = getComponent(draw.transient);
      sectionContent = corrSection?.content || '';
      sectionContext = `the correction path for ${trans.name} (Signature ${cardIndex + 1})`;
    } else if (sectionKey === 'path') {
      sectionContent = parsedReading.rebalancerSummary;
      sectionContext = 'the Path to Balance section (synthesis of all corrections)';
    }

    // Custom prompts for Path section
    let expansionPrompt;
    if (sectionKey === 'path') {
      const pathPrompts = {
        unpack: "Expand on the Path to Balance with more detail. Go deeper on the synthesis of these corrections and what they're pointing to together.",
        clarify: "Restate the Path to Balance in simpler, everyday language. Plain words, short sentences — make it completely accessible.",
        architecture: "Explain the geometric relationships between the corrections. Why do these specific corrections work together? Show the structural logic.",
        example: "Give concrete real-world examples of how to apply this guidance. Specific scenarios someone might encounter — make it tangible."
      };
      expansionPrompt = pathPrompts[expansionType];
    } else {
      expansionPrompt = EXPANSION_PROMPTS[expansionType].prompt;
    }
    
    // Pass the original stance to expansion
    const stancePrompt = buildStancePrompt(stance.complexity, stance.voice, stance.focus, stance.density, stance.scope, stance.seriousness);
    const systemPrompt = `${BASE_SYSTEM}\n\n${stancePrompt}\n\nYou are expanding on a specific section of a reading. Keep the same tone as the original reading. Be concise but thorough. Always connect your expansion back to the querent's specific question.`;
    const userMessage = `QUERENT'S QUESTION: "${question}"

THE DRAW:
${drawText}

SECTION BEING EXPANDED (${sectionContext}):
${sectionContent}

EXPANSION REQUEST:
${expansionPrompt}

Respond directly with the expanded content. No section markers needed. Keep it focused on this specific section AND relevant to their question: "${question}"`;

    try {
      const res = await fetch('/api/reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: userMessage }], system: systemPrompt })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      setExpansions(prev => ({
        ...prev,
        [sectionKey]: {
          ...(prev[sectionKey] || {}),
          [expansionType]: data.reading
        }
      }));
    } catch (e) { 
      setError(`Expansion error: ${e.message}`); 
    }
    setExpanding(null);
  };

  const sendFollowUp = async () => {
    if (!followUp.trim() || !draws) return;
    setFollowUpLoading(true); setError('');
    const drawText = formatDrawForAI(draws, spreadType, spreadKey, false); // Never send traditional names to API
    
    // Build context from parsed reading
    let readingContext = '';
    if (parsedReading) {
      readingContext = `PREVIOUS READING:\n\nSummary: ${parsedReading.summary}\n\n`;
      parsedReading.cards.forEach((card, i) => {
        readingContext += `Signature ${card.index + 1}: ${card.content}\n\n`;
      });
      parsedReading.corrections.forEach(corr => {
        readingContext += `Correction ${corr.cardIndex + 1}: ${corr.content}\n\n`;
      });
    }
    
    // Pass stance to follow-up
    const stancePrompt = buildStancePrompt(stance.complexity, stance.voice, stance.focus, stance.density, stance.scope, stance.seriousness);
    const systemPrompt = `${BASE_SYSTEM}\n\n${stancePrompt}\n\nYou are continuing a conversation about a reading. Answer their follow-up question directly, referencing the reading context as needed. No section markers — just respond naturally.`;
    
    const messages = [
      ...followUpMessages,
      { role: 'user', content: followUp }
    ];
    
    const contextMessage = `THE DRAW:\n${drawText}\n\n${readingContext}\n\nFOLLOW-UP QUESTION: ${followUp}`;
    
    try {
      const res = await fetch('/api/reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [{ role: 'user', content: contextMessage }], 
          system: systemPrompt 
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setFollowUpMessages([...messages, { role: 'assistant', content: data.reading }]);
      setFollowUp('');
    } catch (e) { setError(`Error: ${e.message}`); }
    setFollowUpLoading(false);
  };

  const resetReading = () => {
    setDraws(null); setParsedReading(null); setExpansions({}); setFollowUpMessages([]);
    setQuestion(''); setFollowUp(''); setError(''); setFollowUpLoading(false);
    setShareUrl(''); setIsSharedReading(false); setShowArchitecture(false);
    setShowMidReadingStance(false);
    // Clear thread state
    setThreadData({}); setThreadOperations({}); setThreadContexts({}); setThreadLoading({}); setCollapsedThreads({});
    hasAutoInterpreted.current = false;
    window.history.replaceState({}, '', window.location.pathname);
  };

  const getCardHouse = (draw, index) => {
    if (spreadType === 'durable') {
      return DURABLE_SPREADS[spreadKey].frames[index].house;
    } else if (draw.position !== null) {
      return ARCHETYPES[draw.position]?.house || 'Gestalt';
    }
    return 'Gestalt';
  };

  // === CARD DISPLAY (simplified, visual only) ===
  const CardDisplay = ({ draw, index }) => {
    const isDurable = spreadType === 'durable';
    const spreadConfig = isDurable ? DURABLE_SPREADS[spreadKey] : RANDOM_SPREADS[spreadKey];
    const trans = getComponent(draw.transient);
    const stat = STATUSES[draw.status];
    const transArchetype = trans.archetype !== undefined ? ARCHETYPES[trans.archetype] : null;
    const isMajor = trans.type === "Archetype";
    const correction = getFullCorrection(draw.transient, draw.status);
    const correctionText = getCorrectionText(correction, trans, draw.status);
    const correctionTargetId = getCorrectionTargetId(correction, trans);
    
    const house = getCardHouse(draw, index);
    const houseColors = HOUSE_COLORS[house];
    
    const contextLabel = isDurable ? spreadConfig.frames[index].name : (draw.position !== null ? ARCHETYPES[draw.position]?.name : 'Draw');
    const contextSub = isDurable ? null : (draw.position !== null ? `Position ${draw.position}` : null);
    
    // Helper to open card info
    const openCardInfo = (cardId) => {
      setSelectedInfo({ type: 'card', id: cardId, data: getComponent(cardId) });
    };
    
    // Helper to open status info
    const openStatusInfo = (statusId) => {
      setSelectedInfo({ type: 'status', id: statusId, data: STATUS_INFO[statusId] });
    };
    
    // Helper to open channel info
    const openChannelInfo = (channelName) => {
      setSelectedInfo({ type: 'channel', id: channelName, data: CHANNELS[channelName] });
    };
    
    // Helper to open house info
    const openHouseInfo = (houseName) => {
      setSelectedInfo({ type: 'house', id: houseName, data: HOUSES[houseName] });
    };
    
    // Scroll to content section
    const scrollToContent = () => {
      document.getElementById(`content-${index}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
      <div 
        id={`card-${index}`}
        className={`rounded-xl border-2 p-4 ${houseColors.border} ${houseColors.bg} transition-all cursor-pointer hover:border-opacity-80 group`}
        onClick={scrollToContent}
      >
        <div className="mb-3 flex justify-between items-start">
          <span 
            className={`text-xs px-2 py-1 rounded-full cursor-pointer hover:opacity-80 ${STATUS_COLORS[draw.status]}`}
            onClick={(e) => { e.stopPropagation(); openStatusInfo(draw.status); }}
          >
            {stat.name}
          </span>
          <span className="text-zinc-600 text-xs opacity-0 group-hover:opacity-100 transition-opacity">↓ read</span>
        </div>

        <div className="mb-3">
          <div 
            className="text-xl text-zinc-100 font-semibold cursor-pointer hover:text-zinc-300 transition-colors"
            onClick={(e) => { e.stopPropagation(); openCardInfo(draw.transient); }}
            title="Click for details"
          >
            {trans.name}
            <span className="text-zinc-600 text-sm ml-1">ⓘ</span>
          </div>
          {isMajor && (
            <div className="mt-1">
              <span className="text-xs bg-amber-500/30 text-amber-300 px-2 py-0.5 rounded-full">Major</span>
            </div>
          )}
          {showTraditional && <div className="text-sm text-zinc-500 mt-1">{trans.traditional}</div>}
        </div>

        <div className="text-sm text-zinc-400 mb-3">
          in your <span 
            className={`font-medium cursor-pointer hover:underline decoration-dotted ${houseColors.text}`}
            onClick={(e) => { e.stopPropagation(); isDurable ? openHouseInfo(house) : openCardInfo(draw.position); }}
          >{contextLabel}</span>
          {contextSub && <span className="text-zinc-600 text-xs ml-1">({contextSub})</span>}
        </div>

        <div className="border-t border-zinc-700/30 pt-3 space-y-1">
          {trans.type === "Bound" && (
            <>
              <div className="text-sm">
                <span 
                  className={`cursor-pointer hover:underline decoration-dotted ${CHANNEL_COLORS[trans.channel]}`}
                  onClick={(e) => { e.stopPropagation(); openChannelInfo(trans.channel); }}
                >{trans.channel}</span>
                <span className="text-zinc-500"> Channel</span>
              </div>
              <div className="text-sm text-zinc-400">
                Expresses <span 
                  className="text-zinc-300 cursor-pointer hover:text-zinc-100 transition-colors"
                  onClick={(e) => { e.stopPropagation(); openCardInfo(trans.archetype); }}
                >{transArchetype?.name}</span>
              </div>
            </>
          )}
          {trans.type === "Agent" && (
            <>
              <div className="text-sm">
                <span className="text-zinc-300">{trans.role}</span>
                <span className="text-zinc-500"> of </span>
                <span 
                  className={`cursor-pointer hover:underline decoration-dotted ${CHANNEL_COLORS[trans.channel]}`}
                  onClick={(e) => { e.stopPropagation(); openChannelInfo(trans.channel); }}
                >{trans.channel}</span>
              </div>
              <div className="text-sm text-zinc-400">
                Embodies <span 
                  className="text-zinc-300 cursor-pointer hover:text-zinc-100 transition-colors"
                  onClick={(e) => { e.stopPropagation(); openCardInfo(trans.archetype); }}
                >{transArchetype?.name}</span>
              </div>
            </>
          )}
        </div>

        {correctionText && draw.status !== 1 && (
          <div className="border-t border-zinc-700/30 pt-3 mt-3">
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Correction</div>
            <div className="text-sm text-zinc-300">
              → <span 
                className={correctionTargetId !== null ? "cursor-pointer hover:text-zinc-100 transition-colors" : ""}
                onClick={(e) => { e.stopPropagation(); correctionTargetId !== null && openCardInfo(correctionTargetId); }}
              >{correctionText}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Get current stance label for display
  const getCurrentStanceLabel = () => {
    const preset = Object.entries(DELIVERY_PRESETS).find(([_, p]) =>
      p.complexity === stance.complexity &&
      p.voice === stance.voice && p.focus === stance.focus &&
      p.density === stance.density && p.scope === stance.scope
    );
    const complexityLabel = COMPLEXITY_OPTIONS[stance.complexity]?.label || stance.complexity;
    if (preset) return `${complexityLabel} • ${preset[1].name}`;
    return `${complexityLabel} • Custom`;
  };

  // Get current delivery preset (if any)
  const getCurrentDeliveryPreset = () => {
    return Object.entries(DELIVERY_PRESETS).find(([_, p]) =>
      p.complexity === stance.complexity &&
      p.seriousness === stance.seriousness &&
      p.voice === stance.voice && p.focus === stance.focus &&
      p.density === stance.density && p.scope === stance.scope
    );
  };

  // Apply a delivery preset
  const applyDeliveryPreset = (presetKey) => {
    const preset = DELIVERY_PRESETS[presetKey];
    if (preset) {
      setStance({
        complexity: preset.complexity,
        seriousness: preset.seriousness,
        voice: preset.voice,
        focus: preset.focus,
        density: preset.density,
        scope: preset.scope
      });
    }
  };

  // Navigation helpers for spectrum labels
  const spreadKeys = Object.keys(RANDOM_SPREADS);
  const stanceKeys = Object.keys(DELIVERY_PRESETS);

  const navigateSpread = (direction) => {
    if (spreadType !== 'random') return;
    const currentIndex = spreadKeys.indexOf(spreadKey);
    const newIndex = direction === 'left'
      ? Math.max(0, currentIndex - 1)
      : Math.min(spreadKeys.length - 1, currentIndex + 1);
    setSpreadKey(spreadKeys[newIndex]);
  };

  const navigateStance = (direction) => {
    const currentPreset = getCurrentDeliveryPreset();
    if (!currentPreset) return;
    const currentIndex = stanceKeys.indexOf(currentPreset[0]);
    const newIndex = direction === 'left'
      ? Math.max(0, currentIndex - 1)
      : Math.min(stanceKeys.length - 1, currentIndex + 1);
    applyDeliveryPreset(stanceKeys[newIndex]);
  };

  // Slugify text for filenames
  const slugify = (text) => {
    if (!text) return '';
    return text
      .toLowerCase()
      .replace(/[\u2018\u2019\u201C\u201D]/g, '')  // Remove smart quotes
      .replace(/[\u2014\u2013]/g, '-')             // Em/en dash to hyphen
      .replace(/[^\w\s-]/g, '')                    // Remove special chars
      .replace(/\s+/g, '-')                        // Spaces to hyphens
      .replace(/-+/g, '-')                         // Collapse multiple hyphens
      .replace(/^-+|-+$/g, '')                     // Trim leading/trailing hyphens
      .substring(0, 40)                            // Limit to 40 chars
      .replace(/-+$/g, '');                        // Trim trailing hyphens again after truncation
  };

  // Generate smart export filename
  const generateExportFilename = (extension) => {
    const date = new Date().toISOString().split('T')[0];
    let slug = '';

    // Priority 1: Question if >10 chars
    if (question && question.trim().length > 10) {
      slug = slugify(question.trim());
    }
    // Priority 2: Summary/overview
    else if (parsedReading?.summary && parsedReading.summary.trim().length > 10) {
      slug = slugify(parsedReading.summary.trim());
    }
    // Priority 3: Fallback
    else {
      slug = 'reading';
    }

    return `nirmanakaya-${slug}-${date}.${extension}`;
  };

  // Export reading to markdown
  const exportToMarkdown = () => {
    if (!parsedReading || !draws) return;

    const spreadName = spreadType === 'durable'
      ? DURABLE_SPREADS[spreadKey]?.name
      : `${RANDOM_SPREADS[spreadKey]?.name} Emergent`;
    const isDurable = spreadType === 'durable';
    const spreadConfig = isDurable ? DURABLE_SPREADS[spreadKey] : null;

    let md = `# Nirmanakaya Reading\n\n`;
    md += `**Date:** ${new Date().toLocaleDateString()}\n\n`;
    md += `## Question\n\n${question}\n\n`;
    md += `**Spread:** ${spreadName}  \n`;
    md += `**Stance:** ${getCurrentStanceLabel()}\n\n`;
    md += `---\n\n`;

    // Summary
    if (parsedReading.summary) {
      md += `## Summary\n\n${parsedReading.summary}\n\n`;
    }

    // Cards with corrections
    md += `## Signatures\n\n`;
    parsedReading.cards.forEach((card) => {
      const draw = draws[card.index];
      const trans = getComponent(draw.transient);
      const stat = STATUSES[draw.status];
      const correction = parsedReading.corrections.find(c => c.cardIndex === card.index);

      const context = isDurable && spreadConfig
        ? spreadConfig.frames[card.index]?.name
        : `Position ${card.index + 1}`;
      const statusPhrase = stat.prefix ? `${stat.prefix} ${trans.name}` : `Balanced ${trans.name}`;

      md += `### Signature ${card.index + 1} — ${context}\n\n`;
      md += `**${statusPhrase}** (${trans.traditional})  \n`;
      md += `*Status: ${stat.name}*\n\n`;

      // Architecture details
      if (trans.type === 'Archetype') {
        md += `> **House:** ${trans.house}`;
        if (trans.channel) md += ` | **Channel:** ${trans.channel}`;
        md += `\n\n`;
      } else if (trans.type === 'Bound') {
        const assocArchetype = ARCHETYPES[trans.archetype];
        md += `> **Channel:** ${trans.channel} | **Associated Archetype:** ${assocArchetype?.name} (${assocArchetype?.traditional})\n\n`;
      } else if (trans.type === 'Agent') {
        const assocArchetype = ARCHETYPES[trans.archetype];
        md += `> **Role:** ${trans.role} | **Channel:** ${trans.channel} | **Associated Archetype:** ${assocArchetype?.name} (${assocArchetype?.traditional})\n\n`;
      }

      md += `${card.content}\n\n`;

      if (correction) {
        const fullCorr = getFullCorrection(draw.transient, draw.status);
        const corrText = getCorrectionText(fullCorr, trans, draw.status);
        md += `#### Correction: ${corrText || 'See below'}\n\n`;
        md += `${correction.content}\n\n`;
      }
    });

    // Rebalancer Summary
    if (parsedReading.rebalancerSummary) {
      md += `---\n\n## ◈ Path to Balance\n\n${parsedReading.rebalancerSummary}\n\n`;
    }

    // Letter
    if (parsedReading.letter) {
      md += `---\n\n## Letter\n\n${parsedReading.letter}\n\n`;
    }

    md += `---\n\n*Generated by Nirmanakaya Consciousness Architecture Reader*\n`;

    // Download
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = generateExportFilename('md');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export reading to HTML
  const exportToHTML = () => {
    if (!parsedReading || !draws) return;

    const spreadName = spreadType === 'durable'
      ? `Reflect • ${DURABLE_SPREADS[spreadKey]?.name}`
      : `Discover • ${RANDOM_SPREADS[spreadKey]?.name}`;
    const isDurable = spreadType === 'durable';
    const spreadConfig = isDurable ? DURABLE_SPREADS[spreadKey] : null;

    const escapeHtml = (text) => text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/\n/g, '<br>');

    let signaturesHtml = '';
    parsedReading.cards.forEach((card) => {
      const draw = draws[card.index];
      const trans = getComponent(draw.transient);
      const stat = STATUSES[draw.status];
      const correction = parsedReading.corrections.find(c => c.cardIndex === card.index);
      const context = isDurable && spreadConfig ? spreadConfig.frames[card.index]?.name : `Position ${card.index + 1}`;
      const statusPhrase = stat.prefix ? `${stat.prefix} ${trans.name}` : `Balanced ${trans.name}`;

      let archDetails = '';
      if (trans.type === 'Archetype') {
        archDetails = `<div class="arch-details">House: ${trans.house}${trans.channel ? ` • Channel: ${trans.channel}` : ''}</div>`;
      } else if (trans.type === 'Bound') {
        const assoc = ARCHETYPES[trans.archetype];
        archDetails = `<div class="arch-details">Channel: ${trans.channel} • Associated: ${assoc?.name}</div>`;
      } else if (trans.type === 'Agent') {
        const assoc = ARCHETYPES[trans.archetype];
        archDetails = `<div class="arch-details">Role: ${trans.role} • Channel: ${trans.channel} • Associated: ${assoc?.name}</div>`;
      }

      let correctionHtml = '';
      if (correction) {
        const fullCorr = getFullCorrection(draw.transient, draw.status);
        const corrText = getCorrectionText(fullCorr, trans, draw.status);
        correctionHtml = `
          <div class="rebalancer">
            <span class="rebalancer-badge">Rebalancer</span>
            <div class="rebalancer-header">${trans.name} → ${corrText || ''}</div>
            <div class="rebalancer-content">${escapeHtml(correction.content)}</div>
          </div>`;
      }

      // Render thread items recursively
      const renderThreadItem = (item, depth = 0) => {
        const itemTrans = getComponent(item.draw.transient);
        const itemStat = STATUSES[item.draw.status];
        const itemStatusPrefix = itemStat.prefix || 'Balanced';
        const opLabel = item.operation === 'reflect' ? 'Reflecting' : 'Forging';
        const opClass = item.operation === 'reflect' ? 'thread-reflect' : 'thread-forge';

        let childrenHtml = '';
        if (item.children && item.children.length > 0) {
          childrenHtml = item.children.map(child => renderThreadItem(child, depth + 1)).join('');
        }

        return `
          <div class="thread-item ${opClass}">
            <div class="thread-label">↳ ${opLabel}${item.context ? `: "${escapeHtml(item.context)}"` : ''}</div>
            <div class="thread-card">
              <div class="thread-header">
                <span class="signature-status status-${itemStat.name.toLowerCase().replace(' ', '-')}">${itemStat.name}</span>
                <span class="thread-name">${itemStatusPrefix} ${itemTrans.name}</span>
              </div>
              <div class="thread-content">${escapeHtml(item.interpretation)}</div>
            </div>
            ${childrenHtml}
          </div>`;
      };

      let threadsHtml = '';
      const cardThreads = threadData[card.index] || [];
      if (cardThreads.length > 0) {
        threadsHtml = `<div class="threads">${cardThreads.map(t => renderThreadItem(t)).join('')}</div>`;
      }

      signaturesHtml += `
        <div class="signature">
          <div class="signature-header">
            <div>
              <span class="signature-badge">Reading</span>
              <span class="signature-title">Signature ${card.index + 1} — ${context}</span>
            </div>
            <span class="signature-status status-${stat.name.toLowerCase().replace(' ', '-')}">${stat.name}</span>
          </div>
          <div class="signature-name">${statusPhrase}</div>
          ${archDetails}
          <div class="signature-content">${escapeHtml(card.content)}</div>
          ${correctionHtml}
          ${threadsHtml}
        </div>`;
    });

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nirmanakaya Reading - ${new Date().toLocaleDateString()}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #18181b; color: #e4e4e7; font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; padding: 2rem; max-width: 800px; margin: 0 auto; }
    h1 { font-weight: 200; letter-spacing: 0.2em; text-align: center; margin-bottom: 0.5rem; color: #fafafa; }
    .subtitle { text-align: center; color: #52525b; font-size: 0.75rem; margin-bottom: 2rem; }
    .meta { text-align: center; color: #71717a; font-size: 0.875rem; margin-bottom: 2rem; }
    .question-box { background: #27272a; border-radius: 0.75rem; padding: 1.5rem; margin-bottom: 2rem; }
    .question-label { color: #71717a; font-size: 0.625rem; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.5rem; }
    .question-text { color: #d4d4d8; }
    .section { margin-bottom: 2rem; }
    .section-title { color: #71717a; font-size: 0.625rem; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 1rem; border-bottom: 1px solid #3f3f46; padding-bottom: 0.5rem; }
    .summary-box { background: linear-gradient(to bottom right, rgba(69, 26, 3, 0.4), rgba(120, 53, 15, 0.2)); border: 2px solid rgba(245, 158, 11, 0.5); border-radius: 0.75rem; padding: 1.25rem; margin-bottom: 1rem; }
    .summary-badge { display: inline-block; background: rgba(245, 158, 11, 0.3); color: #f59e0b; font-size: 0.75rem; padding: 0.25rem 0.75rem; border-radius: 1rem; margin-bottom: 0.75rem; }
    .summary { color: #fef3c7; }
    .signature { background: rgba(8, 51, 68, 0.3); border-radius: 0.75rem; padding: 1.25rem; margin-bottom: 1rem; border: 2px solid rgba(6, 182, 212, 0.5); }
    .signature-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
    .signature-badge { display: inline-block; background: rgba(8, 51, 68, 0.5); color: #22d3ee; font-size: 0.625rem; padding: 0.2rem 0.5rem; border-radius: 1rem; margin-right: 0.5rem; vertical-align: middle; }
    .signature-title { color: #fafafa; font-weight: 500; }
    .signature-status { font-size: 0.75rem; padding: 0.25rem 0.75rem; border-radius: 1rem; }
    .status-balanced { background: rgba(16, 185, 129, 0.2); color: #34d399; }
    .status-too-much { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
    .status-too-little { background: rgba(14, 165, 233, 0.2); color: #38bdf8; }
    .status-unacknowledged { background: rgba(139, 92, 246, 0.2); color: #a78bfa; }
    .signature-name { color: #22d3ee; margin-bottom: 0.5rem; }
    .traditional { color: #71717a; }
    .arch-details { color: #a1a1aa; font-size: 0.75rem; margin-bottom: 0.75rem; padding: 0.5rem; background: rgba(39, 39, 42, 0.5); border-radius: 0.5rem; }
    .signature-content { color: #d4d4d8; font-size: 0.875rem; line-height: 1.6; }
    .rebalancer { margin-top: 1rem; padding: 1rem; background: rgba(2, 44, 34, 0.3); border: 2px solid rgba(16, 185, 129, 0.5); border-radius: 0.5rem; margin-left: 1rem; }
    .rebalancer-badge { display: inline-block; background: rgba(16, 185, 129, 0.3); color: #6ee7b7; font-size: 0.625rem; padding: 0.2rem 0.5rem; border-radius: 1rem; margin-bottom: 0.5rem; }
    .rebalancer-header { color: #34d399; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.5rem; }
    .rebalancer-content { color: #a7f3d0; font-size: 0.875rem; line-height: 1.6; }
    .path-box { background: linear-gradient(to bottom right, rgba(6, 78, 59, 0.3), rgba(16, 185, 129, 0.15)); border: 2px solid rgba(16, 185, 129, 0.6); border-radius: 0.75rem; padding: 1.5rem; }
    .path-badge { display: inline-block; color: #34d399; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.75rem; letter-spacing: 0.05em; }
    .path-content { color: #d4d4d8; line-height: 1.6; white-space: pre-wrap; }
    .letter-box { background: rgba(46, 16, 101, 0.3); border: 2px solid rgba(139, 92, 246, 0.5); border-radius: 0.75rem; padding: 1.5rem; }
    .letter-badge { display: inline-block; background: rgba(139, 92, 246, 0.3); color: #c4b5fd; font-size: 0.75rem; padding: 0.25rem 0.75rem; border-radius: 1rem; margin-bottom: 0.75rem; }
    .letter { color: #ddd6fe; font-style: italic; line-height: 1.6; }
    .footer { text-align: center; color: #3f3f46; font-size: 0.625rem; margin-top: 3rem; letter-spacing: 0.1em; }
    .threads { margin-top: 1rem; }
    .thread-item { margin-left: 1rem; border-left: 2px solid #3f3f46; padding-left: 1rem; margin-top: 0.75rem; }
    .thread-label { font-size: 0.75rem; margin-bottom: 0.5rem; }
    .thread-reflect .thread-label { color: #38bdf8; }
    .thread-forge .thread-label { color: #fb923c; }
    .thread-card { padding: 1rem; border-radius: 0.5rem; }
    .thread-reflect .thread-card { background: rgba(14, 165, 233, 0.1); border: 1px solid rgba(14, 165, 233, 0.3); }
    .thread-forge .thread-card { background: rgba(249, 115, 22, 0.1); border: 1px solid rgba(249, 115, 22, 0.3); }
    .thread-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
    .thread-name { color: #e4e4e7; font-weight: 500; }
    .thread-content { color: #d4d4d8; font-size: 0.875rem; line-height: 1.6; white-space: pre-wrap; }
  </style>
</head>
<body>
  <h1>NIRMANAKAYA</h1>
  <p class="subtitle">Consciousness Architecture Reader</p>
  <p class="meta">${spreadName} • ${getCurrentStanceLabel()} • ${new Date().toLocaleDateString()}</p>

  <div class="question-box">
    <div class="question-label">Your Question or Intention</div>
    <div class="question-text">${escapeHtml(question || 'General reading')}</div>
  </div>

  ${parsedReading.summary ? `
  <div class="section">
    <div class="summary-box">
      <span class="summary-badge">Overview</span>
      <div class="summary">${escapeHtml(parsedReading.summary)}</div>
    </div>
  </div>` : ''}

  <div class="section">
    <div class="section-title">Signatures</div>
    ${signaturesHtml}
  </div>

  ${parsedReading.rebalancerSummary ? `
  <div class="section">
    <div class="path-box">
      <span class="path-badge">◈ Path to Balance</span>
      <div class="path-content">${escapeHtml(parsedReading.rebalancerSummary)}</div>
    </div>
  </div>` : ''}

  ${parsedReading.letter ? `
  <div class="section">
    <div class="letter-box">
      <span class="letter-badge">Letter</span>
      <div class="letter">${escapeHtml(parsedReading.letter)}</div>
    </div>
  </div>` : ''}

  <p class="footer">Generated by Nirmanakaya Consciousness Architecture Reader</p>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = generateExportFilename('html');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8 mobile-container">
        
        {/* Header */}
        <div className="text-center mb-4 md:mb-6 mobile-header relative">
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-[20px] sm:text-2xl md:text-3xl font-extralight tracking-[0.2em] sm:tracking-[0.3em] mb-1 text-zinc-100">NIRMANAKAYA</h1>
            {!draws && (
              <button
                onClick={() => setHelpPopover(helpPopover === 'intro' ? null : 'intro')}
                className="w-6 h-6 sm:w-5 sm:h-5 rounded-full bg-[#f59e0b]/20 border border-[#f59e0b]/50 text-[#f59e0b] hover:bg-[#f59e0b]/30 hover:text-[#f59e0b] text-xs flex items-center justify-center transition-all mb-1"
              >
                ?
              </button>
            )}
          </div>
          <p className="text-zinc-400 text-[11px] sm:text-xs tracking-wide">Consciousness Architecture Reader</p>
          <p className="text-zinc-500 text-[10px] mt-0.5">v0.32.2 alpha • Pet Name + Royals Fix</p>
          {helpPopover === 'intro' && (
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 w-80 sm:w-96">
              <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 shadow-xl">
                <p className="text-zinc-300 text-sm leading-relaxed">
                  The Nirmanakaya is both mirror and forge. Bring a question or declare an intention —
                  the draw finds what's ready to be seen. Where you are, what's moving, what might need attention.
                </p>
                <button onClick={() => setHelpPopover(null)} className="mt-3 text-xs text-zinc-500 hover:text-zinc-300 w-full text-center">Got it</button>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        {!draws && (
          <>
            {/* Reading Configuration Box */}
            <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-4 sm:p-6 mb-6">
              {/* Spread Type Toggle */}
              <div className="flex justify-center mb-4 relative">
                <div className="inline-flex rounded-lg bg-zinc-900 p-1 mode-tabs-container">
                  <button onClick={() => { setSpreadType('durable'); setSpreadKey('arc'); }}
                    className={`mode-tab px-4 py-2 min-h-[44px] sm:min-h-0 rounded-md text-[15px] sm:text-sm font-medium sm:font-normal transition-all ${spreadType === 'durable' ? 'bg-[#2e1065] text-amber-400' : 'text-zinc-400 hover:text-zinc-200'}`}>
                    Reflect
                  </button>
                  <button onClick={() => { setSpreadType('random'); setSpreadKey('three'); }}
                    className={`mode-tab px-4 py-2 min-h-[44px] sm:min-h-0 rounded-md text-[15px] sm:text-sm font-medium sm:font-normal transition-all ${spreadType === 'random' ? 'bg-[#2e1065] text-amber-400' : 'text-zinc-400 hover:text-zinc-200'}`}>
                    Discover
                  </button>
                  <button onClick={() => { setSpreadType('forge'); setSpreadKey('one'); }}
                    className={`mode-tab px-4 py-2 min-h-[44px] sm:min-h-0 rounded-md text-[15px] sm:text-sm font-medium sm:font-normal transition-all ${spreadType === 'forge' ? 'bg-[#2e1065] text-amber-400' : 'text-zinc-400 hover:text-zinc-200'}`}>
                    Forge
                  </button>
                </div>
                {/* Help icon positioned absolutely so it doesn't affect centering */}
                <button
                  onClick={() => setHelpPopover(helpPopover === 'spreadType' ? null : 'spreadType')}
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-7 h-7 sm:w-5 sm:h-5 rounded-full bg-[#f59e0b]/20 border border-[#f59e0b]/50 text-[#f59e0b] hover:bg-[#f59e0b]/30 hover:text-[#f59e0b] text-xs flex items-center justify-center transition-all"
                >
                  ?
                </button>
                {helpPopover === 'spreadType' && (
                  <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 w-72 sm:w-80">
                    <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 shadow-xl">
                      <div className="space-y-3 text-sm">
                        <div>
                          <span className="text-zinc-200 font-medium">Reflect:</span>
                          <p className="text-zinc-400 text-xs mt-1">Structured mirror — examine specific areas. The energy is emergent, but it lands in life areas you choose.</p>
                        </div>
                        <div>
                          <span className="text-zinc-200 font-medium">Discover:</span>
                          <p className="text-zinc-400 text-xs mt-1">Open mirror — receive what shows up. Both the energy and where it's showing up emerge together.</p>
                        </div>
                        <div>
                          <span className="text-zinc-200 font-medium">Forge:</span>
                          <p className="text-zinc-400 text-xs mt-1">Active creation — declare an intention, draw one card, iterate through action.</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setHelpPopover(null)}
                        className="mt-3 text-xs text-zinc-500 hover:text-zinc-300 w-full text-center"
                      >
                        Got it
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mode helper text */}
              <p className="text-center text-zinc-500 text-[12px] sm:text-xs mb-4">{MODE_HELPER_TEXT[spreadType]}</p>

              {/* Card Count Selector - fixed height to prevent layout shifts */}
              <div className="flex flex-col items-center justify-center w-full max-w-lg mx-auto card-count-selector h-[65px] sm:h-[45px]">
                {spreadType === 'forge' ? (
                  <div className="text-center text-zinc-400 text-[14px] sm:text-sm">
                    One card • Intention-first
                  </div>
                ) : (
                  <>
                    <div className="flex gap-1.5 sm:gap-1.5 justify-center flex-wrap">
                      {spreadType === 'random' ? (
                        Object.entries(RANDOM_SPREADS).map(([key, value]) => (
                          <button key={key} onClick={() => setSpreadKey(key)}
                            className={`px-3 sm:px-3 py-2.5 sm:py-1.5 min-h-[44px] sm:min-h-0 rounded-sm text-[14px] sm:text-sm font-medium sm:font-normal transition-all ${spreadKey === key ? 'bg-[#2e1065] text-amber-400' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 active:bg-zinc-700'}`}>
                            {value.name}
                          </button>
                        ))
                      ) : (
                        Object.entries(DURABLE_SPREADS).map(([key, value]) => (
                          <button key={key} onClick={() => setSpreadKey(key)}
                            className={`px-3 sm:px-3 py-2.5 sm:py-1.5 min-h-[44px] sm:min-h-0 rounded-sm text-[14px] sm:text-sm font-medium sm:font-normal transition-all ${spreadKey === key ? 'bg-[#2e1065] text-amber-400' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 active:bg-zinc-700'}`}>
                            {value.name}
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Spectrum/description area - compact, close to buttons */}
              <div className="h-[20px] mb-3 mt-1 flex items-center justify-center">
                {spreadType === 'random' ? (
                  <div className="flex justify-between w-full max-w-xs text-[10px] sm:text-[9px] text-zinc-500">
                    <button
                      onClick={() => navigateSpread('left')}
                      className="hover:text-zinc-300 transition-colors cursor-pointer"
                    >
                      ← Focused
                    </button>
                    <button
                      onClick={() => navigateSpread('right')}
                      className="hover:text-zinc-300 transition-colors cursor-pointer"
                    >
                      Expansive →
                    </button>
                  </div>
                ) : spreadType === 'durable' && DURABLE_SPREADS[spreadKey] ? (
                  <p className="text-center text-zinc-500 text-[12px] sm:text-xs">{DURABLE_SPREADS[spreadKey].description}</p>
                ) : null}
              </div>

              {/* Stance Selector - same width as card count for alignment */}
              <div className="w-full max-w-lg mx-auto relative">
                <div className="relative flex items-center justify-center mb-3">
                  <span className="text-[12px] sm:text-xs text-zinc-400">Style</span>
                  <button
                    onClick={() => setHelpPopover(helpPopover === 'stanceLabel' ? null : 'stanceLabel')}
                    className="absolute right-0 w-7 h-7 sm:w-4 sm:h-4 rounded-full bg-[#f59e0b]/20 border border-[#f59e0b]/50 text-[#f59e0b] hover:bg-[#f59e0b]/30 hover:text-[#f59e0b] text-xs sm:text-[10px] flex items-center justify-center transition-all"
                  >
                    ?
                  </button>
                </div>
                {helpPopover === 'stanceLabel' && (
                  <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50 w-72">
                    <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 shadow-xl">
                      <p className="text-zinc-400 text-xs leading-relaxed">
                        Stances shape how the reading speaks to you — from quick and direct to deep and expansive.
                      </p>
                      <button
                        onClick={() => setHelpPopover(null)}
                        className="mt-3 text-xs text-zinc-500 hover:text-zinc-300 w-full text-center"
                      >
                        Got it
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex flex-col items-center stance-selector-mobile">
                  {/* All 5 stance presets on one row */}
                  <div className="flex gap-0.5 sm:gap-1.5 justify-center w-full px-0.5 sm:px-0">
                    {Object.entries(DELIVERY_PRESETS).map(([key, preset]) => {
                      const isActive = getCurrentDeliveryPreset()?.[0] === key;
                      // Shorter names for mobile
                      const mobileNames = { direct: "Direct", kind: "Kind", playful: "Playful", wise: "Wise", oracle: "Oracle" };
                      return (
                        <button
                          key={key}
                          onClick={() => applyDeliveryPreset(key)}
                          className={`flex-1 px-0.5 sm:px-2 py-2.5 sm:py-1.5 min-h-[44px] sm:min-h-0 rounded-sm text-[13px] sm:text-[11px] font-medium sm:font-normal transition-all text-center overflow-hidden ${
                            isActive
                              ? 'bg-[#2e1065] text-amber-400'
                              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 active:bg-zinc-700'
                          }`}
                        >
                          <span className="sm:hidden">{mobileNames[key]}</span>
                          <span className="hidden sm:inline">{preset.name}</span>
                        </button>
                      );
                    })}
                  </div>
                  {/* Current stance selection descriptor */}
                  <div className="text-center text-[12px] sm:text-[10px] text-zinc-500 mt-1">
                    {getCurrentDeliveryPreset()?.[1]?.descriptor || 'Custom'}
                  </div>
                  {/* Config toggle - centered */}
                  <div className="flex justify-center w-full text-[11px] sm:text-[10px] text-zinc-400 mt-0.5">
                    <button
                      onClick={() => setShowLandingFineTune(!showLandingFineTune)}
                      className="hover:text-zinc-200 active:text-zinc-200 transition-colors flex items-center gap-0.5 py-2 sm:py-0 whitespace-nowrap"
                    >
                      <span>{showLandingFineTune ? '▾' : '▸'}</span>
                      <span>Config</span>
                    </button>
                  </div>
                </div>

                {/* Fine-tune panel */}
                {showLandingFineTune && (
                  <div className="mt-3 bg-zinc-900/50 rounded-xl p-3 sm:p-4 border border-zinc-800/50">
                    {/* Complexity Selector */}
                    <div className="mb-4">
                      <div className="text-xs text-zinc-500 mb-2 text-center">Speak to me like...</div>
                      {/* All 5 voice options on one row */}
                      <div className="flex gap-1 sm:gap-2 justify-center w-full px-1 sm:px-0">
                        {Object.entries(COMPLEXITY_OPTIONS).map(([key, opt]) => (
                            <button
                              key={key}
                              onClick={() => setStance({ ...stance, complexity: key })}
                              className={`flex-1 px-0.5 sm:px-2 py-2.5 sm:py-1.5 min-h-[44px] sm:min-h-0 rounded-sm text-[8px] sm:text-xs transition-all whitespace-nowrap text-center ${
                                stance.complexity === key
                                  ? 'bg-zinc-600 text-zinc-100 border border-zinc-500'
                                  : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300 active:bg-zinc-700 border border-zinc-700/50'
                              }`}
                            >
                              {opt.label}
                            </button>
                        ))}
                      </div>
                      {/* Current voice selection descriptor */}
                      <div className="text-center text-[9px] sm:text-[10px] text-zinc-600 mt-1.5">
                        {COMPLEXITY_OPTIONS[stance.complexity]?.descriptor || ''}
                      </div>
                    </div>

                    {/* Seriousness/Tone Selector */}
                    <div className="mb-4">
                      <div className="text-xs text-zinc-500 mb-2 text-center">Tone</div>
                      <div className="flex gap-1 sm:gap-2 justify-center w-full px-1 sm:px-0">
                        {Object.entries(SERIOUSNESS_MODIFIERS).map(([key]) => (
                          <button
                            key={key}
                            onClick={() => setStance({ ...stance, seriousness: key })}
                            className={`flex-1 px-0.5 sm:px-2 py-2.5 sm:py-1.5 min-h-[44px] sm:min-h-0 rounded-sm text-[8px] sm:text-xs transition-all whitespace-nowrap text-center capitalize ${
                              stance.seriousness === key
                                ? 'bg-zinc-600 text-zinc-100 border border-zinc-500'
                                : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300 active:bg-zinc-700 border border-zinc-700/50'
                            }`}
                          >
                            {key}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Stance Grid - only the 4x4 grid */}
                    <StanceSelector
                      stance={stance}
                      setStance={setStance}
                      showCustomize={true}
                      setShowCustomize={() => {}}
                      gridOnly={true}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Question Input Section */}
            <div className="relative mb-3 mt-4">
              {/* Prompt suggestions ABOVE the input - subtle inspiration */}
              <div className={`mb-2 transition-all duration-300 ${question.trim() ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}`}>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <button
                    onClick={handleSpark}
                    className="w-6 h-6 rounded bg-[#2e1065] text-amber-400 hover:bg-[#3b1f6e] flex items-center justify-center text-[11px]"
                    title="Show a random suggestion"
                  >
                    ✨
                  </button>
                  {[0, 1].map((offset) => {
                    const idx = (suggestionIndex + offset) % SUGGESTIONS.length;
                    const suggestion = SUGGESTIONS[idx];
                    return (
                      <button
                        key={`${idx}-${suggestion.slice(0, 10)}`}
                        onClick={() => setQuestion(suggestion)}
                        className="text-[11px] sm:text-xs px-2 py-1 text-zinc-500 hover:text-zinc-300 truncate max-w-[150px] sm:max-w-[180px] transition-opacity duration-300"
                      >
                        {suggestion}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="relative">
                <textarea
                  value={question}
                  onChange={(e) => { setQuestion(e.target.value); setSparkPlaceholder(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && !loading && (e.preventDefault(), performReading())}
                  placeholder={sparkPlaceholder || (
                    spreadType === 'forge'
                      ? "What are you forging? Declare your intention..."
                      : spreadType === 'durable'
                        ? "What area of life are you examining?"
                        : "Name your question or declare your intent..."
                  )}
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 pr-10 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600 resize-none transition-colors text-[16px] sm:text-base min-h-[100px] sm:min-h-0"
                  rows={3}
                />
                <button
                  onClick={() => setHelpPopover(helpPopover === 'input' ? null : 'input')}
                  className="absolute top-3 right-3 w-6 h-6 sm:w-5 sm:h-5 rounded-full bg-[#f59e0b]/20 border border-[#f59e0b]/50 text-[#f59e0b] hover:bg-[#f59e0b]/30 hover:text-[#f59e0b] text-[10px] flex items-center justify-center transition-all"
                >
                  ?
                </button>
              </div>
              {helpPopover === 'input' && (
                <div className="absolute bottom-full right-0 mb-2 z-50 w-72">
                  <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 shadow-xl">
                    <p className="text-zinc-300 text-xs leading-relaxed">
                      Ask about anything — relationships, work, decisions, direction. Use a verb or question. The more specific you are, the more specific the reading will be.
                    </p>
                    <button
                      onClick={() => setHelpPopover(null)}
                      className="mt-3 text-xs text-zinc-400 hover:text-zinc-200 w-full text-center"
                    >
                      Got it
                    </button>
                  </div>
                </div>
              )}

              {/* Action button below input */}
              <div className="mt-3">
                <button
                  onClick={performReading}
                  disabled={loading}
                  className="w-full sm:w-auto sm:mx-auto sm:block px-8 py-3 min-h-[48px] bg-[#052e23] hover:bg-[#064e3b] disabled:bg-zinc-900 disabled:text-zinc-700 rounded-xl transition-all text-base text-[#f59e0b] font-medium border border-emerald-700/50"
                >
                  {loading ? 'Drawing...' : (spreadType === 'forge' ? 'Forge →' : spreadType === 'durable' ? 'Reflect →' : 'Discover →')}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Loading */}
        {loading && !expanding && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="relative">
              <div className="w-16 h-16 border-2 border-zinc-800 rounded-full"></div>
              <div className="absolute inset-0 w-16 h-16 border-2 border-transparent border-t-zinc-400 rounded-full animate-spin"></div>
            </div>
            <p
              className="mt-6 text-zinc-500 text-sm text-center max-w-xs transition-opacity duration-300"
              style={{ opacity: loadingPhraseVisible ? 1 : 0 }}
            >
              {loadingPhrases[loadingPhraseIndex] || ''}
            </p>
          </div>
        )}

        {/* Error */}
        {error && <div className="bg-red-950/30 border border-red-900/50 rounded-xl p-4 my-4 text-red-400 text-sm">{error}</div>}

        {/* Signatures Display */}
        {draws && !loading && (() => {
          // Signatures default to EXPANDED (only true = collapsed)
          const isSignaturesCollapsed = collapsedSections['signatures'] === true;

          return (
            <div className="mb-6">
              {/* Metadata line ABOVE buttons */}
              <div className="text-center mb-3">
                <span className="text-xs text-zinc-500 uppercase tracking-wider whitespace-nowrap">
                  {spreadType === 'durable' ? `Reflect • ${DURABLE_SPREADS[spreadKey]?.name}` : `Discover • ${RANDOM_SPREADS[spreadKey]?.name}`} • {getCurrentStanceLabel()}
                </span>
              </div>
              {/* Action buttons row */}
              <div className="flex justify-center gap-2 items-center relative mb-4">
                {parsedReading && !loading && (
                  <button onClick={exportToHTML} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1 rounded bg-zinc-800/50">Export</button>
                )}
                <button onClick={() => setShowTraditional(!showTraditional)} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1 rounded bg-zinc-800/50">{showTraditional ? 'Hide Traditional' : 'Traditional'}</button>
                <button onClick={() => setShowArchitecture(!showArchitecture)} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1 rounded bg-zinc-800/50">{showArchitecture ? 'Hide Architecture' : 'Architecture'}</button>
                <button onClick={resetReading} className="text-xs text-[#f59e0b] hover:text-yellow-300 transition-colors px-2 py-1 rounded bg-[#052e23] hover:bg-[#064e3b] border border-emerald-700/50">New</button>
                <button
                  onClick={() => setHelpPopover(helpPopover === 'actions' ? null : 'actions')}
                  className="w-4 h-4 rounded-full bg-[#f59e0b]/20 border border-[#f59e0b]/50 text-[#f59e0b] hover:bg-[#f59e0b]/30 hover:text-[#f59e0b] text-[10px] flex items-center justify-center transition-all"
                >
                  ?
                </button>
                {helpPopover === 'actions' && (
                  <div className="absolute top-full right-0 mt-2 z-50 w-64">
                    <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-3 shadow-xl text-xs">
                      <div className="space-y-1.5 text-zinc-400">
                        <p><span className="text-zinc-200">Export</span> — Download as HTML file</p>
                        <p><span className="text-zinc-200">Traditional</span> — Toggle traditional tarot names</p>
                        <p><span className="text-zinc-200">Architecture</span> — Show architectural details</p>
                        <p><span className="text-zinc-200">New</span> — Start a fresh reading</p>
                      </div>
                      <button onClick={() => setHelpPopover(null)} className="mt-2 text-zinc-500 hover:text-zinc-300 w-full text-center">Got it</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Collapsible Signatures Section */}
              <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 overflow-hidden">
                {/* Signatures Header - clickable */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-zinc-800/30 transition-colors"
                  onClick={() => toggleCollapse('signatures', false)}
                >
                  <span className={`text-xs transition-transform duration-200 ${isSignaturesCollapsed ? 'text-red-500' : 'text-emerald-500'}`} style={{ transform: isSignaturesCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>
                    ▼
                  </span>
                  <span className="text-sm font-medium text-zinc-400">
                    Signatures ({draws.length} {draws.length === 1 ? 'card' : 'cards'})
                  </span>
                </div>

                {/* Signatures Grid - collapsible */}
                {!isSignaturesCollapsed && (
                  <div className="p-4 pt-0">
                    <div className={`grid gap-4 ${
                      draws.length === 1 ? 'grid-cols-1 max-w-md mx-auto' :
                      draws.length === 3 ? 'grid-cols-1 sm:grid-cols-3' :
                      draws.length === 4 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' :
                      'grid-cols-1 sm:grid-cols-3 lg:grid-cols-5'
                    }`}>
                      {draws.map((draw, i) => <CardDisplay key={i} draw={draw} index={i} />)}
                    </div>
                  </div>
                )}
              </div>

            {/* Architecture Panel */}
            {showArchitecture && (
              <div className="mt-6 bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-4">
                <div className="text-xs text-zinc-500 uppercase tracking-wider mb-4">Architecture Details</div>
                
                <div className="space-y-4 mb-6">
                  {draws.map((draw, i) => {
                    const isDurable = spreadType === 'durable';
                    const spreadConfig = isDurable ? DURABLE_SPREADS[spreadKey] : RANDOM_SPREADS[spreadKey];
                    const trans = getComponent(draw.transient);
                    const stat = STATUSES[draw.status];
                    const pos = draw.position !== null ? ARCHETYPES[draw.position] : null;
                    const transArchetype = trans.archetype !== undefined ? ARCHETYPES[trans.archetype] : null;
                    const correction = getFullCorrection(draw.transient, draw.status);
                    const label = isDurable ? spreadConfig.frames[i].name : (pos?.name || 'Draw');
                    
                    return (
                      <div key={i} className="bg-zinc-800/30 rounded-lg p-3 text-sm">
                        <div className="text-zinc-300 font-medium mb-2">{label}</div>
                        
                        {pos && (
                          <div className="text-zinc-500 mb-2">
                            <span className="text-zinc-400">Position {draw.position}:</span> {pos.name} ({pos.traditional})
                            <br />
                            <span className="text-zinc-600">House: {pos.house} | Function: {pos.function}</span>
                          </div>
                        )}
                        
                        <div className="text-zinc-500 mb-2">
                          <span className="text-zinc-400">Transient:</span> {trans.name} ({trans.traditional})
                          {trans.type === "Bound" && (
                            <>
                              <br />
                              <span className="text-zinc-600">
                                {trans.channel} Channel | Number {trans.number} ({trans.number <= 5 ? 'Inner' : 'Outer'} Bound)
                                <br />
                                Associated Archetype: {transArchetype?.name} (Position {trans.archetype})
                              </span>
                            </>
                          )}
                          {trans.type === "Agent" && (
                            <>
                              <br />
                              <span className="text-zinc-600">
                                {trans.role} of {trans.channel}
                                <br />
                                Embodies: {transArchetype?.name} (Position {trans.archetype})
                              </span>
                            </>
                          )}
                          {trans.type === "Archetype" && (
                            <>
                              <br />
                              <span className="text-amber-400/70">Major Archetype as Transient — amplified significance</span>
                            </>
                          )}
                        </div>
                        
                        <div className="text-zinc-500">
                          <span className="text-zinc-400">Status:</span> {stat.name} ({stat.orientation})
                          {correction && draw.status !== 1 && (
                            <div className="mt-1 pl-3 border-l-2 border-zinc-700 text-zinc-600">
                              {trans.type === "Archetype" && (
                                <>
                                  {draw.status === 2 && <div>Diagonal correction: {draw.transient} ↔ {DIAGONAL_PAIRS[draw.transient]} (sum {draw.transient + DIAGONAL_PAIRS[draw.transient]}) → {ARCHETYPES[DIAGONAL_PAIRS[draw.transient]]?.name}</div>}
                                  {draw.status === 3 && <div>Vertical correction: {draw.transient} ↔ {VERTICAL_PAIRS[draw.transient]} (sum 20) → {ARCHETYPES[VERTICAL_PAIRS[draw.transient]]?.name}</div>}
                                  {draw.status === 4 && correction.targets && (
                                    <div>Reduction pair (digit sum {getDigitSum(draw.transient)}): {correction.targets.map(t => `${ARCHETYPES[t]?.name} (${t})`).join(', ')}</div>
                                  )}
                                </>
                              )}
                              {trans.type === "Bound" && correction.targetBound && (
                                <>
                                  <div>Number mirror: {correction.numberMirror} (11 - {trans.number} = {11 - trans.number})</div>
                                  <div>Channel cross ({stat.name}): {correction.channelCross}</div>
                                  <div>Target: {correction.targetBound.name} ({correction.targetBound.traditional})</div>
                                </>
                              )}
                              {trans.type === "Agent" && correction.target !== undefined && (
                                <>
                                  <div>Agent corrects through embodied Archetype ({transArchetype?.name}, position {trans.archetype})</div>
                                  {draw.status === 2 && <div>Diagonal: {trans.archetype} ↔ {DIAGONAL_PAIRS[trans.archetype]} → {ARCHETYPES[correction.target]?.name}</div>}
                                  {draw.status === 3 && <div>Vertical: {trans.archetype} ↔ {VERTICAL_PAIRS[trans.archetype]} → {ARCHETYPES[correction.target]?.name}</div>}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {draws.length > 1 && (
                  <div className="border-t border-zinc-800/50 pt-4">
                    <div className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Relationships</div>
                    <div className="text-sm text-zinc-600 space-y-1">
                      {(() => {
                        const relationships = [];
                        const isDurable = spreadType === 'durable';
                        const spreadConfig = isDurable ? DURABLE_SPREADS[spreadKey] : null;
                        
                        const houseGroups = {};
                        draws.forEach((draw, i) => {
                          const house = isDurable ? spreadConfig.frames[i].house : (draw.position !== null ? ARCHETYPES[draw.position]?.house : null);
                          if (house) {
                            if (!houseGroups[house]) houseGroups[house] = [];
                            const label = isDurable ? spreadConfig.frames[i].name : ARCHETYPES[draw.position]?.name;
                            houseGroups[house].push(label);
                          }
                        });
                        Object.entries(houseGroups).forEach(([house, cards]) => {
                          if (cards.length > 1) {
                            relationships.push(`${house} House: ${cards.join(' & ')} share domain`);
                          }
                        });
                        
                        const channelGroups = {};
                        draws.forEach((draw, i) => {
                          const trans = getComponent(draw.transient);
                          if (trans.channel) {
                            if (!channelGroups[trans.channel]) channelGroups[trans.channel] = [];
                            const label = isDurable ? spreadConfig?.frames[i].name : (draw.position !== null ? ARCHETYPES[draw.position]?.name : `Signature ${i+1}`);
                            channelGroups[trans.channel].push({ label, trans: trans.name });
                          }
                        });
                        Object.entries(channelGroups).forEach(([channel, items]) => {
                          if (items.length > 1) {
                            relationships.push(`${channel} Channel: ${items.map(it => it.trans).join(' & ')} resonate`);
                          }
                        });
                        
                        draws.forEach((draw, i) => {
                          const correction = getFullCorrection(draw.transient, draw.status);
                          if (correction) {
                            const corrTarget = correction.target !== undefined ? correction.target : 
                                             correction.targetBound?.archetype;
                            if (corrTarget !== undefined) {
                              draws.forEach((otherDraw, j) => {
                                if (i !== j) {
                                  const otherTrans = getComponent(otherDraw.transient);
                                  if (otherDraw.transient === corrTarget || otherTrans.archetype === corrTarget) {
                                    const label1 = isDurable ? spreadConfig?.frames[i].name : ARCHETYPES[draw.position]?.name;
                                    const label2 = isDurable ? spreadConfig?.frames[j].name : ARCHETYPES[otherDraw.position]?.name;
                                    relationships.push(`${label1} correction points toward ${label2}`);
                                  }
                                }
                              });
                            }
                          }
                        });
                        
                        return relationships.length > 0 ? 
                          relationships.map((r, i) => <div key={i}>• {r}</div>) : 
                          <div className="text-zinc-700">No direct structural relationships detected</div>;
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          );
        })()}

        {/* Parsed Reading Sections */}
        {parsedReading && !loading && (
          <div className="space-y-2">
                        
            {/* Your Question */}
            <div className="bg-zinc-800/50 rounded-xl p-4 mb-4 mx-8">
              <div className="text-[10px] text-zinc-500 tracking-wider mb-2">Your question or intention</div>
              <div className="text-zinc-300 text-sm">{question}</div>
            </div>
            
            {/* Summary Section - expanded by default, collapsible */}
            {parsedReading.summary && (() => {
              const isSummaryCollapsed = collapsedSections['summary'] === true; // expanded by default
              return (
                <ReadingSection
                  type="summary"
                  content={parsedReading.summary}
                  question={question}
                  expansions={expansions}
                  expanding={expanding}
                  onExpand={handleExpand}
                  showTraditional={showTraditional}
                  spreadType={spreadType}
                  spreadKey={spreadKey}
                  setSelectedInfo={setSelectedInfo}
                  isCollapsed={isSummaryCollapsed}
                  onToggleCollapse={() => toggleCollapse('summary', false)}
                  selectedOperation={threadOperations['summary'] || null}
                  onOperationSelect={(op) => setThreadOperations(prev => ({ ...prev, summary: op }))}
                  operationContext={threadContexts['summary'] || ''}
                  onContextChange={(ctx) => setThreadContexts(prev => ({ ...prev, summary: ctx }))}
                  onContinue={() => continueThread('summary')}
                  threadLoading={threadLoading['summary'] || false}
                  threadData={threadData['summary'] || []}
                />
              );
            })()}
            
            {/* Signature Sections with nested Rebalancers - collapsed by default */}
            {parsedReading.cards.map((card) => {
              const correction = parsedReading.corrections.find(c => c.cardIndex === card.index);
              const cardSectionKey = `card:${card.index}`;
              const corrSectionKey = `correction:${card.index}`;
              // Default: cards collapsed, corrections collapsed
              const isCardCollapsed = collapsedSections[cardSectionKey] !== false; // true by default
              const isCorrCollapsed = collapsedSections[corrSectionKey] !== false; // true by default
              return (
                <div key={`card-group-${card.index}`} id={`content-${card.index}`}>
                  <ReadingSection
                    type="card"
                    index={card.index}
                    content={card.content}
                    draw={draws[card.index]}
                    question={question}
                    expansions={expansions}
                    expanding={expanding}
                    onExpand={handleExpand}
                    showTraditional={showTraditional}
                    spreadType={spreadType}
                    spreadKey={spreadKey}
                    setSelectedInfo={setSelectedInfo}
                    onHeaderClick={() => {
                      // Expand signatures section if collapsed
                      if (collapsedSections['signatures'] === true) {
                        setCollapsedSections(prev => ({ ...prev, signatures: false }));
                      }
                      // Scroll to the card
                      setTimeout(() => {
                        document.getElementById(`card-${card.index}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }, 50);
                    }}
                    correction={correction}
                    isCollapsed={isCardCollapsed}
                    onToggleCollapse={() => toggleCollapse(cardSectionKey, true)}
                    isCorrectionCollapsed={isCorrCollapsed}
                    onToggleCorrectionCollapse={() => toggleCollapse(corrSectionKey, true)}
                    // Thread props (Phase 2)
                    threadData={threadData[card.index] || []}
                    selectedOperation={threadOperations[card.index] || null}
                    onOperationSelect={(op) => setThreadOperations(prev => ({ ...prev, [card.index]: op }))}
                    operationContext={threadContexts[card.index] || ''}
                    onContextChange={(ctx) => setThreadContexts(prev => ({ ...prev, [card.index]: ctx }))}
                    onContinue={() => continueThread(card.index)}
                    threadLoading={threadLoading[card.index] || false}
                    // Nested thread props (Phase 2 polish)
                    threadOperations={threadOperations}
                    setThreadOperations={setThreadOperations}
                    threadContexts={threadContexts}
                    setThreadContexts={setThreadContexts}
                    threadLoadingMap={threadLoading}
                    onContinueThread={continueNestedThread}
                    collapsedThreads={collapsedThreads}
                    setCollapsedThreads={setCollapsedThreads}
                  />
                </div>
              );
            })}

            {/* Rebalancer Summary - Only when 2+ imbalanced, collapsed by default */}
            {parsedReading.rebalancerSummary && (() => {
              const pathExpansions = expansions['path'] || {};
              const isPathExpanding = expanding?.section === 'path';
              const isPathCollapsed = collapsedSections['path'] !== false; // true by default

              return (
                <div className="mb-6 rounded-xl border-2 border-emerald-500/60 overflow-hidden" style={{background: 'linear-gradient(to bottom right, rgba(6, 78, 59, 0.3), rgba(16, 185, 129, 0.15))'}}>
                  <div className="p-5">
                    {/* Path Header - clickable for collapse */}
                    <div
                      className={`flex items-center gap-3 cursor-pointer ${!isPathCollapsed ? 'mb-4' : ''}`}
                      onClick={() => toggleCollapse('path', true)}
                    >
                      <span className={`text-xs transition-transform duration-200 ${isPathCollapsed ? 'text-red-500' : 'text-emerald-500'}`} style={{ transform: isPathCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>
                        ▼
                      </span>
                      <span className="text-lg">◈</span>
                      <span className="text-sm font-medium text-emerald-400 uppercase tracking-wider">Path to Balance</span>
                    </div>

                    {/* Path Content - collapsible */}
                    {!isPathCollapsed && (
                      <>
                        <div className="text-zinc-300 leading-relaxed whitespace-pre-wrap text-sm mb-4">
                          {parsedReading.rebalancerSummary}
                        </div>

                        {/* Path Expansion Buttons */}
                        <div className="flex gap-2 flex-wrap">
                          {Object.entries(EXPANSION_PROMPTS).map(([key, { label }]) => {
                            const isThisExpanding = isPathExpanding && expanding?.type === key;
                            const hasExpansion = !!pathExpansions[key];
                            const isExpandingOther = expanding && !isThisExpanding;

                            return (
                              <button
                                key={key}
                                onClick={(e) => { e.stopPropagation(); handleExpand('path', key); }}
                                disabled={expanding}
                                className={`text-xs px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                                  hasExpansion
                                    ? 'bg-emerald-800/50 text-emerald-200 border border-emerald-600/50'
                                    : 'bg-zinc-800/50 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                                } ${isExpandingOther ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                {isThisExpanding && (
                                  <span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></span>
                                )}
                                {label}
                              </button>
                            );
                          })}
                        </div>

                        {/* Path Expansion Content */}
                        {Object.entries(pathExpansions).map(([expType, expContent]) => (
                          <div key={expType} className="mt-4 pt-4 border-t border-emerald-700/50">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-xs uppercase tracking-wider text-emerald-500/70">
                                {EXPANSION_PROMPTS[expType]?.label}
                              </span>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleExpand('path', expType, true); }}
                                className="text-xs text-zinc-600 hover:text-zinc-400"
                              >
                                ×
                              </button>
                            </div>
                            <div className="text-sm leading-relaxed whitespace-pre-wrap text-zinc-400">
                              {expContent}
                            </div>
                          </div>
                        ))}

                        {/* Path Reflect/Forge Operations */}
                        <div className="border-t border-emerald-700/50 mt-5 pt-5">
                          {/* Collapsed state: show [▶ Reflect] [▶ Forge] on one line */}
                          {!threadOperations['path'] && (
                            <div className="flex justify-center gap-3">
                              <button
                                onClick={(e) => { e.stopPropagation(); setThreadOperations(prev => ({ ...prev, path: 'reflect' })); }}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:text-zinc-200 hover:border-zinc-600 flex items-center gap-1.5"
                              >
                                <span className="text-[10px] text-red-500">▶</span> Reflect
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setThreadOperations(prev => ({ ...prev, path: 'forge' })); }}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:text-zinc-200 hover:border-zinc-600 flex items-center gap-1.5"
                              >
                                <span className="text-[10px] text-red-500">▶</span> Forge
                              </button>
                            </div>
                          )}

                          {/* Expanded state: show full panel with selected operation */}
                          {threadOperations['path'] && (
                            <div className="max-w-xs mx-auto">
                              <div className="flex justify-center gap-4 mb-4">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setThreadOperations(prev => ({ ...prev, path: 'reflect' })); }}
                                  className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                    threadOperations['path'] === 'reflect'
                                      ? 'bg-sky-900/60 text-sky-300 border-2 border-sky-500/60'
                                      : 'bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:text-zinc-200 hover:border-zinc-600'
                                  }`}
                                >
                                  Reflect
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setThreadOperations(prev => ({ ...prev, path: 'forge' })); }}
                                  className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                    threadOperations['path'] === 'forge'
                                      ? 'bg-orange-900/60 text-orange-300 border-2 border-orange-500/60'
                                      : 'bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:text-zinc-200 hover:border-zinc-600'
                                  }`}
                                >
                                  Forge
                                </button>
                              </div>

                              {/* Context Input */}
                              <div className="mb-4">
                                <textarea
                                  value={threadContexts['path'] || ''}
                                  onChange={(e) => setThreadContexts(prev => ({ ...prev, path: e.target.value }))}
                                  onClick={(e) => e.stopPropagation()}
                                  placeholder="Add context (optional)..."
                                  rows={2}
                                  className="w-full bg-zinc-900/50 border border-zinc-700/50 rounded-lg px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors resize-none"
                                />
                              </div>

                              {/* Continue Button */}
                              <div className="flex justify-center">
                                <button
                                  onClick={(e) => { e.stopPropagation(); continueThread('path'); }}
                                  disabled={!threadOperations['path'] || threadLoading['path']}
                                  className={`w-full px-6 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                                    threadOperations['path'] && !threadLoading['path']
                                      ? 'bg-[#052e23] text-[#f59e0b] hover:bg-[#064e3b] border border-emerald-700/50'
                                      : 'bg-zinc-900 text-zinc-600 cursor-not-allowed'
                                  }`}
                                >
                                  {threadLoading['path'] ? (
                                    <>
                                      <span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></span>
                                      Drawing...
                                    </>
                                  ) : (
                                    'Continue'
                                  )}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Thread Results for Path */}
                          {threadData['path'] && threadData['path'].length > 0 && (
                            <div className="mt-5 space-y-4">
                              {threadData['path'].map((threadItem, threadIndex) => {
                                const isReflect = threadItem.operation === 'reflect';
                                // Both Reflect and Forge draw new cards
                                const trans = getComponent(threadItem.draw.transient);
                                const stat = STATUSES[threadItem.draw.status];
                                const statusPrefix = stat.prefix || 'Balanced';
                                return (
                                  <div key={threadIndex} className={`rounded-lg p-4 ${isReflect ? 'border border-sky-500/30 bg-sky-950/20' : 'border border-orange-500/30 bg-orange-950/20'}`}>
                                    {/* Header with operation type */}
                                    <div className="flex items-center gap-2 mb-3">
                                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${isReflect ? 'bg-sky-500/20 text-sky-400' : 'bg-orange-500/20 text-orange-400'}`}>
                                        {isReflect ? '↩ Reflect' : '⚡ Forge'}
                                      </span>
                                    </div>
                                    {/* User's input quote */}
                                    {threadItem.context && (
                                      <div className={`text-xs italic mb-3 pl-3 border-l-2 ${isReflect ? 'border-sky-500/50 text-sky-300/70' : 'border-orange-500/50 text-orange-300/70'}`}>
                                        "{threadItem.context}"
                                      </div>
                                    )}
                                    {/* Card info - both Reflect and Forge draw cards, with clickable terms */}
                                    <div className="flex items-center gap-2 mb-2">
                                      <span
                                        className={`text-xs px-2 py-0.5 rounded-full cursor-pointer hover:ring-1 hover:ring-white/30 ${STATUS_COLORS[threadItem.draw.status]}`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedInfo({ type: 'status', id: threadItem.draw.status, data: STATUS_INFO[threadItem.draw.status] });
                                        }}
                                      >
                                        {stat.name}
                                      </span>
                                      <span className="text-sm font-medium text-zinc-200">
                                        <span
                                          className="cursor-pointer hover:underline decoration-dotted underline-offset-2"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedInfo({ type: 'status', id: threadItem.draw.status, data: STATUS_INFO[threadItem.draw.status] });
                                          }}
                                        >
                                          {statusPrefix}
                                        </span>
                                        {statusPrefix && ' '}
                                        <span
                                          className="cursor-pointer hover:underline decoration-dotted underline-offset-2 text-amber-300/90"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedInfo({ type: 'card', id: threadItem.draw.transient, data: getComponent(threadItem.draw.transient) });
                                          }}
                                        >
                                          {trans.name}
                                        </span>
                                      </span>
                                    </div>
                                    {showTraditional && trans && (
                                      <div className="text-xs text-zinc-500 mb-2">{trans.traditional}</div>
                                    )}
                                    {/* Response with hotlinks */}
                                    <div className="text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap">
                                      {renderWithHotlinks(threadItem.interpretation, setSelectedInfo)}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Letter Section - expanded by default, collapsible */}
            {parsedReading.letter && (() => {
              const isLetterCollapsed = collapsedSections['letter'] === true; // expanded by default
              return (
                <ReadingSection
                  type="letter"
                  content={parsedReading.letter}
                  question={question}
                  expansions={expansions}
                  expanding={expanding}
                  onExpand={handleExpand}
                  showTraditional={showTraditional}
                  spreadType={spreadType}
                  spreadKey={spreadKey}
                  setSelectedInfo={setSelectedInfo}
                  isCollapsed={isLetterCollapsed}
                  onToggleCollapse={() => toggleCollapse('letter', false)}
                  selectedOperation={threadOperations['letter'] || null}
                  onOperationSelect={(op) => setThreadOperations(prev => ({ ...prev, letter: op }))}
                  operationContext={threadContexts['letter'] || ''}
                  onContextChange={(ctx) => setThreadContexts(prev => ({ ...prev, letter: ctx }))}
                  onContinue={() => continueThread('letter')}
                  threadLoading={threadLoading['letter'] || false}
                  threadData={threadData['letter'] || []}
                />
              );
            })()}
            
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Follow-up Messages */}
        {followUpMessages.length > 0 && (
          <div className="space-y-4 mt-6">
            {followUpMessages.map((msg, i) => (
              <div key={i} className={`rounded-xl p-4 ${msg.role === 'user' ? 'bg-zinc-800/50 ml-8' : 'bg-zinc-900/50 border border-zinc-800/50'}`}>
                {msg.role === 'user' && <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">Follow-up</div>}
                <div className="text-zinc-300 leading-relaxed whitespace-pre-wrap text-sm">{msg.content}</div>
              </div>
            ))}
          </div>
        )}

        {/* Follow-up Input */}
        {parsedReading && !loading && (
          <div className="mt-6 pt-4 border-t border-zinc-800/50 relative">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] text-zinc-500 tracking-wider">Continue the conversation</span>
              <button
                onClick={() => setHelpPopover(helpPopover === 'followup' ? null : 'followup')}
                className="w-4 h-4 rounded-full bg-[#f59e0b]/20 border border-[#f59e0b]/50 text-[#f59e0b] hover:bg-[#f59e0b]/30 hover:text-[#f59e0b] text-[10px] flex items-center justify-center transition-all"
              >
                ?
              </button>
              {helpPopover === 'followup' && (
                <div className="absolute top-8 left-0 z-50 w-72">
                  <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-3 shadow-xl">
                    <p className="text-zinc-400 text-xs leading-relaxed">
                      Ask anything — dig deeper, challenge it, ask about a specific part, or take the conversation wherever you need.
                    </p>
                    <button onClick={() => setHelpPopover(null)} className="mt-2 text-xs text-zinc-500 hover:text-zinc-300 w-full text-center">Got it</button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2 items-center">
              <input type="text" value={followUp} onChange={(e) => setFollowUp(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !followUpLoading && sendFollowUp()}
                placeholder={followUpLoading ? "Thinking..." : "Ask a follow-up question..."}
                disabled={followUpLoading}
                className="flex-1 min-w-0 bg-zinc-900/50 border border-zinc-700/50 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors text-sm disabled:opacity-50" />
              <button onClick={sendFollowUp} disabled={followUpLoading || !followUp.trim()}
                className="flex-shrink-0 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-700 border border-zinc-600 px-6 py-3 rounded-xl transition-all flex items-center justify-center min-w-[52px] text-zinc-200">
                {followUpLoading ? (
                  <div className="w-4 h-4 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin"></div>
                ) : '→'}
              </button>
            </div>
          </div>
        )}

        {/* Adjust Stance - at the bottom */}
        {parsedReading && !loading && (
          <div className="mt-6 relative">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowMidReadingStance(!showMidReadingStance)}
                className={`flex-1 text-left px-4 py-3 rounded-xl transition-all ${
                  showMidReadingStance
                    ? 'bg-zinc-800/50 border border-zinc-700/50'
                    : 'bg-zinc-900/30 border border-zinc-800/30 hover:bg-zinc-900/50 hover:border-zinc-700/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-zinc-300">
                      {showMidReadingStance ? '▾' : '▸'} Adjust Stance
                    </span>
                    <span className="text-xs text-zinc-600 ml-2">
                      {getCurrentDeliveryPreset()?.[1]?.name || 'Custom'}
                    </span>
                  </div>
                  <span className="text-xs text-zinc-500">
                    {showMidReadingStance ? 'collapse' : 'change depth & style'}
                  </span>
                </div>
              </button>
              <button
                onClick={() => setHelpPopover(helpPopover === 'stance' ? null : 'stance')}
                className="w-6 h-6 rounded-full bg-[#f59e0b]/20 border border-[#f59e0b]/50 text-[#f59e0b] hover:bg-[#f59e0b]/30 hover:text-[#f59e0b] text-xs flex items-center justify-center transition-all flex-shrink-0"
              >
                ?
              </button>
            </div>
            {helpPopover === 'stance' && (
              <div className="absolute top-full right-0 mt-2 z-50 w-72">
                <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 shadow-xl">
                  <p className="text-zinc-400 text-xs leading-relaxed">
                    Stances shape how the reading speaks to you — from quick and direct to deep and expansive. Use Config to customize voice, focus, density, scope, and tone.
                  </p>
                  <button
                    onClick={() => setHelpPopover(null)}
                    className="mt-3 text-xs text-zinc-500 hover:text-zinc-300 w-full text-center"
                  >
                    Got it
                  </button>
                </div>
              </div>
            )}

            {showMidReadingStance && (
              <div className="mt-3 bg-zinc-900/30 rounded-xl border border-zinc-800/30 p-4">
                {/* Delivery Presets Row */}
                <div className="mb-4 w-full max-w-lg mx-auto">
                  <div className="flex flex-col items-center">
                    {/* All 5 stance buttons on one row - no wrap */}
                    <div className="flex gap-1.5 justify-center flex-nowrap">
                      {Object.entries(DELIVERY_PRESETS).map(([key, preset]) => {
                        const isActive = getCurrentDeliveryPreset()?.[0] === key;
                        return (
                          <button
                            key={key}
                            onClick={() => applyDeliveryPreset(key)}
                            className={`px-2 py-1.5 rounded-lg text-[11px] transition-all whitespace-nowrap ${
                              isActive
                                ? 'bg-[#2e1065] text-amber-400'
                                : 'bg-zinc-800/50 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                            }`}
                          >
                            {preset.name}
                          </button>
                        );
                      })}
                    </div>
                    {/* Config toggle - centered */}
                    <div className="flex justify-center w-full text-[10px] text-zinc-500 mt-1.5">
                      <button
                        onClick={() => setShowFineTune(!showFineTune)}
                        className="hover:text-zinc-300 transition-colors flex items-center gap-1"
                      >
                        <span>{showFineTune ? '▾' : '▸'}</span>
                        <span>Config</span>
                      </button>
                    </div>
                  </div>
                </div>

                {showFineTune && (
                    <div className="mt-3 space-y-3">
                      {/* Complexity Selector - centered */}
                      <div className="text-center">
                        <div className="text-[10px] text-zinc-500 mb-2">Speak to me like...</div>
                        <div className="flex flex-wrap gap-2 justify-center">
                          {Object.entries(COMPLEXITY_OPTIONS).map(([key, opt]) => (
                            <button
                              key={key}
                              onClick={() => setStance({ ...stance, complexity: key })}
                              className={`px-2 py-1 rounded text-xs transition-all ${
                                stance.complexity === key
                                  ? 'bg-zinc-700 text-zinc-100'
                                  : 'bg-zinc-800/50 text-zinc-500 hover:text-zinc-300'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Seriousness/Tone Selector */}
                      <div className="text-center">
                        <div className="text-[10px] text-zinc-500 mb-2">Tone</div>
                        <div className="flex flex-wrap gap-2 justify-center">
                          {Object.entries(SERIOUSNESS_MODIFIERS).map(([key]) => (
                            <button
                              key={key}
                              onClick={() => setStance({ ...stance, seriousness: key })}
                              className={`px-2 py-1 rounded text-xs transition-all capitalize ${
                                stance.seriousness === key
                                  ? 'bg-zinc-700 text-zinc-100'
                                  : 'bg-zinc-800/50 text-zinc-500 hover:text-zinc-300'
                              }`}
                            >
                              {key}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Stance Grid */}
                      <StanceSelector
                        stance={stance}
                        setStance={setStance}
                        showCustomize={true}
                        setShowCustomize={() => {}}
                        compact={true}
                      />
                    </div>
                )}

                {/* Re-interpret Button */}
                <div className="mt-4 pt-3 border-t border-zinc-800/50">
                  <button
                    onClick={reinterpret}
                    className="w-full bg-[#052e23] hover:bg-[#064e3b] text-[#f59e0b] py-2 rounded-lg text-sm transition-colors border border-emerald-700/50"
                  >
                    Re-interpret with new settings
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-zinc-800 text-[10px] mt-8 tracking-wider">The structure is the authority. Encounter precedes understanding.</p>
      </div>

      {/* Info Modal */}
      <InfoModal info={selectedInfo} onClose={() => setSelectedInfo(null)} setSelectedInfo={setSelectedInfo} />
    </div>
  );
}
