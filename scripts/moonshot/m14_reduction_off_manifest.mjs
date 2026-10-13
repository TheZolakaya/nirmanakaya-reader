// M14 — REDUCTION OFF THE MANIFEST: what the six are, what the kernel's +9 already gives, and which simple rules reproduce the six (True, 2026-10-13).
// The record's REDUCTION_PAIRS: on the manifest n ↔ n ± 9 (the ω-move, a theorem of the numbering). Off the manifest six targets are supplied:
// 0 → 18, 1 → 19, 19 → 10, 20 → 11, 10 → 1, 21 → 12. The ledger charged them as six free picks among 22 (26.76 bits). This script asks:
// (1) how much the "same residue mod 9" kinship (the manifest +9 read as an equivalence) already fixes; (2) which one-line rules give all six.
//   npx tsx scripts/moonshot/m14_reduction_off_manifest.mjs
const R = 'file:///D:/NKYAWebApp/nirmanakaya-reader/';
const { REDUCTION_PAIRS, getComponent } = await import(R + 'lib/corrections.js');
const ok = (c, msg) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${msg}`); if (!c) process.exitCode = 1; };
const nm = (i) => `${getComponent(i)?.name ?? '?'} (${i})`;
const OFF = [0, 1, 10, 19, 20, 21], MAN = [2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 17, 18];
console.log('== 1. the six, in names ==');
for (const i of OFF) console.log(`  ${nm(i)} → ${nm(REDUCTION_PAIRS[i])}`);
ok(MAN.every((n) => REDUCTION_PAIRS[n] === (n <= 9 ? n + 9 : n - 9)), 'on the manifest Reduction is n ↔ n ± 9: the ω-move as a constant (m9, m10)');
ok(!OFF.every((i) => REDUCTION_PAIRS[REDUCTION_PAIRS[i]] === i), 'off the manifest the record\'s Reduction is NOT an involution: 0 → 18 but 18 → 9; 1 → 19 → 10 → 1 is a three-cycle');

console.log('\n== 2. the kinship: same residue mod 9 (the manifest +9 read as an equivalence over all 22) ==');
const spoke = (n) => n % 9;
ok([...MAN, ...OFF].every((n) => spoke(REDUCTION_PAIRS[n]) === spoke(n)), 'every Reduction target in the record, manifest or not, shares the card\'s residue mod 9 — the kinship is one equivalence over all 22');
const classes = {}; for (let n = 0; n <= 21; n++) (classes[spoke(n)] ||= []).push(n);
console.log('  the nine spokes:', Object.entries(classes).map(([s, c]) => `${s}: {${c.join(',')}}`).join('  '));
const threes = Object.values(classes).filter((c) => c.length === 3);
console.log(`  five spokes hold a manifest pair only (forced); four spokes hold three cards: ${threes.map((c) => `{${c.join(',')}}`).join(' ')} — the six off-manifest targets live there`);
// how many bits remain once kinship is admitted: for each off-manifest card, the choices among its kin (excluding itself)
let bits = 0; for (const i of OFF) { const kin = classes[spoke(i)].filter((x) => x !== i); bits += Math.log2(kin.length); }
console.log(`  choices left under kinship: ${OFF.map((i) => `${i}→{${classes[spoke(i)].filter((x) => x !== i).join(',')}}`).join(' ')} = ${bits.toFixed(2)} bits (the ledger's 26.76 was six free picks among 22)`);

console.log('\n== 3. one-line rules on the six, scored ==');
const rules = {
  'minus 9, mod 27': (n) => ((n - 9) % 27 + 27) % 27,
  'minus 9, mod 21 (the cycle 21→0)': (n) => ((n - 9) % 21 + 21) % 21,
  'plus 9, mod 21': (n) => (n + 9) % 21,
  'highest other kin on the spoke': (n) => Math.max(...classes[spoke(n)].filter((x) => x !== n)),
  'the OUTER manifest kin if any, else the next on the spoke downward': (n) => { const kin = classes[spoke(n)].filter((x) => x !== n); const outer = kin.filter((x) => MAN.includes(x) && x > 10); if (outer.length) return outer[0]; const lower = kin.filter((x) => x < n); return lower.length ? Math.max(...lower) : Math.max(...kin); },
  'the kin two laps away if it exists, else one lap down': (n) => { const two = [n + 18, n - 18].find((x) => x >= 0 && x <= 21 && x !== n); if (two !== undefined && OFF.includes(n) && two !== REDUCTION_PAIRS[n]) { /* fall through to scoring */ } return two !== undefined ? two : n - 9; },
  'digital root, then the manifest card with that root in the OUTER half (11–18), else the Soul/portal kin': (n) => { const root = n === 0 ? 9 : (n % 9 === 0 ? 9 : n % 9); const outer = MAN.filter((x) => x > 10 && ((x % 9) || 9) === root); if (outer.length) return outer[0]; const kin = classes[spoke(n)].filter((x) => x !== n); return kin[0]; },
};
for (const [name, f] of Object.entries(rules)) { const hits = OFF.filter((i) => f(i) === REDUCTION_PAIRS[i]); console.log(`  ${hits.length}/6  ${name}${hits.length < 6 ? `  (misses: ${OFF.filter((i) => f(i) !== REDUCTION_PAIRS[i]).map((i) => `${i}→${f(i)} vs ${REDUCTION_PAIRS[i]}`).join(', ')})` : ''}`); }
const best = Object.entries(rules).filter(([, f]) => OFF.every((i) => f(i) === REDUCTION_PAIRS[i])).map(([n]) => n);
console.log(best.length ? `  rules that give all six: ${best.join(' | ')}` : '  no one-line rule here gives all six; the three-cycle on spoke 1 (Will → Actualization → Source → Will) is the stubborn part');
console.log('\nM14 done.');
