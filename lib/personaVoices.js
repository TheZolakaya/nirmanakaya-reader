// The persona lane now lives in lib/ezPrompts.js (.712, live behind NEXT_PUBLIC_PERSONAS). This file keeps the lab's import path working.
import { VOICES, PERSONA_LAW, PERSONA_CARDS, PERSONA_ADDITIONS, PERSONA_KEYS } from './ezPrompts.js';
export { PERSONA_LAW, PERSONA_CARDS, PERSONA_ADDITIONS, PERSONA_KEYS };
/** The voice block for a lab name ('Plain', 'Friend', …). */
export const personaRules = (name) => (name === 'Plain' ? VOICES.plain.rules : VOICES[String(name).toLowerCase()]?.rules || '');
