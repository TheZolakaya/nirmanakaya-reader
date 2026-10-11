// PASS 1 (2026-10-11): measure every block the Reader is handed — words, paragraphs, command words, quoted examples — per voice, floor and door. Read-only.
const h = await import('../lib/handingPrompt.js');
const e = await import('../lib/ezPrompts.js');
const w = (s) => String(s).split(/\s+/).filter(Boolean).length;
const paras = (s) => String(s).split(/\n\n+/).filter((p) => p.trim()).length;
const cmd = (s) => (String(s).match(/\b(?:never|do not|don't|must|always|only|no|not)\b/gi) || []).length;
const quotes = (s) => (String(s).match(/"[^"]{20,}"/g) || []).length;
const caps = (s) => (String(s).match(/\b[A-Z]{2,}(?:[ '\-][A-Z]{2,})*\b/g) || []).length;
const row = (name, s) => console.log(`${name.padEnd(28)} words ${String(w(s)).padStart(6)}  paras ${String(paras(s)).padStart(4)}  commands ${String(cmd(s)).padStart(4)}  quoted ${String(quotes(s)).padStart(4)}  caps ${String(caps(s)).padStart(4)}`);
row('HANDING_BASE', h.HANDING_BASE);
row('HANDING_RULES', h.HANDING_RULES);
row('ENTITLEMENT_RULE', h.ENTITLEMENT_RULE);
for (const v of ['plain', 'grown', 'deep', 'mystical', 'friend', 'coach', 'storyteller', 'mystic']) row(`voice ${v}`, e.VOICES[v].rules);
for (const v of ['plain', 'friend', 'deep', 'mystical']) row(`ASSEMBLED ${v}`, e.ezSystem(h.HANDING_SET.BASE_SYSTEM, v, { rules: h.HANDING_SET.EZ_RULES }));
row('BRAZIER_HARD_RULE', e.BRAZIER_HARD_RULE);
for (const f of [1, 'meaning', 'moon', 'mechanism']) row(`floor rule ${f}`, e.BRAZIER_RULES[f]);
for (const f of [1, 'meaning', 'moon', 'mechanism']) row(`FLOOR SYSTEM ${f} (plain)`, e.brazierSystem(f, 'plain'));
const k = { partner: 'Commitment', partnerDescription: 'Sustained craft; mastery through persistence.', actShape: 'NAME ONE THING YOU ALREADY KNOW', mechanismText: 'REDUCTION', partnerBalanced: 'x', signatureBalanced: 'y' };
row('dragonBlock', e.dragonBlock(k)); row('DRAGON_STANDARD', e.DRAGON_STANDARD); row('doSomethingBlock', e.doSomethingBlock(k)); row('medicineBlock', e.medicineBlock(k));
row('PERSONA_LAW', e.PERSONA_LAW); row('LITERAL_FIRST', e.LITERAL_FIRST);
const o = await import('../lib/ezOpening.js');
row('FRAME_ASK', o.FRAME_ASK); row('HUNCH_LINE', o.HUNCH_LINE); row('TRAUMA_BLOCK', o.TRAUMA_BLOCK); row('AI_BLOCK', o.AI_BLOCK);
// the Handing's paragraphs, numbered, with their first words — the map's row keys
console.log('\n== HANDING_BASE paragraphs');
h.HANDING_BASE.split(/\n\n+/).forEach((p, i) => { if (p.trim()) console.log(`B${String(i + 1).padStart(2, '0')}  ${String(w(p)).padStart(4)}w  cmd ${String(cmd(p)).padStart(3)}  ${p.replace(/\s+/g, ' ').slice(0, 88)}`); });
console.log('\n== HANDING_RULES paragraphs');
h.HANDING_RULES.split(/\n\n+/).forEach((p, i) => { if (p.trim()) console.log(`R${String(i + 1).padStart(2, '0')}  ${String(w(p)).padStart(4)}w  cmd ${String(cmd(p)).padStart(3)}  ${p.replace(/\s+/g, ' ').slice(0, 88)}`); });
console.log('\n== PLAIN voice paragraphs');
e.VOICES.plain.rules.split(/\n\n+/).forEach((p, i) => { if (p.trim()) console.log(`V${String(i + 1).padStart(2, '0')}  ${String(w(p)).padStart(4)}w  cmd ${String(cmd(p)).padStart(3)}  ${p.replace(/\s+/g, ' ').slice(0, 88)}`); });
