// SOURCE-TRACE — Air's commission (2026-10-05, after the panel's second read): for every phrase the fresh GPT panel flagged on the frozen
// Corpus B ten (the said-once v2 render — the one the panel actually read), find where its words come from: the person's own words, the
// record handed to the Reader (the draw block: signature/seat/status/medicine/field), the medicine acts, the Handing's teaching language,
// the voice rules, or nothing (renderer invention). The script does the finding; True does the classifying by reading the matches.
//   npx tsx scripts/trace_friction_sources.mjs > <out.md>
import fs from 'node:fs';
const ENV = fs.readFileSync('.env.local', 'utf8'); for (const line of ENV.split(/\r?\n/)) { const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
const { createClient } = await import('@supabase/supabase-js');
const { fmtDrawForEz, spreadKeyFor } = await import('../lib/ezOpening.js');
const { HANDING_BASE, HANDING_RULES } = await import('../lib/handingPrompt.js');
const { VOICES } = await import('../lib/ezPrompts.js');
const { MEDICINE_ACTS } = await import('../lib/pour/medicineActs.js');
const { buildKernel } = await import('../lib/kernel.js');
const DEFS = JSON.parse(fs.readFileSync('lib/data/nirmanakaya_78_definitions.json', 'utf8'));
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: rows } = await db.from('external_readings').select('request_id, question, context, mode, draws, cards').like('request_id', 'readability-2026-10-05-B-%').order('created_at', { ascending: true });
const byRun = {}; for (const r of rows) byRun[r.request_id.replace('readability-2026-10-05-B-', '')] = r;

// the panel's flagged phrases, verbatim (Q3 reread · Q4 unclear · Q5 friction · Q8 friend-fail), deduped
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
const FAMILY = ['shape', 'read', 'structure', 'frame', 'ground', 'spine', 'hold', 'holding', 'land', 'landing', 'lands', 'standing', 'door', 'account', 'heading', 'unowned', 'unattributed', 'province', 'fruition', 'proportion', 'fair call', 'signing your name', 'brace', 'hum'];

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
const out = [];
out.push('# SOURCE-TRACE — the panel\'s flagged phrases on the said-once v2 render, against the five sources', '*True, 2026-10-05. For each phrase: the best-matching sentences in each source (shared content words after stemming, bigrams count double; score ≥ 2 shown). USER = the question + context · RECORD = the draw block handed to the Reader (signature, seat, status line, medicine record, FIELD) · ACTS = the partner\'s medicine acts (lib/pour/medicineActs.js) · HANDING = base + rules (lib/handingPrompt.js) · VOICE = the plainshort register (Plain + literal-first + said-once). The classification is written by hand after the matches.*', '');
const tally = { phrases: 0 };
for (const [run, phrases] of Object.entries(FLAGGED)) {
  const r = byRun[run]; const draws = r.draws; const drawText = fmtDrawForEz(draws, r.mode || 'discover', spreadKeyFor(draws.length), false, null, null, null, true, r.question, r.context || '');
  const k = buildKernel(draws[0], DEFS); const acts = MEDICINE_ACTS[k?.partnerId]; const actsText = acts ? `${acts.name}: ${acts.acts.join('. ')}.` : '(no partner — Balanced)';
  const user = `${r.question} ${r.context || ''}`;
  out.push(`## B-${run} — ${r.cards.map((c) => c.signature).join(' · ')}`, `**Q:** ${r.question}${r.context ? `\n**Context:** ${r.context}` : ''}`, `**Partner's acts:** ${actsText}`, '');
  for (const p of phrases) {
    tally.phrases++;
    out.push(`### "${p}"`);
    const fam = FAMILY.filter((f) => p.toLowerCase().includes(f)); if (fam.length) out.push(`- family words: ${fam.join(', ')}`);
    for (const [name, text] of [['USER', user], ['RECORD', drawText], ['ACTS', actsText], ['HANDING', HANDING_BASE + '\n' + HANDING_RULES], ['VOICE', VOICES.plainshort.rules]]) {
      const b = best(p, text); if (!b.length) { out.push(`- ${name}: —`); continue; }
      for (const x of b) out.push(`- ${name} (${x.score}; ${[...x.shared, ...x.sb].join(', ')}): "${x.s.slice(0, 260)}${x.s.length > 260 ? '…' : ''}"`);
    }
    out.push('');
  }
  // the family words in this draw's record and acts, as a direct count
  const inRecord = FAMILY.filter((f) => new RegExp('\\b' + f.replace(' ', '\\s+') + '\\w*', 'i').test(drawText)); const inActs = FAMILY.filter((f) => new RegExp('\\b' + f.replace(' ', '\\s+') + '\\w*', 'i').test(actsText));
  out.push(`*Family words present in this draw's RECORD: ${inRecord.join(', ') || 'none'} · in the ACTS: ${inActs.join(', ') || 'none'}*`, '');
}
// where the family words live in the prompt itself
out.push('## The abstraction family in the prompt text (counts of each word)');
for (const [name, text] of [['HANDING', HANDING_BASE + '\n' + HANDING_RULES], ['VOICE (plainshort)', VOICES.plainshort.rules]]) out.push(`- ${name}: ` + FAMILY.map((f) => `${f} ${(String(text).match(new RegExp('\\b' + f.replace(' ', '\\s+') + '\\w*', 'gi')) || []).length}`).join(' · '));
out.push('', `*${tally.phrases} phrases traced.*`);
process.stdout.write(out.join('\n') + '\n');
