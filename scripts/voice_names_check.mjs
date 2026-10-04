import fs from 'node:fs';
import { getComponent } from '../lib/corrections.js';
import { ARCHETYPES } from '../lib/archetypes.js';
const KEY = fs.readFileSync('.env.local','utf8').match(/^GROQ_API_KEY=(.*)$/m)[1].trim().replace(/^"|"$/g,'');
const norm = (s) => String(s||'').toLowerCase().replace(/[^a-z ]/g,'').replace(/\s+/g,' ').trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const say = async (file) => { await sleep(3200); for (let k = 0; k < 4; k++) { const fd = new FormData(); fd.append('model','whisper-large-v3-turbo'); fd.append('response_format','text'); fd.append('file', new Blob([fs.readFileSync(file)]), 'c.wav'); const r = await fetch('https://api.groq.com/openai/v1/audio/transcriptions',{method:'POST',headers:{Authorization:`Bearer ${KEY}`},body:fd}); const t = (await r.text()).trim(); if (!/rate_limit_exceeded/.test(t)) return t; await sleep(8000); } return '(rate limited)'; };
const miss = [];
for (const voice of ['af_bella','bm_george']) {
  for (let i = 0; i < 78; i++) { const name = getComponent(i)?.name; const f = `public/voice/labels/${voice}/name-${i}.wav`; if (!name || !fs.existsSync(f)) continue; const heard = await say(f); if (!norm(heard).includes(norm(name))) miss.push(`${voice} name-${i} ${name} → "${heard}"`); }
  for (let i = 0; i < 22; i++) { const name = ARCHETYPES[i].name; const f = `public/voice/labels/${voice}/seat-${i}.wav`; const heard = await say(f); if (!norm(heard).includes(norm(name))) miss.push(`${voice} seat-${i} ${name} → "${heard}"`); }
}
console.log('misses', miss.length); miss.forEach((m) => console.log(' ', m));
