'use client';

import React, { useState, useCallback, memo } from 'react';
import { getCardImagePath, getCardType } from '../../lib/cardImages.js';

// Convert full image path to thumbnail path (lighter weight for bounds/agents)
function getThumbPath(fullPath) {
  if (!fullPath) return fullPath;
  return fullPath.replace('/map/', '/map/thumbs/');
}

/**
 * CardNode - Individual card rendering for the training map
 * Uses CSS top-left positioning to match index.html exactly
 */

// Channel to element color mapping (matching index.html)
const ELEMENT_COLORS = {
  Intent: '#C44444',      // Fire - Red
  Cognition: '#4A8B4A',   // Air - Green
  Resonance: '#3D6A99',   // Water - Blue
  Structure: '#8B6B3D',   // Earth - Brown
  null: '#6B4D8A'         // Quintessence - Purple
};

// Gestalt archetypes use colors of the houses they GOVERN (not purple)
const GESTALT_ARCHETYPE_CHANNELS = {
  0: 'Intent',      // Potential governs Spirit → Fire/Red
  1: 'Structure',   // Will governs Body → Earth/Brown
  19: 'Cognition',  // Actualization governs Mind → Air/Green
  20: 'Resonance'   // Awareness governs Emotion → Water/Blue
};

const CardNode = memo(({
  id,
  name,
  // CSS positioning (top-left based)
  left,
  top,
  width,
  height,
  // Optional rotation (for bounds/agents)
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
  const [imageError, setImageError] = useState(false);

  const fullImagePath = getCardImagePath(id);
  const detectedType = getCardType(id);
  const effectiveType = cardType || detectedType?.toLowerCase() || 'archetype';

  // Gestalt archetypes use their governing house's channel color
  const effectiveChannel = GESTALT_ARCHETYPE_CHANNELS[id] !== undefined
    ? GESTALT_ARCHETYPE_CHANNELS[id]
    : channel;
  const elementColor = ELEMENT_COLORS[effectiveChannel] || ELEMENT_COLORS[null];

  // Use thumbnails for bounds and agents (lighter weight)
  const imagePath = (effectiveType === 'bound' || effectiveType === 'agent')
    ? getThumbPath(fullImagePath)
    : fullImagePath;

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

  // Element background inset based on card type
  const elementInset = (effectiveType === 'archetype' || effectiveType === 'portal') ? '-6px' : '-4px';

  return (
    <div
      className={`card ${effectiveType} ${className}`}
      style={{
        position: 'absolute',
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        // Height NOT set - determined by image natural aspect ratio (matches original)
        transform: rotation !== 0 ? `rotate(${rotation}deg)` : undefined,
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
      {/* Element background */}
      <div
        className="element-bg"
        style={{
          position: 'absolute',
          inset: elementInset,
          borderRadius: '8px',
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
          className="card-highlight-pulse"
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '4px',
            boxShadow: `0 0 20px ${elementColor}, 0 0 40px ${elementColor}`,
            zIndex: -1
          }}
        />
      )}

      {/* Card image - width 100%, height determined by natural aspect ratio */}
      {imagePath && !imageError && (
        <img
          src={imagePath}
          alt={name || `Card ${id}`}
          style={{
            display: 'block',
            width: '100%',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
          }}
          onError={handleImageError}
          draggable={false}
        />
      )}

      {/* Fallback for missing images */}
      {imageError && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#18181b',
          color: '#71717a',
          fontSize: '0.75rem',
          textAlign: 'center',
          padding: '4px',
          borderRadius: '4px',
          aspectRatio: '1 / 1.4'  // Fallback aspect ratio
        }}>
          {id}
        </div>
      )}

      {/* Card label - ON the card, white background, dark text (matches original) */}
      {showLabel && (effectiveType === 'archetype' || effectiveType === 'portal') && name && (
        <div
          className="card-label"
          style={{
            position: 'absolute',
            left: '50%',
            bottom: '6px',
            transform: 'translateX(-50%)',
            whiteSpace: 'nowrap',
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: '0.6rem',
            letterSpacing: '0.03em',
            color: '#333',
            background: 'rgba(255, 255, 255, 0.7)',
            borderRadius: '4px',
            padding: '2px 6px',
            pointerEvents: 'none'
          }}
        >
          {name}
        </div>
      )}

      <style jsx>{`
        @keyframes cardHighlightPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        .card-highlight-pulse {
          animation: cardHighlightPulse 2s ease-in-out infinite;
        }
        .card:hover {
          z-index: 200 !important;
        }
        .card.archetype:hover,
        .card.portal:hover {
          transform: scale(1.3);
        }
        .card.bound:hover,
        .card.agent:hover {
          transform: rotate(var(--card-rotation, 0deg)) scale(1.3);
        }
      `}</style>
    </div>
  );
});

CardNode.displayName = 'CardNode';

export default CardNode;
