'use client';

// === FRAME CONTEXT BOX ===
// Displays the spread position context for a card.
// Compact mode: small pill under card in the grid.
// Full mode: label + lens above DepthCard content.
// Color-coded by source: violet=preset, rose=custom, amber=explore, zinc=architecture.

import { FRAME_SOURCE_STYLES, hasFrameContent } from '../../lib/frameContext';

export default function FrameContextBox({ frameContext, compact = false }) {
  if (!hasFrameContent(frameContext)) return null;

  const styles = FRAME_SOURCE_STYLES[frameContext.source] || FRAME_SOURCE_STYLES.preset;

  if (compact) {
    // Grid view: single-line pill with colored dot
    return (
      <div className={`flex items-center gap-1.5 mt-2 px-2 py-1 rounded-md ${styles.bg} border-l-2 ${styles.border}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${styles.dot} flex-shrink-0`} />
        <span className={`text-[11px] ${styles.text} truncate`}>
          {frameContext.label}
        </span>
      </div>
    );
  }

  // Full view: label + lens for DepthCard sections
  return (
    <div className={`flex items-start gap-2 px-3 py-2 rounded-md ${styles.bg} border-l-2 ${styles.border} mb-3`}>
      <span className={`w-1.5 h-1.5 rounded-full ${styles.dot} flex-shrink-0 mt-1.5`} />
      <div className="min-w-0">
        <div className={`text-xs font-medium ${styles.text}`}>
          {frameContext.label}
        </div>
        {frameContext.lens && (
          <div className={`text-[11px] ${styles.textMuted} mt-0.5 leading-snug`}>
            {frameContext.lens}
          </div>
        )}
      </div>
    </div>
  );
}
