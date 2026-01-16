// === HELP TOOLTIP COMPONENT ===
// Contextual help popup shown in help mode

import { useEffect, useRef } from 'react';
import { getHelpContent } from '../../lib/help-content.js';

const HelpTooltip = ({ helpKey, position, onClose, onNavigate }) => {
  const tooltipRef = useRef(null);
  const content = getHelpContent(helpKey);

  // Reposition if tooltip would overflow viewport
  useEffect(() => {
    if (tooltipRef.current && position) {
      const rect = tooltipRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Adjust horizontal position
      if (rect.right > viewportWidth - 16) {
        tooltipRef.current.style.left = `${viewportWidth - rect.width - 16}px`;
      }
      if (rect.left < 16) {
        tooltipRef.current.style.left = '16px';
      }

      // Adjust vertical position (flip above if needed)
      if (rect.bottom > viewportHeight - 16) {
        tooltipRef.current.style.top = `${position.y - rect.height - 16}px`;
      }
    }
  }, [position]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!content) return null;

  return (
    <div
      ref={tooltipRef}
      className="fixed z-[70] w-72 bg-zinc-800 border border-amber-500/50 rounded-lg p-4 shadow-xl"
      style={{ top: position?.y || 0, left: position?.x || 0 }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Title */}
      <h4 className="text-amber-400 font-semibold mb-2 flex items-center gap-2">
        <span className="text-amber-500/70">?</span>
        {content.title}
      </h4>

      {/* Description */}
      <p className="text-sm text-zinc-300 leading-relaxed">{content.text}</p>

      {/* Related topics */}
      {content.related?.length > 0 && (
        <div className="mt-3 pt-2 border-t border-zinc-700/50">
          <p className="text-xs text-zinc-500 mb-1">Related:</p>
          <div className="flex flex-wrap gap-1">
            {content.related.map((key) => {
              const related = getHelpContent(key);
              if (!related) return null;
              return (
                <button
                  key={key}
                  onClick={() => onNavigate?.(key)}
                  className="text-xs px-2 py-0.5 bg-zinc-700/50 hover:bg-zinc-700 text-amber-300/80 hover:text-amber-300 rounded transition-colors"
                >
                  {related.title}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Dismiss */}
      <button
        onClick={onClose}
        className="mt-3 text-xs text-zinc-500 hover:text-zinc-300 w-full text-center transition-colors"
      >
        Got it
      </button>
    </div>
  );
};

export default HelpTooltip;
