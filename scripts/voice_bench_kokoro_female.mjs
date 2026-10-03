// THE FEMALE VOICES ON THE WARM COPY (2026-10-03, founder: "What about the other female voices, are they slow too?").
// Same sentence in every English female voice jaaari/kokoro-82m offers (the copy that stays warm — George's). Prints the wall
// time of each call so the answer to "slow?" is measured, and drops the mp3s on the shelf for him to hear.
//   npx tsx scripts/voice_bench_kokoro_female.mjs [out-dir]
import fs from 'node:fs';
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]));
const T = env.REPLICATE_API_TOKEN; const VERSION = 'f559560eb822dc509045f3921a1921234918b91739db4bf3daab2169b71c7a13'; const PER_SECOND = 0.000225;
const out = process.argv[2] || 'G:/My Drive/For Air Review/VOICE_BENCH_KOKORO_2026-10-03'; fs.mkdirSync(out, { recursive: true });
const VOICES = ['af_bella', 'af_nicole', 'af_sarah', 'af_sky', 'af_nova', 'af_river', 'af_jessica', 'af_kore', 'af_aoede', 'af_alloy', 'bf_emma', 'bf_isabella', 'bf_alice', 'bf_lily'];
const TEXT = 'What you imagined got made, and it is behind you now. Integrated, completed, done. But you are still treating it as pending. The next thing has not started because part of you is still waiting to be told it is allowed to leave. Satisfaction is on the table and not being picked up.';
const rows = []; let total = 0;
for (const voice of VOICES) {
  const t0 = Date.now();
  const r = await fetch('https://api.replicate.com/v1/predictions', { method: 'POST', headers: { Authorization: `Bearer ${T}`, 'Content-Type': 'application/json', Prefer: 'wait=60' }, body: JSON.stringify({ version: VERSION, input: { text: TEXT, voice, speed: 1 } }) });
  let p = await r.json();
  while (!['succeeded', 'failed', 'canceled'].includes(p.status)) { await new Promise((d) => setTimeout(d, 800)); p = await (await fetch(p.urls.get, { headers: { Authorization: `Bearer ${T}` } })).json(); }
  const wall = (Date.now() - t0) / 1000; const secs = p.metrics?.predict_time || 0; total += secs;
  if (p.status !== 'succeeded') { rows.push(`${voice}: ${p.status} ${p.error || ''}`); console.log(rows.at(-1)); continue; }
  const url = Array.isArray(p.output) ? p.output[0] : p.output; const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  const file = `${out}/kokoro_warm_${voice}.${/\.wav(\?|$)/.test(url) ? 'wav' : 'mp3'}`; fs.writeFileSync(file, buf);
  rows.push(`${voice}: ${wall.toFixed(1)} s wall · ${secs.toFixed(1)} s compute · ${(buf.length / 1024).toFixed(0)} KB`); console.log(rows.at(-1));
}
fs.writeFileSync(`${out}/01_FEMALE_VOICES_WARM_COPY.txt`, `The same passage in every English female voice on the warm Kokoro copy (jaaari/kokoro-82m), 2026-10-03.\naf_ = American, bf_ = British. Wall time is what the Reader would wait for a piece this size.\n\n${rows.join('\n')}\n\nTotal compute ${total.toFixed(1)} s ≈ $${(total * PER_SECOND).toFixed(4)}\n`);
console.log(`\ntotal compute ${total.toFixed(1)} s ≈ $${(total * PER_SECOND).toFixed(4)} · files in ${out}`);
