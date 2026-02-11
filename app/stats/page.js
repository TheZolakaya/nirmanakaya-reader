'use client';

// === STATS / SCORECARD PAGE ===
// Journey stats: house distribution, status trends, signature frequency, reading milestones
// Uses CSS-based charts (no external charting library needed)

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getUser, getSession } from '../../lib/supabase';
import { ARCHETYPES, BOUNDS, AGENTS } from '../../lib/archetypes';
import BrandHeader from '../../components/layout/BrandHeader';
import Footer from '../../components/layout/Footer';

function getSignatureName(transientId) {
  const id = Number(transientId);
  if (ARCHETYPES[id]) return ARCHETYPES[id].name;
  if (BOUNDS[id]) return BOUNDS[id].name;
  if (AGENTS[id]) return AGENTS[id].name;
  return 'Unknown';
}

const HOUSE_COLORS = {
  Gestalt: { bar: 'bg-yellow-500', text: 'text-yellow-400' },
  Spirit: { bar: 'bg-violet-500', text: 'text-violet-400' },
  Mind: { bar: 'bg-blue-500', text: 'text-blue-400' },
  Emotion: { bar: 'bg-emerald-500', text: 'text-emerald-400' },
  Body: { bar: 'bg-red-500', text: 'text-red-400' },
  Portal: { bar: 'bg-amber-500', text: 'text-amber-400' }
};

const STATUS_COLORS = {
  1: { bar: 'bg-green-500', text: 'text-green-400', label: 'Balanced' },
  2: { bar: 'bg-orange-500', text: 'text-orange-400', label: 'Too Much' },
  3: { bar: 'bg-sky-500', text: 'text-sky-400', label: 'Too Little' },
  4: { bar: 'bg-zinc-500', text: 'text-zinc-400', label: 'Unacknowledged' }
};

export default function StatsPage() {
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

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
        console.error('Stats load error:', e);
      }
      setLoading(false);
    }
    loadStats();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-200 flex items-center justify-center">
        <p className="text-zinc-500">Loading stats...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-200 flex flex-col items-center justify-center gap-4">
        <p className="text-zinc-500">No reading data found.</p>
        <Link href="/" className="text-amber-400 hover:underline">Start your first reading</Link>
      </div>
    );
  }

  const houseDist = stats.houseDistribution || {};
  const statusDist = stats.statusDistribution || {};
  const typeDist = stats.typeDistribution || {};
  const signatureCounts = stats.signatureCounts || {};

  const totalHouseDraws = Object.values(houseDist).reduce((s, v) => s + v, 0) || 1;
  const totalStatusDraws = Object.values(statusDist).reduce((s, v) => s + v, 0) || 1;
  const totalTypeDraws = Object.values(typeDist).reduce((s, v) => s + v, 0) || 1;

  // Top 10 signatures by frequency
  const topSignatures = Object.entries(signatureCounts)
    .map(([id, count]) => ({ id: Number(id), name: getSignatureName(id), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const maxSigCount = topSignatures[0]?.count || 1;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 flex flex-col">
      <BrandHeader />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-400 mb-6 block">&larr; Back to Reader</Link>

        <h1 className="text-2xl font-bold text-zinc-100 mb-2">Your Journey</h1>
        <p className="text-sm text-zinc-500 mb-8">
          {stats.totalReadings} reading{stats.totalReadings !== 1 ? 's' : ''} &middot; {stats.totalDraws} signatures drawn &middot; {stats.uniqueSignatures}/78 unique
        </p>

        {/* Scorecard Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-amber-400">{stats.totalReadings}</div>
            <div className="text-xs text-zinc-500">Readings</div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">{stats.uniqueSignatures}</div>
            <div className="text-xs text-zinc-500">Unique Signatures</div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-violet-400">{stats.uniqueArchetypes}</div>
            <div className="text-xs text-zinc-500">Archetypes Found</div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-emerald-400">
              {Math.round(((statusDist[1] || 0) / totalStatusDraws) * 100)}%
            </div>
            <div className="text-xs text-zinc-500">Balanced Rate</div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          {/* House Distribution */}
          <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
            <h3 className="text-sm font-medium text-zinc-400 mb-4">House Distribution</h3>
            <div className="space-y-3">
              {Object.entries(houseDist)
                .filter(([, v]) => v > 0)
                .sort(([, a], [, b]) => b - a)
                .map(([house, count]) => {
                  const pct = Math.round((count / totalHouseDraws) * 100);
                  const colors = HOUSE_COLORS[house] || { bar: 'bg-zinc-500', text: 'text-zinc-400' };
                  return (
                    <div key={house}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className={colors.text}>{house}</span>
                        <span className="text-zinc-500">{pct}% ({count})</span>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div className={`h-full ${colors.bar} rounded-full opacity-60`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>

          {/* Status Distribution */}
          <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
            <h3 className="text-sm font-medium text-zinc-400 mb-4">Status Balance</h3>
            <div className="space-y-3">
              {Object.entries(statusDist)
                .filter(([, v]) => v > 0)
                .sort(([, a], [, b]) => b - a)
                .map(([status, count]) => {
                  const pct = Math.round((count / totalStatusDraws) * 100);
                  const colors = STATUS_COLORS[status] || { bar: 'bg-zinc-500', text: 'text-zinc-400', label: status };
                  return (
                    <div key={status}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className={colors.text}>{colors.label}</span>
                        <span className="text-zinc-500">{pct}% ({count})</span>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div className={`h-full ${colors.bar} rounded-full opacity-60`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>

          {/* Type Distribution */}
          <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
            <h3 className="text-sm font-medium text-zinc-400 mb-4">Signature Types</h3>
            <div className="flex items-end justify-center gap-8 h-32">
              {Object.entries(typeDist).filter(([, v]) => v > 0).map(([type, count]) => {
                const pct = Math.round((count / totalTypeDraws) * 100);
                const color = type === 'ARCHETYPE' ? 'bg-amber-500' :
                              type === 'BOUND' ? 'bg-blue-500' : 'bg-violet-500';
                const textColor = type === 'ARCHETYPE' ? 'text-amber-400' :
                                  type === 'BOUND' ? 'text-blue-400' : 'text-violet-400';
                return (
                  <div key={type} className="flex flex-col items-center gap-1">
                    <span className={`text-xs ${textColor}`}>{pct}%</span>
                    <div className="w-12 bg-zinc-800 rounded-t-lg overflow-hidden" style={{ height: `${Math.max(pct, 5)}%` }}>
                      <div className={`w-full h-full ${color} opacity-50`} />
                    </div>
                    <span className="text-[10px] text-zinc-500">{type === 'ARCHETYPE' ? 'Major' : type === 'BOUND' ? 'Bound' : 'Agent'}</span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Top Signatures */}
          <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
            <h3 className="text-sm font-medium text-zinc-400 mb-4">Most Drawn Signatures</h3>
            <div className="space-y-2">
              {topSignatures.map((sig, i) => (
                <div key={sig.id} className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-600 w-4">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs text-zinc-300">{sig.name}</span>
                      <span className="text-xs text-zinc-500">{sig.count}x</span>
                    </div>
                    <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500/40 rounded-full"
                        style={{ width: `${(sig.count / maxSigCount) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Collection progress */}
        <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 mb-8">
          <h3 className="text-sm font-medium text-zinc-400 mb-4">Collection Progress</h3>
          <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-blue-500 to-violet-500 rounded-full opacity-60"
              style={{ width: `${(stats.uniqueSignatures / 78) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-zinc-500 mt-2">
            <span>{stats.uniqueSignatures} encountered</span>
            <span>{78 - stats.uniqueSignatures} remaining</span>
          </div>
        </section>

        {/* Links */}
        <div className="flex gap-3 flex-wrap">
          <Link href="/collection" className="px-4 py-2 text-sm rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors">
            View Collection
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
