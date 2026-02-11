'use client';

// === LAST READING STRIP ===
// Shows 1-5 card thumbnails from the most recent reading
// Compact display above question input for authenticated users

import { useState, useEffect } from 'react';
import { getSession } from '../../lib/supabase';
import { ARCHETYPES, BOUNDS, AGENTS } from '../../lib/archetypes';
import { STATUSES } from '../../lib/constants';
import { getCardImagePath } from '../../lib/cardImages';

function getSignatureName(transientId) {
  const id = Number(transientId);
  if (ARCHETYPES[id]) return ARCHETYPES[id].name;
  if (BOUNDS[id]) return BOUNDS[id].name;
  if (AGENTS[id]) return AGENTS[id].name;
  return 'Unknown';
}

function formatRelativeDate(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function LastReadingStrip({ currentUser }) {
  const [lastReading, setLastReading] = useState(null);

  useEffect(() => {
    if (!currentUser) return;

    async function loadLastReading() {
      try {
        const session = await getSession();
        const token = session?.session?.access_token;
        if (!token) return;

        const res = await fetch('/api/user/readings?limit=1', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.readings?.[0]) {
          setLastReading(data.readings[0]);
        }
      } catch (e) {
        // Silent failure — strip is optional
      }
    }
    loadLastReading();
  }, [currentUser]);

  if (!lastReading || !lastReading.draws?.length) return null;

  const draws = lastReading.draws.slice(0, 5);

  return (
    <div className="max-w-2xl mx-auto mb-3 px-1">
      <a
        href={`/my-readings/${lastReading.id}`}
        className="flex items-center gap-3 px-3 py-2 rounded-lg bg-zinc-900/30 border border-zinc-800/50 hover:border-zinc-700/50 transition-colors group"
      >
        {/* Card thumbnails */}
        <div className="flex -space-x-2">
          {draws.map((draw, i) => {
            const imagePath = getCardImagePath(draw.transient);
            return (
              <div
                key={i}
                className="w-8 h-10 rounded overflow-hidden border border-zinc-700 bg-zinc-800 flex-shrink-0"
                style={{ zIndex: draws.length - i }}
              >
                {imagePath ? (
                  <img src={imagePath} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-600 text-[8px]">?</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-zinc-500 truncate group-hover:text-zinc-400 transition-colors">
            {lastReading.topic || 'Last reading'}
          </p>
          <p className="text-[10px] text-zinc-600">
            {draws.map(d => getSignatureName(d.transient)).join(' \u00B7 ')}
          </p>
        </div>

        {/* Time */}
        <span className="text-[10px] text-zinc-600 whitespace-nowrap flex-shrink-0">
          {formatRelativeDate(lastReading.created_at)}
        </span>
      </a>
    </div>
  );
}
