// app/api/letter/route.js
// On-demand generation for Letter section only
// First call in the progressive loading flow
// Uses Anthropic prompt caching for efficiency

export async function POST(request) {
  const {
    question,
    draws,           // All draws for context awareness
    spreadType,
    spreadKey,
    stance,
    system,          // Base system prompt (for caching)
    model
  } = await request.json();

  const effectiveModel = model || "claude-haiku-4-5-20251001";

  // Build letter-specific user message
  const userMessage = buildLetterMessage(question, draws, spreadType, spreadKey);

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
        max_tokens: 1200, // Letter needs ~800-1000 tokens
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
    const parsedLetter = parseLetterResponse(text);

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

// Build the user message for letter-only generation
function buildLetterMessage(question, draws, spreadType, spreadKey) {
  const cardCount = draws.length;
  const spreadName = spreadKey || `${cardCount}-card`;

  // Build minimal card overview for context
  const ARCHETYPES = getArchetypes();
  const BOUNDS = getBounds();
  const AGENTS = getAgents();
  const STATUSES = getStatuses();

  const cardNames = draws.map((draw, i) => {
    const trans = draw.transient < 21 ? ARCHETYPES[draw.transient] :
                  draw.transient < 61 ? BOUNDS[draw.transient - 21] :
                  AGENTS[draw.transient - 61];
    const stat = STATUSES[draw.status];
    const statusPrefix = stat?.prefix || 'Balanced';
    return `Card ${i + 1}: ${statusPrefix} ${trans?.name || 'Unknown'}`;
  }).join('\n');

  return `QUESTION: "${question}"

READING TYPE: ${spreadType.toUpperCase()} (${spreadName})

CARDS DRAWN (overview for letter context):
${cardNames}

Generate ONLY the LETTER section using the DEEP-FIRST model:
1. Write DEEP first (full personal address, warm, welcoming)
2. Condense DEEP → SWIM (same warmth, tightened)
3. Condense SWIM → WADE (same feeling, more essential)
4. Distill WADE → SURFACE (the heart of the welcome)

The Letter is a warm, personal address to the querent. It:
- Welcomes them to the reading
- Acknowledges their question
- Sets the tone for what they'll discover
- Does NOT interpret the cards yet (that comes later)

Respond with these markers IN THIS ORDER:

[LETTER:DEEP]
(COMPLETE welcome with no word limits - full warm transmission)

[LETTER:SWIM]
(CONDENSE above to ONE paragraph)

[LETTER:WADE]
(CONDENSE to 3-4 sentences)

[LETTER:SURFACE]
(DISTILL to 1-2 sentences - the heart of the welcome)

CRITICAL: Each level MUST be shorter than the one before. SURFACE must be dramatically shorter than DEEP. Do NOT copy content.`;
}

// Parse the letter response into structured data
function parseLetterResponse(text) {
  const extractSection = (marker) => {
    // Match content after [MARKER] until next [WORD:WORD] pattern or end
    const regex = new RegExp(`\\[${marker}\\]([\\s\\S]*?)(?=\\[[A-Z]+:[A-Z]+\\]|$)`, 'i');
    const match = text.match(regex);
    if (!match) return '';
    // Clean up: remove trailing markdown headers and horizontal rules
    let content = match[1].trim();
    content = content.replace(/\n---+\s*$/g, '');
    content = content.replace(/\n#{1,3}\s+[A-Z].*$/gi, '');
    return content.trim();
  };

  return {
    surface: extractSection('LETTER:SURFACE'),
    wade: extractSection('LETTER:WADE'),
    swim: extractSection('LETTER:SWIM'),
    deep: extractSection('LETTER:DEEP')
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
