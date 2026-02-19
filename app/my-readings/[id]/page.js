'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getUser, getSession } from '../../../lib/supabase';
import { getComponent } from '../../../lib/corrections';
import { STATUSES, HOUSE_COLORS } from '../../../lib/constants';
import { ARCHETYPES } from '../../../lib/archetypes';
import { ensureParagraphBreaks } from '../../../lib/utils';
import CardImage from '../../../components/reader/CardImage';
import TextSizeSlider from '../../../components/shared/TextSizeSlider';
import GlistenSourcePanel from '../../../components/reader/GlistenSourcePanel';
import BrandHeader from '../../../components/layout/BrandHeader';
import Footer from '../../../components/layout/Footer';

// Extract text from a depth-level object {surface, wade, swim, deep} or V3 flat object or a plain string
function getDepthText(obj, preferredDepth) {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  // V3 flat structure — reading field is the main interpretation text
  if (obj.reading !== undefined && !obj.wade && !obj.deep) {
    return obj.reading;
  }
  // Legacy depth-tiered structure
  if (preferredDepth && obj[preferredDepth]) return obj[preferredDepth];
  return obj.deep || obj.swim || obj.wade || obj.surface || '';
}

// Extract a specific V3 section from a card's interpretation object
function getV3Section(interp, section) {
  if (!interp || typeof interp === 'string') return '';
  return interp[section] || '';
}

export default function ReadingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const readingId = params.id;

  const [user, setUser] = useState(null);
  const [reading, setReading] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanding, setExpanding] = useState(false);
  const [showGlisten, setShowGlisten] = useState(false);

  useEffect(() => {
    async function init() {
      const { user } = await getUser();
      if (!user) {
        router.push('/');
        return;
      }
      setUser(user);
      await loadReading(user);
    }
    init();
  }, [readingId]);

  async function loadReading() {
    setLoading(true);
    try {
      const session = await getSession();
      const token = session?.session?.access_token;
      if (!token) return;

      const res = await fetch(`/api/user/readings?id=${readingId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setReading(data.reading);
      } else {
        setError(data.error || 'Reading not found');
      }
    } catch (err) {
      setError(err.message);
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

  function getHouseColor(draw) {
    const comp = getComponent(draw.transient);
    return HOUSE_COLORS[comp?.house] || HOUSE_COLORS.default || {};
  }

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  async function handleExpandReading() {
    if (expanding || !reading || (reading.draws?.length || 0) >= 5) return;
    setExpanding(true);
    try {
      const session = await getSession();
      const token = session?.session?.access_token;
      const res = await fetch('/api/reading/expand', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reading_id: reading.id })
      });
      const data = await res.json();
      if (data.success) {
        // Reload to show updated reading
        await loadReading();
      }
    } catch (err) {
      console.error('Expand failed:', err);
    } finally {
      setExpanding(false);
    }
  }

  async function togglePublic() {
    if (!reading) return;
    try {
      const session = await getSession();
      const token = session?.session?.access_token;
      const res = await fetch('/api/user/readings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id: reading.id, is_public: !reading.is_public })
      });
      const data = await res.json();
      if (data.success) {
        setReading(data.reading);
      }
    } catch (err) {
      console.error('Toggle public failed:', err);
    }
  }

  function copyShareLink() {
    if (!reading?.share_token) return;
    const url = `${window.location.origin}/reading/${reading.share_token}`;
    navigator.clipboard.writeText(url).then(() => {
      alert('Share link copied!');
    });
  }

  if (loading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500">Loading...</div>;
  if (error) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-red-400">{error}</div>;
  if (!reading) return null;

  const interp = reading.interpretation || {};
  const cards = interp.cards || [];
  const cardCount = reading.draws?.length || 0;
  // Extract depth preference from voice setting (e.g. 'wade-friend' → 'wade')
  const voiceDepth = reading.voice?.split('-')?.[0] || 'wade';

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      <BrandHeader compact />
      <div className="flex-1 max-w-3xl mx-auto px-4 py-6 w-full">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <button onClick={() => router.push('/my-readings')} className="text-xs text-zinc-500 hover:text-zinc-300 mb-1">
              &larr; Back to My Readings
            </button>
            <h1 className="text-xl font-light text-zinc-200">{formatDate(reading.created_at)}</h1>
            <div className="flex items-center gap-2 mt-1">
              {/* Glistened Tale button - shows if glisten data exists */}
              {interp.glisten && (
                <button
                  onClick={() => setShowGlisten(true)}
                  className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-colors flex items-center gap-1"
                  title="View Glistened Tale"
                >
                  <span>✨</span> Glistened Tale
                </button>
              )}
              {reading.topic && <span className="text-xs text-zinc-400">{reading.topic}</span>}
              {Array.isArray(reading.locus_subjects) && reading.locus_subjects.length > 0 ? (
                <span className="text-xs text-amber-500/60">
                  {reading.locus_subjects.join(', ')}
                </span>
              ) : reading.locus && reading.locus !== 'individual' ? (
                <span className="text-xs text-amber-500/60">
                  {reading.locus}{reading.locus_detail ? `: ${reading.locus_detail}` : ''}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TextSizeSlider />
            <button
              onClick={togglePublic}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                reading.is_public
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
              }`}
            >
              {reading.is_public ? 'Public' : 'Private'}
            </button>
            {reading.is_public && (
              <button onClick={copyShareLink} className="text-xs text-zinc-400 hover:text-amber-400 transition-colors">
                Copy Link
              </button>
            )}
          </div>
        </div>

        {/* Letter */}
        {interp.letter && typeof interp.letter === 'string' && interp.letter.trim() && (
          <div className="mb-6 rounded-xl border border-amber-500/20 bg-zinc-900/30 p-5">
            <h3 className="text-xs uppercase tracking-wider text-amber-400/70 mb-2">Letter</h3>
            <div className="text-sm text-zinc-300 leading-relaxed space-y-3 italic">
              {ensureParagraphBreaks(interp.letter).split(/\n\n+/).filter(p => p.trim()).map((para, i) => (
                <p key={i}>{para.trim()}</p>
              ))}
            </div>
          </div>
        )}

        {/* Cards */}
        <div className="space-y-6">
          {reading.draws?.map((draw, i) => {
            const comp = getComponent(draw.transient);
            const card = cards[i] || {};
            const signature = getSignature(draw);

            return (
              <div key={i} className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-5">
                {/* Card Header */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="shrink-0">
                    <CardImage transient={draw.transient} status={draw.status} size="compact" />
                  </div>
                  <div>
                    <h2 className="text-lg font-medium text-zinc-200">{signature}</h2>
                    {draw.position !== undefined && draw.position !== null && (
                      <p className="text-xs text-zinc-500 mt-0.5">
                        in {ARCHETYPES[draw.position]?.name || 'Unknown Position'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Summary */}
                {(() => {
                  const summaryText = getV3Section(card.interpretation, 'summary');
                  return summaryText && summaryText.trim() ? (
                    <div className="mb-4 px-3 py-2 rounded-lg bg-zinc-800/40 border border-zinc-700/30">
                      <p className="text-sm text-zinc-300 italic leading-relaxed">{summaryText.trim()}</p>
                    </div>
                  ) : null;
                })()}

                {/* Reading (main interpretation) */}
                {(() => {
                  const interpText = getDepthText(card.interpretation, voiceDepth);
                  return interpText && interpText.trim() ? (
                    <div className="mb-4">
                      <h3 className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Reading</h3>
                      <div className="text-sm text-zinc-300 leading-relaxed space-y-3">
                        {ensureParagraphBreaks(interpText).split(/\n\n+/).filter(p => p.trim()).map((para, j) => (
                          <p key={j}>{para.trim()}</p>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}

                {/* Mirror */}
                {(() => {
                  const mirrorText = getV3Section(card.interpretation, 'mirror');
                  return mirrorText && mirrorText.trim() ? (
                    <div className="mb-4">
                      <h3 className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Mirror</h3>
                      <div className="text-sm text-zinc-400 leading-relaxed space-y-3">
                        {ensureParagraphBreaks(mirrorText).split(/\n\n+/).filter(p => p.trim()).map((para, j) => (
                          <p key={j}>{para.trim()}</p>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}

                {/* Why This Card */}
                {(() => {
                  const whyText = getV3Section(card.interpretation, 'why');
                  return whyText && whyText.trim() ? (
                    <div className="mb-4">
                      <h3 className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Why This Card</h3>
                      <div className="text-sm text-zinc-400 leading-relaxed space-y-3">
                        {ensureParagraphBreaks(whyText).split(/\n\n+/).filter(p => p.trim()).map((para, j) => (
                          <p key={j}>{para.trim()}</p>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}

                {/* Path to Balance / Growth */}
                {(() => {
                  const rebalText = typeof card.rebalancing === 'string' ? card.rebalancing
                    : getV3Section(card.interpretation, 'rebalancer')
                    || getV3Section(card.interpretation, 'growth')
                    || getDepthText(card.rebalancing, voiceDepth)
                    || getDepthText(card.interpretation?.rebalancer, voiceDepth);
                  const isGrowth = draw.status === 1;
                  return rebalText && rebalText.trim() ? (
                    <div>
                      <h3 className="text-xs uppercase tracking-wider text-zinc-500 mb-2">
                        {isGrowth ? 'Growth' : 'Path to Balance'}
                      </h3>
                      <div className="text-sm text-zinc-400 leading-relaxed space-y-3">
                        {ensureParagraphBreaks(rebalText).split(/\n\n+/).filter(p => p.trim()).map((para, j) => (
                          <p key={j}>{para.trim()}</p>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            );
          })}
        </div>

        {/* Synthesis */}
        {(() => {
          const synthText = typeof interp.synthesis === 'string' ? interp.synthesis
            : getDepthText(interp.synthesis, voiceDepth)
            || getDepthText(interp.synthesis?.summary, voiceDepth)
            || getDepthText(interp.synthesis?.path, voiceDepth);
          return synthText && synthText.trim() ? (
            <div className="mt-6 rounded-xl border border-amber-500/20 bg-zinc-900/30 p-5">
              <h3 className="text-xs uppercase tracking-wider text-amber-400/70 mb-2">Synthesis</h3>
              <div className="text-sm text-zinc-300 leading-relaxed space-y-3">
                {ensureParagraphBreaks(synthText).split(/\n\n+/).filter(p => p.trim()).map((para, i) => (
                  <p key={i}>{para.trim()}</p>
                ))}
              </div>
            </div>
          ) : null;
        })()}

        {/* Expand Reading */}
        {cardCount < 5 && (
          <div className="mt-6 text-center">
            <button
              onClick={handleExpandReading}
              disabled={expanding}
              className="px-5 py-2.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-amber-400 hover:bg-zinc-700 border border-zinc-700 transition-colors text-sm"
            >
              {expanding ? 'Drawing...' : '+ Add a card'}
            </button>
            <p className="text-[10px] text-zinc-600 mt-1.5">{cardCount}/5 cards drawn</p>
          </div>
        )}
        {cardCount >= 5 && (
          <div className="mt-6 text-center text-xs text-zinc-600">Maximum depth reached (5/5 cards)</div>
        )}
      </div>

      {/* Glistened Tale Modal */}
      {showGlisten && interp.glisten && (
        <GlistenSourcePanel
          data={interp.glisten}
          onClose={() => setShowGlisten(false)}
          isOpen={showGlisten}
        />
      )}
      <Footer />
    </div>
  );
}
