// THE STATUS SWEEP (founder-ruled 2026-10-03): the Unacknowledged line of every signature to the gaveled form —
// one sentence, one-sided, the capacity running as the person's own act, with where the credit is going.
// 22 texts (the archetypes), applied by family: every entry whose current line equals an archetype's current line takes its new one.
// Draft read and approved: G:\My Drive\For Air Review\DRAFT_Status_Sweep_Unacknowledged_22_of_78_2026-10-03.md
import fs from 'node:fs';
const FILE = 'lib/data/nirmanakaya_78_definitions.json';
const DEFS = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const NEW = {
  0: 'You are choosing among open options every day and calling it "there was no choice."',
  1: 'You are setting the direction and calling it momentum, habit, or how things went.',
  2: 'You are knowing what to attend to, your calls keep proving right, and you are crediting luck.',
  3: 'You are tending what grows and calling it a role you never chose; the care is yours, credited to obligation.',
  4: 'You are putting things in order, people rely on it, and you are calling it things "just working out."',
  5: 'You are teaching, people are learning from you, and you are calling it just talking.',
  6: 'You are connecting, others feel your care, and you are calling it indifference.',
  7: 'You are moving toward something and calling it being carried along.',
  8: 'You are holding something up and calling it just how things are; the strength is yours, credited to necessity.',
  9: 'You are practicing and calling the result talent or "it came without trying."',
  10: 'You are turning the wheel and calling it fate; the consequences are yours, credited to what happens to you.',
  11: 'You are keeping score and calling it just noticing; the tally is yours, credited to how others behave.',
  12: 'You have put something down and are telling yourself it was taken; the release is yours, unsigned.',
  13: 'You are ending something and calling it running its course; the ending is yours, credited to time.',
  14: 'You are holding things in balance and calling it luck that nothing has tipped.',
  15: 'You are living by a pattern you built and calling it the way things are.',
  16: 'You are pulling a structure down and calling it collapse; the clearing is yours, credited to failure.',
  17: 'You are drawing people toward something and calling it their idea.',
  18: 'You are steering by a picture of what could be and calling it realism; the picture is yours, credited to the facts.',
  19: 'You are becoming what you are and calling it just getting by.',
  20: 'You already know, and you are calling it not being sure.',
  21: 'You have finished a cycle and are calling it still in progress.',
};
const S = DEFS.signatures;
const oldByText = new Map(); for (let i = 0; i < 22; i++) oldByText.set(S[i].states.unacknowledged, i);
let changed = 0; const families = {};
for (const [k, d] of Object.entries(S)) {
  const cur = d?.states?.unacknowledged; if (typeof cur !== 'string') continue;
  const a = oldByText.get(cur); if (a === undefined) { console.error('NO FAMILY for', k, d.name, '→', cur.slice(0, 60)); process.exit(2); }
  d.states.unacknowledged = NEW[a]; changed++; (families[a] ||= []).push(k);
}
let posChanged = 0;
for (const [k, p] of Object.entries(DEFS.positions || {})) { const cur = p?.states?.unacknowledged; if (typeof cur !== 'string') continue; const a = oldByText.get(cur); if (a === undefined) { console.error('position no family', k); process.exit(2); } p.states.unacknowledged = NEW[a]; posChanged++; }
fs.writeFileSync(FILE, JSON.stringify(DEFS, null, 2) + '\n');
console.log(`signatures updated ${changed}/78 · positions updated ${posChanged}/22`);
for (let i = 0; i < 22; i++) console.log(`  ${String(i).padStart(2)} ${S[i].name.padEnd(15)} → ${families[i].join(',')}`);
