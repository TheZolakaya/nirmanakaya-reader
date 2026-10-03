// KOKORO VOICE BENCH (2026-10-03): every English Kokoro voice on Replicate reading the same library cell Sulafat read, saved to the
// founder's Drive, with the REAL cost measured from Replicate's own predict_time (T4 at $0.000225/s, read live from the model page).
//   npx tsx scripts/voice_bench_kokoro.mjs [voice ...]
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')]; }));
const T = env.REPLICATE_API_TOKEN; const VERSION = fs.readFileSync('data/voice/kokoro_version.txt', 'utf8').trim();
const PER_SECOND = 0.000225;
const OUT = 'G:/My Drive/For Air Review/VOICE_BENCH_KOKORO_2026-10-03'; fs.mkdirSync(OUT, { recursive: true });
const TEXT = fs.readFileSync('data/voice/second_text.txt', 'utf8');
const ENGLISH = ['af_alloy', 'af_aoede', 'af_bella', 'af_jessica', 'af_kore', 'af_nicole', 'af_nova', 'af_river', 'af_sarah', 'af_sky', 'am_adam', 'am_echo', 'am_eric', 'am_fenrir', 'am_liam', 'am_michael', 'am_onyx', 'am_puck', 'bf_alice', 'bf_emma', 'bf_isabella', 'bf_lily', 'bm_daniel', 'bm_fable', 'bm_george', 'bm_lewis'];
const voices = process.argv.slice(2).length ? process.argv.slice(2) : ENGLISH;
const sents = TEXT.match(/[^.!?]+[.!?]+["')\]]*\s*/g) || [TEXT]; const chunks = []; let cur = '';
for (const s of sents) { if ((cur + s).length > 420 && cur) { chunks.push(cur.trim()); cur = ''; } cur += s; } if (cur.trim()) chunks.push(cur.trim());
async function predict(text, voice) {
  let r = await fetch('https://api.replicate.com/v1/predictions', { method: 'POST', headers: { Authorization: `Bearer ${T}`, 'Content-Type': 'application/json', Prefer: 'wait=60' }, body: JSON.stringify({ version: VERSION, input: { text, voice, speed: 1 } }) });
  let p = await r.json();
  while (p.status && !['succeeded', 'failed', 'canceled'].includes(p.status)) { await new Promise((res) => setTimeout(res, 1500)); p = await (await fetch(p.urls.get, { headers: { Authorization: `Bearer ${T}` } })).json(); }
  if (p.status !== 'succeeded') throw new Error(`${p.status}: ${String(p.error || p.detail || '').slice(0, 120)}`);
  const url = Array.isArray(p.output) ? p.output[0] : p.output; const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  return { buf, secs: p.metrics?.predict_time || 0, ext: (url.split('.').pop() || 'wav').split('?')[0] };
}
let totalSecs = 0; const lines = [];
for (const v of voices) {
  try {
    const tmp = `data/voice/k_${v}`; fs.mkdirSync(tmp, { recursive: true }); const parts = []; let secs = 0;
    for (let i = 0; i < chunks.length; i++) { const o = await predict(chunks[i], v); fs.writeFileSync(`${tmp}/c${i}.${o.ext}`, o.buf); parts.push(`c${i}.${o.ext}`); secs += o.secs; }
    fs.writeFileSync(`${tmp}/list.txt`, parts.map((p) => `file '${p}'`).join('\n'));
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', `${tmp}/list.txt`, '-ac', '1', '-b:a', '128k', `${OUT}/kokoro_${v}.mp3`]);
    fs.rmSync(tmp, { recursive: true }); totalSecs += secs; lines.push(`ok kokoro_${v}.mp3 · ${secs.toFixed(2)} s compute · $${(secs * PER_SECOND).toFixed(5)}`);
  } catch (e) { lines.push(`FAIL ${v}: ${e.message}`); }
  console.log(lines[lines.length - 1]);
}
const perTurn = totalSecs / Math.max(1, voices.length);
console.log(`\nTOTAL compute ${totalSecs.toFixed(1)} s · $${(totalSecs * PER_SECOND).toFixed(4)} · per ${TEXT.length}-char turn ≈ ${perTurn.toFixed(2)} s ≈ $${(perTurn * PER_SECOND).toFixed(5)} · per million characters ≈ $${(perTurn * PER_SECOND / TEXT.length * 1e6).toFixed(2)}`);
fs.writeFileSync(`${OUT}/00_WHAT_IS_THIS.txt`, `KOKORO voice bench, 2026-10-03, on Replicate. Same text Sulafat read in the Google bench (Compassion, Balanced).\naf = American woman · am = American man · bf = British woman · bm = British man.\n\n${TEXT}\n\n${lines.join('\n')}\n`);
