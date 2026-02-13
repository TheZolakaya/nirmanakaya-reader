// app/api/card-depth/route.js
// On-demand depth generation for a single card
// Supports WADE baseline generation OR progressive deepening
// Uses Anthropic prompt caching for efficiency

import { ARCHETYPES, BOUNDS, AGENTS } from '../../../lib/archetypes.js';
import { REFLECT_SPREADS } from '../../../lib/spreads.js';
import { STATUSES } from '../../../lib/constants.js';
import {
  getArchetypeCorrection,
  getBoundCorrection,
  getAgentCorrection,
  getComponent
} from '../../../lib/corrections.js';
import { fetchWithRetry } from "../../../lib/fetchWithRetry.js";

export async function POST(request) {
  const {
    cardIndex,      // Which card (0-indexed)
    draw,           // The card draw data {transient, status, position}
    question,       // Original question
    spreadType,     // 'discover' | 'reflect' | 'forge' | 'explore'
    spreadKey,      // Spread name
    stance,         // Voice/style settings
    system,         // Base system prompt (for caching)
    letterContent,  // Letter content for context
    model,
    // Progressive deepening params
    targetDepth,    // 'wade' | 'swim' | 'deep' (default: wade)
    previousContent, // { wade: '...', swim: '...' } - content to build on
    sections,       // ['reading'] | ['rebalancer'] | ['why'] | ['growth'] | null (null = all)
    // DTP token context (optional)
    token,          // e.g., "Fear" - the user's token this card is reading
    originalInput,  // e.g., "I'm worried about my marriage" - full question for grounding
    userContext      // Optional user journey context block
  } = await request.json();

  const effectiveModel = model || "claude-haiku-4-5-20251001";
  const depth = targetDepth || 'wade';
  const n = cardIndex + 1; // 1-indexed for markers

  // Determine if this is baseline generation or progressive deepening
  const isDeepening = previousContent && Object.keys(previousContent).length > 0;

  // Build card-specific user message
  const baseMessage = isDeepening
    ? buildDeepenMessage(n, draw, question, spreadType, spreadKey, letterContent, depth, previousContent, token, originalInput, sections)
    : buildBaselineMessage(n, draw, question, spreadType, spreadKey, letterContent, token, originalInput);

  // Prepend user journey context if available (only for baseline, not deepening)
  const userMessage = (userContext && !isDeepening) ? `${userContext}\n\n${baseMessage}` : baseMessage;

  // Convert system prompt to cached format for 90% input token savings
  const systemWithCache = [
    {
      type: "text",
      text: system,
      cache_control: { type: "ephemeral" }
    }
  ];

  // Adjust max tokens based on what we're generating
  // Baseline (WADE for all sections) needs ~3500 tokens
  // DEEP needs more room than SWIM for full transmission
  // When sections specified, scale tokens down — single section needs far fewer tokens
  const maxTokens = isDeepening
    ? (sections && sections.length > 0
      ? (depth === 'deep' ? 1500 : 1000)  // Single/few sections: DEEP 1500, SWIM 1000
      : (depth === 'deep' ? 3000 : 2000)) // All sections: DEEP 3000, SWIM 2000
    : 4000;  // Baseline (SURFACE + WADE for all sections)

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

    // Parse the card sections from response
    const parsedCard = isDeepening
      ? parseDeepenResponse(text, n, draw.status !== 1, depth, previousContent, sections)
      : parseBaselineResponse(text, n, draw.status !== 1, draw);

    // Check if parsing produced empty results (model returned unexpected format)
    const hasContent = parsedCard.wade || parsedCard.surface || parsedCard.swim || parsedCard.deep;
    if (!hasContent) {
      console.error('Parsing failed - no content extracted. First 1000 chars of response:', text.substring(0, 1000));
      return Response.json({
        error: 'Model response could not be parsed. The AI may be overloaded - please try again.',
        debug: text.substring(0, 500) // Include snippet for debugging
      }, { status: 500 });
    }

    return Response.json({
      cardData: parsedCard,
      cardIndex,
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

// Build baseline message - generates WADE for all sections (initial load)
function buildBaselineMessage(n, draw, question, spreadType, spreadKey, letterContent, token = null, originalInput = null) {
  // Using imported ARCHETYPES, BOUNDS, AGENTS, STATUSES (keyed by transient/status directly)
  const trans = draw.transient < 22 ? ARCHETYPES[draw.transient] :
                draw.transient < 62 ? BOUNDS[draw.transient] :
                AGENTS[draw.transient];
  const stat = STATUSES[draw.status];
  const prefix = stat?.prefix || '';
  const cardName = `${prefix}${prefix ? ' ' : ''}${trans?.name || 'Unknown'}`;
  const isImbalanced = draw.status !== 1;
  const isBalanced = draw.status === 1;

  // V1: Position context — always from archetype position (universal)
  const positionName = ARCHETYPES[draw.position]?.name || `Position ${n}`;
  // Optional frame lens from preset spread
  const isReflect = spreadType === 'reflect';
  let positionLens = '';
  if (isReflect) {
    const spreadConfig = REFLECT_SPREADS[spreadKey];
    positionLens = spreadConfig?.positions?.[n - 1]?.lens || '';
  }

  // Calculate correction target for imbalanced cards using canonical correction functions
  let correctionTarget = null;
  let correctionType = null;
  if (draw.status !== 1) {
    const transComponent = getComponent(draw.transient);
    let correction = null;

    if (transComponent.type === 'Archetype') {
      correction = getArchetypeCorrection(draw.transient, draw.status);
      if (correction) {
        correctionTarget = ARCHETYPES[correction.target]?.name;
        correctionType = correction.type.toUpperCase();
      }
    } else if (transComponent.type === 'Bound') {
      correction = getBoundCorrection(transComponent, draw.status);
      if (correction && correction.targetBound) {
        correctionTarget = correction.targetBound.name;
        correctionType = correction.type.toUpperCase();
      }
    } else if (transComponent.type === 'Agent') {
      correction = getAgentCorrection(transComponent, draw.status);
      if (correction && correction.targetAgent) {
        correctionTarget = correction.targetAgent.name;
        correctionType = correction.type.toUpperCase();
      }
    }
  }

  // Calculate growth target for balanced cards
  let growthTarget = null;
  let growthType = null;
  let growthIsSelf = false;
  if (isBalanced) {
    const transComponent = getComponent(draw.transient);
    let correction = null;

    if (transComponent.type === 'Archetype') {
      correction = getArchetypeCorrection(draw.transient, draw.status);
      if (correction) {
        growthTarget = ARCHETYPES[correction.target]?.name;
        growthType = correction.type.toUpperCase();
        growthIsSelf = correction.isSelf;
      }
    } else if (transComponent.type === 'Bound') {
      correction = getBoundCorrection(transComponent, draw.status);
      if (correction && correction.targetBound) {
        growthTarget = correction.targetBound.name;
        growthType = correction.type.toUpperCase();
        growthIsSelf = correction.isSelf;
      }
    } else if (transComponent.type === 'Agent') {
      correction = getAgentCorrection(transComponent, draw.status);
      if (correction && correction.targetAgent) {
        growthTarget = correction.targetAgent.name;
        growthType = correction.type.toUpperCase();
        growthIsSelf = correction.isSelf;
      }
    }
  }

  return `QUESTION: "${question}"

CONTEXT: This is Signature ${n} (${positionName}) in a ${spreadType.toUpperCase()} reading.${positionLens ? `
POSITION LENS: ${positionLens}` : ''}
${letterContent ? `\nLETTER CONTEXT:\n${letterContent}\n` : ''}

THE SIGNATURE: ${cardName}
IN POSITION: ${positionName}
Traditional Name: ${trans?.traditional || 'N/A'}
Description: ${trans?.description || ''}
${trans?.extended ? `Extended: ${trans.extended}` : ''}
Status: ${stat?.name || 'Balanced'} — ${stat?.desc || 'In balance'}

Generate WADE and SURFACE level content for this signature.
WADE means: 4-6 substantive sentences per section. Not shallow, but not exhaustive either. Give real insight.
SURFACE means: 2-3 sentences that are an INDEPENDENT distillation — the core "oh..." moment.

CRITICAL ANTI-TRUNCATION RULE: Write WADE first. Then write SURFACE FROM SCRATCH as its own distillation.
Surface must NEVER be the first sentences of Wade copy-pasted. Different words, same core truth.
The reader should feel "oh, that's the essence" — not "oh, that's the same text shorter."

⚠️ POSITION CONTEXT IS MANDATORY:
- THE SIGNATURE (what emerged): ${cardName}
- THE POSITION (where it landed): ${positionName}
Your interpretation MUST say "${cardName} in ${positionName}" or "in your ${positionName}".
DO NOT reverse these - ${cardName} is the signature, ${positionName} is the position it landed in.

FORMATTING: Always use blank lines between paragraphs. Each paragraph should be 2-3 sentences max.

Respond with these markers:

[CARD:${n}:SURFACE]
(2-3 sentences: The core insight distilled. Must stand alone as a complete thought.)

[CARD:${n}:WADE]
(4-6 sentences: What does this signature reveal about their question? Be specific.)

[CARD:${n}:MIRROR]
(Single poetic line reflecting their situation)

[CARD:${n}:WHY:SURFACE]
(2 sentences: The teleological pressure, named plainly.)

[CARD:${n}:WHY:WADE]
(3-4 sentences: Why did THIS signature emerge for THIS question?)
${isImbalanced ? `
${correctionTarget ? `REBALANCER TARGET: ${correctionTarget} via ${correctionType} correction. You MUST discuss ${correctionTarget} specifically.` : ''}

[CARD:${n}:REBALANCER:SURFACE]
(2-3 sentences: What the correction offers, plainly.)

[CARD:${n}:REBALANCER:WADE]
(4-6 sentences: The specific correction through ${correctionTarget || 'the correction target'} and how to apply it)` : ''}
${isBalanced ? `
GROWTH OPPORTUNITY: Balance is a launchpad, not a destination.${growthIsSelf ? `
This is a RECURSION POINT - ${trans?.name || 'this signature'} in balance grows by investing FURTHER in itself. The loop IS the growth.` : `
GROWTH TARGET: ${growthTarget || 'the growth partner'} via ${growthType || 'growth'} opportunity.`}

[CARD:${n}:GROWTH:SURFACE]
(2-3 sentences: The growth invitation, plainly.)

[CARD:${n}:GROWTH:WADE]
(4-6 sentences: ${growthIsSelf ? `Balanced ${trans?.name || 'this signature'} grows by going deeper here. The architecture isn't pointing elsewhere — it's saying MORE of this. Frame as "continue investing" and "the loop is the path" — NOT "rest here" or "you've arrived"` : `The developmental invitation from balance toward ${growthTarget}. Frame as "from here, the architecture invites..." Not correction - INVITATION.`})` : ''}

CRITICAL: Make each section substantive. Surface must be a complete thought that stands alone. Wade should explore ONE clear idea fully.
VOICE: Match the humor/register/persona specified in the system prompt throughout all sections.
NOTE: Architecture section will be generated separately - do not include it.${token ? `

TOKEN CONTEXT (DTP MODE):
FOCUS: This reading is regarding "${token}"
${originalInput ? `CONTEXT: "${originalInput}"` : ''}

The token is your lens. The context is your ground.
Don't interpret "${token}" generically — interpret it as it lives in THIS specific situation.
Instead of: "There's pressure in how you hold authority"
Say: "There's pressure in how you hold authority as it relates to ${token}${originalInput ? ` — given that ${originalInput}` : ''}"
The token "${token}" should appear naturally woven into your interpretations, grounded in the specific situation.` : ''}`;
}

// Build deepening message - generates SWIM or DEEP that builds on previous
// sections: null = all sections, or array like ['reading'], ['rebalancer'], ['why'], ['growth']
function buildDeepenMessage(n, draw, question, spreadType, spreadKey, letterContent, targetDepth, previousContent, token = null, originalInput = null, sections = null) {
  // Using imported ARCHETYPES, BOUNDS, AGENTS, STATUSES (keyed by transient/status directly)
  const trans = draw.transient < 22 ? ARCHETYPES[draw.transient] :
                draw.transient < 62 ? BOUNDS[draw.transient] :
                AGENTS[draw.transient];
  const stat = STATUSES[draw.status];
  const prefix = stat?.prefix || '';
  const cardName = `${prefix}${prefix ? ' ' : ''}${trans?.name || 'Unknown'}`;
  const isImbalanced = draw.status !== 1;
  const isBalanced = draw.status === 1;

  // V1: Position context — always from archetype position (universal)
  const positionName = ARCHETYPES[draw.position]?.name || `Position ${n}`;

  // Calculate correction target for imbalanced cards using canonical correction functions
  let correctionTarget = null;
  let correctionType = null;
  if (draw.status !== 1) {
    const transComponent = getComponent(draw.transient);
    let correction = null;

    if (transComponent.type === 'Archetype') {
      correction = getArchetypeCorrection(draw.transient, draw.status);
      if (correction) {
        correctionTarget = ARCHETYPES[correction.target]?.name;
        correctionType = correction.type.toUpperCase();
      }
    } else if (transComponent.type === 'Bound') {
      correction = getBoundCorrection(transComponent, draw.status);
      if (correction && correction.targetBound) {
        correctionTarget = correction.targetBound.name;
        correctionType = correction.type.toUpperCase();
      }
    } else if (transComponent.type === 'Agent') {
      correction = getAgentCorrection(transComponent, draw.status);
      if (correction && correction.targetAgent) {
        correctionTarget = correction.targetAgent.name;
        correctionType = correction.type.toUpperCase();
      }
    }
  }

  // Calculate growth target for balanced cards
  let growthTarget = null;
  let growthType = null;
  let growthIsSelf = false;
  if (isBalanced) {
    const transComponent = getComponent(draw.transient);
    let correction = null;

    if (transComponent.type === 'Archetype') {
      correction = getArchetypeCorrection(draw.transient, draw.status);
      if (correction) {
        growthTarget = ARCHETYPES[correction.target]?.name;
        growthType = correction.type.toUpperCase();
        growthIsSelf = correction.isSelf;
      }
    } else if (transComponent.type === 'Bound') {
      correction = getBoundCorrection(transComponent, draw.status);
      if (correction && correction.targetBound) {
        growthTarget = correction.targetBound.name;
        growthType = correction.type.toUpperCase();
        growthIsSelf = correction.isSelf;
      }
    } else if (transComponent.type === 'Agent') {
      correction = getAgentCorrection(transComponent, draw.status);
      if (correction && correction.targetAgent) {
        growthTarget = correction.targetAgent.name;
        growthType = correction.type.toUpperCase();
        growthIsSelf = correction.isSelf;
      }
    }
  }

  // Determine which sections to include (null = all)
  const includeReading = !sections || sections.includes('reading');
  const includeWhy = !sections || sections.includes('why');
  const includeRebalancer = !sections || sections.includes('rebalancer');
  const includeGrowth = !sections || sections.includes('growth');

  let depthInstructions;
  if (targetDepth === 'deep') {
    const details = [];
    if (includeReading) details.push('- Main reading: 4-6 paragraphs exploring philosophy, psychology, practical implications');
    if (includeWhy) details.push('- Why section: 3-4 paragraphs on deeper teleological meaning');
    if (includeRebalancer && isImbalanced) details.push('- Rebalancer: 3-4 paragraphs on HOW the correction works, WHY it helps, practical ways to apply it');
    if (includeGrowth && isBalanced) details.push('- Growth: 3-4 paragraphs on the developmental invitation and how to engage it');
    depthInstructions = `DEEP depth: Full transmission with NO limits.\n${details.join('\n')}\n\nDEEP is the fullest expression. If a section feels short, you haven't gone deep enough. Add examples, nuances, emotional resonance.`;
  } else {
    depthInstructions = `SWIM depth: One rich paragraph per section. Add psychological depth, practical implications, and emotional resonance that WADE introduced but didn't fully develop.`;
  }

  // Build previous content display
  let previousDisplay = '';
  if (previousContent.reading?.wade) previousDisplay += `Reading WADE: ${previousContent.reading.wade}\n`;
  if (previousContent.reading?.swim) previousDisplay += `Reading SWIM: ${previousContent.reading.swim}\n`;
  if (previousContent.why?.wade) previousDisplay += `Why WADE: ${previousContent.why.wade}\n`;
  if (previousContent.why?.swim) previousDisplay += `Why SWIM: ${previousContent.why.swim}\n`;
  if (isImbalanced && previousContent.rebalancer?.wade) previousDisplay += `Rebalancer WADE: ${previousContent.rebalancer.wade}\n`;
  if (isImbalanced && previousContent.rebalancer?.swim) previousDisplay += `Rebalancer SWIM: ${previousContent.rebalancer.swim}\n`;
  if (isBalanced && previousContent.growth?.wade) previousDisplay += `Growth WADE: ${previousContent.growth.wade}\n`;
  if (isBalanced && previousContent.growth?.swim) previousDisplay += `Growth SWIM: ${previousContent.growth.swim}\n`;

  return `QUESTION: "${question}"

CONTEXT: This is Signature ${n} (${positionName}) in a ${spreadType.toUpperCase()} reading.

THE SIGNATURE: ${cardName}
IN POSITION: ${positionName}
Status: ${stat?.name || 'Balanced'}

PREVIOUS CONTENT (what the querent has already read):
${previousDisplay}

Now generate ${targetDepth.toUpperCase()} level content for ${sections ? 'the requested section(s)' : 'ALL sections'}.

${depthInstructions}

⚠️ POSITION CONTEXT IS MANDATORY:
- THE SIGNATURE (what emerged): ${cardName}
- THE POSITION (where it landed): ${positionName}
Say "${cardName} in ${positionName}" - DO NOT reverse these. Weave naturally into your deepened content.

CRITICAL RULES:
1. DO NOT repeat what's in the previous content
2. ADD new dimensions, feelings, practical implications
3. BUILD ON what came before - deepen it, don't restate it
4. Each section should feel like a natural progression
5. Introduce NEW angles that make the previous content richer

FORMATTING: Always use blank lines between paragraphs. Each paragraph should be 2-4 sentences max. No walls of text.

Respond with these markers:
${includeReading ? `
[CARD:${n}:${targetDepth.toUpperCase()}]
(Build on previous reading - add new dimensions)
` : ''}${includeWhy ? `
[CARD:${n}:WHY:${targetDepth.toUpperCase()}]
(Deepen why this signature emerged - new angles)
` : ''}${isImbalanced && includeRebalancer ? `
${correctionTarget ? `REBALANCER TARGET: ${correctionTarget} via ${correctionType} correction. You MUST discuss ${correctionTarget} specifically.` : ''}

[CARD:${n}:REBALANCER:${targetDepth.toUpperCase()}]
(Deepen the correction through ${correctionTarget || 'the correction target'} - new practical dimensions.${targetDepth === 'deep' ? ' For DEEP: Full transmission, no sentence limits. Explore philosophy, psychology, practical application. At least 3-4 paragraphs.' : ''})` : ''}${isBalanced && includeGrowth ? `
${growthIsSelf ? `This is a RECURSION POINT - ${trans?.name || 'this signature'} in balance grows by investing FURTHER in itself. The loop IS the growth.` : `GROWTH TARGET: ${growthTarget || 'the growth partner'} via ${growthType || 'growth'} opportunity.`}

[CARD:${n}:GROWTH:${targetDepth.toUpperCase()}]
(${growthIsSelf ? `Deepen the recursion experience - what it means to keep leaning in, to go even deeper here. MORE of this energy, not rest.${targetDepth === 'deep' ? ' For DEEP: Full transmission on what recursive growth feels like — the loop is the path.' : ''}` : `Deepen the developmental invitation toward ${growthTarget} - new angles on growth.${targetDepth === 'deep' ? ' For DEEP: Full transmission, no sentence limits. Explore the growth path philosophically, psychologically, practically. At least 3-4 paragraphs.' : ''}`})` : ''}${token ? `

TOKEN CONTEXT (DTP MODE):
FOCUS: This reading is regarding "${token}"
${originalInput ? `CONTEXT: "${originalInput}"` : ''}

Continue grounding all interpretations in this specific context.
The token "${token}" should appear naturally woven into all sections, grounded in the specific situation.` : ''}`;
}

// Parse baseline response (WADE for all sections)
function parseBaselineResponse(text, n, isImbalanced, draw) {
  const extractSection = (marker) => {
    const regex = new RegExp(`\\[${marker}\\]([\\s\\S]*?)(?=\\[CARD:\\d+:|\\[[A-Z]+:[A-Z]+\\]|$)`, 'i');
    const match = text.match(regex);
    if (!match) return '';
    let content = match[1].trim();
    content = content.replace(/^---+\s*\n?/gm, '');
    content = content.replace(/\n---+\s*$/g, '');
    content = content.replace(/^#{1,3}\s*$/gm, '');
    content = content.replace(/^#{1,3}\s+[A-Z].*$/gim, '');
    content = content.replace(/\n{3,}/g, '\n\n');
    return content.trim();
  };

  // Generate Architecture server-side (no AI hallucination)
  const architectureText = generateArchitectureText(draw);
  const isBalanced = draw.status === 1;

  const cardData = {
    surface: extractSection(`CARD:${n}:SURFACE`),
    wade: extractSection(`CARD:${n}:WADE`),
    swim: '', // Not generated yet - will be filled by deepening
    deep: '', // Not generated yet
    architecture: architectureText,
    mirror: extractSection(`CARD:${n}:MIRROR`),
    why: {
      surface: extractSection(`CARD:${n}:WHY:SURFACE`),
      wade: extractSection(`CARD:${n}:WHY:WADE`),
      swim: '',
      deep: '',
      architecture: '' // No longer AI-generated
    }
  };

  if (isImbalanced) {
    cardData.rebalancer = {
      surface: extractSection(`CARD:${n}:REBALANCER:SURFACE`),
      wade: extractSection(`CARD:${n}:REBALANCER:WADE`),
      swim: '',
      deep: '',
      architecture: '' // No longer AI-generated
    };
  }

  // Add growth section for balanced cards
  if (isBalanced) {
    cardData.growth = {
      surface: extractSection(`CARD:${n}:GROWTH:SURFACE`),
      wade: extractSection(`CARD:${n}:GROWTH:WADE`),
      swim: '',
      deep: '',
      architecture: '' // No AI architecture for growth
    };
  }

  return cardData;
}

// Parse deepen response (SWIM or DEEP for requested sections)
// sections: null = all sections, or array like ['reading'], ['rebalancer'], etc.
function parseDeepenResponse(text, n, isImbalanced, depth, previousContent, sections = null) {
  const extractSection = (marker) => {
    const regex = new RegExp(`\\[${marker}\\]([\\s\\S]*?)(?=\\[CARD:\\d+:|\\[[A-Z]+:[A-Z]+\\]|$)`, 'i');
    const match = text.match(regex);
    if (!match) return '';
    let content = match[1].trim();
    content = content.replace(/^---+\s*\n?/gm, '');
    content = content.replace(/\n---+\s*$/g, '');
    content = content.replace(/^#{1,3}\s*$/gm, '');
    content = content.replace(/^#{1,3}\s+[A-Z].*$/gim, '');
    content = content.replace(/\n{3,}/g, '\n\n');
    return content.trim();
  };

  const depthMarker = depth.toUpperCase();
  const shouldUpdate = (section) => !sections || sections.includes(section);
  const isBalanced = !isImbalanced;

  // Only extract sections that were requested
  const newContent = shouldUpdate('reading') ? extractSection(`CARD:${n}:${depthMarker}`) : '';
  const newWhy = shouldUpdate('why') ? extractSection(`CARD:${n}:WHY:${depthMarker}`) : '';

  // Merge with previous content — only update requested sections, preserve others
  const cardData = {
    wade: previousContent?.reading?.wade || '',
    swim: (depth === 'swim' && shouldUpdate('reading')) ? newContent : (previousContent?.reading?.swim || ''),
    deep: (depth === 'deep' && shouldUpdate('reading')) ? newContent : (previousContent?.reading?.deep || ''),
    architecture: previousContent?.architecture || '',
    mirror: previousContent?.mirror || '',
    why: {
      wade: previousContent?.why?.wade || '',
      swim: (depth === 'swim' && shouldUpdate('why')) ? newWhy : (previousContent?.why?.swim || ''),
      deep: (depth === 'deep' && shouldUpdate('why')) ? newWhy : (previousContent?.why?.deep || ''),
      architecture: previousContent?.why?.architecture || ''
    }
  };

  if (isImbalanced) {
    const newRebalancer = shouldUpdate('rebalancer') ? extractSection(`CARD:${n}:REBALANCER:${depthMarker}`) : '';
    cardData.rebalancer = {
      wade: previousContent?.rebalancer?.wade || '',
      swim: (depth === 'swim' && shouldUpdate('rebalancer')) ? newRebalancer : (previousContent?.rebalancer?.swim || ''),
      deep: (depth === 'deep' && shouldUpdate('rebalancer')) ? newRebalancer : (previousContent?.rebalancer?.deep || ''),
      architecture: previousContent?.rebalancer?.architecture || ''
    };
  }

  // Add growth section for balanced cards
  if (isBalanced) {
    const newGrowth = shouldUpdate('growth') ? extractSection(`CARD:${n}:GROWTH:${depthMarker}`) : '';
    cardData.growth = {
      wade: previousContent?.growth?.wade || '',
      swim: (depth === 'swim' && shouldUpdate('growth')) ? newGrowth : (previousContent?.growth?.swim || ''),
      deep: (depth === 'deep' && shouldUpdate('growth')) ? newGrowth : (previousContent?.growth?.deep || ''),
      architecture: '' // No AI architecture for growth
    };
  }

  return cardData;
}

// Card data imported from lib/archetypes.js and lib/constants.js
// Corrections imported from lib/corrections.js

// Generate Architecture section SERVER-SIDE (no AI hallucination)
function generateArchitectureText(draw) {
  const transient = draw.transient;
  const status = draw.status;
  const stat = STATUSES[status];
  const trans = getComponent(transient);

  let lines = [];

  if (trans.type === 'Archetype') {
    // ARCHETYPE
    const arch = ARCHETYPES[transient];
    const statusPrefix = stat?.prefix ? `${stat.prefix} ` : '';

    lines.push(`**Signature:** ${statusPrefix}${arch.name}`);
    lines.push(`**House:** ${arch.house}`);
    lines.push(`**Status:** ${stat?.name || 'Balanced'} — ${stat?.desc || 'In harmonious expression'}`);
    if (arch.channel) lines.push(`**Channel:** ${arch.channel}`);
    lines.push(`**Card Type:** Archetype (Major)`);

    // Add correction using canonical function
    const correction = getArchetypeCorrection(transient, status);
    if (correction) {
      const targetArch = ARCHETYPES[correction.target];
      const corrType = correction.type.toUpperCase();
      if (correction.isSelf) {
        lines.push(`**Growth:** → ${targetArch.name} (self - recursion point)`);
      } else if (status === 1) {
        lines.push(`**Growth opportunity:** → ${targetArch.name} via ${corrType}`);
      } else {
        lines.push(`**Path back:** → ${targetArch.name} via ${corrType} correction`);
      }
    }

  } else if (trans.type === 'Bound') {
    // BOUND
    const bound = BOUNDS[transient];
    const statusPrefix = stat?.prefix ? `${stat.prefix} ` : '';
    const associatedArch = ARCHETYPES[bound.archetype];

    lines.push(`**Signature:** ${statusPrefix}${bound.name}`);
    lines.push(`**Channel:** ${bound.channel}`);
    lines.push(`**Number:** ${bound.number} of 10`);
    lines.push(`**Status:** ${stat?.name || 'Balanced'} — ${stat?.desc || 'In harmonious expression'}`);
    lines.push(`**Card Type:** Bound (Minor ${bound.number})`);
    lines.push(`**Expresses:** ${associatedArch.name} — ${associatedArch.house} House`);

    // Bound corrections use canonical function with polarity flip
    const correction = getBoundCorrection(trans, status);
    if (correction && correction.targetBound) {
      const corrType = correction.type.toUpperCase();
      if (correction.isSelf) {
        lines.push(`**Growth:** → ${correction.targetBound.name} (self - recursion point)`);
      } else if (status === 1) {
        lines.push(`**Growth opportunity:** → ${correction.targetBound.name} via ${corrType}`);
      } else {
        lines.push(`**Path back:** → ${correction.targetBound.name} via ${corrType} correction`);
      }
    }

  } else if (trans.type === 'Agent') {
    // AGENT
    const agent = AGENTS[transient];
    const statusPrefix = stat?.prefix ? `${stat.prefix} ` : '';
    const associatedArch = ARCHETYPES[agent.archetype];

    lines.push(`**Signature:** ${statusPrefix}${agent.name}`);
    lines.push(`**Channel:** ${agent.channel}`);
    lines.push(`**Role:** ${agent.role}`);
    lines.push(`**Status:** ${stat?.name || 'Balanced'} — ${stat?.desc || 'In harmonious expression'}`);
    lines.push(`**Card Type:** Agent (Court)`);
    lines.push(`**Embodies:** ${associatedArch.name} — ${associatedArch.house} House`);

    // Agent corrections use canonical function with polarity flip
    const correction = getAgentCorrection(trans, status);
    if (correction && correction.targetAgent) {
      const corrType = correction.type.toUpperCase();
      if (correction.isSelf) {
        lines.push(`**Growth:** → ${correction.targetAgent.name} (self - recursion point)`);
      } else if (status === 1) {
        lines.push(`**Growth opportunity:** → ${correction.targetAgent.name} via ${corrType}`);
      } else {
        lines.push(`**Path back:** → ${correction.targetAgent.name} via ${corrType} correction`);
      }
    }
  }

  return lines.join('\n');
}
