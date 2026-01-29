'use client';

// === SHARED DEPTH CARD ===
// Read-only card display for shared readings
// Shows card image with status aura, house-colored container,
// and collapsible interpretation sections

import { useState } from 'react';
import CardImage from './CardImage.js';
import { STATUSES, STATUS_COLORS, HOUSE_COLORS } from '../../lib/constants.js';
import { ARCHETYPES } from '../../lib/archetypes.js';
import { getComponent } from '../../lib/corrections.js';
import { getHomeArchetype, getDetailedCardType } from '../../lib/cardImages.js';
import ReactMarkdown from 'react-markdown';

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

// Collapsible section
function Section({ title, badge, children, defaultOpen = true, color = 'amber' }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const colorClasses = {
    amber: 'text-amber-400/70',
    cyan: 'text-cyan-400/70',
    emerald: 'text-emerald-400/70',
    violet: 'text-violet-400/70',
    rose: 'text-rose-400/70'
  };
  return (
    <div className="mb-4">
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

export default function SharedDepthCard({ card, index, mode }) {
  const trans = getComponent(card.transient);
  const status = STATUSES[card.status];
  const interpretation = card.interpretation;

  // Determine house for container color
  // Discover mode: use position archetype's house; Reflect: use card's own archetype house
  let house = 'Gestalt';
  if (mode === 'discover' || mode === 'forge') {
    if (card.position !== undefined && card.position !== null) {
      house = ARCHETYPES[card.position]?.house || 'Gestalt';
    }
  } else {
    // For reflect mode or fallback, use the card's home archetype
    const homeArch = getHomeArchetype(card.transient);
    if (homeArch !== null) {
      house = ARCHETYPES[homeArch]?.house || 'Gestalt';
    }
  }

  const houseColors = HOUSE_COLORS[house] || HOUSE_COLORS.Gestalt;
  const softerBorder = houseColors.border.replace('/50', '/30');
  const containerStyle = `${houseColors.bg} ${softerBorder}`;
  const badgeStyle = `${houseColors.bg} ${houseColors.text}`;

  // Card type label
  const cardTypeInfo = getDetailedCardType(card.transient);
  const typeLabel = cardTypeInfo?.label || trans?.type || '';

  // Content checks
  const hasExpansions = interpretation?.unpack || interpretation?.clarify || interpretation?.example;
  const hasGrowth = interpretation?.growth && getDepthContent(interpretation.growth);
  const hasWhy = interpretation?.why && getDepthContent(interpretation.why);
  const hasMirror = interpretation?.mirror;
  const hasRebalancer = interpretation?.rebalancer && getDepthContent(interpretation.rebalancer);

  return (
    <div className={`rounded-lg border-2 p-5 mb-5 transition-all duration-300 ${containerStyle}`}>
      {/* Card Visual + Header */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-4">
        {/* Card Image */}
        <div className="flex flex-col items-center shrink-0">
          <div className={`text-xs mb-1 ${STATUS_COLORS[card.status]?.split(' ')[0] || 'text-zinc-400'}`}>
            {status?.prefix || status?.name || ''}
          </div>
          <CardImage
            transient={card.transient}
            status={card.status}
            cardName={trans?.name}
            size="compact"
          />
          <div className={`text-sm font-medium mt-2 text-center ${houseColors.text}`}>
            {trans?.name || `Card ${card.transient}`}
          </div>
          <div className="text-[0.65rem] text-zinc-500 uppercase tracking-wider">
            {typeLabel}
          </div>
        </div>

        {/* Card Info + Position */}
        <div className="flex-1 min-w-0 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
            <span className={`text-xs px-2 py-0.5 rounded ${badgeStyle}`}>
              #{index + 1}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[card.status] || 'bg-zinc-800 text-zinc-400'}`}>
              {status?.name || 'Unknown'}
            </span>
          </div>

          {/* Position archetype (Discover/Forge mode) */}
          {card.position !== undefined && card.position !== null && mode !== 'reflect' && (
            <div className="text-xs text-zinc-500 mt-1">
              in your <span className={houseColors.text}>{ARCHETYPES[card.position]?.name || ''}</span>
            </div>
          )}

          {/* Channel info for bounds/agents */}
          {trans?.channel && (
            <div className="text-xs text-zinc-600 mt-1">
              {trans.channel} Channel
            </div>
          )}
        </div>
      </div>

      {/* Interpretation Sections */}
      {interpretation && (
        <Section title="Reading" color="amber">
          <DepthContent depths={getAllDepths(interpretation)} />
        </Section>
      )}

      {hasExpansions && (
        <div className="border-t border-zinc-800/30 pt-4 mt-4">
          {interpretation.unpack && (
            <Section title="Unpack" color="violet" defaultOpen={false}>
              <MarkdownContent content={getDepthContent(interpretation.unpack)} />
            </Section>
          )}
          {interpretation.clarify && (
            <Section title="Clarify" color="violet" defaultOpen={false}>
              <MarkdownContent content={getDepthContent(interpretation.clarify)} />
            </Section>
          )}
          {interpretation.example && (
            <Section title="Example" color="violet" defaultOpen={false}>
              <MarkdownContent content={getDepthContent(interpretation.example)} />
            </Section>
          )}
        </div>
      )}

      {hasGrowth && (
        <div className="border-t border-zinc-800/30 pt-4 mt-4">
          <Section title="Growth Opportunity" color="emerald">
            <DepthContent depths={getAllDepths(interpretation.growth)} />
          </Section>
        </div>
      )}

      {(hasWhy || hasMirror) && (
        <div className="border-t border-zinc-800/30 pt-4 mt-4">
          {hasMirror && (
            <div className="mb-4 p-3 bg-cyan-950/20 border border-cyan-800/30 rounded-lg">
              <div className="text-xs text-cyan-400/70 mb-2">The Mirror</div>
              <div className="text-sm text-cyan-300/90 italic">{interpretation.mirror}</div>
            </div>
          )}
          {hasWhy && (
            <Section title="Words to the Whys" color="cyan">
              <DepthContent depths={getAllDepths(interpretation.why)} />
            </Section>
          )}
        </div>
      )}

      {hasRebalancer && (
        <div className="border-t border-zinc-800/30 pt-4 mt-4">
          <Section title="Path to Balance" color="emerald">
            <DepthContent depths={getAllDepths(interpretation.rebalancer)} />
          </Section>
        </div>
      )}

      {interpretation?.architecture && (
        <div className="border-t border-zinc-800/30 pt-4 mt-4">
          <Section title="Architecture" color="rose" defaultOpen={false}>
            <MarkdownContent content={interpretation.architecture} />
          </Section>
        </div>
      )}
    </div>
  );
}
