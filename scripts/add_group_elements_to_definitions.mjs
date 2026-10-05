// ONE-SHOT (2026-10-05): write the eight Being/Identity groups' ELEMENTS into the record, per the founder's ruling relayed by Keel
// (RULING_Being_And_Identity_Elements_Two_Pure_Poles_2026-10-04.md): Kindle Fire · Passage Water · Vessel Air · Mantle Earth;
// Conviction Fire · Intimacy Water · Exploration Air · Composure Earth. Fortitude and Compassion are the two pure poles. Until today the
// code carried no element for these groups and two seats guessed differently (True: Vessel Water / Passage Air — the wrong guess).
// The file's formatting is checked before writing: if it is not JSON.stringify(…, null, 2) output, the script stops and says so.
//   npx tsx scripts/add_group_elements_to_definitions.mjs
import fs from 'node:fs';
const path = 'lib/data/nirmanakaya_78_definitions.json';
const raw = fs.readFileSync(path, 'utf8');
const d = JSON.parse(raw);
const same = JSON.stringify(d, null, 2) === raw.replace(/\r\n/g, '\n').replace(/\n$/, '');
if (!same) { console.error('the file is not in JSON.stringify(null, 2) form — not rewriting it blind'); process.exit(1); }
const { BEING_GROUPS, IDENTITY_GROUPS } = await import('../lib/constants.js');
const ELEMENTS = { being: { Mantle: 'Earth', Kindle: 'Fire', Vessel: 'Air', Passage: 'Water' }, identity: { Composure: 'Earth', Conviction: 'Fire', Exploration: 'Air', Intimacy: 'Water' } };
const pack = (groups, els) => Object.fromEntries(Object.entries(groups).map(([k, g]) => [k, { element: els[k], verb: g.verb, question: g.question, members: g.members, stages: g.stages }]));
d.groups = {
  _note: 'The Being (What?) and Identity (Who?) groups of the Forty-Fold Seal with their ELEMENTS, founder-ruled 2026-10-04 via Keel (RULING_Being_And_Identity_Elements_Two_Pure_Poles): Kindle Fire, Passage Water, Vessel Air, Mantle Earth; Conviction Fire, Intimacy Water, Exploration Air, Composure Earth. Fortitude (Earth in all four dimensions) and Compassion (Water in all four) are the two pure poles; no all-Fire or all-Air archetype exists. Practice: Spirit Fire, Mind Air, Emotion Water, Body Earth. Activity: Intent Fire, Cognition Air, Resonance Water, Structure Earth. Members and stages mirror lib/constants.js. Added 2026-10-05 so the element can never again be guessed from the names (two seats guessed differently).',
  practice: { Spirit: { element: 'Fire' }, Mind: { element: 'Air' }, Emotion: { element: 'Water' }, Body: { element: 'Earth' } },
  activity: { Intent: { element: 'Fire' }, Cognition: { element: 'Air' }, Resonance: { element: 'Water' }, Structure: { element: 'Earth' } },
  being: pack(BEING_GROUPS, ELEMENTS.being),
  identity: pack(IDENTITY_GROUPS, ELEMENTS.identity),
};
d._meta.groupElements = { ruled: '2026-10-04', applied: '2026-10-05', source: 'RULING_Being_And_Identity_Elements_Two_Pure_Poles_2026-10-04.md (Keel, on the founder\'s word)' };
fs.writeFileSync(path, JSON.stringify(d, null, 2) + (raw.endsWith('\n') ? '\n' : ''));
console.log('wrote groups + _meta.groupElements; being:', JSON.stringify(ELEMENTS.being), 'identity:', JSON.stringify(ELEMENTS.identity));
