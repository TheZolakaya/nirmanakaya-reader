/**
 * GlistenSourcePanel - Reusable component for displaying Glisten session data
 *
 * Used in:
 * - Glistener.js (View Source modal on homepage)
 * - Reading detail page (Glistened Tale modal)
 *
 * Features:
 * - Bones/Constraint Matrix display
 * - Narrative Synthesis with Mythic/Plain English toggle (transmission/integration)
 * - Crystal display
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function GlistenSourcePanel({
  data,           // { bones, symbolism, transmission, integration, crystal }
  onClose,        // Close callback
  onTransfer,     // Optional - transfer crystal to parent (for homepage use)
  isOpen = true   // Control visibility when used as standalone
}) {
  const [showPlainEnglish, setShowPlainEnglish] = useState(false); // false = mythic (transmission), true = plain english (integration)

  if (!data) return null;

  const currentStory = showPlainEnglish ? data.integration : data.transmission;
  const hasIntegration = data.integration && data.integration.trim().length > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-start justify-center pt-8 pb-8 px-4 overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-zinc-900 border border-zinc-700/50 rounded-lg p-6 max-w-lg w-full my-auto"
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

            {/* Narrative Synthesis with Mythic/Modern toggle */}
            {data.transmission && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs uppercase tracking-wider text-zinc-500">
                    Narrative Synthesis
                  </h4>
                  {/* Mythic/Plain English toggle */}
                  {hasIntegration && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setShowModern(false)}
                        className={`px-2 py-1 rounded text-xs transition-colors ${
                          !showPlainEnglish
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300 border border-zinc-700'
                        }`}
                      >
                        Mythic
                      </button>
                      <button
                        onClick={() => setShowModern(true)}
                        className={`px-2 py-1 rounded text-xs transition-colors ${
                          showPlainEnglish
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300 border border-zinc-700'
                        }`}
                      >
                        Plain English
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-zinc-300 leading-relaxed text-sm">
                  {currentStory}
                </p>
              </div>
            )}

            {/* Extracted Query (always shows original crystal) */}
            <div className="pt-4 border-t border-zinc-800">
              <h4 className="text-xs uppercase tracking-wider text-zinc-500 mb-3">
                Extracted Query
              </h4>
              <p className="text-amber-300 italic text-lg text-center pb-2">
                "{data.crystal}"
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
