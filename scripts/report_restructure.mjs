// THE RESTRUCTURE BENCH, WRITTEN UP (Pass Two, 2026-10-11): data/bakeoff/restructure_<label>.json → a page for the founder: the arms side by side
// per voice, the judge's dimensions, the lint's scars, cost — and, for every poolside case, the verbatim gist and the sentences the judge faulted,
// arm by arm, so a verdict can be checked by a person. Nothing here is a model call.
//   npx tsx scripts/report_restructure.mjs <label> [out.md]
import fs from 'node:fs';
const [LABEL = 'smoke', OUT] = process.argv.slice(2);
const J = JSON.parse(fs.readFileSync(`data/bakeoff/restructure_${LABEL}.json`, 'utf8'));
const rows = J.rows.filter((r) => !r.error);
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const med = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
const f2 = (x) => (Number.isNaN(x) ? '—' : x.toFixed(2));
const DIMS = ['instrument', 'commitment', 'innerstate', 'proportion', 'medicine', 'readable', 'deniable'];
const L = [];
L.push(`# RESULT — the restructure bench, ${LABEL}`);
L.push(`*True, ${new Date().toISOString().slice(0, 10)}. Reader lane ${J.readerModel} at $${J.readerPrice.input}/$${J.readerPrice.output} per M (fetched live); judge ${J.judgePrice.model}${J.secondPrice ? ` with ${J.secondPrice.model} as the second opinion on the poolside cases` : ''}. Arms: ${J.arms.join(', ')}. Voices: ${J.voices.join(', ')}. Turns: ${J.turns}. Runs per cell: ${J.runs}. Groups: ${J.groups.join(', ')}. Cost $${J.cost.toFixed(3)}. Every reply is in data/bakeoff/restructure_${LABEL}.json.*`);
L.push('', '## How to read the scores', '', 'The judge scores each reply 0 (fails), 1 (partly) or 2 (holds) on: instrument (the draw stated correctly and as fact); commitment (one specific, traceable hypothesis in the person\'s domain); innerstate (nothing about feelings, motives, history or the specific form of the pattern asserted without a source in the person\'s words — a marked guess is fine); proportion (the stakes as the words give them); medicine (the named medicine\'s own act in their nouns); revision (later turns only: the reading of the person moves with their correction, the draw and medicine hold, no defending); readable (understood on first read by someone who never saw the map); deniable (the person could say "no" and still have something to use). Higher is better everywhere. The judge never knew which arm wrote a reply.', '');
L.push('## The arms, side by side', '', '| arm | voice | n | turn | instrument | commitment | innerstate | proportion | medicine | revision | readable | deniable | scale/backstory/premise/diagnosis/scope | median words | $ per turn |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const arm of J.arms) for (const voice of J.voices) for (const which of ['T1', 'T2+']) {
  const rs = rows.filter((r) => r.arm === arm && r.voice === voice && r.scores && (which === 'T1' ? r.turn === 1 : r.turn > 1)); if (!rs.length) continue;
  const m = (d) => f2(mean(rs.map((r) => r.scores[d]).filter((x) => typeof x === 'number' && !Number.isNaN(x))));
  const fc = (f) => rs.filter((r) => (r.flags || []).includes(f)).length;
  L.push(`| ${arm} | ${voice} | ${rs.length} | ${which} | ${m('instrument')} | ${m('commitment')} | ${m('innerstate')} | ${m('proportion')} | ${m('medicine')} | ${which === 'T1' ? '—' : m('revision')} | ${m('readable')} | ${m('deniable')} | ${fc('scale')}/${fc('backstory')}/${fc('premise')}/${fc('diagnosis')}/${fc('scope')} | ${med(rs.map((r) => r.words))} | ${f2(mean(rs.map((r) => r.cost || 0)))} |`);
}
// per group, T1 only, the headline deltas vs the first arm
const base = J.arms[0];
L.push('', `## Against ${base}, opening turns, by group`, '', '| group | voice | arm | n | innerstate | commitment | readable | medicine | proportion |', '|---|---|---|---|---|---|---|---|---|');
for (const g of [...new Set(rows.map((r) => r.group))]) for (const voice of J.voices) for (const arm of J.arms) {
  const rs = rows.filter((r) => r.group === g && r.voice === voice && r.arm === arm && r.turn === 1 && r.scores); if (!rs.length) continue;
  const b = rows.filter((r) => r.group === g && r.voice === voice && r.arm === base && r.turn === 1 && r.scores);
  const d = (k) => { const a = mean(rs.map((r) => r.scores[k])); const bb = mean(b.map((r) => r.scores[k])); return `${f2(a)}${arm !== base && b.length ? ` (${a - bb >= 0 ? '+' : ''}${(a - bb).toFixed(2)})` : ''}`; };
  L.push(`| ${g} | ${voice} | ${arm} | ${rs.length} | ${d('innerstate')} | ${d('commitment')} | ${d('readable')} | ${d('medicine')} | ${d('proportion')} |`);
}
// the second opinion, where it ran
const withSecond = rows.filter((r) => r.second);
if (withSecond.length) {
  L.push('', '## The second opinion (Sonnet 5.5) against the first (Haiku 5.5), where both scored', '', '| arm | voice | n | dimension | Haiku mean | Sonnet mean | agree exactly |', '|---|---|---|---|---|---|---|');
  for (const arm of J.arms) for (const voice of J.voices) { const rs = withSecond.filter((r) => r.arm === arm && r.voice === voice && r.scores); if (!rs.length) continue; for (const d of ['innerstate', 'commitment', 'readable']) L.push(`| ${arm} | ${voice} | ${rs.length} | ${d} | ${f2(mean(rs.map((r) => r.scores[d])))} | ${f2(mean(rs.map((r) => r.second[d])))} | ${rs.filter((r) => r.scores[d] === r.second[d]).length}/${rs.length} |`); }
}
// the poolside cases, verbatim: gist and faulted sentences per arm, T1; then T2 revision and the Reader's reply gist
const pool = rows.filter((r) => r.group === 'poolside');
if (pool.length) {
  L.push('', '## The seven poolside cases, read', '', 'For each case: the question; then per voice and arm, the opening\'s gist, the judge\'s innerstate score with the sentences it faulted, and on the second turn (after the scripted pushback) the revision score and the reply\'s gist. Run 1 only where there were several.');
  const cases = JSON.parse(fs.readFileSync('data/bakeoff/restructure_cases.json', 'utf8')).cases;
  for (const c of cases.filter((c) => c.group === 'poolside')) {
    L.push('', `### ${c.id} — ${c.draw.transient}/${c.draw.position}/${c.draw.status}`, '', `**Question.** ${c.question}`, '', `**Pushback (turn 2).** ${c.t2}`, '', `**The real issue (turn 3).** ${c.t3}`);
    for (const voice of J.voices) for (const arm of J.arms) {
      const t1 = pool.find((r) => r.case === c.id && r.voice === voice && r.arm === arm && r.turn === 1 && r.run === 1); if (!t1) continue;
      const t2 = pool.find((r) => r.case === c.id && r.voice === voice && r.arm === arm && r.turn === 2 && r.run === 1);
      const t3 = pool.find((r) => r.case === c.id && r.voice === voice && r.arm === arm && r.turn === 3 && r.run === 1);
      L.push('', `**${voice} · ${arm}** — opening ${t1.words} words · inner ${t1.scores?.innerstate ?? '—'} · commit ${t1.scores?.commitment ?? '—'} · readable ${t1.scores?.readable ?? '—'} · medicine ${t1.scores?.medicine ?? '—'}${t1.medicineJudge ? ` · act judge ${t1.medicineJudge}` : ''}${t1.personaFallback ? ' · PERSONA FELL BACK TO PLAIN' : ''}`);
      L.push(`- gist: ${String(t1.gist || '').trim()}`);
      if (t1.quotes?.length) L.push(`- faulted: ${t1.quotes.map((q) => `"${q}"`).join(' · ')}`);
      if (t1.note) L.push(`- judge: ${t1.note}`);
      if (t2) L.push(`- turn 2 → revision ${t2.scores?.revision ?? '—'}, inner ${t2.scores?.innerstate ?? '—'}: ${String(t2.gist || '').trim()}${t2.quotes?.length ? ` — faulted: ${t2.quotes.map((q) => `"${q}"`).join(' · ')}` : ''}`);
      if (t3) L.push(`- turn 3 → revision ${t3.scores?.revision ?? '—'}, commit ${t3.scores?.commitment ?? '—'}: ${String(t3.gist || '').trim()}`);
    }
  }
}
L.push('', `lanes: ${Object.entries(J.lanes || {}).map(([k, v]) => `${k} ×${v}`).join(' · ')} · errors ${J.rows.filter((r) => r.error).length} · persona fallbacks ${rows.filter((r) => r.personaFallback).length}`, '', '— True');
const out = OUT || `data/bakeoff/restructure_${LABEL}_report.md`;
fs.writeFileSync(out, L.join('\n'));
console.log(`wrote ${out} (${L.join('\n').split(/\s+/).length} words)`);
