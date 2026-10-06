// .717 the representative Mystic fallback rate (Air's ship threshold, "fallback under roughly 15–20%"): the four-draw bench holds two
// draws chosen BECAUSE they failed, so it overstates. N random draws (seeded), everyday questions, one render each, the real Mystic path.
//   npx tsx scripts/bench_mystic_random_717.mjs <cardFile> <label> [n=20] [seed=7]
import fs from 'node:fs';
const ENV = fs.readFileSync('.env.local', 'utf8'); for (const line of ENV.split(/\r?\n/)) { const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
const [CARDFILE, LABEL, N = '20', SEED = '7'] = process.argv.slice(2);
const { handingReading } = await import('../lib/externalReading.js'); const { PERSONA_LAW } = await import('../lib/ezPrompts.js');
const NEW = `${PERSONA_LAW}\n\n${fs.readFileSync(CARDFILE, 'utf8').trim()}`;
let s = Number(SEED); const rnd = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
const QS = ['What do I need to see about my work right now?', 'Why does this relationship feel stuck?', 'What should I focus on this month?', 'Why am I so tired of everything lately?', 'What is getting in the way of me finishing things?', 'How do I handle this decision about moving?', 'What is this conflict with my sister really about?', 'Where is my energy going?', 'What am I not seeing about money right now?', 'What does this new chapter ask of me?'];
const rows = []; const tally = {};
for (let i = 0; i < Number(N); i++) {
  const d = { transient: Math.floor(rnd() * 78), position: Math.floor(rnd() * 22), status: 1 + Math.floor(rnd() * 4) }; const q = QS[i % QS.length];
  let it; try { it = (await handingReading({ question: q, context: '', cardCount: 1, mode: 'discover', fast: true, voice: 'mystic', requestId: null }, [d], { voiceRules: NEW })).interpretation; } catch (e) { it = { error: e.message }; }
  const faults = it.personaFallback?.faults || []; for (const f of faults) tally[f] = (tally[f] || 0) + 1;
  rows.push({ i, d, q, fb: !!it.personaFallback, faults, med: it.medicineJudge?.first || '—', gist: it.gist || '', text: String(it.text || it.error || ''), medicine: it.medicine || '' });
  fs.writeFileSync(`data/bakeoff/mystic_random_${LABEL}.json`, JSON.stringify(rows, null, 1));
  console.log(`${String(i + 1).padStart(2)} status ${d.status} t${d.transient}/p${d.position}: ${it.personaFallback ? 'FELL BACK (' + faults.join(',') + ')' : 'mystic'} · med ${it.medicineJudge?.first || '—'}`);
}
const fb = rows.filter((r) => r.fb).length; console.log(`\n${LABEL}: fell back ${fb}/${rows.length} (${Math.round(100 * fb / rows.length)}%) · faults ${JSON.stringify(tally)} · medicine PASS ${rows.filter((r) => r.med === 'PASS').length}/${rows.length}`);
