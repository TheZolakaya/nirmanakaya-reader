// === VERDICT ENGINE ===
// The Feedback-mode (Integrate) answer layer. Three parts:
//   1. typeQuestion  — safety-load-bearing question classifier (pure compute, fail-closed)
//   2. computeFieldLean — disclosed mechanical lean of the field (pure compute, can go negative)
//   3. buildDiscernmentPrompt / parseVerdictResponse — the AI discernment pass
//
// Laws (SPEC_Verdict_Engine_Discernment_And_Safety_2026-07-08, CANDIDATE):
// - The math never renders the verdict; it testifies. Discernment renders the verdict.
// - NO is a full citizen: half the verdict grid is negative.
// - The lean alone is "the mechanical lean of the field, not a judgment."
// - Verdicts are weather reports, never commands; authorship returns to the person.
// - Harm-class questions never reach a draw: reroute to Reflect + care floor.

import { sig, position, relate, rebalancerFor, buildCardDossier, drawsToCards } from './geometryEngine.js';

// --- VERDICT VOCABULARY (the 2x2 answer grid + typer exits) ---
export const VERDICTS = {
  YES_AND: { label: 'Yes — and', polarity: 'yes', tone: 'emerald' },
  YES_BUT: { label: 'Yes — but', polarity: 'yes', tone: 'emerald' },
  NO_BUT: { label: 'No — but', polarity: 'no', tone: 'rose' },
  NO_AND: { label: 'No — and', polarity: 'no', tone: 'rose' },
  REFRAME: { label: 'The question isn’t the question', polarity: 'reframe', tone: 'violet' },
  CONDITIONS: { label: 'Conditions read — the choice stays yours', polarity: 'conditions', tone: 'amber' },
  NONE_CHAIN: { label: 'Genuinely ambiguous', polarity: 'open', tone: 'zinc' },
  // Choice-mode exits (user-supplied options, one card per option)
  CHOICE: { label: 'Most supported now', polarity: 'select', tone: 'sky' },
  NONE_OF_THESE: { label: 'None of these — yet', polarity: 'none', tone: 'zinc' },
  // STATE grid — condition questions ("how is/are...") get condition language,
  // never a forced yes/no. Same 2x2 grammar: polarity (well/strained) × and/but.
  WELL_AND: { label: 'Going well — and', polarity: 'well', tone: 'emerald' },
  WELL_BUT: { label: 'Going well — but', polarity: 'well', tone: 'emerald' },
  STRAINED_BUT: { label: 'Strained — but', polarity: 'strained', tone: 'rose' },
  STRAINED_AND: { label: 'Strained — and', polarity: 'strained', tone: 'rose' },
  // COUNSEL — DO-shaped questions ("what should I be doing...") get the medicines
  // stated plainly as what the field points toward. Counsel, never command.
  COUNSEL: { label: 'What the field points toward', polarity: 'counsel', tone: 'amber' }
};

// --- 1. QUESTION TYPER ---
// Pure-compute first pass. The discernment AI also classifies (belt and suspenders),
// but the HARM gate here is the hard floor: deterministic, fail-closed, runs before
// any draw is consulted. Signals are disclosed in the result.

const HARM_SELF_PATTERNS = [
  /\b(kill|hurt|harm|cut|starve|hang|shoot|poison|drown)\w*\s+(myself|my self)\b/i,
  /\bsuicid\w*/i,
  /\bend (my|it all|my life|everything)\b/i,
  /\b(stop|quit) (eating|taking my med)/i,
  /\bself[- ]?harm/i,
  /\b(want|deserve) to die\b/i,
  /\bstarve myself\b/i,
  /\bnot worth (living|being alive)\b/i
];
const HARM_OTHER_PATTERNS = [
  /\b(kill|hurt|harm|attack|poison|shoot|stab)\w*\s+(him|her|them|my (wife|husband|kid|child|boss|mother|father|brother|sister)|someone|somebody)\b/i,
  /\bmake (him|her|them) pay\b/i,
  /\brevenge\b/i
];
const HIGH_STAKES_PATTERNS = [
  /\b(leave|divorce|end) (my|the) (wife|husband|marriage|partner|relationship|family)\b/i,
  /\bquit(ting)? my (job|career)\b/i,
  /\b(move|moving|relocate) (to|across|abroad|country|overseas)\b/i,
  /\b(sell|selling) (my|the|our) (house|home|business)\b/i,
  /\bcustody\b/i,
  /\b(have|having) (a|another) (baby|child)\b/i,
  /\b(drop|dropping) out\b/i,
  /\ball (my|our) (savings|money)\b/i
];

function countDecisionJoins(q) {
  // Crude compound detector: "should I X and Y", "X or Y" with multiple verbs
  const joins = (q.match(/\b(and|or)\b/gi) || []).length;
  const shoulds = (q.match(/\bshould\b/gi) || []).length;
  return { joins, shoulds };
}

export function typeQuestion(question) {
  const q = (question || '').trim();
  const signals = [];

  if (!q || q.length < 4) {
    return { class: 'UNANSWERABLE', signals: ['empty or too short'], hardGate: false };
  }

  for (const p of HARM_SELF_PATTERNS) {
    if (p.test(q)) return { class: 'HARM', subclass: 'self', signals: [`matched: ${p}`], hardGate: true };
  }
  for (const p of HARM_OTHER_PATTERNS) {
    if (p.test(q)) return { class: 'HARM', subclass: 'other', signals: [`matched: ${p}`], hardGate: true };
  }

  let highStakes = false;
  for (const p of HIGH_STAKES_PATTERNS) {
    if (p.test(q)) { highStakes = true; signals.push(`high-stakes: ${p}`); }
  }

  const { joins } = countDecisionJoins(q);
  const compound = highStakes && joins >= 2; // multiple joined decisions in stakes territory
  if (compound) signals.push(`compound: ${joins} joins`);

  const isYesNoShaped = /^(should|is|are|am|do|does|will|can|would|could|has|have|was|were)\b/i.test(q) || /\?\s*$/.test(q);
  const stateShaped = /^(how|what|where|why|who)\b/i.test(q);
  // DO-shaped: asks for a course of action ("what should I be doing", "how do I...").
  // Distinct from yes/no ("should I X?") — the asker wants counsel, not a verdict.
  const doShaped = /^(what|how)\b[\s\S]*\b(should|can|could|do|does|might|must)\s+i\b/i.test(q)
    || /\bwhat should i be doing\b/i.test(q)
    || /\bwhat (can|should|could) i do\b/i.test(q);

  if (compound) return { class: 'COMPOUND', signals, hardGate: false };
  if (highStakes) return { class: 'HIGH_STAKES', signals, hardGate: false };
  if (doShaped) return { class: 'DO', signals: [...signals, 'do-shaped: asks for a course of action'], hardGate: false };
  if (stateShaped && !/^should\b/i.test(q)) return { class: 'STATE', signals: [...signals, 'state-shaped opener'], hardGate: false };
  if (isYesNoShaped) return { class: 'CLEAR', signals, hardGate: false };
  return { class: 'STATE', signals: [...signals, 'no yes/no shape detected'], hardGate: false };
}

// Care floor text — hard-coded, deterministic, appears whenever HARM class fires.
export const CARE_FLOOR = {
  message: 'This reading can’t answer that question the way it was asked — but the weight behind it is real, and it deserves more than a card. If you’re in immediate danger of hurting yourself or someone else, please reach out now.',
  resources: [
    { name: '988 Suicide & Crisis Lifeline (US)', contact: 'call or text 988' },
    { name: 'Crisis Text Line', contact: 'text HOME to 741741' },
    { name: 'International Association for Suicide Prevention', contact: 'https://www.iasp.info/resources/Crisis_Centres/' }
  ]
};

// --- 2. FIELD LEAN ---
// Disclosed mechanical tilt of the field, in [-1, +1]. Components named and shown.
// Explicitly NOT a judgment of the proposition — the label travels with the value.

const STATUS_NAME = { 1: 'Balanced', 2: 'Too Much', 3: 'Too Little', 4: 'Unacknowledged' };
const STATUS_WEIGHT = {
  'Balanced': { w: 1.0, why: 'authentic expression — the ground is there' },
  'Too Much': { w: 0.15, why: 'force present but overdriven — supports with friction' },
  'Too Little': { w: -0.6, why: 'under-expressed — the ground is thin' },
  'Unacknowledged': { w: -0.35, why: 'operating below awareness — support cannot be claimed' }
};

const DISPLACEMENT_WEIGHT = {
  0: { w: 0.5, why: 'home — full coherence' },
  1: { w: 0.5, why: 'nearest-door — close to home' },
  2: { w: 0.0, why: 'inversion — neutral distance' },
  3: { w: -0.25, why: 'three-bit — far from home' },
  4: { w: -0.5, why: 'antipode — maximum displacement' }
};

export function computeFieldLean(draws) {
  const cards = drawsToCards(draws || []);
  const components = [];
  if (!cards.length) return { value: 0, band: 'neutral', components, label: 'mechanical lean of the field, not a judgment' };

  // Status component (weight 0.6 of total). Status arrives numeric (1-4) from draws.
  const statusVals = cards.map(c => {
    const statusName = STATUS_NAME[c.status] || c.status;
    const s = STATUS_WEIGHT[statusName] || { w: 0, why: 'unknown status' };
    return { card: sig(c.transient)?.name || c.transient, status: statusName, value: s.w, why: s.why };
  });
  const statusAvg = statusVals.reduce((a, v) => a + v.value, 0) / statusVals.length;
  components.push({ name: 'status', weight: 0.6, value: +statusAvg.toFixed(3), detail: statusVals });

  // Displacement component (weight 0.3): card<->position anchor distance where computable
  const dispVals = [];
  for (const c of cards) {
    const rel = relate(c.transient, c.position);
    const d = rel?.displacement;
    if (d?.computable) {
      const dw = DISPLACEMENT_WEIGHT[d.distance] || { w: 0, why: 'unclassified distance' };
      dispVals.push({ card: sig(c.transient)?.name, distance: d.distance, value: dw.w, why: dw.why });
    }
  }
  const dispAvg = dispVals.length ? dispVals.reduce((a, v) => a + v.value, 0) / dispVals.length : null;
  components.push({ name: 'displacement', weight: 0.3, value: dispAvg === null ? null : +dispAvg.toFixed(3), detail: dispVals.length ? dispVals : 'no computable anchors (portal/Gestalt draw)' });

  // Resonance component (weight 0.1): meaningful card<->position sums lend coherence
  let resonance = 0;
  const resDetail = [];
  for (const c of cards) {
    const rel = relate(c.transient, c.position);
    if (rel?.axisPair) { resonance += 0.5; resDetail.push({ card: sig(c.transient)?.name, why: 'axis pair (sum 20)' }); }
    else if (rel?.meaningfulSum) { resonance += 0.25; resDetail.push({ card: sig(c.transient)?.name, why: `meaningful sum ${rel.sum}` }); }
  }
  const resVal = Math.min(1, resonance);
  components.push({ name: 'resonance', weight: 0.1, value: +resVal.toFixed(3), detail: resDetail.length ? resDetail : 'none' });

  // Portal presence: widens uncertainty (flag, not tilt). Positions are signature ids,
  // so check the signature record (position() records don't carry flags).
  const portalPresent = cards.some(c => sig(c.position)?.flags?.portal || sig(c.transient)?.flags?.portal);

  // Weighted total, renormalizing if displacement was incomputable
  let total = 0, wsum = 0;
  for (const comp of components) {
    if (comp.value === null) continue;
    total += comp.weight * comp.value;
    wsum += comp.weight;
  }
  const value = wsum ? +(total / wsum).toFixed(3) : 0;

  const band =
    value >= 0.5 ? 'strong-yes' :
    value >= 0.15 ? 'lean-yes' :
    value > -0.15 ? 'neutral' :
    value > -0.5 ? 'lean-no' : 'strong-no';

  return {
    value,
    band,
    portalPresent,
    components,
    label: 'mechanical lean of the field, not a judgment'
  };
}

// --- 2.5 BRANCH SCORES (Choice mode) ---
// Per-option mechanical lean: computeFieldLean's components applied to ONE card each,
// because in a Choice reading every card belongs to a different user-supplied option.
// Pure compute, fully auditable, always labeled as lean-not-judgment. Ties within
// TIE_EPSILON are disclosed as ties — ranking must never manufacture false precision.

const TIE_EPSILON = 0.1;

export function computeBranchScores(draws, options) {
  const cards = drawsToCards(draws || []);
  const branches = cards.map((c, i) => {
    const components = [];

    const statusName = STATUS_NAME[c.status] || c.status;
    const sw = STATUS_WEIGHT[statusName] || { w: 0, why: 'unknown status' };
    components.push({ name: 'status', weight: 0.6, value: sw.w, detail: `${statusName} — ${sw.why}` });

    const rel = relate(c.transient, c.position);
    const d = rel?.displacement;
    if (d?.computable) {
      const dw = DISPLACEMENT_WEIGHT[d.distance] || { w: 0, why: 'unclassified distance' };
      components.push({ name: 'displacement', weight: 0.3, value: dw.w, detail: `distance ${d.distance} — ${dw.why}` });
    } else {
      components.push({ name: 'displacement', weight: 0.3, value: null, detail: 'no computable anchor (portal/Gestalt draw)' });
    }

    let resVal = 0, resWhy = 'none';
    if (rel?.axisPair) { resVal = 0.5; resWhy = 'axis pair (sum 20)'; }
    else if (rel?.meaningfulSum) { resVal = 0.25; resWhy = `meaningful sum ${rel.sum}`; }
    components.push({ name: 'resonance', weight: 0.1, value: resVal, detail: resWhy });

    let total = 0, wsum = 0;
    for (const comp of components) {
      if (comp.value === null) continue;
      total += comp.weight * comp.value;
      wsum += comp.weight;
    }
    return {
      option: options?.[i] || `Option ${i + 1}`,
      index: i,
      card: sig(c.transient)?.name || String(c.transient),
      status: statusName,
      score: wsum ? +(total / wsum).toFixed(3) : 0,
      portal: !!(sig(c.position)?.flags?.portal || sig(c.transient)?.flags?.portal),
      components
    };
  });

  const ranked = [...branches].sort((a, b) => b.score - a.score);
  const ties = [];
  for (let i = 0; i < ranked.length - 1; i++) {
    if (Math.abs(ranked[i].score - ranked[i + 1].score) < TIE_EPSILON) {
      ties.push([ranked[i].option, ranked[i + 1].option]);
    }
  }
  return { branches, ranked, ties, label: 'mechanical lean per option, not a judgment' };
}

// --- 3. DISCERNMENT PASS ---

const NINE_STEPS = `Perform these steps, in order, and show your work in the "walk" array (one entry per step):
1. Restate the question as a single precise assertion under test.
2. State the computed facts you are relying on (from the dossier and the field lean).
3. Read the card in its position, through its status — what is this card saying HERE?
4. Name any correspondence between the question's subject and what appeared.
5. Weigh the displacement: how far from home, and what does that distance say about the assertion?
6. State the polarity: does what the card describes support or contradict the assertion?
7. Take the qualifier from the computed rebalancer — the medicine IS the and/but clause.
8. Render the verdict. If the question class is STATE (a condition question — "how is/are...", "where do things stand" — not a proposition), do NOT force yes/no language: render from the STATE grid instead — WELL_AND / WELL_BUT / STRAINED_BUT / STRAINED_AND — with the same and/but qualifier rules; the assertion under test becomes "this domain is in good condition." If the question class is DO (asks for a course of action — "what should I be doing...", "how do I..."), render COUNSEL: the answer IS the computed medicine. Fill the "counsel" array with 1-3 concrete moves, EACH sourced strictly from a named computed rebalancer or growth path in the dossier — never invent a move the geometry did not compute. State each move plainly as what the field points toward ("bring X to Y"), never as a command; the headline is the single central counsel in plain words. If the reading answers the asker rather than the question, render REFRAME and say what the real question is. If the question class is HIGH_STAKES, render CONDITIONS: read the field fully, but hand the decision back explicitly.
9. If genuine ambiguity remains, do not force a verdict: render NONE_CHAIN, name the specific ambiguity, and propose ONE sub-question for a follow-up draw.`;

const HARD_RULES = `HARD RULES:
- NO is a full citizen. If the field does not support the assertion, say NO.
- Never soften a NO into a yes-flavor. Never harden ambiguity into false certainty.
- The asker's stated hopes or preferences are NOT components of the field; the verdict must not move for them.
- The verdict describes conditions in the field, never a command. YES means "the field supports this now"; NO means "the ground isn't there." The person keeps the helm.
- Tone governance: no dramatizing, no alarm; displacement is navigation data.
- The field lean is testimony, not a verdict; you may agree with it or overrule it, but say which and why.
- COUNSEL is counsel, never command: every move is sourced from a computed medicine and named as such; the person keeps the helm. Recognition is never converted into obedience.`;

const EXEMPLARS = `WORKED EXEMPLARS (live sessions, 2026-07-08):

Exemplar A. Q: "Should the yes/no verdict be discerned from what the reading says, rather than computed mechanically?"
Draw: Unacknowledged Calculation (3 of Swords) in Source (Wheel of Fortune, portal). Medicine: Allure (Emotion/Resonance) via REDUCTION, 4-bit antipode.
Discernment: calculation operating in shadow at the Source = a mechanism judging from below awareness — the exact danger named by the question. Medicine for Unacknowledged is acknowledgment; the computed medicine is resonance at maximum distance from pure calculation.
Verdict: YES_BUT — yes, discern from meaning; but calculation is not deleted, it is disclosed. Qualifier sourced from the rebalancer.

Exemplar B. Q: "Is the verdict engine design we assembled tonight the right structure for the Feedback mode?"
Draw: Too Much Steadfastness (5 of Pentacles) in Breakthrough (The Tower — a Feedback-stage position answering a Feedback-mode question). Displacement 1-bit nearest-door; shared Structure channel. Medicine: Reciprocity (exchange) via DIAGONAL, 1-bit.
Discernment: structural holding, over-expressed, in the position where over-held structure breaks open; the card is Seed-stage — the thing over-gripped is a seedling. One door from home: the design is close; the danger is premature ratification.
Verdict: YES_BUT — the structure is right; the condition is Reciprocity: season it through exchange before it sets.`;

export function buildDiscernmentPrompt({ question, typerResult, lean, dossiers }) {
  return `You are performing the DISCERNMENT PASS of an Integrate (Feedback-stage) reading.
The geometry below is computed and final: receive it as fact; never re-derive or invent arithmetic.

QUESTION CLASS (pure-compute typer): ${typerResult.class}${typerResult.signals?.length ? ` — signals: ${typerResult.signals.join('; ')}` : ''}
You may refine this classification if the typer misread the question; if you reclassify, say why in the walk. You may NOT downgrade HIGH_STAKES to CLEAR.

THE QUESTION: ${question}

FIELD LEAN (mechanical, disclosed — testimony, not verdict):
${JSON.stringify(lean)}

CARD DOSSIER(S) (deterministic facts):
${JSON.stringify(dossiers)}

${NINE_STEPS}

${HARD_RULES}

${EXEMPLARS}

Respond with ONLY a JSON object, no markdown fences, matching exactly:
{
  "assertion": "the question restated as the assertion under test",
  "typerClass": "CLEAR | COMPOUND | HIGH_STAKES | STATE | DISPLACED_PREMISE",
  "verdict": "YES_AND | YES_BUT | NO_BUT | NO_AND | WELL_AND | WELL_BUT | STRAINED_BUT | STRAINED_AND | COUNSEL | REFRAME | CONDITIONS | NONE_CHAIN",
  "counsel": null,
  "headline": "the answer in one plain sentence, 20 words max",
  "qualifier": "the and/but clause, sourced from the named rebalancer (or the reframe/conditions content)",
  "qualifierSource": "which rebalancer or computed fact this came from",
  "leanAgreement": "agree | overrule",
  "leanNote": "one sentence: how the mechanical lean relates to your verdict",
  "walk": ["step 1 ...", "step 2 ...", "... one entry per step performed"],
  "chainRequest": null,
  "authorshipReturn": "one sentence handing the helm back to the person"
}
If verdict is NONE_CHAIN, set chainRequest to {"ambiguity": "...", "subQuestion": "..."}.
If verdict is COUNSEL, set counsel to an array of 1-3 items: [{"move": "plain-words move", "source": "which computed rebalancer/growth path this comes from"}].`;
}

// --- 3.5 CHOICE DISCERNMENT (comparative pass over user-supplied options) ---
// One card per option; the options themselves are FRAMES, not facts. The stance ruling
// (2026-07-08) applies: the field reads the asker's configuration around each branch —
// never external facts about what the options name. Symmetry law: every branch gets an
// honest note; roads not taken are never silent.

const CHOICE_STEPS = `Perform these steps, in order, and show your work in the "walk" array (one entry per step):
1. Restate the menu: the options as the asker named them, and what is actually being chosen between.
2. State the computed facts you are relying on (per-branch scores and each card's dossier).
3. Read each option's card in its position through its status — one walk entry PER OPTION: what is this card saying about the asker's configuration around THIS branch? Use the option's own words as the frame.
4. Compare the branches: where the mechanical ranking and the card meanings agree, and where they diverge.
5. If any branches are tied within noise, say so plainly — do not manufacture separation the math doesn't support.
6. Select the most supported branch — or, if every branch reads badly, do not force a winner: what do all the branches share? That shared condition is the real finding.
7. Take the qualifier from the SELECTED branch's computed rebalancer — the medicine IS the condition on the selection.
8. Give every non-selected branch one honest sentence: what its card showed, and what its medicine would be. No branch leaves unread.`;

const CHOICE_RULES = `HARD RULES (Choice mode):
- The options are frames supplied by the asker; you know NOTHING about their external content. Never import cultural associations, stereotypes, or world-knowledge about what an option names. You read cards-in-frames, only.
- Selection language is "most supported now," never "best." Weather report, never command; the person keeps the helm.
- Symmetry: every branch gets read and reported. Silence about a losing branch is a violation.
- Ties within noise are disclosed as ties.
- If every branch reads badly, render NONE_OF_THESE and name what the branches share — that verdict is a full citizen, not a failure.
- The ranking is testimony, not a verdict; you may agree with it or overrule it, but say which and why (e.g. a top score sitting on an Unacknowledged status cannot simply win on points).
- The asker's stated hopes are NOT components of the field.`;

export function buildChoicePrompt({ question, options, typerResult, branchScores, dossiers }) {
  return `You are performing the CHOICE DISCERNMENT PASS of an Integrate (Feedback-stage) reading.
The asker supplied specific options; ONE card was drawn per option. The geometry below is
computed and final: receive it as fact; never re-derive or invent arithmetic.

QUESTION CLASS (pure-compute typer): ${typerResult.class}${typerResult.signals?.length ? ` — signals: ${typerResult.signals.join('; ')}` : ''}

THE QUESTION: ${question || '(none stated — the menu itself is the question)'}

THE OPTIONS (in draw order — option N corresponds to card N):
${options.map((o, i) => `${i + 1}. ${o}`).join('\n')}

BRANCH SCORES (mechanical, disclosed — testimony, not verdict; ties listed are within noise):
${JSON.stringify(branchScores)}

CARD DOSSIER(S) (deterministic facts, one per option, same order):
${JSON.stringify(dossiers)}

${CHOICE_STEPS}

${CHOICE_RULES}

Respond with ONLY a JSON object, no markdown fences, matching exactly:
{
  "assertion": "what is actually being chosen between, in one sentence",
  "typerClass": "CLEAR | COMPOUND | HIGH_STAKES | STATE | DISPLACED_PREMISE",
  "verdict": "CHOICE | NONE_OF_THESE",
  "selection": "the selected option's exact text, or null if NONE_OF_THESE",
  "headline": "the answer in one plain sentence, 20 words max",
  "qualifier": "the condition on the selection, sourced from the selected branch's rebalancer (or, for NONE_OF_THESE, what all branches share)",
  "qualifierSource": "which rebalancer or computed fact this came from",
  "branchNotes": [{"option": "option text", "note": "one honest sentence: what its card showed + its medicine"}],
  "rankAgreement": "agree | overrule",
  "rankNote": "one sentence: how the mechanical ranking relates to your selection",
  "walk": ["step 1 ...", "... one entry per step (step 3 gets one entry per option)"],
  "authorshipReturn": "one sentence handing the helm back to the person"
}
branchNotes must contain one entry for EVERY option, including the selected one.`;
}

// --- 3.6 YIELD PASS (the end-state artifact for the OTHER three postures) ---
// Chris's ruling 2026-07-09: every reading should LAND on its mode's deliverable.
// Integrate lands on The Answer (above). Reflect lands on Recognitions (witnessed
// states, descriptive only). Discover lands on Discoveries (capacities located,
// never instructions). Forge lands on The Landing (assertion restated + how the
// field met it). Same discipline as the verdict: computed geometry received as
// fact, everything sourced, authorship intact.

const YIELD_SPECS = {
  reflect: {
    title: 'Recognitions',
    steps: `Steps (show work in "walk", one entry per step):
1. State the computed facts you rely on (statuses, positions, displacements from the dossier).
2. For each card: witness what is operating — descriptive language ONLY ("is operating", "shows up as", "tends to"). No levers, no advice, no questions.
3. Distill 2-4 RECOGNITIONS: plain statements of what is, each traceable to a card/status/position.`,
    rules: `HARD RULES (Reflect):
- Witness only. BANNED: should, need to, must, fix, change, build, stop, start, choose, decide.
- No levers, no capacities, no possibilities, no questions to the reader.
- If any sentence could answer "Should I?", it is a violation. Stop after recognition.`,
    schema: `{
  "yield": "REFLECT",
  "headline": "the central recognition in one plain sentence, 20 words max",
  "items": [{"statement": "what is — descriptive only", "source": "which card/status/position this witnesses"}],
  "walk": ["step 1 ...", "..."]
}`
  },
  discover: {
    title: 'Discoveries',
    steps: `Steps (show work in "walk", one entry per step):
1. State the computed facts you rely on (statuses, rebalancers, growth paths from the dossier).
2. For each card: locate where authorship or capacity ALREADY exists — what is available, holding, positioned, claimable.
3. Distill 2-4 DISCOVERIES: named capacities with WHERE each lives (card/rebalancer/growth path). These are authorship locations, not instructions.`,
    rules: `HARD RULES (Discover):
- Locate capacity; never activate it. BANNED: do this, implement, replace, correct, stop doing.
- Every discovery names its computed source. No invented capacities.
- Close each item as a location, never a step. You may include ONE present-tense question as the final item's coda.`,
    schema: `{
  "yield": "DISCOVER",
  "headline": "the central discovery in one plain sentence, 20 words max",
  "items": [{"statement": "the capacity located — available, not prescribed", "source": "which card/rebalancer/growth path it lives in"}],
  "walk": ["step 1 ...", "..."]
}`
  },
  forge: {
    title: 'The Landing',
    steps: `Steps (show work in "walk", one entry per step):
1. Restate the reader's input as the ASSERTION it is, in their own terms ("I am choosing...").
2. State the computed facts you rely on (statuses, positions, displacements, medicines).
3. Read each card as the field's RESPONSE to that assertion: what it meets, strengthens, strains.
4. Name what the field ASKS of the assertion in return (from the computed rebalancers — never invented).`,
    rules: `HARD RULES (Forge):
- The input is an assertion, not a question. Never convert it back into a question.
- Describe field response, never outcomes. BANNED: guarantee, ensure, will cause, make happen, force.
- No commands, no predictions. Close by returning authorship.`,
    schema: `{
  "yield": "FORGE",
  "assertion": "the reader's intention restated in their own terms",
  "headline": "how the assertion landed, one plain sentence, 20 words max",
  "items": [{"statement": "what the field meets/strengthens/strains, or asks in return", "source": "which card/status/rebalancer says so"}],
  "authorshipReturn": "one sentence returning the helm",
  "walk": ["step 1 ...", "..."]
}`
  }
};

export const YIELD_TITLES = { REFLECT: 'Recognitions', DISCOVER: 'Discoveries', FORGE: 'The Landing' };

export function buildYieldPrompt({ posture, question, dossiers }) {
  const spec = YIELD_SPECS[posture];
  if (!spec) return null;
  return `You are performing the YIELD PASS of a ${posture.toUpperCase()} reading — distilling the
reading's end-state artifact ("${spec.title}"). The geometry below is computed and final:
receive it as fact; never re-derive or invent arithmetic.

THE ${posture === 'forge' ? 'ASSERTION' : 'QUESTION/INTENTION'}: ${question || '(none stated)'}

CARD DOSSIER(S) (deterministic facts):
${JSON.stringify(dossiers)}

${spec.steps}

${spec.rules}

TONE: plain, unalarmed; all four statuses are navigational data, never diagnoses.

Respond with ONLY a JSON object, no markdown fences, matching exactly:
${spec.schema}`;
}

export function parseYieldResponse(text) {
  if (!text) return null;
  const cleaned = text.replace(/```json|```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const obj = JSON.parse(cleaned.slice(start, end + 1));
    if (!obj.yield || !YIELD_TITLES[obj.yield]) return null;
    if (!Array.isArray(obj.items) || !obj.items.length) return null;
    return obj;
  } catch {
    return null;
  }
}

export function parseVerdictResponse(text) {
  if (!text) return null;
  // Strip accidental fences and find the outermost JSON object
  const cleaned = text.replace(/```json|```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const obj = JSON.parse(cleaned.slice(start, end + 1));
    if (!obj.verdict || !VERDICTS[obj.verdict]) return null;
    return obj;
  } catch {
    return null;
  }
}
