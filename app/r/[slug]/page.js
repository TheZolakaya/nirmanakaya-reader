'use client';

// === SHARED READING PAGE ===
// Public view of a shared reading - shows ALL content the reader unlocked

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { getPublicReading } from '../../../lib/supabase';
import { getComponent } from '../../../lib/corrections';
import { STATUSES, HOUSE_COLORS, CHANNELS } from '../../../lib/constants';
import { ARCHETYPES } from '../../../lib/archetypes';
import TextSizeSlider from '../../../components/shared/TextSizeSlider';

// Helper to safely get content from depth objects
function getDepthContent(obj) {
  if (!obj) return null;
  if (typeof obj === 'string') {
    // Try to parse if it looks like JSON
    if (obj.startsWith('{') && obj.endsWith('}')) {
      try {
        const parsed = JSON.parse(obj);
        return parsed.deep || parsed.swim || parsed.wade || parsed.surface || null;
      } catch {
        return obj;
      }
    }
    return obj;
  }
  // Return deepest available content
  return obj.deep || obj.swim || obj.wade || obj.surface || null;
}

// Helper to get all depth levels that have content
function getAllDepths(obj) {
  if (!obj) return [];
  if (typeof obj === 'string') {
    if (obj.startsWith('{') && obj.endsWith('}')) {
      try {
        obj = JSON.parse(obj);
      } catch {
        return [{ depth: 'surface', content: obj }];
      }
    } else {
      return [{ depth: 'surface', content: obj }];
    }
  }

  const depths = [];
  if (obj.surface) depths.push({ depth: 'Surface', content: obj.surface });
  if (obj.wade) depths.push({ depth: 'Wade', content: obj.wade });
  if (obj.swim) depths.push({ depth: 'Swim', content: obj.swim });
  if (obj.deep) depths.push({ depth: 'Deep', content: obj.deep });
  return depths;
}

// Collapsible section component
function CollapsibleSection({ title, badge, children, defaultOpen = true, color = 'amber' }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const colorClasses = {
    amber: 'text-amber-400/70',
    cyan: 'text-cyan-400/70',
    emerald: 'text-emerald-400/70',
    violet: 'text-violet-400/70',
    rose: 'text-rose-400/70'
  };

  return (
    <div className="mb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full text-left mb-2"
      >
        <span className={`text-xs ${colorClasses[color]} uppercase tracking-wide`}>
          {isOpen ? '▼' : '▶'} {title}
        </span>
        {badge && (
          <span className="text-xs text-zinc-600">{badge}</span>
        )}
      </button>
      {isOpen && children}
    </div>
  );
}

// Markdown renderer component
function MarkdownContent({ content, className = '' }) {
  if (!content) return null;
  return (
    <div className={`text-sm text-zinc-300 leading-relaxed ${className}`}>
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          strong: ({ children }) => <strong className="text-zinc-200">{children}</strong>,
          em: ({ children }) => <em className="text-zinc-400">{children}</em>,
          a: ({ href, children }) => (
            <a href={href} className="text-amber-400 hover:text-amber-300 underline" target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="text-zinc-300">{children}</li>
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

// Depth tabs component for showing multiple depth levels
function DepthContent({ depths, showTabs = true }) {
  const [activeDepth, setActiveDepth] = useState(0);

  if (!depths || depths.length === 0) return null;

  // If only one depth, just show it
  if (depths.length === 1 || !showTabs) {
    return <MarkdownContent content={depths[depths.length - 1]?.content} />;
  }

  return (
    <div>
      <div className="flex gap-2 mb-3">
        {depths.map((d, i) => (
          <button
            key={d.depth}
            onClick={() => setActiveDepth(i)}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              activeDepth === i
                ? 'bg-zinc-700 text-zinc-200'
                : 'bg-zinc-800/50 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {d.depth}
          </button>
        ))}
      </div>
      <MarkdownContent content={depths[activeDepth]?.content} />
    </div>
  );
}

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
            className="inline-block px-6 py-3 rounded-lg bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 transition-colors"
          >
            Create your own reading
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-100">
      {/* Text size slider - top right */}
      <div className="fixed top-3 right-3 z-50">
        <TextSizeSlider />
      </div>

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
              <p className="text-xs text-zinc-600 italic">Nirmanakaya — discovered through the math of faith</p>
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
          <div className="mb-8 p-6 bg-zinc-900/50 border border-zinc-800/50 rounded-lg">
            <div className="text-xs text-amber-400/70 mb-2 uppercase tracking-wide">The Question</div>
            <div className="text-lg text-zinc-200 italic">
              "{reading.question}"
            </div>
          </div>
        )}

        {/* Letter / Introduction */}
        {reading.letter && (
          <div className="mb-8 p-6 bg-zinc-900/50 border border-zinc-800/50 rounded-lg">
            <CollapsibleSection title="Introduction" color="cyan">
              <DepthContent depths={getAllDepths(reading.letter)} />
            </CollapsibleSection>
          </div>
        )}

        {/* Cards drawn */}
        {reading.cards && Array.isArray(reading.cards) && (
          <div className="mb-8">
            <div className="text-sm text-zinc-400 mb-4">Cards Drawn ({reading.cards.length})</div>
            <div className="space-y-6">
              {reading.cards.map((card, i) => {
                const trans = getComponent(card.transient);
                const status = STATUSES[card.status];
                const interpretation = card.interpretation;
                const hasExpansions = interpretation?.unpack || interpretation?.clarify || interpretation?.example;
                const hasGrowth = interpretation?.growth && getDepthContent(interpretation.growth);
                const hasWhy = interpretation?.why && getDepthContent(interpretation.why);
                const hasMirror = interpretation?.mirror;
                const hasRebalancer = interpretation?.rebalancer && getDepthContent(interpretation.rebalancer);

                return (
                  <div
                    key={i}
                    className="p-5 bg-zinc-900/50 border border-zinc-800/50 rounded-lg"
                  >
                    {/* Card header */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className={`text-xl font-medium ${getCardColor(trans)}`}>
                          {trans?.name || `Card ${card.transient}`}
                        </div>
                        <div className="text-xs text-zinc-500 mt-1">
                          {status?.name || 'Unknown'} • {trans?.type || 'Card'}
                          {trans?.channel !== undefined && ` • ${CHANNELS[trans.channel]?.name || ''}`}
                        </div>
                      </div>
                      <div className="text-xs text-zinc-600 bg-zinc-800/50 px-2 py-1 rounded">
                        #{i + 1}
                      </div>
                    </div>

                    {/* Main Interpretation */}
                    {interpretation && (
                      <CollapsibleSection title="Reading" color="amber">
                        <DepthContent depths={getAllDepths(interpretation)} />
                      </CollapsibleSection>
                    )}

                    {/* Expansions */}
                    {hasExpansions && (
                      <div className="border-t border-zinc-800/50 pt-4 mt-4">
                        {interpretation.unpack && (
                          <CollapsibleSection title="Unpack" color="violet" defaultOpen={false}>
                            <MarkdownContent content={getDepthContent(interpretation.unpack)} />
                          </CollapsibleSection>
                        )}
                        {interpretation.clarify && (
                          <CollapsibleSection title="Clarify" color="violet" defaultOpen={false}>
                            <MarkdownContent content={getDepthContent(interpretation.clarify)} />
                          </CollapsibleSection>
                        )}
                        {interpretation.example && (
                          <CollapsibleSection title="Example" color="violet" defaultOpen={false}>
                            <MarkdownContent content={getDepthContent(interpretation.example)} />
                          </CollapsibleSection>
                        )}
                      </div>
                    )}

                    {/* Growth */}
                    {hasGrowth && (
                      <div className="border-t border-zinc-800/50 pt-4 mt-4">
                        <CollapsibleSection title="Growth Opportunity" color="emerald">
                          <DepthContent depths={getAllDepths(interpretation.growth)} />
                        </CollapsibleSection>
                      </div>
                    )}

                    {/* The Why / Mirror */}
                    {(hasWhy || hasMirror) && (
                      <div className="border-t border-zinc-800/50 pt-4 mt-4">
                        {hasMirror && (
                          <div className="mb-4 p-3 bg-cyan-950/20 border border-cyan-800/30 rounded-lg">
                            <div className="text-xs text-cyan-400/70 mb-2">🪞 The Mirror</div>
                            <div className="text-sm text-cyan-300/90 italic">
                              {interpretation.mirror}
                            </div>
                          </div>
                        )}
                        {hasWhy && (
                          <CollapsibleSection title="Words to the Whys" color="cyan">
                            <DepthContent depths={getAllDepths(interpretation.why)} />
                          </CollapsibleSection>
                        )}
                      </div>
                    )}

                    {/* Rebalancer / Path to Balance */}
                    {hasRebalancer && (
                      <div className="border-t border-zinc-800/50 pt-4 mt-4">
                        <CollapsibleSection title="Path to Balance" color="emerald">
                          <DepthContent depths={getAllDepths(interpretation.rebalancer)} />
                        </CollapsibleSection>
                      </div>
                    )}

                    {/* Architecture */}
                    {interpretation?.architecture && (
                      <div className="border-t border-zinc-800/50 pt-4 mt-4">
                        <CollapsibleSection title="Architecture" color="rose" defaultOpen={false}>
                          <MarkdownContent content={interpretation.architecture} />
                        </CollapsibleSection>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Synthesis Section */}
        {reading.synthesis && (
          <div className="mb-8 p-6 bg-zinc-900/50 border border-zinc-800/50 rounded-lg">
            <div className="text-lg font-light text-amber-400 mb-6 text-center">Synthesis</div>

            {/* The Reading / Summary */}
            {reading.synthesis.summary && getDepthContent(reading.synthesis.summary) && (
              <CollapsibleSection title="The Reading" color="amber">
                <DepthContent depths={getAllDepths(reading.synthesis.summary)} />
              </CollapsibleSection>
            )}

            {/* Why This Reading Appeared */}
            {reading.synthesis.whyAppeared && getDepthContent(reading.synthesis.whyAppeared) && (
              <CollapsibleSection title="Why This Reading Appeared" color="cyan">
                <DepthContent depths={getAllDepths(reading.synthesis.whyAppeared)} />
              </CollapsibleSection>
            )}

            {/* The Invitation / Path */}
            {reading.synthesis.path && getDepthContent(reading.synthesis.path) && (
              <CollapsibleSection title="The Invitation" color="emerald">
                <DepthContent depths={getAllDepths(reading.synthesis.path)} />
              </CollapsibleSection>
            )}
          </div>
        )}

        {/* Thread Continuations */}
        {reading.threads && reading.threads.length > 0 && (
          <div className="mb-8">
            <div className="text-sm text-zinc-400 mb-4">Thread Continuations</div>
            <div className="space-y-4">
              {reading.threads.map((thread, i) => (
                <div key={i} className="p-5 bg-zinc-900/50 border border-zinc-800/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-xs px-2 py-1 rounded ${
                      thread.type === 'reflect' ? 'bg-blue-900/30 text-blue-400' :
                      thread.type === 'forge' ? 'bg-amber-900/30 text-amber-400' :
                      'bg-zinc-800 text-zinc-400'
                    }`}>
                      {thread.type === 'reflect' ? '↩ Reflect' : thread.type === 'forge' ? '⚡ Forge' : thread.type}
                    </span>
                    {thread.input && (
                      <span className="text-zinc-500 text-sm italic">"{thread.input}"</span>
                    )}
                  </div>
                  <MarkdownContent content={thread.response} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Follow-up Conversation */}
        {reading.followUps && reading.followUps.length > 0 && (
          <div className="mb-8">
            <div className="text-sm text-zinc-400 mb-4">Follow-up Conversation</div>
            <div className="space-y-3">
              {reading.followUps.map((followUp, i) => (
                <div key={i} className="p-4 bg-zinc-900/50 border border-zinc-800/50 rounded-lg">
                  <div className="text-xs text-zinc-500 mb-2">Q: {followUp.question}</div>
                  <MarkdownContent content={followUp.response} />
                </div>
              ))}
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
            className="inline-block px-6 py-3 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 text-zinc-900 font-medium hover:from-amber-500 hover:to-amber-400 transition-all"
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
