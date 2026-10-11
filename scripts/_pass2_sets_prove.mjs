// PASS TWO — load every prompt set, measure it, and prove the Handing set assembles byte-identically to today's ezSystem(HANDING_SET…).
const h = await import('../lib/handingPrompt.js');
const e = await import('../lib/ezPrompts.js');
const ps = await import('../lib/promptSets.js');
const o = await import('../lib/ezOpening.js');
const w = (s) => String(s).split(/\s+/).filter(Boolean).length;
const cmd = (s) => (String(s).match(/\b(?:never|do not|don't|must|always|only|no|not)\b/gi) || []).length;
const quotes = (s) => (String(s).match(/"[^"]{20,}"/g) || []).length;
for (const name of ps.PROMPT_SET_NAMES) {
  const set = ps.promptSetFor(name);
  for (const v of ['plain', 'friend', 'deep']) { const sys = ps.systemFor(set, v); console.log(`${name.padEnd(19)} ${v.padEnd(7)} words ${String(w(sys)).padStart(6)}  commands ${String(cmd(sys)).padStart(4)}  quoted ${String(quotes(sys)).padStart(4)}`); }
}
const today = e.ezSystem(h.HANDING_SET.BASE_SYSTEM, 'friend', { rules: h.HANDING_SET.EZ_RULES });
console.log('\nhanding set == today\'s assembly (friend):', ps.systemFor(ps.promptSetFor('handing'), 'friend') === today);
const todayPlain = e.ezSystem(h.HANDING_SET.BASE_SYSTEM, 'plain', { rules: h.HANDING_SET.EZ_RULES });
console.log('handing set == today\'s assembly (plain):', ps.systemFor(ps.promptSetFor('handing'), 'plain') === todayPlain);
const m1 = o.buildOpeningMessage({ question: 'q', drawText: 'D', tele: 'T' }); const m2 = o.buildOpeningMessage({ question: 'q', drawText: 'D', tele: 'T', hunch: false, frameAsk: 'short' });
console.log('opening default has HUNCH + full frame ask:', m1.includes('HUNCH CHECK') && m1.includes('person — Read the signature'), '| set options drop them:', !m2.includes('HUNCH CHECK') && !m2.includes('person — Read the signature') && m2.includes('THE FRAME: none was chosen'));
console.log('frame ask full', w(o.FRAME_ASK), 'words → short', w(o.FRAME_ASK_SHORT));
const b1 = e.brazierSystem('meaning', 'plain'); const b2 = e.brazierSystem('meaning', 'plain', ps.promptSetFor('constitution'));
console.log('floor system: handing', w(b1), 'words → constitution', w(b2), '| default unchanged:', b1.startsWith(h.HANDING_BASE));
const c = ps.promptSetFor('constitution'); console.log('\nconstitution base paragraphs:', c.BASE_SYSTEM.split(/\n\n+/).length, '| rules paragraphs:', c.EZ_RULES.split(/\n\n+/).length, '| short set differs:', ps.promptSetFor('constitution-short').EZ_RULES !== c.EZ_RULES);
console.log('merge base paragraphs:', ps.promptSetFor('merge').BASE_SYSTEM.split(/\n\n+/).length, '(handing', h.HANDING_BASE.split(/\n\n+/).length + ')');
if (process.argv[2]) { const set = ps.promptSetFor(process.argv[2]); console.log('\n' + ps.systemFor(set, process.argv[3] || 'plain')); }
