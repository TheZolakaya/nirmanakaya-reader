// PROBE — THE MEDICINE SWAP flag on two positives and three negatives (2026-10-05).   npx tsx scripts/probe_medicine_swap.mjs
const m = await import('../lib/bakeoff/lint.js');
const c = await import('../lib/corrections.js');
const idOf = (n) => { for (let i = 0; i < 78; i++) if (c.getComponent(i)?.name === n) return i; };
const d = (s, t, p) => ({ status: s, transient: idOf(t), position: idOf(p) });
const fresh5 = [d(4, 'Resilience', 'Faith'), d(2, 'Preservation', 'Culture'), d(1, 'Passage', 'Authority')];
const exhibit = [d(1, 'Catalyst of Intent', 'Potential'), d(1, 'Discernment', 'Creation'), d(1, 'Perception', 'Drive')];
const t = [
  ['POS fresh-5 repose', fresh5, 'The way through is quiet: let the mind sit instead of working the problem. Put the contradiction on a page, unedited, and leave every attempt to resolve it for tomorrow. What you get back is the rest that lets something deeper than force do the learning.'],
  ['NEG fresh-5 steadfast paraphrase', fresh5, 'The way through is smaller than it looks: stay with your own load, all of it, and do not check on anyone else while you do. It is the strength that comes from your own resources instead of borrowed ones.'],
  ['POS exhibit immersion-only', exhibit, 'The step is this: pick one pattern the loop keeps leaning on, and read it past the place where it feels handled, until it stops explaining the situation. Not another turn of pressure; one long look at something you think you already understand.'],
  ['NEG exhibit listening', exhibit, 'Before you settle the next question you would answer on instinct, sit with it and take in what it actually is. No deciding, no ruling, just listening. What you get back is knowing that does not need defending.'],
  ['NEG single card', [fresh5[0]], 'The way through is quiet: let the mind sit instead of working the problem.'],
];
for (const [k, draws, med] of t) { const f = m.medicineSwapFlags(med, draws); console.log((f.length ? 'TRIP ' : 'pass ') + k + (f.length ? '  -> ' + f[0].detail.slice(0, 90) : '')); }
const r = m.lintOutput({ text: '', parsed: { reader: 'x '.repeat(50), gist: 'g', medicine: t[0][2], question: 'q?', chips: [], next: [] }, preset: { kind: 'opening' }, hostile: false, draw: fresh5[0], draws: fresh5, voice: 'plain' });
console.log('lintOutput codes:', r.flags.map((f) => f.code).join(','));
