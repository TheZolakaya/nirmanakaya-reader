'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getComponent } from '../../../lib/corrections';
import { STATUSES } from '../../../lib/constants';
import { ARCHETYPES } from '../../../lib/archetypes';
import { ensureParagraphBreaks } from '../../../lib/utils';
import CardImage from '../../../components/reader/CardImage';
import TextSizeSlider from '../../../components/shared/TextSizeSlider';
import BrandHeader from '../../../components/layout/BrandHeader';
import Footer from '../../../components/layout/Footer';

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
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      <BrandHeader compact />
      <div className="flex-1 max-w-3xl mx-auto px-4 py-6 w-full">
        {/* Page Header */}
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

                {/* Summary */}
                {card.interpretation?.summary && (
                  <div className="mb-4 px-3 py-2 rounded-lg bg-zinc-800/40 border border-zinc-700/30">
                    <p className="text-sm text-zinc-300 italic leading-relaxed">{card.interpretation.summary.trim()}</p>
                  </div>
                )}

                {/* Reading (main interpretation) */}
                {(() => {
                  // V3: card.interpretation is an object with .reading field
                  // Legacy: card.interpretation is a string or depth-tiered object
                  const interpText = typeof card.interpretation === 'string'
                    ? card.interpretation
                    : card.interpretation?.reading
                    || card.interpretation?.deep || card.interpretation?.swim
                    || card.interpretation?.wade || card.interpretation?.surface || '';
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
                {card.interpretation?.mirror && (
                  <div className="mb-4">
                    <h3 className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Mirror</h3>
                    <div className="text-sm text-zinc-400 leading-relaxed space-y-3">
                      {ensureParagraphBreaks(card.interpretation.mirror).split(/\n\n+/).filter(p => p.trim()).map((para, j) => (
                        <p key={j}>{para.trim()}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Why This Card */}
                {card.interpretation?.why && (
                  <div className="mb-4">
                    <h3 className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Why This Card</h3>
                    <div className="text-sm text-zinc-400 leading-relaxed space-y-3">
                      {ensureParagraphBreaks(card.interpretation.why).split(/\n\n+/).filter(p => p.trim()).map((para, j) => (
                        <p key={j}>{para.trim()}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Path to Balance / Growth */}
                {(() => {
                  const rebalText = typeof card.rebalancing === 'string' ? card.rebalancing
                    : card.interpretation?.rebalancer || card.interpretation?.growth || '';
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

        {/* Letter */}
        {interp.letter && typeof interp.letter === 'string' && interp.letter.trim() && (
          <div className="mt-6 rounded-xl border border-amber-500/20 bg-zinc-900/30 p-5">
            <h3 className="text-xs uppercase tracking-wider text-amber-400/70 mb-2">Letter</h3>
            <div className="text-sm text-zinc-300 leading-relaxed space-y-3 italic">
              {ensureParagraphBreaks(interp.letter).split(/\n\n+/).filter(p => p.trim()).map((para, i) => (
                <p key={i}>{para.trim()}</p>
              ))}
            </div>
          </div>
        )}

        {/* Synthesis */}
        {(() => {
          const synthText = typeof interp.synthesis === 'string' ? interp.synthesis
            : interp.synthesis?.summary || interp.synthesis?.path
            || interp.synthesis?.deep || interp.synthesis?.swim || interp.synthesis?.wade || '';
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

        {/* CTA */}
        <div className="mt-8 text-center border-t border-zinc-800/40 pt-6">
          <p className="text-zinc-500 text-sm mb-3">Drawn from the Nirmanakaya Architecture</p>
          <a href="/" className="inline-block px-6 py-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-colors text-sm">
            Get your own reading
          </a>
        </div>
      </div>
      <Footer />
    </div>
  );
}
