'use client';

// === BADGE GRID ===
// Displays earned (full) and unearned (silhouette with progress) badges
// Used on profile page and compact summary on home

import { useState, useEffect } from 'react';
import { BADGE_DEFINITIONS, BADGE_CATEGORIES, getBadgeProgress } from '../../lib/badges.js';
import { getSession } from '../../lib/supabase';

const BADGE_ICONS = {
  all_archetypes: '\u2736',
  all_bounds: '\u25C8',
  all_agents: '\u2694',
  all_78: '\u2726',
  channel_intent: '\u2B24',
  channel_cognition: '\u25C6',
  channel_resonance: '\u223F',
  channel_structure: '\u25A0',
  all_four_statuses: '\u25CE',
  position_repeat_3: '\u21BB',
  position_repeat_5: '\u221E',
  both_portals: '\u2693',
  all_five_houses: '\u2302',
  perfect_balance: '\u2316',
  readings_10: '\u2160',
  readings_50: '\u2164',
  readings_100: '\u216D',
  readings_500: '\u216E',
};

const CATEGORY_COLORS = {
  collection: 'amber',
  mastery: 'violet',
  event: 'cyan',
  milestone: 'emerald'
};

export default function BadgeGrid({ compact = false }) {
  const [earnedKeys, setEarnedKeys] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBadges() {
      try {
        const session = await getSession();
        const token = session?.session?.access_token;
        if (!token) { setLoading(false); return; }

        // Fetch badges and stats in parallel
        const [badgeRes, statsRes] = await Promise.all([
          fetch('/api/user/badges', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/user/stats', { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        const badgeData = await badgeRes.json();
        const statsData = await statsRes.json();

        if (badgeData.success) {
          setEarnedKeys(badgeData.badges.map(b => b.badge_key));
        }
        if (statsData.success) {
          setStats(statsData.stats);
        }
      } catch (e) {
        console.error('Badge load error:', e);
      }
      setLoading(false);
    }
    loadBadges();
  }, []);

  if (loading) {
    return <div className="text-zinc-600 text-xs">Loading badges...</div>;
  }

  if (!stats) {
    return null; // Not authenticated or no data
  }

  const allBadges = Object.values(BADGE_DEFINITIONS);
  const earnedCount = earnedKeys.length;

  // Compact mode: just show earned badges count + icons
  if (compact) {
    if (earnedCount === 0) return null;
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500">{earnedCount} badge{earnedCount !== 1 ? 's' : ''}</span>
        <div className="flex gap-1">
          {allBadges.filter(b => earnedKeys.includes(b.key)).slice(0, 5).map(badge => (
            <span
              key={badge.key}
              className={`text-sm text-${CATEGORY_COLORS[badge.category]}-400`}
              title={`${badge.name}: ${badge.description}`}
            >
              {BADGE_ICONS[badge.key] || '\u2605'}
            </span>
          ))}
          {earnedCount > 5 && <span className="text-xs text-zinc-500">+{earnedCount - 5}</span>}
        </div>
      </div>
    );
  }

  // Full grid mode: grouped by category
  const categories = Object.keys(BADGE_CATEGORIES);

  return (
    <div className="space-y-6">
      {/* Progress header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-zinc-200">Achievements</h3>
        <span className="text-sm text-zinc-500">{earnedCount} / {allBadges.length}</span>
      </div>

      {categories.map(category => {
        const categoryBadges = allBadges.filter(b => b.category === category);
        const color = CATEGORY_COLORS[category];
        const catInfo = BADGE_CATEGORIES[category];

        return (
          <div key={category}>
            <h4 className={`text-sm font-medium text-${color}-400 mb-3 uppercase tracking-wide`}>
              {catInfo.label}
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {categoryBadges.map(badge => {
                const isEarned = earnedKeys.includes(badge.key);
                const progress = stats ? getBadgeProgress(badge.key, stats) : null;
                const icon = BADGE_ICONS[badge.key] || '\u2605';

                return (
                  <div
                    key={badge.key}
                    className={`relative p-4 rounded-xl border transition-colors ${
                      isEarned
                        ? `bg-${color}-500/10 border-${color}-500/30`
                        : 'bg-zinc-900/50 border-zinc-800/50'
                    }`}
                  >
                    {/* Icon */}
                    <div className={`text-2xl mb-2 ${isEarned ? `text-${color}-400` : 'text-zinc-700'}`}>
                      {icon}
                    </div>

                    {/* Name */}
                    <p className={`text-sm font-medium ${isEarned ? 'text-zinc-200' : 'text-zinc-600'}`}>
                      {badge.name}
                    </p>

                    {/* Description */}
                    <p className={`text-xs mt-1 ${isEarned ? 'text-zinc-400' : 'text-zinc-700'}`}>
                      {badge.description}
                    </p>

                    {/* Progress bar (only for unearned badges with trackable progress) */}
                    {!isEarned && progress && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-zinc-600 mb-1">
                          <span>{progress.current}/{progress.target}</span>
                          <span>{progress.percent}%</span>
                        </div>
                        <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full bg-${color}-500/50 rounded-full transition-all`}
                            style={{ width: `${progress.percent}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Earned indicator */}
                    {isEarned && (
                      <div className={`absolute top-2 right-2 text-xs text-${color}-400`}>
                        &#x2713;
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
