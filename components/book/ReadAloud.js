'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const SPEEDS = [
  { label: '0.75x', value: 0.75 },
  { label: '1x', value: 1 },
  { label: '1.25x', value: 1.25 },
  { label: '1.5x', value: 1.5 },
];

const STORAGE_KEY = 'nkya-tts-rate';
const ACTIVE_CLASS = 'nkya-reading-active';

export default function ReadAloud() {
  const [state, setState] = useState('idle'); // idle | playing | paused
  const [speedIndex, setSpeedIndex] = useState(1); // default 1x
  const [showControls, setShowControls] = useState(false);
  const elementsRef = useRef([]);
  const currentIndexRef = useRef(0);
  const utterancesRef = useRef([]); // keep refs alive (iOS)
  const isAndroidRef = useRef(false);
  const pausedAtRef = useRef(0); // Android fallback: remember position

  // Load saved speed + detect Android
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      const idx = parseInt(saved, 10);
      if (idx >= 0 && idx < SPEEDS.length) setSpeedIndex(idx);
    }
    isAndroidRef.current = /android/i.test(navigator.userAgent);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      speechSynthesis.cancel();
      clearHighlight();
    };
  }, []);

  const clearHighlight = useCallback(() => {
    document.querySelectorAll(`.${ACTIVE_CLASS}`).forEach(el => {
      el.classList.remove(ACTIVE_CLASS);
    });
  }, []);

  const highlightElement = useCallback((el) => {
    clearHighlight();
    if (el) {
      el.classList.add(ACTIVE_CLASS);
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [clearHighlight]);

  const getReadableElements = useCallback(() => {
    const container = document.getElementById('chapter-content');
    if (!container) return [];
    const selectors = 'p, h1, h2, h3, h4, li, blockquote';
    return Array.from(container.querySelectorAll(selectors)).filter(el => {
      // Skip empty elements and elements inside code/pre/table
      if (!el.textContent.trim()) return false;
      if (el.closest('code, pre, table')) return false;
      return true;
    });
  }, []);

  const speakFrom = useCallback((startIndex) => {
    const elements = elementsRef.current;
    if (startIndex >= elements.length) {
      setState('idle');
      setShowControls(false);
      clearHighlight();
      currentIndexRef.current = 0;
      return;
    }

    const rate = SPEEDS[speedIndex].value;

    // Queue utterances one at a time to track position
    const speakNext = (idx) => {
      if (idx >= elements.length) {
        setState('idle');
        setShowControls(false);
        clearHighlight();
        currentIndexRef.current = 0;
        return;
      }

      const el = elements[idx];
      const text = el.textContent.trim();
      if (!text) {
        speakNext(idx + 1);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;

      utterance.onstart = () => {
        currentIndexRef.current = idx;
        highlightElement(el);
      };

      utterance.onend = () => {
        speakNext(idx + 1);
      };

      utterance.onerror = (e) => {
        // 'interrupted' and 'canceled' are expected when stopping
        if (e.error !== 'interrupted' && e.error !== 'canceled') {
          speakNext(idx + 1);
        }
      };

      utterancesRef.current.push(utterance); // keep alive for iOS
      speechSynthesis.speak(utterance);
    };

    speakNext(startIndex);
  }, [speedIndex, highlightElement, clearHighlight]);

  const handlePlay = useCallback(() => {
    if (state === 'idle') {
      speechSynthesis.cancel();
      const elements = getReadableElements();
      if (elements.length === 0) return;
      elementsRef.current = elements;
      utterancesRef.current = [];
      currentIndexRef.current = 0;
      setState('playing');
      setShowControls(true);
      speakFrom(0);
    } else if (state === 'paused') {
      if (isAndroidRef.current) {
        // Android: restart from remembered position
        setState('playing');
        speakFrom(pausedAtRef.current);
      } else {
        speechSynthesis.resume();
        setState('playing');
      }
    } else if (state === 'playing') {
      if (isAndroidRef.current) {
        // Android: cancel and remember position
        pausedAtRef.current = currentIndexRef.current;
        speechSynthesis.cancel();
        setState('paused');
      } else {
        speechSynthesis.pause();
        setState('paused');
      }
    }
  }, [state, getReadableElements, speakFrom]);

  const handleStop = useCallback(() => {
    speechSynthesis.cancel();
    clearHighlight();
    setState('idle');
    setShowControls(false);
    currentIndexRef.current = 0;
    pausedAtRef.current = 0;
    utterancesRef.current = [];
  }, [clearHighlight]);

  const handleSpeedChange = useCallback((idx) => {
    setSpeedIndex(idx);
    localStorage.setItem(STORAGE_KEY, idx.toString());
    // If currently playing, restart from current position with new speed
    if (state === 'playing') {
      speechSynthesis.cancel();
      // Small delay to let cancel propagate
      setTimeout(() => speakFrom(currentIndexRef.current), 50);
    }
  }, [state, speakFrom]);

  return (
    <div className="relative flex items-center">
      {/* Main play/pause button */}
      <button
        onClick={handlePlay}
        className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"
        title={state === 'playing' ? 'Pause reading' : 'Read aloud'}
        aria-label={state === 'playing' ? 'Pause reading' : 'Read aloud'}
      >
        {state === 'playing' ? (
          // Pause icon
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          // Speaker icon
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            {state === 'paused' ? (
              <line x1="23" y1="9" x2="17" y2="15" />
            ) : (
              <>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              </>
            )}
          </svg>
        )}
      </button>

      {/* Controls bar (visible when active) */}
      {showControls && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => {}} />
          <div className="absolute left-0 top-full mt-1 z-50 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl p-1.5 flex items-center gap-1">
            {/* Stop button */}
            <button
              onClick={handleStop}
              className="px-2 py-1.5 rounded text-xs text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors"
              title="Stop"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <rect x="4" y="4" width="16" height="16" rx="2" />
              </svg>
            </button>

            {/* Divider */}
            <div className="w-px h-5 bg-zinc-700" />

            {/* Speed options */}
            {SPEEDS.map((speed, i) => (
              <button
                key={speed.label}
                onClick={() => handleSpeedChange(i)}
                className={`px-2 py-1.5 rounded text-xs font-mono transition-colors ${
                  i === speedIndex
                    ? 'bg-amber-400/15 text-amber-400'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                {speed.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
