import { lintOutput } from '../lib/bakeoff/lint.js';
const exhibit = {
  gist: "You have already let go of something, or you are already holding on, and either way you are doing it without knowing it. The way back is care for what is actually growing — small, current, tended — not another decision about it.",
  reader: `You asked for right now, and that's what came.

There's a letting-go in this. Not a failure, not something lost — the kind where you open your hand and there's suddenly room. That's what's showing up in your material life, the part of you that deals with what's actually here: your stuff, your money, your body, your hours. And it came in through wanting — through what you are pointed at, what you're aiming for.

Here is the strange part. It's happening without you knowing. You have already given something up, or you are already refusing to give something up, and either way you are not the one who has been watching it happen. Somewhere along the way the thing changed hands and you didn't sign for it.

And this sits in the part of your life that's about direction and meaning — the place where you can't see the whole road, only the next stretch of it. That's the terrain. You don't get the full map there. You get enough light for one step.

So what wants your attention isn't another decision. It's this: what in front of you is actually alive and growing, and what does tending it look like today — small, current, not forced? Not everything needs a verdict. Some things need feeding.

The signature underneath this one is about care for what's growing. It doesn't ask you to push. It asks you to keep something watered without watching it for results.`,
  medicine: "The move is care for what is growing — feed something small and alive today, without forcing it and without waiting to see results. When you do that, release stops feeling like a loss. It starts feeling like an ending that was already complete.",
  question: "What's the small thing you're already tending — or the one you stopped tending without noticing?",
  chips: [{ text: 'What did I put down?' }],
};
const keel = {
  gist: "You put down something practical and are calling it taken; tend one thing you still have.",
  reader: `You let go of something recently — money, a plan for your body, a block of your time, a possession — and you're telling yourself it was taken from you, or that it just happened. It didn't. You put it down. That's the part you haven't admitted.

It's a practical, bodily kind of letting go, and it has turned up in the part of your life where you work out where you're headed. That's why it feels bigger than it is: a decision about hours or money is sitting where your sense of direction lives.

You don't need to decide anything about it. The simpler form of this is upkeep. Pick one practical thing you still have — the account, the routine, the room — and do its ordinary maintenance today, the way you would if nobody was watching.`,
  medicine: "Pick one practical thing you still have — the account, the routine, the room — and do its ordinary maintenance today, the way you would if nobody was watching.",
  question: "Which thing did you put down, and what have you been saying about how it left?",
  chips: [{ text: 'Which thing did I put down?' }],
};
const KEEL = new Set(['bothways', 'unnamed', 'narrator', 'conduit', 'promise']);
for (const [name, o] of [['EXHIBIT (must trip)', exhibit], ['KEEL REWRITE (must pass)', keel]]) {
  const r = lintOutput({ text: JSON.stringify(o), parsed: o, preset: { kind: 'opening' }, hostile: false, draw: { transient: 12, position: 18, status: 4 } });
  const k = r.flags.filter((f) => KEEL.has(f.code)); const other = r.flags.filter((f) => !KEEL.has(f.code)).map((f) => f.code);
  console.log(`\n${name}: keel flags ${k.length}` + (other.length ? `  (other: ${other.join(' ')})` : ''));
  for (const f of k) console.log('  ', f.code, '—', f.detail.slice(0, 150));
}
