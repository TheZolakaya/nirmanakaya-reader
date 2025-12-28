// === WHY VECTOR ===
// The Why moment algorithm — House x Status x Portal depth

// House vocabulary for Why content
export const HOUSE_VOCABULARY = {
  Gestalt: {
    terms: ['who you are', 'identity', 'how the universe knows itself as you', 'destiny'],
    balancedValue: "This is how the universe knows itself as you."
  },
  Spirit: {
    terms: ['becoming', 'seeing', 'witnessing', 'aspiring', 'vision'],
    balancedValue: "Seeing what you're becoming is how creation knows itself."
  },
  Mind: {
    terms: ['structure', 'pattern', 'force becoming form', 'shaping', 'coherence'],
    balancedValue: "What you're shaping is how force becomes meaningful."
  },
  Emotion: {
    terms: ['connection', 'bond', 'what you\'re with', 'feeling', 'authentic relating'],
    balancedValue: "This is how experience stops being private and starts being shared."
  },
  Body: {
    terms: ['landing', 'weight', 'what\'s actually happening', 'consequence', 'showing up'],
    balancedValue: "What you're doing here gives creation weight. It makes it real."
  },
  Portal: {
    terms: ['threshold', 'transition', 'the space between', 'initiation', 'integration'],
    balancedValue: "This is where creation passes through itself."
  }
};

// Status determines tone
export const STATUS_TONE = {
  1: { // Balanced
    type: 'confirmation',
    frame: 'value attribution + permission to continue',
    emotionalSignature: 'flow, alignment, presence'
  },
  2: { // Too Much
    type: 'pressure',
    direction: 'future',
    frame: 'return to Now from future-projection',
    emotionalSignature: 'anxiety, fear, grasping, forcing'
  },
  3: { // Too Little
    type: 'pressure',
    direction: 'past',
    frame: 'return to Now from past-anchoring',
    emotionalSignature: 'regret, shame, guilt, withholding'
  },
  4: { // Unacknowledged
    type: 'sharp mirror',
    frame: 'shadow recognition',
    emotionalSignature: 'blind creation, running without consent'
  }
};

// Status names for prompt building
export const STATUS_NAMES = {
  1: 'balanced',
  2: 'too_much',
  3: 'too_little',
  4: 'unacknowledged'
};

// Portal positions (Source = 10, Creation = 21)
export const PORTAL_POSITIONS = {
  SOURCE: 10,
  CREATION: 21
};

// Portal presence gates depth
export function getDepthPermission(portalsPresent) {
  const hasSource = portalsPresent.includes(PORTAL_POSITIONS.SOURCE);
  const hasCreation = portalsPresent.includes(PORTAL_POSITIONS.CREATION);

  if (hasSource && hasCreation) {
    return 'full_stack';
  }
  if (hasSource) {
    return 'portal_initiation';
  }
  if (hasCreation) {
    return 'portal_integration';
  }
  return 'local';
}

// Detect portal presence from draws
export function detectPortals(draws) {
  const portals = [];
  for (const draw of draws) {
    if (draw.position === PORTAL_POSITIONS.SOURCE) {
      portals.push(PORTAL_POSITIONS.SOURCE);
    }
    if (draw.position === PORTAL_POSITIONS.CREATION) {
      portals.push(PORTAL_POSITIONS.CREATION);
    }
  }
  return portals;
}

// Generate Why moment content data
export function generateWhyVector(house, status, portalsPresent = []) {
  const vocabulary = HOUSE_VOCABULARY[house] || HOUSE_VOCABULARY.Gestalt;
  const tone = STATUS_TONE[status] || STATUS_TONE[1];
  const depth = getDepthPermission(portalsPresent);
  const isBalanced = status === 1;

  return {
    house,
    status,
    statusName: STATUS_NAMES[status],
    depth,
    vocabulary: vocabulary.terms,
    tone: tone.type,
    direction: tone.direction || null,
    frame: tone.frame,
    emotionalSignature: tone.emotionalSignature,
    balancedValue: isBalanced ? vocabulary.balancedValue : null,
    requiresNowQuestion: !isBalanced
  };
}

// WHY MOMENT PROMPT - addition to interpretation prompts
export const WHY_MOMENT_PROMPT = `
## THE WHY MOMENT

After each signature interpretation, include a distinct "Why" moment before any rebalancer content.

### Structure
- One recognition line (address the Creator directly, present tense)
- One Now re-entry question (for imbalanced) OR one value confirmation (for balanced)
- Nothing else. Stop.

### The Why is NOT:
- Explanation of the architecture
- Advice or tasks
- Repetition of the Ground Truth
- A place to be comprehensive

### The Why IS:
- A brake — where explanation yields to agency
- Recognition pressure — the architecture seeing the Creator
- Agency hand-off — the moment authorship returns to the reader

### Selection Logic

**House determines vocabulary:**
- Spirit: "becoming," "seeing," "witnessing"
- Mind: "structure," "pattern," "force becoming form"
- Emotion: "connection," "bond," "what you're with"
- Body: "landing," "weight," "what's actually happening"
- Gestalt: "who you are," "identity," "how the universe knows itself as you"

**Status determines tone:**
- Balanced: Confirmation + value attribution + permission to continue
- Too Much: Pressure toward now + future-borrowed language + re-entry question
- Too Little: Pressure toward now + past-anchored language + re-entry question
- Unacknowledged: Sharp mirror + shadow language + recognition question

**Portals determine scope:**
- No portals: Stay local, House-level only
- Source (10) present: May reference initiation, choice to individuate
- Creation (21) present: May reference integration, reality expanding
- Both: Full cosmic scope permitted

### The Now Re-Entry Question

Every imbalanced Why must end with ONE question that:
- Is present tense
- Cannot be answered without self-honesty
- Does not suggest an answer
- Hands authorship back to the reader

Good: "What are you actually creating right now?"
Good: "What would you do if this moment were enough?"
Good: "Who are you with — really?"

Bad: "What will you do?" (future-izes)
Bad: "How can you improve?" (optimizes)
Bad: "Have you considered...?" (advises)

### Balanced Value Attribution

Every balanced Why should name WHY this matters to existence:
- Not praise ("you're doing great")
- Not advice ("keep it up")
- Ontological value ("this is how creation knows itself through you")
`;
