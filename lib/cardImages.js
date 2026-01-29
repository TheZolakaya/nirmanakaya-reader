// === CARD IMAGE PATH UTILITIES ===
// Generate image paths for cards from the map deck

import { ARCHETYPES, BOUNDS, AGENTS } from './archetypes.js';

/**
 * Get the home archetype ID for any card
 * - Archetypes (0-21): return the card ID itself
 * - Bounds (22-61): return the bound's archetype field
 * - Agents (62-77): return the agent's archetype field
 * @param {number} transient - Card ID (0-77)
 * @returns {number|null} - Archetype ID (0-21) or null
 */
export function getHomeArchetype(transient) {
  const id = Number(transient);

  // Archetypes are their own home
  if (id >= 0 && id <= 21) {
    return id;
  }

  // Bounds map to their archetype
  if (id >= 22 && id <= 61) {
    return BOUNDS[id]?.archetype ?? null;
  }

  // Agents map to their archetype
  if (id >= 62 && id <= 77) {
    return AGENTS[id]?.archetype ?? null;
  }

  return null;
}

// Channel to suit mapping
const CHANNEL_TO_SUIT = {
  Intent: 'wands',
  Cognition: 'swords',
  Resonance: 'cups',
  Structure: 'pentacles'
};

// Role to traditional rank mapping
const ROLE_TO_RANK = {
  Initiate: 'page',
  Catalyst: 'knight',
  Steward: 'queen',
  Executor: 'king'
};

/**
 * Get the image path for a card by its transient ID
 * @param {number} transient - Card ID (0-77)
 * @returns {string|null} - Image path or null if not found
 */
export function getCardImagePath(transient) {
  const id = Number(transient);

  // Archetypes (0-21)
  if (id >= 0 && id <= 21) {
    const arch = ARCHETYPES[id];
    if (!arch) return null;
    // Convert name to lowercase, replace spaces with underscores
    const namePart = arch.name.toLowerCase().replace(/\s+/g, '_');
    return `/map/archetypes/${String(id).padStart(2, '0')}_${namePart}.png`;
  }

  // Bounds (22-61)
  if (id >= 22 && id <= 61) {
    const bound = BOUNDS[id];
    if (!bound) return null;
    const suit = CHANNEL_TO_SUIT[bound.channel];
    const num = String(bound.number).padStart(2, '0');
    return `/map/bounds/${suit}/${suit}_${num}.png`;
  }

  // Agents (62-77)
  if (id >= 62 && id <= 77) {
    const agent = AGENTS[id];
    if (!agent) return null;
    const suit = CHANNEL_TO_SUIT[agent.channel];
    const rank = ROLE_TO_RANK[agent.role];
    return `/map/agents/${suit}_${rank}.png`;
  }

  return null;
}

/**
 * Get the thumbnail image path for a card by its transient ID
 * Thumbnails mirror the same structure under /map/thumbs/
 * @param {number} transient - Card ID (0-77)
 * @returns {string|null} - Thumbnail path or null if not found
 */
export function getCardThumbPath(transient) {
  const fullPath = getCardImagePath(transient);
  if (!fullPath) return null;
  // /map/archetypes/... -> /map/thumbs/archetypes/...
  return fullPath.replace('/map/', '/map/thumbs/');
}

/**
 * Get card type from transient ID
 * @param {number} transient - Card ID (0-77)
 * @returns {'ARCHETYPE'|'BOUND'|'AGENT'|null}
 */
export function getCardType(transient) {
  const id = Number(transient);
  if (id >= 0 && id <= 21) return 'ARCHETYPE';
  if (id >= 22 && id <= 61) return 'BOUND';
  if (id >= 62 && id <= 77) return 'AGENT';
  return null;
}

// Card type descriptions for UI display
export const CARD_TYPE_DESCRIPTIONS = {
  INNER_ARCHETYPE: {
    label: 'INNER ARCHETYPE',
    short: 'What you cultivate. The archetypal aspects of you that develop through inner work — your capacities before they meet the world.',
    medium: `Inner Archetypes are about who you are and what you're building inside. Your openness, your direction, your perception, your care, your structure, your values, your connections, your momentum, your endurance, your practice.

These archetypal aspects of you point to what you're cultivating — a capacity, a resource, an inner strength.`
  },
  OUTER_ARCHETYPE: {
    label: 'OUTER ARCHETYPE',
    short: 'What happens when you engage. The archetypal aspects of you that emerge through encounter — transformation, release, integration, expression.',
    medium: `Outer Archetypes are about what happens when your inner capacities meet life. Weighing, releasing, transforming, integrating, confronting, breaking through, radiating, reflecting, shining, awakening.

These archetypal aspects of you point to something in motion — a process of engagement, consequence, or becoming.`
  },
  INGRESS_PORTAL: {
    label: 'INGRESS PORTAL',
    short: 'The entry point. What is arriving now, entering the system from beyond.',
    medium: 'The Ingress Portal (Source) marks where new energy, information, or circumstances enter your field. It\'s the threshold of arrival — what\'s coming in that wasn\'t there before.'
  },
  EGRESS_PORTAL: {
    label: 'EGRESS PORTAL',
    short: 'The completion point. What emerges fully formed, ready to release.',
    medium: 'The Egress Portal (Creation) marks where integration becomes departure. It\'s the threshold of completion — what\'s ready to leave your field, fully realized and released into the world.'
  },
  INNER_BOUND: {
    label: 'INNER BOUND',
    short: 'Capacity at rest. What\'s gathering inside before it reaches outward. The inhale.',
    medium: `Inner Bounds are the coiled spring, the held breath, the feeling before the words come. They point to what's building — potential that hasn't yet extended into expression.

These aspects of you are about what's forming. Something preparing to move.`
  },
  OUTER_BOUND: {
    label: 'OUTER BOUND',
    short: 'Capacity expressed. What\'s extending into the world. The exhale.',
    medium: `Outer Bounds are the spring released, the breath that carries your voice, the words finally spoken. They point to what's manifesting — potential now moving into form.

These aspects of you are already in motion. Expressing, not waiting.`
  },
  AGENT: {
    label: 'AGENT',
    short: 'The embodied expression of a channel through a specific role.',
    medium: 'Agents are the personified energies of the channels — how Intent, Cognition, Resonance, and Structure show up through the roles of Initiate, Catalyst, Steward, and Executor.'
  }
};

/**
 * Get detailed card type info including inner/outer distinction
 * @param {number} transient - Card ID (0-77)
 * @returns {object} - { type, subtype, label, isInner, descriptions }
 */
export function getDetailedCardType(transient) {
  const id = Number(transient);

  // Archetypes (0-21)
  if (id >= 0 && id <= 21) {
    // Portals: 10 (Source - Ingress) and 21 (Creation - Egress)
    if (id === 10) {
      return {
        type: 'ARCHETYPE',
        subtype: 'INGRESS',
        label: 'INGRESS PORTAL',
        isInner: null,
        descriptions: CARD_TYPE_DESCRIPTIONS.INGRESS_PORTAL
      };
    }
    if (id === 21) {
      return {
        type: 'ARCHETYPE',
        subtype: 'EGRESS',
        label: 'EGRESS PORTAL',
        isInner: null,
        descriptions: CARD_TYPE_DESCRIPTIONS.EGRESS_PORTAL
      };
    }
    // Inner Archetypes: 0-9
    if (id >= 0 && id <= 9) {
      return {
        type: 'ARCHETYPE',
        subtype: 'INNER',
        label: 'INNER ARCHETYPE',
        isInner: true,
        descriptions: CARD_TYPE_DESCRIPTIONS.INNER_ARCHETYPE
      };
    }
    // Outer Archetypes: 11-20
    return {
      type: 'ARCHETYPE',
      subtype: 'OUTER',
      label: 'OUTER ARCHETYPE',
      isInner: false,
      descriptions: CARD_TYPE_DESCRIPTIONS.OUTER_ARCHETYPE
    };
  }

  // Bounds (22-61)
  if (id >= 22 && id <= 61) {
    const bound = BOUNDS[id];
    const isInner = bound?.number <= 5;
    return {
      type: 'BOUND',
      subtype: isInner ? 'INNER' : 'OUTER',
      label: isInner ? 'INNER BOUND' : 'OUTER BOUND',
      isInner,
      descriptions: isInner ? CARD_TYPE_DESCRIPTIONS.INNER_BOUND : CARD_TYPE_DESCRIPTIONS.OUTER_BOUND
    };
  }

  // Agents (62-77)
  if (id >= 62 && id <= 77) {
    return {
      type: 'AGENT',
      subtype: null,
      label: 'AGENT',
      isInner: null,
      descriptions: CARD_TYPE_DESCRIPTIONS.AGENT
    };
  }

  return null;
}
