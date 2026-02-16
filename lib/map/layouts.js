// lib/map/layouts.js
// Layout definitions for the training map system

import { MANDALA_DIMENSIONS, HOUSES, PORTALS, CONFIG } from './positions.js';
import { ARCHETYPES, BOUNDS, AGENTS } from '../archetypes.js';

// ============================================
// HOUSE → BOUND NUMBERS MAPPING
// Each house owns two bound numbers (inner + outer)
// ============================================
const HOUSE_BOUND_NUMBERS = {
  'Gestalt': [1, 10],
  'Spirit': [2, 9],
  'Mind': [3, 8],
  'Emotion': [4, 7],
  'Body': [5, 6]
};

// ============================================
// LAYOUT DEFINITIONS
// ============================================

export const LAYOUTS = {
  mandala: {
    id: 'mandala',
    name: 'Mandala',
    description: 'All 78 cards in house arrangement',
    dimensions: MANDALA_DIMENSIONS,
    cardCount: 78,
    showBounds: true,
    showAgents: true,
    // Mandala uses native positioning from positions.js (handled in page component)
    getPositions: () => null,
    getCardIds: () => Array.from({ length: 78 }, (_, i) => i)
  },

  'archetypes-linear': {
    id: 'archetypes-linear',
    name: 'Archetypes Linear',
    description: '22 archetypes in two rows',
    dimensions: { width: 1800, height: 420, centerX: 900, centerY: 210 },
    cardCount: 22,
    showBounds: false,
    showAgents: false,
    getPositions: () => {
      const positions = new Map();
      const cardWidth = 80;
      const cardHeight = 120;
      const gap = 55;  // Large visible gap between cards
      const rowGap = 50;

      // Layout:
      //        [20][19][18][17][16][15][14][13][12][11]    <- top row (right to left)
      // [21]                                           [10]  <- anchors (portals swapped)
      //        [0] [1] [2] [3] [4] [5] [6] [7] [8] [9]     <- bottom row (left to right)

      // Calculate total row width: 10 cards + 9 gaps
      const rowWidth = 10 * cardWidth + 9 * gap;  // 800 + 495 = 1295
      // Center the row in canvas (1800 width)
      const startX = (1800 - rowWidth) / 2 + cardWidth / 2;

      const topY = 80;
      const bottomY = topY + cardHeight + rowGap;
      const anchorY = topY + cardHeight / 2 + (cardHeight + rowGap) / 2;

      // Bottom row: 0-9 (left to right, so 0 is leftmost)
      for (let i = 0; i <= 9; i++) {
        positions.set(i, {
          x: startX + i * (cardWidth + gap),
          y: bottomY + cardHeight / 2
        });
      }

      // Top row: 11-20 (right to left, so 20 is leftmost)
      for (let i = 11; i <= 20; i++) {
        positions.set(i, {
          x: startX + (20 - i) * (cardWidth + gap),
          y: topY + cardHeight / 2
        });
      }

      // Left anchor: 21 (Creation/World) - positioned to fit number in frame
      positions.set(21, {
        x: 130,
        y: anchorY
      });

      // Right anchor: 10 (Source/Wheel) - positioned to fit number in frame
      positions.set(10, {
        x: 1670,
        y: anchorY
      });

      return positions;
    },
    getCardIds: () => Array.from({ length: 22 }, (_, i) => i)
  },

  'archetype-focus': {
    id: 'archetype-focus',
    name: 'Archetype Focus',
    description: 'One archetype with its expressions',
    dimensions: { width: 800, height: 600, centerX: 400, centerY: 300 },
    cardCount: 4,  // Dynamic: 1 archetype + up to 2 bounds + 1 agent
    showBounds: true,
    showAgents: true,
    dynamic: true,
    // This layout requires a focusArchetypeId parameter
    getPositions: (focusArchetypeId = 2) => {
      const positions = new Map();
      const cx = 400;
      const cy = 250;

      // Center: the archetype (larger)
      positions.set(focusArchetypeId, { x: cx, y: cy, width: 160 });

      // Get archetype's channel AND house to find related cards
      const archetype = ARCHETYPES[focusArchetypeId];
      const channel = archetype?.channel;
      const house = archetype?.house;

      if (channel && house) {
        // Get the bound numbers owned by this archetype's house
        const houseBoundNumbers = HOUSE_BOUND_NUMBERS[house] || [1, 10];

        // Find bounds with matching channel AND house's bound numbers
        const relatedBounds = Object.entries(BOUNDS)
          .filter(([_, b]) => b.channel === channel && houseBoundNumbers.includes(b.number))
          .sort((a, b) => a[1].number - b[1].number)
          .map(([id]) => Number(id));

        // Find agent with matching channel AND house
        const relatedAgents = Object.entries(AGENTS)
          .filter(([_, a]) => a.channel === channel)
          .slice(0, 1)
          .map(([id]) => Number(id));

        // Position bounds on left side (stacked vertically)
        if (relatedBounds[0]) {
          positions.set(relatedBounds[0], { x: cx - 200, y: cy - 60, width: 70 });
        }
        if (relatedBounds[1]) {
          positions.set(relatedBounds[1], { x: cx - 200, y: cy + 80, width: 70 });
        }

        // Position agent on right side
        if (relatedAgents[0]) {
          positions.set(relatedAgents[0], { x: cx + 200, y: cy, width: 80 });
        }
      }

      return positions;
    },
    // Get card IDs for this layout
    getCardIds: (focusArchetypeId = 2) => {
      const ids = [focusArchetypeId];
      const archetype = ARCHETYPES[focusArchetypeId];
      const channel = archetype?.channel;
      const house = archetype?.house;

      if (channel && house) {
        // Get the bound numbers owned by this archetype's house
        const houseBoundNumbers = HOUSE_BOUND_NUMBERS[house] || [1, 10];

        const relatedBounds = Object.entries(BOUNDS)
          .filter(([_, b]) => b.channel === channel && houseBoundNumbers.includes(b.number))
          .sort((a, b) => a[1].number - b[1].number)
          .map(([id]) => Number(id));

        const relatedAgents = Object.entries(AGENTS)
          .filter(([_, a]) => a.channel === channel)
          .slice(0, 1)
          .map(([id]) => Number(id));

        ids.push(...relatedBounds, ...relatedAgents);
      }
      return ids;
    }
  },

  'bounds-grid': {
    id: 'bounds-grid',
    name: 'Bounds Grid',
    description: '40 bounds in 10×4 grid by number/channel',
    dimensions: { width: 860, height: 440, centerX: 430, centerY: 220 },
    cardCount: 40,
    showBounds: true,
    showAgents: false,
    getPositions: () => {
      const positions = new Map();
      const cardW = 60;
      const cardH = cardW * 1.4;
      const spacingX = 20;
      const spacingY = 20;

      const channels = ['Intent', 'Cognition', 'Resonance', 'Structure'];
      // 10 columns (numbers 1-10), 4 rows (channels)
      const gridWidth = (cardW + spacingX) * 10 - spacingX;
      const gridHeight = (cardH + spacingY) * 4 - spacingY;
      const startX = 430 - gridWidth / 2 + cardW / 2;
      const startY = 220 - gridHeight / 2 + cardH / 2;

      // Group bounds by channel
      const boundsByChannel = { Intent: [], Cognition: [], Resonance: [], Structure: [] };
      Object.entries(BOUNDS).forEach(([id, bound]) => {
        if (boundsByChannel[bound.channel]) {
          boundsByChannel[bound.channel].push({ id: Number(id), ...bound });
        }
      });

      // Sort each channel by number (1-10)
      channels.forEach(ch => {
        boundsByChannel[ch].sort((a, b) => a.number - b.number);
      });

      // Position cards in grid: rows = channels, columns = numbers (1-10)
      channels.forEach((channel, rowIndex) => {
        boundsByChannel[channel].forEach((bound, colIndex) => {
          positions.set(bound.id, {
            x: startX + colIndex * (cardW + spacingX),
            y: startY + rowIndex * (cardH + spacingY),
            width: cardW
          });
        });
      });

      return positions;
    },
    getCardIds: () => Object.keys(BOUNDS).map(Number)
  },

  'agents-grid': {
    id: 'agents-grid',
    name: 'Agents Grid',
    description: '16 agents in 4×4 grid by channel/role',
    dimensions: { width: 600, height: 600, centerX: 300, centerY: 300 },
    cardCount: 16,
    showBounds: false,
    showAgents: true,
    getPositions: () => {
      const positions = new Map();
      const cardW = 90;
      const cardH = cardW * 1.4;  // 126
      const spacing = 30;  // Equal spacing in both directions

      const channels = ['Intent', 'Cognition', 'Resonance', 'Structure'];
      const roles = ['Initiate', 'Catalyst', 'Steward', 'Executor'];

      // Calculate step size (center to center distance)
      const stepX = cardW + spacing;
      const stepY = cardH + spacing;

      const gridWidth = stepX * 3;  // 3 gaps between 4 cards
      const gridHeight = stepY * 3;
      const startX = 300 - gridWidth / 2;
      const startY = 300 - gridHeight / 2;

      // Position agents: columns = channels, rows = roles
      Object.entries(AGENTS).forEach(([id, agent]) => {
        const colIndex = channels.indexOf(agent.channel);
        const rowIndex = roles.indexOf(agent.role);

        if (colIndex !== -1 && rowIndex !== -1) {
          positions.set(Number(id), {
            x: startX + colIndex * stepX,
            y: startY + rowIndex * stepY,
            width: cardW
          });
        }
      });

      return positions;
    },
    getCardIds: () => Object.keys(AGENTS).map(Number)
  }
};

/**
 * Get a layout by ID
 * @param {string} layoutId
 * @returns {object | null}
 */
export function getLayout(layoutId) {
  return LAYOUTS[layoutId] || null;
}

/**
 * Get all layout IDs
 * @returns {string[]}
 */
export function getLayoutIds() {
  return Object.keys(LAYOUTS);
}

/**
 * Get default layout
 * @returns {object}
 */
export function getDefaultLayout() {
  return LAYOUTS.mandala;
}
