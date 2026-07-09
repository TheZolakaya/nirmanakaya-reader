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
import BrandHeader from '../../../components/layout/BrandHeader';
import Footer from '../../../components/layout/Footer';
import DocsBackground from '../../../components/shared/DocsBackground';

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
        <BrandHeader compact />
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

  // The saved Integrate answer (interpretation.verdict): {verdict: parsedVerdictObj, verdictMeta, lean, branchScores}
  const v = reading.verdict?.verdict || null;
  const vMeta = reading.verdict?.verdictMeta || {};
  const vBranches = reading.verdict?.branchScores || null;
  const verdictTone = {
    emerald: 'text-emerald-300 border-emerald-500/40 bg-emerald-600/10',
    rose: 'text-rose-300 border-rose-500/40 bg-rose-600/10',
    violet: 'text-violet-300 border-violet-500/40 bg-violet-600/10',
    amber: 'text-amber-300 border-amber-500/40 bg-amber-600/10',
    sky: 'text-sky-300 border-sky-500/40 bg-sky-600/10',
    zinc: 'text-zinc-300 border-zinc-600/40 bg-zinc-700/20'
  }[vMeta.tone] || 'text-zinc-300 border-zinc-600/40 bg-zinc-700/20';

  return (
    <DocsBackground>
    <div className="min-h-screen text-zinc-100 flex flex-col">
      <BrandHeader compact />
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

        {/* THE ANSWER — Integrate verdict, when the reading carries one */}
        {v && (
          <div className="mb-8 p-6 bg-zinc-900/60 border border-zinc-700/60 rounded-lg">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-600">The Answer</span>
              <span className={`text-xs font-mono uppercase tracking-wider px-2.5 py-1 rounded border ${verdictTone}`}>
                {vMeta.label || v.verdict}
              </span>
            </div>
            {v.verdict === 'CHOICE' && v.selection && (
              <div className="text-lg text-sky-200 font-medium leading-snug mb-1">&ldquo;{v.selection}&rdquo;</div>
            )}
            <div className="text-base text-zinc-100 leading-relaxed mb-1">{v.headline}</div>
            {v.qualifier && <div className="text-sm text-zinc-400 leading-relaxed mb-2">{v.qualifier}</div>}
            {vBranches?.ranked && (
              <div className="mt-2 mb-2 space-y-1.5">
                {vBranches.ranked.map((b) => {
                  const selected = v.verdict === 'CHOICE' && b.option === v.selection;
                  const pct = Math.round(((b.score + 1) / 2) * 100);
                  const note = v.branchNotes?.find(n => n.option === b.option)?.note;
                  return (
                    <div key={b.index} className={`rounded-md border px-2.5 py-1.5 ${selected ? 'border-sky-500/40 bg-sky-600/10' : 'border-zinc-800 bg-zinc-900/40'}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-xs ${selected ? 'text-sky-200' : 'text-zinc-300'}`}>{b.option}</span>
                        <span className="text-[10px] font-mono text-zinc-500">{b.score > 0 ? '+' : ''}{b.score}</span>
                      </div>
                      <div className="h-1 mt-1 rounded bg-zinc-800 overflow-hidden">
                        <div className={`h-full ${selected ? 'bg-sky-500/70' : 'bg-zinc-600/70'}`} style={{ width: `${pct}%` }} />
                      </div>
                      {note && <div className="text-[11px] text-zinc-500 mt-1 leading-snug">{note}</div>}
                    </div>
                  );
                })}
                <div className="text-[9px] text-zinc-600">{vBranches.label}</div>
              </div>
            )}
            {v.authorshipReturn && <div className="text-xs text-zinc-500 italic">{v.authorshipReturn}</div>}
            {reading.verdict?.lean && !vBranches && (
              <div className="text-[10px] text-zinc-600 mt-2">
                Field lean (computed): {reading.verdict.lean.value} · {reading.verdict.lean.band} — {reading.verdict.lean.label}
              </div>
            )}
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
    </DocsBackground>
  );
}
