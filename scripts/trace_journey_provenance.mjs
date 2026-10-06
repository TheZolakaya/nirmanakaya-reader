// TRACE (Air, provenance contamination, 2026-10-05): for recent saved EZ readings, does the narrative summary carry claims that appear only in the
// READER's turns (not in anything the asker typed)? Read-only. Prints, per reading, the summary and each content phrase that traces to the Reader alone.
import fs from 'node:fs';
const ENV = fs.readFileSync('.env.local', 'utf8'); for (const line of ENV.split(/\r?\n/)) { const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
const { createClient } = await import('@supabase/supabase-js');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: rows, error } = await db.from('user_readings').select('id, created_at, topic, narrative_summary, hashtags, interpretation').not('narrative_summary', 'is', null).neq('narrative_summary', '__no_content__').order('created_at', { ascending: false }).limit(40);
if (error) throw error;
const STOP = new Set('about after again also always another because been before being both came come could does doing done each even every first from have here into just keep kind know like made make many more most much need never next only other over part really right same seem since some still such than that their them then there these they thing things this those through time turn very want well were what when where which while will with without work would your yours yourself the and for you are was but not can its all one out has had our who how why'.split(' '));
const words = (s) => String(s || '').toLowerCase().replace(/[^a-z'\s]/g, ' ').split(/\s+/).filter((w) => w.length >= 4 && !STOP.has(w));
let ez = 0, contaminated = 0; const shown = [];
for (const r of rows) {
  const turns = r.interpretation?.synthesis?._ez?.turns; if (!Array.isArray(turns) || !turns.length) continue; ez++;
  const asker = new Set(words([r.topic, ...turns.filter((t) => t.role === 'you').map((t) => t.text)].join(' ')));
  const reader = new Set(words(turns.filter((t) => t.role !== 'you').map((t) => [t.text, t.medicine, t.question].join(' ')).join(' ')));
  const sum = words(r.narrative_summary); const tags = (r.hashtags || []).map((h) => String(h).replace(/^#/, ''));
  const readerOnly = [...new Set(sum.filter((w) => reader.has(w) && !asker.has(w)))];
  const tagReaderOnly = tags.filter((t) => t.split('-').some((w) => reader.has(w) && !asker.has(w)) && !t.split('-').some((w) => asker.has(w)));
  if (readerOnly.length >= 3) contaminated++;
  if (shown.length < 8 && readerOnly.length >= 3) shown.push(`— ${r.created_at.slice(0, 10)} · asked: "${String(r.topic).slice(0, 80)}"\n  summary: ${r.narrative_summary}\n  words in the summary found ONLY in the Reader's turns: ${readerOnly.slice(0, 12).join(', ')}\n  hashtags carried by Reader-only words: ${tagReaderOnly.join(', ') || '—'}`);
}
console.log(`${ez} EZ readings with a summary among the latest 40; ${contaminated} carry 3+ content words found only in the Reader's turns\n`); console.log(shown.join('\n\n'));
