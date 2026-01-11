// app/api/card-depth/route.js
// On-demand depth generation for a single card
// Supports WADE baseline generation OR progressive deepening
// Uses Anthropic prompt caching for efficiency

import { ARCHETYPES, BOUNDS, AGENTS } from '../../../lib/archetypes.js';
import { STATUSES } from '../../../lib/constants.js';

export async function POST(request) {
  const {
    cardIndex,      // Which card (0-indexed)
    draw,           // The card draw data {transient, status, position}
    question,       // Original question
    spreadType,     // 'discover' | 'reflect' | 'forge'
    spreadKey,      // Spread name
    stance,         // Voice/style settings
    system,         // Base system prompt (for caching)
    letterContent,  // Letter content for context
    model,
    // Progressive deepening params
    targetDepth,    // 'wade' | 'swim' | 'deep' (default: wade)
    previousContent // { wade: '...', swim: '...' } - content to build on
  } = await request.json();

  const effectiveModel = model || "claude-haiku-4-5-20251001";
  const depth = targetDepth || 'wade';
  const n = cardIndex + 1; // 1-indexed for markers

  // Determine if this is baseline generation or progressive deepening
  const isDeepening = previousContent && Object.keys(previousContent).length > 0;

  // Build card-specific user message
  const userMessage = isDeepening
    ? buildDeepenMessage(n, draw, question, spreadType, letterContent, depth, previousContent)
    : buildBaselineMessage(n, draw, question, spreadType, letterContent);

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
  const maxTokens = isDeepening
    ? (depth === 'deep' ? 3000 : 2000)  // DEEP gets 3000, SWIM gets 2000
    : 3500;  // Baseline (WADE) stays at 3500

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

    // Parse the card sections from response
    const parsedCard = isDeepening
      ? parseDeepenResponse(text, n, draw.status !== 1, depth, previousContent)
      : parseBaselineResponse(text, n, draw.status !== 1, draw);

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
function buildBaselineMessage(n, draw, question, spreadType, letterContent) {
  // Using imported ARCHETYPES, BOUNDS, AGENTS, STATUSES (keyed by transient/status directly)
  const trans = draw.transient < 22 ? ARCHETYPES[draw.transient] :
                draw.transient < 62 ? BOUNDS[draw.transient] :
                AGENTS[draw.transient];
  const stat = STATUSES[draw.status];
  const prefix = stat?.prefix || '';
  const cardName = `${prefix}${prefix ? ' ' : ''}${trans?.name || 'Unknown'}`;
  const isImbalanced = draw.status !== 1;

  // Calculate correction target for imbalanced cards
  let correctionTarget = null;
  let correctionType = null;
  if (draw.status !== 1) {
    if (draw.transient < 22) {
      // Archetype correction
      if (draw.status === 2) {
        correctionTarget = ARCHETYPES[DIAGONAL_PAIRS[draw.transient]]?.name;
        correctionType = 'DIAGONAL';
      } else if (draw.status === 3) {
        correctionTarget = ARCHETYPES[VERTICAL_PAIRS[draw.transient]]?.name;
        correctionType = 'VERTICAL';
      } else if (draw.status === 4) {
        const reductionId = REDUCTION_PAIRS[draw.transient];
        correctionTarget = reductionId !== null ? ARCHETYPES[reductionId]?.name : null;
        correctionType = 'REDUCTION';
      }
    } else if (draw.transient < 62) {
      // Bound correction - use channel crossing + number mirror
      const bound = BOUNDS[draw.transient];
      const CHANNEL_CROSSINGS = {
        2: { Intent: 'Cognition', Cognition: 'Intent', Resonance: 'Structure', Structure: 'Resonance' },
        3: { Intent: 'Resonance', Cognition: 'Structure', Resonance: 'Intent', Structure: 'Cognition' },
        4: { Intent: 'Structure', Cognition: 'Resonance', Resonance: 'Cognition', Structure: 'Intent' }
      };
      const targetChannel = CHANNEL_CROSSINGS[draw.status]?.[bound.channel];
      const targetNumber = 11 - bound.number;
      if (targetChannel) {
        const targetBound = Object.values(BOUNDS).find(b => b.channel === targetChannel && b.number === targetNumber);
        if (targetBound) {
          correctionTarget = targetBound.name;
          correctionType = draw.status === 2 ? 'DIAGONAL' : draw.status === 3 ? 'VERTICAL' : 'REDUCTION';
        }
      }
    }
  }

  return `QUESTION: "${question}"

CONTEXT: This is Card ${n} in a ${spreadType.toUpperCase()} reading.
${letterContent ? `\nLETTER CONTEXT:\n${letterContent}\n` : ''}

CARD ${n}: ${cardName}
Traditional Name: ${trans?.traditional || 'N/A'}
Description: ${trans?.description || ''}
${trans?.extended ? `Extended: ${trans.extended}` : ''}
Status: ${stat?.name || 'Balanced'} — ${stat?.desc || 'In balance'}

Generate the WADE level content for this card. WADE means: 3-4 substantive sentences per section. Not shallow, but not exhaustive either. Give real insight.

FORMATTING: Always use blank lines between paragraphs. Each paragraph should be 2-3 sentences max.

Respond with these markers:

[CARD:${n}:WADE]
(3-4 sentences: What does this card reveal about their question? Be specific.)

[CARD:${n}:MIRROR]
(Single poetic line reflecting their situation)

[CARD:${n}:WHY:WADE]
(3-4 sentences: Why did THIS card appear for THIS question?)
${isImbalanced ? `
${correctionTarget ? `REBALANCER TARGET: ${correctionTarget} via ${correctionType} correction. You MUST discuss ${correctionTarget} specifically.` : ''}

[CARD:${n}:REBALANCER:WADE]
(3-4 sentences: The specific correction through ${correctionTarget || 'the correction target'} and how to apply it)` : ''}

CRITICAL: Make each section substantive. 3-4 sentences should explore ONE clear idea fully.
VOICE: Match the humor/register/persona specified in the system prompt throughout all sections.
NOTE: Architecture section will be generated separately - do not include it.`;
}

// Build deepening message - generates SWIM or DEEP that builds on previous
function buildDeepenMessage(n, draw, question, spreadType, letterContent, targetDepth, previousContent) {
  // Using imported ARCHETYPES, BOUNDS, AGENTS, STATUSES (keyed by transient/status directly)
  const trans = draw.transient < 22 ? ARCHETYPES[draw.transient] :
                draw.transient < 62 ? BOUNDS[draw.transient] :
                AGENTS[draw.transient];
  const stat = STATUSES[draw.status];
  const prefix = stat?.prefix || '';
  const cardName = `${prefix}${prefix ? ' ' : ''}${trans?.name || 'Unknown'}`;
  const isImbalanced = draw.status !== 1;

  // Calculate correction target for imbalanced cards
  let correctionTarget = null;
  let correctionType = null;
  if (draw.status !== 1) {
    if (draw.transient < 22) {
      // Archetype correction
      if (draw.status === 2) {
        correctionTarget = ARCHETYPES[DIAGONAL_PAIRS[draw.transient]]?.name;
        correctionType = 'DIAGONAL';
      } else if (draw.status === 3) {
        correctionTarget = ARCHETYPES[VERTICAL_PAIRS[draw.transient]]?.name;
        correctionType = 'VERTICAL';
      } else if (draw.status === 4) {
        const reductionId = REDUCTION_PAIRS[draw.transient];
        correctionTarget = reductionId !== null ? ARCHETYPES[reductionId]?.name : null;
        correctionType = 'REDUCTION';
      }
    } else if (draw.transient < 62) {
      // Bound correction - use channel crossing + number mirror
      const bound = BOUNDS[draw.transient];
      const CHANNEL_CROSSINGS = {
        2: { Intent: 'Cognition', Cognition: 'Intent', Resonance: 'Structure', Structure: 'Resonance' },  // Too Much - diagonal
        3: { Intent: 'Resonance', Cognition: 'Structure', Resonance: 'Intent', Structure: 'Cognition' },  // Too Little - vertical
        4: { Intent: 'Structure', Cognition: 'Resonance', Resonance: 'Cognition', Structure: 'Intent' }   // Unacknowledged - reduction
      };
      const targetChannel = CHANNEL_CROSSINGS[draw.status]?.[bound.channel];
      const targetNumber = 11 - bound.number;
      if (targetChannel) {
        const targetBound = Object.values(BOUNDS).find(b => b.channel === targetChannel && b.number === targetNumber);
        if (targetBound) {
          correctionTarget = targetBound.name;
          correctionType = draw.status === 2 ? 'DIAGONAL' : draw.status === 3 ? 'VERTICAL' : 'REDUCTION';
        }
      }
    }
    // Agent corrections follow archetype (already handled via archetype lookup in generateArchitectureText)
  }

  const depthInstructions = targetDepth === 'deep'
    ? `DEEP depth: Full transmission with NO limits.
       - Main reading: 4-6 paragraphs exploring philosophy, psychology, practical implications
       - Why section: 3-4 paragraphs on deeper teleological meaning
       - Rebalancer (if imbalanced): 3-4 paragraphs on HOW the correction works, WHY it helps, practical ways to apply it

       DEEP is the fullest expression. If a section feels short, you haven't gone deep enough. Add examples, nuances, emotional resonance.`
    : `SWIM depth: One rich paragraph per section. Add psychological depth, practical implications, and emotional resonance that WADE introduced but didn't fully develop.`;

  // Build previous content display
  let previousDisplay = '';
  if (previousContent.reading?.wade) previousDisplay += `Reading WADE: ${previousContent.reading.wade}\n`;
  if (previousContent.reading?.swim) previousDisplay += `Reading SWIM: ${previousContent.reading.swim}\n`;
  if (previousContent.why?.wade) previousDisplay += `Why WADE: ${previousContent.why.wade}\n`;
  if (previousContent.why?.swim) previousDisplay += `Why SWIM: ${previousContent.why.swim}\n`;
  if (isImbalanced && previousContent.rebalancer?.wade) previousDisplay += `Rebalancer WADE: ${previousContent.rebalancer.wade}\n`;
  if (isImbalanced && previousContent.rebalancer?.swim) previousDisplay += `Rebalancer SWIM: ${previousContent.rebalancer.swim}\n`;

  return `QUESTION: "${question}"

CONTEXT: This is Card ${n} in a ${spreadType.toUpperCase()} reading.

CARD ${n}: ${cardName}
Status: ${stat?.name || 'Balanced'}

PREVIOUS CONTENT (what the querent has already read):
${previousDisplay}

Now generate ${targetDepth.toUpperCase()} level content for ALL sections.

${depthInstructions}

CRITICAL RULES:
1. DO NOT repeat what's in the previous content
2. ADD new dimensions, feelings, practical implications
3. BUILD ON what came before - deepen it, don't restate it
4. Each section should feel like a natural progression
5. Introduce NEW angles that make the previous content richer

FORMATTING: Always use blank lines between paragraphs. Each paragraph should be 2-4 sentences max. No walls of text.

Respond with these markers:

[CARD:${n}:${targetDepth.toUpperCase()}]
(Build on previous reading - add new dimensions)

[CARD:${n}:WHY:${targetDepth.toUpperCase()}]
(Deepen why this card appeared - new angles)
${isImbalanced ? `
${correctionTarget ? `REBALANCER TARGET: ${correctionTarget} via ${correctionType} correction. You MUST discuss ${correctionTarget} specifically.` : ''}

[CARD:${n}:REBALANCER:${targetDepth.toUpperCase()}]
(Deepen the correction through ${correctionTarget || 'the correction target'} - new practical dimensions.${targetDepth === 'deep' ? ' For DEEP: Full transmission, no sentence limits. Explore philosophy, psychology, practical application. At least 3-4 paragraphs.' : ''})` : ''}`;
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

  const cardData = {
    wade: extractSection(`CARD:${n}:WADE`),
    swim: '', // Not generated yet - will be filled by deepening
    deep: '', // Not generated yet
    architecture: architectureText,
    mirror: extractSection(`CARD:${n}:MIRROR`),
    why: {
      wade: extractSection(`CARD:${n}:WHY:WADE`),
      swim: '',
      deep: '',
      architecture: '' // No longer AI-generated
    }
  };

  if (isImbalanced) {
    cardData.rebalancer = {
      wade: extractSection(`CARD:${n}:REBALANCER:WADE`),
      swim: '',
      deep: '',
      architecture: '' // No longer AI-generated
    };
  }

  return cardData;
}

// Parse deepen response (SWIM or DEEP for all sections)
function parseDeepenResponse(text, n, isImbalanced, depth, previousContent) {
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
  const newContent = extractSection(`CARD:${n}:${depthMarker}`);
  const newWhy = extractSection(`CARD:${n}:WHY:${depthMarker}`);

  // Merge with previous content
  const cardData = {
    wade: previousContent?.reading?.wade || '',
    swim: depth === 'swim' ? newContent : (previousContent?.reading?.swim || ''),
    deep: depth === 'deep' ? newContent : (previousContent?.reading?.deep || ''),
    architecture: previousContent?.architecture || '',
    mirror: previousContent?.mirror || '',
    why: {
      wade: previousContent?.why?.wade || '',
      swim: depth === 'swim' ? newWhy : (previousContent?.why?.swim || ''),
      deep: depth === 'deep' ? newWhy : (previousContent?.why?.deep || ''),
      architecture: previousContent?.why?.architecture || ''
    }
  };

  if (isImbalanced) {
    const newRebalancer = extractSection(`CARD:${n}:REBALANCER:${depthMarker}`);
    cardData.rebalancer = {
      wade: previousContent?.rebalancer?.wade || '',
      swim: depth === 'swim' ? newRebalancer : (previousContent?.rebalancer?.swim || ''),
      deep: depth === 'deep' ? newRebalancer : (previousContent?.rebalancer?.deep || ''),
      architecture: previousContent?.rebalancer?.architecture || ''
    };
  }

  return cardData;
}

// Card data imported from lib/archetypes.js and lib/constants.js

// Correction lookup tables
const DIAGONAL_PAIRS = {
  0: 19, 1: 20, 2: 17, 3: 18, 4: 15, 5: 16, 6: 13, 7: 14, 8: 11, 9: 12,
  10: 1, 11: 8, 12: 9, 13: 6, 14: 7, 15: 4, 16: 5, 17: 2, 18: 3, 19: 0, 20: 1, 21: 0
};
const VERTICAL_PAIRS = {
  0: 20, 1: 19, 2: 18, 3: 17, 4: 16, 5: 15, 6: 14, 7: 13, 8: 12, 9: 11,
  10: 19, 11: 9, 12: 8, 13: 7, 14: 6, 15: 5, 16: 4, 17: 3, 18: 2, 19: 1, 20: 0, 21: 20
};
const REDUCTION_PAIRS = {
  0: null, 1: null, 2: 11, 3: 12, 4: 13, 5: 14, 6: 15, 7: 16, 8: 17, 9: 18,
  10: null, 11: 2, 12: 3, 13: 4, 14: 5, 15: 6, 16: 7, 17: 8, 18: 9, 19: null, 20: null, 21: null
};

// Generate Architecture section SERVER-SIDE (no AI hallucination)
function generateArchitectureText(draw) {
  // Using imported ARCHETYPES, BOUNDS, AGENTS, STATUSES (keyed by transient/status directly)
  const transient = draw.transient;
  const status = draw.status;
  const stat = STATUSES[status];

  let lines = [];

  if (transient < 22) {
    // ARCHETYPE
    const arch = ARCHETYPES[transient];
    const statusPrefix = stat?.prefix ? `${stat.prefix} ` : '';

    lines.push(`**Signature:** ${statusPrefix}${arch.name}`);
    lines.push(`**House:** ${arch.house}`);
    lines.push(`**Status:** ${stat?.name || 'Balanced'} — ${stat?.desc || 'In harmonious expression'}`);
    if (arch.channel) lines.push(`**Channel:** ${arch.channel}`);
    lines.push(`**Card Type:** Archetype (Major)`);

    // Add correction if imbalanced
    if (status !== 1) {
      let correction = null;
      let corrType = '';
      if (status === 2) {
        correction = DIAGONAL_PAIRS[transient];
        corrType = 'DIAGONAL';
      } else if (status === 3) {
        correction = VERTICAL_PAIRS[transient];
        corrType = 'VERTICAL';
      } else if (status === 4) {
        correction = REDUCTION_PAIRS[transient];
        corrType = 'REDUCTION';
      }
      if (correction !== null && correction !== undefined) {
        const targetArch = ARCHETYPES[correction];
        lines.push(`**Path back:** → ${targetArch.name} (${correction}) via ${corrType} correction`);
      }
    }

  } else if (transient < 62) {
    // BOUND - BOUNDS is keyed by transient directly
    const bound = BOUNDS[transient];
    const statusPrefix = stat?.prefix ? `${stat.prefix} ` : '';
    const associatedArch = ARCHETYPES[bound.archetype];

    lines.push(`**Signature:** ${statusPrefix}${bound.name}`);
    lines.push(`**Channel:** ${bound.channel}`);
    lines.push(`**Number:** ${bound.number} of 10`);
    lines.push(`**Status:** ${stat?.name || 'Balanced'} — ${stat?.desc || 'In harmonious expression'}`);
    lines.push(`**Card Type:** Bound (Minor ${bound.number})`);
    lines.push(`**Expresses:** ${associatedArch.name} — ${associatedArch.house} House`);

    // Bound corrections use channel crossing
    if (status !== 1) {
      const CHANNEL_CROSSINGS = {
        2: { Intent: 'Structure', Cognition: 'Resonance', Resonance: 'Cognition', Structure: 'Intent' },
        3: { Intent: 'Resonance', Cognition: 'Structure', Resonance: 'Intent', Structure: 'Cognition' },
        4: { Intent: 'Cognition', Cognition: 'Intent', Resonance: 'Structure', Structure: 'Resonance' }
      };
      const targetChannel = CHANNEL_CROSSINGS[status]?.[bound.channel];
      const targetNumber = 11 - bound.number;
      if (targetChannel) {
        // Find target bound by searching BOUNDS object values
        const targetBound = Object.values(BOUNDS).find(b => b.channel === targetChannel && b.number === targetNumber);
        if (targetBound) {
          const corrType = status === 2 ? 'DIAGONAL' : status === 3 ? 'VERTICAL' : 'REDUCTION';
          lines.push(`**Path back:** → ${targetBound.name} (${bound.channel}→${targetChannel}, ${bound.number}→${targetNumber}) via ${corrType} correction`);
        }
      }
    }

  } else {
    // AGENT - AGENTS is keyed by transient directly
    const agent = AGENTS[transient];
    const statusPrefix = stat?.prefix ? `${stat.prefix} ` : '';
    const associatedArch = ARCHETYPES[agent.archetype];

    lines.push(`**Signature:** ${statusPrefix}${agent.name}`);
    lines.push(`**Channel:** ${agent.channel}`);
    lines.push(`**Role:** ${agent.role}`);
    lines.push(`**Status:** ${stat?.name || 'Balanced'} — ${stat?.desc || 'In harmonious expression'}`);
    lines.push(`**Card Type:** Agent (Court)`);
    lines.push(`**Embodies:** ${associatedArch.name} — ${associatedArch.house} House`);

    // Agent corrections follow the archetype's correction
    if (status !== 1) {
      let correction = null;
      let corrType = '';
      if (status === 2) {
        correction = DIAGONAL_PAIRS[agent.archetype];
        corrType = 'DIAGONAL';
      } else if (status === 3) {
        correction = VERTICAL_PAIRS[agent.archetype];
        corrType = 'VERTICAL';
      } else if (status === 4) {
        correction = REDUCTION_PAIRS[agent.archetype];
        corrType = 'REDUCTION';
      }
      if (correction !== null && correction !== undefined) {
        // Find the Agent that embodies the target archetype
        const targetAgent = Object.values(AGENTS).find(a => a.archetype === correction);
        if (targetAgent) {
          lines.push(`**Path back:** → ${targetAgent.name} via ${corrType} correction (follows ${ARCHETYPES[correction].name})`);
        } else {
          lines.push(`**Path back:** → ${ARCHETYPES[correction].name} (${correction}) via ${corrType} correction`);
        }
      }
    }
  }

  return lines.join('\n');
}
