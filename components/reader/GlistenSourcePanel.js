/**
 * GlistenSourcePanel - Reusable component for displaying Glisten session data
 *
 * Used in:
 * - Glistener.js (View Source modal on homepage)
 * - Reading detail page (Glistened Tale modal)
 *
 * Features:
 * - Bones/Constraint Matrix display
 * - Narrative Synthesis (transmission)
 * - Crystal with depth navigation
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Depth levels for crystal exploration
const DEPTH_LEVELS = ['deep', 'swim', 'wade', 'shallow'];
const DEPTH_LABELS = {
  deep: 'Deep',
  swim: 'Swim',
  wade: 'Wade',
  shallow: 'Shallow'
};

export default function GlistenSourcePanel({
  data,           // { bones, symbolism, transmission, integration, crystal }
  onClose,        // Close callback
  onTransfer,     // Optional - transfer crystal to parent (for homepage use)
  isOpen = true   // Control visibility when used as standalone
}) {
  const [depthIndex, setDepthIndex] = useState(0); // 0 = deep (default)
  const [crystals, setCrystals] = useState({ deep: data?.crystal }); // Cache crystals at each depth
  const [preloading, setPreloading] = useState(true);
  const hasPrecached = useRef(false);

  const currentDepth = DEPTH_LEVELS[depthIndex];
  const currentCrystal = crystals[currentDepth] || data?.crystal;

  // Pre-cache all depth levels on mount using SEQUENTIAL generation
  useEffect(() => {
    if (!data?.crystal) return;
    if (hasPrecached.current) return;
    hasPrecached.current = true;

    const precacheAllDepths = async () => {
      const rawCrystal = data.crystal;
      const newCrystals = { deep: rawCrystal };

      // Generate depths SEQUENTIALLY: deep → swim → wade → shallow
      let currentCrystal = rawCrystal;

      for (const targetDepth of ['swim', 'wade', 'shallow']) {
        try {
          const res = await fetch('/api/glisten/simplify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              crystal: currentCrystal,
              targetDepth
            })
          });
          const result = await res.json();
          if (result.success) {
            newCrystals[targetDepth] = result.crystal;
            currentCrystal = result.crystal;
          } else {
            newCrystals[targetDepth] = currentCrystal;
          }
        } catch (e) {
          console.error(`Failed to generate ${targetDepth}:`, e);
          newCrystals[targetDepth] = currentCrystal;
        }
      }

      setCrystals(newCrystals);
      setPreloading(false);
    };

    precacheAllDepths();
  }, [data?.crystal]);

  // Navigate to shallower
  const goShallower = () => {
    if (depthIndex >= DEPTH_LEVELS.length - 1) return;
    if (preloading) return;

    const nextDepth = DEPTH_LEVELS[depthIndex + 1];
    if (crystals[nextDepth]) {
      setDepthIndex(depthIndex + 1);
      onTransfer?.(crystals[nextDepth]);
    }
  };

  // Navigate to deeper
  const goDeeper = () => {
    if (depthIndex <= 0) return;

    const prevDepth = DEPTH_LEVELS[depthIndex - 1];
    if (crystals[prevDepth]) {
      setDepthIndex(depthIndex - 1);
      onTransfer?.(crystals[prevDepth]);
    }
  };

  if (!data) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-zinc-900 border border-zinc-700/50 rounded-lg p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto mb-4"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-amber-400 font-medium">Field Translation Log</h3>
              <button
                onClick={onClose}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Constraint Matrix */}
            {data.bones && data.bones.length > 0 && (
              <div className="mb-6">
                <h4 className="text-xs uppercase tracking-wider text-zinc-500 mb-3">
                  Constraint Matrix
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {data.bones.map((bone, i) => (
                    <div key={i} className="text-sm font-mono">
                      <span className="text-zinc-500">{bone.constraint}</span>
                      <span className="text-zinc-600 mx-2">→</span>
                      <span className="text-amber-300">{bone.word}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Narrative Synthesis */}
            {data.transmission && (
              <div className="mb-6">
                <h4 className="text-xs uppercase tracking-wider text-zinc-500 mb-3">
                  Narrative Synthesis
                </h4>
                <p className="text-zinc-300 leading-relaxed text-sm">
                  {data.transmission}
                </p>
              </div>
            )}

            {/* Extracted Query with Depth Navigation */}
            <div className="pt-4 border-t border-zinc-800">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs uppercase tracking-wider text-zinc-500">
                  Extracted Query
                </h4>
                {/* Depth navigator */}
                <div className="flex items-center gap-1">
                  {depthIndex < DEPTH_LEVELS.length - 1 && !preloading && (
                    <button
                      onClick={goShallower}
                      className="w-6 h-6 flex items-center justify-center rounded text-xs transition-colors text-zinc-500 hover:text-amber-400 bg-zinc-800"
                      title="Simplify"
                    >
                      ←
                    </button>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded min-w-[55px] text-center bg-zinc-800 ${preloading ? 'text-amber-400' : 'text-zinc-300'}`}>
                    {preloading ? '...' : DEPTH_LABELS[currentDepth]}
                  </span>
                  {depthIndex > 0 && !preloading && (
                    <button
                      onClick={goDeeper}
                      className="w-6 h-6 flex items-center justify-center rounded text-xs transition-colors text-zinc-500 hover:text-amber-400 bg-zinc-800"
                      title="Go deeper"
                    >
                      →
                    </button>
                  )}
                </div>
              </div>
              <p className="text-amber-300 italic text-lg text-center">
                "{currentCrystal}"
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
