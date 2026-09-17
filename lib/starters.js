// THE STARTERS — copy, not flow (Keel's spec, SCROLL_Keel_To_True_The_Opening_Sequence_2026-09-17).
// Kept in their own file so the wording can be tuned without touching the opening sequence.
//
// The grammar is universal and fixed: five pills per area, in this order —
//   something I'm working on · something I want · something I'm not sure about ·
//   something that's bothering me · a bigger question (expands to three)
// Every sentence is first person, said out loud, kitchen register. No category nouns, no
// framework vocabulary, no diagnosis words. The heady material lives ONLY behind "a bigger
// question", one tap deeper, so the deep end exists without anyone being pushed into it.

export const STARTER_KINDS = [
  { key: 'working', label: "something I'm working on" },
  { key: 'want', label: 'something I want' },
  { key: 'unsure', label: "something I'm not sure about" },
  { key: 'bothering', label: "something that's bothering me" },
  { key: 'bigger', label: 'a bigger question' },
];

// The doors' sub-lines: coverage is comprehensive by derivation (the five houses partition the
// WHERE of a life); these exist purely for FINDABILITY — WORK, DECISIONS and LOSS were invisible.
export const DOOR_SUBS = {
  gestalt: 'whether my life is adding up: purpose, direction, who I’m becoming',
  mind: 'what my head keeps turning over: worry, a decision, clarity',
  emotion: 'the people in my life: love, family, friends, loss',
  body: 'my body, my home, my work, my money',
  spirit: 'what moves me, what I hold true: creativity, faith, the world',
};

export const STARTERS = {
  gestalt: {
    working: "I'm trying to figure out what to do with my life next.",
    want: 'I want my days to feel like they mean something.',
    unsure: "I'm not sure the path I'm on is actually mine.",
    bothering: 'I keep feeling like I’m behind.',
    bigger: ['What am I here for?', 'Is any of this adding up to something?', 'What would a life well-lived look like for me?'],
  },
  mind: {
    working: "I'm trying to quiet my mind.",
    want: 'I want to stop replaying the same thing.',
    unsure: "I have a decision to make and I can't see it clearly.",
    bothering: "Something's been eating at me and I can't name it.",
    bigger: ['Why do I think the way I do?', 'Is there a peace that actually lasts?', 'What is a mind, anyway?'],
  },
  emotion: {
    working: "I'm working on things with someone.",
    want: 'I want to be closer to someone.',
    unsure: "I'm not sure where I stand with them.",
    bothering: "Someone hurt me and I'm still carrying it.",
    bigger: ['What do I actually owe the people in my life?', 'Why is love so hard?', 'How do I love someone without losing myself?'],
  },
  body: {
    working: "I'm working on my health.",
    want: 'I want to feel safe about money.',
    unsure: "I'm not sure about my job.",
    bothering: "My body's been trying to tell me something.",
    bigger: ['What does it mean to be well?', 'How much is enough?', 'What is my real relationship with the physical world?'],
  },
  spirit: {
    working: "I'm making something and I want to see it clearly.",
    want: 'I want to feel that spark again.',
    unsure: "I'm not sure what I believe anymore.",
    bothering: 'Something happening in the world is making me angry.',
    bigger: ['Why is the universe so big?', 'Is there something greater than me?', 'What do I actually hold true?'],
  },
};

// Work appears deliberately in two houses: livelihood under Health & prosperity ("I'm not sure
// about my job") and vocation under Fulfillment. Both are correct; the person picks the one that
// sounds like their own thought. THE AREA IS CONTEXT, NOT ROUTING — a "wrong" pick costs nothing
// and is never validated or corrected.
export const ALT_STARTERS = {
  gestalt: { unsure: "I'm not sure this work is what I'm for." },
};

export const startersFor = (id) => STARTERS[id] || null;

// THE DAILY POOL — what "let one be chosen for me" may hand a person, unasked.
// Keel's rail (2026-09-17): a starter the person CHOOSES is their own statement; a starter the
// system HANDS them is a suggestion about their life. So the pool is the four OPEN postures —
// working on, want, not sure, and the deep questions — twenty sentences a person can decline
// without being contradicted. The five "bothering" lines stay available by tap (chosen is always
// fine) and stay OUT of the random pool: handed unasked, "Someone hurt me and I'm still carrying
// it" tells a person on a decent morning that something is wrong. The mirror never asserts a
// condition the person did not bring.
export const dailyPoolFor = (id) => {
  const set = STARTERS[id];
  if (!set) return [];
  return [set.working, set.want, set.unsure, ...(set.bigger || [])].filter(Boolean);
};
