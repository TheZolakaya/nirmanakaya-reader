// app/api/synthesis/route.js
// On-demand generation for Summary + Path to Balance
// Called AFTER all cards are loaded (needs card content for synthesis)
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
    model
  } = await request.json();

  const effectiveModel = model || "claude-haiku-4-5-20251001";

  // Build synthesis user message with card context
  const userMessage = buildSynthesisMessage(question, draws, cards, letter, spreadType, spreadKey);

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
        max_tokens: 2500, // Summary + Path needs ~2000 tokens
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
    const parsed = parseSynthesisResponse(text);

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

// Build the user message for synthesis generation
function buildSynthesisMessage(question, draws, cards, letter, spreadType, spreadKey) {
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
Reading: ${card.swim || card.wade || card.surface || '(no content)'}
${isImbalanced && card.rebalancer ? `Rebalancer: ${card.rebalancer.swim || card.rebalancer.wade || card.rebalancer.surface || ''}` : ''}
Why: ${card.why?.swim || card.why?.wade || card.why?.surface || ''}`;
  }).join('\n\n');

  const letterContext = letter?.swim || letter?.wade || letter?.surface || '';

  return `QUESTION: "${question}"

READING TYPE: ${spreadType.toUpperCase()} (${spreadKey})

LETTER (for tone continuity):
${letterContext}

ALL CARDS (for synthesis):
${cardSummaries}

Now generate the SUMMARY (Overview) and PATH TO BALANCE sections.

These are HOLISTIC sections that synthesize ALL the cards together:
- SUMMARY: What do these cards, taken together, reveal about the question?
- PATH TO BALANCE: For any imbalanced cards, how can they find balance? What's the aggregate path forward?

Use the DEEP-FIRST model for both:
1. Write DEEP first (full synthesis, complete picture)
2. Condense DEEP → SWIM (same insight, tightened)
3. Condense SWIM → WADE (same insight, more essential)
4. Distill WADE → SURFACE (the essence)

Respond with these markers IN THIS ORDER:

[SUMMARY:DEEP]
(Write the COMPLETE overview with no word limits - full transmission)

[SUMMARY:SWIM]
(Now CONDENSE the above to ONE paragraph - keep same meaning, fewer words)

[SUMMARY:WADE]
(CONDENSE further to exactly 3-4 sentences)

[SUMMARY:SURFACE]
(DISTILL to exactly 1-2 sentences - the absolute essence)

[PATH:DEEP]
(Write the COMPLETE path with no word limits - full transmission)

[PATH:SWIM]
(CONDENSE to ONE paragraph)

[PATH:WADE]
(CONDENSE to exactly 3-4 sentences)

[PATH:SURFACE]
(DISTILL to exactly 1-2 sentences)

[PATH:ARCHITECTURE]
(Structural analysis)

CRITICAL: Each level MUST be shorter than the one before it. SURFACE must be dramatically shorter than DEEP. Do NOT copy content between levels.`;
}

// Parse the synthesis response into structured data
function parseSynthesisResponse(text) {
  const extractSection = (marker) => {
    // Match content after [MARKER] until next [WORD:WORD] pattern or end
    // Also strip any trailing markdown headers like "## PATH TO BALANCE"
    const regex = new RegExp(`\\[${marker}\\]([\\s\\S]*?)(?=\\[[A-Z]+:[A-Z]+\\]|$)`, 'i');
    const match = text.match(regex);
    if (!match) return '';
    // Clean up: remove trailing markdown headers and horizontal rules
    let content = match[1].trim();
    content = content.replace(/\n---+\s*$/g, ''); // Remove trailing ---
    content = content.replace(/\n#{1,3}\s+[A-Z].*$/gi, ''); // Remove trailing markdown headers
    return content.trim();
  };

  return {
    summary: {
      surface: extractSection('SUMMARY:SURFACE'),
      wade: extractSection('SUMMARY:WADE'),
      swim: extractSection('SUMMARY:SWIM'),
      deep: extractSection('SUMMARY:DEEP')
    },
    path: {
      surface: extractSection('PATH:SURFACE'),
      wade: extractSection('PATH:WADE'),
      swim: extractSection('PATH:SWIM'),
      deep: extractSection('PATH:DEEP'),
      architecture: extractSection('PATH:ARCHITECTURE')
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
