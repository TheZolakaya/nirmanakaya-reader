'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getUser, getSession } from '../../lib/supabase';
import { getComponent } from '../../lib/corrections';
import { STATUSES } from '../../lib/constants';
import TextSizeSlider from '../../components/shared/TextSizeSlider';
import BrandHeader from '../../components/layout/BrandHeader';
import Footer from '../../components/layout/Footer';

export default function MyReadingsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    async function init() {
      const { user } = await getUser();
      if (!user) {
        router.push('/');
        return;
      }
      setUser(user);
      await loadReadings(user, 1);
    }
    init();
  }, []);

  async function loadReadings(authUser, pageNum) {
    setLoading(true);
    try {
      const session = await getSession();
      const token = session?.session?.access_token;
      if (!token) return;

      const res = await fetch(`/api/user/readings?page=${pageNum}&limit=${limit}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setReadings(data.readings);
        setTotal(data.total);
        setPage(pageNum);
      }
    } catch (err) {
      console.error('Failed to load readings:', err);
    } finally {
      setLoading(false);
    }
  }

  function getSignature(draw) {
    const comp = getComponent(draw.transient);
    const status = STATUSES[draw.status];
    const prefix = status?.prefix || 'Balanced';
    return `${prefix} ${comp?.name || 'Unknown'}`;
  }

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Global Header */}
      <BrandHeader compact />

      {/* Page Header */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-light text-zinc-200">My Readings</h1>
            <p className="text-xs text-zinc-500 mt-1">
              {total} reading{total !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <TextSizeSlider />
            <a href="/" className="text-xs text-zinc-400 hover:text-amber-400 transition-colors">
              Reader
            </a>
          </div>
        </div>

        {/* Readings List */}
        {loading ? (
          <div className="text-center py-12 text-zinc-500">Loading...</div>
        ) : readings.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-zinc-500 mb-4">No readings yet.</p>
            <a href="/" className="text-amber-400 hover:text-amber-300 text-sm">
              Get your first reading
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            {readings.map(reading => (
              <div
                key={reading.id}
                className="rounded-lg border border-zinc-800/60 bg-zinc-900/40 p-4 hover:border-zinc-700/60 transition-colors cursor-pointer"
                onClick={() => router.push(`/my-readings/${reading.id}`)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="text-sm text-zinc-300">{formatDate(reading.created_at)}</span>
                    <span className="text-xs text-zinc-600 ml-2">
                      {reading.reading_type === 'automated' ? 'Email Reading' : 'Manual'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {reading.is_public && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Shared
                      </span>
                    )}
                  </div>
                </div>

                {/* Topic + Locus */}
                <div className="text-xs text-zinc-500 mb-2">
                  {reading.topic && <span>{reading.topic}</span>}
                  {Array.isArray(reading.locus_subjects) && reading.locus_subjects.length > 0 ? (
                    <span className="ml-2 text-amber-500/60">
                      {reading.locus_subjects.join(', ')}
                    </span>
                  ) : reading.locus && reading.locus !== 'individual' ? (
                    <span className="ml-2 text-amber-500/60">
                      {reading.locus}{reading.locus_detail ? `: ${reading.locus_detail}` : ''}
                    </span>
                  ) : null}
                  <span className="ml-2">{reading.card_count || reading.draws?.length} card{(reading.card_count || reading.draws?.length) !== 1 ? 's' : ''}</span>
                </div>

                {/* Card Signatures */}
                <div className="flex flex-wrap gap-1.5">
                  {(reading.draws || []).map((draw, i) => (
                    <span
                      key={i}
                      className="text-xs px-2 py-0.5 rounded bg-zinc-800/60 text-zinc-400 border border-zinc-700/40"
                    >
                      {getSignature(draw)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => loadReadings(user, page - 1)}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded text-xs bg-zinc-800 text-zinc-400 disabled:opacity-30"
            >
              Previous
            </button>
            <span className="text-xs text-zinc-500">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => loadReadings(user, page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded text-xs bg-zinc-800 text-zinc-400 disabled:opacity-30"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Global Footer */}
      <Footer />
    </div>
  );
}
