// === DEPTH CARD COMPONENT ===
// Progressive depth card: Surface → Wade → Swim
// Handles both main card and nested Rebalancer

import { useState, useRef, useEffect } from 'react';
import { STATUSES, STATUS_INFO, STATUS_COLORS, HOUSES, HOUSE_COLORS } from '../../lib/constants.js';
import { ARCHETYPES } from '../../lib/archetypes.js';
import { EXPANSION_PROMPTS } from '../../lib/prompts.js';
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

// WHY depth levels (includes DEEP)
const WHY_DEPTH = {
  COLLAPSED: 'collapsed',
  SURFACE: 'surface',
  WADE: 'wade',
  SWIM: 'swim',
  DEEP: 'deep'
};

const DepthCard = ({
  cardData,  // { index, surface, wade, swim, architecture, mirror, rebalancer, why }
  draw,      // { transient, status, position }
  showTraditional = false,
  setSelectedInfo,
  spreadType = 'discover',
  spreadKey = 'one',
  // Expansion props
  onExpand,
  expansions = {},
  expanding,
  // Thread props
  threadData = [],
  threadOperation,
  threadContext,
  onSetThreadOperation,
  onSetThreadContext,
  onContinueThread,
  threadLoading = false,
  collapsedThreads = {},
  setCollapsedThreads,
  question = ''
}) => {
  const [depth, setDepth] = useState(DEPTH.COLLAPSED);
  const [rebalancerDepth, setRebalancerDepth] = useState(DEPTH.COLLAPSED);
  const [isWhyCollapsed, setIsWhyCollapsed] = useState(true);
  const [whyDepth, setWhyDepth] = useState(WHY_DEPTH.SURFACE);

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

  // Triangle click toggles collapse state
  const toggleCollapse = (e) => {
    e.stopPropagation();
    if (depth === DEPTH.COLLAPSED) {
      setDepth(DEPTH.SURFACE);
    } else {
      setDepth(DEPTH.COLLAPSED);
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

  // Rebalancer triangle click toggles collapse state
  const toggleRebalancerCollapse = (e) => {
    e.stopPropagation();
    if (rebalancerDepth === DEPTH.COLLAPSED) {
      setRebalancerDepth(DEPTH.SURFACE);
    } else {
      setRebalancerDepth(DEPTH.COLLAPSED);
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

  // Expansion handling
  const sectionKey = `card-${cardData.index}`;
  const sectionExpansions = expansions[sectionKey] || {};
  const isExpanding = expanding?.section === sectionKey;

  const getButtonStyle = (hasExpansion, isThisExpanding, isExpandingOther) => {
    return `text-xs px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
      hasExpansion
        ? 'bg-zinc-700 text-zinc-200 border border-zinc-600'
        : 'bg-zinc-800/50 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
    } ${isExpandingOther ? 'opacity-50 cursor-not-allowed' : ''}`;
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
          {/* Collapse chevron - click to toggle */}
          <span
            onClick={toggleCollapse}
            className={`text-xs transition-transform duration-200 cursor-pointer ${depth === DEPTH.COLLAPSED ? 'text-red-500 group-hover:text-red-400' : 'text-emerald-500 hover:text-emerald-400'}`}
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

      {/* Expansion Buttons - appear at every depth level */}
      {depth !== DEPTH.COLLAPSED && onExpand && (
        <div className="flex gap-2 flex-wrap mb-4">
          {Object.entries(EXPANSION_PROMPTS).map(([key, { label }]) => {
            const isThisExpanding = isExpanding && expanding?.type === key;
            const hasExpansion = !!sectionExpansions[key];
            const isExpandingOther = isExpanding && !isThisExpanding;

            return (
              <button
                key={key}
                onClick={(e) => { e.stopPropagation(); onExpand(sectionKey, key); }}
                disabled={isExpanding}
                className={getButtonStyle(hasExpansion, isThisExpanding, isExpandingOther)}
              >
                {isThisExpanding && (
                  <span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></span>
                )}
                {label}
              </button>
            );
          })}
        </div>
      )}

      {/* Expansion Content Display */}
      {depth !== DEPTH.COLLAPSED && Object.entries(sectionExpansions).map(([key, expansionContent]) => (
        expansionContent && (
          <div key={key} className="mb-4 p-3 bg-zinc-800/30 rounded-lg border border-zinc-700/30 animate-fadeIn">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-zinc-500 uppercase tracking-wider">{EXPANSION_PROMPTS[key]?.label}</span>
              <button
                onClick={(e) => { e.stopPropagation(); onExpand(sectionKey, key); }}
                className="text-xs text-zinc-500 hover:text-zinc-300"
              >
                ✕
              </button>
            </div>
            <div className="text-sm text-zinc-300 whitespace-pre-wrap">
              {renderWithHotlinks(expansionContent, setSelectedInfo)}
            </div>
          </div>
        )
      ))}

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
              onClick={toggleRebalancerCollapse}
              className={`text-xs transition-transform duration-200 cursor-pointer ${rebalancerDepth === DEPTH.COLLAPSED ? 'text-red-500 group-hover:text-red-400' : 'text-emerald-500 hover:text-emerald-400'}`}
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

      {/* THE WHY Group - collapsed by default, contains Mirror + Words to the Why */}
      {depth !== DEPTH.COLLAPSED && (cardData.mirror || cardData.why) && (
        <div className="mt-4 rounded-lg border-2 border-cyan-500/30 bg-cyan-950/20 p-4">
          {/* THE WHY Header - clickable to expand */}
          <div
            className={`flex items-center gap-2 cursor-pointer group ${!isWhyCollapsed ? 'mb-4' : ''}`}
            onClick={(e) => { e.stopPropagation(); setIsWhyCollapsed(!isWhyCollapsed); }}
          >
            <span
              className={`text-xs transition-transform duration-200 cursor-pointer ${isWhyCollapsed ? 'text-red-500 group-hover:text-red-400' : 'text-emerald-500 hover:text-emerald-400'}`}
              style={{ transform: isWhyCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
            >
              ▼
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/30 text-cyan-300">
              The Why
            </span>
            <span className="text-sm font-medium text-cyan-400">
              Teleological Reflection
            </span>
            {isWhyCollapsed && (
              <span className="ml-auto text-[0.6rem] text-zinc-600 group-hover:text-zinc-500 uppercase tracking-wider transition-colors">
                tap to explore
              </span>
            )}
          </div>

          {/* THE WHY Content - expanded */}
          {!isWhyCollapsed && (
            <>
              {/* THE MIRROR - single poetic reflection, no depth navigation */}
              {cardData.mirror && (
                <div className="mb-4">
                  <MirrorSection
                    content={cardData.mirror}
                    isBalanced={isBalanced}
                    className="border-0 bg-transparent p-0"
                  />
                </div>
              )}

              {/* WORDS TO THE WHY - 4 depth levels */}
              {cardData.why && (cardData.why.surface || cardData.why.wade || cardData.why.swim || cardData.why.deep) && (
                <div className="border-t border-cyan-700/30 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-cyan-400/70 uppercase tracking-wider">
                      Words to the Why
                    </span>
                    {/* Depth navigation buttons for WHY */}
                    <div className="flex gap-1">
                      {['surface', 'wade', 'swim', 'deep'].map((level) => {
                        const hasContent = cardData.why[level];
                        if (!hasContent) return null;
                        const isActive = whyDepth === level;
                        return (
                          <button
                            key={level}
                            onClick={(e) => { e.stopPropagation(); setWhyDepth(level); }}
                            className={`px-2 py-0.5 text-xs rounded transition-colors ${
                              isActive
                                ? 'bg-cyan-500 text-white'
                                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300'
                            }`}
                          >
                            {level.charAt(0).toUpperCase() + level.slice(1)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* WHY Content at current depth */}
                  <div className="text-sm text-cyan-100/90 whitespace-pre-wrap mb-4">
                    {cardData.why[whyDepth] ? (
                      renderWithHotlinks(cardData.why[whyDepth], setSelectedInfo)
                    ) : (
                      <span className="text-cyan-500/50 italic">Content loading...</span>
                    )}
                  </div>

                  {/* WHY Architecture Box - collapsed */}
                  {cardData.why.architecture && (
                    <ArchitectureBox
                      content={cardData.why.architecture}
                      label="Why Architecture"
                    />
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Reflect/Forge Buttons - at bottom of card when expanded */}
      {depth !== DEPTH.COLLAPSED && onContinueThread && (
        <div className="mt-4 pt-4 border-t border-zinc-700/30">
          {/* Collapsed state: show [▶ Reflect] [▶ Forge] buttons */}
          {!threadOperation && (
            <div className="flex justify-center gap-3">
              <button
                onClick={(e) => { e.stopPropagation(); onSetThreadOperation('reflect'); }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:text-zinc-200 hover:border-zinc-600 flex items-center gap-1.5"
              >
                <span className="text-[0.5rem] text-red-500">▶</span> Reflect
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onSetThreadOperation('forge'); }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:text-zinc-200 hover:border-zinc-600 flex items-center gap-1.5"
              >
                <span className="text-[0.5rem] text-red-500">▶</span> Forge
              </button>
            </div>
          )}

          {/* Expanded state: full input panel */}
          {threadOperation && (
            <div className="max-w-sm mx-auto">
              <div className="flex justify-center gap-3 mb-3">
                <button
                  onClick={(e) => { e.stopPropagation(); onSetThreadOperation('reflect'); }}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    threadOperation === 'reflect'
                      ? 'bg-sky-900/60 text-sky-300 border-2 border-sky-500/60'
                      : 'bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:text-zinc-200 hover:border-zinc-600'
                  }`}
                >
                  ↩ Reflect
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onSetThreadOperation('forge'); }}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    threadOperation === 'forge'
                      ? 'bg-orange-900/60 text-orange-300 border-2 border-orange-500/60'
                      : 'bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:text-zinc-200 hover:border-zinc-600'
                  }`}
                >
                  ⚡ Forge
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onSetThreadOperation(null); }}
                  className="px-2 py-2 rounded-lg text-xs text-zinc-500 hover:text-zinc-300 transition-all"
                  title="Cancel"
                >
                  ✕
                </button>
              </div>

              <textarea
                value={threadContext || ''}
                onChange={(e) => onSetThreadContext(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder={threadOperation === 'reflect' ? "What are you inquiring about?" : "What are you declaring or creating?"}
                rows={2}
                className="w-full bg-zinc-900/50 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors resize-none mb-3"
              />

              <button
                onClick={(e) => { e.stopPropagation(); onContinueThread(); }}
                disabled={!threadOperation || threadLoading}
                className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  threadOperation && !threadLoading
                    ? 'bg-[#052e23] text-[#f59e0b] hover:bg-[#064e3b] border border-emerald-700/50'
                    : 'bg-zinc-900 text-zinc-600 cursor-not-allowed'
                }`}
              >
                {threadLoading ? (
                  <>
                    <span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></span>
                    Drawing...
                  </>
                ) : (
                  'Continue'
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DepthCard;
