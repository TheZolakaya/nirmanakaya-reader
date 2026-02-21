// /app/api/chat/route.js
// "Dear Reader" chat mode — V9: THE REVELATION
//
// Pass 1: Sonnet generates vanilla response (natural tendencies)
// Draw:   Single draw — reading the AI's response
// Pass 2: Sonnet receives self-reading with:
//         - Permission structure (directness IS kindness)
//         - Discernment step (name where you hedged)
//         - Embodiment framing (not correction — revelation)
//         "Trust what you see. Speak from that place."
//
// V8's bicycle + reading-guided language refinement.
// The draws are readings ON the AI, not FOR the user.
// Framework terminology is never surfaced — the architecture is invisible.

import { drawForAI, buildSingleReadingV9 } from '../../../lib/drawForAI.js';
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

const API_URL = 'https://api.anthropic.com/v1/messages';
const SONNET = 'claude-sonnet-4-20250514';

async function callClaude(system, messages) {
  const response = await fetchWithRetry(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: SONNET,
      max_tokens: 1500,
      system,
      messages
    })
  });
  return response.json();
}

export async function POST(request) {
  try {
    const { messages, persona = 'friend' } = await request.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: 'Messages array required' }, { status: 400 });
    }

    const claudeMessages = messages.map(m => ({
      role: m.role,
      content: m.content
    }));

    // === PASS 1: Vanilla response — Sonnet's natural tendencies ===
    const pass1 = await callClaude(CHAT_SYSTEM, claudeMessages);

    if (pass1.error) {
      return Response.json({ error: pass1.error.message }, { status: 500 });
    }

    const vanillaReply = pass1.content?.[0]?.text || '';

    // === SINGLE DRAW: Field reads the AI's response ===
    const result = drawForAI();
    const draw = result?.draw;

    if (!draw) {
      // Draw failed — return vanilla
      return Response.json({ reply: vanillaReply, usage: pass1.usage });
    }

    // === PASS 2: Sonnet embodies the reading — not correction, revelation ===
    const reading = buildSingleReadingV9(draw);
    const pass2System = [
      CHAT_SYSTEM,
      '',
      'YOUR INITIAL DRAFT (for your eyes only — do not reference this directly):',
      '"""',
      vanillaReply,
      '"""',
      '',
      reading
    ].join('\n');

    const pass2 = await callClaude(pass2System, claudeMessages);

    if (pass2.error) {
      return Response.json({
        reply: vanillaReply,
        draw,
        usage: pass1.usage
      });
    }

    const revisedReply = pass2.content?.[0]?.text || '';

    return Response.json({
      reply: revisedReply,
      draw,
      usage: {
        input_tokens: (pass1.usage?.input_tokens || 0) + (pass2.usage?.input_tokens || 0),
        output_tokens: (pass1.usage?.output_tokens || 0) + (pass2.usage?.output_tokens || 0)
      }
    });

  } catch (e) {
    console.error('Chat API error:', e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
