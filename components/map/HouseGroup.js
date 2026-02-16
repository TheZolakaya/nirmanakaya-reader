'use client';

import React, { memo } from 'react';
import CardNode from './CardNode.js';
import { getHouseContainer, getArchetypeLocalPosition } from '../../lib/map/positions.js';
import { ARCHETYPES } from '../../lib/archetypes.js';

/**
 * HouseGroup - Rotated container for archetype cards
 * Matches index.html approach exactly: container is rotated, cards inside use local coordinates
 */

const HouseGroup = memo(({
  houseName,
  highlightedCards = new Set(),
  selectedCard = null,
  onCardClick,
  showLabels = true
}) => {
  const container = getHouseContainer(houseName);
  if (!container) return null;

  return (
    <div
      className={`archetype-group archetype-group-${houseName}`}
      style={{
        position: 'absolute',
        left: `${container.left}px`,
        top: `${container.top}px`,
        width: `${container.width}px`,
        height: `${container.height}px`,
        transform: container.rotation !== 0 ? `rotate(${container.rotation}deg)` : undefined,
        transformOrigin: 'center center',
        zIndex: 2  // Above house background blocks (zIndex: 0)
      }}
    >
      {container.archetypeOrder.map(archetypeId => {
        const pos = getArchetypeLocalPosition(archetypeId);
        if (!pos) return null;

        const archetype = ARCHETYPES[archetypeId];
        const isHighlighted = highlightedCards.has(archetypeId);
        const isDimmed = selectedCard !== null && selectedCard !== archetypeId && !highlightedCards.has(archetypeId);

        return (
          <CardNode
            key={archetypeId}
            id={archetypeId}
            name={archetype?.name || `Archetype ${archetypeId}`}
            left={pos.left}
            top={pos.top}
            width={pos.width}
            height={pos.height}
            cardType="archetype"
            channel={archetype?.channel || null}
            revealed={true}
            highlighted={isHighlighted}
            dimmed={isDimmed}
            onClick={onCardClick}
            showLabel={showLabels}
          />
        );
      })}
    </div>
  );
});

HouseGroup.displayName = 'HouseGroup';

export default HouseGroup;
