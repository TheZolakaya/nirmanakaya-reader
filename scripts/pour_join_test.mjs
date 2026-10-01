// THE ADVERSARIAL JOIN TEST (item 6: before any voice wave). Hand-built cases where individually correct pieces meet wrongly;
// every one must be caught by lib/pour/joins.js. Run: npx tsx scripts/pour_join_test.mjs
import DEFS from '../lib/data/nirmanakaya_78_definitions.json';
import { readPlan, provenanceFor, authoringPackage } from '../lib/pour/assemble.js';
import { checkJoins } from '../lib/pour/joins.js';
const good = (sig, pos, status) => { const pkg = authoringPackage(sig, pos, DEFS); return { status, tense: 'tense', verb: 'verb', place: 'place', ask: 'offer; and what comes back', core: 'core', sheetLine: 'line', provenance: provenanceFor(pkg, status) }; };
const cases = [];
// 1. the right sentence on the wrong owner: a Stewardship-in-Will cell attached to a Stewardship-in-Culture plan
cases.push(['wrong seat', readPlan({ transient: 53, position: 5, status: 4 }, DEFS), good(53, 1, 4), null, [], 'ownership']);
// 2. right card, right seat, wrong status
cases.push(['wrong status', readPlan({ transient: 53, position: 1, status: 2 }, DEFS), good(53, 1, 4), null, [], 'ownership']);
// 3. a stale cell after a canon sweep: provenance says a different partner than the record now computes
const stale = good(6, 3, 1); stale.provenance.partner_id = 8; stale.provenance.partner = 'Fortitude';   // a cell authored under the 2026-09-27 gavel (pure growth 6↔8) meets a record that still computes 6↔15 — the live mismatch today, until corrections.js carries the sweep
cases.push(['stale partner', readPlan({ transient: 6, position: 3, status: 1 }, DEFS), stale, null, [], 'provenance']);
// 4. optional growth turned into a deficiency in a Balanced cell
const gap = good(2, 2, 1); gap.core = 'This part of you is steady, but something is missing here: the next step hasn\'t arrived.';
cases.push(['growth as lack', readPlan({ transient: 2, position: 2, status: 1 }, DEFS), gap, null, [], 'growth']);
// 5. a hypothesis promoted to a fact across turns, without the person's words
const planH = readPlan({ transient: 50, position: 11, status: 3 }, DEFS, () => null, { userStated: ['I keep the number to myself'] });
cases.push(['hypothesis → fact', planH, good(50, 11, 3), { reader: 'Since the relationship ended last spring, you have been…', question: 'Is that it?', chips: [] }, [{ text: 'the relationship ended last spring', state: 'READER_HYPOTHESIS', asFact: true }], 'promotion']);
// 6. a contradicted hypothesis surviving downstream
const planC = readPlan({ transient: 50, position: 11, status: 3 }, DEFS); planC.hypotheses.push({ text: 'you stopped believing a while ago', contradicted: true });
cases.push(['no beats the read', planC, good(50, 11, 3), { reader: 'Because you stopped believing a while ago…', question: 'What changed?', chips: [] }, [{ text: 'you stopped believing a while ago', state: 'READER_HYPOTHESIS' }], 'promotion']);
// 7. a chip smuggling the biography the cell omitted
cases.push(['premise in a chip', readPlan({ transient: 6, position: 15, status: 3 }, DEFS), good(6, 15, 3), { reader: 'The card shows…', question: 'Where did you first learn that feeling with someone gets you punished?', chips: [] }, [], 'premise']);
// 8. a correct cell on the correct plan: must pass clean
cases.push(['clean', readPlan({ transient: 53, position: 1, status: 4 }, DEFS), good(53, 1, 4), { reader: 'What the card shows…', question: 'Which piece would you let someone see first?', chips: [{ text: 'Probably the site.' }] }, [], null]);

let fails = 0;
for (const [name, plan, cell, turn, facts, expect] of cases) {
  const r = checkJoins(plan, cell, turn, facts);
  const codes = r.flags.filter((f) => f.hard).map((f) => f.code);
  const pass = expect ? codes.includes(expect) : codes.length === 0;
  if (!pass) fails++;
  console.log(`${pass ? 'caught ' : 'MISSED '} ${name.padEnd(20)} expect ${String(expect).padEnd(11)} got ${codes.join(',') || 'clean'}${r.flags.length ? '  — ' + r.flags.map((f) => f.detail.slice(0, 70)).join(' | ') : ''}`);
}
console.log(fails ? `\n${fails} join(s) missed` : '\nevery join caught, the clean one clean');
process.exit(fails ? 1 : 0);
