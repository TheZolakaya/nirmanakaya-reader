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
      : parseBaselineResponse(text, n, draw.status !== 1);

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

[CARD:${n}:ARCHITECTURE]
(Use **bold labels**, show the derivation chain)

[CARD:${n}:MIRROR]
(Single poetic line reflecting their situation)

[CARD:${n}:WHY:WADE]
(3-4 sentences: Why did THIS card appear for THIS question?)
${isImbalanced ? `
[CARD:${n}:REBALANCER:WADE]
(3-4 sentences: The specific correction needed and how to apply it)

[CARD:${n}:REBALANCER:ARCHITECTURE]
(Correction derivation)` : ''}

CRITICAL: Make each section substantive. 3-4 sentences should explore ONE clear idea fully.`;
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
function parseBaselineResponse(text, n, isImbalanced) {
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

  const cardData = {
    wade: extractSection(`CARD:${n}:WADE`),
    swim: '', // Not generated yet - will be filled by deepening
    deep: '', // Not generated yet
    architecture: extractSection(`CARD:${n}:ARCHITECTURE`),
    mirror: extractSection(`CARD:${n}:MIRROR`),
    why: {
      wade: extractSection(`CARD:${n}:WHY:WADE`),
      swim: '',
      deep: '',
      architecture: extractSection(`CARD:${n}:WHY:ARCHITECTURE`) || ''
    }
  };

  if (isImbalanced) {
    cardData.rebalancer = {
      wade: extractSection(`CARD:${n}:REBALANCER:WADE`),
      swim: '',
      deep: '',
      architecture: extractSection(`CARD:${n}:REBALANCER:ARCHITECTURE`)
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

function getArchetypes() {
  // Return minimal archetype data needed for card names
  // MUST MATCH lib/archetypes.js exactly!
  return [
    { name: 'Potential', traditional: 'The Fool' },           // 0 - Gestalt
    { name: 'Will', traditional: 'The Magician' },            // 1 - Gestalt
    { name: 'Wisdom', traditional: 'The High Priestess' },    // 2 - Spirit/Cognition
    { name: 'Nurturing', traditional: 'The Empress' },        // 3 - Spirit/Structure
    { name: 'Order', traditional: 'The Emperor' },            // 4 - Mind/Intent
    { name: 'Culture', traditional: 'The Hierophant' },       // 5 - Mind/Resonance
    { name: 'Compassion', traditional: 'The Lovers' },        // 6 - Emotion/Resonance
    { name: 'Drive', traditional: 'The Chariot' },            // 7 - Emotion/Intent
    { name: 'Fortitude', traditional: 'Strength' },           // 8 - Body/Structure
    { name: 'Discipline', traditional: 'The Hermit' },        // 9 - Body/Cognition
    { name: 'Source', traditional: 'Wheel of Fortune' },      // 10 - Portal
    { name: 'Equity', traditional: 'Justice' },               // 11 - Body/Resonance
    { name: 'Sacrifice', traditional: 'The Hanged Man' },     // 12 - Body/Intent
    { name: 'Change', traditional: 'Death' },                 // 13 - Emotion/Cognition
    { name: 'Balance', traditional: 'Temperance' },           // 14 - Emotion/Structure
    { name: 'Abstraction', traditional: 'The Devil' },        // 15 - Mind/Cognition
    { name: 'Breakthrough', traditional: 'The Tower' },       // 16 - Mind/Structure
    { name: 'Inspiration', traditional: 'The Star' },         // 17 - Spirit/Intent
    { name: 'Imagination', traditional: 'The Moon' },         // 18 - Spirit/Resonance
    { name: 'Actualization', traditional: 'The Sun' },        // 19 - Gestalt
    { name: 'Awareness', traditional: 'Judgement' },          // 20 - Gestalt
    { name: 'Creation', traditional: 'The World' }            // 21 - Portal
  ];
}

function getBounds() {
  // Return minimal bounds data (40 cards)
  // MUST MATCH lib/archetypes.js exactly!
  return [
    // Intent Channel (Wands) - indices 0-9
    { name: 'Activation', traditional: 'Ace of Wands' },
    { name: 'Orientation', traditional: '2 of Wands' },
    { name: 'Assertion', traditional: '3 of Wands' },
    { name: 'Alignment', traditional: '4 of Wands' },
    { name: 'Dedication', traditional: '5 of Wands' },
    { name: 'Recognition', traditional: '6 of Wands' },
    { name: 'Resolve', traditional: '7 of Wands' },
    { name: 'Command', traditional: '8 of Wands' },
    { name: 'Resilience', traditional: '9 of Wands' },
    { name: 'Realization', traditional: '10 of Wands' },
    // Cognition Channel (Swords) - indices 10-19
    { name: 'Perception', traditional: 'Ace of Swords' },
    { name: 'Reflection', traditional: '2 of Swords' },
    { name: 'Calculation', traditional: '3 of Swords' },
    { name: 'Repose', traditional: '4 of Swords' },
    { name: 'Discernment', traditional: '5 of Swords' },
    { name: 'Guidance', traditional: '6 of Swords' },
    { name: 'Reconciliation', traditional: '7 of Swords' },
    { name: 'Immersion', traditional: '8 of Swords' },
    { name: 'Rumination', traditional: '9 of Swords' },
    { name: 'Conclusion', traditional: '10 of Swords' },
    // Resonance Channel (Cups) - indices 20-29
    { name: 'Openness', traditional: 'Ace of Cups' },
    { name: 'Rapport', traditional: '2 of Cups' },
    { name: 'Communion', traditional: '3 of Cups' },
    { name: 'Reverie', traditional: '4 of Cups' },
    { name: 'Reckoning', traditional: '5 of Cups' },
    { name: 'Reciprocity', traditional: '6 of Cups' },
    { name: 'Allure', traditional: '7 of Cups' },
    { name: 'Departure', traditional: '8 of Cups' },
    { name: 'Contentment', traditional: '9 of Cups' },
    { name: 'Fulfillment', traditional: '10 of Cups' },
    // Structure Channel (Pentacles) - indices 30-39
    { name: 'Foundation', traditional: 'Ace of Pentacles' },
    { name: 'Adaptation', traditional: '2 of Pentacles' },
    { name: 'Collaboration', traditional: '3 of Pentacles' },
    { name: 'Conservation', traditional: '4 of Pentacles' },
    { name: 'Disruption', traditional: '5 of Pentacles' },
    { name: 'Circulation', traditional: '6 of Pentacles' },
    { name: 'Cultivation', traditional: '7 of Pentacles' },
    { name: 'Refinement', traditional: '8 of Pentacles' },
    { name: 'Flourishing', traditional: '9 of Pentacles' },
    { name: 'Legacy', traditional: '10 of Pentacles' }
  ];
}

function getAgents() {
  // Return minimal agents data (16 cards)
  // MUST MATCH lib/archetypes.js exactly!
  return [
    // Intent Channel - indices 0-3
    { name: 'Initiate of Intent', traditional: 'Page of Wands' },
    { name: 'Catalyst of Intent', traditional: 'Knight of Wands' },
    { name: 'Steward of Intent', traditional: 'Queen of Wands' },
    { name: 'Executor of Intent', traditional: 'King of Wands' },
    // Cognition Channel - indices 4-7
    { name: 'Initiate of Cognition', traditional: 'Page of Swords' },
    { name: 'Catalyst of Cognition', traditional: 'Knight of Swords' },
    { name: 'Steward of Cognition', traditional: 'Queen of Swords' },
    { name: 'Executor of Cognition', traditional: 'King of Swords' },
    // Resonance Channel - indices 8-11
    { name: 'Initiate of Resonance', traditional: 'Page of Cups' },
    { name: 'Catalyst of Resonance', traditional: 'Knight of Cups' },
    { name: 'Steward of Resonance', traditional: 'Queen of Cups' },
    { name: 'Executor of Resonance', traditional: 'King of Cups' },
    // Structure Channel - indices 12-15
    { name: 'Initiate of Structure', traditional: 'Page of Pentacles' },
    { name: 'Catalyst of Structure', traditional: 'Knight of Pentacles' },
    { name: 'Steward of Structure', traditional: 'Queen of Pentacles' },
    { name: 'Executor of Structure', traditional: 'King of Pentacles' }
  ];
}
