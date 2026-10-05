// THE DESTINATION lint, proven: licensed by the record (Faith's own line), licensed by the person's words, and invented (must trip).
import { destinationFlags } from '../lib/bakeoff/lint.js';
import { getComponent } from '../lib/corrections.js';
const id = (n) => { for (let i = 0; i < 78; i++) if (getComponent(i)?.name === n) return i; throw new Error('no ' + n); };
const D = (t, p, s) => ({ transient: id(t), position: id(p), status: s });
const cases = [
  ['PASS record: Faith, "taken" is its own line', [D('Faith', 'Faith', 4)], '', 'Faith\'s status here is Unacknowledged — the release is going on, and you are telling yourself it was taken from you.'],
  ['PASS record: Keel exhibit (Faith in Imagination)', [D('Faith', 'Imagination', 4)], '', 'You put the hours a direction costs down and are telling yourself it was taken.'],
  ['PASS words: the question names the system', [D('Guidance', 'Transformation', 4)], 'What am I most likely to mistake for genuine discovery when I use a system like this?', 'You are showing the way and calling it the system\'s doing.'],
  ['PASS record: Tune says luck', [D('Tune', 'Compassion', 4)], '', 'You are keeping things in balance and calling it luck that nothing has tipped.'],
  ['TRIP invented: circumstance on Orientation', [D('Orientation', 'Creation', 4)], 'If evidence forces me to abandon a commitment, what remains mine?', 'You are choosing a direction to steer by and calling that choice circumstance rather than your own.'],
  ['TRIP invented: luck + someone else on Flourishing', [D('Flourishing', 'Culture', 4)], 'What must a commitment preserve?', 'Asked how it keeps going, you would say it just does, or that it was luck, or that someone else made it work.'],
  ['PASS not Unacknowledged: Too Much Repose, "luck" is just prose', [D('Repose', 'Wisdom', 2)], '', 'This is not luck; the rest has gone past rest.'],
];
let ok = true;
for (const [name, draws, q, prose] of cases) {
  const f = destinationFlags(prose, draws, q, ''); const tripped = f.length > 0; const want = name.startsWith('TRIP'); const good = tripped === want; ok = ok && good;
  console.log(`${good ? 'ok ' : 'XX '}${name} → ${tripped ? f.map((x) => x.detail.slice(0, 70)).join(' | ') : 'no flag'}`);
}
console.log(ok ? '\nALL GOOD' : '\nFAILURES'); process.exit(ok ? 0 : 1);
