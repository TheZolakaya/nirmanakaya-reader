// .718 THE ONE-SENTENCE OPERATION REPAIR (Air's operation-copy line, 2026-10-06; benched behind OP_REPAIR=1, off by default).
// A persona reply whose ONLY remaining fault after the one re-ask is a copied operation line used to fall back to Plain — 5 of 6 Mystic
// fallbacks on 20 random draws. Here only the sentences holding the copied words are rewritten, in one small call: the same act, fresh
// words, the same voice, nothing added. The caller re-checks the whole reply and keeps the repair only if it comes back clean.
import PLAIN from './data/plain_propositions.json';
import { callProvider } from './provider.js';
import { MODEL_IDS } from './modelConfig.js';

const norm = (s) => ' ' + String(s || '').toLowerCase().replace(/[^a-z'\s]/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
const sentencesOf = (t) => String(t || '').match(/[^.!?\n]+[.!?]+["')\]]*|[^.!?\n]+$/g) || [];
const OP_BY_NAME = Object.fromEntries(Object.values(PLAIN.medicine || {}).map((m) => [m.name, m.operation]));
const FIELDS = ['gist', 'reader', 'medicine', 'question'];

const SYS = `You repair single sentences from a reading so they stop repeating a reference line word for word.
For each numbered sentence: change ONLY the words listed under COPIED WORDS TO CHANGE (they repeat the REFERENCE LINE), and keep every other word of the sentence exactly as it is. Every listed stretch must come out reworded; a sentence may span two sentences of the reading, and you keep its punctuation.
PLAINNESS: the new words must be at least as plain as the ones they replace — shorter and more common, the way the sentence's own speaker would say it out loud to a friend. Never more formal, never more technical, never fancier. When two wordings fit, take the plainer.
THE SAME ACT, THE SAME SIZE: keep exactly what is asked, how much, and when. A "not" stays the same "not": not explaining yourself is not the same as hiding it, not telling anyone, or keeping it secret; "the same day" is not "right away"; "one" stays one. Do not make any instruction stronger, weaker, wider or narrower. Do not reuse any run of four or more words from the REFERENCE LINE, apart from small words like "the", "and", "to". Add nothing: no new detail, time, place, object, person or reason.
Reply with ONLY a JSON object mapping each number to its repaired sentence.`;

// obj: the reply ({ gist, reader, medicine, question, ... }); faults: the guard's remaining faults (all must be 'operation')
export async function repairOperation(obj, faults) {
  if (!obj || !Array.isArray(faults) || !faults.length || faults.some((f) => f.code !== 'operation')) return null;
  const targets = []; // { field, sentence, line }
  for (const f of faults) {
    const m = String(f.detail || '').match(/^"(.+?)…" is the record's own operation line for (.+?), quoted/); if (!m) continue;
    const line = OP_BY_NAME[m[2]]; if (!line) continue;
    const w = norm(line).trim().split(' '); const grams = []; for (let i = 0; i + 5 <= w.length; i++) grams.push(w.slice(i, i + 5).join(' ')); // every five-word run of the line (the guard names only the first hit)
    for (const field of FIELDS) {
      const text = String(obj[field] || ''); const ss = [...text.matchAll(/[^.!?\n]+[.!?]+["')\]]*|[^.!?\n]+$/g)].map((m) => ({ t: m[0], a: m.index, b: m.index + m[0].length }));
      const runsIn = (u) => { const n = norm(u); return new Set(grams.filter((g) => n.includes(' ' + g + ' '))); };
      // units: single sentences, merged with their neighbour when a run straddles the break (the guard reads the text with punctuation stripped)
      const units = ss.map((x) => ({ a: x.a, b: x.b }));
      for (let i = 0; i + 1 < units.length; i++) {
        const A = text.slice(units[i].a, units[i].b), B = text.slice(units[i + 1].a, units[i + 1].b);
        const one = runsIn(A), two = runsIn(B); const crossing = [...runsIn(A + ' ' + B)].some((g) => !one.has(g) && !two.has(g));
        if (crossing) { units[i] = { a: units[i].a, b: units[i + 1].b }; units.splice(i + 1, 1); i--; }
      }
      for (const u of units) {
        const t = text.slice(u.a, u.b); if (!runsIn(t).size) continue;
        // the copied stretches, merged: every word covered by a five-word run of the line — so the repair knows exactly which words to change
        const tw = norm(t).trim().split(' '); const cover = new Array(tw.length).fill(false);
        for (let i = 0; i + 5 <= tw.length; i++) if (grams.includes(tw.slice(i, i + 5).join(' '))) for (let k = i; k < i + 5; k++) cover[k] = true;
        const copied = []; let cur = []; tw.forEach((x, i) => { if (cover[i]) cur.push(x); else if (cur.length) { copied.push(cur.join(' ')); cur = []; } }); if (cur.length) copied.push(cur.join(' '));
        targets.push({ field, sentence: t, line, copied });
      }
    }
  }
  if (!targets.length) return { located: false };
  const lines = [...new Set(targets.map((t) => t.line))];
  const user = `REFERENCE LINE${lines.length > 1 ? 'S' : ''}:\n${lines.join('\n')}\n\nSENTENCES:\n${targets.map((t, i) => `${i + 1}. ${t.sentence.trim()}\n   COPIED WORDS TO CHANGE: ${t.copied.map((c) => `"${c}"`).join(', ')}`).join('\n')}`;
  const { data } = await callProvider({ model: MODEL_IDS.sonnet, max_tokens: 600, system: SYS, messages: [{ role: 'user', content: user }] }, { tag: 'opRepair' });
  const raw = data?.content?.map((c) => c.text || '').join('') || '';
  let map; try { map = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)); } catch { return null; }
  const out = { ...obj };
  targets.forEach((t, i) => { const rep = String(map[String(i + 1)] || '').trim(); if (rep) { const lead = t.sentence.match(/^\s*/)[0]; out[t.field] = String(out[t.field]).replace(t.sentence, lead + rep); } });
  return { obj: out, repaired: targets.map((t, i) => ({ field: t.field, from: t.sentence.trim(), to: String(map[String(i + 1)] || '').trim() })), usage: data?.usage || null };
}
