// app/api/synthesis/route.js
// On-demand generation for Summary + Why This Appeared + Path (The Invitation)
// Supports WADE baseline generation OR progressive deepening
// Uses Anthropic prompt caching for efficiency

import { ARCHETYPES, BOUNDS, AGENTS } from '../../../lib/archetypes.js';
import { REFLECT_SPREADS } from '../../../lib/spreads.js';
import { fetchWithRetry } from "../../../lib/fetchWithRetry.js";
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
    originalInput,   // Full question for grounding
    userContext,      // Optional user journey context block
    frameContexts    // Array of { label, lens, source, isEmpty } per card position
  } = await request.json();

  const effectiveModel = model || "claude-haiku-4-5-20251001";
  const depth = targetDepth || 'wade';

  // Determine if this is baseline generation or progressive deepening
  const isDeepening = previousContent && Object.keys(previousContent).length > 0;

  // Build synthesis user message
  const baseMessage = isDeepening
    ? buildDeepenMessage(question, draws, cards, letter, spreadType, spreadKey, depth, previousContent, tokens, originalInput, frameContexts)
    : buildBaselineMessage(question, draws, cards, letter, spreadType, spreadKey, tokens, originalInput, frameContexts);

  // Prepend user journey context if available (only for baseline, not deepening)
  const userMessage = (userContext && !isDeepening) ? `${userContext}\n\n${baseMessage}` : baseMessage;

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

    // Check for Anthropic API errors (credit issues, rate limits, etc.)
    if (data.error) {
      const errorType = data.error.type || 'unknown';
      const errorMsg = data.error.message || 'Unknown API error';
      console.error('Anthropic API error:', errorType, errorMsg);
      return Response.json({
        error: `API Error (${errorType}): ${errorMsg}`
      }, { status: 500 });
    }

    // Check for empty or invalid response
    if (!data.content || !Array.isArray(data.content) || data.content.length === 0) {
      console.error('Empty API response:', JSON.stringify(data).substring(0, 500));
      return Response.json({
        error: 'API returned empty response. This may indicate a service issue.'
      }, { status: 500 });
    }

    const text = data.content?.map(item => item.text || "").join("\n") || "";

    // Check if we actually got any text content
    if (!text.trim()) {
      console.error('API response had no text content');
      return Response.json({
        error: 'API returned no text content. Please try again.'
      }, { status: 500 });
    }

    // Parse the synthesis sections from response
    const parsed = isDeepening
      ? parseDeepenResponse(text, depth, previousContent)
      : parseBaselineResponse(text);

    // Post-process: strip prohibited pet names
    const sanitize = (t) => {
      if (!t) return t;
      const terms = ['honey', 'sweetie', 'sweetheart', 'dear', 'darling', 'hun', 'sugar', 'babe', 'my friend', 'my dear'];
      let c = t;
      terms.forEach(term => {
        c = c.replace(new RegExp(`\\bOh\\s+${term}\\b[,]?\\s*`, 'gi'), '');
        c = c.replace(new RegExp(`\\b${term}\\b[,]?\\s*`, 'gi'), '');
        c = c.replace(new RegExp(`\\b${term}\\b\\s*[—–-]\\s*`, 'gi'), '');
        c = c.replace(new RegExp(`[,]\\s*\\b${term}\\b[.]?`, 'gi'), '');
      });
      return c.replace(/\s{2,}/g, ' ').replace(/([.!?]\s+)([a-z])/g, (m, p, l) => p + l.toUpperCase()).trim();
    };
    const sanitizeObj = (obj) => {
      if (!obj) return obj;
      const result = {};
      for (const [k, v] of Object.entries(obj)) {
        result[k] = typeof v === 'string' ? sanitize(v) : v;
      }
      return result;
    };

    return Response.json({
      summary: sanitizeObj(parsed.summary),
      whyAppeared: sanitizeObj(parsed.whyAppeared),
      path: sanitizeObj(parsed.path),
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
function buildBaselineMessage(question, draws, cards, letter, spreadType, spreadKey, tokens = null, originalInput = null, frameContexts = null) {
  // Build spread context from frame contexts (all modes, not just Reflect)
  let spreadContext = '';
  const hasFrames = frameContexts?.some(fc => fc && !fc.isEmpty);
  if (hasFrames) {
    const positionList = frameContexts
      .map((fc, i) => fc && !fc.isEmpty ? `  ${i + 1}. "${fc.label}"` : null)
      .filter(Boolean)
      .join('\n');
    if (positionList) {
      spreadContext = `\nSPREAD POSITIONS:
${positionList}

Your synthesis should reference these position names when weaving the signatures together. How the signatures relate ACROSS their positions is the synthesis insight.\n`;
    }
  } else if (spreadType === 'reflect') {
    // Fallback: legacy path for readings without frameContexts
    const spreadConfig = REFLECT_SPREADS[spreadKey];
    if (spreadConfig) {
      const positionList = spreadConfig.positions.map((p, i) => `  ${i + 1}. "${p.name}"`).join('\n');
      spreadContext = `\nSPREAD: ${spreadConfig.name}
Positions:
${positionList}

Your synthesis should reference these position names when weaving the signatures together. How the signatures relate ACROSS their positions is the synthesis insight.\n`;
    }
  }

  // Build card summaries for synthesis context
  const cardSummaries = cards.map((card, i) => {
    const draw = draws[i];
    const trans = draw.transient < 22 ? ARCHETYPES[draw.transient] :
                  draw.transient < 62 ? BOUNDS[draw.transient] :
                  AGENTS[draw.transient];
    const stat = STATUSES[draw.status];
    const statusPrefix = stat?.prefix || '';
    const cardName = `${statusPrefix}${statusPrefix ? ' ' : ''}${trans?.name || 'Unknown'}`;
    const isImbalanced = draw.status !== 1;
    // Position label from frameContexts (all modes) or fallback to legacy
    const fc = frameContexts?.[i];
    const posLabel = (fc && !fc.isEmpty) ? ` [${fc.label}]` : '';

    // For balanced cards, include growth opportunity. For imbalanced, include rebalancer.
    // V3: handle both flat string fields and legacy depth-tiered objects
    const getField = (field) => {
      if (!field) return '';
      if (typeof field === 'string') return field;
      return field.wade || field.swim || field.deep || field.surface || '';
    };
    const correctionInfo = isImbalanced
      ? (card.rebalancer ? `Rebalancer: ${getField(card.rebalancer)}` : '')
      : (card.growth ? `Growth Opportunity: ${getField(card.growth)}` : '');

    return `SIGNATURE ${i + 1}${posLabel}: ${cardName}
Reading: ${card.reading || card.wade || card.surface || '(loading)'}
${correctionInfo}
Why: ${getField(card.why)}`;
  }).join('\n\n');

  const letterContext = typeof letter === 'string' ? letter : (letter?.wade || letter?.swim || letter?.deep || '');

  return `QUESTION: "${question}"

READING TYPE: ${spreadType.toUpperCase()} (${spreadKey})
${spreadContext}

LETTER (for tone continuity):
${letterContext}

ALL SIGNATURES (for synthesis):
${cardSummaries}

Generate WADE level content for SUMMARY, WHY THIS APPEARED, and THE INVITATION.

WADE means: 3-4 substantive sentences per section. Real insight, not fluff.

These are HOLISTIC sections that synthesize ALL the signatures together:
- SUMMARY: What do these signatures, taken together, reveal about the question?
- WHY THIS APPEARED: Why did THESE specific signatures emerge for THIS question? What needed to be seen?
- THE INVITATION: What's the aggregate path forward? For imbalanced signatures, the correction. For balanced signatures, the growth opportunity.

Respond with these markers:

[SUMMARY:WADE]
(3-4 sentences: The unified insight from all these signatures together)

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
function buildDeepenMessage(question, draws, cards, letter, spreadType, spreadKey, targetDepth, previousContent, tokens = null, originalInput = null, frameContexts = null) {
  const cardNames = cards.map((card, i) => {
    const draw = draws[i];
    const trans = draw.transient < 22 ? ARCHETYPES[draw.transient] :
                  draw.transient < 62 ? BOUNDS[draw.transient] :
                  AGENTS[draw.transient];
    const stat = STATUSES[draw.status];
    const prefix = stat?.prefix || '';
    const fc = frameContexts?.[i];
    const posLabel = (fc && !fc.isEmpty) ? ` [${fc.label}]` : '';
    return `${prefix}${prefix ? ' ' : ''}${trans?.name || 'Unknown'}${posLabel}`;
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

SIGNATURES: ${cardNames}

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
