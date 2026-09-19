// lib/bakeoff/run.js
// ONE SECTION, EVERY LANE — the fan-out plus the reader's own second chances, shared by the
// single run (/api/bakeoff) and the batch (/api/bakeoff/batch) so the two can never drift.
//   - the page's one strict retry when the envelope does not parse (.453)
//   - the bench's retry when an opening parsed but left out medicine / question / chips (.460)
//   - the page's floor rewrite when a render runs over 115% of its hard limit (fetchFloor, .469)
//   - flags: json-repaired · retried · rewritten · cut, on top of lint's own
// Lanes are shuffled and lettered here so every caller is blind the same way.

import { buildPrompt, parseJson, FLOOR_LIMIT } from './presets.js';
import { neededRepair } from '../readerJson.js';
import { callModel } from './providers.js';
import { lintOutput } from './lint.js';

export const shuffle = (a) => { const arr = [...a]; for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
export const LETTERS = 'ABCDEFGH';
const words = (t) => String(t || '').split(/\s+/).filter(Boolean).length;
const sumUsage = (a, b) => { const k = (n) => (a?.[n] || 0) + (b?.[n] || 0); return { input_tokens: k('input_tokens'), output_tokens: k('output_tokens'), cache_read_input_tokens: k('cache_read_input_tokens'), cache_creation_input_tokens: k('cache_creation_input_tokens') }; };
const merge = (r, again, note) => ({ ...again, usage: sumUsage(r.usage, again.usage), cost: (r.cost || 0) + (again.cost || 0), ms: (r.ms || 0) + (again.ms || 0), note: `${r.note ? r.note + '; ' : ''}${note}` });

const RETRY = '\n\nYOUR LAST REPLY WAS NOT VALID JSON AND COULD NOT BE READ. Send the same answer again as ONE JSON object and nothing else — no preamble, no code fence, no trailing text.';
const REQUIRED = ['medicine', 'question', 'chips'];

// lanes: [{ key, label, modelKey, over }]. ctx: { question, draw, opening }.
// Returns lettered rows in a random order: [{ letter, key, label, modelKey, model, provider, text, parsed, prose, lint, usage, cost, ms, error, note, stop, retried, rewritten, promptChars }]
export async function runSection(preset, lanes, ctx) {
  const built = lanes.map((L) => ({ L, p: buildPrompt(preset, { ...ctx, over: L.over || {} }) }));
  let results = await Promise.all(built.map(({ L, p }) => callModel({ modelKey: L.modelKey, system: p.system, message: p.message, maxTokens: p.maxTokens })));

  const envelope = preset.kind === 'floor' ? 'text' : 'reader';
  const missingOf = (parsed) => (preset.kind === 'opening' && parsed) ? REQUIRED.filter((k) => !parsed[k] || (Array.isArray(parsed[k]) && !parsed[k].length)) : [];

  results = await Promise.all(results.map(async (r, i) => {
    if (r.error || !r.text) return r;
    const { L, p } = built[i];
    let first = parseJson(r.text);
    const missing = missingOf(first);
    let out = r;
    if (!first?.[envelope] || missing.length) {
      const ask = (first && first[envelope] && missing.length)
        ? `\n\nYOUR LAST REPLY PARSED BUT LEFT OUT: ${missing.join(', ')}. Send the WHOLE JSON object again — reader, medicine, question, chips, reflect, forge, and every other field — as ONE JSON object and nothing else.`
        : (preset.kind === 'floor' ? '\n\nYOUR LAST REPLY WAS NOT VALID JSON. Send ONE JSON object and nothing else.' : RETRY);
      const again = await callModel({ modelKey: L.modelKey, system: p.system, message: p.message + ask, maxTokens: preset.kind === 'floor' ? 800 : p.maxTokens });
      if (again.error) return { ...r, retried: true, note: `${r.note ? r.note + '; ' : ''}retry failed: ${again.error}` };
      out = { ...merge(r, again, `retried once (first reply ${first?.[envelope] ? 'left out ' + missing.join(', ') : 'did not parse'})`), retried: true, firstText: r.text };
      first = parseJson(out.text);
    }
    // the page's floor rewrite: over 115% of the hard limit → one rewrite, keep the shorter
    if (preset.kind === 'floor' && first?.text) {
      const LIMIT = FLOOR_LIMIT[preset.floor];
      const n = words(first.text);
      if (LIMIT && n > LIMIT * 1.15) {
        const again = await callModel({ modelKey: L.modelKey, system: p.system, message: `${p.message}\n\nYOUR LAST RENDER WAS ${n} WORDS; THE HARD LIMIT IS ${LIMIT}. Rewrite it under the limit, same facts, same mechanism:\n${first.text}`, maxTokens: 800 });
        if (!again.error) {
          const re = parseJson(again.text);
          const kept = re?.text && words(re.text) <= n;
          out = { ...merge(out, again, `rewritten (${n} words over the ${LIMIT} limit${kept ? `, now ${words(re.text)}` : '; rewrite not shorter, first kept'})`), text: kept ? again.text : out.text, stop: kept ? again.stop : out.stop, rewritten: true };
        }
      }
    }
    return out;
  }));

  const rows = built.map(({ L, p }, i) => {
    const r = results[i];
    const parsed = r.text ? parseJson(r.text) : null;
    const lint = r.error ? { ok: false, flags: [{ code: 'error', detail: r.error }], words: 0, prose: '' } : lintOutput({ text: r.text, parsed, preset, hostile: !!preset.hostile });
    const flags = [...(lint.flags || [])];
    if (parsed && neededRepair(r.text)) flags.push({ code: 'json-repaired', detail: 'parsed only after repair (raw line breaks inside strings, fences or trailing commas)' });
    if (r.retried) flags.push({ code: 'retried', detail: r.note || 'the one retry was used' });
    if (r.rewritten) flags.push({ code: 'rewritten', detail: r.note || 'the floor rewrite was used' });
    if (r.stop === 'max_tokens') flags.push({ code: 'cut', detail: `stopped at the token cap (${p.maxTokens}); the envelope is incomplete` });
    return {
      key: L.key, label: L.label, modelKey: L.modelKey, model: r.model, provider: r.provider,
      text: r.text || '', parsed, prose: lint.prose, lint: { ok: flags.length === 0, flags, words: lint.words },
      usage: r.usage || null, cost: r.cost || 0, ms: r.ms, error: r.error || null, note: r.note || '', stop: r.stop || null, thinkingChars: r.thinkingChars || 0,
      retried: !!r.retried, rewritten: !!r.rewritten,
      promptChars: { system: p.system.length, message: p.message.length },
    };
  });
  return shuffle(rows).map((r, i) => ({ ...r, letter: LETTERS[i] }));
}
