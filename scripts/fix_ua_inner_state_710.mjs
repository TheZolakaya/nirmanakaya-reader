// .710 (Air, "do not assign the user an inner interpretation they never gave"): the 22 Unacknowledged state lines in lib/data/plain_propositions.json
// asserted what the person CALLS it ("…and calling it a collapse; … you credit it to failure") as fact — the Reader then said those lines nearly
// verbatim. Rewritten: the structural relation stays direct (you are doing it; it is yours); the inner state becomes a possibility ("it may feel like…").
// No free "something" in any plain line — the record's splice fills one with a FIELD noun ("the vow"), manufacturing a referent.
import fs from 'node:fs';
const p = 'lib/data/plain_propositions.json'; const P = JSON.parse(fs.readFileSync(p, 'utf8'));
const UA = {
  0: 'You are choosing among open options every day. It may not feel like choosing — it can look as if there was no choice — but the choosing is yours.',
  1: 'You are setting the direction. It may look like momentum, habit, or just how things went, but the direction is yours.',
  2: 'You are knowing what to attend to, and your calls keep proving right. It may feel like luck; the knowing is yours.',
  3: 'You are tending what grows. It may feel like a role you never chose, or an obligation; the care is yours.',
  4: 'You are putting things in order, and people rely on it. It may look like things just working out; the order is yours.',
  5: 'You are teaching, and people are learning from you. It may feel like just talking; the teaching is yours.',
  6: 'You are connecting, and others feel your care. From the inside it may not feel like caring at all; the connection is yours.',
  7: 'You are moving toward where you are headed. It may feel like being carried along; the moving is yours.',
  8: 'You are holding up what needs holding. It may look like just how things are, or like necessity; the strength is yours.',
  9: 'You are practising, and it shows. The result may look like talent, or like it came without trying; the practice is yours.',
  10: 'You are the one making things turn out the way they do. It may look like fate, or like what happens to you; the consequences are yours.',
  11: 'You are keeping score. It may feel like just noticing, or like a response to how others behave; the tally is yours.',
  12: 'You have let go of what you were holding. It may feel as if it was taken from you; the letting go was yours.',
  13: 'You are bringing an ending about. It may look as if it simply ran its course; the ending is yours.',
  14: 'You are holding things in balance. It may look like luck that nothing has tipped; the balance is yours.',
  15: 'You made the way you see this. It may look like simply how things are; the way of seeing is yours.',
  16: 'You are taking a structure down yourself. It may feel like a collapse, or a failure; the clearing is yours.',
  17: 'You are drawing people toward where you are headed. It may look as if it was their idea; the pull is yours.',
  18: 'You are steering by a picture of what could be. It may feel like realism, or like just the facts; the picture is yours.',
  19: 'You are becoming what you are. It may feel like just getting by; the becoming is yours.',
  20: 'You already know. It may feel like not being sure; the knowing is yours.',
  21: 'You have finished a cycle. It may still feel as if it is in progress; the finishing is yours.',
};
for (const [id, text] of Object.entries(UA)) P.states[id].unacknowledged.plain = text;
// the three other plain lines that still carried a free "something" (a splice target)
P.states['9'].balanced.plain = 'Practising without strain; time alone that connects you rather than cuts you off; getting better at what you practise because it helps you grow, not because you are anxious.';
P.states['16'].tooLittle.plain = 'You are propping up a structure that has already stopped holding; it is over, and you are still holding it up.';
P._meta.v710 = '0.99.710 — the 22 Unacknowledged lines say the structure directly and the inner state as a possibility ("it may feel like…"), never what the person calls it as fact; no free "something" left in any plain line (the splice turned one into "the vow").';
const free = []; for (const [id, s] of Object.entries(P.states)) for (const k of ['balanced', 'tooMuch', 'tooLittle', 'unacknowledged']) if (/\bsome ?thing\b/i.test(s[k].plain)) free.push(`${id}.${k}`);
const calling = []; for (const [id, s] of Object.entries(P.states)) for (const k of ['balanced', 'tooMuch', 'tooLittle', 'unacknowledged']) if (/\b(calling it|you credit|credited to|telling yourself)\b/i.test(s[k].plain)) calling.push(`${id}.${k}`);
fs.writeFileSync(p, JSON.stringify(P, null, 2) + '\n');
console.log('UA lines rewritten: 22 · free "something" left:', free.length ? free.join(',') : 'none', '· "calling it / you credit" left:', calling.length ? calling.join(',') : 'none');
