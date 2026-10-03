// THE VOICE BENCH (2026-10-03): one poured cell spoken in every SiliconFlow preset voice, saved to the founder's Drive so he can
// choose by ear on his phone. Text-to-voice only; no personal data (a library cell, not a reading). Prices fetched? SiliconFlow has
// no public price API — the pricing page's $7.15 / M characters for CosyVoice2 is printed with the estimate, and the total is small.
//   npx tsx scripts/voice_bench.mjs
import fs from 'node:fs';
import path from 'node:path';
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')]; }));
const KEY = env.SILICONFLOW_API_KEY; if (!KEY) { console.error('no SILICONFLOW_API_KEY'); process.exit(2); }
const OUT = 'G:/My Drive/For Air Review/VOICE_BENCH_2026-10-03'; fs.mkdirSync(OUT, { recursive: true });

const snap = JSON.parse(fs.readFileSync('data/pour/snapshot/12.json', 'utf8')); const c = snap.seats[0][3];   // Faith in Potential, Too Little
const TEXT = `${c.core.replace(/\n+/g, ' ')} ${c.ask}`;
const WARM = 'Speak slowly and warmly, like a friend across a kitchen table, unhurried, with small pauses.';
const PRESETS = ['alex', 'benjamin', 'charles', 'david', 'anna', 'bella', 'claire', 'diana'];
const runs = [
  ...PRESETS.map((v) => ({ model: 'FunAudioLLM/CosyVoice2-0.5B', voice: v, file: `cosyvoice2_${v}.mp3`, input: TEXT })),
  ...['anna', 'alex', 'claire', 'benjamin'].map((v) => ({ model: 'FunAudioLLM/CosyVoice2-0.5B', voice: v, file: `cosyvoice2_${v}_WARM.mp3`, input: `${WARM}<|endofprompt|>${TEXT}` })),
  ...['anna', 'alex'].map((v) => ({ model: 'fishaudio/fish-speech-1.5', voice: v, file: `fishspeech_${v}.mp3`, input: TEXT })),
  ...['anna', 'alex'].map((v) => ({ model: 'IndexTeam/IndexTTS-2', voice: v, file: `indextts2_${v}.mp3`, input: TEXT })),
];
const chars = runs.reduce((n, r) => n + r.input.length, 0);
console.log(`${runs.length} clips · ${chars} characters · at $7.15/M ≈ $${(chars * 7.15 / 1e6).toFixed(3)} (CosyVoice2 list price; the others are priced similarly or lower)`);
const results = [];
for (const r of runs) {
  const voice = `${r.model}:${r.voice}`;
  try {
    const res = await fetch('https://api.siliconflow.com/v1/audio/speech', { method: 'POST', headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: r.model, input: r.input, voice, response_format: 'mp3', sample_rate: 44100, speed: 1.0 }) });
    if (!res.ok) { const t = await res.text(); results.push(`✗ ${r.file} — HTTP ${res.status} ${t.slice(0, 120)}`); continue; }
    const buf = Buffer.from(await res.arrayBuffer()); fs.writeFileSync(path.join(OUT, r.file), buf);
    results.push(`✓ ${r.file} — ${(buf.length / 1024).toFixed(0)} KB`);
  } catch (e) { results.push(`✗ ${r.file} — ${e.message.slice(0, 120)}`); }
}
console.log(results.join('\n'));
fs.writeFileSync(path.join(OUT, '00_WHAT_IS_THIS.txt'), [
  'VOICE BENCH — 2026-10-03 (True, for the founder to choose by ear)', '',
  'The same text in every voice: one poured library cell (Faith in Potential, Too Little), not anyone\'s reading.', '',
  TEXT, '',
  'cosyvoice2_<name>.mp3        — CosyVoice2, the eight preset voices, plain',
  'cosyvoice2_<name>_WARM.mp3   — CosyVoice2 told: "' + WARM + '"',
  'fishspeech_<name>.mp3        — Fish Speech 1.5', 'indextts2_<name>.mp3         — IndexTTS-2', '',
  'Pick the one you would want reading to a stranger at 1 a.m. The voice is the room.', '', results.join('\n'),
].join('\n'));
