'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import MapCanvas from '../../components/map/MapCanvas.js';
import CardNode from '../../components/map/CardNode.js';
import HouseGroup from '../../components/map/HouseGroup.js';
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
import { ARCHETYPES, BOUNDS, AGENTS } from '../../lib/archetypes.js';

/**
 * Learning Page - Training presentations for the 78 card architecture
 * Matches public/map/index.html positioning exactly
 */

function getCardName(id) {
  if (id >= 0 && id <= 21) return ARCHETYPES[id]?.name || `Archetype ${id}`;
  if (id >= 22 && id <= 61) return BOUNDS[id]?.name || `Bound ${id}`;
  if (id >= 62 && id <= 77) return AGENTS[id]?.name || `Agent ${id}`;
  return `Card ${id}`;
}

function getCardChannel(id) {
  if (id >= 0 && id <= 21) {
    // Gestalt archetypes have specific channels
    const GESTALT_CHANNELS = {
      0: 'Intent', 1: 'Structure', 19: 'Cognition', 20: 'Resonance'
    };
    if (GESTALT_CHANNELS[id] !== undefined) return GESTALT_CHANNELS[id];
    if (id === 10 || id === 21) return null;  // Portals
    return ARCHETYPES[id]?.channel || null;
  }
  if (id >= 22 && id <= 61) return BOUNDS[id]?.channel || null;
  if (id >= 62 && id <= 77) return AGENTS[id]?.channel || null;
  return null;
}

export default function LearningPage() {
  const [viewState, setViewState] = useState({ zoom: 1, pan: { x: 0, y: 0 } });
  const [selectedCard, setSelectedCard] = useState(null);
  const [highlightedCards, setHighlightedCards] = useState(new Set());

  const handleCardClick = useCallback((cardId) => {
    setSelectedCard(prev => prev === cardId ? null : cardId);
  }, []);

  const handleViewChange = useCallback((view) => {
    setViewState(view);
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

  // Get selected card data for info panel
  const selectedCardData = selectedCard !== null ? {
    id: selectedCard,
    name: getCardName(selectedCard),
    channel: getCardChannel(selectedCard),
    type: selectedCard === 10 || selectedCard === 21 ? 'portal' :
          selectedCard <= 21 ? 'archetype' :
          selectedCard <= 61 ? 'bound' : 'agent'
  } : null;

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
        {/* Nav Links - rainbow hover colors */}
        <div className="flex justify-center gap-2 mt-3 text-xs">
          <Link href="/" className="px-3 py-1.5 rounded bg-zinc-900/90 border border-zinc-600/60 text-zinc-300 hover:text-rose-400 hover:border-rose-500/50 transition-all">
            Reader
          </Link>
          <Link href="/hub" className="px-3 py-1.5 rounded bg-zinc-900/90 border border-zinc-600/60 text-zinc-300 hover:text-amber-400 hover:border-amber-500/50 transition-all">
            Community
          </Link>
          <Link href="/guide" className="px-3 py-1.5 rounded bg-zinc-900/90 border border-zinc-600/60 text-zinc-300 hover:text-emerald-400 hover:border-emerald-500/50 transition-all">
            Guide
          </Link>
          <Link href="/lounge" className="px-3 py-1.5 rounded bg-zinc-900/90 border border-zinc-600/60 text-zinc-300 hover:text-cyan-400 hover:border-cyan-500/50 transition-all">
            Lounge
          </Link>
          <Link href="/council" className="px-3 py-1.5 rounded bg-zinc-900/90 border border-zinc-600/60 text-zinc-300 hover:text-violet-400 hover:border-violet-500/50 transition-all">
            Council
          </Link>
          <a href="/map" target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded bg-zinc-900/90 border border-zinc-600/60 text-zinc-300 hover:text-fuchsia-400 hover:border-fuchsia-500/50 transition-all">
            Map
          </a>
        </div>
        {/* Zoom indicator */}
        <div className="absolute top-3 right-4 text-xs text-zinc-500 font-mono">
          {Math.round(viewState.zoom * 100)}%
        </div>
      </div>

      <main className="pt-36 h-screen">
        <MapCanvas
          width={MANDALA_DIMENSIONS.width}
          height={MANDALA_DIMENSIONS.height}
          initialZoom={0.5}
          onViewChange={handleViewChange}
          className="w-full h-full bg-zinc-950"
        >
          {/* House Background Blocks - render behind cards */}
          {/* Gestalt center block (purple rectangle, not rotated) */}
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

          {/* Peripheral house blocks (rotated diamonds) */}
          {['spirit', 'mind', 'emotion', 'body'].map(houseName => {
            const house = HOUSES[houseName];
            const colors = {
              spirit: '#8A2F2F',   // Dark Red - Fire
              mind: '#2E5B2E',     // Dark Green - Air
              emotion: '#2A4A6B',  // Dark Blue - Water
              body: '#5C4728'      // Dark Brown - Earth
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

          {/* Portals (10 = Source, 21 = Creation) */}
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

          {/* House Groups (rotated containers with archetypes) */}
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

          {/* Bounds (22-61) */}
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

          {/* Agents (62-77) */}
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

      <div className="fixed bottom-4 left-4 text-xs text-zinc-600 hidden sm:block z-40">
        Click card to select · Esc to clear · Scroll to zoom · Drag to pan
      </div>
    </div>
  );
}
