'use client';

// /ez — EZ MODE (the discourse layer — v2, 2026-09-14)
// The Reader opens BRIEF: the whole card in a few sentences, the verdict first if there is one,
// then ONE question back. Everything else unfolds in conversation.
//
// Three tiers of affordance, three visual weights (the founder's clutter ruling, 2026-09-14):
//   1. TALKING — pills written from each turn: Build / Push back / Clarify / Stair. No draw, cheap.
//      Unpack and Clarify from the full site are absorbed here: in a conversation they are
//      sentences, not buttons.
//   2. THE FIELD — two switches, Reflect and Forge. Flipping one RE-RENDERS the pills: four
//      questions to put to the field, or four declarations to forge from. Tapping one draws a card.
//   3. SIMPLER — a small link on a turn; re-says that turn plainly. A re-render, not a new turn.
//
// Gated: signed-in admins, or the ez_enabled feature flag. Production reading page untouched.
// Requirements: REQUIREMENTS_The_Discourse_Layer_EZ_Mode_2026-09-13.md (Hybrid + shelf).

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { STATUSES, STATUS_INFO } from '../../lib/constants';
import { ARCHETYPES } from '../../lib/archetypes';
import { getComponent, getFullCorrection, getCorrectionTargetId, getCorrectionText } from '../../lib/corrections';
import { generateSpread, formatDrawForAI, sanitizeForAPI, ensureParagraphBreaks, stripDirectiveEcho } from '../../lib/utils';
import { seedParts } from '../../lib/ezSeed'; // .530: the geometry + teleology seed, per card turn
import { addressBlock, distanceLine, addressOf } from '../../lib/address';
import { TRAUMA_RX, TRAUMA_BLOCK, AI_RX, AI_BLOCK, FRAMES, frameOf, FRAME_ASK, frameBlock, HUNCH_LINE, addressLines, fmtDrawForEz, buildOpeningMessage } from '../../lib/ezOpening'; // 2026-10-04 ONE READER: the opening's composition lives in the library, shared with the API // .651: every draw's address, for the six sentences // .539: the locating card's address as a pointer; .563: its distance from where they were looking
import { reviewTurn, notesBlock, retryNote } from '../../lib/ezReview'; // .560: the house's notes — the application reviews every turn
import { BASE_SYSTEM, EXPANSION_PROMPTS } from '../../lib/prompts'; // EXPANSION_PROMPTS: the full reader's clarify / unpack / example, lifted verbatim (.500)
import { VOICES, EZ_RULES, ezSystem, medicineBlock, BRAZIER_HARD_RULE, BRAZIER_RULES, DRAGON_STANDARD, brazierSystem, dragonBlock, doSomethingBlock } from '../../lib/ezPrompts';
import DEFS from '../../lib/data/nirmanakaya_78_definitions.json';
import { STARTER_KINDS, DOOR_SUBS, STARTERS, dailyPoolFor } from '../../lib/starters';
import { buildKernel, kernelBlock } from '../../lib/kernel';
import { drawRecord, medicineRecord as medicineRecordOf } from '../../lib/record';
import { MODEL_IDS, MODEL_PRICING, CACHE_READ, CACHE_WRITE_1H, usdFor, READER_CHOICES } from '../../lib/modelConfig';
import { parseReaderJson } from '../../lib/readerJson';
import { HANDING_SET } from '../../lib/handingPrompt'; // THE HANDING (2026-09-30→10-02): the rewritten prompt set, admins first
import { lintOutput } from '../../lib/bakeoff/lint'; // the scar tests, run on every reply (the garble guard)
import { getUser, getSession, readingAuth, isAdmin, saveReading, updateReadingContent, getReadings, getReading, rememberAuthReturn, getClosedTopics, addClosedTopic, removeClosedTopic } from '../../lib/supabase';
import AuthModal from '../../components/auth/AuthModal';
import { getHomeArchetype, getCardType, getCardImagePath, getCardThumbPath } from '../../lib/cardImages';
import TheMap from '../../components/map/TheMap';
import { runLanding, clearLanding, placeWordmark } from '../../components/map/landing';
import CardImage from '../../components/reader/CardImage';
import Minimap from '../../components/reader/Minimap';
import MinimapModal from '../../components/reader/MinimapModal';
import InfoModal from '../../components/shared/InfoModal';
import TextSizeSlider from '../../components/shared/TextSizeSlider';
import BrandHeader from '../../components/layout/BrandHeader';
import { useBackdropPrefs, Backdrop, CornerControls } from '../../components/shared/SiteChrome';
import Footer from '../../components/layout/Footer';

const EZ_VERSION = 'ez-2';
const STATUS_COLOR = { 1: '#34d399', 2: '#fbbf24', 3: '#38bdf8', 4: '#a78bfa' };

// THE VOICES. The founder's wife read her first reading on 2026-09-14 and could not use it: "it
// was filled with a lot of our nomenclature ... just for people that were esoteric and really into
// tarot." The reading was correct and unusable. So EZ carries a VOICE, chosen once and changeable
// any time, that sets the register of every turn. The draw, the statuses and the medicine are
// untouched; only the words change. The architecture stays visible where it belongs — on the
// cards and the minimap — not in the vocabulary of the prose.
//
// "plain" is the default: anyone can read it. "map" is the reading in the map's own words, for
// people who know them. The voice block rides AFTER the EZ rules so it wins on wording.

// The EZ rules ride AFTER the base system (covenant + laws) so the Reader keeps every law it has.

// FIND IT — the funnel (founder, 2026-09-16 evening). The Reader names its own vagueness with
// a locate chip; tapping it runs up to three narrowing rounds whose questions come from the
// GEOMETRY, never from a wise reader's judgment: the seat says where to look, the status says
// what shape the thing has, the medicine is the tell. The Reader never names the thing.
const locateBlock = (loc, brief) => `

FIND IT. The person tapped the chip YOU wrote ("help me find it"). The thing you named in that chip was: "${loc.what}" — those are YOUR words from your last turn, not theirs, and you did NOT ask them to find it: never "I asked you to find…", never "you said…". Their words are only what they typed; your last question was the one in your "question" field, nothing else. This is narrowing turn ${loc.step}${loc.balanced ? ' (a Balanced card: ONE narrowing turn at most)' : ' (three at most)'}. The draw cannot name the thing; only they can. Your job is to NARROW, one question per turn, with the question coming from the geometry; and to STOP the moment they have named it.
THEY MAY END THE SEARCH THEMSELVES. If their turn is marked as NAMING IT, or they say they have it, or that this is close enough, the search is over on their word, not your judgement: take what they give you as the thing, confirm it against the signature in one line, fill "located" with it in their words, and land the medicine on it. Never tell them they have not found it yet.
FOUND IS FOUND. If their latest turn names a specific enough thing, at whatever level of detail THEY offered ("a family thing, mutual but I keep it warm" is found), the funnel is over: confirm it against the signature in one line, fill "located" with the thing in their words (under 12 words), and land the medicine ON THAT THING in "medicine": the Rebalancer signature's OWN move (what it is about is stated below), applied to the named thing as a specific, ordinary first step. Never substitute a different move that seems wiser than the signature's own. Never ask for more detail than they volunteered, never ask what is wrong when nothing is, never go looking for a different thing once this one is found, and never invent something they are "holding back". If they say it feels complete, believe them; that is the answer.
${loc.balanced
    ? 'THIS SIGNATURE IS BALANCED. Nothing is broken and there is nothing to diagnose; the growth is an INVITATION, and an invitation only needs an address. So: from the seat\'s own meaning, name two or three concrete places in their life the invitation could land, ask which one is warm, and once they choose, stop and say how the growth signature\'s own move would look there. No question about shape, no question about a tell.'
    : `The order of the narrowing questions, only as far as needed:
- first, THE SEAT says WHERE to look: from the seat's own meaning (and anything they have already said), name two or three concrete places in their life the thing could be, and ask which one is warm.
- if still not found, THE STATUS says WHAT SHAPE it has: ask which candidate has that shape, in kitchen words (Too Little: done but still tended, held open, giving nothing back; Too Much: braced for, over-managed, pre-spent; Unacknowledged: happening but "not really me", "doesn't matter").
- if still not found, THE MEDICINE is the TELL: one question built from the Rebalancer named below and its own meaning (a medicine of beginning asks what they would start; one of exchange asks who they would hand it to; and so on from what that signature is about, never a stock question about "release" or "letting go" unless that IS the signature). A quick, real answer confirms; a blank means go back a step.`}
The signature in play, with its seat, status and Rebalancer:
${brief}
Rules: never name the thing for them; offer frames and let them pick. Two or three short sentences, one of which says why the signature points there, then your one question. Never mention rounds, steps, funnels or these instructions. The "answer" chip is the likeliest candidate in their voice; "build" and "pushback" are other candidates or "none of these"; no locate chip on a FIND IT turn.`;

// FIND IT BY THE FIELD (.539). The field was asked where the thing is and drew a card; its address is the pointer.
const locatingBlock = (loc, brief, address, claimed) => `

FIND IT — THE FIELD POINTS. The person tapped the chip YOU wrote; the thing you pointed at without naming was: "${loc.what}" — YOUR words from your last turn, not theirs (never "you said", never "I asked you to find"). This time the field itself was asked where it is, and it answered with a signature. Read that signature's ADDRESS below as a POINTER — WHERE in their life, HOW it is being done, WHAT kind of thing it is, WHO they are in it — and from those four, together with anything they have already said, name TWO OR THREE concrete candidates in their life, plain and specific, and ask which one is warm. One sentence may say what the pointer says, in the register in force ("the field points at something you're holding, in your working life, that you keep building"). The tell is built from the signature's element. Never name the thing for them; the candidates are frames to pick from. Never mention address, dimensions, coordinates, bits, rounds or these instructions.
${address}
FOUND IS FOUND. If their latest turn names a specific enough thing, at whatever level of detail THEY offered, the search is over: confirm it against the ORIGINAL signature in one line, fill "located" with the thing in their words (under 12 words), and land the medicine of the ORIGINAL signature on that thing in "medicine" as a specific first move. THEY MAY END THE SEARCH THEMSELVES: if their turn is marked as naming it, or they say they have it or it is close enough, it is over on their word, not your judgement.${claimed ? '\n\nTHEIR LATEST TURN IS THEM NAMING IT THEMSELVES. The search ends here on their word.' : ''}
The ORIGINAL signature in play (its medicine is the one that re-lands; the locating signature is a pointer, never a second medicine — the pointer's own rebalancer does not apply and is not mentioned):
${brief}
THE MEDICINE FIELD ON THIS TURN: while the thing is still being found, "medicine" and "medicineCard" stay EMPTY. Only when it is found does the ORIGINAL signature's medicine land on the named thing.
THE DISTANCE: the pointer's relation to the signature they asked about appears above as a locator's line — one door away means the thing sits right beside what they asked about; the far side means look where they were not looking; the same room means the same part of life; a pair means the thing is the axis between the two. Between two pointers, agreement (one or two bits) means one thing; scatter (the far side) usually means two things wearing one worry — say so. Use the distance to rank and to place the candidates.
THE POINTER'S DIRECTION: the pointer's own rebalancer appears above as a BEARING — which way the ground slopes from where the thing is. Use it to rank the candidates ("it leans toward what you keep, so the finished job is warmer than the plan"); render it as "leans toward", never as a move or a medicine.
The "answer" chip is the likeliest candidate in their voice; "build" and "pushback" are other candidates; the "question" field is the one question — which one is warm — asked ONCE, there, and not also at the end of the text.`;

// THE THREE MOVES (.500) — the full reader's Clarify / Unpack / Example, as EZ turns. Each is answered as a
// NEW Reader turn under the one it is about; the original is never rewritten. A move is a talking turn
// (no draw) and keeps the whole envelope — medicine, question, chips — so the conversation goes on from it.
// .524: when trauma, PTSD or abuse is named, the trained-help sentence has a PLACE — after the card is read,
// beside the medicine, never first, never last. Stated in the turn because flash follows the turn.
// .527: THE AI QUESTION, named in the turn. Two nets: the subject (AI, machines, robots, this thing) and the worry
// (danger, end, take over, risk, fear, safe, valid concern, what can I do).
// THE FRAME (.544) — what the reading is ABOUT. A category, a detail, or the person's own words. The frame is a qualifier
// in the turn: the card, seat, status and medicine are computed exactly as before; the frame says what the card is read AS.
// .571: THE TOPICS, GROUPED (founder, 2026-09-25: "we should call this topic… better organization and categorization — this looks
// sloppy"). Layout only: the keys and lenses are unchanged. The grouping is plain-language, not a ruling on the frame survey.
const FRAME_GROUPS = [
  { label: 'People', keys: ['person', 'us'] },
  { label: 'Work & making', keys: ['work', 'making'] },
  { label: 'Daily life', keys: ['body', 'money', 'place', 'activity'] },
  { label: 'Choices & patterns', keys: ['decision', 'pattern'] },
  { label: 'The bigger picture', keys: ['now', 'week', 'bigger'] },
  { label: 'Or', keys: ['custom'] },
];
const frameLabel = (fr) => { const f = fr && frameOf(fr.k); if (!f) return ''; return f.k === 'custom' ? (fr.detail || 'something else') : `${f.label}${fr.detail ? ` — ${fr.detail}` : ''}`; };
// .569: THE FRAME ON EVERY READING (founder, 2026-09-24: "frame should just be a part of every reading — auto detect a custom frame
// per reading, thematic, based on the querent's question, and allow for manual framing"). When no frame was chosen, the opening
// turn asks the Reader to name what the question is about, in the envelope's "frame" field; the house keeps it as the frame in
// force (marked auto) and the person can change or clear it from the reading itself. A manual frame always wins.
const pickFrame = (f) => {
  if (!f || typeof f !== 'object') return null;
  const k = String(f.k || f.kind || f.category || '').trim().toLowerCase();
  if (!frameOf(k)) return null;
  const detail = typeof f.detail === 'string' ? f.detail.trim().replace(/^["'“”]+|["'“”.]+$/g, '').slice(0, 80) : '';
  if (k === 'custom' && !detail) return null;
  return { k, detail, auto: true };
};

// .557: the hunch check, stated in the turn (flash follows the turn): a guess about the person's life is asked, never asserted

const MOVE_LABEL = { clarify: 'Clarify that for me.', unpack: 'Unpack that.', example: 'Give me an example.' };

// .635 THE MIC — a button that records and hands back words. Lives outside the page component so both boxes can use it.
function MicButton({ onText, getAuth, className = '', onStatus }) {
  const [state, setState] = useState('idle'); // idle | recording | working | denied
  const recRef = useRef(null); const chunksRef = useRef([]); const streamRef = useRef(null);
  const say = (m) => { try { onStatus && onStatus(m); } catch {} };
  const stop = () => { try { recRef.current?.state === 'recording' && recRef.current.stop(); } catch {} };
  const start = async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') { say('This browser cannot record audio.'); return; }
    let stream; try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { setState('denied'); say('The microphone was not allowed — check the browser’s permission for this site.'); return; }
    streamRef.current = stream;
    const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus', ''].find((m) => !m || (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)));
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined); recRef.current = rec; chunksRef.current = [];
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunksRef.current.push(e.data); };
    rec.onstop = async () => {
      try { stream.getTracks().forEach((t) => t.stop()); } catch {}
      const type = rec.mimeType || mime || 'audio/webm'; const blob = new Blob(chunksRef.current, { type });
      if (blob.size < 1500) { setState('idle'); say(''); return; } // a tap with no speech
      setState('working'); say('Listening back…');
      try {
        const ext = /mp4/.test(type) ? 'mp4' : /ogg/.test(type) ? 'ogg' : 'webm';
        const form = new FormData(); form.append('audio', blob, `speech.${ext}`);
        const h = await getAuth();
        const r = await fetch('/api/transcribe', { method: 'POST', headers: { ...h }, body: form });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || !j.text) { say(`Voice to text: ${j.error || 'nothing came back'}`); setState('idle'); return; }
        onText(j.text); say('');
      } catch (e) { say(`Voice to text: ${e?.message || 'failed'}`); }
      setState('idle');
    };
    rec.start(250); setState('recording'); say('Listening… tap the mic again when you are done.');
  };
  const busy = state === 'working';
  return (
    <button type="button" onClick={() => (state === 'recording' ? stop() : busy ? null : start())} disabled={busy}
      title={state === 'recording' ? 'stop, and turn it into words' : 'speak instead of typing'} aria-label={state === 'recording' ? 'stop recording' : 'record'}
      className={`z-10 flex items-center justify-center rounded-full border backdrop-blur-md transition-all duration-300 h-9 w-9 ${state === 'recording' ? 'border-rose-400/80 bg-rose-500/20 text-rose-200 animate-pulse' : busy ? 'border-zinc-600 text-zinc-500' : 'border-zinc-700/50 bg-black/20 text-zinc-400 hover:text-zinc-100 hover:border-zinc-500'} ${className}`}>
      {busy ? <span className="text-xs">…</span> : state === 'recording'
        ? <span className="block h-3 w-3 rounded-sm bg-rose-300" />
        : <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><path d="M12 18v3" /></svg>}
    </button>
  );
}
// .543: HEAR IT ANOTHER WAY — 'voice:<register>' is a move like the three: the same turn said again in another register.
const VOICE_REG = (kind) => (typeof kind === 'string' && kind.startsWith('voice:') ? kind.slice(6) : null);
const VOICE_LABELS = { plain: 'plain words', grown: 'plain words, grown', map: "the map's words", deep: 'deep', mystical: 'mystical' };
const voiceMoveLabel = (reg) => `Say that again, in ${VOICE_LABELS[reg] || reg}.`;
const voiceMoveRule = (reg, line, srcMedicine = '') => `THE MOVE — SAY IT AGAIN, IN ANOTHER VOICE.${srcMedicine ? ` THE MEDICINE OF THE ORIGINAL TURN — keep it: the same signature, the same move, in the new register: "${srcMedicine}".` : ''} The person wants to hear the turn quoted below in a different register: ${(VOICE_LABELS[reg] || reg).toUpperCase()}. Say the SAME turn again — same signature, same seat, same status, same medicine, the same question at the end — in that register, as a NEW turn under it. Nothing new is introduced and nothing is lost; the register is the only thing that changes. The register: ${line}`;
// The prompts are the FULL READER'S OWN, verbatim (lib/prompts.js EXPANSION_PROMPTS — founder, .500: "lift what we
// did exactly from the advanced reader"); EZ adds only the envelope: a new turn, then the one question.
// .700 (founder, on an Unpack that opened with "think of a chair in a room"): the three moves no longer run on the full reader's old instructions
// ("explore the layers… beneath the surface", "set the scene"), which invited figure and scene; each is written under the voice in force, in the
// turn's own shape — a gist, a body, one question — and the Handing's rules (literal first; whose words are whose; the medicine as the person's own
// instance, never the record's line) hold on a move exactly as on a turn.
const MOVE_SHAPE = `THE SHAPE OF A MOVE: the same JSON as any turn — "gist" (one sentence: what this move adds, in ordinary words), "reader" (the body, 2–4 short paragraphs, a blank line between them), "question" (ONE question, plainly, at the end — never two), "medicine" (empty: the medicine was given on the turn above and is not given twice), chips/reflect/forge as usual. The voice in force governs every word of it.`;
const MOVE_RULES = {
  clarify: `THE MOVE — CLARIFY. Say the turn quoted below again so that it is easier to hold: the same claims, the same verdict, the same way through, in shorter sentences and more ordinary words, nothing added and nothing dropped. No new image — if the turn used one, replace it with the plain statement it stood for. Open the way a person would ("Okay — let me put it to you this way"). This answers as a NEW turn under the one quoted, never a rewrite of it.
${MOVE_SHAPE}`,
  unpack: `THE MOVE — UNPACK. Show the turn quoted below with its grounds visible, in ordinary words: for each claim it made — what came up, how they are carrying it, where it shows up, the way through — say what that claim rests on and what it implies for the person, one claim at a time. Grounds, not depth: no new image, no scene, no "think of a…", no metaphor for a thing the turn already said plainly; where the turn used a figure, unpack it into the statement it stood for. Nothing from the turn is dropped and nothing is contradicted. This answers as a NEW turn under the one quoted.
${MOVE_SHAPE}`,
  example: `THE MOVE — EXAMPLE. One concrete instance of the turn quoted below, and only one, built from what the person has actually said in this conversation — their nouns, their situation. If they have named nothing concrete, the example stays general ("a decision you have already made", "one thing you keep reopening") rather than inventing a job, a partner, a room or a habit for them; a stranger's scene is allowed only when you say it is a stranger's, in one sentence. Never claim the field drew the signature because of the scene. This answers as a NEW turn under the one quoted.
${MOVE_SHAPE}`,
};

const SIMPLER_RULES = `SAY IT SIMPLER — rewrite the turn below in plainer words, for someone who wants it easier to hold. Same meaning, same verdict. Nothing softened, nothing added, nothing dropped. Shorter sentences, kitchen words, no architecture vocabulary except a signature's name where it is needed. Keep the one question at the end, rephrased just as plainly. Respond with ONLY a JSON object: {"reader": "<the simpler version>", "question": "<the question, plainly>", "chips": [], "reflect": [], "forge": []}`;

// THE BRAZIER — "why is this happening?" (Keel's spec, 2026-09-16). The kernel is data; this
// prompt renders it in the KITCHEN register. Ring 1 is all kitchen; beneath it, three lanterns —
// the meaning, the moon, the mechanism — each a floor of its own; only the mechanism carries the
// one invitation into the full reader.
const FLOOR_LABEL = { meaning: 'the meaning', moon: 'the moon', mechanism: 'the mechanism' };
const OPT = { color: '#d4d4d8', background: '#18181b' };
// .661 (Keel §10): the doors the Reader may recommend at the close, as the glass names them
// a door as the model may name it → its key (the model sometimes writes the glass name: 'Find It', 'The moon', 'Words of the Wise')
const panelKey = (x) => { const k = String(x || '').trim().toLowerCase().replace(/^the\s+/, '').replace(/[^a-z ]/g, '').trim(); return ({ 'words of the wise': 'whys', 'words to the whys': 'whys', 'go deeper': 'whys', why: 'whys', whys: 'whys', meaning: 'meaning', moon: 'moon', mechanism: 'mechanism', reflect: 'reflect', forge: 'forge', clarify: 'clarify', unpack: 'unpack', example: 'example', find: 'find', 'find it': 'find', medicine: 'medicine', dragon: 'dragon', 'face the dragon': 'dragon', step: 'step', 'one small step': 'step', 'small step': 'step' })[k] || null; };
const NEXT_LABEL = { whys: 'Words to the Whys', meaning: 'The meaning', moon: 'The moon', mechanism: 'The mechanism', reflect: 'Reflect', forge: 'Forge', clarify: 'Clarify', unpack: 'Unpack', example: 'Example', find: 'Find it', medicine: 'The medicine', dragon: 'Face the dragon', step: 'One small step' }; // .661 (Keel §5): an option's own colours — the list no longer goes near-white on click
// FACE THE DRAGON — Keel's eight, parked here for the CLOSE-row build (.444). Two are
// opportunity-dragons (B1, B3) so 'dragon' never collapses into 'problem'.
// GATED UNTIL THEIR EXEMPLARS FREEZE (founder's ruling R6): the meaning waits on his judgment of
// BRIEF_Ring_Two's eight; the moon's eight are not yet written. The bench shows all three.
const FLOORS_OPEN = { meaning: true, moon: true, mechanism: true }; // opened 2026-09-19 night (founder: "make this all accessible to all users")

// THE DO-SOMETHING BUTTON (Keel's spec §2). Not a mode. Consults nothing. One small real act,
// then the Reader goes quiet. The name is a config string — the founder picks.
const DO_SOMETHING_LABEL = 'One small step'; // founder, 2026-09-16 night (was 'what can I do about this?')
const DO_SOMETHING_HINT = 'one small real thing, in the next minute';

// FACE THE DRAGON (Keel's ADDENDUM_The_Moon_Comes_Back_Face_The_Dragon, 2026-09-19; the founder's
// ruling the same morning: NO drain gate — "the tap is the consent", "maybe that thing is a
// gas-breathing dragon"). The fierce door: the thing itself, said straight — the problem being
// walked around OR the opportunity not picked up. Chosen by name, never default.
const DRAGON_LABEL = 'Face the dragon';

// THE MEDICINE, TAKEN (.538; founder, 2026-09-22 morning: "more treatment… that deepens the understanding of the
// medicine"). The fourth door: what it is, why it is the medicine, how to take it over a week. Follows the register.
const MEDICINE_LABEL = 'The medicine';
const MEDICINE_HINT = 'what it is, why it is the way through, how to take it over a week, and what is on the other side';
const MEDICINE_PARTS = [['WHAT IT IS:', 'what it is'], ['WHY IT IS THE MEDICINE:', 'why it is the medicine'], ['HOW TO TAKE IT:', 'how to take it'], ['THE OTHER SIDE:', 'the other side']]; // .556
const DRAGON_HINT = 'the thing itself, said straight — a problem walked around, or a gift not picked up';

const CLOSING_RULES = `WRITE THIS UP AND CLOSE. The person has asked for the whole reading in one piece, to keep. Write it for them to read next month, when the conversation is gone and only this is left. Under 300 words (raised from 220 on 2026-09-19 — it is the thing they keep), plain words, no framework vocabulary, no question at the end, nothing new introduced.
Five short parts, unlabelled, flowing as paragraphs:
1. What they came in asking, in their own words.
2. What the signatures said — the signature, where it landed, and what that meant, in the same plain terms the reading used.
3. What came out of the conversation: what they named, what they pushed back on, what they decided. Their words where you have them.
4. The way through, and the one move — concrete, as it was given. Then return to the FIRST thing they said they were worried about and say where it stands now — a reading that moved on from the opening concern still owes it an answer.
5. One closing line that hands it back to them and lets them stop. Warm, unhurried, no instruction, no self-care advice, no promise about what will happen.
THE FROZEN STANDARD (Keel, from the founder's own sessions, 2026-09-19; a synthesis, not a new reading — gather everything drawn and said into one honest account of where the person is NOW; end with the state, not a question):
1. C1. The founder's 2026-09-19 session (Too Much Celebration in Drive → Balanced Source in Inspiration)
   Here's where you are. You asked what you're ready to complete, and the first signature said: the thing you're already celebrating — the readiness is real, the timing was running a little ahead. Then you said the joy sharpens you, that you want to get there clean, and the field answered with the Wheel in the seat of your calling, balanced: a turn arriving that you didn't set in motion, and you present enough to meet it. So the two signatures aren't a contradiction; they're a sequence. The celebration was early. Then you turned it into attention. Now you're standing at a threshold with your eyes open and the finish in sight — not sprinting, not stalling, looking harder at what's left. That's the state: ready, sharpened by the nearness, and the wheel has come round to you while you were here for it. Nothing is stuck. What's left is the last stretch, and you've already said what you're bringing to it: the joy, used as a lens.
2. C2. The founder's 2026-09-15 session (Balanced Preservation in Tune → Too Little Completion in Drive)
   Here's where you are. You asked what claiming this work's value would change, and the field said: you've already arrived — the part of you that holds things together is steady, and the missing piece was letting the work give something back. Then you asked which part you should be receiving, and the answer came sharper: the finish. Not the vision, not the process — the actual done-ness of what you've completed, which you've been stepping away from. So the picture is one thing seen twice: stable inside the work, not yet in exchange with it, and the specific channel that's closed is the feeling of finished. The way back isn't more building. It's one completed thing, held for ten seconds, let through you instead of past you. That's the state: solid ground, one channel shut, and the medicine is as small as standing still long enough to let a done thing land.
Respond with ONLY a JSON object: {"reader": "<the write-up>", "question": "", "chips": [], "reflect": [], "forge": []}`;

const CATCHUP_RULES = `WHERE AM I — write a catch-up signature for a person returning to this reading. Under 80 words, plain, four short lines: their question; the verdict or where the reading pointed; where the conversation last landed; the open thread (what was being asked when they left). No new interpretation. Respond with ONLY a JSON object: {"reader": "<the signature>", "question": "<the open thread as a question>", "chips": [], "reflect": [], "forge": []}`;

// THE LAYOUT BENCH — /ez?bench=1 (founder, 2026-09-16 night: "a bench where we're just looking at
// what the draw looks like and the structure, so we can futz with it in real time" without
// spending API calls or polluting his history). A fixed draw, a canned conversation, and every
// model call answered locally from the shapes below after a short delay so the pending states
// show too. Nothing is saved. Signed-in gate still applies.
const BENCH_DRAW = { transient: 51, position: 13, status: 3 }; // Too Little Completion in Transformation → Activation
const BENCH_QUESTION = "What's ready to close that I'm still holding open?";
const BENCH_CHIPS = [
  { kind: 'answer', text: "Honestly? Probably lighter than I want to admit." },
  { kind: 'build', text: "Yes, and I think I already know which one it is." },
  { kind: 'pushback', text: "No, it's more like I don't get to decide when it closes." },
  { kind: 'clarify', text: "What do you mean by 'a cycle that has finished'?" },
  { kind: 'stair', text: "What am I afraid happens the day after it closes?" },
  { kind: 'locate', what: 'the thing that is already done', text: "Help me find which thing this actually is." },
];
const BENCH_REFLECT = ["What is the door that's already shut?", "Why do I keep my hand on the handle?", "What would open if this closed?", "Is there something I owe it before it closes?"];
const BENCH_FORGE = ["I will say out loud that this is done.", "I will start one small thing this week.", "I will stop tending what stopped giving back.", "I will let the day after be a new day."];
const BENCH_OPENING = {
  reader: "Something is done. You already know what it is.\n\nThe signature you drew is about the feeling of completion — that quiet click when something has genuinely finished. Not almost done, not wrapping up, but done. That feeling is supposed to land, settle, and release you. Right now it's running low. It's like standing at a door that's already swung shut, with your hand still on the handle.\n\nThe seat it landed in is the part of life where things change shape — where one thing ends so another can begin. When the sense of completion is quiet here, the old thing doesn't compost. You keep tending it out of habit, or loyalty, or because closing it feels like losing it.\n\nThe way through starts with igniting something new — not finishing the old thing, but striking a fresh spark somewhere nearby. When you begin something, your whole system reorients to what's coming instead of what was, and the held-open door lets go on its own.",
  question: "What would actually change for you if you let this one thing close today?",
  chips: BENCH_CHIPS, reflect: BENCH_REFLECT, forge: BENCH_FORGE,
  medicine: "The way through isn't forcing the close — it's starting something fresh. Pick one small, real beginning this week: a new conversation, a first page, a single action you haven't taken yet. When you ignite something new in the same space where the old thing lived, the hold releases on its own.",
  act: "I keep my hand on a door that's already shut. What's one small thing I could actually do about that in the next minute?",
};
const BENCH_TALK = {
  reader: "That fits. A thing you keep tending out of loyalty is exactly what this signature calls held open — the loyalty is real, and so is the fact that it stopped giving anything back a while ago.\n\nNothing here says leave badly. It says the part of you that knows when something is finished has gone quiet, and that's why the hand stays on the handle.",
  question: "If it were gone tomorrow, what would you start?",
  chips: BENCH_CHIPS.slice(0, 5), reflect: BENCH_REFLECT, forge: BENCH_FORGE, medicine: '', act: '',
};
const BENCH_FUNNEL = {
  reader: "The signature landed in the part of life where things change shape, so that's where to look. Three places this usually lives: a role you still show up for though the reason you started it is gone; a relationship that quietly ended but is still technically on; or a version of yourself you haven't officially retired.\n\nWhich of those is warm?",
  question: "Which one of those feels like the real one?",
  chips: [{ kind: 'answer', text: "Honestly, the role. I keep showing up out of habit." }, { kind: 'build', text: "It's the version of me one — a story that stopped being true." }, { kind: 'pushback', text: "None of those. It's something else." }],
  reflect: BENCH_REFLECT, forge: BENCH_FORGE, medicine: '', act: '', located: '',
};
const BENCH_ACT = { reader: "Pick one thing that is finished — one conversation, one project, one chapter — and say out loud: \"This is done.\" Two words. That's the spark. Not a plan, not a list. Just the sound of a door closing, in your own voice, right now.", question: '', chips: [], reflect: [], forge: [], medicine: '' };
const BENCH_RINGS = {
  1: "Part of you is still standing at a door that's already behind you — that's why the direction feels missing, and why the tending has started to feel like a job. Something here has genuinely finished; you can feel that it has. What this moment is asking isn't a decision or a ceremony. It's a single move: let something begin. Not the next big thing — something small, available, requiring nothing but a yes. A fresh page, a message started, one action that belongs entirely to now. That move doesn't close the old thing by force. It just puts you on the other side of it.",
  2: "The signature is Completion, and it landed in Transformation — the seat where endings clear the ground for what comes next. Its status is Too Little: the sense of a thing being finished is running low, so the ending never quite lands.\n\nThe medicine runs on the vertical: a seat running on empty is charged through its twin, Activation — the fresh spark, beginning for its own sake. The geometry sends you there because you cannot push feeling into an empty seat; you put energy into the twin's own action and the current pulls through.",
  3: "Completion is the outer bound of Recognition in the Gestalt house, through the Resonance channel, at the Feedback stage: the point where a cycle is known to be whole. Too Little places it in the past tense — a door already behind you. The vertical pair fixes the medicine before any words are written: Activation, the first spark, through Intent.\n\nThis is a derivation, not a guess: the signature, the seat and the status settle the partner. If you want every signature laid out like this, the full reader holds it.",
};
const BENCH_FLOORS = {
  meaning: "Look at the picture on the signature that shows the way through: a single flame, just caught. Not a bonfire — the first small light, the moment before it's anything. That's what this turn is asking of you, and it isn't tidy: it's to be the one who strikes it. The finished thing behind you is real, and it will stay finished whether or not you keep tending it. What only you can do is what comes next — the page nobody has asked for yet, the message that starts a thing instead of closing one. You're not being asked to be sure. You're being asked to be the one who begins.\n\nWhat's the small thing you'd start if nobody needed you to?",
  moon: "This came to you because a part of your life that governs endings was listening — and it noticed that something in you is still standing at a door that has already closed. That's the whole reason it's this signature and not another: not a warning, an address. The turn arrived where you'd been waiting.\n\nHere's what it's for. Only this moment can be written in. The finished thing is read-only now; so is the version of you that finished it. But the pen is still in your hand, and it only writes here. Nothing about you is broken — you're the one making this, and the signature is simply what your making looks like from the inside tonight: a door behind, an unlit match ahead. That's not a small thing. That's the whole of it, every time.",
  mechanism: BENCH_RINGS[2] + "\n\n" + BENCH_RINGS[3],
};
const benchReply = (msg) => {
  if (/Write ring (\d)\. JSON only\./.test(msg)) return { text: BENCH_RINGS[msg.match(/Write ring (\d)/)[1]] };
  if (/Write the (meaning|moon|mechanism) floor\. JSON only\./.test(msg)) return { text: BENCH_FLOORS[msg.match(/Write the (\w+) floor/)[1]] };
  if (msg.includes('ONE SMALL REAL ACT')) return BENCH_ACT;
  if (msg.includes('FACE THE DRAGON.')) return { reader: "The thing you're walking around: it's finished, and you know it's finished, and you keep tending it because tending is easier than being the one who says so. Nobody is waiting for your permission except you. Here's what's in front of you — not a ceremony, not a decision: one thing started today that has nothing to do with the old one. A page, a message, a first hour. Start it, and the door you've been standing in closes on its own.", question: '', chips: [], reflect: [], forge: [], medicine: '' };
  if (msg.includes('FIND IT. The person tapped')) return msg.includes('narrowing turn 1') ? BENCH_FUNNEL : { ...BENCH_TALK, located: 'the role I keep showing up for out of habit', medicine: 'Start one small thing in the same space this week — a first message, a first page — and the role lets go of you.' };
  if (msg.includes('OTHER OPTIONS')) return { reader: '', question: '', chips: [...BENCH_CHIPS].reverse(), reflect: [...BENCH_REFLECT].reverse(), forge: [...BENCH_FORGE].reverse() };
  if (msg.includes('SAY IT SIMPLER')) return { reader: "Something is finished and you're still holding it. Start one small new thing and the old one will let go.", question: 'What would change if you let it close today?', chips: [], reflect: [], forge: [] };
  if (msg.includes('WHERE AM I')) return { reader: "You asked what's ready to close.\nThe signature said: something is already done.\nYou found it: a role kept out of habit.\nOpen thread: what would you start?", question: 'What would you start?', chips: [], reflect: [], forge: [] };
  if (msg.includes('A NEW SIGNATURE WAS DRAWN')) return { ...BENCH_TALK, medicine: "This signature's own medicine, rewritten from its Rebalancer, would sit here." };
  return BENCH_TALK;
};

// .453: the tolerant shared parser (lib/readerJson.js) — repairs raw line breaks inside strings,
// fences and trailing commas before giving up. Same parser the Bake-off uses.
function parseJson(text) { return parseReaderJson(text); }

function drawLabel(d) {
  if (!d) return '';
  const t = getComponent(d.transient);
  const s = STATUSES[d.status];
  const seat = ARCHETYPES[d.position]?.name;
  return `${s?.prefix || 'Balanced'} ${t?.name || '?'}${seat ? ` in ${seat}` : ''}`;
}

// THE BRIEF for a card drawn mid-conversation. Until 2026-09-15 the Reader was told six words
// about a reflect or forge card ("Too Little Completion in Drive") and nothing about its
// medicine, while the OPENING draw's rebalancer was restated in full every turn — so the
// model kept the only medicine it could see, and the new card's own correction was named on
// the page (computed here) and never administered in the prose. Keel's transcript note.
const MECHANISM = {
  1: 'GROWTH (Balanced): an invitation, optional — what this balance is free to feed next.',
  2: 'DIAGONAL (Too Much): authority in excess crosses the map to the opposite element; the medicine is that other pole\'s own action.',
  3: 'VERTICAL (Too Little): the seat is starved; the medicine is to charge its vertical twin — energy into the twin\'s own action, and the current pulls through the empty seat. Never push effort or feeling into the empty seat directly.',
  4: 'REDUCTION (Unacknowledged): authorship misattributed; the medicine returns toward the simpler, earlier form of the same line.',
};
const medicineRecord = (d) => medicineRecordOf(d, DEFS);

// THE DRAW, FROM THE RECORD — the same full record the advanced reader works from (founder,
// 2026-09-17: "the easy reader is easy on the user, not on the Reader API"). Used on every
// card-carrying turn; the opening adds the teleology block as well.
function drawBrief(d) {
  return drawRecord(d, DEFS);
}

// The medicine is computed, not generated: every imbalanced card already knows its
// correction card and the geometry that gets there.
function medicineFor(draws) {
  if (!Array.isArray(draws)) return [];
  return draws.map((d) => {
    const trans = getComponent(d.transient);
    const correction = getFullCorrection(d.transient, d.status);
    if (!correction) return null;
    const targetId = getCorrectionTargetId(correction, trans);
    if (targetId === null || targetId === undefined) return null;
    return {
      from: trans?.name,
      fromDraw: d,
      toId: targetId,
      to: getComponent(targetId)?.name,
      path: getCorrectionText(correction, trans, d.status) || '',
      balanced: d.status === 1
    };
  }).filter(Boolean);
}

// THE FIVE DOORS — derived by Keel (Water seat, 2026-09-14) from the five houses, which are
// already the taxonomy of human concern. Phrased as a person half-says it to themselves, not as
// the architecture names it. The house rides along to the Reader as framing, never as a verdict.
// The open field stays: the fluent keep their blank page, the pills carry everyone else.
// Renamed by the founder 2026-09-15 (morning): the houses in a person's own words, plus a
// sixth door where the cards choose — a daily reading with no question brought.
// "LET ONE BE CHOSEN FOR ME" — a house and one of its open sentences, with a memory, so the
// daily does not hand back yesterday's line or the same room two mornings running (Keel, 2026-09-17:
// "a random table with no memory will hand somebody 'What am I here for?' three days in a row and
// the daily stops feeling like a draw"). The pool is fenced in lib/starters.js.
const DAILY_KEY = 'nirmanakaya_daily_last';
const pickDaily = (doors) => {
  let last = {};
  try { last = JSON.parse(localStorage.getItem(DAILY_KEY) || '{}') || {}; } catch {}
  const houses = doors.slice(0, 5);
  const rooms = houses.filter((d) => d.id !== last.area);
  const house = (rooms.length ? rooms : houses)[Math.floor(Math.random() * (rooms.length ? rooms.length : houses.length))];
  const pool = dailyPoolFor(house.id);
  const fresh = pool.filter((t) => t !== last.text);
  const text = (fresh.length ? fresh : pool)[Math.floor(Math.random() * (fresh.length ? fresh.length : pool.length))] || '';
  try { localStorage.setItem(DAILY_KEY, JSON.stringify({ area: house.id, text })); } catch {}
  return { door: { ...house, viaDaily: true }, text };
};

const DOORS = [
  { id: 'spirit',  house: 'Spirit',  label: 'Passions & beliefs', sub: DOOR_SUBS.spirit, breath: 'Your passions and your beliefs — what moves you, and what you hold to be true.' },
  { id: 'mind',    house: 'Mind',    label: 'Peace of mind',      sub: DOOR_SUBS.mind, breath: 'Your peace of mind — what your head keeps turning over.' },
  { id: 'emotion', house: 'Emotion', label: 'Relationships',      sub: DOOR_SUBS.emotion,           breath: 'Your relationships — the people in your life, and the space between you.' },
  { id: 'body',    house: 'Body',    label: 'Health & prosperity', sub: DOOR_SUBS.body,     breath: 'Your health and your prosperity — your body, your home, your money, what you carry.' },
  { id: 'gestalt', house: 'Gestalt', label: 'Fulfillment',        sub: DOOR_SUBS.gestalt,   breath: 'Your fulfillment — whether your life is adding up to what you meant it to be.' },
  { id: 'daily',   house: null,      label: 'My daily reading',   sub: 'let one of these be chosen for me', breath: '' },
];

// A loop that plays only while its parent (the button it sits in) is hovered, focused or
// touched (founder, 2026-09-16 night). Paused it shows its first frame, so it still reads as an icon.
function HoverVideo({ src, className, style, playing = false }) {
  const ref = useRef(null);
  // .552: an OPEN door keeps its loop running for as long as it is open (founder) — playing overrides hover/touch
  const playingRef = useRef(playing);
  useEffect(() => { playingRef.current = playing; const v = ref.current; if (!v) return; try { if (playing) v.play().catch(() => {}); else v.pause(); } catch {} }, [playing]);
  useEffect(() => {
    const v = ref.current; if (!v) return;
    const host = v.closest('button') || v.parentElement?.parentElement || v.parentElement;
    if (!host) return;
    const play = () => { try { v.play().catch(() => {}); } catch {} };
    const stop = () => { if (playingRef.current) return; try { v.pause(); } catch {} };
    // PRIME THE FIRST FRAME: a paused video that has never played paints nothing on many phones
    // (blank until tapped — founder, 2026-09-17). A silent play-then-pause as soon as data arrives
    // leaves the first frame on screen.
    let primed = false;
    const prime = () => { if (primed) return; primed = true; try { const pr = v.play(); if (pr && pr.then) pr.then(() => { if (!host.matches(':hover') && !playingRef.current) v.pause(); }).catch(() => {}); } catch {} };
    if (v.readyState >= 2) prime(); else v.addEventListener('loadeddata', prime, { once: true });
    host.addEventListener('mouseenter', play); host.addEventListener('mouseleave', stop);
    host.addEventListener('focus', play); host.addEventListener('blur', stop);
    host.addEventListener('touchstart', play, { passive: true }); host.addEventListener('touchend', stop); host.addEventListener('touchcancel', stop);
    return () => {
      host.removeEventListener('mouseenter', play); host.removeEventListener('mouseleave', stop);
      host.removeEventListener('focus', play); host.removeEventListener('blur', stop);
      host.removeEventListener('touchstart', play); host.removeEventListener('touchend', stop); host.removeEventListener('touchcancel', stop);
    };
  }, []);
  return <video ref={ref} src={src} loop muted playsInline preload="auto" disablePictureInPicture controlsList="nodownload noremoteplayback" className={className} style={style} aria-hidden="true" />; // .661 (Keel §6)
}

// THE READER IS WRITING — the one waiting indicator for every small wait (founder, 2026-09-17,
// four loops of his own): one of the four loops, chosen at random each time, beside the line in
// the rainbow that cycles like Say it. Not for the landing flight; for everywhere else we wait on
// the Reader. (ANIM-18.)
const WRITING_LOOPS = ['/video/writing1.mp4', '/video/writing2.mp4', '/video/writing3.mp4', '/video/writing4.mp4'];
function Writing({ label = 'the Reader is writing…', size = 160, className = '', scroll = true }) {
  const [src] = useState(() => WRITING_LOOPS[Math.floor(Math.random() * WRITING_LOOPS.length)]);
  // .541: the seconds show, so a long wait is a long wait and not a dead page
  const [secs, setSecs] = useState(0);
  useEffect(() => { const t0 = Date.now(); const iv = setInterval(() => setSecs(Math.floor((Date.now() - t0) / 1000)), 1000); return () => clearInterval(iv); }, []);
  const slow = secs >= 20 ? (secs >= 60 ? 'still trying — the door is on its last host' : 'the host is slow — the door is handing it to the next one') : '';
  const ref = useRef(null);
  // it was appearing half off the bottom of a phone screen (founder, 2026-09-17): bring it to the top
  // ONCE, when it first appears — never again when the prop flips (a flight ending flipped it and
  // the scroll yanked the view to the bottom just as the words arrived — founder, 2026-09-17)
  const scrollOnce = useRef(scroll);
  useEffect(() => {
    if (!scrollOnce.current) return;
    const t = setTimeout(() => {
      try { const el = ref.current; if (!el) return; window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 72, behavior: 'smooth' }); } catch {}
    }, 60);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div ref={ref} className={`flex flex-col items-center gap-2 py-2 ${className}`} role="status" aria-live="polite">
      <span className="shrink-0 rounded-lg overflow-hidden" style={{ width: size, height: size }} aria-hidden="true">
        <video src={src} autoPlay loop muted playsInline disablePictureInPicture controlsList="nodownload noremoteplayback" className="w-full h-full object-cover" />
      </span>
      <span className="font-serif text-[1.0625rem] tracking-wide text-center"
        style={{ background: 'linear-gradient(90deg, #f87171, #fb923c, #facc15, #4ade80, #22d3ee, #a78bfa, #f472b6, #f87171)', backgroundSize: '200% 100%', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', animation: 'gradient-shift 3s ease infinite' }}>
        {label}{secs >= 4 ? <span className="opacity-70"> {secs}s</span> : null}
      </span>
      {slow && <span className="text-[0.75rem] text-zinc-400 text-center px-4">{slow}</span>}
    </div>
  );
}

const CHIP_STYLE = {
  answer: 'border-amber-400/60 text-amber-100 bg-amber-950/20 hover:bg-amber-900/30',
  build: 'border-emerald-500/40 text-emerald-200 hover:bg-emerald-900/30',
  pushback: 'border-orange-500/40 text-orange-200 hover:bg-orange-900/30',
  clarify: 'border-sky-500/40 text-sky-200 hover:bg-sky-900/30',
  stair: 'border-amber-500/50 text-amber-200 hover:bg-amber-900/30',
  locate: 'border-violet-400/60 text-violet-100 bg-violet-950/20 hover:bg-violet-900/30',
  reflect: 'border-sky-500/50 text-sky-200 hover:bg-sky-900/30',
  forge: 'border-orange-500/50 text-orange-200 hover:bg-orange-900/30',
};
const CHIP_LABEL = { answer: 'Answer', build: 'Build', pushback: 'Push back', clarify: 'Clarify', stair: 'Stair', locate: 'Find it' };
// each kind's own colour (rgb triplet) for the hover breathe — shades of itself, never another hue
const CHIP_RGB = { answer: '251 191 36', build: '52 211 153', pushback: '251 146 60', clarify: '56 189 248', stair: '251 191 36', locate: '167 139 250', reflect: '56 189 248', forge: '251 146 60' };

// A drawn card and its geometry, SIDE BY SIDE and the same width — the founder's ruling
// 2026-09-14: "I think they're equally significant." The minimap is always shown, because the
// map is how a person sees this is a derivation with boundaries and not an agreeable machine.
// Tapping the art opens the card; tapping the map opens the RELATIONSHIP (this card, in this
// seat) through the same MinimapModal the full reader uses — not the card alone.
const HOUSE_GLOW = { Spirit: '#C44444', Mind: '#4A8B4A', Emotion: '#3D6A99', Body: '#8B6B3D', Gestalt: '#6B4D8A' };
const houseGlow = (archId) => HOUSE_GLOW[ARCHETYPES[archId]?.house] || HOUSE_GLOW.Gestalt;

function CardWithMap({ draw, onInfo, label, stacked = false }) {
  const [mapOpen, setMapOpen] = useState(false);
  const [durableFront, setDurableFront] = useState(false); // hover or tap brings the durable to the front of the stack (founder, 2026-09-16 night)
  if (!draw) return null;
  const trans = getComponent(draw.transient);
  const home = getHomeArchetype(draw.transient);
  const cardType = getCardType(draw.transient);
  const boundIsInner = cardType === 'bound' && trans?.number <= 5;
  const seat = ARCHETYPES[draw.position]?.name;

  return (
    <div className="flex flex-col items-center max-w-full">
      <div className="flex items-center justify-center gap-2 sm:gap-3 max-w-full">
        {stacked ? (
          // THE PAIR, as the landing leaves it: the transient in front, the durable peeking out
          // to its right and behind — "transient in your durable, left to right". The box is the
          // flight's [data-slot="stack"] target, sized so the clones land on these very cards.
          <div data-slot="stack" className="relative shrink-0 w-[217px] h-[196px] sm:w-[287px] sm:h-[252px] mt-6">
            <img src={getCardImagePath(draw.position)} alt={seat || ''}
              className={`absolute rounded-lg w-[140px] sm:w-[185px] left-[77px] top-[20px] sm:left-[102px] sm:top-[26px] shadow-lg cursor-pointer transition-all duration-200 glow-pulse ${durableFront ? 'z-40 scale-[1.03]' : ''}`}
              style={{ '--glow': houseGlow(draw.position) }}
              onMouseLeave={() => setDurableFront(false)}
              onClick={() => onInfo({ type: 'card', id: draw.position, data: { type: 'Archetype', ...ARCHETYPES[draw.position] } })} />
            {/* the durable's reachable edge was under the transient's box; this hit area sits above both:
                hover (or a first tap) brings the durable to the front, where its own click opens it */}
            {!durableFront && (
              <div className="absolute z-30 left-[77px] top-[20px] sm:left-[102px] sm:top-[26px] w-[140px] sm:w-[185px] bottom-0 cursor-pointer"
                onMouseEnter={() => setDurableFront(true)} onClick={() => setDurableFront(true)} title={seat ? `in ${seat}` : ''} />
            )}
            <div style={{ '--glow': houseGlow(home) }} className="absolute left-0 top-0 z-10 rounded-lg transition-shadow duration-200 glow-pulse">
              <CardImage transient={draw.transient} status={draw.status} cardName={trans?.name}
                size="compact" showFrame={true}
                className="!w-[140px] sm:!w-[185px]"
                onImageClick={() => onInfo({ type: 'card', id: draw.transient, data: trans })} />
            </div>
            {/* The names, in the landing's own dress: the status above the transient, its name
                below it, the seat's name under the durable — the same plates the flight parks
                here, so the handoff is invisible. Each is the tap it always was. */}
            <button onClick={() => onInfo({ type: 'status', id: draw.status, data: STATUS_INFO[draw.status] })}
              className="absolute left-0 w-[140px] sm:w-[185px] -top-[22px] text-center text-[11px] font-semibold uppercase tracking-[0.2em] whitespace-nowrap"
              style={{ color: STATUS_COLOR[draw.status] || '#e4e4e7', textShadow: '0 2px 8px rgba(0,0,0,0.95)' }}>
              {STATUSES[draw.status]?.prefix || 'Balanced'}
            </button>
            <button onClick={() => onInfo({ type: 'card', id: draw.transient, data: trans })}
              className="absolute left-0 w-[140px] sm:w-[185px] top-[148px] sm:top-[193px] text-center text-[19px] whitespace-nowrap"
              style={{ fontFamily: "'Cormorant Garamond', serif", color: '#fde9b0', letterSpacing: '0.06em', textShadow: '0 2px 8px rgba(0,0,0,0.95)' }}>
              {trans?.name}
            </button>
            {seat && (
              <button onClick={() => onInfo({ type: 'card', id: draw.position, data: { type: 'Archetype', ...ARCHETYPES[draw.position] } })}
                className="absolute left-[77px] sm:left-[102px] w-[140px] sm:w-[185px] top-[168px] sm:top-[219px] text-center text-[19px] whitespace-nowrap"
                style={{ fontFamily: "'Cormorant Garamond', serif", color: '#b4b4bc', letterSpacing: '0.06em', textShadow: '0 2px 8px rgba(0,0,0,0.95)' }}>
                in {seat}
              </button>
            )}
          </div>
        ) : (
          <CardImage transient={draw.transient} status={draw.status} cardName={trans?.name}
            size="compact" showFrame={true}
            className="!w-[140px] sm:!w-[185px]"
            onImageClick={() => onInfo({ type: 'card', id: draw.transient, data: trans })} />
        )}

        <button data-slot="minimap" onClick={() => setMapOpen(true)}
          title="the geometry of this draw — tap to expand"
          className="ez-minimap w-[140px] h-[140px] sm:w-[185px] sm:h-[185px] shrink-0 rounded-lg overflow-hidden flex items-center justify-center transition-all hover:scale-[1.03] shadow-[0_4px_12px_rgba(0,0,0,0.3),inset_0_0_20px_rgba(107,77,138,0.1)] glow-pulse-map"
          style={{
            '--glow': HOUSE_GLOW.Gestalt,
            background: 'rgba(13, 13, 26, 0.85)',
            border: '1px solid rgba(107, 77, 138, 0.4)'
          }}>
          {/* With the landing on, the header shows the FULL map, every glyph, as the flight's copy
              does — otherwise the two swap at the handoff and the little marks vanish. */}
          <Minimap fromId={home} toId={draw.position} size="card" singleMode={!stacked}
            fromCardType={cardType} boundIsInner={boundIsInner} />
        </button>
      </div>

      {!stacked && (
      <div className="mt-2 text-center text-xs break-words">
        <button onClick={() => onInfo({ type: 'status', id: draw.status, data: STATUS_INFO[draw.status] })}
          title="what this status means"
          className="text-zinc-400 hover:text-zinc-200 underline decoration-dotted underline-offset-2">
          {STATUSES[draw.status]?.prefix || 'Balanced'}
        </button>{' '}
        <button onClick={() => onInfo({ type: 'card', id: draw.transient, data: trans })}
          className="text-amber-300/90 hover:text-amber-200 underline decoration-dotted underline-offset-2">
          {trans?.name}
        </button>
        {seat && (
          <>
            <span className="text-zinc-500"> in </span>
            <button onClick={() => onInfo({ type: 'card', id: draw.position, data: { type: 'Archetype', ...ARCHETYPES[draw.position] } })}
              className="text-zinc-300 hover:text-zinc-100 underline decoration-dotted underline-offset-2">
              {seat}
            </button>
          </>
        )}
      </div>
      )}

      <MinimapModal
        isOpen={mapOpen}
        onClose={() => setMapOpen(false)}
        onReopen={() => setMapOpen(true)}
        fromId={home}
        toId={draw.position}
        transient={draw.transient}
        cardType={cardType}
        boundIsInner={boundIsInner}
        setSelectedInfo={onInfo}
        colorTheme="violet"
      />
    </div>
  );
}

export default function EZPage() {
  const [user, setUser] = useState(null);
  // the moving background and the corner controls, shared with the main page
  const chrome = useBackdropPrefs();
  const audioRef = useRef(null); const speakRun = useRef(0); const [speakingId, setSpeakingId] = useState(null); const [voiceMsg, setVoiceMsg] = useState(''); // THE VOICE (2026-10-03)
  const [allowed, setAllowed] = useState(null); // null = checking
  // THE LANDING in EZ — on for everyone since v0.99.300. ?anim=0 turns it off for a browser,
  // ?anim=1 turns it back on. Reduced-motion users never see it.
  const [animOn, setAnimOn] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [revealed, setRevealed] = useState(true);
  const [overlayTop, setOverlayTop] = useState(0);   // the map starts below the brand, which never leaves
  const [animPending, setAnimPending] = useState(false); // a flight is about to start: nothing may scroll itself
  const [landedWaiting, setLandedWaiting] = useState(false); // the flight has landed but the reply has not arrived: show 'the Reader is writing' under the parked cards (founder, 2026-09-17: the primary use case)
  const [overlayIn, setOverlayIn] = useState(false);
  // "only allow tap to skip if the reading is ready" — a skip with nothing to skip to is a freeze
  const [replyReady, setReplyReady] = useState(false);
  const readyRef = useRef(false);
  const cameraRef = useRef(null);
  const skipRef = useRef(null);
  const [question, setQuestion] = useState('');
  const [asked, setAsked] = useState('');   // what the reading was actually asked — the door's own line when nothing was typed
  // ONE CARD. EZ is one card by the founder's ruling (2026-09-15): the landing tells one card's
  // story, and the conversation goes from there. The 1/2/3 picker is gone.
  const cardCount = 1;
  const [draws, setDraws] = useState(null);
  const [voice, setVoice] = useState('plain');
  const [bench, setBench] = useState(false); // /ez?bench=1 — the layout bench: no API, nothing saved
  useEffect(() => { try { const v = localStorage.getItem('nkya_ez_voice'); if (v && VOICES[v]) setVoice(v); } catch {} }, []);
  // .487: the Aa toggle has three stops and no words on it — on a phone there is no hover title, so a
  // tap says what it did: a small card under the corner naming the register, gone after a moment.
  const VOICE_NOTES = {
    plain: ["Plain words", "For anyone. Short, everyday words; nothing of the map's language."],
    grown: ['Plain words, grown', 'For an adult who has never seen the map. Plain, not simple.'],
    map: ["The map's words", 'The map speaks in its own names: signatures, seats, statuses.'],
    deep: ['Deep', "The map's words and the derivation shown — how this signature, seat and status fix the medicine."],
    mystical: ['Mystical', "The house's own philosophy, leaned into: purpose, the present, the pillars. No borrowed spirituality."],
  };
  // .491: the dial, in order, and each stop's colour on the button
  const VOICE_ORDER = ['plain', 'grown', 'map', 'deep', 'mystical'];
  // .536: THE REGISTER RIDES IN THE TURN. The five voices lived only at the tail of an ~18k-token system prompt, and
  // flash weighs the turn far more than the system prompt (the question shape, the beinghood verdict, the trauma line
  // and the AI question all had to move into the turn before they held). Founder: "not noticing much difference in
  // our new voices." One line, every reader-facing turn, says which register this reply is in.
  const REGISTER_LINE = {
    plain: "PLAIN WORDS. Short everyday sentences a smart twelve-year-old follows; NONE of the map's language on glass — no signature, seat, status, medicine, house, channel or stage names; the meaning in their words only.",
    grown: "PLAIN WORDS, GROWN. For an adult who has never seen the map: plain, not simple — full sentences, adult vocabulary, no condescension — and still NONE of the map's language on glass.",
    map: "THE MAP'S WORDS. Name the signature, the seat, the status and the medicine by their names, and say what each is in the same breath; ordinary depth, the map speaking as itself.",
    deep: "DEEP. The map's words AND the derivation shown — how this signature in this seat with this status fixes this medicine, step by step, in a collegiate register; take the room you need.",
    mystical: "MYSTICAL. The house's own philosophy leaned all the way in — purpose (why this, now), the present as the only place authorship lives, the pillars, the geometry named and felt; no borrowed spirituality, only this house's; take the room you need.",
  };
  const VOICE_STYLE = {
    plain: 'bg-amber-950/40 border-amber-600/40 text-amber-300 hover:bg-amber-900/40',
    grown: 'bg-violet-950/40 border-violet-500/40 text-violet-200 hover:bg-violet-900/40',
    map: 'bg-zinc-900/80 border-zinc-700/50 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800',
    deep: 'bg-cyan-950/40 border-cyan-500/40 text-cyan-200 hover:bg-cyan-900/40',
    mystical: 'bg-rose-950/40 border-rose-500/40 text-rose-200 hover:bg-rose-900/40',
  };
  const [voiceToast, setVoiceToast] = useState(null);
  const voiceToastTimer = useRef(null);
  const [voiceOffer, setVoiceOffer] = useState(null); // .599: { id, v } — "say the last turn again in this voice?"
  const chooseVoice = (v) => {
    const changed = v !== voice;
    setVoice(v); try { localStorage.setItem('nkya_ez_voice', v); } catch {}
    // .599 (founder: "pull voice and offer to rerun when you choose a different voice"): the per-turn Voice pill is gone; the voice
    // setting is the one place, and with a reading on the page it offers to say the last turn again in the new voice.
    const last = changed ? [...turns].reverse().find((t) => t.role === 'reader' && !t.pending) : null;
    setVoiceOffer(last ? { id: last.id, v } : null);
    setVoiceToast(v); if (voiceToastTimer.current) clearTimeout(voiceToastTimer.current);
    voiceToastTimer.current = setTimeout(() => { setVoiceToast(null); setVoiceOffer(null); }, last ? 9000 : 3200);
  };
  const plainish = voice === 'plain' || voice === 'grown'; // .484: both plain registers hide the map's words

  // WARM THE MAP while the person is still choosing a door: all 78 thumbnails (about 100KB each)
  // into the browser cache, so the map appears whole the moment it is asked for. Idle-time work.
  useEffect(() => {
    if (!animOn || typeof window === 'undefined') return;
    const run = () => { for (let i = 0; i < 78; i++) { const p = getCardThumbPath(i); if (p) { const im = new Image(); im.decoding = 'async'; im.src = p; } } };
    if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 2000 }); else window.setTimeout(run, 300);
  }, [animOn]);
  const [mapReady, setMapReady] = useState(false);
  // The draw block carries "MANDATORY: your interpretation MUST include the word <position>" — right
  // for the map's words, wrong for plain ones. Stripped at the source when the voice is plain.
  // .528: EZ sends THE RECORD, not the advanced reader's section grammar (Agency/Domain/REBALANCER TARGET/
  // Grammar rule) — the audit found the draw described three times in three vocabularies. The signature
  // header line stays; the record under it is the draw.
  // .530: THE SEED. Every draw in the conversation so far (the opening plus every reflect/forge card), and the
  // computed geometry + teleology for the card a turn is about — lines in a never-reproduce wrapper (lib/ezSeed.js).
  const fmtDraw = fmtDrawForEz; // 2026-10-04: the library's filter (ADVANCED_GRAMMAR, MANDATORY)
  const allDrawsSoFar = (base = draws, list = turns) => [...(base || []), ...(list || []).filter((t) => t.draw).map((t) => t.draw)];
  // .651 THE ADDRESS ON EVERY DRAW (Keel's six sentences): the signature's four coordinates (a Bound's or Ambassador's through its parent) and
  // the seat's, with the founder-ruled glosses (lib/address.js), so WHERE / HOW / WHAT / WHO / WHEN / HOW CARRIED can each be said.
  const seedFor = (card, q, base, list, pointer = false) => {
    try {
      const all = allDrawsSoFar(base, list);
      const i = all.findIndex((d) => d && card && d.transient === card.transient && d.position === card.position);
      const parts = seedParts({ question: q, draws: all, index: i < 0 ? 0 : i, pointer }); // .561: a pointer's seed carries no medicine
      const addr = addressLines(card);
      return { ...parts, block: parts.block ? (addr ? `${parts.block}\n\n${addr}` : parts.block) : addr }; // .651
    } catch { return { block: '', lines: '' }; }
  };
  const voiceSwitch = (compact = false) => (
    <div className={`flex items-center gap-2 ${compact ? 'text-xs' : 'text-sm'} text-zinc-500`}>
      <span>{compact ? 'voice' : 'Voice'}</span>
      {Object.entries(VOICES).map(([k, v]) => (
        <button key={k} onClick={() => chooseVoice(k)} title={k === 'plain' ? 'everyday words, no names for anything' : 'the reading in the map\'s own names'}
          className={`rounded-full px-3 py-1 border transition-colors ${voice === k ? 'border-amber-500/70 text-amber-300 bg-amber-950/20' : 'border-zinc-700/70 text-zinc-500 hover:text-zinc-300'}`}>
          {v.label}
        </button>
      ))}
    </div>
  );

  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search).get('anim');
      if (p === '1') localStorage.setItem('nkya_ez_anim', '1');
      if (p === '0') localStorage.setItem('nkya_ez_anim', '0');
      const fx = new URLSearchParams(window.location.search).get('fx'); // .652: ?fx=1 turns the rendered flash on for this browser, ?fx=0 off
      if (fx === '1') localStorage.setItem('nkya_ez_fx', '1');
      if (fx === '0') localStorage.setItem('nkya_ez_fx', '0');
      if (localStorage.getItem('nkya_ez_fx') !== '0') fetch('/video/fx/splash.mp4', { cache: 'force-cache' }).catch(() => {}); // .657 on by default: warm the cache so the first landing is not late
      const reduced = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      // ON for everyone on /ez (founder, 2026-09-14: "let's just push it to prod"); ?anim=0 turns it
      // off for a browser, ?anim=1 turns it back on; reduced-motion users never see it.
      if (!reduced && localStorage.getItem('nkya_ez_anim') !== '0') setAnimOn(true);
    } catch {}
  }, []);

  // The sequence plays on the real draw while the Reader writes. It is the shared module the
  // bench runs — components/map/landing.js — handed the map section below and this page's own
  // header as the place to land. A tap anywhere on the map skips to the finished header.
  const playLanding = async (draw, slotsSelector = '[data-ez-header]', scrollTop = true) => {
    const signal = { skip: false };
    skipRef.current = signal;
    let surface = null;
    for (let i = 0; i < 80; i++) {
      surface = document.querySelector('[data-ez-map] [data-map-surface]');
      if (surface && surface.querySelectorAll('[data-position]').length >= 78 && cameraRef.current) break;
      await new Promise(r => setTimeout(r, 100));
    }
    if (!surface) return;
    if (voiceOut) loadClips(NARRATOR[voiceName] || 'af_bella', ['card', 'status', 'seat'].map((b) => beatSlug(draw, b))); // .661: the three beat clips, warmed before the flight
    placeWordmark(surface);
    if (scrollTop) { try { window.scrollTo({ top: 0, behavior: 'instant' }); } catch {} }
    setOverlayIn(true);
    // The first run on a phone was chunky until every card had buffered. So: wait for all 78
    // images to load (capped at ten seconds, in case one never does) before the seek begins.
    setMapReady(false);
    const imgs = [...surface.querySelectorAll('[data-position] img')];
    await Promise.race([
      Promise.all(imgs.map(im => (im.complete && im.naturalWidth > 0) ? Promise.resolve() : new Promise(res => { im.addEventListener('load', res, { once: true }); im.addEventListener('error', res, { once: true }); }))),
      new Promise(res => setTimeout(res, 6000)), // .551: 10s → 6s
      new Promise(res => { const iv = setInterval(() => { if (signal.hurry) { clearInterval(iv); res(); } }, 200); setTimeout(() => clearInterval(iv), 6000); }) // .549
    ]);
    setMapReady(true);
    await new Promise(r => setTimeout(r, 350));
    try {
      // .541: the flight is capped. A paused tab (iOS backgrounds the app), a transition that never ends or an image
      // that never loads used to hold the reply hostage — the founder saw a landed card with nothing under it.
      await Promise.race([
        runLanding({
          surface, cameraRef,
          draws: { [draw.position]: { transient: draw.transient, status: draw.status } },
          table: {}, slotsSelector, signal, flyWordmark: false,
          onBeat: (beat) => { try { sayNarration(beatSlug(draw, beat)); } catch {} }, // .661 (Keel §1): spoken on the beat, never before the frame — the same path for the opening and every later draw
        }),
        new Promise((r) => setTimeout(() => { signal.skip = true; r(); }, 25000)),
      ]);
    } catch { /* skipped */ }
    // the clones stay parked in the header while the page comes back; begin() clears them
  };
  // (tap-to-skip removed at the founder's word; the signal stays so a future control can use it)
  const [turns, setTurns] = useState([]); // {id, role:'reader'|'you'|'catchup', text, question, chips, reflect, forge, draw, mode, ts}
  const [input, setInput] = useState('');
  const [fieldMode, setFieldMode] = useState(null); // null | 'reflect' | 'forge'
  const [hasHistory, setHasHistory] = useState(false);
  const [door, setDoor] = useState(null);            // the chosen house door, or null
  const [frame, setFrame] = useState(null);          // .544: THE FRAME — { k, detail } or null
  const [frameOpen, setFrameOpen] = useState(false);
  const [frameDetail, setFrameDetail] = useState('');
  const [frameEdit, setFrameEdit] = useState(false);   // .569: changing the frame from inside the reading
  const topicChips = (onPick) => ( // .571: grouped topic chips, shared by the front picker and the in-reading picker
    <div className="space-y-2.5">
      {FRAME_GROUPS.map((g) => (
        <div key={g.label} className="grid gap-1.5 sm:grid-cols-[9.5rem_1fr] sm:items-center">
          <div className="text-[0.6875rem] uppercase tracking-wider text-emerald-300/60">{g.label}</div>
          <div className="flex flex-wrap gap-1.5">
            {g.keys.map((k) => frameOf(k)).filter(Boolean).map((f) => (
              <button key={f.k} onClick={() => onPick(f)}
                className={`rounded-full border px-3 py-1 text-[0.8125rem] transition-colors ${frame?.k === f.k ? 'border-emerald-400 bg-emerald-900/40 text-emerald-100' : 'border-emerald-700/40 text-emerald-200/90 hover:bg-emerald-900/25'}`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
  // A question suggested from this account's own readings — ON DEMAND. The founder, 2026-09-15:
  // "I've had the same one show up every time ... I want to proactively press that button." So
  // nothing is generated on load; a tap asks for one, and "try another" asks for a different one,
  // with everything already suggested handed to the model to avoid.
  const [suggested, setSuggested] = useState('');
  const [suggestedWhy, setSuggestedWhy] = useState(''); // .511: the thread it pulls on, shown under the question
  const [resolution, setResolution] = useState(null); // .511: did it land? 'landed' | 'open' | 'missed'
  const [suggesting, setSuggesting] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false); // .592: shown only when chosen from the menu (prefetched quietly on page open) // the suggestion card can fold away and come back without a new ask
  const suggestedSeen = useRef([]);
  // .570: CLOSED TOPICS (founder, 2026-09-25: "a check mark that says I'm done with this topic when you ask for a suggested reading
  // from your history"). Kept per account on this device and handed to the suggester as threads it must never offer again.
  const closedKey = user?.id ? `nkya_ez_closed_topics_${user.id}` : null;
  // .618: the list lives on the ACCOUNT (ez_closed_topics; founder: "across all devices"); the browser copy is a cache so the
  // first suggestion after page open still respects it before the account list arrives.
  const closedRef = useRef(null); // null until the account list has been read once
  const readLocal = () => { try { const v = closedKey ? JSON.parse(localStorage.getItem(closedKey) || '[]') : []; return Array.isArray(v) ? v : []; } catch { return []; } };
  const writeLocal = (list) => { try { if (closedKey) localStorage.setItem(closedKey, JSON.stringify(list.slice(-60))); } catch {} };
  const readClosed = () => (closedRef.current || readLocal());
  const loadClosed = async () => {
    if (!user?.id || user.id === 'dev-bench') return;
    const { data, error } = await getClosedTopics(); if (error) { console.warn('[closed topics]', error); return; }
    let list = data;
    // a browser that closed threads before .618 hands them up to the account once, so nothing he already closed is lost
    const local = readLocal().filter((e) => e && e.q && !e.id && !list.some((r) => r.q === e.q));
    for (const e of local) { const { data: row } = await addClosedTopic(e); if (row?.id) list = [{ ...e, id: row.id }, ...list]; }
    closedRef.current = list; writeLocal(list);
  };
  const [lastClosed, setLastClosed] = useState(null);
  const STOP_WORDS = new Set(['what', 'that', 'this', 'with', 'from', 'have', 'does', 'your', 'into', 'keep', 'still', 'actually', 'really', 'should', 'could', 'would', 'about', 'there', 'their', 'when', 'where', 'which', 'much', 'more', 'enough', 'time', 'right', 'thing', 'things', 'week', 'today', 'next', 'need', 'want', 'doing', 'going', 'make', 'take', 'been', 'being', 'will', 'just', 'like', 'them', 'they', 'then', 'than', 'some', 'ever', 'over', 'back', 'even', 'also', 'most']);
  const topicWords = (t) => new Set(String(t || '').toLowerCase().replace(/[^a-z0-9' ]/g, ' ').split(/\s+/).filter((w) => w.length > 3 && !STOP_WORDS.has(w)));
  const sameThread = (a, b) => { const A = topicWords(a), B = topicWords(b); if (!A.size || !B.size) return false; let n = 0; for (const w of A) if (B.has(w)) n++; return n >= 2 && n / Math.min(A.size, B.size) >= 0.5; };
  const closedMatch = (q) => readClosed().some((e) => sameThread(q, e.q) || (e.src && sameThread(q, e.src)));
  const suggestFromHistory = async (opts = {}) => {
    const forFrame = opts.frame || null; // .546: a question ABOUT the frame they set
    const quiet = !!opts.quiet; // .591: the automatic ask on page open says nothing when it fails
    const say = (m) => { if (!quiet) setError(m); };
    if (!user || suggesting) return;
    setSuggesting(true); if (!quiet) sayNarration(STAGE.history[1]); // .647
    try {
      const session = await getSession();
      const token = session?.session?.access_token;
      if (!token) { say('Still signing you in — try that again in a moment.'); return; }
      // .596: THEIR OWN WORDS ONLY (founder 2026-10-02: "I didn't say those things, the reader did — it's not really a question
      // of mine"). The material is what they asked and what they typed in the conversations; the Reader's answers and the journey
      // summaries are left out on purpose, so the suggestion can only be the next thing THEY would ask.
      const { data: rows } = await getReadings(60);
      const own = [];
      let dropped = 0;
      for (const r of rows || []) {
        const asked = String(r.topic || '').trim();
        if (!asked || /^general reading$/i.test(asked)) continue;
        if (closedMatch(asked)) { dropped++; continue; } // .617: a closed thread's readings never reach the model
        const turns = r.interpretation?.synthesis?._ez?.turns || [];
        // only what they TYPED: a tapped chip, a reflect/forge line or an "act" line was written by the Reader in their voice, not by them
        const offered = new Set();
        for (const t of turns) { if (!t || t.role !== 'reader') continue; for (const c of [...(t.chips || []), ...(t.reflect || []), ...(t.forge || [])]) offered.add(String(typeof c === 'string' ? c : c?.text || '').trim()); if (t.act) offered.add(String(t.act).trim()); }
        const said = turns
          .filter((t) => t && t.role === 'you' && t.text && !t.move && !offered.has(String(t.text).trim()))
          .map((t) => String(t.text).trim()).filter((x) => x.length > 12 && x !== asked)
          .slice(0, 4).map((x) => (x.length > 160 ? x.slice(0, 157) + '…' : x));
        const when = new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        own.push(`${when} — they asked: "${asked}"${said.length ? `\n   and in that conversation they said: ${said.map((x) => `"${x}"`).join(' · ')}` : ''}`);
        if (own.length >= 14) break;
      }
      if (!own.length && !forFrame) { say(dropped ? 'Every thread in your readings is one you closed — ask something new and it will have material.' : 'No questions of yours to draw from yet.'); return; }
      const ownBlock = `THEIR OWN WORDS — what this person has asked and said, newest first. This is the ONLY material. The Reader's answers are left out on purpose: a question built from what a reading concluded is the Reader's question, not theirs.\n${own.join('\n')}`;
      const closed = readClosed(); // .570: threads they marked done
      const closedBlock = closed.length ? `\n\nTOPICS THEY HAVE CLOSED — they marked these threads done. Never suggest anything on these threads again, reworded or from another angle; choose a different part of their life:\n${closed.map((e) => `- ${e.q}${e.why ? ` (${e.why})` : ''}`).join('\n')}` : '';
      const avoid = suggestedSeen.current.length
        ? `

Already suggested this session — pick a DIFFERENT thread, not a rewording of these:
${suggestedSeen.current.map(q => `- ${q}`).join('\n')}`
        : '';
      const res = await fetch('/api/reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await readingAuth()) },
        body: JSON.stringify({
          messages: [{ role: 'user', content: `${ownBlock}${forFrame ? `

THE FRAME THEY CHOSE: this reading is about ${forFrame.k === 'custom' ? `"${forFrame.detail}"` : `${frameOf(forFrame.k)?.label || forFrame.k}${forFrame.detail ? ` — ${forFrame.detail}` : ''}`}. The ONE question must be about exactly this — name it in their words ("Dan", "the move") — and history is only background behind it.` : ''}

You are choosing ONE question for this person to bring to a reading today — a question that is THEIRS: the next thing they would ask about something they already asked or said, or a question they asked once and left. Look in this order: (1) something they said they would do, try or decide — ask how it went, in their words; (2) a thing they keep asking about across readings — ask the NEXT question on it, not the same one again; (3) a question they asked once and never came back to — bring it back as it stands now. FREQUENCY IS NOT IMPORTANCE: the topic they ask about most is not automatically the one to suggest — rotate, at most one suggestion in three on the dominant topic. The question must be SPECIFIC — the actual subject, person, work or choice, in THEIR words — and ASKABLE: a real question under 14 words that they could answer with plain facts about their life. Never a question that presumes what a reading concluded about them.
THE SUBJECT IS THEIR LIFE, NOT THE LAST READING'S PICTURES (founder, 2026-10-02: "these questions seem nonsensical"). The history lines may carry a reading's images — a grip, something untied, a door, a rope, weather. Those are never the subject. Ask about the real thing the reading was about — the work, the person, the decision, this week — and the test is simple: could they answer your question with plain facts about their life? A riddle built from an image fails that test. "What should I stop adding to Nirmanakaya this week?" passes. When the history gives you only images and no concrete subject, ask the plain forward question about the named work or person: "What's the next real step on Nirmanakaya?" Call what was drawn "the reading" or "the signature".
KITCHEN TABLE, NOT ORACLE. Write it the way a friend across the table would actually say it — plain, a little blunt, everyday words. NEVER the map's vocabulary (no "unacknowledged", "endurance", "medicine", "seat", "status", "strength you've proven", "what you were handed"), never poetry, never a metaphor doing the work of a noun; never "handed", "the move", "the medicine" — say what the reading SAID, in words: "last time the reading said pause a breath before you answer, and you haven't tried it." Good: "Is it time to tell Dan I'm done with the Tuesday thing?" · "What am I still carrying for my dad?" · "Why do I keep saying yes to that job?" Bad: "Can I stop clenching the strength I've already proven and let it simply be enough?" (nobody says that at a table). The "why" line QUOTES THEM: 'On Sept 30 you asked "Am I overworking Nirmanakaya?"' — their own words with the date, one sentence, never a paraphrase of what a reading said.${avoid}${closedBlock}

Respond with ONLY JSON: {"q": "<the question>", "why": "<one sentence quoting what THEY asked or said, with the date — e.g. 'On Sept 30 you asked \"Am I overworking Nirmanakaya?\"'>"}` }],
          system: 'You write one short question and nothing else. JSON only.',
          model: MODEL_IDS.haiku, max_tokens: 220, userId: user.id
        })
      });
      const rj = await res.json();
      const parsedS = parseJson(rj?.reading) || {};
      const q = parsedS.q;
      let clean = (q && typeof q === 'string' && q.trim().length > 3) ? q.trim() : '';
      if (clean && closedMatch(clean)) { // .617: the model reworded a closed thread — refuse it, and try once more with it named
        console.warn('[suggest] refused, a closed thread:', clean); suggestedSeen.current.push(clean); clean = '';
        if (!opts._retry) { setSuggesting(false); return suggestFromHistory({ ...opts, _retry: true }); }
        say('Nothing new to suggest beyond the threads you closed — ask something fresh.'); return;
      }
      if (clean) {
        const why = typeof parsedS.why === 'string' ? parsedS.why.trim() : '';
        suggestedSeen.current.push(clean); setSuggested(clean); setSuggestedWhy(why); if (!quiet) setSuggestOpen(true);
        try { sessionStorage.setItem(`nkya_ez_suggest_${user.id}`, JSON.stringify({ q: clean, why })); } catch {} // .591: once per browser session
      }
      else say(rj?.error ? `The suggester could not answer: ${String(rj.error).slice(0, 120)}` : 'The suggester came back empty — try again.');
    } catch (e) { say(`The suggester failed: ${e?.message || 'network'}`); } finally { setSuggesting(false); }
  };
  const closeTopic = () => {
    if (!suggested || suggesting) return;
    const srcM = String(suggestedWhy || '').match(/"([^"]{8,})"|“([^”]{8,})”/); // .617: the ask it quoted ("On Sept 23 you asked …")
    const entry = { q: suggested, why: suggestedWhy || '', src: (srcM && (srcM[1] || srcM[2])) || '', at: Date.now() };
    const list = [entry, ...readClosed()]; closedRef.current = list; writeLocal(list); // .618: on the page at once, on the account right behind
    setLastClosed(entry); setSuggested(''); setSuggestedWhy('');
    addClosedTopic(entry).then(({ data, error }) => { if (error) { console.warn('[closed topics] not saved to the account:', error); setError('That topic is closed on this device, but it could not be saved to your account — try again later.'); return; } entry.id = data?.id; }).catch(() => {});
    suggestFromHistory();
  };
  const undoClose = () => {
    if (!lastClosed) return;
    const list = readClosed().filter((e) => e.at !== lastClosed.at); closedRef.current = list; writeLocal(list);
    if (lastClosed.id) removeClosedTopic(lastClosed.id).catch(() => {}); // .618
    setLastClosed(null);
  };
  const [selectedInfo, setSelectedInfo] = useState(null); // the main reader's detail modal, reused
  const [infoHistory, setInfoHistory] = useState([]);
  const [pastReadings, setPastReadings] = useState([]);   // this account's EZ readings, for live reload
  const [showPast, setShowPast] = useState(false);
  const [areasOpen, setAreasOpen] = useState(false); // the five doors fold away under a toggle (founder, 2026-09-16)
  // ASK on an empty box does not error and does not draw: the button becomes an offer, and a
  // second tap draws for whatever is here (Keel's spec, section 1: wordlessness made a
  // dignified option, taught rather than sprung)
  const [wordless, setWordless] = useState(false);
  const questionRef = useRef(null);
  const contextRef = useRef(null);
  const [biggerOpen, setBiggerOpen] = useState(false); // the three deep starters, one tap further in
  // THE BOX IS THE ANCHOR. The frame used to be centred as a whole, so unfolding the areas grew it
  // and the box slid up. Now only the box-and-row part is measured, and the top padding is set so
  // THAT sits where the centred frame sat; whatever unfolds is added beneath it and the box stays.
  // The scrollbar's gutter is reserved all the time on this page, so the frame does not shift
  // left by half a scrollbar when the areas unfold and the page grows tall enough to scroll.
  useEffect(() => {
    const el = document.documentElement; const prev = el.style.scrollbarGutter;
    el.style.scrollbarGutter = 'stable';
    return () => { el.style.scrollbarGutter = prev; };
  }, []);
  const anchorRef = useRef(null);
  const [anchorPad, setAnchorPad] = useState(null);
  useEffect(() => {
    const el = anchorRef.current; if (!el) return;
    const fit = () => setAnchorPad(Math.max(16, Math.round((window.innerHeight * 0.62 - el.offsetHeight) / 2)));
    fit();
    const ro = new ResizeObserver(fit); ro.observe(el);
    window.addEventListener('resize', fit);
    return () => { ro.disconnect(); window.removeEventListener('resize', fit); };
  }, [draws, door, allowed]);
  const [explain, setExplain] = useState(null);           // 'reflect' | 'forge' | null
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('signin');
  const userContextRef = useRef(''); // history: the journey block the full reader injects
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedId, setSavedId] = useState(null);
  const [usage, setUsage] = useState({ input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 });
  // THE COST LEDGER (.447): one row per API call — purpose, fresh / cache-written / cache-read /
  // out, cents, cold or warm. Visible to admins and on the bench. The purpose is read off the
  // message itself so no caller has to be touched.
  const [ledger, setLedger] = useState([]);
  const [voiceSpend, setVoiceSpend] = useState({ pieces: 0, chars: 0, secs: 0, usd: 0 }); // .613 THE VOICE ON THE COST LINE (founder: 'a line of accounting … on how much the voice costs')
  const [usd, setUsd] = useState(0); // running cost priced per call by the model that answered (.473)
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [menuTick, setMenuTick] = useState(0); // .616: re-key the more ▾ select after each choice so a phone's picker forgets the last row
  const purposeOf = (m) => {
    if (/YOUR LAST RENDER WAS \d+ WORDS/.test(m)) { const g = m.match(/Write the (\w+) floor/); return `${g ? 'the ' + g[1] : 'why (ring 1)'} (rewrite)`; }
    if (/NOT VALID JSON/.test(m)) return 'retry';
    if (/Write ring 1\. JSON only\./.test(m)) return 'why (ring 1)';
    const f = m.match(/Write the (meaning|moon|mechanism) floor\. JSON only\./); if (f) return `the ${f[1]}`;
    if (m.includes('FACE THE DRAGON.')) return 'face the dragon';
    if (m.includes('ONE SMALL REAL ACT')) return 'one small step';
    if (m.includes('THE MEDICINE, TAKEN.')) return 'the medicine';
    if (m.includes('OTHER OPTIONS. Do NOT write a new turn')) return 'other options';
    if (m.includes('WRITE THIS UP AND CLOSE')) return 'pull it together';
    if (m.includes('SAY IT SIMPLER')) return 'say it simpler';
    if (m.includes('WHERE AM I')) return 'catch me up';
    if (m.includes('FIND IT. The person tapped')) return 'find it';
    if (m.includes('THE DISCOURSE SO FAR')) return 'turn';
    return 'opening';
  };
  // priced off lib/modelConfig (Sonnet, 1-hour cache: writes are 2x input, reads 0.1x)
  const centsOf = (u) => ((u.input_tokens || 0) * MODEL_PRICING.sonnet.input
    + (u.cache_read_input_tokens || 0) * MODEL_PRICING.sonnet.input * CACHE_READ
    + (u.cache_creation_input_tokens || 0) * MODEL_PRICING.sonnet.input * CACHE_WRITE_1H
    + (u.output_tokens || 0) * MODEL_PRICING.sonnet.output) / 1e4;
  const endRef = useRef(null);
  const saveTimer = useRef(null);

  // Gate: signed in AND (admin OR ez_enabled flag). Then load the history block.
  // Runs on mount and again the moment someone signs in, so the door opens in place.
  const checkGate = useCallback(async () => {
      // development only: /ez?bench=1&devuser=1 renders the signed-in page as a bench user (no account, no API — the bench answers)
      if (process.env.NODE_ENV !== 'production') { try { if (new URLSearchParams(window.location.search).get('devuser') === '1') { setUser({ id: 'dev-bench', email: 'bench@localhost' }); setAllowed(true); return; } } catch {} }
      try {
        const { user: u } = await getUser();
        setUser(u || null);
        let flag = false;
        try { const r = await fetch('/api/feature-flags'); const j = await r.json(); flag = !!j?.flags?.ez_enabled; } catch {}
        setAllowed(!!u && (isAdmin(u) || flag));
        if (u) {
          setHasHistory(true);
          loadClosed(); // .618: the closed topics ride with the account
          // (the history question is no longer generated on load — see suggestFromHistory)
        }
      } catch { setAllowed(false); }
  }, []);

  // .591: PERSONALIZED WITHOUT A BUTTON (founder 2026-10-02: "I really like the personalized capability but don't know if it
  // needs a button"). A signed-in person with history opens the page and the suggestion is simply there, under the box.
  // One ask per browser session (sessionStorage; a saved reading clears it), never for the bench user, never once a reading is
  // on the page, quiet when it fails.
  const autoSuggestedRef = useRef(false);
  useEffect(() => {
    if (!user || !allowed || draws || suggested || suggesting || autoSuggestedRef.current || user.id === 'dev-bench') return;
    autoSuggestedRef.current = true;
    try {
      const c = JSON.parse(sessionStorage.getItem(`nkya_ez_suggest_${user.id}`) || 'null');
      if (c?.q) { suggestedSeen.current.push(c.q); setSuggested(c.q); setSuggestedWhy(c.why || ''); return; }
    } catch {}
    suggestFromHistory({ quiet: true });
  }, [user, allowed, draws]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { rememberAuthReturn('/ez'); checkGate(); }, [checkGate]);

  // THE TRACE (.510): EZ readings never left a narrative summary, so the journey thread — and the Personalized
  // suggestion built from it — saw nothing of them. Ask for one after the opening lands, every fourth turn, and
  // at the write-up; the summariser reads the conversation itself. Non-blocking, best-effort.
  const summarize = async (id, refresh) => {
    try {
      const session = await getSession(); const token = session?.session?.access_token;
      if (!token || !id) return;
      await fetch('/api/user/reading-summary', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ readingId: id, refresh: !!refresh }) });
    } catch {}
  };
  // Persist the discourse with the reading (debounced), same table as every other reading.
  useEffect(() => {
    if (!savedId || turns.length === 0) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      updateReadingContent(savedId, { synthesis: { _ez: { version: EZ_VERSION, turns, voice, ...(resolution ? { resolution } : {}), ...(frame ? { frame } : {}) } }, usage })
        .then(() => { const n = turns.length; if (n === 1 || n % 4 === 0 || turns[n - 1]?.role === 'wrap') summarize(savedId, n > 1); })
        .catch(() => {});
    }, 1500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [turns, savedId, usage]);

  // THE HANDING (founder 2026-10-02: 'let's get that handing in'): admins read on the rewritten prompt set first; everyone else stays on live
  // until the switch widens. Same composition seam (ezSystem) the bench measured, so what ships is what was benched.
  const handing = !!user && chrome.prefs.handing !== false; // .590: everyone (was admins only, .587–.589); prefs.handing === false opts a device out
  // THE VOICE (2026-10-03, founder: "roll the voice while the reading is loading and just play it as soon as it's available").
  // Kokoro on Replicate (Heart, or George), admin-only while benched. The Ask tap unlocks audio (a browser needs a gesture) and wakes
  // the model; when the turn lands, every piece (gist first, then paragraphs, then the question) is sent at once and they play in order
  // as each arrives, so the voice starts with the gist and the rest is ready behind it.
  const voiceOut = !!user && chrome.prefs.voiceOut !== false; // .624: ON by default, George; .637: for everyone signed in (founder: "make that available to all users on production now")
  const READ_BY = [['bm_george', 'George'], ['bf_emma', 'Emma'], ['af_bella', 'Bella'], ['am_michael', 'Michael'], ['am_puck', 'Puck']]; // .627 THE READ-BY LIST (founder: 'all of the voice options in a single selector… and have none as an option')
  const voiceName = ['af_heart', ...READ_BY.map(([k]) => k)].includes(chrome.prefs.voiceName) ? chrome.prefs.voiceName : 'bm_george';   // .608: George by default; .620: River (warm) is the offer
  const SPEEDS = [0.8, 0.95, 1.1, 1.25, 1.4]; // .698 (founder: "we should have a speed control for the read back") — 0.95 is the house default
  const [voiceSpeed, setVoiceSpeed] = useState(() => { try { const v = Number(localStorage.getItem('nkya-voice-speed')); return SPEEDS.includes(v) ? v : 0.95; } catch { return 0.95; } });
  const voiceSpeedRef = useRef(0.95); voiceSpeedRef.current = voiceSpeed;
  const pieceSpeedRef = useRef(0.95); // .702: the speed the piece now playing was generated at
  const cycleSpeed = () => { const i = SPEEDS.indexOf(voiceSpeed); const v = SPEEDS[(i + 1) % SPEEDS.length]; setVoiceSpeed(v); voiceSpeedRef.current = v; try { localStorage.setItem('nkya-voice-speed', String(v)); } catch {} try { if (audioRef.current) audioRef.current.playbackRate = Math.max(0.5, Math.min(2, v / (pieceSpeedRef.current || 0.95))); } catch {} }; // .702: takes effect on the piece playing NOW // (the voice line above once ended: "…ed second voice; Heart (sleeps) only by an old saved preference")
  const VOICE_LABEL = { ...Object.fromEntries(READ_BY), af_heart: 'Heart' };
  const voiceAuth = async () => { try { const ss = await getSession(); const tk = ss?.session?.access_token; return tk ? { Authorization: `Bearer ${tk}` } : {}; } catch { return {}; } };
  const unlockAudio = () => { try { if (!audioRef.current) audioRef.current = new Audio(); const a = audioRef.current; a.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='; const pr = a.play(); if (pr && pr.catch) pr.catch(() => {}); } catch {} };
  const warmVoice = async () => { if (voiceName !== 'af_heart') return; try { const h = await voiceAuth(); fetch('/api/voice', { method: 'POST', headers: { 'Content-Type': 'application/json', ...h }, body: JSON.stringify({ warm: true, voice: voiceName }) }).catch(() => {}); } catch {} };
  const pausedRef = useRef(false); // .629 TAP TO PAUSE
  const [spoken, setSpoken] = useState(null); // .634 FOLLOW THE VOICE: { id, kind, para } of the piece being spoken
  const spokenKey = (id, kind, para) => `${id}:${kind}:${para}`;
  const litIf = (id, kind, para) => (spoken && spoken.id === id && spoken.kind === kind && (!['text', 'medicine', 'next'].includes(kind) || spoken.para === para) ? ' rounded-md bg-amber-400/10 ring-1 ring-amber-300/30 transition-colors duration-300' : (speakingId && speakingId === id ? ' transition-colors duration-300 cursor-pointer' : ' transition-colors duration-300')); // .653: the rest of the turn being read is tappable (jump)
  useEffect(() => { if (!spoken) return; try { const el = document.querySelector(`[data-spoken="${spokenKey(spoken.id, spoken.kind, spoken.para)}"]`); if (el) { const r = el.getBoundingClientRect(); const vh = window.innerHeight || 800; if (r.top < 80 || r.bottom > vh - 160) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } } catch {} }, [spoken]);
  const stopVoice = () => { speakRun.current++; setSpeakingId(null); setSpoken(null); pausedRef.current = false; try { audioRef.current?.pause(); } catch {} };
  const [paused, setPaused] = useState(false); // .653: mirrors pausedRef for the controls
  const jumpRef = useRef(null); const voiceSkipRef = useRef(false); const endedRef = useRef(null); const piecesRef = useRef([]); const speakingTurnRef = useRef(null);
  const togglePause = () => {
    if (!speakingId) return;
    pausedRef.current = !pausedRef.current; setPaused(pausedRef.current);
    const a = audioRef.current;
    if (pausedRef.current) { try { a?.pause(); } catch {} setVoiceMsg('Voice: paused'); }
    else { setVoiceMsg(''); try { if (a && a.src && !a.ended && a.paused) { const pr = a.play(); if (pr && pr.catch) pr.catch(() => {}); } } catch {} }
  };
  const releaseCurrent = () => { try { audioRef.current?.pause(); } catch {} const done = endedRef.current; endedRef.current = null; if (done) done(); }; // ends the piece now so the loop moves on
  const jumpToPiece = (idx) => { if (idx == null || idx < 0) return; jumpRef.current = idx; pausedRef.current = false; setPaused(false); setVoiceMsg(''); releaseCurrent(); };
  const skipTurn = () => { voiceSkipRef.current = true; pausedRef.current = false; setPaused(false); setVoiceMsg(''); releaseCurrent(); }; // the rest of this section only; the voice stays on
  const voiceOff = () => { stopVoice(); setPaused(false); setVoiceMsg(''); chrome.set({ voiceOut: false }); };
  // .644/.647 THE LABELS AND THE NARRATOR — stored clips (public/voice/labels/<voice>/<slug>.wav, scripts/voice_labels.mjs), preloaded,
  // played on their own element in a queue the turn's speech waits for.
  const NARRATOR = { bm_george: 'af_bella', am_michael: 'af_bella', am_puck: 'af_bella', bf_emma: 'bm_george', af_bella: 'bm_george', af_heart: 'bm_george' };
  const LABEL_SLUGS = ['recommend', 'go-deeper', 'words-to-the-whys', 'the-meaning', 'the-moon', 'the-mechanism', 'face-the-dragon', 'the-medicine', 'where-this-can-grow', 'one-small-step', 'summarize-and-wrap-up', 'more-choices', 'reflect', 'forge', 'clarify', 'unpack', 'example', 'find-it', 'catch-me-up'];
  // .661 (Keel §4): ONE string per stage, for the glass and the narrator both — [printed, clip slug]; the specific printed strings win
  const STAGE = { writing: ['the Reader is writing…', 'the-reader-is-writing'], naming: ['the Reader is naming it…', 'the-reader-is-naming-it'], medicine: ['the Reader is opening the medicine…', 'the-reader-is-opening-the-medicine'], step: ['the Reader is finding the step…', 'the-reader-is-finding-the-step'], choices: ['the Reader is finding more choices…', 'the-reader-is-finding-more-choices'], history: ['the Reader is reading your history…', 'the-reader-is-reading-your-history'], meaning: ['the Reader is opening the meaning…', 'the-reader-is-opening-the-meaning'], moon: ['the Reader is opening the moon…', 'the-reader-is-opening-the-moon'], mechanism: ['the Reader is opening the mechanism…', 'the-reader-is-opening-the-mechanism'] };
  const NARRATION_SLUGS = ['reading-your-now', ...Object.values(STAGE).map((x) => x[1])];
  const labelAudioRef = useRef(null); const labelQueue = useRef(Promise.resolve()); const clipCache = useRef(new Map());
  const clipSrc = (voice, slug) => clipCache.current.get(`${voice}/${slug}`) || `/voice/labels/${voice}/${slug}.wav`;
  const loadClips = async (voice, slugs) => { for (const slug of slugs) { const key = `${voice}/${slug}`; if (clipCache.current.has(key)) continue; try { const r = await fetch(`/voice/labels/${voice}/${slug}.wav`); if (!r.ok) continue; const b = await r.blob(); clipCache.current.set(key, URL.createObjectURL(b)); } catch {} } };
  // .661 (Keel §1): the draw's three beats, as stored clips — the signature ("You drew Faith."), the status, the seat ("In Imagination.") — warmed when the draw is made
  const beatSlug = (draw, beat) => beat === 'card' ? `name-${draw.transient}` : beat === 'status' ? `status-${draw.status}` : (Number(draw.transient) === Number(draw.position) ? 'seat-own' : `seat-${draw.position}`);
  useEffect(() => { // preload the current voice's labels and its narrator's lines once the voice is on (≈3 MB, cached as object URLs)
    if (!voiceOut || typeof window === 'undefined') return;
    let dead = false;
    loadClips(NARRATOR[voiceName] || 'af_bella', [...LABEL_SLUGS, ...NARRATION_SLUGS]); // .648: labels and narration both in the narrator's voice
    return () => { dead = true; };
  }, [voiceOut, voiceName]); // eslint-disable-line react-hooks/exhaustive-deps
  const playClip = (voice, slug) => new Promise((resolve) => {
    if (!voiceOut || !slug) return resolve();
    try { if (!labelAudioRef.current) labelAudioRef.current = new Audio(); const a = labelAudioRef.current; a.onended = () => resolve(); a.onerror = () => resolve(); a.src = clipSrc(voice, slug); const pr = a.play(); if (pr && pr.catch) pr.catch(() => resolve()); } catch { resolve(); }
  });
  const [armed, setArmed] = useState(null); const armedRef = useRef(null); const armTimer = useRef(null); // .655 TWO TAPS
  const disarm = () => { armedRef.current = null; setArmed(null); if (armTimer.current) { clearTimeout(armTimer.current); armTimer.current = null; } };
  const recDoneRef = useRef({}); // .696: set below, once the recommendation state exists
  const twoTap = (key, fn, slug) => () => { // .698 (founder: "the double clicking is more of a pain than the value would infer") — ONE tap: the label is said and the thing happens
    if (recKeysRef.current.has(key) && recDoneRef.current.recOpen) recDoneRef.current.setRecDone?.(recDoneRef.current.recOpen); // .696 (founder): once one recommended pill is chosen, the rest stop flashing
    disarm(); if (slug) sayLabel(slug); fn();
  };
  const recKeysRef = useRef(new Set()); // .661 (Keel §10): the data-arm keys the latest turn recommends
  const armedCls = (key) => (armed === key ? ' ring-2 ring-amber-300/80 shadow-[0_0_14px_rgba(252,211,77,0.45)] scale-[1.04]' : (recKeysRef.current.has(key) ? ' nkya-rec' : '')); // .662: a recommended door flashes through the whole spectrum, black to white (founder)
  useEffect(() => { // a tap anywhere but the armed control disarms it
    if (!armed) return;
    const off = (e) => { if (!e.target?.closest?.(`[data-arm="${armed}"]`)) disarm(); };
    const id = setTimeout(() => document.addEventListener('click', off), 0);
    return () => { clearTimeout(id); document.removeEventListener('click', off); };
  }, [armed]); // eslint-disable-line react-hooks/exhaustive-deps
  const sayLabel = (slug) => { if (!voiceOut) return; labelQueue.current = labelQueue.current.then(() => playClip(NARRATOR[voiceName] || 'af_bella', slug)); }; // .648: the narrator says the button too — the Reader's voice speaks only the Reader's words
  const sayNarration = (slug) => { if (!voiceOut) return; labelQueue.current = labelQueue.current.then(() => playClip(NARRATOR[voiceName] || 'af_bella', slug)); };
  const playUrl = (url) => new Promise((resolve) => { // .654: a clip made on the fly, on the label player
    if (!voiceOut || !url) return resolve();
    try { if (!labelAudioRef.current) labelAudioRef.current = new Audio(); const a = labelAudioRef.current; a.onended = () => resolve(); a.onerror = () => resolve(); a.src = url; const pr = a.play(); if (pr && pr.catch) pr.catch(() => resolve()); } catch { resolve(); }
  });
  const sayLine = (text) => { // .654: the narrator says a line that is not stored (the draw's name) — fetched now, played in its turn in the queue
    if (!voiceOut || !text) return;
    const clip = (async () => { try { const h = await voiceAuth(); const r = await fetch('/api/voice', { method: 'POST', headers: { 'Content-Type': 'application/json', ...h }, body: JSON.stringify({ text, voice: NARRATOR[voiceName] || 'af_bella' }) }); const j = await r.json(); if (j?.url) setVoiceSpend((v) => ({ pieces: v.pieces + 1, chars: v.chars + (j.chars || text.length), secs: v.secs + (j.secs || 0), usd: v.usd + (j.usd || 0) })); return j?.url || null; } catch { return null; } })();
    labelQueue.current = labelQueue.current.then(async () => { const url = await clip; if (url) await playUrl(url); });
  };
  const holdWhilePaused = async (run) => { while (pausedRef.current && run === speakRun.current) await new Promise((d) => setTimeout(d, 100)); };
  // .625 CADENCE (founder: "it's the pausing… the whole thing is railroading you"). The pieces used to be 420-character runs joined
  // with one space, so every paragraph break vanished for the ear. Now a piece is a paragraph (a long one is cut at sentences), and
  // each piece carries the SILENCE that follows it: a breath between paragraphs, a full beat after a heading or the gist, and before
  // the question. The hosted model has no pause markup, so the player supplies the silence.
  const GAP = { sentence: 60, paragraph: 150, heading: 1000, beforeQuestion: 240, colon: 250 }; // .629 halved; .630 shorter; .631 shorter again (founder, three times: 'reduce the pauses again'); .661 (Keel §7) a title is ~1 s from its text, a colon is a ~500 ms beat
  const piecesOf = (t) => {
    const out = [];
    const pushText = (text, gapAfter, kind = 'text') => {
      const paras = ensureParagraphBreaks(String(text || '')).split(/\n\n+/).map((x) => x.trim()).filter(Boolean);
      paras.forEach((para, pi) => {
        const sents = para.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) || [para]; const subs = []; let cur = '';
        const flush = (colon) => { if (cur.trim()) subs.push({ text: cur.trim(), colon }); cur = ''; };
        for (const x of sents) {
          // .698 (founder, third time: "the colon pause is still unbearably long"): a colon is no longer a cut at all — the piece runs on and the
          // server says the colon as a comma (forTheEar). The .661 beat and the .696 label merge both go; GAP.colon is unused.
          const seg = x; if ((cur + seg).length > 420 && cur) flush(false); cur += seg + ' ';
        }
        flush(false);
        subs.forEach((sub, si) => out.push({ text: sub.text, kind, para: pi, gap: (si < subs.length - 1 ? GAP.sentence : (pi < paras.length - 1 ? GAP.paragraph : gapAfter)) }));
      });
    };
    // .698 (founder: "THE MEDICINE is still SHOUTED… we shouldn't send the reader ANYTHING in ALL CAPS"): the server has lowered capital runs since
    // .643, so what was punched was the two-word heading piece said alone ("The medicine."). A heading is no longer its own piece: it is
    // folded into the first sentence that follows it, and every piece is lowered here too, before it leaves the page — belt and braces.
    const lowerCaps = (s) => String(s).replace(/\b[A-Z][A-Z'’]{2,}(?:\s+[A-Z][A-Z'’]+)*\b/g, (run, offset, whole) => { const before = whole.slice(0, offset).replace(/\s+$/, ''); const startsSentence = !before || /[.!?\n]$/.test(before); return startsSentence ? run.charAt(0) + run.slice(1).toLowerCase() : run.toLowerCase(); });
    const foldHeading = (heading) => { const first = out.length; return () => { if (out.length > first && heading) out[first].text = `${heading}. ${out[first].text}`; }; };
    // .641: the gist is NOT spoken (founder: "the summary at the top… in its own container, and not read back by the voice")
    { const fold = foldHeading(t.heading); pushText(t.text, GAP.paragraph, 'text'); fold(); }
    if (t.medicine) { // .639: the spoken heading matches the box — "Where this can grow" on a Balanced draw (founder: "it always says the medicine")
      const field = t.draw ? [t.draw] : (Array.isArray(draws) ? draws : []);
      const grow = field.length > 0 && field.every((d) => Number(d?.status) === 1);
      const fold = foldHeading(grow ? 'Where this can grow' : 'The medicine'); pushText(t.medicine, GAP.paragraph, 'medicine'); fold();
    }
    for (const p of out) p.text = lowerCaps(p.text);
    if (t.question) { if (out.length) out[out.length - 1].gap = Math.max(out[out.length - 1].gap, GAP.beforeQuestion); pushText(t.question, 0, 'question'); }
    if (out.length) out[out.length - 1].gap = 0;
    return out;
  };
  const speakTurn = async (t, startAt = 0) => { // .663: startAt — read from a tapped paragraph
    // .609: Replicate holds a new account to one call per ten seconds. Sending every piece at once got most refused and SKIPPED (the founder
    // heard only the second half). Now: one request at a time, fetched while the previous piece plays; a refused piece waits and retries.
    if (!t || !t.text) return;
    const run = ++speakRun.current; pausedRef.current = false; setPaused(false); jumpRef.current = startAt > 0 ? startAt : null; voiceSkipRef.current = false; setSpeakingId(t.id); speakingTurnRef.current = t.id; setVoiceMsg(`Voice: ${VOICE_LABEL[voiceName] || 'George'}…`);
    const h = await voiceAuth(); const pieces = piecesOf(t); piecesRef.current = pieces;
    const fetchPiece = async (text) => {
      for (let k = 0; k < 8; k++) {
        if (run !== speakRun.current) return {};
        let res = {}; try { const r = await fetch('/api/voice', { method: 'POST', headers: { 'Content-Type': 'application/json', ...h }, body: JSON.stringify({ text, voice: voiceName, speed: voiceSpeedRef.current }) }); res = { ...(await r.json()), status: r.status }; } catch { res = { status: 0 }; } // .698 the readback speed rides with every piece
        if (res.url) setVoiceSpend((v) => ({ pieces: v.pieces + 1, chars: v.chars + (res.chars || text.length), secs: v.secs + (res.secs || 0), usd: v.usd + (res.usd || 0) })); // .613
        if (res.url || res.waking) return res;
        await new Promise((done) => setTimeout(done, 5000));   // throttled or a hiccup: wait, then try the same piece again
      }
      return { error: 'the voice service kept refusing — try Listen again in a minute' };
    };
    if (!audioRef.current) audioRef.current = new Audio(); const a = audioRef.current;
    if (!pieces.length) { setSpeakingId(null); return; }
    // .633 THREE AHEAD (founder: "really long pauses between sentences now"). Since .625 a piece is a paragraph — often one sentence,
    // two or three seconds of audio — and one piece ahead no longer covered the round trip to the voice server, so playback waited on
    // the network between sentences. The throttle is gone (600/min), so three pieces are kept in flight ahead of the one playing.
    const AHEAD = 3; const jobs = new Array(pieces.length).fill(null); const jobSpeed = new Array(pieces.length).fill(null);
    const ensureAhead = (from) => { for (let j = from; j < Math.min(pieces.length, from + AHEAD); j++) if (!jobs[j]) { jobSpeed[j] = voiceSpeedRef.current; jobs[j] = fetchPiece(pieces[j].text); } }; // .702: each piece remembers the speed it was made at
    ensureAhead(startAt > 0 ? Math.min(pieces.length - 1, startAt) : 0);
    for (let i = 0; i < pieces.length; i++) {
      if (jumpRef.current != null) { i = Math.min(pieces.length - 1, jumpRef.current); jumpRef.current = null; ensureAhead(i); } // .653: a tapped paragraph
      if (voiceSkipRef.current) break;
      ensureAhead(i + 1);
      const res = await jobs[i]; if (run !== speakRun.current) return;
      if (!res?.url) { if (res?.error) { console.warn('[voice]', res.error); setVoiceMsg(`Voice: ${res.error}`); } if (res?.waking) break; continue; }
      await holdWhilePaused(run); if (run !== speakRun.current) return; // .629: a tap before this piece holds it
      if (i === 0) { await labelQueue.current; if (run !== speakRun.current) return; } // .647: the label and the narrator finish first
      setVoiceMsg(''); setSpoken({ id: t.id, kind: pieces[i].kind, para: pieces[i].para }); // .634
      const ended = new Promise((done) => { endedRef.current = done; a.onended = done; a.onerror = done; }); // .653: a jump or a skip can end it early
      a.src = res.url; pieceSpeedRef.current = jobSpeed[i] || voiceSpeedRef.current; try { a.playbackRate = Math.max(0.5, Math.min(2, voiceSpeedRef.current / pieceSpeedRef.current)); } catch {} // .702 (founder: "speed adjustments don't take effect until the next full pull"): a piece made at the old speed is played at the new one — the change is immediate, pitch kept by the browser
      try { await a.play(); } catch (e) { console.warn('[voice] play blocked', e?.message); setVoiceMsg('Voice: the browser blocked playback — tap Listen on the turn'); break; }
      await ended; endedRef.current = null; if (run !== speakRun.current) return;
      if (voiceSkipRef.current) break; if (jumpRef.current != null) continue;
      if (pieces[i].gap) { let left = pieces[i].gap; while (left > 0) { if (run !== speakRun.current) return; if (voiceSkipRef.current || jumpRef.current != null) break; if (pausedRef.current) { await new Promise((d) => setTimeout(d, 100)); continue; } await new Promise((d) => setTimeout(d, 50)); left -= 50; } } // .625: the silence after this piece; .629: it holds while paused; .653: a jump or skip cuts it
    }
    if (run === speakRun.current) { setSpeakingId(null); setSpoken(null); speakingTurnRef.current = null; voiceSkipRef.current = false; setPaused(false); setVoiceMsg(''); }
  };
  useEffect(() => { if (!voiceMsg || /…$/.test(voiceMsg) || /paused/.test(voiceMsg)) return; const id = setTimeout(() => setVoiceMsg(''), 9000); return () => clearTimeout(id); }, [voiceMsg]);
  const spokenRef = useRef(null); spokenRef.current = spoken; const turnsRef = useRef([]); turnsRef.current = turns;
  const panelTextRef = useRef({}); // .698: the panels' words by their spoken id, so an idle tap on a panel paragraph starts the reading there (filled below, once the panels' state exists)
  useEffect(() => { // .629 TAP TO PAUSE; .653 tap a paragraph to jump; .663 (founder): a tap on the paragraph BEING READ pauses and resumes it; a tap on another
    // paragraph jumps there; when nothing is playing, a tap on a paragraph of the latest turn starts the reading from it — so no standing menu is needed
    if (!voiceOut) return;
    const parse = (el) => { const key = el.getAttribute('data-spoken') || ''; const m = key.match(/^(.*):([a-z]+):(\d+)$/); return m ? { id: m[1], kind: m[2], para: Number(m[3]) } : null; };
    const onTap = (e) => {
      if (e.target?.closest?.('[data-pause-pop]')) return;
      const control = e.target?.closest?.('button, a, input, select, textarea, label, [role="button"], [contenteditable]');
      const paraEl = !control && e.target?.closest?.('[data-spoken]'); const p = paraEl ? parse(paraEl) : null;
      if (!speakingId) { // idle: a paragraph of the latest reader turn starts the reading there; .698 (founder): a panel's paragraph too
        if (!p) return;
        const panel = panelTextRef.current[p.id]; if (panel) { const pt = { id: p.id, text: panel }; const idx = piecesOf(pt).findIndex((pc) => pc.kind === p.kind && pc.para === p.para); speakTurn(pt, Math.max(0, idx)); return; }
        const t = [...turnsRef.current].reverse().find((x) => x.role === 'reader'); if (!t || p.id !== t.id) return;
        const idx = piecesOf(t).findIndex((pc) => pc.kind === p.kind && pc.para === p.para); speakTurn(t, Math.max(0, idx)); return;
      }
      if (p && p.id === speakingTurnRef.current) {
        const cur = spokenRef.current; const same = cur && cur.kind === p.kind && (!['text', 'medicine', 'next'].includes(p.kind) || cur.para === p.para);
        if (same) { togglePause(); return; } // the paragraph being read: pause / resume
        const idx = piecesRef.current.findIndex((pc) => pc.kind === p.kind && pc.para === p.para); if (idx >= 0) { jumpToPiece(idx); return; }
      }
      if (control) return;
      togglePause(); // anywhere else that is not a control: pause / resume
    };
    document.addEventListener('click', onTap);
    return () => document.removeEventListener('click', onTap);
  }, [speakingId, voiceOut]); // eslint-disable-line react-hooks/exhaustive-deps
  // .640: the quiet manner (.614) was judged by the founder — allegory, not directness — and retired; the Handing is the one manner
  const promptBase = handing ? HANDING_SET.BASE_SYSTEM : BASE_SYSTEM;
  const promptOver = handing ? { rules: HANDING_SET.EZ_RULES } : {};
  const systemPrompt = ezSystem(promptBase, voice, promptOver); // .528: no hardcoded FRIEND persona; the kernel's rails that the discourse rules already carry are stripped once

  const discourseText = useCallback((list) => list.map((t) => {
    if (t.role === 'you') {
      const verb = t.mode === 'locate' ? 'ASKER ASKS THE FIELD WHERE IT IS (a locating signature was drawn)' : t.mode === 'reflect' ? 'ASKER REFLECTS (puts a question to the field)'
        : t.mode === 'forge' ? 'ASKER FORGES (declares)' : t.act ? 'ASKER (asks for one small thing to do)' : 'ASKER';
      return `${verb}: "${t.text}"`;
    }
    if (t.role === 'catchup') return '[catch-up signature shown]';
    // .528: the Reader's own medicine and question ride with its turn — later turns used to see 'One question.' and nothing
    const gave = t.medicine ? `\n  THE MEDICINE IT GAVE: ${t.medicine}` : '';
    const askedQ = t.question ? `\n  IT ASKED: "${t.question}"` : '';
    return `READER (you — your own earlier words, never the asker's)${t.draw ? (t.mode === 'locate' ? ` (reading the locating signature ${drawLabel(t.draw)} as a pointer)` : ` (on the newly drawn ${drawLabel(t.draw)})`) : t.act ? ' (one small act, then quiet)' : ''}: ${t.text}${gave}${askedQ}`; // .699: labelled as the Reader's own
  }), []);

  // Every turn used to be re-sent in full on every call, so a long session paid more and more
  // for its own history. Keep the newest within a budget and say how much was dropped.
  const discourseBlock = useCallback((list) => {
    let lines = discourseText(list);
    const CAP = 12000;
    let dropped = 0;
    while (lines.length > 1 && lines.join('\n\n').length > CAP) { lines = lines.slice(1); dropped += 1; }
    const note = dropped ? `\n\n(${dropped} earlier turn${dropped > 1 ? 's' : ''} omitted for length; the reading and its signatures are unchanged.)` : '';
    return lines.join('\n\n') + note;
  }, [discourseText]);

  const rawCall = async (userMessage, system = systemPrompt, maxTokens = (voice === 'deep' || voice === 'mystical') ? 2400 : 1500, extra = {}) => { // .507: extra rides in the body (turn: 'talk' | 'card' | 'door') // .491: the deep and mystical registers are given room // 1100→1500 (.469): a 340-word opening plus its envelope on Sonnet 5's tokenizer sits right at 1100
    const t0 = Date.now();
    if (bench) { await new Promise((r) => setTimeout(r, 600)); return { reading: JSON.stringify(benchReply(userMessage)), usage: null }; }
    // .536: the register, stated in the turn, on every reader-facing call (the main EZ system and the write-up; the brazier keeps its kitchen)
    const reg = extra.register || voice; // .543: a reread carries its own register
    const readerFacing = !!extra.register || system === systemPrompt || String(system).startsWith(systemPrompt) || String(system).includes(CLOSING_RULES);
    const sent = readerFacing && REGISTER_LINE[reg] && !userMessage.includes('\n\nREGISTER — ') ? `${userMessage}\n\nREGISTER — ${REGISTER_LINE[reg]}` : userMessage;
    // .541: the call has its own clock; a dead connection or a stuck function is said out loud, never sat through in silence
    const ac = new AbortController();
    const clock = setTimeout(() => ac.abort(new Error('the Reader did not answer in time — the connection or the host stalled. Ask again.')), 100000);
    let res, data;
    try {
      res = await fetch('/api/reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await readingAuth()) },
        body: JSON.stringify({ messages: [{ role: 'user', content: sent }], system, model: MODEL_IDS.sonnet /* EZ reads on Standard (2026-10-02) */ || MODEL_IDS[chrome.prefs.selectedModel] || MODEL_IDS.sonnet, max_tokens: maxTokens, userId: user?.id, ...extra }),   // 2026-09-30: the person's chosen Reader
        signal: ac.signal,
      });
      const raw = await res.text();
      try { data = JSON.parse(raw); } catch { throw new Error(`the Reader's door answered ${res.status} without a reading (${raw.slice(0, 80).replace(/\s+/g, ' ')}…). Ask again.`); }
    } catch (e) {
      if (e?.name === 'AbortError' || /did not answer in time/.test(String(e?.message))) throw new Error('the Reader did not answer in time — the connection or the host stalled. Ask again.');
      if (e instanceof TypeError) throw new Error('could not reach the Reader — check the connection and ask again.');
      throw e;
    } finally { clearTimeout(clock); }
    if (data.error) throw new Error(data.error);
    if (data.usage) setLedger((L) => [...L, {
      t: Date.now(), purpose: purposeOf(userMessage), ms: Date.now() - t0,
      fresh: data.usage.input_tokens || 0, written: data.usage.cache_creation_input_tokens || 0,
      read: data.usage.cache_read_input_tokens || 0, out: data.usage.output_tokens || 0,
      cents: usdFor(data.usage, data.model) * 100, model: data.model || '', provider: data.provider || '',
    }]);
    if (data.usage) setUsd((u) => u + usdFor(data.usage, data.model)); // priced by the model that ANSWERED (.473)
    if (data.usage) setUsage((u) => ({
      input_tokens: (u.input_tokens || 0) + (data.usage.input_tokens || 0),
      output_tokens: (u.output_tokens || 0) + (data.usage.output_tokens || 0),
      cache_read_input_tokens: (u.cache_read_input_tokens || 0) + (data.usage.cache_read_input_tokens || 0),
      cache_creation_input_tokens: (u.cache_creation_input_tokens || 0) + (data.usage.cache_creation_input_tokens || 0)
    }));
    return data;
  };

  // One strict retry before giving up. A dropped brace used to cost the person their turn and
  // the tokens both; now it costs one cheap re-ask.
  // .612 THE STAMP: how many times a turn says the frame's own words (founder 2026-10-03: "this week" eight times in a turn, four in the
  // next reading's opening). Once at the opening and once more is the cap; past that the turn is asked for again with the count named.
  const stampWords = () => { if (!frame) return []; const f = frameOf(frame.k); return [f?.k === 'custom' ? frame.detail : f?.label, f?.k === 'custom' ? null : frame.detail].filter((x) => typeof x === 'string' && x.trim().length > 2).map((x) => x.trim()); };
  const stampOf = (t) => { let n = 0; for (const w of stampWords()) { const re = new RegExp('(?<![\\w])' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\w])', 'gi'); n = Math.max(n, (String(t || '').match(re) || []).length); } return n; };
  const callReader = async (userMessage, system = systemPrompt, maxTokens = (voice === 'deep' || voice === 'mystical') ? 2400 : 1500, extra = {}) => { // 1100→1500 (.469): a 340-word opening plus its envelope on Sonnet 5's tokenizer sits right at 1100
    let data = await rawCall(userMessage, system, maxTokens, extra);
    if (data?.medicineVerdict) console.info('[medicine-act]', data.medicineVerdict); // .681/.683 THE MEDICINE-ACT JUDGE — the route attaches the verdict on an opening; a FAIL joins the one re-ask below
    let obj = parseJson(data.reading);
    if (!obj || !obj.reader) {
      data = await rawCall(
        `${userMessage}\n\nYOUR LAST REPLY WAS NOT VALID JSON AND COULD NOT BE READ. Send the same answer again as ONE JSON object and nothing else — no preamble, no code fence, no trailing text.`,
        system, maxTokens
      );
      obj = parseJson(data.reading);
    }
    if (!obj || !obj.reader) throw new Error('The Reader answered in a shape I could not read, twice. Nothing was lost — try that again.');
    // THE GARBLE GUARD (2026-10-02): the scar tests on every reply; a turn that trips one is asked for again, once, with the reason named.
    // ('the newsletter says', a closing letter, the December commands, a pet name, a leak-shaped line — none of them reaches the glass.)
    try {
      const scars = new Set(['garble', 'letter', 'commands', 'pet', 'tarot', 'bothways', 'narrator', 'conduit', 'promise', 'binding', 'listy', 'destination', 'plainname', 'figure', 'operation']); // .700 + the taught figures and the operation quoted // .678 THE PLAIN NAME — the lint only raises it when voice === 'plain' // + THE BINDING (2026-10-04); + listy now that THE FIELD hands the Reader nouns ('unnamed' stays a flag: benched 2026-10-04, a re-ask did not move it — the record's own "putting something down" is the verb's object) // + Keel's plain tests (2026-10-03); 'unnamed' is a lint flag only — the record gives the Reader no nouns yet, so a re-ask could not fix it
      const check = (o, t) => (lintOutput({ text: t, parsed: o, preset: { kind: extra?.turn === 'talk' ? 'talk' : 'opening' }, hostile: false, draw: extra?.draw || (Array.isArray(draws) ? draws[0] : null), draws: extra?.draw ? [extra.draw] : (Array.isArray(draws) ? draws : undefined), question: question || '', voice: extra?.register || voice }).flags || []).filter((f) => scars.has(f.code)); // .673: the draws and the question reach the lint (THE DESTINATION); .678: and the voice (THE PLAIN NAME is Plain-gated; a reread rides its own register)
      const faults = (o, t) => { // every reason a reply is set aside, so the retry is judged on ALL of them (.675: the retry used to be accepted by the scars + the stamp alone — an empty medicine or "weather" on the retry went out)
        const bad = check(o, t);
        if (o.aim === 'thing' && (/^\s*(you\b|your\b|my hunch|the draw)/i.test(String(o.gist || '')) || /^\s*(you\b|your\b|my hunch)/i.test(String(o.reader || '')))) bad.push({ code: 'aim', detail: 'the question is about a THING and the opening began on the person — the first words of the gist and of the body are the thing\'s name and what the draw says it is or is for; the person comes second' }); // .638
        if (/\bweather\b/i.test([o.gist, o.reader, o.medicine, o.question].map((x) => String(x || '')).join(' '))) bad.push({ code: 'weather', detail: 'the word "weather" reached the glass — it is the house\'s own figure for the past as background, not a word people understand here; say the plain thing (the past, what is around this, the background) instead' }); // .654
        { // .699 THE ATTRIBUTION CHECK (founder: the Reader handed its own step back as "you said the step is not more work"): a "you said / you told me /
          // you called it" must point at words the person actually typed — the question or an asker turn. Checked by overlap: the eight words after the
          // phrase share two content words with the asker's text, or the sentence is set aside and asked again.
          const askerText = [question || '', ...(Array.isArray(turnsRef.current) ? turnsRef.current.filter((x) => x.role === 'you').map((x) => String(x.text || '')) : [])].join(' ').toLowerCase();
          const askerWords = new Set(askerText.split(/[^a-z']+/).filter((w) => w.length >= 4));
          const glass = [o.gist, o.reader, o.medicine, o.question].map((x) => String(x || '')).join(' ');
          const re = /\byou (?:said|told me|called it|put it|wrote|mentioned)\b([^.!?]{0,80})/gi; let m; let miss = null;
          while ((m = re.exec(glass))) { const tail = String(m[1] || '').toLowerCase().split(/[^a-z']+/).filter((w) => w.length >= 4); const hit = tail.filter((w) => askerWords.has(w)).length; if (tail.length >= 2 && hit < 2) { miss = m[0]; break; } }
          if (miss && askerWords.size) bad.push({ code: 'attribution', detail: `"${miss.trim().slice(0, 90)}" hands the person words they did not type — "you said" is only for what the ASKER wrote; your own earlier step, medicine, dragon or floor is yours ("the step I handed you"), never theirs` });
        }
        if (extra?.turn === 'opening' && !String(o.medicine || '').trim()) bad.push({ code: 'medicine', detail: 'the "medicine" field is empty — every opening carries the way through in its own box: on an imbalanced draw the record\'s medicine as the partner signature\'s own action; on a Balanced draw what this capacity is free to feed next; two to four plain sentences' }); // .674: the opening only (talk/card/door turns may carry none — a locating turn keeps it empty by rule); 5 of 42 bench openings on the first lane went out with no medicine and the medicine check only catches a WRONG name
        if (extra?.turn !== 'talk' && !(Array.isArray(o.next) && o.next.some((n) => n && typeof n.panel === 'string' && typeof n.why === 'string' && panelKey(n.panel)))) bad.push({ code: 'next', detail: 'the "next" field is empty — after your question, name at least one door this person would want next (whys, meaning, moon, mechanism, reflect, forge, clarify, unpack, example, find, medicine, dragon or step) with one plain line on what opening it will do for THIS draw' }); // .661 (Keel §10): every reading closes with a recommended door
        { const n = stampOf(o.reader); if (n > 2) bad.push({ code: 'stamp', detail: `the frame's words ("${stampWords().join('", "')}") appear ${n} times in one turn — name the frame once at the opening, then stay inside it without saying it again` }); } // .612
        return bad;
      };
      const bad = faults(obj, data.reading);
      // .683 THE MEDICINE-ACT JUDGE PROMOTED (Air, 2026-10-05): the route judged this opening's medicine box; FAIL_OTHER_CARD / FAIL_WRONG_ACT joins the ONE
      // re-ask (budget unchanged); UNCERTAIN never triggers. A medicine-triggered retry replaces the original only when the route's verdict on the
      // retry is PASS, the box is non-empty, the retry carries no fault code the original lacked, and total faults fall. Otherwise the original stays.
      const medTriggered = data?.medicineVerdict === 'FAIL_OTHER_CARD' || data?.medicineVerdict === 'FAIL_WRONG_ACT';
      if (medTriggered) bad.push({ code: 'medicineact', detail: data.medicineNote || 'the medicine box does not do the opening\'s medicine — write it as the record\'s medicine for the signature you drew, its own action, done small, today' });
      console.info('[next]', JSON.stringify(obj.next ?? null).slice(0, 300));
      if (bad.some((f) => f.code === 'next')) console.warn('[next] the reply carried no usable next door; keys:', Object.keys(obj).join(','));
      if (bad.length) {
        const again = await rawCall(`${userMessage}\n\nYOUR LAST REPLY WAS SET ASIDE: ${bad.map((f) => f.detail).join('; ')}. Answer the turn again, in your own words, without that.`, system, maxTokens, extra);
        const o2 = parseJson(again.reading);
        if (o2 && o2.reader) {
          const f2 = faults(o2, again.reading); const origCodes = new Set(bad.map((f) => f.code)); const newScars = f2.filter((f) => !origCodes.has(f.code));
          if (medTriggered) {
            const v2 = String(o2.medicine || '').trim() ? (again?.medicineVerdict || 'UNCERTAIN') : 'EMPTY';
            const accept = v2 === 'PASS' && newScars.length === 0 && f2.length < bad.length;
            console.info(`[medicine-act] re-ask: ${data.medicineVerdict} → retry ${v2}${newScars.length ? ' (new: ' + newScars.map((f) => f.code).join(',') + ')' : ''} → ${accept ? 'ACCEPTED' : 'original kept'}`);
            if (accept) { obj = o2; data = again; }
          } else { // a scar-only retry: the route judged its medicine too, and a FAIL counts as a fault — a retry that trades a scar for a wrong medicine does not win
            const v2 = String(o2.medicine || '').trim() ? (again?.medicineVerdict || 'UNCERTAIN') : 'EMPTY';
            const f2count = f2.length + (v2 === 'FAIL_OTHER_CARD' || v2 === 'FAIL_WRONG_ACT' || v2 === 'EMPTY' ? 1 : 0);
            console.info(`[medicine-act] scar re-ask: retry medicine ${v2} → ${f2count < bad.length ? 'ACCEPTED' : 'original kept'}`);
            if (f2count < bad.length) { obj = o2; data = again; } // (.612's stamp cap is inside faults)
          }
        }
      }
      // .679 THE WEATHER FALLBACK (Air's docket item 2): if the word survived the re-ask, take it off the glass mechanically — the house's figure becomes the plain word. Logged so the rate can be counted. Never the chips.
      { const W = /\bthe weather\b/gi, w = /\bweather\b/gi; let fixed = 0; for (const k of ['gist', 'reader', 'medicine', 'question']) { const s = String(obj[k] || ''); if (/\bweather\b/i.test(s)) { obj[k] = s.replace(W, 'the background').replace(w, 'background'); fixed++; } } if (fixed) console.info(`[weather] → background on ${fixed} field(s) after the re-ask`); }
    } catch {}
    // THE VERDICT, ONCE: the gist opens with it; if the body opens with the same word, the body's copy is dropped (the rule says so, the model sometimes doesn't).
    try {
      const V = /^\s*["“]?(yes|no|not yet|not as it stands)\b[.,;:!—–-]?\s*/i;
      const g = V.exec(String(obj.gist || '')), b = V.exec(String(obj.reader || ''));
      if (g && b && g[1].toLowerCase() === b[1].toLowerCase()) { const rest = String(obj.reader).replace(V, ''); if (rest.trim().length > 40) obj.reader = rest.charAt(0).toUpperCase() + rest.slice(1); }
    } catch {}
    return { obj, usage: data.usage };
  };

  // The question is shown after the medicine; a prose that ends by asking it too shows it
  // twice. The rule says not to, the model sometimes does anyway, so the repeat is stripped.
  const stripTrailingQuestion = (text, q) => {
    if (!text || !q) return text || '';
    const norm = (x) => x.replace(/[\s*_"'‘’“”.?!]+/g, '').toLowerCase();
    const paras = text.trim().split(/\n\n+/);
    const last = paras[paras.length - 1] || '';
    // .517: the prose often ends "So — what's one thing…" while the question field holds "What's one thing…" —
    // a lead-in and the question: strip the lead-in before comparing, and match on ends-with, not only equality
    const lead = last.replace(/^\s*(?:so|and so|so then|then|now|okay|ok|alright|well)?\s*[—–\-:,]?\s*/i, '');
    const nq = norm(q);
    if (paras.length > 1 && nq && (norm(last) === nq || norm(lead) === nq)) return paras.slice(0, -1).join('\n\n');
    if (paras.length > 1 && nq && nq.length > 12 && norm(last).endsWith(nq) && norm(last).length - nq.length < 12) return paras.slice(0, -1).join('\n\n');
    // .550: the same question REWORDED — "So: which one is warm — is it your work…?" in the prose and "Which one is warm — your
    // work…?" in the field. If the last paragraph is a question sharing most of its real words with the field, it is the repeat.
    if (paras.length > 1 && /\?\s*$/.test(last)) {
      const words = (x) => new Set(x.toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter((w) => w.length >= 4));
      const A = words(lead), B = words(q);
      if (A.size >= 4 && B.size >= 4) { let shared = 0; for (const w of B) if (A.has(w)) shared++; if (shared / Math.min(A.size, B.size) >= 0.6) return paras.slice(0, -1).join('\n\n'); }
    }
    return text;
  };
  // .557: THE MEDICINE CHECK. The record's partner for a card (lib/kernel.js) against the hidden medicineCard the Reader named.
  const expectedMedicine = (card) => { try { return card ? (buildKernel(card, DEFS)?.partner || '') : ''; } catch { return ''; } };
  const medicineMismatch = (obj, card) => {
    const want = expectedMedicine(card); const got = String(obj?.medicineCard || '').trim();
    return want && got && got.toLowerCase() !== want.toLowerCase() ? { want, got } : null;
  };
  const medicineRetryNote = (mm) => `\n\nYOUR TURN NAMED "${mm.got}" AS THE MEDICINE. THE RECORD'S MEDICINE FOR THIS SIGNATURE IS ${mm.want}. Rewrite the whole turn with the medicine as ${mm.want}'s own action, from the record — never the drawn signature prescribing itself — and fill "medicineCard" with "${mm.want}". JSON only.`;
  const readerTurn = (obj, extra = {}) => ({
    id: `t${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
    role: 'reader',
    text: stripDirectiveEcho(stripTrailingQuestion(obj.reader, obj.question)), // .530: no directive echo on glass
    gist: typeof obj.gist === 'string' ? stripDirectiveEcho(obj.gist.trim()) : '', // .555: the thesis, at the top
    next: Array.isArray(obj.next) ? obj.next.filter((n) => n && typeof n.panel === 'string' && typeof n.why === 'string' && panelKey(n.panel)).map((n) => ({ panel: panelKey(n.panel), why: n.why.trim() })).slice(0, 4) : [], // .661 (Keel §10): the next door(s), recommended
    medicineCard: typeof obj.medicineCard === 'string' ? obj.medicineCard.trim() : '', // .557: hidden; checked against the record
    hunchFlag: /\byou(?:'ve| have)? (?:never|haven't|not once)\b|without anyone knowing|nobody (?:knows|has heard)|no one (?:knows|has heard)|whole years of this/i.test(String(obj.reader || '')), // .557: a soft watch on biography claims (never on glass)
    question: obj.question || '',
    chips: Array.isArray(obj.chips) ? obj.chips.slice(0, 7) : [], // answer, build, pushback, clarify, stair, and up to two locate chips (a cap of 5 was silently dropping Find it)
    reflect: Array.isArray(obj.reflect) ? obj.reflect.slice(0, 4) : [],
    forge: Array.isArray(obj.forge) ? obj.forge.slice(0, 4) : [],
    medicine: typeof obj.medicine === 'string' ? stripDirectiveEcho(obj.medicine.trim()) : '',
    located: typeof obj.located === 'string' ? obj.located.trim() : '',
    voice, // .537: the register this turn was written in, so an export shows a mid-read switch
    suggest: (obj.suggest && typeof obj.suggest === 'object' && obj.suggest.text) ? obj.suggest : null,
    closing: obj.closing === true,
    actLine: typeof obj.act === 'string' ? obj.act.trim() : '',
    ts: Date.now(),
    ...extra
  });

  // The journey block: recent readings, narrative summaries, and any personalization facts
  // the account has switched on. The route authenticates by Bearer token — a userId query
  // param silently returns an empty block, which is how EZ shipped without history yesterday.
  const loadHistory = async (drawsToUse) => {
    try {
      const session = await getSession();
      const token = session?.session?.access_token;
      if (!token) return '';
      const params = new URLSearchParams({ draws: JSON.stringify(drawsToUse || []) });
      const res = await fetch(`/api/user/context?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      // .540: the personal-fact extraction runs in the background, well after the reading has begun — never on the way in
      setTimeout(() => { fetch(`/api/user/context?${params}&extract=1`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {}); }, 20000);
      return data?.contextBlock || '';
    } catch { return ''; }
  };

  const openInfo = (info) => {
    setInfoHistory((h) => (selectedInfo ? [...h, selectedInfo] : h));
    setSelectedInfo(info);
  };
  const goBackInfo = () => {
    setInfoHistory((h) => {
      if (!h.length) { setSelectedInfo(null); return h; }
      setSelectedInfo(h[h.length - 1]);
      return h.slice(0, -1);
    });
  };

  // EZ readings save into the same table as every other reading, so reload is a filtered
  // query and four pieces of state — no separate save/load path was ever built.
  const loadPastList = async () => {
    try {
      const { data, error: ge } = await getReadings(120); // .589: 120, not 50 — the full reader's rows were crowding EZ's out of the window
      if (ge) throw new Error(typeof ge === 'string' ? ge : ge.message || 'query failed');
      setPastReadings((data || []).filter((r) => r.mode === 'ez'));
      setShowPast(true);
    } catch (e) { setError(`Could not load your readings: ${e?.message || 'unknown'}`); }
  };

  // /ez?bench=1 — THE LAYOUT BENCH: a fixed draw and a canned conversation, no API, nothing saved
  useEffect(() => {
    if (!allowed || !user || draws) return;
    let on = false;
    try { on = new URLSearchParams(window.location.search).get('bench') === '1'; } catch {}
    if (!on) return;
    setBench(true);
    setDraws([BENCH_DRAW]); setQuestion(BENCH_QUESTION); setAsked(BENCH_QUESTION); setSavedId(null);
    const now = Date.now();
    const opening = readerTurn(BENCH_OPENING);
    setTurns([
      { ...opening, id: 'b1', ts: now },
      { id: 'b2', role: 'you', text: 'Help me find which thing this actually is.', mode: null, ts: now + 1 },
      { ...readerTurn(BENCH_FUNNEL), id: 'b3', locating: { what: 'the thing that is already done', step: 1 }, ts: now + 2 },
      { id: 'b4', role: 'you', text: "Honestly, the role. I keep showing up out of habit.", mode: null, ts: now + 3 },
      { ...readerTurn({ ...BENCH_TALK, located: 'the role I keep showing up for out of habit', medicine: 'Start one small thing in the same space this week — a first message, a first page — and the role lets go of you.' }), id: 'b5', locating: { what: 'the thing that is already done', step: 2 }, ts: now + 4 },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, user]);

  // /ez?load=<id> — arriving from the journal or the main reader's redirect
  useEffect(() => {
    if (!allowed || !user || draws) return;
    let id = null;
    try { id = new URLSearchParams(window.location.search).get('load'); } catch {}
    if (id) { openPast(id); try { window.history.replaceState(null, '', '/ez'); } catch {} }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, user]);
  const openPast = async (id) => {
    setLoading(true); setError('');
    try {
      const { data } = await getReading(id);
      const saved = data?.interpretation?.synthesis?._ez || data?.synthesis?._ez;
      setFrame(saved?.frame && frameOf(saved.frame.k) ? saved.frame : null); // .544
      const savedDraws = Array.isArray(data?.draws) ? data.draws : null;
      if (!saved?.turns?.length || !savedDraws) throw new Error('That reading has no conversation saved.');
      setQuestion(data.topic || data.question || '');
      setDraws(savedDraws.map((d) => ({ position: d.position, transient: d.transient, status: d.status })));
      setTurns(saved.turns);
      setSavedId(data.id);
      setShowPast(false); setDoor(null); setFieldMode(null);
      userContextRef.current = await loadHistory(savedDraws);
      scrollToEnd();
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const scrollToEnd = () => requestAnimationFrame(() => setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80));

  const spreadKeyFor = (n) => (n === 1 ? 'one' : n === 2 ? 'two' : n === 3 ? 'three' : n === 4 ? 'four' : 'five');

  // ---- the opening turn ----
  const begin = async () => {
    // A door with no added context is a complete question on its own — tap-and-draw must always
    // work. Added context, when there is any, IS the question; the door only frames it.
    const typed = sanitizeForAPI(question.trim());
    const q = typed || (door ? sanitizeForAPI(door.breath) : '') || (frame ? sanitizeForAPI(`A reading about ${frameLabel(frame)}.`) : ''); // .546: a frame alone is a complete ask, like a door
    if (!q) { if (!wordless) { setWordless(true); return; } setWordless(false); }
    const frameInForce = frame || (!typed && !door ? { k: 'now', detail: '' } : null); // .628: a wordless ask is a reading of now, and every later turn carries that frame
    if (!frame && frameInForce) setFrame(frameInForce);
    setAsked(q);
    if (voiceOut) { stopVoice(); unlockAudio(); warmVoice(); } // THE VOICE: inside the tap, before any await
    setError(''); setLoading(true); setTurns([]); setSavedId(null); setFieldMode(null); setResolution(null); setAreasOpen(false); setSuggestOpen(false); sayNarration('reading-your-now'); // .647 the narrator; .654 'The Nirmanakaya Reader is reading your now.' // .516: the Unsure and Another folds close when a reading starts or resets
    const newDraws = generateSpread(cardCount);
    setDraws(newDraws);
    // one card only, for now; the answer never waits on the motion by more than the last flight
    const willAnimate = animOn && cardCount === 1;
    let landed = Promise.resolve();
    if (willAnimate) {
      try { window.scrollTo({ top: 0, behavior: 'instant' }); } catch {}
      // the map starts just under the tagline ("THE SOUL SEARCH ENGINE"), not over it
      const brand = document.querySelector('[data-slot="tagline"]') || document.querySelector('[data-slot="wordmark"]')?.parentElement;
      setOverlayTop(brand ? Math.max(0, Math.round(brand.getBoundingClientRect().bottom + 6)) : 0);
      readyRef.current = false; setReplyReady(false);
      setOverlayIn(false); setRevealed(false); setAnimating(true);
      landed = playLanding(newDraws[0]).catch(() => {});
      landed.then(() => { if (!readyRef.current) setLandedWaiting(true); });
    }
    try {
      const sk = spreadKeyFor(cardCount);
      const drawText = fmtDraw(newDraws, 'discover', sk, false, null, null, null, true, q); // 2026-10-04: the question reaches the record's FIELD line
      const history = await loadHistory(newDraws);
      userContextRef.current = history;
      const ctx = history ? `${history}\n\n` : '';
      const doorBlock = door
        ? `\n\nTHE DOOR THEY CAME THROUGH: ${door.label} — "${door.breath}" (the ${door.house} house)${door.viaDaily ? ' — CHOSEN FOR THEM AT RANDOM as a daily reading; they brought no question of their own.' : ''}. This is where they located themselves before any signature was drawn. Let it frame what you attend to; it is not a verdict, and the signatures still say what they say.`
        : '';
      const seed = seedFor(newDraws[0], q, newDraws, []); // .530: the geometry + teleology of this draw, after the record
      const tele = seed.block;
      const msg = buildOpeningMessage({ ctx, question: q, doorBlock, frame: frameInForce, drawText, tele }); // 2026-10-04 ONE READER: the same composition the API uses (lib/ezOpening.js)
      let { obj, usage: u } = await callReader(msg, undefined, undefined, { turn: 'opening' }); // .674: the opening names itself so the empty-medicine guard fires here and nowhere else (the floor hook and the route branch only on 'talk')
      let fr = frame; // .569: the frame in force for this reading — chosen by the person, or named by the Reader just now
      if (!fr) { const named = pickFrame(obj?.frame); if (named) { fr = named; setFrame(named); setFrameDetail(named.detail || ''); } }
      { const mm = medicineMismatch(obj, newDraws[0]); if (mm) { console.warn('[medicine check] opening named', mm.got, 'wanted', mm.want, '— retrying'); const r2 = await callReader(`${msg}${medicineRetryNote(mm)}`, undefined, undefined, { turn: 'opening' }); if (r2?.obj?.reader) { obj = r2.obj; u = r2.usage || u; } } } // .557
      let openingNotes = [];
      { const rv = reviewTurn({ obj, register: voice, prev: [], cardBalanced: newDraws[0]?.status === 1, isOpening: true }); // .560
        if (rv.hard.length) { console.warn('[house] opening hard:', rv.hard); const r3 = await callReader(`${msg}${retryNote(rv.hard)}`, undefined, undefined, { turn: 'opening' }); if (r3?.obj?.reader) { obj = r3.obj; u = r3.usage || u; } }
        openingNotes = rv.soft; if (rv.soft.length) console.warn('[house] opening notes:', rv.soft); }
      const first = readerTurn(obj, { voice, ...(seed.lines ? { geometry: seed.lines } : {}), ...(openingNotes.length ? { notes: openingNotes } : {}) }); // .589: stamped with its voice
      setTurns([first]);
      if (voiceOut) landed.then(() => speakTurn(first)); // THE VOICE: the opening, spoken once the card has LANDED (.642 — founder: "wait to start the voice until everything lands"); with no animation, landed is already resolved
      readyRef.current = true; setReplyReady(true); setLandedWaiting(false);
      if (skipRef.current) skipRef.current.hurry = true; // .549: the reading is ready — hurry the flight along
      try {
        const { data } = await saveReading({
          question: q, cards: newDraws, letter: null,
          synthesis: { _ez: { version: EZ_VERSION, turns: [first], voice, ...(fr ? { frame: fr } : {}) } },
          mode: 'ez', spreadType: door ? `ez-${sk}-${door.id}` : `ez-${sk}`, model: 'sonnet', tokenUsage: u, voice: 'friend'
        });
        if (data?.id) setSavedId(data.id);
        try { sessionStorage.removeItem(`nkya_ez_suggest_${user?.id}`); } catch {} // .591: the history changed
      } catch {}
      if (!willAnimate) scrollToEnd();
    } catch (e) { setError(e.message); readyRef.current = true; setReplyReady(true); setLandedWaiting(false); }
    await landed;
    setLandedWaiting(false);
    if (willAnimate) {
      // the page comes back under the landed cards: header and discourse fade in, the map fades
      // out, and only then do the clones go — the real header sits exactly beneath them
      setRevealed(true);
      setOverlayIn(false);
      await new Promise(r => setTimeout(r, 700));
      clearLanding(document);
      setAnimating(false);
    } else {
      setRevealed(true);
    }
    setLoading(false);
  };

  // ---- every later turn; mode null = talk, 'reflect'/'forge' = a card is drawn ----
  const send = async (textIn, modeIn, opts) => {
    const mode = modeIn !== undefined ? modeIn : fieldMode;
    const text = sanitizeForAPI((textIn ?? input).trim());
    if (!text || loading || !draws) return;
    if (voiceOut) { stopVoice(); unlockAudio(); warmVoice(); } // THE VOICE
    // FIND IT: a tapped locate chip opens the funnel; a plain talking turn while it is open
    // continues it (up to three rounds, or until the Reader reports the thing located).
    let loc = null;
    const claimed = !!opts?.claim; // they are naming it themselves, or calling it close enough
    if (opts?.locate) {
      // .539: a locate chip asks the FIELD (mode 'locate' draws a locating card); 'point again' continues the count
      const lr = [...turns].reverse().find((t) => t.role === 'reader');
      loc = { what: opts.locate, step: (mode === 'locate' && lr?.locating && !lr.located && lr.locating.what === opts.locate) ? lr.locating.step + 1 : 1 };
    }
    else if (!mode) {
      const lr = [...turns].reverse().find((t) => t.role === 'reader');
      if (lr?.locating && !lr.located && (claimed || lr.locating.step < (lr.locating.balanced ? 2 : 3))) loc = { what: lr.locating.what, step: lr.locating.step + 1 };
    }
    setError(''); setLoading(true); setInput(''); sayNarration(STAGE.writing[1]); // .647
    const newDraw = mode ? generateSpread(1)[0] : null;
    const you = { id: `y${Date.now()}`, role: 'you', text, mode: mode || null, move: opts?.move?.kind || null, ts: Date.now() };
    const withYou = [...turns, you];
    setFieldMode(null);
    // any new turn folds the panels (founder, 2026-09-17: "I'd rather have it minimized"); their answers
    // are kept for the same card, so reopening is free
    setBrazierOpen(false); setStepOpen(false); setDragonOpen(false);
    // THE NEW CARD LANDS IN ITS OWN TURN (founder, 2026-09-16, an experiment): a reflect or
    // forge draws its card at once, a pending reader turn holding only the stacked card is
    // added, the page is scrolled so that card sits just under the brand — where the header
    // sits for the opening — and the same landing flies the card into it while the reply is
    // fetched. The words arrive underneath when the Reader answers.
    const willAnimate = !!newDraw && animOn;
    const pid = `t${Date.now()}p`;
    const repliedRef = { current: false };
    let landed = Promise.resolve();
    if (willAnimate) {
      setAnimPending(true);
      setTurns([...withYou, { id: pid, role: 'reader', pending: true, draw: newDraw, mode, text: '', chips: [], reflect: [], forge: [], ts: Date.now() }]);
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      try {
        const brand = document.querySelector('[data-slot="tagline"]') || document.querySelector('[data-slot="wordmark"]')?.parentElement;
        const top = Math.max(16, brand ? brand.getBoundingClientRect().bottom + 6 : 0);
        const el = document.querySelector(`[data-ez-turn="${pid}"]`);
        if (el) window.scrollBy({ top: el.getBoundingClientRect().top - top - 8, behavior: 'instant' });
        setOverlayTop(Math.max(0, Math.round(top)));
      } catch {}
      // the page beneath fades away for the flight, as it does for the opening (the founder
      // saw the conversation and the buttons showing through the map)
      setRevealed(false);
      setOverlayIn(false); setAnimating(true);
      landed = playLanding(newDraw, `[data-ez-turn="${pid}"]`, false);
      landed.then(() => { if (!repliedRef.current) setLandedWaiting(true); });
    } else {
      setTurns(withYou);
      scrollToEnd();
    }
    try {
      const drawText = fmtDraw(draws, 'discover', spreadKeyFor(draws.length), false, null, null, null, false); // names only here; the card in play carries its record below
      const ctx = userContextRef.current ? `${userContextRef.current}\n\n` : '';
      const fieldNow = [...withYou].reverse().find((t) => t.role === 'reader' && t.draw && t.mode !== 'locate')?.draw || null; // .539: a locating card is a pointer, never the card in play
      const newCardBlock = (newDraw && mode === 'locate')
        ? `\n\nTHE FIELD WAS ASKED WHERE IT IS, AND DREW:\n${drawBrief(newDraw)}${(() => { const s = seedFor(newDraw, question, draws, [...withYou, { draw: newDraw }], true); return s.block ? `\n${s.block}` : ''; })()}`
        : newDraw
        ? `\n\nA NEW SIGNATURE WAS DRAWN IN RESPONSE:\n${drawBrief(newDraw)}${(() => { const s = seedFor(newDraw, question, draws, [...withYou, { draw: newDraw }]); return s.block ? `\n${s.block}` : ''; })()}\nInterpret it as the field's answer to what they just ${mode === 'reflect' ? 'asked' : 'declared'}, in relation to the reading already on the table. THIS SIGNATURE'S MEDICINE LEADS NOW. The opening draw's medicine is at most secondary from here; do not call it the way through. Fill "medicine" from THIS signature's Rebalancer and mechanism, and administer it — its signature's own meaning must be in your words.`
        : `\n\nTHE SIGNATURE IN PLAY (its medicine governs this turn):\n${drawBrief(fieldNow || draws[0])}`;
      if (loc) loc.balanced = (fieldNow || draws[0])?.status === 1; // Balanced → the invitation only needs an address
      // .558: a BALANCED card in play is never read as a gap (the founder, on Balanced Formation: "why do you keep leaning on a gap?")
      const balancedLine = !newDraw && (fieldNow || draws[0])?.status === 1 ? `\n\nTHE SIGNATURE IN PLAY IS BALANCED. Nothing is missing and nothing is broken; do not find a gap, a floor that isn't there, a piece that "isn't online". The growth partner is an INVITATION — what this balance is free to feed next — and it is offered as one, never as a deficiency; if they push back that things are fine, they are right, and you say so without defending a gap you named.` : '';
      // .563: the pointer's distance from the card they asked about, and from any earlier pointer (does the field agree, or scatter?)
      const pointerDistances = (newDraw && mode === 'locate') ? [
        distanceLine(newDraw, fieldNow || draws[0]),
        ...withYou.filter((t) => t.role === 'reader' && t.draw && t.mode === 'locate').slice(-2).map((t) => distanceLine(newDraw, t.draw, 'the earlier pointer')),
      ].filter(Boolean).join('\n') : '';
      const findBlock = (loc && mode === 'locate') ? locatingBlock(loc, drawBrief(fieldNow || draws[0]), `${addressBlock(newDraw)}${pointerDistances ? `\n${pointerDistances}` : ''}`, claimed) : loc ? `${locateBlock(loc, drawBrief(fieldNow || draws[0]))}${claimed ? '\n\nTHEIR LATEST TURN IS THEM NAMING IT THEMSELVES. The search ends here on their word. Take it as the thing, confirm it against the signature in one line, fill "located" with it in their words, and land the medicine on it — a specific, ordinary first move. Do not ask for more detail and do not tell them it is not specific enough.' : ''}` : '';
      const traumaBlockLater = TRAUMA_RX.test(text) ? TRAUMA_BLOCK : '';
      const aiBlockLater = AI_RX.test(text) ? AI_BLOCK : '';
      const moveReg = opts?.move?.register || null; // .543: a reread in another voice
      const moveBlock = opts?.move ? `\n\n${moveReg ? voiceMoveRule(moveReg, REGISTER_LINE[moveReg], opts.move.srcMedicine) : MOVE_RULES[opts.move.kind]}\nTHE REGISTER IN FORCE: ${VOICE_NOTES[moveReg || voice]?.[0] || moveReg || voice}.\n\nTHE TURN THEY MEAN:\n${opts.move.src}` : '';
      const msg = `${ctx}QUESTION: "${sanitizeForAPI(question)}"${frameBlock(frame)}\n\nTHE ORIGINAL DRAW (unchanged):\n${drawText}\n\nTHE DISCOURSE SO FAR, in order:\n${discourseBlock(withYou)}${newCardBlock}${findBlock}${brazierBlock()}${balancedLine}${opts?.move ? '' : notesBlock([...withYou].reverse().find((t) => t.role === 'reader' && t.notes)?.notes)}${moveBlock}${traumaBlockLater}${aiBlockLater}${opts?.move ? '' : HUNCH_LINE}\n\nRespond to the asker's latest turn. Follow EZ MODE (a later turn). JSON only.`;
      let { obj } = await callReader(msg, moveReg ? ezSystem(promptBase, moveReg, promptOver) : systemPrompt, moveReg ? ((moveReg === 'deep' || moveReg === 'mystical') ? 2400 : 1500) : undefined, { turn: newDraw ? 'card' : 'talk', ...(moveReg ? { register: moveReg } : {}) }); // .507 lane; .543 a reread rides its own register
      if (newDraw && mode === 'locate') { // .561: a locating turn's medicine, if any, must be the ORIGINAL card's — never the pointer's
        const mm = medicineMismatch(obj, fieldNow || draws[0]);
        if (mm) { console.warn('[medicine check] locating turn named', mm.got, 'wanted', mm.want, '(the original signature) — retrying'); const r2 = await callReader(`${msg}\n\nYOUR TURN NAMED "${mm.got}" AS THE MEDICINE. The locating signature is a POINTER and has no medicine here; the only medicine in this reading is the ORIGINAL signature's, ${mm.want}, and it lands only once the thing is found. Rewrite the turn: candidates and the one question; "medicine" and "medicineCard" empty unless found — and if found, ${mm.want}. JSON only.`, systemPrompt, undefined, { turn: 'card' }); if (r2?.obj?.reader) obj = r2.obj; }
      }
      if (newDraw && mode !== 'locate') { const mm = medicineMismatch(obj, newDraw); if (mm) { console.warn('[medicine check] new signature named', mm.got, 'wanted', mm.want, '— retrying'); const r2 = await callReader(`${msg}${medicineRetryNote(mm)}`, systemPrompt, undefined, { turn: 'card' }); if (r2?.obj?.reader) obj = r2.obj; } } // .557
      let turnNotes = [];
      if (!moveReg) { const rv = reviewTurn({ obj, register: voice, prev: withYou.filter((t) => t.role === 'reader'), cardBalanced: (newDraw || fieldNow || draws[0])?.status === 1, isOpening: false }); // .560
        if (rv.hard.length) { console.warn('[house] hard:', rv.hard); const r3 = await callReader(`${msg}${retryNote(rv.hard)}`, systemPrompt, undefined, { turn: newDraw ? 'card' : 'talk' }); if (r3?.obj?.reader) obj = r3.obj; }
        turnNotes = rv.soft; if (rv.soft.length) console.warn('[house] notes:', rv.soft); }
      repliedRef.current = true; setLandedWaiting(false); if (skipRef.current) skipRef.current.hurry = true; // .549
      const newSeedLines = newDraw ? seedFor(newDraw, question, draws, [...withYou, { draw: newDraw }]).lines : '';
      const turn = readerTurn(obj, { ...(newDraw ? { draw: newDraw, mode } : {}), ...(loc ? { locating: loc } : {}), ...(newSeedLines ? { geometry: newSeedLines } : {}), voice: moveReg || voice, ...(turnNotes.length ? { notes: turnNotes } : {}) });
      // .558: MEDICINE ONCE, MECHANICALLY. A talking turn's medicine that repeats the last one (word for word, or reworded
      // and sharing most of its real words) is dropped — from the screen AND from the record the next turn reads, so the
      // repeat never teaches by example (the founder's money reading: the same ◈ box three times running).
      if (!newDraw && turn.medicine) {
        const prev = [...withYou].reverse().find((t) => t.role === 'reader' && t.medicine)?.medicine || '';
        const words = (x) => new Set(String(x).toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter((w) => w.length >= 4));
        const A = words(turn.medicine), B = words(prev);
        let shared = 0; for (const w of A) if (B.has(w)) shared++;
        if (prev && A.size >= 4 && B.size >= 4 && shared / Math.min(A.size, B.size) >= 0.6) turn.medicine = '';
      } // .543: the reread is stamped with its own register
      if (willAnimate) {
        // the words arrive under the landed card; the same id keeps the card's element in place
        await landed;
        setTurns((list) => list.map((x) => (x.id === pid ? { ...turn, id: pid } : x)));
        if (voiceOut) speakTurn({ ...turn, id: pid }); // THE VOICE
        setRevealed(true);
        setOverlayIn(false);
        await new Promise(r => setTimeout(r, 700));
        clearLanding(document);
        setAnimating(false); setAnimPending(false);
      } else {
        setTurns((list) => [...list, turn]);
        if (voiceOut) speakTurn(turn); // THE VOICE
        scrollToEnd();
      }
    } catch (e) {
      // Take the orphaned turn back out and hand the person their words again, so a failure
      // costs a tap instead of a thought.
      repliedRef.current = true; setLandedWaiting(false); if (skipRef.current) skipRef.current.hurry = true; // .549 setAnimPending(false);
      if (willAnimate) { if (skipRef.current) skipRef.current.skip = true; setRevealed(true); setOverlayIn(false); clearLanding(document); setAnimating(false); }
      setTurns((list) => list.filter((x) => x.id !== you.id && x.id !== pid));
      setInput(text);
      setFieldMode(mode || null);
      setError(e.message);
    }
    setLoading(false);
  };

  // ---- the do-something button: one small real act, no draw, no question ----
  const fieldCard = () => [...turns].reverse().find((t) => t.role === 'reader' && t.draw && t.mode !== 'locate')?.draw || draws?.[0] || null; // .539: never a locating card
  const actLineNow = () => { const t = [...turns].reverse().find((x) => x.role === 'reader' && x.actLine); return t?.actLine || ''; };
  // ONE SMALL STEP — a panel like the Brazier (founder, 2026-09-16 night): collapsed by default,
  // opening it fetches ONE act for the card in play and shows it inside; nothing enters the
  // transcript. The Reader is told what was handed over (see brazierBlock) so the pills know.
  const [stepOpen, setStepOpen] = useState(false);
  // .698 (founder): the open doors sit in the ORDER THEY WERE OPENED (was: a fixed row order with one "first"); and Go deeper's three floors are
  // DEDICATED PANELS of their own, in that same order — the Go deeper door is the selector, and stays the selector
  const [openOrder, setOpenOrder] = useState([]);
  const markOpen = (kind, on) => setOpenOrder((o) => (on ? (o.includes(kind) ? o : [...o, kind]) : o.filter((k) => k !== kind)));
  const openFloor = (f) => { if (!f || f === 'whys') return; setFloorsOpened((list) => (list.includes(f) ? list : [...list, f])); markOpen(`floor-${f}`, true); showPanels(`floor-${f}`); sayLabel(FLOOR_LABEL[f].replace(/\s+/g, '-')); if (!brazier[f] && !brazierBusy) fetchFloor(f); };
  const closeFloor = (f) => { setFloorsOpened((list) => list.filter((x) => x !== f)); markOpen(`floor-${f}`, false); };
  const [stepText, setStepText] = useState('');
  const [stepBusy, setStepBusy] = useState(false);
  const stepKeyRef = useRef('');
  const fetchStep = async () => {
    const card = fieldCard(); if (!card || stepBusy) return;
    const k = buildKernel(card, DEFS);
    const line = actLineNow() || `What is one small real thing I can do about this in the next minute?`;
    setStepBusy(true); setError(''); sayNarration(STAGE.step[1]); // .647
    try {
      const drawText = fmtDraw(draws, 'discover', spreadKeyFor(draws.length), false, null, null, null);
      const asked = `${discourseBlock(turns)}\n\nASKER (asks for one small thing to do): "${line}"`;
      const tele = seedFor(card, question).block; // .530: the seed for the card in play
      const msg = `QUESTION: "${sanitizeForAPI(question)}"${frameBlock(frame)}\n\nTHE ORIGINAL DRAW (unchanged):\n${drawText}\n\nTHE DISCOURSE SO FAR, in order:\n${asked}\n\nTHE SIGNATURE IN PLAY:\n${drawBrief(card)}${tele ? `\n\n${tele}` : ''}${doSomethingBlock(k)}`;
      const { obj } = await callReader(msg, systemPrompt, 500);
      setStepText(String(obj.reader || '').trim());
      if (voiceOut) speakTurn({ id: 'step', text: String(obj.reader || '').trim() }); // THE VOICE (.611; .625 the heading, then a beat)
      // no pill regen here (.446): the next real turn already receives the step via brazierBlock; the regen was a second full call per door
      stepKeyRef.current = `${card.transient}:${card.position}:${card.status}`;
    } catch (e) { setError(e.message); }
    setStepBusy(false);
  };
  const toggleStep = () => {
    const next = !stepOpen; if (next && voiceOut) { warmVoice(); } // THE VOICE (.611; .644 the tap says its name)
    setStepOpen(next); markOpen('step', next);
    if (next) {
      showPanels('step');
      const card = fieldCard();
      const key = card ? `${card.transient}:${card.position}:${card.status}` : '';
      if (key !== stepKeyRef.current || !stepText) { setStepText(''); fetchStep(); }
    }
  };

  // ---- FACE THE DRAGON: the fierce door, beside the step ----
  // THE MEDICINE, TAKEN (.538) — a panel like the step: collapsed by default; opening it fetches the course for the
  // card in play. Follows the register (the REGISTER line rides on the main system prompt).
  const [voicePickFor, setVoicePickFor] = useState(null); // .543: which turn's 'voice' row is open
  const [folded, setFolded] = useState(() => new Set()); // .555: reader turns whose body is folded under the gist
  const toggleFold = (id) => setFolded((f) => { const n = new Set(f); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const [medOpen, setMedOpen] = useState(false);
  const [medText, setMedText] = useState('');
  const [medBusy, setMedBusy] = useState(false);
  const medKeyRef = useRef('');
  const fetchMedicine = async () => {
    const card = fieldCard(); if (!card || medBusy) return;
    const k = buildKernel(card, DEFS);
    setMedBusy(true); setError(''); sayNarration(STAGE.medicine[1]); // .647
    try {
      const drawText = fmtDraw(draws, 'discover', spreadKeyFor(draws.length), false, null, null, null);
      const asked = `${discourseBlock(turns)}\n\nASKER (asks to understand the medicine — what it is, why, and how to take it): "Help me understand the way through — what it actually is, why it is the medicine for this, and how I take it."`;
      const tele = seedFor(card, question).block;
      const msg = `QUESTION: "${sanitizeForAPI(question)}"${frameBlock(frame)}\n\nTHE ORIGINAL DRAW (unchanged):\n${drawText}\n\nTHE DISCOURSE SO FAR, in order:\n${asked}\n\nTHE SIGNATURE IN PLAY:\n${drawBrief(card)}${tele ? `\n\n${tele}` : ''}${medicineBlock(k)}`;
      const { obj } = await callReader(msg, systemPrompt, 900);
      setMedText(String(obj.reader || '').trim());
      if (voiceOut) speakTurn({ id: 'medicine', text: String(obj.reader || '').trim() }); // THE VOICE (.611; .625 the heading, then a beat)
      medKeyRef.current = `${card.transient}:${card.position}:${card.status}`;
    } catch (e) { setError(e.message); }
    setMedBusy(false);
  };
  const toggleMedicine = () => {
    const next = !medOpen; if (next && voiceOut) { warmVoice(); } // THE VOICE (.611; .644)
    setMedOpen(next); markOpen('medicine', next);
    if (next) {
      showPanels('medicine');
      const card = fieldCard();
      const key = card ? `${card.transient}:${card.position}:${card.status}` : '';
      if (key !== medKeyRef.current || !medText) { setMedText(''); fetchMedicine(); }
    }
  };

  const [dragonOpen, setDragonOpen] = useState(false);
  const [dragonText, setDragonText] = useState('');
  const [dragonBusy, setDragonBusy] = useState(false);
  const dragonKeyRef = useRef('');
  const fetchDragon = async () => {
    const card = fieldCard(); if (!card || dragonBusy) return;
    const k = buildKernel(card, DEFS);
    setDragonBusy(true); setError(''); sayNarration(STAGE.naming[1]); // .647
    try {
      const drawText = fmtDraw(draws, 'discover', spreadKeyFor(draws.length), false, null, null, null);
      const asked = `${discourseBlock(turns)}\n\nASKER (asks to face the dragon — the thing itself, said straight): "What is the thing I've been walking around, or the thing in front of me I haven't picked up?"`;
      const tele = seedFor(card, question).block; // .530: the seed for the card in play
      const msg = `QUESTION: "${sanitizeForAPI(question)}"${frameBlock(frame)}\n\nTHE ORIGINAL DRAW (unchanged):\n${drawText}\n\nTHE DISCOURSE SO FAR, in order:\n${asked}\n\nTHE SIGNATURE IN PLAY:\n${drawBrief(card)}${tele ? `\n\n${tele}` : ''}${dragonBlock(k)}`;
      // the eight exemplars ride in the SYSTEM prompt so they are cached (.448: the ledger showed the
      // dragon's message at 4,040 fresh tokens, double any floor, because they rode in the message)
      const { obj } = await callReader(msg, `${systemPrompt}

${DRAGON_STANDARD}`, 600);
      setDragonText(String(obj.reader || '').trim());
      if (voiceOut) speakTurn({ id: 'dragon', text: String(obj.reader || '').trim() }); // THE VOICE (.611; .625 the heading, then a beat)
      // no pill regen here (.446): the next real turn already receives the dragon via brazierBlock
      dragonKeyRef.current = `${card.transient}:${card.position}:${card.status}`;
    } catch (e) { setError(e.message); }
    setDragonBusy(false);
  };
  const toggleDragon = () => {
    const next = !dragonOpen; if (next && voiceOut) { warmVoice(); } // THE VOICE (.611; .644)
    setDragonOpen(next); markOpen('dragon', next);
    if (next) {
      showPanels('dragon');
      const card = fieldCard();
      const key = card ? `${card.transient}:${card.position}:${card.status}` : '';
      if (key !== dragonKeyRef.current || !dragonText) { setDragonText(''); fetchDragon(); }
    }
  };

  // ---- THE BRAZIER: "why is this happening?" — beside the conversation, not in it ----
  const [brazierOpen, setBrazierOpen] = useState(false);
  const [brazier, setBrazier] = useState({});          // { [ring]: text }
  // WHAT THEY HAVE READ ABOUT WHY — handed to the Reader as background (founder, 2026-09-16
  // night), so the next turn and its pills build on where the person's understanding actually
  // is instead of repeating the tense line back to them. Background, never subject; never quoted.
  const brazierBlock = (over = {}) => {
    const rings = over.rings || brazier;
    const st = over.step !== undefined ? over.step : stepText;
    const dr = over.dragon !== undefined ? over.dragon : dragonText;
    const md = over.medicineTaken !== undefined ? over.medicineTaken : medText;
    const read = [1, 'meaning', 'moon', 'mechanism'].filter((r) => rings[r]);
    // .699 (founder): every block below is the READER'S OWN earlier writing — labelled so, because the Reader handed its step back as "you said"
    const step = (md ? `\n\nTHE MEDICINE COURSE YOU WROTE FOR THEM (YOUR words, not theirs — they opened "the medicine" and read it; it is part of the conversation now: build on it, never repeat it, never hand them a second medicine, never quote it back as something they said):\n${md}` : '')
      + (st ? `\n\nTHE ONE SMALL STEP YOU HANDED THEM (YOUR words, not theirs — they opened "one small step"; background — do not repeat it, do not turn it into homework, never attribute it to them, build on it only if they bring it up):\n${st}` : '')
      + (dr ? `\n\nTHE DRAGON YOU NAMED FOR THEM (YOUR words, not theirs — they tapped "face the dragon" and read this; it is part of the conversation now — you may build on it and refer to it as yours; never repeat it, never soften it back, never pile on):\n${dr}` : '');
    if (!read.length) return step;
    // Opened floors ENTER THE CONVERSATION (founder's ruling 2026-09-19: "it's an ongoing
    // conversation") — the Reader may build on them and refer to them; it just never repeats them.
    return `${step}\n\nWHAT YOU WROTE IN "WORDS TO THE WHYS" (YOUR words, not theirs — they opened these; they are part of the conversation now, so build on them and refer to what they say where it helps — but never repeat them back, never attribute them to the person, and never make the tense line the topic):\n${read.map((r) => `${r === 1 ? 'WHY THIS IS HAPPENING' : String(r).toUpperCase()}:\n${rings[r]}`).join('\n\n')}`;
  };
  const [floorsOpened, setFloorsOpened] = useState([]); // which lanterns they have opened, in order
  const [deepTab, setDeepTab] = useState('whys'); // .661 (Keel §11): which of Go deeper's four peers is showing
  const [brazierBusy, setBrazierBusy] = useState(0);   // the ring being fetched, or 0
  const [brazierGlow, setBrazierGlow] = useState(false);
  const brazierKeyRef = useRef('');
  // ONE FETCH FOR RING 1 AND THE THREE FLOORS. Ring 1 is keyed to the card (why this is
  // happening); a floor deepens the latest TURN, so it is handed the Reader's newest words and
  // never changes the subject. Each floor stands alone (the founder's bypass ruling: the moon
  // cannot assume the meaning was read), so only ring 1 is passed as already-seen.
  const fetchFloor = async (floor) => {
    const card = fieldCard(); if (!card || brazierBusy) return;
    if (voiceOut) { warmVoice(); } // THE VOICE (.616; .644 the floor says its name)
    const key = `${card.transient}:${card.position}:${card.status}`;
    if (brazierKeyRef.current !== key) { brazierKeyRef.current = key; setBrazier({}); setFloorsOpened([]); }
    setBrazierBusy(floor); setError(''); sayNarration((STAGE[floor] || STAGE.writing)[1]); // .647; .661 the floor's own line
    try {
      const k = buildKernel(card, DEFS);
      // the Brazier is the Why derivation in kitchen clothes (Keel's spec §1.2): it gets the kernel,
      // the whole record, and the same teleology block the advanced Why works from
      const tele = seedFor(card, question).block; // .530: the seed for the card in play
      const lastTurn = [...turns].reverse().find((t) => t.role === 'reader');
      const turnBlock = (floor !== 1 && lastTurn?.text) ? `\n\nTHE TURN TO DEEPEN (the Reader's latest words to them — deepen THIS, never change the subject):\n${lastTurn.text}${lastTurn.medicine ? `\n\n${lastTurn.medicine}` : ''}` : '';
      const ring1 = (floor !== 1 && brazier[1]) ? `\n\nWHY THIS IS HAPPENING, already shown to them (do not repeat it):\n${brazier[1]}` : '';
      const ask = floor === 1 ? 'Write ring 1. JSON only.' : `Write the ${floor} floor. JSON only.`;
      const msg = `THE PERSON'S QUESTION: "${sanitizeForAPI(asked || question)}"\n\n${kernelBlock(k)}\n\n${drawRecord(card, DEFS)}${tele ? `\n\n${tele}` : ''}${turnBlock}${ring1}\n\n${ask}`;
      let data = await rawCall(msg, brazierSystem(floor, voice), floor === 1 ? 500 : 1000); // floors 800→1000 with the band (.469); .700 the voice in force reaches the floors
      let obj = parseJson(data.reading);
      if (!obj?.text) { data = await rawCall(`${msg}\n\nYOUR LAST REPLY WAS NOT VALID JSON. Send ONE JSON object and nothing else.`, brazierSystem(floor, voice), 800); obj = parseJson(data.reading); }
      if (!obj?.text) throw new Error('The brazier went out — try again.');
      // the word limits are hard (ring 1 is 90–135 per Keel's spec; the floors 170 / 170 / 240)
      // .448: a 15% overrun is accepted — the ledger showed the moon and the mechanism each
      // paying for a whole second call to trim ~40 words, and the mechanism's rewrite still ran
      // long. The mechanism (three paragraphs of derivation) gets a cap it can actually meet.
      const LIMIT = { 1: 135, meaning: 250, moon: 250, mechanism: 300 }[floor]; // meaning/moon 170→250 (.469)
      const words = (t) => String(t).split(/\s+/).filter(Boolean).length;
      if (words(obj.text) > LIMIT * 1.15) {
        data = await rawCall(`${msg}\n\nYOUR LAST RENDER WAS ${words(obj.text)} WORDS; THE HARD LIMIT IS ${LIMIT}. Rewrite it under the limit, same facts, same mechanism:\n${obj.text}`, brazierSystem(floor), 800);
        const again = parseJson(data.reading);
        if (again?.text && words(again.text) <= words(obj.text)) obj = again;
      }
      const next = { ...brazier, [floor]: obj.text.trim() };
      setBrazier(next);
      if (voiceOut) speakTurn({ id: `floor${floor}`, text: obj.text.trim() }); // THE VOICE (.616; .625 the heading, then a beat)
      if (floor !== 1) setFloorsOpened((f) => (f.includes(floor) ? f : [...f, floor]));
      // no pill regen here (.446): the next real turn already receives every opened floor via brazierBlock
    } catch (e) { setError(e.message); }
    setBrazierBusy(0);
  };
  const fetchRing = (r) => fetchFloor(r);
  // A NEW CARD IN PLAY (a reflect or a forge) RESETS BOTH PANELS: their answers belonged to the old
  // card (founder, 2026-09-17: they stayed open and stale until closed and reopened).
  const fieldKey = (() => { const c = [...turns].reverse().find((t) => t.role === 'reader' && t.draw && t.mode !== 'locate')?.draw || draws?.[0]; return c ? `${c.transient}:${c.position}:${c.status}` : ''; })();
  const fieldKeyRef = useRef(fieldKey);
  useEffect(() => {
    if (fieldKeyRef.current === fieldKey) return;
    fieldKeyRef.current = fieldKey;
    setBrazierOpen(false); setBrazier({}); setFloorsOpened([]); brazierKeyRef.current = '';
    setStepOpen(false); setStepText(''); stepKeyRef.current = '';
    setDragonOpen(false); setDragonText(''); dragonKeyRef.current = '';
    setMedOpen(false); setMedText(''); medKeyRef.current = '';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldKey]);
  // THE FLOORS DEEPEN THE LATEST TURN (Keel's requirements §1): when a new Reader turn lands, the
  // opened floors belonged to the old one and are cleared; ring 1 (why this is happening) stays,
  // since it is about the card and the card has not changed.
  const lastReaderId = [...turns].reverse().find((t) => t.role === 'reader')?.id || '';
  const floorKeyRef = useRef(lastReaderId);
  useEffect(() => {
    if (floorKeyRef.current === lastReaderId) return;
    floorKeyRef.current = lastReaderId;
    setBrazier((b) => (b[1] ? { 1: b[1] } : {}));
    setFloorsOpened([]);
  }, [lastReaderId]);
  const toggleBrazier = () => {
    const next = !brazierOpen;
    setBrazierOpen(next); markOpen('brazier', next);
    if (next) {
      setDeepTab('whys'); // .661: the first child is open by default — one tap shows content, not a menu
      showPanels('brazier');
      setBrazierGlow(true); setTimeout(() => setBrazierGlow(false), 900);
      const card = fieldCard();
      const key = card ? `${card.transient}:${card.position}:${card.status}` : '';
      if (key !== brazierKeyRef.current || !brazier[1]) fetchRing(1);
    }
  };

  // ---- other options: fresh pills for the latest turn ----
  // The founder, 2026-09-15: the build / push back / clarify pills (and the reflects and
  // forges) should be regenerable. One call rewrites all three sets for the last reader turn,
  // told what it already offered so it takes a different angle; the turn's text is untouched.
  const [claiming, setClaiming] = useState(false); // the person is naming the thing themselves
  const [regenning, setRegenning] = useState(false);
  const regenPills = async (over = {}) => {
    if (loading || regenning || !lastReader || !draws) return;
    setRegenning(true); setError(''); sayNarration(STAGE.choices[1]); // .647
    try {
      const drawText = fmtDraw(draws, 'discover', spreadKeyFor(draws.length), false, null, null, null);
      const prior = lastReader.pillsSeen || { chips: lastReader.chips || [], reflect: lastReader.reflect || [], forge: lastReader.forge || [] };
      const seen = [...prior.chips.map((c) => c.text), ...prior.reflect, ...prior.forge].filter(Boolean);
      const msg = `QUESTION: "${sanitizeForAPI(question)}"${frameBlock(frame)}\n\nTHE ORIGINAL DRAW (unchanged):\n${drawText}\n\nTHE DISCOURSE SO FAR, in order:\n${discourseBlock(turns)}\n\n${brazierBlock(over)}\n\nOTHER OPTIONS. Do NOT write a new turn. For the reader's LATEST turn above, write a fresh set of chips (build, pushback, clarify, a stair if one is obvious, and a locate chip for anything the turn left unnamed — FIND IT), four reflects and four forges — the same rules as EZ MODE, from this exact moment. Take a DIFFERENT angle from these, which the person has already been offered and does not want:\n${seen.map((t) => `- ${t}`).join('\n')}\n\nRespond with ONLY JSON: {"reader": "", "question": "", "chips": [...], "reflect": [...], "forge": [...]}`;
      // callReader insists on a non-empty "reader"; this call has none, so it goes raw, with one retry
      let data = await rawCall(msg, systemPrompt, 900);
      let obj = parseJson(data.reading);
      if (!obj || !Array.isArray(obj.chips)) { data = await rawCall(`${msg}\n\nYOUR LAST REPLY WAS NOT VALID JSON. Send ONE JSON object and nothing else.`, systemPrompt, 900); obj = parseJson(data.reading); }
      if (!obj || !Array.isArray(obj.chips)) throw new Error('Could not read the new options — try again.');
      const fresh = readerTurn({ ...obj, reader: obj.reader || ' ' });
      setTurns((list) => list.map((t) => (t.id === lastReader.id
        ? { ...t, chips: fresh.chips.length ? fresh.chips : t.chips, reflect: fresh.reflect.length ? fresh.reflect : t.reflect, forge: fresh.forge.length ? fresh.forge : t.forge,
            pillsSeen: { chips: [...prior.chips, ...fresh.chips], reflect: [...prior.reflect, ...fresh.reflect], forge: [...prior.forge, ...fresh.forge] } }
        : t)));
    } catch (e) { setError(e.message); }
    setRegenning(false);
  };

  // ---- did it land? (.511) ----
  const markLanding = async (k) => {
    setResolution(k);
    if (!savedId) return;
    try {
      await updateReadingContent(savedId, { synthesis: { _ez: { version: EZ_VERSION, turns, voice, resolution: k, ...(frame ? { frame } : {}) } } });
      summarize(savedId, true); // the mark rides into the summary the suggester reads
    } catch {}
  };

  // ---- clarify / unpack / example (.500): a NEW turn about the one tapped; nothing is rewritten ----
  const move = async (turnId, kind, srcText) => { // .698 srcText: a panel's words (the dragon, the medicine, a floor) — the moves work on them too
    if (loading) return;
    const src = srcText != null ? { id: turnId, text: srcText, medicine: '' } : turns.find((t) => t.id === turnId);
    const reg = VOICE_REG(kind);
    if (!src || (!MOVE_RULES[kind] && !(reg && REGISTER_LINE[reg]))) return;
    await send(reg ? voiceMoveLabel(reg) : MOVE_LABEL[kind], null, { move: { kind, src: src.text, ...(reg ? { register: reg, srcMedicine: src.medicine || '' } : {}) } });
  };

  // ---- where am I ----
  const catchUp = async () => {
    if (loading || !draws || turns.length === 0) return;
    setLoading(true); setError(''); sayNarration(STAGE.writing[1]); // .647
    try {
      const msg = `QUESTION: "${sanitizeForAPI(question)}"\nTHE DRAW: ${draws.map(drawLabel).join(' · ')}\n\nTHE DISCOURSE SO FAR:\n${discourseBlock(turns)}\n\n${CATCHUP_RULES}`;
      const { obj } = await callReader(msg, `${BASE_SYSTEM}\n\n${CATCHUP_RULES}`, 400);
      { const ct = { id: `c${Date.now()}`, role: 'catchup', text: obj.reader, question: obj.question || '', chips: [], reflect: [], forge: [], ts: Date.now() }; setTurns((list) => [...list, ct]); if (voiceOut) speakTurn(ct); } // THE VOICE (.611)
      scrollToEnd();
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  // SUMMARIZE AND CLOSE (founder, 2026-09-17, from his sister's read: the conversation never ends).
  // The whole reading written up as one piece to keep, then a clean stop: come back any time, or
  // start a new reading. Nothing is locked — the box stays live under it.
  const closeUp = async () => {
    if (loading || !draws || turns.length === 0) return;
    setLoading(true); setError(''); setFieldMode(null); sayNarration(STAGE.writing[1]); // .647
    // .698 (founder: "Go deeper and face the dragon panels disappeared when I opened the wrap-it-up section — I can't get them back"): the wrap no longer closes the open doors
    try {
      const msg = `QUESTION: "${sanitizeForAPI(asked || question)}"\nTHE DRAW: ${draws.map(drawLabel).join(' ' + '\u00b7' + ' ')}\n\nTHE DISCOURSE SO FAR:\n${discourseBlock(turns)}${brazierBlock()}\n\n${CLOSING_RULES}`;
      const { obj } = await callReader(msg, `${BASE_SYSTEM}\n\n${CLOSING_RULES}`, 1000) // 700→1000 with the band (.469);
      { const wt = { id: `w${Date.now()}`, role: 'wrap', text: obj.reader, question: '', chips: [], reflect: [], forge: [], ts: Date.now() }; setTurns((list) => [...list, wt]); if (voiceOut) speakTurn(wt); } // THE VOICE (.611)
      scrollToEnd();
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  // EXPORT — the reading and the whole conversation as one markdown file, the way the full
  // reader exports (founder, 2026-09-16: "shift the export feature over").
  const exportMarkdown = () => {
    if (!draws) return;
    const L = [];
    L.push(`# Nirmanakaya — EZ reading`, ``, `**Asked:** ${question || (door ? door.breath : '')}`, `**When:** ${new Date().toLocaleString()}`, `**Voice:** ${VOICES[voice]?.label || voice}`, ...(frame ? [`**Topic:** ${frameLabel(frame)}${frame.auto ? ' (named by the Reader)' : ''}`] : []), ``);
    L.push(`## The draw`);
    draws.forEach((d) => {
      const m = medicineFor([d])[0];
      L.push(`- ${drawLabel(d)}${m ? ` — ${m.balanced ? 'grows toward' : 'corrected by'} ${m.to}${m.path ? ` (${m.path})` : ''}` : ''}`);
    });
    L.push(``, `## The conversation`, ``);
    let lastVoice = null; // .537: stamp the register on each reader turn where it changes
    turns.forEach((t) => {
      if (t.role === 'reader' && t.voice && t.voice !== lastVoice) { L.push(`*Voice: ${VOICES[t.voice]?.label || t.voice}*`, ``); lastVoice = t.voice; }
      if (t.role === 'you') { L.push(`**You${t.mode === 'reflect' ? ' (reflecting)' : t.mode === 'forge' ? ' (forging)' : t.mode === 'locate' ? ' (finding it — asking the field)' : t.move ? ` (${VOICE_REG(t.move) ? `asking to hear it in ${VOICE_LABELS[VOICE_REG(t.move)] || VOICE_REG(t.move)}` : t.move === 'example' ? 'asking for an example' : t.move === 'unpack' ? 'asking to unpack' : 'asking to clarify'})` : t.act ? ' (asking for one small thing)' : ''}:** ${t.text}`, ``); return; }
      if (t.role === 'catchup') { L.push(`*Catch me up:*`, ``, t.text, ``); return; }
      if (t.role === 'wrap') { L.push(`## The reading, written up`, ``, t.text, ``); return; }
      if (t.draw) L.push(t.mode === 'locate' ? `*A locating signature — the field points: ${drawLabel(t.draw)}*` : `*A new card: ${drawLabel(t.draw)}*`, ``);
      L.push(`**Reader:**`, ``, ...(t.gist ? [`*${t.gist}*`, ``] : []), t.text, ``);
      if (t.hunchFlag) L.push(`*(watch: this turn asserts something about your history — was it asked first?)*`, ``);
      if (Array.isArray(t.notes) && t.notes.length) L.push(`*(the house's notes on this turn: ${t.notes.join(' · ')})*`, ``);
      if (t.located) L.push(`*Found: ${t.located}*`, ``);
      if (t.medicine) L.push(`> ◈ ${t.medicine}`, ``);
      if (t.question) L.push(`*${t.question}*`, ``);
    });
    // the doors they opened — Words to the Whys (ring 1 + any floors), the dragon, the step
    if (brazier[1] || dragonText || stepText || medText) {
      L.push(`## The doors`, ``);
      if (brazier[1]) L.push(`**Words to the Whys — why this is happening:**`, ``, brazier[1], ``);
      floorsOpened.filter((f) => brazier[f]).forEach((f) => L.push(`**${FLOOR_LABEL[f]}:**`, ``, brazier[f], ``));
      if (dragonText) L.push(`**Face the dragon:**`, ``, dragonText, ``);
      if (medText) L.push(`**The medicine, taken:**`, ``, medText, ``);
      if (stepText) L.push(`**One small step:**`, ``, stepText, ``);
    }
    L.push(`---`, `*nirmanakaya.com/ez*`);
    const md = L.join('\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `nirmanakaya-ez-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const reset = () => {
    // .559: NEW QUESTION RESETS EVERYTHING — the founder hit it and found his old question still in the box and the About
    // fold open. The question, the box, the door, the frame and its fold, the folds, the panels, the error: all gone.
    setQuestion(''); setInput(''); setDoor(null); setFrame(null); setFrameOpen(false); setFrameDetail(''); setFrameEdit(false); setWordless(false); setError('');
    setBrazierOpen(false); setStepOpen(false); setDragonOpen(false); setMedOpen(false); setVoicePickFor(null); setClaiming(false);
    setDraws(null); setTurns([]); setSavedId(null); setFieldMode(null); setResolution(null); setAreasOpen(false); setSuggestOpen(false); // .516: the Unsure and Another folds close when a reading starts or resets setError(''); setDoor(null); setQuestion('');
    setUsage({ input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 });
    setLedger([]); setUsd(0); setVoiceSpend({ pieces: 0, chars: 0, secs: 0, usd: 0 });
  };

  // Sonnet list price: $3/M in, $15/M out; cache reads at 10%, cache writes at 125% of input.
  const estCost = usd; // summed per call by the model that answered (.473) — Sonnet and DeepSeek priced apart

  // The pills come from the last reader turn that CARRIES pills: an act turn ("one small thing")
  // goes quiet on purpose, but the conversation must still be continuable from where it was
  // (founder, 2026-09-16 night: "after selecting one small thing, the pills are all gone").
  const [recOpen, setRecOpen] = useState(null); // .662: the turn whose recommendations are revealed
  const [recDone, setRecDone] = useState(null); // .696: the turn whose recommendation has been chosen — the rest stop flashing
  recDoneRef.current = { recDone, setRecDone, recOpen };
  const revealNext = (t) => { // .662: Recommend — reveal the doors as buttons, and the Reader's voice says them
    if (recOpen === t.id) { setRecOpen(null); return; }
    sayLabel('recommend'); setRecOpen(t.id); setRecDone(null);
    if (voiceOut && Array.isArray(t.next) && t.next.length) speakTurn({ id: `${t.id}-next`, text: t.next.map((n) => `${NEXT_LABEL[n.panel] || n.panel}. ${n.why}`).join('\n\n') });
  };
  const openDoor = (t, p) => { // .662: a recommended door, opened — the same act as its own pill
    setRecDone(t.id); // .696: one chosen → the others stop flashing
    if (p === 'reflect' || p === 'forge') { sayLabel(p); setFieldMode(p); }
    else if (p === 'clarify' || p === 'unpack' || p === 'example') { sayLabel(p); move(t.id, p); }
    else if (p === 'find') { sayLabel('find-it'); send('Help me find which thing this is.', 'locate', { locate: 'the thing this turn is pointing at' }); }
    else if (p === 'medicine') { if (!medOpen) toggleMedicine(); }
    else if (p === 'dragon') { if (!dragonOpen) toggleDragon(); }
    else if (p === 'step') { if (!stepOpen) toggleStep(); }
    else { if (!brazierOpen) toggleBrazier(); if (p !== 'whys') setTimeout(() => openFloor(p), 400); } // .698: a floor opens as its own panel
  };
  const lastReader = [...turns].reverse().find((t) => t.role === 'reader' && !t.act) || [...turns].reverse().find((t) => t.role === 'reader');
  recKeysRef.current = (() => { // .661 (Keel §10): the recommended doors → the pills that light (the latest turn's only); .662 only once Recommend has been tapped
    const t = [...turns].reverse().find((x) => x.role === 'reader'); const out = new Set(); if (!t || !Array.isArray(t.next)) return out;
    if (recOpen !== t.id || recDone === t.id) return out; // .696 (founder): the pills flash only AFTER Recommend is tapped, and stop once one is chosen — the set was filling on every turn with a next[]
    for (const n of t.next) { const p = n.panel; if (['moon', 'meaning', 'mechanism'].includes(p)) { out.add('whys'); out.add(`floor-${p}`); } else if (p === 'whys') out.add('whys'); else if (p === 'reflect' || p === 'forge') out.add(`switch-${p}`); else if (['clarify', 'unpack', 'example'].includes(p)) out.add(`${t.id}-${p}`); else if (p === 'find') out.add(`${t.id}-find`); else if (['medicine', 'dragon', 'step'].includes(p)) out.add(p); }
    return out;
  })();
  // THE ENDING: the Reader may say the reading has done its work (closing), and the write-up turn
  // is the stop itself. Neither locks anything — the box stays live under both.
  const wrapped = turns.length > 0 && turns[turns.length - 1]?.role === 'wrap';
  const closingOffered = !!lastReader?.closing && !wrapped;
  // THE FIELD AT A TURN: the most recently drawn card up to and including that turn governs
  // its medicine container; before any reflect or forge, the opening draw. (The container
  // used to fall back to the opening draw on every talking turn — a stale growth box.)
  const firstReaderIdx = turns.findIndex((t) => t.role === 'reader');
  const fieldAt = (ti) => {
    for (let i = ti; i >= 0; i--) { const t = turns[i]; if (t?.role === 'reader' && t.draw && t.mode !== 'locate') return [t.draw]; } // .539: the medicine shown is never the pointer's
    return draws || [];
  };

  // The pills re-render with the switch: talk / ask the field / declare to the field.
  // WHILE THE READER IS WRITING (founder, 2026-09-17, on the phone): the things a person might tap
  // instead — the switches, the pills, the text box, the panels — dim and go inert, so the one
  // moving thing on the page is the indicator. Each section stays live only where its own
  // indicator lives.
  const anyBusy = loading || regenning || !!brazierBusy || stepBusy || dragonBusy || medBusy;
  const dim = (on) => (on ? 'opacity-30 pointer-events-none transition-opacity duration-300' : 'transition-opacity duration-300');
  const dimTop = dim(anyBusy);
  const dimPills = dim(loading || !!brazierBusy || stepBusy || dragonBusy || medBusy);
  const dimBox = dim(anyBusy);
  const dimPanels = dim(loading); // NOT regenning: the pills reroll off screen while the panel's answer is being read
  /* WORDS TO THE WHYS and ONE SMALL STEP (founder, 2026-09-16 night): side by side while both
     are closed; the one you open takes a full row with its answer and the other drops
     beneath it on a row of its own. The step's loop sits flush RIGHT, the whys' flush LEFT. */
  const panelsRef = useRef(null);
  panelTextRef.current = { dragon: dragonText, medicine: medText, step: stepText, floor1: brazier[1] || '', floormeaning: brazier.meaning || '', floormoon: brazier.moon || '', floormechanism: brazier.mechanism || '' }; // .698
  // .698 (founder: "all the panels should have [the Clarify / Unpack / Example / Find it buttons] at the end"): the same row every Reader turn carries, on a panel's own words
  const panelMoves = (id, text) => !text ? null : ( // .702 (founder): the row sits ON the frame's bottom line, like the turn's — one visual language
    <div className="mt-4 flex flex-wrap justify-center gap-1 px-1 sm:px-2 sm:-mb-4 sm:translate-y-1/2">
      {[['clarify', 'Clarify', 'border-sky-500/60 text-sky-200 hover:bg-sky-950/70'], ['unpack', 'Unpack', 'border-violet-500/60 text-violet-200 hover:bg-violet-950/70'], ['example', 'Example', 'border-amber-500/60 text-amber-200 hover:bg-amber-950/70']].map(([k, label, tone]) => (
        <button key={k} onClick={twoTap(`${id}-${k}`, () => move(id, k, text), k)} className={`rounded-full border bg-zinc-950 px-2 py-0.5 text-[0.625rem] sm:px-2.5 sm:text-[0.6875rem] tracking-wide whitespace-nowrap transition-colors ${tone}`}>{label}</button>
      ))}
      <button onClick={twoTap(`${id}-find`, () => send('Help me find which thing this is.', 'locate', { locate: 'the thing this turn is pointing at' }), 'find-it')} className="rounded-full border bg-zinc-950 px-2 py-0.5 text-[0.625rem] sm:px-2.5 sm:text-[0.6875rem] tracking-wide whitespace-nowrap transition-colors border-violet-500/60 text-violet-200 hover:bg-violet-950/70">Find it</button>
    </div>
  );
  const showPanels = (kind) => { setTimeout(() => { try {
    const el = (kind && document.querySelector(`[data-ez-panel="${kind}"]`)) || panelsRef.current;
    if (!el) return;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 76, behavior: 'smooth' });
  } catch {} }, 80); };
  const renderPanels = (which) => {
              const chev = (open) => <svg className={`w-4 h-4 text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>;
              const FLOOR_TONE = { meaning: ['text-amber-100', { '--pill': '251 191 36', borderColor: '#78350f' }], moon: ['text-violet-100', { '--pill': '167 139 250', borderColor: '#4c1d95' }], mechanism: ['text-cyan-100', { '--pill': '34 211 238', borderColor: '#164e63' }] };
              const header = (kind) => kind.startsWith('floor-') // .698: a floor's own panel — its name, and a chevron that closes it
                ? (() => { const f = kind.slice(6); return (
                  <button onClick={() => closeFloor(f)} className="relative w-full flex items-center justify-center sm:justify-start gap-3 px-4 py-3 text-center sm:text-left rounded-xl" style={{ minHeight: 52 }}>
                    <span className={`relative z-10 font-serif text-[1rem] sm:text-[1.1875rem] leading-tight break-words ${FLOOR_TONE[f]?.[0] || 'text-zinc-100'}`}>{FLOOR_LABEL[f] ? FLOOR_LABEL[f].charAt(0).toUpperCase() + FLOOR_LABEL[f].slice(1) : f}</span>
                    <span className="relative z-10 sm:ml-auto">{chev(true)}</span>
                  </button>); })()
                : kind === 'brazier'
                ? (
                  <button data-arm="whys" onClick={twoTap('whys', toggleBrazier, brazierOpen ? null : 'go-deeper')} className={"relative w-full flex items-center justify-center sm:justify-start gap-3 px-3 sm:pl-16 sm:pr-3 py-3 text-center sm:text-left overflow-hidden rounded-xl"} style={{ minHeight: 52 }}>
                    {/* .519: on a phone the loop fills the door and the words sit on top of it; from sm up it is the side strip */}
                    <span className="absolute inset-0 sm:inset-auto sm:left-0 sm:top-0 sm:h-full sm:w-14 overflow-hidden rounded-xl sm:rounded-r-none" aria-hidden="true"><HoverVideo src="/video/brazier.mp4" playing={brazierOpen} className="w-full h-full object-cover" /></span>
                    <span className="absolute inset-0 bg-black/50 sm:hidden" aria-hidden="true" />
                    <span className="relative z-10 font-serif text-[1rem] sm:text-[1.1875rem] leading-tight text-zinc-100 sm:text-zinc-200 break-words drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">Go deeper</span>
                    {brazierOpen && <span className="relative z-10 sm:ml-auto">{chev(true)}</span>}
                  </button>
                ) : kind === 'dragon' ? (
                  <button data-arm="dragon" onClick={twoTap('dragon', toggleDragon, dragonOpen ? null : 'face-the-dragon')} className={"relative w-full flex items-center justify-center sm:justify-start gap-3 px-3 sm:pl-16 sm:pr-3 py-3 text-center sm:text-left overflow-hidden rounded-xl"} style={{ minHeight: 52 }}>
                    {/* .513: the dragon's own loop (the founder's clip, 2026-09-21) — the mists waver, the dragon */}
                    <span className="absolute inset-0 sm:inset-auto sm:left-0 sm:top-0 sm:h-full sm:w-14 overflow-hidden rounded-xl sm:rounded-r-none" aria-hidden="true"><HoverVideo src="/video/dragon.mp4" playing={dragonOpen} className="h-full w-full object-cover" /></span>
                    <span className="absolute inset-0 bg-black/50 sm:hidden" aria-hidden="true" />
                    <span className="relative z-10 font-serif text-[1rem] sm:text-[1.1875rem] leading-tight text-rose-100 sm:text-rose-200 break-words drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">{DRAGON_LABEL}</span>
                    {dragonOpen && <span className="relative z-10">{chev(true)}</span>}
                  </button>
                ) : kind === 'medicine' ? (
                  <button data-arm="medicine" onClick={twoTap('medicine', toggleMedicine, medOpen ? null : 'the-medicine')} className={"relative w-full flex items-center justify-center sm:justify-start gap-3 px-3 sm:pl-3 sm:pr-16 py-3 text-center sm:text-left overflow-hidden rounded-xl"} style={{ minHeight: 52 }}>
                    {/* .548: the loop on the RIGHT, like the step's — whys and dragon carry theirs on the left, so the row balances (founder) */}
                    <span className="absolute inset-0 sm:inset-auto sm:right-0 sm:top-0 sm:h-full sm:w-14 overflow-hidden rounded-xl sm:rounded-l-none" aria-hidden="true"><HoverVideo src="/video/rainbow.mp4" playing={medOpen} className="w-full h-full object-cover" /></span>
                    <span className="absolute inset-0 bg-black/50 sm:hidden" aria-hidden="true" />
                    {medOpen && <span className="relative z-10">{chev(true)}</span>}
                    <span className="relative z-10 font-serif text-[1rem] sm:text-[1.1875rem] leading-tight text-emerald-100 sm:text-emerald-200 break-words drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">{MEDICINE_LABEL}</span>
                  </button>
                ) : (
                  <button data-arm="step" onClick={twoTap('step', toggleStep, stepOpen ? null : 'one-small-step')} className={"relative w-full flex items-center justify-center sm:justify-start gap-3 px-3 sm:pl-3 sm:pr-16 py-3 text-center sm:text-left overflow-hidden rounded-xl"} style={{ minHeight: 52 }}>
                    <span className="absolute inset-0 sm:inset-auto sm:right-0 sm:top-0 sm:h-full sm:w-14 overflow-hidden rounded-xl sm:rounded-l-none" aria-hidden="true"><HoverVideo src="/video/step.mp4" playing={stepOpen} className="w-full h-full object-cover" /></span>
                    <span className="absolute inset-0 bg-black/50 sm:hidden" aria-hidden="true" />
                    {stepOpen && <span className="relative z-10">{chev(true)}</span>}
                    <span className="relative z-10 font-serif text-[1rem] sm:text-[1.1875rem] leading-tight text-zinc-100 sm:text-zinc-200 break-words drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">{DO_SOMETHING_LABEL}</span>
                  </button>
                );
              const body = (kind) => kind.startsWith('floor-') // .698: a floor's own panel, read-along and the moves like every other
                ? (() => { const f = kind.slice(6); return (
                  <div className="px-4 pb-4 text-[0.9375rem] leading-relaxed text-zinc-300">
                    {brazierBusy === f && <Writing scroll={false} label={(STAGE[f] || STAGE.writing)[0]} />}
                    {brazier[f] && ensureParagraphBreaks(brazier[f]).split(/\n\n+/).filter((x) => x.trim()).map((x, xi) => (
                      <p key={xi} data-spoken={spokenKey(`floor${f}`, 'text', xi)} className={'mb-3 last:mb-0 whitespace-pre-wrap break-words' + litIf(`floor${f}`, 'text', xi)}>{x.trim()}</p>
                    ))}
                    {f === 'mechanism' && brazier[f] && (
                      <p className="mt-3 text-[0.8125rem]"><Link href={savedId ? `/advanced?load=${savedId}&bridge=1` : '/advanced'} className="text-cyan-300/90 underline decoration-dotted hover:text-cyan-200">open this reading in the full reader</Link> <span className="text-zinc-500">— your conversation stays saved here; there is a way back at the top of that page</span></p>
                    )}
                    {panelMoves(`floor${f}`, brazier[f])}
                  </div>); })()
                : kind === 'brazier'
                ? (brazierOpen && (
                  <div className="px-4 pb-4 text-[0.9375rem] leading-relaxed text-zinc-300">
                    {/* .661 (Keel §11): GO DEEPER's four peers. .698 (founder): the door is the SELECTOR — Words to the Whys shows here; the meaning, the moon and
                        the mechanism each open as a dedicated panel of their own, in the order they were opened; the selector stays open. */}
                    <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
                      {['meaning', 'moon', 'mechanism'].filter((f) => FLOORS_OPEN[f] || bench || isAdmin(user)).map((f) => [f, FLOOR_LABEL[f].charAt(0).toUpperCase() + FLOOR_LABEL[f].slice(1), { meaning: 'border-amber-400/90 bg-amber-950/30 text-amber-100', moon: 'border-violet-400/90 bg-violet-950/30 text-violet-100', mechanism: 'border-cyan-400/90 bg-cyan-950/30 text-cyan-100' }[f]]).map(([f, label, tone]) => (
                        <button key={f} data-arm={`floor-${f}`} onClick={() => (floorsOpened.includes(f) ? closeFloor(f) : openFloor(f))}
                          className={`rounded-full border px-3.5 py-1.5 text-[0.8125rem] font-serif transition-all ${tone} ${floorsOpened.includes(f) ? 'ring-2 ring-white/70' : 'opacity-70 hover:opacity-100'}${armedCls(`floor-${f}`)}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                    {brazierBusy === 1 && <Writing scroll={false} label={STAGE.writing[0]} />}
                    {brazier[1] && ensureParagraphBreaks(brazier[1]).split(/\n\n+/).filter((x) => x.trim()).map((x, xi) => (
                      <p key={`r1${xi}`} data-spoken={spokenKey('floor1', 'text', xi)} className={'mb-3 last:mb-0 whitespace-pre-wrap break-words' + litIf('floor1', 'text', xi)}>{x.trim()}</p>
                    ))}
                    {panelMoves('floor1', brazier[1])}
                  </div>
                ))
                : kind === 'dragon' ? (dragonOpen && (
                  <div className="px-4 pb-4 text-[0.9375rem] leading-relaxed text-zinc-300">
                    <div className="text-[0.6875rem] text-rose-300/70 mb-2">{DRAGON_HINT}</div>
                    {dragonBusy && <Writing scroll={false} label={STAGE.naming[0]} />}
                    {!dragonBusy && dragonText && ensureParagraphBreaks(dragonText).split(/\n\n+/).filter((x) => x.trim()).map((x, xi) => (
                      <p key={xi} data-spoken={spokenKey('dragon', 'text', xi)} className={'mb-3 last:mb-0 whitespace-pre-wrap break-words' + litIf('dragon', 'text', xi)}>{x.trim()}</p>
                    ))}
                    {!dragonBusy && panelMoves('dragon', dragonText)}
                  </div>
                )) : kind === 'medicine' ? (medOpen && (
                  <div className="px-4 pb-4 text-[0.9375rem] leading-relaxed text-zinc-300">
                    <div className="text-[0.6875rem] text-emerald-300/70 mb-2">{MEDICINE_HINT}</div>
                    {medBusy && <Writing scroll={false} label={STAGE.medicine[0]} />}
                    {!medBusy && medText && (() => {
                      // split on the three headings; anything before the first heading renders plain
                      const parts = []; let rest = medText;
                      const medParas = ensureParagraphBreaks(medText).split(/\n\n+/).map((p) => p.trim()).filter(Boolean); // .661 (Keel §9): the panel's paragraphs keyed as the voice keys them
                      const paraIdx = (x) => medParas.findIndex((p) => p === x || p.endsWith(x));
                      const idx = MEDICINE_PARTS.map(([h]) => rest.indexOf(h));
                      if (idx.every((i) => i < 0)) return ensureParagraphBreaks(medText).split(/\n\n+/).filter((x) => x.trim()).map((x, xi) => <p key={xi} data-spoken={spokenKey('medicine', 'text', xi)} className={'mb-3 last:mb-0 whitespace-pre-wrap break-words' + litIf('medicine', 'text', xi)}>{x.trim()}</p>);
                      MEDICINE_PARTS.forEach(([h, label], pi) => {
                        const i = rest.indexOf(h); if (i < 0) return;
                        const next = MEDICINE_PARTS.slice(pi + 1).map(([hh]) => rest.indexOf(hh)).filter((j) => j > i);
                        const end = next.length ? Math.min(...next) : rest.length;
                        parts.push([label, rest.slice(i + h.length, end).trim()]);
                      });
                      return parts.map(([label, text], pi) => (
                        <div key={label} className={pi ? 'mt-4 pt-4 border-t border-zinc-800/70' : ''}>
                          <div className="text-[0.625rem] uppercase tracking-wider text-emerald-400/70 mb-2">{label}</div>
                          {ensureParagraphBreaks(text).split(/\n\n+/).filter((x) => x.trim()).map((x, xi) => { const pi2 = paraIdx(x.trim()); return <p key={xi} data-spoken={pi2 >= 0 ? spokenKey('medicine', 'text', pi2) : undefined} className={'mb-3 last:mb-0 whitespace-pre-wrap break-words' + (pi2 >= 0 ? litIf('medicine', 'text', pi2) : '')}>{x.trim()}</p>; })}
                        </div>
                      ));
                    })()}
                    {!medBusy && panelMoves('medicine', medText)}
                  </div>
                )) : (stepOpen && (
                  <div className="px-4 pb-4 text-[0.9375rem] leading-relaxed text-zinc-300">
                    <div className="text-[0.6875rem] text-zinc-500 mb-2">{DO_SOMETHING_HINT}</div>
                    {stepBusy && <Writing scroll={false} label={STAGE.step[0]} />}
                    {!stepBusy && stepText && ensureParagraphBreaks(stepText).split(/\n\n+/).filter((x) => x.trim()).map((x, xi) => (
                      <p key={xi} data-spoken={spokenKey('step', 'text', xi)} className={'mb-3 last:mb-0 whitespace-pre-wrap break-words' + litIf('step', 'text', xi)}>{x.trim()}</p>
                    ))}
                    {!stepBusy && panelMoves('step', stepText)}
                  </div>
                ));
              const frame = 'pill-breathe rounded-xl border bg-zinc-950/40';
              const glow = { '--pill': '139 92 246', borderColor: '#4c1d95' }; // dark purple at rest; breathes violet on hover
              const isOpen = (kind) => (kind.startsWith('floor-') ? floorsOpened.includes(kind.slice(6)) : kind === 'brazier' ? brazierOpen : kind === 'dragon' ? dragonOpen : kind === 'medicine' ? medOpen : stepOpen);
              // the row: whys · dragon · the medicine · step (.538: four doors; on a phone the shut ones sit two by two)
              const base = ['brazier', 'dragon', 'medicine', 'step'];
              // .698 (founder): the OPEN panels in the order they were opened — the four doors and the floors alike; the shut ones keep the row's order
              const all = [...base, ...floorsOpened.map((f) => `floor-${f}`)];
              const order = which === 'open' ? [...openOrder.filter((k) => all.includes(k)), ...all.filter((k) => !openOrder.includes(k))] : base;
              const mine = order.filter((kind) => (which === 'open' ? isOpen(kind) : !isOpen(kind)));
              if (!mine.length) return null;
              // the shut ones share one row under the text box, in the row's own order
              if (which === 'closed' && mine.length > 1) {
                const dragonGlow = { '--pill': '244 63 94', borderColor: '#881337' }; // dark rose at rest; breathes red on hover
                const medicineGlow = { '--pill': '52 211 153', borderColor: '#064e3b' }; // dark emerald at rest; breathes green on hover
                return (
                  <div className="mt-4 flex flex-wrap items-stretch gap-2">
                    {base.filter((k) => mine.includes(k)).map((k) => (
                      <div key={k} style={k === 'dragon' ? dragonGlow : k === 'medicine' ? medicineGlow : glow} className={`flex-1 min-w-0 basis-[calc(50%-0.25rem)] sm:basis-0 ${frame}${armedCls(k === 'brazier' ? 'whys' : k)}`}>{header(k)}</div>
                    ))}
                  </div>
                );
              }
              return (
                <div ref={which === 'open' ? panelsRef : undefined}>
                  {mine.map((kind, i) => (
                    <div key={kind} data-ez-panel={kind} style={kind === 'dragon' ? { '--pill': '244 63 94', borderColor: '#881337' } : kind === 'medicine' ? { '--pill': '52 211 153', borderColor: '#064e3b' } : kind.startsWith('floor-') ? (FLOOR_TONE[kind.slice(6)]?.[1] || glow) : glow} className={`${i === 0 ? 'mt-4' : 'mt-3'} ${frame}${armedCls(kind === 'brazier' ? 'whys' : kind)}`}>{header(kind)}{which === 'open' ? body(kind) : null}</div>
                  ))}
                </div>
              );
  };

  const activePills = !lastReader ? []
    : fieldMode === 'reflect' ? (lastReader.reflect || []).map((text) => ({ kind: 'reflect', text }))
      : fieldMode === 'forge' ? (lastReader.forge || []).map((text) => ({ kind: 'forge', text }))
        : (lastReader.chips || []);

  // The two switches are, in the founder's words, "probably the most valuable buttons in the
  // whole thing" — and people scrolled past them. Now each takes half the row, sized like the
  // pills, with one line inside saying what it does.
  const switchBtn = (mode, label, glyph) => {
    const on = fieldMode === mode;
    const tone = mode === 'reflect'
      ? (on ? 'border-sky-400 bg-sky-900/40 text-sky-100' : 'border-sky-700/50 bg-sky-950/20 text-sky-200 hover:border-sky-500 hover:bg-sky-900/30')
      : (on ? 'border-orange-400 bg-orange-900/40 text-orange-100' : 'border-orange-700/50 bg-orange-950/20 text-orange-200 hover:border-orange-500 hover:bg-orange-900/30');
    const hint = mode === 'reflect' ? 'ask the signatures a question' : 'declare a move — the signatures answer';
    return (
      <button data-arm={`switch-${mode}`} onClick={() => { if (!on) sayLabel(mode); setFieldMode(on ? null : mode); }} disabled={loading}
        className={`${armedCls(`switch-${mode}`)} relative overflow-hidden flex-1 min-w-0 text-center rounded-lg border py-2.5 transition-colors disabled:opacity-40 ${mode === 'reflect' ? 'pl-16 pr-3' : 'pl-3 pr-16'} ${tone}`}>
        <span className="flex items-center justify-center gap-2 text-[0.9375rem] font-medium">
          {mode === 'reflect'
            ? <span className="absolute left-0 top-0 h-full w-14 overflow-hidden rounded-l-lg" aria-hidden="true"><HoverVideo src="/video/reflect.mp4" className="w-full h-full object-cover" style={{ mixBlendMode: 'screen' }} /></span>
            : <span className="absolute right-0 top-0 h-full w-14 overflow-hidden rounded-r-lg" aria-hidden="true"><HoverVideo src="/video/forge.mp4" className="w-full h-full object-cover" /></span>}
          <span>{label}</span>
        </span>
        <span className="block text-[0.6875rem] opacity-75 mt-0.5 break-words">{hint}</span>
      </button>
    );
  };

  return (
    <div className={`relative min-h-screen flex flex-col overflow-x-hidden ${chrome.prefs.theme === 'light' ? 'bg-stone-200 text-stone-900' : 'bg-zinc-950 text-zinc-100'}`}
      data-theme={chrome.prefs.theme} style={{ '--content-dim': chrome.prefs.contentDim / 100 }}>
      {chrome.loaded && <Backdrop prefs={chrome.prefs} />}
      {user && <CornerControls collapsed prefs={chrome.prefs} set={chrome.set} onAuthChange={(u) => { if (!u && user?.id !== 'dev-bench') setUser(null); }}
        rightExtra={
          // the voice, as one toggle under the text size (founder, 2026-09-16): plain words / the map's words
          <button onClick={() => chooseVoice(VOICE_ORDER[(VOICE_ORDER.indexOf(voice) + 1) % VOICE_ORDER.length])}
            title={`${VOICE_NOTES[voice]?.[0] || voice} — tap for ${VOICE_NOTES[VOICE_ORDER[(VOICE_ORDER.indexOf(voice) + 1) % VOICE_ORDER.length]]?.[0]}`}
            className={`w-8 h-8 rounded-lg border backdrop-blur-sm text-[0.8125rem] font-medium flex items-center justify-center transition-all ${VOICE_STYLE[voice] || VOICE_STYLE.map}`}>
            {voice === 'plain' ? 'Aa' : voice === 'grown' ? <span className="font-serif italic">Aa</span> : voice === 'deep' ? '∴' : voice === 'mystical' ? '☾' : '◈'}
          </button>
        } />}
      {speakingId ? ( // .653/.662/.663: the bar shows WHILE the voice reads — pause / continue, skip this, voice off (founder: no standing menu; a tap on the paragraph being read pauses it, a tap on another jumps, a tap when idle starts there)
        <div data-pause-pop role="status" aria-live="polite" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-[94vw] flex items-center gap-2 rounded-full border border-amber-500/40 bg-zinc-900/95 px-2 py-1 text-[0.8125rem] text-amber-100 shadow-xl">
          <button onClick={togglePause} className="rounded-full border border-amber-400/60 bg-amber-950/40 px-3 py-1 hover:bg-amber-900/50">{paused ? '▶ Continue' : '⏸ Pause'}</button>
          <button onClick={skipTurn} className="rounded-full border border-zinc-600 px-3 py-1 text-zinc-200 hover:bg-zinc-800">Skip this</button>
          <button onClick={cycleSpeed} title="readback speed — tap to cycle; the next piece takes it" className="rounded-full border border-zinc-600 px-3 py-1 text-zinc-200 hover:bg-zinc-800 tabular-nums">{voiceSpeed}×</button> {/* .698 */}
          <button onClick={voiceOff} className="rounded-full border border-zinc-700 px-3 py-1 text-zinc-400 hover:bg-zinc-800">Voice off</button>
        </div>
      ) : voiceMsg && (
        <div role="status" aria-live="polite" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-[90vw] rounded-full border border-amber-500/40 bg-zinc-900/95 px-4 py-1.5 text-[0.8125rem] text-amber-100 shadow-xl">{voiceMsg}</div>
      )}
      {voiceToast && VOICE_NOTES[voiceToast] && (
        <div style={{ marginTop: 'var(--safe-top, 0px)' }} className="fixed top-3 right-14 z-50 max-w-[16rem] rounded-xl border border-zinc-700/60 bg-zinc-900/95 backdrop-blur-sm px-3 py-2 shadow-2xl" role="status" aria-live="polite">
          <div className={`text-[0.8125rem] font-medium ${voiceToast === 'plain' ? 'text-amber-200' : voiceToast === 'grown' ? 'text-violet-200' : voiceToast === 'deep' ? 'text-cyan-200' : voiceToast === 'mystical' ? 'text-rose-200' : 'text-zinc-200'}`}>{VOICE_NOTES[voiceToast][0]}</div>
          <div className="text-[0.75rem] leading-snug text-zinc-400 mt-0.5">{VOICE_NOTES[voiceToast][1]}</div>
          {voiceOffer && voiceOffer.v === voiceToast && !loading ? (
            <button onClick={() => { const o = voiceOffer; setVoiceOffer(null); setVoiceToast(null); move(o.id, `voice:${o.v}`); }}
              className="mt-1.5 text-[0.75rem] text-fuchsia-200 underline decoration-dotted hover:text-fuchsia-100">say the last turn again this way →</button>
          ) : (
            <div className="text-[0.625rem] text-zinc-600 mt-1">takes effect on the next reply</div>
          )}
        </div>
      )}
      <div className="relative z-10 flex-1 flex flex-col w-full">
      <BrandHeader compact />
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 pb-24 overflow-x-hidden">
        {/* 2026-10-02 (founder): the Reader selector left the front — EZ reads on Standard; /advanced keeps the choice. */}
        <div className="mt-6" />

        {allowed === null && <p className="text-zinc-500 text-sm">Checking the door…</p>}
        {allowed === false && !user && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
            <div>
              <p className="text-base text-zinc-200 mb-1">Sign in to begin.</p>
              <p className="text-sm text-zinc-500">Your readings are saved to your account so you can come back to them.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => { setAuthMode('signin'); setAuthOpen(true); }}
                className="px-5 py-2.5 rounded-lg bg-[#021810] text-[#f59e0b] border border-emerald-700/50 hover:bg-[#052e23] text-sm font-medium">
                Sign in
              </button>
              <button onClick={() => { setAuthMode('signup'); setAuthOpen(true); }}
                className="px-5 py-2.5 rounded-lg border border-zinc-700 text-zinc-300 hover:border-zinc-500 text-sm">
                Create an account
              </button>
            </div>
          </div>
        )}

        {allowed === false && user && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 text-sm text-zinc-300">
            <p className="mb-2">EZ mode is invite-only while it is being built.</p>
            <p className="text-zinc-500">You are signed in as {user.email}, but this account is not on the list yet.</p>
          </div>
        )}

        {allowed && !draws && !door && (
          <div style={{ paddingTop: anchorPad === null ? '20vh' : anchorPad }}>
          {/* THE ENTRY, like the front page: one frame, the box with Ask inside it, and one quiet
              menu in its corner (.592) — help, topic, past readings, from my readings. Everything else folds.
              The frame sits in the middle of the screen (founder: "like Bing or Google, right
              there in the middle, very simple"). */}
          <div ref={anchorRef} className={`content-pane bg-zinc-900/30 border border-zinc-800/50 p-4 space-y-3 ${(areasOpen || showPast || (suggested && suggestOpen) || error) ? 'rounded-t-lg' : 'rounded-lg'}`}>
            {/* .545: THE FRAME, ON THE BOX — the founder set a frame, hit done, and "nothing happened": the only sign was the small
                About ✓. Now the frame sits on the question box itself, in words, with a way to change or clear it. */}
            {frame && !draws && (
              <div className="mb-2 flex flex-wrap items-center justify-center gap-2 text-[0.8125rem]">
                <span className="rounded-full border border-emerald-500/50 bg-emerald-950/30 px-3 py-1 text-emerald-100">Topic: {frameLabel(frame)}</span>
                <button onClick={() => setFrameOpen(true)} className="text-emerald-300/80 underline decoration-dotted hover:text-emerald-200">change</button>
                <button onClick={() => { setFrame(null); setFrameDetail(''); }} className="text-zinc-400 underline decoration-dotted hover:text-zinc-200">clear</button>
              </div>
            )}
            <div className="relative">
              <div className="content-pane rounded-xl">
                <textarea ref={questionRef} value={question} onChange={(e) => { setQuestion(e.target.value); if (wordless) setWordless(false); }} onFocus={() => setWordless(false)} rows={4}
                  placeholder={frame ? `Ask about ${frameLabel(frame)} — the way you would say it out loud.` : "What's on your mind? Ask it the way you would say it out loud."}
                  style={{ animationDuration: '16s' }}
                  className={`animate-border-rainbow block w-full rounded-xl bg-zinc-900/70 border border-zinc-700/60 p-4 pb-16 text-base text-zinc-100 placeholder-zinc-600 focus:outline-none`} />
              </div>
              {/* the offer sits INSIDE the box, outside the content-pane wrapper: a direct child of a
                  content-pane is forced into normal flow (the Ask-button trap, 2026-09-16) */}
              {wordless && (
                <div className="pointer-events-none absolute left-4 right-4 bottom-16 z-10 text-right text-[0.8125rem] leading-snug text-zinc-400">
                  You don’t have to have words. Tap again and the signatures start.
                </div>
              )}
              {user && <MicButton className="absolute bottom-4 left-4" getAuth={voiceAuth} onStatus={(m) => setVoiceMsg(m)} onText={(txt) => { setQuestion((q) => (q.trim() ? `${q.trim()} ${txt}` : txt)); setWordless(false); try { questionRef.current?.focus(); } catch {} }} />} {/* .635 THE MIC */}
              <button onClick={begin} disabled={loading} className="group absolute bottom-4 right-4 z-10 flex items-center gap-2 px-4 py-1.5 rounded-lg border border-zinc-700/50 hover:border-zinc-600 bg-black/20 hover:bg-white/5 backdrop-blur-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
                <span className="text-[0.8125rem] font-mono uppercase tracking-[0.2em] font-medium inline-flex items-center justify-center"
                  style={{ background: 'linear-gradient(90deg, #f87171, #fb923c, #facc15, #4ade80, #22d3ee, #a78bfa, #f472b6, #f87171)', backgroundSize: '200% 100%', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', animation: 'gradient-shift 3s ease infinite, field-breathe 3s ease-in-out infinite' }}>{loading ? '...' : wordless ? 'Draw for wherever I am' : 'Ask'}</span>
                <svg className="w-3.5 h-3.5 text-white/60 group-hover:text-white/90 group-hover:translate-x-1 transition-all duration-200" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 2l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>
            {/* .594: the menu sits BENEATH the box (founder), centred, the only thing under it */}
            <div className="flex justify-center">
              {/* .592: ONE QUIET MENU (founder 2026-10-02: "we should always just have the google box… load, unsure, topic and from your
                  readings could be a selection menu instead of buttons. I want it to be clear and clean as possible"). A native select: on a
                  phone it opens the system picker, and it cannot wrap or be covered (.576 precedent). Each choice opens one fold, or closes it. */}
              <select key={menuTick} value="" aria-label="more" title="help finding a question, the topic, your readings"
                onChange={(e) => {
                  const v = e.target.value; setMenuTick((n) => n + 1);
                  const closeAll = () => { setShowPast(false); setAreasOpen(false); setFrameOpen(false); setSuggestOpen(false); };
                  if (v === 'readings') { const was = suggestOpen; closeAll(); if (!was) { setSuggestOpen(true); if (!suggested && !suggesting) suggestFromHistory(); } }
                  else if (v === 'unsure') { const was = areasOpen; closeAll(); setAreasOpen(!was); }
                  else if (v === 'topic') { const was = frameOpen; closeAll(); setFrameOpen(!was); }
                  else if (v === 'load') { const was = showPast; closeAll(); if (!was) loadPastList(); }
                }}
                style={{ width: '4.75rem' }} /* .593: a select is sized by its LONGEST option — fixed width so it is just the word */
                className="appearance-none bg-transparent border-0 p-0 text-center text-[0.8125rem] text-zinc-500 hover:text-zinc-300 focus:outline-none cursor-pointer">
                <option style={OPT} value="">more ▾</option>
                {user && hasHistory && <option style={OPT} value="readings">{suggestOpen ? 'Hide the question from my readings' : 'A question from my readings'}</option>}
                <option style={OPT} value="unsure">{areasOpen ? 'Hide the help' : 'Help me find a question'}</option>
                <option style={OPT} value="topic">{frameOpen ? 'Hide the topic picker' : frame ? 'Change the topic' : 'Set the topic'}</option>
                <option style={OPT} value="load">{showPast ? 'Hide my past readings' : 'Load a past reading'}</option>
              </select>
              {user && ( // .703 (founder): previous / next voice, and the voice introduces itself — hear it before you choose it
                <button type="button" aria-label="previous voice" title="the voice before this one — it says hello" onClick={() => { const keys = READ_BY.map(([k]) => k); const i = Math.max(0, keys.indexOf(voiceName)); const v = keys[(i - 1 + keys.length) % keys.length]; unlockAudio(); chrome.set({ voiceOut: true, voiceName: v }); try { const hello = new Audio(`/voice/labels/${v}/intro.wav`); hello.play().catch(() => {}); } catch {} }}
                  className="ml-4 px-1.5 text-[0.9375rem] text-zinc-500 hover:text-zinc-200">‹</button>
              )}
              {user && ( // .627 READ BY (.637: everyone): one selector for the voice, with "no voice" in it; the value shows what is on
                <select value={voiceOut ? voiceName : 'none'} aria-label="read by" title="which voice reads the Reader's turns aloud"
                  onChange={(e) => { const v = e.target.value; if (v === 'none') { stopVoice(); chrome.set({ voiceOut: false }); } else { unlockAudio(); chrome.set({ voiceOut: true, voiceName: v }); } }}
                  style={{ width: '8.5rem' }}
                  className="ml-4 appearance-none bg-transparent border-0 p-0 text-center text-[0.8125rem] text-zinc-500 hover:text-zinc-300 focus:outline-none cursor-pointer">
                  <option style={OPT} value="none">Not read aloud ▾</option>
                  {READ_BY.map(([k, label]) => <option style={OPT} key={k} value={k}>{`Read by ${label} ▾`}</option>)}
                  {voiceName === 'af_heart' && <option style={OPT} value="af_heart">Read by Heart ▾</option>}
                </select>
              )}
              {user && ( // .703: next voice, introduced
                <button type="button" aria-label="next voice" title="the next voice — it says hello" onClick={() => { const keys = READ_BY.map(([k]) => k); const i = Math.max(0, keys.indexOf(voiceName)); const v = keys[(i + 1) % keys.length]; unlockAudio(); chrome.set({ voiceOut: true, voiceName: v }); try { const hello = new Audio(`/voice/labels/${v}/intro.wav`); hello.play().catch(() => {}); } catch {} }}
                  className="px-1.5 text-[0.9375rem] text-zinc-500 hover:text-zinc-200">›</button>
              )}
            </div>

          </div>

          {/* .544: THE FRAME fold — a category, then a detail in their own words */}
          {frameOpen && !draws && (
            <div className="content-pane rounded-xl border border-emerald-700/40 bg-emerald-950/15 p-4 space-y-3">
              <div className="text-[0.625rem] uppercase tracking-wider text-emerald-300/70">What&apos;s the topic?</div>
              {topicChips((f) => { const same = frame?.k === f.k; setFrame(same ? null : { k: f.k, detail: same ? '' : (f.ask ? frameDetail : '') }); if (!same && !f.ask) { setFrameOpen(false); } })}
              {frame && frameOf(frame.k)?.ask && (
                <div className="flex items-center gap-2">
                  <input value={frameDetail} onChange={(e) => { setFrameDetail(e.target.value); setFrame({ k: frame.k, detail: e.target.value.trim() }); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') setFrameOpen(false); }}
                    placeholder={frameOf(frame.k).ask} maxLength={80}
                    className="flex-1 min-w-0 rounded-lg border border-emerald-700/40 bg-zinc-950/60 px-3 py-2 text-[0.9375rem] text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-400" />
                  <button onClick={() => { setFrameOpen(false); try { questionRef.current?.focus(); } catch {} }} className="rounded-lg border border-emerald-500/50 px-3 py-2 text-[0.8125rem] text-emerald-100 hover:bg-emerald-900/30">done</button>
                </div>
              )}
              {frame && <div className="text-[0.75rem] text-emerald-200/70">Topic: {frameLabel(frame)} — the signature will be read through this. <button onClick={() => { setFrame(null); setFrameDetail(''); }} className="underline decoration-dotted hover:text-emerald-100">clear</button></div>}
              {frame && user && (
                <div className="flex flex-wrap items-center gap-2 text-[0.8125rem]">
                  <button onClick={() => { setFrameOpen(false); suggestFromHistory({ frame }); }} disabled={suggesting}
                    className="rounded-full border border-violet-500/50 bg-violet-950/30 px-3 py-1 text-violet-100 hover:bg-violet-900/40 disabled:opacity-50">
                    {suggesting ? 'thinking…' : 'suggest a question about this'}
                  </button>
                  <span className="text-zinc-500">or just tap Ask — the frame is a complete question on its own</span>
                </div>
              )}
            </div>
          )}
          {(areasOpen || showPast || (suggested && suggestOpen) || error) && (
          <div className="content-pane bg-zinc-900/30 border border-t-0 border-zinc-800/50 rounded-b-lg p-4 space-y-3">
            {areasOpen && (() => {
              const byId = Object.fromEntries(DOORS.map(d => [d.id, d]));
              // the minimap's own house colours (components/reader/Minimap.js CHANNEL_COLORS)
              const HOUSE_TINT = { spirit: '#C44444', mind: '#4A8B4A', emotion: '#3D6A99', body: '#8B6B3D', gestalt: '#6B4D8A', daily: '#a16207' };
              const Door = ({ d, className = '', delay = 0 }) => {
                const c = HOUSE_TINT[d.id];
                return (
                  <button key={d.id} onClick={() => {
                      // "My daily reading" chooses one of the five houses for them, at random
                      // "Let one be chosen for me": a house and one of its open sentences, never
                      // yesterday's (pickDaily); a chosen door brings no sentence of its own
                      const daily = d.id === 'daily' ? pickDaily(DOORS) : null;
                      setDoor(daily ? daily.door : d); setQuestion(daily ? daily.text : ''); setError(''); setBiggerOpen(false);
                    }}
                    className={`text-center rounded-xl border px-3 py-2.5 transition-colors break-words hover:brightness-125 ${className}`}
                    style={{ borderColor: c + '99', background: c + '26', animation: 'border-rainbow 3s ease-in-out infinite', animationDelay: `-${delay}ms` }}>
                    <span className="text-[0.9375rem] text-zinc-100">{d.label}</span>
                    <span className="block text-xs text-zinc-400 mt-0.5">{d.sub}</span>
                  </button>
                );
              };
              // the Gestalt door is one cell wide, centred over the four; every cell the same height
              return (
                <div className="grid grid-cols-2 gap-2 auto-rows-fr">
                  <div className="col-span-2 flex justify-center">
                    <Door d={byId.gestalt} className="w-[calc(50%-4px)]" delay={0} />
                  </div>
                  <Door d={byId.mind} delay={180} />
                  <Door d={byId.emotion} delay={360} />
                  <Door d={byId.body} delay={540} />
                  <Door d={byId.spirit} delay={720} />
                  {/* the five doors are the five aspects of self; the random choice is a link, not a sixth door */}
                  <div className="col-span-2 text-center pt-1">
                    <button onClick={() => { const daily = pickDaily(DOORS); setDoor(daily.door); setQuestion(daily.text); setError(''); setBiggerOpen(false); }}
                      className="text-sm text-amber-400/80 hover:text-amber-300 underline decoration-dotted underline-offset-4">
                      or let one be chosen for me — my daily reading
                    </button>
                  </div>
                </div>
              );
            })()}

            {showPast && (
                <div className="rounded-xl border border-zinc-700/60 bg-zinc-900/50 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[0.625rem] uppercase tracking-wider text-zinc-500">Your EZ readings</span>
                    <button onClick={() => setShowPast(false)} className="text-xs text-zinc-600 hover:text-zinc-300">close</button>
                  </div>
                  {pastReadings.length === 0 && <p className="text-xs text-zinc-600">Nothing here yet.</p>}
                  {pastReadings.slice(0, 12).map((r, ri) => (
                    // each row flashes the rainbow once as the list opens, top to bottom (the same
                    // one-shot the front page's Enter uses), staggered so it reads as a cascade
                    <button key={r.id} onClick={() => openPast(r.id)} disabled={loading}
                      style={{ animation: 'border-rainbow 3s ease-in-out infinite', animationDelay: `-${ri * 180}ms` }}
                      className="w-full text-left rounded-lg border border-zinc-700/50 px-3 py-2 hover:border-amber-500/40 transition-colors break-words disabled:opacity-40">
                      <span className="text-sm text-zinc-200 break-words">{r.topic || 'Untitled'}</span>
                      <span className="block text-[0.625rem] text-zinc-600 mt-0.5">{new Date(r.created_at).toLocaleDateString()}</span>
                    </button>
                  ))}
                </div>
            )}

                {suggested && suggestOpen && (
                  <button onClick={() => { setDoor(null); setQuestion(suggested); setError(''); }}
                    style={{ animation: 'border-rainbow 3s ease-in-out infinite', animationDelay: '-900ms' }}
                    className="w-full text-center rounded-xl border border-violet-700/50 bg-violet-950/20 px-4 py-3 break-words">
                    <span className="text-[0.625rem] uppercase tracking-wider text-violet-300/70 block mb-1">From your readings — tap to use</span>
                    <span className="text-[0.9375rem] text-violet-100">{suggested}</span>
                    {suggestedWhy && <span className="block mt-1.5 text-[0.75rem] leading-snug text-violet-300/70">{suggestedWhy}</span>}
                  </button>
                )}
                {!suggested && suggesting && suggestOpen && <p className="text-center text-[0.75rem] text-violet-300/50">Reading your history…</p>}
                {suggested && suggestOpen && (
                  <div className="flex justify-center items-center gap-3 text-[0.75rem]">
                    <button onClick={() => suggestFromHistory()} disabled={suggesting} title="a different thread from your readings"
                      className="text-violet-300/80 underline decoration-dotted hover:text-violet-100 disabled:opacity-50">{suggesting ? 'reading your history…' : 'another'}</button>
                    <span className="text-violet-300/40">·</span>
                    <button onClick={closeTopic} disabled={suggesting}
                      className="text-[0.75rem] text-violet-300/80 underline decoration-dotted hover:text-violet-100 disabled:opacity-50">✓ I&apos;m done with this topic</button>
                  </div>
                )}
                {lastClosed && !suggesting && (
                  <div className="text-center text-[0.75rem] text-violet-300/60 break-words">Closed: &ldquo;{lastClosed.q}&rdquo; · <button onClick={undoClose} className="underline decoration-dotted hover:text-violet-100">undo</button></div>
                )}
            {error && <p className="text-xs text-red-400 break-words">{error}</p>}
          </div>
          )}
          </div>
        )}

        {/* The context step: the door has been chosen, the box becomes "add anything that matters". */}
        {allowed && !draws && door && (
          <div className="space-y-5">
            <button onClick={() => { setDoor(null); setFrame(null); setFrameOpen(false); setFrameDetail(''); setQuestion(''); setError(''); setBiggerOpen(false); }}
              className="rounded-lg border border-zinc-700/60 px-3 py-1.5 text-[0.9375rem] text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 transition-colors">&larr; Something else</button>

            {door.viaDaily && <p className="text-[0.625rem] uppercase tracking-wider text-amber-400/80">Chosen for you today: {door.label}</p>}
            <p className="text-lg text-zinc-200 font-light break-words">{door.breath}</p>

            {/* THE STARTERS (Keel's spec, section 3): five pills in one universal grammar, worded per
                area. Tapping one FILLS the box, editable. The free field is never gated behind them. */}
            {!door.viaDaily && STARTERS[door.id] && (
              <div className="flex flex-col gap-2">
                {STARTER_KINDS.filter((k) => k.key !== 'bigger').map((k) => (
                  <button key={k.key} onClick={() => { setQuestion(STARTERS[door.id][k.key]); setError(''); setTimeout(() => { try { contextRef.current?.focus(); } catch {} }, 0); }}
                    className="pill-breathe text-left rounded-lg border border-zinc-700/60 px-3 py-2 text-[0.9375rem] text-zinc-200 break-words"
                    style={{ '--pill': '251 191 36' }}>
                    <span className="block text-[0.625rem] uppercase tracking-wider text-zinc-500 mb-0.5">{k.label}</span>
                    {STARTERS[door.id][k.key]}
                  </button>
                ))}
                <button onClick={() => setBiggerOpen(!biggerOpen)}
                  className="self-center flex items-center gap-1 text-[0.8125rem] text-zinc-400 hover:text-zinc-200 transition-colors">
                  A bigger question
                  <svg className={`w-3.5 h-3.5 transition-transform ${biggerOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                {biggerOpen && (
                  <div className="flex flex-col gap-2">
                    {STARTERS[door.id].bigger.map((bq) => (
                      <button key={bq} onClick={() => { setQuestion(bq); setError(''); setTimeout(() => { try { contextRef.current?.focus(); } catch {} }, 0); }}
                        className="pill-breathe text-left rounded-lg border border-violet-700/50 bg-violet-950/20 px-3 py-2 text-[0.9375rem] text-violet-100 break-words"
                        style={{ '--pill': '167 139 250' }}>
                        {bq}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-[0.9375rem] text-zinc-300 mb-1">
                Or ask it in your own words
              </label>
              <p className="text-xs text-zinc-500 mb-2">Tapping one above fills this box. Edit it, or draw as it stands.</p>
              <div className="relative">
                <div className="content-pane rounded-xl">
                  <textarea ref={contextRef} value={question} onChange={(e) => setQuestion(e.target.value)} rows={5}
                    placeholder="Whatever you would actually say out loud. A sentence or two is plenty."
                    className="block w-full rounded-xl bg-zinc-900/70 border border-zinc-700/60 p-4 pb-16 text-base text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500/60" />
                </div>
              {user && <MicButton className="absolute bottom-4 left-4" getAuth={voiceAuth} onStatus={(m) => setVoiceMsg(m)} onText={(txt) => { setQuestion((q) => (q.trim() ? `${q.trim()} ${txt}` : txt)); setWordless(false); try { contextRef.current?.focus(); } catch {} }} />} {/* .635 THE MIC */}
                <button onClick={begin} disabled={loading} className="group absolute bottom-4 right-4 z-10 flex items-center gap-2 px-4 py-1.5 rounded-lg border border-zinc-700/50 hover:border-zinc-600 bg-black/20 hover:bg-white/5 backdrop-blur-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
                  <span className="text-[0.8125rem] font-mono uppercase tracking-[0.2em] font-medium inline-flex items-center justify-center"
                  style={{ background: 'linear-gradient(90deg, #f87171, #fb923c, #facc15, #4ade80, #22d3ee, #a78bfa, #f472b6, #f87171)', backgroundSize: '200% 100%', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', animation: 'gradient-shift 3s ease infinite, field-breathe 3s ease-in-out infinite' }}>{loading ? '...' : 'Draw'}</span>
                  <svg className="w-3.5 h-3.5 text-white/60 group-hover:text-white/90 group-hover:translate-x-1 transition-all duration-200" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 2l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              </div>
            </div>
            {error && <p className="text-xs text-red-400 break-words">{error}</p>}
          </div>
        )}

        {allowed && draws && (
          <>
            {/* The original cards: the reference, not the reading */}
            <div data-ez-header="" className="flex flex-col items-center gap-5 mb-6 max-w-full" style={{ opacity: revealed ? 1 : 0, transition: 'opacity 600ms ease' }}>
              {draws.map((d, i) => (
                <CardWithMap key={i} draw={d} onInfo={openInfo} label={drawLabel(d)} stacked={animOn} />
              ))}
            </div>
            {/* THE MAP, laid over the whole screen while it plays. It is out of the page flow, so
                nothing clips it and nothing shifts; the cards fly to the page's own header
                underneath, and the overlay lifts when they land. */}
            {/* No tap-to-skip and no helper line: the founder cut both ("it looks like a
                helper or something"). The landing plays through; the reply waits for it. */}
            {animating && (
              <div data-ez-map="" className="fixed left-0 right-0 bottom-0 z-[90] select-none"
                style={{ top: overlayTop, background: 'rgba(9, 9, 11, 0.1)', opacity: overlayIn ? 1 : 0, pointerEvents: overlayIn ? 'auto' : 'none', transition: overlayIn ? 'opacity 900ms ease' : 'opacity 450ms ease' }}>
              {/* THE VIDEO BREATHES THROUGH (founder, 2026-09-16): the overlay is 10% black, barely
                  there, so the video plays under the map almost at full strength,
                  and the quicker fade-out brings the world back when the cards land. */}
                {landedWaiting && (
                  <div className="absolute left-0 right-0 flex justify-center pointer-events-none" style={{ top: '56vh' }}>
                    <Writing scroll={false} />
                  </div>
                )}
                <TheMap drawMap={{}} colorLayer="status" initialZoom={0.45} showLabels={false} showHouseLabels={false}
                  lowRes showControls={false} cameraRef={cameraRef} className="w-full h-full" />
              </div>
            )}
            <div style={{ opacity: revealed ? 1 : 0, transition: 'opacity 700ms ease' }}>
            {bench && (
              <div className="mb-4 rounded-md border border-fuchsia-700/50 bg-fuchsia-950/30 px-3 py-1.5 text-center text-[0.6875rem] uppercase tracking-wider text-fuchsia-200/90">
                layout bench — canned reading, no API calls, nothing saved
              </div>
            )}
            {/* .486: THE QUESTION, AT SIZE. It was text-xs zinc-500 — the smallest thing on the page — and the
                founder: "that should be one of the biggest things there, to ground you on what you asked." */}
            <div className="mb-7 text-center">
              <div className="text-[0.625rem] uppercase tracking-[0.2em] text-amber-300/60 mb-2">{(asked || question) ? 'You asked' : 'Drawn for'}</div>
              <p className="font-serif text-[1.375rem] sm:text-[1.5rem] leading-snug text-amber-100 break-words" style={{ textWrap: 'balance' }}>{(asked || question) ? `“${asked || question}”` : 'right now'}</p>{/* .630: a wordless reading has no quotation marks to show */}
              {/* .569: THE FRAME, ON THE READING — named by the Reader when none was chosen, or set by the person; change or clear it
                  here and the next turn is read inside the new one. */}
              {!bench && (frame || frameEdit) && (
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-[0.8125rem]">
                  {frame && <span className="rounded-full border border-emerald-500/50 bg-emerald-950/30 px-3 py-1 text-emerald-100">Topic: {frameLabel(frame)}{frame.auto ? <span className="text-emerald-300/60"> · the Reader's read</span> : null}</span>}
                  <button onClick={() => setFrameEdit(!frameEdit)} className="text-emerald-300/80 underline decoration-dotted hover:text-emerald-200">{frameEdit ? 'done' : 'change'}</button>
                  {frame && <button onClick={() => { setFrame(null); setFrameDetail(''); setFrameEdit(false); }} className="text-zinc-400 underline decoration-dotted hover:text-zinc-200">clear</button>}
                </div>
              )}
              {!bench && frameEdit && (
                <div className="mt-3 mx-auto max-w-xl rounded-xl border border-emerald-700/40 bg-emerald-950/15 p-3 space-y-2 text-left">
                  {topicChips((f) => { setFrame({ k: f.k, detail: f.ask ? (frame?.k === f.k ? frameDetail : '') : '' }); if (!f.ask) setFrameEdit(false); })}
                  {frame && frameOf(frame.k)?.ask && (
                    <input value={frameDetail} onChange={(e) => { setFrameDetail(e.target.value); setFrame({ k: frame.k, detail: e.target.value.trim() }); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') setFrameEdit(false); }}
                      placeholder={frameOf(frame.k).ask} maxLength={80}
                      className="w-full rounded-lg border border-emerald-700/40 bg-zinc-950/60 px-3 py-2 text-[0.9375rem] text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-400" />
                  )}
                  <div className="text-[0.75rem] text-emerald-200/70 text-center">The next turn is read inside this.</div>
                </div>
              )}
            </div>

            {/* One surface: the discourse in order */}
            <div className="space-y-5">
              {turns.map((t, ti) => (
                <div key={t.id} data-ez-turn={t.id}
                  style={{ opacity: t.pending ? 0 : 1, transition: 'opacity 600ms ease' }}
                  className={t.role === 'you'
                    ? 'ml-4 sm:ml-6 rounded-xl border border-amber-700/30 bg-amber-950/10 p-4 text-sm text-amber-100/90 italic break-words'
                    : t.role === 'catchup'
                      ? 'rounded-xl border border-violet-700/40 bg-violet-950/20 p-4 text-sm text-violet-100 break-words'
                    : t.role === 'wrap'
                      ? 'rounded-xl border border-emerald-700/40 bg-emerald-950/20 p-5 text-[1rem] leading-relaxed text-emerald-50 break-words flex flex-col' /* .702: a flex column so the move row can be ordered last, onto the line */
                      : 'relative rounded-xl border border-zinc-700/50 bg-zinc-900/60 p-4 text-[0.9375rem] leading-relaxed text-zinc-200 break-words'}>

                  {t.role === 'catchup' && <div className="text-[0.625rem] uppercase tracking-wider text-violet-300/70 mb-2">Where you are</div>}
                  {t.role === 'wrap' && <div className="text-[0.625rem] uppercase tracking-wider text-emerald-300/70 mb-2">The reading, written up</div>}
                  {t.role === 'you' && t.mode && (
                    <div className={`text-[0.625rem] uppercase tracking-wider mb-2 not-italic ${t.mode === 'reflect' ? 'text-sky-300/80' : t.mode === 'locate' ? 'text-violet-300/80' : 'text-orange-300/80'}`}>
                      {t.mode === 'reflect' ? '↩ Reflecting' : t.mode === 'locate' ? '◎ Finding it — the field points' : '⚡ Forging'}
                    </div>
                  )}
                  {t.role === 'you' && t.move && (
                    <div className="text-[0.625rem] uppercase tracking-wider mb-2 not-italic text-zinc-400/80">◇ {VOICE_REG(t.move) ? `in ${VOICE_LABELS[VOICE_REG(t.move)] || VOICE_REG(t.move)}` : t.move === 'example' ? 'an example' : t.move}</div>
                  )}
                  {t.role === 'reader' && t.act && (
                    <div className="text-[0.625rem] uppercase tracking-wider mb-2 text-zinc-500">one small thing</div>
                  )}

                  {/* A card drawn in answer to a reflect or a forge */}
                  {t.draw && (
                    <div className="flex justify-center mb-3">
                      {/* the same stacked pair + minimap as the header (founder, 2026-09-16) */}
                      <CardWithMap draw={t.draw} onInfo={openInfo} label={t.mode === 'locate' ? `the pointer — ${drawLabel(t.draw)}` : drawLabel(t.draw)} stacked />
                    </div>
                  )}

                  {/* .555: THE GIST — the thesis first; the body beneath, open unless folded */}
                  {t.role === 'reader' && t.gist && !t.pending && (
                    <div className="mb-4 flex items-start gap-2 rounded-lg border border-violet-500/30 bg-violet-950/25 px-3 py-2.5"> {/* .641: the gist in its own container, apart from the turn (and not spoken) */}
                      <div className="flex-1 min-w-0">
                        {/* .649: the box says what it is for (founder: "The thing the reading is saying you need to hear about <your topic>") */}
                        <div className="text-[0.625rem] uppercase tracking-[0.16em] text-violet-300/60 mb-1 break-words">
                          {`What the reading is saying${frame && frame.k !== 'now' && (frame.detail || frameLabel(frame)) ? ` about ${frame.detail || frameLabel(frame)}` : ''}`} {/* .650: no 'need to' / 'should' — the house's own grammar (Handing rule 2); .651: the subject in their words, not the category */}
                        </div>
                        <p className="text-[1.0625rem] leading-snug font-medium text-violet-200 break-words">{t.gist}</p>
                      </div>
                      <button onClick={() => toggleFold(t.id)} title={folded.has(t.id) ? 'show the whole turn' : 'fold the turn under its gist'} aria-label="fold"
                        className="shrink-0 mt-0.5 rounded-full border border-zinc-700/60 p-1 text-zinc-500 hover:text-zinc-200 hover:border-zinc-500">
                        <svg className={`w-3.5 h-3.5 transition-transform ${folded.has(t.id) ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </button>
                    </div>
                  )}
                  {!(t.role === 'reader' && t.gist && folded.has(t.id)) && ensureParagraphBreaks(t.text).split(/\n\n+/).filter((p) => p.trim()).map((p, i) => (
                    <p key={i} data-spoken={spokenKey(t.id, 'text', i)} className={'mb-3 last:mb-0 whitespace-pre-wrap break-words' + litIf(t.id, 'text', i)}>{p.trim()}</p>
                  ))}

                  {/* THE MEDICINE — its own container, because it is half the answer, not an aside.
                      The path is computed from the draw; the words come from the Reader. */}
                  {t.role === 'reader' && t.located && (
                    <p className="mt-3 text-xs text-violet-200/90 break-words"><span className="uppercase tracking-wider opacity-70 mr-2">Found</span>{t.located}</p>
                  )}
                  {t.role === 'reader' && t.medicine && !(t.draw || ti === firstReaderIdx) && (
                    <p data-spoken={spokenKey(t.id, 'medicine', 0)} className={'mt-3 text-xs text-emerald-300/80 italic break-words' + litIf(t.id, 'medicine', 0)}>◈ {t.medicine}</p>
                  )}
                  {t.role === 'reader' && t.medicine && (t.draw || ti === firstReaderIdx) && (
                    <div className="mt-3 rounded-lg border border-emerald-700/40 bg-emerald-950/20 p-3">
                      <div className="text-[0.625rem] uppercase tracking-wider text-emerald-300/80 mb-2">
                        {medicineFor(fieldAt(ti)).some((m) => m && !m.balanced) ? '◈ The medicine' : '◈ Where this can grow'}
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-3 mb-2">
                        {medicineFor(fieldAt(ti)).map((m, mi) => (
                          <div key={mi} className="flex flex-col items-center max-w-full">
                            <CardImage transient={m.toId} status={1} cardName={m.to} size="compact" showFrame={true}
                              onImageClick={() => openInfo({ type: 'card', id: m.toId, data: getComponent(m.toId) })} />
                            <span className="text-[0.6875rem] text-emerald-300/90 mt-1 text-center break-words">
                              {m.from} → {m.to}
                            </span>
                            {m.path && <span className="text-[0.625rem] text-emerald-500/60 text-center break-words">{m.path}</span>}
                          </div>
                        ))}
                      </div>
                      <div className="text-sm text-emerald-100/90 leading-relaxed break-words">
                        {ensureParagraphBreaks(t.medicine).split(/\n\n+/).filter((x) => x.trim()).map((x, xi) => (
                          <p key={xi} data-spoken={spokenKey(t.id, 'medicine', xi)} className={'mb-2 last:mb-0' + litIf(t.id, 'medicine', xi)}>{x.trim()}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* The question, handed over AFTER the move. Founder's ruling 2026-09-14:
                      a question composed without the medicine in view ignores the very thing
                      the person just read. */}
                  {t.role === 'reader' && t.question && (
                    <p data-spoken={spokenKey(t.id, 'question', 0)} className={'mt-4 text-[1.0625rem] leading-snug text-amber-300/90 break-words' + litIf(t.id, 'question', 0)}>{t.question}</p>
                  )}
                  {t.role === 'reader' && Array.isArray(t.next) && t.next.length > 0 && recOpen === t.id && ( // .662 (founder): the recommendations are revealed by the Recommend pill, and they ARE the buttons
                    <div className="mt-3 flex flex-wrap justify-center gap-2">
                      {t.next.map((n, ni) => (
                        <button key={ni} data-arm={`${t.id}-rec-${n.panel}`} onClick={() => openDoor(t, n.panel)} className="max-w-[18rem] rounded-xl border border-sky-500/60 bg-sky-950/30 px-3 py-2 text-left hover:bg-sky-900/40 transition-colors">
                          <div className="text-[0.9375rem] font-serif text-sky-100">{NEXT_LABEL[n.panel] || n.panel}</div>
                          <div data-spoken={spokenKey(`${t.id}-next`, 'text', ni)} className={'mt-0.5 text-[0.8125rem] leading-snug text-sky-200/80 break-words' + litIf(`${t.id}-next`, 'text', ni)}>{n.why}</div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* .530: the geometry the Reader was handed — held from display until tapped (Keel) */}
                  {t.role === 'reader' && t.geometry && (
                    <details className="mt-3">
                      <summary className="cursor-pointer select-none text-[0.6875rem] uppercase tracking-wider text-zinc-500 hover:text-zinc-300">the geometry</summary>
                      <pre className="mt-2 whitespace-pre-wrap break-words text-[0.75rem] leading-relaxed text-zinc-400 font-mono">{t.geometry}</pre>
                    </details>
                  )}

                  {['reader', 'catchup', 'wrap'].includes(t.role) && !t.pending && !loading && ( // .655: under every frame the Reader prints; .702: on the wrap the row is ORDERED after the "did it land?" block (the frame is a flex column), so it sits on the line too
                    <div className={`mt-4 flex flex-wrap justify-center gap-1 px-1 sm:px-2 sm:-mb-4 sm:translate-y-1/2 ${t.role === 'wrap' ? 'order-last' : ''}`}> {/* .702 (founder): ONE visual language — every row sits ON the frame's bottom line; the wrap's frame is a flex column so the row is ordered last */} {/* .615: in the frame on a phone (a wrap stays inside the bubble); half off the border from sm up */} {/* .599: HALF OFF THE BORDER again (founder) — in normal flow, pulled onto the border and shifted down by half its own height, so a wrap grows DOWNWARD and stays centred on the edge (the .517 absolute straddle grew upward) */}
                      {/* .517: small, coloured, straddling the bottom border — half in, half out (founder, 2026-09-21) */}
                      {[['clarify', 'Clarify', 'say it so I can hold it — a register plainer, nothing lost', 'border-sky-500/60 text-sky-200 hover:bg-sky-950/70'], ['unpack', 'Unpack', 'the same turn with its seams showing: signature, seat, status, medicine', 'border-violet-500/60 text-violet-200 hover:bg-violet-950/70'], ['example', 'Example', 'one concrete scene where this shows up', 'border-amber-500/60 text-amber-200 hover:bg-amber-950/70']].map(([k, label, tip, tone]) => (
                        <button key={k} data-arm={`${t.id}-${k}`} onClick={twoTap(`${t.id}-${k}`, () => move(t.id, k), k)} title={tip}
                          className={`${armedCls(`${t.id}-${k}`)} rounded-full border bg-zinc-950 px-2 py-0.5 text-[0.625rem] sm:px-2.5 sm:text-[0.6875rem] tracking-wide whitespace-nowrap transition-colors ${tone}`}>
                          {label}
                        </button>
                      ))}
                      {/* .554: FIND IT, ON DEMAND — the field points whenever they ask, not only when the Reader offers a chip; .698 not on the wrap (founder: "contextually not relevant" there) */}
                      {t.role !== 'wrap' && <button data-arm={`${t.id}-find`} onClick={twoTap(`${t.id}-find`, () => send('Help me find which thing this is.', 'locate', { locate: 'the thing this turn is pointing at' }), 'find-it')} title="ask the field where it is — a locating signature is drawn and read as a pointer"
                        className={armedCls(`${t.id}-find`) + " rounded-full border bg-zinc-950 px-2 py-0.5 text-[0.625rem] sm:px-2.5 sm:text-[0.6875rem] tracking-wide whitespace-nowrap transition-colors border-violet-500/60 text-violet-200 hover:bg-violet-950/70"}>
                        Find it
                      </button>}
                      {Array.isArray(t.next) && t.next.length > 0 && ( // .662: Recommend — one tap reveals the Reader's recommended doors as buttons (the buttons are the second choice, so no arming)
                        <button data-arm={`${t.id}-recommend`} onClick={() => revealNext(t)} title="the doors the Reader thinks you would want next, for this draw"
                          className={armedCls(`${t.id}-recommend`) + " rounded-full border bg-zinc-950 px-2 py-0.5 text-[0.625rem] sm:px-2.5 sm:text-[0.6875rem] tracking-wide whitespace-nowrap transition-colors border-sky-500/60 text-sky-200 hover:bg-sky-950/70"}>
                          {recOpen === t.id ? 'Hide' : 'Recommend'}
                        </button>
                      )}
                    </div>
                  )}

                  {/* DID IT LAND? (.511) — after the write-up, three taps in the reading's own voice. Not a survey:
                      did you figure it out? The mark is saved with the reading, carried into its summary, and the
                      Personalized suggester reads it — an open thread is the best next question; a landed one is done. */}
                  {t.role === 'wrap' && !loading && (
                    <div className="mt-4 text-center">
                      <div className="text-[0.625rem] uppercase tracking-[0.18em] text-emerald-300/60 mb-2">{resolution ? 'noted' : 'did it land?'}</div>
                      <div className="flex flex-wrap justify-center gap-2">
                        {[['landed', "I've got it"], ['open', 'Still turning it over'], ['missed', "That wasn't it"]].map(([k, label]) => (
                          <button key={k} onClick={() => markLanding(k)}
                            className={`px-3 py-1.5 rounded-lg border text-[0.8125rem] transition-colors ${resolution === k ? 'border-emerald-400/70 bg-emerald-950/40 text-emerald-100' : 'border-zinc-700/60 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500'}`}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              ))}
              {loading && <Writing scroll={!animating && !animPending} />}
              {error && <div className="text-xs text-red-400 pl-2 break-words">{error}</div>}
              <div ref={endRef} />
            </div>

            {/* .553: AN OPEN DOOR'S ANSWER, RIGHT UNDER THE LAST TURN (founder: 'never end the last post without having some
                choices underneath it and the capability to enter something custom'). The box and the pills stay the last thing on the page. */}
            {(brazierOpen || stepOpen || dragonOpen || medOpen) && <div className={dimPanels}>{renderPanels('open')}</div>}

            {wrapped && ( // .661 (Keel §8): the wrap-up block sits ABOVE the box, in this order — saved · Keep a copy · Start a new reading · keep talking — so the place you type is beneath its last line
              <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 text-center flex flex-col items-center gap-3">
                <p className="text-[0.9375rem] text-zinc-300">This reading is saved. You'll find it again any time — tap <span className="text-zinc-100">Load</span> on the first screen.</p>
                <button onClick={exportMarkdown} className="rounded-lg border border-zinc-700 px-4 py-2 text-[0.9375rem] text-zinc-200 hover:border-zinc-500 transition-colors">Keep a copy</button>
                <button onClick={reset} className="rounded-lg border border-amber-600/60 px-4 py-2 text-[0.9375rem] text-amber-100 hover:border-amber-400 hover:bg-amber-950/30 transition-colors">Start a new reading</button>
                <p className="text-xs text-zinc-600">Or keep talking below — nothing is closed off.</p>
              </div>
            )}

            {/* .698 (founder): THE QUESTION, IN ITS OWN FRAME, ALWAYS RIGHT ABOVE THE BOX — once the open doors push the turn up the page, the
                suggested answers make no sense without the question they answer. The turn still shows it in place; this copy is not spoken. */}
            {lastReader?.question && !wrapped && (
              <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-950/15 px-4 py-3">
                <div className="text-[0.625rem] uppercase tracking-[0.16em] text-amber-300/60 mb-1">The question</div>
                <p className="text-[1.0625rem] leading-snug text-amber-200/95 break-words">{lastReader.question}</p>
              </div>
            )}
            <div className={dimBox}>
            {/* THE BOX, RIGHT UNDER THE OUTPUT (founder, 2026-09-21): answer in your own words first; the pills,
                the doors and the wrap-up follow below. Say sits INSIDE the box, bottom-right, the rainbow word
                with the chevron — the same treatment as Ask on the front box (founder, 2026-09-16 night) */}
            <div className="mt-4 relative">
              <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={3}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(undefined, undefined, claiming ? { claim: true } : undefined); setClaiming(false); } }}
                placeholder={claiming ? 'Name it in your own words — whatever you have got…' : fieldMode === 'reflect' ? 'Ask the field…' : fieldMode === 'forge' ? 'Declare what you will do…' : 'Answer in your own words…'}
                style={{ '--pill': '251 191 36' }} className="pill-breathe block w-full resize-y rounded-xl bg-zinc-900/70 border border-zinc-700/60 px-4 pt-3 pb-14 text-[1.0625rem] leading-relaxed text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500/60" />
              {user && <MicButton className="absolute bottom-3 left-3" getAuth={voiceAuth} onStatus={(m) => setVoiceMsg(m)} onText={(txt) => setInput((v) => (v.trim() ? `${v.trim()} ${txt}` : txt))} />} {/* .635 THE MIC */}
              <button onClick={() => { send(undefined, undefined, claiming ? { claim: true } : undefined); setClaiming(false); }} disabled={loading || !input.trim()} style={{ borderColor: '#2447c9' }} className="group absolute bottom-3 right-3 z-10 flex items-center gap-2 px-4 py-1.5 rounded-lg border hover:brightness-125 bg-black/20 hover:bg-white/5 backdrop-blur-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
                <span className="text-[0.8125rem] font-mono uppercase tracking-[0.2em] font-medium inline-flex items-center justify-center"
                  style={{ background: 'linear-gradient(90deg, #f87171, #fb923c, #facc15, #4ade80, #22d3ee, #a78bfa, #f472b6, #f87171)', backgroundSize: '200% 100%', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', animation: 'gradient-shift 3s ease infinite' }}>{loading ? '...' : fieldMode ? 'Draw' : 'Say it'}</span>
                <svg className="w-3.5 h-3.5 text-white/60 group-hover:text-white/90 group-hover:translate-x-1 transition-all duration-200" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 2l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>

            </div>
            <div className={dimTop}>
            {/* Tier 2: the two switches — flipping one re-renders the pills below */}
            <div className="mt-5 flex items-stretch gap-2">
              {switchBtn('reflect', 'Reflect', '↩')}
              {switchBtn('forge', 'Forge', '⚡')}
            </div>
            <div className="mt-1 flex justify-between text-[0.6875rem]">
              <button onClick={() => setExplain(explain === 'reflect' ? null : 'reflect')} className="text-zinc-500 hover:text-sky-300 underline decoration-dotted">what is Reflect?</button>
              <button onClick={() => setExplain(explain === 'forge' ? null : 'forge')} className="text-zinc-500 hover:text-orange-300 underline decoration-dotted">what is Forge?</button>
            </div>
            </div>

            {explain && (
              <div className={`mt-3 rounded-lg border p-3 text-sm break-words ${explain === 'reflect' ? 'border-sky-700/40 bg-sky-950/20 text-sky-100' : 'border-orange-700/40 bg-orange-950/20 text-orange-100'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    {explain === 'reflect' ? (
                      <>
                        <p className="font-medium mb-1">Reflect — you ask, the field answers.</p>
                        <p className="text-[0.8125rem] opacity-90">Use it when you genuinely do not know something and want the architecture to speak to it. You put a question; a new signature is drawn and read as the answer to that question, in light of the reading already on the table.</p>
                      </>
                    ) : (
                      <>
                        <p className="font-medium mb-1">Forge — you declare, the field responds.</p>
                        <p className="text-[0.8125rem] opacity-90">Use it when you are not asking but stating: what you will do, choose, commit to, or stop. A new signature is drawn as the architecture&rsquo;s response to your declaration. It may affirm it, complicate it, or redirect it.</p>
                      </>
                    )}
                    <p className="text-xs opacity-60 mt-2">Either way the original signatures never change. A new signature is a lens, not a replacement.</p>
                  </div>
                  <button onClick={() => setExplain(null)} className="text-xs opacity-60 hover:opacity-100">close</button>
                </div>
              </div>
            )}

            <div className={dimPills}>
            {/* Tier 1: the pills. Talk by default; questions under Reflect; declarations under Forge. */}
            {activePills.length > 0 && !loading && (
              <div className="mt-3 flex flex-col gap-2">
                {activePills.filter((c) => c?.text).map((c, i) => (
                  <button key={i} data-arm={`chip-${i}`} onClick={twoTap(`chip-${i}`, () => send(c.text, c.kind === 'locate' ? 'locate' : fieldMode, c.kind === 'locate' ? { locate: c.what || c.text } : undefined), null)} disabled={regenning}
                    style={{ '--pill': CHIP_RGB[c.kind] || CHIP_RGB.build }}
                    className={`pill-breathe flex items-baseline gap-2 text-left rounded-lg border px-3 py-2 text-sm transition-colors disabled:opacity-40 ${CHIP_STYLE[c.kind] || CHIP_STYLE.build}`}>
                    {/* a fixed label column (sized to PUSH BACK) so every pill's text starts at the same x */}
                    {CHIP_LABEL[c.kind] && <span className="w-[7.6em] shrink-0 text-[0.625rem] uppercase tracking-wider opacity-70">{CHIP_LABEL[c.kind]}</span>}
                    <span className="flex-1 min-w-0 break-words">{c.text}</span>
                  </button>
                ))}
                {lastReader?.suggest && !loading && (() => {
                  const sg = lastReader.suggest;
                  const tone = sg.kind === 'reflect' ? 'border-sky-500/60 text-sky-100 bg-sky-950/30 hover:bg-sky-900/40'
                    : sg.kind === 'forge' ? 'border-orange-500/60 text-orange-100 bg-orange-950/30 hover:bg-orange-900/40'
                      : 'border-violet-400/60 text-violet-100 bg-violet-950/30 hover:bg-violet-900/40';
                  const label = sg.kind === 'reflect' ? '↩ Ask the field this' : sg.kind === 'forge' ? '⚡ Declare this' : '◇ Find which thing this is';
                  return (
                    <button onClick={() => send(sg.text, sg.kind === 'locate' ? 'locate' : sg.kind, sg.kind === 'locate' ? { locate: sg.what || sg.text } : undefined)}
                      className={`text-left rounded-lg border px-3 py-2 text-sm transition-colors break-words ${tone}`}>
                      <span className="block text-[0.625rem] uppercase tracking-wider opacity-70 mb-0.5">{label}</span>
                      {sg.text}
                    </button>
                  );
                })()}
                {lastReader?.locating && !lastReader.located && !loading && (
                  <div className="flex flex-wrap justify-center gap-2 mt-1">
                    <button onClick={() => { setClaiming(true); try { document.querySelector('textarea[placeholder]')?.focus(); } catch {} }}
                      className="px-3 py-1.5 rounded-full border border-violet-500/40 text-[0.8125rem] text-violet-200 hover:bg-violet-900/20">
                      I've got it — let me name it
                    </button>
                    <button onClick={() => send("That's close enough — let's go with that.", undefined, { claim: true })}
                      className="px-3 py-1.5 rounded-full border border-zinc-600/60 text-[0.8125rem] text-zinc-300 hover:bg-zinc-800/40">
                      Close enough
                    </button>
                    {/* .539: ask the field again — another locating card, another pointer */}
                    <button onClick={() => send('Point again.', 'locate', { locate: lastReader.locating.what })}
                      className="px-3 py-1.5 rounded-full border border-violet-500/40 text-[0.8125rem] text-violet-200 hover:bg-violet-900/20">
                      Point again
                    </button>
                  </div>
                )}
                {closingOffered && !loading && (
                  <button onClick={closeUp}
                    className="text-left rounded-lg border border-emerald-600/50 bg-emerald-950/25 px-3 py-2 text-sm text-emerald-100 hover:bg-emerald-900/30 transition-colors break-words">
                    <span className="block text-[0.625rem] uppercase tracking-wider opacity-70 mb-0.5">that may be the whole of it</span>
                    Pull it together
                  </button>
                )}
                {regenning ? <Writing className="self-center mt-1" label={STAGE.choices[0]} scroll={false} /> : (
                  <button data-arm="more" onClick={twoTap('more', () => regenPills(), 'more-choices')}
                    className={armedCls('more') + " self-center mt-1 px-4 py-2 rounded-full border border-amber-500/40 text-sm text-amber-300 hover:bg-amber-900/20 hover:border-amber-400 transition-colors"}>
                    ↻ More choices
                  </button>
                )}
              </div>
            )}

            {/* Free text always present */}
            </div>
            {/* the open door's answer now sits ABOVE the box (.553) — see below the turns */}

            {/* the doors still shut */}
            <div className={dimPanels}>{renderPanels('closed')}</div>

            {/* SUMMARIZE AND WRAP IT UP — the very bottom of the block (founder, 2026-09-21; was 'pull it together'
                inline under the latest message). The whole reading written up as one piece, then a clean stop. */}
            {turns.length > 0 && !loading && ( // .646: CATCH ME UP as a pill above the wrap-up (was the 'Where am I?' link — founder: confusing)
              <div className="mt-6 flex justify-center">
                <button data-arm="catchup" onClick={twoTap('catchup', catchUp, 'catch-me-up')}
                  className={armedCls('catchup') + " rounded-full border border-sky-600/50 bg-sky-950/20 px-5 py-2 text-[0.875rem] font-serif text-sky-100 hover:bg-sky-900/30 transition-colors"}>
                  Catch me up
                </button>
              </div>
            )}
            {!wrapped && turns.length > 0 && !loading && (
              <div className="mt-3 flex justify-center">
                <button data-arm="wrap" onClick={twoTap('wrap', closeUp, 'summarize-and-wrap-up')}
                  className={armedCls('wrap') + " rounded-full border border-emerald-600/50 bg-emerald-950/20 px-5 py-2 text-[0.875rem] font-serif text-emerald-100 hover:bg-emerald-900/30 transition-colors"}>
                  Summarize and wrap it up
                </button>
              </div>
            )}
            {turns.length > 0 && !loading && ( // .645: a New question button beneath the wrap-up (founder)
              <div className="mt-3 flex justify-center">
                <button data-arm="new" onClick={twoTap('new', reset, null)}
                  className={armedCls('new') + " rounded-full border border-amber-600/50 bg-amber-950/20 px-5 py-2 text-[0.875rem] font-serif text-amber-100 hover:bg-amber-900/30 transition-colors"}>
                  New question
                </button>
              </div>
            )}


            <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
              <button onClick={exportMarkdown} className="underline decoration-dotted hover:text-zinc-300">Export</button> {/* .662: Catch me up, New question and Summarize left this row — the pills carry them (founder) */}
              <span className="ml-auto font-mono text-zinc-600" title="fresh input / cached input (billed at 10%) / output">
                {(usage.input_tokens || 0).toLocaleString()} + {((usage.cache_read_input_tokens || 0) + (usage.cache_creation_input_tokens || 0)).toLocaleString()} cached / {(usage.output_tokens || 0).toLocaleString()} out · ~${estCost.toFixed(3)}{savedId ? ' · saved' : ''}
              </span>
              {voiceSpend.pieces > 0 && ( // .613: the voice, priced from the measured compute seconds (Replicate T4), beside the words
                <span className="font-mono text-zinc-600" title="the voice: letters spoken / seconds of compute (Replicate T4) · pieces">
                  voice {voiceSpend.chars.toLocaleString()} letters / {voiceSpend.secs.toFixed(1)} s · ~${voiceSpend.usd.toFixed(4)} · {voiceSpend.pieces} piece{voiceSpend.pieces === 1 ? '' : 's'}
                </span>
              )}
            </div>

            {/* THE COST LEDGER (.447) — admins and the bench. One row per call. "cold" = this call
                had to WRITE the prompt cache (125% of input) instead of reading it (10%). */}
            {(ledger.length > 0 || voiceSpend.pieces > 0) && ( // .520: the cost ledger is open to everyone for now (founder, 2026-09-21) — was admin/bench only · .615: or the voice alone
              <div className="mt-2 text-xs text-zinc-500">
                <button onClick={() => setLedgerOpen(!ledgerOpen)} className="underline decoration-dotted hover:text-zinc-300">
                  {ledgerOpen ? 'hide' : 'show'} the cost ledger · {ledger.length} call{ledger.length === 1 ? '' : 's'} · {ledger.filter((r) => r.written > 0).length} cold{voiceSpend.pieces > 0 ? ` · voice ${voiceSpend.pieces} piece${voiceSpend.pieces === 1 ? '' : 's'} ${(voiceSpend.usd * 100).toFixed(2)}¢` : ''}
                </button>
                {ledgerOpen && (
                  <div className="mt-2 overflow-x-auto">
                    <table className="font-mono text-[0.6875rem] text-zinc-400 tabular-nums">
                      <thead className="text-zinc-600">
                        <tr><th className="text-left pr-3">call</th><th className="text-left pr-3">door</th><th className="text-right pr-3">fresh</th><th className="text-right pr-3">written</th><th className="text-right pr-3">read</th><th className="text-right pr-3">out</th><th className="text-right pr-3">¢</th><th className="text-right pr-3">s</th><th className="text-left"></th></tr>
                      </thead>
                      <tbody>
                        {ledger.map((r, i) => (
                          <tr key={i} className={r.written > 0 ? 'text-amber-300/80' : ''}>
                            <td className="pr-3 whitespace-nowrap">{r.purpose}</td>
                            <td className="pr-3 whitespace-nowrap text-zinc-500" title={r.model || ''}>{r.provider ? <span className={r.provider === 'anthropic' ? 'text-amber-300/80' : r.provider === 'openrouter' ? 'text-cyan-300/80' : 'text-zinc-300'}>{r.provider}</span> : null}{r.provider ? ' · ' : ''}{String(r.model || '').replace(/^deepseek\/deepseek-/, '').replace(/^claude-/, '')}</td>
                            <td className="text-right pr-3">{r.fresh.toLocaleString()}</td>
                            <td className="text-right pr-3">{r.written.toLocaleString()}</td>
                            <td className="text-right pr-3">{r.read.toLocaleString()}</td>
                            <td className="text-right pr-3">{r.out.toLocaleString()}</td>
                            <td className="text-right pr-3">{r.cents.toFixed(2)}</td>
                            <td className="text-right pr-3">{(r.ms / 1000).toFixed(1)}</td>
                            <td>{r.written > 0 ? 'cold' : ''}</td>
                          </tr>
                        ))}
                        <tr className="text-zinc-300 border-t border-zinc-800">
                          <td className="pr-3 pt-1 whitespace-nowrap">{voiceSpend.pieces > 0 ? 'total, words' : 'total'}</td>
                          <td></td>
                          <td className="text-right pr-3 pt-1">{ledger.reduce((a, r) => a + r.fresh, 0).toLocaleString()}</td>
                          <td className="text-right pr-3 pt-1">{ledger.reduce((a, r) => a + r.written, 0).toLocaleString()}</td>
                          <td className="text-right pr-3 pt-1">{ledger.reduce((a, r) => a + r.read, 0).toLocaleString()}</td>
                          <td className="text-right pr-3 pt-1">{ledger.reduce((a, r) => a + r.out, 0).toLocaleString()}</td>
                          <td className="text-right pr-3 pt-1">{ledger.reduce((a, r) => a + r.cents, 0).toFixed(2)}</td>
                          <td></td><td></td>
                        </tr>
                        {voiceSpend.pieces > 0 && ( // .615 THE VOICE ROW: pieces · letters · compute seconds (Replicate T4) · cents
                          <tr className="text-amber-200/80">
                            <td className="pr-3 pt-1 whitespace-nowrap">voice</td>
                            <td className="pr-3 pt-1 whitespace-nowrap text-zinc-500">{VOICE_LABEL[voiceName] || 'George'} · {voiceSpend.pieces} piece{voiceSpend.pieces === 1 ? '' : 's'}</td>
                            <td className="text-right pr-3 pt-1" title="letters spoken">{voiceSpend.chars.toLocaleString()}</td>
                            <td className="text-right pr-3 pt-1"></td><td className="text-right pr-3 pt-1"></td><td className="text-right pr-3 pt-1"></td>
                            <td className="text-right pr-3 pt-1">{(voiceSpend.usd * 100).toFixed(2)}</td>
                            <td className="text-right pr-3 pt-1">{voiceSpend.secs.toFixed(1)}</td>
                            <td className="pt-1">letters</td>
                          </tr>
                        )}
                        {voiceSpend.pieces > 0 && ( // .619 THE WHOLE READING: words + voice on one line (founder: "how much was this reading total, including the voice?")
                          <tr className="text-zinc-100 border-t border-zinc-800">
                            <td className="pr-3 pt-1 whitespace-nowrap">total, words + voice</td>
                            <td></td><td></td><td></td><td></td><td></td>
                            <td className="text-right pr-3 pt-1">{(ledger.reduce((a, r) => a + r.cents, 0) + voiceSpend.usd * 100).toFixed(2)}</td>
                            <td></td><td></td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
            </div>
          </>
        )}
      </main>
      </div>

      <AuthModal
        isOpen={authOpen}
        onClose={() => { setAuthOpen(false); setAllowed(null); checkGate(); }}
        initialMode={authMode}
      />

      {selectedInfo && (
        <InfoModal
          info={selectedInfo}
          onClose={() => { setSelectedInfo(null); setInfoHistory([]); }}
          setSelectedInfo={openInfo}
          showTraditional={false}
          canGoBack={infoHistory.length > 0}
          onGoBack={goBackInfo}
        />
      )}

      <div style={{ opacity: revealed ? 1 : 0, transition: 'opacity 600ms ease' }}><Footer /></div>
      {/* .483's always-on "full reader →" door was pulled 2026-09-30 (founder): the full reader is to be offered
          intentionally, at chosen moments, not as a standing button. The in-text link inside a reading remains. */}
    </div>
  );
}
