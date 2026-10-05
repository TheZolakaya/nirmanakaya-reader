// .696: hear "lives" — the control sentence, the respelled one and the noun, in both narrator voices, saved to the shelf for the founder's ear.
// A homograph transcribes the same either way, so the ear is the judge here, not whisper. Six short clips, cents.
import fs from 'node:fs';
const ENV = fs.readFileSync('.env.local', 'utf8'); for (const line of ENV.split(/\r?\n/)) { const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
const { speakPiece } = await import('../lib/voice/kokoro.js');
const dir = 'G:/My Drive/For Air Review/voice_lives_probe'; fs.mkdirSync(dir, { recursive: true });
const CASES = [['control', 'It is showing up where your sense of direction lives.'], ['livz', 'It is showing up where your sense of direction livz.'], ['noun', 'This is about their lives, not yours.']];
for (const voice of ['af_bella', 'bm_george']) for (const [tag, text] of CASES) { const { url, secs } = await speakPiece(text, voice); const f = `${dir}/${voice}_${tag}.wav`; fs.writeFileSync(f, Buffer.from(await (await fetch(url)).arrayBuffer())); console.log(voice, tag, `${(secs || 0).toFixed(1)}s`, f); }
fs.writeFileSync(`${dir}/README.md`, `# "lives" — for the ear (2026-10-05, .696)\n\nSix clips, two narrators. *control* = the sentence as the Reader wrote it ("…where your sense of direction lives."); *livz* = the respelling now applied before speech to the VERB; *noun* = "their lives", which the respell leaves alone. If *livz* says it like "gives" and *noun* still says it like "knives", the fix holds.\n`);
console.log('shelf:', dir);
