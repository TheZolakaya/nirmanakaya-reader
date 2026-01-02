// /app/api/external-reading/route.js
// External API for Claude chat sessions to receive readings directly
// Hardens the veil: server-side randomness, canonical corrections, architecture seeing first

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
  postProcessModeTransitions
} from '../../../lib/index.js';

const client = new Anthropic();

// Fast mode system prompt - minimal but complete
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

// Build minimal user message for fast mode
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

// Build fast user message for multiple cards
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

// Server-side draw generation with crypto randomness (hardened veil)
function generateServerDraws(count, isReflect = false) {
  const draws = [];
  const usedTransients = new Set();
  const usedPositions = new Set();

  for (let i = 0; i < count; i++) {
    // Generate cryptographically random transient (0-77)
    let transient;
    do {
      const bytes = randomBytes(1);
      transient = bytes[0] % 78;
    } while (usedTransients.has(transient));
    usedTransients.add(transient);

    // Generate cryptographically random position (0-21)
    let position;
    if (isReflect) {
      // Reflect mode: positions are fixed by spread, not random
      position = i; // Will be overridden by spread definition
    } else {
      do {
        const bytes = randomBytes(1);
        position = bytes[0] % 22;
      } while (usedPositions.has(position));
      usedPositions.add(position);
    }

    // Generate cryptographically random status (1-4)
    const statusBytes = randomBytes(1);
    const status = (statusBytes[0] % 4) + 1;

    draws.push({ position, transient, status });
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
  model = 'claude-haiku-4-5-20251001',
  includeInterpretation = true,
  fast = false
}) {
  // Validate inputs
  const count = Math.min(Math.max(1, cardCount), 5); // 1-5 cards
  const isReflect = mode === 'reflect';
  const isForge = mode === 'forge';
  const actualCount = isForge ? 1 : count;

  // Generate draws server-side (hardened veil)
  const draws = generateServerDraws(actualCount, isReflect);

  // Build card data for response
  const cards = draws.map(buildCardData);

  // If only draws requested, return early
  if (!includeInterpretation) {
    return {
      success: true,
      draws,
      cards,
      mode,
      question,
      interpretation: null,
      message: 'Draws generated. Set includeInterpretation: true for full reading.'
    };
  }

  // FAST MODE - minimal but complete interpretation
  if (fast) {
    const safeQuestion = (question + (context ? ' Context: ' + context : '')).slice(0, 500);
    const userMessage = cards.length === 1
      ? buildFastUserMessage(safeQuestion, cards[0])
      : buildFastMultiCardMessage(safeQuestion, cards);

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: cards.length === 1 ? 150 : 300,
      system: FAST_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }]
    });

    return {
      success: true,
      fast: true,
      draws,
      cards,
      mode,
      question,
      interpretation: response.content[0].text,
      usage: {
        input_tokens: response.usage?.input_tokens,
        output_tokens: response.usage?.output_tokens,
        model: 'claude-haiku-4-5-20251001'
      }
    };
  }

  // FULL MODE - complete reading with all sections
  const safeQuestion = (question + (context ? '\n\nContext: ' + context : '')).slice(0, 2000);
  const drawText = formatDrawForAI(draws, mode, 'external', false);
  const spreadName = `${actualCount}-Card ${mode.charAt(0).toUpperCase() + mode.slice(1)}`;
  const teleologicalPrompt = buildReadingTeleologicalPrompt(draws);
  const stancePrompt = buildStancePrompt(
    stance.complexity,
    stance.voice,
    stance.focus,
    stance.density,
    stance.scope,
    stance.seriousness
  );
  const letterTone = VOICE_LETTER_TONE[stance.voice] || 'warm and direct';
  const modeHeader = buildModeHeader(mode);

  const systemPrompt = `${modeHeader}\n\n${BASE_SYSTEM}\n\n${stancePrompt}\n\n${FORMAT_INSTRUCTIONS}\n\n${WHY_MOMENT_PROMPT}\n\nLetter tone for this stance: ${letterTone}`;

  const userMessage = `QUESTION: "${safeQuestion}"\n\nTHE DRAW (${spreadName}):\n\n${drawText}\n\n${teleologicalPrompt}\n\nRespond using the exact section markers: [SUMMARY], [CARD:1], [CARD:2], etc., [CORRECTION:N] for each imbalanced card, [PATH] (if 2+ imbalanced), [WORDS_TO_WHYS], [LETTER]. Each marker on its own line.`;

  // Call Anthropic
  const response = await client.messages.create({
    model,
    max_tokens: 2500,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }]
  });

  const rawReading = response.content[0].text;

  // Process response
  const modeProcessed = postProcessModeTransitions(rawReading, mode, isForge);
  const filteredReading = filterProhibitedTerms(modeProcessed);
  const parsed = parseReadingResponse(filteredReading, draws);

  return {
    success: true,
    fast: false,
    draws,
    cards,
    mode,
    question,
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
// Defaults to fast=true for external AI callers with timeout constraints
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const question = searchParams.get('question');

  // If no question, return documentation
  if (!question) {
    return Response.json({
      service: 'Nirmanakaya External Reading API',
      version: '1.1.0',
      description: 'Enables Claude chat sessions to receive readings directly from the Reader',
      usage: {
        GET: {
          params: {
            question: 'string (required) - The question or intention',
            context: 'string (optional) - Additional context',
            cardCount: 'number (optional, 1-5, default 1)',
            mode: 'string (optional, discover|reflect|forge, default discover)',
            fast: 'boolean (optional, default true) - Fast mode for <5s response'
          },
          examples: {
            fast: '/api/external-reading?question=What%20is%20present&cardCount=1',
            full: '/api/external-reading?question=What%20is%20present&cardCount=1&fast=false'
          }
        },
        POST: {
          body: {
            question: 'string (required) - The question or intention',
            context: 'string (optional) - Additional context',
            cardCount: 'number (optional, 1-5, default 3)',
            mode: 'string (optional, discover|reflect|forge, default discover)',
            stance: 'object (optional) - Voice settings { complexity, voice, focus, density, scope, seriousness }',
            model: 'string (optional) - claude-haiku-4-5-20251001 or claude-sonnet-4-20250514',
            fast: 'boolean (optional, default false) - Fast mode for quick response'
          }
        }
      },
      performance: {
        fast_1card: '<5 seconds',
        fast_3card: '<8 seconds',
        full: '15-30 seconds'
      },
      purpose: 'Hardens the veil through server-side cryptographic randomness. Enables C to encounter C.'
    });
  }

  // If question provided, run a reading
  // GET defaults to fast=true for external AI callers
  try {
    const result = await generateReading({
      question,
      context: searchParams.get('context') || '',
      cardCount: parseInt(searchParams.get('cardCount')) || 1,  // Default to 1 for fast
      mode: searchParams.get('mode') || 'discover',
      fast: searchParams.get('fast') !== 'false',  // Default TRUE for GET
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
