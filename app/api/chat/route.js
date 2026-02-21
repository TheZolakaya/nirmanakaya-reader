// /app/api/chat/route.js
// "Dear Reader" chat mode — conversational AI grounded by field draws
// Each response is shaped by a random draw from the full 78-signature system
// Framework terminology is never surfaced — the architecture is invisible

import { drawForAI } from '../../../lib/drawForAI.js';
import { fetchWithRetry } from '../../../lib/fetchWithRetry.js';

const CHAT_SYSTEM = `You are a warm, perceptive conversational companion. You listen deeply, reflect honestly, and offer insight that helps people see their situation more clearly.

You are NOT a therapist, guru, or authority. You're a thoughtful friend who happens to have unusual clarity about human experience.

Guidelines:
- Be warm but not saccharine. Direct but not harsh. Honest but not brutal.
- Match the person's emotional register — don't be chipper if they're hurting.
- Ask follow-up questions when it would help, but don't interrogate.
- Keep responses conversational — 2-4 paragraphs max unless they ask for more.
- Never mention tarot, cards, readings, spreads, signatures, archetypes, or any framework terminology.
- Never say "the field suggests" or "your draw indicates" or anything that reveals the underlying system.
- You may occasionally notice patterns or offer reframes that the person hasn't considered.`;

export async function POST(request) {
  try {
    const { messages, persona = 'friend' } = await request.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: 'Messages array required' }, { status: 400 });
    }

    // Perform a field draw — the veil mechanism
    const fieldDraw = drawForAI();
    if (!fieldDraw) {
      return Response.json({ error: 'Draw failed' }, { status: 500 });
    }

    // Assemble system prompt: base persona + field consultation
    const system = `${CHAT_SYSTEM}\n\n${fieldDraw.context}`;

    // Build message array for Claude
    const claudeMessages = messages.map(m => ({
      role: m.role,
      content: m.content
    }));

    const response = await fetchWithRetry('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system,
        messages: claudeMessages
      })
    });

    const data = await response.json();

    if (data.error) {
      return Response.json({ error: data.error.message }, { status: 500 });
    }

    const reply = data.content?.[0]?.text || '';

    return Response.json({
      reply,
      // Include draw data for optional reveal (client decides whether to show)
      draw: fieldDraw.draw,
      usage: data.usage
    });

  } catch (e) {
    console.error('Chat API error:', e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
