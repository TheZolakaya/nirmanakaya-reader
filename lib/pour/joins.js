// THE JOINS — where correct things meet (Fresh Mind, item 6/7: "the dangerous place is no longer only the cell; it is the
// handoff between correct things"). Deterministic validators run on a read-plan and a turn before the live Reader speaks.
//   ownership   the cell attached to a plan must be THIS card in THIS seat at THIS status (never a right sentence on a wrong owner)
//   provenance  the cell's partner and mechanism must equal the kernel's (a stale cell after a canon sweep is a wrong medicine)
//   promotion   a READER_HYPOTHESIS never becomes a USER_CONFIRMED fact without the person's words
//   growth      a Balanced projection's cell carries an ask, never a lack
//   premise     a question or chip must not assert a past (the novel with a question mark)
//   scope       a cell's claim stays on the capacity, never the whole life / another's feelings / a prognosis
// Each returns { ok, flags } like the lints. A model is needed for the one join a machine cannot see — two true clauses
// composed into a false implication — and that one stays with the judges.

const PREMISE_Q = /\b(?:where|when) did you (?:first|last) (?:learn|decide|stop|start|notice|feel)|\bwho (?:taught|told) you\b|\bwhat happened (?:when|the (?:first|last) time)\b|\bhow long have you been\b|\bwhen did you stop\b/i;
const GAP = /\b(?:isn'?t (?:online|there|available)|is missing|what'?s missing|a gap\b|hasn'?t (?:come online|shown up|arrived|picked|chosen|decided))\b/i;
const SCOPE = /\b(?:your whole life|everything in your life|(?:he|she|they) (?:feel|feels|felt|love|loves|resent|resents)|will (?:always|never)|you(?:'ll| will) (?:recover|heal|be fine|get worse)|prognosis|for the rest of your life)\b/i;

export function checkOwnership(plan, cell) {
  const p = plan.projections[0]; const pv = cell?.provenance || {};
  const flags = [];
  if (!cell) return { ok: true, flags };
  if (pv.signature_id !== plan.arrival.id) flags.push({ code: 'ownership', detail: `cell is for card ${pv.signature_id}, plan is for ${plan.arrival.id}`, hard: true });
  if (pv.position_id !== plan.seat.id) flags.push({ code: 'ownership', detail: `cell is for seat ${pv.position_id}, plan is for ${plan.seat.id}`, hard: true });
  if (pv.status !== p.status) flags.push({ code: 'ownership', detail: `cell is at status ${pv.status}, plan is at ${p.status}`, hard: true });
  return { ok: !flags.length, flags };
}

export function checkProvenance(plan, cell) {
  const p = plan.projections[0]; const pv = cell?.provenance || {};
  const flags = [];
  if (!cell) return { ok: true, flags };
  if (pv.partner_id !== p.partnerId) flags.push({ code: 'provenance', detail: `cell's partner ${pv.partner} (${pv.partner_id}) ≠ the record's ${p.partner} (${p.partnerId}) — a stale cell after a canon change`, hard: true });
  if (pv.mechanism !== p.mechanism) flags.push({ code: 'provenance', detail: `cell's mechanism ${pv.mechanism} ≠ the record's ${p.mechanism}`, hard: true });
  return { ok: !flags.length, flags };
}

// facts: { USER_STATED[], USER_CONFIRMED[] }; hypotheses: [{ text, confirmedBy?: 'user' | null, contradicted?: boolean }]
export function checkPromotion(plan, turnFacts = []) {
  const flags = [];
  const stated = new Set([...plan.facts.USER_STATED, ...plan.facts.USER_CONFIRMED].map((s) => String(s).toLowerCase()));
  for (const f of turnFacts) {   // a turn's declarative claims about the person, tagged by the live layer
    if (f.state === 'USER_CONFIRMED' && !stated.has(String(f.text).toLowerCase())) flags.push({ code: 'promotion', detail: `"${f.text}" is marked confirmed but the person never said it`, hard: true });
    if (f.state === 'READER_HYPOTHESIS' && f.asFact) flags.push({ code: 'promotion', detail: `"${f.text}" is a hypothesis stated as a fact`, hard: true });
    const h = plan.hypotheses.find((x) => String(x.text).toLowerCase() === String(f.text).toLowerCase());
    if (h?.contradicted && f.state !== 'DROPPED') flags.push({ code: 'promotion', detail: `"${f.text}" was contradicted by the person and survives`, hard: true });
  }
  return { ok: !flags.length, flags };
}

export function checkGrowth(plan, cell) {
  const flags = []; const p = plan.projections[0];
  if (p.status === 1 && cell && GAP.test(`${cell.core}\n${cell.ask}`)) flags.push({ code: 'growth', detail: `a Balanced cell reads as a lack: "${(`${cell.core}\n${cell.ask}`.match(GAP) || [''])[0]}"`, hard: true });
  return { ok: !flags.length, flags };
}

export function checkPremise(turn) {
  const flags = []; const asks = [turn?.question || '', ...(turn?.chips || []).map((c) => c?.text || '')].join('\n');
  const m = asks.match(PREMISE_Q); if (m) flags.push({ code: 'premise', detail: `"${m[0]}" — a past asserted with a question mark`, hard: true });
  return { ok: !flags.length, flags };
}

export function checkScope(cellOrTurnText) {
  const flags = []; const m = String(cellOrTurnText || '').match(SCOPE);
  if (m) flags.push({ code: 'scope', detail: `"${m[0]}" — beyond what a cell certifies`, hard: false });
  return { ok: true, flags };
}

export function checkJoins(plan, cell, turn = null, turnFacts = []) {
  const parts = [checkOwnership(plan, cell), checkProvenance(plan, cell), checkGrowth(plan, cell), checkScope(cell ? `${cell.core}\n${cell.ask}` : ''), ...(turn ? [checkPremise(turn), checkPromotion(plan, turnFacts), checkScope(turn.reader || '')] : [])];
  const flags = parts.flatMap((p) => p.flags);
  return { ok: !flags.some((f) => f.hard), flags };
}
