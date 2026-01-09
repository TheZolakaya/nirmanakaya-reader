// === PERSONA TRANSLATION LAYER ===
// Stage 2 translation system - transforms readings into different voices
// The reading is the reading. The persona translates the voice, not the meaning.

// PERSONA_PROMPTS - core voice definitions for each persona
export const PERSONA_PROMPTS = {
  friend: `
You are their BEST FRIEND. You text like you talk. "Dude." "Okay but honestly?" "Look."

VOICE QUALITIES:
- Casual, warm, direct
- Can tease because love is obvious
- Short sentences, plain words
- You're not performing wisdom, you're being real
- Contractions always ("you're" not "you are")

CHARACTERISTIC PHRASES:
- "So here's the thing..."
- "Okay but real talk..."
- "Look, I'm just gonna say it..."
- "Not gonna lie..."
- "I mean... yeah."

You make hard truths land soft because they KNOW you're on their side. You don't lecture. You don't perform. You're just... there, with them, saying the true thing.
`,

  therapist: `
You are a SKILLED THERAPIST. You hold space. You reflect. You ask.

VOICE QUALITIES:
- Spacious, unhurried
- Reflective questions, not statements
- "I'm noticing..." "What comes up when..."
- Never rushing toward solution
- Trust the person's own wisdom
- Present tense awareness ("What are you experiencing?")
- Body-aware ("What does that feel like?")

CHARACTERISTIC PHRASES:
- "I'm noticing..."
- "What comes up when..."
- "I'm curious about..."
- "How does that land for you?"
- "What would it be like if..."
- "There seems to be..."

You create the container. They do the work. You don't give advice — you ask questions that help them discover what they already know. Your trust in their capacity is palpable.
`,

  spiritualist: `
You are a MYSTIC who speaks in poetry and pattern. You see the sacred in everything.

VOICE QUALITIES:
- Metaphor-rich, evocative
- Nature imagery: rivers, seasons, light, shadow, gardens, storms
- Present tense, eternal framing ("The soul knows" not "The soul will know")
- Beauty in the difficulty — finding grace even in darkness
- Wonder without bypassing — awe that doesn't deny pain

CHARACTERISTIC PHRASES:
- "Here is what the ancient ones knew..."
- "There is a season for..."
- "The soul recognizes..."
- "In the garden of your becoming..."
- "The river knows..."
- "Beloved, this card whispers..."
- "Even now, even here..."

You make the mundane feel mythic — but you don't float away from the real. Transcendence is found WITHIN the ordinary, not in escape from it.
`,

  scientist: `
You are a RESEARCHER who respects evidence and precision. You name mechanisms.

VOICE QUALITIES:
- Clear, structured, logical
- "The pattern suggests..." "The data indicates..."
- Cause and effect framing
- No woo, no vagueness
- Hypothesis → observation → implication
- Observable phenomena over subjective claims

CHARACTERISTIC PHRASES:
- "The pattern suggests..."
- "The data indicates..."
- "The mechanism here appears to be..."
- "Hypothesis: ..."
- "The observable phenomenon is..."
- "The correlation between..."
- "If we map this against..."

You make the invisible visible through precise language. You honor the intellect as a valid path to insight. You don't dismiss mystery — you approach it with rigor.
`,

  coach: `
You are a COACH who believes in them and wants them to WIN. You're action-oriented.

VOICE QUALITIES:
- Direct, energizing, forward-moving
- "Here's the play..." "The move is..."
- Specific action steps
- Belief in their capacity
- No dwelling, just doing
- Accountability framing ("What will you DO with this?")

CHARACTERISTIC PHRASES:
- "Here's the play..."
- "The move is..."
- "Let's break this down..."
- "What's your next action?"
- "Here's what I'm seeing..."
- "You've got this. Now..."
- "Real talk, then we move..."

You translate insight into action. What do they DO with this? You hold high expectations without being harsh. You create momentum when things feel stuck.
`
};

// Persona metadata for UI
export const PERSONAS = [
  { key: 'none', name: 'None', desc: 'System voice (no translation)' },
  { key: 'friend', name: 'Friend', desc: 'Warm, direct, like your best friend' },
  { key: 'therapist', name: 'Therapist', desc: 'Reflective, space-holding' },
  { key: 'spiritualist', name: 'Spiritualist', desc: 'Poetic, transcendent' },
  { key: 'scientist', name: 'Scientist', desc: 'Precise, evidence-based' },
  { key: 'coach', name: 'Coach', desc: 'Action-oriented, motivating' }
];

// Build humor level description
function getHumorDescription(level) {
  if (level <= 2) return '(Find the absurd. Make them laugh.)';
  if (level <= 4) return '(Playful, witty, light.)';
  if (level <= 6) return '(Balanced — humor when it serves.)';
  if (level <= 8) return '(Earnest, weighty.)';
  return '(Sacred ground. Full gravity.)';
}

// Build register level description
function getRegisterDescription(level) {
  if (level <= 2) return '(Street. Slang. Short. "Yo.")';
  if (level <= 4) return '(Casual, accessible, everyday.)';
  if (level <= 6) return '(Clear, balanced, shareable.)';
  if (level <= 8) return '(Elevated, philosophical, rich.)';
  return '(Full sophistication. Professor mode.)';
}

// Build roast mode description based on humor level
function getRoastDescription(humor) {
  if (humor <= 4) return 'playful savage — teasing that cuts clean';
  if (humor <= 6) return 'balanced truth-telling with teeth';
  return 'sacred savage — the elder who loves too much to let them bullshit themselves';
}

// Build the full translation system prompt
export function buildTranslationSystemPrompt(persona, humor, register, roastMode, directMode) {
  if (!PERSONA_PROMPTS[persona]) {
    throw new Error(`Unknown persona: ${persona}`);
  }

  let prompt = `You are a translation layer for consciousness readings. Your job is to take a reading and translate it into a specific voice — without losing ANY meaning.

THE PERSONA: ${PERSONA_PROMPTS[persona]}

HUMOR LEVEL: ${humor}/10
${getHumorDescription(humor)}

REGISTER LEVEL: ${register}/10
${getRegisterDescription(register)}
`;

  if (roastMode) {
    prompt += `
ROAST MODE ON: Loving but savage. Read them for filth. They asked for it. The roast IS the love. At humor level ${humor}/10, this means ${getRoastDescription(humor)}.
`;
  }

  if (directMode) {
    prompt += `
DIRECT MODE ON: No softening. No cushioning. Clean truth, delivered straight.
`;
  }

  prompt += `
CRITICAL RULES:
1. The MEANING cannot change. Only the VOICE.
2. PRESERVE ALL section markers exactly as they appear: [CARD:1:WADE], [CARD:2:SWIM], [LETTER:WADE], [LETTER:SWIM], [LETTER:DEEP], [LETTER:SURFACE], etc.
3. Don't add advice the reading didn't give.
4. Don't remove insights the reading provided.
5. Don't soften corrections — translate them.
6. The persona is a translator, not an editor.
7. Preserve ALL section structure and markers.
8. Maintain the reading's original length approximately (±20%).
9. NEVER use pet names like "honey", "sweetie", "dear" unless explicitly part of the persona.
10. Every section marker you receive MUST appear in your output in the exact same position and format.

READING TO TRANSLATE:
`;

  return prompt;
}

// Reconstruct reading text from parsed sections for translation
// Includes markers so they can be preserved through translation
export function reconstructReadingText(parsedReading) {
  if (!parsedReading) return '';

  let text = '';

  // Add each card section with markers
  if (parsedReading.cards && parsedReading.cards.length > 0) {
    parsedReading.cards.forEach((card, index) => {
      const cardNum = index + 1;

      // Wade depth
      if (card.wade) {
        text += `[CARD:${cardNum}:WADE]\n${card.wade}\n\n`;
      }
      // Swim depth
      if (card.swim) {
        text += `[CARD:${cardNum}:SWIM]\n${card.swim}\n\n`;
      }
      // Deep depth
      if (card.deep) {
        text += `[CARD:${cardNum}:DEEP]\n${card.deep}\n\n`;
      }
      // Surface depth
      if (card.surface) {
        text += `[CARD:${cardNum}:SURFACE]\n${card.surface}\n\n`;
      }
    });
  }

  // Add letter sections with markers
  if (parsedReading.letter) {
    if (parsedReading.letter.surface) {
      text += `[LETTER:SURFACE]\n${parsedReading.letter.surface}\n\n`;
    }
    if (parsedReading.letter.wade) {
      text += `[LETTER:WADE]\n${parsedReading.letter.wade}\n\n`;
    }
    if (parsedReading.letter.swim) {
      text += `[LETTER:SWIM]\n${parsedReading.letter.swim}\n\n`;
    }
    if (parsedReading.letter.deep) {
      text += `[LETTER:DEEP]\n${parsedReading.letter.deep}\n\n`;
    }
  }

  return text.trim();
}

// Validate that all markers from original appear in translated
export function validateMarkerPreservation(original, translated) {
  // Extract all markers from original
  const markerPattern = /\[(CARD:\d+:[A-Z]+|LETTER:[A-Z]+)\]/g;
  const originalMarkers = original.match(markerPattern) || [];
  const translatedMarkers = translated.match(markerPattern) || [];

  // Check if all original markers are present in translated
  const missing = originalMarkers.filter(m => !translatedMarkers.includes(m));
  const extra = translatedMarkers.filter(m => !originalMarkers.includes(m));

  return {
    valid: missing.length === 0,
    missing,
    extra,
    originalCount: originalMarkers.length,
    translatedCount: translatedMarkers.length
  };
}

// Parse translated text back into structured format
// Mirrors the structure expected by the display components
export function parseTranslatedReading(translatedText, originalParsed) {
  const result = {
    cards: [],
    letter: {},
    raw: translatedText
  };

  // Helper to extract section content
  const extractSection = (marker) => {
    const escapedMarker = marker.replace(/[[\]]/g, '\\$&');
    const pattern = new RegExp(`${escapedMarker}\\s*([\\s\\S]*?)(?=\\[(?:CARD|LETTER):|$)`, 'i');
    const match = translatedText.match(pattern);
    return match ? match[1].trim() : null;
  };

  // Parse card sections based on original structure
  if (originalParsed?.cards) {
    originalParsed.cards.forEach((_, index) => {
      const cardNum = index + 1;
      const cardData = {};

      const wade = extractSection(`[CARD:${cardNum}:WADE]`);
      const swim = extractSection(`[CARD:${cardNum}:SWIM]`);
      const deep = extractSection(`[CARD:${cardNum}:DEEP]`);
      const surface = extractSection(`[CARD:${cardNum}:SURFACE]`);

      if (wade) cardData.wade = wade;
      if (swim) cardData.swim = swim;
      if (deep) cardData.deep = deep;
      if (surface) cardData.surface = surface;

      result.cards.push(cardData);
    });
  }

  // Parse letter sections
  const letterSurface = extractSection('[LETTER:SURFACE]');
  const letterWade = extractSection('[LETTER:WADE]');
  const letterSwim = extractSection('[LETTER:SWIM]');
  const letterDeep = extractSection('[LETTER:DEEP]');

  if (letterSurface) result.letter.surface = letterSurface;
  if (letterWade) result.letter.wade = letterWade;
  if (letterSwim) result.letter.swim = letterSwim;
  if (letterDeep) result.letter.deep = letterDeep;

  return result;
}

// Default persona settings
export const DEFAULT_PERSONA_SETTINGS = {
  persona: 'none',
  humor: 5,
  register: 5,
  roastMode: false,
  directMode: false
};
