// === CONTENT FILTER ===
// Post-process filter for prohibited terms and mode governance enforcement

// Terms that should never appear in interpretations
const PROHIBITED_TERMS = [
  // Patronizing endearments
  'honey', 'sweetie', 'sweetheart', 'dear', 'darling', 'hun',
  'sugar', 'doll', 'angel', 'beautiful', 'handsome', 'babe',
  'my friend', 'my dear'
];

// Motive language (banned unless explicitly Reflecting)
const MOTIVE_LANGUAGE = [
  'because you\'re afraid',
  'old wounds',
  'you\'re trying to control',
  'anxious need',
  'you don\'t trust'
];

// Moral valence terms
const MORAL_VALENCE = [
  'good or bad',
  'right or wrong',
  'punishment',
  'deserve',
  'failure'
];

// Outcome predictions
const OUTCOME_PREDICTIONS = [
  'will result in',
  'guarantees',
  'ensures',
  'leads to success',
  'this will cause',
  'you will get'
];

// Imperative verbs that violate mode governance
const IMPERATIVE_VIOLATIONS = [
  'you should',
  'you must',
  'you need to',
  'you have to',
  'make sure',
  'try to',
  'do this',
  'stop doing',
  'start doing'
];

// Mechanical replacements for moral language
const MORAL_TO_MECHANICAL = {
  'harsh': 'over-tensioned',
  'too rigid': 'low elasticity',
  'weak': 'under-supported',
  'failing': 'misaligned',
  'wrong': 'non-coherent',
  'punishment': 'consequence',
  'weapon': 'over-applied force',
  'mercy': 'capacity for integration'
};

// Filter prohibited pet names and endearments
export function filterProhibitedTerms(text) {
  if (!text) return text;

  let cleaned = text;

  PROHIBITED_TERMS.forEach(term => {
    // Match term as whole word, optionally followed by comma, at natural break points
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

// Full content filter with governance checks
export function filterContent(text, mode = 'discover') {
  let filtered = text;
  let violations = [];

  // Check prohibited terms
  for (const term of PROHIBITED_TERMS) {
    if (filtered.toLowerCase().includes(term.toLowerCase())) {
      violations.push({ type: 'prohibited_term', term });
    }
  }

  // Check motive language
  for (const phrase of MOTIVE_LANGUAGE) {
    if (filtered.toLowerCase().includes(phrase.toLowerCase())) {
      violations.push({ type: 'motive_language', term: phrase });
    }
  }

  // Check moral valence
  for (const phrase of MORAL_VALENCE) {
    if (filtered.toLowerCase().includes(phrase.toLowerCase())) {
      violations.push({ type: 'moral_valence', term: phrase });
    }
  }

  // Check outcome predictions
  for (const phrase of OUTCOME_PREDICTIONS) {
    if (filtered.toLowerCase().includes(phrase.toLowerCase())) {
      violations.push({ type: 'outcome_prediction', term: phrase });
    }
  }

  // Check imperative violations (mode-dependent)
  if (mode !== 'forge') {
    for (const imperative of IMPERATIVE_VIOLATIONS) {
      if (filtered.toLowerCase().includes(imperative.toLowerCase())) {
        violations.push({ type: 'imperative_violation', term: imperative, mode });
      }
    }
  }

  // Apply mechanical replacements for moral language
  for (const [moral, mechanical] of Object.entries(MORAL_TO_MECHANICAL)) {
    const regex = new RegExp(`\\b${moral}\\b`, 'gi');
    if (regex.test(filtered)) {
      filtered = filtered.replace(regex, mechanical);
      violations.push({ type: 'moral_replacement', from: moral, to: mechanical });
    }
  }

  // Apply prohibited term removal
  filtered = filterProhibitedTerms(filtered);

  return { filtered, violations };
}

// Validate mode compliance
export function validateModeCompliance(text, mode) {
  const issues = [];

  // Reflect: no choice implication
  if (mode === 'reflect') {
    if (/you could|available to you|capacity|lever/i.test(text)) {
      issues.push({
        guardrail: 'R-2',
        message: 'Reflect mode surfaced levers (belongs in Discover)'
      });
    }
    if (/\?$/.test(text.trim())) {
      issues.push({
        guardrail: 'R-1',
        message: 'Reflect mode should not end with questions'
      });
    }
  }

  // Discover: requires transition marker if approaching action
  if (mode === 'discover') {
    const hasConditionalVerbs = /step in|lean into|step back|claim|name/i.test(text);
    const hasTransitionMarker = /authorship locations|not instructions|visibility, not direction/i.test(text);

    if (hasConditionalVerbs && !hasTransitionMarker) {
      issues.push({
        guardrail: 'D-2',
        message: 'Discover mode used action language without transition marker'
      });
    }

    // Check for bullet lists or steps
    if (/^\s*[-•*]\s|^\s*\d+\./m.test(text)) {
      issues.push({
        guardrail: 'D-3',
        message: 'Discover mode should not include bullet lists or steps'
      });
    }
  }

  // Forge: requires ownership
  if (mode === 'forge') {
    const hasOwnership = /I am |you are asserting|your stated intention/i.test(text);
    if (!hasOwnership && /choosing|building|shaping|asserting/i.test(text)) {
      issues.push({
        guardrail: 'F-1',
        message: 'Forge mode action language without explicit ownership'
      });
    }
  }

  return issues;
}

// Log violations for telemetry
export function logViolations({ mode, house, status, userContext, violations, retryCount }) {
  if (violations.length === 0) return;

  console.warn('Mode governance violations:', {
    timestamp: new Date().toISOString(),
    mode,
    house,
    status,
    userContext,
    violations: violations.map(v => ({
      guardrail: v.guardrail || v.type,
      message: v.message || `${v.type}: ${v.term}`
    })),
    retryCount
  });
}
