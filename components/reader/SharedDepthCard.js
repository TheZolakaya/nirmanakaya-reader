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
  // Full-strength house outline — the softened border read as "sloppy/plain" next
  // to the live reading's vivid container colors.
  const containerStyle = `${houseColors.bg} ${houseColors.border}`;
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
      {/* Card Visual + Header — a CENTERED, balanced composition: card art, signature
          info, medicine card. No flex-1 stretching (it flung the medicine card to the
          far edge and left a void in the middle). */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start justify-center gap-5 sm:gap-10 mb-4">
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

        {/* Position card — the live header's "IN YOUR [position art]" leg */}
        {card.position !== undefined && card.position !== null && (
          <div className="hidden md:flex flex-col items-center shrink-0 pt-5">
            <div className="text-[0.6rem] text-zinc-500 uppercase tracking-wider mb-1">in your</div>
            <CardImage
              transient={card.position}
              status={1}
              cardName={ARCHETYPES[card.position]?.name}
              size="compact"
            />
            <div className={`text-sm font-medium mt-2 text-center ${houseColors.text}`}>
              {ARCHETYPES[card.position]?.name || ''}
            </div>
            {card.frameLabel && (
              <div className="text-[0.6rem] text-zinc-500 text-center">({card.frameLabel})</div>
            )}
          </div>
        )}

        {/* Signature strip — mirrors the live reading's identity header:
            "[Status] Name → in your Position", chips, channel/archetype line.
            Position ALWAYS shows (the old mode!=='reflect' gate hid it from
            exactly the readings that use named positions). */}
        <div className="min-w-0 max-w-md text-center sm:text-left sm:pt-3">
          <div className="flex items-center justify-center sm:justify-start gap-2 mb-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded ${badgeStyle}`}>
              #{index + 1}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[card.status] || 'bg-zinc-800 text-zinc-400'}`}>
              {status?.name || 'Unknown'}
            </span>
          </div>

          <div className={`text-lg sm:text-xl font-light leading-snug ${houseColors.text}`}>
            {status?.prefix ? `${status.prefix} ${trans?.name}` : `Balanced ${trans?.name}`}
          </div>

          {card.position !== undefined && card.position !== null && (
            <div className="text-sm text-zinc-400 mt-1">
              in your <span className={houseColors.text}>{ARCHETYPES[card.position]?.name || ''}</span>
              {card.frameLabel && <span className="text-zinc-500"> ({card.frameLabel})</span>}
            </div>
          )}

          <div className="text-xs text-zinc-600 mt-2 space-y-0.5">
            {trans?.channel && <div>{trans.channel} Channel</div>}
            {trans?.archetype !== undefined && trans?.archetype !== null && ARCHETYPES[trans.archetype] && trans?.type !== 'Archetype' && (
              <div>Expresses <span className="text-zinc-400">{ARCHETYPES[trans.archetype].name}</span></div>
            )}
          </div>

          {card.computed && (
            <div className="text-xs text-zinc-500 mt-2 uppercase tracking-wider">
              {card.status === 1 ? 'Growth Opportunity' : 'Rebalancer'}
              <span className="normal-case tracking-normal text-zinc-400"> → {card.computed.targetName}{card.computed.pathway ? ` via ${card.computed.pathway}` : ''}</span>
            </div>
          )}
        </div>

        {/* Medicine card — the computed rebalancer/growth target, arrow pointing the way
            (mirrors the live reading's "Rebalance with" visual) */}
        {card.computed && (
          <div className="flex sm:flex flex-col items-center shrink-0 pt-1 sm:pt-5">
            <div className="text-[0.6rem] text-zinc-500 uppercase tracking-wider mb-1">
              {card.status === 1 ? 'Grow with' : 'Rebalance with'}
            </div>
            <div className="text-zinc-500 text-xl leading-none mb-1">→</div>
            <CardImage
              transient={card.computed.targetId}
              status={1}
              cardName={card.computed.targetName}
              size="compact"
            />
            <div className="text-sm font-medium mt-2 text-center text-zinc-300">{card.computed.targetName}</div>
            {card.computed.pathway && (
              <div className="text-[0.6rem] text-zinc-500 uppercase tracking-wider">via {card.computed.pathway}</div>
            )}
          </div>
        )}
      </div>

      {/* Frame lens — what this position asks (the live page's lens chip box) */}
      {card.frameLens && (
        <div className={`mb-4 px-4 py-3 rounded-lg border ${houseColors.border.replace('/50', '/30')} bg-zinc-900/40`}>
          {card.frameLabel && <div className={`text-xs font-medium mb-1 ${houseColors.text}`}>● {card.frameLabel}</div>}
          <div className="text-xs text-zinc-400 leading-relaxed">{card.frameLens}</div>
        </div>
      )}

      {/* Interpretation Sections */}
      {interpretation && (
        <Section title="Reading" color="amber">
          {interpretation.summary && (
            <div className="text-base font-semibold text-amber-200/90 leading-relaxed mb-4 pb-4 border-b border-zinc-800/50">
              <MarkdownContent content={interpretation.summary} className="!text-amber-200/90 font-semibold text-base" />
            </div>
          )}
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
            {card.computed && card.status === 1 && (
              <div className="mb-4">
                <div className="flex items-center justify-center gap-6 sm:gap-10">
                  <div className="flex flex-col items-center">
                    <div className="text-[0.6rem] text-emerald-400/70 uppercase tracking-wider mb-1">{status?.name || 'Balanced'}</div>
                    <CardImage transient={card.transient} status={card.status} cardName={trans?.name} size="compact" />
                    <div className="text-xs text-zinc-300 mt-1">{trans?.name}</div>
                  </div>
                  <div className="text-zinc-500 text-xl">→</div>
                  <div className="flex flex-col items-center">
                    <div className="text-[0.6rem] text-emerald-400/70 uppercase tracking-wider mb-1">Growth Context</div>
                    <CardImage transient={card.computed.targetId} status={1} cardName={card.computed.targetName} size="compact" />
                    <div className="text-xs text-zinc-300 mt-1">{card.computed.targetName}</div>
                  </div>
                </div>
                <div className="text-xs text-emerald-400/60 italic text-center mt-2">
                  {card.frameLabel ? `${card.frameLabel}: ` : ''}Growth from {status?.prefix ? `${status.prefix} ` : 'Balanced '}{trans?.name}{card.position !== undefined && card.position !== null ? ` in ${ARCHETYPES[card.position]?.name}` : ''}
                </div>
              </div>
            )}
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
            {card.computed && card.status !== 1 && (
              <div className="mb-4">
                <div className="flex items-center justify-center gap-6 sm:gap-10">
                  <div className="flex flex-col items-center">
                    <div className={`text-[0.6rem] uppercase tracking-wider mb-1 ${STATUS_COLORS[card.status]?.split(' ')[0] || 'text-zinc-400'}`}>{status?.name || ''}</div>
                    <CardImage transient={card.transient} status={card.status} cardName={trans?.name} size="compact" />
                    <div className="text-xs text-zinc-300 mt-1">{trans?.name}</div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="text-zinc-500 text-xl">→</div>
                    {card.computed.pathway && <div className="text-[0.6rem] text-zinc-500 uppercase tracking-wider mt-1">{card.computed.pathway}</div>}
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="text-[0.6rem] text-emerald-400/70 uppercase tracking-wider mb-1">Rebalance with</div>
                    <CardImage transient={card.computed.targetId} status={1} cardName={card.computed.targetName} size="compact" />
                    <div className="text-xs text-zinc-300 mt-1">{card.computed.targetName}</div>
                  </div>
                </div>
                <div className="text-xs text-emerald-400/60 italic text-center mt-2">
                  {card.frameLabel ? `${card.frameLabel}: ` : ''}Rebalancing {status?.prefix ? `${status.prefix} ` : ''}{trans?.name}{card.position !== undefined && card.position !== null ? ` in ${ARCHETYPES[card.position]?.name}` : ''}
                </div>
              </div>
            )}
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
