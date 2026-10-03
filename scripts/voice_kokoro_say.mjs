// Speak a text in one Kokoro voice on Replicate, in sentence chunks (Kokoro takes ~500 characters per call), joined to one mp3;
// throttle-aware (new Replicate accounts get a few calls a minute); prints the REAL cost from predict_time.
//   npx tsx scripts/voice_kokoro_say.mjs <voice> <text-file> <out.mp3> [speed]
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')]; }));
const T = env.REPLICATE_API_TOKEN; const VERSION = fs.readFileSync('data/voice/kokoro_heart_version.txt', 'utf8').trim(); const PER_SECOND = 0.000225;
const [voice, textFile, out, speedArg] = process.argv.slice(2); const speed = Number(speedArg || 1);
const TEXT = fs.readFileSync(textFile, 'utf8');
const sents = TEXT.match(/[^.!?]+[.!?]+["')\]]*\s*/g) || [TEXT]; const chunks = []; let cur = '';
for (const s of sents) { if ((cur + s).length > 420 && cur) { chunks.push(cur.trim()); cur = ''; } cur += s; } if (cur.trim()) chunks.push(cur.trim());
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function predict(text) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const r = await fetch('https://api.replicate.com/v1/predictions', { method: 'POST', headers: { Authorization: `Bearer ${T}`, 'Content-Type': 'application/json', Prefer: 'wait=60' }, body: JSON.stringify({ version: VERSION, input: { text, voice, speed, language_code: voice.startsWith('b') ? 'b' : 'a' } }) });
    if (r.status === 429) { const wait = Number(r.headers.get('retry-after') || 12) * 1000; await sleep(wait); continue; }
    let p = await r.json(); if (!p.urls) throw new Error(`HTTP ${r.status} ${JSON.stringify(p).slice(0, 160)}`);
    while (!['succeeded', 'failed', 'canceled'].includes(p.status)) { await sleep(1500); p = await (await fetch(p.urls.get, { headers: { Authorization: `Bearer ${T}` } })).json(); }
    if (p.status !== 'succeeded') throw new Error(`${p.status}: ${String(p.error).slice(0, 120)}`);
    const url = Array.isArray(p.output) ? p.output[0] : p.output; return { buf: Buffer.from(await (await fetch(url)).arrayBuffer()), secs: p.metrics?.predict_time || 0 };
  }
  throw new Error('throttled 8 times');
}
const tmp = `data/voice/k_${Date.now()}`; fs.mkdirSync(tmp, { recursive: true }); const parts = []; let secs = 0;
for (let i = 0; i < chunks.length; i++) { const o = await predict(chunks[i]); fs.writeFileSync(`${tmp}/c${i}.wav`, o.buf); parts.push(`c${i}.wav`); secs += o.secs; }
fs.writeFileSync(`${tmp}/list.txt`, parts.map((p) => `file '${p}'`).join('\n'));
execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', `${tmp}/list.txt`, '-ac', '1', '-b:a', '128k', out]);
fs.rmSync(tmp, { recursive: true });
console.log(`ok ${out.split('/').pop()} · ${chunks.length} chunks · ${TEXT.length} chars · ${secs.toFixed(2)} s compute · $${(secs * PER_SECOND).toFixed(5)} · per million chars ≈ $${(secs * PER_SECOND / TEXT.length * 1e6).toFixed(2)}`);
