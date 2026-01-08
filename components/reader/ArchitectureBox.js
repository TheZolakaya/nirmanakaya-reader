// === ARCHITECTURE BOX COMPONENT ===
// Collapsible box showing structural/geometric details
// Visible at Wade/Swim levels, collapsed by default

import { useState } from 'react';

const ArchitectureBox = ({
  content,
  isRebalancer = false,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!content) return null;

  const bgColor = isRebalancer
    ? 'bg-emerald-950/30 border-emerald-700/40'
    : 'bg-zinc-900/50 border-zinc-700/40';

  const headerColor = isRebalancer
    ? 'text-emerald-400'
    : 'text-zinc-400';

  const iconColor = isExpanded ? 'text-emerald-500' : 'text-zinc-500';

  return (
    <div className={`rounded-lg border ${bgColor} overflow-hidden animate-fadeIn ${className}`}>
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/5 transition-colors"
      >
        <span className={`text-xs transition-transform duration-200 ${iconColor}`}
              style={{ transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
          ▼
        </span>
        <span className={`text-xs font-medium ${headerColor}`}>
          {isRebalancer ? '📐 Rebalancer Architecture' : '📐 Architecture'}
        </span>
      </button>

      {/* Content - collapsible */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-1 border-t border-zinc-700/30 animate-fadeIn">
          <pre className="text-xs text-zinc-400 font-mono whitespace-pre-wrap leading-relaxed">
            {content}
          </pre>
        </div>
      )}
    </div>
  );
};

export default ArchitectureBox;
