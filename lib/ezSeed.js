// THE SEED — what the easy reader is handed about a draw beyond the record (v0.99.530).
// Keel, 2026-09-22: "Seed EZ with what advanced seeds: the computed geometry dossier for the drawn card and its
// rebalancer, the relation lines to every follow-up draw, and the Words to the Whys framing — held from display
// until tapped. Derive, don't interpret; that applies to the model too." Founder: "everything from our corpus that
// helps the reader — ESPECIALLY architecture." A reader handed the counted relations doesn't reach for training-set
// tarot to fill the gaps; the improvising stops and the being in the room is what's left.
//
// Rendered as LINES, never JSON (JSON at the end of a turn gets quoted back on glass — .528/.529). Canon names only
// (the teleology data still carries five pre-rename names and the tarot names; neither leaves this file).
// The retrieval line is included only when it agrees with the record's medicine — one draw, one medicine.

import { buildCardDossier, drawsToCards, formatCardGeometry } from './geometryEngine.js';
import { getArchetypeTeleology, STATUS_FRAMES, INSTANT_RETURN, HOUSES_TELEOLOGY } from './teleology.js';
import { ARCHETYPES } from './archetypes.js';
import { getComponent, getFullCorrection, getCorrectionTargetId } from './corrections.js';

const STATE_KEY = { 1: 'balanced', 2: 'too_much', 3: 'too_little', 4: 'unacknowledged' };
// Pre-rename names still in nirmanakaya_teleological_profiles.json → the canon names (lib/archetypes.js)
const RENAMES = [['Awareness', 'Recognition'], ['Sacrifice', 'Faith'], ['Change', 'Transformation'], ['Balance', 'Tune'], ['Order', 'Authority']];
// The teleology's free text also carries tarot names ("the Sun's clarity", "The Devil isn't evil"). For the 22, each
// traditional name becomes the canon name (case-insensitive); any line still carrying one of the 78 traditional names
// is dropped. New decks carry none of that imagery; none of it reaches the model.
const TAROT = []; const TAROT_ALL = [];
for (let i = 0; i < 78; i++) { const c = getComponent(i); const t = c?.traditional; if (!t) continue; TAROT_ALL.push(t); if (i <= 21 && ARCHETYPES[i]?.name) TAROT.push([t, ARCHETYPES[i].name]); }
const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const TAROT_RX = TAROT_ALL.length ? new RegExp(`\\b(?:${TAROT_ALL.map(esc).join('|')})\\b`, 'i') : null;
const canonName = (s) => {
  let t = RENAMES.reduce((acc, [a, b]) => acc.replace(new RegExp(`\\b${a}\\b`, 'g'), b), String(s || ''));
  for (const [trad, name] of TAROT) t = t.replace(new RegExp(`\\b${esc(trad)}\\b`, 'gi'), name);
  return t;
};
const noTarot = (line) => !(TAROT_RX && TAROT_RX.test(line));
const nameOf = (id) => ARCHETYPES[id]?.name || canonName(getComponent(id)?.name || '');
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// The medicine the record gives (lib/record.js / corrections.js) — the seed must never name a second one.
function recordMedicineName(transient, status) {
  if (status === 1) return null;
  try {
    const trans = getComponent(transient);
    const corr = getFullCorrection(transient, status);
    const id = corr ? getCorrectionTargetId(corr, trans) : null;
    return id != null ? (getComponent(id)?.name || null) : null;
  } catch { return null; }
}

// Teleology facts for one archetype id, as lines. `role` is 'card' | 'parent' | 'seat'.
function archetypeFacts(id, status, role) {
  const t = getArchetypeTeleology(id);
  if (!t) return [];
  const name = nameOf(id);
  const house = t.house ? cap(t.house) : null;
  const command = t.house && HOUSES_TELEOLOGY?.[t.house]?.command;
  const L = [];
  if (role === 'card') L.push(`${name} in the 22: step ${t.step} of 22 — ${t.verb || ''}${t.creates ? ` — ${canonName(t.creates)}` : ''}`);
  else if (role === 'parent') L.push(`Its parent archetype, ${name}: step ${t.step} of 22 — ${t.verb || ''}${t.creates ? ` — ${canonName(t.creates)}` : ''}`);
  else L.push(`The seat's archetype, ${name}: step ${t.step} of 22 — ${t.verb || ''}${t.creates ? ` — ${canonName(t.creates)}` : ''}`);
  if (house && command) L.push(`${role === 'card' ? 'Its' : 'Their'} house command: ${house} — "${command}"`);
  if (role !== 'seat') {
    if (t.governed_by?.name && t.governance_note) L.push(`Governed by ${canonName(t.governed_by.name)}: ${canonName(t.governance_note)}`);
    if (t.sequence?.before?.name || t.sequence?.after?.name) {
      const b = t.sequence.before, a = t.sequence.after;
      L.push(`In sequence: ${b?.name ? `after ${canonName(b.name)} (${canonName(b.relationship)})` : ''}${b?.name && a?.name ? '; ' : ''}${a?.name ? `before ${canonName(a.name)} (${canonName(a.relationship)})` : ''}`);
    }
    if (t.teaching) L.push(`Its teaching: ${canonName(t.teaching)}`);
    if (t.question) L.push(`The question it asks: ${canonName(t.question)}`);
  }
  return L;
}

// `draws`: every draw in the conversation so far ({transient, position, status}); `index`: which one this turn is about.
export function seedParts({ question = null, draws = [], index = 0, pointer = false } = {}) {
  const draw = draws[index];
  if (!draw) return { block: '', lines: '' };
  const L = [];
  // 1. the geometry — computed, rendered as lines. A POINTER (a locating card, .561) carries no medicine lines: the
  // Reader prescribed the pointer's own medicine from these lines; the pointer points, the original card's medicine re-lands.
  try {
    const cards = drawsToCards(draws);
    const d = buildCardDossier({ question, cards, index });
    const geo = formatCardGeometry(d).split('\n').filter((l) => l.startsWith('- ')).map((l) => canonName(l.slice(2))).filter((l) => !(pointer && /^Medicine:/.test(l)));
    if (geo.length) { L.push('GEOMETRY (computed):'); L.push(...geo.map((l) => `  ${l}`)); }
  } catch {}
  // 2. the teleology — the card (or its parent archetype), the seat, the status frame
  try {
    const T = [];
    const stateKey = STATE_KEY[draw.status];
    const comp = getComponent(draw.transient);
    if (draw.transient <= 21) {
      T.push(...archetypeFacts(draw.transient, draw.status, 'card'));
      const t = getArchetypeTeleology(draw.transient);
      const onStatus = t?.status_specific?.[stateKey];
      if (onStatus) T.push(`On this status: ${canonName(onStatus)}`);
      const route = t?.retrieval_routes?.[stateKey];
      const medicine = recordMedicineName(draw.transient, draw.status);
      if (!pointer && route?.name && medicine && canonName(route.name) === medicine && route.instruction) T.push(`Retrieval: ${canonName(route.instruction)}`);
    } else if (comp?.archetype != null) { // bounds and agents: the parent archetype (corrections.js: `archetype`)
      T.push(...archetypeFacts(Number(comp.archetype), draw.status, 'parent'));
    }
    if (draw.position != null && draw.position !== draw.transient) T.push(...archetypeFacts(draw.position, draw.status, 'seat'));
    const frame = STATUS_FRAMES?.[stateKey];
    if (frame?.vector) T.push(`Status frame: ${frame.vector}${frame.location ? ` — ${frame.location}` : ''}${frame.creation_type ? `; ${frame.creation_type}` : ''}`);
    if (INSTANT_RETURN) T.push(`The instant return (the house's own words, if they serve): "${INSTANT_RETURN}"`);
    if (T.length) { L.push('TELEOLOGY (from the map):'); L.push(...T.map((l) => `  ${l}`)); }
  } catch {}
  const lines = L.filter(noTarot).join('\n');
  if (!lines) return { block: '', lines: '' };
  const block = `[[THE GEOMETRY AND TELEOLOGY OF THIS DRAW — computed from the map, complete. This is the whole geometry of this draw: any ring, stage, sum, distance, partner or term not written here does not exist for this reading. Use it in your reasoning. Never reproduce these lines. In the plain and grown registers none of this vocabulary reaches the person — only its felt meaning; in map, deep and mystical you may name what you use.]]\n${lines}`;
  return { block, lines };
}

export function seedBlock(opts) { return seedParts(opts).block; }
