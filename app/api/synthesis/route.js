// app/api/synthesis/route.js
// On-demand generation for Summary + Why This Appeared + Path (The Invitation)
// Supports WADE baseline generation OR progressive deepening
// Uses Anthropic prompt caching for efficiency

import { ARCHETYPES, BOUNDS, AGENTS } from '../../../lib/archetypes.js';
import { STATUSES } from '../../../lib/constants.js';

export async function POST(request) {
  const {
    question,
    draws,
    cards,           // Array of card data (already generated)
    letter,          // Letter content for context
    spreadType,
    spreadKey,
    system,
    model,
    // Progressive deepening params
    targetDepth,     // 'wade' | 'swim' | 'deep' (default: wade)
    previousContent, // { summary: {...}, path: {...} } - content to build on
    // DTP token context (optional)
    tokens,          // Array of tokens for DTP mode
    originalInput    // Full question for grounding
  } = await request.json();

  const effectiveModel = model || "claude-haiku-4-5-20251001";
  const depth = targetDepth || 'wade';

  // Determine if this is baseline generation or progressive deepening
  const isDeepening = previousContent && Object.keys(previousContent).length > 0;

  // Build synthesis user message
  const userMessage = isDeepening
    ? buildDeepenMessage(question, draws, cards, letter, spreadType, spreadKey, depth, previousContent, tokens, originalInput)
    : buildBaselineMessage(question, draws, cards, letter, spreadType, spreadKey, tokens, originalInput);

  // Convert system prompt to cached format for 90% input token savings
  // Guard against empty system prompt (can happen when loading saved readings)
  const effectiveSystem = system || 'You are the Nirmanakaya Reader — a consciousness architecture oracle. Generate synthesis content for this reading.';
  const systemWithCache = [
    {
      type: "text",
      text: effectiveSystem,
      cache_control: { type: "ephemeral" }
    }
  ];

  // Adjust max tokens based on what we're generating (now includes whyAppeared)
  const maxTokens = isDeepening ? 2000 : 2000;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
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

    // Parse the synthesis sections from response
    const parsed = isDeepening
      ? parseDeepenResponse(text, depth, previousContent)
      : parseBaselineResponse(text);

    return Response.json({
      summary: parsed.summary,
      whyAppeared: parsed.whyAppeared,
      path: parsed.path,
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

// Build baseline message - generates WADE for summary + path (initial load)
function buildBaselineMessage(question, draws, cards, letter, spreadType, spreadKey, tokens = null, originalInput = null) {
  // Build card summaries for synthesis context
  // Using imported ARCHETYPES, BOUNDS, AGENTS, STATUSES (keyed by transient/status)
  const cardSummaries = cards.map((card, i) => {
    const draw = draws[i];
    const trans = draw.transient < 22 ? ARCHETYPES[draw.transient] :
                  draw.transient < 62 ? BOUNDS[draw.transient] :
                  AGENTS[draw.transient];
    const stat = STATUSES[draw.status];
    const statusPrefix = stat?.prefix || '';
    const cardName = `${statusPrefix}${statusPrefix ? ' ' : ''}${trans?.name || 'Unknown'}`;
    const isImbalanced = draw.status !== 1;

    // For balanced cards, include growth opportunity. For imbalanced, include rebalancer.
    const correctionInfo = isImbalanced
      ? (card.rebalancer ? `Rebalancer: ${card.rebalancer.wade || card.rebalancer.surface || ''}` : '')
      : (card.growth ? `Growth Opportunity: ${card.growth.wade || card.growth.surface || ''}` : '');

    return `CARD ${i + 1}: ${cardName}
Reading: ${card.wade || card.surface || '(loading)'}
${correctionInfo}
Why: ${card.why?.wade || card.why?.surface || ''}`;
  }).join('\n\n');

  const letterContext = typeof letter === 'string' ? letter : (letter?.wade || letter?.swim || letter?.deep || '');

  return `QUESTION: "${question}"

READING TYPE: ${spreadType.toUpperCase()} (${spreadKey})

LETTER (for tone continuity):
${letterContext}

ALL CARDS (for synthesis):
${cardSummaries}

Generate WADE level content for SUMMARY, WHY THIS APPEARED, and THE INVITATION.

WADE means: 3-4 substantive sentences per section. Real insight, not fluff.

These are HOLISTIC sections that synthesize ALL the cards together:
- SUMMARY: What do these cards, taken together, reveal about the question?
- WHY THIS APPEARED: Why did THESE specific cards appear for THIS question? What needed to be seen?
- THE INVITATION: What's the aggregate path forward? For imbalanced cards, the correction. For balanced cards, the growth opportunity.

Respond with these markers:

[SUMMARY:WADE]
(3-4 sentences: The unified insight from all these cards together)

[WHY_APPEARED:WADE]
(3-4 sentences: The teleological significance - why this reading emerged for this moment)

[PATH:WADE]
(3-4 sentences: The aggregate invitation - corrections and growth opportunities woven together)

[PATH:ARCHITECTURE]
(Structural analysis of how the corrections and growth paths work together)

FORMATTING: Always use blank lines between paragraphs. Each paragraph should be 2-4 sentences max. No walls of text.

CRITICAL: Make each section substantive. 3-4 sentences should explore ONE clear synthesis.
VOICE: Match the humor/register/persona specified in the system prompt throughout.${tokens && tokens.length > 0 ? `

TOKEN CONTEXT (DTP MODE):
This synthesis covers cards exploring: ${tokens.map(t => `"${t}"`).join(', ')}
${originalInput ? `CONTEXT: "${originalInput}"` : ''}

Ground your synthesis in this specific situation. Show how the token themes interconnect within the context of the querent's original input.` : ''}`;
}

// Build deepening message - generates SWIM or DEEP that builds on previous
function buildDeepenMessage(question, draws, cards, letter, spreadType, spreadKey, targetDepth, previousContent, tokens = null, originalInput = null) {
  // Using imported ARCHETYPES, BOUNDS, AGENTS, STATUSES (keyed by transient/status)
  const cardNames = cards.map((card, i) => {
    const draw = draws[i];
    const trans = draw.transient < 22 ? ARCHETYPES[draw.transient] :
                  draw.transient < 62 ? BOUNDS[draw.transient] :
                  AGENTS[draw.transient];
    const stat = STATUSES[draw.status];
    const prefix = stat?.prefix || '';
    return `${prefix}${prefix ? ' ' : ''}${trans?.name || 'Unknown'}`;
  }).join(', ');

  const depthInstructions = targetDepth === 'deep'
    ? `DEEP depth: Full transmission. Go into the philosophy, psychology, and practical implications of how all these patterns work together. Add examples and dimensions that SWIM introduced but didn't fully explore.`
    : `SWIM depth: One rich paragraph per section. Add psychological depth and practical implications that WADE introduced but didn't fully develop.`;

  // Build previous content display
  let previousDisplay = '';
  if (previousContent.summary?.wade) previousDisplay += `Summary WADE: ${previousContent.summary.wade}\n`;
  if (previousContent.summary?.swim) previousDisplay += `Summary SWIM: ${previousContent.summary.swim}\n`;
  if (previousContent.whyAppeared?.wade) previousDisplay += `Why Appeared WADE: ${previousContent.whyAppeared.wade}\n`;
  if (previousContent.whyAppeared?.swim) previousDisplay += `Why Appeared SWIM: ${previousContent.whyAppeared.swim}\n`;
  if (previousContent.path?.wade) previousDisplay += `Path WADE: ${previousContent.path.wade}\n`;
  if (previousContent.path?.swim) previousDisplay += `Path SWIM: ${previousContent.path.swim}\n`;

  return `QUESTION: "${question}"

CARDS: ${cardNames}

PREVIOUS CONTENT (what the querent has already read):
${previousDisplay}

Now generate ${targetDepth.toUpperCase()} level content for SUMMARY, WHY THIS APPEARED, and THE INVITATION.

${depthInstructions}

CRITICAL RULES:
1. DO NOT repeat what's in the previous content
2. ADD new dimensions, interconnections, practical implications
3. BUILD ON what came before - deepen it, don't restate it
4. Show how patterns CONNECT in ways the earlier level didn't reveal

FORMATTING: Always use blank lines between paragraphs. Each paragraph should be 2-4 sentences max. No walls of text.

Respond with these markers:

[SUMMARY:${targetDepth.toUpperCase()}]
(Build on previous synthesis - reveal deeper interconnections)

[WHY_APPEARED:${targetDepth.toUpperCase()}]
(Deepen the teleological closure - what deeper pattern called this reading forth?)

[PATH:${targetDepth.toUpperCase()}]
(Deepen the invitation - add practical dimensions)${tokens && tokens.length > 0 ? `

TOKEN CONTEXT (DTP MODE):
This synthesis covers cards exploring: ${tokens.map(t => `"${t}"`).join(', ')}
${originalInput ? `CONTEXT: "${originalInput}"` : ''}

Continue grounding deeper synthesis in this specific situation.` : ''}`;
}

// Parse baseline response (WADE for summary + path)
function parseBaselineResponse(text) {
  const extractSection = (marker) => {
    // Match markers that may include underscores (like WHY_APPEARED)
    const regex = new RegExp(`\\[${marker}\\]([\\s\\S]*?)(?=\\[[A-Z_]+:[A-Z]+\\]|$)`, 'i');
    const match = text.match(regex);
    if (!match) return '';
    let content = match[1].trim();
    content = content.replace(/^---+\s*\n?/gm, '');
    content = content.replace(/\n---+\s*$/g, '');
    content = content.replace(/^#{1,3}\s*$/gm, '');
    content = content.replace(/^#{1,3}\s+[A-Z].*$/gim, '');
    content = content.replace(/\n{3,}/g, '\n\n');
    // Strip any leftover marker references
    content = content.replace(/\[?[A-Z_]+:(SHALLOW|WADE|SWIM|DEEP|ARCHITECTURE)\]?/gi, '');
    return content.trim();
  };

  return {
    summary: {
      wade: extractSection('SUMMARY:WADE'),
      swim: '', // Not generated yet
      deep: ''  // Not generated yet
    },
    whyAppeared: {
      wade: extractSection('WHY_APPEARED:WADE'),
      swim: '', // Not generated yet
      deep: ''  // Not generated yet
    },
    path: {
      wade: extractSection('PATH:WADE'),
      swim: '',
      deep: '',
      architecture: extractSection('PATH:ARCHITECTURE')
    }
  };
}

// Parse deepen response (SWIM or DEEP)
function parseDeepenResponse(text, depth, previousContent) {
  const extractSection = (marker) => {
    // Match markers that may include underscores (like WHY_APPEARED)
    const regex = new RegExp(`\\[${marker}\\]([\\s\\S]*?)(?=\\[[A-Z_]+:[A-Z]+\\]|$)`, 'i');
    const match = text.match(regex);
    if (!match) return '';
    let content = match[1].trim();
    content = content.replace(/^---+\s*\n?/gm, '');
    content = content.replace(/\n---+\s*$/g, '');
    content = content.replace(/^#{1,3}\s*$/gm, '');
    content = content.replace(/^#{1,3}\s+[A-Z].*$/gim, '');
    content = content.replace(/\n{3,}/g, '\n\n');
    // Strip any leftover marker references
    content = content.replace(/\[?[A-Z_]+:(SHALLOW|WADE|SWIM|DEEP|ARCHITECTURE)\]?/gi, '');
    return content.trim();
  };

  const depthMarker = depth.toUpperCase();
  const newSummary = extractSection(`SUMMARY:${depthMarker}`);
  const newWhyAppeared = extractSection(`WHY_APPEARED:${depthMarker}`);
  const newPath = extractSection(`PATH:${depthMarker}`);

  return {
    summary: {
      wade: previousContent?.summary?.wade || '',
      swim: depth === 'swim' ? newSummary : (previousContent?.summary?.swim || ''),
      deep: depth === 'deep' ? newSummary : (previousContent?.summary?.deep || '')
    },
    whyAppeared: {
      wade: previousContent?.whyAppeared?.wade || '',
      swim: depth === 'swim' ? newWhyAppeared : (previousContent?.whyAppeared?.swim || ''),
      deep: depth === 'deep' ? newWhyAppeared : (previousContent?.whyAppeared?.deep || '')
    },
    path: {
      wade: previousContent?.path?.wade || '',
      swim: depth === 'swim' ? newPath : (previousContent?.path?.swim || ''),
      deep: depth === 'deep' ? newPath : (previousContent?.path?.deep || ''),
      architecture: previousContent?.path?.architecture || ''
    }
  };
}

// Card data imported from lib/archetypes.js and lib/constants.js
