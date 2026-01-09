// app/api/translate/route.js
// Stage 2 Persona Translation API
// Takes a reading and translates it into a specified persona voice
// Uses Haiku for cost efficiency (translation is simpler than generation)

import { buildTranslationSystemPrompt } from '../../../lib/personas.js';

export async function POST(request) {
  const { content, persona, humor, register, roastMode, directMode } = await request.json();

  // Validate required fields
  if (!content) {
    return Response.json({ error: 'Content is required' }, { status: 400 });
  }
  if (!persona || persona === 'none') {
    return Response.json({ error: 'Persona is required (not "none")' }, { status: 400 });
  }

  // Build the system prompt for translation
  const systemPrompt = buildTranslationSystemPrompt(
    persona,
    humor || 5,
    register || 5,
    roastMode || false,
    directMode || false
  );

  // Use prompt caching for system prompt efficiency
  const systemWithCache = [
    {
      type: "text",
      text: systemPrompt,
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
        model: "claude-haiku-4-5-20251001",
        max_tokens: 6000,
        system: systemWithCache,
        messages: [
          {
            role: "user",
            content: content
          }
        ]
      })
    });

    const data = await response.json();

    if (data.error) {
      return Response.json({ error: data.error.message }, { status: 500 });
    }

    const translated = data.content?.map(item => item.text || "").join("\n") || "";

    return Response.json({
      translated,
      usage: {
        input_tokens: data.usage?.input_tokens || 0,
        output_tokens: data.usage?.output_tokens || 0,
        cache_creation_input_tokens: data.usage?.cache_creation_input_tokens || 0,
        cache_read_input_tokens: data.usage?.cache_read_input_tokens || 0
      }
    });

  } catch (error) {
    console.error('Translation API error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
