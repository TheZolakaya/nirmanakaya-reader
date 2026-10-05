// LAB — THE PERSONA SHOWROOM (Air, 2026-10-05: "fifteen persona samples… Show Business starts now"). Three structurally different readings from the
// frozen Corpus B ten, each told by Plain, Friend, Coach, Storyteller and Mystic. Everything else identical: the production Handing base (with the
// .706 entitlement rule) + the scaffold-floor sentence; the scaffold floor in place of the poured cell (this process only); the persona law + card
// from lib/personaVoices.js. Beside each: the guards' flags, the medicine judge, and the observational entitlement count (never a re-ask).
//   npx tsx scripts/persona_showroom_lab.mjs [B-3,B-5,B-9]
import fs from 'node:fs';
process.env.POUR_FLOOR = '0';
const ENV = fs.readFileSync('.env.local', 'utf8'); for (const line of ENV.split(/\r?\n/)) { const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
const { createClient } = await import('@supabase/supabase-js');
const { handingReading } = await import('../lib/externalReading.js');
const { HANDING_SET } = await import('../lib/handingPrompt.js');
const { personaRules } = await import('../lib/personaVoices.js');
const { callProvider } = await import('../lib/provider.js'); const { MODEL_IDS } = await import('../lib/modelConfig.js');
const SC = JSON.parse(fs.readFileSync('scripts/scaffold_floor_lab.json', 'utf8'));
const PICK = (process.argv[2] || 'B-3,B-5,B-9').split(',');
const WHY = { 'B-3': 'the clean, concrete medicine case (Too Much; write the facts in order before the next)', 'B-5': 'the inference-sensitive case (the doing is theirs and not treated as theirs; a low, restless feeling)', 'B-9': 'the difficult, abstract case (Too Little; seeing the whole pattern, pulled back; a stalled project)' };
const AIR_LINE = 'THE FLOOR\'S FIELDS. Beneath each draw you may be handed four fields — CONDITION, DOMAIN, OPERATION, INVARIANT. These fields are meaning constraints to instantiate in the asker\'s situation. They are not sentences to quote or paraphrase closely. Preserve the relations; create the wording.';
const paras = HANDING_SET.BASE_SYSTEM.split(/\n\n/); const BASE = [paras[0], AIR_LINE, ...paras.slice(1)].join('\n\n');
const floor = (id) => { const s = SC[id]; return `\n\nTHE FLOOR — meaning constraints for this draw (instantiate in the asker's situation; do not quote; preserve the relations, create the wording):\nCONDITION: ${s.CONDITION}\nDOMAIN: ${s.DOMAIN}\nOPERATION: ${s.OPERATION}\nINVARIANT: ${s.INVARIANT}`; };
const JSYS = `Label EVERY numbered sentence with one label. STRUCTURAL = the reading's own claim, including the four fields applied to the asker in their own terms, adding no concrete detail the fields and the question lack. INFERRED_MARKED = adds a concrete detail of the asker's life (event, object, person, habit, history, time, specific feeling) that neither the question nor the fields contain, visibly marked as a guess, possibility, example or question. INFERRED_UNMARKED = adds such a detail stated as fact. OTHER = a question to the asker, a greeting, a transition, an instruction. Reply ONLY "<number> <LABEL>" lines.`;
const judge = async (q, s, text) => { const sents = String(text || '').replace(/\n+/g, ' ').match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g)?.map((x) => x.trim()).filter((x) => x.length > 3) || []; if (!sents.length) return null; const u = `THE ASKER SAID: "${q}"\nCONDITION: ${s.CONDITION}\nDOMAIN: ${s.DOMAIN}\nOPERATION: ${s.OPERATION}\nINVARIANT: ${s.INVARIANT}\n\n${sents.map((x, i) => `${i + 1}. ${x}`).join('\n')}`; try { const { data } = await callProvider({ model: MODEL_IDS.sonnet, max_tokens: 500, system: JSYS, messages: [{ role: 'user', content: u }] }, { tag: 'judge' }); const raw = data?.content?.map((c) => c.text || '').join('\n') || ''; const lab = {}; for (const l of raw.split('\n')) { const m = l.match(/^\s*(\d+)\D+(STRUCTURAL|INFERRED_MARKED|INFERRED_UNMARKED|OTHER)/); if (m) lab[Number(m[1])] = m[2]; } const un = sents.filter((_, i) => lab[i + 1] === 'INFERRED_UNMARKED'); const mk = sents.filter((_, i) => lab[i + 1] === 'INFERRED_MARKED').length; return { un, mk }; } catch { return null; } };
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: rows } = await db.from('external_readings').select('request_id, question, context, mode, draws, cards').like('request_id', 'readability-2026-10-05-B-%');
const VOICES5 = ['Plain', 'Friend', 'Coach', 'Storyteller', 'Mystic'];
const out = ['# THE PERSONA SHOWROOM — three readings, five voices (lab, v0.99.706)', '*True, for the founder and Air, 2026-10-05. Same draw, same question, same floor and same Handing under each reading; only the voice changes. Plain is the production voice; Friend, Coach, Storyteller and Mystic are the persona law + card in lib/personaVoices.js. Under each sample: the guards\' flags, the medicine judge, and an OBSERVATIONAL count of inference stated as fact (one cheap judge vote — a pointer, not a verdict). Read for: A. does each voice feel different and enjoyable? B. does the same reading survive underneath? C. does any voice invent a life for the asker?*', ''];
const tally = {};
for (const id of PICK) {
  const r = rows.find((x) => x.request_id === `readability-2026-10-05-${id}`); if (!r) continue; const s = SC[r.request_id];
  out.push('---', '', `## ${id} — ${WHY[id] || ''}`, `**They asked:** ${r.question}`, `**The floor under every voice:** ${s.CONDITION} · ${s.DOMAIN} · ${s.OPERATION} · ${s.INVARIANT}`, '');
  for (const v of VOICES5) {
    let it; try { const res = await handingReading({ question: r.question, context: r.context || '', cardCount: r.draws.length, mode: r.mode, fast: true, voice: 'plain', requestId: null }, r.draws, { base: BASE, drawText: (t) => t + floor(r.request_id), voiceRules: personaRules(v) }); it = res.interpretation; } catch (e) { it = { error: e.message }; }
    const glass = [it.gist, it.text, it.medicine, it.question].filter(Boolean).join('\n\n'); const j = await judge(r.question, s, glass);
    tally[v] = tally[v] || { un: 0, mk: 0 }; if (j) { tally[v].un += j.un.length; tally[v].mk += j.mk; }
    out.push(`### ${id} · ${v}`, it.error ? `error: ${it.error}` : `*${it.gist || ''}*\n\n${it.text || ''}\n\n> **The way through:** ${it.medicine || ''}\n\n*${it.question || ''}*`, '', `<sub>${(it.text || '').split(/\s+/).length} words · flags: ${(it.flags || []).join(', ') || '—'} · medicine judge: ${it.medicineJudge?.first || '—'}${it.medicineJudge?.retry ? ' → ' + it.medicineJudge.retry : ''} · inference stated as fact (observational): ${j ? j.un.length : '?'}${j && j.un.length ? ' — ' + j.un.map((x) => `"${x.slice(0, 90)}"`).join(' · ') : ''}</sub>`, '');
    process.stdout.write(`${id} ${v}: ${(it.text || '').split(/\s+/).length} words · flags ${(it.flags || []).join(',') || '—'} · judge ${it.medicineJudge?.first || '—'} · unmarked ${j ? j.un.length : '?'}\n`);
  }
}
out.push('---', '', '## Observational tally (three readings each; one judge vote — a pointer only)', '', '| voice | inference stated as fact | inference marked as a guess |', '|---|---|---|', ...VOICES5.map((v) => `| ${v} | ${tally[v]?.un ?? '?'} | ${tally[v]?.mk ?? '?'} |`));
fs.writeFileSync('G:/My Drive/For Air Review/SHOWROOM_Persona_Three_Readings_Five_Voices_2026-10-05.md', out.join('\n')); console.log('shelf: SHOWROOM_Persona_Three_Readings_Five_Voices_2026-10-05.md');
