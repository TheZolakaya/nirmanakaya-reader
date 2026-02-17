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
// Derived from the Nirmanakaya architecture: 5 Houses × 4 Stages = 20 frames
// Each spread sits at a House × Stage coordinate with a presiding archetype.
// Positions never diagnose — they locate. Status reveals condition.
//
// STRUCTURAL KEY:
//   Count 1 = Seed stage    | Count 2 = Medium stage
//   Count 3 = Fruition stage | Count 4 = Feedback stage
//   Houses: Gestalt, Spirit, Mind, Emotion, Body
//
// 22 archetypes mapped: 20 spreads + 2 modes (Discover=Fortune/10, Forge=Creation/21)

export const REFLECT_SPREADS = {

  // ╔══════════════════════════════════════════════════════════════╗
  // ║  COUNT 1 — SEEDS                                           ║
  // ║  "What's the single most important thing right now?"        ║
  // ╚══════════════════════════════════════════════════════════════╝

  'gestalt-1': {
    id: 'gestalt-1',
    name: 'Pulse',
    count: 1,
    positions: [
      {
        id: 1,
        name: "What Matters Most",
        lens: "This signature is the single most active signal across your whole life right now. Read it as: the one thing with the most energy — whether it's flowing or stuck. Don't narrow — this is the big picture reduced to one pulse."
      }
    ],
    whenToUse: "When you need one clear signal about everything",
    whatYoullSee: "The one thing that needs your attention most",
    // Structural metadata
    house: 'gestalt',
    stage: 'seed',
    element: 'fire',
    archetype: { number: 0, verb: 'Potential', traditional: 'The Fool' },
    concern: null
  },

  'spirit-1': {
    id: 'spirit-1',
    name: 'Spark',
    count: 1,
    positions: [
      {
        id: 1,
        name: "What's Alive",
        lens: "This signature is what's most alive in your sense of meaning and purpose right now. Read it as: where inspiration, direction, or creative energy lives — even if it's quiet. This is about what matters to you at the deepest level."
      }
    ],
    whenToUse: "When meaning feels like the question",
    whatYoullSee: "Where meaning is right now — loud, quiet, or somewhere between",
    house: 'spirit',
    stage: 'seed',
    element: 'air',
    archetype: { number: 2, verb: 'Wisdom', traditional: 'The High Priestess' },
    bridge: 'The Listener',
    concern: 'meaninglessness'
  },

  'mind-1': {
    id: 'mind-1',
    name: 'Lens',
    count: 1,
    positions: [
      {
        id: 1,
        name: "What's Clear",
        lens: "This signature is the single clearest signal about your thinking, your choices, and your understanding right now. Read it as: the one thought or insight that stands above the rest. This is about agency and clarity."
      }
    ],
    whenToUse: "When you want one clear signal about how you're thinking",
    whatYoullSee: "The one thing that's actually clear about your situation",
    house: 'mind',
    stage: 'seed',
    element: 'fire',
    archetype: { number: 4, verb: 'Order', traditional: 'The Emperor' },
    bridge: 'The Commander',
    concern: 'freedom'
  },

  'emotion-1': {
    id: 'emotion-1',
    name: 'Heart',
    count: 1,
    positions: [
      {
        id: 1,
        name: "What You're Feeling",
        lens: "This signature is what's most active in your emotional and relational life right now. Read it as: the one feeling, connection, or relational signal that matters most. This is about love, belonging, and how you connect."
      }
    ],
    whenToUse: "When your heart is loud and you need to hear the one thing",
    whatYoullSee: "The one feeling that matters most right now",
    house: 'emotion',
    stage: 'seed',
    element: 'water',
    archetype: { number: 6, verb: 'Compassion', traditional: 'The Lovers' },
    bridge: 'The Empath',
    concern: 'isolation'
  },

  'body-1': {
    id: 'body-1',
    name: 'Ground',
    count: 1,
    positions: [
      {
        id: 1,
        name: "What's Solid",
        lens: "This signature is what's most real and solid in your material, physical, practical life right now. Read it as: the one thing you can actually count on. This is about action, health, endurance, and what's working in reality."
      }
    ],
    whenToUse: "When you want to check what's solid in your life",
    whatYoullSee: "What you can actually count on right now",
    house: 'body',
    stage: 'seed',
    element: 'earth',
    archetype: { number: 8, verb: 'Fortitude', traditional: 'Strength' },
    bridge: 'The Enduring',
    concern: 'death'
  },

  // ╔══════════════════════════════════════════════════════════════╗
  // ║  COUNT 2 — MEDIUMS                                         ║
  // ║  "What's the core tension in this domain?"                  ║
  // ╚══════════════════════════════════════════════════════════════╝

  'gestalt-2': {
    id: 'gestalt-2',
    name: 'Balance',
    count: 2,
    positions: [
      {
        id: 1,
        name: "Inside",
        lens: "This signature is how your inner state is expressing — your alignment with your own direction, your internal coherence. Read it as: what's happening inside you right now."
      },
      {
        id: 2,
        name: "Outside",
        lens: "This signature is how your outer life is meeting you — what's showing up in your world as a result of your inner state. Read it as: what's happening around you right now."
      }
    ],
    whenToUse: "When you want to see how your inner world and outer life relate",
    whatYoullSee: "Whether your inner world and outer life match — or where the gap is",
    house: 'gestalt',
    stage: 'medium',
    element: 'earth',
    archetype: { number: 1, verb: 'Will', traditional: 'The Magician' },
    concern: null
  },

  'spirit-2': {
    id: 'spirit-2',
    name: 'Purpose',
    count: 2,
    positions: [
      {
        id: 1,
        name: "What You're Looking For",
        lens: "This signature is how your search for meaning is expressing right now. Read it as: what you're hungry for, reaching toward, or haven't found yet. The seeking energy."
      },
      {
        id: 2,
        name: "What You Already Have",
        lens: "This signature is how your found meaning is expressing right now. Read it as: what's already landed, what you can stand on, the meaning that's already here — even if you're not seeing it."
      }
    ],
    whenToUse: "When you're navigating between seeking and settling",
    whatYoullSee: "How your seeking and your found meaning relate to each other",
    house: 'spirit',
    stage: 'medium',
    element: 'earth',
    archetype: { number: 3, verb: 'Nurturing', traditional: 'The Empress' },
    bridge: 'The Gardener',
    concern: 'meaninglessness'
  },

  'mind-2': {
    id: 'mind-2',
    name: 'Clarity',
    count: 2,
    positions: [
      {
        id: 1,
        name: "Where You're Free",
        lens: "This signature is how your sense of open possibility is expressing right now. Read it as: where you feel unconstrained, capable of choosing, free to move."
      },
      {
        id: 2,
        name: "Where You're Structured",
        lens: "This signature is how your frameworks, rules, and commitments are expressing right now. Read it as: where you have ground to stand on, systems that hold you, structures you've built."
      }
    ],
    whenToUse: "When you're torn between letting go and locking in",
    whatYoullSee: "How freedom and structure are sitting with each other right now",
    house: 'mind',
    stage: 'medium',
    element: 'water',
    archetype: { number: 5, verb: 'Culture', traditional: 'The Hierophant' },
    bridge: 'The Tribalist',
    concern: 'freedom'
  },

  'emotion-2': {
    id: 'emotion-2',
    name: 'Connection',
    count: 2,
    positions: [
      {
        id: 1,
        name: "You",
        lens: "This signature is how you're showing up in this relationship or dynamic. Read it as: your energy, your stance, what you're bringing to the space between you and another."
      },
      {
        id: 2,
        name: "Them",
        lens: "This signature is how the other person or force is showing up. Read it as: their energy as you're experiencing it, what's coming toward you from outside yourself."
      }
    ],
    whenToUse: "When you need to see both sides of any relationship",
    whatYoullSee: "How you're actually showing up and how they actually are — separate, clear",
    house: 'emotion',
    stage: 'medium',
    element: 'fire',
    archetype: { number: 7, verb: 'Drive', traditional: 'The Chariot' },
    bridge: 'The Pursuer',
    concern: 'isolation'
  },

  'body-2': {
    id: 'body-2',
    name: 'Stability',
    count: 2,
    positions: [
      {
        id: 1,
        name: "What You're Carrying",
        lens: "This signature is where your sustained effort lives right now — the endurance, persistence, and structure you're maintaining. Read it as: what you're currently holding up."
      },
      {
        id: 2,
        name: "What You're Setting Down",
        lens: "This signature is where letting go is active right now — the sacrifice, completion, or surrender in motion. Read it as: what's in the process of being released."
      }
    ],
    whenToUse: "When you want to see the balance between holding on and letting go",
    whatYoullSee: "How your carrying and your releasing are sitting with each other",
    house: 'body',
    stage: 'medium',
    element: 'air',
    archetype: { number: 9, verb: 'Discipline', traditional: 'The Hermit' },
    bridge: 'The Disciplined',
    concern: 'death'
  },

  // ╔══════════════════════════════════════════════════════════════╗
  // ║  COUNT 3 — FRUITIONS                                       ║
  // ║  "Where has this been, where is it, where is it going?"     ║
  // ╚══════════════════════════════════════════════════════════════╝

  'gestalt-3': {
    id: 'gestalt-3',
    name: 'Arc',
    count: 3,
    positions: [
      {
        id: 1,
        name: "Where Things Stand",
        lens: "This signature is the current state of affairs across your whole life. Read it as: where things are right now — the honest snapshot."
      },
      {
        id: 2,
        name: "What's Shifting",
        lens: "This signature is what's actively changing or in motion across your life. Read it as: what's moving, what's unstable, what's in transition."
      },
      {
        id: 3,
        name: "Where It Leads",
        lens: "This signature is where the current movement wants to resolve. Read it as: how this arc wants to complete — not a prediction, but the trajectory of right now."
      }
    ],
    whenToUse: "When something is changing and you need to see the shape of it",
    whatYoullSee: "The full movement — where it is, what's changing, how it resolves",
    house: 'gestalt',
    stage: 'fruition',
    element: 'air',
    archetype: { number: 19, verb: 'Actualization', traditional: 'The Sun' },
    concern: null
  },

  'spirit-3': {
    id: 'spirit-3',
    name: 'Creation',
    count: 3,
    positions: [
      {
        id: 1,
        name: "The Spark",
        lens: "This signature is the origin impulse of what you're creating or becoming. Read it as: what started this — the initial inspiration, the seed that was planted."
      },
      {
        id: 2,
        name: "The Work",
        lens: "This signature is how the creation is developing right now. Read it as: what you're doing with the spark — the effort, the process, the tending."
      },
      {
        id: 3,
        name: "What's Emerging",
        lens: "This signature is what's coming into form as a result. Read it as: what the effort is actually producing — what's being born."
      }
    ],
    whenToUse: "When you're making something and want to see how it's going",
    whatYoullSee: "Whether the original impulse, the current work, and what's emerging are aligned",
    house: 'spirit',
    stage: 'fruition',
    element: 'fire',
    archetype: { number: 17, verb: 'Inspiration', traditional: 'The Star' },
    bridge: 'The Radiant',
    concern: 'meaninglessness'
  },

  'mind-3': {
    id: 'mind-3',
    name: 'Pattern',
    count: 3,
    positions: [
      {
        id: 1,
        name: "What You See",
        lens: "This signature is what you're perceiving right now — the patterns, systems, truths, or problems visible to you. Read it as: what's in front of you."
      },
      {
        id: 2,
        name: "What It Means",
        lens: "This signature is how you're making sense of what you see — your understanding, your insight, your interpretation. Read it as: what you're working out."
      },
      {
        id: 3,
        name: "What Opens Up",
        lens: "This signature is what becomes available when seeing meets understanding. Read it as: the possibilities that emerge from clarity — what action looks like from here."
      }
    ],
    whenToUse: "When you want to trace a pattern from seeing to understanding to action",
    whatYoullSee: "The chain from seeing to understanding to possibility — and how the links connect",
    house: 'mind',
    stage: 'fruition',
    element: 'air',
    archetype: { number: 15, verb: 'Abstraction', traditional: 'The Devil' },
    bridge: 'The Analyst',
    concern: 'freedom'
  },

  'emotion-3': {
    id: 'emotion-3',
    name: 'Love',
    count: 3,
    positions: [
      {
        id: 1,
        name: "What You Feel",
        lens: "This signature is the raw emotional signal — what's alive in your heart right now. Read it as: the feeling itself, before interpretation."
      },
      {
        id: 2,
        name: "What It Means",
        lens: "This signature is what the feeling is about — the pattern underneath the emotion. Read it as: why you're feeling this, what it connects to."
      },
      {
        id: 3,
        name: "Where It's Going",
        lens: "This signature is where the feeling wants to move. Read it as: what's changing or wants to change in how you connect, relate, or love."
      }
    ],
    whenToUse: "When you want to follow how a feeling moves — from signal to meaning to direction",
    whatYoullSee: "The feeling, what it's about, and where it wants to move",
    house: 'emotion',
    stage: 'fruition',
    element: 'earth',
    archetype: { number: 13, verb: 'Change', traditional: 'Death' },
    bridge: 'The Transformer',
    concern: 'isolation'
  },

  'body-3': {
    id: 'body-3',
    name: 'Foundation',
    count: 3,
    positions: [
      {
        id: 1,
        name: "What Supports You",
        lens: "This signature is your foundation — what's underneath, holding things up. Read it as: your base, the ground you're standing on, what you can rely on."
      },
      {
        id: 2,
        name: "What You're Putting In",
        lens: "This signature is your current effort — the work, discipline, and energy you're applying. Read it as: what you're actually doing, day to day."
      },
      {
        id: 3,
        name: "What's Taking Shape",
        lens: "This signature is what's actually being built by your effort. Read it as: the result — what's forming in reality as a consequence of your foundation and your work."
      }
    ],
    whenToUse: "When you want to see how foundation, effort, and results connect",
    whatYoullSee: "Whether your foundation, your effort, and what you're building are aligned",
    house: 'body',
    stage: 'fruition',
    element: 'water',
    archetype: { number: 11, verb: 'Equity', traditional: 'Justice' },
    bridge: 'The Just',
    concern: 'death'
  },

  // ╔══════════════════════════════════════════════════════════════╗
  // ║  COUNT 4 — FEEDBACKS (The Four Channels)                   ║
  // ║  "How is each channel expressing in this domain?"           ║
  // ║  Lens text includes Sixteen Bridges content for AI depth.   ║
  // ╚══════════════════════════════════════════════════════════════╝

  'gestalt-4': {
    id: 'gestalt-4',
    name: 'Wholeness',
    count: 4,
    positions: [
      {
        id: 1,
        name: "Meaning",
        lens: "This signature is how your Spirit house is expressing — your sense of purpose, meaning, and inspiration right now. Read it as: where you are with the question 'Does my life have direction?' When this is flowing, you feel oriented and creative. When it's strained, things feel pointless or scattered."
      },
      {
        id: 2,
        name: "Clarity",
        lens: "This signature is how your Mind house is expressing — your thinking, choices, and understanding right now. Read it as: where you are with the question 'Can I think clearly and act freely?' When this is flowing, you feel sharp and decisive. When it's strained, you feel foggy, stuck, or overwhelmed by options."
      },
      {
        id: 3,
        name: "Connection",
        lens: "This signature is how your Emotion house is expressing — your feelings, relationships, and sense of belonging right now. Read it as: where you are with the question 'Am I connected or alone?' When this is flowing, you feel loved and present in your relationships. When it's strained, you feel isolated, numb, or overwhelmed by others' needs."
      },
      {
        id: 4,
        name: "Reality",
        lens: "This signature is how your Body house is expressing — your actions, health, and material life right now. Read it as: where you are with the question 'Can I act and does it work?' When this is flowing, your effort produces results and your body supports you. When it's strained, nothing lands, energy is depleted, or reality feels uncooperative."
      }
    ],
    whenToUse: "When you want to see how each part of your life is functioning",
    whatYoullSee: "A full picture — how each part of you is doing right now",
    house: 'gestalt',
    stage: 'feedback',
    element: 'water',
    archetype: { number: 20, verb: 'Awareness', traditional: 'Judgement' },
    concern: null
  },

  'spirit-4': {
    id: 'spirit-4',
    name: 'Witness',
    count: 4,
    positions: [
      {
        id: 1,
        name: "What You're Expressing",
        lens: "This signature is how you're answering the need for meaning through action and creation — what you're putting out into the world. Read it as: your creative output, your self-expression, what you're showing. The Radiant bridge: when balanced, authentic expression aimed beyond the self. When over-expressed, compulsive performance without direction — burning bright but aimed at nothing. When depleted, the spark feels gone and creation has stopped."
      },
      {
        id: 2,
        name: "What You're Noticing",
        lens: "This signature is how you're answering the need for meaning through attention and discernment — what you're paying careful attention to. Read it as: your perception, your listening, what you're studying. The Listener bridge: when balanced, discernment that has landed and serves action. When over-expressed, perpetual seeking disguised as depth — always learning, never committing. When depleted, 'I listened and heard nothing' — discernment shut down after disappointment."
      },
      {
        id: 3,
        name: "What You're Sensing",
        lens: "This signature is how you're answering the need for meaning through intuition and vision — what you feel but can't prove. Read it as: your hunches, your dreams, the directions you sense into. The Dreamer bridge: when balanced, vision grounded in form — intuition that leads to action. When over-expressed, every direction feels meaningful and none gets walked. When depleted, 'my intuition failed me' — the sensing channel shut down."
      },
      {
        id: 4,
        name: "What You're Growing",
        lens: "This signature is how you're answering the need for meaning through care and cultivation — what you're tending. Read it as: what you're nurturing, growing, looking after. The Gardener bridge: when balanced, tending that understands what it serves. When over-expressed, compulsive caretaking that avoids your own direction. When depleted, 'I gave everything and it wasn't enough' — caretaker burnout."
      }
    ],
    whenToUse: "When you need to understand your whole creative and purposeful self",
    whatYoullSee: "How you're making meaning — through expression, attention, intuition, and care",
    house: 'spirit',
    stage: 'feedback',
    element: 'water',
    archetype: { number: 18, verb: 'Imagination', traditional: 'The Moon' },
    bridge: 'The Dreamer',
    concern: 'meaninglessness'
  },

  'mind-4': {
    id: 'mind-4',
    name: 'Force',
    count: 4,
    positions: [
      {
        id: 1,
        name: "What You're Building",
        lens: "This signature is how you're exercising authority and creating structure — the plans, systems, and frameworks you're constructing. Read it as: what you're organizing and commanding. The Commander bridge: when balanced, structure that enables freedom for everyone in it. When over-expressed, control as identity — 'without my structure, everything collapses.' When depleted, 'I built it and it fell — I can't trust structure anymore.'"
      },
      {
        id: 2,
        name: "What You're Seeing",
        lens: "This signature is how you're recognizing patterns and analyzing systems — your capacity to see what binds and what frees. Read it as: the truths you're perceiving. The Analyst bridge: when balanced, clear-eyed perception that serves liberation. When over-expressed, seeing chains everywhere — 'everything is a system, nothing is free.' When depleted, 'I don't want to see how it works anymore' — willful naivety after painful clarity."
      },
      {
        id: 3,
        name: "Where You Belong",
        lens: "This signature is how you're finding ground through shared meaning and community — the groups, traditions, and collective identity you're part of. Read it as: where and how you belong. The Tribalist bridge: when balanced, belonging that enhances individual freedom. When over-expressed, 'our way is THE way' — identity swallowed by the group. When depleted, 'I believed and was betrayed' — trust in community shattered."
      },
      {
        id: 4,
        name: "What's Breaking",
        lens: "This signature is how your capacity for creative destruction is operating — the part of you that clears what's stale to make room for what's real. Read it as: what's being dismantled, disrupted, or questioned right now. The Disruptor bridge: when balanced, precise demolition in service of better building. When over-expressed, 'burn it all down' — destruction without constructive purpose. When depleted, 'I see the lies but can't bring myself to act' — frozen inside a structure you know is wrong."
      }
    ],
    whenToUse: "When you need to understand how you're thinking and deciding",
    whatYoullSee: "How your mind is working — through building, analyzing, belonging, and clearing",
    house: 'mind',
    stage: 'feedback',
    element: 'earth',
    archetype: { number: 16, verb: 'Breakthrough', traditional: 'The Tower' },
    bridge: 'The Disruptor',
    concern: 'freedom'
  },

  'emotion-4': {
    id: 'emotion-4',
    name: 'Freedom',
    count: 4,
    positions: [
      {
        id: 1,
        name: "What You're Chasing",
        lens: "This signature is how you're pursuing connection — your passionate drive toward intimacy, love, and belonging. Read it as: what you're reaching for in relationship. The Pursuer bridge: when balanced, passionate connection grounded in respect for the other's autonomy. When over-expressed, 'if I just love hard enough the gap will close' — intensity that creates the distance it fears. When depleted, 'I pursued and was rejected — I won't approach again.'"
      },
      {
        id: 2,
        name: "How You're Protecting Yourself",
        lens: "This signature is how you're managing relational distance — the boundaries, walls, and calibration you're using. Read it as: how you're regulating how close people get. The Calibrator bridge: when balanced, boundaries that enable deep connection rather than preventing it. When over-expressed, relationships managed so precisely they lose all wildness and risk — measured love. When depleted, 'I can't regulate anymore' — swinging between too close and too far."
      },
      {
        id: 3,
        name: "What You Feel With Others",
        lens: "This signature is how you're feeling across the gap between yourself and others — your empathy, your resonance, your capacity to hold space. Read it as: how you absorb, hold, or share feeling. The Empath bridge: when balanced, empathy with clear boundaries — feeling deeply without losing yourself. When over-expressed, 'I feel everything everyone feels' — dissolved into others' emotions. When depleted, 'I used to feel everything, now I feel nothing' — empathy burnout."
      },
      {
        id: 4,
        name: "How You're Changing",
        lens: "This signature is how connection is transforming you — what relationship, loss, or encounter is actively changing who you are. Read it as: the metamorphosis in progress. The Transformer bridge: when balanced, letting relationships change you without losing your own thread. When over-expressed, 'this needs to change or it's dead' — addicted to crisis in relationship. When depleted, 'I went through the transformation and got stuck halfway' — frozen in incomplete metamorphosis."
      }
    ],
    whenToUse: "When you want to see the full landscape of how you're relating",
    whatYoullSee: "How you're relating — through pursuit, protection, empathy, and change",
    house: 'emotion',
    stage: 'feedback',
    element: 'air',
    archetype: { number: 14, verb: 'Balance', traditional: 'Temperance' },
    bridge: 'The Calibrator',
    concern: 'isolation'
  },

  'body-4': {
    id: 'body-4',
    name: 'Law',
    count: 4,
    positions: [
      {
        id: 1,
        name: "What You're Giving",
        lens: "This signature is how you're dedicating your finite time and energy — where you're pouring yourself. Read it as: your sacrifice, your offering, where you're spending your life. The Devoted bridge: when balanced, conscious sacrifice that fills rather than empties — giving from fullness. When over-expressed, 'I only exist when I'm giving myself away' — martyrdom as identity. When depleted, 'I gave everything and got nothing back' — the betrayed giver who now hoards."
      },
      {
        id: 2,
        name: "What You're Perfecting",
        lens: "This signature is how you're applying rigor, discipline, and precision — your craft, your practice, your daily mastery. Read it as: where your discipline lives. The Disciplined bridge: when balanced, mastery that serves something beyond itself — warm precision. When over-expressed, 'if I perfect this I can control the outcome' — rigidity as a siege against mortality. When depleted, 'I lost my craft, my discipline collapsed' — the broken master."
      },
      {
        id: 3,
        name: "What's at Stake",
        lens: "This signature is where fairness and equity are active in your life — how the scales sit right now. Read it as: what matters to you about justice, balance, and what's owed. The Just bridge: when balanced, justice tempered by mercy — fighting for what's right while still able to rest. When over-expressed, 'the scales must be perfectly balanced before I can rest' — obsessive reckoning. When depleted, 'nothing's fair and nothing ever will be' — given up on fairness entirely."
      },
      {
        id: 4,
        name: "What You're Holding Together",
        lens: "This signature is how you're persisting — what you're sustaining through sheer endurance. Read it as: what you're keeping alive, maintaining, refusing to let fall. The Enduring bridge: when balanced, endurance that knows when to yield — durable but flexible. When over-expressed, 'I cannot yield, if I stop holding everything collapses' — rigid holding that suffocates what it protects. When depleted, 'I broke, I have no strength left' — the endurer who finally couldn't."
      }
    ],
    whenToUse: "When you want the full picture of how you're operating in the material world",
    whatYoullSee: "How you're showing up in the real world — through giving, discipline, fairness, and endurance",
    house: 'body',
    stage: 'feedback',
    element: 'fire',
    archetype: { number: 12, verb: 'Sacrifice', traditional: 'The Hanged Man' },
    bridge: 'The Devoted',
    concern: 'death'
  },

  // ╔══════════════════════════════════════════════════════════════╗
  // ║  LEGACY SPREADS                                             ║
  // ║  Preserved for backward compatibility with historical       ║
  // ║  readings. Not shown in the spread picker.                  ║
  // ╚══════════════════════════════════════════════════════════════╝

  'single-focus': {
    id: 'single-focus', name: 'Single Focus', count: 1, legacy: true,
    positions: [{ id: 1, name: "What's Present", lens: "This signature is what's most active in your field right now. Read it as: the energy that's HERE." }],
    whenToUse: "When you need one clear signal", whatYoullSee: "The one thing that's most active right now and how it's expressing"
  },
  'core': {
    id: 'core', name: 'Core', count: 1, legacy: true,
    positions: [{ id: 1, name: "What's Central", lens: "This signature is what's at the center beneath the noise. Read it as: the essential truth of this moment." }],
    whenToUse: "When everything feels noisy and you need center", whatYoullSee: "What's actually driving this moment — the real priority"
  },
  'invitation': {
    id: 'invitation', name: 'Invitation', count: 1, legacy: true,
    positions: [{ id: 1, name: "What's Available", lens: "This signature is what's ready and waiting for your attention. Read it as: what's being offered to you." }],
    whenToUse: "When you're open but don't know what's available", whatYoullSee: "Where the opening is — what's ready for you to engage"
  },
  'ground': {
    id: 'ground', name: 'Ground', count: 1, legacy: true,
    positions: [{ id: 1, name: "What's Solid", lens: "This signature is where your foundation actually lives. Read it as: your source of stability." }],
    whenToUse: "When you feel unmoored and need stability", whatYoullSee: "What you can count on right now — where your actual stability lives"
  },
  'ground-sky': {
    id: 'ground-sky', name: 'Ground & Sky', count: 2, legacy: true,
    positions: [
      { id: 1, name: "Foundation", lens: "This signature is how your practical, grounded reality is expressing. Read it as: what's solid beneath you." },
      { id: 2, name: "Aspiration", lens: "This signature is how your higher aim or vision is expressing. Read it as: what you're reaching toward." }
    ],
    whenToUse: "When balancing practical reality with aspiration", whatYoullSee: "Whether what you're building toward is supported by where you're building from"
  },
  'inner-outer': {
    id: 'inner-outer', name: 'Inner & Outer', count: 2, legacy: true,
    positions: [
      { id: 1, name: "Internal", lens: "This signature is how your inner state is functioning. Read it as: what's happening inside." },
      { id: 2, name: "External", lens: "This signature is how you're showing up in the world. Read it as: what others see and experience." }
    ],
    whenToUse: "When inside doesn't match outside", whatYoullSee: "Where your inner experience matches your outer life — and where there's a gap"
  },
  'give-receive': {
    id: 'give-receive', name: 'Give & Receive', count: 2, legacy: true,
    positions: [
      { id: 1, name: "Offering", lens: "This signature is how your giving/output channel is functioning. Read it as: what you're putting out." },
      { id: 2, name: "Receiving", lens: "This signature is how your receiving/input channel is functioning. Read it as: what you're letting in." }
    ],
    whenToUse: "When exchange feels off", whatYoullSee: "Which direction is flowing and which is restricted — output, input, or both"
  },
  'self-other': {
    id: 'self-other', name: 'Self & Other', count: 2, legacy: true,
    positions: [
      { id: 1, name: "Self", lens: "This signature is how you're holding yourself in this dynamic. Read it as: your energy in the relationship." },
      { id: 2, name: "Other", lens: "This signature is how the other is showing up. Read it as: their energy as it meets you." }
    ],
    whenToUse: "When navigating any relationship dynamic", whatYoullSee: "How you're actually showing up vs how they're actually showing up — separate, clear"
  },
  'arc': {
    id: 'arc', name: 'Arc', count: 3, legacy: true,
    positions: [
      { id: 1, name: "Situation", lens: "This signature is the current state of affairs. Read it as: where things stand now." },
      { id: 2, name: "Movement", lens: "This signature is what's in motion or shifting. Read it as: what's actively changing." },
      { id: 3, name: "Integration", lens: "This signature is where things are heading to resolve. Read it as: how this wants to complete." }
    ],
    whenToUse: "When something is in motion", whatYoullSee: "Where it is, what's shifting, and how it's integrating"
  },
  'time-lens': {
    id: 'time-lens', name: 'Time Lens', count: 3, legacy: true,
    positions: [
      { id: 1, name: "Completing", lens: "This signature is what's finishing or resolving. Read it as: what's concluding." },
      { id: 2, name: "Present", lens: "This signature is what's fully here now. Read it as: what's alive in this moment." },
      { id: 3, name: "Emerging", lens: "This signature is what's coming into form. Read it as: what's becoming." }
    ],
    whenToUse: "When in transition and timing feels blurred", whatYoullSee: "What's ending, what's here, and what's beginning — your position in transition"
  },
  'creation': {
    id: 'creation', name: 'Creation', count: 3, legacy: true,
    positions: [
      { id: 1, name: "Seed", lens: "This signature is the origin impulse of what you're making. Read it as: the initial spark." },
      { id: 2, name: "Process", lens: "This signature is how the creation is developing. Read it as: the work in progress." },
      { id: 3, name: "Fruit", lens: "This signature is what's being produced. Read it as: what's coming into form." }
    ],
    whenToUse: "When making something and want to check the process", whatYoullSee: "Whether the original spark, the current work, and the emerging result are aligned"
  },
  'foundation': {
    id: 'foundation', name: 'Foundation', count: 3, legacy: true,
    positions: [
      { id: 1, name: "Root", lens: "This signature is what's underneath everything. Read it as: the deepest support." },
      { id: 2, name: "Trunk", lens: "This signature is the main structural element. Read it as: what holds things up." },
      { id: 3, name: "Branch", lens: "This signature is what extends outward. Read it as: what's reaching and growing." }
    ],
    whenToUse: "When you want to understand what supports what", whatYoullSee: "What's holding things up and whether the support structure is sound"
  },
  'quadraverse': {
    id: 'quadraverse', name: 'Quadraverse', count: 4, legacy: true,
    positions: [
      { id: 1, name: "Spirit", lens: "This signature is how your Spirit dimension is expressing. Read it as: inspiration, purpose, fire." },
      { id: 2, name: "Mind", lens: "This signature is how your Mind dimension is expressing. Read it as: thought, clarity, air." },
      { id: 3, name: "Emotion", lens: "This signature is how your Emotion dimension is expressing. Read it as: feeling, connection, water." },
      { id: 4, name: "Body", lens: "This signature is how your Body dimension is expressing. Read it as: action, form, earth." }
    ],
    whenToUse: "When you want a full-system elemental check", whatYoullSee: "How each of your four elements is expressing — which is thriving, which is strained, which is quiet"
  },
  'relationship': {
    id: 'relationship', name: 'Relationship', count: 4, legacy: true,
    positions: [
      { id: 1, name: "Self As I Am", lens: "This signature is how you actually are in this relationship. Read it as: your authentic state." },
      { id: 2, name: "Self As I Act", lens: "This signature is how you're behaving in this relationship. Read it as: your actions and presentation." },
      { id: 3, name: "Other As They Are", lens: "This signature is how the other actually is. Read it as: their authentic state." },
      { id: 4, name: "The Field", lens: "This signature is the space between you. Read it as: the relationship itself as an entity." }
    ],
    whenToUse: "When a relationship needs clarity without blame", whatYoullSee: "Your real state, your behavior, their real state, and the dynamic between — separated out"
  },
  'decision': {
    id: 'decision', name: 'Decision', count: 4, legacy: true,
    positions: [
      { id: 1, name: "Expression", lens: "This signature is what this choice would express about you. Read it as: what it says." },
      { id: 2, name: "Cost", lens: "This signature is what this choice requires you to release. Read it as: what you'd give up." },
      { id: 3, name: "Strength", lens: "This signature is what this choice would strengthen. Read it as: what grows from it." },
      { id: 4, name: "Remainder", lens: "This signature is what this choice leaves unchanged. Read it as: what stays the same either way." }
    ],
    whenToUse: "When weighing a significant choice", whatYoullSee: "What a choice would say about you, cost you, build for you, and leave unchanged"
  },
  'cycle': {
    id: 'cycle', name: 'Cycle', count: 4, legacy: true,
    positions: [
      { id: 1, name: "Initiation", lens: "This signature is the beginning energy of your process. Read it as: how it started." },
      { id: 2, name: "Development", lens: "This signature is the growth phase. Read it as: how it's building." },
      { id: 3, name: "Culmination", lens: "This signature is the peak or turning point. Read it as: where it crests." },
      { id: 4, name: "Integration", lens: "This signature is how it resolves and absorbs. Read it as: how it completes." }
    ],
    whenToUse: "When tracking where you are in a process", whatYoullSee: "Where you actually are in the process — starting, building, peaking, or completing"
  },
  'five-houses': {
    id: 'five-houses', name: 'Five Houses', count: 5, legacy: true,
    positions: [
      { id: 1, name: "Gestalt", lens: "This signature is how your wholeness/integration is expressing. Read it as: your overall coherence." },
      { id: 2, name: "Spirit", lens: "This signature is how your Spirit house is expressing. Read it as: purpose, meaning, inspiration." },
      { id: 3, name: "Mind", lens: "This signature is how your Mind house is expressing. Read it as: thought, analysis, understanding." },
      { id: 4, name: "Emotion", lens: "This signature is how your Emotion house is expressing. Read it as: feeling, relating, connecting." },
      { id: 5, name: "Body", lens: "This signature is how your Body house is expressing. Read it as: action, health, material reality." }
    ],
    whenToUse: "When life feels broadly off but unclear where", whatYoullSee: "A full diagnostic — how each of your five houses is expressing"
  },
  'project': {
    id: 'project', name: 'Project', count: 5, legacy: true,
    positions: [
      { id: 1, name: "Vision", lens: "This signature is how the project's vision is expressing. Read it as: the guiding intention." },
      { id: 2, name: "Structure", lens: "This signature is how the project's structure is expressing. Read it as: the framework holding it." },
      { id: 3, name: "Energy", lens: "This signature is how the project's energy is expressing. Read it as: the fuel and momentum." },
      { id: 4, name: "Movement", lens: "This signature is how the project's movement is expressing. Read it as: progress and direction." },
      { id: 5, name: "Completion", lens: "This signature is how the project's completion is expressing. Read it as: the finish line and outcome." }
    ],
    whenToUse: "When creative work feels unclear", whatYoullSee: "How each dimension of the project is expressing — where it's flowing, where it's strained"
  },
  'alignment': {
    id: 'alignment', name: 'Alignment', count: 5, legacy: true,
    positions: [
      { id: 1, name: "Desire", lens: "This signature is what you want. Read it as: your authentic longing." },
      { id: 2, name: "Requirement", lens: "This signature is what's being asked of you. Read it as: what life/situation needs from you." },
      { id: 3, name: "Integrity", lens: "This signature is where you're in alignment. Read it as: where you're whole and true." },
      { id: 4, name: "Growth", lens: "This signature is where you're expanding. Read it as: your edge of development." },
      { id: 5, name: "Gift", lens: "This signature is what's available as a result. Read it as: what becomes possible." }
    ],
    whenToUse: "When feeling out of sync with life", whatYoullSee: "Whether what you want, what's required, and what you're doing are pointed the same direction"
  },
  'journey': {
    id: 'journey', name: 'Journey', count: 5, legacy: true,
    positions: [
      { id: 1, name: "Origin", lens: "This signature is where you started. Read it as: the beginning point." },
      { id: 2, name: "Path", lens: "This signature is the way you're traveling. Read it as: the route itself." },
      { id: 3, name: "Terrain", lens: "This signature is what you're navigating through. Read it as: what requires attention." },
      { id: 4, name: "Resource", lens: "This signature is what you have available. Read it as: your assets and support." },
      { id: 5, name: "Destination", lens: "This signature is where you're heading. Read it as: what you're moving toward." }
    ],
    whenToUse: "When navigating toward something and need orientation", whatYoullSee: "Where you are on the path — origin, route, terrain, resource, and direction"
  },
  'life-domains': {
    id: 'life-domains', name: 'Life Domains', count: 6, legacy: true,
    positions: [
      { id: 1, name: "Self", lens: "This signature is how your relationship with yourself is expressing. Read it as: self-connection." },
      { id: 2, name: "Relationships", lens: "This signature is how your relationships are expressing. Read it as: connection with others." },
      { id: 3, name: "Work", lens: "This signature is how your work/career is expressing. Read it as: vocation and contribution." },
      { id: 4, name: "Body", lens: "This signature is how your physical life is expressing. Read it as: health, energy, embodiment." },
      { id: 5, name: "Meaning", lens: "This signature is how your sense of meaning is expressing. Read it as: purpose and significance." },
      { id: 6, name: "Play", lens: "This signature is how your play/rest is expressing. Read it as: joy, leisure, restoration." }
    ],
    whenToUse: "When you want a broad check-in across all major areas", whatYoullSee: "How each domain of life is expressing — which is thriving, which is strained, which is quiet"
  },
  'full-cycle': {
    id: 'full-cycle', name: 'Full Cycle', count: 6, legacy: true,
    positions: [
      { id: 1, name: "Seed", lens: "This signature is the seed phase. Read it as: what's been planted." },
      { id: 2, name: "Sprout", lens: "This signature is the sprouting phase. Read it as: what's breaking through." },
      { id: 3, name: "Growth", lens: "This signature is the growth phase. Read it as: what's developing." },
      { id: 4, name: "Bloom", lens: "This signature is the bloom phase. Read it as: what's flowering." },
      { id: 5, name: "Harvest", lens: "This signature is the harvest phase. Read it as: what's ready to be gathered." },
      { id: 6, name: "Rest", lens: "This signature is the rest phase. Read it as: what's composting or dormant." }
    ],
    whenToUse: "When tracking a complete process from beginning to end", whatYoullSee: "Which phase of the natural cycle is active and which is being skipped or rushed"
  },
  'spheres': {
    id: 'spheres', name: 'Spheres', count: 6, legacy: true,
    positions: [
      { id: 1, name: "Self", lens: "This signature is your innermost sphere. Read it as: your core." },
      { id: 2, name: "Intimate", lens: "This signature is your intimate sphere. Read it as: closest relationships." },
      { id: 3, name: "Family", lens: "This signature is your family sphere. Read it as: family of origin and chosen family." },
      { id: 4, name: "Community", lens: "This signature is your community sphere. Read it as: friends, neighbors, tribes." },
      { id: 5, name: "Work", lens: "This signature is your work sphere. Read it as: colleagues, profession, contribution." },
      { id: 6, name: "World", lens: "This signature is your world sphere. Read it as: society, humanity, the whole." }
    ],
    whenToUse: "When decisions or energy affect multiple levels", whatYoullSee: "How your energy and presence shifts from your core out to the wider world"
  },
  'integration': {
    id: 'integration', name: 'Integration', count: 6, legacy: true,
    positions: [
      { id: 1, name: "Conscious", lens: "This signature is what's conscious. Read it as: what you already see clearly." },
      { id: 2, name: "Unconscious", lens: "This signature is what's unconscious. Read it as: what's operating beneath awareness." },
      { id: 3, name: "Emerging", lens: "This signature is what's emerging. Read it as: what's coming into consciousness." },
      { id: 4, name: "Ready", lens: "This signature is what's ready. Read it as: what's available to work with now." },
      { id: 5, name: "Waiting", lens: "This signature is what's waiting. Read it as: what's not yet time for." },
      { id: 6, name: "Gift", lens: "This signature is the gift available. Read it as: what becomes possible through integration." }
    ],
    whenToUse: "When doing deep work on what's conscious and what isn't", whatYoullSee: "What's conscious, what's hidden, what's emerging, and what's available to work with"
  }
};

// Spreads organized by card count for UI selection
// 5 Houses × 4 Counts = 20 derived reading frames
// Order: Gestalt, Spirit, Mind, Emotion, Body
export const SPREADS_BY_COUNT = {
  1: ['gestalt-1', 'spirit-1', 'mind-1', 'emotion-1', 'body-1'],
  2: ['gestalt-2', 'spirit-2', 'mind-2', 'emotion-2', 'body-2'],
  3: ['gestalt-3', 'spirit-3', 'mind-3', 'emotion-3', 'body-3'],
  4: ['gestalt-4', 'spirit-4', 'mind-4', 'emotion-4', 'body-4']
};

// Mode explanations for ? popover
export const MODE_EXPLANATIONS = {
  reflect: "Static positions, dynamic interpretation. You choose what territory to examine — the system reveals what's actually happening there. Use when you know WHERE to look but want to see HOW it's functioning.",
  discover: "Dynamic positions, dynamic interpretation. The system decides what you need to see. Positions are drawn randomly from the 22 Archetypes. Use when you're open to receiving what the architecture wants to show you.",
  forge: "Declaration mode. State an intention, draw one card, iterate through action. The card becomes your working partner for creating something specific. Use when you know what you want to build."
};
