// list the leading words of the 357 canonical acts (to build the act-family table)
const { MEDICINE_ACTS } = await import('../lib/pour/medicineActs.js');
const lead = {}; let n = 0;
for (const m of Object.values(MEDICINE_ACTS)) for (const a of m.acts) { n++; const w = a.toLowerCase().split(/\s+/)[0]; lead[w] = (lead[w] || 0) + 1; }
console.log('acts', n, '· distinct leading words', Object.keys(lead).length);
console.log(Object.entries(lead).sort((a, b) => b[1] - a[1]).map(([w, c]) => `${w} ${c}`).join(' · '));
