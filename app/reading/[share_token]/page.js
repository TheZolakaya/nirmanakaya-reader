'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getComponent } from '../../../lib/corrections';
import { STATUSES } from '../../../lib/constants';
import { ARCHETYPES } from '../../../lib/archetypes';
import { ensureParagraphBreaks } from '../../../lib/utils';
import CardImage from '../../../components/reader/CardImage';
import TextSizeSlider from '../../../components/shared/TextSizeSlider';

export default function SharedReadingPage() {
  const params = useParams();
  const shareToken = params.share_token;

  const [reading, setReading] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadReading() {
      try {
        const res = await fetch(`/api/reading/shared?token=${shareToken}`);
        const data = await res.json();
        if (data.success) {
          setReading(data.reading);
        } else {
          setError(data.error || 'Reading not found');
        }
      } catch (err) {
        setError('Failed to load reading');
      } finally {
        setLoading(false);
      }
    }
    if (shareToken) loadReading();
  }, [shareToken]);

  function getSignature(draw) {
    const comp = getComponent(draw.transient);
    const status = STATUSES[draw.status];
    const prefix = status?.prefix || 'Balanced';
    return `${prefix} ${comp?.name || 'Unknown'}`;
  }

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  if (loading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500">Loading...</div>;
  if (error) return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4">
      <p className="text-zinc-500">{error}</p>
      <a href="/" className="text-amber-400 hover:text-amber-300 text-sm">Get your own reading</a>
    </div>
  );
  if (!reading) return null;

  const interp = reading.interpretation || {};
  const cards = interp.cards || [];

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-light text-zinc-200">Nirmanakaya Reading</h1>
            <p className="text-xs text-zinc-500 mt-1">{formatDate(reading.created_at)}</p>
            {reading.topic && <p className="text-xs text-zinc-400 mt-0.5">{reading.topic}</p>}
          </div>
          <TextSizeSlider />
        </div>

        {/* Cards */}
        <div className="space-y-6">
          {reading.draws?.map((draw, i) => {
            const comp = getComponent(draw.transient);
            const card = cards[i] || {};
            const signature = getSignature(draw);

            return (
              <div key={i} className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-5">
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

                {card.interpretation && (
                  <div className="mb-4">
                    <h3 className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Interpretation</h3>
                    <div className="text-sm text-zinc-300 leading-relaxed space-y-3">
                      {ensureParagraphBreaks(card.interpretation).split(/\n\n+/).filter(p => p.trim()).map((para, j) => (
                        <p key={j}>{para.trim()}</p>
                      ))}
                    </div>
                  </div>
                )}

                {card.rebalancing && (
                  <div>
                    <h3 className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Path to Balance</h3>
                    <div className="text-sm text-zinc-400 leading-relaxed space-y-3">
                      {ensureParagraphBreaks(card.rebalancing).split(/\n\n+/).filter(p => p.trim()).map((para, j) => (
                        <p key={j}>{para.trim()}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Synthesis */}
        {interp.synthesis && (
          <div className="mt-6 rounded-xl border border-amber-500/20 bg-zinc-900/30 p-5">
            <h3 className="text-xs uppercase tracking-wider text-amber-400/70 mb-2">Synthesis</h3>
            <div className="text-sm text-zinc-300 leading-relaxed space-y-3">
              {ensureParagraphBreaks(interp.synthesis).split(/\n\n+/).filter(p => p.trim()).map((para, i) => (
                <p key={i}>{para.trim()}</p>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="mt-8 text-center border-t border-zinc-800/40 pt-6">
          <p className="text-zinc-500 text-sm mb-3">Drawn from the Nirmanakaya Architecture</p>
          <a href="/" className="inline-block px-6 py-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-colors text-sm">
            Get your own reading
          </a>
        </div>
      </div>
    </div>
  );
}
