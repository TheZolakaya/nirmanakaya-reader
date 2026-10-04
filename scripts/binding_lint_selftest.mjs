// THE BINDING LINT, proven on the recursive reader's five reproduced failures (must trip) and its allowed sentences (must pass).
import { bindingFlags } from '../lib/bakeoff/lint.js';
import { getComponent, getFullCorrection, getCorrectionTargetId } from '../lib/corrections.js';
const id = (name) => { for (let i = 0; i < 78; i++) if (getComponent(i)?.name === name) return i; throw new Error('no ' + name); };
const med = (t, s) => { const fc = getFullCorrection(t, s); const tid = getCorrectionTargetId(fc, getComponent(t)); return tid != null ? getComponent(tid)?.name : null; };
const D = (t, p, s) => ({ transient: id(t), position: id(p), status: s });
const cases = [
  ['TRIP 1', [D('Repose', 'Wisdom', 2)], 'Resolve-compulsion is over-resting in wisdom.'],
  ['TRIP 2', [D('Dedication', 'Faith', 4)], 'There is an unacknowledged Faith here that you keep stepping around.'],
  ['TRIP 3', [D('Nurturing', 'Faith', 3)], "What's starved is faith. Nurture Faith vertically."],
  ['TRIP 4', [D('Flourishing', 'Culture', 4)], 'This is unrecognized Dedication — acknowledge the Dedication you have disowned.'],
  ['TRIP 5', [D('Orientation', 'Creation', 4), D('Authority', 'Source', 4)], 'Your support and transformation both sit in shadow, waiting.'],
  ['PASS 1', [D('Flourishing', 'Culture', 4)], 'Flourishing is unacknowledged in the domain of Culture. The Reduction medicine is Dedication.'],
  ['PASS 2', [D('Flourishing', 'Culture', 4)], 'The reading may therefore invite recognition of what has already grown before applying Dedication as the corrective movement.'],
  ['PASS 3', [D('Repose', 'Wisdom', 2)], 'Too much Repose in Wisdom: the rest has gone past rest. Resolve is the medicine, by the diagonal.'],
  ['PASS 4', [D('Nurturing', 'Faith', 3)], 'Nurturing is running low in the seat of Faith; the medicine charges the vertical twin, Inspiration.'],
];
let ok = true;
for (const [name, draws, prose] of cases) {
  const meds = draws.map((d) => med(d.transient, d.status));
  const f = bindingFlags(prose, draws); const tripped = f.length > 0; const want = name.startsWith('TRIP');
  const good = tripped === want; ok = ok && good;
  console.log(`${good ? 'ok ' : 'XX '}${name}  medicine=${meds.join(',')}  →  ${tripped ? f.map((x) => x.detail.slice(0, 90)).join(' | ') : 'no flag'}`);
}
console.log(ok ? '\nALL GOOD' : '\nFAILURES'); process.exit(ok ? 0 : 1);
