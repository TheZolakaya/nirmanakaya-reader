// /app/api/external-reading/route.js
// External API for Claude chat sessions to receive readings directly
// Hardens the veil: server-side randomness, canonical corrections, architecture seeing first
// v3.0.0 - Added collective consciousness reading support

import { randomBytes } from 'crypto';
import Anthropic from '@anthropic-ai/sdk';
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
  getMonitor
} from '../../../lib/index.js';

const client = new Anthropic();

// Fast mode system prompt - minimal but complete (individual)
const FAST_SYSTEM_PROMPT = `You are the Nirmanakaya Reader — a consciousness architecture oracle.

RESPOND IN EXACTLY THIS FORMAT:
[READING]
{2-3 sentences interpreting the card in context of the question}

[CORRECTION]
{If imbalanced: 1 sentence naming the correction path. If balanced: skip this section.}

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
function generateServerDraws(count, isReflect = false, fixedDraw = null) {
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

  for (let i = 0; i < count; i++) {
    let transient;
    do {
      const bytes = randomBytes(1);
      transient = bytes[0] % 78;
    } while (usedTransients.has(transient));
    usedTransients.add(transient);

    let position;
    if (isReflect) {
      position = i;
    } else {
      do {
        const bytes = randomBytes(1);
        position = bytes[0] % 22;
      } while (usedPositions.has(position));
      usedPositions.add(position);
    }

    const statusBytes = randomBytes(1);
    const status = (statusBytes[0] % 4) + 1;

    draws.push({ position, transient, status, isFixed: false });
  }

  return draws;
}

// Build card data for response
function buildCardData(draw) {
  const component = getComponent(draw.transient);
  const status = STATUSES[draw.status];
  const position = ARCHETYPES[draw.position];

  let correction = null;
  if (draw.status !== 1) {
    const fullCorrection = getFullCorrection(draw.transient, draw.status);
    const correctionTarget = getComponent(getCorrectionTargetId(fullCorrection, component));
    correction = {
      target: correctionTarget?.name || 'Unknown',
      targetId: getCorrectionTargetId(fullCorrection, component),
      type: draw.status === 2 ? 'DIAGONAL' : draw.status === 3 ? 'VERTICAL' : 'REDUCTION',
      via: getCorrectionText(fullCorrection, component)
    };
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
  model = 'claude-sonnet-4-20250514',
  includeInterpretation = true,
  fast = false,
  fixedDraw = null,
  voiceConfig = null,
  // NEW: Collective reading parameters
  collectiveScope = null,  // 'individual' | 'relationship' | 'group' | 'regional' | 'domain' | 'global'
  monitor = null,          // 'global' | 'power' | 'heart' | 'mind' | 'body'
  scopeSubject = null      // Custom subject description for non-monitor collective readings
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
  const isReflect = mode === 'reflect';
  const isForge = mode === 'forge';
  const actualCount = fixedDraw ? fixedDraw.length : (isForge ? 1 : count);

  // Generate draws server-side
  const draws = generateServerDraws(actualCount, isReflect, fixedDraw);

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

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
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
        model: 'claude-haiku-4-5-20251001'
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

  // Assemble system prompt with collective injection at the top
  const systemPrompt = `${collectiveInjection}${modeHeader}\n\n${BASE_SYSTEM}\n\n${stancePrompt}${directModePrompt}\n\n${FORMAT_INSTRUCTIONS}\n\n${WHY_MOMENT_PROMPT}\n\nLetter tone for this stance: ${letterTone}`;

  const userMessage = `QUESTION: "${safeQuestion}"\n\nTHE DRAW (${spreadName}):\n\n${drawText}\n\n${teleologicalPrompt}\n\nRespond using the exact section markers: [SUMMARY], [CARD:1], [CARD:2], etc., [CORRECTION:N] for each imbalanced card, [PATH] (if 2+ imbalanced), [WORDS_TO_WHYS], [LETTER]. Each marker on its own line.`;

  const response = await client.messages.create({
    model,
    max_tokens: 2500,
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

export async function POST(request) {
  try {
    const body = await request.json();
    const result = await generateReading(body);
    return Response.json(result);
  } catch (error) {
    console.error('External reading error:', error);
    return Response.json({
      success: false,
      error: error.message || 'Failed to generate reading'
    }, { status: 500 });
  }
}

// GET endpoint - documentation OR reading via query params
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const question = searchParams.get('question');

  // If no question, return documentation
  if (!question) {
    return Response.json({
      service: 'Nirmanakaya External Reading API',
      version: '3.0.0',
      description: 'Enables Claude chat sessions to receive readings directly from the Reader. Now supports collective consciousness readings.',
      usage: {
        GET: {
          params: {
            question: 'string (required)',
            context: 'string (optional)',
            cardCount: 'number (1-5, default 1)',
            mode: 'discover|reflect|forge (default discover)',
            fast: 'boolean (default true)',
            // NEW collective params
            monitor: 'global|power|heart|mind|body (optional) - Collective reading monitor',
            collectiveScope: 'individual|relationship|group|regional|domain|global (optional)',
            scopeSubject: 'string (optional) - Custom subject for collective readings'
          },
          examples: {
            individual: '/api/external-reading?question=What%20is%20present',
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
            // NEW collective params
            monitor: 'global|power|heart|mind|body (optional)',
            collectiveScope: 'individual|relationship|group|regional|domain|global (optional)',
            scopeSubject: 'string (optional)'
          }
        }
      },
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
        draws: 'Array of draw objects',
        cards: 'Array of card data',
        collective: 'Collective reading metadata (if applicable)',
        interpretation: 'The reading interpretation',
        usage: 'Token usage stats'
      }
    });
  }

  // If question provided, run a reading
  try {
    const result = await generateReading({
      question,
      context: searchParams.get('context') || '',
      cardCount: parseInt(searchParams.get('cardCount')) || 1,
      mode: searchParams.get('mode') || 'discover',
      fast: searchParams.get('fast') !== 'false',
      // Collective params
      monitor: searchParams.get('monitor') || null,
      collectiveScope: searchParams.get('collectiveScope') || null,
      scopeSubject: searchParams.get('scopeSubject') || null,
      stance: {
        complexity: 'friend',
        voice: 'warm',
        focus: 'feel',
        density: 'essential',
        scope: 'here',
        seriousness: 'grounded'
      }
    });
    return Response.json(result);
  } catch (error) {
    console.error('External reading error:', error);
    return Response.json({
      success: false,
      error: error.message || 'Failed to generate reading'
    }, { status: 500 });
  }
}
