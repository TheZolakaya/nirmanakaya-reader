'use client';

import React, { memo } from 'react';
import { LAYOUTS } from '../../lib/map/layouts.js';

/**
 * LayoutSwitcher - Dropdown/button group for selecting map layouts
 */

const LAYOUT_ORDER = ['mandala', 'archetypes-linear', 'archetype-focus', 'bounds-grid', 'agents-grid'];

const LayoutSwitcher = memo(({
  currentLayout = 'mandala',
  onLayoutChange,
  disabled = false,
  className = ''
}) => {
  const layouts = LAYOUT_ORDER.map(id => LAYOUTS[id]).filter(Boolean);

  return (
    <div className={`layout-switcher ${className}`}>
      <div className="flex items-center gap-3">
        <span className="text-xs text-zinc-500 font-medium uppercase tracking-wide whitespace-nowrap">Layout:</span>
        <div className="flex gap-1">
          {layouts.map(layout => (
            <button
              key={layout.id}
              onClick={() => onLayoutChange?.(layout.id)}
              disabled={disabled}
              className={`
                px-3 py-1.5 rounded text-xs font-medium transition-all
                ${currentLayout === layout.id
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  : 'bg-zinc-800/60 text-zinc-400 border border-zinc-700/40 hover:bg-zinc-700/60 hover:text-zinc-300'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              title={layout.description}
            >
              {layout.name}
            </button>
          ))}
        </div>
      </div>

      {/* Layout info */}
      {currentLayout && LAYOUTS[currentLayout] && (
        <div className="mt-1.5 text-xs text-zinc-500">
          {LAYOUTS[currentLayout].description} · {LAYOUTS[currentLayout].cardCount} cards
        </div>
      )}

      <style jsx>{`
        .layout-switcher {
          background: rgba(24, 24, 27, 0.8);
          backdrop-filter: blur(4px);
          border: 1px solid rgba(63, 63, 70, 0.4);
          border-radius: 8px;
          padding: 10px 14px;
        }
      `}</style>
    </div>
  );
});

LayoutSwitcher.displayName = 'LayoutSwitcher';

export default LayoutSwitcher;
