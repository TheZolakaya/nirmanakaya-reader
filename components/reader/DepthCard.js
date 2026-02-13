// === DEPTH CARD COMPONENT ===
// Progressive depth card: Surface → Wade → Swim
// Handles both main card and nested Rebalancer

import { useState, useRef, useEffect } from 'react';
import { STATUSES, STATUS_INFO, STATUS_COLORS, HOUSES, HOUSE_COLORS } from '../../lib/constants.js';
import { ARCHETYPES } from '../../lib/archetypes.js';
import { REFLECT_SPREADS } from '../../lib/spreads.js';
import { EXPANSION_PROMPTS } from '../../lib/prompts.js';
import { getComponent, getFullCorrection, getCorrectionTargetId, getBoundCorrection, getAgentCorrection } from '../../lib/corrections.js';
import { renderWithHotlinks } from '../../lib/hotlinks.js';
import { ensureParagraphBreaks } from '../../lib/utils.js';
import { getGlossaryEntry } from '../../lib/glossary.js';
import ArchitectureBox from './ArchitectureBox.js';
import MirrorSection from './MirrorSection.js';
import MobileDepthStepper from './MobileDepthStepper.js';
import CardImage from './CardImage.js';
import Minimap from './Minimap.js';
import MinimapModal from './MinimapModal.js';
import { getHomeArchetype, getCardType, getDetailedCardType } from '../../lib/cardImages.js';

// Depth levels (now includes SHALLOW as default and DEEP for all sections)
const DEPTH = {
  COLLAPSED: 'collapsed',
  SHALLOW: 'shallow',  // 1-2 sentence summary derived from Wade
  SURFACE: 'surface',
  WADE: 'wade',
  SWIM: 'swim',
  DEEP: 'deep'
};

// Helper to derive shallow content — use surface if available, else extract from wade
const getShallowContent = (wadeContent, surfaceContent) => {
  if (surfaceContent) return surfaceContent;
  if (!wadeContent) return '';
  const sentences = wadeContent.split(/(?<=[.!?])\s+/);
  return sentences.slice(0, 3).join(' ');
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
  isFirstContact = false,
  showTraditional = false,
  setSelectedInfo,
  navigateFromMinimap,    // For navigating to info from minimap with back support
  spreadType = 'discover',
  spreadKey = 'one',
  // Default depth setting (shallow or wade) - controls what depth cards open to
  defaultDepth = 'shallow',
  // Default expansion setting - when true, card and nested sections start expanded
  defaultExpanded = false,
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
  // Initialize states based on defaultExpanded setting
  // V1 Spread on Table: unloaded cards always start collapsed (zero depth)
  const [depth, setDepth] = useState(isNotLoaded ? DEPTH.COLLAPSED : (defaultExpanded ? defaultDepth : DEPTH.COLLAPSED));
  const [rebalancerDepth, setRebalancerDepth] = useState(defaultExpanded ? defaultDepth : DEPTH.COLLAPSED);
  const [growthDepth, setGrowthDepth] = useState(defaultExpanded ? defaultDepth : DEPTH.COLLAPSED); // For balanced cards' Growth Opportunity
  const [isWhyCollapsed, setIsWhyCollapsed] = useState(!defaultExpanded);
  const [whyDepth, setWhyDepth] = useState(defaultDepth); // Use user's chosen default depth
  const [isArchCollapsed, setIsArchCollapsed] = useState(true); // Architecture section - always starts collapsed
  const [collapsedExpansions, setCollapsedExpansions] = useState({}); // Track collapsed state per expansion type
  const [collapsedRebalancerExpansions, setCollapsedRebalancerExpansions] = useState({}); // Track collapsed state for rebalancer expansions
  const [collapsedGrowthExpansions, setCollapsedGrowthExpansions] = useState({}); // Track collapsed state for growth expansions

  // Independent loading states for each section
  const [cardLoadingDeeper, setCardLoadingDeeper] = useState(false);
  const [rebalancerLoadingDeeper, setRebalancerLoadingDeeper] = useState(false);
  const [growthLoadingDeeper, setGrowthLoadingDeeper] = useState(false); // For balanced cards' Growth Opportunity
  const [whyLoadingDeeper, setWhyLoadingDeeper] = useState(false);

  // Add Context state — tracks input visibility and text per section
  const [showContextInput, setShowContextInput] = useState({}); // { 'card-0': true }
  const [contextText, setContextText] = useState({}); // { 'card-0': 'user text' }

  // Minimap modal state
  const [showMinimapModal, setShowMinimapModal] = useState(false);
  const [showRebalancerMinimapModal, setShowRebalancerMinimapModal] = useState(false);
  const [showGrowthMinimapModal, setShowGrowthMinimapModal] = useState(false);
  const [threadMinimapData, setThreadMinimapData] = useState(null); // Stores data for thread item minimap modal

  // Mobile/narrow detection - triggers vertical layout when cards would wrap
  // 720px = 3 cards (200px each) + connectors + padding
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 720);
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
  // V1: isReflect kept for legacy spread config lookup, but all cards now have positions
  const isReflect = spreadType === 'reflect';

  // V1: Position label — always use archetype position name
  const posLabel = ARCHETYPES[draw.position]?.name || `Position ${cardData.index + 1}`;
  // Optional frame label from preset spread (additional context)
  const spreadConfig = isReflect ? REFLECT_SPREADS[spreadKey] : null;
  const frameLabel = isReflect ? spreadConfig?.positions?.[cardData.index]?.name : null;

  // Get house for coloring — V1: always from archetype position
  const house = ARCHETYPES[draw.position]?.house || 'Gestalt';
  const houseColors = house ? HOUSE_COLORS[house] : null;

  // Get the card's home archetype for minimap (bounds/agents map to their archetype)
  const cardHomeArchetype = getHomeArchetype(draw.transient);
  // V1: Position is always an archetype (0-21)
  const positionArchetype = draw.position;

  // Card type for minimap indicator (archetype, bound, or agent)
  const cardTypeForMinimap = trans?.type?.toLowerCase() || 'archetype';
  // For bounds, determine if inner (1-5) or outer (6-10)
  const boundIsInner = cardTypeForMinimap === 'bound' && trans?.number <= 5;

  // Correction data for rebalancer minimap (computed at component level for modal access)
  const correction = !isBalanced ? getFullCorrection(draw.transient, draw.status) : null;
  const correctionTargetId = correction ? getCorrectionTargetId(correction, trans) : null;
  const correctionArchetype = correctionTargetId !== null ? getHomeArchetype(correctionTargetId) : null;

  // DEBUG: Trace correction values for imbalanced cards
  if (!isBalanced && correction) {
    console.log('[CORRECTION DEBUG]', trans?.name, {
      drawTransient: draw.transient,
      drawStatus: draw.status,
      statusName: STATUSES[draw.status]?.name,
      correctionType: correction?.type,
      correctionTarget: correction?.target,
      correctionTargetId,
      correctionArchetype,
      expectedForStatus3: 'Should be vertical pair',
      expectedForStatus2: 'Should be diagonal pair'
    });
  }
  // Correction target card type (for showing bound/agent indicator on minimap)
  const correctionCard = correctionTargetId !== null ? getComponent(correctionTargetId) : null;
  const correctionCardType = correctionCard?.type?.toLowerCase() || 'archetype';
  const correctionBoundIsInner = correctionCardType === 'bound' && correctionCard?.number <= 5;

  // Growth type for balanced cards - determined by home archetype
  // Gestalt archetypes (0, 1, 19, 20) and Portals (10, 21) have no lateral growth - they loop back to themselves
  // Polarity Anchors: Compassion(6), Fortitude(8), Abstraction(15), Inspiration(17) - pure element expressions
  // Transpose Pairs: Order(4)↔Wisdom(2), Nurturing(3)↔Sacrifice(12), Culture(5)↔Balance(14),
  //                  Drive(7)↔Imagination(18), Discipline(9)↔Breakthrough(16), Equity(11)↔Change(13)
  const GESTALT_ARCHETYPES = new Set([0, 1, 10, 19, 20, 21]); // Gestalt house + Portals - completion points
  const POLARITY_ANCHOR_ARCHETYPES = new Set([6, 8, 15, 17]);
  const TRANSPOSE_PAIR_ARCHETYPES = new Set([2, 3, 4, 5, 7, 9, 11, 12, 13, 14, 16, 18]);

  const isGestaltCard = cardHomeArchetype !== null && GESTALT_ARCHETYPES.has(cardHomeArchetype);

  const getGrowthType = (archetypeId) => {
    if (GESTALT_ARCHETYPES.has(archetypeId)) {
      // Gestalt cards loop back to themselves - the growth IS the embodiment
      return { slug: 'self-expression', label: 'Self-Expression' };
    }
    if (POLARITY_ANCHOR_ARCHETYPES.has(archetypeId)) {
      return { slug: 'polarity-anchor', label: 'Polarity Anchor' };
    }
    if (TRANSPOSE_PAIR_ARCHETYPES.has(archetypeId)) {
      return { slug: 'transpose-pair', label: 'Transpose Pair' };
    }
    return { slug: 'growth-opportunity', label: 'Growth Opportunity' };
  };
  const growthType = cardHomeArchetype !== null ? getGrowthType(cardHomeArchetype) : null;

  // Growth target: Use canonical lookup tables for Agents and Bounds
  // For Gestalt cards: same card (embody this energy)
  // For Agents: use AGENT_GROWTH_TARGETS via getAgentCorrection
  // For Bounds: use BOUND_GROWTH_TARGETS via getBoundCorrection
  // For Archetypes: position archetype
  const getGrowthTargetId = () => {
    if (isGestaltCard) return draw.transient;

    // For Agents: use canonical lookup table
    if (cardTypeForMinimap === 'agent') {
      const agentCorrection = getAgentCorrection(trans, 1); // status=1 for balanced/growth
      if (agentCorrection?.targetAgentId) {
        return agentCorrection.targetAgentId;
      }
    }

    // For Bounds: use canonical lookup table
    if (cardTypeForMinimap === 'bound') {
      const boundCorrection = getBoundCorrection(trans, 1); // status=1 for balanced/growth
      if (boundCorrection?.targetId) {
        return boundCorrection.targetId;
      }
    }

    // Default for Archetypes: position archetype
    return positionArchetype;
  };
  const growthTargetId = getGrowthTargetId();

  // Display card type with inner/outer distinction for all types
  const getDisplayCardType = () => {
    const detailed = getDetailedCardType(draw.transient);
    return detailed?.label || getCardType(draw.transient);
  };

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

  // Clickable glossary term (for framework concepts)
  const GlossaryTerm = ({ slug, children, className = "" }) => {
    const entry = getGlossaryEntry(slug);
    if (!entry) return <span className={className}>{children}</span>;
    return (
      <span
        className={`cursor-pointer hover:underline decoration-dotted underline-offset-2 ${className}`}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedInfo?.({ type: 'glossary', id: slug, data: entry });
        }}
      >
        {children}
      </span>
    );
  };

  // Clickable card type label (opens glossary for the card type)
  const ClickableCardType = ({ transientId, className = "" }) => {
    const detailedType = getDetailedCardType(transientId);
    if (!detailedType) return null;

    // Get glossary slug from detailed card type
    const getGlossarySlug = () => {
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

    const slug = getGlossarySlug();
    const entry = slug ? getGlossaryEntry(slug) : null;

    if (!entry) {
      return <span className={className}>({detailedType.label})</span>;
    }

    return (
      <span
        className={`cursor-pointer hover:underline decoration-dotted underline-offset-2 ${className}`}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedInfo?.({ type: 'glossary', id: slug, data: entry });
        }}
      >
        ({detailedType.label})
      </span>
    );
  };

  // Get content for current depth (with fallback chain, now includes DEEP)
  // Helper to check for actual content (not empty string)
  const hasContentValue = (val) => val != null && val !== '';

  const getContent = (d) => {
    // Try requested depth first, then fall back in order
    switch (d) {
      case DEPTH.SHALLOW:
        // Use actual surface content from API if available, else derive from wade
        if (hasContentValue(cardData.surface)) return cardData.surface;
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
        // Use actual surface content if available, else derive from wade
        if (hasContent(r.surface)) return r.surface;
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
      setDepth(defaultDepth); // Start at user's chosen default depth (shallow or wade)
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
      setDepth(defaultDepth); // Start at user's chosen default depth (shallow or wade)
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
      await onLoadDeeper(cardData.index, targetDepth, previousContent, ['reading']);
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

  // Find first available rebalancer depth (user's default preferred)
  const getFirstRebalancerDepth = () => {
    const r = cardData.rebalancer;
    if (!r) return defaultDepth;
    // Check if user's default depth content exists
    if (defaultDepth === 'wade' && hasContentValue(r.wade)) return DEPTH.WADE;
    // Shallow is derived from wade, so if wade exists, shallow exists
    if (hasContentValue(r.wade)) return defaultDepth;
    if (hasContentValue(r.swim)) return DEPTH.SWIM;
    if (hasContentValue(r.deep)) return DEPTH.DEEP;
    return defaultDepth; // Default to user's chosen default
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
        // Use actual surface content if available, else derive from wade
        if (hasContent(g.surface)) return g.surface;
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

  // Find first available growth depth (user's default preferred)
  const getFirstGrowthDepth = () => {
    const g = cardData.growth;
    if (!g) return defaultDepth;
    // Check if user's default depth content exists
    if (defaultDepth === 'wade' && hasContentValue(g.wade)) return DEPTH.WADE;
    // Shallow is derived from wade, so if wade exists, shallow exists
    if (hasContentValue(g.wade)) return defaultDepth;
    if (hasContentValue(g.swim)) return DEPTH.SWIM;
    if (hasContentValue(g.deep)) return DEPTH.DEEP;
    return defaultDepth; // Default to user's chosen default
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

  // Rebalancer expansion handling
  const rebalancerExpansionKey = `rebalancer-${cardData.index}`;
  const rebalancerExpansions = expansions[rebalancerExpansionKey] || {};
  const isRebalancerExpanding = expanding?.section === rebalancerExpansionKey;

  // Growth expansion handling
  const growthExpansionKey = `growth-${cardData.index}`;
  const growthExpansions = expansions[growthExpansionKey] || {};
  const isGrowthExpanding = expanding?.section === growthExpansionKey;

  const getButtonStyle = (hasExpansion, isThisExpanding, isExpandingOther) => {
    return `text-xs px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
      hasExpansion
        ? 'bg-zinc-700 text-zinc-200 border border-zinc-600'
        : 'bg-zinc-800/50 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
    } ${isExpandingOther ? 'opacity-50 cursor-not-allowed' : ''}`;
  };

  // Context thread + input render helper (used by card, rebalancer, growth sections)
  const renderContextUI = (expKey, sectionExps, isSectionExpanding, collapsedObj, setCollapsedFn) => {
    const contextData = sectionExps?.context;
    const hasContext = contextData && Array.isArray(contextData) && contextData.length > 0;
    const isContextExpanding = isSectionExpanding && expanding?.type === 'context';
    const isCollapsed = collapsedObj?.context === true;
    const inputVisible = showContextInput[expKey];

    if (!hasContext && !inputVisible) return null;

    return (
      <>
        {/* Context conversation thread */}
        {hasContext && (
          <div className="mb-4 rounded-lg border border-amber-700/30 overflow-hidden animate-fadeIn bg-amber-950/10">
            <div
              className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-amber-900/20 transition-colors"
              onClick={(e) => { e.stopPropagation(); setCollapsedFn(prev => ({ ...prev, context: !prev.context })); }}
            >
              <span
                className={`text-xs transition-transform duration-200 ${isCollapsed ? 'text-red-500' : 'text-amber-400'}`}
                style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
              >▼</span>
              <span className="text-xs text-amber-400/80 uppercase tracking-wider">Context</span>
              <span className="text-[0.6rem] text-zinc-600 ml-auto">
                {Math.floor(contextData.length / 2)} exchange{contextData.length > 2 ? 's' : ''}
              </span>
              {isCollapsed && <span className="text-[0.6rem] text-zinc-600 ml-1">tap to expand</span>}
            </div>
            {!isCollapsed && (
              <div className="px-3 pb-3 border-t border-amber-700/30 space-y-3">
                {contextData.map((turn, i) => (
                  <div key={i}>
                    {turn.role === 'user' ? (
                      <div className="text-xs text-amber-400/80 bg-amber-950/30 rounded px-2 py-1.5 italic">
                        &ldquo;{turn.content}&rdquo;
                      </div>
                    ) : (
                      <div className="text-sm text-zinc-300 space-y-2 mt-1">
                        {ensureParagraphBreaks(turn.content).split(/\n\n+/).filter(p => p.trim()).map((para, j) => (
                          <p key={j} className="whitespace-pre-wrap">
                            {renderWithHotlinks(para.trim(), setSelectedInfo, showTraditional)}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Context input — stays visible for multi-turn */}
        {inputVisible && !(hasContext && isCollapsed) && (
          <div className="mb-4 flex gap-2">
            <input
              type="text"
              value={contextText[expKey] || ''}
              onChange={(e) => setContextText(prev => ({ ...prev, [expKey]: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && contextText[expKey]?.trim() && !isContextExpanding) {
                  e.preventDefault();
                  onExpand(expKey, 'context', false, contextText[expKey].trim());
                  setContextText(prev => ({ ...prev, [expKey]: '' }));
                }
              }}
              placeholder={hasContext ? "Add more context..." : "What context would you like to add?"}
              className="flex-1 bg-zinc-800/80 text-zinc-200 text-sm rounded-lg px-3 py-2 border border-zinc-700 focus:border-amber-500/50 focus:outline-none placeholder-zinc-600"
              disabled={isContextExpanding}
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (contextText[expKey]?.trim() && !isContextExpanding) {
                  onExpand(expKey, 'context', false, contextText[expKey].trim());
                  setContextText(prev => ({ ...prev, [expKey]: '' }));
                }
              }}
              disabled={!contextText[expKey]?.trim() || isContextExpanding}
              className="px-3 py-2 text-sm rounded-lg bg-amber-600 text-white hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            >
              {isContextExpanding ? (
                <span className="inline-block w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></span>
              ) : '\u2192'}
            </button>
          </div>
        )}
      </>
    );
  };

  const content = getContent(depth);
  const canGoDeeper = depth !== DEPTH.DEEP && depth !== DEPTH.COLLAPSED;
  const canGoShallower = depth !== DEPTH.COLLAPSED;

  return (
    <div className={`content-pane rounded-lg border-2 p-5 mb-5 transition-all duration-300 ${getSectionStyle()}`}>
      {/* Card Header with Visual Layout - always visible */}
      <div className={`${depth !== DEPTH.COLLAPSED ? 'mb-3' : ''}`}>
        {/* Visual row: Card → Position → Minimap - responsive layout */}
        {/* Desktop: horizontal flex row | Mobile: vertical stack */}
        <div className={`mb-2 ${isMobile ? 'flex flex-col items-center gap-3' : 'flex items-start gap-2 flex-wrap'}`}>
          {/* Drawn Card with Status above */}
          <div className="flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <ClickableTerm type="status" id={draw.status} className={`text-xs mb-1 ${STATUS_COLORS[draw.status]?.split(' ')[0]}`}>
              {statusPrefix}
            </ClickableTerm>
            <div className="w-[200px] h-[200px] flex items-center justify-center">
              <CardImage
                transient={draw.transient}
                status={draw.status}
                cardName={trans?.name}
                size="compact"
                showFrame={depth !== DEPTH.COLLAPSED}
                onImageClick={() => {
                  const data = getComponent(draw.transient);
                  setSelectedInfo?.({ type: 'card', id: draw.transient, data });
                }}
              />
            </div>
            <ClickableTerm type="card" id={draw.transient} className="text-xs text-amber-300/90 mt-1 text-center max-w-[200px] truncate">
              {trans?.name}
            </ClickableTerm>
            <ClickableCardType transientId={draw.transient} className="text-[0.65rem] text-zinc-500 uppercase tracking-wider" />
          </div>

          {/* Arrow connector — V1: always present (universal positions) */}
          {positionArchetype !== null && (
            <>
              {/* Arrow with "in your" - single clickable unit, vertical on mobile, horizontal on desktop */}
              {isMobile ? (
                <GlossaryTerm slug="in-your" className="flex flex-col items-center py-1 cursor-pointer hover:opacity-80 transition-opacity">
                  <span className="text-xs uppercase tracking-wider text-zinc-400 mb-1">in your</span>
                  <span className="text-2xl text-zinc-300 font-light">↓</span>
                </GlossaryTerm>
              ) : (
                <div className="flex flex-col items-center justify-center h-[200px] mt-[18px] px-3">
                  <GlossaryTerm slug="in-your" className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity">
                    <span className="text-3xl text-zinc-300 font-light">→</span>
                    <span className="text-xs uppercase tracking-wider text-zinc-400 mt-1">in your</span>
                  </GlossaryTerm>
                </div>
              )}

              {/* Position Archetype Image */}
              <div className="flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
                {!isMobile && <span className="text-xs mb-1 text-transparent">.</span>}
                <div className="w-[200px] h-[200px] flex items-center justify-center">
                  <CardImage
                    transient={positionArchetype}
                    status={1}
                    cardName={ARCHETYPES[positionArchetype]?.name}
                    size="compact"
                    showFrame={depth !== DEPTH.COLLAPSED}
                    onImageClick={() => {
                      const data = getComponent(positionArchetype);
                      setSelectedInfo?.({ type: 'card', id: positionArchetype, data });
                    }}
                  />
                </div>
                <ClickableTerm type="card" id={positionArchetype} className="text-xs text-zinc-300 mt-1 text-center max-w-[200px] truncate">
                  {posLabel}
                </ClickableTerm>
                <ClickableCardType transientId={positionArchetype} className="text-[0.65rem] text-zinc-500 uppercase tracking-wider" />
              </div>

              {/* Connector to minimap - equals sign (represents "this relationship = minimap") */}
              {isMobile ? (
                <div className="flex flex-col items-center py-1">
                  <span className="text-2xl text-zinc-300 font-light">=</span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[200px] mt-[18px] px-3">
                  <span className="text-3xl text-zinc-300 font-light">=</span>
                </div>
              )}

              {/* Minimap - same square size as card containers (200x200) */}
              <div className="flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
                <span className="text-xs mb-1 text-zinc-400">
                  <span className="text-amber-300/80">{trans?.name}</span>
                  <span className="text-zinc-500"> → </span>
                  <span className="text-zinc-300">{posLabel}</span>
                </span>
                <div
                  className="rounded-lg overflow-hidden flex items-center justify-center cursor-pointer transition-all hover:scale-105 hover:border-violet-400/60"
                  style={{
                    background: 'rgba(13, 13, 26, 0.85)',
                    border: '1px solid rgba(107, 77, 138, 0.4)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3), inset 0 0 20px rgba(107, 77, 138, 0.1)',
                    width: '200px',
                    height: '200px'
                  }}
                  onClick={() => setShowMinimapModal(true)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setShowMinimapModal(true)}
                  title="Click to expand minimap"
                >
                  <Minimap
                    fromId={cardHomeArchetype}
                    toId={positionArchetype}
                    size="card"
                    singleMode={true}
                    fromCardType={cardTypeForMinimap}
                    boundIsInner={boundIsInner}
                  />
                </div>
                <span className="text-xs text-zinc-500 mt-1 cursor-pointer hover:text-zinc-400" onClick={() => setShowMinimapModal(true)}>
                  Click to expand
                </span>
                {!isMobile && <span className="text-[0.65rem] text-transparent">.</span>}
              </div>
            </>
          )}

          {/* V1: Frame label shown as additional context if preset spread provides one */}
          {frameLabel && (
            <div className="flex items-center text-zinc-500 text-xs mt-1">
              <span className="italic">Frame: {frameLabel}</span>
            </div>
          )}
        </div>

        {/* Controls row: collapse, badge, depth */}
        <div
          className="flex items-center gap-2 flex-wrap cursor-pointer group"
          onClick={handleCardClick}
        >
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

          {/* Depth navigation - desktop inline, mobile below */}
          {depth === DEPTH.COLLAPSED ? (
            <span className={`ml-auto text-[0.6rem] uppercase tracking-wider transition-colors ${
              isNotLoaded
                ? 'text-amber-600/60 group-hover:text-amber-500/80'
                : 'text-zinc-600 group-hover:text-zinc-500'
            }`}>
              {isNotLoaded ? 'tap to interpret' : 'tap to explore'}
            </span>
          ) : cardLoadingDeeper ? (
            <span className="ml-auto text-xs"><PulsatingLoader color="text-amber-400" /></span>
          ) : !isMobile && (
            isFirstContact && depth !== DEPTH.COLLAPSED ? (
              /* First Contact: Static depth badges as loss leaders */
              <div className="flex-shrink-0 flex gap-1 ml-auto" onClick={(e) => e.stopPropagation()}>
                {['shallow', 'wade', 'swim', 'deep'].map((level) => {
                  const isActive = depth === level;
                  return (
                    <span
                      key={level}
                      title={isActive ? level.charAt(0).toUpperCase() + level.slice(1) : 'Subscribe for deeper insights'}
                      className={`px-2 py-0.5 text-xs rounded ${
                        isActive
                          ? 'bg-amber-500 text-white'
                          : 'bg-zinc-800/30 text-zinc-600 border border-dashed border-zinc-700/50 cursor-default'
                      }`}
                    >
                      {getDepthLabel(level)}
                      {!isActive && <span className="ml-0.5 text-zinc-700">+</span>}
                    </span>
                  );
                })}
              </div>
            ) : !isFirstContact && (
              /* Desktop: Button row inline */
              <div className="flex-shrink-0 flex gap-1 ml-auto" onClick={(e) => e.stopPropagation()}>
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
                      await onLoadDeeper(cardData.index, level, previousContent, ['reading']);
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
            )
          )}

          {showTraditional && trans?.traditional && depth !== DEPTH.COLLAPSED && (
            <span className="text-xs text-zinc-500 ml-auto">{trans.traditional}</span>
          )}
        </div>
      </div>

      {/* Mobile Depth Stepper - under title, left-justified (hidden for First Contact) */}
      {isMobile && !isFirstContact && depth !== DEPTH.COLLAPSED && (
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
                await onLoadDeeper(cardData.index, newDepth, previousContent, ['reading']);
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

      {/* Expansion Buttons - appear at every depth level (excluding architecture and context - they have special handling) */}
      {depth !== DEPTH.COLLAPSED && onExpand && (
        <div className="flex gap-2 flex-wrap mb-4">
          {Object.entries(EXPANSION_PROMPTS)
            .filter(([key, v]) => key !== 'architecture' && !v.hasInput)
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
                {hasExpansion ? `\u2713 ${label}` : label}
              </button>
            );
          })}
          {/* Add Context button — opens multi-turn input */}
          <button
            onClick={(e) => { e.stopPropagation(); setShowContextInput(prev => ({ ...prev, [expansionKey]: !prev[expansionKey] })); }}
            className={`text-xs px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              showContextInput[expansionKey] || sectionExpansions.context
                ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50'
                : 'bg-zinc-800/50 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            Converse
          </button>
        </div>
      )}

      {/* Context thread + input */}
      {depth !== DEPTH.COLLAPSED && onExpand && renderContextUI(expansionKey, sectionExpansions, isExpanding, collapsedExpansions, setCollapsedExpansions)}

      {/* Expansion Content Display - collapsible, never deleted (excludes context - rendered above) */}
      {depth !== DEPTH.COLLAPSED && Object.entries(sectionExpansions).filter(([key]) => key !== 'context').map(([key, expansionContent]) => {
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
            className={`flex flex-wrap items-center gap-2 cursor-pointer group ${rebalancerDepth !== DEPTH.COLLAPSED ? 'mb-3' : ''}`}
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
            <span className="text-sm font-medium text-emerald-400 flex-1 min-w-0">
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
              isFirstContact && rebalancerDepth !== DEPTH.COLLAPSED ? (
                <div className="flex-shrink-0 flex gap-1" onClick={(e) => e.stopPropagation()}>
                  {['shallow', 'wade', 'swim', 'deep'].map((level) => {
                    const isActive = rebalancerDepth === level;
                    return (
                      <span key={level} className={`px-2 py-0.5 text-xs rounded ${isActive ? 'bg-emerald-500 text-white' : 'bg-zinc-800/30 text-zinc-600 border border-dashed border-zinc-700/50 cursor-default'}`}>
                        {getDepthLabel(level)}{!isActive && <span className="ml-0.5 text-zinc-700">+</span>}
                      </span>
                    );
                  })}
                </div>
              ) : !isFirstContact && (
                <div className="flex-shrink-0 flex gap-1" onClick={(e) => e.stopPropagation()}>
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
                              await onLoadDeeper(cardData.index, level, previousContent, ['rebalancer']);
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
              )
            )}
          </div>

          {/* Mobile Depth Stepper - under title, left-justified (hidden for First Contact) */}
          {isMobile && !isFirstContact && rebalancerDepth !== DEPTH.COLLAPSED && (
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
                        await onLoadDeeper(cardData.index, newDepth, previousContent, ['rebalancer']);
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
              {/* Rebalancer Visual: Original Card → Minimap → Correction Card */}
              {/* Responsive: vertical on mobile, horizontal on desktop */}
              {(() => {
                // Use component-level correction values
                const correctionCard = correctionTargetId !== null ? getComponent(correctionTargetId) : null;

                if (!correctionCard) return null;

                return (
                  <div className={`mb-4 ${isMobile ? 'flex flex-col items-center gap-3' : 'flex flex-wrap items-start justify-center gap-4'}`}>
                    {/* Original Drawn Card */}
                    <div className="flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
                      <ClickableTerm type="status" id={draw.status} className={`text-xs mb-1 ${STATUS_COLORS[draw.status]?.split(' ')[0]}`}>
                        {statusPrefix}
                      </ClickableTerm>
                      <div className="w-[200px] h-[200px] flex items-center justify-center">
                        <CardImage
                          transient={draw.transient}
                          status={draw.status}
                          cardName={trans?.name}
                          size="compact"
                          showFrame={true}
                          onImageClick={() => {
                            const data = getComponent(draw.transient);
                            setSelectedInfo?.({ type: 'card', id: draw.transient, data });
                          }}
                        />
                      </div>
                      <ClickableTerm type="card" id={draw.transient} className="text-xs text-amber-300/90 mt-1 text-center max-w-[200px] truncate">
                        {trans?.name}
                      </ClickableTerm>
                      <ClickableCardType transientId={draw.transient} className="text-[0.6rem] text-zinc-500 uppercase tracking-wider" />
                    </div>

                    {/* Minimap showing correction pathway */}
                    {correctionArchetype !== null && (
                      <div className="flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
                        <span className="text-xs mb-1 text-emerald-400/60">Path to Balance</span>
                        <div
                          className="w-[200px] h-[200px] rounded-lg flex items-center justify-center overflow-hidden cursor-pointer transition-all hover:scale-105 hover:border-emerald-400/60"
                          style={{
                            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 46, 22, 0.3) 100%)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3), inset 0 0 20px rgba(16, 185, 129, 0.1)',
                            width: '200px',
                            height: '200px'
                          }}
                          onClick={() => setShowRebalancerMinimapModal(true)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => e.key === 'Enter' && setShowRebalancerMinimapModal(true)}
                          title="Click to expand minimap"
                        >
                          <Minimap
                            fromId={cardHomeArchetype}
                            toId={positionArchetype}
                            size="card"
                            singleMode={true}
                            fromCardType={cardTypeForMinimap}
                            boundIsInner={boundIsInner}
                            secondToId={correctionArchetype}
                            secondToCardType={correctionCardType}
                            secondToBoundIsInner={correctionBoundIsInner}
                          />
                        </div>
                        <GlossaryTerm
                          slug={correction.type === 'diagonal' ? 'diagonal-duality' :
                                correction.type === 'vertical' ? 'vertical-duality' :
                                correction.type === 'reduction' ? 'reduction-pair' : 'rebalancer'}
                          className="text-xs text-emerald-300 mt-1 cursor-pointer hover:text-emerald-400"
                          onClick={() => setShowRebalancerMinimapModal(true)}
                        >
                          {correction.type === 'diagonal' ? 'Diagonal Duality' :
                           correction.type === 'vertical' ? 'Vertical Duality' :
                           correction.type === 'reduction' ? 'Reduction Pair' : 'Rebalancer'}
                        </GlossaryTerm>
                        <span className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-400" onClick={() => setShowRebalancerMinimapModal(true)}>
                          Click to expand
                        </span>
                      </div>
                    )}

                    {/* Correction Card */}
                    <div className="flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
                      <span className="text-xs mb-1 text-emerald-400/60">Rebalance with</span>
                      <div className="w-[200px] h-[200px] flex items-center justify-center">
                        <CardImage
                          transient={correctionTargetId}
                          status={1}
                          cardName={correctionCard?.name}
                          size="compact"
                          showFrame={true}
                          onImageClick={() => {
                            const data = getComponent(correctionTargetId);
                            setSelectedInfo?.({ type: 'card', id: correctionTargetId, data });
                          }}
                        />
                      </div>
                      <ClickableTerm type="card" id={correctionTargetId} className="text-xs text-emerald-300 mt-1 text-center max-w-[200px] truncate">
                        {correctionCard?.name}
                      </ClickableTerm>
                      <ClickableCardType transientId={correctionTargetId} className="text-[0.6rem] text-zinc-600 uppercase tracking-wider" />
                    </div>
                  </div>
                );
              })()}

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

              {/* Rebalancer Expansion Buttons */}
              {onExpand && (
                <div className="flex gap-2 flex-wrap mb-4">
                  {Object.entries(EXPANSION_PROMPTS)
                    .filter(([key, v]) => key !== 'architecture' && !v.hasInput)
                    .map(([key, { label }]) => {
                    const isThisExpanding = isRebalancerExpanding && expanding?.type === key;
                    const hasExpansion = !!rebalancerExpansions[key];
                    const isExpandingOther = isRebalancerExpanding && !isThisExpanding;

                    return (
                      <button
                        key={key}
                        onClick={(e) => { e.stopPropagation(); if (!hasExpansion) onExpand(rebalancerExpansionKey, key); }}
                        disabled={isRebalancerExpanding || hasExpansion}
                        className={getButtonStyle(hasExpansion, isThisExpanding, isExpandingOther)}
                      >
                        {isThisExpanding && (
                          <span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></span>
                        )}
                        {hasExpansion ? `\u2713 ${label}` : label}
                      </button>
                    );
                  })}
                  {/* Add Context button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowContextInput(prev => ({ ...prev, [rebalancerExpansionKey]: !prev[rebalancerExpansionKey] })); }}
                    className={`text-xs px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                      showContextInput[rebalancerExpansionKey] || rebalancerExpansions.context
                        ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50'
                        : 'bg-zinc-800/50 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    Converse
                  </button>
                </div>
              )}

              {/* Rebalancer context thread + input */}
              {onExpand && renderContextUI(rebalancerExpansionKey, rebalancerExpansions, isRebalancerExpanding, collapsedRebalancerExpansions, setCollapsedRebalancerExpansions)}

              {/* Rebalancer Expansion Content Display */}
              {Object.entries(rebalancerExpansions).filter(([key]) => key !== 'context').map(([key, expansionContent]) => {
                if (!expansionContent) return null;
                const isExpCollapsed = collapsedRebalancerExpansions[key] === true;
                const paragraphs = ensureParagraphBreaks(expansionContent).split(/\n\n+/).filter(p => p.trim());
                return (
                  <div key={key} className="mb-4 rounded-lg border border-emerald-700/30 overflow-hidden animate-fadeIn bg-emerald-900/20">
                    <div
                      className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-emerald-800/20 transition-colors"
                      onClick={(e) => { e.stopPropagation(); setCollapsedRebalancerExpansions(prev => ({ ...prev, [key]: !prev[key] })); }}
                    >
                      <span
                        className={`text-xs transition-transform duration-200 ${isExpCollapsed ? 'text-red-500' : 'text-emerald-400'}`}
                        style={{ transform: isExpCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
                      >
                        ▼
                      </span>
                      <span className="text-xs text-emerald-300 uppercase tracking-wider">{EXPANSION_PROMPTS[key]?.label}</span>
                      {isExpCollapsed && <span className="text-[0.6rem] text-zinc-600 ml-auto">tap to expand</span>}
                    </div>
                    {!isExpCollapsed && (
                      <div className="px-3 pb-3 text-sm text-emerald-100/90 border-t border-emerald-700/30 space-y-3">
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

              {/* Rebalancer Architecture (hidden for First Contact) */}
              {!isFirstContact && (rebalancerDepth === DEPTH.SHALLOW || rebalancerDepth === DEPTH.WADE || rebalancerDepth === DEPTH.SWIM || rebalancerDepth === DEPTH.DEEP) && cardData.rebalancer?.architecture && (
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
            className={`flex flex-wrap items-center gap-2 cursor-pointer group ${growthDepth !== DEPTH.COLLAPSED ? 'mb-3' : ''}`}
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
            <span className="text-sm font-medium text-teal-400 flex-1 min-w-0">
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
              isFirstContact && growthDepth !== DEPTH.COLLAPSED ? (
                <div className="flex-shrink-0 flex gap-1" onClick={(e) => e.stopPropagation()}>
                  {['shallow', 'wade', 'swim', 'deep'].map((level) => {
                    const isActive = growthDepth === level;
                    return (
                      <span key={level} className={`px-2 py-0.5 text-xs rounded ${isActive ? 'bg-teal-500 text-white' : 'bg-zinc-800/30 text-zinc-600 border border-dashed border-zinc-700/50 cursor-default'}`}>
                        {getDepthLabel(level)}{!isActive && <span className="ml-0.5 text-zinc-700">+</span>}
                      </span>
                    );
                  })}
                </div>
              ) : !isFirstContact && (
                <div className="flex-shrink-0 flex gap-1" onClick={(e) => e.stopPropagation()}>
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
                              await onLoadDeeper(cardData.index, level, previousContent, ['growth']);
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
              )
            )}
          </div>

          {/* Mobile Depth Stepper - under title, left-justified */}
          {isMobile && !isFirstContact && growthDepth !== DEPTH.COLLAPSED && (
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
                        await onLoadDeeper(cardData.index, newDepth, previousContent, ['growth']);
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
              {/* Growth Visual: Original Card → Minimap → Growth Target */}
              {cardHomeArchetype !== null && positionArchetype !== null && (
                <div className="flex flex-wrap items-start justify-center gap-4 mb-4">
                  {/* Original Drawn Card */}
                  <div className="flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
                    <ClickableTerm type="status" id={draw.status} className={`text-xs mb-1 ${STATUS_COLORS[draw.status]?.split(' ')[0]}`}>
                      {statusPrefix || 'Balanced'}
                    </ClickableTerm>
                    <div className="w-[200px] h-[200px] flex items-center justify-center">
                      <CardImage
                        transient={draw.transient}
                        status={draw.status}
                        cardName={trans?.name}
                        size="compact"
                        showFrame={true}
                        onImageClick={() => {
                          const data = getComponent(draw.transient);
                          setSelectedInfo?.({ type: 'card', id: draw.transient, data });
                        }}
                      />
                    </div>
                    <ClickableTerm type="card" id={draw.transient} className="text-xs text-amber-300/90 mt-1 text-center max-w-[200px] truncate">
                      {trans?.name}
                    </ClickableTerm>
                    <ClickableCardType transientId={draw.transient} className="text-[0.6rem] text-zinc-500 uppercase tracking-wider" />
                  </div>

                  {/* Minimap showing growth pathway */}
                  {(() => {
                    // Compute growth target's archetype position and card type for dual-arrow minimap
                    const growthTargetForMinimap = getComponent(growthTargetId);
                    const growthTargetCardType = growthTargetForMinimap?.type?.toLowerCase() || null;
                    const growthTargetArchetype = getHomeArchetype(growthTargetId);
                    const growthTargetBoundIsInner = growthTargetCardType === 'bound' && growthTargetForMinimap?.number <= 5;

                    return (
                      <div className="flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
                        <span className="text-xs mb-1 text-teal-400/60">Growth Path</span>
                        <div
                          className="w-[200px] h-[200px] rounded-lg flex items-center justify-center overflow-hidden cursor-pointer transition-all hover:scale-105 hover:border-teal-400/60"
                          style={{
                            background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.1) 0%, rgba(5, 46, 46, 0.3) 100%)',
                            border: '1px solid rgba(20, 184, 166, 0.3)',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3), inset 0 0 20px rgba(20, 184, 166, 0.1)',
                            width: '200px',
                            height: '200px'
                          }}
                          onClick={() => setShowGrowthMinimapModal(true)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => e.key === 'Enter' && setShowGrowthMinimapModal(true)}
                          title="Click to expand minimap"
                        >
                          <Minimap
                            fromId={cardHomeArchetype}
                            toId={positionArchetype}
                            size="card"
                            singleMode={true}
                            fromCardType={cardTypeForMinimap}
                            boundIsInner={boundIsInner}
                            secondToId={growthTargetArchetype}
                            secondToCardType={growthTargetCardType !== 'archetype' ? growthTargetCardType : null}
                            secondToBoundIsInner={growthTargetBoundIsInner}
                          />
                        </div>
                        <GlossaryTerm
                          slug={growthType?.slug || 'growth-opportunity'}
                          className="text-xs text-teal-300 mt-1 cursor-pointer hover:text-teal-400"
                        >
                          {growthType?.label || 'Growth Opportunity'}
                        </GlossaryTerm>
                        <span className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-400" onClick={() => setShowGrowthMinimapModal(true)}>
                          Click to expand
                        </span>
                      </div>
                    );
                  })()}

                  {/* Growth Target - for Gestalt: same card (embody), for Agents: Agent of position, for others: position archetype */}
                  {(() => {
                    const growthTargetCard = getComponent(growthTargetId);
                    const growthTargetIsAgent = cardTypeForMinimap === 'agent' && growthTargetCard?.type === 'Agent';
                    const growthTargetName = growthTargetCard?.name || ARCHETYPES[positionArchetype]?.name;
                    const growthTargetLabel = isGestaltCard ? 'Self-Expression' : (growthTargetIsAgent ? 'Agent' : 'Position');

                    return (
                      <div className="flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
                        <span className="text-xs mb-1 text-teal-400/60">
                          {isGestaltCard ? 'Embody This' : 'Growth Context'}
                        </span>
                        <div className="w-[200px] h-[200px] flex items-center justify-center">
                          <CardImage
                            transient={growthTargetId}
                            status={1}
                            cardName={growthTargetName}
                            size="compact"
                            showFrame={true}
                            onImageClick={() => {
                              const data = getComponent(growthTargetId);
                              setSelectedInfo?.({ type: 'card', id: growthTargetId, data });
                            }}
                          />
                        </div>
                        <ClickableTerm type="card" id={growthTargetId} className="text-xs text-teal-300 mt-1 text-center max-w-[200px] truncate">
                          {growthTargetName}
                        </ClickableTerm>
                        <ClickableCardType transientId={growthTargetId} className="text-[0.6rem] text-zinc-600 uppercase tracking-wider" />
                      </div>
                    );
                  })()}
                </div>
              )}

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

              {/* Growth Expansion Buttons */}
              {onExpand && (
                <div className="flex gap-2 flex-wrap mb-4">
                  {Object.entries(EXPANSION_PROMPTS)
                    .filter(([key, v]) => key !== 'architecture' && !v.hasInput)
                    .map(([key, { label }]) => {
                    const isThisExpanding = isGrowthExpanding && expanding?.type === key;
                    const hasExpansion = !!growthExpansions[key];
                    const isExpandingOther = isGrowthExpanding && !isThisExpanding;

                    return (
                      <button
                        key={key}
                        onClick={(e) => { e.stopPropagation(); if (!hasExpansion) onExpand(growthExpansionKey, key); }}
                        disabled={isGrowthExpanding || hasExpansion}
                        className={getButtonStyle(hasExpansion, isThisExpanding, isExpandingOther)}
                      >
                        {isThisExpanding && (
                          <span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></span>
                        )}
                        {hasExpansion ? `\u2713 ${label}` : label}
                      </button>
                    );
                  })}
                  {/* Add Context button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowContextInput(prev => ({ ...prev, [growthExpansionKey]: !prev[growthExpansionKey] })); }}
                    className={`text-xs px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                      showContextInput[growthExpansionKey] || growthExpansions.context
                        ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50'
                        : 'bg-zinc-800/50 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    Converse
                  </button>
                </div>
              )}

              {/* Growth context thread + input */}
              {onExpand && renderContextUI(growthExpansionKey, growthExpansions, isGrowthExpanding, collapsedGrowthExpansions, setCollapsedGrowthExpansions)}

              {/* Growth Expansion Content Display */}
              {Object.entries(growthExpansions).filter(([key]) => key !== 'context').map(([key, expansionContent]) => {
                if (!expansionContent) return null;
                const isExpCollapsed = collapsedGrowthExpansions[key] === true;
                const paragraphs = ensureParagraphBreaks(expansionContent).split(/\n\n+/).filter(p => p.trim());
                return (
                  <div key={key} className="mb-4 rounded-lg border border-teal-700/30 overflow-hidden animate-fadeIn bg-teal-900/20">
                    <div
                      className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-teal-800/20 transition-colors"
                      onClick={(e) => { e.stopPropagation(); setCollapsedGrowthExpansions(prev => ({ ...prev, [key]: !prev[key] })); }}
                    >
                      <span
                        className={`text-xs transition-transform duration-200 ${isExpCollapsed ? 'text-red-500' : 'text-teal-400'}`}
                        style={{ transform: isExpCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
                      >
                        ▼
                      </span>
                      <span className="text-xs text-teal-300 uppercase tracking-wider">{EXPANSION_PROMPTS[key]?.label}</span>
                      {isExpCollapsed && <span className="text-[0.6rem] text-zinc-600 ml-auto">tap to expand</span>}
                    </div>
                    {!isExpCollapsed && (
                      <div className="px-3 pb-3 text-sm text-teal-100/90 border-t border-teal-700/30 space-y-3">
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

              {/* Growth Architecture (if any, hidden for First Contact) */}
              {!isFirstContact && (growthDepth === DEPTH.SHALLOW || growthDepth === DEPTH.WADE || growthDepth === DEPTH.SWIM || growthDepth === DEPTH.DEEP) && cardData.growth?.architecture && (
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
                    {/* Depth navigation - desktop inline, mobile below (hidden for First Contact) */}
                    {whyLoadingDeeper ? (
                      <span className="text-xs"><PulsatingLoader color="text-cyan-400" /></span>
                    ) : !isMobile && (
                      isFirstContact && !isWhyCollapsed ? (
                        <div className="flex-shrink-0 flex gap-1">
                          {['shallow', 'wade', 'swim', 'deep'].map((level) => {
                            const isActive = whyDepth === level;
                            return (
                              <span key={level} className={`px-2 py-0.5 text-xs rounded ${isActive ? 'bg-cyan-500 text-white' : 'bg-zinc-800/30 text-zinc-600 border border-dashed border-zinc-700/50 cursor-default'}`}>
                                {getDepthLabel(level)}{!isActive && <span className="ml-0.5 text-zinc-700">+</span>}
                              </span>
                            );
                          })}
                        </div>
                      ) : !isFirstContact && (
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
                                      await onLoadDeeper(cardData.index, level, previousContent, ['why']);
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
                      )
                    )}
                  </div>

                  {/* Mobile Depth Stepper - under title, left-justified (hidden for First Contact) */}
                  {isMobile && !isFirstContact && (
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
                                await onLoadDeeper(cardData.index, newDepth, previousContent, ['why']);
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
                      // Get content based on depth — use surface if available, else derive from wade
                      const whyContent = whyDepth === 'shallow'
                        ? (cardData.why?.surface || (cardData.why?.wade ? getShallowContent(cardData.why.wade) : null))
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

                  {/* WHY Architecture Box - collapsed (hidden for First Contact) */}
                  {!isFirstContact && cardData.why.architecture && (
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

      {/* Card Architecture Section - visible at all depths, collapsed by default (hidden for First Contact) */}
      {depth !== DEPTH.COLLAPSED && cardData.architecture && !isFirstContact && (
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

                // Get correction info for imbalanced cards
                const itemIsImbalanced = threadItem.draw.status !== 1;
                const itemCorrection = itemIsImbalanced ? getFullCorrection(threadItem.draw.transient, threadItem.draw.status, itemTrans) : null;
                const itemCorrectionTargetId = itemIsImbalanced ? getCorrectionTargetId(itemCorrection, itemTrans) : null;
                const itemCorrectionCard = itemCorrectionTargetId !== null ? getComponent(itemCorrectionTargetId) : null;
                const itemHomeArchetype = getHomeArchetype(threadItem.draw.transient);
                const itemCorrectionArchetype = itemCorrectionTargetId !== null ? getHomeArchetype(itemCorrectionTargetId) : null;
                const itemCardType = getCardType(threadItem.draw.transient);
                const itemBoundIsInner = itemCardType === 'bound' && itemTrans?.number <= 5;
                const itemCorrectionCardType = itemCorrectionTargetId !== null ? getCardType(itemCorrectionTargetId) : null;
                const itemCorrectionBoundIsInner = itemCorrectionCardType === 'bound' && itemCorrectionCard?.number <= 5;

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
                    {/* Card image and minimap for thread draw - responsive layout */}
                    <div className={`mb-3 ${isMobile ? 'flex flex-col items-center gap-3' : 'flex items-center justify-center gap-4'}`}>
                      <div className="flex flex-col items-center">
                        <CardImage
                          transient={threadItem.draw.transient}
                          status={threadItem.draw.status}
                          cardName={itemTrans?.name}
                          size="default"
                          showFrame={true}
                          onImageClick={() => {
                            const data = getComponent(threadItem.draw.transient);
                            setSelectedInfo?.({ type: 'card', id: threadItem.draw.transient, data });
                          }}
                        />
                        <ClickableTerm type="card" id={threadItem.draw.transient} className="text-xs text-amber-300/90 mt-1 text-center">
                          {itemTrans?.name}
                        </ClickableTerm>
                        <ClickableCardType transientId={threadItem.draw.transient} className="text-[0.6rem] text-zinc-500 uppercase tracking-wider" />
                      </div>

                      {/* Minimap with correction path for imbalanced cards */}
                      {itemIsImbalanced && itemCorrectionArchetype !== null && (
                        <>
                          <div className="flex flex-col items-center">
                            <span className="text-xs mb-1 text-emerald-400/60">Path to Balance</span>
                            <div
                              className="rounded-lg flex items-center justify-center overflow-hidden cursor-pointer hover:scale-105 transition-transform"
                              style={{
                                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 46, 22, 0.3) 100%)',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3), inset 0 0 20px rgba(16, 185, 129, 0.1)',
                                width: '120px',
                                height: '110px'
                              }}
                              onClick={() => setThreadMinimapData({
                                fromId: itemHomeArchetype,
                                toId: itemCorrectionArchetype,
                                transient: threadItem.draw.transient,
                                cardType: itemCardType,
                                boundIsInner: itemBoundIsInner,
                                toCardType: itemCorrectionCardType,
                                toBoundIsInner: itemCorrectionBoundIsInner,
                                toTransient: itemCorrectionTargetId
                              })}
                              title="Click to expand"
                            >
                              <Minimap
                                fromId={itemHomeArchetype}
                                toId={itemCorrectionArchetype}
                                size="sm"
                                singleMode={true}
                                fromCardType={itemCardType}
                                boundIsInner={itemBoundIsInner}
                                toCardType={itemCorrectionCardType}
                                toBoundIsInner={itemCorrectionBoundIsInner}
                              />
                            </div>
                          </div>
                          {/* Correction Card */}
                          <div className="flex flex-col items-center">
                            <span className="text-xs mb-1 text-emerald-400/60">Rebalance with</span>
                            <CardImage
                              transient={itemCorrectionTargetId}
                              status={1}
                              cardName={itemCorrectionCard?.name}
                              size="default"
                              showFrame={true}
                              onImageClick={() => {
                                const data = getComponent(itemCorrectionTargetId);
                                setSelectedInfo?.({ type: 'card', id: itemCorrectionTargetId, data });
                              }}
                            />
                            <ClickableTerm type="card" id={itemCorrectionTargetId} className="text-xs text-emerald-300 mt-1 text-center">
                              {itemCorrectionCard?.name}
                            </ClickableTerm>
                            <ClickableCardType transientId={itemCorrectionTargetId} className="text-[0.6rem] text-zinc-600 uppercase tracking-wider" />
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex items-center justify-center gap-2 mb-2">
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

      {/* Minimap Modal - expandable view with description */}
      <MinimapModal
        isOpen={showMinimapModal}
        onClose={() => setShowMinimapModal(false)}
        fromId={cardHomeArchetype}
        toId={positionArchetype}
        transient={draw.transient}
        cardType={cardTypeForMinimap}
        boundIsInner={boundIsInner}
        setSelectedInfo={setSelectedInfo}
        colorTheme="violet"
      />

      {/* Rebalancer Minimap Modal - for correction pathway */}
      {correctionArchetype !== null && (
        <MinimapModal
          isOpen={showRebalancerMinimapModal}
          onClose={() => setShowRebalancerMinimapModal(false)}
          onReopen={() => setShowRebalancerMinimapModal(true)}
          fromId={cardHomeArchetype}
          toId={positionArchetype}
          transient={draw.transient}
          cardType={cardTypeForMinimap}
          boundIsInner={boundIsInner}
          setSelectedInfo={setSelectedInfo}
          navigateFromMinimap={navigateFromMinimap}
          colorTheme="emerald"
          toTransient={correctionTargetId}
          secondToId={correctionArchetype}
          secondToCardType={correctionCardType}
          secondToBoundIsInner={correctionBoundIsInner}
        />
      )}

      {/* Growth Minimap Modal - for balanced cards growth pathway */}
      {positionArchetype !== null && (() => {
        // Compute growth target's archetype position and card type for dual-arrow modal
        const growthTargetForModal = getComponent(growthTargetId);
        const growthTargetModalCardType = growthTargetForModal?.type?.toLowerCase() || null;
        const growthTargetModalArchetype = getHomeArchetype(growthTargetId);
        const growthTargetModalBoundIsInner = growthTargetModalCardType === 'bound' && growthTargetForModal?.number <= 5;

        return (
          <MinimapModal
            isOpen={showGrowthMinimapModal}
            onClose={() => setShowGrowthMinimapModal(false)}
            onReopen={() => setShowGrowthMinimapModal(true)}
            fromId={cardHomeArchetype}
            toId={positionArchetype}
            transient={draw.transient}
            cardType={cardTypeForMinimap}
            boundIsInner={boundIsInner}
            setSelectedInfo={setSelectedInfo}
            navigateFromMinimap={navigateFromMinimap}
            colorTheme="teal"
            toTransient={growthTargetId}
            secondToId={growthTargetModalArchetype}
            secondToCardType={growthTargetModalCardType !== 'archetype' ? growthTargetModalCardType : null}
            secondToBoundIsInner={growthTargetModalBoundIsInner}
          />
        );
      })()}

      {/* Thread Item Minimap Modal - for Reflect/Forge thread corrections */}
      {threadMinimapData && (
        <MinimapModal
          isOpen={!!threadMinimapData}
          onClose={() => setThreadMinimapData(null)}
          onReopen={() => {}} // No reopen needed for thread items
          fromId={threadMinimapData.fromId}
          toId={threadMinimapData.toId}
          transient={threadMinimapData.transient}
          cardType={threadMinimapData.cardType}
          boundIsInner={threadMinimapData.boundIsInner}
          setSelectedInfo={setSelectedInfo}
          navigateFromMinimap={navigateFromMinimap}
          colorTheme="emerald"
          toCardType={threadMinimapData.toCardType}
          toBoundIsInner={threadMinimapData.toBoundIsInner}
          toTransient={threadMinimapData.toTransient}
        />
      )}
    </div>
  );
};

export default DepthCard;
