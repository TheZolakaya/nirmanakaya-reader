// === MINIMAP MODAL COMPONENT ===
// Expandable popup showing full minimap with dynamic description
// Uses Portal to render at document root for proper fixed positioning

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Minimap from './Minimap.js';
import { ARCHETYPES } from '../../lib/archetypes.js';
import { getDetailedCardType } from '../../lib/cardImages.js';
import { getComponent } from '../../lib/corrections.js';
import { getGlossaryEntry } from '../../lib/glossary.js';

/**
 * MinimapModal - Shows an expanded minimap with contextual description
 *
 * The minimap represents the relationship between a card's identity (what it IS)
 * and its position (WHERE it's expressing). This modal explains that relationship.
 *
 * Uses a Portal to render at document.body level, ensuring fixed positioning
 * works correctly regardless of parent transforms or scroll containers.
 */
// Color themes for different modal contexts
const COLOR_THEMES = {
  violet: {
    gradient: 'linear-gradient(135deg, rgba(107, 77, 138, 0.15) 0%, rgba(13, 13, 26, 0.95) 50%, rgba(107, 77, 138, 0.15) 100%)',
    border: '2px solid rgba(107, 77, 138, 0.4)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 0 40px rgba(107, 77, 138, 0.15)',
    modalBorder: 'border-violet-500/30'
  },
  emerald: {
    gradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 46, 22, 0.3) 100%)',
    border: '2px solid rgba(16, 185, 129, 0.4)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 0 40px rgba(16, 185, 129, 0.15)',
    modalBorder: 'border-emerald-500/30'
  },
  teal: {
    gradient: 'linear-gradient(135deg, rgba(20, 184, 166, 0.1) 0%, rgba(5, 46, 46, 0.3) 100%)',
    border: '2px solid rgba(20, 184, 166, 0.4)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 0 40px rgba(20, 184, 166, 0.15)',
    modalBorder: 'border-teal-500/30'
  }
};

const MinimapModal = ({
  isOpen,
  onClose,
  onReopen,              // Callback to reopen this minimap (for back navigation)
  fromId,                // Card's home archetype
  toId,                  // Position archetype (where drawn)
  transient,             // Original card transient (for getting card info)
  cardType,              // 'archetype' | 'bound' | 'agent'
  boundIsInner,          // For bounds: inner (1-5) or outer (6-10)
  setSelectedInfo,       // For making terms clickable (fallback)
  navigateFromMinimap,   // For navigating to info with back support
  colorTheme = 'violet', // 'violet' | 'emerald' | 'teal'
  toCardType = null,     // For correction targets: 'archetype' | 'bound' | 'agent'
  toBoundIsInner = null, // For correction targets: inner bound or not
  toTransient = null,    // For corrections: the target card's transient ID (bound/agent)
  secondToId = null,           // Second destination archetype (correction/growth target)
  secondToCardType = null,     // Card type for second destination
  secondToBoundIsInner = null  // Inner/outer for second destination bounds
}) => {
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const theme = COLOR_THEMES[colorTheme] || COLOR_THEMES.violet;

  useEffect(() => {
    setMounted(true);
    // Check for mobile/narrow screens
    const checkMobile = () => setIsMobile(window.innerWidth < 500);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => {
      setMounted(false);
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  if (!isOpen || !mounted) return null;

  const fromArchetype = ARCHETYPES[fromId];
  const toArchetype = ARCHETYPES[toId];
  const card = getComponent(transient);

  // For corrections: get the actual target card (bound/agent) if provided
  const toCard = toTransient !== null ? getComponent(toTransient) : null;

  // Helper: navigate to info modal with back support
  // Uses navigateFromMinimap to push restore marker and show info
  const openInfo = (info) => {
    if (navigateFromMinimap && onReopen) {
      // Close this minimap
      onClose();
      // Navigate to info with minimap restore support
      navigateFromMinimap(info, onReopen);
    } else {
      // Fallback: just open info directly (no back support)
      onClose();
      setSelectedInfo?.(info);
    }
  };

  const fromType = getDetailedCardType(fromId);
  const toType = getDetailedCardType(toId);
  const cardDetailedType = getDetailedCardType(transient);
  // For corrections: use the target card's type, otherwise use the archetype's type
  const toDetailedType = toTransient !== null ? getDetailedCardType(toTransient) : toType;

  // Get glossary slug from detailed card type
  const getGlossarySlug = (detailedType) => {
    if (!detailedType) return null;
    if (detailedType.type === 'BOUND') {
      return detailedType.subtype === 'INNER' ? 'inner-bound' : 'outer-bound';
    }
    if (detailedType.type === 'AGENT') return 'agent';
    if (detailedType.type === 'ARCHETYPE') {
      if (detailedType.subtype === 'INGRESS') return 'ingress-portal';
      if (detailedType.subtype === 'EGRESS') return 'egress-portal';
      return detailedType.subtype === 'INNER' ? 'inner-archetype' : 'outer-archetype';
    }
    return null;
  };

  // Open glossary entry for a card type
  const openTypeGlossary = (detailedType) => {
    const slug = getGlossarySlug(detailedType);
    if (slug) {
      const entry = getGlossaryEntry(slug);
      if (entry) {
        openInfo({ type: 'glossary', id: slug, data: entry });
      }
    }
  };

  // Determine the nature of this placement
  const getPlacementNature = () => {
    if (!fromType || !toType) return null;

    const fromInner = fromType.subtype === 'INNER';
    const toInner = toType.subtype === 'INNER';
    const fromPortal = fromType.subtype === 'INGRESS' || fromType.subtype === 'EGRESS';
    const toPortal = toType.subtype === 'INGRESS' || toType.subtype === 'EGRESS';

    if (fromPortal || toPortal) {
      return {
        type: 'threshold',
        description: 'This placement involves a Portal — a threshold point where energy enters or exits the system. Portal placements often signal major transitions or turning points.'
      };
    }

    if (fromInner && toInner) {
      return {
        type: 'inner-inner',
        description: 'Inner to Inner: A cultivated capacity meeting an inner position. This is about internal development — building something within before it meets the world.'
      };
    }

    if (!fromInner && !toInner) {
      return {
        type: 'outer-outer',
        description: 'Outer to Outer: An emergent quality meeting an outer position. This is about expression meeting expression — transformation already in motion, engaging with active processes.'
      };
    }

    if (fromInner && !toInner) {
      return {
        type: 'inner-outer',
        description: 'Inner to Outer: A cultivated capacity meeting an outer position. The inner resource is being called to engage, to move from preparation into expression.'
      };
    }

    return {
      type: 'outer-inner',
      description: 'Outer to Inner: An emergent quality meeting an inner position. What usually transforms outwardly is being directed inward — a reflective or integrative moment.'
    };
  };

  const placement = getPlacementNature();

  // Build the dynamic description (uses "you" voice to make it personal)
  const buildDescription = () => {
    const cardName = card?.name || 'This card';
    const fromName = fromArchetype?.name || 'its home';
    const toName = toArchetype?.name || 'this position';

    let intro = '';
    if (cardType === 'archetype') {
      intro = `${cardName} is an archetype — a fundamental pattern of consciousness. You are expressing this pattern through your ${toName} position.`;
    } else if (cardType === 'bound') {
      const boundNature = boundIsInner ? 'inner' : 'outer';
      intro = `${cardName} is an ${boundNature} bound — ${boundIsInner ? 'capacity gathering before expression' : 'capacity already extending outward'}. You are expressing the energy of ${fromName} through this quality.`;
    } else if (cardType === 'agent') {
      intro = `${cardName} is an agent — a personified expression of channel energy through a specific role. You are embodying the archetype of ${fromName} through this role.`;
    }

    return intro;
  };

  // Handle backdrop click - only close if clicking directly on the backdrop
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div
        className={`bg-zinc-900 rounded-xl border ${theme.modalBorder} max-w-lg w-full max-h-[80vh] overflow-y-auto minimap-modal-scroll`}
        onClick={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
        style={{ overscrollBehavior: 'contain' }}
      >
        {/* Custom scrollbar styles matching InfoModal */}
        <style jsx>{`
          .minimap-modal-scroll::-webkit-scrollbar {
            width: 6px;
          }
          .minimap-modal-scroll::-webkit-scrollbar-track {
            background: transparent;
          }
          .minimap-modal-scroll::-webkit-scrollbar-thumb {
            background: rgba(63, 63, 70, 0.5);
            border-radius: 3px;
          }
          .minimap-modal-scroll::-webkit-scrollbar-thumb:hover {
            background: rgba(82, 82, 91, 0.7);
          }
        `}</style>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div>
            <h3 className="text-lg font-semibold text-zinc-100">Reading the Minimap</h3>
            <p className="text-xs text-zinc-500">The relationship between identity and position</p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 text-xl p-1"
          >
            ×
          </button>
        </div>

        {/* Expanded Minimap */}
        <div className="px-4 py-4 flex justify-center">
          <div
            className="rounded-xl overflow-hidden"
            style={{
              background: theme.gradient,
              border: theme.border,
              boxShadow: theme.boxShadow,
              padding: '16px'
            }}
          >
            <Minimap
              fromId={fromId}
              toId={toId}
              size={isMobile ? "lg" : "xl"}
              singleMode={true}
              fromCardType={cardType}
              boundIsInner={boundIsInner}
              toCardType={toCardType}
              toBoundIsInner={toBoundIsInner}
              secondToId={secondToId}
              secondToCardType={secondToCardType}
              secondToBoundIsInner={secondToBoundIsInner}
            />
          </div>
        </div>

        {/* Path Description */}
        <div className="px-6 pb-4 text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <span
              className="text-amber-300 font-medium cursor-pointer hover:underline decoration-dotted"
              onClick={() => {
                const data = getComponent(transient);
                openInfo({ type: 'card', id: transient, data });
              }}
            >
              {card?.name}
            </span>
            <span className="text-zinc-500">→</span>
            <span
              className="text-zinc-300 font-medium cursor-pointer hover:underline decoration-dotted"
              onClick={() => {
                // For corrections: click opens the target card, otherwise the archetype
                const targetId = toTransient !== null ? toTransient : toId;
                const data = getComponent(targetId);
                openInfo({ type: 'card', id: targetId, data });
              }}
            >
              {toCard?.name || toArchetype?.name}
            </span>
          </div>

          <div className="text-xs text-zinc-500 flex justify-center gap-2 mb-4">
            <span
              className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 cursor-pointer hover:bg-amber-500/30"
              onClick={() => openTypeGlossary(cardDetailedType)}
            >
              {cardDetailedType?.label}
            </span>
            <span>→</span>
            <span
              className="px-2 py-0.5 rounded bg-zinc-700 text-zinc-300 cursor-pointer hover:bg-zinc-600"
              onClick={() => openTypeGlossary(toDetailedType)}
            >
              {toDetailedType?.label}
            </span>
          </div>
        </div>

        {/* Explanation Section */}
        <div className="px-6 pb-6 space-y-4">
          {/* What the minimap represents */}
          <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50">
            <h4 className="text-xs font-medium text-violet-400 uppercase tracking-wider mb-2">
              What This Shows
            </h4>
            <p className="text-sm text-zinc-300 leading-relaxed">
              The minimap displays the geometric relationship between where a card <em>lives</em> in the architecture
              (its home archetype, shown highlighted) and where it's <em>expressing</em> in this reading (the position archetype).
              The animated arrow traces the path from identity to context.
            </p>
          </div>

          {/* Card-specific description */}
          <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50">
            <h4 className="text-xs font-medium text-amber-400 uppercase tracking-wider mb-2">
              This Placement
            </h4>
            <p className="text-sm text-zinc-300 leading-relaxed">
              {buildDescription()}
            </p>
          </div>

          {/* Position archetype description */}
          {toArchetype && (
            <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50">
              <h4 className="text-xs font-medium text-cyan-400 uppercase tracking-wider mb-2">
                In Your {toArchetype.name}
              </h4>
              <p className="text-sm text-zinc-300 leading-relaxed mb-2">
                {toArchetype.extended || toArchetype.description}
              </p>
              <p className="text-xs text-zinc-500 italic">
                This position shapes <em>how</em> the card's energy expresses — providing context, direction, and meaning.
              </p>
            </div>
          )}

          {/* The synthesis - how card + position creates meaning */}
          {card && toArchetype && (
            <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50">
              <h4 className="text-xs font-medium text-rose-400 uppercase tracking-wider mb-2">
                The Synthesis
              </h4>
              <p className="text-sm text-zinc-300 leading-relaxed">
                The interpretation emerges from this meeting: <span className="text-amber-300">{card.name}</span> (what you're working with)
                expressing through <span className="text-cyan-300">{toArchetype.name}</span> (where it's landing in your life).
                The card brings its essential quality; the position provides the arena of expression.
                Together they create something neither could alone — your specific invitation in this moment.
              </p>
            </div>
          )}

          {/* Placement nature */}
          {placement && (
            <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50">
              <h4 className="text-xs font-medium text-emerald-400 uppercase tracking-wider mb-2">
                The Dynamic
              </h4>
              <p className="text-sm text-zinc-300 leading-relaxed">
                {placement.description}
              </p>
            </div>
          )}

          {/* The five houses */}
          <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50">
            <h4 className="text-xs font-medium text-sky-400 uppercase tracking-wider mb-2">
              Reading the Map
            </h4>
            <p className="text-sm text-zinc-300 leading-relaxed mb-2">
              The map shows five Houses arranged around two Portals:
            </p>
            <ul className="text-xs text-zinc-400 space-y-1 ml-4">
              <li><span className="text-violet-300">Gestalt</span> (top center) — Integration and wholeness</li>
              <li><span className="text-green-300">Mind</span> (upper left) — Pattern and cognition</li>
              <li><span className="text-blue-300">Emotion</span> (upper right) — Connection and resonance</li>
              <li><span className="text-amber-300">Body</span> (lower left) — Structure and endurance</li>
              <li><span className="text-red-300">Spirit</span> (lower right) — Intent and aspiration</li>
            </ul>
            <p className="text-xs text-zinc-500 mt-2 italic">
              Shapes indicate channel: △ Intent, ○ Cognition, ☽ Resonance, □ Structure
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default MinimapModal;
