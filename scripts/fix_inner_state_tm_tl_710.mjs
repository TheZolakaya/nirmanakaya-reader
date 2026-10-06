// .710 (Air): the Too Much / Too Little plain lines that asserted a feeling, a self-description or a history as fact — the behaviour stays direct,
// the inner state or the backstory becomes a possibility. (12 TM "denying yourself for show", 20 TL "what is calling for your attention", 21 TM "claiming"
// are the behaviour itself, not an inner state assigned — left.)
import fs from 'node:fs';
const p = 'lib/data/plain_propositions.json'; const P = JSON.parse(fs.readFileSync(p, 'utf8'));
const FIX = {
  '0.tooLittle': 'You have closed off to what could be, and you make things from a cramped place. Sometimes that comes from old hurt; whether it does here is yours to say.',
  '3.tooMuch': 'You are controlling in the form of care: smothering, giving yourself up for others, losing the line between you and them. It may not look like control from the inside.',
  '3.tooLittle': 'Nothing you tend grows; you keep yourself emotionally out of reach. It may look like independence.',
  '9.tooMuch': 'Your practice has become perfectionism: being alone has become the rule rather than a choice, and the refining does not stop. Sometimes that runs on fear of what happens if you stop.',
  '9.tooLittle': 'You cannot keep at anything long enough for it to grow; practising has started to feel risky. Sometimes that comes from what happened before.',
  '11.tooLittle': 'You cannot claim what you are owed, and you put up with unfair treatment. Asking for fairness may have come to feel risky.',
  '13.tooMuch': 'You keep upending things, ending them before they have lived. It may feel like freedom; sometimes it is fear in freedom\'s clothes.',
  '13.tooLittle': 'You are holding on to what is over. It may feel like loyalty; endings may have come to feel frightening.',
  '16.tooMuch': 'You are smashing things too early, unable to let anything stand. It may feel like freedom from the inside.',
  '17.tooLittle': 'You are worn out; what you cultivated has not flowered, and the hope has gone thin.',
};
for (const [key, text] of Object.entries(FIX)) { const [id, k] = key.split('.'); P.states[id][k].plain = text; }
fs.writeFileSync(p, JSON.stringify(P, null, 2) + '\n'); console.log('rewritten:', Object.keys(FIX).join(', '));
const free = []; for (const [id, s] of Object.entries(P.states)) for (const k of ['balanced', 'tooMuch', 'tooLittle', 'unacknowledged']) if (/\bsome ?thing\b/i.test(s[k].plain)) free.push(`${id}.${k}`); console.log('free "something":', free.length ? free.join(',') : 'none');
