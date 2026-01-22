/**
 * Glistener Dictionary Module
 * Pre-indexed word bank for fast subsequence lookup
 *
 * Structure: Map of subsequence -> array of words containing it
 * Built at startup from wordlist, cached in memory
 */

// Next.js handles JSON imports automatically
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
 * Get a random word matching constraint (using provided RNG function)
 */
export function getRandomMatch(constraint, rng) {
  const matches = getMatchingWords(constraint);
  if (matches.length === 0) return null;

  const idx = rng(matches.length);
  return matches[idx];
}
