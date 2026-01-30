// /app/api/reading/expand/route.js
// Expand an existing reading by adding new cards
// "Card laid is a card played" — locked interpretations, regenerated synthesis

import { randomBytes } from 'crypto';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import {
  ARCHETYPES,
  STATUSES,
  getComponent,
  getFullCorrection,
  getCorrectionText,
  getCorrectionTargetId,
  formatDrawForAI,
  BASE_SYSTEM,
  FORMAT_INSTRUCTIONS,
  buildStancePrompt,
  VOICE_LETTER_TONE,
  buildModeHeader,
  WHY_MOMENT_PROMPT,
  buildReadingTeleologicalPrompt,
  filterProhibitedTerms,
  postProcessModeTransitions,
  buildLocusInjection,
  locusToSubjects
} from '../../../../lib/index.js';

const client = new Anthropic();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Extract user from Authorization header
async function getAuthUser(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.replace('Bearer ', '');
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const { data: { user }, error } = await anonClient.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

// Generate a single new draw (avoiding existing transients/positions)
function generateNewDraw(existingDraws) {
  const usedTransients = new Set(existingDraws.map(d => d.transient));
  const usedPositions = new Set(existingDraws.map(d => d.position));

  let transient;
  do {
    const bytes = randomBytes(1);
    transient = bytes[0] % 78;
  } while (usedTransients.has(transient));

  let position;
  do {
    const bytes = randomBytes(1);
    position = bytes[0] % 22;
  } while (usedPositions.has(position));

  const statusBytes = randomBytes(1);
  const status = (statusBytes[0] % 4) + 1;

  return { position, transient, status };
}

// Build card data from a draw
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
      channel: component.channel
    },
    position: {
      id: draw.position,
      name: position.name,
      traditional: position.traditional,
      house: position.house
    },
    status: {
      id: draw.status,
      name: status.name,
      prefix: status.prefix || 'Balanced'
    },
    correction,
    signature: `${status.prefix || 'Balanced'} ${component.name} in ${position.name}`,
    name: component.name,
    statusName: status.name
  };
}

export async function POST(request) {
  const user = await getAuthUser(request);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { readingId } = body;

    if (!readingId) {
      return Response.json({ error: 'readingId required' }, { status: 400 });
    }

    // Fetch the existing reading
    const { data: reading, error: fetchError } = await supabase
      .from('user_readings')
      .select('*')
      .eq('id', readingId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !reading) {
      return Response.json({ error: 'Reading not found' }, { status: 404 });
    }

    const existingDraws = reading.draws || [];
    const existingInterp = reading.interpretation || {};

    // Check max cards (5)
    if (existingDraws.length >= 5) {
      return Response.json({ error: 'Maximum 5 cards reached' }, { status: 400 });
    }

    // Generate new draw (avoiding existing transients/positions)
    const rawDraws = existingDraws.map(d => ({
      transient: d.transient?.id ?? d.transient,
      position: d.position?.id ?? d.position,
      status: d.status?.id ?? d.status
    }));
    const newDraw = generateNewDraw(rawDraws);
    const newCard = buildCardData(newDraw);

    // Generate interpretation for NEW card only
    const stancePrompt = buildStancePrompt('friend', 'warm', 'feel', 'clear', 'here', 'grounded');
    const letterTone = VOICE_LETTER_TONE['warm'] || 'warm and direct';
    const modeHeader = buildModeHeader('discover');
    const topic = reading.topic || 'What wants to be seen?';

    let locusInjection = '';
    // Prefer new subjects array, fall back to old category+detail for legacy readings
    const subjects = Array.isArray(reading.locus_subjects) && reading.locus_subjects.length > 0
      ? reading.locus_subjects
      : locusToSubjects(reading.locus, reading.locus_detail || '');
    if (subjects.length > 0) {
      locusInjection = buildLocusInjection(subjects);
      if (locusInjection) locusInjection += '\n\n';
    }

    const systemPrompt = `${locusInjection}${modeHeader}\n\n${BASE_SYSTEM}\n\n${stancePrompt}\n\n${FORMAT_INSTRUCTIONS}\n\n${WHY_MOMENT_PROMPT}\n\nLetter tone for this stance: ${letterTone}`;

    // Build context with ALL draws (existing + new)
    const allDraws = [...rawDraws, newDraw];
    const drawText = formatDrawForAI(allDraws, 'discover', 'external', false);
    const teleologicalPrompt = buildReadingTeleologicalPrompt(allDraws);
    const cardIndex = allDraws.length;

    const userMessage = `QUESTION: "${topic}"

THE DRAW (${cardIndex}-Card Discover — Expanding):

${drawText}

${teleologicalPrompt}

This is an EXPANDED reading. Cards 1-${cardIndex - 1} have already been interpreted. Generate interpretation ONLY for Card ${cardIndex} (the new card).

Respond using these markers:
[CARD:${cardIndex}] — the new card's interpretation
[CORRECTION:${cardIndex}] — correction if imbalanced
[SYNTHESIS] — regenerated synthesis across ALL ${cardIndex} cards

Each marker on its own line.`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }]
    });

    const rawText = response.content[0].text;
    const processed = postProcessModeTransitions(rawText, 'discover', false);
    const filtered = filterProhibitedTerms(processed);

    // Parse the response for new card and synthesis
    const cardMatch = filtered.match(/\[CARD:\d+\]\s*([\s\S]*?)(?=\[CORRECTION|\[SYNTHESIS|\[|$)/);
    const correctionMatch = filtered.match(/\[CORRECTION:\d+\]\s*([\s\S]*?)(?=\[SYNTHESIS|\[|$)/);
    const synthesisMatch = filtered.match(/\[SYNTHESIS\]\s*([\s\S]*?)$/);

    const newCardInterp = cardMatch?.[1]?.trim() || filtered;
    const newCardCorrection = correctionMatch?.[1]?.trim() || '';
    const newSynthesis = synthesisMatch?.[1]?.trim() || '';

    // Build updated draws array (append new)
    const enrichedNewDraw = {
      ...newDraw,
      ...newCard
    };
    const updatedDraws = [...existingDraws, enrichedNewDraw];

    // Build updated interpretation (append new card, replace synthesis)
    const existingCards = existingInterp.parsed?.cards || existingInterp.cards || [];
    const updatedInterp = {
      ...existingInterp,
      parsed: {
        ...(existingInterp.parsed || {}),
        cards: [...existingCards, {
          text: newCardInterp,
          correction: newCardCorrection
        }],
        synthesis: newSynthesis,
        path: newSynthesis
      }
    };

    // Update the reading in the database
    const { data: updated, error: updateError } = await supabase
      .from('user_readings')
      .update({
        draws: updatedDraws,
        interpretation: updatedInterp,
        card_count: updatedDraws.length
      })
      .eq('id', readingId)
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (updateError) {
      console.error('Error updating reading:', updateError);
      return Response.json({ error: updateError.message }, { status: 500 });
    }

    return Response.json({
      success: true,
      newDraw: enrichedNewDraw,
      newCard,
      newInterpretation: newCardInterp,
      newCorrection: newCardCorrection,
      synthesis: newSynthesis,
      reading: updated,
      totalCards: updatedDraws.length
    });

  } catch (err) {
    console.error('Expand reading error:', err);
    return Response.json({
      success: false,
      error: err.message || 'Failed to expand reading'
    }, { status: 500 });
  }
}
