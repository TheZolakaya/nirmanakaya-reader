/**
 * Glistener UI Component - "The Ghost Stream"
 *
 * A cinematic in-textarea experience where fragments from the Bones and Tale
 * stream through like data through a pipe, finally landing on the Crystal question.
 *
 * Flow:
 * 1. User clicks "Begin" → API call starts
 * 2. Ghost Stream: Fragments rush through textarea (low opacity, blurry, monospace)
 * 3. Landing: Stream slows, sharpens, final question types character-by-character
 * 4. Complete: "View Source" 📜 reveals the full Bones + Tale receipt
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Timing constants
const STREAM_DURATION = 3500;     // Total ghost stream time (ms)
const FRAGMENT_INTERVAL = 150;   // Time between fragment changes (ms)
const TYPING_SPEED = 35;         // ms per character for final question
const SLOWDOWN_START = 0.7;      // When stream starts slowing (70% through)

export default function Glistener({ onTransfer, onClose, onStreamStart, onStreamEnd }) {
  const [phase, setPhase] = useState('idle'); // idle | loading | streaming | typing | complete
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  // Ghost stream state
  const [currentFragment, setCurrentFragment] = useState('');
  const [fragmentOpacity, setFragmentOpacity] = useState(0.4);
  const [fragmentBlur, setFragmentBlur] = useState(true);

  // Typing state
  const [typedChars, setTypedChars] = useState(0);

  // Generate fragments from bones and tale for the ghost stream
  const generateFragments = useCallback((bones, transmission) => {
    const fragments = [];

    // Add bone words
    bones.forEach(bone => {
      fragments.push(bone.word);
      fragments.push(`${bone.constraint}...`);
    });

    // Add tale snippets (2-4 word chunks)
    const words = transmission.split(/\s+/);
    for (let i = 0; i < words.length; i += 3) {
      const chunk = words.slice(i, i + 3).join(' ');
      if (chunk.length > 5) {
        fragments.push(chunk + '...');
      }
    }

    // Shuffle for chaos
    return fragments.sort(() => Math.random() - 0.5);
  }, []);

  const startGlisten = async () => {
    setPhase('loading');
    setError(null);

    // Notify parent that streaming will start
    onStreamStart?.();

    try {
      const response = await fetch('/api/glisten', { method: 'POST' });
      const result = await response.json();

      if (!result.success) {
        setError(result.error || 'Failed to glisten');
        setPhase('idle');
        onStreamEnd?.();
        return;
      }

      setData(result);

      // Start the Ghost Stream
      setPhase('streaming');
      const fragments = generateFragments(result.bones, result.transmission);
      let fragmentIndex = 0;
      let elapsed = 0;

      const streamInterval = setInterval(() => {
        elapsed += FRAGMENT_INTERVAL;
        const progress = elapsed / STREAM_DURATION;

        // Cycle through fragments
        setCurrentFragment(fragments[fragmentIndex % fragments.length]);
        fragmentIndex++;

        // Slowdown phase - reduce opacity fluctuation, prep for landing
        if (progress > SLOWDOWN_START) {
          const slowProgress = (progress - SLOWDOWN_START) / (1 - SLOWDOWN_START);
          setFragmentOpacity(0.4 + (slowProgress * 0.6)); // 0.4 -> 1.0
          if (slowProgress > 0.8) {
            setFragmentBlur(false); // Snap sharp
          }
        }

        // End stream, start typing
        if (elapsed >= STREAM_DURATION) {
          clearInterval(streamInterval);
          setPhase('typing');
          setCurrentFragment('');

          // Type out the crystal question character by character
          const crystal = result.crystal;
          let charIndex = 0;

          const typeInterval = setInterval(() => {
            charIndex++;
            setTypedChars(charIndex);

            if (charIndex >= crystal.length) {
              clearInterval(typeInterval);
              setPhase('complete');
              // Transfer the question to the textarea
              onTransfer?.(crystal);
              onStreamEnd?.();
            }
          }, TYPING_SPEED);
        }
      }, FRAGMENT_INTERVAL);

    } catch (err) {
      setError('Failed to connect. Please try again.');
      setPhase('idle');
      onStreamEnd?.();
    }
  };

  const handleReset = () => {
    setPhase('idle');
    setData(null);
    setCurrentFragment('');
    setFragmentOpacity(0.4);
    setFragmentBlur(true);
    setTypedChars(0);
    setError(null);
  };

  // ========== RENDER: IDLE STATE (Begin Button) ==========
  if (phase === 'idle') {
    return (
      <div className="bg-zinc-900/80 border border-zinc-700/50 rounded-lg px-4 py-3 mb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-baseline gap-2">
                <h3 className="text-amber-400 font-medium text-sm">Glisten</h3>
                <span className="text-zinc-600 text-[9px] uppercase tracking-wider">Field Prompter</span>
              </div>
              <p className="text-zinc-500 text-xs">
                Let the question find its shape through The Veil.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={startGlisten}
              className="px-3 py-1 bg-amber-600/80 hover:bg-amber-500/80 text-white text-xs rounded transition-colors font-medium"
            >
              Begin
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
        {error && (
          <p className="text-red-400 text-xs mt-2">{error}</p>
        )}
      </div>
    );
  }

  // ========== RENDER: LOADING STATE ==========
  if (phase === 'loading') {
    return (
      <div className="bg-zinc-900/80 border border-zinc-700/50 rounded-lg px-4 py-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="animate-pulse text-amber-400 text-sm">
            ◇ Tuning into the field...
          </div>
        </div>
      </div>
    );
  }

  // ========== RENDER: STREAMING / TYPING STATE (Ghost Stream Overlay) ==========
  if (phase === 'streaming' || phase === 'typing') {
    return (
      <div className="bg-zinc-900/80 border border-zinc-700/50 rounded-lg px-4 py-3 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-amber-500 animate-pulse">◇</span>
            <span className="text-zinc-400 text-xs font-mono">
              {phase === 'streaming' ? 'receiving transmission...' : 'crystallizing...'}
            </span>
          </div>
        </div>

        {/* Ghost Stream Display */}
        <div className="mt-3 min-h-[60px] flex items-center justify-center">
          {phase === 'streaming' && (
            <motion.div
              key={currentFragment}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: fragmentOpacity, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.1 }}
              className={`text-zinc-400 font-mono text-sm text-center ${fragmentBlur ? 'blur-[0.5px]' : ''}`}
            >
              {currentFragment}
            </motion.div>
          )}

          {phase === 'typing' && data?.crystal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-amber-300 text-center italic"
            >
              {data.crystal.slice(0, typedChars)}
              <span className="animate-pulse">|</span>
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  // ========== RENDER: COMPLETE STATE (View Source) ==========
  if (phase === 'complete') {
    return (
      <ViewSourcePanel
        data={data}
        onReset={handleReset}
        onClose={onClose}
      />
    );
  }

  return null;
}

// ========== VIEW SOURCE PANEL ==========
function ViewSourcePanel({ data, onReset, onClose }) {
  const [showReceipt, setShowReceipt] = useState(false);

  return (
    <>
      {/* Compact "View Source" button */}
      <div className="bg-zinc-900/80 border border-zinc-700/50 rounded-lg px-4 py-3 mb-4">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setShowReceipt(true)}
            className="flex items-center gap-2 text-zinc-400 hover:text-amber-400 transition-colors text-sm"
          >
            <span>📜</span>
            <span>View Transmission</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onReset}
              className="text-zinc-500 hover:text-zinc-300 transition-colors text-xs"
            >
              Glisten again
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Transmission Receipt Modal */}
      <AnimatePresence>
        {showReceipt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowReceipt(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-zinc-900 border border-zinc-700/50 rounded-lg p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-amber-400 font-medium">Transmission Receipt</h3>
                <button
                  onClick={() => setShowReceipt(false)}
                  className="text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* The Bones */}
              <div className="mb-6">
                <h4 className="text-xs uppercase tracking-wider text-zinc-500 mb-3">
                  The Bones
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

              {/* The Tale */}
              <div className="mb-6">
                <h4 className="text-xs uppercase tracking-wider text-zinc-500 mb-3">
                  The Tale
                </h4>
                <p className="text-zinc-300 leading-relaxed text-sm">
                  {data.transmission}
                </p>
              </div>

              {/* The Crystal */}
              <div className="pt-4 border-t border-zinc-800">
                <h4 className="text-xs uppercase tracking-wider text-zinc-500 mb-3">
                  The Crystal
                </h4>
                <p className="text-amber-300 italic text-lg text-center">
                  "{data.crystal}"
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
