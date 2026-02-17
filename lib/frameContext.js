// === FRAME CONTEXT ===
// Normalized frame context for all reading modes.
// Positions describe WHERE in the spread a card sits.
// Frame label = position name. Frame lens = interpretation guidance.
// Source determines visual styling (color accent).

import { REFLECT_SPREADS } from './spreads.js';

/**
 * Build a normalized frame context for a card at a given index.
 *
 * @param {string} mode - 'preset' | 'custom' | 'explore' | 'architecture' | 'discover'
 * @param {object} options
 * @param {string} options.spreadKey - key into REFLECT_SPREADS (preset mode)
 * @param {number} options.index - card index in the spread
 * @param {string} options.label - explicit label (custom/explore modes)
 * @param {string} options.lens - explicit lens text (custom mode)
 * @returns {{ label: string|null, lens: string|null, source: string|null, isEmpty: boolean }}
 */
export function buildFrameContext(mode, { spreadKey, index, label, lens } = {}) {
  switch (mode) {
    case 'preset': {
      const config = REFLECT_SPREADS[spreadKey];
      const pos = config?.positions?.[index];
      if (!pos?.name) return { label: null, lens: null, source: null, isEmpty: true };
      return {
        label: pos.name,
        lens: pos.lens || null,
        source: 'preset',
        isEmpty: false
      };
    }
    case 'custom': {
      if (!label) return { label: null, lens: null, source: null, isEmpty: true };
      return {
        label,
        lens: lens || 'Your custom position',
        source: 'custom',
        isEmpty: false
      };
    }
    case 'explore': {
      if (!label) return { label: null, lens: null, source: null, isEmpty: true };
      return {
        label,
        lens: 'Drawn from your question',
        source: 'explore',
        isEmpty: false
      };
    }
    case 'architecture': {
      if (!label) return { label: null, lens: null, source: null, isEmpty: true };
      return {
        label,
        lens: lens || 'Structural position',
        source: 'architecture',
        isEmpty: false
      };
    }
    case 'discover':
    default:
      return { label: null, lens: null, source: null, isEmpty: true };
  }
}

/**
 * Check if a frame context has displayable content.
 */
export function hasFrameContent(fc) {
  return fc && !fc.isEmpty && !!fc.label;
}

/**
 * Style tokens per frame source — border, text, and background classes.
 * Maps to the existing frame tab color scheme in page.js.
 */
export const FRAME_SOURCE_STYLES = {
  preset: {
    border: 'border-violet-500/30',
    text: 'text-violet-300',
    textMuted: 'text-violet-400/70',
    bg: 'bg-violet-500/5',
    dot: 'bg-violet-400'
  },
  custom: {
    border: 'border-rose-500/30',
    text: 'text-rose-300',
    textMuted: 'text-rose-400/70',
    bg: 'bg-rose-500/5',
    dot: 'bg-rose-400'
  },
  explore: {
    border: 'border-amber-500/30',
    text: 'text-amber-300',
    textMuted: 'text-amber-400/70',
    bg: 'bg-amber-500/5',
    dot: 'bg-amber-400'
  },
  architecture: {
    border: 'border-zinc-500/30',
    text: 'text-zinc-300',
    textMuted: 'text-zinc-400/70',
    bg: 'bg-zinc-500/5',
    dot: 'bg-zinc-400'
  }
};
