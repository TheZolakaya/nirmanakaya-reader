// app/api/verdict/route.js
// The Integrate-mode discernment pass. Receives question + draws, returns a structured
// verdict. HARM-class questions never reach the field: the typer hard-gates BEFORE any
// draw analysis and returns the care floor + a Reflect reroute instruction.
// Kill switch: VERDICT_ENABLED. Fail-quiet: on any failure the client simply shows no box.

import { fetchWithRetry } from '../../../lib/fetchWithRetry.js';
import {
  typeQuestion, computeFieldLean, buildDiscernmentPrompt, parseVerdictResponse,
  CARE_FLOOR, VERDICTS
} from '../../../lib/verdictEngine.js';
import { buildCardDossier, drawsToCards } from '../../../lib/geometryEngine.js';

const VERDICT_ENABLED = true; // kill switch — set false to disable the Answer Box everywhere

export const dynamic = 'force-dynamic';

export async function POST(request) {
  if (!VERDICT_ENABLED) return Response.json({ disabled: true });

  const { question, draws, model } = await request.json();

  if (!question || !Array.isArray(draws) || !draws.length) {
    return Response.json({ error: 'question and draws required' }, { status: 400 });
  }

  // 1. TYPER — hard floor first, before the field is consulted at all
  const typerResult = typeQuestion(question);
  if (typerResult.hardGate) {
    return Response.json({
      verdict: null,
      typerClass: 'HARM',
      reroute: 'reflect',
      careFloor: CARE_FLOOR
    });
  }

  try {
    // 2. PURE COMPUTE — disclosed lean + per-card dossiers
    const cards = drawsToCards(draws);
    const lean = computeFieldLean(draws);
    const dossiers = cards.map((_, i) => buildCardDossier({ question, cards, index: i }));

    // 3. DISCERNMENT PASS
    const prompt = buildDiscernmentPrompt({ question, typerResult, lean, dossiers });
    const response = await fetchWithRetry('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model || 'claude-sonnet-4-6',
        // scale with spread size — a 2-card walk truncated at 1500 and broke the JSON
        max_tokens: Math.min(1500 + draws.length * 900, 4500),
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    if (data.error) return Response.json({ error: data.error.message }, { status: 500 });

    const text = data.content?.map((item) => item.text || '').join('\n') || '';
    const verdict = parseVerdictResponse(text);
    if (!verdict) {
      const why = data.stop_reason === 'max_tokens' ? 'discernment truncated at token cap' : 'unparseable discernment response';
      return Response.json({ error: why }, { status: 500 });
    }

    return Response.json({
      verdict,
      verdictMeta: VERDICTS[verdict.verdict] || null,
      lean,
      typer: typerResult,
      usage: data.usage || null
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
