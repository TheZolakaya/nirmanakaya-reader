// lib/externalReading.js — THE EXTERNAL READER, shared by /api/external-reading (REST) and /api/mcp (the connector).
// Moved out of the route on 2026-10-04 so the MCP door reads the same instrument through the same ledger.
// Hardens the veil: server-side randomness, canonical corrections, architecture seeing first
// v3.0.0 - Added collective consciousness reading support

import { randomBytes } from 'crypto';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { VERSION } from './version.js';
import { createMessage } from './provider.js'; // .475: the one door (client below kept for anything else)
import { MODEL_IDS } from './modelConfig.js';
import {
  ARCHETYPES,
  BOUNDS,
  AGENTS,
  STATUSES,
  getComponent,
  getFullCorrection,
  getCorrectionText,
  getCorrectionTargetId,
  formatDrawForAI,
  shuffleArray,
  BASE_SYSTEM,
  FORMAT_INSTRUCTIONS,
  buildStancePrompt,
  VOICE_LETTER_TONE,
  parseReadingResponse,
  buildModeHeader,
  WHY_MOMENT_PROMPT,
  buildReadingTeleologicalPrompt,
  filterProhibitedTerms,
  postProcessModeTransitions,
  // Collective/Monitor imports
  MONITORS,
  SCOPES,
  buildCollectivePromptInjection,
  buildCustomScopeInjection,
  FAST_COLLECTIVE_SYSTEM_PROMPT,
  buildFastCollectiveUserMessage,
  getAllMonitors,
  getMonitor,
  buildLocusInjection,
  locusToSubjects
} from './index.js';

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
      prefix: status.prefix || 'Balanced'
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

// One reading: look the request up, or make ONE draw, persist it first, then write the interpretation.
export async function runReading(p) {
  const requestId = (p.requestId && String(p.requestId).trim().slice(0, 200)) || null;
  const db = ledger();
  if (requestId && db) {
    const have = await fetchByRequestId(db, requestId);
    if (have) return have; // an exact retry: the reading already made (pending or done), never a second draw
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
  try {
    result = await generateReading({ ...p, cardCount: actualCount, presetDraws: draws });
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
  L.push(it == null ? '(pending)' : typeof it === 'string' ? it : (it.raw || JSON.stringify(it, null, 2)));
  L.push('', `readerVersion ${r.metadata?.readerVersion} · apiVersion ${r.metadata?.apiVersion} · createdAt ${r.metadata?.createdAt}`);
  return L.join('\n');
}

export const respond = (result, format) => format === 'text'
  ? new Response(asText(result), { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } })
  : Response.json(result, { headers: { 'Cache-Control': 'no-store' } });


// The documentation object the REST route returns when no question is given
export const apiDocs = () => ({
      service: 'Nirmanakaya External Reading API',
      version: API_VERSION,
      description: 'A reading from the Nirmanakaya instrument for any AI or client that can make an HTTP call. One genuine question = one draw: pass a requestId and the same request always returns the same reading. The draw (draws, cards) is the instrument; interpretation is the reader\'s current words — read the draw yourself first.',
      openapi: 'https://www.nirmanakaya.com/openapi/external-reading.json',
      usage: {
        GET: {
          params: {
            question: 'string (required)',
            context: 'string (optional)',
            cardCount: 'number (1-5, default 1)',
            mode: 'discover|reflect|forge (default discover)',
            fast: 'boolean (default true)',
            requestId: 'string (optional, recommended) — your idempotency key: the first call with it makes the one draw; every later call with the same requestId returns that same reading',
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
