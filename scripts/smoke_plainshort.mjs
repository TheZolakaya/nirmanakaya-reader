// prove the plainshort register = Plain + COMPRESSION, and that Plain itself is untouched
const { VOICES, COMPRESSION, LITERAL_FIRST } = await import('../lib/ezPrompts.js');
const plain = VOICES.plain.rules, short = VOICES.plainshort.rules;
console.log('plain has LITERAL_FIRST:', plain.includes(LITERAL_FIRST.trim()));
console.log('plain has COMPRESSION:', plain.includes('SAY EACH IDEA ONCE'));
console.log('plainlit === plain:', VOICES.plainlit.rules === plain);
console.log('plainshort = plain + COMPRESSION:', short === plain + COMPRESSION);
console.log('plainshort extra words:', COMPRESSION.trim().split(/\s+/).length);
