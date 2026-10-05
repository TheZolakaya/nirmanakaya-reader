import fs from 'node:fs';
const { getComponent } = await import('../lib/corrections.js');
const { MEDICINE_ACTS } = await import('../lib/pour/medicineActs.js');
const DEFS = JSON.parse(fs.readFileSync('lib/data/nirmanakaya_78_definitions.json', 'utf8'));
const first2 = (t) => String(t || '').split(/(?<=\.)\s/).slice(0, 2).join(' ');
const out = [];
for (let id = 0; id < 78; id++) { const c = getComponent(id) || {}; const d = DEFS.signatures[id] || {}; const a = MEDICINE_ACTS[id]; out.push(`## ${id} ${c.name} (${d.class || '?'}${d.associatedArchetypeName ? `; parent ${d.associatedArchetypeName}` : ''})\n  what it is: ${c.description || ''}\n  more: ${first2(c.extended)}\n  acts: ${a ? a.acts.join(' · ') : '(none)'}${a?.people ? ' [people]' : ''}`); }
fs.writeFileSync(process.env.TEMP + '/medicine_what.txt', out.join('\n')); console.log('written');
