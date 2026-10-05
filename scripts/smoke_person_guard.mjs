// .707 THE PERSON GUARD — positives, the collision negatives, provenance, and the fallback
import fs from 'node:fs';
const G = await import('../lib/personGuard.js');
const { getComponent } = await import('../lib/corrections.js');
// the guard loads the house names itself
const asker0 = ['How can I help coordinate a project without taking over decisions?', 'I just joined this week.'];
const A0 = G.allowedNamesFrom(asker0);
const pos = ['Maybe your colleague Ravi keeps the decisions to himself.', 'Talk to your friend Maya about it.', 'Think of someone named Daniel who always says yes.', 'A person like Elena would just ask.', "Ravi's version of the plan is the one people follow.", 'If Priya asks you again, say no.', 'your manager, Tobiah, decides the rest.'];
const neg = ['You will find it easier once you decide.', 'Will is what came up for you, and it is working.', 'It takes faith to let it go.', 'Faith, in this reading, is letting go of what is finished.', 'There is grace in leaving it alone.', 'Hope is not a plan.', 'Joy shows up when the work is done.', 'Wait until June if you have to.', 'The rose was on the table.', 'Mark the day it is finished.', 'Drew the line there.', 'Nirmanakaya reads your now.', 'What came up is Compassion, and it is steady.', 'The Steward of Resonance makes room for feeling.', 'Your sister has been carrying this too.'];
let pass = 0, fail = 0;
for (const s of pos) { const h = G.findInventedPeople(s, A0); const ok = h.length > 0; ok ? pass++ : fail++; console.log(ok ? '+ caught' : '+ MISSED', '|', s, ok ? `→ ${h.map((x) => x.name).join(',')}` : ''); }
for (const s of neg) { const h = G.findInventedPeople(s, A0); const ok = h.length === 0; ok ? pass++ : fail++; console.log(ok ? '- clean ' : '- FALSE+', '|', s, ok ? '' : `→ ${h.map((x) => x.name).join(',')}`); }
// provenance: the asker named Ravi
const A1 = G.allowedNamesFrom(['My colleague Ravi keeps taking over the decisions.']);
const prov = G.findInventedPeople('Maybe your colleague Ravi keeps the decisions to himself.', A1); console.log(prov.length === 0 ? 'provenance: Ravi allowed when the asker named him ✓' : 'provenance: FAILED'); prov.length === 0 ? pass++ : fail++;
// fallback: role supplied vs not
const f1 = G.scrubInventedPeople('Maybe your colleague Ravi keeps the decisions to himself.', A0, asker0); console.log('fallback, no colleague supplied:', f1.text);
const f2 = G.scrubInventedPeople('Maybe your colleague Ravi keeps the decisions to himself.', A0, ['My colleague keeps the decisions.']); console.log('fallback, colleague supplied:   ', f2.text);
const f3 = G.scrubInventedPeople("Ravi's version is the one people follow.", A0, asker0); console.log('fallback, possessive:          ', f3.text);
console.log(`\n${pass} pass · ${fail} fail`);
