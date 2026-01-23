# Glistener v2.1 — Implementation Code
## For Nirmanakaya Reader (Next.js 14)

**Based on:** GPT's Stochastic Constraint Engine Spec  
**Adapted by:** Claude (with codebase access)  
**Target:** `D:\NKYAWebApp\nirmanakaya-reader`

---

## 1. FILE STRUCTURE

```
nirmanakaya-reader/
├── app/
│   └── api/
│       └── glisten/
│           └── route.js          ← Main Glistener API
├── lib/
│   ├── glistener/
│   │   ├── dictionary.js         ← Pre-indexed word bank
│   │   ├── constraints.js        ← Letter constraint generation
│   │   ├── hunt.js               ← Word hunting algorithm
│   │   ├── weave.js              ← Prompt templates for AI passes
│   │   └── index.js              ← Main export
│   └── glistener-dictionary.json ← 50k words, pre-indexed
├── components/
│   └── reader/
│       └── Glistener.js          ← UI component
```

---

## 2. DICTIONARY MODULE

### `lib/glistener/dictionary.js`

```javascript
/**
 * Glistener Dictionary Module
 * Pre-indexed word bank for fast subsequence lookup
 * 
 * Structure: Map of subsequence -> array of words containing it
 * Built at startup from wordlist, cached in memory
 */

import wordList from '../glistener-dictionary.json';

// Pre-computed index: subsequence -> [words]
let INDEX = null;

/**
 * Check if word contains letter sequence (in order, not contiguous)
 */
export function containsSequence(word, letters) {
  let idx = 0;
  const target = letters.toLowerCase();
  for (const char of word.toLowerCase()) {
    if (char === target[idx]) {
      idx++;
      if (idx === target.length) return true;
    }
  }
  return false;
}

/**
 * Generate all 1-3 letter subsequences for a word
 */
function generateSubsequences(word) {
  const subs = new Set();
  const w = word.toLowerCase();
  
  // 1-letter
  for (const c of w) {
    subs.add(c);
  }
  
  // 2-letter (in order, not contiguous)
  for (let i = 0; i < w.length; i++) {
    for (let j = i + 1; j < w.length; j++) {
      subs.add(w[i] + w[j]);
    }
  }
  
  // 3-letter (in order, not contiguous)
  for (let i = 0; i < w.length; i++) {
    for (let j = i + 1; j < w.length; j++) {
      for (let k = j + 1; k < w.length; k++) {
        subs.add(w[i] + w[j] + w[k]);
      }
    }
  }
  
  return subs;
}

/**
 * Build the index (run once at startup or build time)
 */
export function buildIndex() {
  if (INDEX) return INDEX;
  
  INDEX = new Map();
  
  for (const word of wordList.words) {
    // Skip proper nouns, hyphenated, too short
    if (word.length < 3) continue;
    if (word.includes('-')) continue;
    if (word[0] === word[0].toUpperCase()) continue;
    
    const subs = generateSubsequences(word);
    for (const sub of subs) {
      if (!INDEX.has(sub)) {
        INDEX.set(sub, []);
      }
      INDEX.get(sub).push(word);
    }
  }
  
  return INDEX;
}

/**
 * Get all words matching a constraint
 */
export function getMatchingWords(constraint) {
  if (!INDEX) buildIndex();
  return INDEX.get(constraint.toLowerCase()) || [];
}

/**
 * Get a random word matching constraint (cryptographic RNG)
 */
export function getRandomMatch(constraint, rng) {
  const matches = getMatchingWords(constraint);
  if (matches.length === 0) return null;
  
  const idx = rng(matches.length);
  return matches[idx];
}
```

---

## 3. CONSTRAINT GENERATION

### `lib/glistener/constraints.js`

```javascript
/**
 * Glistener Constraint Generation
 * Uses cryptographic RNG for veil integrity
 */

import crypto from 'crypto';

// English letter frequency (Google Books corpus)
const LETTER_FREQ = {
  e: 0.127, t: 0.091, a: 0.082, o: 0.075, i: 0.070,
  n: 0.067, s: 0.063, r: 0.060, h: 0.061, l: 0.040,
  d: 0.043, c: 0.028, u: 0.028, m: 0.024, f: 0.022,
  p: 0.019, g: 0.020, w: 0.024, y: 0.020, b: 0.015,
  v: 0.010, k: 0.008, x: 0.002, j: 0.002, q: 0.001,
  z: 0.001
};

// Build cumulative distribution for weighted selection
const LETTERS = Object.keys(LETTER_FREQ);
const CUMULATIVE = [];
let sum = 0;
for (const letter of LETTERS) {
  sum += LETTER_FREQ[letter];
  CUMULATIVE.push({ letter, threshold: sum });
}

/**
 * Cryptographic random integer [0, max)
 */
export function cryptoRandomInt(max) {
  const bytes = crypto.randomBytes(4);
  const value = bytes.readUInt32BE(0);
  return value % max;
}

/**
 * Select a letter weighted by English frequency
 */
export function selectWeightedLetter() {
  const r = crypto.randomBytes(4).readUInt32BE(0) / 0xFFFFFFFF;
  for (const { letter, threshold } of CUMULATIVE) {
    if (r <= threshold) return letter;
  }
  return 'e'; // fallback
}

/**
 * Generate a single constraint (1-3 letters)
 * 
 * Length distribution:
 * - 1 letter: 20%
 * - 2 letters: 50%
 * - 3 letters: 30%
 */
export function generateConstraint() {
  const roll = cryptoRandomInt(100);
  let length;
  
  if (roll < 20) length = 1;
  else if (roll < 70) length = 2;
  else length = 3;
  
  let constraint = '';
  for (let i = 0; i < length; i++) {
    constraint += selectWeightedLetter();
  }
  
  return constraint;
}

/**
 * Generate 10 constraints for a Glisten session
 */
export function generateConstraintSet() {
  const constraints = [];
  for (let i = 0; i < 10; i++) {
    constraints.push(generateConstraint());
  }
  return constraints;
}
```

---

## 4. THE HUNT

### `lib/glistener/hunt.js`

```javascript
/**
 * Glistener Hunt Module
 * Finds words matching constraints with validation
 */

import { getRandomMatch, containsSequence } from './dictionary.js';
import { generateConstraint, cryptoRandomInt } from './constraints.js';

const MAX_REGENERATIONS = 1;

/**
 * Hunt for a word matching a constraint
 * Returns { word, constraint } or null
 */
export function huntWord(constraint) {
  const word = getRandomMatch(constraint, cryptoRandomInt);
  
  if (!word) return null;
  
  // Validate (belt and suspenders)
  if (!containsSequence(word, constraint)) {
    console.error(`Validation failed: ${word} does not contain ${constraint}`);
    return null;
  }
  
  return { word, constraint };
}

/**
 * Generate complete bone set (10 words)
 * Regenerates entire set if any fail after retry
 */
export function generateBoneSet() {
  for (let attempt = 0; attempt <= MAX_REGENERATIONS; attempt++) {
    const bones = [];
    let allValid = true;
    
    for (let i = 0; i < 10; i++) {
      let constraint = generateConstraint();
      let result = huntWord(constraint);
      
      // One retry per slot with new constraint
      if (!result) {
        constraint = generateConstraint();
        result = huntWord(constraint);
      }
      
      if (!result) {
        allValid = false;
        break;
      }
      
      bones.push(result);
    }
    
    if (allValid && bones.length === 10) {
      return { success: true, bones };
    }
  }
  
  return { success: false, bones: [], error: 'Failed to generate valid bone set' };
}

/**
 * Validate a bone set (two-pass)
 */
export function validateBoneSet(bones) {
  for (const { word, constraint } of bones) {
    if (!containsSequence(word, constraint)) {
      return { valid: false, error: `${word} does not contain ${constraint}` };
    }
  }
  return { valid: true };
}
```

---

## 5. THE WEAVE (PROMPTS)

### `lib/glistener/weave.js`

```javascript
/**
 * Glistener Weave Module
 * Prompt templates for AI interpretation passes
 */

/**
 * Step A: Symbolism — functional mapping
 */
export function buildSymbolismPrompt(bones) {
  const wordList = bones.map((b, i) => `${i + 1}. ${b.word}`).join('\n');
  
  return `You are given 10 words selected by constraint. These are "bones" — raw symbolic material.

For each word:
- Describe its FUNCTION (what it does, enables, or changes)
- Do not interpret emotionally
- One sentence per word
- No metaphors

Words:
${wordList}

Respond with exactly 10 numbered bullet points, one per word.`;
}

/**
 * Step B: Transmission — mythic tale
 */
export function buildTransmissionPrompt(bones, symbolism) {
  const wordList = bones.map(b => b.word).join(', ');
  
  return `You have 10 symbolic bones and their functions:

${symbolism}

Write a single short narrative using all 10 words exactly once.

Constraints:
- The narrative must include tension, movement, or choice
- Include at least one directional shift (e.g., "but", "until", "when", "then", "instead", "yet")
- No abstract states without action
- No interpretation or explanation
- The field speaks through you — reverent, layered, non-linear

Words to include: ${wordList}

Write the tale. Nothing else.`;
}

/**
 * Step C: Integration — plain meaning
 */
export function buildIntegrationPrompt(transmission) {
  return `Translate this symbolic tale into plain language:

"${transmission}"

Rules:
- No metaphor
- No poetry
- Explain what situation, tension, or decision is being described
- 3-5 sentences
- Speak directly about what's happening`;
}

/**
 * Crystal: Question distillation
 */
export function buildCrystalPrompt(integration) {
  return `From this grounded meaning, produce exactly ONE question:

"${integration}"

Rules:
- Must be first-person ("I", "my", or implied)
- Must involve action, choice, or responsibility
- Must end with a question mark
- No statements. No advice. No preamble.

Write only the question.`;
}

/**
 * Plain language toggle (post-crystal)
 */
export function buildPlainLanguagePrompt(transmission) {
  return `Rewrite this mythic tale as a simple paragraph:

"${transmission}"

- Use everyday language
- Keep all meaning intact
- No poetry or metaphor
- 3-4 sentences`;
}

/**
 * Validate transmission has directional shift
 */
export function validateTransmission(text) {
  const markers = /\b(but|until|when|then|instead|yet|however|although)\b/i;
  return markers.test(text);
}

/**
 * Validate crystal is a question
 */
export function validateCrystal(text) {
  const trimmed = text.trim();
  if (!trimmed.endsWith('?')) return false;
  if (trimmed.split('?').length > 2) return false; // multiple questions
  return true;
}
```

---

## 6. API ROUTE

### `app/api/glisten/route.js`

```javascript
/**
 * Glistener API Route
 * POST /api/glisten
 * 
 * Generates a complete Glisten session:
 * Bones → Symbolism → Transmission → Integration → Crystal
 */

import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { 
  generateBoneSet, 
  validateBoneSet 
} from '@/lib/glistener/hunt';
import {
  buildSymbolismPrompt,
  buildTransmissionPrompt,
  buildIntegrationPrompt,
  buildCrystalPrompt,
  buildPlainLanguagePrompt,
  validateTransmission,
  validateCrystal
} from '@/lib/glistener/weave';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MAX_RETRIES = 1;

async function callClaude(prompt, maxTokens = 1000) {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }]
  });
  
  return response.content[0].text;
}

export async function POST(request) {
  try {
    // ========== PHASE 1: BONES ==========
    const boneResult = generateBoneSet();
    
    if (!boneResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Failed to generate bones. Please try again.',
        phase: 'bones'
      }, { status: 500 });
    }
    
    const { bones } = boneResult;
    
    // Validate
    const validation = validateBoneSet(bones);
    if (!validation.valid) {
      return NextResponse.json({
        success: false,
        error: validation.error,
        phase: 'validation'
      }, { status: 500 });
    }
    
    // ========== PHASE 2: SYMBOLISM ==========
    const symbolismPrompt = buildSymbolismPrompt(bones);
    const symbolism = await callClaude(symbolismPrompt, 800);
    
    // ========== PHASE 3: TRANSMISSION ==========
    let transmission;
    for (let i = 0; i <= MAX_RETRIES; i++) {
      const transmissionPrompt = buildTransmissionPrompt(bones, symbolism);
      transmission = await callClaude(transmissionPrompt, 500);
      
      if (validateTransmission(transmission)) break;
      
      if (i === MAX_RETRIES) {
        // Proceed anyway — imperfect is better than failed
        console.warn('Transmission lacks directional marker, proceeding anyway');
      }
    }
    
    // ========== PHASE 4: INTEGRATION ==========
    const integrationPrompt = buildIntegrationPrompt(transmission);
    const integration = await callClaude(integrationPrompt, 400);
    
    // ========== PHASE 5: CRYSTAL ==========
    let crystal;
    for (let i = 0; i <= MAX_RETRIES; i++) {
      const crystalPrompt = buildCrystalPrompt(integration);
      crystal = await callClaude(crystalPrompt, 100);
      
      if (validateCrystal(crystal)) break;
      
      if (i === MAX_RETRIES) {
        // Force question mark if missing
        crystal = crystal.trim();
        if (!crystal.endsWith('?')) {
          crystal = crystal.replace(/[.!]?$/, '?');
        }
      }
    }
    
    // ========== RESPONSE ==========
    return NextResponse.json({
      success: true,
      bones: bones.map(b => ({
        constraint: b.constraint.toUpperCase(),
        word: b.word
      })),
      symbolism,
      transmission,
      integration,
      crystal: crystal.trim()
    });
    
  } catch (error) {
    console.error('Glistener error:', error);
    return NextResponse.json({
      success: false,
      error: 'An error occurred during the Glisten process.',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * POST /api/glisten/plain
 * Get plain language version of transmission
 */
export async function plainLanguage(transmission) {
  const prompt = buildPlainLanguagePrompt(transmission);
  return await callClaude(prompt, 300);
}
```

---

## 7. UI COMPONENT

### `components/reader/Glistener.js`

```javascript
/**
 * Glistener UI Component
 * Single-click scroll experience: Bones → Tale → Crystal
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const BONE_DELAY = 250;      // ms between bone reveals
const TALE_DELAY = 4000;     // ms between tale sentences
const CRYSTAL_DELAY = 1000;  // ms before crystal appears

export default function Glistener({ onComplete, onTransfer }) {
  const [phase, setPhase] = useState('idle'); // idle | loading | bones | tale | crystal | complete
  const [data, setData] = useState(null);
  const [visibleBones, setVisibleBones] = useState(0);
  const [visibleTale, setVisibleTale] = useState(0);
  const [showPlain, setShowPlain] = useState(false);
  const [plainText, setPlainText] = useState(null);
  const [error, setError] = useState(null);
  
  const startGlisten = async () => {
    setPhase('loading');
    setError(null);
    
    try {
      const response = await fetch('/api/glisten', { method: 'POST' });
      const result = await response.json();
      
      if (!result.success) {
        setError(result.error);
        setPhase('idle');
        return;
      }
      
      setData(result);
      setPhase('bones');
      
      // Reveal bones sequentially
      for (let i = 1; i <= 10; i++) {
        setTimeout(() => setVisibleBones(i), i * BONE_DELAY);
      }
      
      // Transition to tale after bones complete
      setTimeout(() => {
        setPhase('tale');
        const sentences = result.transmission.split(/(?<=[.!?])\s+/);
        
        for (let i = 1; i <= sentences.length; i++) {
          setTimeout(() => setVisibleTale(i), i * TALE_DELAY);
        }
        
        // Transition to crystal after tale complete
        setTimeout(() => {
          setPhase('crystal');
          setTimeout(() => setPhase('complete'), CRYSTAL_DELAY);
        }, (sentences.length + 1) * TALE_DELAY);
        
      }, 11 * BONE_DELAY + 500);
      
    } catch (err) {
      setError('Failed to connect. Please try again.');
      setPhase('idle');
    }
  };
  
  const handlePlainToggle = async () => {
    if (plainText) {
      setShowPlain(!showPlain);
      return;
    }
    
    // Fetch plain language version
    const response = await fetch('/api/glisten/plain', {
      method: 'POST',
      body: JSON.stringify({ transmission: data.transmission })
    });
    const result = await response.json();
    setPlainText(result.text);
    setShowPlain(true);
  };
  
  const handleTransfer = () => {
    if (onTransfer) {
      onTransfer(data.crystal);
    }
  };
  
  // ========== RENDER ==========
  
  if (phase === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <p className="text-gray-400 mb-6 text-center max-w-md">
          You have a feeling but no words.<br />
          Let the question find its shape.
        </p>
        <button
          onClick={startGlisten}
          className="px-8 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors"
        >
          GLISTEN
        </button>
        {error && (
          <p className="text-red-400 mt-4">{error}</p>
        )}
      </div>
    );
  }
  
  if (phase === 'loading') {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-pulse text-amber-400">
          Drawing from the field...
        </div>
      </div>
    );
  }
  
  const taleSentences = data?.transmission.split(/(?<=[.!?])\s+/) || [];
  
  return (
    <div className="p-8 max-w-2xl mx-auto">
      {/* BONES */}
      <AnimatePresence>
        {(phase === 'bones' || phase === 'tale' || phase === 'crystal' || phase === 'complete') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-8"
          >
            <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-4">
              The Bones
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {data.bones.slice(0, visibleBones).map((bone, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-sm font-mono"
                >
                  <span className="text-gray-500">{bone.constraint}</span>
                  <span className="text-gray-400 mx-2">→</span>
                  <span className="text-amber-300">{bone.word}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* TALE */}
      <AnimatePresence>
        {(phase === 'tale' || phase === 'crystal' || phase === 'complete') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-8"
          >
            <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-4">
              {showPlain ? 'The Meaning' : 'The Tale'}
            </h3>
            <div className="text-gray-200 leading-relaxed">
              {showPlain ? (
                <p>{plainText}</p>
              ) : (
                taleSentences.slice(0, visibleTale).map((sentence, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1 }}
                  >
                    {sentence}{' '}
                  </motion.span>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* CRYSTAL */}
      <AnimatePresence>
        {(phase === 'crystal' || phase === 'complete') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            className="text-center py-8"
          >
            <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-4">
              Your Question
            </h3>
            <p className="text-xl text-amber-300 italic">
              {data.crystal}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* ACTIONS */}
      {phase === 'complete' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col items-center gap-4 pt-4"
        >
          <button
            onClick={handleTransfer}
            className="px-8 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors"
          >
            Transfer to Reader
          </button>
          <button
            onClick={handlePlainToggle}
            className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            🔁 {showPlain ? 'View as tale' : 'View as plain language'}
          </button>
        </motion.div>
      )}
    </div>
  );
}
```

---

## 8. DICTIONARY SOURCE

For `lib/glistener-dictionary.json`:

**Recommended source:** [SCOWL (Spell Checker Oriented Word Lists)](http://wordlist.aspell.net/)

Use the 50k variant, filtered:
- Remove proper nouns
- Remove hyphenated words
- Remove words < 3 characters

**Structure:**
```json
{
  "version": "1.0",
  "source": "SCOWL-50k",
  "count": 48273,
  "words": [
    "abandon",
    "ability",
    "able",
    ...
  ]
}
```

**Build script** to generate indexed version can be run at build time or on first startup.

---

## 9. INTEGRATION CHECKLIST

- [ ] Add `lib/glistener/` directory with all modules
- [ ] Add `lib/glistener-dictionary.json` (filtered SCOWL 50k)
- [ ] Add `app/api/glisten/route.js`
- [ ] Add `components/reader/Glistener.js`
- [ ] Add Glistener toggle to Reader UI (gated by user level / earned feature)
- [ ] Add Framer Motion if not already installed: `npm install framer-motion`
- [ ] Test full flow: Bones → Symbolism → Transmission → Integration → Crystal
- [ ] Test edge cases: failed constraints, invalid crystals, plain language toggle
- [ ] Add logging for debug (RNG seeds, regeneration counts)

---

## 10. GATING LOGIC

In `page.js` or Reader config:

```javascript
// Glistener unlocks after N readings completed
const GLISTEN_UNLOCK_THRESHOLD = 5;

const canGlisten = userReadingCount >= GLISTEN_UNLOCK_THRESHOLD;
```

Show "Begin with Glisten" toggle only when `canGlisten === true`.

---

**Status:** Implementation-ready  
**Next:** Deploy to alpha, test full cycle, iterate on timing/UX
