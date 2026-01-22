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
