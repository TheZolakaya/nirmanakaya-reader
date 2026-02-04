// lib/map/positions.js
// Card positioning - EXACTLY matching public/map/index.html
// Uses CSS top-left positioning, not center coordinates

import { ARCHETYPES, BOUNDS, AGENTS } from '../archetypes.js';

// ============================================
// CONFIGURATION - Matches index.html exactly
// ============================================

export const CONFIG = {
  mapWidth: 1800,
  mapHeight: 1850,  // Matches .map CSS in index.html
  portalSize: 120,
  archetypeSize: 120,
  boundSize: 45,
  agentSize: 50,
  houseSize: 280,
  containerSize: 400  // Container for archetype groups
};

export const MANDALA_DIMENSIONS = {
  width: CONFIG.mapWidth,
  height: CONFIG.mapHeight,
  centerX: CONFIG.mapWidth / 2,
  centerY: CONFIG.mapHeight / 2
};

const cx = MANDALA_DIMENSIONS.centerX;  // 900

// Card dimensions
const cardW = CONFIG.archetypeSize;  // 120
const cardH = cardW * 1.5;           // 180
const containerSize = CONFIG.containerSize;  // 400

// ============================================
// HOUSE DEFINITIONS - Verbatim from index.html
// ============================================

export const HOUSES = {
  gestalt: {
    archetypes: [0, 1, 19, 20],
    archetypeOrder: [20, 19, 0, 1],  // Order in container: TL, TR, BL, BR
    x: cx + 1,
    y: 540,
    groupRotation: 0,
    cardOffsets: [
      { x: -68, y: -40 },   // pos 0: id 20 (Awareness) - top left
      { x: 68, y: -40 },    // pos 1: id 19 (Actualization) - top right
      { x: -68, y: 97 },    // pos 2: id 0 (Potential) - bottom left
      { x: 68, y: 97 }      // pos 3: id 1 (Will) - bottom right
    ]
  },
  mind: {
    archetypes: [4, 5, 15, 16],
    archetypeOrder: [4, 5, 15, 16],
    x: cx - 450,
    y: 735,
    groupRotation: -45,
    cardOffsets: [
      { x: -68, y: 97 },   // pos 0: id 4 (Order) - bottom left
      { x: 68, y: 97 },    // pos 1: id 5 (Culture) - bottom right
      { x: 68, y: -40 },   // pos 2: id 15 (Abstraction) - top right
      { x: -68, y: -40 }   // pos 3: id 16 (Breakthrough) - top left
    ]
  },
  emotion: {
    archetypes: [6, 7, 13, 14],
    archetypeOrder: [6, 7, 13, 14],
    x: cx + 450,
    y: 735,
    groupRotation: 45,
    cardOffsets: [
      { x: -68, y: 97 },   // pos 0: id 6 (Compassion) - bottom left
      { x: 68, y: 97 },    // pos 1: id 7 (Drive) - bottom right
      { x: 68, y: -40 },   // pos 2: id 13 (Change) - top right
      { x: -68, y: -40 }   // pos 3: id 14 (Balance) - top left
    ]
  },
  body: {
    archetypes: [8, 9, 11, 12],
    archetypeOrder: [8, 9, 11, 12],
    x: cx - 450,
    y: 1205,
    groupRotation: 45,
    cardOffsets: [
      { x: 68, y: -40 },   // pos 0: id 8 (Fortitude) - top right
      { x: -68, y: -40 },  // pos 1: id 9 (Discipline) - top left
      { x: -68, y: 97 },   // pos 2: id 11 (Equity) - bottom left
      { x: 68, y: 97 }     // pos 3: id 12 (Sacrifice) - bottom right
    ]
  },
  spirit: {
    archetypes: [2, 3, 17, 18],
    archetypeOrder: [2, 3, 17, 18],
    x: cx + 450,
    y: 1205,
    groupRotation: -45,
    cardOffsets: [
      { x: 68, y: -40 },   // pos 0: id 2 (Wisdom) - top right
      { x: -68, y: -40 },  // pos 1: id 3 (Nurturing) - top left
      { x: -68, y: 97 },   // pos 2: id 17 (Inspiration) - bottom left
      { x: 68, y: 97 }     // pos 3: id 18 (Imagination) - bottom right
    ]
  }
};

// Portal positions (CSS top-left)
export const PORTALS = {
  10: { x: cx - CONFIG.portalSize / 2, y: 238 },    // Source
  21: { x: cx - CONFIG.portalSize / 2, y: 1320 }   // Creation
};

// ============================================
// BOUNDS/AGENTS OFFSETS - Verbatim from index.html
// These are offsets from house center to card center
// ============================================

const GESTALT_OFFSETS = {
  bounds: {
    'wands-inner': { x: -171, y: 99 },
    'wands-outer': { x: -171, y: 35 },
    'pentacles-inner': { x: 171, y: 101 },
    'pentacles-outer': { x: 170, y: 32 },
    'cups-inner': { x: -172, y: -36 },
    'cups-outer': { x: -172, y: -103 },
    'swords-inner': { x: 171, y: -43 },
    'swords-outer': { x: 171, y: -110 }
  }
};

const MIND_OFFSETS = {
  bounds: {
    'wands-inner': { x: -49, y: 191 },
    'wands-outer': { x: -92, y: 149 },
    'pentacles-inner': { x: -145, y: 98 },
    'pentacles-outer': { x: -188, y: 54 },
    'cups-inner': { x: 192, y: -49 },
    'cups-outer': { x: 145, y: -95 },
    'swords-inner': { x: 98, y: -141 },
    'swords-outer': { x: 51, y: -187 }
  },
  agents: {
    wands: { x: 71, y: 174 },
    cups: { x: 168, y: 79 },
    pentacles: { x: -172, y: -73 },
    swords: { x: -75, y: -172 }
  }
};

const EMOTION_OFFSETS = {
  bounds: {
    'wands-inner': { x: 55, y: 193 },
    'wands-outer': { x: 101, y: 145 },
    'pentacles-inner': { x: 149, y: 99 },
    'pentacles-outer': { x: 190, y: 55 },
    'cups-inner': { x: -188, y: -53 },
    'cups-outer': { x: -142, y: -98 },
    'swords-inner': { x: -92, y: -150 },
    'swords-outer': { x: -49, y: -193 }
  },
  agents: {
    wands: { x: -76, y: 174 },
    cups: { x: -174, y: 72 },
    pentacles: { x: 170, y: -75 },
    swords: { x: 78, y: -169 }
  }
};

const BODY_OFFSETS = {
  bounds: {
    'wands-inner': { x: 92, y: 150 },
    'wands-outer': { x: 49, y: 197 },
    'pentacles-inner': { x: 190, y: 58 },
    'pentacles-outer': { x: 150, y: 99 },
    'cups-inner': { x: -145, y: -94 },
    'cups-outer': { x: -185, y: -53 },
    'swords-inner': { x: -53, y: -189 },
    'swords-outer': { x: -94, y: -147 }
  },
  agents: {
    wands: { x: -81, y: 169 },
    cups: { x: -176, y: 74 },
    pentacles: { x: 171, y: -79 },
    swords: { x: 79, y: -173 }
  }
};

const SPIRIT_OFFSETS = {
  bounds: {
    'wands-inner': { x: -90, y: 153 },
    'wands-outer': { x: -47, y: 193 },
    'pentacles-inner': { x: -189, y: 53 },
    'pentacles-outer': { x: -145, y: 92 },
    'cups-inner': { x: 152, y: -89 },
    'cups-outer': { x: 195, y: -48 },
    'swords-inner': { x: 53, y: -188 },
    'swords-outer': { x: 97, y: -144 }
  },
  agents: {
    wands: { x: 79, y: 170 },
    cups: { x: 173, y: 76 },
    pentacles: { x: -169, y: -77 },
    swords: { x: -78, y: -171 }
  }
};

const HOUSE_OFFSETS = {
  gestalt: GESTALT_OFFSETS,
  mind: MIND_OFFSETS,
  emotion: EMOTION_OFFSETS,
  body: BODY_OFFSETS,
  spirit: SPIRIT_OFFSETS
};

// Bound numbers owned by each house
const HOUSE_BOUNDS = {
  gestalt: [1, 10],
  spirit: [2, 9],
  mind: [3, 8],
  emotion: [4, 7],
  body: [5, 6]
};

// Agent roles owned by each house
const HOUSE_ROLES = {
  spirit: 'Initiate',
  mind: 'Catalyst',
  emotion: 'Steward',
  body: 'Executor'
};

// Channel to suit mapping
const CHANNEL_TO_SUIT = {
  Intent: 'wands',
  Cognition: 'swords',
  Resonance: 'cups',
  Structure: 'pentacles'
};

// ============================================
// ARCHETYPE POSITIONING
// Returns CSS top-left coordinates WITHIN the container
// ============================================

/**
 * Get archetype position for rendering inside a house container
 * Returns local coordinates (relative to container top-left)
 */
export function getArchetypeLocalPosition(archetypeId) {
  // Find which house and position index
  for (const [houseName, house] of Object.entries(HOUSES)) {
    const posIndex = house.archetypeOrder.indexOf(archetypeId);
    if (posIndex !== -1) {
      const offset = house.cardOffsets[posIndex];
      // Formula from index.html: containerSize/2 + offset - cardSize/2
      return {
        left: containerSize / 2 + offset.x - cardW / 2,
        top: containerSize / 2 + offset.y - cardH / 2,
        width: cardW,
        height: cardH,
        house: houseName
      };
    }
  }
  return null;
}

/**
 * Get portal position (CSS top-left, world coordinates)
 */
export function getPortalPosition(portalId) {
  const portal = PORTALS[portalId];
  if (!portal) return null;
  return {
    left: portal.x,
    top: portal.y,
    width: CONFIG.portalSize,
    height: CONFIG.portalSize * 1.5
  };
}

/**
 * Get house container position and rotation
 */
export function getHouseContainer(houseName) {
  const house = HOUSES[houseName];
  if (!house) return null;
  return {
    left: house.x - containerSize / 2,
    top: house.y - containerSize / 2,
    width: containerSize,
    height: containerSize,
    rotation: house.groupRotation || 0,
    archetypeOrder: house.archetypeOrder
  };
}

// ============================================
// BOUND POSITIONING
// Returns CSS top-left world coordinates
// ============================================

export function getBoundPosition(cardId) {
  const bound = BOUNDS[cardId];
  if (!bound) return null;

  const channel = bound.channel;
  const number = bound.number;
  const suit = CHANNEL_TO_SUIT[channel];

  // Find which house owns this bound number
  let houseName = null;
  for (const [house, numbers] of Object.entries(HOUSE_BOUNDS)) {
    if (numbers.includes(number)) {
      houseName = house;
      break;
    }
  }
  if (!houseName) return null;

  const house = HOUSES[houseName];
  const offsets = HOUSE_OFFSETS[houseName];
  if (!offsets?.bounds) return null;

  // Inner (1-5) or outer (6-10)
  const isInner = number <= 5;
  const offsetKey = `${suit}-${isInner ? 'inner' : 'outer'}`;
  const offset = offsets.bounds[offsetKey];
  if (!offset) return null;

  const boundSize = CONFIG.boundSize;

  // Formula from index.html: house.x + offset.x - boundSize/2
  return {
    left: house.x + offset.x - boundSize / 2,
    top: house.y + offset.y - boundSize / 2,
    width: boundSize,
    height: boundSize * 1.4,
    rotation: house.groupRotation || 0,
    house: houseName
  };
}

// ============================================
// AGENT POSITIONING
// Returns CSS top-left world coordinates
// ============================================

export function getAgentPosition(cardId) {
  const agent = AGENTS[cardId];
  if (!agent) return null;

  const channel = agent.channel;
  const role = agent.role;
  const suit = CHANNEL_TO_SUIT[channel];

  // Find which house owns this role
  let houseName = null;
  for (const [house, houseRole] of Object.entries(HOUSE_ROLES)) {
    if (houseRole === role) {
      houseName = house;
      break;
    }
  }
  if (!houseName) return null;

  const house = HOUSES[houseName];
  const offsets = HOUSE_OFFSETS[houseName];
  if (!offsets?.agents) return null;

  const offset = offsets.agents[suit];
  if (!offset) return null;

  const agentSize = CONFIG.agentSize;

  // Formula from index.html: house.x + offset.x - agentSize/2
  return {
    left: house.x + offset.x - agentSize / 2,
    top: house.y + offset.y - agentSize / 2,
    width: agentSize,
    height: agentSize * 1.4,
    rotation: house.groupRotation || 0,
    house: houseName
  };
}

// ============================================
// UNIFIED CARD POSITION API
// ============================================

/**
 * Get position for any card by ID
 * Archetypes return local container coords; bounds/agents return world coords
 */
export function getCardPosition(cardId) {
  const id = Number(cardId);

  // Portals (10, 21)
  if (id === 10 || id === 21) {
    const pos = getPortalPosition(id);
    return pos ? { ...pos, type: 'portal', rotation: 0, isLocal: false } : null;
  }

  // Archetypes (0-21, excluding portals)
  if (id >= 0 && id <= 21) {
    const pos = getArchetypeLocalPosition(id);
    return pos ? { ...pos, type: 'archetype', isLocal: true } : null;
  }

  // Bounds (22-61)
  if (id >= 22 && id <= 61) {
    const pos = getBoundPosition(id);
    return pos ? { ...pos, type: 'bound', isLocal: false } : null;
  }

  // Agents (62-77)
  if (id >= 62 && id <= 77) {
    const pos = getAgentPosition(id);
    return pos ? { ...pos, type: 'agent', isLocal: false } : null;
  }

  return null;
}

/**
 * Get all house names
 */
export function getHouseNames() {
  return Object.keys(HOUSES);
}

/**
 * Get house center position
 */
export function getHouseCenter(houseName) {
  const house = HOUSES[houseName];
  if (!house) return null;
  return { x: house.x, y: house.y };
}
