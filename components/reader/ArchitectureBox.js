// === ARCHITECTURE BOX COMPONENT ===
// Collapsible box showing structural/geometric details
// Visible at Wade/Swim levels, collapsed by default

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

const ArchitectureBox = ({
  content,
  isRebalancer = false,
  label = null,
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

  const iconColor = isExpanded ? 'text-emerald-500' : 'text-red-500';
  const displayLabel = label || (isRebalancer ? '⚙ Rebalancer Architecture' : '⚙ Architecture');

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
          {displayLabel}
        </span>
        {!isExpanded && (
          <span className="ml-auto text-[0.6rem] text-zinc-600 uppercase tracking-wider">
            tap to expand
          </span>
        )}
      </button>

      {/* Content - collapsible, with markdown support for bold labels */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-1 border-t border-zinc-700/30 animate-fadeIn">
          <div className="text-xs text-zinc-400 font-mono leading-relaxed">
            {/* Split on newlines and render each line with markdown for bold labels */}
            {content.split('\n').map((line, i) => (
              <div key={i} className={line.trim() ? 'mb-1.5' : 'mb-2'}>
                {line.trim() ? (
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <span>{children}</span>,
                      strong: ({ children }) => <strong className={isRebalancer ? 'text-emerald-300 font-semibold' : 'text-violet-300 font-semibold'}>{children}</strong>
                    }}
                  >
                    {line}
                  </ReactMarkdown>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ArchitectureBox;
