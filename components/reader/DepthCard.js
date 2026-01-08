// === DEPTH CARD COMPONENT ===
// Progressive depth card: Surface → Wade → Swim
// Handles both main card and nested Rebalancer

import { useState, useRef, useEffect } from 'react';
import { STATUSES, STATUS_INFO, STATUS_COLORS, HOUSES, HOUSE_COLORS } from '../../lib/constants.js';
import { ARCHETYPES } from '../../lib/archetypes.js';
import { getComponent } from '../../lib/corrections.js';
import { renderWithHotlinks } from '../../lib/hotlinks.js';
import ArchitectureBox from './ArchitectureBox.js';
import MirrorSection from './MirrorSection.js';

// Depth levels
const DEPTH = {
  COLLAPSED: 'collapsed',
  SURFACE: 'surface',
  WADE: 'wade',
  SWIM: 'swim'
};

// Animated content wrapper
const AnimatedContent = ({ isVisible, children }) => {
  const contentRef = useRef(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      setHeight(isVisible ? contentRef.current.scrollHeight : 0);
    }
  }, [isVisible, children]);

  return (
    <div
      className="overflow-hidden transition-all duration-300 ease-out"
      style={{ maxHeight: isVisible ? `${height + 50}px` : '0px', opacity: isVisible ? 1 : 0 }}
    >
      <div ref={contentRef}>
        {children}
      </div>
    </div>
  );
};

const DepthCard = ({
  cardData,  // { index, surface, wade, swim, architecture, mirror, rebalancer }
  draw,      // { transient, status, position }
  showTraditional = false,
  setSelectedInfo,
  spreadType = 'discover',
  spreadKey = 'one'
}) => {
  const [depth, setDepth] = useState(DEPTH.COLLAPSED);
  const [rebalancerDepth, setRebalancerDepth] = useState(DEPTH.COLLAPSED);

  const trans = getComponent(draw.transient);
  const stat = STATUSES[draw.status];
  const statusPrefix = stat?.prefix || 'Balanced';
  const isBalanced = draw.status === 1;
  const isReflect = spreadType === 'reflect';

  // Get position/frame label
  const posLabel = isReflect
    ? `Position ${cardData.index + 1}`
    : (draw.position !== null ? ARCHETYPES[draw.position]?.name : `Position ${cardData.index + 1}`);

  // Get house for coloring
  const house = isReflect
    ? 'Gestalt'
    : (draw.position !== null ? ARCHETYPES[draw.position]?.house : 'Gestalt');
  const houseColors = house ? HOUSE_COLORS[house] : null;

  // Helper to make terms clickable
  const ClickableTerm = ({ type, id, children, className = "" }) => (
    <span
      className={`cursor-pointer hover:underline decoration-dotted underline-offset-2 ${className}`}
      onClick={(e) => {
        e.stopPropagation();
        let data = null;
        if (type === 'card') data = getComponent(id);
        else if (type === 'status') data = STATUS_INFO[id];
        else if (type === 'house') data = HOUSES[id];
        setSelectedInfo?.({ type, id, data });
      }}
    >
      {children}
    </span>
  );

  // Get content for current depth
  const getContent = (d) => {
    switch (d) {
      case DEPTH.SURFACE: return cardData.surface;
      case DEPTH.WADE: return cardData.wade;
      case DEPTH.SWIM: return cardData.swim;
      default: return null;
    }
  };

  // Get rebalancer content for current depth
  const getRebalancerContent = (d) => {
    if (!cardData.rebalancer) return null;
    switch (d) {
      case DEPTH.SURFACE: return cardData.rebalancer.surface;
      case DEPTH.WADE: return cardData.rebalancer.wade;
      case DEPTH.SWIM: return cardData.rebalancer.swim;
      default: return null;
    }
  };

  const handleCardClick = () => {
    if (depth === DEPTH.COLLAPSED) {
      setDepth(DEPTH.SURFACE);
    }
  };

  const goDeeper = (e) => {
    e.stopPropagation();
    if (depth === DEPTH.SURFACE) setDepth(DEPTH.WADE);
    else if (depth === DEPTH.WADE) setDepth(DEPTH.SWIM);
  };

  const goShallower = (e) => {
    e.stopPropagation();
    if (depth === DEPTH.SWIM) setDepth(DEPTH.WADE);
    else if (depth === DEPTH.WADE) setDepth(DEPTH.SURFACE);
    else if (depth === DEPTH.SURFACE) setDepth(DEPTH.COLLAPSED);
  };

  const handleRebalancerClick = () => {
    if (rebalancerDepth === DEPTH.COLLAPSED) {
      setRebalancerDepth(DEPTH.SURFACE);
    }
  };

  const rebalancerGoDeeper = (e) => {
    e.stopPropagation();
    if (rebalancerDepth === DEPTH.SURFACE) setRebalancerDepth(DEPTH.WADE);
    else if (rebalancerDepth === DEPTH.WADE) setRebalancerDepth(DEPTH.SWIM);
  };

  const rebalancerGoShallower = (e) => {
    e.stopPropagation();
    if (rebalancerDepth === DEPTH.SWIM) setRebalancerDepth(DEPTH.WADE);
    else if (rebalancerDepth === DEPTH.WADE) setRebalancerDepth(DEPTH.SURFACE);
    else if (rebalancerDepth === DEPTH.SURFACE) setRebalancerDepth(DEPTH.COLLAPSED);
  };

  // Styling
  const getSectionStyle = () => {
    if (houseColors) {
      const softerBorder = houseColors.border.replace('/50', '/30');
      return `${houseColors.bg} ${softerBorder}`;
    }
    return 'bg-zinc-900/50 border-zinc-800/30';
  };

  const getBadgeStyle = () => {
    if (houseColors) return `${houseColors.bg} ${houseColors.text}`;
    return 'bg-zinc-800 text-zinc-400';
  };

  const depthLabel = {
    [DEPTH.COLLAPSED]: null,
    [DEPTH.SURFACE]: 'Surface',
    [DEPTH.WADE]: 'Wade',
    [DEPTH.SWIM]: 'Swim'
  };

  const content = getContent(depth);
  const showArchitecture = depth === DEPTH.WADE || depth === DEPTH.SWIM;
  const showMirror = depth === DEPTH.WADE || depth === DEPTH.SWIM;
  const canGoDeeper = depth !== DEPTH.SWIM && depth !== DEPTH.COLLAPSED;
  const canGoShallower = depth !== DEPTH.COLLAPSED;

  return (
    <div className={`rounded-xl border-2 p-5 mb-5 transition-all duration-300 ${getSectionStyle()}`}>
      {/* Card Header - always visible */}
      <div
        className={`flex flex-col gap-1 cursor-pointer group ${depth !== DEPTH.COLLAPSED ? 'mb-3' : ''}`}
        onClick={handleCardClick}
      >
        <div className="flex items-center gap-2 flex-wrap">
          {/* Collapse chevron */}
          <span
            className={`text-xs transition-transform duration-200 ${depth === DEPTH.COLLAPSED ? 'text-zinc-500 group-hover:text-zinc-400' : 'text-emerald-500'}`}
            style={{ transform: depth === DEPTH.COLLAPSED ? 'rotate(-90deg)' : 'rotate(0deg)' }}
          >
            ▼
          </span>

          <span className={`text-xs px-2 py-0.5 rounded-full ${getBadgeStyle()}`}>
            Reading
          </span>

          {/* Card label with clickable terms */}
          <span className={houseColors?.text || 'text-zinc-300'}>
            <ClickableTerm type="status" id={draw.status} className={STATUS_COLORS[draw.status]?.split(' ')[0]}>
              {statusPrefix}
            </ClickableTerm>
            {' '}
            <ClickableTerm type="card" id={draw.transient} className="text-amber-300/90">
              {trans?.name}
            </ClickableTerm>
            {' in your '}
            <ClickableTerm type={isReflect ? "house" : "card"} id={isReflect ? house : draw.position}>
              {posLabel}
            </ClickableTerm>
          </span>

          {/* Depth indicator or tap hint */}
          {depth === DEPTH.COLLAPSED ? (
            <span className="ml-auto text-[0.6rem] text-zinc-600 group-hover:text-zinc-500 uppercase tracking-wider transition-colors">
              tap to explore
            </span>
          ) : depthLabel[depth] && (
            <span className="ml-auto text-[0.6rem] text-zinc-500 uppercase tracking-wider">
              {depthLabel[depth]}
            </span>
          )}
        </div>

        {showTraditional && trans?.traditional && depth !== DEPTH.COLLAPSED && (
          <span className="text-xs text-zinc-500 ml-6">{trans.traditional}</span>
        )}
      </div>

      {/* Main Content */}
      {depth !== DEPTH.COLLAPSED && (
        <div className="leading-relaxed text-sm mb-4 whitespace-pre-wrap text-zinc-300 animate-fadeIn">
          {content ? (
            renderWithHotlinks(content, setSelectedInfo)
          ) : (
            <span className="text-zinc-500 italic">Content loading...</span>
          )}
        </div>
      )}

      {/* Depth navigation */}
      {depth !== DEPTH.COLLAPSED && (
        <div className="flex items-center gap-3 mb-4">
          {canGoShallower && (
            <button
              onClick={goShallower}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              ← Less
            </button>
          )}
          {canGoDeeper && (
            <button
              onClick={goDeeper}
              className="text-xs text-amber-500/70 hover:text-amber-400 transition-colors"
            >
              Go deeper →
            </button>
          )}
        </div>
      )}

      {/* Mirror Section */}
      {showMirror && cardData.mirror && (
        <MirrorSection
          content={cardData.mirror}
          isBalanced={isBalanced}
          className="mb-4"
        />
      )}

      {/* Architecture Box */}
      {showArchitecture && cardData.architecture && (
        <ArchitectureBox
          content={cardData.architecture}
          className="mb-4"
        />
      )}

      {/* Rebalancer Section (for imbalanced cards) */}
      {depth !== DEPTH.COLLAPSED && cardData.rebalancer && (
        <div className="mt-4 ml-4 rounded-lg border-2 border-emerald-500/30 bg-emerald-950/20 p-4">
          {/* Rebalancer Header */}
          <div
            className={`flex items-center gap-2 cursor-pointer group ${rebalancerDepth !== DEPTH.COLLAPSED ? 'mb-3' : ''}`}
            onClick={handleRebalancerClick}
          >
            <span
              className={`text-xs transition-transform duration-200 ${rebalancerDepth === DEPTH.COLLAPSED ? 'text-zinc-500 group-hover:text-zinc-400' : 'text-emerald-500'}`}
              style={{ transform: rebalancerDepth === DEPTH.COLLAPSED ? 'rotate(-90deg)' : 'rotate(0deg)' }}
            >
              ▼
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300">
              Rebalancer
            </span>
            <span className="text-sm font-medium text-emerald-400">
              Path to Balance
            </span>
            {/* Depth indicator or tap hint */}
            {rebalancerDepth === DEPTH.COLLAPSED ? (
              <span className="ml-auto text-[0.6rem] text-zinc-600 group-hover:text-zinc-500 uppercase tracking-wider transition-colors">
                tap to explore
              </span>
            ) : depthLabel[rebalancerDepth] && (
              <span className="ml-auto text-[0.6rem] text-zinc-500 uppercase tracking-wider">
                {depthLabel[rebalancerDepth]}
              </span>
            )}
          </div>

          {/* Rebalancer Content */}
          {rebalancerDepth !== DEPTH.COLLAPSED && (
            <>
              <div className="leading-relaxed text-sm mb-4 whitespace-pre-wrap text-emerald-100/90 animate-fadeIn">
                {getRebalancerContent(rebalancerDepth) ? (
                  renderWithHotlinks(getRebalancerContent(rebalancerDepth), setSelectedInfo)
                ) : (
                  <span className="text-emerald-500/50 italic">Content loading...</span>
                )}
              </div>

              {/* Rebalancer depth navigation */}
              <div className="flex items-center gap-3 mb-4">
                {rebalancerDepth !== DEPTH.COLLAPSED && (
                  <button
                    onClick={rebalancerGoShallower}
                    className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    ← Less
                  </button>
                )}
                {rebalancerDepth !== DEPTH.SWIM && rebalancerDepth !== DEPTH.COLLAPSED && (
                  <button
                    onClick={rebalancerGoDeeper}
                    className="text-xs text-emerald-500/70 hover:text-emerald-400 transition-colors"
                  >
                    Go deeper →
                  </button>
                )}
              </div>

              {/* Rebalancer Architecture */}
              {(rebalancerDepth === DEPTH.WADE || rebalancerDepth === DEPTH.SWIM) && cardData.rebalancer.architecture && (
                <ArchitectureBox
                  content={cardData.rebalancer.architecture}
                  isRebalancer={true}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default DepthCard;
