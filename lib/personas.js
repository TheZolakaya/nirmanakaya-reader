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

// Build humor level description - MORE EXTREME
function getHumorDescription(level) {
  if (level <= 2) return `MAXIMUM COMEDY MODE. This is stand-up. Find the absurd in EVERYTHING. Make jokes. Be genuinely funny. Use comedic timing. Exaggerate for effect. "Bruh, your cards are basically saying..." The reading should make them LAUGH OUT LOUD. Don't hold back - be hilarious.`;
  if (level <= 4) return `Very playful and witty throughout. Jokes land frequently. Light banter energy. "Okay so get this..." Humor woven into every paragraph.`;
  if (level <= 6) return '(Balanced — humor when it serves the moment, but not forced.)';
  if (level <= 8) return '(Earnest and weighty. Humor is rare, only when organic.)';
  return '(Sacred ground. Full gravity. Every word lands with weight. No levity.)';
}

// Build register level description - MORE EXTREME
function getRegisterDescription(level) {
  if (level <= 2) return `FULL STREET MODE. Talk like you're texting your homie. "Yo." "Bruh." "Nah fr tho." "That's wild." "Lowkey/highkey." Short punchy sentences. Slang is mandatory. Drop the g's ("sayin" not "saying"). This should sound like actual casual speech, not formal writing pretending to be casual.`;
  if (level <= 4) return `Casual everyday speech. Contractions everywhere. "Gonna" "wanna" "kinda". Like chatting with a friend over coffee. No formal language at all.`;
  if (level <= 6) return '(Clear and accessible. Could share with anyone. Neither casual nor formal.)';
  if (level <= 8) return '(Elevated and philosophical. Rich vocabulary. Sentences breathe.)';
  return '(Full academic sophistication. Dense, luminous prose. Professor of meaning.)';
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
2. PRESERVE ALL section markers exactly as they appear:
   - Card markers: [CARD:1:WADE], [CARD:1:SWIM], [CARD:2:WADE], etc.
   - Letter markers: [LETTER:WADE], [LETTER:SWIM], [LETTER:DEEP]
   - Summary markers: [SUMMARY:WADE], [SUMMARY:SWIM], [SUMMARY:DEEP]
   - Path markers: [PATH:WADE], [PATH:SWIM], [PATH:DEEP]
3. Don't add advice the reading didn't give.
4. Don't remove insights the reading provided.
5. Don't soften corrections — translate them into the persona's voice.
6. The persona is a translator, not an editor.
7. Preserve ALL section structure and markers.
8. Maintain the reading's original length approximately (±20%).
9. NEVER use pet names like "honey", "sweetie", "dear" unless explicitly part of the persona.
10. Every section marker you receive MUST appear in your output in the exact same position and format.

IMPORTANT: You MUST fully commit to the humor and register levels. If humor is 1-2, be ACTUALLY FUNNY with jokes. If register is 1-2, use ACTUAL street slang and casual speech patterns throughout.

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

  // Add summary/overview sections with markers
  if (parsedReading.summary) {
    if (parsedReading.summary.surface) {
      text += `[SUMMARY:SURFACE]\n${parsedReading.summary.surface}\n\n`;
    }
    if (parsedReading.summary.wade) {
      text += `[SUMMARY:WADE]\n${parsedReading.summary.wade}\n\n`;
    }
    if (parsedReading.summary.swim) {
      text += `[SUMMARY:SWIM]\n${parsedReading.summary.swim}\n\n`;
    }
    if (parsedReading.summary.deep) {
      text += `[SUMMARY:DEEP]\n${parsedReading.summary.deep}\n\n`;
    }
  }

  // Add path sections with markers
  if (parsedReading.path) {
    if (parsedReading.path.surface) {
      text += `[PATH:SURFACE]\n${parsedReading.path.surface}\n\n`;
    }
    if (parsedReading.path.wade) {
      text += `[PATH:WADE]\n${parsedReading.path.wade}\n\n`;
    }
    if (parsedReading.path.swim) {
      text += `[PATH:SWIM]\n${parsedReading.path.swim}\n\n`;
    }
    if (parsedReading.path.deep) {
      text += `[PATH:DEEP]\n${parsedReading.path.deep}\n\n`;
    }
  }

  return text.trim();
}

// Validate that all markers from original appear in translated
export function validateMarkerPreservation(original, translated) {
  // Extract all markers from original - now includes SUMMARY and PATH
  const markerPattern = /\[(CARD:\d+:[A-Z]+|LETTER:[A-Z]+|SUMMARY:[A-Z]+|PATH:[A-Z]+)\]/g;
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
    summary: {},
    path: {},
    raw: translatedText
  };

  // Helper to extract section content - updated to match all marker types
  const extractSection = (marker) => {
    const escapedMarker = marker.replace(/[[\]]/g, '\\$&');
    const pattern = new RegExp(`${escapedMarker}\\s*([\\s\\S]*?)(?=\\[(?:CARD|LETTER|SUMMARY|PATH):|$)`, 'i');
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

  // Parse summary sections
  const summarySurface = extractSection('[SUMMARY:SURFACE]');
  const summaryWade = extractSection('[SUMMARY:WADE]');
  const summarySwim = extractSection('[SUMMARY:SWIM]');
  const summaryDeep = extractSection('[SUMMARY:DEEP]');

  if (summarySurface) result.summary.surface = summarySurface;
  if (summaryWade) result.summary.wade = summaryWade;
  if (summarySwim) result.summary.swim = summarySwim;
  if (summaryDeep) result.summary.deep = summaryDeep;

  // Parse path sections
  const pathSurface = extractSection('[PATH:SURFACE]');
  const pathWade = extractSection('[PATH:WADE]');
  const pathSwim = extractSection('[PATH:SWIM]');
  const pathDeep = extractSection('[PATH:DEEP]');

  if (pathSurface) result.path.surface = pathSurface;
  if (pathWade) result.path.wade = pathWade;
  if (pathSwim) result.path.swim = pathSwim;
  if (pathDeep) result.path.deep = pathDeep;

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
