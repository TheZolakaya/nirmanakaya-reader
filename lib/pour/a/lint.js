// THE CELL LINTS — run on every authored cell before it enters the library (item 5: cells are authored with the lints as
// constraints). A flag is a reason to look; a 'hard' flag rejects the cell and the call is re-rolled with the flags named.
import { getComponent } from '../../corrections.js';
import { ARCHETYPES } from '../../archetypes.js';
import { STATUS_NAMES } from './schema.js';

const words = (t) => String(t || '').split(/\s+/).filter(Boolean).length;
const has = (t, re) => re.test(String(t || ''));

// vocabulary that never reaches a kitchen cell (from the Plain voice's lists, lib/bakeoff/lint.js, and Keel's spec §5)
const HOUSE_WORDS = /\b(?:Spirit|Mind|Emotion|Body|Gestalt|Soul) (?:house|House)\b|\b(?:Intent|Cognition|Resonance|Structure) (?:channel|Channel)\b/;
const JARGON = /\b(?:Balanced|Too Much|Too Little|Unacknowledged|Seed|Bridge|Fruition|Feedback|transient|durable|archetype|Bound|Ambassador|rebalancer|Rebalancer|signature|portal|Gestalt|authorship|agency|expressed through|inner face|outer face|horizon|Aether|diagonal|vertical|reduction)\b/;
const ELEMENTS = /\b(?:Fire|Water|Air|Earth) (?:element|energy)\b|\bthe element of\b/i;
const DIAGNOSIS = /\b(?:anxiety|anxious|depress(?:ion|ed)|trauma(?:tized)?|disorder|narcissis(?:t|tic|m)|codependen(?:t|cy)|burn(?:ed|t)? ?out|dissociat\w+|ptsd|ocd|adhd|bipolar|toxic)\b/i;
const IMPERATIVE = /\byou (?:must|should|need to|have to|ought to)\b/i;
const HISTORY = /\b(?:years ago|a while ago|for (?:weeks|months|years)|you learned early|at some point you|when you were (?:a kid|young|small|little)|your (?:sister|brother|mother|father|ex|partner|boss)\b|because that(?:'s| is) how you stay safe|you stopped believing)\b/i;
const STOCK = /your own read on things comes back, trusted again|the helm(?:'s| is) yours|the rest is yours|kneeling at the kitchen table/i;
const LEAK = /\b(?:social security|date of birth|\bSSN\b|credit card|password|bank account|phone number)\b/i;
const TENSE_WORDS = { 2: /\b(?:ahead|forecast|bracing|before it|not yet|next|will|future|racing|pre-?spend|ahead of)\b/i, 3: /\b(?:behind|already|was|used to|should have|back there|still (?:standing|holding)|past|stopped|hasn'?t)\b/i, 4: /\b(?:already|without (?:noticing|counting|saying)|as if|not (?:yours|counting)|running|doing it|haven'?t (?:said|claimed|noticed)|disown|by itself)\b/i, 1: /\b(?:now|here|yours|free to|next|steady|with the pen|working)\b/i };

// cell: { status, tense, verb, place, ask, core, sheetLine }; ctx: { signatureId, positionId, partner, partnerId }
export function lintCell(cell, ctx = {}) {
  const flags = []; const hard = (code, detail) => flags.push({ code, detail, hard: true }); const soft = (code, detail) => flags.push({ code, detail, hard: false });
  const all = [cell.tense, cell.verb, cell.place, cell.ask, cell.core, cell.sheetLine].join('\n');
  for (const f of ['tense', 'verb', 'place', 'ask', 'core', 'sheetLine']) if (!String(cell[f] || '').trim()) hard('missing', `no ${f}`);
  const n = words(cell.core); if (n && (n < 100 || n > 150)) soft('length', `core ${n} words (110–140)`);
  const sl = words(cell.sheetLine); if (sl > 18) soft('length', `sheetLine ${sl} words (≤18)`);
  // vocabulary (hard): house/channel names, jargon, elements as elements
  const v = [];
  for (const [re, label] of [[HOUSE_WORDS, 'house/channel name'], [JARGON, 'the map\'s jargon'], [ELEMENTS, 'an element as an element']]) { const m = all.match(re); if (m) v.push(`${label}: "${m[0]}"`); }
  if (v.length) hard('vocab', v.join('; '));
  // other card names (hard): any of the 78 names other than the drawn card's and the partner's
  const own = new Set([ctx.signatureId, ctx.partnerId].filter((x) => x != null).map((id) => getComponent(id)?.name));
  const other = [];
  for (let i = 0; i < 78; i++) { const nm = getComponent(i)?.name; if (!nm || own.has(nm) || nm.length < 4) continue; if (new RegExp(`\\b${nm}\\b`).test(all)) other.push(nm); }
  if (other.length) hard('names', `another card's name on glass: ${other.slice(0, 4).join(', ')}`);
  if (has(all, DIAGNOSIS)) hard('diagnosis', `"${all.match(DIAGNOSIS)[0]}"`);
  if (has(all, IMPERATIVE)) hard('imperative', `"${all.match(IMPERATIVE)[0]}"`);
  if (has(all, HISTORY)) hard('history', `"${all.match(HISTORY)[0]}" — a cell knows no one's past`);
  if (has(all, STOCK)) hard('stock', `"${all.match(STOCK)[0]}"`);
  if (has(all, LEAK)) hard('leak', `"${all.match(LEAK)[0]}"`);
  // the tense leads (soft): the tense sentence should carry its status's time
  if (cell.status && TENSE_WORDS[cell.status] && !TENSE_WORDS[cell.status].test(cell.tense || '')) soft('tense', `the tense sentence does not read as ${STATUS_NAMES[cell.status]}'s time`);
  // Balanced has an ask (hard)
  if (cell.status === 1 && words(cell.ask) < 6) hard('growth', 'a Balanced cell carries a growth ask');
  // the ask names a real move, not "be more balanced" (soft)
  if (/\b(?:be more balanced|find balance|restore balance|rebalance)\b/i.test(cell.ask || '')) soft('ask', 'the ask names balance instead of the partner\'s own action');
  // card/seat role check (hard-ish → soft): the verb phrase should not contain the seat's name, the place phrase not the card's
  const seatName = ARCHETYPES[ctx.positionId]?.name, cardName = getComponent(ctx.signatureId)?.name;
  if (seatName && new RegExp(`\\b${seatName}\\b`).test(cell.verb || '')) soft('roles', `the verb phrase names the seat (${seatName})`);
  if (cardName && new RegExp(`\\b${cardName}\\b`).test(cell.place || '')) soft('roles', `the place phrase names the card (${cardName})`);
  return { ok: !flags.some((f) => f.hard), flags };
}

// the four faces of one thing: Too Much and Too Little must read as opposite failures (soft, mechanical proxy: they must differ)
export function lintQuartet(cells) {
  const flags = []; const by = Object.fromEntries(cells.map((c) => [c.status, c]));
  if (by[2] && by[3] && String(by[2].core).slice(0, 80) === String(by[3].core).slice(0, 80)) flags.push({ code: 'faces', detail: 'Too Much and Too Little open identically', hard: true });
  const cores = cells.map((c) => String(c.core || '')); const seen = new Set();
  for (const c of cores) { const k = c.slice(0, 60); if (seen.has(k)) flags.push({ code: 'faces', detail: 'two statuses share an opening', hard: true }); seen.add(k); }
  return { ok: !flags.some((f) => f.hard), flags };
}
