'use client';

import React, { useState, useCallback, memo } from 'react';
import { getCardImagePath, getCardType } from '../../lib/cardImages.js';

/**
 * CardNode - Individual card rendering for the training map
 *
 * Supports:
 * - Different sizes for archetypes, bounds, agents (matching index.html)
 * - Rotation per house grouping
 * - Visual states for training presentations
 */

// Card sizes matching index.html CONFIG
const CARD_SIZES = {
  archetype: { width: 120, height: 168 },  // 120 * 1.4
  portal: { width: 120, height: 168 },
  bound: { width: 45, height: 63 },        // 45 * 1.4
  agent: { width: 50, height: 70 }         // 50 * 1.4
};

// Channel to element color mapping (matching index.html)
const ELEMENT_COLORS = {
  Intent: '#C44444',      // Fire - Red
  Cognition: '#4A8B4A',   // Air - Green
  Resonance: '#3D6A99',   // Water - Blue
  Structure: '#8B6B3D',   // Earth - Brown
  null: '#6B4D8A'         // Quintessence - Purple
};

// Get channel for a card (for element coloring)
function getCardChannel(id, cardType) {
  // Gestalt archetypes have special governing colors
  const GESTALT_CHANNELS = {
    0: 'Intent',      // Potential governs Spirit
    1: 'Structure',   // Will governs Body
    19: 'Cognition',  // Actualization governs Mind
    20: 'Resonance'   // Awareness governs Emotion
  };

  if (id <= 21) {
    // Archetypes - check gestalt first
    if (GESTALT_CHANNELS[id] !== undefined) {
      return GESTALT_CHANNELS[id];
    }
    // Portals and other archetypes get null (purple)
    if (id === 10 || id === 21) return null;
    // Other archetypes - would need to look up, for now return null
    return null;
  }
  // Bounds and agents - determined by their channel attribute
  // This would need to be passed in or looked up
  return null;
}

const CardNode = memo(({
  id,
  name,
  x,
  y,
  rotation = 0,
  cardType = 'archetype',
  channel = null,
  revealed = true,
  highlighted = false,
  dimmed = false,
  spinning = false,
  onClick,
  onDoubleClick,
  showLabel = false,
  className = ''
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const imagePath = getCardImagePath(id);
  const detectedType = getCardType(id);
  const effectiveType = cardType || detectedType;
  const size = CARD_SIZES[effectiveType] || CARD_SIZES.archetype;
  const elementColor = ELEMENT_COLORS[channel] || ELEMENT_COLORS[null];

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  const handleClick = useCallback((e) => {
    e.stopPropagation();
    if (onClick) onClick(id, e);
  }, [id, onClick]);

  const handleDoubleClick = useCallback((e) => {
    e.stopPropagation();
    if (onDoubleClick) onDoubleClick(id, e);
  }, [id, onDoubleClick]);

  // Position: x,y is center, so offset by half width/height
  // This matches index.html: left = house.x + offset.x - cardSize/2
  const left = x - size.width / 2;
  const top = y - size.height / 2;

  return (
    <div
      className={`card-node absolute ${effectiveType} ${className}`}
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        // Rotation ONLY applies to bounds/agents, NOT archetypes/portals (matching index.html)
        transform: (rotation !== 0 && (effectiveType === 'bound' || effectiveType === 'agent'))
          ? `rotate(${rotation}deg)`
          : undefined,
        '--card-rotation': `${rotation}deg`,
        opacity: revealed ? (dimmed ? 0.3 : 1) : 0,
        pointerEvents: revealed ? 'auto' : 'none',
        transition: spinning ? 'none' : 'opacity 0.4s ease, transform 0.2s ease',
        cursor: onClick ? 'pointer' : 'default',
        zIndex: highlighted ? 200 : (effectiveType === 'archetype' || effectiveType === 'portal' ? 10 : 5),
        isolation: 'isolate'
      }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      data-card-id={id}
      data-card-type={effectiveType}
    >
      {/* Element background (matches index.html .element-bg) */}
      <div
        className="element-bg absolute rounded-lg"
        style={{
          inset: effectiveType === 'archetype' || effectiveType === 'portal' ? '-6px' : '-4px',
          background: elementColor,
          opacity: 0.85,
          zIndex: -1,
          boxShadow: effectiveType === 'archetype' || effectiveType === 'portal'
            ? '0 2px 12px rgba(0,0,0,0.4)'
            : '0 1px 6px rgba(0,0,0,0.3)'
        }}
      />

      {/* Highlight glow effect */}
      {highlighted && (
        <div
          className="absolute inset-0 rounded card-highlight-pulse"
          style={{
            boxShadow: `0 0 20px ${elementColor}, 0 0 40px ${elementColor}`,
            zIndex: -1
          }}
        />
      )}

      {/* Loading placeholder */}
      {!imageLoaded && !imageError && (
        <div
          className="absolute inset-0 bg-zinc-800 animate-pulse rounded"
        />
      )}

      {/* Card image */}
      {imagePath && !imageError && (
        <img
          src={imagePath}
          alt={name || `Card ${id}`}
          className="w-full h-full object-cover rounded"
          style={{
            opacity: imageLoaded ? 1 : 0,
            transition: 'opacity 0.3s ease',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
          }}
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading="lazy"
          draggable={false}
        />
      )}

      {/* Fallback for missing images */}
      {imageError && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 text-zinc-500 text-xs text-center p-1 rounded">
          {id}
        </div>
      )}

      {/* Card label (for archetypes/portals, matching index.html) */}
      {showLabel && (effectiveType === 'archetype' || effectiveType === 'portal') && name && (
        <div
          className="card-label absolute left-1/2 -bottom-6 transform -translate-x-1/2 whitespace-nowrap text-xs text-white/90 font-medium tracking-wide"
          style={{
            textShadow: '0 1px 3px rgba(0, 0, 0, 0.9)',
            fontSize: '0.7rem'
          }}
        >
          {name}
        </div>
      )}

      {/* Animation keyframes */}
      <style jsx>{`
        @keyframes cardHighlightPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        .card-highlight-pulse {
          animation: cardHighlightPulse 2s ease-in-out infinite;
        }
        .card-node:hover {
          z-index: 200 !important;
        }
        .card-node.archetype:hover,
        .card-node.portal:hover {
          transform: scale(1.3);
        }
        .card-node.bound:hover,
        .card-node.agent:hover {
          transform: rotate(var(--card-rotation, 0deg)) scale(1.3);
        }
      `}</style>
    </div>
  );
});

CardNode.displayName = 'CardNode';

export default CardNode;
