// THE READER'S VOICE (2026-10-03) — Kokoro on Replicate. Founder's choice by ear: Heart (af_heart), George (bm_george).
// Measured on the bench: ~880 characters = 13–20 s of T4 compute = $0.003–0.005 (≈ $3.4–5.1 per million characters).
// Kokoro takes ~500 characters per call, so callers send a turn in pieces; this speaks ONE piece.
// The model: alphanumericuser/kokoro-82m (jaaari/kokoro-82m lacks af_heart). Version pinned so a model update can't change the voice.
// Server-only: needs REPLICATE_API_TOKEN.

export const VOICE_USD_PER_SECOND = 0.000225;   // Replicate T4, $/second of compute (their pricing page, 2026-10-03) — the page's cost line is priced from this
export const KOKORO_VERSION = process.env.KOKORO_VERSION || '89b6fa84e4fa2dd6bd3a96be3e1f12827a3516c9fda8fddbac7a0be131c9a6f5';   // pinned 2026-10-03 (read from the Replicate API, not typed)
// Two copies of Kokoro on Replicate (measured 2026-10-03): the POPULAR copy (jaaari, 100M+ runs) stays warm — ~1 s a piece — but has
// no Heart; the copy WITH Heart (alphanumericuser) sleeps when idle — 114 s on a cold call, ~5 s warm. Founder: "let's just try both
// and see how slow it is in reality" (no keep-awake pinging). So each voice names its own copy.
const POPULAR = 'f559560eb822dc509045f3921a1921234918b91739db4bf3daab2169b71c7a13';   // jaaari/kokoro-82m (read from the Replicate API)
export const VOICES = {
  af_heart: { label: 'Heart', version: () => KOKORO_VERSION, input: (text) => ({ text, voice: 'af_heart', speed: 1, language_code: 'a' }) },
  bm_george: { label: 'George', version: () => POPULAR, input: (text) => ({ text, voice: 'bm_george', speed: 1 }) },
  af_river: { label: 'River', version: () => POPULAR, input: (text) => ({ text, voice: 'af_river', speed: 1 }) },   // 2026-10-03, the founder's pick from the 14 female voices on the warm copy
};
export const MAX_PIECE = 520;   // characters per call (Kokoro's window is ~510 tokens)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));


/** Speak one piece. Returns { url, secs } or throws. Retries Replicate's new-account throttle (429). */
export async function speakPiece(text, voice = 'bm_george', { deadlineMs = 45000 } = {}) {
  const started = Date.now();
  const token = process.env.REPLICATE_API_TOKEN; if (!token) throw new Error('voice is not configured (no REPLICATE_API_TOKEN)');
  const v = VOICES[voice] ? voice : 'bm_george'; const ver = VOICES[v].version(); if (!ver) throw new Error('no Kokoro version');
  const input = VOICES[v].input(String(text).slice(0, MAX_PIECE));
  for (let attempt = 0; attempt < 6; attempt++) {
    const r = await fetch('https://api.replicate.com/v1/predictions', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: `wait=${Math.max(1, Math.min(55, Math.floor((deadlineMs - (Date.now() - started)) / 1000)))}` }, body: JSON.stringify({ version: ver, input }) });
    if (r.status === 429) { await sleep(Math.min(15000, Number(r.headers.get('retry-after') || 3) * 1000)); continue; }
    let p = await r.json(); if (!p?.urls) throw new Error(`replicate ${r.status}: ${JSON.stringify(p).slice(0, 160)}`);
    while (!['succeeded', 'failed', 'canceled'].includes(p.status)) {
      if (Date.now() - started > deadlineMs) { const e = new Error(`${VOICES[v].label} is waking up (a cold start takes about two minutes) — try again shortly, or switch to George`); e.waking = true; throw e; }
      await sleep(800); p = await (await fetch(p.urls.get, { headers: { Authorization: `Bearer ${token}` } })).json();
    }
    if (p.status !== 'succeeded') throw new Error(`kokoro ${p.status}: ${String(p.error || '').slice(0, 120)}`);
    return { url: Array.isArray(p.output) ? p.output[0] : p.output, secs: p.metrics?.predict_time || 0 };
  }
  throw new Error('voice throttled — try again in a moment');
}

/** Clean a piece of reading text for the ear: no markdown, no house glyphs, dashes as pauses. */
export function forTheEar(s) {
  return String(s || '').replace(/[*_#`>]+/g, '').replace(/[◈◇◎↩⚡]/g, '').replace(/\s*[—–]\s*/g, ', ').replace(/\s+/g, ' ').trim();
}
