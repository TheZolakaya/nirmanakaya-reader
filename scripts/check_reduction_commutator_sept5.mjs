// The same check with the Growth table AS IT STOOD on 2026-09-05 (the master-data reference the Minimum Generator Hunt consumed), before
// THE MEDICINE SWEEP (founder-gaveled 2026-09-27, applied v0.99.581 2026-10-02) changed the four pure cards' growth: then Compassion→Abstraction(15),
// Fortitude→Inspiration(17), Abstraction→Compassion(6), Inspiration→Fortitude(8); now Compassion↔Fortitude and Abstraction↔Inspiration.
const { VERTICAL_PAIRS, DIAGONAL_PAIRS, REDUCTION_PAIRS, GROWTH_PAIRS, getComponent } = await import('../lib/corrections.js');
const M = [2,3,4,5,6,7,8,9,11,12,13,14,15,16,17,18];
const perm = (pairs) => { const p = {}; for (const i of M) p[i] = pairs[i]; return p; };
const V = perm(VERTICAL_PAIRS), D = perm(DIAGONAL_PAIRS), R = perm(REDUCTION_PAIRS);
const G_live = perm(GROWTH_PAIRS); const G_sept5 = { ...G_live, 6: 15, 15: 6, 8: 17, 17: 8 };
const key = (p) => M.map((i) => p[i]).join(',');
const comp = (a, b) => { const p = {}; for (const i of M) p[i] = a[b[i]]; return p; };
const inv = (a) => { const p = {}; for (const i of M) p[a[i]] = i; return p; };
const E = {}; for (const i of M) E[i] = i;
const comm = (a, b) => comp(comp(a, b), comp(inv(a), inv(b)));
const gen = (gs) => { const seen = new Map([[key(E), E]]); let f = [E]; while (f.length) { const n = []; for (const x of f) for (const g of gs) { const y = comp(g, x); const k = key(y); if (!seen.has(k)) { seen.set(k, y); n.push(y); } } f = n; } return [...seen.values()]; };
const name = (i) => getComponent(i).name;
for (const [label, G] of [['Growth as of 2026-09-05 (pre-sweep)', G_sept5], ['Growth LIVE (post-sweep, v0.99.581+)', G_live]]) {
  const els = gen([V, D, G]); const centre = els.filter((z) => els.every((x) => key(comp(z, x)) === key(comp(x, z))));
  const c = comm(comm(G, V), D);
  console.log(`\n${label}: |<V,D,G>| = ${els.length}; centre size ${centre.length}; R in group: ${els.some((x) => key(x) === key(R))}; [[G,V],D] == R: ${key(c) === key(R)}`);
  console.log('  [[G,V],D] =', M.filter((i) => i < c[i]).map((i) => `${name(i)}↔${name(c[i])}`).join(', '));
}
console.log('\nlive Reduction =', M.filter((i) => i < R[i]).map((i) => `${name(i)}↔${name(R[i])}`).join(', '));
console.log('the four growth entries that changed in the sweep: 6→' + G_sept5[6] + '→' + G_live[6] + ', 8→' + G_sept5[8] + '→' + G_live[8] + ', 15→' + G_sept5[15] + '→' + G_live[15] + ', 17→' + G_sept5[17] + '→' + G_live[17]);
