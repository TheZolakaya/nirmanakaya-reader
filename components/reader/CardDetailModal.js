'use client';

// === CARD DETAIL MODAL ===
// Full-screen popup showing card artwork, home position minimap, pull count, and position history
// Opens when clicking a card image. Uses portal pattern from MinimapModal.

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Minimap from './Minimap.js';
import { ARCHETYPES, BOUNDS, AGENTS } from '../../lib/archetypes.js';
import { getCardImagePath, getHomeArchetype, getDetailedCardType } from '../../lib/cardImages.js';
import { STATUSES } from '../../lib/constants.js';

function getSignatureInfo(transientId) {
  const id = Number(transientId);
  if (ARCHETYPES[id]) return { ...ARCHETYPES[id], type: 'Archetype' };
  if (BOUNDS[id]) return { ...BOUNDS[id], type: 'Bound' };
  if (AGENTS[id]) return { ...AGENTS[id], type: 'Agent' };
  return { name: 'Unknown', type: 'Unknown' };
}

export default function CardDetailModal({ isOpen, onClose, transientId, stats }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
      document.addEventListener('keydown', handleEsc);
      return () => {
        document.body.style.overflow = '';
        document.removeEventListener('keydown', handleEsc);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const sig = getSignatureInfo(transientId);
  const imagePath = getCardImagePath(transientId);
  const homeArchetypeId = getHomeArchetype(transientId);
  const cardType = getDetailedCardType(transientId);

  // Pull count from stats
  const pullCount = stats?.signatureCounts?.[transientId] || 0;
  const lastSeen = stats?.signatureLastSeen?.[transientId];
  const statusHistory = stats?.signatureStatuses?.[transientId] || [];
  const positionHistory = stats?.signaturePositions?.[transientId] || {};

  // Type-specific color
  const typeColor = sig.type === 'Archetype' ? 'amber' :
                    sig.type === 'Bound' ? 'blue' : 'violet';

  const modal = (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto rounded-2xl bg-zinc-950 border border-zinc-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-2 rounded-lg bg-zinc-900/80 text-zinc-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Card Image - full width */}
        {imagePath ? (
          <div className="relative w-full aspect-[3/4] bg-zinc-900">
            <img
              src={imagePath}
              alt={sig.name}
              className="w-full h-full object-contain"
            />
          </div>
        ) : (
          <div className="w-full aspect-[3/4] bg-zinc-900 flex items-center justify-center">
            <span className="text-zinc-700 text-lg">No image available</span>
          </div>
        )}

        {/* Info section */}
        <div className="p-5">
          {/* Name + Type */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-zinc-100">{sig.name}</h2>
              {sig.traditional && (
                <p className="text-sm text-zinc-500 mt-0.5">{sig.traditional}</p>
              )}
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`text-xs px-2 py-0.5 rounded-full bg-${typeColor}-500/10 text-${typeColor}-400`}>
                  {sig.type}
                </span>
                {sig.house && <span className="text-xs text-zinc-500">{sig.house} House</span>}
                {sig.channel && <span className="text-xs text-zinc-500">{sig.channel}</span>}
              </div>
            </div>

            {/* Pull count */}
            <div className="text-right">
              <div className={`text-2xl font-bold text-${typeColor}-400`}>{pullCount}</div>
              <div className="text-xs text-zinc-600">times drawn</div>
            </div>
          </div>

          {/* Position history */}
          {Object.keys(positionHistory).length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-zinc-500 mb-2">Position History</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(positionHistory)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 10)
                  .map(([posId, count]) => {
                    const posName = ARCHETYPES[Number(posId)]?.name || `Position ${posId}`;
                    return (
                      <span key={posId} className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-400">
                        {posName} <span className="text-zinc-600">{count}x</span>
                      </span>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Status history */}
          {statusHistory.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-zinc-500 mb-2">Status History</p>
              <div className="flex gap-2">
                {statusHistory.sort().map(s => (
                  <span key={s} className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-400">
                    {STATUSES[s]?.name || `Status ${s}`}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Last seen */}
          {lastSeen && (
            <p className="text-xs text-zinc-600">
              Last seen: {new Date(lastSeen).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          )}

          {/* Home position minimap */}
          {homeArchetypeId !== undefined && homeArchetypeId !== null && (
            <div className="mt-4 pt-4 border-t border-zinc-800">
              <p className="text-xs text-zinc-500 mb-2">Home Position</p>
              <div className="flex justify-center">
                <div className="w-32 h-32">
                  <Minimap
                    fromId={homeArchetypeId}
                    toId={null}
                    size="sm"
                    showLabels={false}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
