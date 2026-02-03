/**
 * Glistener UI Component
 * Single-click scroll experience: Bones -> Tale -> Crystal
 *
 * Pre-reading emergence ritual that generates a crystallized question
 * from constrained randomness.
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const BONE_DELAY = 250;      // ms between bone reveals
const TALE_DELAY = 3000;     // ms between tale sentences
const CRYSTAL_DELAY = 1000;  // ms before crystal appears

export default function Glistener({ onTransfer, onClose }) {
  const [phase, setPhase] = useState('idle'); // idle | loading | bones | tale | crystal | complete
  const [data, setData] = useState(null);
  const [visibleBones, setVisibleBones] = useState(0);
  const [visibleTale, setVisibleTale] = useState(0);
  const [showPlain, setShowPlain] = useState(false);
  const [plainText, setPlainText] = useState(null);
  const [error, setError] = useState(null);

  const startGlisten = async () => {
    setPhase('loading');
    setError(null);

    try {
      const response = await fetch('/api/glisten', { method: 'POST' });
      const result = await response.json();

      if (!result.success) {
        setError(result.error || 'Failed to glisten');
        setPhase('idle');
        return;
      }

      setData(result);
      setPhase('bones');

      // Reveal bones sequentially
      for (let i = 1; i <= 10; i++) {
        setTimeout(() => setVisibleBones(i), i * BONE_DELAY);
      }

      // Transition to tale after bones complete
      setTimeout(() => {
        setPhase('tale');
        const sentences = result.transmission.split(/(?<=[.!?])\s+/);

        for (let i = 1; i <= sentences.length; i++) {
          setTimeout(() => setVisibleTale(i), i * TALE_DELAY);
        }

        // Transition to crystal after tale complete
        setTimeout(() => {
          setPhase('crystal');
          setTimeout(() => setPhase('complete'), CRYSTAL_DELAY);
        }, (sentences.length + 1) * TALE_DELAY);

      }, 11 * BONE_DELAY + 500);

    } catch (err) {
      setError('Failed to connect. Please try again.');
      setPhase('idle');
    }
  };

  const handlePlainToggle = async () => {
    if (plainText) {
      setShowPlain(!showPlain);
      return;
    }

    // Fetch plain language version
    try {
      const response = await fetch('/api/glisten/plain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transmission: data.transmission })
      });
      const result = await response.json();
      if (result.success) {
        setPlainText(result.text);
        setShowPlain(true);
      }
    } catch (err) {
      console.error('Failed to get plain language:', err);
    }
  };

  const handleTransfer = () => {
    if (onTransfer && data?.crystal) {
      onTransfer(data.crystal);
    }
  };

  const handleReset = () => {
    setPhase('idle');
    setData(null);
    setVisibleBones(0);
    setVisibleTale(0);
    setShowPlain(false);
    setPlainText(null);
    setError(null);
  };

  // ========== RENDER ==========

  if (phase === 'idle') {
    return (
      <div className="bg-zinc-900/80 border border-zinc-700/50 rounded-lg p-6 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-amber-400 font-medium mb-1">Glisten</h3>
            <p className="text-zinc-400 text-sm">
              You have a feeling but no words. Let the question find its shape.
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <button
          onClick={startGlisten}
          className="px-5 py-2 bg-amber-600/80 hover:bg-amber-500/80 text-white text-sm rounded-md transition-colors font-medium"
        >
          Begin Glisten
        </button>
        {error && (
          <p className="text-red-400 text-sm mt-3">{error}</p>
        )}
      </div>
    );
  }

  if (phase === 'loading') {
    return (
      <div className="bg-zinc-900/80 border border-zinc-700/50 rounded-lg p-6 mb-4">
        <div className="flex items-center justify-center py-8">
          <div className="animate-pulse text-amber-400">
            Drawing from the field...
          </div>
        </div>
      </div>
    );
  }

  const taleSentences = data?.transmission.split(/(?<=[.!?])\s+/) || [];

  return (
    <div className="bg-zinc-900/80 border border-zinc-700/50 rounded-lg p-6 mb-4">
      {/* Close button */}
      {onClose && (
        <div className="flex justify-end mb-2">
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* BONES */}
      <AnimatePresence>
        {(phase === 'bones' || phase === 'tale' || phase === 'crystal' || phase === 'complete') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6"
          >
            <h4 className="text-xs uppercase tracking-wider text-zinc-500 mb-3">
              The Bones
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {data.bones.slice(0, visibleBones).map((bone, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-sm font-mono"
                >
                  <span className="text-zinc-500">{bone.constraint}</span>
                  <span className="text-zinc-600 mx-2">-&gt;</span>
                  <span className="text-amber-300">{bone.word}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TALE */}
      <AnimatePresence>
        {(phase === 'tale' || phase === 'crystal' || phase === 'complete') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6"
          >
            <h4 className="text-xs uppercase tracking-wider text-zinc-500 mb-3">
              {showPlain ? 'The Meaning' : 'The Tale'}
            </h4>
            <div className="text-zinc-200 leading-relaxed">
              {showPlain ? (
                <p>{plainText}</p>
              ) : (
                taleSentences.slice(0, visibleTale).map((sentence, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1 }}
                  >
                    {sentence}{' '}
                  </motion.span>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CRYSTAL */}
      <AnimatePresence>
        {(phase === 'crystal' || phase === 'complete') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            className="text-center py-6"
          >
            <h4 className="text-xs uppercase tracking-wider text-zinc-500 mb-3">
              Your Question
            </h4>
            <p className="text-xl text-amber-300 italic">
              {data.crystal}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ACTIONS */}
      {phase === 'complete' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col items-center gap-3 pt-4 border-t border-zinc-800"
        >
          <button
            onClick={handleTransfer}
            className="w-full px-6 py-3 bg-amber-600/80 hover:bg-amber-500/80 text-white rounded-lg transition-colors font-medium"
          >
            Use This Question
          </button>
          <div className="flex gap-4">
            <button
              onClick={handlePlainToggle}
              className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {showPlain ? 'View as tale' : 'View as plain language'}
            </button>
            <button
              onClick={handleReset}
              className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Try again
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
