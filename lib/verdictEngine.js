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
  NONE_CHAIN: { label: 'Genuinely ambiguous', polarity: 'open', tone: 'zinc' }
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

  if (compound) return { class: 'COMPOUND', signals, hardGate: false };
  if (highStakes) return { class: 'HIGH_STAKES', signals, hardGate: false };
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

// --- 3. DISCERNMENT PASS ---

const NINE_STEPS = `Perform these steps, in order, and show your work in the "walk" array (one entry per step):
1. Restate the question as a single precise assertion under test.
2. State the computed facts you are relying on (from the dossier and the field lean).
3. Read the card in its position, through its status — what is this card saying HERE?
4. Name any correspondence between the question's subject and what appeared.
5. Weigh the displacement: how far from home, and what does that distance say about the assertion?
6. State the polarity: does what the card describes support or contradict the assertion?
7. Take the qualifier from the computed rebalancer — the medicine IS the and/but clause.
8. Render the verdict. If the reading answers the asker rather than the question, render REFRAME and say what the real question is. If the question class is HIGH_STAKES, render CONDITIONS: read the field fully, but hand the decision back explicitly.
9. If genuine ambiguity remains, do not force a verdict: render NONE_CHAIN, name the specific ambiguity, and propose ONE sub-question for a follow-up draw.`;

const HARD_RULES = `HARD RULES:
- NO is a full citizen. If the field does not support the assertion, say NO.
- Never soften a NO into a yes-flavor. Never harden ambiguity into false certainty.
- The asker's stated hopes or preferences are NOT components of the field; the verdict must not move for them.
- The verdict describes conditions in the field, never a command. YES means "the field supports this now"; NO means "the ground isn't there." The person keeps the helm.
- Tone governance: no dramatizing, no alarm; displacement is navigation data.
- The field lean is testimony, not a verdict; you may agree with it or overrule it, but say which and why.`;

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
  "verdict": "YES_AND | YES_BUT | NO_BUT | NO_AND | REFRAME | CONDITIONS | NONE_CHAIN",
  "headline": "the answer in one plain sentence, 20 words max",
  "qualifier": "the and/but clause, sourced from the named rebalancer (or the reframe/conditions content)",
  "qualifierSource": "which rebalancer or computed fact this came from",
  "leanAgreement": "agree | overrule",
  "leanNote": "one sentence: how the mechanical lean relates to your verdict",
  "walk": ["step 1 ...", "step 2 ...", "... one entry per step performed"],
  "chainRequest": null,
  "authorshipReturn": "one sentence handing the helm back to the person"
}
If verdict is NONE_CHAIN, set chainRequest to {"ambiguity": "...", "subQuestion": "..."}.`;
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
