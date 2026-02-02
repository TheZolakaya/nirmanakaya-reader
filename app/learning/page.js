'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import Link from 'next/link';
import MapCanvas from '../../components/map/MapCanvas.js';
import CardNode from '../../components/map/CardNode.js';
import HouseGroup from '../../components/map/HouseGroup.js';
import LayoutSwitcher from '../../components/map/LayoutSwitcher.js';
import {
  MANDALA_DIMENSIONS,
  CONFIG,
  HOUSES,
  getHouseNames,
  getPortalPosition,
  getBoundPosition,
  getAgentPosition,
  getHouseCenter
} from '../../lib/map/positions.js';
import { LAYOUTS, getLayout } from '../../lib/map/layouts.js';
import { ARCHETYPES, BOUNDS, AGENTS } from '../../lib/archetypes.js';

/**
 * Learning Page - Training presentations for the 78 card architecture
 * Supports multiple layouts for different teaching scenarios
 */

function getCardName(id) {
  if (id >= 0 && id <= 21) return ARCHETYPES[id]?.name || `Archetype ${id}`;
  if (id >= 22 && id <= 61) return BOUNDS[id]?.name || `Bound ${id}`;
  if (id >= 62 && id <= 77) return AGENTS[id]?.name || `Agent ${id}`;
  return `Card ${id}`;
}

function getCardChannel(id) {
  if (id >= 0 && id <= 21) {
    const GESTALT_CHANNELS = {
      0: 'Intent', 1: 'Structure', 19: 'Cognition', 20: 'Resonance'
    };
    if (GESTALT_CHANNELS[id] !== undefined) return GESTALT_CHANNELS[id];
    if (id === 10 || id === 21) return null;
    return ARCHETYPES[id]?.channel || null;
  }
  if (id >= 22 && id <= 61) return BOUNDS[id]?.channel || null;
  if (id >= 62 && id <= 77) return AGENTS[id]?.channel || null;
  return null;
}

function getCardType(id) {
  if (id === 10 || id === 21) return 'portal';
  if (id >= 0 && id <= 21) return 'archetype';
  if (id >= 22 && id <= 61) return 'bound';
  if (id >= 62 && id <= 77) return 'agent';
  return 'unknown';
}

export default function LearningPage() {
  const [viewState, setViewState] = useState({ zoom: 1, pan: { x: 0, y: -120 } });  // Mandala default: shifted down
  const [selectedCard, setSelectedCard] = useState(null);
  const [highlightedCards, setHighlightedCards] = useState(new Set());
  const [currentLayout, setCurrentLayout] = useState('mandala');
  const [focusArchetypeId, setFocusArchetypeId] = useState(2); // For archetype-focus layout

  const layout = useMemo(() => getLayout(currentLayout), [currentLayout]);

  const handleCardClick = useCallback((cardId) => {
    setSelectedCard(prev => prev === cardId ? null : cardId);

    // In archetype-focus mode, clicking an archetype changes the focus
    if (currentLayout === 'archetype-focus' && cardId >= 0 && cardId <= 21 && cardId !== 10 && cardId !== 21) {
      setFocusArchetypeId(cardId);
    }
  }, [currentLayout]);

  const handleViewChange = useCallback((view) => {
    setViewState(view);
  }, []);

  const handleLayoutChange = useCallback((layoutId) => {
    setCurrentLayout(layoutId);
    setSelectedCard(null);
    setHighlightedCards(new Set());
    // Reset view state to trigger refit with new layout dimensions
    // Mandala needs a downward shift to center better given header space
    const panY = layoutId === 'mandala' ? -120 : 0;
    setViewState({ zoom: 1, pan: { x: 0, y: panY } });
  }, []);

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

  // Get layout dimensions and calculate initial zoom to fit
  const canvasWidth = layout?.dimensions?.width || MANDALA_DIMENSIONS.width;
  const canvasHeight = layout?.dimensions?.height || MANDALA_DIMENSIONS.height;

  // Track viewport size for zoom calculation
  const [viewportSize, setViewportSize] = useState({ width: 1200, height: 800 });

  useEffect(() => {
    const updateViewportSize = () => {
      setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    };
    updateViewportSize();
    window.addEventListener('resize', updateViewportSize);
    return () => window.removeEventListener('resize', updateViewportSize);
  }, []);

  // Calculate zoom synchronously based on current layout and viewport
  const initialZoom = useMemo(() => {
    if (currentLayout === 'mandala') return 0.5;

    const viewportWidth = viewportSize.width - 40;  // 20px padding each side
    const viewportHeight = viewportSize.height - 200;  // Account for header/controls

    const zoomX = viewportWidth / canvasWidth;
    const zoomY = viewportHeight / canvasHeight;

    // Layout-specific max zoom caps
    const maxZoom = currentLayout === 'bounds-grid' ? 1.8 : 1.2;
    return Math.min(zoomX, zoomY, maxZoom);
  }, [currentLayout, canvasWidth, canvasHeight, viewportSize]);

  // Get positions for non-mandala layouts
  const layoutPositions = useMemo(() => {
    if (currentLayout === 'mandala') return null;
    if (!layout?.getPositions) return new Map();
    return layout.getPositions(focusArchetypeId);
  }, [currentLayout, layout, focusArchetypeId]);

  // Get card IDs for current layout
  const cardIds = useMemo(() => {
    if (!layout?.getCardIds) return [];
    return layout.getCardIds(focusArchetypeId);
  }, [layout, focusArchetypeId]);

  // Get selected card data for info panel
  const selectedCardData = selectedCard !== null ? {
    id: selectedCard,
    name: getCardName(selectedCard),
    channel: getCardChannel(selectedCard),
    type: getCardType(selectedCard)
  } : null;

  // Render cards for non-mandala layouts
  const renderLayoutCards = () => {
    if (!layoutPositions) return null;

    return cardIds.map(cardId => {
      const pos = layoutPositions.get(cardId);
      if (!pos) return null;

      const cardType = getCardType(cardId);
      const width = pos.width || (cardType === 'archetype' || cardType === 'portal' ? CONFIG.archetypeSize : cardType === 'bound' ? CONFIG.boundSize : CONFIG.agentSize);
      const height = width * 1.4;

      // For archetypes-linear layout, determine number position
      // Bottom row (0-9): number below card
      // Top row (11-20): number above card
      // Portals (10, 21): number to the side (21 left, 10 right)
      const showNumber = currentLayout === 'archetypes-linear' && cardId >= 0 && cardId <= 21;
      const isPortal = cardId === 10 || cardId === 21;
      const isBottomRow = cardId >= 0 && cardId <= 9;
      const isTopRow = cardId >= 11 && cardId <= 20;
      const numberSize = Math.round(height * 0.45);  // Roughly half card height

      // Calculate number position (all shifted up by quarter number height)
      const verticalShift = numberSize / 3;
      let numberStyle = {};
      if (isPortal) {
        // Portals: number to the side, shifted up, further from card
        numberStyle = {
          position: 'absolute',
          left: cardId === 21 ? pos.x - width / 2 - numberSize - 24 : pos.x + width / 2 + 24,
          top: pos.y - verticalShift,
          transform: 'translateY(-50%)',
          fontSize: `${numberSize}px`,
          fontWeight: 'bold',
          color: 'rgba(255, 255, 255, 0.85)',
          textShadow: '0 2px 8px rgba(0,0,0,0.8)',
          fontFamily: 'system-ui, sans-serif',
          lineHeight: 1,
          pointerEvents: 'none'
        };
      } else if (isBottomRow) {
        // Bottom row: number below, shifted up
        numberStyle = {
          position: 'absolute',
          left: pos.x,
          top: pos.y + height / 2 + 4 - verticalShift,
          transform: 'translateX(-50%)',
          fontSize: `${numberSize}px`,
          fontWeight: 'bold',
          color: 'rgba(255, 255, 255, 0.85)',
          textShadow: '0 2px 8px rgba(0,0,0,0.8)',
          fontFamily: 'system-ui, sans-serif',
          lineHeight: 1,
          pointerEvents: 'none'
        };
      } else if (isTopRow) {
        // Top row: number above, shifted up
        numberStyle = {
          position: 'absolute',
          left: pos.x,
          top: pos.y - height / 2 - numberSize - 4 - verticalShift,
          transform: 'translateX(-50%)',
          fontSize: `${numberSize}px`,
          fontWeight: 'bold',
          color: 'rgba(255, 255, 255, 0.85)',
          textShadow: '0 2px 8px rgba(0,0,0,0.8)',
          fontFamily: 'system-ui, sans-serif',
          lineHeight: 1,
          pointerEvents: 'none'
        };
      }

      return (
        <div key={cardId} style={{ position: 'absolute', left: 0, top: 0 }}>
          <CardNode
            id={cardId}
            name={getCardName(cardId)}
            left={pos.x - width / 2}
            top={pos.y - height / 2}
            width={width}
            cardType={cardType}
            channel={getCardChannel(cardId)}
            revealed={true}
            highlighted={highlightedCards.has(cardId)}
            dimmed={selectedCard !== null && selectedCard !== cardId && !highlightedCards.has(cardId)}
            onClick={handleCardClick}
            showLabel={cardType === 'archetype' || cardType === 'portal'}
          />
          {showNumber && (
            <div style={numberStyle}>
              {cardId}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white overflow-hidden">
      {/* Main NIRMANAKAYA header - FIXED */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-zinc-900/30 backdrop-blur-sm text-center py-6 border-b border-zinc-800/30">
        <Link href="/" className="inline-block">
          <h1 className="text-[1.25rem] sm:text-2xl md:text-3xl font-extralight tracking-[0.2em] sm:tracking-[0.3em] mb-1 hover:opacity-80 transition-opacity">
            <span className="rainbow-letter rainbow-letter-0">N</span>
            <span className="rainbow-letter rainbow-letter-1">I</span>
            <span className="rainbow-letter rainbow-letter-2">R</span>
            <span className="rainbow-letter rainbow-letter-3">M</span>
            <span className="rainbow-letter rainbow-letter-4">A</span>
            <span className="rainbow-letter rainbow-letter-5">N</span>
            <span className="rainbow-letter rainbow-letter-6">A</span>
            <span className="rainbow-letter rainbow-letter-7">K</span>
            <span className="rainbow-letter rainbow-letter-8">A</span>
            <span className="rainbow-letter rainbow-letter-9">Y</span>
            <span className="rainbow-letter rainbow-letter-10">A</span>
          </h1>
        </Link>
        <p className="text-zinc-300 text-sm tracking-wide font-light">Learning · 78 Signatures</p>
        {/* Nav Links */}
        <div className="overflow-x-auto mt-3">
          <div className="flex gap-2 text-xs w-max mx-auto px-4">
            <Link href="/" className="px-3 py-1.5 rounded bg-zinc-900/90 border border-zinc-600/60 text-zinc-300 hover:text-rose-400 hover:border-rose-500/50 transition-all shrink-0">Reader</Link>
            <Link href="/hub" className="px-3 py-1.5 rounded bg-zinc-900/90 border border-zinc-600/60 text-zinc-300 hover:text-amber-400 hover:border-amber-500/50 transition-all shrink-0">Community</Link>
            <Link href="/guide" className="px-3 py-1.5 rounded bg-zinc-900/90 border border-zinc-600/60 text-zinc-300 hover:text-emerald-400 hover:border-emerald-500/50 transition-all shrink-0">Guide</Link>
            <a href="/map" target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded bg-zinc-900/90 border border-zinc-600/60 text-zinc-300 hover:text-fuchsia-400 hover:border-fuchsia-500/50 transition-all shrink-0">Map</a>
          </div>
        </div>
        {/* Zoom indicator */}
        <div className="absolute top-3 right-4 text-xs text-zinc-500 font-mono">
          {Math.round(viewState.zoom * 100)}%
        </div>
      </div>

      {/* Layout Switcher - Fixed at bottom center */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
        <LayoutSwitcher
          currentLayout={currentLayout}
          onLayoutChange={handleLayoutChange}
        />
      </div>

      <main className="pt-36 h-screen">
        <MapCanvas
          key={currentLayout} // Force remount on layout change
          width={canvasWidth}
          height={canvasHeight}
          initialZoom={initialZoom}
          onViewChange={handleViewChange}
          className="w-full h-full bg-zinc-950"
        >
          {currentLayout === 'mandala' ? (
            <>
              {/* House Background Blocks - render behind cards */}
              <div
                style={{
                  position: 'absolute',
                  left: `${HOUSES.gestalt.x - CONFIG.houseSize / 2}px`,
                  top: `${HOUSES.gestalt.y - CONFIG.houseSize / 2}px`,
                  width: `${CONFIG.houseSize}px`,
                  height: `${CONFIG.houseSize}px`,
                  background: '#47335C',
                  borderRadius: '8px',
                  opacity: 0.9,
                  zIndex: 0
                }}
              />

              {['spirit', 'mind', 'emotion', 'body'].map(houseName => {
                const house = HOUSES[houseName];
                const colors = {
                  spirit: '#8A2F2F',
                  mind: '#2E5B2E',
                  emotion: '#2A4A6B',
                  body: '#5C4728'
                };
                return (
                  <div
                    key={`block-${houseName}`}
                    style={{
                      position: 'absolute',
                      left: `${house.x - CONFIG.houseSize / 2}px`,
                      top: `${house.y - CONFIG.houseSize / 2}px`,
                      width: `${CONFIG.houseSize}px`,
                      height: `${CONFIG.houseSize}px`,
                      background: colors[houseName],
                      borderRadius: '8px',
                      opacity: 0.9,
                      transform: 'rotate(45deg)',
                      zIndex: 0
                    }}
                  />
                );
              })}

              {/* Portals */}
              {[10, 21].map(portalId => {
                const pos = getPortalPosition(portalId);
                if (!pos) return null;
                const archetype = ARCHETYPES[portalId];
                return (
                  <CardNode
                    key={portalId}
                    id={portalId}
                    name={archetype?.name || `Portal ${portalId}`}
                    left={pos.left}
                    top={pos.top}
                    width={pos.width}
                    height={pos.height}
                    cardType="portal"
                    channel={null}
                    revealed={true}
                    highlighted={highlightedCards.has(portalId)}
                    dimmed={selectedCard !== null && selectedCard !== portalId && !highlightedCards.has(portalId)}
                    onClick={handleCardClick}
                    showLabel={true}
                  />
                );
              })}

              {/* House Groups */}
              {getHouseNames().map(houseName => (
                <HouseGroup
                  key={houseName}
                  houseName={houseName}
                  highlightedCards={highlightedCards}
                  selectedCard={selectedCard}
                  onCardClick={handleCardClick}
                  showLabels={true}
                />
              ))}

              {/* Bounds */}
              {Array.from({ length: 40 }, (_, i) => i + 22).map(boundId => {
                const pos = getBoundPosition(boundId);
                if (!pos) return null;
                const bound = BOUNDS[boundId];
                return (
                  <CardNode
                    key={boundId}
                    id={boundId}
                    name={bound?.name || `Bound ${boundId}`}
                    left={pos.left}
                    top={pos.top}
                    width={pos.width}
                    height={pos.height}
                    rotation={pos.rotation}
                    cardType="bound"
                    channel={bound?.channel}
                    revealed={true}
                    highlighted={highlightedCards.has(boundId)}
                    dimmed={selectedCard !== null && selectedCard !== boundId && !highlightedCards.has(boundId)}
                    onClick={handleCardClick}
                    showLabel={false}
                  />
                );
              })}

              {/* Agents */}
              {Array.from({ length: 16 }, (_, i) => i + 62).map(agentId => {
                const pos = getAgentPosition(agentId);
                if (!pos) return null;
                const agent = AGENTS[agentId];
                return (
                  <CardNode
                    key={agentId}
                    id={agentId}
                    name={agent?.name || `Agent ${agentId}`}
                    left={pos.left}
                    top={pos.top}
                    width={pos.width}
                    height={pos.height}
                    rotation={pos.rotation}
                    cardType="agent"
                    channel={agent?.channel}
                    revealed={true}
                    highlighted={highlightedCards.has(agentId)}
                    dimmed={selectedCard !== null && selectedCard !== agentId && !highlightedCards.has(agentId)}
                    onClick={handleCardClick}
                    showLabel={false}
                  />
                );
              })}
            </>
          ) : (
            // Non-mandala layouts use computed positions
            renderLayoutCards()
          )}
        </MapCanvas>
      </main>

      {/* Selected card info panel */}
      {selectedCardData && (
        <div className="fixed bottom-20 left-4 z-50 bg-zinc-900/95 backdrop-blur-sm border border-amber-500/30 rounded-lg p-4 max-w-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-amber-400 font-semibold">{selectedCardData.name}</span>
            <button onClick={() => setSelectedCard(null)} className="text-zinc-500 hover:text-zinc-300 text-xl">×</button>
          </div>
          <div className="text-xs text-zinc-500 space-y-1">
            <div>ID: {selectedCardData.id} · Type: {selectedCardData.type}</div>
            {selectedCardData.channel && <div>Channel: {selectedCardData.channel}</div>}
          </div>
        </div>
      )}

      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 text-xs text-zinc-600 hidden sm:block z-30">
        Click card to select · Esc to clear · Scroll to zoom · Drag to pan
      </div>
    </div>
  );
}
