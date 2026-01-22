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
