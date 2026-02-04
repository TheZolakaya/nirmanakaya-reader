'use client';

// === SHARED READING CLIENT COMPONENT ===
// Rich display of a shared reading with card images, house-colored containers,
// status auras, and full interpretation content.
// Receives pre-fetched data from the server component (page.js).

import { useState } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import SharedDepthCard from '../../../components/reader/SharedDepthCard';
import TextSizeSlider from '../../../components/shared/TextSizeSlider';
import Header from '../../../components/layout/Header';
import Footer from '../../../components/layout/Footer';

// Helper to safely get content from depth objects
function getDepthContent(obj) {
  if (!obj) return null;
  if (typeof obj === 'string') {
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
  return obj.deep || obj.swim || obj.wade || obj.surface || null;
}

// Helper to get all depth levels
function getAllDepths(obj) {
  if (!obj) return [];
  if (typeof obj === 'string') {
    if (obj.startsWith('{') && obj.endsWith('}')) {
      try { obj = JSON.parse(obj); } catch { return [{ depth: 'surface', content: obj }]; }
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

// Collapsible section
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
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 w-full text-left mb-2">
        <span className={`text-xs ${colorClasses[color]} uppercase tracking-wide`}>
          {isOpen ? '▼' : '▶'} {title}
        </span>
        {badge && <span className="text-xs text-zinc-600">{badge}</span>}
      </button>
      {isOpen && children}
    </div>
  );
}

// Markdown renderer
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

// Depth tabs
function DepthContent({ depths }) {
  const [activeDepth, setActiveDepth] = useState(0);
  if (!depths || depths.length === 0) return null;
  if (depths.length === 1) {
    return <MarkdownContent content={depths[0]?.content} />;
  }
  return (
    <div>
      <div className="flex gap-2 mb-3">
        {depths.map((d, i) => (
          <button
            key={d.depth}
            onClick={() => setActiveDepth(i)}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              activeDepth === i ? 'bg-zinc-700 text-zinc-200' : 'bg-zinc-800/50 text-zinc-500 hover:text-zinc-300'
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

const MODE_COLORS = {
  reflect: 'text-blue-400',
  discover: 'text-amber-400',
  forge: 'text-orange-400',
  explore: 'text-emerald-400',
  firstContact: 'text-zinc-400'
};

export default function SharedReading({ reading, error }) {
  if (error || !reading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-zinc-500 mb-4">{error || 'Reading not found'}</div>
            <Link
              href="/"
              className="inline-block px-6 py-3 rounded-lg bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 transition-colors"
            >
              Create your own reading
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const modeLabel = getModeLabel(reading.mode);
  const modeColor = MODE_COLORS[reading.mode] || 'text-zinc-400';

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-100 flex flex-col">
      <Header />
      {/* Text size slider */}
      <div className="fixed top-3 right-3 z-50">
        <TextSizeSlider />
      </div>

      {/* Page Header */}
      <div className="border-b border-zinc-800/50 bg-zinc-900/30">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-zinc-400 hover:text-zinc-200 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <div className="text-xs text-zinc-500">Shared Reading</div>
              <h1 className="text-lg font-light">
                <span className={modeColor}>{modeLabel}</span> Reading
              </h1>
              <p className="text-xs text-zinc-600 italic">Nirmanakaya — discovered through the math of faith</p>
            </div>
          </div>
          <div className="text-xs text-zinc-500">
            {formatDate(reading.created_at)}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Question */}
        {reading.question && (
          <div className="mb-8 p-6 bg-zinc-900/50 border border-zinc-800/50 rounded-lg">
            <div className="text-xs text-amber-400/70 mb-2 uppercase tracking-wide">The Question</div>
            <div className="text-lg text-zinc-200 italic">
              &ldquo;{reading.question}&rdquo;
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
            {reading.cards.map((card, i) => (
              <SharedDepthCard
                key={i}
                card={card}
                index={i}
                mode={reading.mode}
              />
            ))}
          </div>
        )}

        {/* Synthesis Section */}
        {reading.synthesis && (
          <div className="mb-8 p-6 bg-zinc-900/50 border border-zinc-800/50 rounded-lg">
            <div className="text-lg font-light text-amber-400 mb-6 text-center">Synthesis</div>

            {reading.synthesis.summary && getDepthContent(reading.synthesis.summary) && (
              <CollapsibleSection title="The Reading" color="amber">
                <DepthContent depths={getAllDepths(reading.synthesis.summary)} />
              </CollapsibleSection>
            )}

            {reading.synthesis.whyAppeared && getDepthContent(reading.synthesis.whyAppeared) && (
              <CollapsibleSection title="Why This Reading Appeared" color="cyan">
                <DepthContent depths={getAllDepths(reading.synthesis.whyAppeared)} />
              </CollapsibleSection>
            )}

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
                      {thread.type === 'reflect' ? 'Reflect' : thread.type === 'forge' ? 'Forge' : thread.type}
                    </span>
                    {thread.input && (
                      <span className="text-zinc-500 text-sm italic">&ldquo;{thread.input}&rdquo;</span>
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

      <Footer />
    </div>
  );
}
