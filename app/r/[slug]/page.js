'use client';

// === SHARED READING PAGE ===
// Public view of a shared reading

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { getPublicReading } from '../../../lib/supabase';
import { getComponent } from '../../../lib/corrections';
import { STATUSES, HOUSE_COLORS } from '../../../lib/constants';
import { ARCHETYPES } from '../../../lib/archetypes';

export default function SharedReadingPage({ params }) {
  const [reading, setReading] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadReading() {
      const { data, error } = await getPublicReading(params.slug);
      if (error || !data) {
        setError('Reading not found or is no longer public');
        setLoading(false);
        return;
      }
      setReading(data);
      setLoading(false);
    }
    loadReading();
  }, [params.slug]);

  function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function getModeLabel(mode) {
    const labels = {
      reflect: 'Reflect',
      discover: 'Discover',
      forge: 'Forge',
      explore: 'Explore',
      firstContact: 'First Contact'
    };
    return labels[mode] || mode;
  }

  function getCardColor(trans) {
    if (!trans) return 'text-zinc-400';
    if (trans.type === 'Archetype') {
      const archetype = ARCHETYPES[trans.archetype ?? trans.index];
      const house = archetype?.house;
      return HOUSE_COLORS[house] || 'text-zinc-400';
    }
    return 'text-zinc-400';
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center">
        <div className="text-zinc-500">Loading reading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-zinc-500 mb-4">{error}</div>
          <Link
            href="/"
            className="inline-block px-6 py-3 rounded-xl bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 transition-colors"
          >
            Create your own reading
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="border-b border-zinc-800/50 bg-zinc-900/30">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-zinc-400 hover:text-zinc-200 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <div className="text-xs text-zinc-500">Shared Reading</div>
              <h1 className="text-lg font-light">{getModeLabel(reading.mode)} Reading</h1>
            </div>
          </div>
          <div className="text-xs text-zinc-500">
            {formatDate(reading.created_at)}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Question */}
        {reading.question && (
          <div className="mb-8 p-6 bg-zinc-900/50 border border-zinc-800/50 rounded-xl">
            <div className="text-xs text-amber-400/70 mb-2 uppercase tracking-wide">The Question</div>
            <div className="text-lg text-zinc-200 italic">
              "{reading.question}"
            </div>
          </div>
        )}

        {/* Cards drawn */}
        {reading.cards && Array.isArray(reading.cards) && (
          <div className="mb-8">
            <div className="text-sm text-zinc-400 mb-4">Cards Drawn</div>
            <div className="space-y-4">
              {reading.cards.map((card, i) => {
                const trans = getComponent(card.transient);
                const status = STATUSES[card.status];
                const interpretation = card.interpretation;

                return (
                  <div
                    key={i}
                    className="p-5 bg-zinc-900/50 border border-zinc-800/50 rounded-xl"
                  >
                    {/* Card header */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className={`text-lg font-medium ${getCardColor(trans)}`}>
                          {trans?.name || `Card ${card.transient}`}
                        </div>
                        <div className="text-xs text-zinc-500 mt-0.5">
                          {status?.name || 'Unknown'} • {trans?.type || 'Card'}
                        </div>
                      </div>
                      <div className="text-xs text-zinc-600">
                        #{i + 1}
                      </div>
                    </div>

                    {/* Interpretation */}
                    {interpretation && (interpretation.wade || interpretation.surface) && (
                      <div className="text-sm text-zinc-300 leading-relaxed">
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                            strong: ({ children }) => <strong className="text-zinc-200">{children}</strong>
                          }}
                        >
                          {interpretation.wade || interpretation.surface}
                        </ReactMarkdown>
                      </div>
                    )}

                    {/* Rebalancer if present */}
                    {interpretation?.rebalancer && (interpretation.rebalancer.wade || interpretation.rebalancer.surface) && (
                      <div className="mt-4 pt-4 border-t border-zinc-800/50">
                        <div className="text-xs text-emerald-400/70 mb-2">Path to Balance</div>
                        <div className="text-sm text-zinc-400 leading-relaxed">
                          <ReactMarkdown
                            components={{
                              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>
                            }}
                          >
                            {interpretation.rebalancer.wade || interpretation.rebalancer.surface}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Letter */}
        {reading.letter && (
          <div className="mb-8 p-6 bg-zinc-900/50 border border-zinc-800/50 rounded-xl">
            <div className="text-xs text-cyan-400/70 mb-3 uppercase tracking-wide">The Letter</div>
            <div className="text-sm text-zinc-300 leading-relaxed">
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                  strong: ({ children }) => <strong className="text-zinc-200">{children}</strong>
                }}
              >
                {typeof reading.letter === 'object'
                  ? (reading.letter.wade || reading.letter.surface || '')
                  : reading.letter}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {/* Summary */}
        {reading.synthesis?.summary && (reading.synthesis.summary.wade || reading.synthesis.summary.surface) && (
          <div className="mb-8 p-6 bg-zinc-900/50 border border-zinc-800/50 rounded-xl">
            <div className="text-xs text-amber-400/70 mb-3 uppercase tracking-wide">Summary</div>
            <div className="text-sm text-zinc-300 leading-relaxed">
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                  strong: ({ children }) => <strong className="text-zinc-200">{children}</strong>
                }}
              >
                {reading.synthesis.summary.wade || reading.synthesis.summary.surface}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="text-center py-8">
          <div className="text-zinc-500 text-sm mb-4">
            Curious what the cards have for you?
          </div>
          <Link
            href="/"
            className="inline-block px-6 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 text-zinc-900 font-medium hover:from-amber-500 hover:to-amber-400 transition-all"
          >
            Create Your Own Reading
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-zinc-800/50 py-4">
        <div className="max-w-3xl mx-auto px-4 text-center text-xs text-zinc-600">
          Nirmanakaya Reader • Consciousness Architecture
        </div>
      </div>
    </div>
  );
}
