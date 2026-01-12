// app/api/reading/route.js
// Handles readings and follow-up conversations
// Supports First Contact mode (isFirstContact=true) for Level 0 users
// Supports DTP mode (isDTP=true) for Direct Token Protocol
// Uses Anthropic prompt caching for 90% savings on repeated system prompts

import { ARCHETYPES } from '../../../lib/archetypes.js';
import { STATUSES } from '../../../lib/constants.js';
import { getComponent } from '../../../lib/corrections.js';

// Build DTP system prompt with token extraction and reading instructions
function buildDTPSystemPrompt(draws) {
  // Format draws for the AI
  const drawsText = draws.map((draw, i) => {
    const trans = getComponent(draw.transient);
    const pos = ARCHETYPES[draw.position];
    const stat = STATUSES[draw.status];
    return `Draw ${i + 1}: ${trans.name} in ${pos?.name || 'Unknown'} — ${stat.name}`;
  }).join('\n');

  return `DIRECT TOKEN PROTOCOL (DTP)
============================

You are reading reality objects named by the user. Each token gets its own card.

PHASE 1: TOKEN EXTRACTION
-------------------------
From the user's input, extract up to 5 Active Tokens — the nouns/entities and verbs/dynamics that are alive in their statement.

Rules:
- Filter connective tissue (I, to, but, and, the, my, a, an)
- Preserve the user's exact language where possible
- Balance: don't let 5 emotions crowd out structure, or 5 nouns crowd out agency
- If more than 5 candidates, select the most energetically present

PHASE 2: READING
----------------
Available draws (use one per token, in order):
${drawsText}

For each token, provide interpretation at WADE depth using this structure:
- Use the three-layer sentence: "[Token] is expressing as [Card] in [Position]"
- Follow the Rule of Transcendence: Expand the token to fit the archetype, not vice versa
- Describe what IS, not what will be
- End with capacity: "This is visible now. It is adjustable." (imbalanced) or "It is usable." (balanced)

LANGUAGE RULES:
- Never use: "will cause", "means that", "will lead to", "destiny"
- Use: "is expressing as", "is structured by", "is currently shaped through"
- The user's predictive framing is diagnostic — shows where attention is magnetized, not where the future is fixed

RESPONSE FORMAT (JSON):
Return a valid JSON object:
{
  "tokens": ["Token1", "Token2", ...],
  "readings": [
    {
      "token": "Token1",
      "drawIndex": 0,
      "threeLine": "[Token] is expressing as [Card] in [Position] — [Status]",
      "interpretation": "Wade-depth interpretation text..."
    },
    ...
  ],
  "synthesis": "One paragraph connecting all tokens and their readings."
}

CRITICAL: Return ONLY the JSON object, no markdown code fences, no explanation before or after.`;
}

export async function POST(request) {
  const { messages, system, model, isFirstContact, max_tokens, isDTP, dtpInput, draws } = await request.json();

  // DTP mode handling
  if (isDTP && dtpInput && draws) {
    const dtpSystem = buildDTPSystemPrompt(draws);
    const dtpMessages = [
      { role: 'user', content: dtpInput }
    ];

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          system: dtpSystem,
          messages: dtpMessages
        })
      });

      const data = await response.json();

      if (data.error) {
        return Response.json({ error: data.error.message }, { status: 500 });
      }

      const text = data.content?.map(item => item.text || "").join("") || "";

      // Parse the JSON response
      try {
        // Handle potential markdown code fences
        let jsonText = text.trim();
        if (jsonText.startsWith('```json')) {
          jsonText = jsonText.slice(7);
        } else if (jsonText.startsWith('```')) {
          jsonText = jsonText.slice(3);
        }
        if (jsonText.endsWith('```')) {
          jsonText = jsonText.slice(0, -3);
        }
        jsonText = jsonText.trim();

        const dtpResponse = JSON.parse(jsonText);
        return Response.json({
          isDTP: true,
          tokens: dtpResponse.tokens || [],
          readings: dtpResponse.readings || [],
          synthesis: dtpResponse.synthesis || '',
          draws: draws,
          usage: data.usage
        });
      } catch (parseError) {
        // If JSON parsing fails, return raw text for debugging
        return Response.json({
          isDTP: true,
          error: 'Failed to parse DTP response',
          rawResponse: text,
          usage: data.usage
        }, { status: 500 });
      }

    } catch (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
  }

  // First Contact mode uses Haiku with minimal tokens
  const effectiveModel = isFirstContact
    ? "claude-haiku-4-5-20251001"
    : (model || "claude-sonnet-4-20250514");

  const effectiveMaxTokens = isFirstContact
    ? 300
    : (max_tokens || 4000);

  // Convert system prompt to cached format for 90% input token savings
  // Cache lasts 5 minutes and refreshes on each use
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
        max_tokens: effectiveMaxTokens,
        system: systemWithCache,
        messages: messages
      })
    });

    const data = await response.json();

    if (data.error) {
      return Response.json({ error: data.error.message }, { status: 500 });
    }

    const text = data.content?.map(item => item.text || "").join("\n") || "No response received.";
    // Include cache stats in usage for monitoring
    return Response.json({
      reading: text,
      usage: {
        ...data.usage,
        cache_creation_input_tokens: data.usage?.cache_creation_input_tokens || 0,
        cache_read_input_tokens: data.usage?.cache_read_input_tokens || 0
      },
      isFirstContact
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
