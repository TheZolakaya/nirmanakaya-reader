// app/api/verdict/route.js
// The Integrate-mode discernment pass. Receives question + draws, returns a structured
// verdict. HARM-class questions never reach the field: the typer hard-gates BEFORE any
// draw analysis and returns the care floor + a Reflect reroute instruction.
// Kill switch: VERDICT_ENABLED. Fail-quiet: on any failure the client simply shows no box.

import { fetchWithRetry } from '../../../lib/fetchWithRetry.js';
import {
  typeQuestion, computeFieldLean, computeBranchScores,
  buildDiscernmentPrompt, buildChoicePrompt, parseVerdictResponse,
  CARE_FLOOR, VERDICTS
} from '../../../lib/verdictEngine.js';
import { buildCardDossier, drawsToCards } from '../../../lib/geometryEngine.js';

const VERDICT_ENABLED = true; // kill switch — set false to disable the Answer Box everywhere

export const dynamic = 'force-dynamic';

export async function POST(request) {
  if (!VERDICT_ENABLED) return Response.json({ disabled: true });

  const { question, draws, options, model } = await request.json();

  // Choice mode: user-supplied options, one card per option. Question may be empty
  // (the menu itself is the question); otherwise same laws as the single pass.
  const isChoice = Array.isArray(options) && options.filter(o => o && o.trim()).length >= 2;

  if ((!question && !isChoice) || !Array.isArray(draws) || !draws.length) {
    return Response.json({ error: 'question and draws required' }, { status: 400 });
  }
  if (isChoice && draws.length !== options.length) {
    return Response.json({ error: 'choice mode requires one draw per option' }, { status: 400 });
  }

  // 1. TYPER — hard floor first, before the field is consulted at all.
  // In choice mode every option is typed too: harm content in an option gates
  // exactly as it would in the question.
  const typerResult = typeQuestion(question || (isChoice ? options.join(' or ') : ''));
  const gated = typerResult.hardGate ||
    (isChoice && options.some(o => typeQuestion(o).hardGate));
  if (gated) {
    return Response.json({
      verdict: null,
      typerClass: 'HARM',
      reroute: 'reflect',
      careFloor: CARE_FLOOR
    });
  }

  try {
    // 2. PURE COMPUTE — disclosed lean/ranking + per-card dossiers
    const cards = drawsToCards(draws);
    const lean = computeFieldLean(draws);
    const branchScores = isChoice ? computeBranchScores(draws, options) : null;
    const dossiers = cards.map((_, i) => buildCardDossier({ question: question || options?.[i] || '', cards, index: i }));

    // 3. DISCERNMENT PASS — comparative in choice mode, single-assertion otherwise
    const prompt = isChoice
      ? buildChoicePrompt({ question, options, typerResult, branchScores, dossiers })
      : buildDiscernmentPrompt({ question, typerResult, lean, dossiers });
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
      branchScores,
      typer: typerResult,
      usage: data.usage || null
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
