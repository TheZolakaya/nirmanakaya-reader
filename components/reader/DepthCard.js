// === DEPTH CARD COMPONENT ===
// Progressive depth card: Surface → Wade → Swim
// Handles both main card and nested Rebalancer

import { useState, useRef, useEffect } from 'react';
import { STATUSES, STATUS_INFO, STATUS_COLORS, HOUSES, HOUSE_COLORS } from '../../lib/constants.js';
import { ARCHETYPES } from '../../lib/archetypes.js';
import { REFLECT_SPREADS } from '../../lib/spreads.js';
import { EXPANSION_PROMPTS } from '../../lib/prompts.js';
import { getComponent } from '../../lib/corrections.js';
import { renderWithHotlinks } from '../../lib/hotlinks.js';
import { ensureParagraphBreaks } from '../../lib/utils.js';
import ArchitectureBox from './ArchitectureBox.js';
import MirrorSection from './MirrorSection.js';
import MobileDepthStepper from './MobileDepthStepper.js';

// Depth levels (now includes SHALLOW as default and DEEP for all sections)
const DEPTH = {
  COLLAPSED: 'collapsed',
  SHALLOW: 'shallow',  // 1-2 sentence summary derived from Wade
  SURFACE: 'surface',
  WADE: 'wade',
  SWIM: 'swim',
  DEEP: 'deep'
};

// Helper to extract shallow content (1-2 sentences) from wade content
const getShallowContent = (wadeContent) => {
  if (!wadeContent) return '';
  // Split on sentence-ending punctuation followed by space
  // This regex captures .!? followed by whitespace (but not abbreviations like "Dr." usually)
  const sentences = wadeContent.split(/(?<=[.!?])\s+/);
  // Return first 2 sentences
  return sentences.slice(0, 2).join(' ');
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

// Pulsating loader with cycling messages
const PulsatingLoader = ({ color = 'text-amber-400' }) => {
  const [messageIndex, setMessageIndex] = useState(0);

  const messages = [
    "Consulting the field...",
    "Weaving patterns...",
    "Finding connections...",
    "Almost there..."
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % messages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className={`font-medium animate-pulse ${color}`}>
      {messages[messageIndex]}
    </span>
  );
};

// WHY depth levels (includes SHALLOW and DEEP)
const WHY_DEPTH = {
  COLLAPSED: 'collapsed',
  SHALLOW: 'shallow',  // 1-2 sentence summary derived from Wade
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
  question = '',
  sectionKey = '',  // For thread scroll targeting
  // On-demand loading props
  isLoading = false,
  isNotLoaded = false,
  onRequestLoad,
  // Progressive deepening props
  onLoadDeeper,        // (cardIndex, targetDepth, previousContent) => Promise
  isLoadingDeeper = false
}) => {
  const [depth, setDepth] = useState(DEPTH.COLLAPSED);
  const [rebalancerDepth, setRebalancerDepth] = useState(DEPTH.COLLAPSED);
  const [growthDepth, setGrowthDepth] = useState(DEPTH.COLLAPSED); // For balanced cards' Growth Opportunity
  const [isWhyCollapsed, setIsWhyCollapsed] = useState(true);
  const [whyDepth, setWhyDepth] = useState(WHY_DEPTH.SHALLOW); // Default to SHALLOW (1-2 sentences)
  const [collapsedExpansions, setCollapsedExpansions] = useState({}); // Track collapsed state per expansion type

  // Independent loading states for each section
  const [cardLoadingDeeper, setCardLoadingDeeper] = useState(false);
  const [rebalancerLoadingDeeper, setRebalancerLoadingDeeper] = useState(false);
  const [growthLoadingDeeper, setGrowthLoadingDeeper] = useState(false); // For balanced cards' Growth Opportunity
  const [whyLoadingDeeper, setWhyLoadingDeeper] = useState(false);

  // Mobile detection for abbreviated depth labels (FR20)
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 480);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Mobile-aware depth labels: S/W/Sw/D on mobile, full text on desktop
  const getDepthLabel = (level) => {
    if (!isMobile) return level.charAt(0).toUpperCase() + level.slice(1);
    const abbrev = { shallow: 'S', wade: 'W', swim: 'Sw', deep: 'D' };
    return abbrev[level] || level.charAt(0).toUpperCase();
  };

  const trans = getComponent(draw.transient);
  const stat = STATUSES[draw.status];
  const statusPrefix = stat?.prefix || 'Balanced';
  const isBalanced = draw.status === 1;
  const isReflect = spreadType === 'reflect';

  // Get position/frame label - use spread position names for Reflect mode
  const spreadConfig = isReflect ? REFLECT_SPREADS[spreadKey] : null;
  const posLabel = isReflect
    ? (spreadConfig?.positions?.[cardData.index]?.name || `Position ${cardData.index + 1}`)
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

  // Get content for current depth (with fallback chain, now includes DEEP)
  // Helper to check for actual content (not empty string)
  const hasContentValue = (val) => val != null && val !== '';

  const getContent = (d) => {
    // Try requested depth first, then fall back in order
    switch (d) {
      case DEPTH.SHALLOW:
        // Shallow derives from Wade content - first 1-2 sentences
        if (hasContentValue(cardData.wade)) return getShallowContent(cardData.wade);
        if (hasContentValue(cardData.swim)) return getShallowContent(cardData.swim);
        if (hasContentValue(cardData.deep)) return getShallowContent(cardData.deep);
        return '';
      case DEPTH.SURFACE:
        if (hasContentValue(cardData.surface)) return cardData.surface;
        if (hasContentValue(cardData.wade)) return cardData.wade;
        if (hasContentValue(cardData.swim)) return cardData.swim;
        if (hasContentValue(cardData.deep)) return cardData.deep;
        return '';
      case DEPTH.WADE:
        if (hasContentValue(cardData.wade)) return cardData.wade;
        if (hasContentValue(cardData.swim)) return cardData.swim;
        if (hasContentValue(cardData.deep)) return cardData.deep;
        return '';
      case DEPTH.SWIM:
        if (hasContentValue(cardData.swim)) return cardData.swim;
        if (hasContentValue(cardData.wade)) return cardData.wade;
        if (hasContentValue(cardData.deep)) return cardData.deep;
        return '';
      case DEPTH.DEEP:
        if (hasContentValue(cardData.deep)) return cardData.deep;
        if (hasContentValue(cardData.swim)) return cardData.swim;
        if (hasContentValue(cardData.wade)) return cardData.wade;
        return '';
      default:
        if (hasContentValue(cardData.wade)) return cardData.wade;
        if (hasContentValue(cardData.swim)) return cardData.swim;
        if (hasContentValue(cardData.deep)) return cardData.deep;
        return '';
    }
  };

  // Get rebalancer content for current depth (exact match only - no fallback)
  const getRebalancerContent = (d) => {
    if (!cardData.rebalancer) return null;
    const r = cardData.rebalancer;
    // Helper to check for actual content (not empty string)
    const hasContent = (val) => val != null && val !== '';
    // Return exact depth content only - no fallback to avoid UI/content mismatch
    switch (d) {
      case DEPTH.SHALLOW:
        // Shallow derives from wade - first 1-2 sentences
        return hasContent(r.wade) ? getShallowContent(r.wade) : null;
      case DEPTH.SURFACE:
        return hasContent(r.surface) ? r.surface : null;
      case DEPTH.WADE:
        return hasContent(r.wade) ? r.wade : null;
      case DEPTH.SWIM:
        return hasContent(r.swim) ? r.swim : null;
      case DEPTH.DEEP:
        return hasContent(r.deep) ? r.deep : null;
      default:
        return hasContent(r.wade) ? r.wade : null;
    }
  };

  const handleCardClick = () => {
    if (depth === DEPTH.COLLAPSED) {
      setDepth(DEPTH.SHALLOW); // Start at SHALLOW (1-2 sentence summary)
      // Trigger on-demand load if content not yet fetched
      if (isNotLoaded && onRequestLoad) {
        onRequestLoad();
      }
    }
  };

  // Triangle click toggles collapse state
  const toggleCollapse = (e) => {
    e.stopPropagation();
    if (depth === DEPTH.COLLAPSED) {
      setDepth(DEPTH.SHALLOW); // Start at SHALLOW (1-2 sentence summary)
      // Trigger on-demand load if content not yet fetched
      if (isNotLoaded && onRequestLoad) {
        onRequestLoad();
      }
    } else {
      setDepth(DEPTH.COLLAPSED);
    }
  };

  const goDeeper = async (e) => {
    e.stopPropagation();

    // Determine target depth (SHALLOW → WADE → SWIM → DEEP)
    let targetDepth = null;
    if (depth === DEPTH.SHALLOW) targetDepth = DEPTH.WADE;
    else if (depth === DEPTH.WADE) targetDepth = DEPTH.SWIM;
    else if (depth === DEPTH.SWIM) targetDepth = DEPTH.DEEP;

    if (!targetDepth) return;

    // Check if content exists at target depth
    const hasContent = cardData[targetDepth] && cardData[targetDepth].trim();

    if (hasContent) {
      // Content exists, just switch to it
      setDepth(targetDepth);
    } else if (onLoadDeeper && !isLoadingDeeper) {
      // Need to fetch content - build previousContent for API
      const previousContent = {
        reading: { wade: cardData.wade || '', swim: cardData.swim || '' },
        why: { wade: cardData.why?.wade || '', swim: cardData.why?.swim || '' },
        rebalancer: cardData.rebalancer ? { wade: cardData.rebalancer.wade || '', swim: cardData.rebalancer.swim || '' } : null,
        architecture: cardData.architecture || '',
        mirror: cardData.mirror || ''
      };

      // Call the API to generate deeper content
      await onLoadDeeper(cardData.index, targetDepth, previousContent);
      setDepth(targetDepth);
    } else {
      // No loader available, just switch (content may be empty but UI will show something)
      setDepth(targetDepth);
    }
  };

  const goShallower = (e) => {
    e.stopPropagation();
    if (depth === DEPTH.DEEP) setDepth(DEPTH.SWIM);
    else if (depth === DEPTH.SWIM) setDepth(DEPTH.WADE);
    else if (depth === DEPTH.WADE) setDepth(DEPTH.SHALLOW);
    else if (depth === DEPTH.SHALLOW) setDepth(DEPTH.COLLAPSED);
  };

  // Find first available rebalancer depth (shallow preferred - derived from wade)
  const getFirstRebalancerDepth = () => {
    const r = cardData.rebalancer;
    if (!r) return DEPTH.SHALLOW;
    // Shallow is derived from wade, so if wade exists, shallow exists
    if (hasContentValue(r.wade)) return DEPTH.SHALLOW;
    if (hasContentValue(r.swim)) return DEPTH.SWIM;
    if (hasContentValue(r.deep)) return DEPTH.DEEP;
    return DEPTH.SHALLOW; // Default to shallow
  };

  const handleRebalancerClick = () => {
    if (rebalancerDepth === DEPTH.COLLAPSED) {
      setRebalancerDepth(getFirstRebalancerDepth());
    }
  };

  // Rebalancer triangle click toggles collapse state
  const toggleRebalancerCollapse = (e) => {
    e.stopPropagation();
    if (rebalancerDepth === DEPTH.COLLAPSED) {
      setRebalancerDepth(getFirstRebalancerDepth());
    } else {
      setRebalancerDepth(DEPTH.COLLAPSED);
    }
  };

  const rebalancerGoDeeper = (e) => {
    e.stopPropagation();
    if (rebalancerDepth === DEPTH.SHALLOW) setRebalancerDepth(DEPTH.WADE);
    else if (rebalancerDepth === DEPTH.WADE) setRebalancerDepth(DEPTH.SWIM);
    else if (rebalancerDepth === DEPTH.SWIM) setRebalancerDepth(DEPTH.DEEP);
  };

  const rebalancerGoShallower = (e) => {
    e.stopPropagation();
    if (rebalancerDepth === DEPTH.DEEP) setRebalancerDepth(DEPTH.SWIM);
    else if (rebalancerDepth === DEPTH.SWIM) setRebalancerDepth(DEPTH.WADE);
    else if (rebalancerDepth === DEPTH.WADE) setRebalancerDepth(DEPTH.SHALLOW);
    else if (rebalancerDepth === DEPTH.SHALLOW) setRebalancerDepth(DEPTH.COLLAPSED);
  };

  // Get growth content for current depth (exact match only - no fallback)
  const getGrowthContent = (d) => {
    if (!cardData.growth) return null;
    const g = cardData.growth;
    // Helper to check for actual content (not empty string)
    const hasContent = (val) => val != null && val !== '';
    // Return exact depth content only - no fallback to avoid UI/content mismatch
    switch (d) {
      case DEPTH.SHALLOW:
        // Shallow derives from wade - first 1-2 sentences
        return hasContent(g.wade) ? getShallowContent(g.wade) : null;
      case DEPTH.SURFACE:
        return hasContent(g.surface) ? g.surface : null;
      case DEPTH.WADE:
        return hasContent(g.wade) ? g.wade : null;
      case DEPTH.SWIM:
        return hasContent(g.swim) ? g.swim : null;
      case DEPTH.DEEP:
        return hasContent(g.deep) ? g.deep : null;
      default:
        return hasContent(g.wade) ? g.wade : null;
    }
  };

  // Find first available growth depth (shallow preferred - derived from wade)
  const getFirstGrowthDepth = () => {
    const g = cardData.growth;
    if (!g) return DEPTH.SHALLOW;
    // Shallow is derived from wade, so if wade exists, shallow exists
    if (hasContentValue(g.wade)) return DEPTH.SHALLOW;
    if (hasContentValue(g.swim)) return DEPTH.SWIM;
    if (hasContentValue(g.deep)) return DEPTH.DEEP;
    return DEPTH.SHALLOW; // Default to shallow
  };

  const handleGrowthClick = () => {
    if (growthDepth === DEPTH.COLLAPSED) {
      setGrowthDepth(getFirstGrowthDepth());
    }
  };

  // Growth triangle click toggles collapse state
  const toggleGrowthCollapse = (e) => {
    e.stopPropagation();
    if (growthDepth === DEPTH.COLLAPSED) {
      setGrowthDepth(getFirstGrowthDepth());
    } else {
      setGrowthDepth(DEPTH.COLLAPSED);
    }
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
    [DEPTH.SHALLOW]: 'Shallow',
    [DEPTH.SURFACE]: 'Surface',
    [DEPTH.WADE]: 'Wade',
    [DEPTH.SWIM]: 'Swim',
    [DEPTH.DEEP]: 'Deep'
  };

  // Expansion handling
  const expansionKey = `card-${cardData.index}`;
  const sectionExpansions = expansions[expansionKey] || {};
  const isExpanding = expanding?.section === expansionKey;

  const getButtonStyle = (hasExpansion, isThisExpanding, isExpandingOther) => {
    return `text-xs px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
      hasExpansion
        ? 'bg-zinc-700 text-zinc-200 border border-zinc-600'
        : 'bg-zinc-800/50 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
    } ${isExpandingOther ? 'opacity-50 cursor-not-allowed' : ''}`;
  };

  const content = getContent(depth);
  const canGoDeeper = depth !== DEPTH.DEEP && depth !== DEPTH.COLLAPSED;
  const canGoShallower = depth !== DEPTH.COLLAPSED;

  // State for card architecture section (collapsed by default)
  const [isArchCollapsed, setIsArchCollapsed] = useState(true);

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

          {/* Depth navigation - desktop inline, mobile below */}
          {depth === DEPTH.COLLAPSED ? (
            <span className="ml-auto text-[0.6rem] text-zinc-600 group-hover:text-zinc-500 uppercase tracking-wider transition-colors">
              tap to explore
            </span>
          ) : cardLoadingDeeper ? (
            <span className="ml-auto text-xs"><PulsatingLoader color="text-amber-400" /></span>
          ) : !isMobile && (
            /* Desktop: Button row inline */
            <div className="ml-auto flex-shrink-0 flex gap-1" onClick={(e) => e.stopPropagation()}>
              {['shallow', 'wade', 'swim', 'deep'].map((level) => {
                const hasContent = level === 'shallow' ? cardData.wade
                  : level === 'wade' ? cardData.wade
                  : level === 'swim' ? cardData.swim
                  : cardData.deep;
                const isActive = depth === level;

                const handleClick = async (e) => {
                  e.stopPropagation();
                  if (level === 'shallow' || level === 'wade') {
                    if (cardData.wade) setDepth(level);
                    return;
                  }
                  if (hasContent) {
                    setDepth(level);
                  } else if (onLoadDeeper && !cardLoadingDeeper) {
                    setCardLoadingDeeper(true);
                    const previousContent = {
                      reading: { wade: cardData.wade || '', swim: cardData.swim || '' },
                      why: { wade: cardData.why?.wade || '', swim: cardData.why?.swim || '' },
                      rebalancer: cardData.rebalancer ? { wade: cardData.rebalancer.wade || '', swim: cardData.rebalancer.swim || '' } : null,
                      architecture: cardData.architecture || '',
                      mirror: cardData.mirror || ''
                    };
                    await onLoadDeeper(cardData.index, level, previousContent);
                    setCardLoadingDeeper(false);
                    setDepth(level);
                  }
                };

                return (
                  <button
                    key={level}
                    onClick={handleClick}
                    title={level.charAt(0).toUpperCase() + level.slice(1)}
                    className={`px-2 py-0.5 text-xs rounded transition-colors ${
                      isActive
                        ? 'bg-amber-500 text-white'
                        : hasContent
                          ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300'
                          : 'bg-zinc-800/50 text-zinc-600 hover:bg-zinc-700/50 hover:text-zinc-500 border border-dashed border-zinc-700'
                    }`}
                  >
                    {getDepthLabel(level)}
                    {!hasContent && <span className="ml-0.5 opacity-60">+</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {showTraditional && trans?.traditional && depth !== DEPTH.COLLAPSED && (
          <span className="text-xs text-zinc-500 ml-6">{trans.traditional}</span>
        )}
      </div>

      {/* Mobile Depth Stepper - under title, left-justified */}
      {isMobile && depth !== DEPTH.COLLAPSED && (
        <div className="mb-3" onClick={(e) => e.stopPropagation()}>
          <MobileDepthStepper
            currentDepth={depth}
            onDepthChange={async (newDepth) => {
              const hasContentForLevel = (lvl) => lvl === 'shallow' ? cardData.wade
                : lvl === 'wade' ? cardData.wade
                : lvl === 'swim' ? cardData.swim
                : cardData.deep;
              if (newDepth === 'shallow' || newDepth === 'wade') {
                if (cardData.wade) setDepth(newDepth);
                return;
              }
              if (hasContentForLevel(newDepth)) {
                setDepth(newDepth);
              } else if (onLoadDeeper && !cardLoadingDeeper) {
                setCardLoadingDeeper(true);
                const previousContent = {
                  reading: { wade: cardData.wade || '', swim: cardData.swim || '' },
                  why: { wade: cardData.why?.wade || '', swim: cardData.why?.swim || '' },
                  rebalancer: cardData.rebalancer ? { wade: cardData.rebalancer.wade || '', swim: cardData.rebalancer.swim || '' } : null,
                  architecture: cardData.architecture || '',
                  mirror: cardData.mirror || ''
                };
                await onLoadDeeper(cardData.index, newDepth, previousContent);
                setCardLoadingDeeper(false);
                setDepth(newDepth);
              }
            }}
            hasContent={{
              shallow: !!cardData.wade,
              wade: !!cardData.wade,
              swim: !!cardData.swim,
              deep: !!cardData.deep
            }}
            accentColor="amber"
            loading={cardLoadingDeeper}
          />
        </div>
      )}

      {/* Main Content */}
      {depth !== DEPTH.COLLAPSED && (
        <>
          {/* Card name reminder */}
          <div className="text-xs text-zinc-500 mb-3 italic">
            Reading for {statusPrefix ? `${statusPrefix} ` : ''}{trans.name} in {posLabel}
          </div>
          <div className="leading-relaxed text-sm mb-4 text-zinc-300 animate-fadeIn">
            {isLoading ? (
            <div className="flex items-center gap-2">
              <PulsatingLoader color="text-amber-400" />
            </div>
          ) : content ? (
            <div className="space-y-3">
              {ensureParagraphBreaks(content).split(/\n\n+/).filter(p => p.trim()).map((para, i) => (
                <p key={i} className="whitespace-pre-wrap">
                  {renderWithHotlinks(para.trim(), setSelectedInfo, showTraditional)}
                </p>
              ))}
            </div>
          ) : isNotLoaded ? (
            <button
              onClick={() => onRequestLoad?.()}
              className="text-amber-400 hover:text-amber-300 underline decoration-dotted"
            >
              Load card content →
            </button>
          ) : onRequestLoad ? (
            <div className="flex items-center gap-2">
              <span className="text-zinc-500 italic">Content unavailable.</span>
              <button
                onClick={() => onRequestLoad?.()}
                className="text-amber-400 hover:text-amber-300 underline decoration-dotted text-sm"
              >
                Retry →
              </button>
            </div>
          ) : (
            <span className="text-zinc-500 italic">Content unavailable</span>
          )}
        </div>
        </>
      )}

      {/* Expansion Buttons - appear at every depth level (excluding architecture - it's its own section) */}
      {depth !== DEPTH.COLLAPSED && onExpand && (
        <div className="flex gap-2 flex-wrap mb-4">
          {Object.entries(EXPANSION_PROMPTS)
            .filter(([key]) => key !== 'architecture') // Architecture is its own section now
            .map(([key, { label }]) => {
            const isThisExpanding = isExpanding && expanding?.type === key;
            const hasExpansion = !!sectionExpansions[key];
            const isExpandingOther = isExpanding && !isThisExpanding;

            return (
              <button
                key={key}
                onClick={(e) => { e.stopPropagation(); if (!hasExpansion) onExpand(sectionKey, key); }}
                disabled={isExpanding || hasExpansion}
                className={getButtonStyle(hasExpansion, isThisExpanding, isExpandingOther)}
              >
                {isThisExpanding && (
                  <span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></span>
                )}
                {hasExpansion ? `✓ ${label}` : label}
              </button>
            );
          })}
        </div>
      )}

      {/* Expansion Content Display - collapsible, never deleted */}
      {depth !== DEPTH.COLLAPSED && Object.entries(sectionExpansions).map(([key, expansionContent]) => {
        if (!expansionContent) return null;
        const isExpCollapsed = collapsedExpansions[key] === true;
        // Split content into paragraphs for proper formatting
        const paragraphs = ensureParagraphBreaks(expansionContent).split(/\n\n+/).filter(p => p.trim());
        return (
          <div key={key} className="mb-4 rounded-lg border border-zinc-700/30 overflow-hidden animate-fadeIn bg-zinc-800/30">
            <div
              className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-zinc-700/20 transition-colors"
              onClick={(e) => { e.stopPropagation(); setCollapsedExpansions(prev => ({ ...prev, [key]: !prev[key] })); }}
            >
              <span
                className={`text-xs transition-transform duration-200 ${isExpCollapsed ? 'text-red-500' : 'text-violet-400'}`}
                style={{ transform: isExpCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
              >
                ▼
              </span>
              <span className="text-xs text-zinc-400 uppercase tracking-wider">{EXPANSION_PROMPTS[key]?.label}</span>
              {isExpCollapsed && <span className="text-[0.6rem] text-zinc-600 ml-auto">tap to expand</span>}
            </div>
            {!isExpCollapsed && (
              <div className="px-3 pb-3 text-sm text-zinc-300 border-t border-zinc-700/30 space-y-3">
                {paragraphs.map((para, i) => (
                  <p key={i} className="whitespace-pre-wrap">
                    {renderWithHotlinks(para.trim(), setSelectedInfo, showTraditional)}
                  </p>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* CONTEXT label for Explore mode - shows above Rebalancer/Growth */}
      {spreadType === 'explore' && cardData.token && depth !== DEPTH.COLLAPSED && (
        <div className="text-xs text-amber-400/70 uppercase tracking-wider mb-2 mt-4 pt-4 border-t border-zinc-800/50 ml-4">
          Context: {cardData.token}
        </div>
      )}

      {/* Rebalancer Section (always visible for imbalanced cards) */}
      {depth !== DEPTH.COLLAPSED && !isBalanced && (
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
              How to Rebalance
            </span>
            {/* Depth navigation - desktop inline, mobile below */}
            {rebalancerDepth === DEPTH.COLLAPSED ? (
              <span className="ml-auto text-[0.6rem] text-zinc-600 group-hover:text-zinc-500 uppercase tracking-wider transition-colors">
                tap to explore
              </span>
            ) : rebalancerLoadingDeeper ? (
              <span className="ml-auto text-xs"><PulsatingLoader color="text-emerald-400" /></span>
            ) : !isMobile && (
              /* Desktop: Button row inline */
              <div className="ml-auto flex-shrink-0 flex gap-1" onClick={(e) => e.stopPropagation()}>
                {(() => {
                  const r = cardData.rebalancer || {};
                  const hasContentObj = {
                    shallow: hasContentValue(r.wade),
                    wade: hasContentValue(r.wade),
                    swim: hasContentValue(r.swim),
                    deep: hasContentValue(r.deep)
                  };
                  return ['shallow', 'wade', 'swim', 'deep'].map((level) => {
                    const hasContent = hasContentObj[level];
                    const isActive = rebalancerDepth === level;
                    return (
                      <button
                        key={level}
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (level === 'shallow' || level === 'wade') {
                            if (hasContentObj.wade) setRebalancerDepth(level);
                            return;
                          }
                          if (hasContent) {
                            setRebalancerDepth(level);
                          } else if (onLoadDeeper && !rebalancerLoadingDeeper) {
                            setRebalancerLoadingDeeper(true);
                            const previousContent = {
                              reading: { wade: cardData.wade || '', swim: cardData.swim || '' },
                              why: { wade: cardData.why?.wade || '', swim: cardData.why?.swim || '' },
                              rebalancer: { wade: r.wade || '', swim: r.swim || '' },
                              architecture: cardData.architecture || '',
                              mirror: cardData.mirror || ''
                            };
                            await onLoadDeeper(cardData.index, level, previousContent);
                            setRebalancerLoadingDeeper(false);
                            setRebalancerDepth(level);
                          } else {
                            setRebalancerDepth(level);
                          }
                        }}
                        title={level.charAt(0).toUpperCase() + level.slice(1)}
                        className={`px-2 py-0.5 text-xs rounded transition-colors ${
                          isActive
                            ? 'bg-emerald-500 text-white'
                            : hasContent
                              ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300'
                              : 'bg-zinc-800/50 text-zinc-600 border border-dashed border-zinc-700 hover:border-emerald-500/50'
                        }`}
                      >
                        {getDepthLabel(level)}
                        {!hasContent && <span className="ml-0.5 opacity-60">+</span>}
                      </button>
                    );
                  });
                })()}
              </div>
            )}
          </div>

          {/* Mobile Depth Stepper - under title, left-justified */}
          {isMobile && rebalancerDepth !== DEPTH.COLLAPSED && (
            <div className="mb-3" onClick={(e) => e.stopPropagation()}>
              {(() => {
                const r = cardData.rebalancer || {};
                const hasContentObj = {
                  shallow: hasContentValue(r.wade),
                  wade: hasContentValue(r.wade),
                  swim: hasContentValue(r.swim),
                  deep: hasContentValue(r.deep)
                };
                return (
                  <MobileDepthStepper
                    currentDepth={rebalancerDepth}
                    onDepthChange={async (newDepth) => {
                      if (newDepth === 'shallow' || newDepth === 'wade') {
                        if (hasContentObj.wade) setRebalancerDepth(newDepth);
                        return;
                      }
                      if (hasContentObj[newDepth]) {
                        setRebalancerDepth(newDepth);
                      } else if (onLoadDeeper && !rebalancerLoadingDeeper) {
                        setRebalancerLoadingDeeper(true);
                        const previousContent = {
                          reading: { wade: cardData.wade || '', swim: cardData.swim || '' },
                          why: { wade: cardData.why?.wade || '', swim: cardData.why?.swim || '' },
                          rebalancer: { wade: r.wade || '', swim: r.swim || '' },
                          architecture: cardData.architecture || '',
                          mirror: cardData.mirror || ''
                        };
                        await onLoadDeeper(cardData.index, newDepth, previousContent);
                        setRebalancerLoadingDeeper(false);
                        setRebalancerDepth(newDepth);
                      } else {
                        setRebalancerDepth(newDepth);
                      }
                    }}
                    hasContent={hasContentObj}
                    accentColor="emerald"
                    loading={rebalancerLoadingDeeper}
                  />
                );
              })()}
            </div>
          )}

          {/* Rebalancer Content */}
          {rebalancerDepth !== DEPTH.COLLAPSED && (
            <>
              {/* Card name reminder */}
              <div className="text-xs text-emerald-400/60 mb-3 italic">
                Rebalancing {statusPrefix ? `${statusPrefix} ` : ''}{trans.name} in {posLabel}
              </div>
              <div className="leading-relaxed text-sm mb-4 text-emerald-100/90 animate-fadeIn">
                {getRebalancerContent(rebalancerDepth) ? (
                  <div className="space-y-3">
                    {ensureParagraphBreaks(getRebalancerContent(rebalancerDepth)).split(/\n\n+/).filter(p => p.trim()).map((para, i) => (
                      <p key={i} className="whitespace-pre-wrap">
                        {renderWithHotlinks(para.trim(), setSelectedInfo, showTraditional)}
                      </p>
                    ))}
                  </div>
                ) : (
                  <span className="text-emerald-500/50 italic">Rebalancer content generating...</span>
                )}
              </div>

              {/* Rebalancer Architecture */}
              {(rebalancerDepth === DEPTH.SHALLOW || rebalancerDepth === DEPTH.WADE || rebalancerDepth === DEPTH.SWIM || rebalancerDepth === DEPTH.DEEP) && cardData.rebalancer?.architecture && (
                <ArchitectureBox
                  content={cardData.rebalancer.architecture}
                  isRebalancer={true}
                  setSelectedInfo={setSelectedInfo}
                  showTraditional={showTraditional}
                />
              )}
            </>
          )}
        </div>
      )}

      {/* Growth Opportunity Section (only for balanced cards) */}
      {depth !== DEPTH.COLLAPSED && isBalanced && cardData.growth && (
        <div className="mt-4 ml-4 rounded-lg border-2 border-teal-500/30 bg-teal-950/20 p-4">
          {/* Growth Header */}
          <div
            className={`flex items-center gap-2 cursor-pointer group ${growthDepth !== DEPTH.COLLAPSED ? 'mb-3' : ''}`}
            onClick={handleGrowthClick}
          >
            <span
              onClick={toggleGrowthCollapse}
              className={`text-xs transition-transform duration-200 cursor-pointer ${growthDepth === DEPTH.COLLAPSED ? 'text-red-500 group-hover:text-red-400' : 'text-teal-500 hover:text-teal-400'}`}
              style={{ transform: growthDepth === DEPTH.COLLAPSED ? 'rotate(-90deg)' : 'rotate(0deg)' }}
            >
              ▼
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-teal-500/30 text-teal-300">
              Growth
            </span>
            <span className="text-sm font-medium text-teal-400">
              Growth Opportunity
            </span>
            {/* Depth navigation - desktop inline, mobile below */}
            {growthDepth === DEPTH.COLLAPSED ? (
              <span className="ml-auto text-[0.6rem] text-zinc-600 group-hover:text-zinc-500 uppercase tracking-wider transition-colors">
                tap to explore
              </span>
            ) : growthLoadingDeeper ? (
              <span className="ml-auto text-xs"><PulsatingLoader color="text-teal-400" /></span>
            ) : !isMobile && (
              /* Desktop: Button row inline */
              <div className="ml-auto flex-shrink-0 flex gap-1" onClick={(e) => e.stopPropagation()}>
                {(() => {
                  const g = cardData.growth || {};
                  const hasContentObj = {
                    shallow: hasContentValue(g.wade),
                    wade: hasContentValue(g.wade),
                    swim: hasContentValue(g.swim),
                    deep: hasContentValue(g.deep)
                  };
                  return ['shallow', 'wade', 'swim', 'deep'].map((level) => {
                    const hasContent = hasContentObj[level];
                    const isActive = growthDepth === level;
                    return (
                      <button
                        key={level}
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (level === 'shallow' || level === 'wade') {
                            if (hasContentObj.wade) setGrowthDepth(level);
                            return;
                          }
                          if (hasContent) {
                            setGrowthDepth(level);
                          } else if (onLoadDeeper && !growthLoadingDeeper) {
                            setGrowthLoadingDeeper(true);
                            const previousContent = {
                              reading: { wade: cardData.wade || '', swim: cardData.swim || '' },
                              why: { wade: cardData.why?.wade || '', swim: cardData.why?.swim || '' },
                              growth: { wade: g.wade || '', swim: g.swim || '' },
                              architecture: cardData.architecture || '',
                              mirror: cardData.mirror || ''
                            };
                            await onLoadDeeper(cardData.index, level, previousContent);
                            setGrowthLoadingDeeper(false);
                            setGrowthDepth(level);
                          } else {
                            setGrowthDepth(level);
                          }
                        }}
                        title={level.charAt(0).toUpperCase() + level.slice(1)}
                        className={`px-2 py-0.5 text-xs rounded transition-colors ${
                          isActive
                            ? 'bg-teal-500 text-white'
                            : hasContent
                              ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300'
                              : 'bg-zinc-800/50 text-zinc-600 border border-dashed border-zinc-700 hover:border-teal-500/50'
                        }`}
                      >
                        {getDepthLabel(level)}
                        {!hasContent && <span className="ml-0.5 opacity-60">+</span>}
                      </button>
                    );
                  });
                })()}
              </div>
            )}
          </div>

          {/* Mobile Depth Stepper - under title, left-justified */}
          {isMobile && growthDepth !== DEPTH.COLLAPSED && (
            <div className="mb-3" onClick={(e) => e.stopPropagation()}>
              {(() => {
                const g = cardData.growth || {};
                const hasContentObj = {
                  shallow: hasContentValue(g.wade),
                  wade: hasContentValue(g.wade),
                  swim: hasContentValue(g.swim),
                  deep: hasContentValue(g.deep)
                };
                return (
                  <MobileDepthStepper
                    currentDepth={growthDepth}
                    onDepthChange={async (newDepth) => {
                      if (newDepth === 'shallow' || newDepth === 'wade') {
                        if (hasContentObj.wade) setGrowthDepth(newDepth);
                        return;
                      }
                      if (hasContentObj[newDepth]) {
                        setGrowthDepth(newDepth);
                      } else if (onLoadDeeper && !growthLoadingDeeper) {
                        setGrowthLoadingDeeper(true);
                        const previousContent = {
                          reading: { wade: cardData.wade || '', swim: cardData.swim || '' },
                          why: { wade: cardData.why?.wade || '', swim: cardData.why?.swim || '' },
                          growth: { wade: g.wade || '', swim: g.swim || '' },
                          architecture: cardData.architecture || '',
                          mirror: cardData.mirror || ''
                        };
                        await onLoadDeeper(cardData.index, newDepth, previousContent);
                        setGrowthLoadingDeeper(false);
                        setGrowthDepth(newDepth);
                      } else {
                        setGrowthDepth(newDepth);
                      }
                    }}
                    hasContent={hasContentObj}
                    accentColor="teal"
                    loading={growthLoadingDeeper}
                  />
                );
              })()}
            </div>
          )}

          {/* Growth Content */}
          {growthDepth !== DEPTH.COLLAPSED && (
            <>
              {/* Card name reminder */}
              <div className="text-xs text-teal-400/60 mb-3 italic">
                Growth from {statusPrefix ? `${statusPrefix} ` : ''}{trans.name} in {posLabel}
              </div>
              <div className="leading-relaxed text-sm mb-4 text-teal-100/90 animate-fadeIn">
                {getGrowthContent(growthDepth) ? (
                  <div className="space-y-3">
                    {ensureParagraphBreaks(getGrowthContent(growthDepth)).split(/\n\n+/).filter(p => p.trim()).map((para, i) => (
                      <p key={i} className="whitespace-pre-wrap">
                        {renderWithHotlinks(para.trim(), setSelectedInfo, showTraditional)}
                      </p>
                    ))}
                  </div>
                ) : (
                  <span className="text-teal-500/50 italic">Growth content generating...</span>
                )}
              </div>

              {/* Growth Architecture (if any) */}
              {(growthDepth === DEPTH.SHALLOW || growthDepth === DEPTH.WADE || growthDepth === DEPTH.SWIM || growthDepth === DEPTH.DEEP) && cardData.growth?.architecture && (
                <ArchitectureBox
                  content={cardData.growth.architecture}
                  label="Growth Architecture"
                  setSelectedInfo={setSelectedInfo}
                  showTraditional={showTraditional}
                />
              )}
            </>
          )}
        </div>
      )}

      {/* THE WHY Group - always visible when card expanded, collapsed by default */}
      {depth !== DEPTH.COLLAPSED && (
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
              {/* Card name reminder */}
              <div className="text-xs text-cyan-400/60 mb-3 italic">
                Why {statusPrefix ? `${statusPrefix} ` : ''}{trans.name} in {posLabel} appeared
              </div>
              {/* THE MIRROR - single poetic reflection, no depth navigation */}
              <div className="mb-4">
                <div className="text-xs font-medium text-cyan-400/70 uppercase tracking-wider mb-2">The Mirror</div>
                {cardData.mirror ? (
                  <MirrorSection
                    content={cardData.mirror}
                    isBalanced={isBalanced}
                    className="border-0 bg-transparent p-0"
                  />
                ) : (
                  <span className="text-cyan-500/50 italic text-sm">Mirror generating...</span>
                )}
              </div>

              {/* WORDS TO THE WHY - 3 depth levels (no more surface) */}
              {cardData.why && (cardData.why.wade || cardData.why.swim || cardData.why.deep) && (
                <div className="border-t border-cyan-700/30 pt-4">
                  <div className={`flex items-center justify-between ${isMobile ? 'mb-1' : 'mb-3'}`}>
                    <span className="text-xs font-medium text-cyan-400/70 uppercase tracking-wider">
                      Words to the Whys
                    </span>
                    {/* Depth navigation - desktop inline, mobile below */}
                    {whyLoadingDeeper ? (
                      <span className="text-xs"><PulsatingLoader color="text-cyan-400" /></span>
                    ) : !isMobile && (
                      /* Desktop: Button row inline */
                      <div className="flex-shrink-0 flex gap-1">
                        {(() => {
                          const hasContentObj = {
                            shallow: hasContentValue(cardData.why?.wade),
                            wade: hasContentValue(cardData.why?.wade),
                            swim: hasContentValue(cardData.why?.swim),
                            deep: hasContentValue(cardData.why?.deep)
                          };
                          return ['shallow', 'wade', 'swim', 'deep'].map((level) => {
                            const hasContent = hasContentObj[level];
                            const isActive = whyDepth === level;
                            return (
                              <button
                                key={level}
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (level === 'shallow' || level === 'wade') {
                                    if (hasContentObj.wade) setWhyDepth(level);
                                    return;
                                  }
                                  if (hasContent) {
                                    setWhyDepth(level);
                                  } else if (onLoadDeeper && !whyLoadingDeeper) {
                                    setWhyLoadingDeeper(true);
                                    const previousContent = {
                                      reading: { wade: cardData.wade || '', swim: cardData.swim || '' },
                                      why: { wade: cardData.why?.wade || '', swim: cardData.why?.swim || '' },
                                      rebalancer: cardData.rebalancer ? { wade: cardData.rebalancer.wade || '', swim: cardData.rebalancer.swim || '' } : null,
                                      architecture: cardData.architecture || '',
                                      mirror: cardData.mirror || ''
                                    };
                                    await onLoadDeeper(cardData.index, level, previousContent);
                                    setWhyLoadingDeeper(false);
                                    setWhyDepth(level);
                                  }
                                }}
                                title={level.charAt(0).toUpperCase() + level.slice(1)}
                                className={`px-2 py-0.5 text-xs rounded transition-colors ${
                                  isActive
                                    ? 'bg-cyan-500 text-white'
                                    : hasContent
                                      ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300'
                                      : 'bg-zinc-800/50 text-zinc-600 border border-dashed border-zinc-700 hover:border-cyan-500/50'
                                }`}
                              >
                                {getDepthLabel(level)}
                                {!hasContent && <span className="ml-0.5 opacity-60">+</span>}
                              </button>
                            );
                          });
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Mobile Depth Stepper - under title, left-justified */}
                  {isMobile && (
                    <div className="mb-3">
                      {(() => {
                        const hasContentObj = {
                          shallow: hasContentValue(cardData.why?.wade),
                          wade: hasContentValue(cardData.why?.wade),
                          swim: hasContentValue(cardData.why?.swim),
                          deep: hasContentValue(cardData.why?.deep)
                        };
                        return (
                          <MobileDepthStepper
                            currentDepth={whyDepth}
                            onDepthChange={async (newDepth) => {
                              if (newDepth === 'shallow' || newDepth === 'wade') {
                                if (hasContentObj.wade) setWhyDepth(newDepth);
                                return;
                              }
                              if (hasContentObj[newDepth]) {
                                setWhyDepth(newDepth);
                              } else if (onLoadDeeper && !whyLoadingDeeper) {
                                setWhyLoadingDeeper(true);
                                const previousContent = {
                                  reading: { wade: cardData.wade || '', swim: cardData.swim || '' },
                                  why: { wade: cardData.why?.wade || '', swim: cardData.why?.swim || '' },
                                  rebalancer: cardData.rebalancer ? { wade: cardData.rebalancer.wade || '', swim: cardData.rebalancer.swim || '' } : null,
                                  architecture: cardData.architecture || '',
                                  mirror: cardData.mirror || ''
                                };
                                await onLoadDeeper(cardData.index, newDepth, previousContent);
                                setWhyLoadingDeeper(false);
                                setWhyDepth(newDepth);
                              }
                            }}
                            hasContent={hasContentObj}
                            accentColor="cyan"
                            loading={whyLoadingDeeper}
                          />
                        );
                      })()}
                    </div>
                  )}

                  {/* WHY Content at current depth */}
                  <div className="text-sm text-cyan-100/90 mb-4">
                    {(() => {
                      // Get content based on depth (shallow derives from wade)
                      const whyContent = whyDepth === 'shallow'
                        ? (cardData.why?.wade ? getShallowContent(cardData.why.wade) : null)
                        : cardData.why[whyDepth];
                      return whyContent ? (
                        <div className="space-y-3">
                          {ensureParagraphBreaks(whyContent).split(/\n\n+/).filter(p => p.trim()).map((para, i) => (
                            <p key={i} className="whitespace-pre-wrap">
                              {renderWithHotlinks(para.trim(), setSelectedInfo, showTraditional)}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <span className="text-cyan-500/50 italic">Tap a depth level above to view content</span>
                      );
                    })()}
                  </div>

                  {/* WHY Architecture Box - collapsed */}
                  {cardData.why.architecture && (
                    <ArchitectureBox
                      content={cardData.why.architecture}
                      label="Why Architecture"
                      setSelectedInfo={setSelectedInfo}
                      showTraditional={showTraditional}
                    />
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Card Architecture Section - visible at all depths, collapsed by default */}
      {depth !== DEPTH.COLLAPSED && cardData.architecture && (
        <div className="mt-4 rounded-lg border-2 border-violet-500/30 bg-violet-950/20 p-4">
          {/* Architecture Header - clickable to expand */}
          <div
            className={`flex items-center gap-2 cursor-pointer group ${!isArchCollapsed ? 'mb-4' : ''}`}
            onClick={(e) => { e.stopPropagation(); setIsArchCollapsed(!isArchCollapsed); }}
          >
            <span
              className={`text-xs transition-transform duration-200 cursor-pointer ${isArchCollapsed ? 'text-red-500 group-hover:text-red-400' : 'text-emerald-500 hover:text-emerald-400'}`}
              style={{ transform: isArchCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
            >
              ▼
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/30 text-violet-300">
              ⚙
            </span>
            <span className="text-sm font-medium text-violet-400">
              Architecture
            </span>
            {isArchCollapsed && (
              <span className="ml-auto text-[0.6rem] text-zinc-600 group-hover:text-zinc-500 uppercase tracking-wider transition-colors">
                tap to explore
              </span>
            )}
          </div>

          {/* Architecture Content - expanded, with hotlinks */}
          {!isArchCollapsed && (
            <>
              {/* Card Definition - first */}
              <div className="mb-4 pb-3 border-b border-violet-700/30">
                <div className="text-sm font-medium text-violet-300 mb-1">
                  {trans.name}
                  {showTraditional && trans.traditional && (
                    <span className="text-violet-500/70 font-normal ml-2">[{trans.traditional}]</span>
                  )}
                </div>
                <div className="text-xs text-zinc-400 leading-relaxed">
                  {trans.extended || trans.description}
                </div>
              </div>

              {/* Card context reminder */}
              <div className="text-xs text-violet-400/60 mb-3 italic">
                Structure of {statusPrefix ? `${statusPrefix} ` : ''}{trans.name} in {posLabel}
              </div>
              <div className="text-xs text-zinc-400 font-mono leading-relaxed architecture-content">
                {/* Split on newlines and render each line with hotlinks */}
                {cardData.architecture.split('\n').map((line, i) => (
                <div key={i} className={line.trim() ? 'mb-1.5' : 'mb-2'}>
                  {line.trim() ? renderWithHotlinks(line, setSelectedInfo, showTraditional) : null}
                </div>
              ))}
              </div>
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && threadOperation && !threadLoading) {
                    e.preventDefault();
                    onContinueThread();
                  }
                }}
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

          {/* Thread Results - Reflect/Forge responses */}
          {threadData && threadData.length > 0 && (
            <div className="mt-4 space-y-4" data-thread-key={sectionKey}>
              {threadData.map((threadItem, threadIndex) => {
                const isReflectItem = threadItem.operation === 'reflect';
                const itemTrans = getComponent(threadItem.draw.transient);
                const itemStat = STATUSES[threadItem.draw.status];
                const itemStatusPrefix = itemStat.prefix || 'Balanced';
                return (
                  <div key={threadIndex} className={`thread-item rounded-lg p-4 ${isReflectItem ? 'border border-sky-500/30 bg-sky-950/20' : 'border border-orange-500/30 bg-orange-950/20'}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${isReflectItem ? 'bg-sky-500/20 text-sky-400' : 'bg-orange-500/20 text-orange-400'}`}>
                        {isReflectItem ? '↩ Reflect' : '⚡ Forge'}
                      </span>
                    </div>
                    {threadItem.context && (
                      <div className={`text-xs italic mb-3 pl-3 border-l-2 ${isReflectItem ? 'border-sky-500/50 text-sky-300/70' : 'border-orange-500/50 text-orange-300/70'}`}>
                        "{threadItem.context}"
                      </div>
                    )}
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[threadItem.draw.status]}`}>
                        {itemStat.name}
                      </span>
                      <span className="text-sm font-medium text-zinc-200">
                        {itemStatusPrefix}{itemStatusPrefix && ' '}<span className="text-amber-300/90">{itemTrans.name}</span>
                      </span>
                    </div>
                    <div className="text-sm text-zinc-300 leading-relaxed space-y-3">
                      {ensureParagraphBreaks(threadItem.interpretation).split(/\n\n+/).filter(p => p.trim()).map((para, i) => (
                        <p key={i} className="whitespace-pre-wrap">
                          {renderWithHotlinks(para.trim(), setSelectedInfo, showTraditional)}
                        </p>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DepthCard;
