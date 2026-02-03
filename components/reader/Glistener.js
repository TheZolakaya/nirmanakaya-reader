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
 *
 * ARCHITECTURE:
 * - Streaming/typing content is sent to parent via onDisplayContent callback
 * - Parent renders content in the textarea's placeholder area
 * - Glistener only renders UI for idle/complete states
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Timing constants
const STREAM_DURATION = 4500;     // Total ghost stream time (ms) - slower for effect
const FRAGMENT_INTERVAL = 180;   // Time between fragment changes (ms)
const TYPING_SPEED = 40;         // ms per character for final question
const SLOWDOWN_START = 0.7;      // When stream starts slowing (70% through)

export default function Glistener({
  onTransfer,
  onClose,
  onStreamStart,
  onStreamEnd,
  onDisplayContent,  // Callback to send content for display in textarea
  onPhaseChange,     // Callback to notify parent of phase changes
}) {
  const [phase, setPhase] = useState('idle'); // idle | loading | streaming | typing | complete
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  // Notify parent of phase changes
  useEffect(() => {
    onPhaseChange?.(phase);
  }, [phase, onPhaseChange]);

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

    // Send loading message to display in textarea
    onDisplayContent?.({ type: 'loading', text: '◇ Tuning into the field...' });
    onStreamStart?.();

    try {
      const response = await fetch('/api/glisten', { method: 'POST' });
      const result = await response.json();

      if (!result.success) {
        setError(result.error || 'Failed to glisten');
        setPhase('idle');
        onDisplayContent?.(null);
        onStreamEnd?.();
        return;
      }

      setData(result);

      // Start the Ghost Stream
      setPhase('streaming');
      const fragments = generateFragments(result.bones, result.transmission);
      let fragmentIndex = 0;
      let elapsed = 0;
      let opacity = 0.7;  // Start more visible

      const streamInterval = setInterval(() => {
        elapsed += FRAGMENT_INTERVAL;
        const progress = elapsed / STREAM_DURATION;

        // Cycle through fragments
        const fragment = fragments[fragmentIndex % fragments.length];
        fragmentIndex++;

        // Slowdown phase - increase opacity toward full
        if (progress > SLOWDOWN_START) {
          const slowProgress = (progress - SLOWDOWN_START) / (1 - SLOWDOWN_START);
          opacity = 0.7 + (slowProgress * 0.3); // 0.7 -> 1.0
        }

        // Send fragment to parent for display
        onDisplayContent?.({
          type: 'streaming',
          text: fragment,
          opacity,
        });

        // End stream, start typing
        if (elapsed >= STREAM_DURATION) {
          clearInterval(streamInterval);
          setPhase('typing');

          // Type out the crystal question character by character
          const crystal = result.crystal;
          let charIndex = 0;

          const typeInterval = setInterval(() => {
            charIndex++;

            // Send typed content to parent
            onDisplayContent?.({
              type: 'typing',
              text: crystal.slice(0, charIndex),
              fullText: crystal,
              progress: charIndex / crystal.length,
            });

            if (charIndex >= crystal.length) {
              clearInterval(typeInterval);
              setPhase('complete');
              // Transfer the question to the textarea
              onTransfer?.(crystal);
              onDisplayContent?.(null);
              onStreamEnd?.();
            }
          }, TYPING_SPEED);
        }
      }, FRAGMENT_INTERVAL);

    } catch (err) {
      setError('Failed to connect. Please try again.');
      setPhase('idle');
      onDisplayContent?.(null);
      onStreamEnd?.();
    }
  };

  const handleReset = () => {
    setPhase('idle');
    setData(null);
    setError(null);
  };

  // ========== RENDER: IDLE STATE (Subtle inline confirm) ==========
  // Small confirmation in bottom-left, not a big centered panel
  if (phase === 'idle') {
    return (
      <div className="absolute bottom-3 left-3 flex items-center gap-2 z-10">
        <span className="text-amber-500/70 text-xs">◇</span>
        <button
          onClick={startGlisten}
          className="text-amber-400 hover:text-amber-300 text-xs transition-colors"
        >
          Begin
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="text-zinc-600 hover:text-zinc-400 text-xs transition-colors"
          >
            ✕
          </button>
        )}
        {error && (
          <span className="text-red-400 text-xs ml-2">{error}</span>
        )}
      </div>
    );
  }

  // ========== RENDER: LOADING / STREAMING / TYPING ==========
  // Content is displayed in parent's placeholder area via onDisplayContent
  // We just show nothing here (or a minimal indicator)
  if (phase === 'loading' || phase === 'streaming' || phase === 'typing') {
    return null; // Parent handles display
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
      {/* Subtle inline controls - bottom left like idle state */}
      <div className="absolute bottom-3 left-3 flex items-center gap-3 z-10">
        <button
          onClick={() => setShowReceipt(true)}
          className="text-zinc-500 hover:text-amber-400 text-xs transition-colors flex items-center gap-1"
        >
          <span>📜</span>
          <span>Receipt</span>
        </button>
        <button
          onClick={onReset}
          className="text-zinc-600 hover:text-zinc-400 text-xs transition-colors"
        >
          Again
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="text-zinc-600 hover:text-zinc-400 text-xs transition-colors"
          >
            ✕
          </button>
        )}
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
