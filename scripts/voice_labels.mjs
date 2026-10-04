// THE SPOKEN LABELS (2026-10-03, founder: "when I choose Words to the Whys, it should say it out loud immediately… in whatever voice
// I've currently chosen"). One short clip per label per voice, generated once on the warm Kokoro copy and stored as static files, so a
// tap speaks its name with no round trip. Re-run after adding a voice or a label; existing clips are kept unless --force.
//   npx tsx scripts/voice_labels.mjs [--force]
import fs from 'node:fs';
import path from 'node:path';
import { VOICES, forTheEar } from '../lib/voice/kokoro.js';
import { getComponent } from '../lib/corrections.js';
import { ARCHETYPES } from '../lib/archetypes.js';

export const LABELS = {
  'words-to-the-whys': 'Words to the Whys.', 'the-meaning': 'The meaning.', 'the-moon': 'The moon.', 'the-mechanism': 'The mechanism.',
  'face-the-dragon': 'Face the dragon.', 'the-medicine': 'The medicine.', 'where-this-can-grow': 'Where this can grow.', 'one-small-step': 'One small step.',
  'summarize-and-wrap-up': 'Summarize, and wrap it up.', 'more-choices': 'More choices.',
  // one-word clips grow a trailing syllable on this model ("Forge." was heard back as "Vodgi"; .647) — two words come out clean
  'reflect': 'To reflect.', 'forge': 'Forge ahead.', 'clarify': 'Clarify that.', 'unpack': 'Unpack that.', 'example': 'An example.',
  'find-it': 'Find it.', 'where-am-i': 'Where am I?', 'catch-me-up': 'Catch me up.',
  // THE NARRATOR (.647, founder: "an opposite-sex voice, like a narrator, when 'the Reader is…' doing something")
  'the-reader-is-writing': 'The Reader is writing.',
  // .654 the opening's narration (founder: 'The Nirmanakaya Reader is reading your now'); 'Nir-mana-kaya' transcribed cleanly in both narrator voices — the hyphens steer the syllables
  'reading-your-now': 'The Nir-mana-kaya Reader is reading your now.', 'the-reader-is-naming-it': 'The Reader is naming it.',
  'the-reader-is-opening-the-medicine': 'The Reader is opening the medicine.', 'the-reader-is-finding-the-step': 'The Reader is finding the step.',
  'the-reader-is-finding-more-choices': 'The Reader is finding more choices.', 'the-reader-is-reading-your-history': 'The Reader is reading your history.',
  // .661 (Keel §4, §11): the floors' own lines, and the renamed parent
  'the-reader-is-opening-the-meaning': 'The Reader is opening the meaning.', 'the-reader-is-opening-the-moon': 'The Reader is opening the moon.', 'the-reader-is-opening-the-mechanism': 'The Reader is opening the mechanism.',
  'go-deeper': 'Go deeper.', 'recommend': 'A recommendation.',
};
// .661 (Keel §1): THE DRAW'S BEATS — the signature, the status, the seat — spoken by the narrator on the frame each is revealed. Narrator voices only.
export const NAMES = (() => { const o = {}; for (let i = 0; i < 78; i++) { const n = getComponent(i)?.name; if (n) o[`name-${i}`] = `You drew ${n}.`; } o['status-1'] = 'In balance.'; o['status-2'] = 'Too much.'; o['status-3'] = 'Too little.'; o['status-4'] = 'Unacknowledged.'; for (let i = 0; i < 22; i++) o[`seat-${i}`] = `In ${ARCHETYPES[i].name}.`; o['seat-own'] = 'In its own seat.'; return o; })();
const NARRATORS = new Set(['af_bella', 'bm_george']);
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]));
const T = env.REPLICATE_API_TOKEN; const force = process.argv.includes('--force');
const out = 'public/voice/labels'; let made = 0, kept = 0, secs = 0;
for (const [voice, v] of Object.entries(VOICES)) {
  if (voice === 'af_heart') continue; // the sleeping copy; not offered
  fs.mkdirSync(path.join(out, voice), { recursive: true });
  for (const [slug, text] of Object.entries(NARRATORS.has(voice) ? { ...LABELS, ...NAMES } : LABELS)) {
    const file = path.join(out, voice, `${slug}.wav`);
    if (!force && fs.existsSync(file)) { kept++; continue; }
    const r = await fetch('https://api.replicate.com/v1/predictions', { method: 'POST', headers: { Authorization: `Bearer ${T}`, 'Content-Type': 'application/json', Prefer: 'wait=60' }, body: JSON.stringify({ version: v.version(), input: v.input(forTheEar(text)) }) });
    let p = await r.json();
    while (!['succeeded', 'failed', 'canceled'].includes(p.status)) { await new Promise((d) => setTimeout(d, 600)); p = await (await fetch(p.urls.get, { headers: { Authorization: `Bearer ${T}` } })).json(); }
    if (p.status !== 'succeeded') { console.error(`${voice}/${slug}: ${p.status} ${p.error || ''}`); continue; }
    const url = Array.isArray(p.output) ? p.output[0] : p.output; fs.writeFileSync(file, Buffer.from(await (await fetch(url)).arrayBuffer()));
    secs += p.metrics?.predict_time || 0; made++; process.stdout.write(`${voice}/${slug} `);
  }
}
console.log(`\nmade ${made}, kept ${kept} · compute ${secs.toFixed(1)} s ≈ $${(secs * 0.000225).toFixed(4)} → ${out}`);
