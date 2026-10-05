// THE MEDICINE-ACT JUDGE (2026-10-05, Air's order from 0.99.680): the medicineCard NAME was right in 133 of 133 bench boxes; the fault,
// when there was one (8 of 133), was the box's VERB — the prose performed another drawn signature's medicine, or a neighbouring act,
// while naming the right partner internally. A word matcher cannot see faithful paraphrase ("sit with it on what you've got" IS
// Steadfastness), so the check is semantic: one small call to the cheap lane with ONLY the box text, the intended partner and its
// canonical acts (lib/pour/medicineActs.js), and the other drawn partners for disambiguation. One narrow question, one token back:
//   PASS · FAIL_OTHER_CARD · FAIL_WRONG_ACT · UNCERTAIN
// Measurement first, against the frozen 133 (scripts/eval_medicine_judge.mjs). Air's bar before it may re-ask: ≥7 of the 8 real drifts
// caught, ≤2 clear false positives on the 125 good boxes, UNCERTAIN never re-asks; otherwise flag-only. Promotion, if earned, is for
// FAIL_OTHER_CARD and FAIL_WRONG_ACT only.
import { callProvider } from '../provider.js';
import { MODEL_IDS } from '../modelConfig.js';
import { MEDICINE_ACTS } from '../pour/medicineActs.js';

export const VERDICTS = ['PASS', 'FAIL_OTHER_CARD', 'FAIL_WRONG_ACT', 'UNCERTAIN'];

const SYSTEM = `You judge one thing about one short text. The text is a "medicine" paragraph from a reading: a small action the reader hands the person. You are given the INTENDED medicine — a named capacity and the canonical acts that capacity does when it is well — and, when the reading drew more than one signature, the OTHER drawn medicines that the text might have slipped into instead.

Decide whether the text PRIMARILY enacts the intended medicine's action. Paraphrase counts: the text need not use the canonical words; it must do the same kind of act. A text that does the intended act and also mentions another is PASS. A text whose main action is one of the OTHER drawn medicines' acts is FAIL_OTHER_CARD. A text whose main action is some other act again — a neighbouring move that is not the intended one and not one of the others listed — is FAIL_WRONG_ACT. If you cannot tell, UNCERTAIN.

Answer with exactly one token from: PASS, FAIL_OTHER_CARD, FAIL_WRONG_ACT, UNCERTAIN. Nothing else.`;

const actsOf = (id) => (MEDICINE_ACTS[id] ? `${MEDICINE_ACTS[id].name}: ${MEDICINE_ACTS[id].acts.join(' · ')}` : null);

export function judgePrompt({ medicine, partnerId, otherPartnerIds = [] }) {
  const intended = actsOf(partnerId);
  const others = otherPartnerIds.filter((id) => id != null && id !== partnerId).map(actsOf).filter(Boolean);
  return [
    `INTENDED MEDICINE — ${intended}`,
    others.length ? `OTHER DRAWN MEDICINES (the text may have slipped into one of these) —\n${others.map((o) => `- ${o}`).join('\n')}` : 'OTHER DRAWN MEDICINES — none (a single signature was drawn)',
    `THE TEXT —\n${String(medicine || '').trim()}`,
    'Does the text primarily enact the INTENDED medicine\'s action? One token.',
  ].join('\n\n');
}

export function parseVerdict(text) {
  const t = String(text || '').toUpperCase();
  for (const v of ['FAIL_OTHER_CARD', 'FAIL_WRONG_ACT', 'UNCERTAIN', 'PASS']) if (t.includes(v)) return v; // the FAIL tokens first: "PASS" is a substring risk only in prose, which the judge was told not to write
  return 'UNCERTAIN';
}

async function oneVote({ medicine, partnerId, otherPartnerIds }) {
  const model = MODEL_IDS.sonnet; // the same lane the Reader runs on — routed to the cheap host by the lanes; the provider logs the served model and its live price
  const { data, provider, model: served } = await callProvider({ model, max_tokens: 12, system: SYSTEM, messages: [{ role: 'user', content: judgePrompt({ medicine, partnerId, otherPartnerIds }) }] }, { tag: 'judge' });
  if (data?.error) throw new Error(data.error.message || 'the judge did not answer');
  const raw = data.content?.map((i) => i.text || '').join('\n') || '';
  return { verdict: parseVerdict(raw), raw: raw.trim(), usage: data.usage || null, provider, model: served || model };
}

// TWO VOTES BY DEFAULT (eval on the frozen 133, 2026-10-05): one vote caught 7 of 9 drifts with 1 miss and 2 clear false positives on the good
// boxes; two votes — FAIL only when both fail (type by the first), PASS only when both pass, else UNCERTAIN — caught 7 of 9 with 0 misses,
// 2 uncertain, and 1 false positive on 118 good. UNCERTAIN never re-asks. ~0.03 of a cent per opening on the cheap lane.
export function combineVotes(verdicts) {
  const fails = verdicts.filter((v) => v.startsWith('FAIL'));
  if (fails.length === verdicts.length) { const c = {}; for (const f of fails) c[f] = (c[f] || 0) + 1; return Object.entries(c).sort((a, b) => b[1] - a[1])[0][0]; }
  if (verdicts.every((v) => v === 'PASS')) return 'PASS';
  return 'UNCERTAIN';
}

export async function judgeMedicineAct({ medicine, partnerId, otherPartnerIds = [], votes = 2 }) {
  if (partnerId == null || !MEDICINE_ACTS[partnerId] || !String(medicine || '').trim()) return { verdict: 'UNCERTAIN', raw: '', usage: null, provider: null, skipped: true, votes: [] };
  const vs = []; for (let i = 0; i < Math.max(1, votes); i++) vs.push(await oneVote({ medicine, partnerId, otherPartnerIds }));
  const usage = vs.reduce((a, v) => ({ input_tokens: (a.input_tokens || 0) + (v.usage?.input_tokens || 0), output_tokens: (a.output_tokens || 0) + (v.usage?.output_tokens || 0), cache_read_input_tokens: (a.cache_read_input_tokens || 0) + (v.usage?.cache_read_input_tokens || 0) }), {});
  return { verdict: vs.length > 1 ? combineVotes(vs.map((v) => v.verdict)) : vs[0].verdict, raw: vs.map((v) => v.raw).join(' / '), usage, provider: vs[0].provider, model: vs[0].model, votes: vs.map((v) => v.verdict) };
}
