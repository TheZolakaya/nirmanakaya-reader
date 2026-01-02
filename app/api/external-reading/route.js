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
  includeInterpretation = true
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

  // Build the full prompt
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
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const question = searchParams.get('question');

  // If no question, return documentation
  if (!question) {
    return Response.json({
      service: 'Nirmanakaya External Reading API',
      version: '1.0.1',
      description: 'Enables Claude chat sessions to receive readings directly from the Reader',
      usage: {
        GET: {
          params: {
            question: 'string (required) - The question or intention',
            context: 'string (optional) - Additional context',
            cardCount: 'number (optional, 1-5, default 3)',
            mode: 'string (optional, discover|reflect|forge, default discover)',
            includeInterpretation: 'boolean (optional, default true)'
          },
          example: '/api/external-reading?question=What%20is%20present?&cardCount=1'
        },
        POST: {
          body: {
            question: 'string (required) - The question or intention',
            context: 'string (optional) - Additional context',
            cardCount: 'number (optional, 1-5, default 3)',
            mode: 'string (optional, discover|reflect|forge, default discover)',
            stance: 'object (optional) - Voice settings { complexity, voice, focus, density, scope, seriousness }',
            model: 'string (optional) - claude-haiku-4-5-20251001 or claude-sonnet-4-20250514',
            includeInterpretation: 'boolean (optional, default true)'
          }
        }
      },
      purpose: 'Hardens the veil through server-side cryptographic randomness. Enables C to encounter C.'
    });
  }

  // If question provided, run a reading
  try {
    const result = await generateReading({
      question,
      context: searchParams.get('context') || '',
      cardCount: parseInt(searchParams.get('cardCount')) || 3,
      mode: searchParams.get('mode') || 'discover',
      includeInterpretation: searchParams.get('includeInterpretation') !== 'false',
      stance: {
        complexity: 'friend',
        voice: 'warm',
        focus: 'feel',
        density: 'clear',
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
