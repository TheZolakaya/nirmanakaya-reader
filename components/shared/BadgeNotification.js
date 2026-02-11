'use client';

// === BADGE NOTIFICATION ===
// Celebratory overlay when new badges are earned
// Auto-dismisses after delay, or click to dismiss

import { useState, useEffect } from 'react';

const BADGE_ICONS = {
  // Collection
  all_archetypes: '\u2736',    // Six-pointed star
  all_bounds: '\u25C8',        // Diamond in circle
  all_agents: '\u2694',        // Crossed swords
  all_78: '\u2726',            // Four-pointed star
  channel_intent: '\u2B24',    // Filled circle (fire)
  channel_cognition: '\u25C6', // Diamond
  channel_resonance: '\u223F', // Sine wave
  channel_structure: '\u25A0', // Filled square
  // Mastery
  all_four_statuses: '\u25CE', // Bullseye
  position_repeat_3: '\u21BB', // Clockwise arrow
  position_repeat_5: '\u221E', // Infinity
  // Event
  both_portals: '\u2693',      // Anchor
  all_five_houses: '\u2302',   // House
  perfect_balance: '\u2316',   // Position indicator
  // Milestone
  readings_10: '\u2160',       // Roman numeral I
  readings_50: '\u2164',       // Roman numeral V
  readings_100: '\u216D',      // Roman numeral C
  readings_500: '\u216E',      // Roman numeral D
};

export default function BadgeNotification({ badges, onDismiss }) {
  const [visible, setVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (badges && badges.length > 0) {
      setVisible(true);
      setCurrentIndex(0);
    }
  }, [badges]);

  // Auto-dismiss after 8 seconds
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      if (currentIndex < badges.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        setVisible(false);
        onDismiss?.();
      }
    }, 8000);
    return () => clearTimeout(timer);
  }, [visible, currentIndex, badges, onDismiss]);

  if (!visible || !badges || badges.length === 0) return null;

  const badge = badges[currentIndex];
  const icon = BADGE_ICONS[badge.key] || '\u2605';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn cursor-pointer"
      onClick={() => {
        if (currentIndex < badges.length - 1) {
          setCurrentIndex(prev => prev + 1);
        } else {
          setVisible(false);
          onDismiss?.();
        }
      }}
    >
      <div className="relative max-w-sm mx-4 animate-badgeReveal">
        {/* Glow effect */}
        <div className="absolute inset-0 rounded-2xl bg-amber-500/20 blur-xl" />

        <div className="relative bg-zinc-900 border border-amber-500/40 rounded-2xl p-8 text-center">
          {/* Badge icon */}
          <div className="text-5xl mb-4 text-amber-400 animate-pulse">
            {icon}
          </div>

          {/* Title */}
          <p className="text-xs uppercase tracking-widest text-amber-500/70 mb-2">
            Achievement Unlocked
          </p>

          {/* Badge name */}
          <h2 className="text-2xl font-bold text-amber-300 mb-2">
            {badge.name}
          </h2>

          {/* Description */}
          <p className="text-zinc-400 text-sm">
            {badge.description}
          </p>

          {/* Multiple badge indicator */}
          {badges.length > 1 && (
            <p className="text-xs text-zinc-600 mt-4">
              {currentIndex + 1} of {badges.length} &middot; tap to continue
            </p>
          )}

          {/* Dismiss hint */}
          <p className="text-xs text-zinc-700 mt-3">
            tap anywhere to dismiss
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes badgeReveal {
          0% { opacity: 0; transform: scale(0.8) translateY(20px); }
          50% { transform: scale(1.05) translateY(-5px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        .animate-badgeReveal { animation: badgeReveal 0.6s ease-out; }
      `}</style>
    </div>
  );
}
