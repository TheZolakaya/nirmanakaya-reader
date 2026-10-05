// BENCH — PLAIN WITHOUT THE MAP'S WORDS (the founder's reversal, 2026-10-05): the Plain voice never says "signature", "seat" or "medicine",
// even glossed; the cards on the screen carry the vocabulary. Renders the readability baseline's 19 draws (the exhibit + the L bench's 18:
// run four's four mechanism questions ×3 and the two personal controls ×3) with the variant voice rules through handingReading's bench hook
// (over.voiceRules; production passes nothing), and writes them in the bench A/B format so scripts/bench_readability.mjs can ask the six
// questions of them: `npx tsx scripts/bench_readability.mjs --file BENCH_Plain_No_Words_2026-10-05.md --lane no-words --no-exhibit --out BENCH_True_Readability_Plain_No_Words_2026-10-05.md`
//   npx tsx scripts/bench_plain_no_words.mjs
import fs from 'node:fs';
const ENV = fs.readFileSync('.env.local', 'utf8'); for (const line of ENV.split(/\r?\n/)) { const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
const { createClient } = await import('@supabase/supabase-js');
const { handingReading } = await import('../lib/externalReading.js');
const { VOICES } = await import('../lib/ezPrompts.js');
const { getComponent } = await import('../lib/corrections.js');
const idOf = (n) => { for (let i = 0; i < 78; i++) if (getComponent(i)?.name === n) return i; };

// THE VARIANT: the Plain rules as live, with the three-words clause replaced and the pointing phrases changed. Nothing else moves.
const live = VOICES.plain.rules;
const A1 = live.indexOf('- THREE OF THE MAP\'S WORDS MAY BE SAID'); const A2 = live.indexOf('- No tarot words');
if (A1 < 0 || A2 < 0) throw new Error('the three-words clause has moved');
const NEW_CLAUSE = `- NONE OF THE MAP'S WORDS ARE SAID — not "signature", not "seat", not "medicine", not even with a gloss beside them (founder, 2026-10-05, reversing 2026-10-03: the cards on the screen carry the vocabulary for whoever taps them; the glass says the thing, never the word). Say what came up, where it is showing up, and the way through, in the person's own kind of words: "what came up for you is about letting go"; "it's showing up in how you find your way"; "the way through is to give one small thing a clear ending". The thing drawn is never a "card" either. Every word of the system stays off the glass.\n`;
let variant = live.slice(0, A1) + NEW_CLAUSE + live.slice(A2);
const P1 = '- When you must point at a signature, say "the signature you drew", "the signature underneath", "the signature that shows the way through".';
if (!variant.includes(P1)) throw new Error('the pointing clause has moved');
variant = variant.replace(P1, '- When you must point at what was drawn, say "what came up for you", "what came up first", "the one underneath", "the one that shows the way through". Never "the signature", never "the seat", never "the medicine".');
variant = variant.replace('Never say "this signature means".', 'Never say "this signature means" — never say "signature" at all.');
variant = variant.replace("The signature's name is already on the screen; your job is what it means for this person", "The card's name is already on the screen for anyone who taps it; your job is what it means for this person");
fs.writeFileSync('G:/My Drive/For Air Review/PROMPT_Plain_No_Words_Variant_2026-10-05.md', `# THE PLAIN VOICE, VARIANT — no map words at all (bench only; not live)\n*True, 2026-10-05. The live Plain rules with the three-words clause replaced and the pointing phrases changed; nothing else moved.*\n\n\`\`\`\n${variant}\n\`\`\`\n`);

// the 19 cases
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const KEYS = [1, 2, 3, 4].map((i) => `recursive-reader-v099672-20261004c-cycle-${i}`);
const { data: rows } = await db.from('external_readings').select('request_id, question, context, mode, draws, cards').in('request_id', KEYS);
const byKey = Object.fromEntries(rows.map((r) => [r.request_id, r]));
const sigOf = (d) => `${['', 'Balanced', 'Too Much', 'Too Little', 'Unacknowledged'][d.status]} ${getComponent(d.transient)?.name} in ${getComponent(d.position)?.name}`;
const defs = [];
defs.push({ key: 'exhibit · quiet my mind', question: "I'm trying to quiet my mind.", context: '', mode: 'discover', draws: [{ transient: idOf('Executor of Intent'), position: idOf('Recognition'), status: 3 }], reps: 1 });
for (const k of KEYS) { const r = byKey[k]; if (!r) throw new Error(`missing ${k}`); defs.push({ key: k.replace('recursive-reader-v099672-', 'run4-'), question: r.question, context: r.context || '', mode: r.mode, draws: r.draws, reps: 3 }); }
const ua = [{ transient: idOf('Faith'), position: idOf('Imagination'), status: 4 }];
defs.push({ key: 'control-exhibit-now', question: '', context: '', mode: 'discover', draws: ua, reps: 3 });
defs.push({ key: 'control-denver', question: 'Should I take the job in Denver?', context: '', mode: 'discover', draws: ua, reps: 3 });
const cases = []; for (const d of defs) for (let i = 1; i <= d.reps; i++) cases.push({ ...d, key: d.reps > 1 ? `${d.key} #${i}` : d.key });

const out = [`# BENCH — Plain without the map's words: the 19 readability draws rendered with the variant`, `*True, 2026-10-05. The founder's reversal of the 2026-10-03 ruling, benched before it goes live. Lane A = the variant ("no-words"); the baseline live renderings are in BENCH_Candidate_L (live lane) and the exhibit upload. Readability: scripts/bench_readability.mjs on this file's A lane vs the baseline's 6/13/0.*`, '', '| run | words | map words on glass (signature/seat/medicine/card) | flags |', '|---|---|---|---|'];
const key = []; const detail = []; let leaks = 0;
for (const c of cases) {
  let it; try { const r = await handingReading({ question: c.question, context: c.context, cardCount: c.draws.length, mode: c.mode, fast: true, voice: 'plain', requestId: null }, c.draws, { voiceRules: variant }); it = r.interpretation; } catch (e) { it = { error: e.message }; }
  const text = [it.gist, it.text, it.medicine, it.question].filter(Boolean).join('\n\n');
  const leak = (text.match(/\b(?:signature|seat|medicine|cards?)\b/gi) || []); if (leak.length) leaks++;
  out.push(`| ${c.key} | ${text.split(/\s+/).length} | ${leak.length ? leak.join(', ') : '—'} | ${(it.flags || []).join(',') || '—'} |`);
  key.push(`${c.key}: A = no-words, B = none`);
  detail.push(`## ${c.key}\n**Q:** ${c.question || '(no question — a draw for right now)'}\n**Draw:** ${c.draws.map(sigOf).join(' · ')}\n\n### A\n${it.error ? `error: ${it.error}` : `*${it.gist || ''}*\n\n${it.text || ''}\n\n> ◈ ${it.medicine || ''}\n\n*${it.question || ''}*`}\n`);
  process.stdout.write(`${c.key}: ${text.split(/\s+/).length} words${leak.length ? ' LEAK ' + leak.join(',') : ''}\n`);
}
out.push('', `**Readings with a map word on the glass: ${leaks} of ${cases.length}.**`, '', ...detail, '', '## The key', ...key.map((k) => `- ${k}`));
const path = 'G:/My Drive/For Air Review/BENCH_Plain_No_Words_2026-10-05.md'; fs.writeFileSync(path, out.join('\n')); console.log('shelf:', path);
