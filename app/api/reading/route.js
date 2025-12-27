// app/api/reading/route.js
// Handles readings and follow-up conversations

export async function POST(request) {
  const { messages, system, model } = await request.json();

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: model || "claude-sonnet-4-20250514",
        max_tokens: 1500,
        system: system,
        messages: messages
      })
    });

    const data = await response.json();
    
    if (data.error) {
      return Response.json({ error: data.error.message }, { status: 500 });
    }

    const text = data.content?.map(item => item.text || "").join("\n") || "No response received.";
    return Response.json({ reading: text });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
