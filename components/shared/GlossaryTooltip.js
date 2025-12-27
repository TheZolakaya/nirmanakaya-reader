"use client";
import { useState, useRef, useEffect } from 'react';

// Lightweight tooltip popup for glossary terms
// Shows on hover (desktop) / tap (mobile)
export default function GlossaryTooltip({ entry, position, onClose }) {
  const tooltipRef = useRef(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  // Adjust position to keep tooltip in viewport
  useEffect(() => {
    if (!tooltipRef.current || !position) return;

    const tooltip = tooltipRef.current;
    const rect = tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let newX = position.x;
    let newY = position.y;

    // Adjust horizontal position
    if (rect.right > viewportWidth - 10) {
      newX = viewportWidth - rect.width - 10;
    }
    if (rect.left < 10) {
      newX = 10;
    }

    // Adjust vertical position - prefer above, but flip below if needed
    if (rect.top < 10) {
      newY = position.y + 30; // Flip below
    }

    setAdjustedPosition({ x: newX, y: newY });
  }, [position]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target)) {
        onClose?.();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!entry) return null;

  return (
    <div
      ref={tooltipRef}
      className="fixed z-[100] bg-zinc-800 border border-zinc-700 rounded-lg p-3 shadow-xl max-w-xs min-w-[200px]"
      style={{
        left: adjustedPosition?.x ?? position?.x ?? 0,
        top: adjustedPosition?.y ?? position?.y ?? 0,
        transform: 'translateX(-50%) translateY(-100%)',
        marginTop: '-8px'
      }}
    >
      {/* Header */}
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-zinc-100 font-medium">{entry.name}</span>
        {entry.traditional && (
          <span className="text-zinc-500 text-xs">({entry.traditional})</span>
        )}
      </div>

      {/* Type badge */}
      {entry.type && (
        <span className="inline-block bg-cyan-500/20 text-cyan-400 text-[0.625rem] px-2 py-0.5 rounded-full uppercase tracking-wide mb-2">
          {entry.type}
        </span>
      )}

      {/* Short definition */}
      <div className="text-zinc-300 text-[0.8125rem] leading-relaxed">
        {entry.short}
      </div>

      {/* Verb */}
      {entry.verb && (
        <div className="text-emerald-400 text-xs mt-2 italic">
          {entry.verb}
        </div>
      )}

      {/* House */}
      {entry.house && (
        <div className="text-purple-400 text-xs mt-1">
          {entry.house} House
        </div>
      )}

      {/* Close hint */}
      <div className="text-zinc-600 text-[0.625rem] mt-2 text-right">
        click anywhere to close
      </div>
    </div>
  );
}

// Provider component to manage tooltip state at app level
export function GlossaryTooltipProvider({ children }) {
  const [tooltipData, setTooltipData] = useState(null);

  const showTooltip = (slug, entry, event) => {
    const rect = event.target.getBoundingClientRect();
    setTooltipData({
      entry,
      position: {
        x: rect.left + rect.width / 2,
        y: rect.top
      }
    });
  };

  const hideTooltip = () => {
    setTooltipData(null);
  };

  return (
    <>
      {children({ onGlossaryClick: showTooltip })}
      {tooltipData && (
        <GlossaryTooltip
          entry={tooltipData.entry}
          position={tooltipData.position}
          onClose={hideTooltip}
        />
      )}
    </>
  );
}
