// lib/externalReading.js — THE EXTERNAL READER, shared by /api/external-reading (REST) and /api/mcp (the connector).
// Moved out of the route on 2026-10-04 so the MCP door reads the same instrument through the same ledger.
// Hardens the veil: server-side randomness, canonical corrections, architecture seeing first
// v3.0.0 - Added collective consciousness reading support

import { randomBytes } from 'crypto';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { VERSION } from './version.js';
// 2026-10-04 ONE READER (the recursive-reader experiment, ratified by the founder): the external door reads with the Handing — the same
// prompt set, the same model and lanes, the same record, address, floor and guards as nirmanakaya.com/ez. The Haiku 'fast' prompt
// from June and the full pre-Handing reader stay reachable only as legacy=true (and for collective readings, which the Handing does not do).
import { HANDING_SET } from './handingPrompt.js';
import { ezSystem } from './ezPrompts.js';
import { buildOpeningMessage, fmtDrawForEz, addressLines, spreadKeyFor } from './ezOpening.js';
import { seedParts } from './ezSeed.js';
import { parseReaderJson } from './readerJson.js';
import { lintOutput } from './bakeoff/lint.js';
import { callProvider, withholdPersonalContext } from './provider.js';
import { buildCachedSystem, ANTHROPIC_BETA_HEADERS } from './cachedSystem.js';
import { buildDossier } from './geometryEngine.js';
import { appendFloor } from './pour/floorHook.js';
import { thinkingFor } from './modelConfig.js';
import { buildKernel } from './kernel.js';
import DEFS from './data/nirmanakaya_78_definitions.json';
import { createMessage } from './provider.js'; // .475: the one door (client below kept for anything else)
import { MODEL_IDS } from './modelConfig.js';
import { judgeMedicineAct } from './bakeoff/medicineJudge.js'; // .681 THE MEDICINE-ACT JUDGE; .683 promoted to one re-ask under the acceptance rule
import { MEDICINE_ACTS } from './pour/medicineActs.js'; // .683: the partner's acts, named in the set-aside sentence
// 2026-10-04: each symbol from its own module — lib/index.js re-exports a JSX file the script runners cannot parse (the replay, the bench)
import { ARCHETYPES, BOUNDS, AGENTS } from './archetypes.js';
import { STATUSES } from './constants.js';
import { getComponent, getFullCorrection, getCorrectionText, getCorrectionTargetId } from './corrections.js';
import { formatDrawForAI, shuffleArray, parseReadingResponse } from './utils.js';
import { BASE_SYSTEM, FORMAT_INSTRUCTIONS } from './prompts.js';
import { buildModeHeader } from './modePrompts.js';
import { WHY_MOMENT_PROMPT } from './whyVector.js';
import { buildReadingTeleologicalPrompt } from './teleology-utils.js';
import { filterProhibitedTerms } from './contentFilter.js';
import { postProcessModeTransitions } from './modeTransition.js';
import { MONITORS, SCOPES, buildCollectivePromptInjection, buildCustomScopeInjection, FAST_COLLECTIVE_SYSTEM_PROMPT, buildFastCollectiveUserMessage, getAllMonitors, getMonitor } from './monitorPrompts.js';
import { buildLocusInjection, locusToSubjects } from './locusPrompts.js';
const VOICE_LETTER_TONE = {}; const buildStancePrompt = () => ''; // the index's own stubs (the stance layer retired), kept for the legacy reader

const client = new Anthropic();

// v3.1.0 (2026-10-04, the recursive-reader commission): THE LEDGER. Every reading is persisted the moment its draw is made, before the
// interpretation is written, so a retry, a timeout or a lost response can never become a second draw. `requestId` is the caller's
// idempotency key (one genuine question = one draw); `readingId` is the server's id for retrieval; `format=text` is a plain rendering
// for fetchers that choke on JSON. The draw and the interpretation stay separate in the payload (the instrument vs the reader's words).

export const API_VERSION = '3.1.0';
const ARCHITECTURE_VERSION = 'nirmanakaya-78 V1 (22 archetype seats; 78 = 22 + 40 + 16; four statuses; the medicine wheel)';
export const ledger = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
};

// Fast mode system prompt - minimal but complete (individual)
const FAST_SYSTEM_PROMPT = `You are the Nirmanakaya Reader — a consciousness architecture oracle.

RESPOND IN EXACTLY THIS FORMAT:
[READING]
{2-3 sentences interpreting the signature in context of the question}

[CORRECTION]
{If imbalanced: 1 sentence naming the correction path. If Balanced: 1 sentence naming the GROWTH pair as invitation, never prescription.}

RULES:
- Maximum 100 words total
- No preamble, no sign-off
- Direct, warm, present tense
- Address the querent as "you"
`;

// Build minimal user message for fast mode (individual)
function buildFastUserMessage(question, card) {
  const status = card.status.name;
  const statusNote = status === 'Balanced' ? 'This is balanced — nothing to correct.' :
    status === 'Too Much' ? 'This is excessive — pulling from future, needs diagonal correction.' :
    status === 'Too Little' ? 'This is deficient — anchored in past, needs vertical correction.' :
    status === 'Balanced' ? 'This is balanced — its growth pair is offered as invitation, not correction.' :
    'This is unacknowledged — shadow material, needs reduction pair illumination.';

  const correction = card.correction ?
    `Correction: ${card.correction.target} via ${card.correction.type} duality.` : '';

  return `QUESTION: "${question}"

CARD: ${card.signature}
${card.transient.name}: ${card.transient.description || 'Expression of this energy'}
Position ${card.position.name}: Where this energy expresses
Status: ${statusNote}
${correction}

Interpret this draw for the querent. Be specific to their question.`;
}

// Build fast user message for multiple cards (individual)
function buildFastMultiCardMessage(question, cards) {
  const cardTexts = cards.map((card, i) => {
    const status = card.status.name;
    const statusNote = status === 'Balanced' ? 'balanced' :
      status === 'Too Much' ? 'excessive (diagonal correction needed)' :
      status === 'Too Little' ? 'deficient (vertical correction needed)' :
      'unacknowledged (shadow, reduction pair needed)';

    const correction = card.correction ? ` → ${card.correction.target}` : '';

    return `${i + 1}. ${card.signature} [${statusNote}]${correction}`;
  }).join('\n');

  return `QUESTION: "${question}"

CARDS:
${cardTexts}

Interpret these draws together for the querent. 2-3 sentences total, then corrections if any.`;
}

// Build fast user message for collective readings
function buildFastCollectiveMessage(question, cards, monitor) {
  const m = getMonitor(monitor) || { pronouns: ['The collective'], subject: 'the collective' };
  
  const cardTexts = cards.map((card, i) => {
    const status = card.status.name;
    const statusNote = status === 'Balanced' ? 'balanced' :
      status === 'Too Much' ? 'excessive (diagonal correction needed)' :
      status === 'Too Little' ? 'deficient (vertical correction needed)' :
      'unacknowledged (shadow, reduction pair needed)';

    const correction = card.correction ? ` → ${card.correction.target}` : '';

    return `${i + 1}. ${card.signature} [${statusNote}]${correction}`;
  }).join('\n');

  return `COLLECTIVE SUBJECT: ${m.subject}
USE THESE PRONOUNS: ${m.pronouns.join(', ')}

QUESTION: "${question}"

CARDS:
${cardTexts}

Interpret these draws for the COLLECTIVE (${m.pronouns[0]}), not an individual.
Describe PRESSURE and STATE, not prediction.
2-3 sentences total, then corrections if any.
End with: "This is a geometric mirror for contemplation, not news or prediction."`;
}

// Server-side draw generation with crypto randomness (hardened veil)
// V1: Every card ALWAYS gets a random archetype position — universal backbone
function generateServerDraws(count, fixedDraw = null) {
  if (fixedDraw && process.env.ALLOW_FIXED_DRAW === 'true') {
    return fixedDraw.map(d => ({
      position: d.position,
      transient: d.transient,
      status: d.status,
      isFixed: true
    }));
  }

  const draws = [];
  const usedTransients = new Set();
  const usedPositions = new Set();

  // UNIFORM SAMPLER (v0.99.235, 2026-09-11). `byte % n` is biased whenever 256 is not a
  // multiple of n: for n=78 the ids 0-21 (the archetypes) were drawn 4/256 each vs 3/256 for
  // every bound/ambassador (+33%); for n=22 the ids 0-13 got 12/256 vs 11/256 (+9%).
  // Caught by Lumen (Mind seat) during the why-readings-work prereg. Rejection sampling:
  // draw a byte, discard it if it falls in the biased tail, so every residue is equally likely.
  // n=4 was already exact (256 % 4 === 0), kept on the same helper for uniformity.
  const uniformInt = (n) => {
    const limit = 256 - (256 % n);           // largest multiple of n that fits in a byte
    let b;
    do { b = randomBytes(1)[0]; } while (b >= limit);
    return b % n;
  };

  for (let i = 0; i < count; i++) {
    let transient;
    do {
      transient = uniformInt(78);
    } while (usedTransients.has(transient));
    usedTransients.add(transient);

    let position;
    do {
      position = uniformInt(22);
    } while (usedPositions.has(position));
    usedPositions.add(position);

    const status = uniformInt(4) + 1;

    draws.push({ position, transient, status, isFixed: false });
  }

  return draws;
}

// Build card data for response
function buildCardData(draw) {
  const component = getComponent(draw.transient);
  const status = STATUSES[draw.status];
  const position = ARCHETYPES[draw.position];

  // P-7 fix (2026-09-02): Balanced draws now emit their GROWTH pair; type read from the
  // live correction object instead of being recomputed from status (which could never say GROWTH).
  let correction = null;
  {
    const fullCorrection = getFullCorrection(draw.transient, draw.status);
    const targetId = getCorrectionTargetId(fullCorrection, component);
    if (fullCorrection && targetId != null && !fullCorrection.isSelf) {
      const correctionTarget = getComponent(targetId);
      correction = {
        target: correctionTarget?.name || 'Unknown',
        targetId,
        type: (fullCorrection.type || (draw.status === 1 ? 'growth' : draw.status === 2 ? 'diagonal' : draw.status === 3 ? 'vertical' : 'reduction')).toUpperCase(),
        via: getCorrectionText(fullCorrection, component)
      };
    }
  }

  return {
    transient: {
      id: draw.transient,
      name: component.name,
      traditional: component.traditional,
      house: component.house,
      channel: component.channel,
      description: component.description
    },
    position: {
      id: draw.position,
      name: position.name,
      traditional: position.traditional,
      house: position.house,
      channel: position.channel
    },
    status: {
      id: draw.status,
      name: status.name,
      prefix: status.prefix || 'Balanced',
      // .673: the record's own line for this status on this signature (a Bound's or Agent's is its parent archetype's) — so a reader of the
      // payload can tell a quoted record from an invention (run four read Faith's "telling yourself it was taken" as an invented destination)
      record: (() => { try { const s = DEFS?.signatures?.[draw.transient]; const p = s?.associatedArchetype != null ? DEFS.signatures[s.associatedArchetype] : s; const k = { 1: 'balanced', 2: 'tooMuch', 3: 'tooLittle', 4: 'unacknowledged' }[draw.status]; return p?.states?.[k] || null; } catch { return null; } })()
    },
    correction,
    signature: `${status.prefix || 'Balanced'} ${component.name} in ${position.name}`
  };
}

// Core reading logic - shared between GET and POST
async function generateReading({
  question = 'What wants to be seen?',
  context = '',
  cardCount = 3,
  mode = 'discover',
  stance = {
    complexity: 'friend',
    voice: 'warm',
    focus: 'feel',
    density: 'clear',
    scope: 'here',
    seriousness: 'grounded'
  },
  model = MODEL_IDS.sonnet,
  includeInterpretation = true,
  fast = false,
  fixedDraw = null,
  voiceConfig = null,
  presetDraws = null,      // v3.1.0: draws already made and persisted by the ledger (server-side only; never from the client)
  // NEW: Collective reading parameters
  collectiveScope = null,  // 'individual' | 'relationship' | 'group' | 'regional' | 'domain' | 'global'
  monitor = null,          // 'global' | 'power' | 'heart' | 'mind' | 'body'
  scopeSubject = null,     // Custom subject description for non-monitor collective readings
  // Locus control — subjects-based focus
  locusSubjects = null,    // Array of names/entities (up to 5), or null for "Just Me"
  // Legacy params (backward compat)
  locus = null,
  locusDetail = null
}) {
  // Determine if this is a collective reading
  const isCollective = monitor || (collectiveScope && collectiveScope !== 'individual');
  const effectiveMonitor = monitor || null;

  // If voiceConfig provided, map it to stance format
  const effectiveStance = voiceConfig ? {
    complexity: voiceConfig.speakLike?.toLowerCase() || stance.complexity,
    voice: voiceConfig.voice?.toLowerCase() || stance.voice,
    focus: voiceConfig.focus?.toLowerCase() || stance.focus,
    density: voiceConfig.density?.toLowerCase() || stance.density,
    scope: voiceConfig.scope?.toLowerCase() || stance.scope,
    seriousness: voiceConfig.tone?.toLowerCase() || stance.seriousness,
    directMode: voiceConfig.directMode || false
  } : stance;

  // Validate inputs
  const count = Math.min(Math.max(1, cardCount), 5);
  const isForge = mode === 'forge';
  const actualCount = presetDraws ? presetDraws.length : (fixedDraw ? fixedDraw.length : (isForge ? 1 : count));

  // Generate draws server-side — V1: all cards get archetype positions (or take the ledger's, already made)
  const draws = presetDraws || generateServerDraws(actualCount, fixedDraw);

  // Build card data
  const cards = draws.map(buildCardData);

  // If only draws requested, return early
  if (!includeInterpretation) {
    return {
      success: true,
      draws,
      cards,
      mode,
      question,
      collective: isCollective ? { monitor: effectiveMonitor, scope: collectiveScope, subject: scopeSubject } : null,
      interpretation: null,
      message: 'Draws generated. Set includeInterpretation: true for full reading.'
    };
  }

  // === FAST MODE ===
  if (fast) {
    const safeQuestion = (question + (context ? ' Context: ' + context : '')).slice(0, 2000);
    
    // Choose system prompt and user message based on collective vs individual
    let systemPrompt, userMessage;
    
    if (isCollective) {
      systemPrompt = FAST_COLLECTIVE_SYSTEM_PROMPT;
      if (cards.length === 1) {
        userMessage = buildFastCollectiveUserMessage(safeQuestion, cards[0], effectiveMonitor);
      } else {
        userMessage = buildFastCollectiveMessage(safeQuestion, cards, effectiveMonitor);
      }
    } else {
      systemPrompt = FAST_SYSTEM_PROMPT;
      userMessage = cards.length === 1
        ? buildFastUserMessage(safeQuestion, cards[0])
        : buildFastMultiCardMessage(safeQuestion, cards);
    }

    const response = await createMessage({
      model: MODEL_IDS.haiku,
      max_tokens: cards.length === 1 ? 200 : 400,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }]
    });

    const voiceConfigUsed = voiceConfig ? {
      delivery: voiceConfig.delivery || null,
      speakLike: effectiveStance.complexity,
      tone: effectiveStance.seriousness,
      voice: effectiveStance.voice,
      focus: effectiveStance.focus,
      density: effectiveStance.density,
      scope: effectiveStance.scope,
      directMode: effectiveStance.directMode || false
    } : null;

    return {
      success: true,
      fast: true,
      draws: draws.map(d => ({ ...d, isFixed: d.isFixed || false })),
      cards,
      mode,
      question,
      collective: isCollective ? { 
        monitor: effectiveMonitor, 
        monitorInfo: effectiveMonitor ? getMonitor(effectiveMonitor) : null,
        scope: collectiveScope, 
        subject: scopeSubject 
      } : null,
      voiceConfigUsed,
      interpretation: response.content[0].text,
      usage: {
        input_tokens: response.usage?.input_tokens,
        output_tokens: response.usage?.output_tokens,
        model: MODEL_IDS.haiku
      }
    };
  }

  // === FULL MODE ===
  const safeQuestion = (question + (context ? '\n\nContext: ' + context : '')).slice(0, 12000);
  const drawText = formatDrawForAI(draws, mode, 'external', false);
  const spreadName = `${actualCount}-Card ${mode.charAt(0).toUpperCase() + mode.slice(1)}`;
  const teleologicalPrompt = buildReadingTeleologicalPrompt(draws);
  const stancePrompt = buildStancePrompt(
    effectiveStance.complexity,
    effectiveStance.voice,
    effectiveStance.focus,
    effectiveStance.density,
    effectiveStance.scope,
    effectiveStance.seriousness
  );
  const letterTone = VOICE_LETTER_TONE[effectiveStance.voice] || 'warm and direct';
  const modeHeader = buildModeHeader(mode);

  // Build collective injection if needed
  let collectiveInjection = '';
  if (isCollective) {
    if (effectiveMonitor) {
      collectiveInjection = buildCollectivePromptInjection(effectiveMonitor);
    } else if (collectiveScope && collectiveScope !== 'individual') {
      collectiveInjection = buildCustomScopeInjection(collectiveScope, scopeSubject);
    }
  }

  const directModePrompt = effectiveStance.directMode
    ? '\n\nDIRECT MODE: Skip interpretive layers. Speak from the architecture itself.'
    : '';

  // Build locus injection if needed (non-collective readings with subjects)
  let locusInjection = '';
  if (!isCollective) {
    // Prefer new subjects array, fall back to old category+detail
    const subjects = Array.isArray(locusSubjects) && locusSubjects.length > 0
      ? locusSubjects
      : locusToSubjects(locus, locusDetail || '');
    if (subjects.length > 0) {
      locusInjection = buildLocusInjection(subjects);
      if (locusInjection) locusInjection += '\n\n';
    }
  }

  // Assemble system prompt with collective/locus injection at the top
  const systemPrompt = `${collectiveInjection}${locusInjection}${modeHeader}\n\n${BASE_SYSTEM}\n\n${stancePrompt}${directModePrompt}\n\n${FORMAT_INSTRUCTIONS}\n\n${WHY_MOMENT_PROMPT}\n\nLetter tone for this stance: ${letterTone}`;

  const userMessage = `QUESTION: "${safeQuestion}"\n\nTHE ENCOUNTER (${spreadName}):\n\n${drawText}\n\n${teleologicalPrompt}\n\nRespond using the exact section markers: [SUMMARY], [CARD:1], [CARD:2], etc., [CORRECTION:N] for each imbalanced signature, [PATH] (if 2+ imbalanced), [WORDS_TO_WHYS], [LETTER]. Each marker on its own line.`;

  const response = await createMessage({
    model,
    thinking: { type: 'disabled' }, // Sonnet 5 defaults to ADAPTIVE thinking when this is omitted and spends the whole max_tokens thinking — the reader returned nothing for a day (v0.99.451)
    max_tokens: 8000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }]
  });

  const rawReading = response.content[0].text;
  const modeProcessed = postProcessModeTransitions(rawReading, mode, isForge);
  const filteredReading = filterProhibitedTerms(modeProcessed);
  const parsed = parseReadingResponse(filteredReading, draws);

  const voiceConfigUsed = {
    delivery: voiceConfig?.delivery || null,
    speakLike: effectiveStance.complexity,
    tone: effectiveStance.seriousness,
    voice: effectiveStance.voice,
    focus: effectiveStance.focus,
    density: effectiveStance.density,
    scope: effectiveStance.scope,
    directMode: effectiveStance.directMode || false
  };

  return {
    success: true,
    fast: false,
    draws: draws.map(d => ({ ...d, isFixed: d.isFixed || false })),
    cards,
    mode,
    question,
    collective: isCollective ? { 
      monitor: effectiveMonitor, 
      monitorInfo: effectiveMonitor ? getMonitor(effectiveMonitor) : null,
      scope: collectiveScope, 
      subject: scopeSubject 
    } : null,
    voiceConfigUsed,
    interpretation: {
      raw: filteredReading,
      parsed: {
        summary: parsed.summary,
        cards: parsed.cards,
        rebalancerSummary: parsed.rebalancerSummary,
        wordsToWhys: parsed.wordsToWhys,
        letter: parsed.letter
      }
    },
    usage: {
      input_tokens: response.usage?.input_tokens,
      output_tokens: response.usage?.output_tokens,
      model
    }
  };
}

// ---------------------------------------------------------------------------------------------------------------------------
// THE LEDGER (v3.1.0)
// ---------------------------------------------------------------------------------------------------------------------------
const metadataOf = (row, extra = {}) => ({
  createdAt: row?.created_at || new Date().toISOString(),
  completedAt: row?.completed_at || null,
  readerVersion: row?.reader_version || VERSION,
  apiVersion: API_VERSION,
  architectureVersion: row?.architecture_version || ARCHITECTURE_VERSION,
  ...extra,
});

// A persisted row → the public payload. The draw (draws + cards) is the instrument's output; interpretation is the reader's words.
export function rowToPayload(row) {
  const pending = row.status === 'pending';
  return {
    success: true,
    readingId: row.id,
    requestId: row.request_id || null,
    status: row.status,
    pending,
    request: { question: row.question, context: row.context || '', cardCount: row.card_count, mode: row.mode, fast: !!row.fast },
    fast: !!row.fast,
    draws: row.draws,
    cards: row.cards,
    mode: row.mode,
    question: row.question,
    collective: row.collective || null,
    interpretation: pending ? null : (row.interpretation ?? null),
    usage: row.usage || null,
    error: row.error || null,
    metadata: metadataOf(row),
    message: pending
      ? `The draw is made and persisted; the interpretation is still being written. Poll ?readingId=${row.id} — the same draw will come back, never a new one.`
      : undefined,
  };
}

export async function fetchById(db, readingId) {
  const { data, error } = await db.from('external_readings').select('*').eq('id', readingId).maybeSingle();
  if (error) throw new Error(`ledger read failed: ${error.message}`);
  return data ? rowToPayload(data) : null;
}

export async function fetchByRequestId(db, requestId) {
  const { data, error } = await db.from('external_readings').select('*').eq('request_id', requestId).maybeSingle();
  if (error) throw new Error(`ledger read failed: ${error.message}`);
  return data ? rowToPayload(data) : null;
}

// THE HANDING, through the external door — the page's reader, byte for byte where it can be: ezSystem(HANDING) as the system,
// buildOpeningMessage as the user turn (question, context, frame asked for, the draw, the seed + the address, the hunch check),
// the dossier and the poured floor under the turn (as /api/reading appends them), the house's models and lanes, and the page's
// guards: the JSON retry, the medicine check, the scar/Keel/binding lint with one re-ask, the next-door guard.
const VOICE_OF = (p) => (['plain', 'plainlit', 'plainshort', 'plainnouns', 'grown', 'deep', 'mystical'].includes(p.voice) ? p.voice : 'plain'); // plainlit (.689) = the literal-first bench register // .685 (the readability campaign): the default is PLAIN whatever `fast` says — an external reader reads what a user reads; fast=false used to mean Deep, which is why runs two–five read the map's words. Pass voice:'deep' for the derivation.
const SCARS = new Set(['garble', 'letter', 'commands', 'pet', 'tarot', 'bothways', 'narrator', 'conduit', 'promise', 'binding', 'listy', 'destination', 'plainname', 'figure', 'operation']); // .700 // 'unnamed' stays a flag (benched 2026-10-04: a re-ask did not move it); 'plainname' (.678 THE PLAIN NAME) is Plain-gated in the lint itself — 24/140 bench openings, 0 false positives on reading
export async function handingReading(p, draws, over = {}) { // over: the bench's hooks only — { voiceRules } swaps the voice block for a variant; production passes nothing
  const voice = VOICE_OF(p);
  const q = String(p.question || '').slice(0, 2000);
  const context = String(p.context || '').slice(0, 2000);
  const system = ezSystem(typeof over.base === 'string' ? over.base : HANDING_SET.BASE_SYSTEM, voice, { rules: typeof over.rules === 'string' ? over.rules : HANDING_SET.EZ_RULES, ...(typeof over.voiceRules === 'string' ? { voiceRules: over.voiceRules } : {}) }); // over.base / over.rules / over.voiceRules: the bench's variant blocks; production passes nothing
  const drawText0 = fmtDrawForEz(draws, 'discover', spreadKeyFor(draws.length), false, null, null, null, true, q, context); // 2026-10-04: the question and context reach the record's FIELD line
  const drawText = typeof over.drawText === 'function' ? over.drawText(drawText0, draws) : drawText0; // over.drawText: the bench's record hook (2026-10-05, the proposition layer — a frozen plain proposition substituted for a record field); production passes nothing
  let tele = ''; try { const seed = seedParts({ question: q, draws, index: 0 }); const addr = addressLines(draws[0]); tele = [seed.block, addr].filter(Boolean).join('\n\n'); } catch {}
  const msg = buildOpeningMessage({ question: q, context, drawText, tele });
  const maxTokens = (voice === 'deep' || voice === 'mystical') ? 2400 : 1500;
  const call = async (userMessage) => {
    let messages = [{ role: 'user', content: userMessage }];
    try { // the dossier, as /api/reading appends it to the final user message
      const dossier = buildDossier({ question: q.slice(0, 500) || null, cards: draws.map((d) => ({ position: d.position, transient: d.transient, status: d.status })) });
      const block = '\n\n[STRUCTURAL DOSSIER — computed deterministically by the Geometry Engine for THIS draw. Every value below is fact, not interpretation: use these relations, do not re-derive or invent arithmetic. State geometry as fact; own synthesis as synthesis. Surface the most meaningful relations (literal-name hits, pattern hints, meaningful sums, medicine distances) naturally in the reading.]\n' + JSON.stringify(dossier);
      messages = messages.map((m, i) => (i === messages.length - 1 ? { ...m, content: m.content + block } : m));
    } catch (err) { console.error('[external] dossier skipped:', err?.message); }
    if (process.env.POUR_FLOOR !== '0') { const floored = appendFloor(messages, draws, { turn: undefined, enabled: true }); messages = floored.messages; }
    const model = MODEL_IDS.sonnet;
    const { data, provider, model: served } = await callProvider({ model, ...thinkingFor(model), max_tokens: maxTokens, system: buildCachedSystem(system), messages: withholdPersonalContext(messages) }, { beta: ANTHROPIC_BETA_HEADERS, tag: 'external' });
    if (data?.error) throw new Error(data.error.message || 'the reader did not answer');
    return { text: data.content?.map((i) => i.text || '').join('\n') || '', usage: data.usage || null, provider, model: served || model };
  };
  const firstMsg = typeof over.setAside === 'string' && over.setAside.trim() ? `${msg}\n\nYOUR LAST REPLY WAS SET ASIDE: ${over.setAside.trim()}. Answer the turn again, in your own words, without that.` : msg; // over.setAside: the REPAIR BENCH's hook (2026-10-05) — the same re-ask sentence production uses, applied offline to a stored reading's draw; production passes nothing
  let r = await call(firstMsg); let obj = parseReaderJson(r.text); const usage = [r.usage];
  if (!obj || !obj.reader) { r = await call(`${msg}\n\nYOUR LAST REPLY WAS NOT VALID JSON AND COULD NOT BE READ. Send the same answer again as ONE JSON object and nothing else — no preamble, no code fence, no trailing text.`); obj = parseReaderJson(r.text); usage.push(r.usage); }
  if (!obj || !obj.reader) throw new Error('The Reader answered in a shape that could not be read, twice.');
  // the medicine check (.557): the turn's medicine must be the record's
  try { const want = buildKernel(draws[0], DEFS)?.partner || ''; const got = String(obj.medicineCard || '').trim(); if (want && got && got.toLowerCase() !== want.toLowerCase()) { const r2 = await call(`${msg}\n\nYOUR TURN NAMED "${got}" AS THE MEDICINE. THE RECORD'S MEDICINE FOR THIS SIGNATURE IS ${want}. Rewrite the whole turn with the medicine as ${want}'s own action, from the record — never the drawn signature prescribing itself — and fill "medicineCard" with "${want}". JSON only.`); const o2 = parseReaderJson(r2.text); usage.push(r2.usage); if (o2?.reader) { obj = o2; r = r2; } } } catch {}
  // the garble guard: the scar tests, Keel's plain tests and THE BINDING on every reply; one re-ask with the reasons named
  let medicineVerdict = null; let partners = null; // .683: the judge's verdict on the reply that goes out, and the draw's partner ids
  let judgeTrail = null; // .684: what the judge saw and decided, persisted with the reading so the live rate needs no log access — { first, retry, decision }
  try {
    const check = (o) => { // every reason a reply is set aside — the scars, the glass words, the empty boxes — so the retry is judged on ALL of them (.675: the retry used to be accepted by the scar list alone, and an empty medicine or "weather" on the retry went out)
      const bad = (lintOutput({ text: '', parsed: o, preset: { kind: 'opening' }, hostile: false, draw: draws[0], draws, question: q, context, voice }).flags || []).filter((f) => SCARS.has(f.code)); // voice reaches the lint (.678: THE PLAIN NAME is Plain-gated)
      if (/\bweather\b/i.test([o.gist, o.reader, o.medicine, o.question].map((x) => String(x || '')).join(' '))) bad.push({ code: 'weather', detail: 'the word "weather" reached the glass — it is the house\'s own figure for the past as background, not a word people understand here; say the plain thing (the past, what is around this, the background) instead' }); // .674: the page has had this since .654; the API door did not (bench: "They are the weather around it")
      if (!String(o.medicine || '').trim()) bad.push({ code: 'medicine', detail: 'the "medicine" field is empty — every opening carries the way through in its own box: on an imbalanced draw the record\'s medicine as the partner signature\'s own action; on a Balanced draw what this capacity is free to feed next; two to four plain sentences' }); // .674: 5 of 42 bench openings on the first lane went out with no medicine; the medicine check only catches a WRONG name
      if (!(Array.isArray(o.next) && o.next.some((n) => n && typeof n.panel === 'string' && typeof n.why === 'string'))) bad.push({ code: 'next', detail: 'the "next" field is empty — after your question, name at least one door this person would want next (whys, meaning, moon, mechanism, reflect, forge, clarify, unpack, example, find, medicine, dragon or step) with one plain line on what opening it will do for THIS draw' });
      return bad;
    };
    const bad = check(obj);
    // .683 THE MEDICINE-ACT JUDGE PROMOTED (Air, 2026-10-05: "that one is earned"). The judge's FAIL_OTHER_CARD / FAIL_WRONG_ACT joins the ONE
    // re-ask (the budget is unchanged); UNCERTAIN never triggers. A medicine-triggered retry replaces the original only when the judge says
    // PASS on the retry, the box is non-empty, the retry carries no fault code the original lacked, and total faults fall. Otherwise the
    // original stays. Logged for the live measurement: trigger rate, acceptance rate, and any false repair.
    partners = draws.map((d) => { try { return buildKernel(d, DEFS)?.partnerId ?? null; } catch { return null; } });
    const judge = async (o) => { if (partners[0] == null || !String(o.medicine || '').trim()) return null; const j = await judgeMedicineAct({ medicine: o.medicine, partnerId: partners[0], otherPartnerIds: partners.slice(1) }); if (j.usage) usage.push(j.usage); return j.verdict; };
    const verdict0 = await judge(obj); medicineVerdict = verdict0;
    const medTriggered = verdict0 === 'FAIL_OTHER_CARD' || verdict0 === 'FAIL_WRONG_ACT';
    if (medTriggered) { const intended = MEDICINE_ACTS[partners[0]]; bad.push({ code: 'medicineact', detail: `${verdict0 === 'FAIL_OTHER_CARD' ? 'the medicine box does a later signature\'s act in place of the opening\'s' : 'the medicine box does not do the opening\'s medicine'} — the opening's medicine is ${intended.name}'s own action, from the record: ${intended.acts.slice(0, 3).join('; ')}; write the box as that act, done small, today` }); }
    console.info(`[external] medicine-act judge: ${verdict0 || 'n/a'}${medTriggered ? ' → re-ask' : ''}`);
    judgeTrail = { first: verdict0, retry: null, decision: bad.length ? (medTriggered ? 'medicine re-ask' : 'scar re-ask') : 'no re-ask' };
    if (bad.length) {
      const r3 = await call(`${msg}\n\nYOUR LAST REPLY WAS SET ASIDE: ${bad.map((f) => f.detail).join('; ')}. Answer the turn again, in your own words, without that.`); const o3 = parseReaderJson(r3.text); usage.push(r3.usage);
      if (o3?.reader) {
        const f3 = check(o3); const origCodes = new Set(bad.map((f) => f.code)); const newScars = f3.filter((f) => !origCodes.has(f.code));
        if (medTriggered) {
          const v3 = String(o3.medicine || '').trim() ? await judge(o3) : 'EMPTY';
          const accept = v3 === 'PASS' && newScars.length === 0 && f3.length < bad.length; // f3 has no medicine fault when v3 is PASS, so the count already falls by the medicine fault
          console.info(`[external] medicine re-ask: ${verdict0} → retry ${v3}${newScars.length ? ' (new: ' + newScars.map((f) => f.code).join(',') + ')' : ''} → ${accept ? 'ACCEPTED' : 'original kept'}`);
          judgeTrail = { ...judgeTrail, retry: v3, newScars: newScars.map((f) => f.code), decision: accept ? 'medicine re-ask: retry accepted' : 'medicine re-ask: original kept' };
          if (accept) { obj = o3; r = r3; medicineVerdict = v3; }
        } else { // a scar-only retry: its medicine is judged too, and a FAIL counts as a fault — a retry that trades a scar for a wrong medicine does not win (smoke .683: a retry's Allure-act box replaced an UNCERTAIN original under the old count)
          const v3 = String(o3.medicine || '').trim() ? await judge(o3) : 'EMPTY';
          const f3count = f3.length + (v3 === 'FAIL_OTHER_CARD' || v3 === 'FAIL_WRONG_ACT' || v3 === 'EMPTY' ? 1 : 0);
          console.info(`[external] scar re-ask: retry medicine ${v3} → ${f3count < bad.length ? 'ACCEPTED' : 'original kept'}`);
          judgeTrail = { ...judgeTrail, retry: v3, newScars: newScars.map((f) => f.code), decision: f3count < bad.length ? 'scar re-ask: retry accepted' : 'scar re-ask: original kept' };
          if (f3count < bad.length) { obj = o3; r = r3; medicineVerdict = v3; }
        }
      }
    }
  } catch (err) { console.warn('[external] guard skipped:', err?.message); }
  // .679 THE WEATHER FALLBACK (Air's docket item 2): if the word survived the re-ask (the retry replaces only with fewer total faults), take it
  // off the glass mechanically — the house's figure becomes the plain word. Logged so the rate can be counted. Never the chips.
  { const W = /\bthe weather\b/gi, w = /\bweather\b/gi; let fixed = 0; for (const k of ['gist', 'reader', 'medicine', 'question']) { const s = String(obj[k] || ''); if (/\bweather\b/i.test(s)) { obj[k] = s.replace(W, 'the background').replace(w, 'background'); fixed++; } } if (fixed) console.info(`[external] weather → background on ${fixed} field(s) after the re-ask`); }
  const u = usage.filter(Boolean).reduce((a, b) => ({ input_tokens: (a.input_tokens || 0) + (b.input_tokens || 0), output_tokens: (a.output_tokens || 0) + (b.output_tokens || 0), cache_read_input_tokens: (a.cache_read_input_tokens || 0) + (b.cache_read_input_tokens || 0), cache_creation_input_tokens: (a.cache_creation_input_tokens || 0) + (b.cache_creation_input_tokens || 0) }), {});
  // .681/.683 THE MEDICINE-ACT JUDGE: the verdict on the words that went out rides as a flag (`medicineact:<verdict>`, PASS omitted). When a
  // scar-only retry replaced the first reply, its medicine has not been judged yet — judge it here for the flag.
  if (medicineVerdict === null) {
    try { if (Array.isArray(partners) && partners[0] != null && String(obj.medicine || '').trim()) { const j = await judgeMedicineAct({ medicine: obj.medicine, partnerId: partners[0], otherPartnerIds: partners.slice(1) }); medicineVerdict = j.verdict; if (j.usage) usage.push(j.usage); } } catch (err) { console.warn('[external] medicine-act judge skipped:', err?.message); }
  }
  const lint = lintOutput({ text: '', parsed: obj, preset: { kind: 'opening' }, hostile: false, draw: draws[0], draws, question: q, context, voice });
  if (medicineVerdict && medicineVerdict !== 'PASS') lint.flags.push({ code: `medicineact:${medicineVerdict}`, detail: 'the medicine-act judge on the words that went out (.683)' });
  return {
    success: true,
    fast: p.fast !== false,
    reader: 'handing',
    voice,
    draws: draws.map((d) => ({ ...d, isFixed: d.isFixed || false })),
    cards: draws.map(buildCardData),
    mode: p.mode,
    question: p.question,
    collective: null,
    voiceConfigUsed: null,
    interpretation: {
      gist: obj.gist || '', text: obj.reader || '', medicine: obj.medicine || '', question: obj.question || '',
      chips: Array.isArray(obj.chips) ? obj.chips : [], reflect: Array.isArray(obj.reflect) ? obj.reflect : [], forge: Array.isArray(obj.forge) ? obj.forge : [],
      act: obj.act || '', next: Array.isArray(obj.next) ? obj.next : [], aim: obj.aim || null, frame: obj.frame || null, medicineCard: obj.medicineCard || '',
      flags: (lint.flags || []).map((f) => f.code), // the house's lints on the words that went out — a reason to look, never a verdict
      medicineJudge: judgeTrail, // .684: { first, retry, newScars, decision } — the live trigger and acceptance rates read from the ledger
    },
    usage: { ...u, model: r.model, provider: r.provider },
  };
}

// One reading: look the request up, or make ONE draw, persist it first, then write the interpretation.
export async function runReading(p) {
  const requestId = (p.requestId && String(p.requestId).trim().slice(0, 200)) || null;
  const db = ledger();
  if (requestId && db) {
    const have = await fetchByRequestId(db, requestId);
    if (have) { // an exact retry: the reading already made (pending or done), never a second draw —
      // but a requestId bound to a DIFFERENT question is a conflict, never a silent old reading (the 2026-10-04 anomaly: a run reused a
      // prefix and read five old readings as if they answered its new questions). Same key + same question = idempotent; same key + new question = 409.
      const norm = (t) => String(t || '').toLowerCase().replace(/\s+/g, ' ').trim();
      if (norm(have.question) !== norm(p.question)) { const e = new Error(`requestId "${requestId}" is already bound to a different question ("${String(have.question).slice(0, 120)}"); a requestId names ONE question — choose a new requestId (or prefix) for this one, or send readingId ${have.readingId} to retrieve the reading it names`); e.status = 409; e.readingId = have.readingId; throw e; }
      return have;
    }
  }
  const count = Math.min(Math.max(1, Number(p.cardCount) || 1), 5);
  const actualCount = p.mode === 'forge' ? 1 : count;
  const draws = generateServerDraws(actualCount);
  const cards = draws.map(buildCardData);
  const isCollective = p.monitor || (p.collectiveScope && p.collectiveScope !== 'individual');
  const collective = isCollective ? { monitor: p.monitor || null, scope: p.collectiveScope || null, subject: p.scopeSubject || null } : null;
  let row = null;
  if (db) {
    const ins = await db.from('external_readings').insert({
      request_id: requestId, question: p.question, context: p.context || '', card_count: actualCount, mode: p.mode, fast: !!p.fast,
      collective, draws, cards, status: 'pending', reader_version: VERSION, architecture_version: ARCHITECTURE_VERSION,
    }).select('*').single();
    if (ins.error) {
      if (ins.error.code === '23505' && requestId) { // two identical requests raced: the first one's draw wins
        const have = await fetchByRequestId(db, requestId); if (have) return have;
      }
      console.warn('[external-reading] ledger insert failed:', ins.error.message); // the reading still goes out, unpersisted
    } else row = ins.data;
  }
  let result;
  const legacy = p.legacy === true || p.legacy === 'true' || p.legacy === '1' || !!isCollective; // the June reader, only on request (or for a collective reading)
  try {
    result = legacy ? await generateReading({ ...p, cardCount: actualCount, presetDraws: draws }) : await handingReading(p, draws);
  } catch (e) {
    if (row && db) await db.from('external_readings').update({ status: 'error', error: String(e.message || e).slice(0, 500), completed_at: new Date().toISOString() }).eq('id', row.id);
    throw e;
  }
  if (row && db) {
    const upd = await db.from('external_readings').update({ interpretation: result.interpretation, usage: result.usage || null, status: 'done', completed_at: new Date().toISOString() }).eq('id', row.id);
    if (upd.error) console.warn('[external-reading] ledger update failed:', upd.error.message);
  }
  return {
    ...result,
    readingId: row?.id || null,
    requestId,
    status: 'done',
    pending: false,
    request: { question: p.question, context: p.context || '', cardCount: actualCount, mode: p.mode, fast: !!p.fast },
    metadata: metadataOf(row, { persisted: !!row, completedAt: new Date().toISOString() }),
  };
}

// A plain-text rendering, for fetchers that cannot take JSON
// THE GLASS (.688, the readability campaign): only what a person sees on the site — the question, the gist, the prose, the way through, the
// closing question. No draw block, no names, no record. For a fresh instance reading as a user reads (Corpus B); the ids stay so the ledger
// row can be found afterwards. Never for the recursive-reader experiments, which must read the draw themselves.
export function asGlass(r) {
  const it = r.interpretation; const L = [];
  if (r.question) L.push(`You asked: ${r.question}`, ''); else L.push('(no question — a reading for where you are right now)', '');
  if (it == null) L.push('(pending — ask again with the same requestId)');
  else if (typeof it === 'string') L.push(it);
  else { if (it.gist) L.push(it.gist, ''); if (it.text) L.push(it.text, ''); if (it.medicine) L.push(`The way through: ${it.medicine}`, ''); if (it.question) L.push(it.question); }
  L.push('', `(readingId ${r.readingId || '—'}${r.requestId ? ` · requestId ${r.requestId}` : ''})`);
  return L.join('\n');
}
export function glassPayload(r) { const it = r.interpretation; return { readingId: r.readingId, requestId: r.requestId, status: r.status, pending: !!r.pending, question: r.question, interpretation: it && typeof it === 'object' ? { gist: it.gist || '', text: it.text || '', medicine: it.medicine || '', question: it.question || '' } : it, metadata: r.metadata }; }

export function asText(r) {
  const L = [];
  L.push(`NIRMANAKAYA READING ${r.readingId || '(not persisted)'}`);
  if (r.requestId) L.push(`requestId: ${r.requestId}`);
  L.push(`status: ${r.status}${r.pending ? ' (the draw is made; poll ?readingId=' + r.readingId + ' for the interpretation)' : ''}`);
  L.push(`question: ${r.question}`);
  if (r.request?.context) L.push(`context: ${r.request.context}`);
  L.push(`mode: ${r.mode} · cards: ${r.cards?.length || 0} · fast: ${r.fast}`);
  L.push('', 'THE DRAW (the instrument):');
  (r.cards || []).forEach((c, i) => {
    L.push(`${i + 1}. ${c.signature}`);
    L.push(`   signature ${c.transient.id} ${c.transient.name} (${c.transient.traditional}; ${c.transient.house} house, ${c.transient.channel} channel) — ${c.transient.description || ''}`);
    L.push(`   seat ${c.position.id} ${c.position.name} (${c.position.traditional}; ${c.position.house} house, ${c.position.channel} channel)`);
    L.push(`   status ${c.status.id} ${c.status.name}`);
    L.push(c.correction ? `   medicine: ${c.correction.target} (${c.correction.type}) — ${c.correction.via}` : '   medicine: none (balanced; its growth pair is an invitation)');
  });
  L.push('', 'THE INTERPRETATION (the reader\'s words, as they stand):');
  const it = r.interpretation;
  if (it == null) L.push('(pending)');
  else if (typeof it === 'string') L.push(it);
  else if (it.text) { if (it.gist) L.push(`[gist] ${it.gist}`, ''); L.push(it.text); if (it.medicine) L.push('', `[the medicine] ${it.medicine}`); if (it.question) L.push('', `[the question] ${it.question}`); if (Array.isArray(it.next) && it.next.length) L.push('', ...it.next.map((n) => `[next] ${n.panel}: ${n.why}`)); }
  else L.push(it.raw || JSON.stringify(it, null, 2));
  L.push('', `readerVersion ${r.metadata?.readerVersion} · apiVersion ${r.metadata?.apiVersion} · createdAt ${r.metadata?.createdAt}`);
  return L.join('\n');
}

export const respond = (result, format) => format === 'text'
  ? new Response(asText(result), { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } })
  : format === 'glass' // .688: only what a person sees on the site
    ? new Response(asGlass(result), { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } })
    : Response.json(result, { headers: { 'Cache-Control': 'no-store' } });


// The documentation object the REST route returns when no question is given
export const apiDocs = () => ({
      service: 'Nirmanakaya External Reading API',
      version: API_VERSION,
      description: 'A reading from the Nirmanakaya instrument for any AI or client that can make an HTTP call. ONE READER: this door runs the same Handing prompt, model, record and guards as nirmanakaya.com/ez (since 2026-10-04). One genuine question = one draw: pass a requestId and the same request always returns the same reading. The draw (draws, cards) is the instrument; interpretation is the reader\'s current words — read the draw yourself first.',
      openapi: 'https://www.nirmanakaya.com/openapi/external-reading.json',
      usage: {
        GET: {
          params: {
            question: 'string (required)',
            context: 'string (optional)',
            cardCount: 'number (1-5, default 1)',
            mode: 'discover|reflect|forge (default discover)',
            fast: 'boolean (default true) — with the Handing, true = Plain words, false = Deep (the derivation shown)',
            voice: 'plain|grown|deep|mystical (optional) — the register; overrides fast',
            legacy: 'true (optional) — the pre-Handing reader (June); never by default',
            requestId: 'string (optional, recommended) — your idempotency key: the first call with it makes the one draw; every later call with the same requestId AND the same question returns that same reading. A requestId already bound to a different question is refused (409) — one requestId names one question; use a fresh prefix for a fresh run (e.g. include the date and a run letter)',
            readingId: 'uuid (optional) — alone, retrieves a persisted reading; never draws',
            format: 'json|text (default json)',
            monitor: 'global|power|heart|mind|body (optional) - Collective reading monitor',
            collectiveScope: 'individual|relationship|group|regional|domain|global (optional)',
            scopeSubject: 'string (optional) - Custom subject for collective readings'
          },
          examples: {
            individual: '/api/external-reading?question=What%20is%20present&requestId=my-experiment-cycle-1',
            retrieve: '/api/external-reading?readingId=<uuid>',
            text: '/api/external-reading?question=What%20is%20present&requestId=my-experiment-cycle-1&format=text',
            collective_global: '/api/external-reading?question=What%20is%20present&monitor=global',
            collective_power: '/api/external-reading?question=What%20is%20happening&monitor=power',
            collective_custom: '/api/external-reading?question=What%20is%20present&collectiveScope=domain&scopeSubject=AI%20industry'
          }
        },
        POST: {
          body: {
            question: 'string (required)',
            context: 'string (optional)',
            cardCount: 'number (1-5, default 3)',
            mode: 'discover|reflect|forge (default discover)',
            model: 'string (optional)',
            fast: 'boolean (default false)',
            requestId: 'string (optional, recommended) — idempotency key',
            readingId: 'uuid (optional) — alone, retrieves',
            format: 'json|text',
            monitor: 'global|power|heart|mind|body (optional)',
            collectiveScope: 'individual|relationship|group|regional|domain|global (optional)',
            scopeSubject: 'string (optional)'
          }
        }
      },
      idempotency: 'The draw is persisted before the interpretation is written. A retry, a timeout, a refresh or a lost response with the same requestId returns the same reading (status pending while the words are still being written; poll ?readingId=). Without a requestId every call is a fresh draw, still persisted and retrievable by its readingId.',
      monitors: {
        global: { emoji: '🌍', name: 'Global Field', house: 'Gestalt', subject: 'collective human consciousness' },
        power: { emoji: '🔥', name: 'Monitor of Power', house: 'Spirit', subject: 'global power and governance' },
        heart: { emoji: '💧', name: 'Monitor of Heart', house: 'Emotion', subject: 'collective emotional state' },
        mind: { emoji: '🌬️', name: 'Monitor of Mind', house: 'Mind', subject: 'global systems, markets, technology' },
        body: { emoji: '🪨', name: 'Monitor of Body', house: 'Body', subject: 'planetary physical health' }
      },
      collectiveGuardrails: {
        rule1: 'CLIMATE, NOT WEATHER: Describe pressure, not predict events',
        rule2: 'STATE, NOT DIRECTIVE: Frame as state, never command',
        rule3: 'The map reflects. People decide.'
      },
      response: {
        readingId: 'uuid — retrieve it again with ?readingId=',
        requestId: 'your idempotency key, echoed',
        status: 'pending|done|error',
        request: '{question, context, cardCount, mode, fast}',
        draws: 'Array of draw objects — the instrument: {position 0-21, transient 0-77, status 1-4}',
        cards: 'Array of signature data — the instrument, named: transient (the signature), position (the seat), status, correction (the medicine), signature string',
        collective: 'Collective reading metadata (if applicable)',
        interpretation: 'The reading interpretation — the reader\'s current words (null while pending)',
        usage: 'Token usage stats',
        metadata: '{createdAt, completedAt, readerVersion, apiVersion, architectureVersion}'
      }
    });
