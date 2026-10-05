// .705 (founder: "add them all in and then we'll take ones out"): the nine Kokoro English voices graded C or better on the warm copy, not yet offered.
// Grades from hexgrad/Kokoro-82M VOICES.md, fetched live 2026-10-05.
import fs from 'node:fs';
const NINE = [['af_nicole', 'Nicole', 'B-', "Hi. I'm Nicole. I'd like to read for you."], ['af_aoede', 'Aoede', 'C+', "Hi. I'm Aoede. I'd like to read for you."], ['af_kore', 'Kore', 'C+', "Hi. I'm Kore. I'd like to read for you."], ['af_sarah', 'Sarah', 'C+', "Hi. I'm Sarah. I'd like to read for you."], ['am_fenrir', 'Fenrir', 'C+', "Hey. I'm Fenrir. I'd like to read for you."], ['af_alloy', 'Alloy', 'C', "Hi. I'm Alloy. I'd like to read for you."], ['af_nova', 'Nova', 'C', "Hi. I'm Nova. I'd like to read for you."], ['bf_isabella', 'Isabella', 'C', "Hello. I'm Isabella. I'd like to read for you."], ['bm_fable', 'Fable', 'C', "Hello. I'm Fable. I'd like to read for you."]];
const edit = (p, anchor, add) => { let s = fs.readFileSync(p, 'utf8'); if (!s.includes(anchor)) throw new Error(`anchor missing in ${p}: ${anchor.slice(0, 40)}`); s = s.replace(anchor, add); fs.writeFileSync(p, s); };
// 1. the voice list (lib/voice/kokoro.js): after Puck's line
{ const p = 'lib/voice/kokoro.js'; const s = fs.readFileSync(p, 'utf8'); const line = s.split('\n').find((l) => l.trimStart().startsWith('am_puck: { label')); edit(p, line, line + '\n' + NINE.map(([k, label, g]) => `  ${k}: { label: '${label}', version: () => POPULAR, input: (text, speed) => ({ text, voice: '${k}', speed: speed || SPEED }) }, // .705 grade ${g}, the warm copy`).join('\n')); }
// 2. the Read by menu (app/ez/page.js READ_BY)
{ const p = 'app/ez/page.js'; edit(p, "['am_puck', 'Puck']]", "['am_puck', 'Puck'], " + NINE.map(([k, label]) => `['${k}', '${label}']`).join(', ') + ']'); }
// 3. the hellos (scripts/voice_labels.mjs INTROS)
{ const p = 'scripts/voice_labels.mjs'; edit(p, 'export const INTROS = { ', 'export const INTROS = { ' + NINE.map(([k, , , intro]) => `${k}: ${JSON.stringify(intro)}, `).join('')); }
console.log('added', NINE.map(([, l]) => l).join(', '));
