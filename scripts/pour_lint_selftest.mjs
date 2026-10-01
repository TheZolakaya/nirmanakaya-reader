// The cell lints, tested: a bad quartet trips the hard flags; Keel's worked cell passes everything except the exemplar-gram
// refrain lint, which is EXPECTED to fire on it (it IS an exemplar). Run: npx tsx scripts/pour_lint_selftest.mjs
import { lintCell, lintQuartet } from '../lib/pour/lint.js';
const show = (r) => r.flags.length ? r.flags.map((f) => `${f.hard ? '!' : '~'}${f.code}(${f.detail.slice(0, 40)})`).join(' ') : 'clean';
const bad = { status: 2, tense: 'You are anxious.', verb: 'the Culture seat pushing', place: 'in Will', ask: 'You must find balance and rebalance with your sister.', core: 'short', sheetLine: 'x' };
const r = lintCell(bad, { signatureId: 1, positionId: 5, partnerId: 19 });
console.log('bad cell ok?', r.ok, '->', show(r));
const good = { status: 2, tense: "You're pushing what you know harder than anyone asked, living in a version ahead of this one where they finally understand.", verb: 'the part of you that decides what gets passed on and carries it', place: 'in the part of your life where things get shared and made common', ask: 'Say it once and let it sit unanswered; the pushing stops costing you the thing pushing was for, and what you hand people arrives with your name on it again.', core: "You're pushing what you know harder than anyone asked. Somewhere ahead there's a version of this where they finally understand, and you're living in it, so every conversation becomes a chance to convert. The part of you that decides what gets passed on is working overtime in the part of your life where things get shared and made common, and the pushing is costing you the thing pushing was for. The way through is the simpler thing: say it once and let it sit unanswered. Not softer, just once. When that lands, what you hand people arrives with your name on it again, and it lands because it was offered, not pressed. That is yours to try this week, in one conversation you'd otherwise have pushed.", sheetLine: 'Convincing people has replaced reaching them.' };
const g = lintCell(good, { signatureId: 1, positionId: 5, partnerId: 19 });
const unexpected = g.flags.filter((f) => f.hard && !(f.code === 'refrain' && /exemplar/.test(f.detail)));
console.log('good cell (an exemplar: the exemplar-gram refrain is expected) ->', show(g), unexpected.length ? '  UNEXPECTED HARD FLAG' : '  (as expected)');
const q = lintQuartet([good, { ...good, status: 3 }]);
console.log('quartet (same core twice):', q.ok ? 'MISSED' : 'caught', show(q));
process.exit(r.ok || unexpected.length || q.ok ? 1 : 0);
