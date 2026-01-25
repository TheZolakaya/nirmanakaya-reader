'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import MapCanvas from '../../components/map/MapCanvas.js';
import CardNode from '../../components/map/CardNode.js';
import { getMandalaPositions, MANDALA_DIMENSIONS, getCardSize } from '../../lib/map/positions.js';
import { ARCHETYPES, BOUNDS, AGENTS } from '../../lib/archetypes.js';

/**
 * Learning Page - Training presentations for the 78 card architecture
 *
 * This is the React version of the training map, separate from /map (static HTML)
 * Renders all 78 cards in their exact positions from index.html
 */

// Get card name
function getCardName(id) {
  if (id >= 0 && id <= 21) {
    return ARCHETYPES[id]?.name || `Archetype ${id}`;
  } else if (id >= 22 && id <= 61) {
    return BOUNDS[id]?.name || `Bound ${id}`;
  } else if (id >= 62 && id <= 77) {
    return AGENTS[id]?.name || `Agent ${id}`;
  }
  return `Card ${id}`;
}

// Get card channel for element coloring
function getCardChannel(id) {
  if (id >= 0 && id <= 21) {
    // Gestalt archetypes have governing colors
    const GESTALT_CHANNELS = {
      0: 'Intent',      // Potential governs Spirit (Fire)
      1: 'Structure',   // Will governs Body (Earth)
      19: 'Cognition',  // Actualization governs Mind (Air)
      20: 'Resonance'   // Awareness governs Emotion (Water)
    };
    if (GESTALT_CHANNELS[id] !== undefined) return GESTALT_CHANNELS[id];
    // Portals
    if (id === 10 || id === 21) return null;
    // Other archetypes - use their channel from data
    return ARCHETYPES[id]?.channel || null;
  } else if (id >= 22 && id <= 61) {
    return BOUNDS[id]?.channel || null;
  } else if (id >= 62 && id <= 77) {
    return AGENTS[id]?.channel || null;
  }
  return null;
}

// Get card type
function getCardTypeFromId(id) {
  if (id === 10 || id === 21) return 'portal';
  if (id >= 0 && id <= 21) return 'archetype';
  if (id >= 22 && id <= 61) return 'bound';
  if (id >= 62 && id <= 77) return 'agent';
  return 'archetype';
}

export default function LearningPage() {
  const [currentLayout, setCurrentLayout] = useState('mandala');
  const [viewState, setViewState] = useState({ zoom: 1, pan: { x: 0, y: 0 } });
  const [selectedCard, setSelectedCard] = useState(null);
  const [highlightedCards, setHighlightedCards] = useState(new Set());

  // Get all card positions for current layout
  const cardPositions = useMemo(() => {
    if (currentLayout === 'mandala') {
      return getMandalaPositions();
    }
    return getMandalaPositions();
  }, [currentLayout]);

  // Build card data array with all properties
  const cards = useMemo(() => {
    return cardPositions.map(pos => ({
      id: pos.id,
      name: getCardName(pos.id),
      x: pos.x,
      y: pos.y,
      rotation: pos.rotation || 0,
      type: pos.type || getCardTypeFromId(pos.id),
      channel: getCardChannel(pos.id),
      revealed: true,
      highlighted: highlightedCards.has(pos.id),
      dimmed: selectedCard !== null && selectedCard !== pos.id && !highlightedCards.has(pos.id)
    }));
  }, [cardPositions, highlightedCards, selectedCard]);

  const handleCardClick = useCallback((cardId) => {
    setSelectedCard(prev => prev === cardId ? null : cardId);
  }, []);

  const handleCardDoubleClick = useCallback((cardId) => {
    console.log('Double-clicked card:', cardId, getCardName(cardId));
  }, []);

  const handleViewChange = useCallback((view) => {
    setViewState(view);
  }, []);

  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedCard(null);
        setHighlightedCards(new Set());
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Find selected card data
  const selectedCardData = selectedCard !== null
    ? cards.find(c => c.id === selectedCard)
    : null;

  return (
    <div className="min-h-screen bg-zinc-950 text-white overflow-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-zinc-900/90 backdrop-blur-sm border-b border-amber-500/20">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="text-zinc-500 hover:text-zinc-300 transition-colors">
              ←
            </a>
            <h1 className="text-xl font-semibold text-amber-400">
              Learning
            </h1>
            <span className="text-sm text-zinc-500">
              78 Signatures
            </span>
          </div>

          <div className="flex items-center gap-4">
            <select
              value={currentLayout}
              onChange={(e) => setCurrentLayout(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-300 focus:outline-none focus:border-amber-500/50"
            >
              <option value="mandala">Mandala Layout</option>
              <option value="archetypes-linear" disabled>Archetypes Linear (Soon)</option>
              <option value="archetype-focus" disabled>Archetype Focus (Soon)</option>
              <option value="bounds-grid" disabled>Bounds Grid (Soon)</option>
              <option value="agents-grid" disabled>Agents Grid (Soon)</option>
            </select>

            <div className="text-xs text-zinc-500 font-mono">
              {Math.round(viewState.zoom * 100)}%
            </div>
          </div>
        </div>
      </header>

      {/* Main canvas area */}
      <main className="pt-14 h-screen">
        <MapCanvas
          width={MANDALA_DIMENSIONS.width}
          height={MANDALA_DIMENSIONS.height}
          initialZoom={0.5}
          onViewChange={handleViewChange}
          className="w-full h-full bg-zinc-950"
        >
          {/* Render all 78 cards */}
          {cards.map(card => (
            <CardNode
              key={card.id}
              id={card.id}
              name={card.name}
              x={card.x}
              y={card.y}
              rotation={card.rotation}
              cardType={card.type}
              channel={card.channel}
              revealed={card.revealed}
              highlighted={card.highlighted}
              dimmed={card.dimmed}
              onClick={handleCardClick}
              onDoubleClick={handleCardDoubleClick}
              showLabel={card.type === 'archetype' || card.type === 'portal'}
            />
          ))}
        </MapCanvas>
      </main>

      {/* Selected card info panel */}
      {selectedCardData && (
        <div className="fixed bottom-20 left-4 z-50 bg-zinc-900/95 backdrop-blur-sm border border-amber-500/30 rounded-lg p-4 max-w-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-amber-400 font-semibold">
              {selectedCardData.name}
            </span>
            <button
              onClick={() => setSelectedCard(null)}
              className="text-zinc-500 hover:text-zinc-300 transition-colors text-xl leading-none"
            >
              ×
            </button>
          </div>
          <div className="text-xs text-zinc-500 space-y-1">
            <div>ID: {selectedCardData.id} · Type: {selectedCardData.type}</div>
            <div>Position: ({Math.round(selectedCardData.x)}, {Math.round(selectedCardData.y)})</div>
            {selectedCardData.channel && <div>Channel: {selectedCardData.channel}</div>}
            {selectedCardData.rotation !== 0 && <div>Rotation: {selectedCardData.rotation}°</div>}
          </div>
        </div>
      )}

      {/* Help hint */}
      <div className="fixed bottom-4 left-4 text-xs text-zinc-600 hidden sm:block z-40">
        Click card to select · Esc to clear · Scroll to zoom · Drag to pan
      </div>

      {/* Decorative background */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(251, 191, 36, 0.03) 0%, transparent 70%)'
        }}
      />
    </div>
  );
}
