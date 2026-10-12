// lib/promptSets.js — THE PROMPT-SET REGISTRY AND FLAG (Pass Two of the restructure, 2026-10-11). A second (and third) prompt set beside the
// Handing, selectable by name; the Handing's bytes are untouched and it stays the default. Selection: READER_PROMPT_SET on the server (the API
// door, the bench) and NEXT_PUBLIC_READER_PROMPT_SET on the client (the page assembles its own system prompt); a signed-in admin may override
// per request. Unset = 'handing' = exactly today's Reader. Rollback is unsetting it. Every pathway — the opening, later turns, the floors, the
// doors — reads the chosen set through systemFor / recordOpts / openingOpts, so a session is on one prompt throughout.
import { HANDING_SET } from './handingPrompt.js';
import { ezSystem } from './ezPrompts.js';
import { CONSTITUTION_SET, CONSTITUTION_SHORT_SET, CONSTITUTION_SHORT_V2_SET, LESSON_SITUATION_SET, LESSON_BODY_ONLY_SET, LESSON_FIELDS_SET, LESSON_WHY_SET } from './constitutionPrompt.js';
import { MERGE_SET } from './handingMergePrompt.js';

export const HANDING_PROMPT_SET = { name: 'handing', version: 'handing', BASE_SYSTEM: HANDING_SET.BASE_SYSTEM, EZ_RULES: HANDING_SET.EZ_RULES, REFERENCE: null, voiceRules: () => undefined, record: null, turn: { hunch: true, frameAsk: 'full', teleFor: null, dossierFor: null } };
export const PROMPT_SETS = { handing: HANDING_PROMPT_SET, merge: MERGE_SET, constitution: CONSTITUTION_SET, 'constitution-short': CONSTITUTION_SHORT_SET, 'constitution-short-v2': CONSTITUTION_SHORT_V2_SET, 'lesson-situation': LESSON_SITUATION_SET, 'lesson-bodyonly': LESSON_BODY_ONLY_SET, 'lesson-fields': LESSON_FIELDS_SET, 'lesson-why': LESSON_WHY_SET }; // the four lessons (pass three, bench-only)
export const PROMPT_SET_NAMES = Object.keys(PROMPT_SETS);
export const DEFAULT_PROMPT_SET = String((typeof process !== 'undefined' && process.env && (process.env.READER_PROMPT_SET || process.env.NEXT_PUBLIC_READER_PROMPT_SET)) || 'handing').toLowerCase();
/** The set for a name; an unknown or empty name is the default, and an unknown default is the Handing. */
export const promptSetFor = (name) => PROMPT_SETS[String(name || '').toLowerCase()] || PROMPT_SETS[DEFAULT_PROMPT_SET] || HANDING_PROMPT_SET;
/** The base for a voice: the set's base, plus its reference block for the voices that may say the map's words. */
export const baseFor = (set, voice) => (set.REFERENCE && Array.isArray(set.turn?.teleFor) && set.turn.teleFor.includes(voice) ? `${set.BASE_SYSTEM}\n\n${set.REFERENCE}` : set.BASE_SYSTEM);
/** The assembled system prompt for a set and a voice, through the same seam the page and the bench use (ezSystem). */
export const systemFor = (set, voice, over = {}) => { const vr = typeof over.voiceRules === 'string' ? over.voiceRules : set.voiceRules(voice); return ezSystem(typeof over.base === 'string' ? over.base : baseFor(set, voice), voice, { rules: typeof over.rules === 'string' ? over.rules : set.EZ_RULES, ...(typeof vr === 'string' ? { voiceRules: vr } : {}) }); };
/** Whether the geometry-and-teleology block / the structural dossier ride in the user turn for this voice. */
export const wantsTele = (set, voice) => !Array.isArray(set.turn?.teleFor) || set.turn.teleFor.includes(voice);
export const wantsDossier = (set, voice) => !Array.isArray(set.turn?.dossierFor) || set.turn.dossierFor.includes(voice);
/** What the set asks of the record (null = today's bytes). */
export const recordOpts = (set) => set.record || null;
/** What the set asks of the opening turn's composition. */
export const openingOpts = (set) => ({ hunch: set.turn?.hunch !== false, frameAsk: set.turn?.frameAsk || 'full' });
/** The version tag a reading records: the package version alone for the Handing, else with the set's name. */
export const versionTag = (version, set) => (set && set.name !== 'handing' ? `${version}+${set.name}` : version);
