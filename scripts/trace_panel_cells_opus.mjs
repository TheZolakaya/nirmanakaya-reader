// THE PANEL'S 26, RE-TRACED WITH THE CELL AS A SIXTH SOURCE (Opus bench instance, 2026-10-05; no model calls).
// The 26 phrases the GPT panel flagged on the said-once v2 render (True's TRACE_True_Friction_Sources_Panel_Two_2026-10-05.md), scored by the
// same matcher as scripts/trace_friction_sources.mjs against the five old sources PLUS the poured floor, split in two: CELL (the cell's four
// parts) and SCAFFOLD (the rest of the floor block — the tense line, the acts line, the seat line). The cells come from the snapshot under
// data/pour/snapshot (unchanged since v0.99.606, 2026-10-02, so they are the cells under the render the panel read).
//   npx tsx scripts/trace_panel_cells_opus.mjs > out.md
import fs from 'node:fs';
const ENV = fs.readFileSync('.env.local', 'utf8'); for (const line of ENV.split(/\r?\n/)) { const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
const { createClient } = await import('@supabase/supabase-js');
const { fmtDrawForEz, spreadKeyFor } = await import('../lib/ezOpening.js');
const { HANDING_BASE, HANDING_RULES } = await import('../lib/handingPrompt.js');
const { VOICES } = await import('../lib/ezPrompts.js');
const { MEDICINE_ACTS } = await import('../lib/pour/medicineActs.js');
const { buildKernel } = await import('../lib/kernel.js');
const DEFS = JSON.parse(fs.readFileSync('lib/data/nirmanakaya_78_definitions.json', 'utf8'));
const CELLS = JSON.parse(fs.readFileSync('scripts/floor_cells_corpus_b_opus.json', 'utf8'));
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: rows } = await db.from('external_readings').select('request_id, question, context, mode, draws').like('request_id', 'readability-2026-10-05-B-%');
const byRun = {}; for (const r of rows) byRun[r.request_id.replace('readability-2026-10-05-B-', '')] = r;
const FLAGGED = {
  1: ['You are already the one reading this choice — you can see the pattern under the comfort and the offer — and you are not counting that read as yours.', "But right now you're keeping it unowned, and unowned things don't move.", 'That returns the read to your hands.'],
  2: ['What came up first is reaching — the pull toward something you actually want, not a daydream, but the sense of which way to go.', 'Something in your life with your partner is asking for a direction, and the small stuff is where the asking leaks out.', 'That shape is what your irritation has been trying to hand you.'],
  3: ['You can carry something through, decide what to drop, and stay steady while it drops.', 'The next structure is going up in your head before this one has held anything.', "When the page shows you the shape, you stop having to brace against a future that hasn't arrived."],
  4: ['Not a plan. A heading.', 'Your body is the account you keep meaning to get to.'],
  5: ["The restless feeling isn't a warning — it's the low hum of a structure you keep raising without signing your name to it.", "It's not that you're doing too much or too little. It's that the doing is unattributed, and unattributed work never settles.", 'That gives the structure back a spine, and gives you back the thing structures are supposed to give you: solid ground under the next decision.'],
  7: ["You're not short on care or on ability; you're short on the move itself, and the reason is that the thing hasn't been ruled finished in your own head, so the next one waits.", "What you get back when this is in balance is a hold that contains rather than crushes — the grip that lets go of what it doesn't need to carry.", "You're standing at a door that's already behind you."],
  8: ['And it has turned up at the door: the place where something from outside is about to become part of your life again.', 'That puts the pile right at the point of decision rather than the point of storage.', 'The reading starts somewhere other than boxes and bin bags.'],
  9: ["Take one part of the project you're sure about, and look at it with no name on it — just what's actually there — and only keep the name if it still earns the place.", "It's showing up in the part of your life that's about what's fair — what's owed, what's proportioned, what balances out. That's the Body's province: the material side, what you can put your hands on. Fruition stage, which means this is the harvest part of a cycle, not the planting.", 'Strip the name off it.'],
  10: ['You are standing in the middle of a fair call that keeps getting made — the one who notices what is off between people — and you are not counting that as yours.', 'What you get back when this is in balance: your perceptions land without argument.', 'So: you are standing in the middle of a fair call.'],
};
const STOP = new Set('the a an and or but of to in on at for with from by as is are was were be been being it its this that these those you your yours they them their there here what which who whom whose when where why how not no nor so than too very can could will would shall should may might must do does did done have has had having into onto over under again further then once all any both each few more most other some such only own same just now ever never also about above below between through during before after out off up down one two three four five'.split(' '));
const words = (s) => String(s).toLowerCase().replace(/[’']/g, "'").split(/[^a-z'-]+/).filter((w) => w.length >= 4 && !STOP.has(w));
const stem = (w) => w.replace(/(ing|ed|es|s|ly)$/, '');
const sentences = (t) => String(t).split(/(?<=[.!?:;])\s+|\n+/).map((x) => x.trim()).filter((x) => x.length > 12);
const bigrams = (ws) => ws.slice(0, -1).map((w, i) => w + ' ' + ws[i + 1]);
function best(phrase, text, n = 2) {
  const pw = words(phrase).map(stem); const pb = new Set(bigrams(words(phrase)));
  const scored = sentences(text).map((s) => { const sw = words(s).map(stem); const shared = [...new Set(pw)].filter((w) => sw.includes(w)); const sb = bigrams(words(s)).filter((b) => pb.has(b)); return { s, score: shared.length + 2 * sb.length, shared, sb }; }).filter((x) => x.score >= 2).sort((a, b) => b.score - a.score);
  return scored.slice(0, n);
}
const out = ['# THE PANEL’S 26 WITH THE CELL AS A SIXTH SOURCE', '*score = shared content stems + 2 × shared bigrams; best sentence per source, score ≥ 2 shown.*', ''];
const VOICE = (VOICES.plainshort || VOICES.plain).rules;
for (const [run, phrases] of Object.entries(FLAGGED)) {
  const id = 'readability-2026-10-05-B-' + run; const r = byRun[run]; const floor = CELLS[id]?.floorText || '';
  const rawCell = (floor.split(/^the cell \(its four parts.*$/m)[1] || '').split(/^frame:/m)[0];
  const cell = rawCell.replace(/^- (tense|the card, as what it does|the seat, as where|the ask, from the partner): /gm, '');
  const scaffold = (rawCell ? floor.replace(rawCell, '') : floor).replace(/^THE FLOOR — .*$/m, '').replace(/^the cell \(its four parts.*$/m, '');
  const drawText = fmtDrawForEz(r.draws, r.mode || 'discover', spreadKeyFor(r.draws.length), false, null, null, null, true, r.question, r.context || '');
  const k = buildKernel(r.draws[0], DEFS); const acts = MEDICINE_ACTS[k?.partnerId]; const actsText = acts ? acts.acts.join('. ') + '.' : '';
  out.push(`## B-${run}`);
  for (const p of phrases) {
    out.push(`### "${p}"`);
    const scores = {};
    for (const [name, text] of [['USER', `${r.question} ${r.context || ''}`], ['RECORD', drawText], ['ACTS', actsText], ['HANDING', HANDING_BASE + '\n' + HANDING_RULES], ['VOICE', VOICE], ['CELL', cell], ['SCAFFOLD', scaffold]]) {
      const b = best(p, text, 1); scores[name] = b[0]?.score || 0;
      if (b.length) out.push(`- ${name} (${b[0].score}; ${[...b[0].shared, ...b[0].sb].join(', ')}): "${b[0].s.slice(0, 220)}"`); else out.push(`- ${name}: —`);
    }
    const top = Object.entries(scores).sort((a, b) => b[1] - a[1]); out.push(`- **top: ${top[0][0]} ${top[0][1]}** (next ${top[1][0]} ${top[1][1]})`, '');
  }
}
process.stdout.write(out.join('\n') + '\n');
