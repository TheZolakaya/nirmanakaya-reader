// THE STATUS SWEEP, PART TWO (drafted 2026-10-05, NOT applied until the founder rules): the Too Little and Too Much lines of every signature
// to the gaveled form — present tense, the capacity not arriving / over-expressing, no cause, no duration, no "cannot", no clinical label.
// 22 texts each (the archetypes), applied by family: every entry whose current line equals an archetype's current line takes its new one.
// Draft to read first: G:\My Drive\For Air Review\DRAFT_Status_Sweep_Too_Little_And_Too_Much_22_of_78_2026-10-05.md
//   npx tsx scripts/apply_status_sweep_tl_tm.mjs                → DRY RUN (counts, no write)
//   npx tsx scripts/apply_status_sweep_tl_tm.mjs --apply tl     → write the Too Little lines only
//   npx tsx scripts/apply_status_sweep_tl_tm.mjs --apply both   → write both
import fs from 'node:fs';
const FILE = 'lib/data/nirmanakaya_78_definitions.json';
const raw = fs.readFileSync(FILE, 'utf8'); const DEFS = JSON.parse(raw);
const APPLY = process.argv.includes('--apply'); const WHICH = (APPLY ? (process.argv[process.argv.indexOf('--apply') + 1] || 'both') : 'both').toLowerCase();
const TL = {
  0: 'Not opening — the next thing is possible and you are not stepping toward it; making from a narrow place while the field is wide.',
  1: 'Not directing — the next move is yours to point and you are letting it drift; "what\'s the point," said before trying.',
  2: 'Not standing on what you already see — asking others to confirm a knowing that has already arrived.',
  3: 'Not tending — nothing is being grown; the care is available and withheld, and the distance is dressed as independence.',
  4: 'Not giving things shape — the pieces are in front of you and you are not sequencing them; nothing is decided, so nothing assembles.',
  5: 'Not carrying the shared thing — no common frame kept or handed on; working out alone what others already know.',
  6: 'Not letting it reach you — feeling kept at the surface; the connection is available and not entered.',
  7: 'Not moving — the want is felt and the first step is not taken; standing at the threshold of a direction already chosen.',
  8: 'Not holding — the weight arrives and you set it down early; the strength is here and you are not bearing with it.',
  9: 'Not practising — the small repeated work is yours to do and you are not showing up to it; the skill left to drift.',
  10: 'Not meeting the turn — standing back from what is arriving, trying to hold still while the wheel moves.',
  11: 'Not claiming what is owed — taking less than your share and letting the unfairness stand unnamed.',
  12: 'Not letting go — holding what is finished past its finish; the grip is tired and still closed.',
  13: 'Not ending what is over — keeping the finished thing in place out of loyalty to what it was; the ending is due and not made.',
  14: 'Not finding the centre — pulled by every engagement and adjusting none of it; the blend left wherever it fell.',
  15: 'Not going under the surface — taking the thing at face value; the pattern is there to be seen and you are not looking at it.',
  16: 'Not letting it fall — propping up a structure that has already stopped holding.',
  17: 'Not facing what you want — the pull is there and you are not turning toward it; the hope kept unlit.',
  18: 'Not letting the picture form — refusing the symbol, distrusting what the dream shows; steering with the lights off.',
  19: 'Not standing in what you have become — dimming it, playing smaller than you are.',
  20: 'Not answering what you already see — the whole pattern is in view and you keep seeking as if it were not.',
  21: 'Not closing the cycle — the work is complete enough to release and you keep it open; arrival deferred.',
};
const TM = {
  0: 'Hovering in the possible — every door kept open and none walked through; all potential, nothing landed.',
  1: 'Forcing the outcome — directing past where direction is yours to give; white-knuckling what has not yet arrived.',
  2: 'Hoarding the knowing — one more input before trusting what has already landed; the veil becomes a wall.',
  3: 'Tending past what is asked — care that controls, gives in order to be needed, lets no edge stand between you and what you tend.',
  4: 'Over-organizing — structure for its own sake; mistaking the container for the thing it was built to hold.',
  5: 'Enforcing the shared frame — conformity demanded; the letter kills the spirit; the windows sealed.',
  6: 'Fusing — feeling with until you no longer tell where you end and the other begins.',
  7: 'Driving past the destination — momentum that does not stop when the place is reached.',
  8: 'Gripping past necessity — strength held after the weight has gone; holding become rigidity.',
  9: 'Refining past the point of use — practice that cannot stop; the isolation treated as the price of mastery.',
  10: 'Carried by the current instead of meeting it — fate in place of choice; the pattern repeating with the cause always somewhere else.',
  11: 'Keeping the books on everyone — every exchange tallied; the relationship reduced to who owes what.',
  12: 'Letting go before it is finished — surrender ahead of completion; the giving-up performed.',
  13: 'Ending things before they have lived — constant upheaval wearing the look of freedom.',
  14: 'Smoothing too soon — harmony before the conflict has been allowed to be real; the distinctions suppressed.',
  15: 'Pattern without end — design seen everywhere, analysis that never arrives; the intellect as a hiding place.',
  16: 'Shattering before its time — nothing allowed to stand; chaos wearing the look of liberation.',
  17: 'Projecting light ahead of the ground — optimism with nothing under it; dazzling rather than illuminating.',
  18: 'Lost in the picture — the dream taken for the thing; the symbol in place of what it stands for.',
  19: 'Inflating — mistaking the ray for the source; shining so that others cannot see.',
  20: 'Judging — recognition hardened into condemnation; the knowing worn as superiority.',
  21: 'Claiming arrival early — completion declared before the journey is done.',
};
const S = DEFS.signatures, P = DEFS.positions || {};
const sweep = (key, NEW, label) => {
  const oldByText = new Map(); for (let i = 0; i < 22; i++) oldByText.set(S[i].states[key], i);
  let sig = 0, pos = 0; const families = {};
  for (const [k, d] of Object.entries(S)) { const cur = d?.states?.[key]; if (typeof cur !== 'string') continue; const a = oldByText.get(cur); if (a === undefined) { console.error(`${label}: NO FAMILY for signature ${k} ${d.name} → ${cur.slice(0, 70)}`); process.exit(2); } if (APPLY) d.states[key] = NEW[a]; sig++; (families[a] ||= []).push(k); }
  for (const [k, p] of Object.entries(P)) { const cur = p?.states?.[key]; if (typeof cur !== 'string') continue; const a = oldByText.get(cur); if (a === undefined) { console.error(`${label}: NO FAMILY for position ${k} ${p.name} → ${cur.slice(0, 70)}`); process.exit(2); } if (APPLY) p.states[key] = NEW[a]; pos++; }
  console.log(`${label}: ${sig} signature lines + ${pos} position lines map to 22 families (${Object.values(families).map((f) => f.length).join(',')})${APPLY ? ' — WRITTEN' : ' — dry run'}`);
};
if (WHICH === 'tl' || WHICH === 'both') sweep('tooLittle', TL, 'Too Little');
if (WHICH === 'tm' || WHICH === 'both') sweep('tooMuch', TM, 'Too Much');
if (APPLY) {
  const same = JSON.stringify(JSON.parse(raw), null, 2) === raw.replace(/\r\n/g, '\n').replace(/\n$/, ''); if (!same) { console.error('file is not JSON.stringify(null,2) form — not writing blind'); process.exit(1); }
  DEFS._meta = DEFS._meta || {}; DEFS._meta.statusSweepTLTM = { applied: new Date().toISOString().slice(0, 10), which: WHICH, draft: 'DRAFT_Status_Sweep_Too_Little_And_Too_Much_22_of_78_2026-10-05.md', rule: 'present tense, the capacity not arriving / over-expressing; no cause, no duration, no cannot, no clinical label' };
  fs.writeFileSync(FILE, JSON.stringify(DEFS, null, 2) + (raw.endsWith('\n') ? '\n' : '')); console.log('written:', FILE);
} else console.log('dry run only — pass --apply tl|tm|both after the founder rules');
