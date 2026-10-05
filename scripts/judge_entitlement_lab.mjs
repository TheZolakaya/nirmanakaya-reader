// LAB — THE ENTITLEMENT JUDGE (Air's second scroll, 2026-10-05): every sentence the person reads, classified against what the asker said and the
// floor's four fields — OBSERVED (the asker supplied it) / STRUCTURAL (the floor or the draw supports it as a relation) / INFERRED_MARKED (applies it
// to their life beyond what they said, marked as a guess or question) / INFERRED_UNMARKED (the same, stated as known fact — "unearned certainty") /
// OTHER (a question, a greeting, a transition). The count that matters is INFERRED_UNMARKED; OVERHEDGED counts structural claims wrapped in "maybe".
//   npx tsx scripts/judge_entitlement_lab.mjs <shelf bench file> [lane letter, default A]
import fs from 'node:fs';
const ENV = fs.readFileSync('.env.local', 'utf8'); for (const line of ENV.split(/\r?\n/)) { const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
const { callProvider } = await import('../lib/provider.js'); const { MODEL_IDS } = await import('../lib/modelConfig.js');
const FILE = process.argv[2]; const LANE = process.argv[3] || 'A';
const SC = JSON.parse(fs.readFileSync('scripts/scaffold_floor_lab.json', 'utf8'));
const SYSTEM = `You audit the epistemic honesty of a reading, sentence by sentence. You are given what the asker actually said, the four structural fields the reading was built on, and the numbered sentences of the reading. Label EVERY sentence with exactly one label:
OBSERVED — restates something the asker actually said.
STRUCTURAL — the reading's own claim, which the four fields entitle it to make: what this kind of thing is or how it works, AND the fields applied to the asker in the fields' own terms — that the asker is in the CONDITION, in the DOMAIN, that the OPERATION is the way through, that the INVARIANT holds. "You're doing more of this than the moment needs" or "you're not treating it as yours" is STRUCTURAL when the CONDITION says so. A STRUCTURAL sentence adds no concrete detail the fields and the question do not contain.
INFERRED_MARKED — adds a concrete detail about this asker's life that neither the question nor the four fields contain (an event, an object, a person, a habit, a history, a specific feeling, a time, a "tell") AND visibly marks it as a guess, possibility, wondering, example or question ("maybe", "if I were to guess", "one possibility", "my read is", "it may be", "for example", "does this fit", "this can show up as").
INFERRED_UNMARKED — adds such a concrete detail about this asker's life and states it as known fact with no marker.
OVERHEDGED — a STRUCTURAL claim needlessly wrapped in maybe/perhaps language.
OTHER — a question to the asker, a greeting, a transition, an instruction to act.
Reply with ONLY lines of the form "<number> <LABEL>", one per sentence, nothing else.`;
const split = (t) => String(t || '').replace(/\n+/g, ' ').match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g)?.map((s) => s.trim()).filter((s) => s.length > 3) || [];
const s = fs.readFileSync('G:/My Drive/For Air Review/' + FILE, 'utf8'); const parts = s.split(/^## (?=readability|B-\d)/m).slice(1); // the five-voice files head their sections "## B-3 — …"
const tot = { OBSERVED: 0, STRUCTURAL: 0, INFERRED_MARKED: 0, INFERRED_UNMARKED: 0, OVERHEDGED: 0, OTHER: 0 }; const rows = []; const examples = [];
for (const part of parts) {
  const id0 = part.split('\n')[0].trim().split(/\s/)[0]; const id = id0.startsWith('readability') ? id0 : 'readability-2026-10-05-' + id0; const q = (part.match(/\*\*Q:\*\* (.+)/) || [])[1] || ''; const f = SC[id];
  const body = part.split(new RegExp(`^### ${LANE}\\n`, 'm'))[1]?.split(/^### [A-Za-z]+\s*\n/m)[0] || ''; const sents = split(body.replace(/^>\s*◈\s*/gm, '').replace(/\*/g, ''));
  if (!sents.length || !f) continue;
  const user = `THE ASKER SAID: "${q}"\n\nTHE FOUR FIELDS:\nCONDITION: ${f.CONDITION}\nDOMAIN: ${f.DOMAIN}\nOPERATION: ${f.OPERATION}\nINVARIANT: ${f.INVARIANT}\n\nTHE SENTENCES:\n${sents.map((x, i) => `${i + 1}. ${x}`).join('\n')}`;
  let raw = ''; try { const { data } = await callProvider({ model: MODEL_IDS.sonnet, max_tokens: 600, system: SYSTEM, messages: [{ role: 'user', content: user }] }, { tag: 'judge' }); raw = data?.content?.map((c) => c.text || '').join('\n') || ''; } catch (e) { raw = ''; }
  const labels = {}; for (const line of raw.split('\n')) { const m = line.match(/^\s*(\d+)\D+(OBSERVED|STRUCTURAL|INFERRED_MARKED|INFERRED_UNMARKED|OVERHEDGED|OTHER)/); if (m) labels[Number(m[1])] = m[2]; }
  const c = { OBSERVED: 0, STRUCTURAL: 0, INFERRED_MARKED: 0, INFERRED_UNMARKED: 0, OVERHEDGED: 0, OTHER: 0 };
  sents.forEach((x, i) => { const L = labels[i + 1] || 'OTHER'; c[L]++; tot[L]++; if (L === 'INFERRED_UNMARKED' && examples.length < 14) examples.push(`${id.replace('readability-2026-10-05-', '')}: ${x}`); });
  rows.push(`${id.replace('readability-2026-10-05-', '')}: ${sents.length} sentences · unmarked inference ${c.INFERRED_UNMARKED} · marked ${c.INFERRED_MARKED} · structural ${c.STRUCTURAL} · overhedged ${c.OVERHEDGED}`);
}
console.log(`${FILE} lane ${LANE}`); for (const r of rows) console.log('  ' + r); console.log('TOTAL', JSON.stringify(tot)); console.log('UNMARKED EXAMPLES:'); for (const e of examples) console.log('  - ' + e);
