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

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Timing constants
const STREAM_DURATION = 5000;     // Total ghost stream time (ms) - slow enough to see scroll
const FRAGMENT_INTERVAL = 50;    // Time between updates (ms) - smooth scroll updates
const TYPING_SPEED = 40;         // ms per character for final question
const LINGER_DURATION = 2000;    // How long crystal hangs before transfer (ms)
const FADE_DURATION = 800;       // Fade out duration (ms)
const FADE_STEPS = 20;           // Number of fade animation steps

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

  // Build scrolling content from bones and transmission
  const buildScrollingContent = useCallback((bones, transmission) => {
    // Format bones as a header section
    const boneText = bones.map(b => `${b.constraint}: ${b.word}`).join(' · ');
    // Full content: bones header + transmission
    return `${boneText}\n\n${transmission}`;
  }, []);

  const startGlisten = async () => {
    setPhase('loading');
    setError(null);

    // Extensive loading messages - shuffled to avoid repetition
    const allMessages = [
      // Field & Antenna
      '◇ Calibrating field antenna',
      '◇ Tuning resonance frequency',
      '◇ Aligning receiver aperture',
      '◇ Scanning liminal bandwidth',
      '◇ Establishing signal lock',
      // Matrix & Structure
      '◇ Generating constraint matrix',
      '◇ Weaving probability lattice',
      '◇ Constructing semantic scaffold',
      '◇ Building symbolic framework',
      '◇ Assembling meaning vectors',
      // Sampling & Distribution
      '◇ Sampling probability distribution',
      '◇ Drawing from possibility space',
      '◇ Collapsing potential states',
      '◇ Harvesting random seeds',
      '◇ Extracting signal from noise',
      // Synthesis & Narrative
      '◇ Synthesizing narrative structure',
      '◇ Composing symbolic threads',
      '◇ Fusing disparate fragments',
      '◇ Distilling essence patterns',
      '◇ Braiding meaning currents',
      // Mapping & Topology
      '◇ Mapping semantic topology',
      '◇ Charting conceptual terrain',
      '◇ Tracing hidden contours',
      '◇ Surveying inner landscape',
      '◇ Plotting resonance coordinates',
      // Depth & Meaning
      '◇ Plumbing the depths',
      '◇ Filtering meaning',
      '◇ Sifting symbolic sediment',
      '◇ Refining raw intuition',
      '◇ Condensing vapor to crystal',
      // Crystal & Question
      '◇ Crystallizing question form',
      '◇ Focusing inquiry lens',
      '◇ Sharpening the asking edge',
      '◇ Polishing question facets',
      '◇ Precipitating final form',
      // Field Resonance & Patterns
      '◇ Detecting field harmonics',
      '◇ Reading scattered patterns',
      '◇ Parsing signal interference',
      '◇ Decoding probability waves',
      '◇ Translating liminal echoes',
    ];

    // Shuffle messages (Fisher-Yates)
    const loadingMessages = [...allMessages];
    for (let i = loadingMessages.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [loadingMessages[i], loadingMessages[j]] = [loadingMessages[j], loadingMessages[i]];
    }

    // Track visible messages as a scrolling stack
    let visibleStack = [{ text: loadingMessages[0], opacity: 1, position: 0 }];
    let msgIndex = 0;
    let pulsePhase = 0;

    onDisplayContent?.({ type: 'loading', messages: visibleStack, pulsePhase: 0 });
    onStreamStart?.();

    // Continuous pulse animation - runs faster than message changes for smooth glow
    const pulseInterval = setInterval(() => {
      pulsePhase += 0.12; // Smooth continuous pulse
      onDisplayContent?.({ type: 'loading', messages: visibleStack, pulsePhase });
    }, 50); // 20fps pulse updates

    // Scroll messages up with crossfade - new message fades in as old fades out
    const msgInterval = setInterval(() => {
      msgIndex = (msgIndex + 1) % loadingMessages.length;

      // Build visible stack: current (entering), previous (exiting), older (fading out)
      visibleStack = [
        // New message entering from bottom
        { text: loadingMessages[msgIndex], opacity: 1, position: 0 },
        // Previous message scrolling up
        ...(visibleStack[0] ? [{ text: visibleStack[0].text, opacity: 0.5, position: 1 }] : []),
        // Oldest visible message fading out at top
        ...(visibleStack[1] ? [{ text: visibleStack[1].text, opacity: 0.15, position: 2 }] : []),
      ].slice(0, 3); // Max 3 visible

      onDisplayContent?.({ type: 'loading', messages: visibleStack, pulsePhase });
    }, 1800);

    try {
      const response = await fetch('/api/glisten', { method: 'POST' });
      clearInterval(msgInterval);  // Stop cycling once we have response
      clearInterval(pulseInterval);  // Stop pulse animation
      const result = await response.json();

      if (!result.success) {
        setError(result.error || 'Failed to glisten');
        setPhase('idle');
        onDisplayContent?.(null);
        onStreamEnd?.();
        return;
      }

      setData(result);

      // Start the Ghost Stream - show FULL transmission text
      setPhase('streaming');
      const fullContent = buildScrollingContent(result.bones, result.transmission);
      let elapsed = 0;
      let pulsePhase = 0;

      const streamInterval = setInterval(() => {
        elapsed += FRAGMENT_INTERVAL;
        const progress = elapsed / STREAM_DURATION;
        pulsePhase += 0.25;  // For glow pulsing - faster beat

        // Pulsing opacity effect (0.75 to 0.95) - legible but alive
        const pulseOpacity = 0.85 + Math.sin(pulsePhase) * 0.1;

        // Send full transmission to parent for display with scroll progress
        onDisplayContent?.({
          type: 'streaming',
          text: fullContent,
          opacity: pulseOpacity,
          pulse: true,
          scrollProgress: progress,  // 0 to 1, parent uses this to auto-scroll
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

              // Linger phase - let the crystal hang for a moment
              setTimeout(() => {
                // Fade out gradually
                let fadeStep = 0;
                const fadeInterval = setInterval(() => {
                  fadeStep++;
                  const fadeOpacity = 1 - (fadeStep / FADE_STEPS);

                  onDisplayContent?.({
                    type: 'fading',
                    text: crystal,
                    opacity: fadeOpacity,
                  });

                  if (fadeStep >= FADE_STEPS) {
                    clearInterval(fadeInterval);
                    setPhase('complete');
                    // Transfer the question to the textarea
                    onTransfer?.(crystal);
                    onDisplayContent?.(null);
                    onStreamEnd?.();
                  }
                }, FADE_DURATION / FADE_STEPS);
              }, LINGER_DURATION);
            }
          }, TYPING_SPEED);
        }
      }, FRAGMENT_INTERVAL);

    } catch (err) {
      clearInterval(msgInterval);  // Stop cycling on error too
      clearInterval(pulseInterval);  // Stop pulse on error
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
    onTransfer?.('');  // Clear the old question in textarea
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
        onTransfer={onTransfer}
      />
    );
  }

  return null;
}

// Depth levels for crystal exploration
const DEPTH_LEVELS = ['deep', 'swim', 'wade', 'shallow'];
const DEPTH_LABELS = {
  deep: 'Deep',
  swim: 'Swim',
  wade: 'Wade',
  shallow: 'Shallow'
};

// ========== VIEW SOURCE PANEL ==========
function ViewSourcePanel({ data, onReset, onClose, onTransfer }) {
  const [showReceipt, setShowReceipt] = useState(false);
  const [depthIndex, setDepthIndex] = useState(0); // 0 = deep (default)
  const [crystals, setCrystals] = useState({ deep: data.crystal }); // Cache crystals at each depth
  const [preloading, setPreloading] = useState(true); // Pre-caching all depths
  const hasPrecached = useRef(false); // Track if precaching has been done

  const currentDepth = DEPTH_LEVELS[depthIndex];
  const currentCrystal = crystals[currentDepth] || data.crystal;

  // Pre-cache all depth levels on mount (filter deep + generate swim/wade/shallow)
  useEffect(() => {
    // Only run once per mount
    if (hasPrecached.current) return;
    hasPrecached.current = true;

    const precacheAllDepths = async () => {
      const rawCrystal = data.crystal;
      const newCrystals = { deep: rawCrystal };

      // First: filter the deep crystal for sensibility
      try {
        const deepRes = await fetch('/api/glisten/simplify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ crystal: rawCrystal, targetDepth: 'deep' })
        });
        const deepResult = await deepRes.json();
        if (deepResult.success) {
          newCrystals.deep = deepResult.crystal;
          onTransfer?.(deepResult.crystal); // Update textarea with filtered version
        }
      } catch (e) {
        console.error('Failed to filter deep:', e);
      }

      // Then: generate all other depths in parallel from the filtered deep
      const depths = ['swim', 'wade', 'shallow'];
      const promises = depths.map(async (depth) => {
        try {
          const res = await fetch('/api/glisten/simplify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ crystal: newCrystals.deep, targetDepth: depth })
          });
          const result = await res.json();
          if (result.success) {
            return { depth, crystal: result.crystal };
          }
        } catch (e) {
          console.error(`Failed to generate ${depth}:`, e);
        }
        return null;
      });

      const results = await Promise.all(promises);
      results.forEach(r => {
        if (r) newCrystals[r.depth] = r.crystal;
      });

      setCrystals(newCrystals);
      setPreloading(false);
    };

    precacheAllDepths();
  }, [data.crystal]); // Removed onTransfer - use ref guard instead

  // Navigate to shallower - uses pre-cached crystals
  const goShallower = () => {
    if (depthIndex >= DEPTH_LEVELS.length - 1) return; // Already at shallowest
    if (preloading) return; // Wait for pre-cache

    const nextDepth = DEPTH_LEVELS[depthIndex + 1];
    if (crystals[nextDepth]) {
      setDepthIndex(depthIndex + 1);
      onTransfer?.(crystals[nextDepth]);
    }
  };

  // Navigate to deeper
  const goDeeper = () => {
    if (depthIndex <= 0) return; // Already at deepest
    setDepthIndex(depthIndex - 1);
    const prevDepth = DEPTH_LEVELS[depthIndex - 1];
    onTransfer?.(crystals[prevDepth] || data.crystal);
  };

  return (
    <>
      {/* Subtle inline controls - bottom left like idle state */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2 z-10">
        {/* Depth navigator - ← = shallower, → = deeper */}
        <div className="flex items-center gap-1 mr-2">
          {/* Left arrow = go shallower (hidden at shallowest or while preloading) */}
          {depthIndex < DEPTH_LEVELS.length - 1 && !preloading && (
            <button
              onClick={goShallower}
              className="w-5 h-5 flex items-center justify-center rounded text-xs transition-colors text-zinc-500 hover:text-amber-400"
              title="Simplify"
            >
              ←
            </button>
          )}
          <span className={`text-xs px-1.5 py-0.5 rounded min-w-[50px] text-center ${preloading ? 'text-amber-400' : 'text-zinc-400'}`}>
            {preloading ? (
              <span className="inline-flex gap-0.5">
                <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
              </span>
            ) : DEPTH_LABELS[currentDepth]}
          </span>
          {/* Right arrow = go deeper (hidden at deepest or while preloading) */}
          {depthIndex > 0 && !preloading && (
            <button
              onClick={goDeeper}
              className="w-5 h-5 flex items-center justify-center rounded text-xs transition-colors text-zinc-500 hover:text-amber-400"
              title="Go deeper"
            >
              →
            </button>
          )}
        </div>

        <span className="text-zinc-700">|</span>

        <button
          onClick={() => setShowReceipt(true)}
          className="text-zinc-500 hover:text-amber-400 text-xs transition-colors flex items-center gap-1"
          title="View source"
        >
          <span>📜</span>
        </button>
        <button
          onClick={onReset}
          className="text-zinc-600 hover:text-zinc-400 text-xs transition-colors"
          title="Generate new"
        >
          Again
        </button>
        <button
          onClick={() => {
            onTransfer?.('');  // Clear the question
            onClose?.();       // Close glistener UI
          }}
          className="text-zinc-600 hover:text-zinc-400 text-xs transition-colors"
          title="Clear and close"
        >
          Clear
        </button>
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
                <h3 className="text-amber-400 font-medium">Field Translation Log</h3>
                <button
                  onClick={() => setShowReceipt(false)}
                  className="text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Constraint Matrix */}
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

              {/* Narrative Synthesis */}
              <div className="mb-6">
                <h4 className="text-xs uppercase tracking-wider text-zinc-500 mb-3">
                  Narrative Synthesis
                </h4>
                <p className="text-zinc-300 leading-relaxed text-sm">
                  {data.transmission}
                </p>
              </div>

              {/* Extracted Query */}
              <div className="pt-4 border-t border-zinc-800">
                <h4 className="text-xs uppercase tracking-wider text-zinc-500 mb-3">
                  Extracted Query
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
