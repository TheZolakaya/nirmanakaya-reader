'use client';

import React from 'react';

// ============================================
// CONFIGURATION - EXACT VALUES FROM minimap-v3-single.html
// ============================================
const COMPRESS = 0.40;
const INNER_COMPRESS = 0.6;
const SHAPE_COMPRESS = 0.45;

// Map dimensions
const MAP_WIDTH = 590;
const MAP_HEIGHT = 530;
const CX = 295;
const CY = 290;

// Original vertical center (for offset calculations)
const ORIG_CY = 879;

// House positions (calculated exactly as in experiment)
const HOUSES = {
  gestalt: {
    x: CX,
    y: CY + Math.round((540 - ORIG_CY) * COMPRESS),  // ~154
    rotation: 0,
    archetypes: [20, 19, 0, 1]  // Awareness, Actualization, Potential, Will
  },
  mind: {
    x: CX + Math.round(-450 * COMPRESS),  // ~115
    y: CY + Math.round((735 - ORIG_CY) * COMPRESS),  // ~232
    rotation: -45,
    archetypes: [4, 5, 15, 16]  // Order, Culture, Abstraction, Breakthrough
  },
  emotion: {
    x: CX + Math.round(450 * COMPRESS),   // ~475
    y: CY + Math.round((735 - ORIG_CY) * COMPRESS),  // ~232
    rotation: 45,
    archetypes: [6, 7, 13, 14]  // Compassion, Drive, Change, Balance
  },
  body: {
    x: CX + Math.round(-450 * COMPRESS),  // ~115
    y: CY + Math.round((1205 - ORIG_CY) * COMPRESS), // ~420
    rotation: 45,
    archetypes: [8, 9, 11, 12]  // Fortitude, Discipline, Equity, Sacrifice
  },
  spirit: {
    x: CX + Math.round(450 * COMPRESS),   // ~475
    y: CY + Math.round((1205 - ORIG_CY) * COMPRESS), // ~420
    rotation: -45,
    archetypes: [2, 3, 17, 18]  // Wisdom, Nurturing, Inspiration, Imagination
  }
};

// Portal positions
const PORTALS = {
  10: { x: CX, y: CY + Math.round((238 - ORIG_CY) * COMPRESS) },   // Source ~34
  21: { x: CX, y: CY + Math.round((1300 - ORIG_CY) * COMPRESS) }   // Creation ~458
};

// Card offsets within houses (from experiment)
const CARD_OFFSETS = {
  gestalt: [
    { x: -68, y: -40 },   // pos 0: Awareness (20)
    { x: 68, y: -40 },    // pos 1: Actualization (19)
    { x: -68, y: 97 },    // pos 2: Potential (0)
    { x: 68, y: 97 }      // pos 3: Will (1)
  ],
  mind: [
    { x: -68, y: 97 },    // pos 0: Order (4)
    { x: 68, y: 97 },     // pos 1: Culture (5)
    { x: 68, y: -40 },    // pos 2: Abstraction (15)
    { x: -68, y: -40 }    // pos 3: Breakthrough (16)
  ],
  emotion: [
    { x: -68, y: 97 },    // pos 0: Compassion (6)
    { x: 68, y: 97 },     // pos 1: Drive (7)
    { x: 68, y: -40 },    // pos 2: Change (13)
    { x: -68, y: -40 }    // pos 3: Balance (14)
  ],
  body: [
    { x: 68, y: -40 },    // pos 0: Fortitude (8)
    { x: -68, y: -40 },   // pos 1: Discipline (9)
    { x: -68, y: 97 },    // pos 2: Equity (11)
    { x: 68, y: 97 }      // pos 3: Sacrifice (12)
  ],
  spirit: [
    { x: 68, y: -40 },    // pos 0: Wisdom (2)
    { x: -68, y: -40 },   // pos 1: Nurturing (3)
    { x: -68, y: 97 },    // pos 2: Inspiration (17)
    { x: 68, y: 97 }      // pos 3: Imagination (18)
  ]
};

// Archetype to house/position mapping
const ARCHETYPE_LOCATIONS = {
  0: { house: 'gestalt', pos: 2 },   // Potential
  1: { house: 'gestalt', pos: 3 },   // Will
  2: { house: 'spirit', pos: 0 },    // Wisdom
  3: { house: 'spirit', pos: 1 },    // Nurturing
  4: { house: 'mind', pos: 0 },      // Order
  5: { house: 'mind', pos: 1 },      // Culture
  6: { house: 'emotion', pos: 0 },   // Compassion
  7: { house: 'emotion', pos: 1 },   // Drive
  8: { house: 'body', pos: 0 },      // Fortitude
  9: { house: 'body', pos: 1 },      // Discipline
  10: { house: 'portal', pos: 0 },   // Source (portal)
  11: { house: 'body', pos: 2 },     // Equity
  12: { house: 'body', pos: 3 },     // Sacrifice
  13: { house: 'emotion', pos: 2 },  // Change
  14: { house: 'emotion', pos: 3 },  // Balance
  15: { house: 'mind', pos: 2 },     // Abstraction
  16: { house: 'mind', pos: 3 },     // Breakthrough
  17: { house: 'spirit', pos: 2 },   // Inspiration
  18: { house: 'spirit', pos: 3 },   // Imagination
  19: { house: 'gestalt', pos: 1 },  // Actualization
  20: { house: 'gestalt', pos: 0 },  // Awareness
  21: { house: 'portal', pos: 1 }    // Creation (portal)
};

// Channel colors
const CHANNEL_COLORS = {
  Intent: '#C44444',      // Red/Spirit
  Cognition: '#4A8B4A',   // Green/Mind
  Resonance: '#3D6A99',   // Blue/Emotion
  Structure: '#8B6B3D',   // Brown/Body
  null: '#6B4D8A'         // Purple/Gestalt
};

// Archetype channels
const ARCHETYPE_CHANNELS = {
  0: 'Intent', 1: 'Structure', 2: 'Cognition', 3: 'Structure',
  4: 'Intent', 5: 'Resonance', 6: 'Resonance', 7: 'Intent',
  8: 'Structure', 9: 'Cognition', 10: null, 11: 'Resonance',
  12: 'Intent', 13: 'Structure', 14: 'Cognition', 15: 'Cognition',
  16: 'Structure', 17: 'Intent', 18: 'Resonance', 19: 'Cognition',
  20: 'Resonance', 21: null
};

// Archetypes where the bound/agent indicator appears on the RIGHT side
// (the "opening side" of the house for these positions)
const RIGHT_SIDE_ARCHETYPES = new Set([2, 18, 5, 15, 7, 13, 8, 12, 1, 19]);

// Archetypes on the LEFT side of the map (Mind + Body houses)
// Used for determining arrow direction toward/away from map center
const LEFT_MAP_ARCHETYPES = new Set([4, 5, 15, 16, 8, 9, 11, 12]);
// Archetypes on the RIGHT side of the map (Emotion + Spirit houses)
const RIGHT_MAP_ARCHETYPES = new Set([6, 7, 13, 14, 2, 3, 17, 18]);

// House colors (for dividers)
const HOUSE_COLORS = {
  gestalt: '#6B4D8A',
  mind: '#4A8B4A',
  emotion: '#3D6A99',
  body: '#8B6B3D',
  spirit: '#C44444'
};

// House to channel mapping (for indicator shapes)
const HOUSE_CHANNELS = {
  gestalt: null,        // Pie/crosshair (purple)
  mind: 'Cognition',    // Circle (green)
  emotion: 'Resonance', // Moon (blue)
  body: 'Structure',    // Square (brown)
  spirit: 'Intent'      // Triangle (red)
};

// Shape Y center offset (from experiment) - ONLY for divider positioning
const SHAPE_Y_CENTER = ((-40 + 97) / 2) * INNER_COMPRESS;  // 28.5 * 0.6 = 17.1

// Get position for an archetype (EXACT match to experiment's getArchetypeWorldPos)
function getArchetypePosition(id) {
  const loc = ARCHETYPE_LOCATIONS[id];
  if (!loc) return null;

  if (loc.house === 'portal') {
    return PORTALS[id];
  }

  const house = HOUSES[loc.house];
  const offset = CARD_OFFSETS[loc.house][loc.pos];

  // Apply shape compression to offsets
  const localX = offset.x * SHAPE_COMPRESS;
  const localY = offset.y * SHAPE_COMPRESS;

  // For rotated houses, apply rotation transform
  if (house.rotation !== 0) {
    const rad = (house.rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return {
      x: house.x + (localX * cos - localY * sin),
      y: house.y + (localX * sin + localY * cos)
    };
  }

  // Non-rotated: direct offset from house center
  return {
    x: house.x + localX,
    y: house.y + localY
  };
}

// Shape components - sizes match experiment (42px base = 21 radius)
// Highlighted shapes use CSS animation class for pulsating effect
const CircleShape = ({ x, y, color, highlight }) => {
  const size = highlight ? 21 : 14;
  return (
    <circle
      cx={x}
      cy={y}
      r={size}
      fill={`${color}80`}
      stroke={color}
      strokeWidth={3}
      opacity={0.8}
      className={highlight ? 'shape-highlight' : ''}
    />
  );
};

const SquareShape = ({ x, y, color, highlight }) => {
  const size = highlight ? 21 : 14;
  return (
    <rect
      x={x - size}
      y={y - size}
      width={size * 2}
      height={size * 2}
      rx={3}
      fill={`${color}80`}
      stroke={color}
      strokeWidth={3}
      opacity={0.8}
      className={highlight ? 'shape-highlight' : ''}
    />
  );
};

const TriangleShape = ({ x, y, color, highlight }) => {
  const halfWidth = highlight ? 21 : 14;
  const height = highlight ? 37 : 25;
  const points = `${x},${y - height * 0.5} ${x - halfWidth},${y + height * 0.5} ${x + halfWidth},${y + height * 0.5}`;
  return (
    <polygon
      points={points}
      fill={`${color}CC`}
      stroke="none"
      opacity={0.8}
      className={highlight ? 'shape-highlight' : ''}
    />
  );
};

const MoonShape = ({ x, y, color, highlight }) => {
  // Creates crescent - cutout is SMALLER than main circle, positioned right
  // offset = 0.4 * radius, cutout radius = 0.6 * radius = thick crescent
  // Includes fill and stroke like experiment CSS
  const size = highlight ? 21 : 14;
  const maskId = `moon-mask-${Math.round(x)}-${Math.round(y)}`;
  return (
    <g className={highlight ? 'shape-highlight' : ''} opacity={0.8}>
      <defs>
        <mask id={maskId}>
          <circle cx={x} cy={y} r={size} fill="white" />
          <circle cx={x + size * 0.4} cy={y} r={size * 0.6} fill="black" />
        </mask>
      </defs>
      <circle cx={x} cy={y} r={size} fill={`${color}99`} stroke={color} strokeWidth={3} mask={`url(#${maskId})`} />
    </g>
  );
};

const PieShape = ({ x, y, color, highlight }) => {
  const size = highlight ? 21 : 14;
  return (
    <g opacity={0.8} className={highlight ? 'shape-highlight' : ''}>
      <circle cx={x} cy={y} r={size} fill={`${color}66`} stroke={color} strokeWidth={3} />
      <line x1={x - size} y1={y} x2={x + size} y2={y} stroke={color} strokeWidth={3} />
      <line x1={x} y1={y - size} x2={x} y2={y + size} stroke={color} strokeWidth={3} />
    </g>
  );
};

const YinYangShape = ({ x, y, highlight }) => {
  const size = highlight ? 21 : 14;
  const purple = '#6B4D8A';
  const gold = '#d4af37';
  return (
    <g opacity={0.8} className={highlight ? 'shape-highlight' : ''}>
      <circle cx={x} cy={y} r={size} fill={`${purple}CC`} stroke={purple} strokeWidth={3} />
      <path d={`M ${x} ${y - size} A ${size / 2} ${size / 2} 0 0 1 ${x} ${y} A ${size / 2} ${size / 2} 0 0 0 ${x} ${y + size} A ${size} ${size} 0 0 1 ${x} ${y - size}`} fill={`${gold}CC`} />
      <circle cx={x} cy={y - size / 2} r={size / 5} fill={`${purple}CC`} />
      <circle cx={x} cy={y + size / 2} r={size / 5} fill={`${gold}CC`} />
    </g>
  );
};

const WorldShape = ({ x, y, highlight }) => {
  const size = highlight ? 21 : 14;
  const purple = '#6B4D8A';
  const gold = '#d4af37';
  return (
    <g opacity={0.8} className={highlight ? 'shape-highlight' : ''}>
      <circle cx={x} cy={y} r={size} fill={`${purple}66`} stroke={purple} strokeWidth={3} />
      <rect x={x - 5} y={y - size + 2} width={10} height={size * 2 - 4} fill={`${gold}EE`} />
    </g>
  );
};

// Get shape component for channel
function getShapeForChannel(channel, x, y, color, highlight) {
  switch (channel) {
    case 'Cognition': return <CircleShape x={x} y={y} color={color} highlight={highlight} />;
    case 'Structure': return <SquareShape x={x} y={y} color={color} highlight={highlight} />;
    case 'Intent': return <TriangleShape x={x} y={y} color={color} highlight={highlight} />;
    case 'Resonance': return <MoonShape x={x} y={y} color={color} highlight={highlight} />;
    default: return <PieShape x={x} y={y} color={color} highlight={highlight} />;
  }
}

// Divider size from experiment: 240 * INNER_COMPRESS = 144
const DIVIDER_SIZE = Math.round(240 * INNER_COMPRESS);  // 144
const DIVIDER_ARM = DIVIDER_SIZE / 2;  // 72

// House divider component - matches experiment positioning exactly
const HouseDivider = ({ house, x, y, rotation, color }) => {
  // Divider center is offset from house center by SHAPE_Y_CENTER
  // For rotated houses, this offset gets rotated too
  const rad = (rotation * Math.PI) / 180;
  let drawX, drawY;

  if (rotation === 0) {
    drawX = x;
    drawY = y + SHAPE_Y_CENTER;
  } else {
    // From experiment: rotatedX = -offsetY * sin(rad), rotatedY = offsetY * cos(rad)
    drawX = x - SHAPE_Y_CENTER * Math.sin(rad);
    drawY = y + SHAPE_Y_CENTER * Math.cos(rad);
  }

  return (
    <g transform={`translate(${drawX}, ${drawY}) rotate(${rotation})`}>
      <line x1={0} y1={-DIVIDER_ARM} x2={0} y2={DIVIDER_ARM} stroke={color} strokeWidth={4} opacity={0.7} />
      <line x1={-DIVIDER_ARM} y1={0} x2={DIVIDER_ARM} y2={0} stroke={color} strokeWidth={4} opacity={0.7} />
    </g>
  );
};

// House indicator badge - matches experiment positioning exactly
// Badge is child of divider in experiment, so inherits rotation
// We calculate world coords by: dividerCenter + localOffset rotated
// Then ROTATE the shape to match the divider's rotation
const HouseIndicator = ({ house, x, y, rotation, color }) => {
  const channel = HOUSE_CHANNELS[house];
  const inwardOffset = 18;  // From experiment

  // Badge position in LOCAL coordinates relative to divider CENTER
  // For upper houses: place at bottom of divider (+Y in local = towards map center)
  // For lower houses: place at top of divider (-Y in local = towards map center)
  const isLowerHouse = (house === 'body' || house === 'spirit');
  const localY = isLowerHouse
    ? -(DIVIDER_ARM + inwardOffset)   // -90: above divider center
    : (DIVIDER_ARM + inwardOffset);   // +90: below divider center

  // Total offset from house center (SHAPE_Y_CENTER positions divider, localY positions badge within)
  const totalOffset = SHAPE_Y_CENTER + localY;

  // Transform to world coordinates
  const rad = (rotation * Math.PI) / 180;
  const worldX = x - totalOffset * Math.sin(rad);
  const worldY = y + totalOffset * Math.cos(rad);

  const size = 14;  // shapeSize/2 = 28/2

  // Wrap each shape in a group with rotation transform (inherits divider rotation)
  const rotateTransform = `rotate(${rotation}, ${worldX}, ${worldY})`;

  switch (channel) {
    case 'Cognition': // Circle (Mind - green) - rotation doesn't affect circles
      return <circle cx={worldX} cy={worldY} r={size} fill={color} stroke={color} strokeWidth={2} opacity={0.9} />;
    case 'Structure': // Square (Body - brown)
      return (
        <g transform={rotateTransform} opacity={0.9}>
          <rect x={worldX - size} y={worldY - size} width={size * 2} height={size * 2} rx={2} fill={color} stroke={color} strokeWidth={2} />
        </g>
      );
    case 'Intent': // Triangle (Spirit - red)
      const triPoints = `${worldX},${worldY - size} ${worldX - size},${worldY + size * 0.7} ${worldX + size},${worldY + size * 0.7}`;
      return (
        <g transform={rotateTransform} opacity={0.9}>
          <polygon points={triPoints} fill={color} />
        </g>
      );
    case 'Resonance': // Moon (Emotion - blue) - thick crescent
      const moonMaskId = `moon-indicator-${house}`;
      return (
        <g transform={rotateTransform} opacity={0.9}>
          <defs>
            <mask id={moonMaskId}>
              <circle cx={worldX} cy={worldY} r={size} fill="white" />
              <circle cx={worldX + size * 0.4} cy={worldY} r={size * 0.6} fill="black" />
            </mask>
          </defs>
          <circle cx={worldX} cy={worldY} r={size} fill={color} mask={`url(#${moonMaskId})`} />
        </g>
      );
    default: // Pie/crosshair (Gestalt - purple) - rotation doesn't affect symmetric cross
      return (
        <g opacity={0.9}>
          <circle cx={worldX} cy={worldY} r={size} fill={`${color}80`} stroke={color} strokeWidth={2} />
          <line x1={worldX - size} y1={worldY} x2={worldX + size} y2={worldY} stroke={color} strokeWidth={2} />
          <line x1={worldX} y1={worldY - size} x2={worldX} y2={worldY + size} stroke={color} strokeWidth={2} />
        </g>
      );
  }
};

// Bound/Agent indicator - shows arrow (bounds) or plus (agents) next to archetype shape
// Positioned on the "opening side" of the house, arrow points toward/away from map center
const CardTypeIndicator = ({ x, y, archetypeId, cardType, isInner }) => {
  // Determine which side to place indicator (opening side of house)
  const indicatorSide = RIGHT_SIDE_ARCHETYPES.has(archetypeId) ? 'right' : 'left';

  // Determine which side of the MAP this archetype is on (for arrow direction)
  const mapSide = LEFT_MAP_ARCHETYPES.has(archetypeId) ? 'left' :
                  RIGHT_MAP_ARCHETYPES.has(archetypeId) ? 'right' : 'center';

  const indicatorOffset = 38; // Distance from shape center (increased for visibility)
  const arrowLength = 16;
  const arrowHeadSize = 7;

  // Position the indicator to left or right of shape (in local coords)
  const indicatorX = indicatorSide === 'left' ? x - indicatorOffset : x + indicatorOffset;
  const indicatorY = y;

  if (cardType === 'agent') {
    // Plus sign for agents
    const plusSize = 8;
    return (
      <g opacity={0.95}>
        <line
          x1={indicatorX - plusSize} y1={indicatorY}
          x2={indicatorX + plusSize} y2={indicatorY}
          stroke="white" strokeWidth={3.5} strokeLinecap="round"
        />
        <line
          x1={indicatorX} y1={indicatorY - plusSize}
          x2={indicatorX} y2={indicatorY + plusSize}
          stroke="white" strokeWidth={3.5} strokeLinecap="round"
        />
      </g>
    );
  }

  // Arrow for bounds - ALL arrows are VERTICAL in local coords
  // Arrow direction depends on which house the archetype is in:
  // - Upper houses (Gestalt, Mind, Emotion): house center is ABOVE map center
  //   DOWN local points toward map center, UP local points away
  // - Lower houses (Body, Spirit): house center is BELOW map center
  //   UP local points toward map center (after rotation), DOWN local points away
  // Inner bound: arrow points toward center
  // Outer bound: arrow points away from center
  const loc = ARCHETYPE_LOCATIONS[archetypeId];
  const isUpperHouse = loc && ['gestalt', 'mind', 'emotion'].includes(loc.house);
  const arrowDir = isUpperHouse
    ? (isInner ? 1 : -1)   // Upper: inner=down toward center, outer=up away
    : (isInner ? -1 : 1);  // Lower: inner=up toward center, outer=down away
  const arrowStartY = indicatorY - (arrowDir * arrowLength / 2);
  const arrowEndY = indicatorY + (arrowDir * arrowLength / 2);
  const headY = arrowEndY;
  const headBaseY = headY - (arrowDir * arrowHeadSize);

  return (
    <g opacity={0.95}>
      <line
        x1={indicatorX} y1={arrowStartY}
        x2={indicatorX} y2={arrowEndY}
        stroke="white" strokeWidth={3.5} strokeLinecap="round"
      />
      <polygon
        points={`${indicatorX},${headY} ${indicatorX - arrowHeadSize},${headBaseY} ${indicatorX + arrowHeadSize},${headBaseY}`}
        fill="white"
      />
    </g>
  );
};

// Animated arrow component (marching dashes)
const AnimatedArrow = ({ fromX, fromY, toX, toY }) => {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const len = Math.sqrt(dx * dx + dy * dy);

  // Shorten arrow to not overlap shapes
  const pullBack = 25;
  const startX = fromX + (dx / len) * pullBack;
  const startY = fromY + (dy / len) * pullBack;
  const endX = toX - (dx / len) * pullBack;
  const endY = toY - (dy / len) * pullBack;

  // Arrowhead geometry - larger size for visibility
  const arrowSize = 24;
  const angle = Math.atan2(dy, dx);
  const arrowX1 = endX - arrowSize * Math.cos(angle - Math.PI / 6);
  const arrowY1 = endY - arrowSize * Math.sin(angle - Math.PI / 6);
  const arrowX2 = endX - arrowSize * Math.cos(angle + Math.PI / 6);
  const arrowY2 = endY - arrowSize * Math.sin(angle + Math.PI / 6);

  return (
    <g className="animated-arrow">
      {/* Arrow line with marching dashes */}
      <line
        x1={startX}
        y1={startY}
        x2={endX}
        y2={endY}
        stroke="rgba(255, 255, 255, 0.9)"
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray="10 8"
        style={{ animation: 'marchLine 0.6s linear infinite' }}
      />
      {/* Arrowhead */}
      <polygon
        points={`${endX},${endY} ${arrowX1},${arrowY1} ${arrowX2},${arrowY2}`}
        fill="rgba(255, 255, 255, 0.9)"
        style={{ animation: 'pulseLine 1.5s ease-in-out infinite' }}
      />
    </g>
  );
};

const Minimap = ({
  highlightId = null,
  fromId = null,    // Source archetype (card's home)
  toId = null,      // Target archetype (position)
  size = 'md',
  singleMode = false,  // Only show fromId and toId shapes (hide all others)
  fromCardType = null, // 'archetype' | 'bound' | 'agent' - type of the fromId card
  boundIsInner = null, // true for inner bounds (1-5), false for outer bounds (6-10)
  toCardType = null,   // 'archetype' | 'bound' | 'agent' - type of the toId card (for corrections)
  toBoundIsInner = null, // true for inner bounds (1-5), false for outer bounds (6-10) for toId
  className = ''
}) => {
  // Size multipliers - scaled to fit containers
  const sizeMultipliers = {
    xs: 0.15,
    sm: 0.2,
    md: 0.25,
    lg: 0.35,
    xl: 0.72,   // ~425x380 for modal popup
    card: 0.34  // ~200x180 to fit 200x200 square container
  };
  const scale = sizeMultipliers[size] || 0.25;
  const width = MAP_WIDTH * scale;
  const height = MAP_HEIGHT * scale;

  // Get positions for arrow if both IDs provided
  const fromPos = fromId !== null ? getArchetypePosition(fromId) : null;
  const toPos = toId !== null ? getArchetypePosition(toId) : null;
  const showArrow = fromPos && toPos && fromId !== toId;

  // Determine which IDs to highlight
  const highlightIds = new Set();
  if (highlightId !== null) highlightIds.add(highlightId);
  if (fromId !== null) highlightIds.add(fromId);
  if (toId !== null) highlightIds.add(toId);

  return (
    <div className={`minimap-container ${className}`}>
      <svg
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        width={width}
        height={height}
        className="minimap-svg"
        style={{ background: 'transparent' }}
      >
        {/* CSS animations for arrow and pulsating shapes */}
        <defs>
          <style>{`
            @keyframes marchLine {
              0% { stroke-dashoffset: 0; }
              100% { stroke-dashoffset: -18; }
            }
            @keyframes pulseLine {
              0%, 100% { opacity: 0.7; }
              50% { opacity: 1; }
            }
            @keyframes pulseShape {
              0%, 100% {
                filter: brightness(1.3) drop-shadow(0 0 6px rgba(255,255,255,0.6));
              }
              50% {
                filter: brightness(1.8) drop-shadow(0 0 12px rgba(255,255,255,1));
              }
            }
            .shape-highlight {
              animation: pulseShape 1.5s ease-in-out infinite;
            }
          `}</style>
        </defs>

        {/* House dividers - always visible */}
        {Object.entries(HOUSES).map(([name, house]) => (
          <HouseDivider
            key={`divider-${name}`}
            house={name}
            x={house.x}
            y={house.y}
            rotation={house.rotation}
            color={HOUSE_COLORS[name]}
          />
        ))}

        {/* House indicator shapes - always visible */}
        {Object.entries(HOUSES).map(([name, house]) => (
          <HouseIndicator
            key={`indicator-${name}`}
            house={name}
            x={house.x}
            y={house.y}
            rotation={house.rotation}
            color={HOUSE_COLORS[name]}
          />
        ))}

        {/* Portals - only show if highlighted in singleMode */}
        {(!singleMode || highlightIds.has(10)) && (
          <YinYangShape x={PORTALS[10].x} y={PORTALS[10].y} highlight={highlightIds.has(10)} />
        )}
        {(!singleMode || highlightIds.has(21)) && (
          <WorldShape x={PORTALS[21].x} y={PORTALS[21].y} highlight={highlightIds.has(21)} />
        )}

        {/* Archetypes - rendered inside rotated house groups (EXACTLY like experiment) */}
        {Object.entries(HOUSES).map(([houseName, house]) => (
          <g
            key={`house-group-${houseName}`}
            transform={`translate(${house.x}, ${house.y}) rotate(${house.rotation})`}
          >
            {house.archetypes.map((id, index) => {
              // In single mode, only show highlighted shapes
              if (singleMode && !highlightIds.has(id)) return null;

              const offset = CARD_OFFSETS[houseName][index];
              // LOCAL coordinates (relative to house center) with shape compression
              const localX = offset.x * SHAPE_COMPRESS;
              const localY = offset.y * SHAPE_COMPRESS;

              const channel = ARCHETYPE_CHANNELS[id];
              const color = CHANNEL_COLORS[channel];
              const isHighlight = highlightIds.has(id);

              // Determine if this archetype needs a bound/agent indicator
              // Show indicator for fromId (source card) if it's a bound or agent
              const showFromIndicator = id === fromId && fromCardType && fromCardType !== 'archetype';
              // Show indicator for toId (target card) if it's a bound or agent (for corrections)
              const showToIndicator = id === toId && toCardType && toCardType !== 'archetype';

              return (
                <g key={`arch-${id}`}>
                  {getShapeForChannel(channel, localX, localY, color, isHighlight)}
                  {showFromIndicator && (
                    <CardTypeIndicator
                      x={localX}
                      y={localY}
                      archetypeId={id}
                      cardType={fromCardType}
                      isInner={boundIsInner}
                    />
                  )}
                  {showToIndicator && (
                    <CardTypeIndicator
                      x={localX}
                      y={localY}
                      archetypeId={id}
                      cardType={toCardType}
                      isInner={toBoundIsInner}
                    />
                  )}
                </g>
              );
            })}
          </g>
        ))}

        {/* Animated arrow between from and to */}
        {showArrow && (
          <AnimatedArrow
            fromX={fromPos.x}
            fromY={fromPos.y}
            toX={toPos.x}
            toY={toPos.y}
          />
        )}
      </svg>
    </div>
  );
};

export default Minimap;
