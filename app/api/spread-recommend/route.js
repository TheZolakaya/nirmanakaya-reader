// app/api/spread-recommend/route.js
// Architecture Mode Spread Router
// Classifies a user's question into a house + count (= spread key)
// Uses Haiku for cost efficiency — classification is lightweight

import { REFLECT_SPREADS } from '../../../lib/spreads.js';
import { fetchWithRetry } from "../../../lib/fetchWithRetry.js";

// Build the classification system prompt with the full routing map
// This caches across users via Anthropic prompt caching
const SYSTEM_PROMPT = `You are a structural router for the Nirmanakaya consciousness architecture. Your job is to classify a user's question into exactly ONE house and ONE stage (count).

## The Five Houses — Domains of Human Seeking

Each house addresses a specific existential concern:

**Gestalt** — Wholeness, integration, "everything", life direction, coherence
- Concern: All four existential concerns (meta-integrative)
- Signals: "Nothing's coming together", "Am I on track?", "My whole life feels...", broad/general questions, multiple domains at once

**Spirit** — Meaning, purpose, creativity, inspiration, expression
- Concern: Meaninglessness
- Signals: "Where's the meaning?", "I've lost the magic", "What am I creating?", "Why does this matter?", purpose, vision, calling, art

**Mind** — Thinking, decisions, clarity, freedom, structure, understanding
- Concern: Freedom / Groundlessness
- Signals: "I can't think clearly", "I'm stuck in loops", "Should I choose X or Y?", analysis paralysis, overwhelm, mental fog, decisions

**Emotion** — Feelings, relationships, love, belonging, connection, isolation
- Concern: Isolation
- Signals: "Am I loved?", "Am I alone?", relationship questions, feelings about others, loneliness, attachment, trust, heartbreak

**Body** — Action, health, work, money, material reality, endurance, what's solid
- Concern: Death / Finitude
- Signals: "I can't act", "Nothing works in reality", "I'm exhausted", career, finances, health, physical energy, practical problems

## The Four Stages — Depth of Inquiry

**1 (Seed)** — One signal. Use when the question is simple, singular, or the person just needs one clear signal.
- "What's the most important thing right now?"
- Short questions, single-focus requests, "just tell me one thing"

**2 (Medium)** — A polarity/tension. Use when there's a clear duality, tension, or "torn between" energy.
- "What's the core tension?"
- "On one hand... on the other", comparison, either/or, balance between two forces

**3 (Fruition)** — An arc/movement. Use when there's a process, change, or trajectory implied.
- "Where has this been, where is it, where is it going?"
- Change in progress, evolution, "how did I get here", "where is this going", creative process

**4 (Feedback)** — Full diagnostic. Use when the question is complex, multi-faceted, or the person wants to see how all the channels are operating in a domain.
- "How is each dimension expressing in this area?"
- Deep/complex questions, "I need the full picture", system-level inquiry, "what's really going on"

## Rules

1. Every question maps to exactly one house and one count. No exceptions.
2. When a question spans multiple houses, choose the PRIMARY concern. If truly everything, choose Gestalt.
3. When depth is ambiguous, prefer count 2 (medium) or 3 (fruition) — most questions live there.
4. A question about a relationship is Emotion. A question about a decision is Mind. A question about meaning is Spirit. A question about what's working/not-working in reality is Body.
5. Do NOT explain your reasoning. Return ONLY the JSON object.

## Response Format

Return ONLY a valid JSON object, nothing else:
{"house":"spirit","count":3}`;

// Valid houses and counts for validation
const VALID_HOUSES = ['gestalt', 'spirit', 'mind', 'emotion', 'body'];
const VALID_COUNTS = [1, 2, 3, 4];

export async function POST(request) {
  const { question } = await request.json();

  if (!question || question.trim().length < 10) {
    return Response.json({ error: 'Question too short for classification' }, { status: 400 });
  }

  const systemWithCache = [
    {
      type: "text",
      text: SYSTEM_PROMPT,
      cache_control: { type: "ephemeral" }
    }
  ];

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
        model: "claude-haiku-4-5-20251001",
        max_tokens: 50,
        system: systemWithCache,
        messages: [
          {
            role: "user",
            content: question.trim()
          }
        ]
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error('Spread recommend API error:', data.error);
      return Response.json({ error: data.error.message }, { status: 500 });
    }

    const rawText = data.content?.[0]?.text?.trim() || '';

    // Parse the JSON response
    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch (e) {
      // Try to extract JSON from response if model added extra text
      const jsonMatch = rawText.match(/\{[^}]+\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        console.error('Failed to parse spread recommendation:', rawText);
        return Response.json({ error: 'Classification failed' }, { status: 500 });
      }
    }

    // Validate house and count
    const house = parsed.house?.toLowerCase();
    const count = parseInt(parsed.count, 10);

    if (!VALID_HOUSES.includes(house) || !VALID_COUNTS.includes(count)) {
      console.error('Invalid classification:', parsed);
      return Response.json({ error: 'Invalid classification result' }, { status: 500 });
    }

    // Derive the spread key and look up metadata
    const spreadKey = `${house}-${count}`;
    const spread = REFLECT_SPREADS[spreadKey];

    if (!spread) {
      return Response.json({ error: `Spread ${spreadKey} not found` }, { status: 500 });
    }

    return Response.json({
      spreadKey,
      house,
      count,
      name: spread.name,
      whenToUse: spread.whenToUse,
      archetype: spread.archetype,
      usage: {
        input_tokens: data.usage?.input_tokens || 0,
        output_tokens: data.usage?.output_tokens || 0,
        cache_creation_input_tokens: data.usage?.cache_creation_input_tokens || 0,
        cache_read_input_tokens: data.usage?.cache_read_input_tokens || 0
      }
    });

  } catch (error) {
    console.error('Spread recommend error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
