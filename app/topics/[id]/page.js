'use client';

// === TOPIC STATS PAGE ===
// Shows reading history, meta-analysis, signature frequency, and distributions for a saved topic

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getUser, getSession } from '../../../lib/supabase';
import { ARCHETYPES, BOUNDS, AGENTS } from '../../../lib/archetypes';
import { STATUSES } from '../../../lib/constants';
import BrandHeader from '../../../components/layout/BrandHeader';
import Footer from '../../../components/layout/Footer';

function getSignatureName(transientId) {
  const id = Number(transientId);
  if (ARCHETYPES[id]) return ARCHETYPES[id].name;
  if (BOUNDS[id]) return BOUNDS[id].name;
  if (AGENTS[id]) return AGENTS[id].name;
  return 'Unknown';
}

function getSignatureType(transientId) {
  const id = Number(transientId);
  if (id >= 0 && id <= 21) return 'Archetype';
  if (id >= 22 && id <= 61) return 'Bound';
  if (id >= 62 && id <= 77) return 'Agent';
  return 'Unknown';
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function TopicStatsPage() {
  const params = useParams();
  const router = useRouter();
  const topicId = params.id;

  const [topic, setTopic] = useState(null);
  const [readings, setReadings] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const { user } = await getUser();
        if (!user) { router.push('/'); return; }

        const session = await getSession();
        const token = session?.session?.access_token;
        if (!token) { router.push('/'); return; }

        // Fetch topic, readings, and topic-specific stats
        const [topicRes, readingsRes, statsRes] = await Promise.all([
          fetch(`/api/user/topics?id=${topicId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`/api/user/readings?limit=50`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`/api/user/stats?topic_id=${topicId}`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        const topicData = await topicRes.json();
        const readingsData = await readingsRes.json();
        const statsData = await statsRes.json();

        if (!topicData.success || !topicData.topics?.length) {
          setError('Topic not found');
          setLoading(false);
          return;
        }

        setTopic(topicData.topics[0]);

        // Filter readings to this topic
        const topicReadings = (readingsData.readings || []).filter(r => r.topic_id === topicId);
        setReadings(topicReadings);

        if (statsData.success) setStats(statsData.stats);
      } catch (e) {
        setError(e.message);
      }
      setLoading(false);
    }
    loadData();
  }, [topicId, router]);

  const handleRegenerateMeta = async () => {
    setRegenerating(true);
    try {
      const session = await getSession();
      const token = session?.session?.access_token;
      if (!token) return;

      const res = await fetch('/api/user/topic-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ topic_id: topicId })
      });
      const data = await res.json();
      if (data.success && data.meta_analysis) {
        setTopic(prev => ({ ...prev, meta_analysis: data.meta_analysis }));
      }
    } catch (e) {
      console.error('Meta-analysis error:', e);
    }
    setRegenerating(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-200 flex items-center justify-center">
        <p className="text-zinc-500">Loading topic...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-200 flex flex-col items-center justify-center gap-4">
        <p className="text-red-400">{error}</p>
        <Link href="/" className="text-amber-400 hover:underline">Back to Home</Link>
      </div>
    );
  }

  // Build signature frequency from stats
  const signatureFrequency = stats?.signatureCounts
    ? Object.entries(stats.signatureCounts)
        .map(([id, count]) => ({ id: Number(id), name: getSignatureName(id), type: getSignatureType(id), count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15)
    : [];

  // Build status distribution
  const statusDist = stats?.statusDistribution || {};
  const totalStatusDraws = Object.values(statusDist).reduce((s, v) => s + v, 0) || 1;

  // Build house distribution
  const houseDist = stats?.houseDistribution || {};
  const totalHouseDraws = Object.values(houseDist).reduce((s, v) => s + v, 0) || 1;

  const HOUSE_COLORS_MAP = {
    Gestalt: 'text-yellow-400',
    Spirit: 'text-violet-400',
    Mind: 'text-blue-400',
    Emotion: 'text-emerald-400',
    Body: 'text-red-400',
    Portal: 'text-amber-400'
  };

  const STATUS_COLORS_MAP = {
    1: 'text-green-400',
    2: 'text-orange-400',
    3: 'text-sky-400',
    4: 'text-zinc-400'
  };

  const STATUS_LABELS = { 1: 'Balanced', 2: 'Too Much', 3: 'Too Little', 4: 'Unacknowledged' };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 flex flex-col">
      <BrandHeader />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
        {/* Back link */}
        <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-400 mb-6 block">&larr; Back to Reader</Link>

        {/* Topic header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-amber-400 mb-1">{topic.label}</h1>
          <div className="flex items-center gap-4 text-sm text-zinc-500">
            <span>{topic.reading_count} reading{topic.reading_count !== 1 ? 's' : ''}</span>
            <span>Since {formatDate(topic.created_at)}</span>
            {topic.last_used_at && <span>Last used {formatDate(topic.last_used_at)}</span>}
          </div>
        </div>

        {/* Meta-Analysis */}
        <section className="mb-8 bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-medium text-zinc-200">Meta-Analysis</h2>
            <button
              onClick={handleRegenerateMeta}
              disabled={regenerating || readings.length < 2}
              className="text-xs text-amber-400 hover:text-amber-300 disabled:text-zinc-600 disabled:cursor-not-allowed"
            >
              {regenerating ? 'Generating...' : 'Regenerate'}
            </button>
          </div>
          {topic.meta_analysis?.text ? (
            <div>
              <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">{topic.meta_analysis.text}</p>
              <p className="text-xs text-zinc-600 mt-3">
                Generated {formatDate(topic.meta_analysis.generated_at)} &middot; Based on {topic.meta_analysis.reading_count} readings
              </p>
            </div>
          ) : (
            <p className="text-zinc-600 text-sm italic">
              {readings.length < 2
                ? 'Meta-analysis available after 2+ readings on this topic.'
                : 'No meta-analysis yet. Click "Regenerate" to create one.'}
            </p>
          )}
        </section>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {/* Signature Frequency */}
          <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
            <h3 className="text-sm font-medium text-zinc-400 mb-3">Top Signatures</h3>
            {signatureFrequency.length === 0 ? (
              <p className="text-zinc-600 text-xs">No readings yet</p>
            ) : (
              <div className="space-y-2">
                {signatureFrequency.map(sig => (
                  <div key={sig.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        sig.type === 'Archetype' ? 'bg-amber-500/10 text-amber-400' :
                        sig.type === 'Bound' ? 'bg-blue-500/10 text-blue-400' :
                        'bg-violet-500/10 text-violet-400'
                      }`}>{sig.type[0]}</span>
                      <span className="text-sm text-zinc-300">{sig.name}</span>
                    </div>
                    <span className="text-xs text-zinc-500">{sig.count}x</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Status Distribution */}
          <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
            <h3 className="text-sm font-medium text-zinc-400 mb-3">Status Balance</h3>
            <div className="space-y-3">
              {Object.entries(statusDist).map(([status, count]) => {
                const pct = Math.round((count / totalStatusDraws) * 100);
                return (
                  <div key={status}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className={STATUS_COLORS_MAP[status]}>{STATUS_LABELS[status]}</span>
                      <span className="text-zinc-500">{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-zinc-600 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* House Distribution */}
          <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 sm:col-span-2">
            <h3 className="text-sm font-medium text-zinc-400 mb-3">House Distribution</h3>
            <div className="flex flex-wrap gap-4">
              {Object.entries(houseDist).filter(([, v]) => v > 0).map(([house, count]) => {
                const pct = Math.round((count / totalHouseDraws) * 100);
                return (
                  <div key={house} className="text-center">
                    <div className={`text-lg font-bold ${HOUSE_COLORS_MAP[house] || 'text-zinc-400'}`}>{pct}%</div>
                    <div className="text-xs text-zinc-500">{house}</div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Reading Timeline */}
        <section className="mb-8">
          <h3 className="text-lg font-medium text-zinc-200 mb-4">Reading Timeline</h3>
          {readings.length === 0 ? (
            <p className="text-zinc-600 text-sm">No readings for this topic yet.</p>
          ) : (
            <div className="space-y-3">
              {readings.map(reading => (
                <Link
                  key={reading.id}
                  href={`/my-readings/${reading.id}`}
                  className="block bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm text-zinc-300 line-clamp-1">{reading.topic || 'Untitled'}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        {(reading.draws || []).slice(0, 5).map((draw, i) => {
                          const name = getSignatureName(draw.transient);
                          const status = STATUSES[draw.status];
                          const prefix = status?.prefix || '';
                          return (
                            <span key={i} className="text-xs text-zinc-500">
                              {prefix}{prefix ? ' ' : ''}{name}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    <span className="text-xs text-zinc-600 whitespace-nowrap">{formatDate(reading.created_at)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
