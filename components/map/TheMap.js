'use client';

// === THE MAP — the single shared rendering of the full 78-signature map ===
//
// Why this file exists (2026-09-14): the map only ever existed as ~330 lines of inline JSX
// inside app/22-reader/page.js. Every attempt to "recreate" it elsewhere drifted — cards came
// out rectangular instead of square, positions slid, borders went wrong — because a rebuild
// from lib/map/positions.js loses two things that are easy to miss:
//
//   1. CardNode sets WIDTH ONLY. Its height comes from the image's natural aspect ratio.
//      Setting both dimensions is what makes the cards look rectangular.
//   2. Bounds and agents carry a per-card rotation, and a drawn status adds a SECOND rotation
//      on top of it. Both must compose, in that order.
//
// So: nothing here is reconstructed. This is the 22-reader render, lifted intact and given
// props. Anything that wants the map imports this. Nobody redraws it again.
//
// Props are all optional — with none, it renders the bare map (every position showing its own
// signature), which is the picture at /22-reader before a draw.

import React, { useCallback } from 'react';
import MapCanvas from './MapCanvas.js';
import CardNode from './CardNode.js';
import { ARCHETYPES, BOUNDS, AGENTS } from '../../lib/archetypes.js';
import {
  CONFIG, getPortalPosition, getBoundPosition, getAgentPosition,
  getHouseCenter, getHouseNames, getArchetypeLocalPosition, getHouseContainer
} from '../../lib/map/positions.js';

// Status → border/glow colour + rotation encoding (upright / right / left / inverted)
export const STATUS_GLOW = {
  1: { color: '#34d399', label: 'Balanced',       rotation: 0 },
  2: { color: '#fbbf24', label: 'Too Much',       rotation: 90 },
  3: { color: '#38bdf8', label: 'Too Little',     rotation: -90 },
  4: { color: '#a78bfa', label: 'Unacknowledged', rotation: 180 }
};

// Dimensional colour maps for the overlay layers
const PRACTICE_COLORS = { Spirit: '#c084fc', Emotion: '#fb7185', Mind: '#22d3ee', Body: '#4ade80' };
const ACTIVITY_COLORS = { Intent: '#ef4444', Cognition: '#22d3ee', Resonance: '#f59e0b', Structure: '#4ade80' };
const BEING_COLORS = { Mantle: '#fbbf24', Kindle: '#22d3ee', Vessel: '#4ade80', Passage: '#fb7185' };
const IDENTITY_COLORS = { Composure: '#22d3ee', Conviction: '#fbbf24', Exploration: '#4ade80', Intimacy: '#fb7185' };
const STAGE_COLORS_MAP = { Seed: '#22c55e', Bridge: '#f59e0b', Fruition: '#06b6d4', Feedback: '#7c3aed' };

const PRACTICE_LOOKUP = {};
const ACTIVITY_LOOKUP = {};
const STAGE_LOOKUP = {};
const BEING_LOOKUP_MAP = {};
const IDENTITY_LOOKUP_MAP = {};
[['Spirit', [17, 2, 18, 3]], ['Emotion', [7, 14, 6, 13]], ['Mind', [4, 15, 5, 16]], ['Body', [12, 9, 11, 8]]]
  .forEach(([g, ids]) => ids.forEach(id => { PRACTICE_LOOKUP[id] = g; }));
[['Intent', [17, 7, 4, 12]], ['Cognition', [2, 14, 15, 9]], ['Resonance', [18, 6, 5, 11]], ['Structure', [3, 13, 16, 8]]]
  .forEach(([g, ids]) => ids.forEach(id => { ACTIVITY_LOOKUP[id] = g; }));
[['Seed', [2, 4, 6, 8]], ['Bridge', [3, 5, 7, 9]], ['Fruition', [11, 13, 15, 17]], ['Feedback', [12, 14, 16, 18]]]
  .forEach(([g, ids]) => ids.forEach(id => { STAGE_LOOKUP[id] = g; }));
[['Mantle', [8, 7, 15, 18]], ['Kindle', [2, 5, 13, 12]], ['Vessel', [4, 3, 11, 14]], ['Passage', [6, 9, 17, 16]]]
  .forEach(([g, ids]) => ids.forEach(id => { BEING_LOOKUP_MAP[id] = g; }));
[['Composure', [8, 5, 17, 14]], ['Conviction', [2, 7, 11, 16]], ['Exploration', [4, 9, 13, 18]], ['Intimacy', [6, 3, 15, 12]]]
  .forEach(([g, ids]) => ids.forEach(id => { IDENTITY_LOOKUP_MAP[id] = g; }));

const HOUSE_LABELS = {
  gestalt: { dx: 0, dy: 170, name: 'GESTALT' },
  mind:    { dx: -10, dy: 10, name: 'MIND' },
  emotion: { dx: 10, dy: 10, name: 'EMOTION' },
  body:    { dx: -10, dy: -10, name: 'BODY' },
  spirit:  { dx: 10, dy: -10, name: 'SPIRIT' }
};

// A signature id resolves to its record regardless of class.
export function signatureFor(id) {
  return id < 22 ? ARCHETYPES[id] : id < 62 ? BOUNDS[id] : AGENTS[id];
}
export function classFor(id) {
  return id < 22 ? 'archetype' : id < 62 ? 'bound' : 'agent';
}

export default function TheMap({
  drawMap = {},              // { [positionId]: { transient, status } } — empty renders the bare map
  selectedPos = null,
  highlightedCards = new Set(),
  colorLayer = 'status',
  neighborhoodHealth = null,
  analysis = null,
  onCardClick = null,
  initialZoom = 0.45,
  showLabels = true,
  className = 'w-full h-full',
  // Animation hook: given a position id, return extra inline styles for that card's wrapper.
  // Transform-only styles keep this cheap on a phone. Returning nothing leaves the card alone.
  styleForPosition = null
}) {
  const getDimensionalColor = useCallback((archetypeId) => {
    if (archetypeId < 2 || archetypeId > 18) return null; // portals/gestalt have no dimensional group
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
      default: return null;
    }
  }, [colorLayer, neighborhoodHealth]);

  const extra = (id) => (styleForPosition ? styleForPosition(id) || {} : {});

  return (
    <MapCanvas width={CONFIG.mapWidth} height={CONFIG.mapHeight} initialZoom={initialZoom} className={className}>

      {/* House groups: the 20 archetype seats, laid out inside their rotated house containers */}
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
              const displayId = draw ? draw.transient : archetypeId;
              const displaySig = draw ? signatureFor(displayId) : ARCHETYPES[archetypeId];
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
                  zIndex: 1,
                  ...extra(archetypeId)
                }}>
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
                      cardType={classFor(displayId)}
                      channel={displaySig?.channel || null}
                      revealed={true}
                      highlighted={isHighlighted}
                      dimmed={isDimmed}
                      onClick={onCardClick ? () => onCardClick(archetypeId) : undefined}
                      showLabel={false}
                    />
                  </div>
                  {statusInfo && (
                    <div style={{
                      position: 'absolute', left: '50%', top: '-2px', transform: 'translateX(-50%)',
                      whiteSpace: 'nowrap', fontFamily: "'Cormorant Garamond', serif", fontSize: '0.5rem',
                      letterSpacing: '0.05em', color: statusInfo.color, background: 'rgba(0, 0, 0, 0.85)',
                      borderRadius: '3px', padding: '1px 5px', pointerEvents: 'none', textTransform: 'uppercase', zIndex: 10
                    }}>
                      {statusInfo.label}
                    </div>
                  )}
                  {showLabels && (
                    <div style={{
                      position: 'absolute', left: '50%', bottom: '-2px', transform: 'translateX(-50%)',
                      whiteSpace: 'nowrap', fontFamily: "'Cormorant Garamond', serif", fontSize: '0.6rem',
                      letterSpacing: '0.03em', color: '#333', background: 'rgba(255, 255, 255, 0.7)',
                      borderRadius: '4px', padding: '2px 6px', pointerEvents: 'none', zIndex: 10
                    }}>
                      {displaySig?.name || `Signature ${displayId}`}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}

      {/* The two portals — Source (ingress) and Creation (egress) */}
      {[10, 21].map(portalId => {
        const pos = getPortalPosition(portalId);
        if (!pos) return null;
        const draw = drawMap[portalId];
        const displayId = draw ? draw.transient : portalId;
        const displaySig = draw ? signatureFor(displayId) : ARCHETYPES[portalId];
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
            zIndex: 1,
            ...extra(portalId)
          }}>
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '8px',
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
                cardType={displayId < 22 ? 'portal' : classFor(displayId)}
                channel={displaySig?.channel || null}
                revealed={true}
                highlighted={highlightedCards.has(portalId)}
                dimmed={selectedPos !== null && !highlightedCards.has(portalId) && selectedPos !== portalId}
                onClick={onCardClick ? () => onCardClick(portalId) : undefined}
                showLabel={false}
              />
            </div>
            {statusInfo && (
              <div style={{
                position: 'absolute', left: '50%', top: '-2px', transform: 'translateX(-50%)',
                whiteSpace: 'nowrap', fontFamily: "'Cormorant Garamond', serif", fontSize: '0.5rem',
                letterSpacing: '0.05em', color: statusInfo.color, background: 'rgba(0, 0, 0, 0.85)',
                borderRadius: '3px', padding: '1px 5px', pointerEvents: 'none', textTransform: 'uppercase', zIndex: 10
              }}>
                {statusInfo.label}
              </div>
            )}
            {showLabels && (
              <div style={{
                position: 'absolute', left: '50%', bottom: '-2px', transform: 'translateX(-50%)',
                whiteSpace: 'nowrap', fontFamily: "'Cormorant Garamond', serif", fontSize: '0.6rem',
                letterSpacing: '0.03em', color: '#333', background: 'rgba(255, 255, 255, 0.7)',
                borderRadius: '4px', padding: '2px 6px', pointerEvents: 'none', zIndex: 10
              }}>
                {displaySig?.name || `Signature ${displayId}`}
              </div>
            )}
          </div>
        );
      })}

      {/* The 40 Bounds — note the rotation composes: the seat's own, then the status on top */}
      {Object.keys(BOUNDS).map(id => {
        const numId = Number(id);
        const pos = getBoundPosition(numId);
        if (!pos) return null;
        const draw = drawMap[numId];
        const displayId = draw ? draw.transient : numId;
        const displaySig = signatureFor(displayId);
        const statusInfo = draw ? STATUS_GLOW[draw.status] : null;
        const statusColor = statusInfo?.color || null;
        const statusRotation = statusInfo?.rotation || 0;
        return (
          <div key={numId} data-position={numId} style={{
            position: 'absolute',
            left: `${pos.left - 3}px`,
            top: `${pos.top - 3}px`,
            width: `${pos.width + 6}px`,
            aspectRatio: '1 / 1',
            zIndex: 1,
            ...extra(numId)
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
                cardType={classFor(displayId)}
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

      {/* The 16 Agents */}
      {Object.keys(AGENTS).map(id => {
        const numId = Number(id);
        const pos = getAgentPosition(numId);
        if (!pos) return null;
        const draw = drawMap[numId];
        const displayId = draw ? draw.transient : numId;
        const displaySig = signatureFor(displayId);
        const statusInfo = draw ? STATUS_GLOW[draw.status] : null;
        const statusColor = statusInfo?.color || null;
        const statusRotation = statusInfo?.rotation || 0;
        return (
          <div key={numId} data-position={numId} style={{
            position: 'absolute',
            left: `${pos.left - 3}px`,
            top: `${pos.top - 3}px`,
            width: `${pos.width + 6}px`,
            aspectRatio: '1 / 1',
            zIndex: 1,
            ...extra(numId)
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
                cardType={classFor(displayId)}
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

      {/* House labels */}
      {Object.entries(HOUSE_LABELS).map(([houseName, label]) => {
        const center = getHouseCenter(houseName);
        if (!center) return null;
        const houseHealth = analysis?.governance?.houseHealth?.[label.name.charAt(0) + label.name.slice(1).toLowerCase()];
        return (
          <div key={houseName} style={{
            position: 'absolute',
            left: `${center.x + label.dx}px`,
            top: `${center.y + label.dy}px`,
            transform: 'translate(-50%, -50%)',
            zIndex: 1,
            pointerEvents: 'none'
          }}>
            <div className="text-center" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              <div className="text-sm tracking-[0.4em] text-zinc-400/60 font-light">{label.name}</div>
              {houseHealth && (
                <div className="text-xs text-zinc-500 mt-1">
                  {houseHealth.balanced}/{houseHealth.total}
                  {houseHealth.governorFlagged && <span className="text-amber-400/80 ml-1">{'⚠'}</span>}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </MapCanvas>
  );
}
