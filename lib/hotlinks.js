// === HOTLINK UTILITIES ===
// Parsing and rendering of clickable term links in reading text
// Unified system: cards, statuses, houses, channels, roles, AND glossary concepts

import { ARCHETYPES, BOUNDS, AGENTS } from './archetypes.js';
import { CHANNELS, HOUSES, ROLES, STATUS_INFO } from './constants.js';
import { getComponent } from './corrections.js';
import { GLOSSARY_TERMS, SORTED_GLOSSARY_NAMES, getGlossaryEntry, nameToSlug } from './glossary.js';

// === SIMPLE MARKDOWN PARSER ===
// Parses **bold** and *italic* text
export const parseSimpleMarkdown = (text) => {
  if (!text) return text;

  const parts = [];
  let key = 0;

  // Pattern to match **bold** or *italic*
  const pattern = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    // Add formatted text
    if (match[2]) {
      // Bold: **text**
      parts.push(<strong key={key++} className="font-semibold text-zinc-100">{match[2]}</strong>);
    } else if (match[3]) {
      // Italic: *text*
      parts.push(<em key={key++} className="italic">{match[3]}</em>);
    }

    lastIndex = pattern.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
};

// Build UNIFIED hotlink term lookup - includes cards, statuses, etc. AND glossary terms
export const buildHotlinkTerms = () => {
  const terms = {};

  // Archetype names (0-21)
  Object.entries(ARCHETYPES).forEach(([id, arch]) => {
    terms[arch.name] = { type: 'card', id: parseInt(id), source: 'card' };
  });

  // Bound names (22-61)
  Object.entries(BOUNDS).forEach(([id, bound]) => {
    terms[bound.name] = { type: 'card', id: parseInt(id), source: 'card' };
  });

  // Agent names (62-77)
  Object.entries(AGENTS).forEach(([id, agent]) => {
    terms[agent.name] = { type: 'card', id: parseInt(id), source: 'card' };
  });

  // House names
  Object.keys(HOUSES).forEach(house => {
    terms[house] = { type: 'house', id: house, source: 'structure' };
  });

  // Channel names
  Object.keys(CHANNELS).forEach(channel => {
    terms[channel] = { type: 'channel', id: channel, source: 'structure' };
  });

  // Status terms
  terms['Balanced'] = { type: 'status', id: 1, source: 'status' };
  terms['Too Much'] = { type: 'status', id: 2, source: 'status' };
  terms['Too Little'] = { type: 'status', id: 3, source: 'status' };
  terms['Unacknowledged'] = { type: 'status', id: 4, source: 'status' };

  // Role names
  Object.keys(ROLES).forEach(role => {
    terms[role] = { type: 'role', id: role, source: 'structure' };
  });

  // ADD GLOSSARY TERMS (concepts, operations, relationships, etc.)
  // These get 'glossary' type and the slug as id
  Object.entries(GLOSSARY_TERMS).forEach(([slug, entry]) => {
    // Skip if already covered by card/house/channel/status/role (they take priority)
    if (!terms[entry.name]) {
      terms[entry.name] = {
        type: 'glossary',
        id: slug,
        source: 'glossary',
        glossaryType: entry.type // concept, operation, relationship, etc.
      };
    }
  });

  return terms;
};

export const HOTLINK_TERMS = buildHotlinkTerms();

// Build case-insensitive lookup map (lowercase key -> original term info)
export const HOTLINK_TERMS_LOWERCASE = Object.entries(HOTLINK_TERMS).reduce((acc, [key, value]) => {
  acc[key.toLowerCase()] = { ...value, originalName: key };
  return acc;
}, {});

// Sort terms by length (longest first) to match "Too Much" before "Much", "The Un-Now" before "Now"
export const SORTED_TERM_KEYS = Object.keys(HOTLINK_TERMS).sort((a, b) => b.length - a.length);

// Create regex pattern for all terms (word boundaries, CASE INSENSITIVE)
export const HOTLINK_PATTERN = new RegExp(
  `\\b(${SORTED_TERM_KEYS.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
  'gi'  // Added 'i' for case-insensitive matching
);

// Render text with clickable hotlinks for invariant terms
// Returns JSX with ClickableTerm components for matched terms
// Colors: amber=cards, cyan=structure (house/channel/role), emerald=status, violet=glossary concepts
export const renderWithHotlinks = (text, setSelectedInfo) => {
  if (!text || !setSelectedInfo) return parseSimpleMarkdown(text);

  // Get color class based on term type/source
  const getColorClass = (termInfo) => {
    if (termInfo.type === 'card') return 'text-amber-300/90';
    if (termInfo.type === 'status') return 'text-emerald-300/90';
    if (termInfo.type === 'glossary') return 'text-violet-300/90'; // Framework concepts
    // Structure: house, channel, role
    return 'text-cyan-300/90';
  };

  // Helper to create clickable term
  const ClickableTerm = ({ termInfo, children }) => (
    <span
      className={`cursor-pointer hover:underline decoration-dotted underline-offset-2 ${getColorClass(termInfo)}`}
      onClick={(e) => {
        e.stopPropagation();
        let data = null;
        const { type, id } = termInfo;
        if (type === 'card') data = getComponent(id);
        else if (type === 'channel') data = CHANNELS[id];
        else if (type === 'status') data = STATUS_INFO[id];
        else if (type === 'house') data = HOUSES[id];
        else if (type === 'role') data = ROLES[id];
        else if (type === 'glossary') data = getGlossaryEntry(id);
        setSelectedInfo({ type, id, data });
      }}
    >
      {children}
    </span>
  );

  const result = [];
  let key = 0;

  // First, handle markdown formatting, then add hotlinks to each segment
  const markdownParts = [];
  const markdownPattern = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
  let lastMarkdownIndex = 0;
  let markdownMatch;

  while ((markdownMatch = markdownPattern.exec(text)) !== null) {
    if (markdownMatch.index > lastMarkdownIndex) {
      markdownParts.push({ text: text.slice(lastMarkdownIndex, markdownMatch.index), format: null });
    }
    if (markdownMatch[2]) {
      markdownParts.push({ text: markdownMatch[2], format: 'bold' });
    } else if (markdownMatch[3]) {
      markdownParts.push({ text: markdownMatch[3], format: 'italic' });
    }
    lastMarkdownIndex = markdownPattern.lastIndex;
  }
  if (lastMarkdownIndex < text.length) {
    markdownParts.push({ text: text.slice(lastMarkdownIndex), format: null });
  }
  if (markdownParts.length === 0) {
    markdownParts.push({ text, format: null });
  }

  // Now process each markdown part for hotlinks
  markdownParts.forEach((part, partIndex) => {
    const partText = part.text;
    const hotlinkParts = [];
    let lastIndex = 0;
    let match;

    // Reset regex
    HOTLINK_PATTERN.lastIndex = 0;

    while ((match = HOTLINK_PATTERN.exec(partText)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        hotlinkParts.push({ text: partText.slice(lastIndex, match.index), isLink: false });
      }

      // Add the matched term as a link (case-insensitive lookup)
      const termInfo = HOTLINK_TERMS_LOWERCASE[match[1].toLowerCase()];
      if (termInfo) {
        hotlinkParts.push({ text: match[1], isLink: true, termInfo });
      } else {
        hotlinkParts.push({ text: match[1], isLink: false });
      }

      lastIndex = HOTLINK_PATTERN.lastIndex;
    }

    // Add remaining text
    if (lastIndex < partText.length) {
      hotlinkParts.push({ text: partText.slice(lastIndex), isLink: false });
    }

    // If no hotlinks found, just use original text
    if (hotlinkParts.length === 0) {
      hotlinkParts.push({ text: partText, isLink: false });
    }

    // Build the JSX for this markdown part
    const partElements = hotlinkParts.map((hp, hpIndex) => {
      if (hp.isLink) {
        return <ClickableTerm key={`${partIndex}-${hpIndex}`} termInfo={hp.termInfo}>{hp.text}</ClickableTerm>;
      }
      return hp.text;
    });

    // Wrap in formatting if needed
    if (part.format === 'bold') {
      result.push(<strong key={key++} className="font-semibold text-zinc-100">{partElements}</strong>);
    } else if (part.format === 'italic') {
      result.push(<em key={key++} className="italic">{partElements}</em>);
    } else {
      // For plain text, add elements directly (might be array or single element)
      partElements.forEach(el => result.push(el));
    }
  });

  return result.length > 0 ? result : text;
};

// === GLOSSARY HOTLINK UTILITIES ===

// Escape special regex characters
const escapeRegex = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Create regex pattern for glossary terms (longest first to avoid partial matches)
export const GLOSSARY_PATTERN = new RegExp(
  `\\b(${SORTED_GLOSSARY_NAMES.map(escapeRegex).join('|')})\\b`,
  'gi'
);

// Process [bracket] markers in Words to the Whys content
// Converts [Term] to glossary hotlink spans
export const processBracketHotlinks = (text, onTermClick) => {
  if (!text) return text;

  const result = [];
  let key = 0;

  // Pattern to match [Term] brackets
  const bracketPattern = /\[([^\]]+)\]/g;
  let lastIndex = 0;
  let match;

  while ((match = bracketPattern.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      result.push(text.slice(lastIndex, match.index));
    }

    // Look up the term in glossary
    const termName = match[1];
    const slug = nameToSlug(termName);
    const entry = getGlossaryEntry(slug);

    if (entry && onTermClick) {
      // Render as clickable glossary term
      result.push(
        <span
          key={key++}
          className="cursor-help text-cyan-400 border-b border-dotted border-cyan-400/40 hover:text-cyan-300 hover:border-cyan-300/60 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onTermClick(slug, entry, e);
          }}
          data-glossary-term={slug}
        >
          {termName}
        </span>
      );
    } else {
      // No glossary entry or no handler - just render the text without brackets
      result.push(termName);
    }

    lastIndex = bracketPattern.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex));
  }

  return result.length > 0 ? result : text;
};

// Auto-detect and link glossary terms in text (for non-Words-to-Whys sections)
// Note: This doesn't link terms already handled by the main hotlink system (cards, statuses, etc.)
export const autoLinkGlossaryTerms = (text, onTermClick) => {
  if (!text || typeof text !== 'string') return text;

  const result = [];
  let key = 0;

  // Filter glossary names to exclude terms already in HOTLINK_TERMS
  const glossaryOnlyTerms = SORTED_GLOSSARY_NAMES.filter(name => !HOTLINK_TERMS[name]);

  if (glossaryOnlyTerms.length === 0) return text;

  // Create pattern for glossary-only terms
  const pattern = new RegExp(
    `\\b(${glossaryOnlyTerms.map(escapeRegex).join('|')})\\b`,
    'gi'
  );

  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      result.push(text.slice(lastIndex, match.index));
    }

    // Look up the term
    const termName = match[1];
    const slug = nameToSlug(termName);
    const entry = getGlossaryEntry(slug);

    if (entry && onTermClick) {
      result.push(
        <span
          key={key++}
          className="cursor-help text-cyan-400 border-b border-dotted border-cyan-400/40 hover:text-cyan-300 hover:border-cyan-300/60 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onTermClick(slug, entry, e);
          }}
          data-glossary-term={slug}
        >
          {termName}
        </span>
      );
    } else {
      result.push(match[1]);
    }

    lastIndex = pattern.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex));
  }

  return result.length > 0 ? result : text;
};

// Combined hotlinks: first apply standard hotlinks, then glossary auto-detection
export const renderWithAllHotlinks = (text, setSelectedInfo, onGlossaryClick) => {
  // First pass: standard card/status/house/channel hotlinks
  const withStandardHotlinks = renderWithHotlinks(text, setSelectedInfo);

  // If result is a string, try glossary auto-linking
  if (typeof withStandardHotlinks === 'string' && onGlossaryClick) {
    return autoLinkGlossaryTerms(withStandardHotlinks, onGlossaryClick);
  }

  // If result is already JSX array, we'd need more complex handling
  // For now, return as-is (standard hotlinks take priority)
  return withStandardHotlinks;
};
