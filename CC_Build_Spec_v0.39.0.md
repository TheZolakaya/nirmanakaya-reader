# NIRMANAKAYA v0.39.0 — CC BUILD SPEC

*Consolidated implementation spec from December 28, 2025 session*
*Claude + GPT triangulation results*

---

## OVERVIEW

This build implements:
1. **Words to the Whys v2** — The Why moment with teleological grounding
2. **Mode Governance** — Create/Consume enforcement (Reflect/Discover/Forge)
3. **Language Guardrails** — Verb linting, structural language, mechanical metaphors
4. **Quick Wins** — Post-filter, defaults, UI fixes from earlier in session

**Priority:** P1 — This is core interpretation infrastructure

---

## PART 1: MODE SYSTEM REFACTOR

### 1.1 Mode Declaration

Every reading generation must declare mode at the start.

**File:** `lib/modes.js` (new)

```javascript
export const MODES = {
  REFLECT: 'reflect',
  DISCOVER: 'discover', 
  FORGE: 'forge'
};

export const MODE_CONSTRAINTS = {
  reflect: {
    label: 'Reflect',
    operation: 'consume',
    coreQuestion: 'What is already happening?',
    allowedVerbs: ['is', 'appears', 'shows up as', 'is operating', 'is oriented toward', 'tends to', 'is currently configured', 'is expressing through'],
    bannedVerbs: ['should', 'need to', 'must', 'fix', 'change', 'build', 'stop', 'start', 'choose', 'decide'],
    canSurfaceLevers: false,
    canAskQuestions: false,
    requiresTransitionMarker: false
  },
  discover: {
    label: 'Discover',
    operation: 'consume_to_latent_create',  // standardized for telemetry
    coreQuestion: 'Where is authorship already available?',
    allowedVerbs: ['is already doing', 'is available', 'is active', 'is holding', 'is capable of', 'is positioned to', 'could be claimed', 'is present without being named'],
    conditionalVerbs: ['step in', 'lean into', 'step back', 'name', 'claim'], // require transition marker
    bannedVerbs: ['do this', 'replace', 'implement', 'build X', 'correct Y', 'stop doing Z'],
    canSurfaceLevers: true,
    canAskQuestions: true, // ONE present-tense question only
    requiresTransitionMarker: true // when approaching action
  },
  forge: {
    label: 'Forge',
    operation: 'create',
    coreQuestion: 'What changes when intention is asserted?',
    allowedVerbs: ['I am choosing', 'I am asserting', 'I am building', 'I am withdrawing', 'I am holding', 'I am shaping', 'I am testing', 'I am committing to', 'I am releasing'],
    bannedVerbs: ['guarantee', 'ensure', 'will cause', 'make happen', 'force'],
    requiresOwnership: true, // first-person or attributed to user intent
    requiresAuthorshipReturn: true,
    canSurfaceLevers: true,
    canAskQuestions: true
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

export const TRANSITION_MARKERS = [
  "These are authorship locations — not instructions.",
  "No action is required; these are points of available authorship.",
  "Nothing needs to be done. This names where choice already exists.",
  "This is visibility, not direction."
];

export const AUTHORSHIP_CLOSURES = [
  "Authorship remains with you.",
  "Observe what changes next."
];
```

### 1.2 Mode-to-Focus Mapping

Update the existing Focus system to align with modes:

**File:** `lib/stanceSystem.js` (update)

```javascript
// Map Focus values to modes
export const FOCUS_TO_MODE = {
  'Mirror': 'reflect',    // Pure consume
  'Forge': 'forge',       // Pure create  
  // Note: 'Discover' is handled by reading mode selection, not Focus
};

// Reading modes map to interpretation modes
export const READING_MODE_TO_INTERPRETATION_MODE = {
  'Reflect': 'reflect',
  'Discover': 'discover',
  'Forge': 'forge'
};
```

---

## PART 2: PROMPT INJECTION BY MODE

### 2.1 Mode Preambles

**File:** `lib/modePrompts.js` (new)

```javascript
export const MODE_PREAMBLES = {
  reflect: `You are operating in REFLECT mode.

Constraints:
- Describe what is currently operating.
- Do NOT imply choice, action, improvement, or readiness.
- Do NOT surface levers, capacities, or possibilities.
- Use descriptive verbs only (is, appears, is configured as).

If any sentence could be answered with "Should I?", it is a violation.
Stop after recognition.`,

  discover: `You are operating in DISCOVER mode.

Constraints:
- You may name where authorship already exists.
- You may surface capacities or levers WITHOUT activating them.
- You MUST NOT prescribe actions, steps, or optimizations.
- If language approaches action, include a transition marker.

Mandatory transition marker when approaching action:
"These are authorship locations — not instructions."

You may end with ONE present-tense question.
Do NOT include steps, bullets, or imperatives.`,

  forge: `You are operating in FORGE mode.

Constraints:
- All creation must be explicitly owned by the reader's stated intent.
- Use first-person or explicitly attributed authorship.
- Describe consequences and field response, NOT outcomes or guarantees.
- Close by returning authorship to the reader.

Do NOT issue commands.
Do NOT predict results.`
};

export const CANON_HEADER = `Reflect shows what is.
Discover shows where choice exists.
Forge is choice made explicit.

At no point does the system replace authorship, collapse mystery,
or convert recognition into obedience.`;
```

### 2.2 Integrate into Interpretation Generation

**File:** `lib/interpretationEngine.js` (update)

```javascript
import { MODE_PREAMBLES, CANON_HEADER } from './modePrompts.js';

function buildSystemPrompt(mode, stance, readingContext) {
  const modePreamble = MODE_PREAMBLES[mode] || MODE_PREAMBLES.discover;
  
  return `${CANON_HEADER}

---

${modePreamble}

---

${existingSystemPromptContent(stance, readingContext)}`;
}
```

---

## PART 3: THE WHY MOMENT

### 3.1 Why Vector Algorithm

**File:** `lib/whyVector.js` (new)

```javascript
import { HOUSES, STATUSES, PORTALS } from './archetypes.js';

// House vocabulary for Why content
export const HOUSE_VOCABULARY = {
  gestalt: {
    terms: ['who you are', 'identity', 'how the universe knows itself as you', 'destiny'],
    balancedValue: "This is how the universe knows itself as you."
  },
  spirit: {
    terms: ['becoming', 'seeing', 'witnessing', 'aspiring', 'vision'],
    balancedValue: "Seeing what you're becoming is how creation knows itself."
  },
  mind: {
    terms: ['structure', 'pattern', 'force becoming form', 'shaping', 'coherence'],
    balancedValue: "What you're shaping is how force becomes meaningful."
  },
  emotion: {
    terms: ['connection', 'bond', 'what you\'re with', 'feeling', 'authentic relating'],
    balancedValue: "This is how experience stops being private and starts being shared."
  },
  body: {
    terms: ['landing', 'weight', 'what\'s actually happening', 'consequence', 'showing up'],
    balancedValue: "What you're doing here gives creation weight. It makes it real."
  }
};

// Status determines tone
export const STATUS_TONE = {
  balanced: {
    type: 'confirmation',
    frame: 'value attribution + permission to continue',
    emotionalSignature: 'flow, alignment, presence'
  },
  too_much: {
    type: 'pressure',
    direction: 'future',
    frame: 'return to Now from future-projection',
    emotionalSignature: 'anxiety, fear, grasping, forcing'
  },
  too_little: {
    type: 'pressure', 
    direction: 'past',
    frame: 'return to Now from past-anchoring',
    emotionalSignature: 'regret, shame, guilt, withholding'
  },
  unacknowledged: {
    type: 'sharp mirror',
    frame: 'shadow recognition',
    emotionalSignature: 'blind creation, running without consent'
  }
};

// Portal presence gates depth
export function getDepthPermission(portalsPresent) {
  if (portalsPresent.includes('source') && portalsPresent.includes('creation')) {
    return 'full_stack';
  }
  if (portalsPresent.includes('source')) {
    return 'portal_initiation';
  }
  if (portalsPresent.includes('creation')) {
    return 'portal_integration';
  }
  return 'local';
}

// Generate Why moment content
export function generateWhyVector(house, status, portalsPresent) {
  const vocabulary = HOUSE_VOCABULARY[house];
  const tone = STATUS_TONE[status];
  const depth = getDepthPermission(portalsPresent);
  
  return {
    house,
    status,
    depth,
    vocabulary: vocabulary.terms,
    tone: tone.type,
    direction: tone.direction || null,
    emotionalSignature: tone.emotionalSignature,
    balancedValue: status === 'balanced' ? vocabulary.balancedValue : null,
    requiresNowQuestion: status !== 'balanced'
  };
}
```

### 3.2 Why Moment Prompt Addition

Add to the interpretation prompt after signature interpretation, before rebalancer:

```javascript
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
```

### 3.3 Why Moment UI Component

**File:** `components/WhyMoment.jsx` (new)

```jsx
export default function WhyMoment({ recognition, question, isBalanced }) {
  return (
    <div className="why-moment my-6 px-6 py-4 text-center">
      <div className="why-divider text-zinc-500 text-xs tracking-widest mb-4">
        ─── Why ───
      </div>
      <p className="why-recognition text-zinc-300 text-sm leading-relaxed italic mb-3">
        {recognition}
      </p>
      {question && (
        <p className="why-question text-zinc-400 text-sm">
          {question}
        </p>
      )}
    </div>
  );
}
```

---

## PART 4: CONTENT FILTER (Post-Processing)

### 4.1 Prohibited Terms Filter

**File:** `lib/contentFilter.js` (new)

```javascript
// Terms that should never appear in interpretations
const PROHIBITED_TERMS = [
  // Patronizing endearments
  'honey', 'sweetie', 'sweetheart', 'dear', 'darling', 'hun',
  
  // Motive language (unless explicitly reflecting user statement)
  'because you\'re afraid',
  'old wounds',
  'you\'re trying to control',
  'anxious need',
  'you don\'t trust',
  
  // Moral valence
  'good or bad',
  'right or wrong',
  'punishment',
  'deserve',
  'failure',
  
  // Outcome predictions
  'will result in',
  'guarantees',
  'ensures',
  'leads to success',
  'this will cause',
  'you will get'
];

// Imperative verbs that violate mode governance
const IMPERATIVE_VIOLATIONS = [
  'you should',
  'you must',
  'you need to',
  'you have to',
  'make sure',
  'try to',
  'do this',
  'stop doing',
  'start doing'
];

// Mechanical replacements for moral language
const MORAL_TO_MECHANICAL = {
  'harsh': 'over-tensioned',
  'too rigid': 'low elasticity',
  'weak': 'under-supported',
  'failing': 'misaligned',
  'wrong': 'non-coherent',
  'punishment': 'consequence',
  'weapon': 'over-applied force',
  'mercy': 'capacity for integration'
};

export function filterContent(text, mode = 'discover') {
  let filtered = text;
  let violations = [];
  
  // Check prohibited terms
  for (const term of PROHIBITED_TERMS) {
    if (filtered.toLowerCase().includes(term.toLowerCase())) {
      violations.push({ type: 'prohibited_term', term });
      // Remove or flag - for now, just log
    }
  }
  
  // Check imperative violations (mode-dependent)
  if (mode !== 'forge') {
    for (const imperative of IMPERATIVE_VIOLATIONS) {
      if (filtered.toLowerCase().includes(imperative.toLowerCase())) {
        violations.push({ type: 'imperative_violation', term: imperative, mode });
      }
    }
  }
  
  // Apply mechanical replacements
  for (const [moral, mechanical] of Object.entries(MORAL_TO_MECHANICAL)) {
    const regex = new RegExp(moral, 'gi');
    if (regex.test(filtered)) {
      filtered = filtered.replace(regex, mechanical);
      violations.push({ type: 'moral_replacement', from: moral, to: mechanical });
    }
  }
  
  return { filtered, violations };
}

// Validate mode compliance
export function validateModeCompliance(text, mode) {
  const issues = [];
  
  // Reflect: no choice implication
  if (mode === 'reflect') {
    if (/you could|available to you|capacity|lever/i.test(text)) {
      issues.push({ guardrail: 'R-2', message: 'Reflect mode surfaced levers (belongs in Discover)' });
    }
    if (/\?$/.test(text.trim())) {
      issues.push({ guardrail: 'R-1', message: 'Reflect mode should not end with questions' });
    }
  }
  
  // Discover: requires transition marker if approaching action
  if (mode === 'discover') {
    const hasConditionalVerbs = /step in|lean into|step back|claim|name/.test(text);
    const hasTransitionMarker = /authorship locations|not instructions|visibility, not direction/.test(text);
    
    if (hasConditionalVerbs && !hasTransitionMarker) {
      issues.push({ guardrail: 'D-2', message: 'Discover mode used action language without transition marker' });
    }
    
    // Check for bullet lists or steps
    if (/^\s*[-•*]\s|^\s*\d+\./m.test(text)) {
      issues.push({ guardrail: 'D-3', message: 'Discover mode should not include bullet lists or steps' });
    }
  }
  
  // Forge: requires ownership
  if (mode === 'forge') {
    const hasOwnership = /I am |you are asserting|your stated intention/i.test(text);
    if (!hasOwnership && /choosing|building|shaping|asserting/.test(text)) {
      issues.push({ guardrail: 'F-1', message: 'Forge mode action language without explicit ownership' });
    }
  }
  
  return issues;
}

// Kill-switch: abort and fallback after retry limit
const MAX_RETRIES = 1;

export async function generateWithGovernance(context, retryCount = 0) {
  const { mode, house, status, portalsPresent, userContext } = context;
  
  // Generate draft
  const draft = await generateInterpretation(context);
  
  // Validate
  const issues = validateModeCompliance(draft, mode);
  
  // Log violations with full telemetry tags
  if (issues.length > 0) {
    logViolations({
      mode,
      house,
      status,
      userContext,
      violations: issues,
      retryCount
    });
    
    // Kill-switch: fallback to Reflect under uncertainty
    if (retryCount >= MAX_RETRIES) {
      console.warn('Governance kill-switch triggered. Falling back to Reflect.');
      return fallbackReflectOutput(context);
    }
    
    // Retry once
    return generateWithGovernance(context, retryCount + 1);
  }
  
  return { mode, content: draft, fallback: false };
}

// Telemetry logging
function logViolations({ mode, house, status, userContext, violations, retryCount }) {
  console.warn('Mode governance violations:', {
    timestamp: new Date().toISOString(),
    mode,
    house,
    status,
    userContext,
    violations: violations.map(v => ({
      guardrail: v.guardrail,
      message: v.message
    })),
    retryCount
  });
}
```

---

## PART 5: MODE TRANSITION ANNOUNCER

### 5.1 The Missing Glue Layer

Users need felt clarity when moving from Consume → Create. This is subtle but critical.

**File:** `lib/modeTransition.js` (new)

```javascript
// Transition markers for Discover → Forge boundary
export const DISCOVER_TRANSITION_MARKER = "These are authorship locations — not instructions.";

// Forge mode acknowledgement (prepended when user explicitly selects Forge)
export const FORGE_ACKNOWLEDGEMENT = "You are now asserting intention. This will shape the Field.";

// Auto-inject transition marker when Discover approaches action
export function shouldInjectTransitionMarker(text, mode) {
  if (mode !== 'discover') return false;
  
  const actionIndicators = [
    /step in/i,
    /lean into/i,
    /step back/i,
    /claim/i,
    /you could/i,
    /available to you/i,
    /capacity to/i,
    /positioned to/i
  ];
  
  return actionIndicators.some(pattern => pattern.test(text));
}

// Check if transition marker is already present
export function hasTransitionMarker(text) {
  const markers = [
    /authorship locations/i,
    /not instructions/i,
    /visibility, not direction/i,
    /no action is required/i
  ];
  
  return markers.some(pattern => pattern.test(text));
}

// Inject marker if needed
export function ensureTransitionMarker(text, mode) {
  if (mode === 'discover' && shouldInjectTransitionMarker(text, mode) && !hasTransitionMarker(text)) {
    // Find the last paragraph before any question
    const parts = text.split(/\n\n/);
    const questionIndex = parts.findIndex(p => p.trim().endsWith('?'));
    
    if (questionIndex > 0) {
      // Insert marker before the question
      parts.splice(questionIndex, 0, `*${DISCOVER_TRANSITION_MARKER}*`);
    } else {
      // Append marker at end
      parts.push(`*${DISCOVER_TRANSITION_MARKER}*`);
    }
    
    return parts.join('\n\n');
  }
  
  return text;
}

// Prepend Forge acknowledgement when mode is explicitly Forge
export function prependForgeAcknowledgement(text, mode, userExplicitlySelectedForge) {
  if (mode === 'forge' && userExplicitlySelectedForge) {
    return `*${FORGE_ACKNOWLEDGEMENT}*\n\n${text}`;
  }
  return text;
}
```

### 5.2 Integration Point

In the interpretation pipeline, after generation but before display:

```javascript
import { 
  ensureTransitionMarker, 
  prependForgeAcknowledgement 
} from './modeTransition.js';

function postProcessInterpretation(text, mode, userSelectedForge) {
  let processed = text;
  
  // Ensure transition marker in Discover mode
  processed = ensureTransitionMarker(processed, mode);
  
  // Prepend Forge acknowledgement if user explicitly chose Forge
  processed = prependForgeAcknowledgement(processed, mode, userSelectedForge);
  
  // Run content filter
  const { filtered, violations } = filterContent(processed, mode);
  
  // Log violations for telemetry
  if (violations.length > 0) {
    console.warn('Content filter violations:', violations);
  }
  
  return filtered;
}
```

---

## PART 6: UI QUICK WINS

### 5.1 Default Settings Updates

**File:** Update defaults in settings/preferences

```javascript
export const DEFAULT_SETTINGS = {
  // ... existing
  
  // NEW DEFAULTS
  haikuEnabled: true,           // Haiku ON by default
  showTokenCount: true,         // Token count display ON by default
  voiceSamplePreview: false,    // Voice sample preview toggle (localStorage)
};
```

### 5.2 Reflect Mode Fixes

**File:** Fix in spread reading component

```javascript
// Fix undefined card count in Reflect mode
const cardCount = reading?.cards?.length || spread?.positions?.length || 3;

// Fix spread position names
const SPREAD_POSITION_NAMES = {
  3: ['Situation', 'Movement', 'Integration'],
  5: ['Context', 'Challenge', 'Focus', 'Foundation', 'Potential'],
  // Add more as needed
};

function getPositionName(index, totalCards) {
  const names = SPREAD_POSITION_NAMES[totalCards];
  if (names && names[index]) {
    return names[index];
  }
  return `Position ${index + 1}`;
}
```

---

## PART 7: TESTING CHECKLIST

### Mode Compliance Tests

- [ ] Reflect mode: No choice implications, no questions, descriptive only
- [ ] Discover mode: Transition marker present when approaching action
- [ ] Discover mode: No bullet lists or numbered steps
- [ ] Forge mode: All action language has explicit ownership
- [ ] Forge mode: Closes with authorship return

### Why Moment Tests

- [ ] Balanced status: Value attribution, no interrogation
- [ ] Too Much status: Future-pressure + Now re-entry question
- [ ] Too Little status: Past-pressure + Now re-entry question
- [ ] Unacknowledged: Shadow mirror + recognition question
- [ ] Portal-present reading: Cosmic language permitted
- [ ] Non-portal reading: Stays local/house-level

### Content Filter Tests

- [ ] Prohibited terms flagged/removed
- [ ] Imperative violations caught in non-Forge modes
- [ ] Moral language replaced with mechanical
- [ ] No patronizing endearments in output

### UI Tests

- [ ] Haiku defaults to ON
- [ ] Token count defaults to ON
- [ ] Reflect mode shows correct card count
- [ ] Spread positions show names, not "Position 1/2/3"

---

## PART 8: COMMIT MESSAGE

```
feat(interpretation): Implement mode governance + Why moment (v0.39.0)

Major interpretation infrastructure from Claude + GPT triangulation:

MODE SYSTEM:
- Add mode declarations (Reflect/Discover/Forge)
- Inject mode-specific constraints into prompts
- Map Focus → mode for backward compatibility

WHY MOMENT:
- Add Why Vector algorithm (House × Status × Portal)
- Implement Why moment structure (recognition + Now question)
- Add WhyMoment UI component

GOVERNANCE:
- Add content filter (prohibited terms, imperatives, moral language)
- Implement mode compliance validation
- Add mechanical metaphor replacements

QUICK WINS:
- Haiku ON by default
- Token count ON by default
- Fix Reflect mode undefined card count
- Fix spread position naming

Spec sources:
- Forge_Language_Spec_v1.md
- Mode_Governance_Guardrails_v1.md
- Prompt_Time_Mode_Enforcement_v1.md
- Words_to_the_Whys_v2_Spec.md

Two systems building together. The architecture teaches itself.
```

---

## RELATED DOCUMENTS

| Document | Purpose |
|----------|---------|
| `Ground_Truth_Axiom_v1.md` | Tier 0 constitutional anchor |
| `Nirmanakaya_Teleological_Glossary.md` | Term definitions |
| `teleology-registry-v0.2.0.json` | Machine-readable registry |
| `Forge_Language_Spec_v1.md` | Verb governance |
| `Mode_Governance_Guardrails_v1.md` | Enforcement rules |
| `Prompt_Time_Mode_Enforcement_v1.md` | Automated checks |
| `Words_to_the_Whys_v2_Spec.md` | Why Vector spec |

---

*Build spec — v0.39.0*
*December 28, 2025*
*Ready for CC execution*
