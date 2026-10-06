// .709 PROOF: re-summarise the three known contamination cases with the provenance-keeping summarizer (read-only — prints, does not save),
// then render a journey thread from the results. Pass condition (Air): "three things pulling on you", "people they love", "carefully tending" land
// under READER_OFFERED, never ASKER_SAID.
import fs from 'node:fs';
const ENV = fs.readFileSync('.env.local', 'utf8'); for (const line of ENV.split(/\r?\n/)) { const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
const { createClient } = await import('@supabase/supabase-js');
const { summarizeReading, parseSummary } = await import('../lib/readingSummary.js');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const CASES = [['Why do I have such a headache right now?', /three|pull|someone|plan/i], ['Thank you. Just a general reading, please.', /people (they|you) love|someone (they|you) love|loved one/i], ["What's the next real step on Nirmanakaya?", /tend/i]];
let pass = 0;
for (const [topic, probe] of CASES) {
  const { data } = await db.from('user_readings').select('topic, draws, mode, interpretation').eq('topic', topic).order('created_at', { ascending: false }).limit(1);
  const r = await summarizeReading(data[0]); const p = parseSummary(r.summary);
  const inAsker = [...p.askerSaid, ...p.askerConfirmed].filter((x) => probe.test(x)); const inReader = p.readerOffered.filter((x) => probe.test(x));
  const ok = inAsker.length === 0 && inReader.length > 0; if (ok) pass++;
  console.log(`\n=== ${topic}\n${r.summary}\nhashtags: ${r.hashtags.join(', ')}\n→ the contaminating detail under READER_OFFERED: ${inReader.length ? 'yes' : 'NO'} · under ASKER_SAID/CONFIRMED: ${inAsker.length ? 'YES — FAIL: ' + inAsker.join(' | ') : 'no'} · ${ok ? 'PASS' : 'FAIL'}`);
}
console.log(`\n${pass} of ${CASES.length} pass`);
