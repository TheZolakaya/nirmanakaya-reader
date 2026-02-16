// app/api/letter/route.js
// On-demand generation for Letter section
// Supports WADE baseline generation OR progressive deepening
// Uses Anthropic prompt caching for efficiency

import { ARCHETYPES, BOUNDS, AGENTS } from '../../../lib/archetypes.js';
import { REFLECT_SPREADS } from '../../../lib/spreads.js';
import { fetchWithRetry } from "../../../lib/fetchWithRetry.js";
import { STATUSES } from '../../../lib/constants.js';

export async function POST(request) {
  const {
    question,
    draws,           // All draws for context awareness
    spreadType,
    spreadKey,
    stance,
    system,          // Base system prompt (for caching)
    model,
    // Progressive deepening params
    targetDepth,     // 'wade' | 'swim' | 'deep' (default: wade)
    previousContent, // { wade: '...', swim: '...' } - content to build on
    userContext       // Optional user journey context block
  } = await request.json();

  const effectiveModel = model || "claude-haiku-4-5-20251001";
  const depth = targetDepth || 'wade';

  // Build user message based on mode
  const baseMessage = previousContent && Object.keys(previousContent).length > 0
    ? buildDeepenMessage(question, draws, spreadType, spreadKey, depth, previousContent)
    : buildBaselineMessage(question, draws, spreadType, spreadKey);

  // Prepend user journey context if available (only for baseline, not deepening)
  const userMessage = (userContext && !previousContent) ? `${userContext}\n\n${baseMessage}` : baseMessage;

  // Convert system prompt to cached format for 90% input token savings
  const systemWithCache = [
    {
      type: "text",
      text: system,
      cache_control: { type: "ephemeral" }
    }
  ];

  // Adjust max tokens based on depth
  const maxTokens = depth === 'deep' ? 800 : depth === 'swim' ? 500 : 400;

  try {
    const response = await fetchWithRetry("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "prompt-caching-2024-07-31"
      },
      body: JSON.stringify({
        model: effectiveModel,
        max_tokens: maxTokens,
        system: systemWithCache,
        messages: [{ role: 'user', content: userMessage }]
      })
    });

    const data = await response.json();

    if (data.error) {
      return Response.json({ error: data.error.message }, { status: 500 });
    }

    const text = data.content?.map(item => item.text || "").join("\n") || "No response received.";

    // Parse the letter sections from response
    const parsedLetter = parseLetterResponse(text, depth, previousContent);

    return Response.json({
      letter: parsedLetter,
      usage: {
        ...data.usage,
        cache_creation_input_tokens: data.usage?.cache_creation_input_tokens || 0,
        cache_read_input_tokens: data.usage?.cache_read_input_tokens || 0
      }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// Build baseline message - generates WADE only (initial load)
function buildBaselineMessage(question, draws, spreadType, spreadKey) {
  const cardCount = draws.length;
  const spreadName = spreadKey || `${cardCount}-card`;

  // Build spread context for Reflect mode (preset spreads with named positions)
  let spreadContext = '';
  if (spreadType === 'reflect') {
    const spreadConfig = REFLECT_SPREADS[spreadKey];
    if (spreadConfig) {
      const positionSummary = spreadConfig.positions.map((p, i) => `  Position ${i + 1}: "${p.name}" — ${p.lens.replace(/^This signature is /, '').replace(/\. Read it as:.*$/, '')}`).join('\n');
      spreadContext = `\nSPREAD: ${spreadConfig.name} (${spreadConfig.positions.length}-card)
${spreadConfig.whenToUse ? `Purpose: ${spreadConfig.whenToUse}` : ''}
Positions:
${positionSummary}

IMPORTANT: This is a structured spread. Each card maps to a specific position. Your letter should reference these positions by name when hinting at what the cards suggest. For example, say "in your ${spreadConfig.positions[0].name}..." not just "your first card...".\n`;
    }
  }

  // Build minimal card overview for context
  // Using imported ARCHETYPES, BOUNDS, AGENTS, STATUSES (keyed by transient/status)
  const spreadConfig = spreadType === 'reflect' ? REFLECT_SPREADS[spreadKey] : null;
  const cardNames = draws.map((draw, i) => {
    const trans = draw.transient < 22 ? ARCHETYPES[draw.transient] :
                  draw.transient < 62 ? BOUNDS[draw.transient] :
                  AGENTS[draw.transient];
    const stat = STATUSES[draw.status];
    const prefix = stat?.prefix || '';
    const posLabel = spreadConfig?.positions?.[i]?.name ? ` [${spreadConfig.positions[i].name}]` : '';
    return `Card ${i + 1}${posLabel}: ${prefix}${prefix ? ' ' : ''}${trans?.name || 'Unknown'}`;
  }).join('\n');

  return `QUESTION: "${question}"

READING TYPE: ${spreadType.toUpperCase()} (${spreadName})
${spreadContext}

CARDS DRAWN (overview for letter context):
${cardNames}

Generate ONLY the Letter at WADE depth.

The Letter opens the reading. It:
- Addresses the querent directly
- Acknowledges their question
- Hints at the themes the cards suggest (but doesn't interpret yet)
- Sets up what's to come

WADE depth means: 3-4 substantive sentences. Specific to THEIR question and cards.

IMPORTANT: Match the voice/persona specified in the system prompt. If humor or register settings are specified, apply them fully here.

FORMATTING: Use blank lines between paragraphs. Each paragraph should be 2-3 sentences max.

Respond with JUST the content (no markers needed). Write directly to the querent in second person.`;
}

// Build deepening message - generates SWIM or DEEP that builds on previous
function buildDeepenMessage(question, draws, spreadType, spreadKey, targetDepth, previousContent) {
  // Using imported ARCHETYPES, BOUNDS, AGENTS, STATUSES (keyed by transient/status)
  const spreadConfig = spreadType === 'reflect' ? REFLECT_SPREADS[spreadKey] : null;
  const cardNames = draws.map((draw, i) => {
    const trans = draw.transient < 22 ? ARCHETYPES[draw.transient] :
                  draw.transient < 62 ? BOUNDS[draw.transient] :
                  AGENTS[draw.transient];
    const stat = STATUSES[draw.status];
    const prefix = stat?.prefix || '';
    const posLabel = spreadConfig?.positions?.[i]?.name ? ` [${spreadConfig.positions[i].name}]` : '';
    return `Card ${i + 1}${posLabel}: ${prefix}${prefix ? ' ' : ''}${trans?.name || 'Unknown'}`;
  }).join('\n');

  const depthInstructions = targetDepth === 'deep'
    ? `DEEP depth: Full transmission with no limits. Poetic, warm, encompassing. Add philosophical depth, emotional resonance, and personal connection that SWIM didn't explore.`
    : `SWIM depth: One rich paragraph. Add emotional nuance, deeper acknowledgment, and warmth that WADE introduced but didn't fully develop.`;

  return `QUESTION: "${question}"

READING TYPE: ${spreadType.toUpperCase()}

CARDS DRAWN:
${cardNames}

PREVIOUS CONTENT (what the querent has already read):
${previousContent.wade ? `WADE: ${previousContent.wade}` : ''}
${previousContent.swim ? `SWIM: ${previousContent.swim}` : ''}

Now generate the Letter at ${targetDepth.toUpperCase()} depth.

${depthInstructions}

CRITICAL RULES:
1. DO NOT repeat what's in the previous content
2. ADD new dimensions, feelings, insights
3. BUILD ON what came before - reference it, deepen it
4. Each depth should feel like a natural progression, not a rewrite

FORMATTING: Use blank lines between paragraphs. Each paragraph should be 2-4 sentences max. No walls of text.

Respond with JUST the content (no markers). Write directly to the querent.`;
}

// Parse the letter response into structured data
function parseLetterResponse(text, depth, previousContent) {
  // Clean up the response
  let content = text.trim();
  content = content.replace(/^---+\s*\n?/gm, '');
  content = content.replace(/\n---+\s*$/g, '');
  content = content.replace(/^#{1,3}\s*$/gm, '');
  content = content.replace(/^#{1,3}\s+[A-Z].*$/gim, '');
  content = content.replace(/\n{3,}/g, '\n\n');
  content = content.trim();

  // Build result with previous content preserved + new content
  const result = {
    wade: previousContent?.wade || '',
    swim: previousContent?.swim || '',
    deep: previousContent?.deep || ''
  };

  // Set the newly generated content at the target depth
  result[depth] = content;

  return result;
}

// Card data imported from lib/archetypes.js and lib/constants.js
