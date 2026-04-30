'use client';

import React, { useState, useCallback, useMemo } from 'react';
import MapCanvas from '../../components/map/MapCanvas.js';
import CardNode from '../../components/map/CardNode.js';
import { ARCHETYPES, BOUNDS, AGENTS } from '../../lib/archetypes.js';
import { STATUSES, HOUSES as HOUSE_DATA } from '../../lib/constants.js';
import { CONFIG, PORTALS, HOUSES as POS_HOUSES, getPortalPosition, getBoundPosition, getAgentPosition, getHouseCenter, getHouseNames, getArchetypeLocalPosition, getHouseContainer } from '../../lib/map/positions.js';
import { generateSpread } from '../../lib/utils.js';
import { analyzeFullMap, analyzeBeingGroups, analyzeIdentityGroups, analyzeNeighborhoods } from '../../lib/mapAnalysis.js';
import { BEING_GROUPS, IDENTITY_GROUPS } from '../../lib/constants.js';

// Status → border/glow color + rotation encoding
const STATUS_GLOW = {
  1: { color: '#34d399', label: 'Balanced',       rotation: 0 },     // upright
  2: { color: '#fbbf24', label: 'Too Much',       rotation: 90 },    // right
  3: { color: '#38bdf8', label: 'Too Little',     rotation: -90 },   // left
  4: { color: '#a78bfa', label: 'Unacknowledged', rotation: 180 }    // inverted
};

// Dimensional color maps for overlay layers
const PRACTICE_COLORS = { Spirit: '#c084fc', Emotion: '#fb7185', Mind: '#22d3ee', Body: '#4ade80' };
const ACTIVITY_COLORS = { Intent: '#ef4444', Cognition: '#22d3ee', Resonance: '#f59e0b', Structure: '#4ade80' };
const BEING_COLORS = { Mantle: '#fbbf24', Torch: '#22d3ee', Vessel: '#4ade80', Clearing: '#fb7185' };
const IDENTITY_COLORS = { Composure: '#22d3ee', Conviction: '#fbbf24', Exploration: '#4ade80', Communion: '#fb7185' };
const STAGE_COLORS_MAP = { Seed: '#22c55e', Medium: '#f59e0b', Fruition: '#06b6d4', Feedback: '#7c3aed' };

// Archetype → dimension group lookups
const PRACTICE_LOOKUP = {};
const ACTIVITY_LOOKUP = {};
const STAGE_LOOKUP = {};
const BEING_LOOKUP_MAP = {};
const IDENTITY_LOOKUP_MAP = {};

// Practice (houses = columns): Spirit=[17,2,18,3], Emotion=[7,14,6,13], Mind=[4,15,5,16], Body=[12,9,11,8]
[['Spirit',[17,2,18,3]],['Emotion',[7,14,6,13]],['Mind',[4,15,5,16]],['Body',[12,9,11,8]]].forEach(([g,ids]) => ids.forEach(id => PRACTICE_LOOKUP[id] = g));
// Activity (channels = rows): Intent=[17,7,4,12], Cognition=[2,14,15,9], Resonance=[18,6,5,11], Structure=[3,13,16,8]
[['Intent',[17,7,4,12]],['Cognition',[2,14,15,9]],['Resonance',[18,6,5,11]],['Structure',[3,13,16,8]]].forEach(([g,ids]) => ids.forEach(id => ACTIVITY_LOOKUP[id] = g));
// Stage
[['Seed',[2,4,6,8]],['Medium',[3,5,7,9]],['Fruition',[11,13,15,17]],['Feedback',[12,14,16,18]]].forEach(([g,ids]) => ids.forEach(id => STAGE_LOOKUP[id] = g));
// Being
[['Mantle',[8,7,15,18]],['Torch',[2,5,13,12]],['Vessel',[4,3,11,14]],['Clearing',[6,9,17,16]]].forEach(([g,ids]) => ids.forEach(id => BEING_LOOKUP_MAP[id] = g));
// Identity
[['Composure',[8,5,17,14]],['Conviction',[2,7,11,16]],['Exploration',[4,9,13,18]],['Communion',[6,3,15,12]]].forEach(([g,ids]) => ids.forEach(id => IDENTITY_LOOKUP_MAP[id] = g));

// House label positions (offsets from house center)
const HOUSE_LABELS = {
  gestalt:  { dx: 0,    dy: 170,  name: 'GESTALT' },
  mind:     { dx: -10,  dy: 10,   name: 'MIND' },
  emotion:  { dx: 10,   dy: 10,   name: 'EMOTION' },
  body:     { dx: -10,  dy: -10,  name: 'BODY' },
  spirit:   { dx: 10,   dy: -10,  name: 'SPIRIT' }
};

export default function MapPage() {
  const [draws, setDraws] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [selectedPos, setSelectedPos] = useState(null);
  const [viewMode, setViewMode] = useState('status'); // status | traces | corrections | governance
  const [colorLayer, setColorLayer] = useState('status'); // status | practice | activity | being | identity | stage | neighborhood
  const [spreadSize, setSpreadSize] = useState(78);
  const [beingHealth, setBeingHealth] = useState(null);
  const [identityHealth, setIdentityHealth] = useState(null);
  const [neighborhoodHealth, setNeighborhoodHealth] = useState(null);

  // Generate a new reading
  const handleGenerate = useCallback(() => {
    const newDraws = generateSpread(spreadSize);
    const newAnalysis = analyzeFullMap(newDraws);
    setDraws(newDraws);
    setAnalysis(newAnalysis);
    setSelectedPos(null);
    // Build drawMap for dimensional analysis
    const dm = {};
    for (const d of newDraws) dm[d.position] = d;
    setBeingHealth(analyzeBeingGroups(dm));
    setIdentityHealth(analyzeIdentityGroups(dm));
    setNeighborhoodHealth(analyzeNeighborhoods(dm));
  }, [spreadSize]);

  // Build lookup: position → draw
  const drawMap = useMemo(() => {
    if (!draws) return {};
    const map = {};
    for (const d of draws) map[d.position] = d;
    return map;
  }, [draws]);

  // Build lookup: position → analysis position detail
  const positionDetails = useMemo(() => {
    if (!analysis) return {};
    const map = {};
    for (const p of analysis.positions) map[p.position] = p;
    return map;
  }, [analysis]);

  // Which cards to highlight based on view mode + selection
  const { highlightedCards, dimmedCards } = useMemo(() => {
    const highlighted = new Set();
    const dimmed = new Set();

    if (!analysis || selectedPos === null) return { highlightedCards: highlighted, dimmedCards: dimmed };

    const posDetail = positionDetails[selectedPos];
    if (!posDetail) return { highlightedCards: highlighted, dimmedCards: dimmed };

    if (viewMode === 'corrections' || viewMode === 'status') {
      // Highlight the selected position and its active correction target
      highlighted.add(selectedPos);
      const cp = analysis.correctionPairs.positions.find(p => p.position === selectedPos);
      if (cp?.activePath) {
        highlighted.add(cp.activePath.target);
      }
      // Show all 4 correction targets dimmed
      if (cp?.allPairs) {
        for (const pair of Object.values(cp.allPairs)) {
          if (pair?.target !== undefined && !highlighted.has(pair.target)) {
            // Don't dim these — they're relevant context
          }
        }
      }
    }

    if (viewMode === 'traces') {
      // Highlight the trace loop this position belongs to
      const loop = analysis.traces.loops.find(l =>
        l.positions.includes(selectedPos) || (l.tail && l.tail.includes(selectedPos))
      );
      if (loop) {
        for (const p of loop.positions) highlighted.add(p);
        if (loop.tail) for (const p of loop.tail) highlighted.add(p);
      }
    }

    if (viewMode === 'governance') {
      // Highlight governors and their houses
      for (const gov of analysis.governance.governors) {
        highlighted.add(gov.position);
      }
    }

    return { highlightedCards: highlighted, dimmedCards: dimmed };
  }, [analysis, selectedPos, viewMode, positionDetails]);

  // Get the status overlay color for an archetype position
  const getStatusOverlay = useCallback((archetypeId) => {
    if (!drawMap[archetypeId]) return null;
    return STATUS_GLOW[drawMap[archetypeId].status] || null;
  }, [drawMap]);

  // Get dimensional overlay color for an archetype based on colorLayer
  const getDimensionalColor = useCallback((archetypeId) => {
    if (archetypeId < 2 || archetypeId > 18) return null; // portals/gestalt don't have dimensional groups
    switch (colorLayer) {
      case 'practice': return PRACTICE_COLORS[PRACTICE_LOOKUP[archetypeId]] || null;
      case 'activity': return ACTIVITY_COLORS[ACTIVITY_LOOKUP[archetypeId]] || null;
      case 'being': return BEING_COLORS[BEING_LOOKUP_MAP[archetypeId]] || null;
      case 'identity': return IDENTITY_COLORS[IDENTITY_LOOKUP_MAP[archetypeId]] || null;
      case 'stage': return STAGE_COLORS_MAP[STAGE_LOOKUP[archetypeId]] || null;
      case 'neighborhood': {
        if (!neighborhoodHealth) return null;
        for (const [, nh] of Object.entries(neighborhoodHealth)) {
          if (nh.members.some(m => m.archetypeId === archetypeId)) {
            const ratio = nh.balancedCount / 4;
            return ratio === 1 ? '#22c55e' : ratio >= 0.5 ? '#eab308' : ratio > 0 ? '#f97316' : '#ef4444';
          }
        }
        return null;
      }
      default: return null; // 'status' uses the existing STATUS_GLOW
    }
  }, [colorLayer, neighborhoodHealth]);

  // Handle clicking an archetype on the map
  const handleCardClick = useCallback((cardId) => {
    if (cardId >= 0 && cardId <= 21) {
      setSelectedPos(prev => prev === cardId ? null : cardId);
    }
  }, []);

  // Selected position detail panel
  const selectedDetail = selectedPos !== null ? positionDetails[selectedPos] : null;
  const selectedCorrPair = selectedPos !== null && analysis
    ? analysis.correctionPairs.positions.find(p => p.position === selectedPos)
    : null;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-zinc-200 overflow-hidden">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-[500] bg-gradient-to-b from-[#0a0a0f] via-[#0a0a0f]/90 to-transparent">
        <div className="max-w-screen-2xl mx-auto px-4 pt-4 pb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-light tracking-[0.3em] text-amber-400/80" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                CONSCIOUSNESS MAP
              </h1>
              <p className="text-xs text-zinc-500 mt-1">78-Position Computation Substrate</p>
            </div>

            <div className="flex items-center gap-3">
              {/* View mode selector */}
              {analysis && (
                <div className="flex gap-1">
                  {[
                    { id: 'status', label: 'Status' },
                    { id: 'traces', label: 'Traces' },
                    { id: 'corrections', label: 'Corrections' },
                    { id: 'governance', label: 'Governance' }
                  ].map(mode => (
                    <button
                      key={mode.id}
                      onClick={() => setViewMode(mode.id)}
                      className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                        viewMode === mode.id
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                          : 'bg-zinc-800/60 text-zinc-400 border border-zinc-700/40 hover:bg-zinc-700/60'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Color layer selector */}
              {analysis && (
                <div className="flex gap-1">
                  {[
                    { id: 'status', label: 'Status', color: '#34d399' },
                    { id: 'practice', label: 'Practice', color: '#4ade80' },
                    { id: 'activity', label: 'Activity', color: '#ef4444' },
                    { id: 'being', label: 'Being', color: '#fbbf24' },
                    { id: 'identity', label: 'Identity', color: '#a855f7' },
                    { id: 'stage', label: 'Stage', color: '#06b6d4' },
                    { id: 'neighborhood', label: 'Hoods', color: '#f0c040' },
                  ].map(layer => (
                    <button
                      key={layer.id}
                      onClick={() => setColorLayer(layer.id)}
                      className="px-2 py-1 rounded text-xs font-medium transition-all"
                      style={{
                        background: colorLayer === layer.id ? `${layer.color}22` : 'rgba(63,63,70,0.6)',
                        color: colorLayer === layer.id ? layer.color : '#a1a1aa',
                        border: `1px solid ${colorLayer === layer.id ? `${layer.color}66` : 'rgba(63,63,70,0.4)'}`,
                      }}
                    >
                      {layer.label}
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={handleGenerate}
                className="px-4 py-2 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 text-sm font-medium hover:bg-amber-500/30 transition-all"
              >
                {draws ? 'New Reading' : 'Generate Map'}
              </button>
            </div>
          </div>
          {/* Color legend */}
          {analysis && colorLayer !== 'status' && (
            <div className="flex justify-center gap-4 mt-1 pb-2">
              {colorLayer === 'practice' && Object.entries(PRACTICE_COLORS).map(([n, c]) => (
                <span key={n} className="text-xs flex items-center gap-1"><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: c }} />{n}</span>
              ))}
              {colorLayer === 'activity' && Object.entries(ACTIVITY_COLORS).map(([n, c]) => (
                <span key={n} className="text-xs flex items-center gap-1"><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: c }} />{n}</span>
              ))}
              {colorLayer === 'being' && Object.entries(BEING_COLORS).map(([n, c]) => (
                <span key={n} className="text-xs flex items-center gap-1"><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: c }} />{n}</span>
              ))}
              {colorLayer === 'identity' && Object.entries(IDENTITY_COLORS).map(([n, c]) => (
                <span key={n} className="text-xs flex items-center gap-1"><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: c }} />{n}</span>
              ))}
              {colorLayer === 'stage' && Object.entries(STAGE_COLORS_MAP).map(([n, c]) => (
                <span key={n} className="text-xs flex items-center gap-1"><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: c }} />{n}</span>
              ))}
              {colorLayer === 'neighborhood' && (
                <>
                  <span className="text-xs flex items-center gap-1"><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />4/4 Balanced</span>
                  <span className="text-xs flex items-center gap-1"><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#eab308' }} />2-3/4</span>
                  <span className="text-xs flex items-center gap-1"><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#f97316' }} />1/4</span>
                  <span className="text-xs flex items-center gap-1"><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />0/4</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Map Canvas */}
      <div className="h-screen pt-20">
        {!draws ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-6xl mb-6 opacity-20">&#x2609;</div>
              <p className="text-zinc-500 text-lg mb-6" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                Generate a 22-position reading to visualize the full consciousness map
              </p>
              <button
                onClick={handleGenerate}
                className="px-6 py-3 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 text-base font-medium hover:bg-amber-500/30 transition-all"
              >
                Generate Map
              </button>
            </div>
          </div>
        ) : (
          <MapCanvas
            width={CONFIG.mapWidth}
            height={CONFIG.mapHeight}
            initialZoom={0.45}
            className="w-full h-full"
          >
            {/* House Groups with transient-mapped archetype cards */}
            {getHouseNames().map(houseName => {
              const container = getHouseContainer(houseName);
              if (!container) return null;
              return (
                <div
                  key={houseName}
                  className={`archetype-group archetype-group-${houseName}`}
                  style={{
                    position: 'absolute',
                    left: `${container.left}px`,
                    top: `${container.top}px`,
                    width: `${container.width}px`,
                    height: `${container.height}px`,
                    transform: container.rotation !== 0 ? `rotate(${container.rotation}deg)` : undefined,
                    transformOrigin: 'center center',
                    zIndex: 2
                  }}
                >
                  {container.archetypeOrder.map(archetypeId => {
                    const localPos = getArchetypeLocalPosition(archetypeId);
                    if (!localPos) return null;
                    const draw = drawMap[archetypeId];
                    // Show the transient's image if we have a draw, otherwise the position's own image
                    const displayId = draw ? draw.transient : archetypeId;
                    const displaySig = draw ? (displayId < 22 ? ARCHETYPES[displayId] : displayId < 62 ? BOUNDS[displayId] : AGENTS[displayId]) : ARCHETYPES[archetypeId];
                    const isHighlighted = highlightedCards.has(archetypeId);
                    const isDimmed = selectedPos !== null && selectedPos !== archetypeId && !highlightedCards.has(archetypeId);
                    const statusInfo = draw ? STATUS_GLOW[draw.status] : null;
                    const statusColor = statusInfo?.color || null;
                    const statusRotation = statusInfo?.rotation || 0;
                    const dimColor = getDimensionalColor(archetypeId);
                    const borderColor = colorLayer !== 'status' && dimColor ? dimColor : statusColor;
                    return (
                      <div key={archetypeId} data-position={archetypeId} style={{
                        position: 'absolute',
                        left: `${localPos.left - 6}px`,
                        top: `${localPos.top - 6}px`,
                        width: `${localPos.width + 12}px`,
                        aspectRatio: '1 / 1',
                        zIndex: 1
                      }}>
                        {/* Rotating card + border */}
                        <div style={{
                          position: 'absolute',
                          inset: 0,
                          borderRadius: '8px',
                          boxShadow: borderColor ? `0 0 12px ${borderColor}, inset 0 0 8px ${borderColor}40` : 'none',
                          border: borderColor ? `3px solid ${borderColor}` : '2px solid transparent',
                          transform: statusRotation ? `rotate(${statusRotation}deg)` : undefined,
                          transition: 'transform 0.4s ease, border-color 0.3s, box-shadow 0.3s'
                        }}>
                          <CardNode
                            id={displayId}
                            name={displaySig?.name || `Signature ${displayId}`}
                            left={6}
                            top={6}
                            width={localPos.width}
                            height={localPos.height}
                            cardType={displayId < 22 ? 'archetype' : displayId < 62 ? 'bound' : 'agent'}
                            channel={displaySig?.channel || null}
                            revealed={true}
                            highlighted={isHighlighted}
                            dimmed={isDimmed}
                            onClick={() => handleCardClick(archetypeId)}
                            showLabel={false}
                          />
                        </div>
                        {/* Status badge — non-rotating, top */}
                        {statusInfo && (
                          <div style={{
                            position: 'absolute',
                            left: '50%',
                            top: '-2px',
                            transform: 'translateX(-50%)',
                            whiteSpace: 'nowrap',
                            fontFamily: "'Cormorant Garamond', serif",
                            fontSize: '0.5rem',
                            letterSpacing: '0.05em',
                            color: statusInfo.color,
                            background: 'rgba(0, 0, 0, 0.85)',
                            borderRadius: '3px',
                            padding: '1px 5px',
                            pointerEvents: 'none',
                            textTransform: 'uppercase',
                            zIndex: 10
                          }}>
                            {statusInfo.label}
                          </div>
                        )}
                        {/* Name label — non-rotating, bottom */}
                        <div style={{
                          position: 'absolute',
                          left: '50%',
                          bottom: '-2px',
                          transform: 'translateX(-50%)',
                          whiteSpace: 'nowrap',
                          fontFamily: "'Cormorant Garamond', serif",
                          fontSize: '0.6rem',
                          letterSpacing: '0.03em',
                          color: '#333',
                          background: 'rgba(255, 255, 255, 0.7)',
                          borderRadius: '4px',
                          padding: '2px 6px',
                          pointerEvents: 'none',
                          zIndex: 10
                        }}>
                          {displaySig?.name || `Signature ${displayId}`}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* Portals — show transient that landed at each portal position */}
            {[10, 21].map(portalId => {
              const pos = getPortalPosition(portalId);
              if (!pos) return null;
              const draw = drawMap[portalId];
              const displayId = draw ? draw.transient : portalId;
              const displaySig = draw ? (displayId < 22 ? ARCHETYPES[displayId] : displayId < 62 ? BOUNDS[displayId] : AGENTS[displayId]) : ARCHETYPES[portalId];
              const statusInfo = draw ? STATUS_GLOW[draw.status] : null;
              const statusColor = statusInfo?.color || null;
              const statusRotation = statusInfo?.rotation || 0;
              return (
                <div key={portalId} data-position={portalId} style={{
                  position: 'absolute',
                  left: `${pos.left - 6}px`,
                  top: `${pos.top - 6}px`,
                  width: `${pos.width + 12}px`,
                  aspectRatio: '1 / 1',
                  zIndex: 1
                }}>
                  {/* Rotating card + border */}
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '8px',
                    boxShadow: statusColor ? `0 0 12px ${statusColor}, inset 0 0 8px ${statusColor}40` : 'none',
                    border: statusColor ? `2px solid ${statusColor}` : '2px solid transparent',
                    transform: statusRotation ? `rotate(${statusRotation}deg)` : undefined,
                    transition: 'transform 0.4s ease'
                  }}>
                    <CardNode
                      id={displayId}
                      name={displaySig?.name || `Signature ${displayId}`}
                      left={6}
                      top={6}
                      width={pos.width}
                      cardType={displayId < 22 ? 'portal' : displayId < 62 ? 'bound' : 'agent'}
                      channel={displaySig?.channel || null}
                      revealed={true}
                      highlighted={highlightedCards.has(portalId)}
                      dimmed={selectedPos !== null && !highlightedCards.has(portalId) && selectedPos !== portalId}
                      onClick={() => handleCardClick(portalId)}
                      showLabel={false}
                    />
                  </div>
                  {/* Status badge — non-rotating, top */}
                  {statusInfo && (
                    <div style={{
                      position: 'absolute',
                      left: '50%',
                      top: '-2px',
                      transform: 'translateX(-50%)',
                      whiteSpace: 'nowrap',
                      fontFamily: "'Cormorant Garamond', serif",
                      fontSize: '0.5rem',
                      letterSpacing: '0.05em',
                      color: statusInfo.color,
                      background: 'rgba(0, 0, 0, 0.85)',
                      borderRadius: '3px',
                      padding: '1px 5px',
                      pointerEvents: 'none',
                      textTransform: 'uppercase',
                      zIndex: 10
                    }}>
                      {statusInfo.label}
                    </div>
                  )}
                  {/* Name label — non-rotating, bottom */}
                  <div style={{
                    position: 'absolute',
                    left: '50%',
                    bottom: '-2px',
                    transform: 'translateX(-50%)',
                    whiteSpace: 'nowrap',
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: '0.6rem',
                    letterSpacing: '0.03em',
                    color: '#333',
                    background: 'rgba(255, 255, 255, 0.7)',
                    borderRadius: '4px',
                    padding: '2px 6px',
                    pointerEvents: 'none',
                    zIndex: 10
                  }}>
                    {displaySig?.name || `Signature ${displayId}`}
                  </div>
                </div>
              );
            })}

            {/* Bounds — with reading status + transient display */}
            {Object.keys(BOUNDS).map(id => {
              const numId = Number(id);
              const pos = getBoundPosition(numId);
              if (!pos) return null;
              const draw = drawMap[numId];
              const displayId = draw ? draw.transient : numId;
              const displaySig = displayId < 22 ? ARCHETYPES[displayId] : displayId < 62 ? BOUNDS[displayId] : AGENTS[displayId];
              const statusInfo = draw ? STATUS_GLOW[draw.status] : null;
              const statusColor = statusInfo?.color || null;
              const statusRotation = statusInfo?.rotation || 0;
              return (
                <div key={numId} style={{
                  position: 'absolute',
                  left: `${pos.left - 3}px`,
                  top: `${pos.top - 3}px`,
                  width: `${pos.width + 6}px`,
                  aspectRatio: '1 / 1',
                  zIndex: 1
                }}>
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: '6px',
                    boxShadow: statusColor ? `0 0 8px ${statusColor}` : 'none',
                    border: statusColor ? `2px solid ${statusColor}` : '1px solid transparent',
                    transform: `${pos.rotation ? `rotate(${pos.rotation}deg)` : ''} ${statusRotation ? `rotate(${statusRotation}deg)` : ''}`.trim() || undefined,
                    transition: 'all 0.4s ease'
                  }}>
                    <CardNode
                      id={displayId}
                      name={displaySig?.name || `Sig ${displayId}`}
                      left={3}
                      top={3}
                      width={pos.width}
                      cardType={displayId < 22 ? 'archetype' : displayId < 62 ? 'bound' : 'agent'}
                      channel={displaySig?.channel || null}
                      revealed={true}
                      highlighted={false}
                      dimmed={selectedPos !== null}
                      showLabel={false}
                    />
                  </div>
                </div>
              );
            })}

            {/* Agents — with reading status + transient display */}
            {Object.keys(AGENTS).map(id => {
              const numId = Number(id);
              const pos = getAgentPosition(numId);
              if (!pos) return null;
              const draw = drawMap[numId];
              const displayId = draw ? draw.transient : numId;
              const displaySig = displayId < 22 ? ARCHETYPES[displayId] : displayId < 62 ? BOUNDS[displayId] : AGENTS[displayId];
              const statusInfo = draw ? STATUS_GLOW[draw.status] : null;
              const statusColor = statusInfo?.color || null;
              const statusRotation = statusInfo?.rotation || 0;
              return (
                <div key={numId} style={{
                  position: 'absolute',
                  left: `${pos.left - 3}px`,
                  top: `${pos.top - 3}px`,
                  width: `${pos.width + 6}px`,
                  aspectRatio: '1 / 1',
                  zIndex: 1
                }}>
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: '6px',
                    boxShadow: statusColor ? `0 0 8px ${statusColor}` : 'none',
                    border: statusColor ? `2px solid ${statusColor}` : '1px solid transparent',
                    transform: `${pos.rotation ? `rotate(${pos.rotation}deg)` : ''} ${statusRotation ? `rotate(${statusRotation}deg)` : ''}`.trim() || undefined,
                    transition: 'all 0.4s ease'
                  }}>
                    <CardNode
                      id={displayId}
                      name={displaySig?.name || `Sig ${displayId}`}
                      left={3}
                      top={3}
                      width={pos.width}
                      cardType={displayId < 22 ? 'archetype' : displayId < 62 ? 'bound' : 'agent'}
                      channel={displaySig?.channel || null}
                      revealed={true}
                      highlighted={false}
                      dimmed={selectedPos !== null}
                      showLabel={false}
                    />
                  </div>
                </div>
              );
            })}

            {/* Status colors applied via wrapper divs around each position */}

            {/* House labels */}
            {Object.entries(HOUSE_LABELS).map(([houseName, label]) => {
              const center = getHouseCenter(houseName);
              if (!center) return null;

              const houseHealth = analysis?.governance?.houseHealth?.[label.name.charAt(0) + label.name.slice(1).toLowerCase()];

              return (
                <div
                  key={houseName}
                  style={{
                    position: 'absolute',
                    left: `${center.x + label.dx}px`,
                    top: `${center.y + label.dy}px`,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 1,
                    pointerEvents: 'none'
                  }}
                >
                  <div
                    className="text-center"
                    style={{ fontFamily: "'Cormorant Garamond', serif" }}
                  >
                    <div className="text-sm tracking-[0.4em] text-zinc-400/60 font-light">
                      {label.name}
                    </div>
                    {houseHealth && (
                      <div className="text-xs text-zinc-500 mt-1">
                        {houseHealth.balanced}/{houseHealth.total}
                        {houseHealth.governorFlagged && <span className="text-amber-400/80 ml-1">{'\u26A0'}</span>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </MapCanvas>
        )}
      </div>

      {/* Status colors applied via inline styles on position wrappers */}

      {/* Analysis Dashboard — fixed bottom panel */}
      {analysis && (
        <div className="fixed bottom-0 left-0 right-0 z-[500] bg-[#0a0a0f]/95 backdrop-blur border-t border-zinc-800/60">
          <div className="max-w-screen-2xl mx-auto px-4 py-3">
            <div className="flex items-start gap-6">

              {/* Health Score */}
              <div className="flex-shrink-0">
                <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Health</div>
                <div className={`text-3xl font-light tabular-nums ${
                  analysis.health.score >= 0.6 ? 'text-emerald-400' :
                  analysis.health.score >= 0.3 ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {Math.round(analysis.health.score * 100)}
                </div>
              </div>

              {/* Corrective Vector */}
              <div className="flex-shrink-0">
                <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Vector</div>
                <div className={`text-lg font-light ${
                  analysis.correctiveVector.direction === 'toward' ? 'text-emerald-400' :
                  analysis.correctiveVector.direction === 'away' ? 'text-red-400' : 'text-amber-400'
                }`}>
                  {analysis.correctiveVector.direction === 'toward' ? '\u2191' :
                   analysis.correctiveVector.direction === 'away' ? '\u2193' : '\u2194'}
                  {' '}{analysis.correctiveVector.vector > 0 ? '+' : ''}{analysis.correctiveVector.vector}
                </div>
                <div className="text-xs text-zinc-600 mt-0.5">
                  {analysis.correctiveVector.components.openPaths} open / {analysis.correctiveVector.components.blockedPaths} blocked
                </div>
              </div>

              {/* Status Distribution */}
              <div className="flex-shrink-0">
                <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Statuses</div>
                <div className="flex gap-2 text-xs">
                  <span className="text-emerald-400">{analysis.aggregates.statuses.Balanced} bal</span>
                  <span className="text-amber-400">{analysis.aggregates.statuses['Too Much']} tm</span>
                  <span className="text-sky-400">{analysis.aggregates.statuses['Too Little']} tl</span>
                  <span className="text-violet-400">{analysis.aggregates.statuses.Unacknowledged} un</span>
                </div>
              </div>

              {/* Wheel/World Fields */}
              <div className="flex-shrink-0">
                <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Fields</div>
                <div className="text-xs">
                  <span className="text-zinc-300">Wheel {Math.round(analysis.wheelWorldFields.wheel.ratio * 100)}%</span>
                  <span className="text-zinc-600 mx-1">|</span>
                  <span className="text-zinc-300">World {Math.round(analysis.wheelWorldFields.world.ratio * 100)}%</span>
                </div>
                <div className="text-xs text-zinc-600 mt-0.5">
                  {analysis.wheelWorldFields.dominantField === 'balanced' ? 'Balanced' :
                   `${analysis.wheelWorldFields.dominantField} dominant`}
                </div>
              </div>

              {/* Traces */}
              <div className="flex-shrink-0">
                <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Traces</div>
                <div className="text-xs text-zinc-300">
                  {analysis.traces.partition.selfHomeCount} home
                  {analysis.traces.partition.swapCount > 0 && `, ${analysis.traces.partition.swapCount} swap`}
                  {analysis.traces.partition.loopCount - analysis.traces.partition.selfHomeCount - analysis.traces.partition.swapCount > 0 &&
                    `, ${analysis.traces.partition.loopCount - analysis.traces.partition.selfHomeCount - analysis.traces.partition.swapCount} loop`}
                </div>
                {analysis.traces.partition.largestLoop > 2 && (
                  <div className="text-xs text-zinc-600 mt-0.5">
                    largest: {analysis.traces.partition.largestLoop}-cycle
                  </div>
                )}
              </div>

              {/* Governance */}
              <div className="flex-shrink-0">
                <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Governance</div>
                <div className="text-xs">
                  {analysis.governance.governors.map(gov => (
                    <span key={gov.position} className={`mr-2 ${gov.isBalanced ? 'text-emerald-400' : 'text-red-400'}`}>
                      {gov.house?.charAt(0)}
                      {gov.isBalanced ? '\u2713' : '\u2717'}
                    </span>
                  ))}
                </div>
              </div>

              {/* Selected Position Detail */}
              {selectedDetail && (
                <div className="flex-1 border-l border-zinc-700/40 pl-4 ml-2">
                  <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
                    Position {selectedDetail.position}: {selectedDetail.positionName}
                  </div>
                  <div className="text-xs text-zinc-300">
                    <span className={`${STATUS_GLOW[selectedDetail.status] ? '' : ''}`}
                      style={{ color: STATUS_GLOW[selectedDetail.status]?.color }}>
                      {selectedDetail.statusName}
                    </span>
                    {' \u2190 '}{selectedDetail.transientName}
                    <span className="text-zinc-600"> ({selectedDetail.transientClass})</span>
                    {selectedDetail.isSelfHome && <span className="text-emerald-400/60 ml-1">[home]</span>}
                  </div>
                  {selectedCorrPair?.activePath && (
                    <div className="text-xs mt-0.5">
                      <span className="text-zinc-500">{selectedCorrPair.activeGeometry}:</span>
                      {' '}
                      <span className={selectedCorrPair.activePath.blocked ? 'text-red-400' : 'text-emerald-400'}>
                        {'\u2192 '}{selectedCorrPair.activePath.targetName}
                        {selectedCorrPair.activePath.blocked ? ' (blocked)' : ' (open)'}
                      </span>
                    </div>
                  )}
                  {selectedDetail.rebalancer && (
                    <div className="text-xs text-zinc-600 mt-0.5">
                      rebalancer: {selectedDetail.rebalancer.targetPositionName}
                      {selectedDetail.rebalancer.isSick && ' (sick)'}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
