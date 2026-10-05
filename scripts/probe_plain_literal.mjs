// PROBE — Plain carries LITERAL FIRST (.690), the assembled system carries it, plainlit is identical.   npx tsx scripts/probe_plain_literal.mjs
const m = await import('../lib/ezPrompts.js');
const h = await import('../lib/handingPrompt.js');
const sys = m.ezSystem(h.HANDING_SET.BASE_SYSTEM, 'plain', { rules: h.HANDING_SET.EZ_RULES });
console.log('Plain carries LITERAL FIRST:', m.VOICES.plain.rules.includes('LITERAL FIRST'), '| once:', m.VOICES.plain.rules.split('LITERAL FIRST').length - 1, '| plainlit identical:', m.VOICES.plainlit.rules === m.VOICES.plain.rules, '| assembled Plain system carries it:', sys.includes('LITERAL FIRST'), '| chars', sys.length);
