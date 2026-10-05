// how big is the whole system prompt a Plain opening runs under, and where does the voice sit in it
const { HANDING_BASE, HANDING_RULES } = await import('../lib/handingPrompt.js');
const { VOICES, COMPRESSION, LITERAL_FIRST } = await import('../lib/ezPrompts.js');
const w = (s) => String(s || '').trim().split(/\s+/).length;
console.log('HANDING_BASE words:', w(HANDING_BASE)); console.log('HANDING_RULES words:', w(HANDING_RULES));
console.log('Plain voice words:', w(VOICES.plain.rules), '(of which LITERAL_FIRST', w(LITERAL_FIRST) + ')'); console.log('COMPRESSION words:', w(COMPRESSION));
console.log('total for a Plain opening ≈', w(HANDING_BASE) + w(HANDING_RULES) + w(VOICES.plain.rules), 'words');
