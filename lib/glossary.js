// === GLOSSARY DATA ===
// Imported from nirmanakaya_glossary.json
// 140 terms with popup definitions for hotlinks

import glossaryData from '../nirmanakaya_glossary.json';

export const GLOSSARY = glossaryData;
export const GLOSSARY_TERMS = glossaryData.terms;
export const GLOSSARY_META = glossaryData.meta;

// Build lookup maps for efficient access
export const GLOSSARY_BY_SLUG = Object.entries(glossaryData.terms).reduce((acc, [slug, term]) => {
  acc[slug] = term;
  return acc;
}, {});

// Build lookup by name (case-insensitive)
export const GLOSSARY_BY_NAME = Object.entries(glossaryData.terms).reduce((acc, [slug, term]) => {
  acc[term.name.toLowerCase()] = { ...term, slug };
  return acc;
}, {});

// Get all term names sorted by length (longest first) for regex matching
export const SORTED_GLOSSARY_NAMES = Object.values(glossaryData.terms)
  .map(t => t.name)
  .sort((a, b) => b.length - a.length);

// Get glossary entry by slug
export function getGlossaryEntry(slug) {
  return GLOSSARY_BY_SLUG[slug] || null;
}

// Get glossary entry by name (case-insensitive)
export function getGlossaryByName(name) {
  return GLOSSARY_BY_NAME[name.toLowerCase()] || null;
}

// Convert name to slug format
export function nameToSlug(name) {
  return name.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[()]/g, '');
}
