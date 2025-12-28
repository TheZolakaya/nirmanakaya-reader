// === CONTENT FILTER ===
// Post-process filter for prohibited terms that slip through prompt instructions

const PROHIBITED_TERMS = [
  'honey',
  'sweetheart',
  'dear',
  'sweetie',
  'babe',
  'darling',
  'hun',
  'sugar',
  'doll',
  'angel',
  'beautiful',
  'handsome',
  'my friend',
  'my dear'
];

export function filterProhibitedTerms(text) {
  if (!text) return text;

  let cleaned = text;

  PROHIBITED_TERMS.forEach(term => {
    // Match term as whole word, optionally followed by comma, at natural break points
    // Handles: "honey," "honey —" "Honey!" "...honey, this is" "Oh honey"
    const patterns = [
      new RegExp(`\\bOh\\s+${term}\\b[,]?\\s*`, 'gi'),    // "Oh honey, "
      new RegExp(`\\b${term}\\b[,]?\\s*`, 'gi'),           // "honey, " or "honey "
      new RegExp(`\\b${term}\\b\\s*[—–-]\\s*`, 'gi'),      // "honey — "
      new RegExp(`[,]\\s*\\b${term}\\b[.]?`, 'gi'),        // ", honey." or ", honey"
    ];

    patterns.forEach(regex => {
      cleaned = cleaned.replace(regex, '');
    });
  });

  // Clean up any double spaces left behind
  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();

  // Fix sentences that now start with lowercase after removal
  cleaned = cleaned.replace(/([.!?]\s+)([a-z])/g, (match, punct, letter) => punct + letter.toUpperCase());

  return cleaned;
}
