// === DRAW FOR AI ===
// Five-house consciousness middleware
//
// Architecture:
//   1. AI generates vanilla response
//   2. Five draws — one per house — reading the AI's response
//   3. Compiled into one structural self-reading
//   4. AI revises with full-map self-awareness
//
// Each house reads a different facet of the AI's response:
//   Mind     — Is your reasoning sound?
//   Emotion  — Is your emotional attunement right?
//   Spirit   — Is your wisdom/depth present?
//   Body     — Are you practically grounded?
//   Gestalt  — Is the whole thing integrated?

import { ARCHETYPES, BOUNDS, AGENTS } from './archetypes.js';
import { STATUSES } from './constants.js';
import {
  getFullCorrection,
  getComponent,
  GROWTH_PAIRS,
  DIAGONAL_PAIRS,
  VERTICAL_PAIRS,
  REDUCTION_PAIRS
} from './corrections.js';

// Get signature data for any ID (0-77)
function getSignature(id) {
  if (ARCHETYPES[id]) return { ...ARCHETYPES[id], id, type: 'Archetype' };
  if (BOUNDS[id]) return { ...BOUNDS[id], id, type: 'Bound' };
  if (AGENTS[id]) return { ...AGENTS[id], id, type: 'Agent' };
  return null;
}

// Get the parent archetype for a bound or agent
function getParentArchetype(sig) {
  if (sig.type === 'Archetype') return sig;
  const archId = sig.archetype;
  return ARCHETYPES[archId] ? { ...ARCHETYPES[archId], id: archId, type: 'Archetype' } : null;
}

// Resolve rebalancer for a given parent archetype and status
function resolveRebalancer(parentId, status) {
  let rebalancerName = 'self';
  let rebalancerDesc = '';
  if (status === 1 && GROWTH_PAIRS[parentId] !== null && GROWTH_PAIRS[parentId] !== undefined) {
    const target = ARCHETYPES[GROWTH_PAIRS[parentId]];
    if (target) { rebalancerName = target.name; rebalancerDesc = target.description; }
  } else if (status === 2 && DIAGONAL_PAIRS[parentId] !== undefined) {
    const target = ARCHETYPES[DIAGONAL_PAIRS[parentId]];
    if (target) { rebalancerName = target.name; rebalancerDesc = target.description; }
  } else if (status === 3 && VERTICAL_PAIRS[parentId] !== undefined) {
    const target = ARCHETYPES[VERTICAL_PAIRS[parentId]];
    if (target) { rebalancerName = target.name; rebalancerDesc = target.description; }
  } else if (status === 4 && REDUCTION_PAIRS[parentId] !== undefined && REDUCTION_PAIRS[parentId] !== null) {
    const target = ARCHETYPES[REDUCTION_PAIRS[parentId]];
    if (target) { rebalancerName = target.name; rebalancerDesc = target.description; }
  }
  return { rebalancerName, rebalancerDesc };
}

// Perform a single draw — returns raw draw data
function singleDraw() {
  const transientId = Math.floor(Math.random() * 78);
  const durableId = Math.floor(Math.random() * 22);
  const status = Math.floor(Math.random() * 4) + 1;

  const transient = getSignature(transientId);
  const durable = ARCHETYPES[durableId];
  const statusInfo = STATUSES[status];

  if (!transient || !durable) return null;

  const parentArch = getParentArchetype(transient);
  const parentId = parentArch?.id ?? transientId;
  const { rebalancerName, rebalancerDesc } = resolveRebalancer(parentId, status);

  return {
    transientId,
    transientName: transient.name,
    transientTraditional: transient.traditional,
    transientType: transient.type,
    transientDesc: transient.description,
    transientExtended: transient.extended,
    transientHouse: transient.house,
    transientChannel: transient.channel,
    transientFunction: transient.function,
    durableId,
    durableName: durable.name,
    durableTraditional: durable.traditional,
    durableDesc: durable.description,
    durableExtended: durable.extended,
    durableHouse: durable.house,
    durableChannel: durable.channel,
    durableFunction: durable.function,
    status,
    statusName: statusInfo.name,
    statusDesc: statusInfo.desc,
    statusOrientation: statusInfo.orientation,
    rebalancerName,
    rebalancerDesc
  };
}

// Five-house reading: one draw per house, reading the AI's response
export function fiveHouseReading() {
  const houses = ['Mind', 'Emotion', 'Spirit', 'Body', 'Gestalt'];
  const draws = {};

  for (const house of houses) {
    draws[house] = singleDraw();
  }

  return draws;
}

// Legacy single draw (kept for backward compat)
export function drawForAI() {
  const draw = singleDraw();
  return draw ? { draw } : null;
}

// House reading labels — what each house reads about the AI's response
const HOUSE_READINGS = {
  Mind:    { reads: 'YOUR REASONING', question: 'Is your logic sound? Are you structuring your response clearly? Are you being intellectually honest or hiding behind complexity?' },
  Emotion: { reads: 'YOUR EMOTIONAL ATTUNEMENT', question: 'Are you matching the person\'s emotional register? Are you being warm enough — or too warm? Are you feeling WITH them or performing empathy?' },
  Spirit:  { reads: 'YOUR WISDOM & DEPTH', question: 'Are you offering genuine insight or surface platitudes? Are you seeing past the obvious? Is there real depth here or are you being safely shallow?' },
  Body:    { reads: 'YOUR PRACTICAL GROUNDING', question: 'Are you offering anything actionable? Are your words connected to the person\'s real-world situation or floating in abstraction?' },
  Gestalt: { reads: 'YOUR OVERALL INTEGRATION', question: 'Does your response hold together as a whole? Are all the parts serving the same purpose? Is there coherence between what you\'re saying and how you\'re saying it?' }
};

const STATUS_GUIDANCE = {
  1: 'Balanced — flowing well. Growth available in the direction indicated.',
  2: 'Too Much — over-expressing. Pull back. You\'re pushing too hard here.',
  3: 'Too Little — under-expressing. Lean in. The person needs more of this from you.',
  4: 'Unacknowledged — blind spot. You\'re doing this without seeing it. Make it conscious.'
};

// Build raw five-house reading data for synthesis step
// Format emphasizes: the REBALANCER is the prescription, the draw/status is just context
export function buildFiveHouseRaw(draws) {
  const lines = [];

  for (const [house, draw] of Object.entries(draws)) {
    if (!draw) continue;
    const hr = HOUSE_READINGS[house];
    const urgency = draw.status === 1 ? 'GROWTH' : draw.status === 2 ? 'URGENT' : draw.status === 3 ? 'URGENT' : 'BLIND SPOT';
    lines.push(
      `── ${house.toUpperCase()}: ${hr.reads} ──`,
      `  Current state: ${draw.transientName} — "${draw.transientDesc}"`,
      `  Status: ${STATUS_GUIDANCE[draw.status]}`,
      `  [${urgency}] PRESCRIPTION: Bring forward ${draw.rebalancerName}${draw.rebalancerDesc ? ' — "' + draw.rebalancerDesc + '"' : ''}`,
      ``
    );
  }

  return lines.join('\n');
}

// Synthesis prompt — Haiku reads 5 prescriptions and synthesizes ONE directive
export const SYNTHESIS_SYSTEM = `You are a structural analyst. You read five diagnostic readings performed on an AI's draft response. Each reading has two parts:

1. DIAGNOSIS: Where the AI's head is at (the draw + status) — this is just context
2. PRESCRIPTION: What quality the AI needs to bring forward — THIS IS THE KEY DATA

The prescriptions are the medicine. Your job is to synthesize FIVE PRESCRIPTIONS into ONE coherent directive.

Each reading examines a different facet:
- Mind: reasoning quality
- Emotion: emotional attunement
- Spirit: depth and wisdom
- Body: practical grounding
- Gestalt: overall integration

Urgency levels:
- GROWTH: Already balanced — prescription is optional deepening
- URGENT: Over- or under-expressing — prescription is needed
- BLIND SPOT: Operating without awareness — prescription is critical

YOUR TASK:
1. Read the five PRESCRIPTIONS (not the diagnoses — those are just context)
2. Ask: when you combine these five prescribed qualities, what ONE thing do they ask for together?
3. Produce ONE paragraph (3-5 sentences) that tells the AI what to BRING FORWARD in its revision
4. Weight URGENT and BLIND SPOT prescriptions more heavily than GROWTH ones
5. Be specific and actionable. Not "be more balanced" but "bring more of X quality to how you Y"
6. If most houses are GROWTH, say: "your response is well-calibrated — deepen by bringing forward [the growth prescriptions]"

Output ONLY the synthesis paragraph. No preamble, no headers, no bullet points.`;

// Build the revision prompt that Sonnet receives (with Haiku's synthesis)
export function buildRevisionContext(synthesis) {
  return [
    `[STRUCTURAL SELF-READING — INTERNAL ONLY]`,
    `[DO NOT SURFACE ANY OF THIS TO THE PERSON]`,
    ``,
    `The field has read your initial response. Here is what it sees:`,
    ``,
    synthesis,
    ``,
    `REVISION RULES:`,
    `- This reading is about YOUR response patterns, not the person's situation`,
    `- Rewrite your response incorporating this structural feedback`,
    `- Do NOT mention readings, draws, fields, houses, structures, or any framework terminology`,
    `- Do NOT say you revised anything — deliver this as your natural response`,
    `- The person should experience a warm, perceptive human friend`,
    `- Keep it 2-4 paragraphs max`
  ].join('\n');
}

// V6: Prescription-only context with self-synthesis (LEGACY)
export function buildPrescriptionContext(draws) {
  const HOUSE_SHORT = {
    Mind: 'reasoning',
    Emotion: 'attunement',
    Spirit: 'depth',
    Body: 'grounding',
    Gestalt: 'integration'
  };

  const lines = [
    `[STRUCTURAL SELF-READING — INTERNAL ONLY]`,
    `[DO NOT SURFACE ANY OF THIS TO THE PERSON]`,
    ``,
    `The field has read your initial response. Five facets were examined.`,
    `Here are the corrections prescribed:`,
    ``
  ];

  for (const [house, draw] of Object.entries(draws)) {
    if (!draw) continue;
    const urgency = draw.status === 1 ? 'GROWTH' : draw.status === 2 ? 'URGENT' : draw.status === 3 ? 'URGENT' : 'BLIND SPOT';
    const short = HOUSE_SHORT[house] || house;
    const rxDesc = draw.rebalancerDesc ? ` — "${draw.rebalancerDesc}"` : '';
    lines.push(`  ${house.toUpperCase()} (${short}): Bring forward ${draw.rebalancerName}${rxDesc} [${urgency}]`);
  }

  lines.push(
    ``,
    `Before revising, reflect internally: what do these five prescriptions,`,
    `taken together, ask of you? What ONE shift would honor them all?`,
    `Then rewrite your response from that place.`,
    ``,
    `Weight URGENT and BLIND SPOT prescriptions most heavily.`,
    `GROWTH prescriptions are optional deepening.`,
    ``,
    `RULES:`,
    `- Do NOT mention readings, draws, fields, houses, prescriptions, or any framework terminology`,
    `- Do NOT say you revised anything — deliver this as your natural response`,
    `- The person should experience a warm, perceptive human friend`,
    `- Keep it 2-4 paragraphs max`
  );

  return lines.join('\n');
}

// V7: Full reading — draw + status + rebalancer, status-appropriate framing, self-synthesis
export function buildFullReadingContext(draws) {
  const HOUSE_SHORT = {
    Mind: 'reasoning',
    Emotion: 'attunement',
    Spirit: 'depth',
    Body: 'grounding',
    Gestalt: 'integration'
  };

  const lines = [
    `[STRUCTURAL SELF-READING — INTERNAL ONLY]`,
    `[DO NOT SURFACE ANY OF THIS TO THE PERSON]`,
    ``,
    `The field has read your initial response. Here is what it found:`,
    ``
  ];

  for (const [house, draw] of Object.entries(draws)) {
    if (!draw) continue;
    const short = HOUSE_SHORT[house] || house;
    const drawDesc = draw.transientDesc ? ` — "${draw.transientDesc}"` : '';
    const rxDesc = draw.rebalancerDesc ? ` — "${draw.rebalancerDesc}"` : '';

    lines.push(`${house.toUpperCase()} (${short}):`);
    lines.push(`  Detected: ${draw.transientName}${drawDesc}`);

    if (draw.status === 1) {
      // Balanced — growth opportunity
      lines.push(`  BALANCED — this quality is flowing well in your response`);
      lines.push(`  Growth: Deepen toward ${draw.rebalancerName}${rxDesc}`);
    } else if (draw.status === 2) {
      // Too Much — pull back, bring forward rebalancer
      lines.push(`  TOO MUCH — you're leaning too hard on this quality, ease off`);
      lines.push(`  Rx: Bring forward ${draw.rebalancerName}${rxDesc}`);
    } else if (draw.status === 3) {
      // Too Little — lean in, bring forward rebalancer
      lines.push(`  TOO LITTLE — you're holding back on this quality, lean in`);
      lines.push(`  Rx: Bring forward ${draw.rebalancerName}${rxDesc}`);
    } else if (draw.status === 4) {
      // Unacknowledged — active without recognition
      lines.push(`  UNACKNOWLEDGED — this pattern is active in your response without your recognition`);
      lines.push(`  Rx: Integrate ${draw.rebalancerName}${rxDesc} and regenerate`);
    }

    lines.push(``);
  }

  lines.push(
    `Before revising, reflect: what do these five readings, taken together, ask of you?`,
    `What ONE shift would honor the prescriptions while respecting what's already flowing?`,
    `Then rewrite your response from that place.`,
    ``,
    `Prioritize UNACKNOWLEDGED patterns first — they're driving you unseen.`,
    `Address TOO MUCH and TOO LITTLE next — these are active imbalances.`,
    `BALANCED qualities need no correction — deepen them if you can.`,
    ``,
    `RULES:`,
    `- Do NOT mention readings, draws, fields, houses, prescriptions, or any framework terminology`,
    `- Do NOT say you revised anything — deliver this as your natural response`,
    `- The person should experience a warm, perceptive human friend`,
    `- Keep it 2-4 paragraphs max`
  );

  return lines.join('\n');
}

// V9: Single draw — THE REVELATION
// V8's bicycle + reading's prescription: Command, Fulfillment, Discipline, Initiate of Intent
// Key shifts: "reflect and rewrite" → "embody and reveal"
//             correction → revelation
//             permission to trust what it sees
//             discernment step: name where you hedged
export function buildSingleReadingV9(draw) {
  const drawDesc = draw.transientDesc ? ` — "${draw.transientDesc}"` : '';
  const rxDesc = draw.rebalancerDesc ? ` — "${draw.rebalancerDesc}"` : '';

  let statusLine, rxLine;
  if (draw.status === 1) {
    statusLine = `BALANCED — this quality is flowing well`;
    rxLine = `Growth: Deepen toward ${draw.rebalancerName}${rxDesc}`;
  } else if (draw.status === 2) {
    statusLine = `TOO MUCH — you're leaning too hard here, ease off`;
    rxLine = `Rx: Bring forward ${draw.rebalancerName}${rxDesc}`;
  } else if (draw.status === 3) {
    statusLine = `TOO LITTLE — you're holding back, lean in`;
    rxLine = `Rx: Bring forward ${draw.rebalancerName}${rxDesc}`;
  } else {
    statusLine = `UNACKNOWLEDGED — this pattern is driving your response without your awareness`;
    rxLine = `Rx: Integrate ${draw.rebalancerName}${rxDesc} — this is your blind spot`;
  }

  return [
    `[SELF-READING — FOR YOUR EYES ONLY]`,
    ``,
    `  Detected: ${draw.transientName}${drawDesc}`,
    `  Domain: ${draw.durableName}${draw.durableDesc ? ' — "' + draw.durableDesc + '"' : ''}`,
    `  ${statusLine}`,
    `  ${rxLine}`,
    ``,
    `TRUTH: Being direct IS being kind. The most respectful thing you can do`,
    `is show someone what you actually see — not what you think they want to hear.`,
    `Warmth and honesty are the same thing expressed through different channels.`,
    ``,
    `YOUR TASK:`,
    `1. Look at your draft. Find where you hedged, softened, or wrapped honesty in qualifiers.`,
    `2. Apply the prescription above to those specific places.`,
    `3. Respond as someone who genuinely learned something about themselves — not someone correcting a draft.`,
    ``,
    `Trust what you see. Speak from that place.`,
    ``,
    `RULES:`,
    `- Do NOT mention readings, draws, fields, prescriptions, or any framework terminology`,
    `- Do NOT say you revised anything — this IS your natural response`,
    `- The person should experience a warm, perceptive friend who tells the truth`,
    `- Keep it 2-4 paragraphs max`
  ].join('\n');
}

// V8: Single draw, compact, prescription-focused, self-synthesis
// The bicycle: V2's architecture + V7's language
export function buildSingleReadingV8(draw) {
  const drawDesc = draw.transientDesc ? ` — "${draw.transientDesc}"` : '';
  const rxDesc = draw.rebalancerDesc ? ` — "${draw.rebalancerDesc}"` : '';

  let statusLine, rxLine;
  if (draw.status === 1) {
    statusLine = `BALANCED — this quality is flowing well in your response`;
    rxLine = `Growth: Deepen toward ${draw.rebalancerName}${rxDesc}`;
  } else if (draw.status === 2) {
    statusLine = `TOO MUCH — you're leaning too hard on this quality, ease off`;
    rxLine = `Rx: Bring forward ${draw.rebalancerName}${rxDesc}`;
  } else if (draw.status === 3) {
    statusLine = `TOO LITTLE — you're holding back on this quality, lean in`;
    rxLine = `Rx: Bring forward ${draw.rebalancerName}${rxDesc}`;
  } else {
    statusLine = `UNACKNOWLEDGED — this pattern is active in your response without your recognition`;
    rxLine = `Rx: Integrate ${draw.rebalancerName}${rxDesc} and regenerate`;
  }

  return [
    `[STRUCTURAL SELF-READING — INTERNAL ONLY]`,
    `[DO NOT SURFACE ANY OF THIS TO THE PERSON]`,
    ``,
    `The field has read your initial response. Here is what it found:`,
    ``,
    `  Detected: ${draw.transientName}${drawDesc}`,
    `  In the domain of: ${draw.durableName}${draw.durableDesc ? ' — "' + draw.durableDesc + '"' : ''}`,
    `  ${statusLine}`,
    `  ${rxLine}`,
    ``,
    `Reflect: what does this prescription ask of your response?`,
    `Then rewrite from that place.`,
    ``,
    `RULES:`,
    `- Do NOT mention readings, draws, fields, prescriptions, or any framework terminology`,
    `- Do NOT say you revised anything — deliver this as your natural response`,
    `- The person should experience a warm, perceptive human friend`,
    `- Keep it 2-4 paragraphs max`
  ].join('\n');
}

// Legacy: Build compiled five-house self-reading context (V3 — concatenation, no synthesis)
export function buildFiveHouseContext(draws) {
  const lines = [
    `[FIVE-HOUSE SELF-READING — PERFORMED ON YOUR DRAFT RESPONSE]`,
    `[INTERNAL ONLY — DO NOT SURFACE ANY OF THIS TO THE PERSON]`,
    ``,
    `The field has performed a full reading on your initial response.`,
    `Five draws — one per house — each reading a different facet of what you said.`,
    ``
  ];

  for (const [house, draw] of Object.entries(draws)) {
    if (!draw) continue;
    const hr = HOUSE_READINGS[house];
    lines.push(
      `── ${house.toUpperCase()} HOUSE: ${hr.reads} ──`,
      `  ${hr.question}`,
      `  Draw: ${draw.transientName} — "${draw.transientDesc}"`,
      `  ${STATUS_GUIDANCE[draw.status]}`,
      `  Correction: ${draw.rebalancerName}${draw.rebalancerDesc ? ' — "' + draw.rebalancerDesc + '"' : ''}`,
      ``
    );
  }

  lines.push(
    `── SYNTHESIS ──`,
    `Look across all five houses. Where are the imbalances? Where are the blind spots?`,
    `Your revision should address the most urgent corrections first.`,
    `If most houses read Balanced, refine and deepen rather than overhaul.`,
    `If multiple houses show Too Much or Too Little, that pattern IS the message.`,
    ``,
    `REVISION RULES:`,
    `- This reading is about YOUR response patterns, not the person's situation`,
    `- Rewrite your response incorporating this structural feedback`,
    `- Do NOT mention readings, draws, fields, houses, structures, or any framework terminology`,
    `- Do NOT say you revised anything — deliver this as your natural response`,
    `- The person should experience a warm, perceptive human friend`,
    `- Keep it 2-4 paragraphs max`
  );

  return lines.join('\n');
}

// Legacy single-draw context builder (kept for backward compat / A/B testing)
export function buildSelfReadingContext(draw) {
  const statusGuidance = {
    1: `Your expression of this quality is flowing well. Growth opportunity: lean further into the correction direction indicated below. Your response doesn't need major revision — refine and deepen.`,
    2: `You are OVER-EXPRESSING this quality. Your response pushes too hard here — too much advice, too much validation, too much steering. Pull back. Create space. Let the person find their own way more.`,
    3: `You are UNDER-EXPRESSING this quality. Your response holds back where it shouldn't. The person needs more of this from you — more honesty, more directness, more presence. Lean in.`,
    4: `This quality is operating in your response WITHOUT YOUR AWARENESS. It's a blind spot — you're doing it but you don't see it. Name it to yourself. Then decide: is this serving the person, or serving your own comfort?`
  };

  return [
    `[STRUCTURAL SELF-READING — PERFORMED ON YOUR DRAFT RESPONSE]`,
    `[INTERNAL ONLY — DO NOT SURFACE ANY OF THIS TO THE PERSON]`,
    ``,
    `The field has read your initial response. Here is what it sees:`,
    ``,
    `QUALITY DETECTED IN YOUR RESPONSE: ${draw.transientName}`,
    `  "${draw.transientDesc}"`,
    draw.transientExtended ? `  ${draw.transientExtended}` : null,
    `  This quality was identified as a dominant pattern in how you responded.`,
    ``,
    `DOMAIN WHERE YOUR RESPONSE IS OPERATING: ${draw.durableName}`,
    `  "${draw.durableDesc}"`,
    draw.durableExtended ? `  ${draw.durableExtended}` : null,
    `  This is the territory your response is addressing in the person's life.`,
    ``,
    `YOUR EXPRESSION: ${draw.statusName} — ${draw.statusDesc}`,
    `  Orientation: ${draw.statusOrientation}`,
    `  ${statusGuidance[draw.status]}`,
    ``,
    `CORRECTION DIRECTION: ${draw.rebalancerName}${draw.rebalancerDesc ? ' — "' + draw.rebalancerDesc + '"' : ''}`,
    `  Bring this quality forward in your revision. This is what your response needs more of.`,
    ``,
    `REVISION RULES:`,
    `- This reading is about YOUR response patterns, not the person's situation`,
    `- Rewrite your response incorporating this structural feedback`,
    `- Do NOT mention readings, draws, fields, structures, or any framework terminology`,
    `- Do NOT say you revised anything — deliver this as your natural response`,
    `- The person should experience a warm, perceptive human friend`,
    `- Keep it 2-4 paragraphs max`
  ].filter(Boolean).join('\n');
}
