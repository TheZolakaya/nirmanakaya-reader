'use client';

// === SIGNATURE COLLECTION PAGE ===
// Shows all 78 signatures, sorted by pull frequency
// Encountered = full color, unencountered = silhouette
// Click to expand: position history, status history, first/last seen

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getUser, getSession } from '../../lib/supabase';
import { ARCHETYPES, BOUNDS, AGENTS } from '../../lib/archetypes';
import { STATUSES } from '../../lib/constants';
import { getCardImagePath } from '../../lib/cardImages';
import BrandHeader from '../../components/layout/BrandHeader';
import Footer from '../../components/layout/Footer';

// Build all 78 signatures
const ALL_SIGNATURES = [
  ...Object.entries(ARCHETYPES).map(([id, data]) => ({ id: Number(id), ...data, type: 'Archetype' })),
  ...Object.entries(BOUNDS).map(([id, data]) => ({ id: Number(id), ...data, type: 'Bound' })),
  ...Object.entries(AGENTS).map(([id, data]) => ({ id: Number(id), ...data, type: 'Agent' }))
].filter(s => s.id >= 0 && s.id <= 77);

export default function CollectionPage() {
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'archetype' | 'bound' | 'agent'
  const [sort, setSort] = useState('frequency'); // 'frequency' | 'recency' | 'id'
  const [expanded, setExpanded] = useState(null); // signature id

  useEffect(() => {
    async function loadStats() {
      try {
        const { user } = await getUser();
        if (!user) { router.push('/'); return; }

        const session = await getSession();
        const token = session?.session?.access_token;
        if (!token) { router.push('/'); return; }

        const res = await fetch('/api/user/stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) setStats(data.stats);
      } catch (e) {
        console.error('Failed to load stats:', e);
      }
      setLoading(false);
    }
    loadStats();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-200 flex items-center justify-center">
        <p className="text-zinc-500">Loading collection...</p>
      </div>
    );
  }

  const signatureCounts = stats?.signatureCounts || {};
  const signatureLastSeen = stats?.signatureLastSeen || {};
  const signaturePositions = stats?.signaturePositions || {};
  const signatureStatuses = stats?.signatureStatuses || {};

  // Filter
  let filtered = ALL_SIGNATURES;
  if (filter === 'archetype') filtered = filtered.filter(s => s.type === 'Archetype');
  if (filter === 'bound') filtered = filtered.filter(s => s.type === 'Bound');
  if (filter === 'agent') filtered = filtered.filter(s => s.type === 'Agent');

  // Sort
  if (sort === 'frequency') {
    filtered = [...filtered].sort((a, b) => (signatureCounts[b.id] || 0) - (signatureCounts[a.id] || 0));
  } else if (sort === 'recency') {
    filtered = [...filtered].sort((a, b) => {
      const dateA = signatureLastSeen[a.id] ? new Date(signatureLastSeen[a.id]).getTime() : 0;
      const dateB = signatureLastSeen[b.id] ? new Date(signatureLastSeen[b.id]).getTime() : 0;
      return dateB - dateA;
    });
  }
  // 'id' keeps original order

  // Progress stats
  const uniqueArch = stats?.uniqueArchetypes || 0;
  const uniqueBounds = stats?.uniqueBounds || 0;
  const uniqueAgents = stats?.uniqueAgents || 0;

  const TYPE_COLORS = {
    Archetype: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
    Bound: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
    Agent: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/30' }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 flex flex-col">
      <BrandHeader />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-400 mb-6 block">&larr; Back to Reader</Link>

        <h1 className="text-2xl font-bold text-zinc-100 mb-2">Signature Collection</h1>
        <p className="text-sm text-zinc-500 mb-6">All 78 signatures — encountered and undiscovered.</p>

        {/* Progress bars */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-amber-400">{uniqueArch}/22</div>
            <div className="text-xs text-zinc-500">Archetypes</div>
            <div className="h-1 bg-zinc-800 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-amber-500/50 rounded-full" style={{ width: `${(uniqueArch / 22) * 100}%` }} />
            </div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-blue-400">{uniqueBounds}/40</div>
            <div className="text-xs text-zinc-500">Bounds</div>
            <div className="h-1 bg-zinc-800 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-blue-500/50 rounded-full" style={{ width: `${(uniqueBounds / 40) * 100}%` }} />
            </div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-violet-400">{uniqueAgents}/16</div>
            <div className="text-xs text-zinc-500">Agents</div>
            <div className="h-1 bg-zinc-800 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-violet-500/50 rounded-full" style={{ width: `${(uniqueAgents / 16) * 100}%` }} />
            </div>
          </div>
        </div>

        {/* Filter + Sort */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex gap-1 bg-zinc-900/50 p-1 rounded-lg border border-zinc-800">
            {['all', 'archetype', 'bound', 'agent'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-md text-xs transition-colors ${
                  filter === f ? 'bg-zinc-700 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1) + 's'}
              </button>
            ))}
          </div>
          <div className="flex gap-1 bg-zinc-900/50 p-1 rounded-lg border border-zinc-800">
            {[['frequency', 'Most Drawn'], ['recency', 'Recent'], ['id', 'Order']].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setSort(key)}
                className={`px-3 py-1 rounded-md text-xs transition-colors ${
                  sort === key ? 'bg-zinc-700 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Signature Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filtered.map(sig => {
            const count = signatureCounts[sig.id] || 0;
            const encountered = count > 0;
            const colors = TYPE_COLORS[sig.type];
            const imagePath = getCardImagePath(sig.id);
            const isExpanded = expanded === sig.id;

            return (
              <div
                key={sig.id}
                className={`rounded-xl border transition-all cursor-pointer ${
                  encountered
                    ? `${colors.border} ${colors.bg} hover:scale-[1.02]`
                    : 'border-zinc-800/50 bg-zinc-900/30 opacity-50 hover:opacity-70'
                } ${isExpanded ? 'col-span-2 sm:col-span-2' : ''}`}
                onClick={() => setExpanded(isExpanded ? null : sig.id)}
              >
                {/* Thumbnail */}
                <div className="relative aspect-square overflow-hidden rounded-t-xl">
                  {imagePath ? (
                    <img
                      src={imagePath}
                      alt={encountered ? sig.name : '???'}
                      className={`w-full h-full object-cover ${encountered ? '' : 'grayscale brightness-[0.2]'}`}
                    />
                  ) : (
                    <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                      <span className="text-zinc-700 text-2xl">?</span>
                    </div>
                  )}
                  {/* Count badge */}
                  {count > 0 && (
                    <span className="absolute top-1.5 right-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-black/60 text-zinc-300">
                      {count}x
                    </span>
                  )}
                </div>

                {/* Name */}
                <div className="p-2">
                  <p className={`text-xs font-medium truncate ${encountered ? 'text-zinc-200' : 'text-zinc-700'}`}>
                    {encountered ? sig.name : '???'}
                  </p>
                  <p className={`text-[10px] ${colors.text} opacity-70`}>{sig.type}</p>
                </div>

                {/* Expanded detail */}
                {isExpanded && encountered && (
                  <div className="px-2 pb-3 space-y-2">
                    {sig.traditional && <p className="text-[10px] text-zinc-500">{sig.traditional}</p>}

                    {/* Position history */}
                    {signaturePositions[sig.id] && Object.keys(signaturePositions[sig.id]).length > 0 && (
                      <div>
                        <p className="text-[10px] text-zinc-600 mb-1">Positions:</p>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(signaturePositions[sig.id])
                            .sort(([, a], [, b]) => b - a)
                            .slice(0, 6)
                            .map(([posId, cnt]) => (
                              <span key={posId} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                                {ARCHETYPES[Number(posId)]?.name || posId} ({cnt})
                              </span>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Status history */}
                    {signatureStatuses[sig.id] && (
                      <div className="flex gap-1">
                        {signatureStatuses[sig.id].sort().map(s => (
                          <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">
                            {STATUSES[s]?.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Last seen */}
                    {signatureLastSeen[sig.id] && (
                      <p className="text-[10px] text-zinc-600">
                        Last: {new Date(signatureLastSeen[sig.id]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Links */}
        <div className="flex gap-3 flex-wrap mt-8">
          <Link href="/stats" className="px-4 py-2 text-sm rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors">
            View Stats
          </Link>
          <Link href="/my-readings" className="px-4 py-2 text-sm rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors">
            My Readings
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
