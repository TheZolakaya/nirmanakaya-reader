// app/api/card-depth/route.js
// On-demand depth generation for a single card
// Supports WADE baseline generation OR progressive deepening
// Uses Anthropic prompt caching for efficiency

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
  // Baseline (WADE for all sections) needs ~2000 tokens
  // Deepening (SWIM or DEEP for specific section) needs ~1500 tokens
  const maxTokens = isDeepening ? 1500 : 3500;

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
  const ARCHETYPES = getArchetypes();
  const BOUNDS = getBounds();
  const AGENTS = getAgents();
  const STATUSES = getStatuses();

  const trans = draw.transient < 22 ? ARCHETYPES[draw.transient] :
                draw.transient < 62 ? BOUNDS[draw.transient - 22] :
                AGENTS[draw.transient - 62];
  const stat = STATUSES[draw.status];
  const statusPrefix = stat?.prefix || 'Balanced';
  const cardName = `${statusPrefix} ${trans?.name || 'Unknown'}`;
  const isImbalanced = draw.status !== 1;

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
[CARD:${n}:REBALANCER:WADE]
(3-4 sentences: The specific correction needed and how to apply it)` : ''}

CRITICAL: Make each section substantive. 3-4 sentences should explore ONE clear idea fully.
NOTE: Architecture section will be generated separately - do not include it.`;
}

// Build deepening message - generates SWIM or DEEP that builds on previous
function buildDeepenMessage(n, draw, question, spreadType, letterContent, targetDepth, previousContent) {
  const ARCHETYPES = getArchetypes();
  const BOUNDS = getBounds();
  const AGENTS = getAgents();
  const STATUSES = getStatuses();

  const trans = draw.transient < 22 ? ARCHETYPES[draw.transient] :
                draw.transient < 62 ? BOUNDS[draw.transient - 22] :
                AGENTS[draw.transient - 62];
  const stat = STATUSES[draw.status];
  const statusPrefix = stat?.prefix || 'Balanced';
  const cardName = `${statusPrefix} ${trans?.name || 'Unknown'}`;
  const isImbalanced = draw.status !== 1;

  const depthInstructions = targetDepth === 'deep'
    ? `DEEP depth: Full transmission with no limits. Go into the philosophy, the psychology, the practical implications. Add examples, nuances, dimensions that SWIM introduced but didn't fully explore.`
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
[CARD:${n}:REBALANCER:${targetDepth.toUpperCase()}]
(Deepen the correction - new practical dimensions)` : ''}`;
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

// Minimal card data for API route (inline to avoid import issues)
function getStatuses() {
  return {
    1: { name: 'Balanced', desc: 'In harmonious expression', prefix: '' },
    2: { name: 'Too Much', desc: 'Overexpressed, projecting forward', prefix: 'Excessive' },
    3: { name: 'Too Little', desc: 'Underexpressed, anchored in past', prefix: 'Deficient' },
    4: { name: 'Unacknowledged', desc: 'Shadow aspect, denied', prefix: 'Shadow' }
  };
}

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
  const ARCHETYPES = getArchetypes();
  const BOUNDS = getBounds();
  const AGENTS = getAgents();
  const STATUSES = getStatuses();

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
    // BOUND
    const boundIndex = transient - 22;
    const bound = BOUNDS[boundIndex];
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
        const targetBound = BOUNDS.find(b => b.channel === targetChannel && b.number === targetNumber);
        if (targetBound) {
          const corrType = status === 2 ? 'DIAGONAL' : status === 3 ? 'VERTICAL' : 'REDUCTION';
          lines.push(`**Path back:** → ${targetBound.name} (${bound.channel}→${targetChannel}, ${bound.number}→${targetNumber}) via ${corrType} correction`);
        }
      }
    }

  } else {
    // AGENT
    const agentIndex = transient - 62;
    const agent = AGENTS[agentIndex];
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
        const targetAgent = AGENTS.find(a => a.archetype === correction);
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

function getArchetypes() {
  // Full archetype data with house and channel
  // MUST MATCH lib/archetypes.js exactly!
  return [
    { name: 'Potential', traditional: 'The Fool', house: 'Gestalt', channel: null },           // 0
    { name: 'Will', traditional: 'The Magician', house: 'Gestalt', channel: null },            // 1
    { name: 'Wisdom', traditional: 'The High Priestess', house: 'Spirit', channel: 'Cognition' },    // 2
    { name: 'Nurturing', traditional: 'The Empress', house: 'Spirit', channel: 'Structure' },        // 3
    { name: 'Order', traditional: 'The Emperor', house: 'Mind', channel: 'Intent' },                 // 4
    { name: 'Culture', traditional: 'The Hierophant', house: 'Mind', channel: 'Resonance' },         // 5
    { name: 'Compassion', traditional: 'The Lovers', house: 'Emotion', channel: 'Resonance' },       // 6
    { name: 'Drive', traditional: 'The Chariot', house: 'Emotion', channel: 'Intent' },              // 7
    { name: 'Fortitude', traditional: 'Strength', house: 'Body', channel: 'Structure' },             // 8
    { name: 'Discipline', traditional: 'The Hermit', house: 'Body', channel: 'Cognition' },          // 9
    { name: 'Source', traditional: 'Wheel of Fortune', house: 'Portal', channel: null },             // 10
    { name: 'Equity', traditional: 'Justice', house: 'Body', channel: 'Resonance' },                 // 11
    { name: 'Sacrifice', traditional: 'The Hanged Man', house: 'Body', channel: 'Intent' },          // 12
    { name: 'Change', traditional: 'Death', house: 'Emotion', channel: 'Structure' },                // 13
    { name: 'Balance', traditional: 'Temperance', house: 'Emotion', channel: 'Cognition' },          // 14
    { name: 'Abstraction', traditional: 'The Devil', house: 'Mind', channel: 'Cognition' },          // 15
    { name: 'Breakthrough', traditional: 'The Tower', house: 'Mind', channel: 'Structure' },         // 16
    { name: 'Inspiration', traditional: 'The Star', house: 'Spirit', channel: 'Intent' },            // 17
    { name: 'Imagination', traditional: 'The Moon', house: 'Spirit', channel: 'Resonance' },         // 18
    { name: 'Actualization', traditional: 'The Sun', house: 'Gestalt', channel: null },              // 19
    { name: 'Awareness', traditional: 'Judgement', house: 'Gestalt', channel: null },                // 20
    { name: 'Creation', traditional: 'The World', house: 'Portal', channel: null }                   // 21
  ];
}

function getBounds() {
  // Full bounds data with channel, number, and archetype reference
  // MUST MATCH lib/archetypes.js exactly!
  return [
    // Intent Channel (Wands) - indices 0-9
    { name: 'Activation', traditional: 'Ace of Wands', channel: 'Intent', number: 1, archetype: 0 },
    { name: 'Orientation', traditional: '2 of Wands', channel: 'Intent', number: 2, archetype: 17 },
    { name: 'Assertion', traditional: '3 of Wands', channel: 'Intent', number: 3, archetype: 4 },
    { name: 'Alignment', traditional: '4 of Wands', channel: 'Intent', number: 4, archetype: 7 },
    { name: 'Dedication', traditional: '5 of Wands', channel: 'Intent', number: 5, archetype: 12 },
    { name: 'Recognition', traditional: '6 of Wands', channel: 'Intent', number: 6, archetype: 12 },
    { name: 'Resolve', traditional: '7 of Wands', channel: 'Intent', number: 7, archetype: 7 },
    { name: 'Command', traditional: '8 of Wands', channel: 'Intent', number: 8, archetype: 4 },
    { name: 'Resilience', traditional: '9 of Wands', channel: 'Intent', number: 9, archetype: 17 },
    { name: 'Realization', traditional: '10 of Wands', channel: 'Intent', number: 10, archetype: 0 },
    // Cognition Channel (Swords) - indices 10-19
    { name: 'Perception', traditional: 'Ace of Swords', channel: 'Cognition', number: 1, archetype: 19 },
    { name: 'Reflection', traditional: '2 of Swords', channel: 'Cognition', number: 2, archetype: 2 },
    { name: 'Calculation', traditional: '3 of Swords', channel: 'Cognition', number: 3, archetype: 15 },
    { name: 'Repose', traditional: '4 of Swords', channel: 'Cognition', number: 4, archetype: 14 },
    { name: 'Discernment', traditional: '5 of Swords', channel: 'Cognition', number: 5, archetype: 9 },
    { name: 'Guidance', traditional: '6 of Swords', channel: 'Cognition', number: 6, archetype: 9 },
    { name: 'Reconciliation', traditional: '7 of Swords', channel: 'Cognition', number: 7, archetype: 14 },
    { name: 'Immersion', traditional: '8 of Swords', channel: 'Cognition', number: 8, archetype: 15 },
    { name: 'Plurality', traditional: '9 of Swords', channel: 'Cognition', number: 9, archetype: 2 },
    { name: 'Clarity', traditional: '10 of Swords', channel: 'Cognition', number: 10, archetype: 19 },
    // Resonance Channel (Cups) - indices 20-29
    { name: 'Receptivity', traditional: 'Ace of Cups', channel: 'Resonance', number: 1, archetype: 20 },
    { name: 'Merge', traditional: '2 of Cups', channel: 'Resonance', number: 2, archetype: 18 },
    { name: 'Celebration', traditional: '3 of Cups', channel: 'Resonance', number: 3, archetype: 5 },
    { name: 'Reverie', traditional: '4 of Cups', channel: 'Resonance', number: 4, archetype: 6 },
    { name: 'Reckoning', traditional: '5 of Cups', channel: 'Resonance', number: 5, archetype: 11 },
    { name: 'Reciprocity', traditional: '6 of Cups', channel: 'Resonance', number: 6, archetype: 11 },
    { name: 'Allure', traditional: '7 of Cups', channel: 'Resonance', number: 7, archetype: 6 },
    { name: 'Passage', traditional: '8 of Cups', channel: 'Resonance', number: 8, archetype: 5 },
    { name: 'Fulfillment', traditional: '9 of Cups', channel: 'Resonance', number: 9, archetype: 18 },
    { name: 'Completion', traditional: '10 of Cups', channel: 'Resonance', number: 10, archetype: 20 },
    // Structure Channel (Pentacles) - indices 30-39
    { name: 'Initiation', traditional: 'Ace of Pentacles', channel: 'Structure', number: 1, archetype: 1 },
    { name: 'Flow', traditional: '2 of Pentacles', channel: 'Structure', number: 2, archetype: 3 },
    { name: 'Formation', traditional: '3 of Pentacles', channel: 'Structure', number: 3, archetype: 16 },
    { name: 'Preservation', traditional: '4 of Pentacles', channel: 'Structure', number: 4, archetype: 13 },
    { name: 'Steadfastness', traditional: '5 of Pentacles', channel: 'Structure', number: 5, archetype: 8 },
    { name: 'Support', traditional: '6 of Pentacles', channel: 'Structure', number: 6, archetype: 8 },
    { name: 'Harvest', traditional: '7 of Pentacles', channel: 'Structure', number: 7, archetype: 13 },
    { name: 'Commitment', traditional: '8 of Pentacles', channel: 'Structure', number: 8, archetype: 16 },
    { name: 'Flourishing', traditional: '9 of Pentacles', channel: 'Structure', number: 9, archetype: 3 },
    { name: 'Achievement', traditional: '10 of Pentacles', channel: 'Structure', number: 10, archetype: 1 }
  ];
}

function getAgents() {
  // Full agents data with channel, role, and archetype reference
  // MUST MATCH lib/archetypes.js exactly!
  return [
    // Intent Channel - indices 0-3
    { name: 'Initiate of Intent', traditional: 'Page of Wands', channel: 'Intent', role: 'Initiate', archetype: 17 },
    { name: 'Catalyst of Intent', traditional: 'Knight of Wands', channel: 'Intent', role: 'Catalyst', archetype: 4 },
    { name: 'Steward of Intent', traditional: 'Queen of Wands', channel: 'Intent', role: 'Steward', archetype: 7 },
    { name: 'Executor of Intent', traditional: 'King of Wands', channel: 'Intent', role: 'Executor', archetype: 12 },
    // Cognition Channel - indices 4-7
    { name: 'Initiate of Cognition', traditional: 'Page of Swords', channel: 'Cognition', role: 'Initiate', archetype: 2 },
    { name: 'Catalyst of Cognition', traditional: 'Knight of Swords', channel: 'Cognition', role: 'Catalyst', archetype: 15 },
    { name: 'Steward of Cognition', traditional: 'Queen of Swords', channel: 'Cognition', role: 'Steward', archetype: 14 },
    { name: 'Executor of Cognition', traditional: 'King of Swords', channel: 'Cognition', role: 'Executor', archetype: 9 },
    // Resonance Channel - indices 8-11
    { name: 'Initiate of Resonance', traditional: 'Page of Cups', channel: 'Resonance', role: 'Initiate', archetype: 18 },
    { name: 'Catalyst of Resonance', traditional: 'Knight of Cups', channel: 'Resonance', role: 'Catalyst', archetype: 5 },
    { name: 'Steward of Resonance', traditional: 'Queen of Cups', channel: 'Resonance', role: 'Steward', archetype: 6 },
    { name: 'Executor of Resonance', traditional: 'King of Cups', channel: 'Resonance', role: 'Executor', archetype: 11 },
    // Structure Channel - indices 12-15
    { name: 'Initiate of Structure', traditional: 'Page of Pentacles', channel: 'Structure', role: 'Initiate', archetype: 3 },
    { name: 'Catalyst of Structure', traditional: 'Knight of Pentacles', channel: 'Structure', role: 'Catalyst', archetype: 16 },
    { name: 'Steward of Structure', traditional: 'Queen of Pentacles', channel: 'Structure', role: 'Steward', archetype: 13 },
    { name: 'Executor of Structure', traditional: 'King of Pentacles', channel: 'Structure', role: 'Executor', archetype: 8 }
  ];
}
