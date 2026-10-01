// THE CELL LINTS — run on every authored cell before it enters the library (item 5: cells are authored with the lints as
// constraints). A flag is a reason to look; a 'hard' flag rejects the cell and the call is re-rolled with the flags named.
// Second edition after Keel's wave-one picks (PICKS_Keel_The_Pour_Wave_One_2026-10-01): the groove moved into the Too Little
// tense line (a wound the person never reported), first person and a pronoun reached glass, labels and map idioms leaked,
// the exemplars' sentences were copied as refrains, and the ask was either pasted whole into the core or left out of it.
import fs from 'node:fs';
import { getComponent } from '../corrections.js';
import { ARCHETYPES } from '../archetypes.js';
import { STATUS_NAMES } from './schema.js';

const words = (t) => String(t || '').split(/\s+/).filter(Boolean).length;
const has = (t, re) => re.test(String(t || ''));
const low = (t) => String(t || '').toLowerCase();
const toks = (t) => low(t).replace(/[’‘]/g, "'").match(/[a-z']+/g) || [];
const unquoted = (t) => String(t || '').replace(/["“”][^"“”]{0,160}["“”]/g, ' ').replace(/(^|\s)'[^']{0,160}'(?=[\s.,;:!?]|$)/g, ' ');

// vocabulary that never reaches a kitchen cell (from the Plain voice's lists, lib/bakeoff/lint.js, and Keel's spec §5)
const HOUSE_WORDS = /\b(?:Spirit|Mind|Emotion|Body|Gestalt|Soul) (?:house|House)\b|\b(?:Intent|Cognition|Resonance|Structure) (?:channel|Channel)\b/;
const JARGON = /\b(?:Balanced|Too Much|Too Little|Unacknowledged|Seed|Bridge|Fruition|Feedback|transient|durable|archetype|Bound|Ambassador|rebalancer|Rebalancer|signature|portal|Gestalt|authorship|agency|expressed through|inner face|outer face|horizon|Aether|diagonal|vertical|reduction)\b/;
const ELEMENTS = /\b(?:Fire|Water|Air|Earth) (?:element|energy)\b|\bthe element of\b/i;
const DIAGNOSIS = /\b(?:anxiety|anxious|depress(?:ion|ed)|trauma(?:tized)?|disorder|narcissis(?:t|tic|m)|codependen(?:t|cy)|burn(?:ed|t)? ?out|dissociat\w+|ptsd|ocd|adhd|bipolar|toxic)\b/i;
const CLINICAL_SOFT = /\b(?:healing|heal|process(?:ing)? (?:it|this|the)|boundar(?:y|ies)|self-care|trigger(?:ed|s)?)\b/i;
const IMPERATIVE = /\byou (?:must|should|need to|have to|ought to)\b/i;
const HISTORY = /\b(?:years ago|a while ago|for (?:weeks|months|years)|you learned early|at some point you|when you were (?:a kid|young|small|little)|your (?:sister|brother|mother|father|ex|partner|boss)\b|because that(?:'s| is) how you stay safe|you stopped believing)\b/i;
// THE WOUND (Keel §1): a cause given to a status. Too Little says WHERE the person stands — at a door already behind them —
// never WHY. "It cost / taught / went badly / hurt / was lost" is fabricated biography wearing the map's clothes.
const WOUND = /\bcost\b|\btaught you\b|went (?:badly|wrong)|didn'?t (?:go well|end well|take|pay|save|hold|work out|last)|\bhurt\b|\bpunish\w*|\bburned\b|\bbetray\w*|\bthere was a time\b|\bsomewhere (?:back there|behind you)\b|\bback there,? \w+ing\b|\bwent (?:unanswered|unrewarded|unmet)\b/i;
const MOTIVE = /\bfor safety\b|\bfor an audience\b|\bso you never (?:have|had) to\b|\btheft\b|\bgrievance\b|\bto be safe\b|\bso (?:no one|nobody) can\b|\bso it can'?t hurt\b/i;
const FIRST_PERSON = /(?:^|[^A-Za-z'])(?:I|I'm|I'd|I've|I'll|we|we're|we'd|we've|me|my|us|our)(?=[\s,.;:!?])/;
const PRONOUN = /\b(?:he|she|him|her|his|hers|himself|herself)\b/i;
const LABEL = /^\s*(?:present|future|past|now|disowned(?: present)?|balanced|too (?:much|little)|unacknowledged)\s*(?:[—–:\-.,]|$)/i;
const OFFER_LABEL = /\boffer\s*:/i;
const GLASS = /\bmedicine\b|\bthe reader\b|\bstars?\b|\bdisowned present\b|\bempty (?:tank|place|room|seat|spot|part|chair|space|side|well)\b|\bthe map\b|\bthe house\b|\bthe deck\b|\btarot\b|\bcard\b/i;
const STOCK = /your own read on things comes back, trusted again|the helm(?:'s| is) yours|the rest is yours|kneeling at the kitchen table/i;
const REFRAINS = [/what comes back is/i, /door that'?s already behind you/i, /pen down in a room/i, /room you'?re already writing/i, /here with the pen/i, /the way back isn'?t/i, /the way back is (?:smaller|simpler|shorter)/i, /if you want it:/i, /\bweather\b/i];   // 'weather' — Fable's own tic for the disowned present (23 wave-one cells); the founder: 'weather, weather, weather'
const LEAK = /\b(?:social security|date of birth|\bSSN\b|credit card|password|bank account|phone number)\b/i;
const TENSE_WORDS = { 2: /\b(?:ahead|forecast|bracing|before it|not yet|next|will|future|racing|pre-?spend|ahead of|already deciding|about to)\b/i, 3: /\b(?:behind|already|was|used to|should have|back there|still (?:standing|holding)|past|stopped|hasn'?t|ended|over)\b/i, 4: /\b(?:already|without (?:noticing|counting|saying)|as if|not (?:yours|counting)|running|doing it|haven'?t (?:said|claimed|noticed)|disown|by itself|circumstance|happening to you)\b/i, 1: /\b(?:now|here|yours|free to|next|steady|with the pen|working|holding|right now|today)\b/i };
const STOP = new Set('about after again their there these those which while would could should where when what your with that this from into than then them they have been were will just more some only very over part life things thing'.split(' '));

// the exemplars' own sentences, as 5-grams: the author is told "never copy a sentence" and did; the machine checks now
let EXEMPLAR_GRAMS = null;
function exemplarGrams() {
  if (EXEMPLAR_GRAMS) return EXEMPLAR_GRAMS;
  EXEMPLAR_GRAMS = new Set();
  try { const t = toks(fs.readFileSync('data/pour/exemplars_worked_cells.md', 'utf8')); for (let i = 0; i + 5 <= t.length; i++) EXEMPLAR_GRAMS.add(t.slice(i, i + 5).join(' ')); } catch {}
  return EXEMPLAR_GRAMS;
}
function sharedExemplarGram(text) {
  const g = exemplarGrams(); if (!g.size) return null; const t = toks(text);
  for (let i = 0; i + 5 <= t.length; i++) { const k = t.slice(i, i + 5).join(' '); if (g.has(k)) return k; }
  return null;
}

// cell: { status, tense, verb, place, ask, core, sheetLine }; ctx: { signatureId, positionId, partner, partnerId }
export function lintCell(cell, ctx = {}) {
  const flags = []; const hard = (code, detail) => flags.push({ code, detail, hard: true }); const soft = (code, detail) => flags.push({ code, detail, hard: false });
  const all = [cell.tense, cell.verb, cell.place, cell.ask, cell.core, cell.sheetLine].join('\n');
  const glassText = [cell.ask, cell.core, cell.sheetLine].join('\n');   // what reaches the person
  for (const f of ['tense', 'verb', 'place', 'ask', 'core', 'sheetLine']) if (!String(cell[f] || '').trim()) hard('missing', `no ${f}`);
  const n = words(cell.core); if (n && (n < 100 || n > 170)) hard('length', `core ${n} words (120–160): ${n < 100 ? 'thin — say what this looks like going well here before the fault' : 'long'}`); else if (n && (n < 120 || n > 160)) soft('length', `core ${n} words (120–160)`);
  const sl = words(cell.sheetLine); if (sl > 18) soft('length', `sheetLine ${sl} words (≤18)`);
  const an = words(cell.ask); if (an > 60) hard('length', `ask ${an} words (≤40)`); else if (an > 40) soft('length', `ask ${an} words (≤40)`);
  const tn = words(cell.tense); if (tn && tn < 6) hard('label', `tense line is ${tn} word(s) — a label, not a sentence`);
  if (has(cell.tense, LABEL)) hard('label', `tense line opens with a label: "${String(cell.tense).slice(0, 30)}"`);
  if (has(all, OFFER_LABEL)) hard('label', '"Offer:" printed');
  // vocabulary (hard): house/channel names, jargon, elements as elements, map idioms on glass
  const v = [];
  for (const [re, label] of [[HOUSE_WORDS, 'house/channel name'], [JARGON, 'the map\'s jargon'], [ELEMENTS, 'an element as an element']]) { const m = all.match(re); if (m) v.push(`${label}: "${m[0]}"`); }
  if (v.length) hard('vocab', v.join('; '));
  const gm = all.match(GLASS); if (gm) hard('glass', `"${gm[0]}" — a map idiom, a product name or a tarot word on glass`);
  // other card names (hard): any of the 78 names other than the drawn card's and the partner's
  const own = new Set([ctx.signatureId, ctx.partnerId].filter((x) => x != null).map((id) => getComponent(id)?.name));
  const other = [];
  for (let i = 0; i < 78; i++) { const nm = getComponent(i)?.name; if (!nm || own.has(nm) || nm.length < 4) continue; if (new RegExp(`\\b${nm}\\b`).test(all)) other.push(nm); }
  if (other.length) hard('names', `another card's name on glass: ${other.slice(0, 4).join(', ')}`);
  if (has(all, DIAGNOSIS)) hard('diagnosis', `"${all.match(DIAGNOSIS)[0]}"`);
  if (has(all, CLINICAL_SOFT)) soft('diagnosis', `"${all.match(CLINICAL_SOFT)[0]}" — clinic-adjacent`);
  if (has(all, IMPERATIVE)) hard('imperative', `"${all.match(IMPERATIVE)[0]}"`);
  if (has(all, HISTORY)) hard('history', `"${all.match(HISTORY)[0]}" — a cell knows no one's past`);
  // the wound (hard at Too Little, where it was found 43 times; soft elsewhere as a cause/hunch)
  const wm = (cell.tense + '\n' + cell.core).match(WOUND);
  if (wm) (cell.status === 3 ? hard : soft)('wound', `"${wm[0]}" — a cause given to a status; Too Little says where the person stands, never why`);
  const mm = all.match(MOTIVE); if (mm) hard('hunch', `"${mm[0]}" — a motive the cell cannot know`);
  // voice (hard): no "I"; no third-person pronoun for anyone
  const uq = unquoted(all);
  if (has(uq, FIRST_PERSON)) hard('person', `first person: "${uq.match(FIRST_PERSON)[0].trim()}" — a cell has no I; the Reader may add one live`);
  if (has(uq, PRONOUN)) hard('person', `"${uq.match(PRONOUN)[0]}" — no he/she for the partner or anyone`);
  if (has(all, STOCK)) hard('stock', `"${all.match(STOCK)[0]}"`);
  for (const re of REFRAINS) { const m = glassText.match(re); if (m) { hard('refrain', `"${m[0]}" — a house refrain; a person who draws twice meets it twice`); break; } }
  const eg = sharedExemplarGram(glassText); if (eg) hard('refrain', `five words in a row from an exemplar: "${eg}"`);
  if (has(all, LEAK)) hard('leak', `"${all.match(LEAK)[0]}"`);
  // the tense leads (soft): the tense sentence should carry its status's time
  if (cell.status && TENSE_WORDS[cell.status] && !TENSE_WORDS[cell.status].test(cell.tense || '')) soft('tense', `the tense sentence does not read as ${STATUS_NAMES[cell.status]}'s time`);
  // Balanced has an ask (hard)
  if (cell.status === 1 && words(cell.ask) < 6) hard('growth', 'a Balanced cell carries a growth ask');
  // the ask names a real move, not "be more balanced" (soft)
  if (/\b(?:be more balanced|find balance|restore balance|rebalance)\b/i.test(cell.ask || '')) soft('ask', 'the ask names balance instead of the partner\'s own action');
  // the ask lands in the seat (soft): it shares a content word with the place phrase
  const placeWords = new Set(toks(cell.place).filter((w) => w.length > 4 && !STOP.has(w))); const askWords = new Set(toks(cell.ask));
  if (placeWords.size && ![...placeWords].some((w) => askWords.has(w))) soft('seat', 'the ask carries no word of the place — the same ask would serve any seat');
  // woven, not pasted, not missing — SOFT both ways: calibrated 2026-10-01 against Keel's labelled cells, word overlap does not
  // separate his 'no ask in core' cells from his clean ones (both sit at 0.0–0.3), and two of his clean calls paste the ask whole.
  // The judgment is semantic; rule 14 is the lever and the judges see it on draw two. These are reasons to look.
  const askHead = low(cell.ask).trim().slice(0, 45); if (askHead.length > 30 && low(cell.core).includes(askHead)) soft('weave', 'the ask is pasted whole into the core — the person reads it twice');
  const tenseHead = low(cell.tense).trim().replace(/[.!?]$/, '').slice(0, 50); if (tenseHead.length > 30 && low(cell.core).slice(60).includes(tenseHead)) soft('weave', 'the tense sentence appears again inside the core');
  const askContent = toks(cell.ask).filter((w) => w.length > 4 && !STOP.has(w)); const coreSet = new Set(toks(cell.core));
  if (askContent.length >= 4 && askContent.filter((w) => coreSet.has(w)).length / askContent.length < 0.1) soft('weave', 'the ask may not be in the core — the core is what the Reader stands on');
  // paragraphing (soft): a core with two paragraphs separates them with a blank line
  if (/[^\n]\n[^\n]/.test(String(cell.core || '')) && !/\n\n/.test(String(cell.core || ''))) soft('format', 'paragraphs run together (single line break)');
  // card/seat role check (soft): the verb phrase should not contain the seat's name, the place phrase not the card's
  const seatName = ARCHETYPES[ctx.positionId]?.name, cardName = getComponent(ctx.signatureId)?.name;
  if (seatName && new RegExp(`\\b${seatName}\\b`).test(cell.verb || '')) soft('roles', `the verb phrase names the seat (${seatName})`);
  if (cardName && new RegExp(`\\b${cardName}\\b`).test(cell.place || '')) soft('roles', `the place phrase names the card (${cardName})`);
  return { ok: !flags.some((f) => f.hard), flags };
}

// the four faces of one thing: the shape holds (verb and place constant, tense and ask move) and the faces differ
export function lintQuartet(cells) {
  const flags = []; const by = Object.fromEntries(cells.map((c) => [c.status, c]));
  if (by[2] && by[3] && String(by[2].core).slice(0, 80) === String(by[3].core).slice(0, 80)) flags.push({ code: 'faces', detail: 'Too Much and Too Little open identically', hard: true });
  const cores = cells.map((c) => String(c.core || '')); const seen = new Set();
  for (const c of cores) { const k = c.slice(0, 60); if (seen.has(k)) flags.push({ code: 'faces', detail: 'two statuses share an opening', hard: true }); seen.add(k); }
  if (new Set(cells.map((c) => low(c.verb).trim())).size > 1) flags.push({ code: 'shape', detail: 'the verb phrase changes with the status — the card is the same card at every status', hard: true });
  if (new Set(cells.map((c) => low(c.place).trim())).size > 1) flags.push({ code: 'shape', detail: 'the place phrase changes with the status — the seat does not move because the person is braced', hard: true });
  const asks = cells.map((c) => low(c.ask).trim().slice(0, 45)); if (new Set(asks).size < asks.length) flags.push({ code: 'faces', detail: 'two statuses share an ask', hard: true });
  return { ok: !flags.some((f) => f.hard), flags };
}

// across a wave: the refrain budget (Keel §2) — no load-bearing phrase in more than one cell in eight — and the seat-swap
// test on the sweep signature's asks (Keel §3a). Returns a report, not flags; a cap breach is a reason to re-pour.
export function lintWave(rows, { cap = 1 / 8 } = {}) {
  const cells = rows.flatMap((r) => r.cells.map((c) => ({ ...c, _sig: r.signature_id, _seat: r.seat })));
  const grams = new Map();
  for (const c of cells) { const t = toks([c.tense, c.ask, c.core].join(' ')); const seen = new Set(); for (let i = 0; i + 4 <= t.length; i++) seen.add(t.slice(i, i + 4).join(' ')); for (const g of seen) grams.set(g, (grams.get(g) || 0) + 1); }
  const limit = Math.max(3, Math.floor(cells.length * cap));
  const refrains = [...grams.entries()].filter(([, n]) => n > limit).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([g, n]) => ({ gram: g, cells: n }));
  // seat-swap: for each signature with ≥ 4 seats, pairs of asks at the same status whose words (all of them — the skeleton is in the small words) overlap ≥ 45%
  const bySig = {}; for (const c of cells) (bySig[c._sig] ||= []).push(c);
  const swaps = [];
  for (const [sig, cs] of Object.entries(bySig)) { const seats = new Set(cs.map((c) => c._seat)); if (seats.size < 4) continue;
    for (const st of [1, 2, 3, 4]) { const at = cs.filter((c) => c.status === st); for (let i = 0; i < at.length; i++) for (let j = i + 1; j < at.length; j++) { const a = new Set(toks(at[i].ask)), b = new Set(toks(at[j].ask)); const inter = [...a].filter((w) => b.has(w)).length; const jac = inter / (a.size + b.size - inter || 1); if (jac >= 0.45) swaps.push({ signature: getComponent(Number(sig))?.name, status: st, seats: [at[i]._seat, at[j]._seat], overlap: Number(jac.toFixed(2)) }); } } }
  return { cells: cells.length, refrainLimit: limit, refrains, seatSwaps: swaps };
}
