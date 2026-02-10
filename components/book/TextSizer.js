'use client';

import { useState, useEffect } from 'react';

const SIZES = [
  { label: 'S', value: 'text-sm', scale: 0.875 },
  { label: 'M', value: 'text-base', scale: 1 },
  { label: 'L', value: 'text-lg', scale: 1.125 },
  { label: 'XL', value: 'text-xl', scale: 1.25 },
];

const STORAGE_KEY = 'nkya-book-text-size';

export default function TextSizer() {
  const [sizeIndex, setSizeIndex] = useState(1); // default M
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      const idx = parseInt(saved, 10);
      if (idx >= 0 && idx < SIZES.length) {
        setSizeIndex(idx);
        applySize(idx);
      }
    }
  }, []);

  const applySize = (idx) => {
    const el = document.getElementById('chapter-content');
    if (!el) return;
    // Remove all size classes
    SIZES.forEach(s => el.classList.remove(s.value));
    // Apply new size via CSS variable for smoother scaling
    el.style.fontSize = `${SIZES[idx].scale}rem`;
  };

  const setSize = (idx) => {
    setSizeIndex(idx);
    applySize(idx);
    localStorage.setItem(STORAGE_KEY, idx.toString());
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"
        title="Text size"
        aria-label="Adjust text size"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 7V4h16v3" />
          <path d="M9 20h6" />
          <path d="M12 4v16" />
        </svg>
      </button>

      {open && (
        <>
          {/* Backdrop to close */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div className="absolute right-0 top-full mt-1 z-50 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl p-1.5 flex gap-1">
            {SIZES.map((size, i) => (
              <button
                key={size.label}
                onClick={() => setSize(i)}
                className={`px-2.5 py-1.5 rounded text-xs font-mono transition-colors ${
                  i === sizeIndex
                    ? 'bg-amber-400/15 text-amber-400'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                {size.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
