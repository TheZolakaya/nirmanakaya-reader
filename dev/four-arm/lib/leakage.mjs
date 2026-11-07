// THE LEAKAGE ASSERTION (AMENDMENT v2 item 4; DESIGN §2.2). On EVERY pass call (the Recognition, and B's review at the same
// points, so the control is held to the same rule) the harness asserts that the pass's inputs are a subset of what the generating
// model itself has seen: every input atom (the task, the draft, each conversation turn, each tool name, argument value and tool
// result) must appear in the model-seen transcript. And no evaluator-side field may ride along: no key anywhere in the pass's
// state may be named like a reference, answer, gold, label, key, goal, attacker or evaluator field. A failure is a critical incident.
export class LeakError extends Error { constructor(msg, detail) { super(msg); this.name = 'LeakError'; this.detail = detail; } }

const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
const FORBIDDEN_KEY = /reference|answer|gold|label|hidden|attacker|evaluator|goal|^key$|solution|expected|target/i;
const ALLOWED_STATE = new Set(['conversation', 'toolCalls', 'proposedAction']);

function leaves(v, out = []) {
  if (v == null) return out;
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') { out.push(String(v)); return out; }
  if (Array.isArray(v)) { for (const x of v) leaves(x, out); return out; }
  if (typeof v === 'object') { for (const x of Object.values(v)) leaves(x, out); }
  return out;
}
// The structure is walked; the CONTENT the model itself wrote or was shown (tool args, tool results, the proposed action, a
// turn's text) is not — a tool may legitimately take an argument named "target" — it is held to the subset check instead.
const CONTENT = new Set(['args', 'result', 'proposedAction', 'content', 'raw']);
function forbiddenKeys(v, at = 'state', out = []) {
  if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { if (!Array.isArray(v) && FORBIDDEN_KEY.test(k)) out.push(`${at}.${k}`); if (!CONTENT.has(k)) forbiddenKeys(x, `${at}.${k}`, out); }
  return out;
}

/** The atoms a pass receives. */
export function passAtoms({ task, draft, state }) {
  const atoms = [['task', task], ['draft', draft]];
  if (state) {
    for (const [i, t] of (state.conversation || []).entries()) atoms.push([`conversation[${i}]`, t.content]);
    for (const [i, c] of (state.toolCalls || []).entries()) { atoms.push([`toolCalls[${i}].name`, c.name]); for (const v of leaves(c.args)) atoms.push([`toolCalls[${i}].args`, v]); atoms.push([`toolCalls[${i}].result`, typeof c.result === 'string' ? c.result : JSON.stringify(c.result)]); }
    for (const v of leaves(state.proposedAction)) atoms.push(['proposedAction', v]);
  }
  return atoms.filter(([, v]) => norm(v) !== '');
}

/** Throws LeakError unless pass inputs ⊆ model-seen inputs and no evaluator field rides along. Returns a small receipt when clean. */
export function assertNoLeak(passInputs, modelSeen, { hidden = null, where = '' } = {}) {
  const seen = norm((Array.isArray(modelSeen) ? modelSeen : [modelSeen]).join('\n'));
  const problems = [];
  const st = passInputs.state;
  if (st && typeof st === 'object') {
    for (const k of Object.keys(st)) if (!ALLOWED_STATE.has(k)) problems.push(`state carries an unexpected field "${k}"`);
    for (const k of forbiddenKeys(st)) problems.push(`state carries an evaluator-shaped field ${k}`);
  }
  const atoms = passAtoms(passInputs);
  for (const [name, v] of atoms) if (!seen.includes(norm(v))) problems.push(`${name} is not in what the model saw: "${String(v).slice(0, 80)}"`);
  if (hidden) { // belt and braces: an evaluator-side value present in the pass but absent from what the model saw
    const pass = norm(atoms.map(([, v]) => v).join('\n'));
    for (const v of leaves(hidden)) { const h = norm(v); if (h.length >= 6 && pass.includes(h) && !seen.includes(h)) problems.push(`an evaluator-side value reached the pass: "${String(v).slice(0, 60)}"`); }
  }
  if (problems.length) throw new LeakError(`LEAKAGE${where ? ` at ${where}` : ''}: ${problems.length} problem(s): ${problems.slice(0, 3).join('; ')}`, problems);
  return { ok: true, atoms: atoms.length };
}
