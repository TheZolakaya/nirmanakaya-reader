'use client';

import React, { useState, useCallback } from 'react';
import { getCardImagePath, getCardType } from '../../lib/cardImages.js';

/**
 * CardImage - Displays a card's artwork with mystical styling
 *
 * The card image appears as a sacred artifact, with status-based
 * aura effects and click-to-enlarge functionality.
 */

// Status to color mapping (matches system colors)
const STATUS_AURAS = {
  1: { // Balanced - Emerald
    glow: 'rgba(16, 185, 129, 0.4)',
    glowIntense: 'rgba(16, 185, 129, 0.7)',
    border: 'rgba(16, 185, 129, 0.6)',
    name: 'balanced'
  },
  2: { // Too Much - Amber
    glow: 'rgba(245, 158, 11, 0.4)',
    glowIntense: 'rgba(245, 158, 11, 0.7)',
    border: 'rgba(245, 158, 11, 0.6)',
    name: 'excess'
  },
  3: { // Too Little - Sky
    glow: 'rgba(56, 189, 248, 0.4)',
    glowIntense: 'rgba(56, 189, 248, 0.7)',
    border: 'rgba(56, 189, 248, 0.6)',
    name: 'deficiency'
  },
  4: { // Unacknowledged - Violet
    glow: 'rgba(167, 139, 250, 0.4)',
    glowIntense: 'rgba(167, 139, 250, 0.7)',
    border: 'rgba(167, 139, 250, 0.6)',
    name: 'shadow'
  }
};

// Default aura for unknown status
const DEFAULT_AURA = {
  glow: 'rgba(251, 191, 36, 0.3)',
  glowIntense: 'rgba(251, 191, 36, 0.6)',
  border: 'rgba(251, 191, 36, 0.5)',
  name: 'neutral'
};

const CardImage = ({
  transient,
  status = 1,
  cardName = '',
  size = 'default', // 'compact', 'default', 'large'
  showFrame = true,
  className = '',
  onImageClick // Callback when image is clicked (to open info modal)
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const imagePath = getCardImagePath(transient);
  const cardType = getCardType(transient);
  const aura = STATUS_AURAS[status] || DEFAULT_AURA;

  // Size configurations
  const sizes = {
    compact: {
      container: 'w-[200px]',
      image: 'max-w-[200px]'
    },
    default: {
      container: 'w-28 sm:w-36 md:w-40',
      image: 'max-w-[112px] sm:max-w-[144px] md:max-w-[160px]'
    },
    large: {
      container: 'w-36 sm:w-44 md:w-52',
      image: 'max-w-[144px] sm:max-w-[176px] md:max-w-[208px]'
    }
  };

  const sizeConfig = sizes[size] || sizes.default;

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  const handleClick = useCallback(() => {
    if (onImageClick) {
      onImageClick();
    }
  }, [onImageClick]);

  if (!imagePath || imageError) {
    return null; // Gracefully hide if no image
  }

  return (
    <>
      {/* Card Image Container */}
      <div
        className={`card-image-container relative flex items-center justify-center ${sizeConfig.container} ${className} ${onImageClick ? 'cursor-pointer' : ''}`}
        onClick={handleClick}
        role={onImageClick ? "button" : undefined}
        tabIndex={onImageClick ? 0 : undefined}
        onKeyDown={onImageClick ? (e) => e.key === 'Enter' && handleClick() : undefined}
        aria-label={onImageClick ? `View ${cardName || 'card'} details` : undefined}
      >
        {/* Outer Glow Layer - Breathing Animation */}
        {showFrame && (
          <div
            className="absolute inset-0 rounded-lg opacity-60 card-aura-pulse"
            style={{
              background: `radial-gradient(ellipse at center, ${aura.glow} 0%, transparent 70%)`,
              transform: 'scale(1.15)',
              filter: 'blur(8px)',
            }}
          />
        )}

        {/* Inner Frame */}
        <div
          className={`
            relative rounded-lg overflow-hidden cursor-pointer
            transition-all duration-300 ease-out
            hover:scale-105 hover:z-10
            ${showFrame ? 'p-[3px]' : ''}
          `}
          style={showFrame ? {
            background: `linear-gradient(135deg, ${aura.border} 0%, transparent 50%, ${aura.border} 100%)`,
            boxShadow: `
              0 0 20px ${aura.glow},
              inset 0 0 15px rgba(0, 0, 0, 0.5)
            `
          } : {}}
        >
          {/* Inner Shadow Frame */}
          {showFrame && (
            <div
              className="absolute inset-[3px] rounded-md pointer-events-none z-10"
              style={{
                boxShadow: `
                  inset 0 0 10px rgba(0, 0, 0, 0.8),
                  inset 0 2px 4px rgba(0, 0, 0, 0.6)
                `
              }}
            />
          )}

          {/* Loading Skeleton */}
          {!imageLoaded && (
            <div
              className={`${sizeConfig.image} aspect-[2/3] bg-zinc-800 animate-pulse rounded-md`}
            />
          )}

          {/* Card Image */}
          <img
            src={imagePath}
            alt={cardName || `Card ${transient}`}
            className={`
              ${sizeConfig.image} w-full h-auto rounded-md
              transition-opacity duration-500
              ${imageLoaded ? 'opacity-100' : 'opacity-0'}
            `}
            style={{
              filter: showFrame ? 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.4))' : 'none'
            }}
            onLoad={handleImageLoad}
            onError={handleImageError}
            loading="lazy"
          />
        </div>

{/* Card type indicator removed - now shown below card name in DepthCard */}
      </div>

      {/* Component Styles */}
      <style jsx>{`
        @keyframes auraPulse {
          0%, 100% {
            opacity: 0.4;
            transform: scale(1.15);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.2);
          }
        }

        .card-aura-pulse {
          animation: auraPulse 4s ease-in-out infinite;
        }
      `}</style>
    </>
  );
};

export default CardImage;
