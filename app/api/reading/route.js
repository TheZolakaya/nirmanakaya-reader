// app/api/reading/route.js
// Handles readings and follow-up conversations
// Supports First Contact mode (isFirstContact=true) for Level 0 users
// Uses Anthropic prompt caching for 90% savings on repeated system prompts

export async function POST(request) {
  const { messages, system, model, isFirstContact, max_tokens } = await request.json();

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
