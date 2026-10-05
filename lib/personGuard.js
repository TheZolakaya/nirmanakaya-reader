// THE PERSON GUARD — INVENTED_PERSON (Air, 2026-10-05, "the Ravi guard"): a named human being on the glass that the asker never supplied is a hard
// failure, decided deterministically, not by a model remembering a rule. ONE implementation, used by every surface that puts generated prose in
// front of the person: the opening and later turns, the dragon, the medicine course, the step, the four floors, Clarify / Unpack / Example, the API
// and MCP door, and the persona renders when they go live.
//
// DETECTION (layered, deterministic):
//   1. a STRONG PATTERN — "your colleague Ravi", "your friend Maya", "someone named Daniel", "a person like Elena", "Ravi's", "Ravi said" — counts
//      even when the name is not in the lexicon;
//   2. a LEXICON NAME (common given names across cultures) written capitalised in the text;
//   3. EXCLUSIONS — names that are ordinary English words or this house's own names (Will, Faith, Grace, Hope, Joy, June, Rose, Mark, Drew, the 78,
//      the houses, the elements, Nirmanakaya…) never count from the lexicon; only a strong pattern can make them a person.
// PROVENANCE: a name is allowed if the ASKER supplied it anywhere in usable context — the question, the context they typed, their turns in this
// conversation, their journey block. The Reader's own earlier words are never provenance.
// FALLBACK (after the one re-ask, if the name survives): the name is removed mechanically — "your colleague Ravi" → "your colleague" only when the
// asker supplied a colleague; otherwise → "someone"; a bare name → "someone"; "Ravi's" → "someone's". Every fallback is logged by the caller.

import { getComponent } from './corrections.js';
const LEXICON = new Set(`Aaron Abdul Abigail Abraham Ada Adam Adele Adrian Adriana Ahmed Aidan Aiko Aisha Akira Alan Albert Alberto Alejandro Alex Alexa Alexander Alexandra Alexis Alfred Ali Alice Alicia Alina Alison Allison Alvin Amanda Amara Amber Amelia Amina Amir Amit Amy Ana Anand Anders Andre Andrea Andreas Andrew Andy Angela Angelo Anika Anil Anita Ann Anna Anne Annie Anthony Antonio Anya Arjun Arnav Arthur Arturo Asha Ashley Ashok Astrid Audrey Ava Ayesha Bailey Barbara Barry Beatrice Ben Benjamin Bernard Beth Bethany Betty Bianca Bilal Blake Bradley Brandon Brenda Brendan Brian Bridget Brittany Bruce Bruno Bryan Caleb Calvin Cameron Camila Carl Carla Carlos Carmen Carol Caroline Carolyn Carter Casey Catherine Cecilia Cedric Chad Chandra Charles Charlie Charlotte Chelsea Chen Cheryl Chloe Chris Christian Christina Christine Christopher Claire Clara Claudia Colin Connor Craig Cristina Cynthia Dakota Dale Damian Dan Dana Daniel Daniela Danielle Danny Darius Darren David Dean Deborah Debra Deepak Denise Dennis Derek Devin Diana Diane Diego Dimitri Divya Dmitri Dominic Donald Donna Dorothy Douglas Dylan Edgar Eduardo Edward Eileen Elaine Elena Eli Elias Elijah Elizabeth Ella Ellen Elliot Emeka Emil Emily Emma Enrique Eric Erica Erik Erin Esther Ethan Eugene Eva Evan Evelyn Fatima Felix Fernando Fiona Francesca Francisco Freya Gabriel Gabriela Gareth Gary Gavin George Georgia Gerald Gina Giovanni Giulia Gloria Gordon Graham Greg Gregory Gustavo Hamza Hana Hannah Harold Harper Harry Hassan Hayden Heather Hector Heidi Helen Henry Hiroshi Hugo Hussein Ian Ibrahim Ignacio Ilya Imani Ingrid Irene Isaac Isabel Isabella Isaiah Ivan Jacob Jacqueline Jaime Jake James Jamie Jan Jane Janet Janice Jared Jasmine Jason Javier Jay Jayden Jeffrey Jennifer Jenny Jeremy Jerome Jesse Jessica Jesus Jill Jim Joan Joanna Joel Johan John Johnny Jon Jonah Jonathan Jordan Jorge Jose Joseph Josh Joshua Juan Judith Judy Julia Julian Julie Julio Justin Kai Kamal Karen Kari Karim Karl Kate Katherine Kathleen Kathryn Katie Kayla Keith Kelly Ken Kenji Kenneth Kevin Khalid Kim Kimberly Kiran Kofi Krishna Kristen Kumar Kyle Lara Larry Laura Lauren Layla Leah Leila Lena Leo Leon Leonardo Liam Lin Linda Lisa Logan Lorenzo Louis Lucas Lucia Lucy Luis Luka Luke Lydia Madeline Madison Magnus Maria Mariam Marie Marina Mario Marissa Mark Marta Martha Martin Marvin Mary Mason Mateo Matthew Maya Megan Mehmet Melanie Melissa Mia Michael Michelle Miguel Mike Mila Min Mohammed Mohammad Monica Morgan Muhammad Nadia Nancy Naomi Natalie Natasha Nathan Neha Neil Nicholas Nicole Nikhil Nikita Nina Noah Noor Nora Olga Oliver Olivia Omar Oscar Owen Pablo Pamela Paolo Patricia Patrick Paul Paula Pedro Peter Philip Pierre Pooja Priya Rachel Rafael Rahul Raj Rajesh Ramon Randy Raquel Ravi Rebecca Reza Ricardo Richard Rita Robert Roberto Robin Rohan Roman Ronald Rosa Ross Ruby Russell Ruth Ryan Sabrina Sachin Sahil Salma Sam Samantha Samir Samuel Sandra Sanjay Sara Sarah Sasha Scott Sean Sebastian Sergei Sergio Seth Shannon Sharon Shawn Sheila Shirley Simon Sofia Sonia Sophia Sophie Stefan Stella Stephanie Stephen Steve Steven Sunil Susan Suzanne Svetlana Takeshi Tamara Tanya Tara Taylor Teresa Thomas Tiffany Timothy Tina Todd Tom Tomas Tony Tracy Travis Tyler Valentina Valerie Vanessa Vera Veronica Victor Victoria Vijay Vikram Vincent Vivian Walter Wanda Wayne Wei Wendy William Xavier Yara Yasmin Yuki Yusuf Zach Zachary Zainab Zara Zoe`.split(/\s+/));

// names that are also ordinary words, or this house's own names — never a person from the lexicon alone (a strong pattern can still make one)
const ORDINARY = new Set(`Will Faith Grace Hope Joy June Rose Mark Drew May April August Summer Dawn Sky Hunter Bill Pat Sue Art Ray Iris Ivy Lily Jade Max Rich Frank Earnest Patience Honor Victory Chance Destiny Harmony Penny Ginger Jean Bob Rob Sunny Autumn Winter Holly Heather Amber Ruby Pearl Crystal Storm Rain River Brook Forest Glen Dale Cliff Rocky Sandy Cliff Gene Guy Miles Chase Grant Lance Cash Royal King Prince Major Bishop Pierce Wade Sage Reed Rowan Hazel Olive Violet Daisy Poppy Willow Faithful Charity Constance Prudence Felicity Liberty Trinity Genesis Haven Justice Journey Echo Nova Fable Story Moon Sun Star Angel Christian Will`.split(/\s+/));
let HOUSE = null;
export function setHouseNames(names) { HOUSE = new Set((names || []).flatMap((n) => String(n).split(/\s+/)).filter((w) => /^[A-Z]/.test(w))); }
const houseHas = (w) => { if (!HOUSE) { const n = []; for (let i = 0; i < 78; i++) { const c = getComponent(i); if (c?.name) n.push(c.name); } setHouseNames([...n, 'Spirit', 'Mind', 'Emotion', 'Body', 'Gestalt', 'Fire', 'Water', 'Air', 'Earth', 'Aether', 'Intent', 'Cognition', 'Resonance', 'Structure', 'Seed', 'Bridge', 'Fruition', 'Feedback']); } return HOUSE.has(w); }; // the 78 and the house's words, loaded once, here — no surface has to remember
const ALWAYS_ALLOWED = new Set(['Nirmanakaya', 'Reader', 'Source', 'Creation', 'Monkey']);

const ROLES = 'colleague|coworker|co-worker|friend|partner|boss|manager|supervisor|colleagues|sister|brother|mother|father|mum|mom|dad|son|daughter|wife|husband|boyfriend|girlfriend|neighbou?r|teacher|client|roommate|flatmate|cousin|aunt|uncle|grandmother|grandfather|grandma|grandpa|mentor|coach|therapist|doctor|ex|fiance|fiancee|spouse|kid|child|teammate|lead|director|landlord';
const NAME = "([A-Z][a-z]{1,15}(?:-[A-Z][a-z]+)?)";
const STRONG = [
  new RegExp(`\\b(your|a|my|his|her|their|the|our)\\s+(${ROLES})\\s*,?\\s+${NAME}\\b`, 'g'),     // your colleague Ravi
  new RegExp(`\\b(someone|somebody|a person|a man|a woman|a friend|a colleague)\\s+(?:named|called)\\s+${NAME}\\b`, 'g'), // someone named Daniel
  new RegExp(`\\b(someone|somebody|a person|people|a friend|a colleague)\\s+like\\s+${NAME}\\b`, 'g'), // a person like Elena
  new RegExp(`\\b(?:named|called)\\s+${NAME}\\b`, 'g'),                                              // … named Daniel
];

/** Names the asker supplied: every capitalised word in their own text (question, context, their turns, their journey block). */
export function allowedNamesFrom(askerTexts = []) {
  const out = new Set(ALWAYS_ALLOWED);
  for (const t of askerTexts) for (const w of String(t || '').match(/\b[A-Z][a-z]{1,15}\b/g) || []) out.add(w);
  return out;
}

/** The invented people in a piece of user-visible text: [{ name, match, role }] */
export function findInventedPeople(text, allowed) {
  const t = String(text || ''); const hits = new Map(); const ok = (n) => allowed.has(n) || ALWAYS_ALLOWED.has(n) || houseHas(n);
  for (const re of STRONG) { re.lastIndex = 0; let m; while ((m = re.exec(t))) { const name = m[m.length - 1]; if (ok(name)) continue; if (/^(The|This|That|What|When|Where|You|Your|It|He|She|They|We|I)$/.test(name)) continue; if (!hits.has(name)) hits.set(name, { name, match: m[0], role: m[2] && new RegExp(`^(${ROLES})$`).test(m[2]) ? m[2] : null }); } }
  for (const m of t.matchAll(/\b[A-Z][a-z]{1,15}\b(?:'s)?/g)) {
    const name = m[0].replace(/'s$/, ''); if (!LEXICON.has(name) || ORDINARY.has(name) || ok(name) || hits.has(name)) continue;
    hits.set(name, { name, match: m[0], role: null });
  }
  return [...hits.values()];
}

/** The scar for the guard lists. */
export function personFlags(text, allowed) {
  const hits = findInventedPeople(text, allowed);
  return hits.length ? [{ code: 'person', hits, detail: `you introduced a named person the asker did not provide (${hits.map((h) => h.name).join(', ')}) — rewrite without that person or any new unsupported life detail; preserve the earned reading and the corrective operation` }] : [];
}

/** The mechanical fallback: remove the invented names. A role survives only if the asker supplied that role. Returns { text, changed }. */
export function scrubInventedPeople(text, allowed, askerTexts = []) {
  let t = String(text || ''); const hits = findInventedPeople(t, allowed); if (!hits.length) return { text: t, changed: [] };
  const asker = askerTexts.join(' ').toLowerCase(); const changed = [];
  for (const h of hits) {
    const n = h.name;
    const roleRe = new RegExp(`\\b(your|a|my|his|her|their|the|our)\\s+(${ROLES})\\s*,?\\s+${n}\\b('s)?`, 'g');
    t = t.replace(roleRe, (all, det, role, poss) => { const supplied = new RegExp(`\\b${role}\\b`).test(asker); const out = supplied ? `${det} ${role}${poss || ''}` : `someone${poss ? "'s" : ''}`; changed.push(`${all} → ${out}`); return out; });
    t = t.replace(new RegExp(`\\b(someone|somebody|a person|a man|a woman|a friend|a colleague)\\s+(?:named|called|like)\\s+${n}\\b`, 'g'), (all, who) => { changed.push(`${all} → ${who}`); return who; });
    t = t.replace(new RegExp(`\\b${n}'s\\b`, 'g'), (all) => { changed.push(`${all} → someone's`); return "someone's"; });
    t = t.replace(new RegExp(`\\b${n}\\b`, 'g'), (all) => { changed.push(`${all} → someone`); return 'someone'; });
  }
  t = t.replace(/(^|[.!?]\s+)someone/g, (m, p) => `${p}Someone`);
  return { text: t, changed };
}

/** Apply the fallback to every user-visible field of a reply object. Returns the changes made (for the log). */
export function scrubReply(obj, allowed, askerTexts = [], fields = ['gist', 'reader', 'text', 'medicine', 'question']) {
  const changes = [];
  for (const f of fields) { if (typeof obj?.[f] !== 'string') continue; const r = scrubInventedPeople(obj[f], allowed, askerTexts); if (r.changed.length) { obj[f] = r.text; changes.push(...r.changed.map((c) => `${f}: ${c}`)); } }
  return changes;
}
