// app/api/synthesis/route.js
// On-demand generation for Summary + Path to Balance
// Supports WADE baseline generation OR progressive deepening
// Uses Anthropic prompt caching for efficiency

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
    previousContent  // { summary: {...}, path: {...} } - content to build on
  } = await request.json();

  const effectiveModel = model || "claude-haiku-4-5-20251001";
  const depth = targetDepth || 'wade';

  // Determine if this is baseline generation or progressive deepening
  const isDeepening = previousContent && Object.keys(previousContent).length > 0;

  // Build synthesis user message
  const userMessage = isDeepening
    ? buildDeepenMessage(question, draws, cards, letter, spreadType, spreadKey, depth, previousContent)
    : buildBaselineMessage(question, draws, cards, letter, spreadType, spreadKey);

  // Convert system prompt to cached format for 90% input token savings
  const systemWithCache = [
    {
      type: "text",
      text: system,
      cache_control: { type: "ephemeral" }
    }
  ];

  // Adjust max tokens based on what we're generating
  const maxTokens = isDeepening ? 1500 : 1500;

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
function buildBaselineMessage(question, draws, cards, letter, spreadType, spreadKey) {
  const ARCHETYPES = getArchetypes();
  const BOUNDS = getBounds();
  const AGENTS = getAgents();
  const STATUSES = getStatuses();

  // Build card summaries for synthesis context
  const cardSummaries = cards.map((card, i) => {
    const draw = draws[i];
    const trans = draw.transient < 21 ? ARCHETYPES[draw.transient] :
                  draw.transient < 61 ? BOUNDS[draw.transient - 21] :
                  AGENTS[draw.transient - 61];
    const stat = STATUSES[draw.status];
    const statusPrefix = stat?.prefix || 'Balanced';
    const cardName = `${statusPrefix} ${trans?.name || 'Unknown'}`;
    const isImbalanced = draw.status !== 1;

    return `CARD ${i + 1}: ${cardName}
Reading: ${card.wade || card.surface || '(loading)'}
${isImbalanced && card.rebalancer ? `Rebalancer: ${card.rebalancer.wade || card.rebalancer.surface || ''}` : ''}
Why: ${card.why?.wade || card.why?.surface || ''}`;
  }).join('\n\n');

  const letterContext = typeof letter === 'string' ? letter : (letter?.wade || letter?.swim || letter?.deep || '');

  return `QUESTION: "${question}"

READING TYPE: ${spreadType.toUpperCase()} (${spreadKey})

LETTER (for tone continuity):
${letterContext}

ALL CARDS (for synthesis):
${cardSummaries}

Generate WADE level content for SUMMARY and PATH TO BALANCE.

WADE means: 3-4 substantive sentences per section. Real insight, not fluff.

These are HOLISTIC sections that synthesize ALL the cards together:
- SUMMARY: What do these cards, taken together, reveal about the question?
- PATH TO BALANCE: For any imbalanced cards, what's the aggregate path forward?

Respond with these markers:

[SUMMARY:WADE]
(3-4 sentences: The unified insight from all these cards together)

[PATH:WADE]
(3-4 sentences: The aggregate correction path)

[PATH:ARCHITECTURE]
(Structural analysis of how the corrections work together)

FORMATTING: Always use blank lines between paragraphs. Each paragraph should be 2-4 sentences max. No walls of text.

CRITICAL: Make each section substantive. 3-4 sentences should explore ONE clear synthesis.`;
}

// Build deepening message - generates SWIM or DEEP that builds on previous
function buildDeepenMessage(question, draws, cards, letter, spreadType, spreadKey, targetDepth, previousContent) {
  const ARCHETYPES = getArchetypes();
  const BOUNDS = getBounds();
  const AGENTS = getAgents();
  const STATUSES = getStatuses();

  const cardNames = cards.map((card, i) => {
    const draw = draws[i];
    const trans = draw.transient < 21 ? ARCHETYPES[draw.transient] :
                  draw.transient < 61 ? BOUNDS[draw.transient - 21] :
                  AGENTS[draw.transient - 61];
    const stat = STATUSES[draw.status];
    return `${stat?.prefix || 'Balanced'} ${trans?.name}`;
  }).join(', ');

  const depthInstructions = targetDepth === 'deep'
    ? `DEEP depth: Full transmission. Go into the philosophy, psychology, and practical implications of how all these patterns work together. Add examples and dimensions that SWIM introduced but didn't fully explore.`
    : `SWIM depth: One rich paragraph per section. Add psychological depth and practical implications that WADE introduced but didn't fully develop.`;

  // Build previous content display
  let previousDisplay = '';
  if (previousContent.summary?.wade) previousDisplay += `Summary WADE: ${previousContent.summary.wade}\n`;
  if (previousContent.summary?.swim) previousDisplay += `Summary SWIM: ${previousContent.summary.swim}\n`;
  if (previousContent.path?.wade) previousDisplay += `Path WADE: ${previousContent.path.wade}\n`;
  if (previousContent.path?.swim) previousDisplay += `Path SWIM: ${previousContent.path.swim}\n`;

  return `QUESTION: "${question}"

CARDS: ${cardNames}

PREVIOUS CONTENT (what the querent has already read):
${previousDisplay}

Now generate ${targetDepth.toUpperCase()} level content for SUMMARY and PATH.

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

[PATH:${targetDepth.toUpperCase()}]
(Deepen the path - add practical dimensions)`;
}

// Parse baseline response (WADE for summary + path)
function parseBaselineResponse(text) {
  const extractSection = (marker) => {
    const regex = new RegExp(`\\[${marker}\\]([\\s\\S]*?)(?=\\[[A-Z]+:[A-Z]+\\]|$)`, 'i');
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

  return {
    summary: {
      wade: extractSection('SUMMARY:WADE'),
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
    const regex = new RegExp(`\\[${marker}\\]([\\s\\S]*?)(?=\\[[A-Z]+:[A-Z]+\\]|$)`, 'i');
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
  const newSummary = extractSection(`SUMMARY:${depthMarker}`);
  const newPath = extractSection(`PATH:${depthMarker}`);

  return {
    summary: {
      wade: previousContent?.summary?.wade || '',
      swim: depth === 'swim' ? newSummary : (previousContent?.summary?.swim || ''),
      deep: depth === 'deep' ? newSummary : (previousContent?.summary?.deep || '')
    },
    path: {
      wade: previousContent?.path?.wade || '',
      swim: depth === 'swim' ? newPath : (previousContent?.path?.swim || ''),
      deep: depth === 'deep' ? newPath : (previousContent?.path?.deep || ''),
      architecture: previousContent?.path?.architecture || ''
    }
  };
}

// Minimal card data for API route
function getStatuses() {
  return {
    1: { name: 'Balanced', desc: 'In harmonious expression', prefix: '' },
    2: { name: 'Too Much', desc: 'Overexpressed, projecting forward', prefix: 'Excessive' },
    3: { name: 'Too Little', desc: 'Underexpressed, anchored in past', prefix: 'Deficient' },
    4: { name: 'Unacknowledged', desc: 'Shadow aspect, denied', prefix: 'Shadow' }
  };
}

function getArchetypes() {
  return [
    { name: 'Potential', traditional: 'The Fool' },
    { name: 'Will', traditional: 'The Magician' },
    { name: 'Awareness', traditional: 'The High Priestess' },
    { name: 'Creation', traditional: 'The Empress' },
    { name: 'Authority', traditional: 'The Emperor' },
    { name: 'Tradition', traditional: 'The Hierophant' },
    { name: 'Connection', traditional: 'The Lovers' },
    { name: 'Movement', traditional: 'The Chariot' },
    { name: 'Power', traditional: 'Strength' },
    { name: 'Solitude', traditional: 'The Hermit' },
    { name: 'Fortune', traditional: 'Wheel of Fortune' },
    { name: 'Balance', traditional: 'Justice' },
    { name: 'Surrender', traditional: 'The Hanged Man' },
    { name: 'Transformation', traditional: 'Death' },
    { name: 'Harmony', traditional: 'Temperance' },
    { name: 'Bondage', traditional: 'The Devil' },
    { name: 'Liberation', traditional: 'The Tower' },
    { name: 'Hope', traditional: 'The Star' },
    { name: 'Illusion', traditional: 'The Moon' },
    { name: 'Joy', traditional: 'The Sun' },
    { name: 'Reckoning', traditional: 'Judgement' }
  ];
}

function getBounds() {
  const channels = ['Intent', 'Cognition', 'Resonance', 'Structure'];
  const bounds = [];
  for (let c = 0; c < 4; c++) {
    for (let n = 1; n <= 10; n++) {
      bounds.push({ name: `${channels[c]} ${n}`, traditional: `${n} of ${['Wands', 'Swords', 'Cups', 'Pentacles'][c]}` });
    }
  }
  return bounds;
}

function getAgents() {
  const channels = ['Intent', 'Cognition', 'Resonance', 'Structure'];
  const roles = ['Presence', 'Practice', 'Catalyst', 'Source'];
  const agents = [];
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      agents.push({ name: `${roles[r]} of ${channels[c]}`, traditional: `${['Page', 'Knight', 'Queen', 'King'][r]} of ${['Wands', 'Swords', 'Cups', 'Pentacles'][c]}` });
    }
  }
  return agents;
}
