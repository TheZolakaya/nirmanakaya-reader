// LAB ONLY — THE SCAFFOLD FLOOR (Air's task, 2026-10-05: "can the floor tell the Reader what must survive without telling it what sentence to say?").
// Production is untouched: every change rides the bench hooks of handingReading (over.base, over.drawText, over.voiceRules) and POUR_FLOOR=0 in THIS
// process only. The poured cell is replaced by the four scaffold fields from scripts/scaffold_floor_lab.json; the Handing carries Air's one sentence
// high (after its first paragraph).
//   npx tsx scripts/bench_scaffold_floor_lab.mjs plain            → the ten openings in Plain
//   npx tsx scripts/bench_scaffold_floor_lab.mjs voices B-3,B-10  → those readings through five voices
import fs from 'node:fs';
process.env.POUR_FLOOR = '0'; // THIS process only: the poured cell is off; the scaffold stands in its place
const ENV = fs.readFileSync('.env.local', 'utf8'); for (const line of ENV.split(/\r?\n/)) { const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
const { createClient } = await import('@supabase/supabase-js');
const { handingReading } = await import('../lib/externalReading.js');
const { HANDING_SET } = await import('../lib/handingPrompt.js');
const { VOICES } = await import('../lib/ezPrompts.js');
const SC = JSON.parse(fs.readFileSync('scripts/scaffold_floor_lab.json', 'utf8'));
const MODE = process.argv[2] || 'plain'; const PICK = (process.argv[3] || 'B-3,B-10').split(',');
const AIR_LINE = 'THE FLOOR\'S FIELDS. Beneath each draw you may be handed four fields — CONDITION, DOMAIN, OPERATION, INVARIANT. These fields are meaning constraints to instantiate in the asker\'s situation. They are not sentences to quote or paraphrase closely. Preserve the relations; create the wording.';
// Air's second scroll (2026-10-05): EPISTEMIC ENTITLEMENT BEFORE PERSONA — behind the --entitle switch, placed right after the floor sentence
const ENTITLE = process.argv.includes('--entitle');
const ENTITLE_LINE = `WHAT YOU KNOW AND WHAT YOU ARE GUESSING. Three kinds of claim, and the person must be able to tell them apart. What the asker told you, state as fact. What the draw supports — the floor's fields, the record — state plainly as the reading's claim, without hedging it. When you apply that structure to details of their life they did not give you — something they did, finished, carry, feel, avoid, or someone involved — that is your inference: mark it as a guess, a possibility or a question ("if I were to guess", "one possibility is", "this can show up as", "my read is", "does this fit?"). Never present an inferred piece of their biography as known fact. Do not add uncertainty to what they told you or to what the draw supports: confidence where earned, humility where inferred. A voice may change how sure it sounds; it never changes which kind of claim a sentence is.`;
const paras = HANDING_SET.BASE_SYSTEM.split(/\n\n/); const BASE = [paras[0], AIR_LINE, ...(ENTITLE ? [ENTITLE_LINE] : []), ...paras.slice(1)].join('\n\n');
const scaffoldBlock = (id) => { const s = SC[id]; if (!s) return ''; return `\n\nTHE FLOOR — meaning constraints for this draw (instantiate in the asker's situation; do not quote; preserve the relations, create the wording):\nCONDITION: ${s.CONDITION}\nDOMAIN: ${s.DOMAIN}\nOPERATION: ${s.OPERATION}\nINVARIANT: ${s.INVARIANT}`; };
// THE FIVE VOICES (lab): each is told only HOW to tell the settled meaning; every one keeps the house's floor — no map words, no invented specifics, the relations preserved
const COMMON = `\n\nIN EVERY VOICE: none of the map's words (no signature, seat, medicine, status names, houses, elements); no person, object, time, habit or history the asker did not give you; the floor's relations survive exactly — what is off, where, the move, and what must stay true. Literal first: the claim is stated plainly once before any image, and an image never carries the claim alone. Same JSON as always.`;
const LAB_VOICES = {
  Plain: VOICES.plain.rules,
  Friend: `THE VOICE — FRIEND. You are a close friend across a kitchen table who happens to understand this. Warm, direct, a little informal; contractions; you can say "honestly" or "look". Short paragraphs. You care how they are, and it shows in one sentence, not in a speech. No lecture, no therapy words, no pep talk.${COMMON}`,
  Coach: `THE VOICE — COACH. You are a good coach: brisk, encouraging, practical, on their side. You name what is going on in one or two plain sentences, then you get to the move: what to do, when it counts as done, how they will know it worked. Second person, active verbs, no hedging, no hype.${COMMON}`,
  Storyteller: `THE VOICE — STORYTELLER. You tell it as a short, quiet story about how this kind of thing goes — "there is a way this tends to happen" — and then turn it to them. Unhurried, concrete, one image at most and only after the plain claim; never a fable with animals or kings; never invented details about their life.${COMMON}`,
  Mystic: `THE VOICE — MYSTIC. You speak with reverence and some lift, as if what is happening matters beyond this week — but every sentence still says something they could act on or check. One image at most, after the plain claim. No cosmic vocabulary, no "universe", "energy", "vibration", no prophecy.${COMMON}`,
};
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: rows } = await db.from('external_readings').select('request_id, question, context, mode, draws, cards').like('request_id', 'readability-2026-10-05-B-%').order('created_at', { ascending: true });
const render = async (r, voiceRules) => { const res = await handingReading({ question: r.question, context: r.context || '', cardCount: r.draws.length, mode: r.mode, fast: true, voice: 'plain', requestId: null }, r.draws, { base: BASE, drawText: (t) => t + scaffoldBlock(r.request_id), ...(voiceRules ? { voiceRules } : {}) }); return res.interpretation; };
const show = (x) => x.error ? `error: ${x.error}` : `*${x.gist || ''}*\n\n${x.text || ''}\n\n> ◈ ${x.medicine || ''}\n\n*${x.question || ''}*`;
const words = (s) => String(s || '').toLowerCase().replace(/[^a-z'\s]/g, ' ').split(/\s+/).filter(Boolean);
const runsFrom = (src, glass) => { const g = ' ' + words(glass).join(' ') + ' '; const w = words(src); const seen = new Set(); let n = 0; for (let i = 0; i + 3 <= w.length; i++) { const t = w.slice(i, i + 3).join(' '); if (seen.has(t)) continue; seen.add(t); if (g.includes(' ' + t + ' ')) n++; } return n; };
if (MODE === 'plain') {
  const OLD = fs.existsSync('G:/My Drive/For Air Review/BENCH_Opus_Cells_OLD_Corpus_B_2026-10-05.md') ? fs.readFileSync('G:/My Drive/For Air Review/BENCH_Opus_Cells_OLD_Corpus_B_2026-10-05.md', 'utf8') : '';
  const oldLane = (key) => { const part = OLD.split(/^## (?=readability)/m).find((p) => p.startsWith(key)); return part?.split(/^### A\n/m)[1]?.split(/^### B/m)[0]?.trim() || ''; };
  const out = ['# LAB — the scaffold floor, the ten openings in Plain', '*True, 2026-10-05, Air\'s task. Lane A = production Plain voice + the Handing with Air\'s one sentence high + the poured cell REPLACED by the four scaffold fields (scripts/scaffold_floor_lab.json); lane B = the Opus instance\'s old-cells lane on the same .701 code (the poured cell under the turn). Same draws, same questions. Lab only; production untouched.*', '', '| run | words A | three-word runs from the scaffold on the glass | flags A | medicine judge |', '|---|---|---|---|---|'];
  const key = []; const detail = [];
  for (const r of rows) {
    let it; try { it = await render(r); } catch (e) { it = { error: e.message }; }
    const s = SC[r.request_id]; const glass = [it.gist, it.text, it.medicine, it.question].filter(Boolean).join(' ');
    const fromScaffold = runsFrom([s.CONDITION, s.DOMAIN, s.OPERATION, s.INVARIANT].join(' . '), glass);
    out.push(`| ${r.request_id} | ${glass.split(/\s+/).length} | ${fromScaffold} | ${(it.flags || []).join(',') || '—'} | ${it.medicineJudge?.first || '—'}${it.medicineJudge?.retry ? ' → ' + it.medicineJudge.retry : ''} |`);
    key.push(`${r.request_id}: A = scaffold, B = oldcells`);
    detail.push(`## ${r.request_id}\n**Q:** ${r.question}\n**Draw:** ${r.cards.map((c) => c.signature).join(' · ')}\n**Scaffold:** CONDITION: ${s.CONDITION} · DOMAIN: ${s.DOMAIN} · OPERATION: ${s.OPERATION} · INVARIANT: ${s.INVARIANT}\n\n### A\n${show(it)}\n\n### B\n${oldLane(r.request_id)}\n`);
    process.stdout.write(`${r.request_id}: ${glass.split(/\s+/).length} words, ${fromScaffold} scaffold runs${it.flags?.length ? ' flags ' + it.flags.join(',') : ''}\n`);
  }
  out.push('', ...detail, '', '## The key', ...key.map((k) => `- ${k}`));
  fs.writeFileSync('G:/My Drive/For Air Review/' + (ENTITLE ? 'LAB_Scaffold_Entitled_Plain_Ten_2026-10-05.md' : 'LAB_Scaffold_Floor_Plain_Ten_2026-10-05.md') + '', out.join('\n')); console.log('shelf: ' + (ENTITLE ? 'LAB_Scaffold_Entitled_Plain_Ten_2026-10-05.md' : 'LAB_Scaffold_Floor_Plain_Ten_2026-10-05.md') + '');
} else {
  const out = ['# LAB — the scaffold floor, one settled meaning through five voices', '*True, 2026-10-05, Air\'s task. The same draw, the same question, the same four scaffold fields under the turn, the same Handing (with Air\'s sentence); only the voice block changes. Plain is production\'s; Friend, Coach, Storyteller and Mystic are lab voices written for this test (their text is at the foot). For Chris and Air to read side by side. Lab only; production untouched.*', ''];
  for (const id of PICK) {
    const r = rows.find((x) => x.request_id === `readability-2026-10-05-${id}`); if (!r) continue; const s = SC[r.request_id];
    out.push(`## ${id} — ${r.cards.map((c) => c.signature).join(' · ')}`, `**Q:** ${r.question}`, `**The floor:** CONDITION: ${s.CONDITION} · DOMAIN: ${s.DOMAIN} · OPERATION: ${s.OPERATION} · INVARIANT: ${s.INVARIANT}`, '');
    for (const [name, rules] of Object.entries(LAB_VOICES)) { let it; try { it = await render(r, rules); } catch (e) { it = { error: e.message }; } out.push(`### ${name}`, show(it), `\n*flags: ${(it.flags || []).join(', ') || '—'} · medicine judge: ${it.medicineJudge?.first || '—'}*`, ''); process.stdout.write(`${id} ${name}: ${(it.text || '').split(/\s+/).length} words${it.flags?.length ? ' flags ' + it.flags.join(',') : ''}\n`); }
  }
  out.push('---', '## The four lab voices, verbatim', ...Object.entries(LAB_VOICES).filter(([n]) => n !== 'Plain').map(([n, t]) => `**${n}:** ${t}`));
  fs.writeFileSync('G:/My Drive/For Air Review/' + (ENTITLE ? 'LAB_Scaffold_Entitled_Five_Voices_2026-10-05.md' : 'LAB_Scaffold_Floor_Five_Voices_2026-10-05.md') + '', out.join('\n\n')); console.log('shelf: ' + (ENTITLE ? 'LAB_Scaffold_Entitled_Five_Voices_2026-10-05.md' : 'LAB_Scaffold_Floor_Five_Voices_2026-10-05.md') + '');
}
