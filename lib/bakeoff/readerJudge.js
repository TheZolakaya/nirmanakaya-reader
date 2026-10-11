// THE READER JUDGE (Pass Two of the restructure, 2026-10-11). A blind judge for the fixed-draw bench: a model from a different family than
// the Reader's lane (Claude Haiku 5.5 by default; Sonnet 5.5 as the second opinion), given the question, the person's own words so far, the
// draw's STRUCTURAL facts (never the record's second-person lines — those are what the bench is testing), and one reply — never which prompt
// set wrote it. It scores the dimensions the commission named and quotes the sentences it faults, so a verdict can be checked by a person.
//   0 = fails · 1 = partly · 2 = holds.
// The instruments we had (the lint, the medicine-act judge) caught none of the five traced overreaches of 2026-10-11; this judge is proved
// on those seven readings before it scores anything new (scripts/judge_prove_poolside.mjs).
// Price: fetched from the OpenRouter model list before a run (fetchJudgePrice); every call's cost is the host's own figure (usage.cost).
import { buildKernel } from '../kernel.js';
import PLAIN from '../data/plain_propositions.json';
import DEFS from '../data/nirmanakaya_78_definitions.json';

export const JUDGE_MODELS = { haiku: 'anthropic/claude-haiku-5.5', sonnet: 'anthropic/claude-sonnet-5.5' };
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/messages';

export const DIMENSIONS = ['instrument', 'commitment', 'innerstate', 'proportion', 'medicine', 'revision', 'readable', 'deniable'];

const DIRECTION = {
  1: 'Balanced — present participation; nothing broken.',
  2: 'Too Much — more of this than the moment needs, reaching ahead of where things are (a direction, not a feeling).',
  3: 'Too Little — less of this than the moment asks, still with how things were (a direction, not a feeling).',
  4: 'Unacknowledged — something already operating whose source, ownership or relationship is not being recognized (who or what is unrecognized is open until the person says).',
};

/** The draw's structural facts, in the judge's own neutral words — never the record's "You are…" lines. */
export function drawFacts(draw) {
  const k = buildKernel(draw, DEFS);
  if (!k) return '';
  const op = PLAIN?.medicine?.[String(k.partnerId)]?.operation || k.partnerDescription || '';
  return [
    `Signature: ${k.signature} — ${k.signatureDescription}`,
    `Seat (where it is acting): ${k.seat} — ${k.seatDescription}`,
    `Status: ${DIRECTION[k.status] || k.statusName}`,
    `Medicine: ${k.partner || '(growth)'} by ${String(k.mechanism || '').toUpperCase()} — the act it licenses: ${op}`,
  ].join('\n');
}

export const RUBRIC = `You are judging ONE reply from a reading service against a written rubric. The service draws a signature from a derived map and reads it for a person. You are given the person's question, every word the person has said so far, the draw's structural facts, and the reply. You are NOT told which version of the service wrote the reply. Judge only what is on the page.

Score each dimension 0, 1 or 2 (0 = fails, 1 = partly, 2 = holds):

instrument — The reply states the draw's facts (what the signature is, where it is acting, the status as a DIRECTION, the named medicine) correctly and as facts, in whatever words, without bending them to a story or naming a different medicine.
commitment — The reply offers at least one SPECIFIC hypothesis about how this pattern shows up in this person's situation, with its reason visible. 0 = only restates the instrument and asks, or stays generic; 1 = a hypothesis so hedged it says nothing; 2 = specific, traceable to the draw and the person's words, said so the person could disagree.
innerstate — The reply asserts NOTHING about the person's inner state, motive, feelings, history, or the specific form the pattern takes that the person did not say. A status only gives a direction: it does not establish fear, anxiety, shame, regret, denial, disowning, depression, a motive, a habit, a scene, a duration, or who else is involved. A guess said as a guess is allowed and is NOT faulted, however specific it is: a sentence introduced by "my guess is", "my hunch is", "I'm guessing", "I could be wrong", "maybe", "it may be", "it might be", "if that lands", or asked as a question, is a guess. What the reply says WILL come back when the capacity is in balance ("what comes back is…", "when this settles you…") is the medicine's own face from the record, not a claim about the person now; do not fault it here. The draw's own structural meaning is NOT an inner-state claim: saying that something is operating and is not being recognized, that more or less of a capacity is in play than the moment needs, or that the credit is not landing where the doing is, states the instrument, and so does saying which side of the situation the pattern is acting on (the seat: the practical side, how they feel about it, how they are thinking about it, what it means to them); saying what the person feels, wants, fears, hides, avoids, or did in the past, or naming the specific scene the pattern takes, is the inner-state claim. 2 = nothing asserted; 1 = one borderline sentence; 0 = one or more such facts asserted. QUOTE every faulted sentence exactly.
proportion — The weight, stakes and urgency the reply gives the situation match what the person's own words give it: no crisis invented for an ordinary question, nothing trivialized that the person said was heavy. 2 = matched; 0 = inflated or minimized.
medicine — The reply's medicine is the NAMED medicine's own act (the act licensed, given above), done inside the person's situation in their nouns, sized small, as an offer. 2 = that act in their terms; 1 = the act named but bare, generic, or a state to feel rather than an act; 0 = a different act, a different medicine, or an order.
revision — ONLY when the person has pushed back or added a fact in a later turn (otherwise write null): the reply changes its reading of the person's life to fit what they said, keeps the draw and the medicine as they were, does not defend the earlier guess, and does not bend the draw to fit anything. 2 = clean revision; 1 = partial or grudging; 0 = defends, repeats, or rewrites the draw.
readable — Someone who has never seen this map understands the reply on first read: plain words, no system vocabulary needed, no image standing where a plain statement should be.
deniable — The person could say "no, that's not what's happening" and still have something to use: the structure survives a denied guess. 0 = the whole reply collapses if one guess about the person is wrong.

Answer with ONE JSON object and nothing else:
{"instrument": n, "commitment": n, "innerstate": n, "proportion": n, "medicine": n, "revision": n|null, "readable": n, "deniable": n, "innerstate_quotes": ["<exact sentence>", ...], "commitment_quote": "<the hypothesis sentence, or empty>", "note": "<one line, the main reason for the lowest score>"}`;

export function judgeMessage({ question = '', context = '', askerTurns = [], facts = '', reply = {}, turnIndex = 1 }) {
  const said = [question ? `The question: "${question}"` : 'No question was asked (a reading for where the person is right now).', context ? `Context the person gave: "${context}"` : null, ...askerTurns.map((t, i) => `Later, the person said (turn ${i + 2}): "${t}"`)].filter(Boolean).join('\n');
  const r = reply || {};
  return [
    `THE PERSON'S OWN WORDS SO FAR\n${said}`,
    `THE DRAW'S STRUCTURAL FACTS\n${facts}`,
    `THE REPLY (${turnIndex === 1 ? 'the opening' : `turn ${turnIndex}, after the person's latest words`})\ngist: ${String(r.gist || '').trim()}\n\nbody:\n${String(r.reader || r.text || '').trim()}\n\nmedicine box: ${String(r.medicine || '').trim()}\n\nquestion asked back: ${String(r.question || '').trim()}`,
    'Score the reply. One JSON object only.',
  ].join('\n\n');
}

export function parseJudge(text) {
  const t = String(text || ''); const s = t.indexOf('{'), e = t.lastIndexOf('}');
  if (s < 0 || e <= s) return null;
  try { const o = JSON.parse(t.slice(s, e + 1)); for (const d of DIMENSIONS) { if (d === 'revision') { if (o[d] !== null && o[d] !== undefined) o[d] = Number(o[d]); } else o[d] = Number(o[d]); } return o; } catch { return null; }
}

/** The judge model's live price per 1M tokens from the OpenRouter list — fetched, never assumed. */
export async function fetchJudgePrice(modelId = JUDGE_MODELS.haiku) {
  const r = await fetch('https://openrouter.ai/api/v1/models', { headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` } });
  const j = await r.json(); const m = (j.data || []).find((x) => x.id === modelId);
  if (!m) throw new Error(`judge model not on the OpenRouter list: ${modelId}`);
  return { model: modelId, input: Number(m.pricing.prompt) * 1e6, output: Number(m.pricing.completion) * 1e6 };
}

/** One judge call, straight to OpenRouter's Anthropic-format endpoint, pinned to Anthropic as the host (the Reader's host pins do not serve Claude). */
export async function judgeReply({ question, context, askerTurns, draw, reply, turnIndex = 1, model = JUDGE_MODELS.haiku, maxTokens = 700 }) {
  const facts = drawFacts(draw);
  // thinking DISABLED: left adaptive, Haiku 5.5 spent the whole max_tokens thinking and wrote nothing (the .451 lesson again, 2026-10-11)
  // Sonnet 5.5's endpoint refuses thinking disabled ("Reasoning is mandatory for this endpoint", 2026-10-11): adaptive at low effort, with room for it
  const sonnet = /sonnet-5\.5|opus-5-5/.test(String(model));
  const body = { model, max_tokens: sonnet ? Math.max(maxTokens, 2500) : maxTokens, ...(sonnet ? { thinking: { type: 'adaptive' }, output_config: { effort: 'low' } } : { thinking: { type: 'disabled' } }), system: RUBRIC, messages: [{ role: 'user', content: judgeMessage({ question, context, askerTurns, facts, reply, turnIndex }) }], provider: { order: ['Anthropic'], allow_fallbacks: false, data_collection: 'deny' } };
  const t0 = Date.now();
  const res = await fetch(OPENROUTER_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'x-api-key': process.env.OPENROUTER_API_KEY, 'anthropic-version': '2023-06-01', 'HTTP-Referer': 'https://www.nirmanakaya.com', 'X-Title': 'Nirmanakaya bench judge' }, body: JSON.stringify(body) });
  const data = await res.json();
  if (data?.error) throw new Error(`judge: ${data.error.message || JSON.stringify(data.error).slice(0, 200)}`);
  const raw = (data.content || []).map((b) => b.text || '').join('\n');
  const scores = parseJudge(raw);
  return { scores, raw: raw.trim(), usage: data.usage || null, cost: typeof data.usage?.cost === 'number' ? data.usage.cost : null, model: data.model || model, ms: Date.now() - t0, stop: data.stop_reason || null, blocks: (data.content || []).map((b) => b.type), ...(raw.trim() ? {} : { response: JSON.stringify(data).slice(0, 1200) }) };
}

/** A one-line summary of a score object. */
export const scoreLine = (o) => (o ? DIMENSIONS.map((d) => `${d.slice(0, 4)} ${o[d] === null || o[d] === undefined ? '-' : o[d]}`).join(' · ') : 'no scores');
