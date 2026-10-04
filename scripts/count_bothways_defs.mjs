import fs from 'node:fs';
const DEFS = JSON.parse(fs.readFileSync('lib/data/nirmanakaya_78_definitions.json', 'utf8'));
const sigs = DEFS.signatures; const keys = Object.keys(sigs);
console.log('signatures', keys.length, 'state keys of #12:', Object.keys(sigs[12].states || {}).join(','));
const BW = /\s—\s*or\b|,\s*or\b|\bor (?:that )?you (?:haven'?t|aren'?t|don'?t|didn'?t)\b|\bor (?:hoarding|refusing|holding|gripping|its opposite|the opposite|not)\b|\beither\b/i;
for (const st of Object.keys(sigs[12].states || {})) {
  const hits = []; let n = 0;
  for (const k of keys) { const line = sigs[k]?.states?.[st]; if (typeof line !== 'string') continue; n++; if (BW.test(line)) hits.push(`${k} ${sigs[k].name}: ${line.slice(0, 120)}`); }
  console.log(`\n${st}: ${n} lines, both-ways shape ${hits.length}`); for (const h of hits.slice(0, 12)) console.log(' -', h);
}
console.log('\nFaith lines:'); for (const [k, v] of Object.entries(sigs[12].states || {})) console.log(` ${k}: ${v}`);
