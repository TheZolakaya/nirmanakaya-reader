// app/api/card-depth/route.js
// On-demand depth generation for a single card
// Generates FULL depth chain (DEEP first, condense down) for one card at a time
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
    model           // Model to use
  } = await request.json();

  const effectiveModel = model || "claude-haiku-4-5-20251001";
  const n = cardIndex + 1; // 1-indexed for markers

  // Build card-specific user message
  const userMessage = buildCardDepthMessage(n, draw, question, spreadType, letterContent);

  // Convert system prompt to cached format for 90% input token savings
  const systemWithCache = [
    {
      type: "text",
      text: system,
      cache_control: { type: "ephemeral" }
    }
  ];

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
        max_tokens: 3000, // Single card needs ~2000-2500 tokens
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
    const parsedCard = parseCardDepthResponse(text, n, draw.status !== 1);

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

// Build the user message for single-card depth generation
function buildCardDepthMessage(n, draw, question, spreadType, letterContent) {
  // Import card data inline (can't import in API routes easily)
  const ARCHETYPES = getArchetypes();
  const BOUNDS = getBounds();
  const AGENTS = getAgents();
  const STATUSES = getStatuses();

  const trans = draw.transient < 21 ? ARCHETYPES[draw.transient] :
                draw.transient < 61 ? BOUNDS[draw.transient - 21] :
                AGENTS[draw.transient - 61];
  const stat = STATUSES[draw.status];
  const statusPrefix = stat?.prefix || 'Balanced';
  const cardName = `${statusPrefix} ${trans?.name || 'Unknown'}`;
  const isImbalanced = draw.status !== 1;

  return `QUESTION: "${question}"

CONTEXT: This is for Card ${n} in a ${spreadType.toUpperCase()} reading.
${letterContent ? `\nLETTER CONTEXT:\n${letterContent}\n` : ''}

CARD ${n}: ${cardName}
Traditional Name: ${trans?.traditional || 'N/A'}
Description: ${trans?.description || ''}
${trans?.extended ? `Extended: ${trans.extended}` : ''}
Status: ${stat?.name || 'Balanced'} — ${stat?.desc || 'In balance'}

Generate the FULL DEPTH CHAIN for this card using the DEEP-FIRST model:
1. Write DEEP first (full transmission, no limits)
2. Condense DEEP → SWIM (same insight, tightened)
3. Condense SWIM → WADE (same insight, more essential)
4. Distill WADE → SURFACE (absolute essence)

Respond with these markers, each on its own line:
[CARD:${n}:SURFACE] 1-2 sentences. Core insight only.
[CARD:${n}:WADE] 3-4 sentences. Add context.
[CARD:${n}:SWIM] Full paragraph. Rich exploration.
[CARD:${n}:DEEP] No limits. Full expression.
[CARD:${n}:ARCHITECTURE] Derivation chain and structural analysis.
[CARD:${n}:MIRROR] Single poetic line reflecting the core insight.
[CARD:${n}:WHY:SURFACE] Why this card appeared - 1 sentence.
[CARD:${n}:WHY:WADE] Why this card - 2-3 sentences.
[CARD:${n}:WHY:SWIM] Why this card - full paragraph.
[CARD:${n}:WHY:DEEP] Why this card - complete transmission.
[CARD:${n}:WHY:ARCHITECTURE] Teleological grounding.
${isImbalanced ? `
[CARD:${n}:REBALANCER:SURFACE] Rebalancing advice - 1 sentence.
[CARD:${n}:REBALANCER:WADE] Rebalancing - 2-3 sentences.
[CARD:${n}:REBALANCER:SWIM] Rebalancing - full paragraph.
[CARD:${n}:REBALANCER:DEEP] Complete rebalancing transmission.
[CARD:${n}:REBALANCER:ARCHITECTURE] Correction derivation.` : ''}

CRITICAL: Generate DEEP first as source of truth, then condense DOWN. Each shallower level preserves the SAME meaning — just tighter.`;
}

// Parse the card depth response into structured data
function parseCardDepthResponse(text, n, isImbalanced) {
  const extractSection = (marker) => {
    const regex = new RegExp(`\\[${marker}\\]([\\s\\S]*?)(?=\\[[A-Z]|$)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : '';
  };

  const cardData = {
    surface: extractSection(`CARD:${n}:SURFACE`),
    wade: extractSection(`CARD:${n}:WADE`),
    swim: extractSection(`CARD:${n}:SWIM`),
    deep: extractSection(`CARD:${n}:DEEP`),
    architecture: extractSection(`CARD:${n}:ARCHITECTURE`),
    mirror: extractSection(`CARD:${n}:MIRROR`),
    why: {
      surface: extractSection(`CARD:${n}:WHY:SURFACE`),
      wade: extractSection(`CARD:${n}:WHY:WADE`),
      swim: extractSection(`CARD:${n}:WHY:SWIM`),
      deep: extractSection(`CARD:${n}:WHY:DEEP`),
      architecture: extractSection(`CARD:${n}:WHY:ARCHITECTURE`)
    }
  };

  if (isImbalanced) {
    cardData.rebalancer = {
      surface: extractSection(`CARD:${n}:REBALANCER:SURFACE`),
      wade: extractSection(`CARD:${n}:REBALANCER:WADE`),
      swim: extractSection(`CARD:${n}:REBALANCER:SWIM`),
      deep: extractSection(`CARD:${n}:REBALANCER:DEEP`),
      architecture: extractSection(`CARD:${n}:REBALANCER:ARCHITECTURE`)
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
  // Return minimal bounds data (40 cards)
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
  // Return minimal agents data (16 cards)
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
