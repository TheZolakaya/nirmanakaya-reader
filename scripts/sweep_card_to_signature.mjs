// THE WORD SWEEP: "card" → "signature" everywhere a PERSON or the MODEL reads it (founder 2026-10-02: "I really don't want the word
// cards anywhere — it rings mystical tarot everywhere"). Code identifiers are never touched: the sweep parses each file and
// rewrites only inside string literals, template strings and JSX text — and inside those it leaves alone:
//   - whole-string enum values ('card', 'cards') and hyphenated/underscored tokens (card-shadow, nk_cards) — saved data and CSS keep working
//   - anything followed by a colon ("card":, [CARD:1], THE CARD:) — JSON keys and the section markers the parsers read
//   - the arguments of getElementById / querySelector / localStorage calls, and className / id / htmlFor / key / href / src attributes
// lib/pour/* is NOT in the list: set l's prompt is frozen under its PROMPT_VERSION and its lints already bar "card" on glass.
//   npx tsx scripts/sweep_card_to_signature.mjs            # dry run: counts per file + samples
//   npx tsx scripts/sweep_card_to_signature.mjs --verbose  # dry run: every change, in context
//   npx tsx scripts/sweep_card_to_signature.mjs --apply    # write the files
import fs from 'node:fs';
import { parse } from '@babel/parser';

const APPLY = process.argv.includes('--apply');
const VERBOSE = process.argv.includes('--verbose');
const FILES = [
  'lib/ezPrompts.js', 'lib/handingPrompt.js', 'lib/prompts.js', 'lib/record.js', 'lib/kernel.js', 'lib/personas.js', 'lib/monitorPrompts.js', 'lib/promptBuilder.js',
  'app/ez/page.js', 'app/advanced/page.js', 'app/explore/page.js', 'app/page.js',
  ...fs.readdirSync('components/reader').filter((f) => f.endsWith('.js')).map((f) => 'components/reader/' + f),
  ...fs.readdirSync('components/shared').filter((f) => f.endsWith('.js')).map((f) => 'components/shared/' + f),
  ...fs.readdirSync('app/api').flatMap((d) => { const p = `app/api/${d}/route.js`; return fs.existsSync(p) ? [p] : []; }),
].filter((f) => fs.existsSync(f));

const WORD = /(?<![-_])\b(card|cards|Card|Cards|CARD|CARDS)\b(?![-_])/g;
const MAP = { card: 'signature', cards: 'signatures', Card: 'Signature', Cards: 'Signatures', CARD: 'SIGNATURE', CARDS: 'SIGNATURES' };
const KEEP_WHOLE = new Set(['card', 'cards', 'Card', 'Cards']);   // an enum value / a key: untouched
const SKIP_ATTRS = new Set(['className', 'id', 'htmlFor', 'key', 'href', 'src', 'name', 'value', 'type']);
const SKIP_CALLS = new Set(['getElementById', 'querySelector', 'querySelectorAll', 'getItem', 'setItem', 'removeItem', 'add', 'remove', 'toggle', 'contains']);

function rewriteText(text) {
  if (KEEP_WHOLE.has(text.trim())) return text;
  return text.replace(WORD, (m, w, off, s) => {
    const rest = s.slice(off + m.length);
    if (/^["']?\s*:/.test(rest)) return m;                       // a key or a marker: "card": / [CARD:1] / THE CARD:
    if (s[off - 1] === '.' || /^\.\w/.test(rest)) return m;       // obj.card / card.name typed inside a string
    return MAP[w];
  });
}

let total = 0; const report = []; const detail = [];
for (const file of FILES) {
  const src = fs.readFileSync(file, 'utf8');
  let ast;
  try { ast = parse(src, { sourceType: 'module', plugins: ['jsx'], errorRecovery: true }); } catch (e) { report.push(`${file}: PARSE FAILED ${e.message.slice(0, 80)}`); continue; }
  const edits = [];   // [start, end, newText]
  const take = (start, end) => { const inner = src.slice(start, end); const out = rewriteText(inner); if (out !== inner) edits.push([start, end, out]); };
  const visit = (node) => {
    if (!node || typeof node.type !== 'string') return;
    if (node.type === 'JSXAttribute' && node.name && SKIP_ATTRS.has(node.name.name)) return;
    if (node.type === 'CallExpression' && node.callee?.type === 'MemberExpression' && SKIP_CALLS.has(node.callee.property?.name)) { visit(node.callee); return; }
    if (node.type === 'StringLiteral') { take(node.start + 1, node.end - 1); return; }
    if (node.type === 'TemplateElement') { take(node.start, node.end); return; }
    if (node.type === 'JSXText') { take(node.start, node.end); return; }
    for (const k of Object.keys(node)) { if (k === 'loc' || k === 'extra') continue; const v = node[k]; if (Array.isArray(v)) v.forEach(visit); else if (v && typeof v.type === 'string') visit(v); }
  };
  visit(ast.program);
  if (!edits.length) continue;
  edits.sort((a, b) => b[0] - a[0]);
  let out = src; for (const [s, e, t] of edits) out = out.slice(0, s) + t + out.slice(e);
  const n = (src.match(WORD) || []).length - (out.match(WORD) || []).length;
  total += n;
  const sample = edits.slice(0, 2).map(([s, e]) => src.slice(Math.max(0, s - 30), e + 30).replace(/\s+/g, ' ').slice(0, 110)).join(' | ');
  report.push(`${file}: ${n} words → signature${APPLY ? '' : '   e.g. ' + sample}`);
  if (VERBOSE) {
    for (const [s, e] of [...edits].reverse()) {
      const line = src.slice(0, s).split('\n').length;
      const seg = src.slice(s, e); let re = new RegExp(WORD.source, 'g'); let mm;
      while ((mm = re.exec(seg))) { const at = s + mm.index; detail.push(`${file}:${line}  …${src.slice(Math.max(0, at - 60), at + mm[0].length + 60).replace(/\s+/g, ' ')}…`); }
    }
  }
  if (APPLY) fs.writeFileSync(file, out);
}
console.log(report.join('\n'));
console.log(`${APPLY ? 'rewrote' : 'would rewrite'} ${total} words in ${report.length} files`);
if (VERBOSE) fs.writeFileSync('data/sweep_card_review.txt', detail.join('\n'));
if (VERBOSE) console.log(`every change written to data/sweep_card_review.txt (${detail.length} lines)`);
