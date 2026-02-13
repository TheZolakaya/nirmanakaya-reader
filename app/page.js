"use client";
import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import UnfoldPanel from '../components/ui/UnfoldPanel';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';

// Import data and utilities from lib
import {
  // Version
  VERSION,
  // Core data
  ARCHETYPES,
  BOUNDS,
  AGENTS,
  // Constants
  STATUSES,
  STATUS_INFO,
  CHANNELS,
  HOUSES,
  ROLES,
  HOUSE_COLORS,
  STATUS_COLORS,
  CHANNEL_CROSSINGS,
  CHANNEL_COLORS,
  // Spreads
  RANDOM_SPREADS,
  MODE_HELPER_TEXT,
  REFLECT_SPREADS,
  SPREADS_BY_COUNT,
  MODE_EXPLANATIONS,
  // Voice/Stance
  VOICE_MODIFIERS,
  FOCUS_MODIFIERS,
  DENSITY_MODIFIERS,
  SCOPE_MODIFIERS,
  COMPLEXITY_OPTIONS,
  COMPLEXITY_MODIFIERS,
  SERIOUSNESS_MODIFIERS,
  DELIVERY_PRESETS,
  STANCE_PRESETS,
  VOICE_LETTER_TONE,
  buildStancePrompt,
  buildPreviewSentence,
  // Prompts
  BASE_SYSTEM,
  FORMAT_INSTRUCTIONS,
  EXPANSION_PROMPTS,
  LOADING_PHRASES,
  // Prompt Builder (First Contact Mode)
  USER_LEVELS,
  buildSystemPrompt,
  buildUserMessage,
  getAPIConfig,
  parseFirstContactResponse,
  // Corrections
  DIAGONAL_PAIRS,
  VERTICAL_PAIRS,
  REDUCTION_PAIRS,
  getArchetypeCorrection,
  getAssociatedCards,
  getBoundCorrection,
  getAgentCorrection,
  getComponent,
  getFullCorrection,
  getCorrectionText,
  getCorrectionTargetId,
  // Utilities
  ensureParagraphBreaks,
  shuffleArray,
  generateSpread,
  generateDynamicDraws,
  getArchetypeRoot,
  generateTraceDraw,
  encodeDraws,
  decodeDraws,
  sanitizeForAPI,
  formatDrawForAI,
  parseReadingResponse,
  // Persona Translation Layer
  reconstructReadingText,
  validateMarkerPreservation,
  parseTranslatedReading,
  DEFAULT_PERSONA_SETTINGS,
  // Personas
  PERSONAS,
  HUMOR_LEVELS,
  REGISTER_LEVELS,
  CREATOR_LEVELS,
} from '../lib/index.js';

// Import renderWithHotlinks for reading text parsing
import { renderWithHotlinks, processBracketHotlinks } from '../lib/hotlinks.js';

// Import glossary utilities
import { getGlossaryEntry } from '../lib/glossary.js';
import GlossaryTooltip from '../components/shared/GlossaryTooltip.js';

// Import auth components
import { AuthButton, AuthModal } from '../components/auth';
import { SaveReadingButton, ShareReadingButton, EmailReadingButton } from '../components/reading';
import BadgeNotification from '../components/shared/BadgeNotification.js';
import TopicBar from '../components/reader/TopicBar.js';
import CardDetailModal from '../components/reader/CardDetailModal.js';
import LastReadingStrip from '../components/reader/LastReadingStrip.js';
import { getReading, getUser, getSession, supabase, saveReading, updateReadingTelemetry, updateReadingContent, isAdmin, getUserReadingCount, checkCommunityActivity, subscribeToGlobalPresence, trackGlobalPresence, subscribeToGlobalMessages } from '../lib/supabase';

// Import teleology utilities for Words to the Whys
import { buildReadingTeleologicalPrompt } from '../lib/teleology-utils.js';

// Import content filter for prohibited terms
import { filterProhibitedTerms } from '../lib/contentFilter.js';

// Import mode system for governance
import { buildModeHeader } from '../lib/modePrompts.js';

// Import V1 presets
import { READING_PRESETS } from '../lib/postures.js';
import { postProcessModeTransitions } from '../lib/modeTransition.js';
import { WHY_MOMENT_PROMPT } from '../lib/whyVector.js';

// Import complexity system
import {
  MODES as COMPLEXITY_MODES,
  ELEMENTS,
  ELEMENT_SYMBOLS,
  MODE_COLORS,
  MODE_DESCRIPTIONS,
  getLevelInfo,
  legacyFromLevel,
} from '../lib/complexity.js';

// Import React components
import ClickableTermContext from '../components/shared/ClickableTermContext.js';
import InfoModal from '../components/shared/InfoModal.js';
import ThreadedCard from '../components/reader/ThreadedCard.js';
import ReadingSection from '../components/reader/ReadingSection.js';
import StanceSelector from '../components/reader/StanceSelector.js';
import PersonaSelector from '../components/reader/PersonaSelector.js';
import IntroSection from '../components/reader/IntroSection.js';
import DepthCard from '../components/reader/DepthCard.js';
import MobileDepthStepper from '../components/reader/MobileDepthStepper.js';
import Glistener from '../components/reader/Glistener.js';
import GlistenSourcePanel from '../components/reader/GlistenSourcePanel.js';
import CardImage from '../components/reader/CardImage.js';
import Minimap from '../components/reader/Minimap.js';
import { getHomeArchetype, getCardType, getCardImagePath } from '../lib/cardImages.js';
import TextSizeSlider from '../components/shared/TextSizeSlider.js';
import HelpTooltip from '../components/shared/HelpTooltip.js';
import HelpModeOverlay from '../components/shared/HelpModeOverlay.js';

// NOTE: All data constants have been extracted to /lib modules.
// See lib/archetypes.js, lib/constants.js, lib/spreads.js, lib/voice.js, lib/prompts.js, lib/corrections.js, lib/utils.js
// VERSION is now imported from lib/version.js - update it there when releasing

// === DYNAMIC PLACEHOLDER TEXT SYSTEM ===
// Context-aware prompts based on Mode + Count + Layout (Gemini "Dynamic Sanctuary" spec)
const PLACEHOLDER_TEXT = {
  reflect: {
    1: {
      default: "What aspect of self needs a mirror?",
      'single-focus': "What needs your focused attention right now?",
      'core': "What's at the center beneath the noise?",
      'invitation': "What's waiting for you to notice it?",
      'ground': "Where do you need to find stability?"
    },
    2: {
      default: "What dynamic are you navigating?",
      'ground-sky': "Where does your foundation meet your aspiration?",
      'inner-outer': "Where is the gap between inside and outside?",
      'give-receive': "What's the flow of exchange right now?",
      'self-other': "What's happening in this relationship?"
    },
    3: {
      default: "What pattern is unfolding?",
      'arc': "What's in motion? Where is it heading?",
      'time-lens': "What's ending, present, and emerging?",
      'creation': "What are you making? How is it developing?",
      'foundation': "What's supporting what in your structure?"
    },
    4: {
      default: "How are your four domains expressing?",
      'quadraverse': "How are Spirit, Mind, Emotion, and Body showing up?",
      'relationship': "What's the full picture of this dynamic?",
      'decision': "What are the forces around this choice?",
      'cycle': "Where are you in this cycle?"
    },
    5: {
      default: "What's the full architecture?",
      'five-houses': "How are your five houses expressing?",
      'project': "What's the status of this creation?",
      'alignment': "Where is alignment and misalignment?",
      'journey': "Where are you on this path?"
    },
    6: {
      default: "What's the complete picture?",
      'life-domains': "How are all six domains functioning?",
      'full-cycle': "What does the full cycle reveal?",
      'spheres': "How do the spheres of life connect?",
      'integration': "What wants to integrate?"
    }
  },
  discover: {
    1: "What does the field want to show you?",
    2: "What relationship is emerging?",
    3: "What shape do these three signatures create?",
    4: "What architecture is revealing itself?",
    5: "What's the full message waiting for you?",
    6: "What complete transmission is available?"
  },
  explore: {
    any: "Each key word gets its own card."
  },
  forge: {
    1: "What are you creating? State your intention.",
    2: "What's the engine of this creation?",
    3: "What are the forces you're marshaling?",
    4: "What's the structure of your design?",
    5: "What's the full architecture of your intention?",
    6: "What's the complete declaration?"
  }
};

// Default placeholder when no specific match
const DEFAULT_PLACEHOLDER = "What would you like clarity on?";

/**
 * Get context-aware placeholder text based on mode, count, and layout
 * Includes safety fallbacks at every level
 */
function getPlaceholder(mode, count, layout) {
  // Safety: If no mode, return default
  if (!mode) return DEFAULT_PLACEHOLDER;

  const modeText = PLACEHOLDER_TEXT[mode];
  if (!modeText) return DEFAULT_PLACEHOLDER;

  // Explore mode: always same prompt
  if (mode === 'explore') {
    return modeText.any || DEFAULT_PLACEHOLDER;
  }

  // For discover and forge: simple count lookup
  if (mode === 'discover' || mode === 'forge') {
    return modeText[count] || modeText[1] || DEFAULT_PLACEHOLDER;
  }

  // For reflect: check for layout-specific text
  const countText = modeText[count];
  if (!countText) return modeText[1]?.default || DEFAULT_PLACEHOLDER;

  // If countText is a string (shouldn't happen for reflect, but safety)
  if (typeof countText === 'string') return countText;

  // Return layout-specific or default for that count
  return countText[layout] || countText.default || DEFAULT_PLACEHOLDER;
}

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

// Complexity Slider Component - 20 level progressive disclosure
const ComplexitySlider = ({ level, setLevel, maxLevel = 20, showElements = true }) => {
  const info = getLevelInfo(level);
  const modeColor = info.mode === 'reflect' ? 'violet' :
                    info.mode === 'discover' ? 'cyan' :
                    info.mode === 'explore' ? 'amber' : 'rose';

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Mode labels */}
      <div className="flex justify-between mb-2">
        {COMPLEXITY_MODES.map((mode, i) => {
          const modeStart = i * 5 + 1;
          const modeEnd = (i + 1) * 5;
          const isActive = level >= modeStart && level <= modeEnd;
          const isLocked = modeStart > maxLevel;
          return (
            <button
              key={mode}
              onClick={() => !isLocked && setLevel(modeStart)}
              disabled={isLocked}
              className={`px-2 py-1 rounded text-[10px] font-medium uppercase tracking-wider transition-all ${
                isActive
                  ? mode === 'reflect' ? 'bg-violet-500/30 text-violet-300' :
                    mode === 'discover' ? 'bg-cyan-500/30 text-cyan-300' :
                    mode === 'explore' ? 'bg-amber-500/30 text-amber-300' :
                    'bg-rose-500/30 text-rose-300'
                  : isLocked
                    ? 'text-zinc-600 cursor-not-allowed'
                    : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {mode}
            </button>
          );
        })}
      </div>

      {/* Slider track */}
      <div className="relative h-10 flex items-center">
        {/* Background track with mode sections */}
        <div className="absolute inset-x-0 h-2 rounded-full overflow-hidden flex">
          {COMPLEXITY_MODES.map((mode, i) => (
            <div
              key={mode}
              className={`flex-1 ${
                mode === 'reflect' ? 'bg-violet-900/50' :
                mode === 'discover' ? 'bg-cyan-900/50' :
                mode === 'explore' ? 'bg-amber-900/50' :
                'bg-rose-900/50'
              }`}
            />
          ))}
        </div>

        {/* Fill track */}
        <div
          className={`absolute left-0 h-2 rounded-full transition-all ${
            info.mode === 'reflect' ? 'bg-violet-500' :
            info.mode === 'discover' ? 'bg-cyan-500' :
            info.mode === 'explore' ? 'bg-amber-500' :
            'bg-rose-500'
          }`}
          style={{ width: `${(level / 20) * 100}%` }}
        />

        {/* Tick marks */}
        <div className="absolute inset-x-0 flex justify-between px-0">
          {Array.from({ length: 20 }).map((_, i) => {
            const tickLevel = i + 1;
            const isLocked = tickLevel > maxLevel;
            const isModeStart = tickLevel % 5 === 1;
            return (
              <div
                key={i}
                className={`w-0.5 rounded-full transition-all ${
                  isModeStart ? 'h-3' : 'h-1.5'
                } ${
                  tickLevel <= level ? 'bg-white/50' :
                  isLocked ? 'bg-zinc-700' : 'bg-zinc-600'
                }`}
              />
            );
          })}
        </div>

        {/* Range input */}
        <input
          type="range"
          min="1"
          max={maxLevel}
          value={Math.min(level, maxLevel)}
          onChange={(e) => setLevel(parseInt(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        {/* Current position indicator */}
        <div
          className={`absolute w-5 h-5 rounded-full border-2 transition-all -translate-x-1/2 pointer-events-none ${
            info.mode === 'reflect' ? 'bg-violet-500 border-violet-300' :
            info.mode === 'discover' ? 'bg-cyan-500 border-cyan-300' :
            info.mode === 'explore' ? 'bg-amber-500 border-amber-300' :
            'bg-rose-500 border-rose-300'
          }`}
          style={{ left: `${((level - 1) / 19) * 100}%` }}
        />
      </div>

      {/* Element indicators */}
      {showElements && (
        <div className="flex justify-between mt-1 px-0">
          {Array.from({ length: 20 }).map((_, i) => {
            const tickLevel = i + 1;
            const el = ELEMENTS[(tickLevel - 1) % 5];
            const isSelected = tickLevel === level;
            const isLocked = tickLevel > maxLevel;
            return (
              <span
                key={i}
                className={`text-[9px] transition-all ${
                  isSelected ? 'text-white scale-150' :
                  isLocked ? 'text-zinc-700' : 'text-zinc-500'
                }`}
                title={`${el} (Level ${tickLevel})`}
              >
                {ELEMENT_SYMBOLS[el]}
              </span>
            );
          })}
        </div>
      )}

      {/* Current selection info */}
      <div className={`mt-4 p-3 rounded-lg text-center ${
        info.mode === 'reflect' ? 'bg-violet-500/10 border border-violet-500/30' :
        info.mode === 'discover' ? 'bg-cyan-500/10 border border-cyan-500/30' :
        info.mode === 'explore' ? 'bg-amber-500/10 border border-amber-500/30' :
        'bg-rose-500/10 border border-rose-500/30'
      }`}>
        <div className="flex items-center justify-center gap-3 text-sm">
          <span className={`font-medium capitalize ${
            info.mode === 'reflect' ? 'text-violet-300' :
            info.mode === 'discover' ? 'text-cyan-300' :
            info.mode === 'explore' ? 'text-amber-300' :
            'text-rose-300'
          }`}>
            {info.mode}
          </span>
          <span className="text-zinc-500">•</span>
          <span className="text-zinc-300">{info.cardCount} card{info.cardCount > 1 ? 's' : ''}</span>
          <span className="text-zinc-500">•</span>
          <span className="text-zinc-400 capitalize flex items-center gap-1">
            {ELEMENT_SYMBOLS[info.element]} {info.element}
          </span>
        </div>
        <div className="text-xs text-zinc-500 mt-1">{MODE_DESCRIPTIONS[info.mode]}</div>
      </div>
    </div>
  );
};

// Helper to extract summary content from either string (legacy) or object (new depth format)
const getSummaryContent = (summaryInput, depth = 'shallow') => {
  if (!summaryInput) return '';
  // Parse JSON strings from saved readings
  let summary = summaryInput;
  if (typeof summary === 'string' && summary.startsWith('{')) {
    try { summary = JSON.parse(summary); } catch (e) { return summary; }
  }
  if (typeof summary === 'string') return summary;
  // New format: { wade, swim, deep } - shallow derives from wade
  // Use explicit null check to avoid empty string fallback issues
  if (depth === 'shallow') {
    // Use actual surface content from API if available
    if (summary.surface) return summary.surface;
    // Fallback: derive from wade
    const wadeContent = summary.wade || '';
    if (!wadeContent) return '';
    const sentences = wadeContent.split(/(?<=[.!?])\s+/);
    return sentences.slice(0, 3).join(' ');
  }
  if (summary[depth] != null && summary[depth] !== '') return summary[depth];
  if (summary.wade != null && summary.wade !== '') return summary.wade;
  if (summary.swim != null && summary.swim !== '') return summary.swim;
  if (summary.deep != null && summary.deep !== '') return summary.deep;
  return '';
};

// Helper to extract "Why This Reading Appeared" content at specified depth
const getWhyAppearedContent = (whyInput, depth = 'shallow') => {
  if (!whyInput) return '';
  // Parse JSON strings from saved readings
  let whyAppeared = whyInput;
  if (typeof whyAppeared === 'string' && whyAppeared.startsWith('{')) {
    try { whyAppeared = JSON.parse(whyAppeared); } catch (e) { return whyAppeared; }
  }
  if (typeof whyAppeared === 'string') return whyAppeared;
  // Format: { wade, swim, deep } - shallow uses surface, falls back to wade
  if (depth === 'shallow') {
    if (whyAppeared.surface) return whyAppeared.surface;
    const wadeContent = whyAppeared.wade || '';
    if (!wadeContent) return '';
    const sentences = wadeContent.split(/(?<=[.!?])\s+/);
    return sentences.slice(0, 3).join(' ');
  }
  if (whyAppeared[depth] != null && whyAppeared[depth] !== '') return whyAppeared[depth];
  if (whyAppeared.wade != null && whyAppeared.wade !== '') return whyAppeared.wade;
  if (whyAppeared.swim != null && whyAppeared.swim !== '') return whyAppeared.swim;
  if (whyAppeared.deep != null && whyAppeared.deep !== '') return whyAppeared.deep;
  return '';
};

// Helper to extract letter content from either string (legacy) or object (new depth format)
const getLetterContent = (letterInput, depth = 'shallow') => {
  if (!letterInput) return '';
  // Parse JSON strings from saved readings
  let letter = letterInput;
  if (typeof letter === 'string' && letter.startsWith('{')) {
    try { letter = JSON.parse(letter); } catch (e) { return letter; }
  }
  if (typeof letter === 'string') return letter;
  // New format: { wade, swim, deep } - shallow derives from wade
  // Use explicit null check to avoid empty string fallback issues
  if (depth === 'shallow') {
    // Use actual surface content from API if available
    if (letter.surface) return letter.surface;
    // Fallback: derive from wade
    const wadeContent = letter.wade || '';
    if (!wadeContent) return '';
    const sentences = wadeContent.split(/(?<=[.!?])\s+/);
    return sentences.slice(0, 3).join(' ');
  }
  if (letter[depth] != null && letter[depth] !== '') return letter[depth];
  if (letter.wade != null && letter.wade !== '') return letter.wade;
  if (letter.swim != null && letter.swim !== '') return letter.swim;
  if (letter.deep != null && letter.deep !== '') return letter.deep;
  return '';
};

// Discover mode descriptions by position count
const DISCOVER_DESCRIPTIONS = {
  1: {
    subtitle: "One signature from the Field",
    whenToUse: "When you want the most focused response",
    whatYoullSee: "A single pattern and how it's expressing"
  },
  2: {
    subtitle: "Two signatures from the Field",
    whenToUse: "When you want slightly more context",
    whatYoullSee: "Two patterns and how they relate to each other"
  },
  3: {
    subtitle: "Three signatures from the Field",
    whenToUse: "When you want a fuller picture",
    whatYoullSee: "Three patterns and the shape they create together"
  },
  4: {
    subtitle: "Four signatures from the Field",
    whenToUse: "When you want more comprehensive coverage",
    whatYoullSee: "Four patterns and how they're interacting"
  },
  5: {
    subtitle: "Five signatures from the Field",
    whenToUse: "When you want the most depth",
    whatYoullSee: "Five patterns — the fullest Discover reading"
  }
};

// Forge mode description
const FORGE_DESCRIPTION = {
  subtitle: "One signature to reflect on your creative intent",
  whenToUse: "When you're ready to declare and act",
  whatYoullSee: "A single pattern that meets your intention — showing what's supporting it, challenging it, or waiting to be integrated"
};

// === MAIN COMPONENT ===
export default function NirmanakaReader() {
  const [question, setQuestion] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [spreadType, setSpreadType] = useState('discover'); // 'reflect' | 'discover' | 'forge' | 'explore' (internal, synced from frameSource)
  const [dtpInput, setDtpInput] = useState(''); // DTP (Dynamic frame) text input
  const [dtpTokens, setDtpTokens] = useState(null); // DTP tokens array for Dynamic frame
  const [spreadKey, setSpreadKey] = useState('three');
  const [reflectCardCount, setReflectCardCount] = useState(3); // 1-6 for Preset frame
  const [reflectSpreadKey, setReflectSpreadKey] = useState('arc'); // Selected spread in Preset frame
  // V1 Layer Architecture: Frame + Posture + Card Count (replaces mode tabs)
  const [frameSource, setFrameSource] = useState('architecture'); // 'architecture' | 'preset' | 'dynamic'
  const [posture, setPosture] = useState('discover'); // 'reflect' | 'discover' | 'integrate' (internal, set by presets)
  const [cardCount, setCardCount] = useState(3); // 1-5 for architecture frame
  const [stance, setStance] = useState({ complexity: 'friend', seriousness: 'playful', voice: 'warm', focus: 'feel', density: 'essential', scope: 'here' }); // Default: Clear
  const [showCustomize, setShowCustomize] = useState(false);
  const [draws, setDraws] = useState(null);
  const [parsedReading, setParsedReading] = useState(null);
  const [expansions, setExpansions] = useState({}); // {sectionKey: {unpack: '...', clarify: '...'}}
  const [expanding, setExpanding] = useState(null); // {section: 'card:1', type: 'unpack'}
  const [collapsedSections, setCollapsedSections] = useState({}); // {sectionKey: true/false} - tracks collapsed state
  const [synthContextInput, setSynthContextInput] = useState({}); // { summary: true } - which synth sections show converse input
  const [synthContextText, setSynthContextText] = useState({}); // { summary: 'user text' } - converse input values
  const [defaultDepth, setDefaultDepth] = useState('shallow'); // Master default: 'shallow' | 'wade'
  const [defaultExpanded, setDefaultExpanded] = useState(true); // When true, nested sections start expanded
  const [controlTooltip, setControlTooltip] = useState(null); // { text: string, x: 'depth'|'cards' } for brief feedback
  const [letterDepth, setLetterDepth] = useState('shallow'); // 'shallow' | 'wade' | 'swim' | 'deep'
  const [pathDepth, setPathDepth] = useState('shallow'); // 'shallow' | 'wade' | 'swim' | 'deep'
  const [summaryDepth, setSummaryDepth] = useState('shallow'); // 'shallow' | 'wade' | 'swim' | 'deep'
  const [whyAppearedDepth, setWhyAppearedDepth] = useState('shallow'); // 'shallow' | 'wade' | 'swim' | 'deep'

  // Auth state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('signin');
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false); // Track if auth check is complete
  const [savedReadingId, setSavedReadingId] = useState(null);
  const [userIsAdmin, setUserIsAdmin] = useState(false);
  const [communityActivity, setCommunityActivity] = useState(false); // For header indicator
  // Glistener state
  const [showGlistener, setShowGlistener] = useState(false);
  const [glistenerContent, setGlistenerContent] = useState(null); // Content from Glistener to display in placeholder
  const [glistenerPhase, setGlistenerPhase] = useState('idle');
  const [glistenData, setGlistenData] = useState(null); // Full glisten data for saving to My Readings
  const [showGlistenPanel, setShowGlistenPanel] = useState(false); // Show Glistened Tale panel in reading
  const glistenerScrollRef = useRef(null);
  const [userReadingCount, setUserReadingCount] = useState(0);
  const userContextRef = useRef(''); // Cached user journey context block for prompt injection
  const readingConverseRef = useRef([]); // Reading-level converse accumulator: [{section, userText}]
  const [pendingBadges, setPendingBadges] = useState(null); // Newly earned badges to display
  const [activeTopic, setActiveTopic] = useState(null); // Currently selected saved topic
  const [cardDetailId, setCardDetailId] = useState(null); // Transient ID for CardDetailModal (null = closed)
  const userStatsRef = useRef(null); // Cached user stats for CardDetailModal
  // Locus control state — subjects-based (chip input)
  const [locusSubjects, setLocusSubjects] = useState([]);
  const [locusInput, setLocusInput] = useState('');
  const [locusExpanded, setLocusExpanded] = useState(false);
  const [featureFlags, setFeatureFlags] = useState({ locus_control_enabled: false, email_system_enabled: true });

  // Lounge online count
  const [loungeOnlineCount, setLoungeOnlineCount] = useState(0);
  const [featureConfig, setFeatureConfig] = useState({
    advancedVoiceFor: 'everyone',
    modelsForAdmins: ['haiku', 'sonnet', 'opus'],
    modelsForUsers: ['sonnet'],
    defaultModelAdmin: 'sonnet',
    defaultModelUser: 'sonnet',
    // NOTE: defaultVoice intentionally omitted here to prevent race condition
    // The useEffect that applies voice defaults should only run AFTER
    // the API returns the actual config from the database
    defaultMode: 'reflect',
    defaultSpread: 'triad'
  });

  // Advanced mode toggle for Origami Unfold UI
  // When false: simple UI (just textarea + button)
  // When true: full controls visible (mode tabs, personas, depth, etc.)
  const [advancedMode, setAdvancedMode] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  // Ripple/Pulse animation state (Gemini "Dynamic Sanctuary" spec)
  // rippleTarget: 'counts' | 'layouts' | null - which row is rippling
  // readyFlash: boolean - textarea border flash when final selection made
  // selectionConfirmed: boolean - true after second tap (ready to collapse)
  // placeholderFlash: boolean - flash animation on placeholder text
  // crystalFlash: boolean - border + text flash when glisten crystal transfers
  // borderFlashActive: boolean - single gradiated flash on first selection (ramp up → ramp down → off)
  // borderPulseActive: boolean - continuous slow pulse after confirmation (stays on until expanded/mode change/initiate)
  // initiateFlash: boolean - rainbow flash when Initiate is clicked
  const [rippleTarget, setRippleTarget] = useState(null);
  const [readyFlash, setReadyFlash] = useState(false);
  const [selectionConfirmed, setSelectionConfirmed] = useState(false);
  const [placeholderFlash, setPlaceholderFlash] = useState(false);
  const [crystalFlash, setCrystalFlash] = useState(false);
  const [borderFlashActive, setBorderFlashActive] = useState(false);
  const [borderPulseActive, setBorderPulseActive] = useState(false);
  const [initiateFlash, setInitiateFlash] = useState(false);

  // Track previous selections for "tap again to confirm" logic
  const [lastFinalSelection, setLastFinalSelection] = useState(null);

  // Ripple trigger: When mode changes, ripple count buttons (skip on initial mount)
  // Also sync question/dtpInput when switching to/from Explore mode
  const spreadTypeRef = useRef(spreadType);
  useEffect(() => {
    const prevMode = spreadTypeRef.current;
    if (prevMode !== spreadType) {
      // Sync question values when switching to/from Explore
      if (spreadType === 'explore' && question && !dtpInput) {
        // Switching TO explore: copy question to dtpInput
        setDtpInput(question);
      } else if (prevMode === 'explore' && dtpInput && !question) {
        // Switching FROM explore: copy dtpInput to question
        setQuestion(dtpInput);
      }

      if (advancedMode) {
        setRippleTarget('counts');
        setTimeout(() => setRippleTarget(null), 800);
        // Reset confirmation when mode changes
        setSelectionConfirmed(false);
        setLastFinalSelection(null);
      }
    }
    spreadTypeRef.current = spreadType;
  }, [spreadType, advancedMode, question, dtpInput]);

  // Ripple trigger: When count changes in Reflect mode, ripple layout buttons
  const reflectCardCountRef = useRef(reflectCardCount);
  useEffect(() => {
    if (reflectCardCountRef.current !== reflectCardCount && advancedMode && spreadType === 'reflect') {
      setRippleTarget('layouts');
      setTimeout(() => setRippleTarget(null), 800);
      // Reset confirmation when count changes
      setSelectionConfirmed(false);
      setLastFinalSelection(null);
    }
    reflectCardCountRef.current = reflectCardCount;
  }, [reflectCardCount, advancedMode, spreadType]);

  // Helper function to handle final selection tap (first tap = preview, second tap = confirm)
  const handleFinalSelectionTap = (selectionKey, isNewSelection) => {
    if (isNewSelection) {
      // First tap on NEW selection: single gradiated flash (ramp up → ramp down → off)
      setReadyFlash(true);
      setTimeout(() => setReadyFlash(false), 200);
      setLastFinalSelection(selectionKey);
      setSelectionConfirmed(false);
      // Single flash animation (not continuous pulse)
      setBorderFlashActive(true);
      setBorderPulseActive(false);
      setTimeout(() => setBorderFlashActive(false), 600);
    } else {
      // Second tap on SAME selection: COLLAPSE FIRST, then start continuous pulse
      setAdvancedMode(false);
      setSelectionConfirmed(true);
      // Now do the long flash after collapse
      setReadyFlash(true);
      setPlaceholderFlash(true);
      setTimeout(() => {
        setReadyFlash(false);
        setPlaceholderFlash(false);
      }, 800);
      // Start continuous slow pulse (stays on until expanded/mode change/initiate)
      setBorderFlashActive(false);
      setBorderPulseActive(true);
    }
  };

  // Collapse triggers: textarea click always collapses when in advanced mode
  const handleTextareaClick = () => {
    if (advancedMode) {
      // User clicked textarea - COLLAPSE FIRST, then start continuous pulse
      setAdvancedMode(false);
      setSelectionConfirmed(true);
      // Brief placeholder flash
      setPlaceholderFlash(true);
      setTimeout(() => setPlaceholderFlash(false), 800);
      // Start continuous slow pulse (stays on until expanded/mode change/initiate)
      setBorderFlashActive(false);
      setBorderPulseActive(true);
    }
  };

  // Turn off border flash/pulse when expanding, changing mode, or on unmount
  useEffect(() => {
    if (advancedMode) {
      setBorderFlashActive(false);
      setBorderPulseActive(false);
    }
  }, [advancedMode]);

  useEffect(() => {
    // Mode changed - turn off flash and pulse
    setBorderFlashActive(false);
    setBorderPulseActive(false);
  }, [spreadType]);

  // V1: Sync frameSource → spreadType (internal compatibility)
  // Posture is internal (set by presets), frame determines the reading type
  const COUNT_TO_KEY = { 1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five' };
  useEffect(() => {
    if (frameSource === 'architecture') {
      setSpreadType('discover');
      setSpreadKey(COUNT_TO_KEY[cardCount] || 'three');
    } else if (frameSource === 'preset') {
      setSpreadType('reflect');
    } else if (frameSource === 'dynamic') {
      setSpreadType('explore');
    }
  }, [frameSource, cardCount]);

  // Listen for auth modal open event
  useEffect(() => {
    const handleOpenAuth = () => setAuthModalOpen(true);
    window.addEventListener('open-auth-modal', handleOpenAuth);
    return () => window.removeEventListener('open-auth-modal', handleOpenAuth);
  }, []);

  // Check for password reset URL param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('reset_password') === 'true') {
      setAuthModalMode('reset');
      setAuthModalOpen(true);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Check for existing auth session on page load (for OAuth redirect)
  useEffect(() => {
    async function checkExistingSession() {
      console.log('[Page] Checking for existing session...');
      const { user } = await getUser();
      console.log('[Page] getUser returned:', user?.email || 'null');
      if (user) {
        setCurrentUser(user);
        setUserIsAdmin(isAdmin(user));
      }
      setAuthChecked(true); // Mark auth check as complete
    }

    // Fetch feature config
    async function fetchFeatureConfig() {
      try {
        const res = await fetch('/api/admin/config');
        const data = await res.json();
        if (data.config) {
          setFeatureConfig(data.config);
        }
      } catch (err) {
        console.log('[Config] Using defaults');
      }
    }

    // Fetch feature flags (locus, email, etc.)
    async function fetchFeatureFlags() {
      try {
        const res = await fetch('/api/feature-flags');
        const data = await res.json();
        if (data.success && data.flags) {
          setFeatureFlags(data.flags);
        }
      } catch (err) {
        console.log('[FeatureFlags] Using defaults');
      }
    }

    // Also listen for auth state changes
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        console.log('[Page] Auth state changed:', event, session?.user?.email);
        setCurrentUser(session?.user ?? null);
        setUserIsAdmin(session?.user ? isAdmin(session.user) : false);
      });

      checkExistingSession();
      fetchFeatureConfig();
      fetchFeatureFlags();

      return () => subscription.unsubscribe();
    } else {
      checkExistingSession();
      fetchFeatureConfig();
      fetchFeatureFlags();
    }
  }, []);

  // Track community activity for header indicator
  useEffect(() => {
    if (!currentUser) return;

    let globalPresenceChannel = null;
    let globalMessagesChannel = null;

    async function initCommunityTracking() {
      // Check for recent activity on mount
      const { hasActivity } = await checkCommunityActivity(15); // Last 15 minutes
      setCommunityActivity(hasActivity);

      // Subscribe to global presence
      globalPresenceChannel = subscribeToGlobalPresence((users) => {
        // If anyone else is online, show activity
        const othersOnline = users.filter(u => u.user_id !== currentUser.id).length > 0;
        if (othersOnline) setCommunityActivity(true);
      });

      // Track our own presence
      trackGlobalPresence(globalPresenceChannel, currentUser, currentUser.email?.split('@')[0]);

      // Subscribe to new messages
      globalMessagesChannel = subscribeToGlobalMessages(() => {
        setCommunityActivity(true);
      });
    }

    initCommunityTracking();

    return () => {
      globalPresenceChannel?.unsubscribe();
      globalMessagesChannel?.unsubscribe();
    };
  }, [currentUser]);

  // Fetch user's reading count for Glistener gating
  useEffect(() => {
    async function fetchReadingCount() {
      if (currentUser?.id) {
        const count = await getUserReadingCount(currentUser.id);
        setUserReadingCount(count);
      } else {
        setUserReadingCount(0);
      }
    }
    fetchReadingCount();
  }, [currentUser]);

  // Track lounge online presence (General room: d094a308-ec46-40d8-8c4a-0cfa123f638d)
  useEffect(() => {
    const channel = supabase.channel('presence:d094a308-ec46-40d8-8c4a-0cfa123f638d')
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const count = Object.values(state).flat().length;
        setLoungeOnlineCount(count);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Load advancedMode from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('nirmanakaya-advanced-mode');
    if (saved !== null) {
      try {
        setAdvancedMode(JSON.parse(saved));
      } catch (e) {
        // Invalid JSON, use default
      }
    }
  }, []);

  // Save advancedMode to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('nirmanakaya-advanced-mode', JSON.stringify(advancedMode));
  }, [advancedMode]);

  // Config defaults applied after state declarations (see below)
  const [configApplied, setConfigApplied] = useState(false);

  // Load saved reading from URL param (?load=readingId) or resume from sessionStorage
  useEffect(() => {
    async function loadSavedReading() {
      const params = new URLSearchParams(window.location.search);
      let loadId = params.get('load');

      // Auto-resume: if no URL param, check sessionStorage for active reading
      if (!loadId) {
        try { loadId = sessionStorage.getItem('nirmanakaya_active_reading'); } catch (e) { /* ignore */ }
      }
      if (!loadId) return;

      try {
        const { data, error } = await getReading(loadId);
        if (error || !data) {
          console.error('Failed to load saved reading:', error);
          return;
        }

        // Restore state from saved reading
        setQuestion(data.question || '');
        setSpreadType(data.mode || 'discover');
        if (data.spread_type) {
          if (data.mode === 'reflect') {
            setReflectSpreadKey(data.spread_type);
          } else {
            setSpreadKey(data.spread_type);
          }
        }

        // Restore draws (cards array contains both draw data and interpretations)
        if (data.cards && Array.isArray(data.cards)) {
          const restoredDraws = data.cards.map(card => ({
            position: card.position,
            transient: card.transient,
            status: card.status
          }));
          setDraws(restoredDraws);

          // Restore parsed reading from saved interpretations
          // Check if card has actual content
          const hasContent = (card) => card?.interpretation &&
            (card.interpretation.wade || card.interpretation.surface || card.interpretation.swim || card.interpretation.deep);

          const restoredCards = data.cards.map((card, i) => {
            if (hasContent(card)) {
              return { ...card.interpretation, index: i, _notLoaded: false };
            }
            return {
              index: i,
              surface: null,
              wade: null,
              swim: null,
              deep: null,
              architecture: null,
              mirror: null,
              rebalancer: null,
              why: { surface: null, wade: null, swim: null, deep: null, architecture: null },
              _notLoaded: true // Mark as needing load
            };
          });

          // Check if any cards need loading (enables on-demand fetch)
          const anyCardsNeedLoad = restoredCards.some(c => c._notLoaded);

          // Build system prompt for on-demand fetching if needed
          if (anyCardsNeedLoad) {
            const systemPrompt = buildSystemPrompt(userLevel, {
              spreadType: data.mode || 'discover',
              posture, // V1: explicit posture for governance
              stance,
              showArchitecture: showArchitectureTerms
            });
            setSystemPromptCache(systemPrompt);
          }

          setParsedReading({
            cards: restoredCards,
            letter: data.letter || { surface: null, wade: null, swim: null, deep: null },
            summary: data.synthesis?.summary || { surface: null, wade: null, swim: null, deep: null },
            path: data.synthesis?.path || { surface: null, wade: null, swim: null, deep: null, architecture: null },
            fullArchitecture: data.synthesis?.fullArchitecture || null,
            _restored: true,
            _onDemand: anyCardsNeedLoad // Enable on-demand loading if content missing
          });
        }

        setSavedReadingId(data.id);

        // Restore expansions and follow-up messages from synthesis JSONB
        if (data.synthesis?._expansions) {
          setExpansions(data.synthesis._expansions);
        }
        if (data.synthesis?._followUpMessages) {
          setFollowUpMessages(data.synthesis._followUpMessages);
        }

        // Restore thread data
        if (data.thread_data && typeof data.thread_data === 'object') {
          setThreadData(data.thread_data);
        }

        // Clear the URL param after loading
        window.history.replaceState({}, '', window.location.pathname);
      } catch (e) {
        console.error('Error loading saved reading:', e);
      }
    }

    loadSavedReading();
  }, []);

  // Mobile detection for depth stepper
  const [isMobileDepth, setIsMobileDepth] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobileDepth(window.innerWidth < 480);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Toggle collapse state for a section
  // defaultCollapsed: true for sections that start collapsed, false for sections that start expanded
  const toggleCollapse = (sectionKey, defaultCollapsed = true) => {
    setCollapsedSections(prev => {
      // Determine current visual state based on the section's default
      const isCurrentlyCollapsed = defaultCollapsed
        ? prev[sectionKey] !== false  // default collapsed: undefined or true = collapsed
        : prev[sectionKey] === true;  // default expanded: only true = collapsed
      // Toggle to the opposite visual state
      return { ...prev, [sectionKey]: !isCurrentlyCollapsed };
    });
  };
  const [followUpMessages, setFollowUpMessages] = useState([]); // For general follow-ups after the reading
  const [followUpLoading, setFollowUpLoading] = useState(false); // Separate loading state for follow-ups
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showTraditional, setShowTraditional] = useState(false);
  const [showArchitecture, setShowArchitecture] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [isSharedReading, setIsSharedReading] = useState(false);
  const [selectedInfo, setSelectedInfo] = useState(null); // {type: 'card'|'channel'|'status'|'house', id: ..., data: ...}
  const [infoHistory, setInfoHistory] = useState([]); // Stack of previous selectedInfo values for back navigation
  const minimapRestoreRef = useRef(null); // Callback to restore minimap when going back from info
  const [glossaryTooltip, setGlossaryTooltip] = useState(null); // {entry, position: {x, y}}
  const [helpMode, setHelpMode] = useState(false); // Interactive help mode
  const [helpTooltip, setHelpTooltip] = useState(null); // {helpKey, position}
  const [showMidReadingStance, setShowMidReadingStance] = useState(false);
  const [showFineTune, setShowFineTune] = useState(false);
  const [helpPopover, setHelpPopover] = useState(null); // 'dynamicLens' | 'fixedLayout' | 'stance' | null
  const [loadingPhrases, setLoadingPhrases] = useState([]);
  const [loadingPhraseIndex, setLoadingPhraseIndex] = useState(0);
  const [loadingPhraseVisible, setLoadingPhraseVisible] = useState(true);
  const [showLandingFineTune, setShowLandingFineTune] = useState(false);
  const [showVoicePanel, setShowVoicePanel] = useState(false); // Voice settings collapsed by default (FR22)
  const [showVoicePreview, setShowVoicePreview] = useState(true); // Voice sample preview toggle (default ON)
  const [showCompactPersona, setShowCompactPersona] = useState(false); // Compact persona flyout above Go button
  const [animatedBackground, setAnimatedBackground] = useState(true); // Animated background toggle
  const [showBgControls, setShowBgControls] = useState(false); // Show/hide background controls panel
  const [backgroundOpacity, setBackgroundOpacity] = useState(30); // Background opacity (0-100)
  const [contentDim, setContentDim] = useState(0); // Dark overlay behind content (0-100)
  const [theme, setTheme] = useState('dark'); // 'dark' or 'light'
  const [backgroundType, setBackgroundType] = useState('video'); // 'video' or 'image'
  const [selectedVideo, setSelectedVideo] = useState(0); // Index into videoBackgrounds (0 = cosmos default)
  const [selectedImage, setSelectedImage] = useState(0); // Index into imageBackgrounds
  const [showCardImages, setShowCardImages] = useState(true); // Show card art as background in signature cards
  const [pulseUnseen, setPulseUnseen] = useState(false); // Flash pulse button until user visits today's pulse

  const videoBackgrounds = [
    { id: "cosmos", src: "/video/cosmos.mp4", label: "Cosmos" },
    { id: "ocean", src: "/video/background.mp4", label: "Ocean" },
    { id: "ocean2", src: "/video/ocean2.mp4", label: "Deep Ocean" },
    { id: "rainbow", src: "/video/rainbow.mp4", label: "Rainbow" },
    { id: "forest", src: "/video/forest.mp4", label: "Forest" },
    { id: "violet", src: "/video/violet.mp4", label: "Violet" },
  ];

  const imageBackgrounds = [
    { id: "deep-ocean-1", src: "/images/Zolakaya_abstract_fractal_deep_blue_ocean_fills_the_image_--s_834b4b03-ff4a-4dba-b095-276ca0078063_1.png", label: "Deep Ocean 1" },
    { id: "deep-ocean-2", src: "/images/Zolakaya_abstract_fractal_deep_blue_ocean_fills_the_image_--s_834b4b03-ff4a-4dba-b095-276ca0078063_3.png", label: "Deep Ocean 2" },
    { id: "cosmic-1", src: "/images/Zolakaya_Cosmic_rainbow_of_colors_fractal_expressions_of_holy_71e29517-f921-418c-9415-aa100c5acf4e_0.png", label: "Cosmic 1" },
    { id: "cosmic-2", src: "/images/Zolakaya_Cosmic_rainbow_of_colors_fractal_expressions_of_holy_71e29517-f921-418c-9415-aa100c5acf4e_1.png", label: "Cosmic 2" },
    { id: "cosmic-3", src: "/images/Zolakaya_Cosmic_rainbow_of_colors_fractal_expressions_of_holy_71e29517-f921-418c-9415-aa100c5acf4e_2.png", label: "Cosmic 3" },
    { id: "forest", src: "/images/Zolakaya_imaginary_green_Lucious_fractal_garden_calm_forest_w_ff789520-3ec5-437d-b2da-d378d9a837f2_0.png", label: "Forest" },
    { id: "violet-1", src: "/images/Zolakaya_Sparkling_fractal_Purple_flowers_radiating_from_ever_2da9d73c-5041-4ae6-8f9f-c09b40d828f2_0.png", label: "Violet 1" },
    { id: "violet-2", src: "/images/Zolakaya_Sparkling_fractal_Purple_flowers_radiating_from_ever_2da9d73c-5041-4ae6-8f9f-c09b40d828f2_2.png", label: "Violet 2" },
    { id: "violet-3", src: "/images/Zolakaya_Sparkling_fractal_Purple_flowers_radiating_from_ever_2da9d73c-5041-4ae6-8f9f-c09b40d828f2_3.png", label: "Violet 3" },
    { id: "tunnel-1", src: "/images/Zolakaya_The_beautiful_glowing_circular_tunnel_to_heaven_no_f_ba01ff35-10b4-4a2b-a941-6d3f084b6e44_0.png", label: "Tunnel 1" },
    { id: "tunnel-2", src: "/images/Zolakaya_The_beautiful_glowing_circular_tunnel_to_heaven_no_f_ba01ff35-10b4-4a2b-a941-6d3f084b6e44_3.png", label: "Tunnel 2" },
  ];

  // Helper to get current background
  const getCurrentBackground = () => {
    if (backgroundType === 'video') {
      return videoBackgrounds[selectedVideo] || videoBackgrounds[0];
    }
    return imageBackgrounds[selectedImage] || imageBackgrounds[0];
  };

  // Nudge functions
  const nudgeBackground = (direction) => {
    if (backgroundType === 'video') {
      setSelectedVideo((prev) => {
        const next = prev + direction;
        if (next < 0) return videoBackgrounds.length - 1;
        if (next >= videoBackgrounds.length) return 0;
        return next;
      });
    } else {
      setSelectedImage((prev) => {
        const next = prev + direction;
        if (next < 0) return imageBackgrounds.length - 1;
        if (next >= imageBackgrounds.length) return 0;
        return next;
      });
    }
  };
  const [selectedModel, setSelectedModel] = useState('sonnet'); // 'haiku', 'sonnet', or 'opus'
  const [showTokenUsage, setShowTokenUsage] = useState(true); // Show token costs (default ON)
  const [tokenUsage, setTokenUsage] = useState(null); // { input_tokens, output_tokens }

  // Model helpers - determine available models based on config and admin status
  const getAvailableModels = () => {
    return userIsAdmin ? (featureConfig.modelsForAdmins || ['sonnet']) : (featureConfig.modelsForUsers || ['sonnet']);
  };
  const getModelId = (model) => {
    const modelIds = {
      haiku: 'claude-haiku-4-5-20251001',
      sonnet: 'claude-sonnet-4-20250514',
      opus: 'claude-opus-4-20250514'
    };
    return modelIds[model] || modelIds.sonnet;
  };
  const getModelPricing = (model) => {
    // Per 1M tokens: { input, output }
    const pricing = {
      haiku: { input: 1.00, output: 5.00 },
      sonnet: { input: 3.00, output: 15.00 },
      opus: { input: 15.00, output: 75.00 }
    };
    return pricing[model] || pricing.sonnet;
  };
  const getModelLabel = (model) => {
    const labels = { haiku: 'Haiku (fast)', sonnet: 'Sonnet', opus: 'Opus (best)' };
    return labels[model] || model;
  };
  const showAdvancedVoice = featureConfig.advancedVoiceFor === 'everyone' || (featureConfig.advancedVoiceFor === 'admins' && userIsAdmin);

  // Legacy compatibility: useHaiku derived from selectedModel
  const useHaiku = selectedModel === 'haiku';

  // === TELEMETRY TRACKING ===
  const [telemetry, setTelemetry] = useState({
    reflectCount: 0,
    forgeCount: 0,
    maxDepth: 'surface',
    clarifyCount: 0,
    unpackCount: 0,
    exampleCount: 0
  });

  // Helper to update telemetry
  const updateTelemetry = (key, value) => {
    setTelemetry(prev => {
      if (key === 'maxDepth') {
        // Only upgrade depth, never downgrade
        const depthOrder = ['surface', 'wade', 'swim', 'deep'];
        const currentIndex = depthOrder.indexOf(prev.maxDepth);
        const newIndex = depthOrder.indexOf(value);
        if (newIndex > currentIndex) {
          return { ...prev, maxDepth: value };
        }
        return prev;
      }
      // For counts, increment
      return { ...prev, [key]: (prev[key] || 0) + 1 };
    });
  };

  // Reset telemetry when starting new reading
  const resetTelemetry = () => {
    setTelemetry({
      reflectCount: 0,
      forgeCount: 0,
      maxDepth: 'surface',
      clarifyCount: 0,
      unpackCount: 0,
      exampleCount: 0
    });
  };

  // === PERSONA VOICE SYSTEM V2 (One-Pass) ===
  // Voice is baked into generation - no separate translation layer
  const [persona, setPersona] = useState('friend'); // 'friend' | 'therapist' | 'spiritualist' | 'scientist' | 'coach'
  const [humor, setHumor] = useState(5); // 1-10: Unhinged Comedy to Sacred
  const [showArchitectureTerms, setShowArchitectureTerms] = useState(false); // V1: architecture visibility toggle

  // Apply config defaults to voice settings when config is loaded
  // ONLY if no saved preferences exist in localStorage (first-time users)
  useEffect(() => {
    if (featureConfig?.defaultVoice && !configApplied) {
      // Check if user has saved preferences - if so, don't override them
      let hasSavedPrefs = false;
      try {
        const saved = localStorage.getItem('nirmanakaya_prefs');
        if (saved) {
          const prefs = JSON.parse(saved);
          // If any voice-related pref exists, user has customized their settings
          hasSavedPrefs = prefs.persona !== undefined || prefs.humor !== undefined || prefs.stance !== undefined;
        }
      } catch (e) { /* ignore */ }

      if (hasSavedPrefs) {
        // User has saved preferences, skip applying config defaults
        setConfigApplied(true);
        console.log('[Config] Skipping defaults - user has saved preferences');
        return;
      }

      const dv = featureConfig.defaultVoice;
      // Apply voice defaults
      if (dv.persona) setPersona(dv.persona);
      if (dv.humor) setHumor(dv.humor);
      // Apply stance defaults (includes preset values)
      setStance(prev => ({
        complexity: dv.complexity || prev.complexity,
        seriousness: dv.seriousness || prev.seriousness,
        voice: dv.voice || prev.voice,
        focus: dv.focus || prev.focus,
        density: dv.density || prev.density,
        scope: dv.scope || prev.scope
      }));
      // Apply mode/spread defaults (V1: map to frameSource + posture)
      if (featureConfig.defaultMode) {
        const dm = featureConfig.defaultMode;
        if (dm === 'explore') { setFrameSource('dynamic'); }
        else if (dm === 'reflect') { setFrameSource('preset'); }
        else if (dm === 'forge') { setFrameSource('architecture'); } // forge no longer a posture
        else { setFrameSource('architecture'); }
      }
      if (featureConfig.defaultSpread) {
        const spreadMap = { single: 'one', triad: 'three', pentad: 'five', septad: 'seven' };
        const key = spreadMap[featureConfig.defaultSpread] || 'three';
        setSpreadKey(key);
        // Also set cardCount for architecture frame
        const countMap = { one: 1, two: 2, three: 3, four: 4, five: 5 };
        if (countMap[key]) setCardCount(countMap[key]);
      }
      setConfigApplied(true);
      console.log('[Config] Applied voice defaults:', dv);
    }
  }, [featureConfig, configApplied]);

  // Legacy translation state (kept for potential fallback, will be removed in future)
  const [translating, setTranslating] = useState(false); // Translation in progress
  const [rawParsedReading, setRawParsedReading] = useState(null); // Original untranslated reading
  const [translationUsage, setTranslationUsage] = useState(null); // Separate token tracking for translation

  // Thread state for Reflect/Forge operations (Phase 2)
  const [threadData, setThreadData] = useState({}); // {cardIndex: [{draw, interpretation, operation, context, children}, ...]}
  const [threadOperations, setThreadOperations] = useState({}); // {key: 'reflect' | 'forge' | null} - key can be cardIndex or threadPath
  const [threadContexts, setThreadContexts] = useState({}); // {key: 'context text'}
  const [threadLoading, setThreadLoading] = useState({}); // {key: true/false}
  const [collapsedThreads, setCollapsedThreads] = useState({}); // {threadKey: true/false}

  // V1: Ariadne Thread state — chain traversal through archetype positions
  const [ariadneThread, setAriadneThread] = useState(null); // { sourceCardIndex, steps: [{draw, position, interpretation, loaded}], visitedPositions: Set }
  const [ariadneLoading, setAriadneLoading] = useState(false); // Currently loading a trace step
  const MAX_ARIADNE_STEPS = 8; // Max traversal depth

  // On-demand depth generation state
  const [cardLoaded, setCardLoaded] = useState({}); // {0: true, 1: false, ...} - which cards have content
  const [cardLoading, setCardLoading] = useState({}); // {0: true, ...} - which cards are currently loading
  const [cardLoadingDeeper, setCardLoadingDeeper] = useState({}); // {0: true, ...} - which cards are loading deeper content
  const [synthesisLoaded, setSynthesisLoaded] = useState(false); // Whether summary/path have been fetched
  const [synthesisLoading, setSynthesisLoading] = useState(false); // Whether synthesis is currently loading
  const [letterLoadingDeeper, setLetterLoadingDeeper] = useState(false); // Whether letter is loading deeper content
  const [synthesisLoadingSection, setSynthesisLoadingSection] = useState(null); // Which synthesis section is loading deeper ('summary' | 'whyAppeared' | 'path' | null)
  const [systemPromptCache, setSystemPromptCache] = useState(''); // Cached system prompt for on-demand calls
  // V1 Spread on Table: expand/collapse all trigger counters
  const [expandAllCounter, setExpandAllCounter] = useState(0);
  const [collapseAllCounter, setCollapseAllCounter] = useState(0);

  // User level for progressive disclosure (0 = First Contact, 1-4 = progressive features)
  const [userLevel, setUserLevel] = useState(1); // Default to Full Reader Mode

  // Shimmer direction for "The Soul Search Engine" - randomly alternates
  const [shimmerLTR, setShimmerLTR] = useState(false); // false = RTL, true = LTR

  // Derived: Show advanced controls when not First Contact AND advancedMode is true
  const showAdvancedControls = userLevel !== USER_LEVELS.FIRST_CONTACT && advancedMode;

  const messagesEndRef = useRef(null);
  const hasAutoInterpreted = useRef(false);
  const prefsLoaded = useRef(false);

  // Randomize shimmer direction every cycle (8s animation)
  useEffect(() => {
    const interval = setInterval(() => {
      setShimmerLTR(Math.random() > 0.5);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Watch for all cards loaded to trigger synthesis
  useEffect(() => {
    if (!draws || !parsedReading?._onDemand || parsedReading?._isFirstContact || synthesisLoaded || synthesisLoading) return;

    // Check if all cards are loaded AND have actual content (not just placeholders)
    const allCardsLoaded = draws.every((_, i) => cardLoaded[i]);
    const allCardsHaveContent = parsedReading.cards?.every(card =>
      card && (card.wade || card.surface || card.swim || card.deep) && !card._notLoaded
    );

    if (allCardsLoaded && allCardsHaveContent && draws.length > 0) {
      // All cards loaded with real content, trigger synthesis
      loadSynthesis(draws, question, systemPromptCache);
    }
  }, [cardLoaded, draws, parsedReading, synthesisLoaded, synthesisLoading]);

  // Save card interpretations to database when all cards are loaded
  const [contentSaved, setContentSaved] = useState(false);
  useEffect(() => {
    if (!savedReadingId || !draws || !parsedReading?._onDemand || contentSaved) return;
    if (parsedReading._restored) return; // Don't re-save restored readings

    // Check if all cards have content
    const allCardsHaveContent = parsedReading.cards?.every(card =>
      card && (card.wade || card.surface || card.swim || card.deep) && !card._notLoaded
    );

    if (allCardsHaveContent && draws.length > 0) {
      // Build cards array with both draw data and interpretations
      const cardsWithContent = draws.map((draw, i) => ({
        ...draw,
        interpretation: parsedReading.cards[i]
      }));

      // Update saved reading with card interpretations
      updateReadingContent(savedReadingId, {
        cards: cardsWithContent,
        synthesis: parsedReading.summary || parsedReading.path ? {
          summary: parsedReading.summary,
          path: parsedReading.path,
          fullArchitecture: parsedReading.fullArchitecture
        } : undefined
      }).then(result => {
        if (result?.data) {
          setContentSaved(true);
          console.log('[AutoSave] Card interpretations saved');
        }
      }).catch(err => console.log('[AutoSave] Failed to save interpretations:', err));
    }
  }, [cardLoaded, draws, parsedReading, savedReadingId, contentSaved]);

  // Save synthesis to database when it loads
  const [synthesisSaved, setSynthesisSaved] = useState(false);
  useEffect(() => {
    if (!savedReadingId || !parsedReading?._onDemand || !synthesisLoaded || synthesisSaved) return;
    if (parsedReading._restored) return; // Don't re-save restored readings

    if (parsedReading.summary || parsedReading.path) {
      updateReadingContent(savedReadingId, {
        synthesis: {
          summary: parsedReading.summary,
          path: parsedReading.path,
          fullArchitecture: parsedReading.fullArchitecture
        }
      }).then(result => {
        if (result?.data) {
          setSynthesisSaved(true);
          console.log('[AutoSave] Synthesis saved');
        }
      }).catch(err => console.log('[AutoSave] Failed to save synthesis:', err));
    }
  }, [synthesisLoaded, parsedReading, savedReadingId, synthesisSaved]);

  // Auto-save expansions, threads, and follow-up messages (debounced)
  const expansionSaveTimer = useRef(null);
  useEffect(() => {
    if (!savedReadingId) return;
    // Skip if nothing to save yet
    const hasExpansions = Object.keys(expansions).length > 0;
    const hasThreads = Object.keys(threadData).length > 0;
    const hasFollowUps = followUpMessages.length > 0;
    if (!hasExpansions && !hasThreads && !hasFollowUps) return;

    // Debounce: wait 2s after last change before saving
    if (expansionSaveTimer.current) clearTimeout(expansionSaveTimer.current);
    expansionSaveTimer.current = setTimeout(() => {
      const updatePayload = {};

      // Build synthesis update with expansions and follow-ups embedded
      if (hasExpansions || hasFollowUps) {
        // Merge with existing synthesis data
        const currentSynthesis = {};
        if (parsedReading?.summary) currentSynthesis.summary = parsedReading.summary;
        if (parsedReading?.path) currentSynthesis.path = parsedReading.path;
        if (parsedReading?.fullArchitecture) currentSynthesis.fullArchitecture = parsedReading.fullArchitecture;
        if (hasExpansions) currentSynthesis._expansions = expansions;
        if (hasFollowUps) currentSynthesis._followUpMessages = followUpMessages;
        updatePayload.synthesis = currentSynthesis;
      }

      // Save thread data separately
      if (hasThreads) {
        updatePayload.thread_data = threadData;
      }

      if (Object.keys(updatePayload).length > 0) {
        updateReadingContent(savedReadingId, updatePayload)
          .then(result => {
            if (result?.data) console.log('[AutoSave] Expansions/threads saved');
          })
          .catch(err => console.log('[AutoSave] Failed to save expansions/threads:', err));
      }
    }, 2000);

    return () => { if (expansionSaveTimer.current) clearTimeout(expansionSaveTimer.current); };
  }, [expansions, threadData, followUpMessages, savedReadingId]);

  // Re-interpret with current stance (same draws)
  const reinterpret = async () => {
    if (!draws) return;
    await performReadingWithDraws(draws, question);
  };

  // === PERSONA TRANSLATION FUNCTIONS ===

  // Translate the current reading into the selected persona voice
  const translateReading = async (readingToTranslate) => {
    if (!readingToTranslate || persona === 'none') return null;

    setTranslating(true);
    setTranslationUsage(null);

    try {
      // Reconstruct the reading text with section markers
      const readingText = reconstructReadingText(readingToTranslate);
      if (!readingText) {
        console.warn('No reading text to translate');
        setTranslating(false);
        return null;
      }

      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: readingText,
          persona,
          humor
        })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Track translation token usage separately
      if (data.usage) {
        setTranslationUsage(data.usage);
      }

      // Validate marker preservation
      const validation = validateMarkerPreservation(readingText, data.translated);
      if (!validation.valid) {
        console.warn('Translation marker preservation issue:', validation);
        // Fall back to raw reading if markers were lost
        setTranslating(false);
        return null;
      }

      // Parse the translated text back into structured format
      const translatedParsed = parseTranslatedReading(data.translated, readingToTranslate);

      // Merge translated content with original structure (preserving non-text fields)
      const mergedReading = {
        ...readingToTranslate,
        cards: readingToTranslate.cards.map((card, i) => ({
          ...card,
          wade: translatedParsed.cards[i]?.wade || card.wade,
          swim: translatedParsed.cards[i]?.swim || card.swim,
          deep: translatedParsed.cards[i]?.deep || card.deep,
          surface: translatedParsed.cards[i]?.surface || card.surface
        })),
        letter: {
          ...readingToTranslate.letter,
          wade: translatedParsed.letter?.wade || readingToTranslate.letter?.wade,
          swim: translatedParsed.letter?.swim || readingToTranslate.letter?.swim,
          deep: translatedParsed.letter?.deep || readingToTranslate.letter?.deep,
          surface: translatedParsed.letter?.surface || readingToTranslate.letter?.surface
        },
        summary: readingToTranslate.summary ? {
          ...readingToTranslate.summary,
          wade: translatedParsed.summary?.wade || readingToTranslate.summary?.wade,
          swim: translatedParsed.summary?.swim || readingToTranslate.summary?.swim,
          deep: translatedParsed.summary?.deep || readingToTranslate.summary?.deep,
          surface: translatedParsed.summary?.surface || readingToTranslate.summary?.surface
        } : null,
        path: readingToTranslate.path ? {
          ...readingToTranslate.path,
          wade: translatedParsed.path?.wade || readingToTranslate.path?.wade,
          swim: translatedParsed.path?.swim || readingToTranslate.path?.swim,
          deep: translatedParsed.path?.deep || readingToTranslate.path?.deep,
          surface: translatedParsed.path?.surface || readingToTranslate.path?.surface
        } : null,
        _translated: true,
        _persona: persona
      };

      setTranslating(false);
      return mergedReading;

    } catch (e) {
      console.error('Translation error:', e);
      setError(`Translation error: ${e.message}`);
      setTranslating(false);
      return null;
    }
  };

  // Re-translate with current persona settings (called when settings change after reading)
  const retranslate = async () => {
    if (!rawParsedReading) return;

    if (persona === 'none') {
      // Switch back to raw reading
      setParsedReading(rawParsedReading);
      setTranslationUsage(null);
      return;
    }

    const translated = await translateReading(rawParsedReading);
    if (translated) {
      setParsedReading(translated);
    } else {
      // Fall back to raw if translation failed
      setParsedReading(rawParsedReading);
    }
  };

  // Load preferences from localStorage on init (URL params override)
  useEffect(() => {
    // Check for admin config first (from /admin panel)
    try {
      const adminConfig = sessionStorage.getItem('adminConfig');
      if (adminConfig) {
        const config = JSON.parse(adminConfig);
        console.log('Admin config loaded:', config);
        setUserLevel(config.level);
        setShowTokenUsage(config.debug?.showTokens ?? true);
        // Clear after reading so refresh goes to normal mode
        sessionStorage.removeItem('adminConfig');
        // Skip normal preference loading when in admin mode
        prefsLoaded.current = true;
        return;
      }
    } catch (e) {
      console.warn('Failed to load admin config:', e);
    }

    // First, load saved preferences from localStorage
    try {
      const saved = localStorage.getItem('nirmanakaya_prefs');
      if (saved) {
        const prefs = JSON.parse(saved);
        if (prefs.spreadType) setSpreadType(prefs.spreadType);
        if (prefs.spreadKey) setSpreadKey(prefs.spreadKey);
        // V1: Load frame/posture/cardCount (these override spreadType/spreadKey via sync effects)
        if (prefs.frameSource) setFrameSource(prefs.frameSource);
        if (prefs.posture) setPosture(prefs.posture);
        if (prefs.cardCount) setCardCount(prefs.cardCount);
        if (prefs.stance) {
          // Ensure seriousness has a default if loading old prefs
          const loadedStance = { ...prefs.stance };
          if (!loadedStance.seriousness) loadedStance.seriousness = 'balanced';
          setStance(loadedStance);
        }
        // Load voice preview preference (default true if not set)
        if (prefs.showVoicePreview !== undefined) setShowVoicePreview(prefs.showVoicePreview);
        // Load persona layer preferences
        if (prefs.persona !== undefined) setPersona(prefs.persona);
        if (prefs.humor !== undefined) setHumor(prefs.humor);
        // V1: Architecture visibility toggle
        if (prefs.showArchitectureTerms !== undefined) setShowArchitectureTerms(prefs.showArchitectureTerms);
        if (prefs.animatedBackground !== undefined) setAnimatedBackground(prefs.animatedBackground);
        if (prefs.backgroundOpacity !== undefined) setBackgroundOpacity(prefs.backgroundOpacity);
        if (prefs.contentDim !== undefined) setContentDim(prefs.contentDim);
        if (prefs.theme !== undefined) setTheme(prefs.theme);
        if (prefs.backgroundType !== undefined) setBackgroundType(prefs.backgroundType);
        if (prefs.selectedVideo !== undefined) setSelectedVideo(prefs.selectedVideo);
        if (prefs.selectedImage !== undefined) setSelectedImage(prefs.selectedImage);
        if (prefs.showCardImages !== undefined) setShowCardImages(prefs.showCardImages);
        // Reading defaults
        if (prefs.defaultDepth !== undefined) setDefaultDepth(prefs.defaultDepth);
        if (prefs.defaultExpanded !== undefined) setDefaultExpanded(prefs.defaultExpanded);
      }
    } catch (e) {
      console.warn('Failed to load preferences:', e);
    }

    // One-time migration: push wade depth + signatures open to all existing users
    try {
      if (!localStorage.getItem('nkya_migrated_wade_open')) {
        setDefaultDepth('shallow');
        setDefaultExpanded(true);
        setLetterDepth('wade');
        setPathDepth('wade');
        setSummaryDepth('wade');
        setWhyAppearedDepth('wade');
        localStorage.setItem('nkya_migrated_wade_open', '1');
      }
    } catch (e) { /* localStorage unavailable */ }

    prefsLoaded.current = true;

    // Then, check for URL params (these override localStorage)
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('r');
    if (encoded && !hasAutoInterpreted.current) {
      const decoded = decodeDraws(encoded);
      if (decoded) {
        setDraws(decoded.draws);
        setSpreadType(decoded.spreadType);
        setSpreadKey(decoded.spreadKey);
        setStance(decoded.stance);
        if (decoded.question) {
          setQuestion(decoded.question);
          setIsSharedReading(true);
        }
      }
    }
  }, []);

  // Auto-save preferences to localStorage whenever they change
  useEffect(() => {
    // Don't save until initial prefs have been loaded (prevents overwriting with defaults)
    if (!prefsLoaded.current) return;
    const prefs = {
      spreadType,
      spreadKey,
      stance,
      showVoicePreview,
      // V1 Layer Architecture
      frameSource,
      posture,
      cardCount,
      // Voice settings (V1)
      persona,
      humor,
      showArchitectureTerms,
      // Background settings
      animatedBackground,
      backgroundOpacity,
      contentDim,
      theme,
      backgroundType,
      selectedVideo,
      selectedImage,
      showCardImages,
      // Reading defaults
      defaultDepth,
      defaultExpanded
    };
    try {
      localStorage.setItem('nirmanakaya_prefs', JSON.stringify(prefs));
    } catch (e) {
      console.warn('Failed to save preferences:', e);
    }
  }, [spreadType, spreadKey, stance, showVoicePreview, frameSource, posture, cardCount, persona, humor, showArchitectureTerms, animatedBackground, backgroundOpacity, contentDim, theme, backgroundType, selectedVideo, selectedImage, showCardImages, defaultDepth, defaultExpanded]);

  // Check if user has seen today's pulse (for flash indicator)
  useEffect(() => {
    try {
      const lastSeen = localStorage.getItem('nirmanakaya_last_pulse_seen');
      const today = new Date().toISOString().split('T')[0];
      setPulseUnseen(!lastSeen || lastSeen < today);
    } catch (e) { /* localStorage unavailable */ }
  }, []);

  // Auto-scroll glistener streaming content
  const prevStreamingType = useRef(null);
  useEffect(() => {
    if (glistenerContent?.type === 'streaming' && glistenerScrollRef.current) {
      const el = glistenerScrollRef.current;
      // Reset to top when streaming starts (transition from loading)
      if (prevStreamingType.current !== 'streaming') {
        el.scrollTop = 0;
      } else if (glistenerContent?.scrollProgress !== undefined) {
        // Progressive scroll after initial reset
        const maxScroll = el.scrollHeight - el.clientHeight;
        if (maxScroll > 0) {
          el.scrollTop = maxScroll * glistenerContent.scrollProgress;
        }
      }
    }
    prevStreamingType.current = glistenerContent?.type || null;
  }, [glistenerContent]);

  useEffect(() => {
    if (isSharedReading && draws && question && !hasAutoInterpreted.current) {
      hasAutoInterpreted.current = true;
      performReadingWithDraws(draws);
    }
  }, [isSharedReading, draws, question]);

  // Only scroll on new follow-up messages, NOT on initial reading load
  const prevFollowUpCount = useRef(0);
  useEffect(() => {
    if (followUpMessages.length > prevFollowUpCount.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevFollowUpCount.current = followUpMessages.length;
  }, [followUpMessages]);

  useEffect(() => {
    if (draws && question) {
      const encoded = encodeDraws(draws, spreadType, spreadKey, stance, question);
      setShareUrl(`${window.location.origin}${window.location.pathname}?r=${encoded}`);
    }
  }, [draws, spreadType, spreadKey, stance, question]);

  // Shuffle and cycle through ALL loading phrases when loading starts
  useEffect(() => {
    if (!loading) return;

    // Shuffle all phrases for variety, cycle through all of them
    const shuffled = [...LOADING_PHRASES].sort(() => Math.random() - 0.5);
    setLoadingPhrases(shuffled);
    setLoadingPhraseIndex(0);
    setLoadingPhraseVisible(true);

    // Cycle through all shuffled phrases
    const fadeInterval = setInterval(() => {
      setLoadingPhraseVisible(false);
      setTimeout(() => {
        setLoadingPhraseIndex(prev => (prev + 1) % shuffled.length);
        setLoadingPhraseVisible(true);
      }, 300);
    }, 5000);
    return () => clearInterval(fadeInterval);
  }, [loading]);


  // Stash active reading ID in sessionStorage for auto-resume
  useEffect(() => {
    if (savedReadingId) {
      try { sessionStorage.setItem('nirmanakaya_active_reading', savedReadingId); } catch (e) { /* ignore */ }
    }
  }, [savedReadingId]);

  // Click outside to dismiss help popover
  useEffect(() => {
    if (!helpPopover) return;
    const handleClickOutside = (e) => {
      // Check if click is outside any popover content
      if (!e.target.closest('.help-popover-content') && !e.target.closest('.help-trigger')) {
        setHelpPopover(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [helpPopover]);

  // Strip trailing signatures from API responses (e.g., "A.", "[A]", "— A")
  const stripSignature = (text) => {
    if (!text) return text;
    return text.replace(/\s*[-—]?\s*\[?A\.?\]?\s*$/i, '').trim();
  };

  const copyShareUrl = async () => {
    try { await navigator.clipboard.writeText(shareUrl); alert('Link copied!'); }
    catch { prompt('Copy this link:', shareUrl); }
  };

  const performReadingWithDraws = async (drawsToUse, questionToUse = question, tokens = null) => {
    setLoading(true); setError(''); setParsedReading(null); setExpansions({}); setFollowUpMessages([]); readingConverseRef.current = [];
    // Reset persona translation state
    setRawParsedReading(null); setTranslationUsage(null); setTranslating(false);
    // Reset on-demand state
    setCardLoaded({}); setCardLoading({}); setSynthesisLoaded(false); setSynthesisLoading(false);
    // Reset depth states to user's chosen default
    setLetterDepth(defaultDepth); setPathDepth(defaultDepth); setSummaryDepth(defaultDepth); setWhyAppearedDepth(defaultDepth);
    // Reset telemetry for new reading
    resetTelemetry();
    // Store tokens for DTP mode (used by card generation)
    setDtpTokens(tokens);
    const isReflect = spreadType === 'reflect';
    const currentSpreadKey = isReflect ? reflectSpreadKey : spreadKey;
    const safeQuestion = sanitizeForAPI(questionToUse);

    // Check if First Contact Mode (Level 0)
    const isFirstContact = userLevel === USER_LEVELS.FIRST_CONTACT;

    if (isFirstContact) {
      // First Contact Mode: Rich experience via two-phase letter + card-depth flow
      const systemPrompt = buildSystemPrompt(userLevel);
      setSystemPromptCache(systemPrompt);

      try {
        const res = await fetch('/api/letter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: safeQuestion,
            draws: drawsToUse,
            spreadType: 'discover',
            spreadKey: 'one',
            stance: { complexity: 'friend', voice: 'warm', focus: 'feel', density: 'essential', scope: 'here', seriousness: 'playful' },
            system: systemPrompt,
            model: "claude-sonnet-4-20250514",
            userContext: userContextRef.current
          })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        const cardPlaceholders = drawsToUse.map((_, i) => ({
          index: i,
          token: null,
          surface: null, wade: null, swim: null, deep: null,
          architecture: null, mirror: null, why: null, rebalancer: null,
          _notLoaded: true
        }));

        setParsedReading({
          letter: data.letter,
          summary: null,
          cards: cardPlaceholders,
          path: null,
          corrections: [],
          rebalancerSummary: null,
          wordsToWhys: null,
          _onDemand: true,
          _isFirstContact: true
        });
        setTokenUsage(data.usage);

        // Auto-save First Contact reading
        saveReading({
          question: safeQuestion,
          mode: 'first-contact',
          spreadType: '1-card',
          cards: drawsToUse,
          synthesis: null,
          letter: data.letter,
          tokenUsage: data.usage,
          ...telemetry
        }).then(result => {
          if (result?.data?.id) {
            setSavedReadingId(result.data.id);
            if (currentUser?.id) {
              fetch('/api/email/reading', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUser.id, readingId: result.data.id })
              }).catch(err => console.log('[Email] Failed:', err));
            }
          }
        }).catch(err => console.log('[AutoSave] Failed:', err));

        // Auto-load the single card
        setTimeout(() => {
          loadCardDepth(0, drawsToUse, safeQuestion, data.letter, systemPrompt);
        }, 100);

      } catch (e) { setError(`Error: ${e.message}`); }
      setLoading(false);
      return;
    }

    // Standard Mode: On-demand depth generation
    // Phase 1: Fetch Letter only (card content loaded on-demand)
    // V2: Include persona params for one-pass voice integration
    const systemPrompt = buildSystemPrompt(userLevel, {
      spreadType,
      posture, // V1: explicit posture for verb governance (overrides spreadType in prompt builder)
      stance,
      letterTone: VOICE_LETTER_TONE[stance.voice],
      // Persona Voice V2 params
      persona,
      humor,
      // Architecture visibility
      showArchitecture: showArchitectureTerms,
      // Locus control
      locusSubjects
    });
    // Cache system prompt for on-demand calls
    setSystemPromptCache(systemPrompt);

    // Fetch user journey context for prompt enrichment (non-blocking for unauthenticated)
    let userContext = '';
    if (currentUser) {
      try {
        const session = await getSession();
        const token = session?.session?.access_token;
        if (token) {
          const ctxParams = new URLSearchParams({ draws: JSON.stringify(drawsToUse) });
          if (activeTopic?.id) ctxParams.set('topic_id', activeTopic.id);
          const ctxRes = await fetch(`/api/user/context?${ctxParams}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const ctxData = await ctxRes.json();
          userContext = ctxData.contextBlock || '';
        }
      } catch (e) { /* Context is optional — reading works without it */ }
    }
    userContextRef.current = userContext;

    try {
      const res = await fetch('/api/letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: safeQuestion,
          draws: drawsToUse,
          spreadType,
          spreadKey: currentSpreadKey,
          stance,
          system: systemPrompt,
          model: getModelId(selectedModel),
          userContext
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Create initial parsed reading with letter and card placeholders
      const cardPlaceholders = drawsToUse.map((_, i) => ({
        index: i,
        token: tokens ? tokens[i] : null, // DTP mode: token for this card
        surface: null, // Not yet loaded
        wade: null,
        swim: null,
        deep: null,
        architecture: null,
        mirror: null,
        why: null,
        rebalancer: null,
        _notLoaded: true // Flag indicating on-demand fetch needed
      }));

      setParsedReading({
        letter: data.letter,
        summary: null, // Not yet loaded (needs all cards first)
        cards: cardPlaceholders,
        path: null, // Not yet loaded (needs all cards first)
        corrections: [],
        rebalancerSummary: null,
        wordsToWhys: null,
        _onDemand: true, // Flag indicating on-demand mode
        // DTP mode: Store original input for grounded interpretations
        originalInput: tokens && tokens.length > 0 ? questionToUse : null
      });
      setTokenUsage(data.usage);

      // Auto-save reading to database
      saveReading({
        question: questionToUse,
        mode: spreadType,
        spreadType: `${drawsToUse.length}-card`,
        cards: drawsToUse,
        synthesis: null,
        letter: data.letter,
        tokenUsage: data.usage,
        // Telemetry (initial values - will be updated later)
        ...telemetry
      }).then(result => {
        if (result?.data?.id) {
          setSavedReadingId(result.data.id);
          // Send reading email (async, respects user preferences)
          if (currentUser?.id) {
            fetch('/api/email/reading', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: currentUser.id, readingId: result.data.id })
            }).catch(err => console.log('[Email] Failed:', err));
          }
        }
      }).catch(err => console.log('[AutoSave] Failed:', err));

      // V1 Spread on Table: Cards start at zero depth (names + positions only)
      // User taps individual cards to load interpretation
      // No auto-load — on-demand via DepthCard's onRequestLoad callback

    } catch (e) { setError(`Error: ${e.message}`); }
    setLoading(false);
  };

  // On-demand: Load a single card's depth content
  const loadCardDepth = async (cardIndex, drawsToUse, questionToUse, letterData, systemPromptToUse, token = null, originalInput = null) => {
    if (cardLoaded[cardIndex] || cardLoading[cardIndex]) return; // Already loaded or loading

    setCardLoading(prev => ({ ...prev, [cardIndex]: true }));

    try {
      const letterContent = letterData?.swim || letterData?.wade || letterData?.shallow || letterData?.surface || '';
      // Compute frame label/lens for this card (reflect spreads have position-specific context)
      const currentSpreadKey = spreadType === 'reflect' ? reflectSpreadKey : spreadKey;
      const currentSpreadConfig = spreadType === 'reflect' ? REFLECT_SPREADS[reflectSpreadKey] : null;
      const frameLabel = currentSpreadConfig?.positions?.[cardIndex]?.name || null;
      const frameLens = currentSpreadConfig?.positions?.[cardIndex]?.lens || null;
      const res = await fetch('/api/card-depth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardIndex,
          draw: drawsToUse[cardIndex],
          question: questionToUse,
          spreadType,
          spreadKey: currentSpreadKey,
          stance,
          system: systemPromptToUse || systemPromptCache,
          letterContent,
          frameLabel, // Frame context from preset spreads
          frameLens,  // Interpretation lens from preset spreads
          token, // DTP mode: token context for this card
          originalInput, // DTP mode: full question context for grounded interpretations
          model: getModelId(selectedModel),
          userContext: userContextRef.current
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Validate that we got actual content (not just empty strings)
      const hasContent = data.cardData && (data.cardData.shallow || data.cardData.wade || data.cardData.surface || data.cardData.swim || data.cardData.deep);
      if (!hasContent) {
        throw new Error('Card generation returned empty content. Please try again.');
      }

      // Update the specific card in parsedReading
      setParsedReading(prev => {
        if (!prev) return prev;
        const newCards = [...prev.cards];
        newCards[cardIndex] = {
          ...newCards[cardIndex],
          ...data.cardData,
          _notLoaded: false
        };
        return { ...prev, cards: newCards };
      });

      setCardLoaded(prev => ({ ...prev, [cardIndex]: true }));

      // Accumulate token usage
      if (data.usage) {
        setTokenUsage(prev => prev ? {
          input_tokens: (prev.input_tokens || 0) + (data.usage.input_tokens || 0),
          output_tokens: (prev.output_tokens || 0) + (data.usage.output_tokens || 0),
          cache_creation_input_tokens: (prev.cache_creation_input_tokens || 0) + (data.usage.cache_creation_input_tokens || 0),
          cache_read_input_tokens: (prev.cache_read_input_tokens || 0) + (data.usage.cache_read_input_tokens || 0)
        } : data.usage);
      }

      // Synthesis check is handled by useEffect watching cardLoaded state

    } catch (e) {
      setError(`Error loading card ${cardIndex + 1}: ${e.message}`);
    }

    setCardLoading(prev => ({ ...prev, [cardIndex]: false }));
  };

  // Progressive deepening: Load SWIM or DEEP for a card (builds on previous content)
  // sections: ['reading'] | ['rebalancer'] | ['why'] | ['growth'] | null (null = all, legacy)
  const loadDeeperContent = async (cardIndex, targetDepth, previousContent, sections = null) => {
    // Track depth telemetry
    updateTelemetry('maxDepth', targetDepth);

    try {
      const letterContent = getLetterContent(parsedReading?.letter);
      // Get token from card state for DTP mode
      const cardToken = parsedReading?.cards?.[cardIndex]?.token || null;
      // Get originalInput for grounded DTP interpretations
      const originalInput = parsedReading?.originalInput || null;
      // Compute frame label/lens for this card
      const currentSpreadConfig = spreadType === 'reflect' ? REFLECT_SPREADS[reflectSpreadKey] : null;
      const deepenFrameLabel = currentSpreadConfig?.positions?.[cardIndex]?.name || null;
      const deepenFrameLens = currentSpreadConfig?.positions?.[cardIndex]?.lens || null;
      const res = await fetch('/api/card-depth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardIndex,
          draw: draws[cardIndex],
          question,
          spreadType,
          spreadKey: spreadType === 'reflect' ? reflectSpreadKey : spreadKey,
          stance,
          system: systemPromptCache,
          letterContent,
          frameLabel: deepenFrameLabel,
          frameLens: deepenFrameLens,
          token: cardToken, // DTP mode: token context for this card
          originalInput, // DTP mode: full question context for grounded interpretations
          model: getModelId(selectedModel),
          // Progressive deepening params
          targetDepth,
          previousContent,
          sections, // Selective section loading — null means all
          userContext: userContextRef.current
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Use functional update to avoid stale state when multiple sections load concurrently
      setParsedReading(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          cards: prev.cards?.map((card, i) =>
            i === cardIndex ? { ...card, ...data.cardData } : card
          ) || []
        };
      });

      // Accumulate token usage
      if (data.usage) {
        setTokenUsage(prev => prev ? {
          input_tokens: (prev.input_tokens || 0) + (data.usage.input_tokens || 0),
          output_tokens: (prev.output_tokens || 0) + (data.usage.output_tokens || 0),
          cache_creation_input_tokens: (prev.cache_creation_input_tokens || 0) + (data.usage.cache_creation_input_tokens || 0),
          cache_read_input_tokens: (prev.cache_read_input_tokens || 0) + (data.usage.cache_read_input_tokens || 0)
        } : data.usage);
      }

    } catch (e) {
      setError(`Error loading deeper content for card ${cardIndex + 1}: ${e.message}`);
    }
  };

  // On-demand: Load Summary + Path to Balance (after all cards loaded)
  const loadSynthesis = async (drawsToUse, questionToUse, systemPromptToUse) => {
    if (synthesisLoaded || synthesisLoading) return;

    setSynthesisLoading(true);

    try {
      // Get current card data from parsedReading
      const currentCards = parsedReading?.cards || [];

      const res = await fetch('/api/synthesis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: questionToUse,
          draws: drawsToUse,
          cards: currentCards,
          letter: parsedReading?.letter,
          spreadType,
          spreadKey: spreadType === 'reflect' ? reflectSpreadKey : spreadKey,
          system: systemPromptToUse || systemPromptCache,
          model: getModelId(selectedModel),
          // DTP mode: pass tokens and originalInput for grounded synthesis
          tokens: dtpTokens,
          originalInput: parsedReading?.originalInput,
          userContext: userContextRef.current
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Validate that we got actual synthesis content
      const hasSummary = data.summary && (data.summary.wade || data.summary.swim || data.summary.deep);
      const hasPath = data.path && (data.path.wade || data.path.swim || data.path.deep);

      if (!hasSummary && !hasPath) {
        console.warn('Synthesis returned empty content:', data);
        throw new Error('Synthesis generation returned empty content. Please try refreshing.');
      }

      setSynthesisLoaded(true);

      // Build complete reading (now includes whyAppeared)
      const completeReading = {
        ...parsedReading,
        summary: data.summary,
        whyAppeared: data.whyAppeared,
        path: data.path
      };

      // V2: Voice is baked into generation - update reading directly
      setParsedReading(completeReading);

      // Accumulate token usage
      if (data.usage) {
        setTokenUsage(prev => prev ? {
          input_tokens: (prev.input_tokens || 0) + (data.usage.input_tokens || 0),
          output_tokens: (prev.output_tokens || 0) + (data.usage.output_tokens || 0),
          cache_creation_input_tokens: (prev.cache_creation_input_tokens || 0) + (data.usage.cache_creation_input_tokens || 0),
          cache_read_input_tokens: (prev.cache_read_input_tokens || 0) + (data.usage.cache_read_input_tokens || 0)
        } : data.usage);
      }

    } catch (e) {
      setError(`Error loading synthesis: ${e.message}`);
    }

    setSynthesisLoading(false);
  };

  // Progressive deepening: Load SWIM or DEEP for Letter
  const loadDeeperLetter = async (targetDepth) => {
    if (letterLoadingDeeper) return;

    const letter = parsedReading?.letter;
    if (!letter) return;

    // Track depth telemetry
    updateTelemetry('maxDepth', targetDepth);

    // Check if content already exists at target depth
    if (letter[targetDepth]) {
      setLetterDepth(targetDepth);
      return;
    }

    setLetterLoadingDeeper(true);

    try {
      const previousContent = {
        wade: letter.wade || '',
        swim: letter.swim || ''
      };

      const res = await fetch('/api/letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          draws,
          spreadType,
          spreadKey: spreadType === 'reflect' ? reflectSpreadKey : spreadKey,
          stance,
          system: systemPromptCache,
          model: getModelId(selectedModel),
          targetDepth,
          previousContent,
          userContext: userContextRef.current
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // V2: Voice is baked into generation - update reading directly
      const updatedReading = {
        ...parsedReading,
        letter: data.letter
      };
      setParsedReading(updatedReading);
      setLetterDepth(targetDepth);

      // Accumulate token usage
      if (data.usage) {
        setTokenUsage(prev => prev ? {
          input_tokens: (prev.input_tokens || 0) + (data.usage.input_tokens || 0),
          output_tokens: (prev.output_tokens || 0) + (data.usage.output_tokens || 0),
          cache_creation_input_tokens: (prev.cache_creation_input_tokens || 0) + (data.usage.cache_creation_input_tokens || 0),
          cache_read_input_tokens: (prev.cache_read_input_tokens || 0) + (data.usage.cache_read_input_tokens || 0)
        } : data.usage);
      }

    } catch (e) {
      setError(`Error loading deeper letter content: ${e.message}`);
    }

    setLetterLoadingDeeper(false);
  };

  // Progressive deepening: Load SWIM or DEEP for Synthesis (Summary + WhyAppeared + Path)
  // section: 'summary' | 'whyAppeared' | 'path' - which section is requesting the depth change
  const loadDeeperSynthesis = async (targetDepth, section = 'summary') => {
    if (synthesisLoadingSection) return;

    // Track depth telemetry
    updateTelemetry('maxDepth', targetDepth);

    const summary = parsedReading?.summary;
    const whyAppeared = parsedReading?.whyAppeared;
    const path = parsedReading?.path;

    // Helper to set depth for a specific section only
    const setDepthForSection = (sec, depth) => {
      if (sec === 'summary') setSummaryDepth(depth);
      else if (sec === 'whyAppeared') setWhyAppearedDepth(depth);
      else if (sec === 'path') setPathDepth(depth);
    };

    // Check if content already exists at target depth for all sections
    // If so, just update the requesting section's depth (content already loaded)
    if (summary?.[targetDepth] && whyAppeared?.[targetDepth] && path?.[targetDepth]) {
      setDepthForSection(section, targetDepth);
      return;
    }

    setSynthesisLoadingSection(section);

    try {
      const previousContent = {
        summary: {
          wade: summary?.wade || '',
          swim: summary?.swim || ''
        },
        whyAppeared: {
          wade: whyAppeared?.wade || '',
          swim: whyAppeared?.swim || ''
        },
        path: {
          wade: path?.wade || '',
          swim: path?.swim || '',
          architecture: path?.architecture || ''
        }
      };

      const res = await fetch('/api/synthesis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          draws,
          cards: parsedReading?.cards || [],
          letter: parsedReading?.letter,
          spreadType,
          spreadKey: spreadType === 'reflect' ? reflectSpreadKey : spreadKey,
          system: systemPromptCache,
          model: getModelId(selectedModel),
          targetDepth,
          previousContent,
          // DTP mode: pass tokens and originalInput for grounded synthesis
          tokens: dtpTokens,
          originalInput: parsedReading?.originalInput,
          userContext: userContextRef.current
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // V2: Voice is baked into generation - update reading directly (now includes whyAppeared)
      const updatedReading = {
        ...parsedReading,
        summary: {
          ...parsedReading?.summary,
          ...data.summary
        },
        whyAppeared: {
          ...parsedReading?.whyAppeared,
          ...data.whyAppeared
        },
        path: {
          ...parsedReading?.path,
          ...data.path
        }
      };
      setParsedReading(updatedReading);
      // Only update the requesting section's depth
      setDepthForSection(section, targetDepth);

      // Scroll restoration: keep the section in view after content loads
      // Uses scroll anchoring - find the element closest to current viewport
      requestAnimationFrame(() => {
        // Try to find the section that's currently visible in viewport
        const candidates = section === 'summary' 
          ? ['depth-section-summary', 'depth-synth-reading']
          : section === 'whyAppeared' 
          ? ['depth-synth-why']
          : ['depth-section-path', 'depth-synth-path'];
        
        for (const id of candidates) {
          const el = document.getElementById(id);
          if (el) {
            const rect = el.getBoundingClientRect();
            // If element is near viewport (within 500px), scroll to it
            if (rect.top > -500 && rect.top < window.innerHeight + 500) {
              el.scrollIntoView({ behavior: 'instant', block: 'nearest' });
              break;
            }
          }
        }
      });

      // Accumulate token usage
      if (data.usage) {
        setTokenUsage(prev => prev ? {
          input_tokens: (prev.input_tokens || 0) + (data.usage.input_tokens || 0),
          output_tokens: (prev.output_tokens || 0) + (data.usage.output_tokens || 0),
          cache_creation_input_tokens: (prev.cache_creation_input_tokens || 0) + (data.usage.cache_creation_input_tokens || 0),
          cache_read_input_tokens: (prev.cache_read_input_tokens || 0) + (data.usage.cache_read_input_tokens || 0)
        } : data.usage);
      }

    } catch (e) {
      setError(`Error loading deeper synthesis content: ${e.message}`);
    }

    setSynthesisLoadingSection(null);
  };

  const performReading = async () => {
    // Trigger rainbow flash on border and stop any border animations
    setBorderFlashActive(false);
    setBorderPulseActive(false);
    setInitiateFlash(true);
    setTimeout(() => setInitiateFlash(false), 800);

    // DTP (Explore) mode uses dtpInput instead of question
    const isExplore = spreadType === 'explore';

    if (isExplore) {
      const actualInput = dtpInput.trim();
      if (!actualInput) {
        setError('Please describe what\'s active for you before reading.');
        return;
      }
      await performDTPReading(actualInput);
      return;
    }

    const actualQuestion = question.trim() || (spreadType === 'forge' ? 'Forging intention' : 'General reading');
    setQuestion(actualQuestion);

    // First Contact Mode: Always 1 card, always Discover mode
    if (userLevel === USER_LEVELS.FIRST_CONTACT) {
      const newDraws = generateSpread(1);
      setDraws(newDraws);
      await performReadingWithDraws(newDraws, actualQuestion);
      return;
    }

    const isReflect = spreadType === 'reflect';
    const isForge = spreadType === 'forge';
    // Forge mode always draws 1 card
    // Reflect mode uses REFLECT_SPREADS, Discover uses RANDOM_SPREADS
    const count = isForge ? 1 : (isReflect ? REFLECT_SPREADS[reflectSpreadKey].count : RANDOM_SPREADS[spreadKey].count);
    const newDraws = generateSpread(count);
    setDraws(newDraws);
    await performReadingWithDraws(newDraws, actualQuestion);
  };

  // DTP (Explore mode) reading - token extraction then standard card flow
  const performDTPReading = async (input) => {
    setLoading(true);
    setError('');

    // Generate 5 draws (unique positions guaranteed) — V1: count will be AI-determined
    const newDraws = generateDynamicDraws(5);

    try {
      // Step 1: Call DTP API to extract tokens only
      const response = await fetch('/api/reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isDTP: true,
          dtpInput: input,
          userId: currentUser?.id
        })
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
        setLoading(false);
        return;
      }

      const tokens = data.tokens || [];
      if (tokens.length === 0) {
        setError('No tokens could be extracted from your input. Please try describing what\'s active more specifically.');
        setLoading(false);
        return;
      }

      // Track token extraction usage
      if (data.usage) {
        setTokenUsage(data.usage);
      }

      // Step 2: Slice draws to match token count and use standard flow
      const usedDraws = newDraws.slice(0, tokens.length);
      setDraws(usedDraws);

      // Step 3: Use standard reading flow with tokens
      // Note: performReadingWithDraws will handle the rest
      await performReadingWithDraws(usedDraws, input, tokens);

    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  // Generate a single random draw for thread continuation
  const generateSingleDraw = () => {
    const transientPool = shuffleArray([...Array(78).keys()]);
    const statusArr = new Uint32Array(1);
    crypto.getRandomValues(statusArr);
    return {
      position: Math.floor(Math.random() * 22), // Random position
      transient: transientPool[0],
      status: (statusArr[0] % 4) + 1
    };
  };

  // Continue a thread with Reflect or Forge operation
  // REFLECT = dialogue (no new card) - engage with user's inquiry/question
  // FORGE = sub-reading (new card) - interpret new card against user's assertion
  const continueThread = async (threadKey) => {
    const operation = threadOperations[threadKey];
    if (!operation) return;

    // Track telemetry for reflect/forge
    if (operation === 'reflect') {
      updateTelemetry('reflectCount');
    } else if (operation === 'forge') {
      updateTelemetry('forgeCount');
    }

    const userInput = sanitizeForAPI(threadContexts[threadKey] || '');
    if (!userInput.trim()) {
      setError('Please enter your thoughts before continuing.');
      return;
    }

    // Handle different section types
    const isSummary = threadKey === 'summary';
    const isLetter = threadKey === 'letter';
    const isPath = threadKey === 'path';
    const isWordsToWhys = threadKey === 'words-to-whys';
    const isUnified = threadKey === 'unified';
    const isSection = isSummary || isLetter || isPath || isWordsToWhys || isUnified;
    let parentContent, parentLabel;

    if (isUnified) {
      // Unified continuation - uses the full reading overview
      if (!parsedReading?.summary) {
        setError('No reading content available for continuation.');
        return;
      }
      parentContent = getSummaryContent(parsedReading.summary) + (parsedReading.letter ? '\n\n' + getLetterContent(parsedReading.letter) : '');
      parentLabel = 'Full Reading';
    } else if (isSummary) {
      if (!parsedReading?.summary) {
        setError('No summary content available.');
        return;
      }
      parentContent = getSummaryContent(parsedReading.summary);
      parentLabel = 'Overview';
    } else if (isLetter) {
      if (!parsedReading?.letter) {
        setError('No letter content available.');
        return;
      }
      parentContent = getLetterContent(parsedReading.letter);
      parentLabel = 'Letter';
    } else if (isPath) {
      // New structure: path has surface/wade - use proper null check
      const path = parsedReading?.path;
      const pathContent = (path?.wade && path.wade !== '') ? path.wade
        : (path?.swim && path.swim !== '') ? path.swim
        : parsedReading?.rebalancerSummary;
      if (!pathContent) {
        setError('No path content available.');
        return;
      }
      parentContent = pathContent;
      parentLabel = 'Path to Balance';
    } else if (isWordsToWhys) {
      if (!parsedReading?.wordsToWhys) {
        setError('No Words to the Whys content available.');
        return;
      }
      parentContent = parsedReading.wordsToWhys;
      parentLabel = 'Words to the Whys';
    } else {
      // Card thread key is "card-N" format - extract the index
      const cardIndex = parseInt(threadKey.replace('card-', ''));
      const parentDraw = draws[cardIndex];
      const parentCard = parsedReading.cards.find(c => c.index === cardIndex);
      if (!parentDraw || !parentCard) {
        setError('Card not found.');
        return;
      }
      const parentTrans = getComponent(parentDraw.transient);
      const parentStat = STATUSES[parentDraw.status];
      const parentStatusPrefix = parentStat.prefix || 'Balanced';
      // Include token context if this is a DTP reading
      const tokenContext = parentCard.token ? ` (Regarding: ${parentCard.token})` : '';
      parentLabel = `${parentStatusPrefix} ${parentTrans.name}${tokenContext}`;
      // Use best available content from card
      parentContent = parentCard.wade || parentCard.swim || parentCard.surface || parentCard.deep || '';
    }

    setThreadLoading(prev => ({ ...prev, [threadKey]: true }));

    // Build comprehensive reading context for follow-up grounding
    const buildReadingContext = () => {
      const parts = [];

      // Overview/Summary
      if (parsedReading?.summary) {
        parts.push(`OVERVIEW:\n${getSummaryContent(parsedReading.summary)}`);
      }

      // Letter (use current depth or best available)
      if (parsedReading?.letter) {
        const letter = parsedReading.letter;
        const letterContent = letter[letterDepth] || letter.swim || letter.wade || letter.surface;
        if (letterContent) {
          parts.push(`LETTER:\n${letterContent}`);
        }
      }

      // Cards with their interpretations and Words to the Whys
      if (parsedReading?.cards) {
        parsedReading.cards.forEach((card, i) => {
          const draw = draws[i];
          const trans = getComponent(draw.transient);
          const stat = STATUSES[draw.status];
          const cardContent = card.wade || card.swim || card.surface;
          if (cardContent) {
            // Include token context for DTP readings
            const cardTokenLabel = card.token ? ` (Regarding: ${card.token})` : '';
            let cardSection = `CARD ${i + 1}: ${stat.prefix || 'Balanced'} ${trans.name}${cardTokenLabel}\n${cardContent}`;
            // Add Words to the Whys for this card
            if (card.why) {
              const whyContent = card.why.wade || card.why.swim || card.why.surface || card.why.deep;
              if (whyContent) {
                cardSection += `\n\nWHY THIS CARD (Teleological): ${whyContent}`;
              }
            }
            // Add Rebalancer if present
            if (card.rebalancer) {
              const rebalContent = card.rebalancer.wade || card.rebalancer.swim || card.rebalancer.surface;
              if (rebalContent) {
                cardSection += `\n\nREBALANCER: ${rebalContent}`;
              }
            }
            parts.push(cardSection);
          }
        });
      }

      // Path to Balance (global synthesis)
      if (parsedReading?.path) {
        const path = parsedReading.path;
        const pathContent = path[pathDepth] || path.swim || path.wade || path.surface;
        if (pathContent) {
          parts.push(`PATH TO BALANCE (Global Synthesis):\n${pathContent}`);
        }
      }

      return parts.join('\n\n---\n\n');
    };

    const fullReadingContext = buildReadingContext();
    const safeQuestion = sanitizeForAPI(question);
    const stancePrompt = buildStancePrompt(stance.complexity, stance.voice, stance.focus, stance.density, stance.scope, stance.seriousness);

    let systemPrompt, userMessage;

    // BOTH operations draw a new card - the difference is the framing
    const newDraw = generateSingleDraw();
    const newTrans = getComponent(newDraw.transient);
    const newStat = STATUSES[newDraw.status];
    const newStatusPrefix = newStat.prefix || 'Balanced';
    const newCardName = `${newStatusPrefix} ${newTrans.name}`;

    // Get correction info if new card is imbalanced
    const newCorrection = newDraw.status !== 1 ? getFullCorrection(newDraw.transient, newDraw.status) : null;
    const correctionInfo = newCorrection ? `
REBALANCER: This card is imbalanced (${newStat.name}). Include a rebalancer section.
Correction archetype: ${getComponent(getCorrectionTargetId(newCorrection, newTrans))?.name || 'Unknown'}
Correction type: ${newDraw.status === 2 ? 'DIAGONAL (Too Much)' : newDraw.status === 3 ? 'VERTICAL (Too Little)' : 'REDUCTION (Unacknowledged)'}
` : '';

    // Build DTP context for Explore mode threads
    const dtpContext = (() => {
      if (spreadType !== 'explore') return '';
      // For card threads, use the specific token
      const cardIndex = parseInt(threadKey.replace('card-', ''));
      if (!isNaN(cardIndex)) {
        const parentCard = parsedReading?.cards?.find(c => c.index === cardIndex);
        if (parentCard?.token) {
          return `
DTP CONTEXT:
FOCUS: This thread is exploring "${parentCard.token}"
${parsedReading?.originalInput ? `ORIGINAL SITUATION: "${parsedReading.originalInput}"` : ''}
Ground your response in this specific context — interpret the new card as it relates to "${parentCard.token}" in this situation.`;
        }
      }
      // For section threads in Explore mode, include overall context
      if (parsedReading?.originalInput && dtpTokens?.length > 0) {
        return `
DTP CONTEXT:
TOKENS IN THIS READING: ${dtpTokens.map(t => `"${t}"`).join(', ')}
ORIGINAL SITUATION: "${parsedReading.originalInput}"
Ground your response in this specific context.`;
      }
      return '';
    })();

    if (operation === 'reflect') {
      // REFLECT: User is INQUIRING - architecture responds to their QUESTION with a new card
      // The new card should be interpreted IN THE CONTEXT OF the parent card they're reflecting on
      systemPrompt = `${BASE_SYSTEM}

${stancePrompt}

OPERATION: REFLECT (Inquiry/Question)
The user is asking a question while engaging with a specific part of their reading.
A new card has been drawn as the architecture's RESPONSE to their inquiry.

CRITICAL: The new card speaks to their question IN THE CONTEXT OF what they were reflecting on.
- The parent section (${parentLabel}) is the GROUND
- Their question arises FROM that ground
- The new card illuminates their question WITHOUT abandoning that context
- Connect the new card back to the original card/section being discussed

Your job:
- Acknowledge their question briefly
- Interpret the NEW CARD as the architecture's answer, but ALWAYS in relation to ${parentLabel}
- Show how the new card speaks to their inquiry about ${parentLabel}
- The new card is a LENS on their question, not a replacement for the original context
- If the card is IMBALANCED, include a REBALANCER section with the correction path

Output structure:
1. Brief acknowledgment connecting their question to ${parentLabel} (1-2 sentences)
2. "The architecture responds with [Card Name]..."
3. How this new card illuminates their question ABOUT ${parentLabel} (2-3 paragraphs)
4. If imbalanced: "REBALANCER:" followed by the correction path (1-2 paragraphs)

Use paragraph breaks. Max 2-3 sentences per paragraph.`;

      userMessage = `ORIGINAL QUESTION: "${safeQuestion}"

PARENT CARD/SECTION BEING REFLECTED ON: ${parentLabel}
${parentContent}

FULL READING CONTEXT (for background):
${fullReadingContext}

USER'S INQUIRY/QUESTION (about ${parentLabel}):
"${userInput}"

NEW CARD DRAWN IN RESPONSE: ${newCardName}
Traditional: ${newTrans.traditional}
${newTrans.description}
${newTrans.extended || ''}
${correctionInfo}${dtpContext}

IMPORTANT: Interpret this new card as the architecture's response to their question ABOUT ${parentLabel}.
The new card should illuminate their inquiry while staying grounded in the original card they were reflecting on.
Do NOT interpret the new card in isolation - it speaks to their question about ${parentLabel}.`;

    } else {
      // FORGE: User is ASSERTING - architecture responds to their DECLARATION with a new card
      systemPrompt = `${BASE_SYSTEM}

${stancePrompt}

OPERATION: FORGE (Create/Assert)
The user has declared an intention or direction. They're not asking — they're stating what they're going to do or create from this reading.

A new card has been drawn as the architecture's RESPONSE to their declaration.

Your job:
- Acknowledge their declared direction briefly
- Interpret the NEW CARD as the architecture's response to their assertion
- This is a SUB-READING: what does this new card reveal about the path they've declared?
- The new card might affirm, complicate, deepen, or redirect their stated intention
- Be specific about how the new card speaks to what they said they're doing
- If the card is IMBALANCED, include a REBALANCER section with the correction path

Output structure:
1. Brief acknowledgment of their direction (1-2 sentences)
2. The new card's message in context of their declaration (2-3 paragraphs)
3. If imbalanced: "REBALANCER:" followed by the correction path (1-2 paragraphs)

Use paragraph breaks. Max 2-3 sentences per paragraph.`;

      userMessage = `ORIGINAL QUESTION: "${safeQuestion}"

FULL READING CONTEXT:
${fullReadingContext}

SECTION THEY'RE FORGING FROM: ${parentLabel}
${parentContent}

USER'S DECLARATION/ASSERTION:
"${userInput}"

NEW CARD DRAWN IN RESPONSE: ${newCardName}
Traditional: ${newTrans.traditional}
${newTrans.description}
${newTrans.extended || ''}
${correctionInfo}${dtpContext}
Interpret this new card as the architecture's response to their declared direction.`;
    }

    try {
      const res = await fetch('/api/reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: userMessage }],
          system: systemPrompt,
          model: getModelId(selectedModel),
          max_tokens: 8000,
          userId: currentUser?.id
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Add to thread (filter prohibited terms)
      const newThreadItem = {
        draw: newDraw, // both reflect and forge draw a new card
        interpretation: ensureParagraphBreaks(stripSignature(filterProhibitedTerms(data.reading))),
        operation: operation,
        context: userInput
      };

      setThreadData(prev => ({
        ...prev,
        [threadKey]: [...(prev[threadKey] || []), newThreadItem]
      }));

      // Clear the operation selection for next continuation
      setThreadOperations(prev => ({ ...prev, [threadKey]: null }));
      setThreadContexts(prev => ({ ...prev, [threadKey]: '' }));

      // Scroll to the new thread item after it renders
      requestAnimationFrame(() => {
        const threadContainer = document.querySelector(`[data-thread-key="${threadKey}"]`);
        if (threadContainer) {
          const lastThread = threadContainer.querySelector('.thread-item:last-child');
          if (lastThread) {
            lastThread.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      });

      // Accumulate token usage
      if (data.usage) {
        setTokenUsage(prev => prev ? {
          input_tokens: (prev.input_tokens || 0) + (data.usage.input_tokens || 0),
          output_tokens: (prev.output_tokens || 0) + (data.usage.output_tokens || 0)
        } : data.usage);
      }

    } catch (e) {
      setError(`Thread error: ${e.message}`);
    }

    setThreadLoading(prev => ({ ...prev, [threadKey]: false }));
  };

  // Continue a nested thread (from within a threaded card)
  // BOTH operations draw a new card - difference is inquiry vs assertion framing
  const continueNestedThread = async (cardIndex, threadKey, parentThreadItem) => {
    const operation = threadOperations[threadKey];
    if (!operation) return;

    const userInput = sanitizeForAPI(threadContexts[threadKey] || '');
    if (!userInput.trim()) {
      setError('Please enter your thoughts before continuing.');
      return;
    }

    setThreadLoading(prev => ({ ...prev, [threadKey]: true }));

    // Get parent card context
    const parentTrans = parentThreadItem.draw ? getComponent(parentThreadItem.draw.transient) : null;
    const parentStat = parentThreadItem.draw ? STATUSES[parentThreadItem.draw.status] : null;
    const parentStatusPrefix = parentTrans ? (parentStat.prefix || 'Balanced') : '';
    const parentCardName = parentTrans ? `${parentStatusPrefix} ${parentTrans.name}` : 'Previous Response';

    // Build comprehensive reading context for follow-up grounding
    const buildReadingContext = () => {
      const parts = [];
      if (parsedReading?.summary) parts.push(`OVERVIEW:\n${getSummaryContent(parsedReading.summary)}`);
      if (parsedReading?.letter) {
        const letter = parsedReading.letter;
        const letterContent = letter[letterDepth] || letter.swim || letter.wade || letter.surface;
        if (letterContent) parts.push(`LETTER:\n${letterContent}`);
      }
      if (parsedReading?.cards) {
        parsedReading.cards.forEach((card, i) => {
          const draw = draws[i];
          const trans = getComponent(draw.transient);
          const stat = STATUSES[draw.status];
          const cardContent = card.wade || card.swim || card.surface;
          if (cardContent) {
            let cardSection = `CARD ${i + 1}: ${stat.prefix || 'Balanced'} ${trans.name}\n${cardContent}`;
            if (card.why) {
              const whyContent = card.why.wade || card.why.swim || card.why.surface || card.why.deep;
              if (whyContent) cardSection += `\n\nWHY THIS CARD: ${whyContent}`;
            }
            parts.push(cardSection);
          }
        });
      }
      if (parsedReading?.path) {
        const path = parsedReading.path;
        const pathContent = path[pathDepth] || path.swim || path.wade || path.surface;
        if (pathContent) parts.push(`PATH TO BALANCE:\n${pathContent}`);
      }
      return parts.join('\n\n---\n\n');
    };

    const fullReadingContext = buildReadingContext();
    const safeQuestion = sanitizeForAPI(question);
    const stancePrompt = buildStancePrompt(stance.complexity, stance.voice, stance.focus, stance.density, stance.scope, stance.seriousness);

    let systemPrompt, userMessage;

    // BOTH operations draw a new card - the difference is the framing
    const newDraw = generateSingleDraw();
    const newTrans = getComponent(newDraw.transient);
    const newStat = STATUSES[newDraw.status];
    const newStatusPrefix = newStat.prefix || 'Balanced';
    const newCardName = `${newStatusPrefix} ${newTrans.name}`;

    if (operation === 'reflect') {
      // REFLECT: User is INQUIRING - architecture responds to their QUESTION with a new card
      systemPrompt = `${BASE_SYSTEM}

${stancePrompt}

OPERATION: REFLECT (Inquiry/Question)
The user is asking a question about the reading. A new card has been drawn as the architecture's response to their inquiry.

Your job:
- Acknowledge their question briefly
- Interpret the NEW CARD as the architecture's answer to what they asked
- This is a SUB-READING: the drawn card speaks directly to their inquiry
- The card IS the architecture speaking back to them

FORMATTING: Use short paragraphs with blank lines between them. Max 2-3 sentences per paragraph. Never write walls of text.`;

      userMessage = `ORIGINAL QUESTION: "${safeQuestion}"

FULL READING CONTEXT:
${fullReadingContext}

CARD BEING DISCUSSED: ${parentCardName}
${parentThreadItem.interpretation}

USER'S INQUIRY/QUESTION:
"${userInput}"

NEW CARD DRAWN IN RESPONSE: ${newCardName}
Traditional: ${newTrans.traditional}
${newTrans.description}
${newTrans.extended || ''}

Interpret this new card as the architecture's response to their question.`;

    } else {
      // FORGE: User is ASSERTING - architecture responds to their DECLARATION with a new card
      systemPrompt = `${BASE_SYSTEM}

${stancePrompt}

OPERATION: FORGE (Create/Assert)
The user has declared an intention. A new card has been drawn as the architecture's response.

Your job:
- Acknowledge their declared direction briefly
- Interpret the NEW CARD as the architecture's response to their assertion
- This is a SUB-READING of the new card against their declared direction

FORMATTING: Use short paragraphs with blank lines between them. Max 2-3 sentences per paragraph. Never write walls of text.`;

      userMessage = `ORIGINAL QUESTION: "${safeQuestion}"

FULL READING CONTEXT:
${fullReadingContext}

CARD THEY'RE FORGING FROM: ${parentCardName}
${parentThreadItem.interpretation}

USER'S DECLARATION/ASSERTION:
"${userInput}"

NEW CARD DRAWN IN RESPONSE: ${newCardName}
Traditional: ${newTrans.traditional}
${newTrans.description}
${newTrans.extended || ''}

Interpret this new card as the architecture's response to their declared direction.`;
    }

    try {
      const res = await fetch('/api/reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: userMessage }],
          system: systemPrompt,
          model: getModelId(selectedModel),
          max_tokens: 8000,
          userId: currentUser?.id
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Create new thread item (filter prohibited terms)
      const newThreadItem = {
        draw: newDraw, // both reflect and forge draw a new card
        interpretation: ensureParagraphBreaks(stripSignature(filterProhibitedTerms(data.reading))),
        operation: operation,
        context: userInput,
        children: []
      };

      // Helper to add child to the right parent in the tree
      const addChildToThread = (threads, targetKey, newChild, currentPath = '') => {
        return threads.map((item, idx) => {
          const itemKey = currentPath ? `${currentPath}.${idx}` : `${cardIndex}:${idx}`;
          if (itemKey === threadKey) {
            return {
              ...item,
              children: [...(item.children || []), newChild]
            };
          }
          if (item.children && item.children.length > 0) {
            return {
              ...item,
              children: addChildToThread(item.children, targetKey, newChild, itemKey)
            };
          }
          return item;
        });
      };

      setThreadData(prev => ({
        ...prev,
        [cardIndex]: addChildToThread(prev[cardIndex] || [], threadKey, newThreadItem)
      }));

      // Clear the operation selection
      setThreadOperations(prev => ({ ...prev, [threadKey]: null }));
      setThreadContexts(prev => ({ ...prev, [threadKey]: '' }));

      // Accumulate token usage
      if (data.usage) {
        setTokenUsage(prev => prev ? {
          input_tokens: (prev.input_tokens || 0) + (data.usage.input_tokens || 0),
          output_tokens: (prev.output_tokens || 0) + (data.usage.output_tokens || 0)
        } : data.usage);
      }

    } catch (e) {
      setError(`Thread error: ${e.message}`);
    }

    setThreadLoading(prev => ({ ...prev, [threadKey]: false }));
  };

  // Handler for glossary term clicks (shows tooltip)
  const handleGlossaryClick = (slug, entry, event) => {
    const rect = event.target.getBoundingClientRect();
    setGlossaryTooltip({
      entry,
      position: {
        x: rect.left + rect.width / 2,
        y: rect.top
      }
    });
  };

  // Info modal navigation - wraps setSelectedInfo to track history
  const navigateToInfo = (newInfo) => {
    if (selectedInfo) {
      // Push current info to history stack before showing new one
      setInfoHistory(prev => [...prev, selectedInfo]);
    }
    setSelectedInfo(newInfo);
  };

  // Navigate to info from a minimap, with back support to restore the minimap
  const navigateFromMinimap = (info, restoreCallback) => {
    minimapRestoreRef.current = restoreCallback;
    setInfoHistory(prev => [...prev, { type: 'minimap-restore' }]);
    setSelectedInfo(info);
  };

  const infoGoBack = () => {
    if (infoHistory.length > 0) {
      // Pop the last item from history and show it
      const newHistory = [...infoHistory];
      const prevInfo = newHistory.pop();
      setInfoHistory(newHistory);

      // Handle minimap restore - call the stored callback instead of showing info
      if (prevInfo?.type === 'minimap-restore') {
        setSelectedInfo(null);
        minimapRestoreRef.current?.();
        return;
      }

      setSelectedInfo(prevInfo);
    }
  };

  const closeInfoModal = () => {
    setSelectedInfo(null);
    setInfoHistory([]);
  };

  // Help Mode handlers
  const enterHelpMode = () => {
    setHelpMode(true);
    setShowVoicePanel(true);      // Auto-open voice settings (often missed)
    setShowLandingFineTune(true); // Show advanced config too
  };

  const exitHelpMode = () => {
    setHelpMode(false);
    setHelpTooltip(null);
  };

  const handleHelpClick = (helpKey, event) => {
    if (!helpMode) return false;
    event.stopPropagation();
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    setHelpTooltip({
      helpKey,
      position: { x: Math.min(rect.left, window.innerWidth - 300), y: rect.bottom + 8 }
    });
    return true; // Indicate help was shown
  };

  const handleExpand = async (sectionKey, expansionType, remove = false, userText = null) => {
    // If removing, just clear that expansion
    if (remove) {
      setExpansions(prev => {
        const newExp = { ...prev };
        if (newExp[sectionKey]) {
          const { [expansionType]: _, ...rest } = newExp[sectionKey];
          newExp[sectionKey] = rest;
          if (Object.keys(rest).length === 0) delete newExp[sectionKey];
        }
        return newExp;
      });
      return;
    }
    
    // If already has this expansion, toggle it off (but NOT for context - it's multi-turn)
    if (expansionType !== 'context' && expansions[sectionKey]?.[expansionType]) {
      handleExpand(sectionKey, expansionType, true);
      return;
    }

    // For context type, user text is required (button click in DepthCard handles input toggle)
    if (expansionType === 'context' && !userText) return;

    // Otherwise, fetch the expansion
    setExpanding({ section: sectionKey, type: expansionType });

    // Track telemetry for expansions
    if (expansionType === 'clarify') {
      updateTelemetry('clarifyCount');
    } else if (expansionType === 'unpack') {
      updateTelemetry('unpackCount');
    } else if (expansionType === 'example') {
      updateTelemetry('exampleCount');
    }

    // Build context for the expansion request
    // For card-specific sections, only include that card's draw (fixes scope leakage)
    let drawText = '';
    let sectionContent = '';
    let sectionContext = '';

    if (sectionKey === 'summary') {
      drawText = formatDrawForAI(draws, spreadType, spreadKey, false); // Full reading for summary
      sectionContent = getSummaryContent(parsedReading.summary);
      sectionContext = 'the summary of the reading';
    } else if (sectionKey === 'letter') {
      drawText = formatDrawForAI(draws, spreadType, spreadKey, false); // Full reading for letter
      sectionContent = getLetterContent(parsedReading.letter);
      sectionContext = 'the closing letter';
    } else if (sectionKey.startsWith('card-') || sectionKey.startsWith('card:')) {
      const cardIndex = parseInt(sectionKey.split(/[-:]/)[1]);
      const cardSection = parsedReading.cards.find(c => c.index === cardIndex);
      const draw = draws[cardIndex];
      const trans = getComponent(draw.transient);
      const stat = STATUSES[draw.status];
      // SCOPED: Only send this specific card's draw info (prevents mixing with other cards)
      drawText = `Signature ${cardIndex + 1}: ${stat.prefix || 'Balanced'} ${trans.name}\nStatus: ${stat.name}\n${cardSection?.architecture || ''}`;
      sectionContent = cardSection?.wade || cardSection?.surface || cardSection?.content || '';
      sectionContext = `the reading for ${trans.name} (Signature ${cardIndex + 1}) — THIS CARD ONLY`;
    } else if (sectionKey.startsWith('correction:') || sectionKey.startsWith('rebalancer:') || sectionKey.startsWith('rebalancer-')) {
      const cardIndex = parseInt(sectionKey.split(/[-:]/)[1]);
      const cardSection = parsedReading.cards.find(c => c.index === cardIndex);
      const rebalancer = cardSection?.rebalancer;
      const draw = draws[cardIndex];
      const trans = getComponent(draw.transient);
      const stat = STATUSES[draw.status];
      // SCOPED: Only send this specific card's draw info
      drawText = `Signature ${cardIndex + 1}: ${stat.prefix || 'Balanced'} ${trans.name}\nStatus: ${stat.name}\nRebalancer Architecture: ${rebalancer?.architecture || ''}`;
      sectionContent = rebalancer?.wade || rebalancer?.surface || '';
      sectionContext = `the rebalancer path for ${trans.name} (Signature ${cardIndex + 1}) — THIS CARD ONLY`;
    } else if (sectionKey.startsWith('growth-')) {
      const cardIndex = parseInt(sectionKey.split('-')[1]);
      const cardSection = parsedReading.cards.find(c => c.index === cardIndex);
      const growth = cardSection?.growth;
      const draw = draws[cardIndex];
      const trans = getComponent(draw.transient);
      const stat = STATUSES[draw.status];
      // SCOPED: Only send this specific card's draw info
      drawText = `Signature ${cardIndex + 1}: ${stat.prefix || 'Balanced'} ${trans.name}\nStatus: ${stat.name}\nGrowth Architecture: ${growth?.architecture || ''}`;
      sectionContent = growth?.wade || growth?.surface || '';
      sectionContext = `the growth opportunity for ${trans.name} (Signature ${cardIndex + 1}) — THIS CARD ONLY`;
    } else if (sectionKey === 'path') {
      drawText = formatDrawForAI(draws, spreadType, spreadKey, false); // Full reading for path synthesis
      sectionContent = parsedReading.path?.wade || parsedReading.rebalancerSummary || '';
      sectionContext = 'the Path to Balance section (synthesis of all corrections)';
    } else if (sectionKey === 'whyAppeared') {
      drawText = formatDrawForAI(draws, spreadType, spreadKey, false); // Full reading for why appeared
      sectionContent = getWhyAppearedContent(parsedReading.whyAppeared);
      sectionContext = 'the "Why This Reading Appeared" section (teleological closure - why these specific cards emerged for this question)';
    }

    // Custom prompts for each expansion type / section
    let expansionPrompt;
    if (expansionType === 'context') {
      expansionPrompt = EXPANSION_PROMPTS.context.prompt;
    } else if (sectionKey === 'path') {
      const pathPrompts = {
        unpack: "Expand on the Path to Balance with more detail. Go deeper on the synthesis of these corrections and what they're pointing to together.",
        clarify: "Restate the Path to Balance in simpler, everyday language. Plain words, short sentences — make it completely accessible.",
        architecture: "Explain the geometric relationships between the corrections. Why do these specific corrections work together? Show the structural logic.",
        example: "Give concrete real-world examples of how to apply this guidance. Specific scenarios someone might encounter — make it tangible."
      };
      expansionPrompt = pathPrompts[expansionType];
    } else if (sectionKey === 'whyAppeared') {
      const whyAppearedPrompts = {
        unpack: "Expand on why this reading appeared with more depth. Go deeper on the teleological significance - what pattern in the querent's life called forth these specific cards at this specific moment?",
        clarify: "Restate why this reading appeared in simpler, everyday language. Plain words, short sentences — make the teleological connection completely accessible.",
        example: "Give concrete real-world examples of how this teleological pattern might be showing up in the querent's life. Specific scenarios that might have called forth this reading — make it tangible."
      };
      expansionPrompt = whyAppearedPrompts[expansionType];
    } else {
      expansionPrompt = EXPANSION_PROMPTS[expansionType].prompt;
    }
    
    // Pass the original stance to expansion
    const stancePrompt = buildStancePrompt(stance.complexity, stance.voice, stance.focus, stance.density, stance.scope, stance.seriousness);
    const systemPrompt = `${BASE_SYSTEM}\n\n${stancePrompt}\n\nYou are expanding on a specific section of a reading. Keep the same tone as the original reading. Be concise but thorough. Always connect your expansion back to the querent's specific question.\n\nCRITICAL FORMATTING RULES:\n1. NEVER write walls of text\n2. Each paragraph must be 2-4 sentences MAX\n3. Put TWO blank lines between each paragraph (this is required for rendering)\n4. Break your response into 3-5 distinct paragraphs\n5. Each paragraph should explore ONE aspect or dimension`;

    // Inject user journey context if available
    const contextPrefix = userContextRef.current ? `${userContextRef.current}\n\n` : '';

    // V1: Build reading-level converse history (compact summary for cross-card awareness)
    const converseHistory = readingConverseRef.current;
    const converseBlock = converseHistory.length > 0
      ? `PRIOR CONVERSATIONS IN THIS READING:\n${converseHistory.map(c => `- On ${c.section}: "${c.userText}"`).join('\n')}\nKeep awareness of these prior exchanges — the querent's exploration has a thread.\n\n`
      : '';

    // Build DTP context for Explore mode expansions
    const expansionDtpContext = (() => {
      if (spreadType !== 'explore') return '';
      // For card expansions, include the specific token
      if (sectionKey.startsWith('card-') || sectionKey.startsWith('card:')) {
        const cardIndex = parseInt(sectionKey.split(/[-:]/)[1]);
        const cardSection = parsedReading?.cards?.find(c => c.index === cardIndex);
        if (cardSection?.token) {
          return `
DTP CONTEXT: This expansion is regarding "${cardSection.token}"${parsedReading?.originalInput ? ` in the context of "${parsedReading.originalInput}"` : ''}
Ground your expansion in this specific situation.`;
        }
      }
      // For rebalancer expansions, include the card's token
      if (sectionKey.startsWith('correction:') || sectionKey.startsWith('rebalancer:')) {
        const cardIndex = parseInt(sectionKey.split(':')[1]);
        const cardSection = parsedReading?.cards?.find(c => c.index === cardIndex);
        if (cardSection?.token) {
          return `
DTP CONTEXT: This rebalancer expansion is for the "${cardSection.token}" card${parsedReading?.originalInput ? ` in the context of "${parsedReading.originalInput}"` : ''}
Ground your expansion in this specific situation.`;
        }
      }
      // For section expansions in Explore mode
      if (parsedReading?.originalInput && dtpTokens?.length > 0) {
        return `
DTP CONTEXT: This reading explores ${dtpTokens.map(t => `"${t}"`).join(', ')}
ORIGINAL SITUATION: "${parsedReading.originalInput}"
Ground your expansion in this specific context.`;
      }
      return '';
    })();
    // Build messages for API call
    let messages;
    if (expansionType === 'context' && userText) {
      // Multi-turn context: build conversation history
      const existingContext = expansions[sectionKey]?.context || [];
      const baseInfo = `${contextPrefix}${converseBlock}QUERENT'S QUESTION: "${question}"\n\nTHE DRAW:\n${drawText}\n\nSECTION BEING EXPANDED (${sectionContext}):\n${sectionContent}`;

      if (existingContext.length === 0) {
        // First context submission
        messages = [{
          role: 'user',
          content: `${baseInfo}\n\nQUERENT'S ADDITIONAL CONTEXT: "${userText}"\n\n${expansionPrompt}\n${expansionDtpContext}\nKeep it focused on this specific section AND relevant to their question: "${question}"\n\nREMINDER: Use SHORT paragraphs (2-3 sentences each) with blank lines between them.`
        }];
      } else {
        // Follow-up: reconstruct conversation with full context in first message
        messages = [{
          role: 'user',
          content: `${baseInfo}\n\nQUERENT'S ADDITIONAL CONTEXT: "${existingContext[0].content}"\n\n${expansionPrompt}\n${expansionDtpContext}\nKeep it focused on this specific section AND relevant to their question: "${question}"\n\nREMINDER: Use SHORT paragraphs (2-3 sentences each) with blank lines between them.`
        }];
        // Add previous conversation turns
        for (let i = 1; i < existingContext.length; i++) {
          const turn = existingContext[i];
          messages.push({
            role: turn.role,
            content: turn.role === 'user'
              ? `FOLLOW-UP CONTEXT: "${turn.content}"\n\nBuild on your previous re-interpretation. Don't repeat yourself — show what's new.`
              : turn.content
          });
        }
        // Add new follow-up
        messages.push({
          role: 'user',
          content: `FOLLOW-UP CONTEXT: "${userText}"\n\nBuild on your previous re-interpretation. Don't repeat yourself — show what's new.`
        });
      }
    } else {
      // Standard one-shot expansion
      const userMessage = `${contextPrefix}${converseBlock}QUERENT'S QUESTION: "${question}"

THE DRAW:
${drawText}

SECTION BEING EXPANDED (${sectionContext}):
${sectionContent}

EXPANSION REQUEST:
${expansionPrompt}
${expansionDtpContext}
Respond directly with the expanded content. No section markers needed. Keep it focused on this specific section AND relevant to their question: "${question}"

REMINDER: Use SHORT paragraphs (2-3 sentences each) with blank lines between them. Never write a wall of text.`;
      messages = [{ role: 'user', content: userMessage }];
    }

    try {
      const res = await fetch('/api/reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, system: systemPrompt, model: getModelId(selectedModel), max_tokens: 2000, userId: currentUser?.id })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Post-process to ensure paragraph breaks (AI often ignores formatting instructions)
      const formattedContent = ensureParagraphBreaks(stripSignature(filterProhibitedTerms(data.reading)));

      if (expansionType === 'context') {
        // Store as conversation array (append user turn + assistant response)
        setExpansions(prev => ({
          ...prev,
          [sectionKey]: {
            ...(prev[sectionKey] || {}),
            context: [
              ...(prev[sectionKey]?.context || []),
              { role: 'user', content: userText },
              { role: 'assistant', content: formattedContent }
            ]
          }
        }));
        // V1: Accumulate into reading-level converse history
        readingConverseRef.current = [
          ...readingConverseRef.current,
          { section: sectionKey, userText }
        ];
      } else {
        // Store as string (one-shot expansion)
        setExpansions(prev => ({
          ...prev,
          [sectionKey]: {
            ...(prev[sectionKey] || {}),
            [expansionType]: formattedContent
          }
        }));
      }

      // Accumulate token usage
      if (data.usage) {
        setTokenUsage(prev => prev ? {
          input_tokens: (prev.input_tokens || 0) + (data.usage.input_tokens || 0),
          output_tokens: (prev.output_tokens || 0) + (data.usage.output_tokens || 0)
        } : data.usage);
      }
    } catch (e) {
      setError(`Expansion error: ${e.message}`);
    }
    setExpanding(null);
  };

  // Render Converse button + conversation UI for synthesis sections (summary, whyAppeared, path, letter)
  const renderSynthConverseUI = (sectionKey, sectionExps, isSectionExpanding, accentColor = 'amber') => {
    const contextData = sectionExps?.context;
    const hasContext = contextData && Array.isArray(contextData) && contextData.length > 0;
    const isContextExpanding = isSectionExpanding && expanding?.type === 'context';
    const isCollapsed = collapsedSections[`${sectionKey}-context`] === true;
    const inputVisible = synthContextInput[sectionKey];

    const colorMap = {
      amber: { border: 'border-amber-700/30', bg: 'bg-amber-950/10', hoverBg: 'hover:bg-amber-900/20', text: 'text-amber-400', textDim: 'text-amber-400/80', quoteBg: 'bg-amber-950/30', btnBg: 'bg-amber-600', btnHover: 'hover:bg-amber-500', activeBg: 'bg-amber-500/30', activeBorder: 'border-amber-500/50', activeText: 'text-amber-300' },
      cyan: { border: 'border-cyan-700/30', bg: 'bg-cyan-950/10', hoverBg: 'hover:bg-cyan-900/20', text: 'text-cyan-400', textDim: 'text-cyan-400/80', quoteBg: 'bg-cyan-950/30', btnBg: 'bg-cyan-600', btnHover: 'hover:bg-cyan-500', activeBg: 'bg-cyan-500/30', activeBorder: 'border-cyan-500/50', activeText: 'text-cyan-300' },
      emerald: { border: 'border-emerald-700/30', bg: 'bg-emerald-950/10', hoverBg: 'hover:bg-emerald-900/20', text: 'text-emerald-400', textDim: 'text-emerald-400/80', quoteBg: 'bg-emerald-950/30', btnBg: 'bg-emerald-600', btnHover: 'hover:bg-emerald-500', activeBg: 'bg-emerald-500/30', activeBorder: 'border-emerald-500/50', activeText: 'text-emerald-300' },
      violet: { border: 'border-violet-700/30', bg: 'bg-violet-950/10', hoverBg: 'hover:bg-violet-900/20', text: 'text-violet-400', textDim: 'text-violet-400/80', quoteBg: 'bg-violet-950/30', btnBg: 'bg-violet-600', btnHover: 'hover:bg-violet-500', activeBg: 'bg-violet-500/30', activeBorder: 'border-violet-500/50', activeText: 'text-violet-300' },
    };
    const c = colorMap[accentColor] || colorMap.amber;

    return (
      <>
        {/* Converse conversation thread */}
        {hasContext && (
          <div className={`mt-4 rounded-lg border ${c.border} overflow-hidden animate-fadeIn ${c.bg}`}>
            <div
              className={`flex items-center gap-2 px-3 py-2 cursor-pointer ${c.hoverBg} transition-colors`}
              onClick={(e) => { e.stopPropagation(); setCollapsedSections(prev => ({ ...prev, [`${sectionKey}-context`]: !prev[`${sectionKey}-context`] })); }}
            >
              <span className={`text-xs transition-transform duration-200 ${isCollapsed ? 'text-red-500' : c.text}`} style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>{'\u25BC'}</span>
              <span className={`text-xs ${c.textDim} uppercase tracking-wider`}>Converse</span>
              <span className="text-[0.6rem] text-zinc-600 ml-auto">
                {Math.floor(contextData.length / 2)} exchange{contextData.length > 2 ? 's' : ''}
              </span>
              {isCollapsed && <span className="text-[0.6rem] text-zinc-600 ml-1">tap to expand</span>}
            </div>
            {!isCollapsed && (
              <div className={`px-3 pb-3 border-t ${c.border} space-y-3`}>
                {contextData.map((turn, i) => (
                  <div key={i}>
                    {turn.role === 'user' ? (
                      <div className={`text-xs ${c.textDim} ${c.quoteBg} rounded px-2 py-1.5 italic`}>
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

        {/* Converse input — stays visible for multi-turn */}
        {inputVisible && !(hasContext && isCollapsed) && (
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={synthContextText[sectionKey] || ''}
              onChange={(e) => setSynthContextText(prev => ({ ...prev, [sectionKey]: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && synthContextText[sectionKey]?.trim() && !isContextExpanding) {
                  e.preventDefault();
                  handleExpand(sectionKey, 'context', false, synthContextText[sectionKey].trim());
                  setSynthContextText(prev => ({ ...prev, [sectionKey]: '' }));
                }
              }}
              placeholder={hasContext ? "Continue the conversation..." : "Share a thought, ask a question..."}
              className={`flex-1 bg-zinc-800/80 text-zinc-200 text-sm rounded-lg px-3 py-2 border border-zinc-700 focus:${c.border.replace('border-', 'border-')} focus:outline-none placeholder-zinc-600`}
              disabled={isContextExpanding}
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (synthContextText[sectionKey]?.trim() && !isContextExpanding) {
                  handleExpand(sectionKey, 'context', false, synthContextText[sectionKey].trim());
                  setSynthContextText(prev => ({ ...prev, [sectionKey]: '' }));
                }
              }}
              disabled={!synthContextText[sectionKey]?.trim() || isContextExpanding}
              className={`px-3 py-2 text-sm rounded-lg ${c.btnBg} text-white ${c.btnHover} disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0`}
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

  // Render Converse button for synthesis sections
  const renderSynthConverseButton = (sectionKey, sectionExps, isSectionExpanding, accentColor = 'amber') => {
    const hasContext = sectionExps?.context && Array.isArray(sectionExps.context) && sectionExps.context.length > 0;
    const colorMap = {
      amber: { activeBg: 'bg-amber-500/30', activeText: 'text-amber-300', activeBorder: 'border-amber-500/50' },
      cyan: { activeBg: 'bg-cyan-500/30', activeText: 'text-cyan-300', activeBorder: 'border-cyan-500/50' },
      emerald: { activeBg: 'bg-emerald-500/30', activeText: 'text-emerald-300', activeBorder: 'border-emerald-500/50' },
      violet: { activeBg: 'bg-violet-500/30', activeText: 'text-violet-300', activeBorder: 'border-violet-500/50' },
    };
    const c = colorMap[accentColor] || colorMap.amber;

    return (
      <button
        onClick={(e) => { e.stopPropagation(); setSynthContextInput(prev => ({ ...prev, [sectionKey]: !prev[sectionKey] })); }}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
          synthContextInput[sectionKey] || hasContext
            ? `${c.activeBg} ${c.activeText} border ${c.activeBorder}`
            : 'bg-zinc-800/50 text-zinc-500 border border-zinc-700/50 hover:text-zinc-300'
        }`}
      >
        Converse
      </button>
    );
  };

  const sendFollowUp = async () => {
    if (!followUp.trim() || !draws) return;
    setFollowUpLoading(true); setError('');
    const drawText = formatDrawForAI(draws, spreadType, spreadKey, false); // Never send traditional names to API
    
    // Build comprehensive context from parsed reading (includes Letter, Path, Words to Whys)
    let readingContext = '';
    if (parsedReading) {
      readingContext = `PREVIOUS READING:\n\n`;

      // Overview/Summary
      if (parsedReading.summary) {
        readingContext += `OVERVIEW: ${getSummaryContent(parsedReading.summary)}\n\n`;
      }

      // Letter (use current depth or best available)
      if (parsedReading.letter) {
        const letter = parsedReading.letter;
        const letterContent = letter[letterDepth] || letter.swim || letter.wade || letter.surface;
        if (letterContent) {
          readingContext += `LETTER:\n${letterContent}\n\n`;
        }
      }

      // Cards with Words to Whys and Rebalancers
      parsedReading.cards.forEach((card, i) => {
        const draw = draws[i];
        const trans = getComponent(draw.transient);
        const stat = STATUSES[draw.status];
        const cardContent = card.wade || card.surface || card.content || '';
        readingContext += `CARD ${i + 1}: ${stat.prefix || 'Balanced'} ${trans.name}\n${cardContent}\n`;

        // Words to the Whys for this card
        if (card.why) {
          const whyContent = card.why.wade || card.why.swim || card.why.surface || card.why.deep;
          if (whyContent) {
            readingContext += `\nWHY THIS CARD: ${whyContent}\n`;
          }
        }

        // Rebalancer for this card
        if (card.rebalancer) {
          const rebalancerContent = card.rebalancer.wade || card.rebalancer.surface || '';
          if (rebalancerContent) {
            readingContext += `\nREBALANCER: ${rebalancerContent}\n`;
          }
        }
        readingContext += '\n';
      });

      // Path to Balance (global synthesis)
      if (parsedReading.path) {
        const path = parsedReading.path;
        const pathContent = path[pathDepth] || path.swim || path.wade || path.surface;
        if (pathContent) {
          readingContext += `PATH TO BALANCE:\n${pathContent}\n\n`;
        }
      }
    }
    
    // Pass stance to follow-up
    const stancePrompt = buildStancePrompt(stance.complexity, stance.voice, stance.focus, stance.density, stance.scope, stance.seriousness);
    const systemPrompt = `${BASE_SYSTEM}\n\n${stancePrompt}\n\nYou are conversing about an encounter. The querent wants to go deeper, challenge something, or explore a thread. Respond directly, referencing the reading context as needed. This is a dialogue, not a lecture. No section markers — just respond naturally.

CRITICAL FORMATTING RULES:
1. Write SHORT paragraphs (2-3 sentences MAX each)
2. Put a BLANK LINE between each paragraph
3. Break your response into 3-5 distinct paragraphs
4. NEVER write a wall of text - readers need visual breathing room`;

    const messages = [
      ...followUpMessages,
      { role: 'user', content: followUp }
    ];

    // V1: Inject user journey context + reading-level converse history
    const fuContextPrefix = userContextRef.current ? `${userContextRef.current}\n\n` : '';
    const fuConverseHistory = readingConverseRef.current;
    const fuConverseBlock = fuConverseHistory.length > 0
      ? `PRIOR CONVERSATIONS IN THIS READING:\n${fuConverseHistory.map(c => `- On ${c.section}: "${c.userText}"`).join('\n')}\n\n`
      : '';

    const contextMessage = `${fuContextPrefix}${fuConverseBlock}THE DRAW:\n${drawText}\n\n${readingContext}\n\nFOLLOW-UP QUESTION: ${followUp}\n\nREMINDER: Use short paragraphs with blank lines between them.`;

    try {
      const res = await fetch('/api/reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: contextMessage }],
          system: systemPrompt,
          model: getModelId(selectedModel),
          max_tokens: 2000,
          userId: currentUser?.id
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      // Post-process to ensure paragraph breaks
      const formattedResponse = ensureParagraphBreaks(stripSignature(filterProhibitedTerms(data.reading)));
      setFollowUpMessages([...messages, { role: 'assistant', content: formattedResponse }]);
      // V1: Accumulate follow-up into reading-level converse history
      readingConverseRef.current = [...readingConverseRef.current, { section: 'follow-up', userText: followUp }];
      setFollowUp('');

      // Accumulate token usage
      if (data.usage) {
        setTokenUsage(prev => prev ? {
          input_tokens: (prev.input_tokens || 0) + (data.usage.input_tokens || 0),
          output_tokens: (prev.output_tokens || 0) + (data.usage.output_tokens || 0)
        } : data.usage);
      }
    } catch (e) { setError(`Error: ${e.message}`); }
    setFollowUpLoading(false);
  };

  const resetReading = () => {
    // Save telemetry before resetting (fire and forget)
    if (savedReadingId) {
      updateReadingTelemetry(savedReadingId, telemetry).catch(err => console.log('[Telemetry] Failed to save:', err));
      setSavedReadingId(null);
    }
    // Clear auto-resume so new reading starts fresh
    try { sessionStorage.removeItem('nirmanakaya_active_reading'); } catch (e) { /* ignore */ }
    setDraws(null); setParsedReading(null); setExpansions({}); setFollowUpMessages([]); readingConverseRef.current = [];
    setQuestion(''); setFollowUp(''); setError(''); setFollowUpLoading(false);
    setShareUrl(''); setIsSharedReading(false); setShowArchitecture(false);
    setShowMidReadingStance(false);
    // Clear DTP state
    setDtpInput(''); setDtpTokens(null);
    // Clear thread state
    setThreadData({}); setThreadOperations({}); setThreadContexts({}); setThreadLoading({}); setCollapsedThreads({});
    setAriadneThread(null); setAriadneLoading(false);
    // Reset on-demand state
    setCardLoaded({}); setCardLoading({}); setSynthesisLoaded(false); setSynthesisLoading(false); setContentSaved(false); setSynthesisSaved(false);
    // Reset telemetry
    resetTelemetry();
    // Reset depth states to user's chosen default
    setLetterDepth(defaultDepth); setPathDepth(defaultDepth); setSummaryDepth(defaultDepth); setWhyAppearedDepth(defaultDepth);
    hasAutoInterpreted.current = false;
    window.history.replaceState({}, '', window.location.pathname);
  };

  // === ARIADNE THREAD ===
  // Chain traversal through archetype positions: T→Root(T)→Draw in Root(T)→Root(new T)→...

  const handleTraceRoot = (cardIndex) => {
    if (ariadneThread || ariadneLoading) return; // Already tracing
    const draw = draws[cardIndex];
    if (!draw) return;

    // Find the archetype root of this card's transient
    const rootPosition = getArchetypeRoot(draw.transient);

    // Generate a new draw at the root position
    const newDraw = generateTraceDraw(rootPosition);
    const visitedPositions = new Set([draw.position, rootPosition]);
    // Check for fixed point: transient's root IS the position it's drawn in
    const newRoot = getArchetypeRoot(newDraw.transient);
    const isFixedPoint = newRoot === rootPosition;
    const isCycle = false; // Can't cycle on first step

    setAriadneThread({
      sourceCardIndex: cardIndex,
      steps: [{
        draw: newDraw,
        position: rootPosition,
        interpretation: null,
        loaded: false,
        isFixedPoint,
        isCycle
      }],
      visitedPositions: [...visitedPositions],
      terminated: isFixedPoint,
      terminationReason: isFixedPoint ? 'fixed-point' : undefined
    });
  };

  const handleTraceContinue = () => {
    if (!ariadneThread || ariadneLoading || ariadneThread.terminated) return;

    const lastStep = ariadneThread.steps[ariadneThread.steps.length - 1];
    const nextPosition = getArchetypeRoot(lastStep.draw.transient);

    // Check for cycle
    const visited = new Set(ariadneThread.visitedPositions);
    const isCycle = visited.has(nextPosition);

    // Check for max steps
    if (ariadneThread.steps.length >= MAX_ARIADNE_STEPS) {
      setAriadneThread(prev => ({ ...prev, terminated: true, terminationReason: 'max-steps' }));
      return;
    }

    if (isCycle) {
      setAriadneThread(prev => ({
        ...prev,
        terminated: true,
        terminationReason: 'cycle',
        cycleTarget: nextPosition
      }));
      return;
    }

    // Generate a new draw at the next position
    const newDraw = generateTraceDraw(nextPosition);
    const newRoot = getArchetypeRoot(newDraw.transient);
    const isFixedPoint = newRoot === nextPosition;

    visited.add(nextPosition);

    setAriadneThread(prev => ({
      ...prev,
      steps: [...prev.steps, {
        draw: newDraw,
        position: nextPosition,
        interpretation: null,
        loaded: false,
        isFixedPoint,
        isCycle: false
      }],
      visitedPositions: [...visited],
      terminated: isFixedPoint,
      terminationReason: isFixedPoint ? 'fixed-point' : undefined
    }));
  };

  const handleTraceStop = () => {
    if (!ariadneThread) return;
    setAriadneThread(prev => ({
      ...prev,
      terminated: true,
      terminationReason: 'user-stopped'
    }));
  };

  const handleTraceCardLoad = async (stepIndex) => {
    if (!ariadneThread || ariadneLoading) return;
    const step = ariadneThread.steps[stepIndex];
    if (!step || step.loaded) return;

    setAriadneLoading(true);

    const trans = getComponent(step.draw.transient);
    const stat = STATUSES[step.draw.status];
    const posArch = ARCHETYPES[step.position];
    const statusPrefix = stat.prefix || 'Balanced';

    // Build chain context for the AI
    const chainContext = ariadneThread.steps.slice(0, stepIndex).map((s, i) => {
      const sTrans = getComponent(s.draw.transient);
      const sArch = ARCHETYPES[s.position];
      return `Step ${i + 1}: ${sTrans.name} in ${sArch.name} position`;
    }).join(' → ');

    const sourceCard = draws[ariadneThread.sourceCardIndex];
    const sourceTrans = getComponent(sourceCard.transient);
    const sourceArch = ARCHETYPES[sourceCard.position];

    // Individual traced cards inherit current posture (Council ruling Q5)
    const systemPrompt = buildSystemPrompt(userLevel, {
      spreadType,
      posture, // V1: explicit posture for governance (overrides spreadType)
      stance,
      persona,
      humor,
      showArchitecture: showArchitectureTerms
    });

    // Build the trace interpretation prompt
    const userMessage = `${userContextRef.current ? `${userContextRef.current}\n\n` : ''}ARIADNE THREAD — Tracing the root structure of this reading.

ORIGIN: ${sourceTrans.name} in ${sourceArch.name} position
${chainContext ? `CHAIN SO FAR: ${chainContext}\n` : ''}
CURRENT STEP ${stepIndex + 1}: ${statusPrefix} ${trans.name} drawn in ${posArch.name} position

THE SIGNATURE: ${trans.name}${trans.traditional ? ` (${trans.traditional})` : ''}
${trans.extended || trans.description}
Status: ${statusPrefix} (${stat.name} — ${stat.desc})
Position: ${posArch.name} — ${posArch.description}

QUESTION BEING EXPLORED: "${sanitizeForAPI(question)}"

Interpret this signature in its position, through the lens of the Ariadne Thread. This card was reached by tracing the archetype root of the previous signature. What does this structural chain reveal? How does arriving at ${posArch.name} through this path illuminate the original question?

Keep it focused: 2-4 paragraphs. This is a single step in a chain, not a full reading.`;

    try {
      const res = await fetch('/api/reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: userMessage }],
          system: systemPrompt,
          model: getModelId(selectedModel),
          max_tokens: 2000,
          userId: currentUser?.id
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const formatted = ensureParagraphBreaks(stripSignature(filterProhibitedTerms(data.reading)));

      setAriadneThread(prev => ({
        ...prev,
        steps: prev.steps.map((s, i) =>
          i === stepIndex ? { ...s, interpretation: formatted, loaded: true } : s
        )
      }));

      // Accumulate into reading-level converse history
      readingConverseRef.current = [
        ...readingConverseRef.current,
        { section: `ariadne-step-${stepIndex + 1}`, userText: `Traced to ${posArch.name}: ${trans.name}` }
      ];

      if (data.usage) {
        setTokenUsage(prev => prev ? {
          input_tokens: (prev.input_tokens || 0) + (data.usage.input_tokens || 0),
          output_tokens: (prev.output_tokens || 0) + (data.usage.output_tokens || 0)
        } : data.usage);
      }
    } catch (e) {
      setError(`Trace error: ${e.message}`);
    }
    setAriadneLoading(false);
  };

  // V1: Apply a named preset — bundles frame + posture + card count + voice settings
  const applyPreset = (presetKey) => {
    const preset = READING_PRESETS[presetKey];
    if (!preset) return;
    const s = preset.settings;
    // V1 Layer Architecture: set frame, posture, card count (sync effects handle spreadType/spreadKey)
    if (s.frameSource) setFrameSource(s.frameSource);
    if (s.posture) setPosture(s.posture);
    if (s.cardCount) setCardCount(s.cardCount);
    // Voice settings
    if (s.persona) setPersona(s.persona);
    if (s.humor !== undefined) setHumor(s.humor);
    if (s.showArchitecture !== undefined) setShowArchitectureTerms(s.showArchitecture);
  };

  const getCardHouse = (draw, index) => {
    if (spreadType === 'reflect') {
      // Reflect mode uses neutral Gestalt coloring since positions don't have houses
      return 'Gestalt';
    } else if (draw.position !== null) {
      return ARCHETYPES[draw.position]?.house || 'Gestalt';
    }
    return 'Gestalt';
  };

  // Helper to open card detail modal (full-screen with stats)
  const openCardDetail = async (transientId) => {
    setCardDetailId(transientId);
    if (!userStatsRef.current && currentUser) {
      try {
        const session = await getSession();
        const token = session?.session?.access_token;
        if (token) {
          const res = await fetch('/api/user/stats', { headers: { 'Authorization': `Bearer ${token}` } });
          const data = await res.json();
          if (data.success) userStatsRef.current = data.stats;
        }
      } catch (e) { /* silent */ }
    }
  };

  // === CARD DISPLAY (simplified, visual only) ===
  const CardDisplay = ({ draw, index }) => {
    const isReflect = spreadType === 'reflect';
    const spreadConfig = isReflect ? REFLECT_SPREADS[reflectSpreadKey] : RANDOM_SPREADS[spreadKey];
    const trans = getComponent(draw.transient);
    const stat = STATUSES[draw.status];
    const transArchetype = trans.archetype !== undefined ? ARCHETYPES[trans.archetype] : null;
    const isMajor = trans.type === "Archetype";
    const correction = getFullCorrection(draw.transient, draw.status);
    const correctionText = getCorrectionText(correction, trans, draw.status);
    const correctionTargetId = getCorrectionTargetId(correction, trans);

    // Growth Opportunity for balanced cards
    const isBalanced = draw.status === 1;
    const cardHomeArchetype = trans.archetype ?? draw.transient; // Archetype: its own ID, Bound/Agent: its archetype
    const GESTALT_ARCHETYPES = new Set([0, 1, 10, 19, 20, 21]);
    const isGestaltCard = GESTALT_ARCHETYPES.has(cardHomeArchetype);
    const cardType = trans.type?.toLowerCase() || 'archetype';

    const getGrowthTargetId = () => {
      if (isGestaltCard) return draw.transient;
      if (cardType === 'agent') {
        const agentCorrection = getAgentCorrection(trans, 1);
        if (agentCorrection?.targetAgentId) return agentCorrection.targetAgentId;
      }
      if (cardType === 'bound') {
        const boundCorrection = getBoundCorrection(trans, 1);
        if (boundCorrection?.targetId) return boundCorrection.targetId;
      }
      return draw.position;
    };
    const growthTargetId = isBalanced ? getGrowthTargetId() : null;
    const growthTargetCard = growthTargetId !== null ? getComponent(growthTargetId) : null;
    const growthTargetName = growthTargetCard?.name || (draw.position !== null ? ARCHETYPES[draw.position]?.name : null);

    const house = getCardHouse(draw, index);
    const houseColors = HOUSE_COLORS[house];

    // V1: Every card has an archetype position. Frame labels are additional context.
    const contextLabel = ARCHETYPES[draw.position]?.name || 'Draw';
    const frameLabel = isReflect && spreadConfig?.positions?.[index]?.name ? spreadConfig.positions[index].name : null;
    const contextSub = frameLabel || null;
    
    // Helper to open card info
    const openCardInfo = (cardId) => {
      setSelectedInfo({ type: 'card', id: cardId, data: getComponent(cardId) });
    };
    
    // Helper to open status info
    const openStatusInfo = (statusId) => {
      setSelectedInfo({ type: 'status', id: statusId, data: STATUS_INFO[statusId] });
    };
    
    // Helper to open channel info
    const openChannelInfo = (channelName) => {
      setSelectedInfo({ type: 'channel', id: channelName, data: CHANNELS[channelName] });
    };
    
    // Helper to open house info
    const openHouseInfo = (houseName) => {
      setSelectedInfo({ type: 'house', id: houseName, data: HOUSES[houseName] });
    };
    
    // Scroll to content section
    const scrollToContent = () => {
      document.getElementById(`content-${index}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    // Get card image path for background
    const cardImagePath = getCardImagePath(draw.transient);

    return (
      <div
        id={`card-${index}`}
        className={`rounded-lg border-2 p-4 ${houseColors.border} ${houseColors.bg} transition-all cursor-pointer hover:border-opacity-80 group relative overflow-hidden`}
        onClick={scrollToContent}
      >
        {/* Card artwork background */}
        {showCardImages && cardImagePath && (
          <>
            <img
              src={cardImagePath}
              alt=""
              className="absolute inset-0 w-full h-full object-cover object-center opacity-15 pointer-events-none"
              aria-hidden="true"
            />
            <button
              className="absolute top-2 right-2 z-20 p-1.5 rounded-md bg-black/40 text-zinc-400 hover:text-white sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
              title="View card detail"
              onClick={(e) => { e.stopPropagation(); openCardDetail(draw.transient); }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
            </button>
          </>
        )}
        <div className="relative z-10 mb-3 flex justify-between items-start">
          <span
            className={`text-xs px-2 py-1 rounded-full cursor-pointer hover:opacity-80 ${STATUS_COLORS[draw.status]}`}
            onClick={(e) => { e.stopPropagation(); openStatusInfo(draw.status); }}
          >
            {stat.name}
          </span>
          <span className="text-zinc-600 text-xs opacity-0 group-hover:opacity-100 transition-opacity">↓ read</span>
        </div>

        <div className="relative z-10 mb-3">
          <div
            className="text-xl text-zinc-100 font-semibold cursor-pointer hover:text-zinc-300 transition-colors"
            onClick={(e) => { e.stopPropagation(); openCardInfo(draw.transient); }}
            title="Click for details"
          >
            {trans.name}
            <span className="text-zinc-600 text-sm ml-1">ⓘ</span>
          </div>
          {isMajor && (
            <div className="mt-1">
              <span className="text-xs bg-amber-500/30 text-amber-300 px-2 py-0.5 rounded-full">Major</span>
            </div>
          )}
          {showTraditional && <div className="text-sm text-zinc-500 mt-1">{trans.traditional}</div>}
        </div>

        <div className="relative z-10 text-sm text-zinc-400 mb-3">
          in your <span
            className={`font-medium cursor-pointer hover:underline decoration-dotted ${houseColors.text}`}
            onClick={(e) => { e.stopPropagation(); openCardInfo(draw.position); }}
          >{contextLabel}</span>
          {contextSub && <span className="text-zinc-600 text-xs ml-1">({contextSub})</span>}
        </div>

        <div className="relative z-10 border-t border-zinc-700/30 pt-3 space-y-1">
          {trans.type === "Bound" && (
            <>
              <div className="text-sm">
                <span 
                  className={`cursor-pointer hover:underline decoration-dotted ${CHANNEL_COLORS[trans.channel]}`}
                  onClick={(e) => { e.stopPropagation(); openChannelInfo(trans.channel); }}
                >{trans.channel}</span>
                <span className="text-zinc-500"> Channel</span>
              </div>
              <div className="text-sm text-zinc-400">
                Expresses <span 
                  className="text-zinc-300 cursor-pointer hover:text-zinc-100 transition-colors"
                  onClick={(e) => { e.stopPropagation(); openCardInfo(trans.archetype); }}
                >{transArchetype?.name}</span>
              </div>
            </>
          )}
          {trans.type === "Agent" && (
            <>
              <div className="text-sm">
                <span className="text-zinc-300">{trans.role}</span>
                <span className="text-zinc-500"> of </span>
                <span 
                  className={`cursor-pointer hover:underline decoration-dotted ${CHANNEL_COLORS[trans.channel]}`}
                  onClick={(e) => { e.stopPropagation(); openChannelInfo(trans.channel); }}
                >{trans.channel}</span>
              </div>
              <div className="text-sm text-zinc-400">
                Embodies <span 
                  className="text-zinc-300 cursor-pointer hover:text-zinc-100 transition-colors"
                  onClick={(e) => { e.stopPropagation(); openCardInfo(trans.archetype); }}
                >{transArchetype?.name}</span>
              </div>
            </>
          )}
        </div>

        {correctionText && draw.status !== 1 && (
          <div className="relative z-10 border-t border-zinc-700/30 pt-3 mt-3">
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Rebalancer</div>
            <div className="text-sm text-zinc-300">
              → <span
                className={correctionTargetId !== null ? "cursor-pointer hover:text-zinc-100 transition-colors" : ""}
                onClick={(e) => { e.stopPropagation(); correctionTargetId !== null && openCardInfo(correctionTargetId); }}
              >{correctionText}</span>
            </div>
          </div>
        )}

        {isBalanced && growthTargetName && (
          <div className="relative z-10 border-t border-zinc-700/30 pt-3 mt-3">
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
              {isGestaltCard ? 'Self-Expression' : 'Growth Opportunity'}
            </div>
            <div className="text-sm text-zinc-300">
              → <span
                className={growthTargetId !== null ? "cursor-pointer hover:text-zinc-100 transition-colors" : ""}
                onClick={(e) => { e.stopPropagation(); growthTargetId !== null && openCardInfo(growthTargetId); }}
              >{growthTargetName}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Get current stance label for display
  const getCurrentStanceLabel = () => {
    const preset = Object.entries(DELIVERY_PRESETS).find(([_, p]) =>
      p.complexity === stance.complexity &&
      p.voice === stance.voice && p.focus === stance.focus &&
      p.density === stance.density && p.scope === stance.scope
    );
    const complexityLabel = COMPLEXITY_OPTIONS[stance.complexity]?.label || stance.complexity;
    if (preset) return `${complexityLabel} • ${preset[1].name}`;
    return `${complexityLabel} • Custom`;
  };

  // Get current delivery preset (if any)
  const getCurrentDeliveryPreset = () => {
    return Object.entries(DELIVERY_PRESETS).find(([_, p]) =>
      p.complexity === stance.complexity &&
      p.seriousness === stance.seriousness &&
      p.voice === stance.voice && p.focus === stance.focus &&
      p.density === stance.density && p.scope === stance.scope
    );
  };

  // Apply a delivery preset
  const applyDeliveryPreset = (presetKey) => {
    const preset = DELIVERY_PRESETS[presetKey];
    if (preset) {
      setStance({
        complexity: preset.complexity,
        seriousness: preset.seriousness,
        voice: preset.voice,
        focus: preset.focus,
        density: preset.density,
        scope: preset.scope
      });
    }
  };

  // Navigation helpers for spectrum labels
  const spreadKeys = Object.keys(RANDOM_SPREADS);
  const stanceKeys = Object.keys(DELIVERY_PRESETS);

  const navigateSpread = (direction) => {
    if (spreadType !== 'discover') return;
    const currentIndex = spreadKeys.indexOf(spreadKey);
    const newIndex = direction === 'left'
      ? Math.max(0, currentIndex - 1)
      : Math.min(spreadKeys.length - 1, currentIndex + 1);
    setSpreadKey(spreadKeys[newIndex]);
  };

  const navigateStance = (direction) => {
    const currentPreset = getCurrentDeliveryPreset();
    if (!currentPreset) return;
    const currentIndex = stanceKeys.indexOf(currentPreset[0]);
    const newIndex = direction === 'left'
      ? Math.max(0, currentIndex - 1)
      : Math.min(stanceKeys.length - 1, currentIndex + 1);
    applyDeliveryPreset(stanceKeys[newIndex]);
  };

  // Slugify text for filenames
  const slugify = (text) => {
    if (!text) return '';
    return text
      .toLowerCase()
      .replace(/[\u2018\u2019\u201C\u201D]/g, '')  // Remove smart quotes
      .replace(/[\u2014\u2013]/g, '-')             // Em/en dash to hyphen
      .replace(/[^\w\s-]/g, '')                    // Remove special chars
      .replace(/\s+/g, '-')                        // Spaces to hyphens
      .replace(/-+/g, '-')                         // Collapse multiple hyphens
      .replace(/^-+|-+$/g, '')                     // Trim leading/trailing hyphens
      .substring(0, 40)                            // Limit to 40 chars
      .replace(/-+$/g, '');                        // Trim trailing hyphens again after truncation
  };

  // Generate smart export filename
  const generateExportFilename = (extension) => {
    const date = new Date().toISOString().split('T')[0];
    let slug = '';

    // Priority 1: Question if >10 chars
    if (question && question.trim().length > 10) {
      slug = slugify(question.trim());
    }
    // Priority 2: Summary/overview
    else if (parsedReading?.summary && getSummaryContent(parsedReading.summary).trim().length > 10) {
      slug = slugify(getSummaryContent(parsedReading.summary).trim());
    }
    // Priority 3: Fallback
    else {
      slug = 'reading';
    }

    const modelName = selectedModel;
    return `nirmanakaya-${slug}-${date}-${modelName}.${extension}`;
  };

  // Export reading to markdown
  const exportToMarkdown = () => {
    if (!parsedReading || !draws) return;

    const isReflect = spreadType === 'reflect';
    const spreadName = isReflect
      ? REFLECT_SPREADS[reflectSpreadKey]?.name
      : `${RANDOM_SPREADS[spreadKey]?.name} Emergent`;
    const spreadConfig = isReflect ? REFLECT_SPREADS[reflectSpreadKey] : null;

    let md = `# Nirmanakaya Reading\n\n`;
    md += `**Date:** ${new Date().toLocaleDateString()}\n\n`;
    md += `## Question\n\n${question}\n\n`;
    md += `**Spread:** ${spreadName}  \n`;
    md += `**Stance:** ${getCurrentStanceLabel()}\n\n`;
    md += `---\n\n`;

    // Summary
    if (parsedReading.summary) {
      md += `## Summary\n\n${getSummaryContent(parsedReading.summary)}\n\n`;
    }

    // Cards with rebalancers (new structure)
    md += `## Signatures\n\n`;
    parsedReading.cards.forEach((card) => {
      const draw = draws[card.index];
      const trans = getComponent(draw.transient);
      const stat = STATUSES[draw.status];
      // New structure: rebalancer is nested in card
      const rebalancer = card.rebalancer;

      // V1: Always use archetype position name
      const context = ARCHETYPES[draw.position]?.name || `Position ${card.index + 1}`;
      const statusPhrase = stat.prefix ? `${stat.prefix} ${trans.name}` : `Balanced ${trans.name}`;

      md += `### Signature ${card.index + 1} — ${context}\n\n`;
      md += `**${statusPhrase}** (${trans.traditional})  \n`;
      md += `*Status: ${stat.name}*\n\n`;

      // Architecture details
      if (trans.type === 'Archetype') {
        md += `> **House:** ${trans.house}`;
        if (trans.channel) md += ` | **Channel:** ${trans.channel}`;
        md += `\n\n`;
      } else if (trans.type === 'Bound') {
        const assocArchetype = ARCHETYPES[trans.archetype];
        md += `> **Channel:** ${trans.channel} | **Associated Archetype:** ${assocArchetype?.name} (${assocArchetype?.traditional})\n\n`;
      } else if (trans.type === 'Agent') {
        const assocArchetype = ARCHETYPES[trans.archetype];
        md += `> **Role:** ${trans.role} | **Channel:** ${trans.channel} | **Associated Archetype:** ${assocArchetype?.name} (${assocArchetype?.traditional})\n\n`;
      }

      // New structure: use deep (richest) content with full fallback chain
      const cardContent = card.deep || card.swim || card.wade || card.surface || card.content || '';
      md += `${cardContent}\n\n`;

      if (rebalancer) {
        const fullCorr = getFullCorrection(draw.transient, draw.status);
        const corrText = getCorrectionText(fullCorr, trans, draw.status);
        md += `#### Rebalancer: ${corrText || 'See below'}\n\n`;
        const rebalancerContent = rebalancer.deep || rebalancer.swim || rebalancer.wade || rebalancer.surface || '';
        md += `${rebalancerContent}\n\n`;
      }

      // Growth Opportunity (for balanced cards)
      if (card.growth) {
        const fullCorr = getFullCorrection(draw.transient, draw.status);
        const corrText = getCorrectionText(fullCorr, trans, draw.status);
        md += `#### Growth Opportunity: ${corrText || 'See below'}\n\n`;
        const growthContent = card.growth.deep || card.growth.swim || card.growth.wade || '';
        md += `${growthContent}\n\n`;
      }

      // Mirror and Words to the Whys
      if (card.mirror) {
        md += `#### The Mirror\n\n${card.mirror}\n\n`;
      }
      const whyContent = card.why?.deep || card.why?.swim || card.why?.wade || card.why?.surface;
      if (whyContent) {
        md += `#### Words to the Whys\n\n${whyContent}\n\n`;
      }

      // Card expansions (Unpack, Clarify, Example, Architecture — excludes context which is array)
      const cardExpansions = expansions[`card-${card.index}`] || {};
      Object.entries(cardExpansions).filter(([k]) => k !== 'context').forEach(([expType, content]) => {
        if (content) {
          const label = EXPANSION_PROMPTS[expType]?.label || expType;
          md += `#### ${label}\n\n${content}\n\n`;
        }
      });
      // Context conversations
      const cardContext = cardExpansions.context;
      if (cardContext && Array.isArray(cardContext) && cardContext.length > 0) {
        md += `#### Context\n\n`;
        cardContext.forEach(turn => {
          md += turn.role === 'user' ? `> *"${turn.content}"*\n\n` : `${turn.content}\n\n`;
        });
      }
    });

    // Path to Balance (new structure with depths - use deep first)
    const pathContent = parsedReading.path?.deep || parsedReading.path?.swim || parsedReading.path?.wade || parsedReading.path?.surface || parsedReading.rebalancerSummary;
    if (pathContent) {
      md += `---\n\n## ◈ Path to Balance\n\n${pathContent}\n\n`;
      if (parsedReading.path?.architecture) {
        md += `### Architecture\n\n${parsedReading.path.architecture}\n\n`;
      }
    }

    // Full Architecture (global reading architecture)
    if (parsedReading.fullArchitecture) {
      md += `---\n\n## ⚙ Full Architecture\n\n${parsedReading.fullArchitecture}\n\n`;
    }

    // Letter (new structure with depths, now includes deep)
    const letterContent = parsedReading.letter?.deep || parsedReading.letter?.swim || parsedReading.letter?.wade || parsedReading.letter?.surface || (typeof parsedReading.letter === 'string' ? parsedReading.letter : null);
    if (letterContent) {
      md += `---\n\n## Letter\n\n${letterContent}\n\n`;
      // Letter expansions
      const letterExpansions = expansions['letter'] || {};
      Object.entries(letterExpansions).filter(([k]) => k !== 'context').forEach(([expType, content]) => {
        if (content && typeof content === 'string') {
          const label = EXPANSION_PROMPTS[expType]?.label || expType;
          md += `### ${label}\n\n${content}\n\n`;
        }
      });
    }

    // Summary expansions
    const summaryExpansions = expansions['summary'] || {};
    if (Object.keys(summaryExpansions).length > 0) {
      Object.entries(summaryExpansions).filter(([k]) => k !== 'context').forEach(([expType, content]) => {
        if (content && typeof content === 'string') {
          const label = EXPANSION_PROMPTS[expType]?.label || expType;
          md += `### Overview ${label}\n\n${content}\n\n`;
        }
      });
    }

    md += `---\n\n*Generated by Nirmanakaya The Soul Search Engine*\n`;

    // Download
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = generateExportFilename('md');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export reading to HTML
  const exportToHTML = () => {
    if (!parsedReading || !draws) return;

    const isReflect = spreadType === 'reflect';
    const isExplore = spreadType === 'explore';
    const spreadName = isReflect
      ? `Reflect • ${REFLECT_SPREADS[reflectSpreadKey]?.name}`
      : isExplore
        ? `Explore • ${dtpTokens?.length || 0} token${(dtpTokens?.length || 0) !== 1 ? 's' : ''}`
        : `Discover • ${RANDOM_SPREADS[spreadKey]?.name}`;
    const spreadConfig = isReflect ? REFLECT_SPREADS[reflectSpreadKey] : null;

    const escapeHtml = (text) => text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/\n/g, '<br>');

    // Render thread items recursively (defined outside loop for reuse)
    const renderThreadItem = (item, depth = 0) => {
      const itemTrans = getComponent(item.draw.transient);
      const itemStat = STATUSES[item.draw.status];
      const itemStatusPrefix = itemStat.prefix || 'Balanced';
      const opLabel = item.operation === 'reflect' ? 'Reflecting' : 'Forging';
      const opClass = item.operation === 'reflect' ? 'thread-reflect' : 'thread-forge';

      let childrenHtml = '';
      if (item.children && item.children.length > 0) {
        childrenHtml = item.children.map(child => renderThreadItem(child, depth + 1)).join('');
      }

      return `
        <div class="thread-item ${opClass}">
          <div class="thread-label">↳ ${opLabel}${item.context ? `: "${escapeHtml(item.context)}"` : ''}</div>
          <div class="thread-card">
            <div class="thread-header">
              <span class="signature-status status-${itemStat.name.toLowerCase().replace(' ', '-')}">${itemStat.name}</span>
              <span class="thread-name">${itemStatusPrefix} ${itemTrans.name}</span>
            </div>
            <div class="thread-content">${escapeHtml(item.interpretation)}</div>
          </div>
          ${childrenHtml}
        </div>`;
    };

    // Helper to render threads for a section
    const renderSectionThreads = (key) => {
      const threads = threadData[key] || [];
      if (threads.length === 0) return '';
      return `<div class="threads">${threads.map(t => renderThreadItem(t)).join('')}</div>`;
    };

    let signaturesHtml = '';
    parsedReading.cards.forEach((card) => {
      const draw = draws[card.index];
      const trans = getComponent(draw.transient);
      const stat = STATUSES[draw.status];
      // New structure: rebalancer is nested in card
      const rebalancer = card.rebalancer;
      // V1: Always use archetype position name
      const context = ARCHETYPES[draw.position]?.name || `Position ${card.index + 1}`;
      const statusPhrase = stat.prefix ? `${stat.prefix} ${trans.name}` : `Balanced ${trans.name}`;

      let archDetails = '';
      if (trans.type === 'Archetype') {
        archDetails = `<div class="arch-details">House: ${trans.house}${trans.channel ? ` • Channel: ${trans.channel}` : ''}</div>`;
      } else if (trans.type === 'Bound') {
        const assoc = ARCHETYPES[trans.archetype];
        archDetails = `<div class="arch-details">Channel: ${trans.channel} • Associated: ${assoc?.name}</div>`;
      } else if (trans.type === 'Agent') {
        const assoc = ARCHETYPES[trans.archetype];
        archDetails = `<div class="arch-details">Role: ${trans.role} • Channel: ${trans.channel} • Associated: ${assoc?.name}</div>`;
      }

      let rebalancerHtml = '';
      if (rebalancer) {
        const fullCorr = getFullCorrection(draw.transient, draw.status);
        const corrText = getCorrectionText(fullCorr, trans, draw.status);
        const rebalancerContent = rebalancer.deep || rebalancer.swim || rebalancer.wade || rebalancer.surface || '';
        rebalancerHtml = `
          <div class="rebalancer">
            <span class="rebalancer-badge">Rebalancer</span>
            <div class="rebalancer-header">${trans.name} → ${corrText || ''}</div>
            <div class="rebalancer-content">${escapeHtml(rebalancerContent)}</div>
          </div>`;
      }

      // Growth Opportunity section (for balanced cards)
      let growthHtml = '';
      if (card.growth) {
        const fullCorr = getFullCorrection(draw.transient, draw.status);
        const corrText = getCorrectionText(fullCorr, trans, draw.status);
        const growthContent = card.growth.deep || card.growth.swim || card.growth.wade || '';
        growthHtml = `
          <div class="growth-opportunity" style="border-color: rgba(20, 184, 166, 0.4); background: rgba(17, 94, 89, 0.2);">
            <span class="growth-badge" style="background: rgba(20, 184, 166, 0.3); color: rgb(94, 234, 212);">Growth</span>
            <div class="growth-header" style="color: rgb(94, 234, 212);">${trans.name} → ${corrText || ''}</div>
            <div class="growth-content">${escapeHtml(growthContent)}</div>
          </div>`;
      }

      // The Why section (Mirror + Words to the Whys)
      let whyHtml = '';
      if (card.mirror || card.why) {
        const mirrorContent = card.mirror ? `<div class="mirror-content">${escapeHtml(card.mirror)}</div>` : '';
        // WHY already has deep as first fallback
        const whyContent = card.why?.deep || card.why?.swim || card.why?.wade || card.why?.surface;
        const wordsContent = whyContent ? `<div class="why-content"><span class="why-label">Words to the Whys</span>${escapeHtml(whyContent)}</div>` : '';
        if (mirrorContent || wordsContent) {
          whyHtml = `
            <div class="the-why">
              <span class="why-badge">The Why</span>
              ${mirrorContent}
              ${wordsContent}
            </div>`;
        }
      }

      const threadsHtml = renderSectionThreads(card.index);
      // Export uses deep (richest) content with fallback chain
      const cardContent = card.deep || card.swim || card.wade || card.surface || card.content || '';

      // Card expansions (Unpack, Clarify, Example, Architecture)
      const cardExpansions = expansions[`card-${card.index}`] || {};
      let expansionsHtml = '';
      Object.entries(cardExpansions).filter(([k]) => k !== 'context').forEach(([expType, content]) => {
        if (content && typeof content === 'string') {
          const label = EXPANSION_PROMPTS[expType]?.label || expType;
          expansionsHtml += `
            <div class="expansion">
              <span class="expansion-badge">${label}</span>
              <div class="expansion-content">${escapeHtml(content)}</div>
            </div>`;
        }
      });
      // Context conversations
      const cardContextHtml = cardExpansions.context;
      if (cardContextHtml && Array.isArray(cardContextHtml) && cardContextHtml.length > 0) {
        expansionsHtml += `<div class="expansion"><span class="expansion-badge">Context</span><div class="expansion-content">`;
        cardContextHtml.forEach(turn => {
          expansionsHtml += turn.role === 'user'
            ? `<p style="color:#fbbf24;font-style:italic">&ldquo;${escapeHtml(turn.content)}&rdquo;</p>`
            : `<p>${escapeHtml(turn.content)}</p>`;
        });
        expansionsHtml += `</div></div>`;
      }

      // Only render signature-content div if there's actual content
      const signatureContentHtml = cardContent.trim()
        ? `<div class="signature-content">${escapeHtml(cardContent)}</div>`
        : '';

      signaturesHtml += `
        <div class="signature">
          <div class="signature-header">
            <div>
              <span class="signature-badge">Reading</span>
              <span class="signature-title">Signature ${card.index + 1} — ${context}</span>
            </div>
            <span class="signature-status status-${stat.name.toLowerCase().replace(' ', '-')}">${stat.name}</span>
          </div>
          <div class="signature-name">${statusPhrase}</div>
          ${archDetails}
          ${signatureContentHtml}
          ${expansionsHtml}
          ${rebalancerHtml}
          ${growthHtml}
          ${whyHtml}
          ${threadsHtml}
        </div>`;
    });

    // Build letter expansions HTML
    const letterExpansions = expansions['letter'] || {};
    let letterExpansionsHtml = '';
    Object.entries(letterExpansions).filter(([k]) => k !== 'context').forEach(([expType, content]) => {
      if (content && typeof content === 'string') {
        const label = EXPANSION_PROMPTS[expType]?.label || expType;
        letterExpansionsHtml += `
          <div class="expansion" style="margin-left: 0;">
            <span class="expansion-badge">${label}</span>
            <div class="expansion-content">${escapeHtml(content)}</div>
          </div>`;
      }
    });

    // Build summary expansions HTML
    const summaryExpansions = expansions['summary'] || {};
    let summaryExpansionsHtml = '';
    Object.entries(summaryExpansions).filter(([k]) => k !== 'context').forEach(([expType, content]) => {
      if (content && typeof content === 'string') {
        const label = EXPANSION_PROMPTS[expType]?.label || expType;
        summaryExpansionsHtml += `
          <div class="expansion" style="margin-left: 0;">
            <span class="expansion-badge">${label}</span>
            <div class="expansion-content">${escapeHtml(content)}</div>
          </div>`;
      }
    });

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nirmanakaya Reading - ${new Date().toLocaleDateString()}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #18181b; color: #e4e4e7; font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; padding: 2rem; max-width: 800px; margin: 0 auto; }
    h1 { font-weight: 200; letter-spacing: 0.2em; text-align: center; margin-bottom: 0.5rem; color: #fafafa; }
    .subtitle { text-align: center; color: #52525b; font-size: 0.75rem; margin-bottom: 2rem; }
    .meta { text-align: center; color: #71717a; font-size: 0.875rem; margin-bottom: 2rem; }
    .question-box { background: #27272a; border-radius: 0.75rem; padding: 1.5rem; margin-bottom: 2rem; }
    .question-label { color: #71717a; font-size: 0.625rem; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.5rem; }
    .question-text { color: #d4d4d8; }
    .section { margin-bottom: 2rem; }
    .section-title { color: #71717a; font-size: 0.625rem; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 1rem; border-bottom: 1px solid #3f3f46; padding-bottom: 0.5rem; }
    .summary-box { background: linear-gradient(to bottom right, rgba(69, 26, 3, 0.4), rgba(120, 53, 15, 0.2)); border: 2px solid rgba(245, 158, 11, 0.5); border-radius: 0.75rem; padding: 1.25rem; margin-bottom: 1rem; }
    .summary-badge { display: inline-block; background: rgba(245, 158, 11, 0.3); color: #f59e0b; font-size: 0.75rem; padding: 0.25rem 0.75rem; border-radius: 1rem; margin-bottom: 0.75rem; }
    .summary { color: #fef3c7; }
    .signature { background: rgba(8, 51, 68, 0.3); border-radius: 0.75rem; padding: 1.25rem; margin-bottom: 1rem; border: 2px solid rgba(6, 182, 212, 0.5); }
    .signature-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
    .signature-badge { display: inline-block; background: rgba(8, 51, 68, 0.5); color: #22d3ee; font-size: 0.625rem; padding: 0.2rem 0.5rem; border-radius: 1rem; margin-right: 0.5rem; vertical-align: middle; }
    .signature-title { color: #fafafa; font-weight: 500; }
    .signature-status { font-size: 0.75rem; padding: 0.25rem 0.75rem; border-radius: 1rem; }
    .status-balanced { background: rgba(16, 185, 129, 0.2); color: #34d399; }
    .status-too-much { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
    .status-too-little { background: rgba(14, 165, 233, 0.2); color: #38bdf8; }
    .status-unacknowledged { background: rgba(139, 92, 246, 0.2); color: #a78bfa; }
    .signature-name { color: #22d3ee; margin-bottom: 0.5rem; }
    .traditional { color: #71717a; }
    .arch-details { color: #a1a1aa; font-size: 0.75rem; margin-bottom: 0.75rem; padding: 0.5rem; background: rgba(39, 39, 42, 0.5); border-radius: 0.5rem; }
    .signature-content { color: #d4d4d8; font-size: 0.875rem; line-height: 1.6; }
    .rebalancer { margin-top: 1rem; padding: 1rem; background: rgba(2, 44, 34, 0.3); border: 2px solid rgba(16, 185, 129, 0.5); border-radius: 0.5rem; margin-left: 1rem; }
    .rebalancer-badge { display: inline-block; background: rgba(16, 185, 129, 0.3); color: #6ee7b7; font-size: 0.625rem; padding: 0.2rem 0.5rem; border-radius: 1rem; margin-bottom: 0.5rem; }
    .rebalancer-header { color: #34d399; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.5rem; }
    .rebalancer-content { color: #a7f3d0; font-size: 0.875rem; line-height: 1.6; }
    .path-box { background: linear-gradient(to bottom right, rgba(6, 78, 59, 0.3), rgba(16, 185, 129, 0.15)); border: 2px solid rgba(16, 185, 129, 0.6); border-radius: 0.75rem; padding: 1.5rem; }
    .path-badge { display: inline-block; color: #34d399; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.75rem; letter-spacing: 0.05em; }
    .path-content { color: #d4d4d8; line-height: 1.6; white-space: pre-wrap; }
    .letter-box { background: rgba(46, 16, 101, 0.3); border: 2px solid rgba(139, 92, 246, 0.5); border-radius: 0.75rem; padding: 1.5rem; }
    .letter-badge { display: inline-block; background: rgba(139, 92, 246, 0.3); color: #c4b5fd; font-size: 0.75rem; padding: 0.25rem 0.75rem; border-radius: 1rem; margin-bottom: 0.75rem; }
    .letter { color: #ddd6fe; font-style: italic; line-height: 1.6; }
    .footer { text-align: center; color: #3f3f46; font-size: 0.625rem; margin-top: 3rem; letter-spacing: 0.1em; }
    .threads { margin-top: 1rem; }
    .thread-item { margin-left: 1rem; border-left: 2px solid #3f3f46; padding-left: 1rem; margin-top: 0.75rem; }
    .thread-label { font-size: 0.75rem; margin-bottom: 0.5rem; }
    .thread-reflect .thread-label { color: #38bdf8; }
    .thread-forge .thread-label { color: #fb923c; }
    .thread-card { padding: 1rem; border-radius: 0.5rem; }
    .thread-reflect .thread-card { background: rgba(14, 165, 233, 0.1); border: 1px solid rgba(14, 165, 233, 0.3); }
    .thread-forge .thread-card { background: rgba(249, 115, 22, 0.1); border: 1px solid rgba(249, 115, 22, 0.3); }
    .thread-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
    .thread-name { color: #e4e4e7; font-weight: 500; }
    .thread-content { color: #d4d4d8; font-size: 0.875rem; line-height: 1.6; white-space: pre-wrap; }
    .the-why { margin-top: 1rem; padding: 1rem; background: rgba(8, 51, 68, 0.3); border: 2px solid rgba(6, 182, 212, 0.4); border-radius: 0.5rem; margin-left: 1rem; }
    .why-badge { display: inline-block; background: rgba(6, 182, 212, 0.3); color: #67e8f9; font-size: 0.625rem; padding: 0.2rem 0.5rem; border-radius: 1rem; margin-bottom: 0.75rem; }
    .mirror-content { color: #a5f3fc; font-style: italic; font-size: 0.875rem; line-height: 1.6; margin-bottom: 0.75rem; padding-bottom: 0.75rem; border-bottom: 1px solid rgba(6, 182, 212, 0.3); }
    .why-label { display: block; font-size: 0.625rem; text-transform: uppercase; letter-spacing: 0.1em; color: #22d3ee; margin-bottom: 0.5rem; }
    .why-content { color: #cffafe; font-size: 0.875rem; line-height: 1.6; }
    .expansion { margin-top: 1rem; padding: 1rem; background: rgba(63, 63, 70, 0.3); border: 1px solid rgba(113, 113, 122, 0.4); border-radius: 0.5rem; margin-left: 1rem; }
    .expansion-badge { display: inline-block; background: rgba(113, 113, 122, 0.3); color: #a1a1aa; font-size: 0.625rem; padding: 0.2rem 0.5rem; border-radius: 1rem; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em; }
    .expansion-content { color: #d4d4d8; font-size: 0.875rem; line-height: 1.6; white-space: pre-wrap; }
  </style>
</head>
<body>
  <h1>NIRMANAKAYA</h1>
  <p class="subtitle">The Soul Search Engine</p>
  <p class="meta">${spreadName} • ${getCurrentStanceLabel()} • ${new Date().toLocaleDateString()}</p>

  <div class="question-box">
    <div class="question-label">Your Question or Intention</div>
    <div class="question-text">${escapeHtml(question || 'General reading')}</div>
  </div>

  ${parsedReading.summary ? `
  <div class="section">
    <div class="summary-box">
      <span class="summary-badge">Overview</span>
      <div class="summary">${escapeHtml(getSummaryContent(parsedReading.summary))}</div>
      ${summaryExpansionsHtml}
      ${renderSectionThreads('summary')}
    </div>
  </div>` : ''}

  <div class="section">
    <div class="section-title">Signatures</div>
    ${signaturesHtml}
  </div>

  ${(parsedReading.path?.deep || parsedReading.path?.swim || parsedReading.path?.wade || parsedReading.path?.surface || parsedReading.rebalancerSummary) ? `
  <div class="section">
    <div class="path-box">
      <span class="path-badge">◈ Path to Balance</span>
      <div class="path-content">${escapeHtml(parsedReading.path?.deep || parsedReading.path?.swim || parsedReading.path?.wade || parsedReading.path?.surface || parsedReading.rebalancerSummary)}</div>
      ${renderSectionThreads('path')}
    </div>
  </div>` : ''}

  ${parsedReading.fullArchitecture ? `
  <div class="section">
    <div style="background: linear-gradient(to bottom right, rgba(76, 29, 149, 0.2), rgba(139, 92, 246, 0.1)); border: 2px solid rgba(139, 92, 246, 0.4); border-radius: 0.75rem; padding: 1.25rem;">
      <span style="display: inline-block; color: #a78bfa; font-size: 0.875rem; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.75rem;">⚙ Full Architecture</span>
      <div style="color: #d4d4d8; font-size: 0.875rem; font-family: monospace; white-space: pre-wrap; line-height: 1.6;">${escapeHtml(parsedReading.fullArchitecture)}</div>
    </div>
  </div>` : ''}

  ${(parsedReading.letter?.deep || parsedReading.letter?.swim || parsedReading.letter?.wade || parsedReading.letter?.surface || (typeof parsedReading.letter === 'string' && parsedReading.letter)) ? `
  <div class="section">
    <div class="letter-box">
      <span class="letter-badge">Letter</span>
      <div class="letter">${escapeHtml(parsedReading.letter?.deep || parsedReading.letter?.swim || parsedReading.letter?.wade || parsedReading.letter?.surface || (typeof parsedReading.letter === 'string' ? parsedReading.letter : ''))}</div>
      ${letterExpansionsHtml}
      ${renderSectionThreads('letter')}
    </div>
  </div>` : ''}

  ${followUpMessages.length > 0 ? `
  <div class="section">
    <div class="section-title">Follow-up Conversation</div>
    <div class="question-box">
      ${followUpMessages.map(msg => `
        <div style="margin-bottom: 1rem; ${msg.role === 'user' ? 'padding-left: 1rem; border-left: 2px solid #f59e0b;' : ''}">
          <div style="font-size: 0.625rem; color: #71717a; margin-bottom: 0.25rem;">${msg.role === 'user' ? 'You' : 'Reader'}</div>
          <div style="color: ${msg.role === 'user' ? '#fbbf24' : '#d4d4d8'};">${escapeHtml(msg.content)}</div>
        </div>
      `).join('')}
    </div>
  </div>` : ''}

  ${showTokenUsage && tokenUsage ? `
  <div class="section">
    <div style="text-align: center; color: #52525b; font-size: 0.75rem;">
      Tokens: ${tokenUsage.input_tokens?.toLocaleString()} in / ${tokenUsage.output_tokens?.toLocaleString()} out •
      Cost: $${((tokenUsage.input_tokens * getModelPricing(selectedModel).input / 1000000) + (tokenUsage.output_tokens * getModelPricing(selectedModel).output / 1000000)).toFixed(4)}
    </div>
  </div>` : ''}

  <p class="footer">Generated by Nirmanakaya • ${getModelLabel(selectedModel).split(' ')[0]}</p>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = generateExportFilename('html');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle clicks on main wrapper - exit help mode if click is not on a help element
  const handleMainClick = (e) => {
    if (!helpMode) return;
    // Check if click was on an element with data-help attribute
    const helpElement = e.target.closest('[data-help]');
    if (!helpElement) {
      // Clicked on non-help element - exit help mode
      exitHelpMode();
    }
  };

  return (
    <div
      className={`flex flex-col min-h-screen ${theme === 'light' ? 'bg-stone-200 text-stone-900' : 'bg-zinc-950 text-zinc-100'} ${helpMode ? 'cursor-help' : ''}`}
      data-theme={theme}
      onClick={handleMainClick}
    >
      {/* Background - Video or Image */}
      {backgroundType === 'video' && videoBackgrounds[selectedVideo]?.src && (
        <video
          key={videoBackgrounds[selectedVideo].id}
          autoPlay
          loop
          muted
          playsInline
          ref={(el) => { if (el) el.playbackRate = 1.0; }}
          className="fixed inset-0 w-full h-full object-cover z-0"
          style={{ pointerEvents: "none", opacity: backgroundOpacity / 100 }}
        >
          <source src={videoBackgrounds[selectedVideo].src} type="video/mp4" />
        </video>
      )}
      {backgroundType === 'image' && imageBackgrounds[selectedImage]?.src && (
        <div
          key={imageBackgrounds[selectedImage].id}
          className="fixed inset-0 w-full h-full z-0"
          style={{
            backgroundImage: `url(${imageBackgrounds[selectedImage].src})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            pointerEvents: "none",
            opacity: backgroundOpacity / 100
          }}
        />
      )}

      {/* Main content overlay - flex-1 fills available space, pushing footer to bottom */}
      <div className="relative z-10 flex-1 flex flex-col w-full" style={{ '--content-dim': contentDim / 100 }}>
      <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 pt-2 sm:pt-3 pb-4 sm:pb-8 mobile-container flex-1">
        
        {/* Floating Controls - only show when logged in */}
        {currentUser && (
          <>
            {/* Right column - top right */}
            <div className="fixed top-3 right-3 z-50 flex flex-col items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <AuthButton onAuthChange={setCurrentUser} buttonClassName="w-8 h-8 flex items-center justify-center text-purple-400 hover:text-purple-300 transition-colors rounded-lg bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/50 backdrop-blur-sm" />
              <TextSizeSlider />
            </div>
            {/* Background controls toggle button - top left */}
            <div className="fixed top-3 left-3 z-50 flex flex-col items-center gap-1">
              <button
                data-help="bg-toggle"
                onClick={(e) => { if (!handleHelpClick('bg-toggle', e)) setShowBgControls(!showBgControls); }}
                className="w-8 h-8 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/50 backdrop-blur-sm text-zinc-400 hover:text-zinc-200 text-xs font-medium flex items-center justify-center transition-all"
                title={showBgControls ? "Hide background controls" : "Show background controls"}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
              <a
                href="mailto:chriscrilly@gmail.com?subject=Nirmanakaya Feedback"
                className="w-8 h-8 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/50 backdrop-blur-sm text-zinc-400 hover:text-amber-400 text-xs font-medium flex items-center justify-center transition-all"
                title="Send feedback"
              >
                ✉
              </a>
              {/* Collective Pulse - only visible when enabled */}
              {featureFlags.pulse_enabled && (
                <a
                  href="/pulse"
                  className={`w-8 h-8 rounded-lg border backdrop-blur-sm text-xs font-medium flex items-center justify-center transition-all relative ${
                    pulseUnseen
                      ? 'bg-orange-500/20 border-orange-500/50 text-orange-400 hover:bg-orange-500/30'
                      : 'bg-zinc-900/80 border-zinc-700/50 text-zinc-400 hover:bg-zinc-800 hover:text-orange-400'
                  }`}
                  title="Collective Pulse"
                >
                  <svg className={`w-4 h-4 ${pulseUnseen ? 'animate-pulse' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {pulseUnseen && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-500 rounded-full animate-ping" />
                  )}
                  {pulseUnseen && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-500 rounded-full" />
                  )}
                </a>
              )}
            </div>

            {/* Floating Background Controls Panel */}
            {showBgControls && (
              <>
              {/* Click-outside backdrop to close panel */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowBgControls(false)}
              />
              <div
                data-help="bg-controls"
                onClick={(e) => { e.stopPropagation(); handleHelpClick('bg-controls', e); }}
                className="fixed top-14 left-3 z-50 w-72 bg-zinc-900/95 border border-zinc-700/50 rounded-xl shadow-2xl backdrop-blur-sm"
              >
                <div className="p-4 border-b border-zinc-800/50">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-zinc-200">Background</h3>
                    <button onClick={() => setShowBgControls(false)} className="text-zinc-500 hover:text-zinc-300">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="p-4 space-y-4">
                  {/* Type Toggle */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setBackgroundType('video')}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        backgroundType === 'video'
                          ? 'bg-amber-600/20 text-amber-400 border border-amber-600/30'
                          : 'bg-zinc-800/50 text-zinc-400 border border-transparent hover:bg-zinc-800'
                      }`}
                    >
                      Video
                    </button>
                    <button
                      onClick={() => setBackgroundType('image')}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        backgroundType === 'image'
                          ? 'bg-amber-600/20 text-amber-400 border border-amber-600/30'
                          : 'bg-zinc-800/50 text-zinc-400 border border-transparent hover:bg-zinc-800'
                      }`}
                    >
                      Image
                    </button>
                  </div>

                  {/* Background Navigation */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => nudgeBackground(-1)}
                      className="p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <span className="text-sm text-zinc-300">{getCurrentBackground().label}</span>
                    <button
                      onClick={() => nudgeBackground(1)}
                      className="p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>

                  {/* Background Opacity */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-zinc-500">Brightness</span>
                      <span className="text-xs text-zinc-400">{backgroundOpacity}%</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="60"
                      value={backgroundOpacity}
                      onChange={(e) => setBackgroundOpacity(Number(e.target.value))}
                      className="w-full h-1 bg-zinc-700 rounded-full appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>

                  {/* Content Dimming */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-zinc-500">Content Dim</span>
                      <span className="text-xs text-zinc-400">{contentDim}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={contentDim}
                      onChange={(e) => setContentDim(Number(e.target.value))}
                      className="w-full h-1 bg-zinc-700 rounded-full appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>

                  {/* Bottom row: Theme toggle + Card images toggle */}
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800/50">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500">Theme</span>
                      <button
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        className="p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
                        title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
                      >
                        {theme === 'dark' ? (
                          <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500">Signatures</span>
                      <button
                        onClick={() => setShowCardImages(!showCardImages)}
                        className={`p-2 rounded-lg transition-colors ${
                          showCardImages
                            ? 'bg-emerald-600/20 text-emerald-400'
                            : 'bg-zinc-800/50 text-zinc-500 hover:text-zinc-300'
                        }`}
                        title={showCardImages ? 'Hide card artwork' : 'Show card artwork'}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              </>
            )}
          </>
        )}

        {/* Global Header Nav */}
        {currentUser && <Header hasActivity={communityActivity} />}

        {/* Title - click to scroll to top (hidden on cosmic landing) */}
        {currentUser && (
        <div
          className="text-center mb-2 md:mb-3 mobile-header relative cursor-pointer"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <h1 className={`text-[1.25rem] sm:text-2xl md:text-3xl font-extralight tracking-[0.2em] sm:tracking-[0.3em] mb-1 ${(glistenerPhase === 'loading' || glistenerPhase === 'streaming') ? 'glisten-active' : ''}`}>
            <span className="rainbow-letter rainbow-letter-0">N</span>
            <span className="rainbow-letter rainbow-letter-1">I</span>
            <span className="rainbow-letter rainbow-letter-2">R</span>
            <span className="rainbow-letter rainbow-letter-3">M</span>
            <span className="rainbow-letter rainbow-letter-4">A</span>
            <span className="rainbow-letter rainbow-letter-5">N</span>
            <span className="rainbow-letter rainbow-letter-6">A</span>
            <span className="rainbow-letter rainbow-letter-7">K</span>
            <span className="rainbow-letter rainbow-letter-8">A</span>
            <span className="rainbow-letter rainbow-letter-9">Y</span>
            <span className="rainbow-letter rainbow-letter-10">A</span>
          </h1>
          <p className="font-mono text-zinc-400/60 text-xs sm:text-sm tracking-[0.2em] uppercase">
            {userLevel === USER_LEVELS.FIRST_CONTACT ? 'Pattern Reader' : (
              <>
                {'The Soul Search Engine'.split('').map((char, i, arr) => {
                  // RTL: last letter (21) shimmers first with most negative delay
                  // LTR: first letter (0) shimmers first with most negative delay
                  const delay = shimmerLTR
                    ? -(i * 0.1 + 0.1)  // LTR: 0 = -0.1s, 21 = -2.2s
                    : -((arr.length - 1 - i) * 0.1 + 0.1);  // RTL: 21 = -0.1s, 0 = -2.2s
                  return (
                    <span
                      key={`${i}-${shimmerLTR}`}
                      className="shimmer-letter"
                      style={{ animationDelay: `${delay}s` }}
                    >
                      {char === ' ' ? '\u00A0' : char}
                    </span>
                  );
                })}
              </>
            )}
          </p>
          {helpPopover === 'intro' && (
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 w-80 sm:w-96">
              <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 shadow-xl">
                <p className="text-zinc-300 text-sm leading-relaxed">
                  The Nirmanakaya is both mirror and forge. Bring a question or declare an intention —
                  the draw finds what's ready to be seen. Where you are, what's moving, what might need attention.
                </p>
                <button onClick={() => setHelpPopover(null)} className="mt-3 text-xs text-zinc-500 hover:text-zinc-300 w-full text-center">Got it</button>
              </div>
            </div>
          )}
        </div>
        )}

        {/* Controls */}
        {!draws && (
          <>
            {/* Auth Gate - Cosmic Landing */}
            {!currentUser ? (
              <div className="fixed inset-0 z-40 flex items-center justify-center">
                {/* Galaxy video background - fullscreen */}
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover opacity-70"
                >
                  <source src="/galaxy.mp4" type="video/mp4" />
                </video>

                {/* Subtle vignette overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/20 via-transparent to-zinc-950/60" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />

                {/* Content */}
                <div className="relative z-10 max-w-2xl mx-auto text-center py-16 px-4">
                  {/* Cosmic tagline - staggered fade in/out (4 lines, 14s cycle) */}
                  <div className="mb-3 h-10 relative">
                    <p className="absolute inset-0 text-zinc-100 text-xl sm:text-2xl font-light tracking-wide animate-tagline-fade-4" style={{ animationDelay: '0s' }}>
                      You are a creator
                    </p>
                    <p className="absolute inset-0 text-zinc-100 text-xl sm:text-2xl font-light tracking-wide animate-tagline-fade-4" style={{ animationDelay: '3.5s' }}>
                      Within The Creator
                    </p>
                    <p className="absolute inset-0 text-zinc-100 text-xl sm:text-2xl font-light tracking-wide animate-tagline-fade-4" style={{ animationDelay: '7s' }}>
                      Expanding Creation
                    </p>
                    <p className="absolute inset-0 text-zinc-100 text-xl sm:text-2xl font-light tracking-wide animate-tagline-fade-4-hold" style={{ animationDelay: '10.5s' }}>
                      Consciousness is Primary
                    </p>
                  </div>

                  {/* Title with rainbow cycling animation - 1s per letter variance */}
                  <h1 className="text-5xl sm:text-6xl font-extralight tracking-widest mb-1 drop-shadow-lg">
                    {'NIRMANAKAYA'.split('').map((letter, i) => (
                      <span
                        key={i}
                        className="rainbow-letter"
                        style={{
                          animationDelay: `${-i}s`,
                          textShadow: '0 0 25px currentColor'
                        }}
                      >
                        {letter}
                      </span>
                    ))}
                  </h1>
                  <p className="text-black/70 text-[0.625rem] sm:text-[0.8rem] tracking-widest uppercase mb-10 font-medium">
                    Discovered through the math of faith
                  </p>

                  {/* Sign in */}
                  <button
                    onClick={() => setAuthModalOpen(true)}
                    className="px-10 py-4 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 text-white text-lg font-medium hover:bg-white/20 hover:border-white/30 transition-all shadow-lg"
                  >
                    Enter
                  </button>

                  {/* App description for Google verification */}
                  <p className="text-zinc-400 text-xs mt-6 max-w-sm mx-auto leading-relaxed">
                    An AI oracle for exploring patterns of meaning.
                    <br />
                    <span className="text-zinc-500">We use your account only for sign-in. Your readings are private.</span>
                  </p>
                </div>

                {/* Footer with legal links */}
                <div className="fixed bottom-4 left-0 right-0 text-center">
                  <div className="text-zinc-500 text-[0.65rem] flex items-center justify-center gap-2">
                    <a href="https://www.nirmanakaya.com/privacy" className="hover:text-zinc-300 transition-colors">Privacy Policy</a>
                    <span className="text-zinc-700">·</span>
                    <a href="https://www.nirmanakaya.com/terms" className="hover:text-zinc-300 transition-colors">Terms of Service</a>
                  </div>
                </div>
              </div>
            ) : (
            <>
            {/* First Contact Mode - Simplified UI */}
            {userLevel === USER_LEVELS.FIRST_CONTACT && (
              <div className="content-pane bg-zinc-900/30 border border-zinc-800/50 rounded-lg p-6 sm:p-8 mb-6 max-w-lg mx-auto">
                <div className="text-center mb-6">
                  <p className="text-zinc-400 text-sm">What's on your mind?</p>
                </div>

                {/* Simple question input */}
                <div className="content-pane mb-4 rounded-lg overflow-hidden">
                  <textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="What would you like clarity on?"
                    className="user-input-area w-full p-4 rounded-lg border border-zinc-700 placeholder:text-zinc-500 resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-base"
                    rows={3}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        performReading();
                      }
                    }}
                  />
                </div>

                {/* Simple read button */}
                <button
                  onClick={performReading}
                  disabled={loading}
                  className="w-full py-4 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 text-zinc-900 font-medium text-lg hover:from-amber-500 hover:to-amber-400 transition-all disabled:opacity-50"
                >
                  {loading ? 'Reading...' : 'Reveal the Pattern'}
                </button>

                {error && <p className="text-red-400 text-sm text-center mt-4">{error}</p>}
              </div>
            )}

            {/* Standard Mode - Unified UI with textarea as fixed anchor */}
            {userLevel !== USER_LEVELS.FIRST_CONTACT && (
            <motion.div
              className="content-pane bg-zinc-900/30 border border-zinc-800/50 rounded-lg px-4 sm:px-6 py-3 mb-2 relative mx-auto max-w-2xl"
              initial={false}
              animate={{
                // When controls collapse, add margin-top to compensate
                // This keeps the textarea visually anchored in place
                marginTop: advancedMode ? 0 : 120,
              }}
              transition={{
                // Match the controls-above height animation exactly
                marginTop: { duration: 0.3, ease: 'easeInOut' }
              }}
            >

              {/* === MAIN LAYOUT: Controls above textarea === */}
              {/* Simple column layout - no minHeight changes to keep textarea rock solid */}
              <div className="flex flex-col">

              {/* CONTROLS GROUP - animates height, textarea stays at bottom */}
              <motion.div
                className={`controls-above overflow-hidden relative ${!advancedMode ? 'pointer-events-none' : ''}`}
                initial={false}
                animate={{
                  height: advancedMode ? 'auto' : 0,
                  opacity: advancedMode ? 1 : 0,
                }}
                transition={{
                  height: { duration: 0.3, ease: 'easeInOut' },
                  opacity: { duration: 0.2 }
                }}
              >
              {/* V1: Frame Selector — replaces mode tabs */}
              <div className="flex justify-center mb-2 px-2">
                <div className="inline-flex rounded-lg bg-zinc-900 p-0.5 gap-0.5 flex-shrink-0">
                  <button
                    onClick={() => setFrameSource('architecture')}
                    className={`px-2 sm:px-3 py-1 rounded-md text-[0.65rem] sm:text-xs font-medium transition-all ${
                      frameSource === 'architecture' ? 'bg-zinc-700/60 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    Architecture
                  </button>
                  <button
                    onClick={() => setFrameSource('preset')}
                    className={`px-2 sm:px-3 py-1 rounded-md text-[0.65rem] sm:text-xs font-medium transition-all ${
                      frameSource === 'preset' ? 'bg-violet-600/25 text-violet-300 border border-violet-500/40' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    Choose a Spread
                  </button>
                  <button
                    onClick={() => {
                      setFrameSource('dynamic');
                      // Copy question to dtpInput when switching to dynamic
                      if (question && !dtpInput) setDtpInput(question);
                    }}
                    className={`px-2 sm:px-3 py-1 rounded-md text-[0.65rem] sm:text-xs font-medium transition-all ${
                      frameSource === 'dynamic' ? 'bg-emerald-600/25 text-emerald-300 border border-emerald-500/40' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    From Your Words
                  </button>
                </div>
              </div>

              {/* V1: Posture is internal — set by presets, not user-selectable */}

              {/* Control Icons - positioned at right, desktop only */}
              <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden sm:grid grid-cols-2 gap-1 z-10">
                {/* Top row: Persona, Signal Tuning */}
                <button
                  onClick={(e) => { e.stopPropagation(); setShowCompactPersona(!showCompactPersona); }}
                  className={`w-7 h-7 sm:w-9 sm:h-9 rounded-md text-xs sm:text-sm transition-colors flex items-center justify-center ${showCompactPersona ? 'bg-amber-600/20 text-amber-400' : 'bg-zinc-800/50 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50'}`}
                  title={`Voice: ${PERSONAS.find(p => p.key === persona)?.name || 'None'}`}
                >
                  {{ friend: '👋', therapist: '🛋️', spiritualist: '✨', scientist: '🧬', coach: '🎯' }[persona] || '○'}
                </button>
                <button
                  onClick={(e) => { if (!handleHelpClick('fine-tune-voice', e)) setShowVoicePanel(!showVoicePanel); }}
                  data-help="fine-tune-voice"
                  className={`w-7 h-7 sm:w-9 sm:h-9 rounded-md transition-colors flex items-center justify-center ${showVoicePanel ? 'bg-amber-600/20 text-amber-400' : 'bg-zinc-800/50 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50'}`}
                  title="Signal Tuning"
                >
                  <svg className="w-4 h-4 sm:w-[18px] sm:h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
                    <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
                    <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
                  </svg>
                </button>
                {/* Tooltip */}
                <AnimatePresence>
                  {controlTooltip && (
                    <motion.div
                      initial={{ opacity: 0, x: 5 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 5 }}
                      className="absolute top-1/2 -translate-y-1/2 right-full mr-2 px-2 py-0.5 bg-zinc-800 text-zinc-200 text-[10px] rounded whitespace-nowrap z-50"
                    >
                      {controlTooltip.text}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* V1: Spread Picker — only visible for Preset frame (Choose a Spread) */}
              {frameSource === 'preset' && (
              <div className="w-full max-w-2xl mx-auto mb-3">
                <div className="flex flex-col items-center justify-start min-h-[36px]">
                    {/* Spread count selector for Preset frame */}
                    <div className="flex gap-1 justify-center mb-2" data-help="spread-selector">
                      {[1, 2, 3, 4, 5, 6].map((count, index) => (
                        <motion.button
                          key={count}
                          onClick={() => {
                            setReflectCardCount(count);
                            setReflectSpreadKey(SPREADS_BY_COUNT[count]?.[0] || 'single');
                          }}
                          className={`w-9 h-9 sm:w-8 sm:h-8 rounded-md text-sm font-medium transition-all ${
                            reflectCardCount === count
                              ? 'bg-violet-600/30 text-white border border-violet-500/50'
                              : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                          }`}
                          animate={rippleTarget === 'counts' ? {
                            opacity: [0.6, 1, 0.6],
                            scale: [1, 1.08, 1],
                          } : {}}
                          transition={{ delay: index * 0.1, duration: 0.3 }}
                        >
                          {count}
                        </motion.button>
                      ))}
                    </div>
                    {/* Spread options for selected count */}
                    <div className="flex gap-1.5 justify-center flex-wrap">
                      {SPREADS_BY_COUNT[reflectCardCount].map((spreadId, index) => {
                        const spread = REFLECT_SPREADS[spreadId];
                        return (
                          <motion.button
                            key={spreadId}
                            onClick={() => {
                              const isNew = reflectSpreadKey !== spreadId;
                              setReflectSpreadKey(spreadId);
                              handleFinalSelectionTap(`preset-${spreadId}`, isNew || lastFinalSelection !== `preset-${spreadId}`);
                            }}
                            className={`px-3 py-2 sm:py-1.5 min-h-[44px] sm:min-h-0 rounded-sm text-[0.8125rem] sm:text-xs font-medium sm:font-normal transition-all ${
                              reflectSpreadKey === spreadId
                                ? 'bg-violet-600/30 text-white border border-violet-500/50'
                                : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                            }`}
                            animate={rippleTarget === 'layouts' ? {
                              opacity: [0.6, 1, 0.6],
                              scale: [1, 1.08, 1],
                            } : {}}
                            transition={{ delay: index * 0.1, duration: 0.3 }}
                          >
                            {spread.name}
                          </motion.button>
                        );
                      })}
                    </div>
                </div>
              </div>
              )}
              </motion.div>{/* END controls-above */}

              {/* TEXTAREA GROUP - First in DOM, appears at bottom of flex (THE ANCHOR) */}
              <div className="textarea-anchor">
              {/* Last Reading Strip */}
              {currentUser && !parsedReading && (
                <LastReadingStrip currentUser={currentUser} />
              )}
              {/* Saved Topics Bar */}
              {currentUser && !parsedReading && (
                <TopicBar
                  currentUser={currentUser}
                  activeTopic={activeTopic}
                  question={question}
                  onSelectTopic={(topic) => {
                    setActiveTopic(topic);
                    if (topic) setQuestion(topic.label);
                  }}
                />
              )}
              {/* Question Input - THE ANCHOR POINT (no animation) */}
              <div className="relative mb-2 mt-1">
                <div
                  className="relative max-w-2xl mx-auto"
                  data-help="question-input"
                  onClick={(e) => handleHelpClick('question-input', e)}
                >
                  {/* Mode Trigger - disclosure triangle, upper right */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setAdvancedMode(!advancedMode); }}
                    className="absolute top-3 right-3 p-2 rounded-md transition-all duration-300 hover:bg-zinc-800/50 z-10"
                    aria-label={advancedMode ? 'Hide advanced controls' : 'Show advanced controls'}
                    title={advancedMode ? 'Hide advanced controls' : 'Show advanced controls'}
                  >
                    <motion.div
                      animate={{ rotate: advancedMode ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <svg className={`w-3 h-3 fill-current transition-colors ${
                        posture === 'reflect' ? 'text-violet-400 hover:text-violet-300' :
                        posture === 'discover' ? 'text-blue-400 hover:text-blue-300' :
                        posture === 'integrate' ? 'text-amber-400 hover:text-amber-300' :
                        'text-zinc-400 hover:text-zinc-300'
                      }`} viewBox="0 0 10 6">
                        <path d="M5 6L0 0h10L5 6z" />
                      </svg>
                    </motion.div>
                  </button>
                  {/* V1: Preset quick-start buttons — visible when controls collapsed */}
                  {!advancedMode && (
                    <div className="flex gap-1.5 justify-center mb-2 px-4">
                      {Object.entries(READING_PRESETS).map(([key, preset]) => {
                        const s = preset.settings;
                        const isActive = s.frameSource === frameSource
                          && s.posture === posture
                          && (s.cardCount ? s.cardCount === cardCount : true);
                        return (
                          <button
                            key={key}
                            onClick={() => applyPreset(key)}
                            className={`text-[0.65rem] px-2.5 py-1 rounded-md transition-all border ${
                              isActive
                                ? `${preset.bgColor} ${preset.color} ${preset.borderColor}`
                                : 'bg-zinc-900/50 text-zinc-500 border-zinc-800 hover:text-zinc-300 hover:border-zinc-700'
                            }`}
                          >
                            <span className="mr-1">{preset.icon}</span>
                            {preset.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {/* Textarea with animated placeholder overlay */}
                  {frameSource === 'dynamic' ? (
                    <div className="relative w-full rounded-lg" style={{ overflow: 'clip' }} onClick={handleTextareaClick}>
                      <textarea
                        value={dtpInput}
                        onChange={(e) => setDtpInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && !loading && (e.preventDefault(), performReading())}
                        className={`user-input-area content-pane w-full border-2 rounded-lg px-4 pt-4 pb-12 pr-12 focus:outline-none resize-none transition-all text-[1rem] sm:text-base min-h-[120px] leading-relaxed ${initiateFlash ? 'animate-border-rainbow-fast' : ''} ${borderFlashActive && !initiateFlash ? 'animate-border-flash-mode' : ''} ${borderPulseActive && !initiateFlash ? 'animate-border-pulse-mode' : ''}`}
                        style={{
                          caretColor: '#fbbf24', // Amber cursor matching theme
                          '--mode-border-color': MODE_COLORS[posture]?.primary || MODE_COLORS[spreadType]?.primary || 'rgba(63, 63, 70, 0.8)',
                          '--mode-border-color-bright': MODE_COLORS[posture]?.primary || MODE_COLORS[spreadType]?.primary || 'rgba(63, 63, 70, 0.8)',
                          '--mode-glow-color': MODE_COLORS[posture]?.glow || MODE_COLORS[spreadType]?.glow || 'transparent',
                          ...(!borderFlashActive && !borderPulseActive && !initiateFlash ? {
                            borderColor: 'rgba(63, 63, 70, 0.8)',
                            boxShadow: 'none',
                            transition: 'border-color 0.4s, box-shadow 0.4s'
                          } : {})
                        }}
                        rows={4}
                      />
                      {/* Animated placeholder overlay - dynamic when selecting, default when collapsed */}
                      <AnimatePresence mode="wait">
                        {!dtpInput && (
                          <motion.div
                            key={advancedMode ? 'explore' : 'default'}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.5 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.6 }}
                            className={`absolute inset-0 px-4 pt-4 pb-12 pr-12 pointer-events-none text-[1rem] sm:text-base leading-relaxed ${placeholderFlash ? 'animate-rainbow-cycle-fast' : 'text-zinc-500'}`}
                          >
                            {advancedMode ? getPlaceholder('explore', 1, null) : DEFAULT_PLACEHOLDER}
                          </motion.div>
                        )}
                      </AnimatePresence>
                      {/* Glistener component - renders inside textarea for idle/complete states */}
                      {showGlistener && (
                        <Glistener
                          onTransfer={(crystal) => {
                            setDtpInput(crystal); // Use dtpInput for Explore mode
                            setGlistenerContent(null);
                            if (crystal) {
                              setCrystalFlash(true);
                              setTimeout(() => setCrystalFlash(false), 2000);
                            }
                          }}
                          onClose={() => {
                            setShowGlistener(false);
                            setGlistenerContent(null);
                            setGlistenData(null);
                          }}
                          onDisplayContent={setGlistenerContent}
                          onPhaseChange={setGlistenerPhase}
                          onGlistenComplete={setGlistenData}
                        />
                      )}
                      {/* Glisten trigger - inside textarea, bottom left */}
                      {!showGlistener && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setShowGlistener(true); }}
                          className="absolute bottom-4 left-4 text-[0.8125rem] font-mono uppercase tracking-[0.2em] text-zinc-500 hover:text-amber-400 transition-colors flex items-center gap-2 z-10"
                          title="Let a question find its shape"
                        >
                          <span className="text-amber-500/70">◇</span>
                          <span>Glisten</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="relative w-full rounded-lg" style={{ overflow: 'clip' }} onClick={handleTextareaClick}>
                      <textarea
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && !loading && (e.preventDefault(), performReading())}
                        className={`user-input-area content-pane w-full border-2 rounded-lg p-4 pb-12 pr-12 focus:outline-none resize-none text-[1rem] sm:text-base min-h-[120px] ${crystalFlash ? 'animate-crystal-text-flash' : ''} ${(glistenerPhase === 'loading' || glistenerPhase === 'streaming') ? 'animate-border-rainbow' : ''} ${initiateFlash ? 'animate-border-rainbow-fast' : ''} ${borderFlashActive && !initiateFlash ? 'animate-border-flash-mode' : ''} ${borderPulseActive && !initiateFlash ? 'animate-border-pulse-mode' : ''}`}
                        style={{
                          caretColor: '#fbbf24', // Amber cursor matching theme
                          // CSS custom properties for pulse animation
                          '--mode-border-color': MODE_COLORS[posture]?.primary || MODE_COLORS[spreadType]?.primary || 'rgba(63, 63, 70, 0.8)',
                          '--mode-border-color-bright': MODE_COLORS[posture]?.primary || MODE_COLORS[spreadType]?.primary || 'rgba(63, 63, 70, 0.8)',
                          '--mode-glow-color': MODE_COLORS[posture]?.glow || MODE_COLORS[spreadType]?.glow || 'transparent',
                          // Don't override border/shadow when animations are active
                          ...((glistenerPhase !== 'loading' && glistenerPhase !== 'streaming' && !borderFlashActive && !borderPulseActive && !initiateFlash) ? {
                            borderColor: crystalFlash ? '#fbbf24' : 'rgba(63, 63, 70, 0.8)',
                            boxShadow: crystalFlash ? '0 0 30px rgba(251, 191, 36, 0.5)' : 'none',
                            transition: 'border-color 0.4s, box-shadow 0.4s'
                          } : {})
                        }}
                        rows={4}
                      />
                      {/* Animated placeholder overlay - shows glistener content OR regular placeholder */}
                      <AnimatePresence mode="wait">
                        {!question && !glistenerContent && (
                          <motion.div
                            key={advancedMode ? getPlaceholder(spreadType, spreadType === 'reflect' ? REFLECT_SPREADS[reflectSpreadKey]?.count : (spreadType === 'forge' ? 1 : RANDOM_SPREADS[spreadKey]?.count), reflectSpreadKey) : 'default'}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.5 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.6 }}
                            className={`absolute inset-0 p-4 pb-12 pr-12 pointer-events-none text-[1rem] sm:text-base ${placeholderFlash ? 'animate-rainbow-cycle-fast' : 'text-zinc-500'}`}
                          >
                            {advancedMode
                              ? getPlaceholder(spreadType, spreadType === 'reflect' ? REFLECT_SPREADS[reflectSpreadKey]?.count : (spreadType === 'forge' ? 1 : RANDOM_SPREADS[spreadKey]?.count), reflectSpreadKey)
                              : DEFAULT_PLACEHOLDER
                            }
                          </motion.div>
                        )}
                        {/* Ghost Stream content from Glistener - Loading messages */}
                        {glistenerContent && glistenerContent.type === 'loading' && (
                          <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center overflow-hidden"
                          >
                            {/* Scrolling message stack - starts at bottom, scrolls up */}
                            <div className="flex flex-col-reverse items-center w-full">
                              <AnimatePresence>
                                {glistenerContent.messages?.map((msg) => (
                                  <motion.div
                                    key={msg.text}
                                    initial={{ opacity: 0, y: 40 }}
                                    animate={{
                                      opacity: msg.opacity,
                                      y: -msg.position * 28,
                                      scale: msg.position === 0 ? 1 : 0.95,
                                    }}
                                    exit={{ opacity: 0, y: -60 }}
                                    transition={{ duration: 0.8, ease: 'easeOut' }}
                                    className="italic text-base sm:text-lg absolute whitespace-nowrap animate-rainbow-cycle"
                                    style={{
                                      fontWeight: 400,
                                      textShadow: msg.position === 0
                                        ? `0 0 ${15 + Math.sin((glistenerContent.pulsePhase || 0) * 3) * 8}px rgba(251, 191, 36, 0.5)`
                                        : 'none',
                                      opacity: msg.position === 0
                                        ? 0.85 + Math.sin((glistenerContent.pulsePhase || 0) * 3) * 0.15
                                        : msg.opacity,
                                    }}
                                  >
                                    {msg.text}
                                  </motion.div>
                                ))}
                              </AnimatePresence>
                            </div>
                          </motion.div>
                        )}
                        {/* Ghost Stream content from Glistener - Streaming/Typing/Fading */}
                        {glistenerContent && glistenerContent.type !== 'loading' && (
                          <motion.div
                            key={glistenerContent.type === 'fading' ? 'typing' : glistenerContent.type}
                            ref={glistenerContent.type === 'streaming' ? glistenerScrollRef : undefined}
                            initial={{ opacity: 0 }}
                            animate={{
                              opacity: glistenerContent.type === 'streaming' ? glistenerContent.opacity :
                                       glistenerContent.type === 'fading' ? glistenerContent.opacity : 1,
                            }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: glistenerContent.type === 'fading' ? 0.04 : 0.1 }}
                            className={`absolute inset-0 pt-5 px-4 pb-[4.5rem] pr-12 ${
                              glistenerContent.type === 'streaming' ? 'leading-relaxed whitespace-pre-wrap overflow-y-auto overflow-x-clip text-[1.05rem] font-light tracking-wide animate-glisten-rainbow' :
                              glistenerContent.type === 'typing' ? 'text-amber-300 italic flex items-center justify-center text-lg pointer-events-none overflow-hidden' :
                              glistenerContent.type === 'fading' ? 'text-amber-300 italic flex items-center justify-center text-lg pointer-events-none overflow-hidden' : 'text-zinc-400 pointer-events-none overflow-hidden'
                            }`}
                            style={{
                              ...(glistenerContent.pulse ? { textShadow: '0 0 25px rgba(251, 191, 36, 0.4)' } : {}),
                              ...(glistenerContent.type === 'streaming' ? { fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' } : {}),
                            }}
                          >
                            {glistenerContent.text}
                            {glistenerContent.type === 'typing' && <span className="animate-pulse ml-0.5">|</span>}
                          </motion.div>
                        )}
                      </AnimatePresence>
                      {/* Glistener component - renders inside textarea for idle/complete states */}
                      {showGlistener && (
                        <Glistener
                          onTransfer={(crystal) => {
                            setQuestion(crystal);
                            // DON'T close - let receipt button show
                            setGlistenerContent(null);
                            // Trigger border + text flash for non-empty crystals
                            if (crystal) {
                              setCrystalFlash(true);
                              setTimeout(() => setCrystalFlash(false), 2000);
                            }
                          }}
                          onClose={() => {
                            setShowGlistener(false);
                            setGlistenerContent(null);
                            setGlistenData(null); // Clear glisten data when closing
                          }}
                          onDisplayContent={setGlistenerContent}
                          onPhaseChange={setGlistenerPhase}
                          onGlistenComplete={setGlistenData}
                        />
                      )}
                    </div>
                  )}
                  {/* Glisten trigger - inside textarea, bottom left */}
                  {!showGlistener && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowGlistener(true); }}
                      className="absolute bottom-4 left-4 text-[0.8125rem] font-mono uppercase tracking-[0.2em] text-zinc-500 hover:text-amber-400 transition-colors flex items-center gap-2 z-10"
                      title="Let a question find its shape"
                    >
                      <span className="text-amber-500/70">◇</span>
                      <span>Glisten</span>
                    </button>
                  )}
                  {/* Initiate button - inside textarea, bottom right */}
                  {/* Shows Cancel when Glistener is running, Initiate otherwise */}
                  {['loading', 'streaming', 'typing'].includes(glistenerPhase) ? (
                    <motion.button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowGlistener(false);
                        setGlistenerContent(null);
                        setGlistenData(null);
                      }}
                      className="group absolute bottom-4 right-4 flex items-center gap-2 px-4 py-1.5 rounded-lg border border-blue-500/50 hover:border-blue-400 backdrop-blur-md transition-all duration-300 bg-black/20 hover:bg-white/5 z-10 animate-pulse"
                      whileTap={{ scale: 0.95 }}
                    >
                      <span className="text-[0.8125rem] font-mono uppercase tracking-[0.2em] font-medium text-blue-400">
                        CANCEL
                      </span>
                      <svg
                        className="w-3.5 h-3.5 text-blue-400"
                        viewBox="0 0 12 12"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <path d="M2 2l8 8M10 2l-8 8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </motion.button>
                  ) : (
                    <motion.button
                      onClick={(e) => { e.stopPropagation(); if (!handleHelpClick('get-reading', e)) performReading(); }}
                      data-help="get-reading"
                      disabled={loading}
                      className={`group absolute bottom-4 right-4 flex items-center gap-2 px-4 py-1.5 rounded-lg border backdrop-blur-md transition-all duration-300 bg-black/20 hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed z-10 ${
                        posture === 'reflect' ? 'border-violet-500/50 hover:border-violet-400' :
                        posture === 'discover' ? 'border-blue-500/50 hover:border-blue-400' :
                        posture === 'integrate' ? 'border-amber-500/50 hover:border-amber-400' :
                        'border-zinc-700/50 hover:border-zinc-600'
                      }`}
                      whileTap={{ scale: 0.95 }}
                    >
                      <span
                        className="text-[0.8125rem] font-mono uppercase tracking-[0.2em] font-medium"
                        style={{
                          background: 'linear-gradient(90deg, #f87171, #fb923c, #facc15, #4ade80, #22d3ee, #a78bfa, #f472b6, #f87171)',
                          backgroundSize: '200% 100%',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                          animation: 'gradient-shift 3s ease infinite',
                        }}
                      >
                        {loading ? '...' : 'ENTER THE FIELD'}
                      </span>
                      {/* Wireframe chevron - translates right on hover */}
                      <svg
                        className="w-3.5 h-3.5 text-white/60 group-hover:text-white/90 group-hover:translate-x-1 transition-all duration-200"
                        viewBox="0 0 12 12"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <path d="M4 2l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </motion.button>
                  )}
                </div>
                {/* V1: Status label - below textarea when controls minimized */}
                {!advancedMode && (
                  <div className="text-center leading-none mt-2 px-4">
                    <span className="text-[0.65rem] font-mono tracking-wide text-zinc-500">
                      {/* Posture label */}
                      {/* Frame info */}
                      {frameSource === 'preset' && REFLECT_SPREADS[reflectSpreadKey] ? (
                        <>
                          <span className="text-violet-400/50">{REFLECT_SPREADS[reflectSpreadKey].name}</span>
                          <span className="text-zinc-700 mx-1">·</span>
                          <span className="text-zinc-500">{REFLECT_SPREADS[reflectSpreadKey].count}</span>
                        </>
                      ) : frameSource === 'dynamic' ? (
                        <span className="text-emerald-400/50">From Your Words</span>
                      ) : (
                        <span className="text-zinc-500">{cardCount} signature{cardCount !== 1 ? 's' : ''}</span>
                      )}
                    </span>
                  </div>
                )}
              </div>

              {/* Mobile Control Icons - below textarea, mobile only, only when expanded */}
              {advancedMode && (
              <div className="flex sm:hidden justify-center gap-2 mt-2">
                {/* Persona */}
                <button
                  onClick={(e) => { e.stopPropagation(); setShowCompactPersona(!showCompactPersona); }}
                  className={`w-9 h-9 rounded-md text-sm transition-colors flex items-center justify-center ${showCompactPersona ? 'bg-amber-600/20 text-amber-400' : 'bg-zinc-800/50 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50'}`}
                  title={`Voice: ${PERSONAS.find(p => p.key === persona)?.name || 'None'}`}
                >
                  {{ friend: '👋', therapist: '🛋️', spiritualist: '✨', scientist: '🧬', coach: '🎯' }[persona] || '○'}
                </button>
                {/* Signal Tuning */}
                <button
                  onClick={(e) => { if (!handleHelpClick('fine-tune-voice', e)) setShowVoicePanel(!showVoicePanel); }}
                  className={`w-9 h-9 rounded-md transition-colors flex items-center justify-center ${showVoicePanel ? 'bg-amber-600/20 text-amber-400' : 'bg-zinc-800/50 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50'}`}
                  title="Signal Tuning"
                >
                  <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
                    <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
                    <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
                  </svg>
                </button>
              </div>
              )}

              </div>{/* END textarea-anchor */}
              </div>{/* END flex layout */}

              {/* Description Block - HIDDEN FOR NOW (may restore later)
              <UnfoldPanel isOpen={advancedMode} direction="down" delay={0.08} duration={0.5}>
              <div className="relative mb-2 mt-2">
                <div className="w-full max-w-lg mx-auto min-h-[110px]">
                  {spreadType === 'reflect' && REFLECT_SPREADS[reflectSpreadKey] ? (
                    <div className="bg-zinc-900/50 rounded-lg p-4 text-center">
                      <div className="text-zinc-300 text-sm font-medium mb-1">
                        {REFLECT_SPREADS[reflectSpreadKey].name} • {REFLECT_SPREADS[reflectSpreadKey].count} position{REFLECT_SPREADS[reflectSpreadKey].count > 1 ? 's' : ''}
                      </div>
                      <div className="text-zinc-400 text-xs mb-2">
                        {REFLECT_SPREADS[reflectSpreadKey].positions.map(p => p.name).join(' → ')}
                      </div>
                      <div className="text-zinc-500 text-xs mb-1">
                        <span className="text-zinc-400">When to use:</span> {REFLECT_SPREADS[reflectSpreadKey].whenToUse}
                      </div>
                      <div className="text-zinc-500 text-xs">
                        <span className="text-zinc-400">What you'll see:</span> {REFLECT_SPREADS[reflectSpreadKey].whatYoullSee}
                      </div>
                    </div>
                  ) : spreadType === 'discover' ? (
                    <div className="bg-zinc-900/50 rounded-lg p-4 text-center">
                      <div className="text-zinc-300 text-sm font-medium mb-1">
                        Discover • {RANDOM_SPREADS[spreadKey]?.count} position{RANDOM_SPREADS[spreadKey]?.count > 1 ? 's' : ''}
                      </div>
                      <div className="text-zinc-400 text-xs mb-2">
                        {DISCOVER_DESCRIPTIONS[RANDOM_SPREADS[spreadKey]?.count]?.subtitle}
                      </div>
                      <div className="text-zinc-500 text-xs mb-1">
                        <span className="text-zinc-400">When to use:</span> {DISCOVER_DESCRIPTIONS[RANDOM_SPREADS[spreadKey]?.count]?.whenToUse}
                      </div>
                      <div className="text-zinc-500 text-xs">
                        <span className="text-zinc-400">What you'll see:</span> {DISCOVER_DESCRIPTIONS[RANDOM_SPREADS[spreadKey]?.count]?.whatYoullSee}
                      </div>
                    </div>
                  ) : spreadType === 'forge' ? (
                    <div className="bg-zinc-900/50 rounded-lg p-4 text-center">
                      <div className="text-zinc-300 text-sm font-medium mb-1">
                        Forge • 1 position
                      </div>
                      <div className="text-zinc-400 text-xs mb-2">
                        {FORGE_DESCRIPTION.subtitle}
                      </div>
                      <div className="text-zinc-500 text-xs mb-1">
                        <span className="text-zinc-400">When to use:</span> {FORGE_DESCRIPTION.whenToUse}
                      </div>
                      <div className="text-zinc-500 text-xs">
                        <span className="text-zinc-400">What you'll see:</span> {FORGE_DESCRIPTION.whatYoullSee}
                      </div>
                    </div>
                  ) : spreadType === 'explore' ? (
                    <div className="bg-zinc-900/50 rounded-lg p-4 text-center">
                      <div className="text-zinc-300 text-sm font-medium mb-1">
                        Explore • Direct Token Protocol
                      </div>
                      <div className="text-zinc-400 text-xs mb-2">
                        Describe what's active. Each token gets its own card.
                      </div>
                      <div className="text-zinc-500 text-xs mb-1">
                        <span className="text-zinc-400">When to use:</span> When you want to name specific things and see how they're structured
                      </div>
                      <div className="text-zinc-500 text-xs">
                        <span className="text-zinc-400">What you'll see:</span> Up to 5 tokens, each with its own reading
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
              </UnfoldPanel>
              */}

              {/* Persona Selector - MOVED TO COMPACT VERSION ABOVE GO BUTTON
              <UnfoldPanel isOpen={advancedMode} direction="down" delay={0.1} duration={0.5}>
              <div className="mt-2 pt-2 border-t border-zinc-800/50 mb-2">
                <AnimatePresence mode="wait">
                  {advancedMode && (
                    <motion.div
                      key="persona-grid"
                      className="grid grid-cols-3 gap-1.5 w-full max-w-sm mx-auto px-1"
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                    >
                      {PERSONAS.map((p, index) => {
                        const icons = { friend: '👋', therapist: '🛋️', spiritualist: '✨', scientist: '🧬', coach: '🎯' };
                        const isLeftColumn = index % 3 === 0;
                        const isRightColumn = index % 3 === 2;
                        const xOffset = isLeftColumn ? -40 : isRightColumn ? 40 : 0;
                        return (
                          <motion.button
                            key={p.key}
                            initial={{ opacity: 0, x: xOffset, scale: 0.9 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: xOffset, scale: 0.9 }}
                            transition={{
                              duration: 0.45,
                              delay: index * 0.06,
                              ease: [0.25, 0.46, 0.45, 0.94]
                            }}
                            onClick={(e) => { if (!handleHelpClick('persona-' + p.key, e)) setPersona(p.key); }}
                            data-help={`persona-${p.key}`}
                            title={p.desc}
                            className={`px-2 py-2 min-h-[40px] rounded-md text-sm font-medium transition-all text-center flex items-center justify-center gap-1.5 ${
                              persona === p.key
                                ? 'bg-[#2e1065] text-amber-400 border border-amber-600/30'
                                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 active:bg-zinc-700 border border-zinc-800'
                            }`}
                          >
                            <span>{icons[p.key]}</span>
                            <span>{p.name}</span>
                          </motion.button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              </UnfoldPanel>
              */}

{/* Footer Deck removed - all controls moved to mode row */}
            </motion.div>
            )}
            {/* End of Standard Mode conditional */}

            {/* Persona Dropdown Flyout - Fixed position outside overflow-hidden */}
            <AnimatePresence>
              {showCompactPersona && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-40"
                    onClick={() => setShowCompactPersona(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="fixed bottom-20 sm:bottom-56 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 bg-zinc-950/95 border border-white/10 rounded-xl p-3 shadow-2xl z-50 backdrop-blur-md sm:min-w-[180px]"
                  >
                    <h4 className="text-[11px] font-mono uppercase tracking-[0.15em] text-zinc-500 mb-2 pb-2 border-b border-white/5">Select Voice</h4>
                    {PERSONAS.map((p) => {
                      const icons = { friend: '👋', therapist: '🛋️', spiritualist: '✨', scientist: '🧬', coach: '🎯' };
                      return (
                        <button
                          key={p.key}
                          onClick={() => { setPersona(p.key); setShowCompactPersona(false); }}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                            persona === p.key ? 'bg-amber-500/20 text-amber-400' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                          }`}
                        >
                          <span className="text-lg">{icons[p.key]}</span>
                          <span>{p.name}</span>
                        </button>
                      );
                    })}
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            {/* Adjust Persona Popover - Rendered outside container to prevent layout expansion */}
            <AnimatePresence>
              {showVoicePanel && (
                <>
                  {/* Backdrop to close panel when clicking outside */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-40"
                    onClick={() => setShowVoicePanel(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="fixed bottom-20 sm:bottom-56 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-80 bg-zinc-950/95 border border-white/10 rounded-xl p-4 sm:p-5 shadow-2xl z-50 backdrop-blur-md max-h-[70vh] overflow-y-auto"
                    onClick={() => setShowVoicePanel(false)}
                  >
                    {/* Header */}
                    <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
                      <h3 className="text-[12px] font-mono uppercase tracking-[0.2em] text-zinc-500">Adjust Persona</h3>
                      {/* Close button (LED style) */}
                      <button
                        onClick={() => setShowVoicePanel(false)}
                        className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)] hover:bg-emerald-400 hover:shadow-[0_0_8px_rgba(16,185,129,0.8)] transition-all cursor-pointer"
                        title="Close"
                      />
                    </div>

                    {/* V1: Simplified Voice Controls — Humor + Architecture Toggle */}
                    <div className="space-y-4">
                      {/* Humor */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px] uppercase font-mono text-zinc-400">
                          <span>Serious</span>
                          <span className="text-violet-400">{HUMOR_LEVELS[humor]}</span>
                          <span>Wild</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={humor}
                          onChange={(e) => setHumor(parseInt(e.target.value))}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-violet-500 hover:accent-violet-400"
                        />
                      </div>

                      {/* Architecture Visibility Toggle */}
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">Show Architecture</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); setShowArchitectureTerms(!showArchitectureTerms); }}
                          className={`text-[11px] font-mono uppercase tracking-wider px-3 py-1.5 rounded border transition-colors ${showArchitectureTerms ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400' : 'border-zinc-800 text-zinc-600 hover:text-zinc-400'}`}
                        >
                          {showArchitectureTerms ? 'ON' : 'OFF'}
                        </button>
                      </div>
                    </div>

                    {/* Model Selector + Token Display */}
                    <div className="mt-4 pt-3 border-t border-white/5">
                      {getAvailableModels().length > 1 && (
                        <div className="flex items-center justify-center gap-2 mb-1.5">
                          <span className="text-[10px] text-zinc-500 font-mono">Model:</span>
                          <select
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 focus:outline-none focus:border-amber-500"
                          >
                            {getAvailableModels().map(m => (
                              <option key={m} value={m}>{getModelLabel(m)}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      <label className="flex items-center justify-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showTokenUsage}
                          onChange={(e) => setShowTokenUsage(e.target.checked)}
                          className="w-3 h-3 rounded border-zinc-600 bg-zinc-800 text-amber-500 focus:ring-amber-500 focus:ring-offset-0 cursor-pointer"
                        />
                        <span className="text-[10px] text-zinc-400 font-mono">Show token usage</span>
                      </label>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
        </>
        )}
        {/* End of currentUser ternary */}
          </>
        )}
        {/* End of !draws conditional */}

        {/* Loading */}
        {loading && !expanding && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="relative">
              <div className="w-16 h-16 border-2 border-zinc-800 rounded-full"></div>
              <div className="absolute inset-0 w-16 h-16 border-2 border-transparent border-t-zinc-400 rounded-full animate-spin"></div>
            </div>
            <div
              className="mt-6 bg-zinc-900/60 backdrop-blur-sm rounded-lg px-6 py-4 max-w-xs transition-opacity duration-300"
              style={{ opacity: loadingPhraseVisible ? 1 : 0 }}
            >
              <p className="text-zinc-400 text-sm text-center">
                {loadingPhrases[loadingPhraseIndex] || ''}
              </p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && <div className="bg-red-950/30 border border-red-900/50 rounded-lg p-4 my-4 text-red-400 text-sm">{error}</div>}

        {/* First Contact Reading Output - Simplified display */}
        {draws && !loading && parsedReading?.firstContact && userLevel === USER_LEVELS.FIRST_CONTACT && (
          <div className="max-w-lg mx-auto mb-8">
            {/* Simple card display */}
            <div className="content-pane bg-zinc-900/50 rounded-lg border border-zinc-800/50 p-6 mb-4">
              <div className="text-center mb-4">
                <span className="text-xs text-zinc-500 uppercase tracking-wider">Pattern Emerged</span>
              </div>
              {(() => {
                const draw = draws[0];
                const trans = getComponent(draw.transient);
                const stat = STATUSES[draw.status];
                const statusColor = stat.id === 1 ? 'text-emerald-400' :
                                   stat.id === 2 ? 'text-red-400' :
                                   stat.id === 3 ? 'text-blue-400' : 'text-purple-400';
                return (
                  <div className="text-center">
                    <div className={`text-2xl font-light mb-2 ${statusColor}`}>
                      {stat.prefix ? `${stat.prefix} ` : ''}{trans.name}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {stat.name} — {stat.desc}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* The reading response */}
            <div className="content-pane bg-zinc-900/30 rounded-lg border border-zinc-800/50 p-6">
              <div className="text-zinc-300 text-base leading-relaxed">
                <ReactMarkdown
                  components={{
                    strong: ({node, ...props}) => <strong className="text-white font-semibold" {...props} />,
                    p: ({node, ...props}) => <span {...props} />
                  }}
                >
                  {parsedReading.firstContact}
                </ReactMarkdown>
              </div>
            </div>

            {/* Simple actions */}
            <div className="flex flex-col items-center gap-3 mt-6">
              <div className="flex gap-2">
                <SaveReadingButton
                  reading={{
                    question,
                    mode: 'firstContact',
                    cards: draws.map((draw, i) => ({
                      ...draw,
                      interpretation: null // First Contact doesn't have card interpretations
                    })),
                    synthesis: { firstContactResponse: parsedReading?.firstContact },
                    letter: parsedReading?.firstContact,
                    tokenUsage,
                    threadData // Include thread data for cloud saves
                  }}
                  glisten={glistenData}
                  draws={draws}
                  locusSubjects={locusSubjects}
                  voice="friend-warm"
                  topicId={activeTopic?.id}
                  onSave={(saved) => setSavedReadingId(saved?.id)}
                  onBadges={(badges) => setPendingBadges(badges)}
                />
                <ShareReadingButton
                  reading={{
                    question,
                    mode: 'firstContact',
                    cards: draws // Include all cards, not just first 3
                  }}
                  readingId={savedReadingId}
                  fallbackUrl={shareUrl}
                />
                <EmailReadingButton readingId={savedReadingId} />
              </div>
              <button
                onClick={resetReading}
                className="px-6 py-3 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 text-zinc-900 font-medium hover:from-amber-500 hover:to-amber-400 transition-all"
              >
                Ask Another Question
              </button>
            </div>

            {/* Token usage (dev info) */}
            {showTokenUsage && tokenUsage && (
              <div className="text-center mt-4 text-[0.625rem] text-zinc-600">
                {tokenUsage.input_tokens} in / {tokenUsage.output_tokens} out
                {' '}(~${((tokenUsage.input_tokens * 0.25 + tokenUsage.output_tokens * 1.25) / 1000000).toFixed(4)})
              </div>
            )}
          </div>
        )}

        {/* Signatures Display - THE READING (comes first) - Standard Mode only */}
        {draws && !loading && !parsedReading?.firstContact && (() => {
          // Signatures default to EXPANDED (only true = collapsed)
          const isSignaturesCollapsed = collapsedSections['signatures'] === true;

          return (
            <div className="mb-6">
              {/* Metadata line ABOVE buttons */}
              <div className="text-center mb-3">
                <span className="text-xs text-zinc-500 uppercase tracking-wider whitespace-nowrap">
                  {parsedReading?._isFirstContact
                    ? 'Single Card Reading'
                    : spreadType === 'reflect'
                    ? `Reflect • ${REFLECT_SPREADS[reflectSpreadKey]?.name}`
                    : spreadType === 'explore'
                      ? `Explore • ${dtpTokens?.length || 0} token${(dtpTokens?.length || 0) !== 1 ? 's' : ''}`
                      : `Discover • ${RANDOM_SPREADS[spreadKey]?.name}`} {!parsedReading?._isFirstContact && <>• {getCurrentStanceLabel()}</>}
                </span>
              </div>
              {/* Action buttons row */}
              <div className="flex justify-center gap-2 items-center relative mb-4 flex-wrap">
                {parsedReading && !loading && (
                  <>
                    <SaveReadingButton
                      reading={{
                        question,
                        mode: spreadType,
                        spreadType: spreadType === 'reflect' ? reflectSpreadKey : spreadKey,
                        cards: draws.map((draw, i) => ({
                          ...draw,
                          interpretation: parsedReading?.cards?.[i] || null
                        })),
                        synthesis: {
                          summary: parsedReading?.summary,
                          path: parsedReading?.path,
                          fullArchitecture: parsedReading?.fullArchitecture
                        },
                        letter: parsedReading?.letter,
                        tokenUsage,
                        threadData // Include thread data for cloud saves
                      }}
                      glisten={glistenData}
                      draws={draws}
                      locusSubjects={locusSubjects}
                      voice={`${stance.complexity}-${stance.voice}`}
                      topicId={activeTopic?.id}
                      onSave={(saved) => setSavedReadingId(saved?.id)}
                      onBadges={(badges) => setPendingBadges(badges)}
                    />
                    <div data-help="action-share" onClick={(e) => handleHelpClick('action-share', e)}>
                      <ShareReadingButton
                        reading={{
                          question,
                          mode: spreadType,
                          cards: draws // Include all cards, not just first 3
                        }}
                        readingId={savedReadingId}
                        fallbackUrl={shareUrl}
                        disabled={helpMode}
                      />
                    </div>
                    <div data-help="action-email" onClick={(e) => handleHelpClick('action-email', e)}>
                      <EmailReadingButton readingId={savedReadingId} disabled={helpMode} />
                    </div>
                    {!parsedReading?._isFirstContact && (
                      <button
                        data-help="action-export"
                        onClick={(e) => { if (!handleHelpClick('action-export', e)) exportToHTML(); }}
                        className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1 rounded bg-zinc-800/90"
                      >Export</button>
                    )}
                  </>
                )}
                {!parsedReading?._isFirstContact && (
                  <button
                    data-help="action-traditional"
                    onClick={(e) => { if (!handleHelpClick('action-traditional', e)) setShowTraditional(!showTraditional); }}
                    className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1 rounded bg-zinc-800/90"
                  >{showTraditional ? 'Hide Traditional' : 'Traditional'}</button>
                )}
                {!parsedReading?._isFirstContact && (
                  <button
                    data-help="action-architecture"
                    onClick={(e) => { if (!handleHelpClick('action-architecture', e)) setShowArchitecture(!showArchitecture); }}
                    className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1 rounded bg-zinc-800/90"
                  >{showArchitecture ? 'Hide Architecture' : 'Architecture'}</button>
                )}
                <button
                  data-help="action-new"
                  onClick={(e) => { if (!handleHelpClick('action-new', e)) resetReading(); }}
                  className="text-xs text-[#f59e0b] hover:text-yellow-300 transition-colors px-2 py-1 rounded bg-[#021810] hover:bg-[#052e23] border border-emerald-700/50"
                >New</button>
                <button
                  onClick={() => setHelpPopover(helpPopover === 'actions' ? null : 'actions')}
                  className="w-4 h-4 rounded-full bg-[#f59e0b]/20 border border-[#f59e0b]/50 text-[#f59e0b] hover:bg-[#f59e0b]/30 hover:text-[#f59e0b] text-[0.625rem] flex items-center justify-center transition-all"
                >
                  ?
                </button>
                {helpPopover === 'actions' && (
                  <div className="absolute top-full right-0 mt-2 z-50 w-64">
                    <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 shadow-xl text-xs">
                      <div className="space-y-1.5 text-zinc-400">
                        <p><span className="text-zinc-200">Export</span> — Download as HTML file</p>
                        <p><span className="text-zinc-200">Traditional</span> — Toggle traditional tarot names</p>
                        <p><span className="text-zinc-200">Architecture</span> — Show architectural details</p>
                        <p><span className="text-zinc-200">New</span> — Start a fresh reading</p>
                      </div>
                      <button onClick={() => setHelpPopover(null)} className="mt-2 text-zinc-500 hover:text-zinc-300 w-full text-center">Got it</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Collapsible Signatures Section */}
              <div className="content-pane rounded-lg border border-zinc-800/50 bg-zinc-900/30 overflow-hidden">
                {/* Signatures Header - clickable */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-zinc-800/30 transition-colors"
                  onClick={() => toggleCollapse('signatures', false)}
                >
                  <span className={`text-xs transition-transform duration-200 ${isSignaturesCollapsed ? 'text-red-500' : 'text-emerald-500'}`} style={{ transform: isSignaturesCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>
                    ▼
                  </span>
                  <span className="text-sm font-medium text-zinc-400">
                    Signatures ({draws.length} {draws.length === 1 ? 'card' : 'cards'})
                  </span>
                </div>

                {/* Signatures Grid - collapsible */}
                {!isSignaturesCollapsed && (
                  <div className="p-4 pt-0">
                    <div className={`grid gap-4 ${
                      draws.length === 1 ? 'grid-cols-1 max-w-md mx-auto' :
                      draws.length === 3 ? 'grid-cols-1 sm:grid-cols-3' :
                      draws.length === 4 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' :
                      'grid-cols-1 sm:grid-cols-3 lg:grid-cols-5'
                    }`}>
                      {draws.map((draw, i) => <CardDisplay key={i} draw={draw} index={i} />)}
                    </div>
                  </div>
                )}
              </div>

            {/* Architecture Panel */}
            {showArchitecture && (
              <div className="content-pane mt-6 bg-zinc-900/50 rounded-lg border border-zinc-800/50 p-4">
                <div className="text-xs text-zinc-500 uppercase tracking-wider mb-4">Architecture Details</div>
                
                <div className="space-y-4 mb-6">
                  {draws.map((draw, i) => {
                    const trans = getComponent(draw.transient);
                    const stat = STATUSES[draw.status];
                    const pos = ARCHETYPES[draw.position] || null;
                    const transArchetype = trans.archetype !== undefined ? ARCHETYPES[trans.archetype] : null;
                    const correction = getFullCorrection(draw.transient, draw.status);
                    // V1: Always use archetype position name
                    const label = pos?.name || 'Draw';
                    
                    return (
                      <div key={i} className="bg-zinc-800/30 rounded-lg p-3 text-sm">
                        <div className="text-zinc-300 font-medium mb-2">{label}</div>
                        
                        {pos && (
                          <div className="text-zinc-500 mb-2">
                            <span className="text-zinc-400">Position {draw.position}:</span> {pos.name} ({pos.traditional})
                            <br />
                            <span className="text-zinc-600">House: {pos.house} | Function: {pos.function}</span>
                          </div>
                        )}
                        
                        <div className="text-zinc-500 mb-2">
                          <span className="text-zinc-400">Transient:</span> {trans.name} ({trans.traditional})
                          {trans.type === "Bound" && (
                            <>
                              <br />
                              <span className="text-zinc-600">
                                {trans.channel} Channel | Number {trans.number} ({trans.number <= 5 ? 'Inner' : 'Outer'} Bound)
                                <br />
                                Associated Archetype: {transArchetype?.name} (Position {trans.archetype})
                              </span>
                            </>
                          )}
                          {trans.type === "Agent" && (
                            <>
                              <br />
                              <span className="text-zinc-600">
                                {trans.role} of {trans.channel}
                                <br />
                                Embodies: {transArchetype?.name} (Position {trans.archetype})
                              </span>
                            </>
                          )}
                          {trans.type === "Archetype" && (
                            <>
                              <br />
                              <span className="text-amber-400/70">Major Archetype as Transient — amplified significance</span>
                            </>
                          )}
                        </div>
                        
                        <div className="text-zinc-500">
                          <span className="text-zinc-400">Status:</span> {stat.name} ({stat.orientation})
                          {correction && draw.status !== 1 && (
                            <div className="mt-1 pl-3 border-l-2 border-zinc-700 text-zinc-600">
                              {trans.type === "Archetype" && (
                                <>
                                  {draw.status === 2 && <div>Diagonal correction: {draw.transient} ↔ {DIAGONAL_PAIRS[draw.transient]} (sum {draw.transient + DIAGONAL_PAIRS[draw.transient]}) → {ARCHETYPES[DIAGONAL_PAIRS[draw.transient]]?.name}</div>}
                                  {draw.status === 3 && <div>Vertical correction: {draw.transient} ↔ {VERTICAL_PAIRS[draw.transient]} (sum 20) → {ARCHETYPES[VERTICAL_PAIRS[draw.transient]]?.name}</div>}
                                  {draw.status === 4 && correction.targets && (
                                    <div>Reduction pair (digit sum {getDigitSum(draw.transient)}): {correction.targets.map(t => `${ARCHETYPES[t]?.name} (${t})`).join(', ')}</div>
                                  )}
                                </>
                              )}
                              {trans.type === "Bound" && correction.targetBound && (
                                <>
                                  <div>Number mirror: {correction.numberMirror} (11 - {trans.number} = {11 - trans.number})</div>
                                  <div>Channel cross ({stat.name}): {correction.channelCross}</div>
                                  <div>Target: {correction.targetBound.name} ({correction.targetBound.traditional})</div>
                                </>
                              )}
                              {trans.type === "Agent" && correction.target !== undefined && (
                                <>
                                  <div>Agent corrects through embodied Archetype ({transArchetype?.name}, position {trans.archetype})</div>
                                  {draw.status === 2 && <div>Diagonal: {trans.archetype} ↔ {DIAGONAL_PAIRS[trans.archetype]} → {ARCHETYPES[correction.target]?.name}</div>}
                                  {draw.status === 3 && <div>Vertical: {trans.archetype} ↔ {VERTICAL_PAIRS[trans.archetype]} → {ARCHETYPES[correction.target]?.name}</div>}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {draws.length > 1 && (
                  <div className="border-t border-zinc-800/50 pt-4">
                    <div className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Relationships</div>
                    <div className="text-sm text-zinc-600 space-y-1">
                      {(() => {
                        const relationships = [];

                        // V1: House grouping always works (universal positions)
                        const houseGroups = {};
                        draws.forEach((draw, i) => {
                          const house = ARCHETYPES[draw.position]?.house || null;
                          if (house) {
                            if (!houseGroups[house]) houseGroups[house] = [];
                            houseGroups[house].push(ARCHETYPES[draw.position]?.name);
                          }
                        });
                        Object.entries(houseGroups).forEach(([house, cards]) => {
                          if (cards.length > 1) {
                            relationships.push(`${house} House: ${cards.join(' & ')} share domain`);
                          }
                        });

                        const channelGroups = {};
                        draws.forEach((draw, i) => {
                          const trans = getComponent(draw.transient);
                          if (trans.channel) {
                            if (!channelGroups[trans.channel]) channelGroups[trans.channel] = [];
                            const label = ARCHETYPES[draw.position]?.name || `Signature ${i+1}`;
                            channelGroups[trans.channel].push({ label, trans: trans.name });
                          }
                        });
                        Object.entries(channelGroups).forEach(([channel, items]) => {
                          if (items.length > 1) {
                            relationships.push(`${channel} Channel: ${items.map(it => it.trans).join(' & ')} resonate`);
                          }
                        });

                        draws.forEach((draw, i) => {
                          const correction = getFullCorrection(draw.transient, draw.status);
                          if (correction) {
                            const corrTarget = correction.target !== undefined ? correction.target :
                                             correction.targetBound?.archetype;
                            if (corrTarget !== undefined) {
                              draws.forEach((otherDraw, j) => {
                                if (i !== j) {
                                  const otherTrans = getComponent(otherDraw.transient);
                                  if (otherDraw.transient === corrTarget || otherTrans.archetype === corrTarget) {
                                    // V1: Always use archetype position names
                                    const label1 = ARCHETYPES[draw.position]?.name;
                                    const label2 = ARCHETYPES[otherDraw.position]?.name;
                                    relationships.push(`${label1} correction points toward ${label2}`);
                                  }
                                }
                              });
                            }
                          }
                        });
                        
                        return relationships.length > 0 ? 
                          relationships.map((r, i) => <div key={i}>• {r}</div>) : 
                          <div className="text-zinc-700">No direct structural relationships detected</div>;
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          );
        })()}

        {/* Your Question - shows after visual spread (non-Explore modes) */}
        {parsedReading && !loading && !parsedReading.firstContact && question && spreadType !== 'explore' && (
          <div className="content-pane bg-zinc-800/50 rounded-lg p-4 mb-6 mx-8">
            <div className="flex items-center gap-2 mb-2">
              {/* Glistened Tale button - shows if glisten data exists */}
              {glistenData && (
                <button
                  onClick={() => setShowGlistenPanel(true)}
                  className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-colors flex items-center gap-1"
                  title="View Glistened Tale"
                >
                  <span>✨</span> Glistened Tale
                </button>
              )}
              <div className="text-[0.625rem] text-zinc-500 tracking-wider">Your question or intention</div>
            </div>
            <div className="text-zinc-300 text-sm">{question}</div>
          </div>
        )}

        {/* What's Active - shows after visual spread (Explore mode only) */}
        {parsedReading && !loading && !parsedReading.firstContact && spreadType === 'explore' && dtpInput && (
          <div id="whats-active-top" className="content-pane bg-zinc-800/50 rounded-lg p-4 mb-6 mx-8 border border-amber-600/30">
            <div className="text-[0.625rem] text-amber-400 tracking-wider mb-2">WHAT'S ACTIVE</div>
            <div className="text-zinc-300 text-sm italic mb-3">"{dtpInput}"</div>
            {dtpTokens && dtpTokens.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {dtpTokens.map((token, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      const el = document.getElementById(`content-${i}`);
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="px-2 py-1 bg-amber-500/20 text-amber-300 text-xs rounded-full hover:bg-amber-500/40 transition-colors cursor-pointer"
                  >
                    {token}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Letter - after Question */}
        {parsedReading && !loading && parsedReading.letter && !parsedReading.firstContact && (() => {
          // Handle both legacy (string) and new (object) formats
          // Also handle JSON strings that need parsing (from saved readings)
          let letter = parsedReading.letter;
          if (typeof letter === 'string' && letter.startsWith('{')) {
            try { letter = JSON.parse(letter); } catch (e) { /* keep as string */ }
          }
          const isLegacy = typeof letter === 'string';
          // Helper to get shallow content — use surface if available, else derive from wade
          const getShallowContent = (surfaceContent, wadeContent) => {
            if (surfaceContent) return surfaceContent;
            if (!wadeContent) return '';
            const sentences = wadeContent.split(/(?<=[.!?])\s+/);
            return sentences.slice(0, 3).join(' ');
          };
          const letterContent = isLegacy
            ? letter
            : letterDepth === 'shallow'
              ? getShallowContent(letter.surface, letter.wade || '')
              : letter[letterDepth] || letter.deep || letter.swim || letter.wade || letter.surface || '';
          const hasDepthLevels = !isLegacy && (letter.surface || letter.wade || letter.swim || letter.deep);
          const letterSectionKey = 'letter';
          const sectionExpansions = expansions[letterSectionKey] || {};
          const isExpanding = expanding?.section === letterSectionKey;

          // Button style helper (same as DepthCard)
          const getButtonStyle = (hasExpansion, isThisExpanding, isExpandingOther) => {
            let base = 'px-2.5 py-1 text-xs rounded-md transition-all duration-200 flex items-center gap-1.5';
            if (isThisExpanding) return `${base} bg-violet-600 text-white`;
            if (hasExpansion) return `${base} bg-violet-500/30 text-violet-300 border border-violet-500/50`;
            if (isExpandingOther) return `${base} bg-zinc-800/50 text-zinc-500 cursor-not-allowed`;
            return `${base} bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300 border border-zinc-700`;
          };

          return (
            <div className="content-pane mb-6 rounded-lg border-2 border-violet-500/40 bg-violet-950/20 p-5">
              <div className={`flex items-center justify-between ${isMobileDepth ? 'mb-1' : 'mb-3'}`}>
                <div className="flex items-center gap-2">
                  <span className="text-violet-400">✉</span>
                  <span className="text-sm font-medium text-violet-400 uppercase tracking-wider">Introduction</span>
                </div>
                {/* Depth navigation - desktop inline, mobile below */}
                {hasDepthLevels && !letterLoadingDeeper && !isMobileDepth && (
                  <div className="flex gap-1">
                    {['shallow', 'wade', 'swim', 'deep'].map((level) => {
                      const hasContent = level === 'shallow' ? letter.wade : letter[level];
                      const isActive = letterDepth === level;
                      return (
                        <button
                          key={level}
                          onClick={() => {
                            if (level === 'shallow' || level === 'wade') {
                              setLetterDepth(level);
                            } else {
                              loadDeeperLetter(level);
                            }
                          }}
                          disabled={letterLoadingDeeper}
                          className={`px-2 py-0.5 text-xs rounded transition-colors ${
                            isActive
                              ? 'bg-violet-500 text-white'
                              : hasContent
                                ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300'
                                : 'bg-zinc-800/50 text-zinc-600 border border-dashed border-zinc-700 hover:border-violet-500/50'
                          }`}
                        >
                          {level.charAt(0).toUpperCase() + level.slice(1)}
                          {!hasContent && <span className="ml-0.5 opacity-60">+</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
                {letterLoadingDeeper && (
                  <span className="text-xs"><PulsatingLoader color="text-violet-400" /></span>
                )}
              </div>
              {/* Mobile Depth Stepper - under title, left-justified */}
              {hasDepthLevels && isMobileDepth && (
                <div className="mb-3">
                  <MobileDepthStepper
                    currentDepth={letterDepth}
                    onDepthChange={(newDepth) => {
                      if (newDepth === 'shallow' || newDepth === 'wade') {
                        setLetterDepth(newDepth);
                      } else {
                        loadDeeperLetter(newDepth);
                      }
                    }}
                    hasContent={{
                      shallow: !!letter.wade,
                      wade: !!letter.wade,
                      swim: !!letter.swim,
                      deep: !!letter.deep
                    }}
                    accentColor="violet"
                    loading={letterLoadingDeeper}
                  />
                </div>
              )}
              <div className="text-zinc-300 leading-relaxed text-sm space-y-3 mb-4">
                {letterContent ? (
                  letterContent.split(/\n\n+/).filter(p => p.trim()).map((para, i) => (
                    <p key={i} className="whitespace-pre-wrap">
                      {renderWithHotlinks(para.trim(), setSelectedInfo, showTraditional)}
                    </p>
                  ))
                ) : (
                  <span className="text-zinc-500 italic">Introduction content unavailable</span>
                )}
              </div>

              {/* Expansion buttons (excluding architecture - cards have that as own section) */}
              {handleExpand && (
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
                        onClick={(e) => { e.stopPropagation(); handleExpand(letterSectionKey, key); }}
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
                  {renderSynthConverseButton(letterSectionKey, sectionExpansions, isExpanding, 'violet')}
                </div>
              )}

              {/* Converse UI for letter section */}
              {renderSynthConverseUI(letterSectionKey, sectionExpansions, isExpanding, 'violet')}

              {/* Expansion content display - collapsible, never deleted (excludes context arrays) */}
              {Object.entries(sectionExpansions).filter(([k, v]) => typeof v === 'string').map(([expType, content]) => {
                if (!content) return null;
                const expKey = `letter-exp-${expType}`;
                const isExpCollapsed = collapsedSections[expKey] === true;
                return (
                  <div key={expType} className="content-pane mb-3 rounded-lg border border-zinc-700/50 overflow-hidden bg-zinc-900/60">
                    <div
                      className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-zinc-800/50 transition-colors"
                      onClick={() => toggleCollapse(expKey, true)}
                    >
                      <span
                        className={`text-xs transition-transform duration-200 ${isExpCollapsed ? 'text-red-500' : 'text-violet-400'}`}
                        style={{ transform: isExpCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
                      >
                        ▼
                      </span>
                      <span className="text-xs font-medium text-violet-400 uppercase tracking-wider">
                        {EXPANSION_PROMPTS[expType]?.label || expType}
                      </span>
                      {isExpCollapsed && <span className="text-[0.6rem] text-zinc-600 ml-auto">tap to expand</span>}
                    </div>
                    {!isExpCollapsed && (
                      <div className="px-3 pb-3 text-zinc-300 text-sm border-t border-zinc-700/30">
                        {content.split(/\n\n+/).map((para, idx) => (
                          <p key={idx} className="mb-3 last:mb-0">
                            {renderWithHotlinks(para.trim(), setSelectedInfo, showTraditional)}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}


        {/* Parsed Reading Sections (Individual Cards, Path, Words to the Whys) - hide in First Contact mode */}
        {parsedReading && !loading && !parsedReading.firstContact && (
          <div className="space-y-2">
            {/* Explore Mode: Original Input Display (B14) */}
            {spreadType === 'explore' && dtpInput && (
              <div id="whats-active-cards" className="mb-6 rounded-lg border border-amber-600/30 bg-amber-950/20 p-5">
                <div className="text-amber-400 text-xs uppercase tracking-wider mb-2">What's Active</div>
                <div className="text-zinc-300 text-sm leading-relaxed italic mb-3">"{dtpInput}"</div>
                {dtpTokens && dtpTokens.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {dtpTokens.map((token, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          const el = document.getElementById(`content-${i}`);
                          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                        className="px-2 py-1 bg-amber-500/20 text-amber-300 text-xs rounded-full hover:bg-amber-500/40 transition-colors cursor-pointer"
                      >
                        {token}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Regarding header - show question context for non-Explore modes */}
            {spreadType !== 'explore' && question && (
              <div className="text-amber-400 text-sm font-medium uppercase tracking-wider mb-4 ml-1">
                Regarding: {question.length > 60 ? question.substring(0, 60) + '...' : question}
              </div>
            )}

            {/* V1: Expand/Collapse All + Explore count */}
            {parsedReading._onDemand && !parsedReading._isFirstContact && draws?.length > 1 && (
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs text-zinc-600">
                  {Object.values(cardLoaded).filter(Boolean).length} of {draws.length} explored
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      // Expand all: trigger load for any unloaded cards, then expand
                      if (parsedReading._onDemand) {
                        draws.forEach((_, i) => {
                          const card = parsedReading.cards[i];
                          if (card?._notLoaded && !cardLoaded[i] && !cardLoading[i]) {
                            loadCardDepth(i, draws, question, parsedReading.letter, systemPromptCache, card.token, parsedReading.originalInput);
                          }
                        });
                      }
                      setExpandAllCounter(c => c + 1);
                    }}
                    className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    Expand all
                  </button>
                  <span className="text-zinc-700">|</span>
                  <button
                    onClick={() => setCollapseAllCounter(c => c + 1)}
                    className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    Collapse all
                  </button>
                </div>
              </div>
            )}

            {/* Signature Sections with nested Rebalancers - using new DepthCard component */}
            {parsedReading.cards.map((card) => {
              // New structure: card has .surface, .wade, .swim, .architecture, .mirror, .rebalancer
              const cardSectionKey = `card-${card.index}`;
              const isCardLoading = cardLoading[card.index];
              const isCardLoaded = cardLoaded[card.index] || !card._notLoaded;

              // On-demand loading trigger
              const triggerCardLoad = () => {
                if (!isCardLoaded && !isCardLoading && parsedReading._onDemand) {
                  loadCardDepth(card.index, draws, question, parsedReading.letter, systemPromptCache, card.token, parsedReading.originalInput);
                }
              };

              return (
                <div key={`card-group-${card.index}`} id={`content-${card.index}`}>
                  {/* Token label for DTP (Explore) mode - clickable to jump back to What's Active */}
                  {card.token && (
                    <button
                      onClick={() => {
                        const el = document.getElementById('whats-active-cards');
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      className="text-amber-400 text-sm font-medium uppercase tracking-wider mb-2 ml-4 hover:text-amber-300 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <span className="text-xs">↑</span> Regarding: {card.token}
                    </button>
                  )}
                  <DepthCard
                    cardData={card}
                    draw={draws?.[card.index]}
                    isFirstContact={!!parsedReading?._isFirstContact}
                    showTraditional={showTraditional}
                    setSelectedInfo={setSelectedInfo}
                    navigateFromMinimap={navigateFromMinimap}
                    spreadType={spreadType}
                    spreadKey={spreadType === 'reflect' ? reflectSpreadKey : spreadKey}
                    // Default depth setting (shallow or wade) — force wade for First Contact
                    defaultDepth={parsedReading?._isFirstContact ? 'wade' : defaultDepth}
                    // Default expansion setting — force open for First Contact
                    defaultExpanded={parsedReading?._isFirstContact ? true : defaultExpanded}
                    // Expansion props
                    onExpand={handleExpand}
                    expansions={expansions}
                    expanding={expanding}
                    // Thread props — disabled for First Contact
                    threadData={parsedReading?._isFirstContact ? [] : (threadData[cardSectionKey] || [])}
                    threadOperation={parsedReading?._isFirstContact ? undefined : threadOperations[cardSectionKey]}
                    threadContext={parsedReading?._isFirstContact ? undefined : threadContexts[cardSectionKey]}
                    onSetThreadOperation={parsedReading?._isFirstContact ? undefined : ((op) => setThreadOperations(prev => ({ ...prev, [cardSectionKey]: op })))}
                    onSetThreadContext={parsedReading?._isFirstContact ? undefined : ((ctx) => setThreadContexts(prev => ({ ...prev, [cardSectionKey]: ctx })))}
                    onContinueThread={parsedReading?._isFirstContact ? null : (() => continueThread(cardSectionKey))}
                    threadLoading={parsedReading?._isFirstContact ? undefined : threadLoading[cardSectionKey]}
                    collapsedThreads={collapsedThreads}
                    setCollapsedThreads={setCollapsedThreads}
                    question={question}
                    sectionKey={cardSectionKey}
                    // On-demand loading props
                    isLoading={isCardLoading}
                    isNotLoaded={card._notLoaded && !isCardLoaded}
                    onRequestLoad={triggerCardLoad}
                    // Progressive deepening props — disabled for First Contact
                    onLoadDeeper={parsedReading?._isFirstContact ? null : loadDeeperContent}
                    isLoadingDeeper={!!cardLoadingDeeper[card.index]}
                    // V1: Expand/Collapse all triggers
                    expandAllTrigger={expandAllCounter}
                    collapseAllTrigger={collapseAllCounter}
                    // V1: Ariadne Thread
                    onTraceRoot={!parsedReading?._isFirstContact ? () => handleTraceRoot(card.index) : undefined}
                    canTrace={!parsedReading?._isFirstContact && isCardLoaded && !ariadneThread && !ariadneLoading}
                  />
                </div>
              );
            })}

            {/* === ARIADNE THREAD DISPLAY === */}
            {ariadneThread && (
              <div className="mb-6 rounded-lg border-2 border-violet-500/30 bg-violet-950/20 overflow-hidden">
                {/* Thread Header */}
                <div className="px-5 py-3 bg-violet-900/20 border-b border-violet-500/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-violet-400 text-sm font-medium">Ariadne Thread</span>
                      <span className="text-violet-500/60 text-xs">
                        {ariadneThread.steps.length} step{ariadneThread.steps.length !== 1 ? 's' : ''}
                        {ariadneThread.terminated && ` — ${
                          ariadneThread.terminationReason === 'fixed-point' ? 'Fixed Point reached'
                          : ariadneThread.terminationReason === 'cycle' ? 'Cycle detected'
                          : ariadneThread.terminationReason === 'max-steps' ? 'Maximum depth'
                          : 'Stopped'
                        }`}
                      </span>
                    </div>
                    <button
                      onClick={() => setAriadneThread(null)}
                      className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                  {/* Chain visualization */}
                  <div className="flex items-center gap-1 mt-2 flex-wrap text-xs">
                    <span className="text-zinc-400">
                      {getComponent(draws[ariadneThread.sourceCardIndex].transient).name}
                    </span>
                    {ariadneThread.steps.map((step, i) => (
                      <span key={i} className="flex items-center gap-1">
                        <span className="text-violet-500/60">→</span>
                        <span className={step.loaded ? 'text-violet-300' : 'text-zinc-500'}>
                          {ARCHETYPES[step.position].name}
                          {step.isFixedPoint && ' ⊙'}
                        </span>
                      </span>
                    ))}
                    {ariadneThread.terminated && ariadneThread.terminationReason === 'cycle' && (
                      <span className="flex items-center gap-1">
                        <span className="text-violet-500/60">→</span>
                        <span className="text-violet-400/60">
                          {ARCHETYPES[ariadneThread.cycleTarget]?.name} ↩
                        </span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Thread Steps */}
                <div className="divide-y divide-violet-500/10">
                  {ariadneThread.steps.map((step, i) => {
                    const stepTrans = getComponent(step.draw.transient);
                    const stepArch = ARCHETYPES[step.position];
                    const stepStat = STATUSES[step.draw.status];
                    const statusPrefix = stepStat.prefix || 'Balanced';

                    return (
                      <div key={i} className="px-5 py-4">
                        {/* Step header */}
                        <div
                          className="flex items-center gap-2 cursor-pointer group"
                          onClick={() => !step.loaded && handleTraceCardLoad(i)}
                        >
                          <span className="text-violet-500/40 text-xs font-mono">{i + 1}</span>
                          <span className="text-zinc-200 text-sm font-medium">
                            {statusPrefix} {stepTrans.name}
                          </span>
                          <span className="text-zinc-500 text-xs">
                            in {stepArch.name}
                          </span>
                          {step.isFixedPoint && (
                            <span className="text-violet-400 text-[0.65rem] uppercase tracking-wider">Fixed Point</span>
                          )}
                          {!step.loaded && !ariadneLoading && (
                            <span className="ml-auto text-[0.6rem] uppercase tracking-wider text-violet-600/60 group-hover:text-violet-500/80">
                              tap to interpret
                            </span>
                          )}
                          {ariadneLoading && !step.loaded && (
                            <span className="ml-auto text-violet-400 animate-pulse text-xs">interpreting...</span>
                          )}
                        </div>

                        {/* Step interpretation */}
                        {step.loaded && step.interpretation && (
                          <div className="mt-3 text-sm text-zinc-300 leading-relaxed">
                            {step.interpretation.split('\n\n').map((para, pi) => (
                              <p key={pi} className={pi > 0 ? 'mt-3' : ''}>
                                {renderWithHotlinks ? renderWithHotlinks(para) : para}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Thread Controls */}
                <div className="px-5 py-3 bg-violet-900/10 border-t border-violet-500/20 flex gap-2">
                  {!ariadneThread.terminated && (
                    <>
                      <button
                        onClick={handleTraceContinue}
                        disabled={ariadneLoading}
                        className="text-xs px-3 py-1.5 rounded-lg bg-violet-800/40 text-violet-300 hover:bg-violet-700/50 transition-all border border-violet-500/30 disabled:opacity-50"
                      >
                        Continue Thread
                      </button>
                      <button
                        onClick={handleTraceStop}
                        className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800/50 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-all"
                      >
                        Stop Here
                      </button>
                    </>
                  )}
                  {ariadneThread.terminated && ariadneThread.terminationReason === 'fixed-point' && (
                    <span className="text-xs text-violet-400/80">
                      The thread found its ground — {getComponent(ariadneThread.steps[ariadneThread.steps.length - 1].draw.transient).name} in its own archetype position. A natural resting point.
                    </span>
                  )}
                  {ariadneThread.terminated && ariadneThread.terminationReason === 'cycle' && (
                    <span className="text-xs text-violet-400/80">
                      The thread returns to {ARCHETYPES[ariadneThread.cycleTarget]?.name} — a cycle is complete. The pattern loops.
                    </span>
                  )}
                  {ariadneThread.terminated && ariadneThread.terminationReason === 'max-steps' && (
                    <span className="text-xs text-violet-400/80">
                      Maximum thread depth reached. The path continues beyond what we trace here.
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Synthesis Loading Indicator - shows when all cards loaded but synthesis pending */}
            {parsedReading._onDemand && !parsedReading._isFirstContact && synthesisLoading && (
              <div className="mb-6 rounded-lg border-2 border-zinc-600/40 p-5 bg-zinc-900/50">
                <div className="flex items-center gap-3">
                  <span className="text-sm"><PulsatingLoader color="text-amber-400" /></span>
                </div>
              </div>
            )}

            {/* Translation Loading Indicator - shows when persona translation in progress */}
            {translating && (
              <div className="mb-6 rounded-lg border-2 border-amber-600/40 p-5 bg-amber-900/20">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-amber-400 animate-pulse">
                    Finding your {persona.charAt(0).toUpperCase() + persona.slice(1)} voice...
                  </span>
                </div>
              </div>
            )}

            {/* Synthesis Not Yet Available - shows when cards still loading */}
            {parsedReading._onDemand && !parsedReading._isFirstContact && !synthesisLoaded && !synthesisLoading && !parsedReading.summary && (
              <div className="mb-6 rounded-lg border-2 border-zinc-600/40 p-5 bg-zinc-900/30">
                <div className="flex items-center gap-3 text-zinc-500">
                  <span className="text-sm">
                    {(() => {
                      const loadedCount = Object.values(cardLoaded).filter(Boolean).length;
                      const totalCount = draws?.length || 0;
                      if (loadedCount === 0) return 'Tap each signature to explore it. Synthesis appears after all are revealed.';
                      return `${loadedCount} of ${totalCount} explored. Synthesis appears after all signatures are revealed.`;
                    })()}
                  </span>
                </div>
              </div>
            )}

            {/* Path to Balance - HIDDEN: Now shown as "The Invitation" in the Synthesis section */}
            {/* Uses parsedReading.path with depth levels (surface, wade, swim, deep) */}
            {false && (parsedReading.path?.surface || parsedReading.path?.wade || parsedReading.path?.swim || parsedReading.path?.deep || parsedReading.rebalancerSummary) && (() => {
              const path = parsedReading.path || {};
              const hasDepthLevels = path.surface || path.wade || path.swim || path.deep;
              // Use explicit null check to avoid empty string fallback issues
              const getPathContent = () => {
                if (hasDepthLevels) {
                  // Handle shallow depth — use surface if available, else derive from wade
                  if (pathDepth === 'shallow') {
                    if (path.surface) return path.surface;
                    const wadeContent = path.wade || '';
                    if (!wadeContent) return '';
                    const sentences = wadeContent.split(/(?<=[.!?])\s+/);
                    return sentences.slice(0, 3).join(' ');
                  }
                  // Try requested depth first, then fallback in order: wade -> swim -> deep -> surface
                  if (path[pathDepth] != null && path[pathDepth] !== '') return path[pathDepth];
                  if (path.wade != null && path.wade !== '') return path.wade;
                  if (path.swim != null && path.swim !== '') return path.swim;
                  if (path.deep != null && path.deep !== '') return path.deep;
                  return path.surface || '';
                }
                return parsedReading.rebalancerSummary || '';
              };
              const pathContent = getPathContent();
              const pathExpansions = expansions['path'] || {};
              const isPathExpanding = expanding?.section === 'path';
              const isPathCollapsed = collapsedSections['path'] !== false; // true by default
              const isPathArchCollapsed = collapsedSections['path-architecture'] !== false; // collapsed by default

              return (
                <div id="depth-section-path" className="content-pane mb-6 rounded-lg border-2 border-emerald-500/60 overflow-hidden" style={{background: 'linear-gradient(to bottom right, rgba(6, 78, 59, 0.3), rgba(16, 185, 129, 0.15))'}}>
                  <div className="p-5">
                    {/* Path Header - clickable for collapse */}
                    <div
                      className={`flex items-center justify-between cursor-pointer ${!isPathCollapsed ? (isMobileDepth ? 'mb-1' : 'mb-4') : ''}`}
                      onClick={() => toggleCollapse('path', true)}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`text-xs transition-transform duration-200 ${isPathCollapsed ? 'text-red-500' : 'text-emerald-500'}`} style={{ transform: isPathCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>
                          ▼
                        </span>
                        <span className="text-lg">◈</span>
                        <span className="text-sm font-medium text-emerald-400 uppercase tracking-wider">Path to Balance</span>
                      </div>
                      {/* Depth navigation - desktop inline, mobile below */}
                      {hasDepthLevels && !isPathCollapsed && synthesisLoadingSection !== 'path' && !isMobileDepth && (
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          {['shallow', 'wade', 'swim', 'deep'].map((level) => {
                            const hasContent = level === 'shallow' ? path.wade : path[level];
                            const isActive = pathDepth === level;
                            return (
                              <button
                                key={level}
                                onClick={() => {
                                  if (level === 'shallow' || level === 'wade') {
                                    setPathDepth(level);
                                  } else {
                                    loadDeeperSynthesis(level, 'path');
                                  }
                                }}
                                disabled={synthesisLoadingSection === 'path'}
                                className={`px-2 py-0.5 text-xs rounded transition-colors ${
                                  isActive
                                    ? 'bg-emerald-500 text-white'
                                    : hasContent
                                      ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300'
                                      : 'bg-zinc-800/50 text-zinc-600 border border-dashed border-zinc-700 hover:border-emerald-500/50'
                                }`}
                              >
                                {level.charAt(0).toUpperCase() + level.slice(1)}
                                {!hasContent && <span className="ml-0.5 opacity-60">+</span>}
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {synthesisLoadingSection === 'path' && !isPathCollapsed && (
                        <span className="text-xs"><PulsatingLoader color="text-emerald-400" /></span>
                      )}
                    </div>

                    {/* Mobile Depth Stepper - under title, left-justified */}
                    {hasDepthLevels && !isPathCollapsed && isMobileDepth && (
                      <div className="mb-3">
                        <MobileDepthStepper
                          currentDepth={pathDepth}
                          onDepthChange={(newDepth) => {
                            if (newDepth === 'shallow' || newDepth === 'wade') {
                              setPathDepth(newDepth);
                            } else {
                              loadDeeperSynthesis(newDepth, 'path');
                            }
                          }}
                          hasContent={{
                            shallow: !!path.wade,
                            wade: !!path.wade,
                            swim: !!path.swim,
                            deep: !!path.deep
                          }}
                          accentColor="emerald"
                          loading={synthesisLoadingSection === 'path'}
                        />
                      </div>
                    )}

                    {/* Path Content - collapsible */}
                    {!isPathCollapsed && (
                      <>
                        <div className="text-zinc-300 leading-relaxed text-sm space-y-3 mb-4">
                          {pathContent ? (
                            ensureParagraphBreaks(pathContent).split(/\n\n+/).filter(p => p.trim()).map((para, i) => (
                              <p key={i} className="whitespace-pre-wrap">
                                {renderWithHotlinks(para.trim(), setSelectedInfo, showTraditional)}
                              </p>
                            ))
                          ) : (
                            <span className="text-zinc-500 italic">Path content unavailable</span>
                          )}
                        </div>

                        {/* Path Architecture Box - collapsed by default */}
                        {path.architecture && (
                          <div className="mb-4 border border-emerald-700/40 rounded-lg overflow-hidden bg-emerald-950/20">
                            <div
                              className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-emerald-900/20"
                              onClick={(e) => { e.stopPropagation(); toggleCollapse('path-architecture', true); }}
                            >
                              <span className={`text-[0.6rem] transition-transform duration-200 ${isPathArchCollapsed ? 'text-red-500' : 'text-emerald-500'}`} style={{ transform: isPathArchCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>▼</span>
                              <span className="text-xs font-medium text-emerald-500/70 uppercase tracking-wider">Architecture</span>
                            </div>
                            {!isPathArchCollapsed && (
                              <div className="px-3 pb-3 text-xs text-zinc-400 font-mono">
                                {/* Split on newlines and render each line with hotlinks */}
                                {path.architecture.split('\n').map((line, i) => (
                                  <div key={i} className={line.trim() ? 'mb-1.5' : 'mb-2'}>
                                    {line.trim() ? renderWithHotlinks(line, setSelectedInfo, showTraditional) : null}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Path Expansion Buttons (excluding architecture - has own section) */}
                        <div className="flex gap-2 flex-wrap">
                          {Object.entries(EXPANSION_PROMPTS)
                            .filter(([key, v]) => key !== 'architecture' && !v.hasInput)
                            .map(([key, { label }]) => {
                            const isThisExpanding = isPathExpanding && expanding?.type === key;
                            const hasExpansion = !!pathExpansions[key];
                            const isExpandingOther = expanding && !isThisExpanding;

                            return (
                              <button
                                key={key}
                                onClick={(e) => { e.stopPropagation(); handleExpand('path', key); }}
                                disabled={expanding}
                                className={`text-xs px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                                  hasExpansion
                                    ? 'bg-emerald-800/50 text-emerald-200 border border-emerald-600/50'
                                    : 'bg-zinc-800/50 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                                } ${isExpandingOther ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                {isThisExpanding && (
                                  <span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></span>
                                )}
                                {label}
                              </button>
                            );
                          })}
                          {renderSynthConverseButton('path', pathExpansions, isPathExpanding, 'emerald')}
                        </div>

                        {/* Converse UI */}
                        {renderSynthConverseUI('path', pathExpansions, isPathExpanding, 'emerald')}

                        {/* Path Expansion Content */}
                        {Object.entries(pathExpansions).filter(([k, v]) => typeof v === 'string').map(([expType, expContent]) => (
                          <div key={expType} className="mt-4 pt-4 border-t border-emerald-700/50">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-xs uppercase tracking-wider text-emerald-500/70">
                                {EXPANSION_PROMPTS[expType]?.label}
                              </span>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleExpand('path', expType, true); }}
                                className="text-xs text-zinc-600 hover:text-zinc-400"
                              >
                                ×
                              </button>
                            </div>
                            <div className="text-sm leading-relaxed text-zinc-400 space-y-3">
                              {expContent.split(/\n\n+/).filter(p => p.trim()).map((para, i) => (
                                <p key={i} className="whitespace-pre-wrap">
                                  {renderWithHotlinks(para.trim(), setSelectedInfo, showTraditional)}
                                </p>
                              ))}
                            </div>
                          </div>
                        ))}

                        {/* Path Reflect/Forge Input UI */}
                        <div className="mt-4 pt-4 border-t border-emerald-700/30">
                          {!threadOperations['path'] && (
                            <div className="flex justify-center gap-3">
                              <button
                                onClick={(e) => { e.stopPropagation(); setThreadOperations(prev => ({ ...prev, path: 'reflect' })); }}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:text-zinc-200 hover:border-zinc-600 flex items-center gap-1.5"
                              >
                                <span className="text-[0.5rem] text-red-500">▶</span> Reflect
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setThreadOperations(prev => ({ ...prev, path: 'forge' })); }}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:text-zinc-200 hover:border-zinc-600 flex items-center gap-1.5"
                              >
                                <span className="text-[0.5rem] text-red-500">▶</span> Forge
                              </button>
                            </div>
                          )}
                          {threadOperations['path'] && (
                            <div className="max-w-sm mx-auto">
                              <div className="flex justify-center gap-3 mb-3">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setThreadOperations(prev => ({ ...prev, path: 'reflect' })); }}
                                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${threadOperations['path'] === 'reflect' ? 'bg-sky-900/60 text-sky-300 border-2 border-sky-500/60' : 'bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:text-zinc-200'}`}
                                >↩ Reflect</button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setThreadOperations(prev => ({ ...prev, path: 'forge' })); }}
                                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${threadOperations['path'] === 'forge' ? 'bg-orange-900/60 text-orange-300 border-2 border-orange-500/60' : 'bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:text-zinc-200'}`}
                                >⚡ Forge</button>
                                <button onClick={(e) => { e.stopPropagation(); setThreadOperations(prev => ({ ...prev, path: null })); }} className="px-2 py-2 rounded-lg text-xs text-zinc-500 hover:text-zinc-300">✕</button>
                              </div>
                              <textarea
                                value={threadContexts['path'] || ''}
                                onChange={(e) => setThreadContexts(prev => ({ ...prev, path: e.target.value }))}
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey && threadOperations['path'] && !threadLoading['path']) {
                                    e.preventDefault();
                                    continueThread('path');
                                  }
                                }}
                                placeholder={threadOperations['path'] === 'reflect' ? "What are you inquiring about?" : "What are you declaring?"}
                                rows={2}
                                className="w-full bg-zinc-900/50 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 resize-none mb-3"
                              />
                              <button
                                onClick={(e) => { e.stopPropagation(); continueThread('path'); }}
                                disabled={!threadOperations['path'] || threadLoading['path']}
                                className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${threadOperations['path'] && !threadLoading['path'] ? 'bg-[#021810] text-[#f59e0b] hover:bg-[#052e23] border border-emerald-700/50' : 'bg-zinc-900 text-zinc-600 cursor-not-allowed'}`}
                              >
                                {threadLoading['path'] ? <><span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></span>Encountering...</> : 'Continue'}
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Thread Results for Path */}
                        {threadData['path'] && threadData['path'].length > 0 && (
                          <div className="border-t border-emerald-700/50 mt-5 pt-5 space-y-4" data-thread-key="path">
                            {threadData['path'].map((threadItem, threadIndex) => {
                              const isReflect = threadItem.operation === 'reflect';
                              const trans = getComponent(threadItem.draw.transient);
                              const stat = STATUSES[threadItem.draw.status];
                              const statusPrefix = stat.prefix || 'Balanced';

                              // Get correction info for imbalanced cards
                              const itemIsImbalanced = threadItem.draw.status !== 1;
                              const itemCorrection = itemIsImbalanced ? getFullCorrection(threadItem.draw.transient, threadItem.draw.status, trans) : null;
                              const itemCorrectionTargetId = itemIsImbalanced ? getCorrectionTargetId(itemCorrection, trans) : null;
                              const itemCorrectionCard = itemCorrectionTargetId !== null ? getComponent(itemCorrectionTargetId) : null;
                              const itemHomeArchetype = getHomeArchetype(threadItem.draw.transient);
                              const itemCorrectionArchetype = itemCorrectionTargetId !== null ? getHomeArchetype(itemCorrectionTargetId) : null;
                              const itemCardType = getCardType(threadItem.draw.transient);
                              const itemBoundIsInner = itemCardType === 'bound' && trans?.number <= 5;
                              const itemCorrectionCardType = itemCorrectionTargetId !== null ? getCardType(itemCorrectionTargetId) : null;
                              const itemCorrectionBoundIsInner = itemCorrectionCardType === 'bound' && itemCorrectionCard?.number <= 5;

                              return (
                                <div key={threadIndex} className={`thread-item rounded-lg p-4 ${isReflect ? 'border border-sky-500/30 bg-sky-950/20' : 'border border-orange-500/30 bg-orange-950/20'}`}>
                                  <div className="flex items-center gap-2 mb-3">
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${isReflect ? 'bg-sky-500/20 text-sky-400' : 'bg-orange-500/20 text-orange-400'}`}>
                                      {isReflect ? '↩ Reflect' : '⚡ Forge'}
                                    </span>
                                  </div>
                                  {threadItem.context && (
                                    <div className={`text-xs italic mb-3 pl-3 border-l-2 ${isReflect ? 'border-sky-500/50 text-sky-300/70' : 'border-orange-500/50 text-orange-300/70'}`}>
                                      "{threadItem.context}"
                                    </div>
                                  )}
                                  {/* Card image and minimap for thread draw */}
                                  <div className="flex items-center justify-center gap-4 mb-3">
                                    <div className="flex flex-col items-center">
                                      <CardImage
                                        transient={threadItem.draw.transient}
                                        status={threadItem.draw.status}
                                        cardName={trans?.name}
                                        size="default"
                                        showFrame={true}
                                        onImageClick={() => openCardDetail(threadItem.draw.transient)}
                                      />
                                      <span className="cursor-pointer hover:underline decoration-dotted underline-offset-2 text-xs text-amber-300/90 mt-1 text-center" onClick={() => setSelectedInfo({ type: 'card', id: threadItem.draw.transient, data: trans })}>
                                        {trans?.name}
                                      </span>
                                    </div>

                                    {/* Minimap with correction path for imbalanced cards */}
                                    {itemIsImbalanced && itemCorrectionArchetype !== null && (
                                      <div className="flex flex-col items-center">
                                        <span className="text-xs mb-1 text-emerald-400/60">Path to Balance</span>
                                        <div
                                          className="rounded-lg flex items-center justify-center overflow-hidden"
                                          style={{
                                            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 46, 22, 0.3) 100%)',
                                            border: '1px solid rgba(16, 185, 129, 0.3)',
                                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3), inset 0 0 20px rgba(16, 185, 129, 0.1)',
                                            width: '120px',
                                            height: '120px'
                                          }}
                                        >
                                          <Minimap
                                            fromId={itemHomeArchetype}
                                            toId={itemCorrectionArchetype}
                                            size="md"
                                            singleMode={true}
                                            fromCardType={itemCardType}
                                            boundIsInner={itemBoundIsInner}
                                            toCardType={itemCorrectionCardType}
                                            toBoundIsInner={itemCorrectionBoundIsInner}
                                          />
                                        </div>
                                        <span className="cursor-pointer hover:underline decoration-dotted underline-offset-2 text-xs text-emerald-300 mt-1 text-center" onClick={() => setSelectedInfo({ type: 'card', id: itemCorrectionTargetId, data: itemCorrectionCard })}>
                                          {itemCorrectionCard?.name}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center justify-center gap-2 mb-2">
                                    <span
                                      className={`text-xs px-2 py-0.5 rounded-full cursor-pointer hover:ring-1 hover:ring-white/30 ${STATUS_COLORS[threadItem.draw.status]}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedInfo({ type: 'status', id: threadItem.draw.status, data: STATUS_INFO[threadItem.draw.status] });
                                      }}
                                    >
                                      {stat.name}
                                    </span>
                                    <span className="text-sm font-medium text-zinc-200">
                                      <span
                                        className="cursor-pointer hover:underline decoration-dotted underline-offset-2"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedInfo({ type: 'status', id: threadItem.draw.status, data: STATUS_INFO[threadItem.draw.status] });
                                        }}
                                      >
                                        {statusPrefix}
                                      </span>
                                      {statusPrefix && ' '}
                                      <span
                                        className="cursor-pointer hover:underline decoration-dotted underline-offset-2 text-amber-300/90"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedInfo({ type: 'card', id: threadItem.draw.transient, data: getComponent(threadItem.draw.transient) });
                                        }}
                                      >
                                        {trans.name}
                                      </span>
                                    </span>
                                  </div>
                                  {showTraditional && trans && (
                                    <div className="text-xs text-zinc-500 mb-2">{trans.traditional}</div>
                                  )}
                                  <div className="text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap">
                                    {renderWithHotlinks(threadItem.interpretation, setSelectedInfo, showTraditional)}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* FULL ARCHITECTURE - Global reading architecture, collapsed by default */}
            {parsedReading.fullArchitecture && (
              <div className="mb-6 rounded-lg border-2 border-violet-500/40 overflow-hidden" style={{background: 'linear-gradient(to bottom right, rgba(76, 29, 149, 0.2), rgba(139, 92, 246, 0.1))'}}>
                <div className="p-5">
                  <div
                    className={`flex items-center justify-between cursor-pointer ${collapsedSections['full-architecture'] === false ? 'mb-4' : ''}`}
                    onClick={() => toggleCollapse('full-architecture', true)}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-xs transition-transform duration-200 ${collapsedSections['full-architecture'] !== false ? 'text-red-500' : 'text-violet-500'}`} style={{ transform: collapsedSections['full-architecture'] !== false ? 'rotate(-90deg)' : 'rotate(0deg)' }}>
                        ▼
                      </span>
                      <span className="text-lg">⚙</span>
                      <span className="text-sm font-medium text-violet-400 uppercase tracking-wider">Full Architecture</span>
                    </div>
                  </div>

                  {collapsedSections['full-architecture'] === false && (
                    <div className="text-zinc-300 leading-relaxed whitespace-pre-wrap text-sm font-mono">
                      {renderWithHotlinks(parsedReading.fullArchitecture, setSelectedInfo, showTraditional)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Words to the Whys is now per-card inside THE WHY group in DepthCard */}

            {/* Letter now renders at top of reading - see line ~2419 */}

            {/* ═══════════════════════════════════════════════════════════════════
                SYNTHESIS SECTION - The closing statement that ties everything together
                Contains: Question/Input, The Reading, Why This Appeared, The Invitation
                Shows when we have content (not gated by synthesisLoaded anymore)
                ═══════════════════════════════════════════════════════════════════ */}
            {parsedReading && !loading && (() => {
              const isSynthesisCollapsed = collapsedSections['synthesis'] === true; // expanded by default
              return (
              <div className="content-pane mt-8 rounded-lg border-2 border-amber-500/40 overflow-hidden" style={{background: 'linear-gradient(to bottom, rgba(30, 20, 10, 0.6), rgba(20, 15, 10, 0.8))'}}>
                {/* Synthesis Header - clickable for collapse */}
                <div 
                  className="px-6 py-4 border-b border-amber-500/20 bg-amber-950/30 cursor-pointer hover:bg-amber-950/40 transition-colors"
                  onClick={() => toggleCollapse('synthesis', false)}
                >
                  <div className="flex items-center justify-center gap-3">
                    <span className={`text-sm transition-transform duration-200 ${isSynthesisCollapsed ? 'text-red-500' : 'text-amber-500'}`} style={{ transform: isSynthesisCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>▼</span>
                    <span className="text-xl">◈</span>
                    <span className="text-lg font-medium text-amber-400 uppercase tracking-wider">Synthesis</span>
                  </div>
                </div>

                {!isSynthesisCollapsed && (
                <div className="p-6 space-y-6">
                  {/* ─────────────────────────────────────────────────────────────────
                      SECTION 1: Your Question / Your Draw / Your Declaration / What's Active
                      ───────────────────────────────────────────────────────────────── */}
                  <div className="pb-5 border-b border-zinc-700/50">
                    <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
                      {spreadType === 'reflect' ? 'Your Question' :
                       spreadType === 'discover' ? (question ? 'Your Intention' : 'Your Draw') :
                       spreadType === 'forge' ? 'Your Declaration' :
                       'What\'s Active'}
                    </div>
                    <div className="text-zinc-200 text-sm leading-relaxed">
                      {spreadType === 'discover' ? (
                        question ? `"${question}"` : `A blind draw of ${draws.length} card${draws.length > 1 ? 's' : ''}`
                      ) : spreadType === 'explore' ? (
                        <div>
                          <div className="mb-2">{parsedReading?.originalInput || question}</div>
                          {dtpTokens && dtpTokens.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {dtpTokens.map((token, i) => (
                                <span key={i} className="px-2 py-0.5 rounded-full bg-amber-900/30 text-amber-400/80 text-xs border border-amber-500/20">
                                  {token}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        `"${question}"`
                      )}
                    </div>
                  </div>

                  {/* ─────────────────────────────────────────────────────────────────
                      SECTION 2: The Reading (Summary)
                      ───────────────────────────────────────────────────────────────── */}
                  {parsedReading.summary && (() => {
                    const summary = parsedReading.summary;
                    const hasDepthLevels = typeof summary === 'object' && (summary.wade || summary.swim || summary.deep);
                    const summaryContent = getSummaryContent(summary, summaryDepth);
                    const summaryExpansions = expansions['summary'] || {};
                    const isSummaryExpanding = expanding?.section === 'summary';
                    const isSynthSummaryCollapsed = collapsedSections['synth-reading'] === true; // expanded by default

                    return (
                      <div id="depth-synth-reading" className="pb-5 border-b border-zinc-700/50">
                        {/* Header */}
                        <div
                          className={`flex items-center justify-between cursor-pointer ${!isSynthSummaryCollapsed ? 'mb-3' : ''}`}
                          onClick={() => toggleCollapse('synth-reading', false)}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`text-xs transition-transform duration-200 ${isSynthSummaryCollapsed ? 'text-red-500' : 'text-amber-500'}`} style={{ transform: isSynthSummaryCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>▼</span>
                            <span className="text-sm font-medium text-amber-400 uppercase tracking-wider">The Reading</span>
                          </div>
                          {/* Depth navigation */}
                          {hasDepthLevels && !isSynthSummaryCollapsed && synthesisLoadingSection !== 'summary' && !isMobileDepth && (
                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                              {['shallow', 'wade', 'swim', 'deep'].map((level) => {
                                const hasContent = level === 'shallow' ? summary.wade : summary[level];
                                const isActive = summaryDepth === level;
                                return (
                                  <button
                                    key={level}
                                    onClick={() => level === 'shallow' || level === 'wade' ? setSummaryDepth(level) : loadDeeperSynthesis(level, 'summary')}
                                    disabled={synthesisLoadingSection === 'summary'}
                                    className={`px-2 py-0.5 text-xs rounded transition-colors ${isActive ? 'bg-amber-500 text-white' : hasContent ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-zinc-800/50 text-zinc-600 border border-dashed border-zinc-700'}`}
                                  >
                                    {level.charAt(0).toUpperCase() + level.slice(1)}{!hasContent && <span className="ml-0.5 opacity-60">+</span>}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          {synthesisLoadingSection === 'summary' && !isSynthSummaryCollapsed && <span className="text-xs"><PulsatingLoader color="text-amber-400" /></span>}
                        </div>
                        {/* Mobile Depth Stepper */}
                        {hasDepthLevels && !isSynthSummaryCollapsed && isMobileDepth && (
                          <div className="mb-3">
                            <MobileDepthStepper currentDepth={summaryDepth} onDepthChange={(d) => d === 'shallow' || d === 'wade' ? setSummaryDepth(d) : loadDeeperSynthesis(d, 'summary')} hasContent={{shallow: !!summary.wade, wade: !!summary.wade, swim: !!summary.swim, deep: !!summary.deep}} accentColor="amber" loading={synthesisLoadingSection === 'summary'} />
                          </div>
                        )}
                        {/* Content */}
                        {!isSynthSummaryCollapsed && (
                          <>
                            <div className="text-zinc-300 leading-relaxed text-sm space-y-3 mb-3">
                              {summaryContent ? ensureParagraphBreaks(summaryContent).split(/\n\n+/).filter(p => p.trim()).map((para, i) => (
                                <p key={i} className="whitespace-pre-wrap">{renderWithHotlinks(para.trim(), setSelectedInfo, showTraditional)}</p>
                              )) : <span className="text-zinc-500 italic">Loading...</span>}
                            </div>
                            {/* Expansion Buttons */}
                            <div className="flex gap-2 flex-wrap">
                              {Object.entries(EXPANSION_PROMPTS).filter(([k, v]) => k !== 'architecture' && !v.hasInput).map(([key, { label }]) => (
                                <button key={key} onClick={(e) => { e.stopPropagation(); handleExpand('summary', key); }} disabled={isSummaryExpanding}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${summaryExpansions[key] ? 'bg-amber-900/40 text-amber-300 border border-amber-500/40' : isSummaryExpanding && expanding?.type === key ? 'bg-zinc-800 text-zinc-400 border border-zinc-700 animate-pulse' : 'bg-zinc-800/50 text-zinc-500 border border-zinc-700/50 hover:text-zinc-300'}`}>
                                  {isSummaryExpanding && expanding?.type === key ? 'Expanding...' : label}
                                </button>
                              ))}
                              {renderSynthConverseButton('summary', summaryExpansions, isSummaryExpanding, 'amber')}
                            </div>
                            {/* Converse UI */}
                            {renderSynthConverseUI('summary', summaryExpansions, isSummaryExpanding, 'amber')}
                            {/* Expansion Results */}
                            {Object.entries(summaryExpansions).filter(([k]) => typeof summaryExpansions[k] === 'string').map(([expKey, content]) => (
                              <div key={expKey} className="mt-4 pt-4 border-t border-amber-700/30">
                                <div className="text-xs font-medium text-amber-400/70 uppercase tracking-wider mb-2">{EXPANSION_PROMPTS[expKey]?.label || expKey}</div>
                                <div className="text-sm text-zinc-300 leading-relaxed">{content.split(/\n\n+/).filter(p => p.trim()).map((para, i) => <p key={i} className="mb-3 last:mb-0">{renderWithHotlinks(para.trim(), setSelectedInfo, showTraditional)}</p>)}</div>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    );
                  })()}

                  {/* ─────────────────────────────────────────────────────────────────
                      SECTION 3: Why This Reading Appeared
                      ───────────────────────────────────────────────────────────────── */}
                  {parsedReading.whyAppeared && (() => {
                    const whyAppeared = parsedReading.whyAppeared;
                    const hasDepthLevels = typeof whyAppeared === 'object' && (whyAppeared.wade || whyAppeared.swim || whyAppeared.deep);
                    const whyAppearedContent = getWhyAppearedContent(whyAppeared, whyAppearedDepth);
                    const whyExpansions = expansions['whyAppeared'] || {};
                    const isWhyExpanding = expanding?.section === 'whyAppeared';
                    const isSynthWhyCollapsed = collapsedSections['synth-why'] === true; // expanded by default

                    if (!whyAppearedContent) return null;

                    return (
                      <div id="depth-synth-why" className="pb-5 border-b border-zinc-700/50">
                        {/* Header */}
                        <div
                          className={`flex items-center justify-between cursor-pointer ${!isSynthWhyCollapsed ? 'mb-3' : ''}`}
                          onClick={() => toggleCollapse('synth-why', false)}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`text-xs transition-transform duration-200 ${isSynthWhyCollapsed ? 'text-red-500' : 'text-cyan-500'}`} style={{ transform: isSynthWhyCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>▼</span>
                            <span className="text-sm font-medium text-cyan-400 uppercase tracking-wider">Why This Reading Appeared</span>
                          </div>
                          {/* Depth navigation */}
                          {hasDepthLevels && !isSynthWhyCollapsed && synthesisLoadingSection !== 'whyAppeared' && !isMobileDepth && (
                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                              {['shallow', 'wade', 'swim', 'deep'].map((level) => {
                                const hasContent = level === 'shallow' ? whyAppeared.wade : whyAppeared[level];
                                const isActive = whyAppearedDepth === level;
                                return (
                                  <button
                                    key={level}
                                    onClick={() => level === 'shallow' || level === 'wade' ? setWhyAppearedDepth(level) : loadDeeperSynthesis(level, 'whyAppeared')}
                                    disabled={synthesisLoadingSection === 'whyAppeared'}
                                    className={`px-2 py-0.5 text-xs rounded transition-colors ${isActive ? 'bg-cyan-500 text-white' : hasContent ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-zinc-800/50 text-zinc-600 border border-dashed border-zinc-700'}`}
                                  >
                                    {level.charAt(0).toUpperCase() + level.slice(1)}{!hasContent && <span className="ml-0.5 opacity-60">+</span>}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          {synthesisLoadingSection === 'whyAppeared' && !isSynthWhyCollapsed && <span className="text-xs"><PulsatingLoader color="text-cyan-400" /></span>}
                        </div>
                        {/* Mobile Depth Stepper */}
                        {hasDepthLevels && !isSynthWhyCollapsed && isMobileDepth && (
                          <div className="mb-3">
                            <MobileDepthStepper currentDepth={whyAppearedDepth} onDepthChange={(d) => d === 'shallow' || d === 'wade' ? setWhyAppearedDepth(d) : loadDeeperSynthesis(d, 'whyAppeared')} hasContent={{shallow: !!whyAppeared.wade, wade: !!whyAppeared.wade, swim: !!whyAppeared.swim, deep: !!whyAppeared.deep}} accentColor="cyan" loading={synthesisLoadingSection === 'whyAppeared'} />
                          </div>
                        )}
                        {/* Content */}
                        {!isSynthWhyCollapsed && (
                          <>
                            <div className="text-zinc-300 leading-relaxed text-sm space-y-3 mb-3">
                              {whyAppearedContent ? ensureParagraphBreaks(whyAppearedContent).split(/\n\n+/).filter(p => p.trim()).map((para, i) => (
                                <p key={i} className="whitespace-pre-wrap">{renderWithHotlinks(para.trim(), setSelectedInfo, showTraditional)}</p>
                              )) : <span className="text-zinc-500 italic">Loading...</span>}
                            </div>
                            {/* Expansion Buttons */}
                            <div className="flex gap-2 flex-wrap">
                              {Object.entries(EXPANSION_PROMPTS).filter(([k, v]) => k !== 'architecture' && !v.hasInput).map(([key, { label }]) => (
                                <button key={key} onClick={(e) => { e.stopPropagation(); handleExpand('whyAppeared', key); }} disabled={isWhyExpanding}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${whyExpansions[key] ? 'bg-cyan-900/40 text-cyan-300 border border-cyan-500/40' : isWhyExpanding && expanding?.type === key ? 'bg-zinc-800 text-zinc-400 border border-zinc-700 animate-pulse' : 'bg-zinc-800/50 text-zinc-500 border border-zinc-700/50 hover:text-zinc-300'}`}>
                                  {isWhyExpanding && expanding?.type === key ? 'Expanding...' : label}
                                </button>
                              ))}
                              {renderSynthConverseButton('whyAppeared', whyExpansions, isWhyExpanding, 'cyan')}
                            </div>
                            {/* Converse UI */}
                            {renderSynthConverseUI('whyAppeared', whyExpansions, isWhyExpanding, 'cyan')}
                            {/* Expansion Results */}
                            {Object.entries(whyExpansions).filter(([k]) => typeof whyExpansions[k] === 'string').map(([expKey, content]) => (
                              <div key={expKey} className="mt-4 pt-4 border-t border-cyan-700/30">
                                <div className="text-xs font-medium text-cyan-400/70 uppercase tracking-wider mb-2">{EXPANSION_PROMPTS[expKey]?.label || expKey}</div>
                                <div className="text-sm text-zinc-300 leading-relaxed">{content.split(/\n\n+/).filter(p => p.trim()).map((para, i) => <p key={i} className="mb-3 last:mb-0">{renderWithHotlinks(para.trim(), setSelectedInfo, showTraditional)}</p>)}</div>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    );
                  })()}

                  {/* ─────────────────────────────────────────────────────────────────
                      SECTION 4: The Invitation (Path to Balance)
                      ───────────────────────────────────────────────────────────────── */}
                  {parsedReading.path && (() => {
                    const path = parsedReading.path;
                    const hasDepthLevels = path.wade || path.swim || path.deep;
                    const getPathContent = () => {
                      if (pathDepth === 'shallow') {
                        if (path.surface) return path.surface;
                        const wadeContent = path.wade || '';
                        if (!wadeContent) return '';
                        const sentences = wadeContent.split(/(?<=[.!?])\s+/);
                        return sentences.slice(0, 3).join(' ');
                      }
                      if (path[pathDepth]) return path[pathDepth];
                      return path.wade || path.swim || path.deep || '';
                    };
                    const pathContent = getPathContent();
                    const pathExpansions = expansions['path'] || {};
                    const isPathExpanding = expanding?.section === 'path';
                    const isSynthPathCollapsed = collapsedSections['synth-invitation'] === true; // expanded by default

                    return (
                      <div id="depth-synth-path" className="pb-5">
                        {/* Header */}
                        <div
                          className={`flex items-center justify-between cursor-pointer ${!isSynthPathCollapsed ? 'mb-3' : ''}`}
                          onClick={() => toggleCollapse('synth-invitation', false)}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`text-xs transition-transform duration-200 ${isSynthPathCollapsed ? 'text-red-500' : 'text-emerald-500'}`} style={{ transform: isSynthPathCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>▼</span>
                            <span className="text-sm font-medium text-emerald-400 uppercase tracking-wider">The Invitation</span>
                          </div>
                          {/* Depth navigation */}
                          {hasDepthLevels && !isSynthPathCollapsed && synthesisLoadingSection !== 'path' && !isMobileDepth && (
                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                              {['shallow', 'wade', 'swim', 'deep'].map((level) => {
                                const hasContent = level === 'shallow' ? path.wade : path[level];
                                const isActive = pathDepth === level;
                                return (
                                  <button
                                    key={level}
                                    onClick={() => level === 'shallow' || level === 'wade' ? setPathDepth(level) : loadDeeperSynthesis(level, 'path')}
                                    disabled={synthesisLoadingSection === 'path'}
                                    className={`px-2 py-0.5 text-xs rounded transition-colors ${isActive ? 'bg-emerald-500 text-white' : hasContent ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-zinc-800/50 text-zinc-600 border border-dashed border-zinc-700'}`}
                                  >
                                    {level.charAt(0).toUpperCase() + level.slice(1)}{!hasContent && <span className="ml-0.5 opacity-60">+</span>}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          {synthesisLoadingSection === 'path' && !isSynthPathCollapsed && <span className="text-xs"><PulsatingLoader color="text-emerald-400" /></span>}
                        </div>
                        {/* Mobile Depth Stepper */}
                        {hasDepthLevels && !isSynthPathCollapsed && isMobileDepth && (
                          <div className="mb-3">
                            <MobileDepthStepper currentDepth={pathDepth} onDepthChange={(d) => d === 'shallow' || d === 'wade' ? setPathDepth(d) : loadDeeperSynthesis(d, 'path')} hasContent={{shallow: !!path.wade, wade: !!path.wade, swim: !!path.swim, deep: !!path.deep}} accentColor="emerald" loading={synthesisLoadingSection === 'path'} />
                          </div>
                        )}
                        {/* Content */}
                        {!isSynthPathCollapsed && (
                          <>
                            <div className="text-zinc-300 leading-relaxed text-sm space-y-3 mb-3">
                              {pathContent ? ensureParagraphBreaks(pathContent).split(/\n\n+/).filter(p => p.trim()).map((para, i) => (
                                <p key={i} className="whitespace-pre-wrap">{renderWithHotlinks(para.trim(), setSelectedInfo, showTraditional)}</p>
                              )) : <span className="text-zinc-500 italic">Loading...</span>}
                            </div>
                            {/* Expansion Buttons */}
                            <div className="flex gap-2 flex-wrap">
                              {Object.entries(EXPANSION_PROMPTS).filter(([k, v]) => k !== 'architecture' && !v.hasInput).map(([key, { label }]) => (
                                <button key={key} onClick={(e) => { e.stopPropagation(); handleExpand('path', key); }} disabled={isPathExpanding}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${pathExpansions[key] ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-500/40' : isPathExpanding && expanding?.type === key ? 'bg-zinc-800 text-zinc-400 border border-zinc-700 animate-pulse' : 'bg-zinc-800/50 text-zinc-500 border border-zinc-700/50 hover:text-zinc-300'}`}>
                                  {isPathExpanding && expanding?.type === key ? 'Expanding...' : label}
                                </button>
                              ))}
                              {renderSynthConverseButton('path', pathExpansions, isPathExpanding, 'emerald')}
                            </div>
                            {/* Converse UI */}
                            {renderSynthConverseUI('path', pathExpansions, isPathExpanding, 'emerald')}
                            {/* Expansion Results */}
                            {Object.entries(pathExpansions).filter(([k]) => typeof pathExpansions[k] === 'string').map(([expKey, content]) => (
                              <div key={expKey} className="mt-4 pt-4 border-t border-emerald-700/30">
                                <div className="text-xs font-medium text-emerald-400/70 uppercase tracking-wider mb-2">{EXPANSION_PROMPTS[expKey]?.label || expKey}</div>
                                <div className="text-sm text-zinc-300 leading-relaxed">{content.split(/\n\n+/).filter(p => p.trim()).map((para, i) => <p key={i} className="mb-3 last:mb-0">{renderWithHotlinks(para.trim(), setSelectedInfo, showTraditional)}</p>)}</div>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    );
                  })()}

                  {/* ─────────────────────────────────────────────────────────────────
                      Thread Continuation - Reflect / Forge buttons at bottom of Synthesis
                      ───────────────────────────────────────────────────────────────── */}
                  <div className="pt-5 border-t border-zinc-700/50">
                    {/* Collapsed state: show [▶ Reflect] [▶ Forge] */}
                    {!threadOperations['unified'] && (
                      <div className="flex justify-center gap-3">
                        <button
                          onClick={() => setThreadOperations(prev => ({ ...prev, unified: 'reflect' }))}
                          className="px-4 py-2 rounded-lg text-sm font-medium transition-all bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:text-zinc-200 hover:border-zinc-600 flex items-center gap-2"
                        >
                          <span className="text-[0.625rem] text-red-500">▶</span> Reflect
                        </button>
                        <button
                          onClick={() => setThreadOperations(prev => ({ ...prev, unified: 'forge' }))}
                          className="px-4 py-2 rounded-lg text-sm font-medium transition-all bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:text-zinc-200 hover:border-zinc-600 flex items-center gap-2"
                        >
                          <span className="text-[0.625rem] text-red-500">▶</span> Forge
                        </button>
                      </div>
                    )}

                    {/* Expanded state: full panel */}
                    {threadOperations['unified'] && (
                      <div className="max-w-sm mx-auto">
                        <div className="flex justify-center gap-4 mb-4">
                          <button
                            onClick={() => setThreadOperations(prev => ({ ...prev, unified: 'reflect' }))}
                            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${threadOperations['unified'] === 'reflect' ? 'bg-sky-900/60 text-sky-300 border-2 border-sky-500/60' : 'bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:text-zinc-200'}`}
                          >↩ Reflect</button>
                          <button
                            onClick={() => setThreadOperations(prev => ({ ...prev, unified: 'forge' }))}
                            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${threadOperations['unified'] === 'forge' ? 'bg-orange-900/60 text-orange-300 border-2 border-orange-500/60' : 'bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:text-zinc-200'}`}
                          >⚡ Forge</button>
                        </div>
                        <textarea
                          value={threadContexts['unified'] || ''}
                          onChange={(e) => setThreadContexts(prev => ({ ...prev, unified: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && threadOperations['unified'] && !threadLoading['unified']) { e.preventDefault(); continueThread('unified'); }}}
                          placeholder="What are you exploring or creating?"
                          rows={2}
                          className="w-full bg-zinc-900/50 border border-zinc-700/50 rounded-lg px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 resize-none mb-4"
                        />
                        <button
                          onClick={() => continueThread('unified')}
                          disabled={!threadOperations['unified'] || threadLoading['unified']}
                          className={`w-full px-6 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${threadOperations['unified'] && !threadLoading['unified'] ? 'bg-[#021810] text-[#f59e0b] hover:bg-[#052e23] border border-emerald-700/50' : 'bg-zinc-900 text-zinc-600 cursor-not-allowed'}`}
                        >
                          {threadLoading['unified'] ? <><span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></span>Encountering...</> : 'Continue'}
                        </button>
                      </div>
                    )}

                    {/* Thread Results */}
                    {threadData['unified'] && threadData['unified'].length > 0 && (
                      <div className="mt-5 space-y-4" data-thread-key="unified">
                        {threadData['unified'].map((threadItem, threadIndex) => {
                          const isReflect = threadItem.operation === 'reflect';
                          const trans = getComponent(threadItem.draw.transient);
                          const stat = STATUSES[threadItem.draw.status];
                          const statusPrefix = stat.prefix || 'Balanced';

                          // Get correction info for imbalanced cards
                          const itemIsImbalanced = threadItem.draw.status !== 1;
                          const itemCorrection = itemIsImbalanced ? getFullCorrection(threadItem.draw.transient, threadItem.draw.status, trans) : null;
                          const itemCorrectionTargetId = itemIsImbalanced ? getCorrectionTargetId(itemCorrection, trans) : null;
                          const itemCorrectionCard = itemCorrectionTargetId !== null ? getComponent(itemCorrectionTargetId) : null;
                          const itemHomeArchetype = getHomeArchetype(threadItem.draw.transient);
                          const itemCorrectionArchetype = itemCorrectionTargetId !== null ? getHomeArchetype(itemCorrectionTargetId) : null;
                          const itemCardType = getCardType(threadItem.draw.transient);
                          const itemBoundIsInner = itemCardType === 'bound' && trans?.number <= 5;
                          const itemCorrectionCardType = itemCorrectionTargetId !== null ? getCardType(itemCorrectionTargetId) : null;
                          const itemCorrectionBoundIsInner = itemCorrectionCardType === 'bound' && itemCorrectionCard?.number <= 5;

                          return (
                            <div key={threadIndex} className={`thread-item rounded-lg p-4 ${isReflect ? 'border border-sky-500/30 bg-sky-950/20' : 'border border-orange-500/30 bg-orange-950/20'}`}>
                              <div className="flex items-center gap-2 mb-3">
                                <span className={`text-xs font-medium px-2 py-0.5 rounded ${isReflect ? 'bg-sky-500/20 text-sky-400' : 'bg-orange-500/20 text-orange-400'}`}>{isReflect ? '↩ Reflect' : '⚡ Forge'}</span>
                              </div>
                              {threadItem.context && <div className={`text-xs italic mb-3 pl-3 border-l-2 ${isReflect ? 'border-sky-500/50 text-sky-300/70' : 'border-orange-500/50 text-orange-300/70'}`}>"{threadItem.context}"</div>}
                              {/* Card image and minimap for thread draw */}
                              <div className="flex items-center justify-center gap-4 mb-3">
                                <div className="flex flex-col items-center">
                                  <CardImage
                                    transient={threadItem.draw.transient}
                                    status={threadItem.draw.status}
                                    cardName={trans?.name}
                                    size="default"
                                    showFrame={true}
                                    onImageClick={() => openCardDetail(threadItem.draw.transient)}
                                  />
                                  <span className="cursor-pointer hover:underline decoration-dotted underline-offset-2 text-xs text-amber-300/90 mt-1 text-center" onClick={() => setSelectedInfo({ type: 'card', id: threadItem.draw.transient, data: trans })}>
                                    {trans?.name}
                                  </span>
                                </div>

                                {/* Minimap with correction path for imbalanced cards */}
                                {itemIsImbalanced && itemCorrectionArchetype !== null && (
                                  <div className="flex flex-col items-center">
                                    <span className="text-xs mb-1 text-emerald-400/60">Path to Balance</span>
                                    <div
                                      className="rounded-lg flex items-center justify-center overflow-hidden"
                                      style={{
                                        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 46, 22, 0.3) 100%)',
                                        border: '1px solid rgba(16, 185, 129, 0.3)',
                                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3), inset 0 0 20px rgba(16, 185, 129, 0.1)',
                                        width: '120px',
                                        height: '120px'
                                      }}
                                    >
                                      <Minimap
                                        fromId={itemHomeArchetype}
                                        toId={itemCorrectionArchetype}
                                        size="md"
                                        singleMode={true}
                                        fromCardType={itemCardType}
                                        boundIsInner={itemBoundIsInner}
                                        toCardType={itemCorrectionCardType}
                                        toBoundIsInner={itemCorrectionBoundIsInner}
                                      />
                                    </div>
                                    <span className="cursor-pointer hover:underline decoration-dotted underline-offset-2 text-xs text-emerald-300 mt-1 text-center" onClick={() => setSelectedInfo({ type: 'card', id: itemCorrectionTargetId, data: itemCorrectionCard })}>
                                      {itemCorrectionCard?.name}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center justify-center gap-2 mb-2">
                                <span className={`text-xs px-2 py-0.5 rounded-full cursor-pointer hover:ring-1 hover:ring-white/30 ${STATUS_COLORS[threadItem.draw.status]}`} onClick={() => setSelectedInfo({ type: 'status', id: threadItem.draw.status, data: STATUS_INFO[threadItem.draw.status] })}>{stat.name}</span>
                                <span className="text-sm font-medium text-zinc-200">
                                  <span className="cursor-pointer hover:underline decoration-dotted underline-offset-2" onClick={() => setSelectedInfo({ type: 'status', id: threadItem.draw.status, data: STATUS_INFO[threadItem.draw.status] })}>{statusPrefix}</span>
                                  {statusPrefix && ' '}
                                  <span className="cursor-pointer hover:underline decoration-dotted underline-offset-2 text-amber-300/90" onClick={() => setSelectedInfo({ type: 'card', id: threadItem.draw.transient, data: getComponent(threadItem.draw.transient) })}>{trans.name}</span>
                                </span>
                              </div>
                              {showTraditional && trans && <div className="text-xs text-zinc-500 mb-2">{trans.traditional}</div>}
                              <div className="text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap">{renderWithHotlinks(threadItem.interpretation, setSelectedInfo, showTraditional)}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
                )}
              </div>
              );
            })()}

            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Follow-up Messages */}
        {followUpMessages.length > 0 && (
          <div className="content-pane space-y-4 mt-6">
            {followUpMessages.map((msg, i) => (
              <div key={i} className={`rounded-lg p-4 ${msg.role === 'user' ? 'bg-zinc-800/50 ml-8' : 'bg-zinc-900/50 border border-zinc-800/50'}`}>
                {msg.role === 'user' && <div className="text-[0.625rem] text-zinc-500 uppercase tracking-wider mb-2">Follow-up</div>}
                <div className="text-zinc-300 leading-relaxed text-sm space-y-3">
                  {msg.content.split(/\n\n+/).filter(p => p.trim()).map((para, pi) => (
                    <p key={pi} className="whitespace-pre-wrap">{para.trim()}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Follow-up Input - hide in First Contact mode */}
        {parsedReading && !loading && !parsedReading.firstContact && !parsedReading._isFirstContact && (
          <div className="mt-6 pt-4 border-t border-zinc-800/50 relative">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[0.625rem] text-zinc-500 tracking-wider">Converse about this encounter</span>
              <button
                onClick={() => setHelpPopover(helpPopover === 'followup' ? null : 'followup')}
                className="w-4 h-4 rounded-full bg-[#f59e0b]/20 border border-[#f59e0b]/50 text-[#f59e0b] hover:bg-[#f59e0b]/30 hover:text-[#f59e0b] text-[0.625rem] flex items-center justify-center transition-all"
              >
                ?
              </button>
              {helpPopover === 'followup' && (
                <div className="absolute top-8 left-0 z-50 w-72">
                  <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 shadow-xl">
                    <p className="text-zinc-400 text-xs leading-relaxed">
                      Converse about the whole encounter — dig deeper, challenge something, ask about a specific signature, or take the dialogue wherever you need.
                    </p>
                    <button onClick={() => setHelpPopover(null)} className="mt-2 text-xs text-zinc-500 hover:text-zinc-300 w-full text-center">Got it</button>
                  </div>
                </div>
              )}
            </div>
            <div
              className="flex gap-2 items-center"
              data-help="followup-input"
              onClick={(e) => handleHelpClick('followup-input', e)}
            >
              <div className="content-pane flex-1 min-w-0 rounded-lg overflow-hidden">
                <input type="text" value={followUp} onChange={(e) => setFollowUp(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !followUpLoading && sendFollowUp()}
                  placeholder={followUpLoading ? "Thinking..." : "Share a thought, challenge it, go deeper..."}
                  disabled={followUpLoading || helpMode}
                  className="w-full bg-zinc-900/50 border border-zinc-700/50 rounded-lg px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors text-sm disabled:opacity-50" />
              </div>
              <button onClick={(e) => { if (!helpMode) sendFollowUp(); }} disabled={followUpLoading || !followUp.trim() || helpMode}
                className="flex-shrink-0 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-700 border border-zinc-600 px-6 py-3 rounded-lg transition-all flex items-center justify-center min-w-[52px] text-zinc-200">
                {followUpLoading ? (
                  <div className="w-4 h-4 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin"></div>
                ) : '→'}
              </button>
            </div>
          </div>
        )}

        {/* Adjust Stance - at the bottom - hide in First Contact mode */}
        {parsedReading && !loading && !parsedReading.firstContact && !parsedReading._isFirstContact && (
          <div className="mt-6 relative">
            <div className="flex items-center gap-2">
              <button
                data-help="stance-adjust"
                onClick={(e) => { if (!handleHelpClick('stance-adjust', e)) setShowMidReadingStance(!showMidReadingStance); }}
                className={`flex-1 text-left px-4 py-3 rounded-lg transition-all ${
                  showMidReadingStance
                    ? 'bg-zinc-800/50 border border-zinc-700/50'
                    : 'bg-zinc-900/30 border border-zinc-800/30 hover:bg-zinc-900/50 hover:border-zinc-700/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-zinc-300">
                      {showMidReadingStance ? '▾' : '▸'} Adjust Stance
                    </span>
                    <span className="text-xs text-zinc-600 ml-2">
                      {getCurrentDeliveryPreset()?.[1]?.name || 'Custom'}
                    </span>
                  </div>
                  <span className="text-xs text-zinc-500">
                    {showMidReadingStance ? 'collapse' : 'change depth & style'}
                  </span>
                </div>
              </button>
              <button
                onClick={() => setHelpPopover(helpPopover === 'stance' ? null : 'stance')}
                className="w-6 h-6 rounded-full bg-[#f59e0b]/20 border border-[#f59e0b]/50 text-[#f59e0b] hover:bg-[#f59e0b]/30 hover:text-[#f59e0b] text-xs flex items-center justify-center transition-all flex-shrink-0"
              >
                ?
              </button>
            </div>
            {helpPopover === 'stance' && (
              <div className="absolute top-full right-0 mt-2 z-50 w-72">
                <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 shadow-xl">
                  <p className="text-zinc-400 text-xs leading-relaxed">
                    Stances shape how the reading speaks to you — from quick and direct to deep and expansive. Use Config to customize voice, focus, density, scope, and tone.
                  </p>
                  <button
                    onClick={() => setHelpPopover(null)}
                    className="mt-3 text-xs text-zinc-500 hover:text-zinc-300 w-full text-center"
                  >
                    Got it
                  </button>
                </div>
              </div>
            )}

            {showMidReadingStance && (
              <div className="content-pane mt-3 bg-zinc-900/30 rounded-lg border border-zinc-800/30 p-4">
                {/* Voice Settings - Post-Reading (locked) */}
                <div>
                  <PersonaSelector
                    persona={persona}
                    setPersona={setPersona}
                    humor={humor}
                    setHumor={setHumor}
                    compact={true}
                    hasReading={!!parsedReading}
                  />
                </div>

                {/* Advanced Config toggle */}
                <div className="flex justify-center mt-4">
                  <button
                    onClick={() => setShowFineTune(!showFineTune)}
                    className="px-3 py-1.5 text-[0.625rem] text-zinc-500 hover:text-zinc-300 transition-all flex items-center gap-1"
                  >
                    <span>{showFineTune ? '▾' : '▸'}</span>
                    <span>Advanced</span>
                  </button>
                </div>

                {showFineTune && (
                  <div className="mt-3 bg-zinc-900/50 rounded-lg p-3 border border-zinc-800/50 space-y-3">
                    {/* Delivery Presets Row */}
                    <div className="w-full max-w-lg mx-auto">
                      <div className="flex gap-1.5 justify-center flex-nowrap">
                        {Object.entries(DELIVERY_PRESETS).map(([key, preset]) => {
                          const isActive = getCurrentDeliveryPreset()?.[0] === key;
                          return (
                            <button
                              key={key}
                              onClick={() => applyDeliveryPreset(key)}
                              className={`px-2 py-1.5 rounded-lg text-[0.6875rem] transition-all whitespace-nowrap ${
                                isActive
                                  ? 'bg-[#2e1065] text-amber-400'
                                  : 'bg-zinc-800/50 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                              }`}
                            >
                              {preset.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Complexity Selector - centered */}
                    <div className="text-center">
                      <div className="text-[0.625rem] text-zinc-500 mb-2">Speak to me like...</div>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {Object.entries(COMPLEXITY_OPTIONS).map(([key, opt]) => (
                          <button
                            key={key}
                            onClick={() => setStance({ ...stance, complexity: key })}
                            className={`px-2 py-1 rounded text-xs transition-all ${
                              stance.complexity === key
                                ? 'bg-zinc-700 text-zinc-100'
                                : 'bg-zinc-800/50 text-zinc-500 hover:text-zinc-300'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Seriousness/Tone Selector */}
                    <div className="text-center">
                      <div className="text-[0.625rem] text-zinc-500 mb-2">Tone</div>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {Object.entries(SERIOUSNESS_MODIFIERS).map(([key]) => (
                          <button
                            key={key}
                            onClick={() => setStance({ ...stance, seriousness: key })}
                            className={`px-2 py-1 rounded text-xs transition-all capitalize ${
                              stance.seriousness === key
                                ? 'bg-zinc-700 text-zinc-100'
                                : 'bg-zinc-800/50 text-zinc-500 hover:text-zinc-300'
                            }`}
                          >
                            {key}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Stance Grid */}
                    <StanceSelector
                      stance={stance}
                      setStance={setStance}
                      showCustomize={true}
                      setShowCustomize={() => {}}
                      compact={true}
                    />

                    {/* Model Selector + Token Display */}
                    <div className="pt-3 border-t border-zinc-700/50">
                      {getAvailableModels().length > 1 && (
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <span className="text-xs text-zinc-500">Model:</span>
                          <select
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            className="text-xs px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 focus:outline-none focus:border-amber-500"
                          >
                            {getAvailableModels().map(m => (
                              <option key={m} value={m}>{getModelLabel(m)}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      <label className="flex items-center justify-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showTokenUsage}
                          onChange={(e) => setShowTokenUsage(e.target.checked)}
                          className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-amber-500 focus:ring-amber-500 focus:ring-offset-0 cursor-pointer"
                        />
                        <span className="text-xs text-zinc-400">Show token usage</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Re-interpret Button */}
                <div className="mt-3 pt-3 border-t border-zinc-800/50">
                  <button
                    onClick={reinterpret}
                    className="w-full bg-[#021810] hover:bg-[#052e23] text-[#f59e0b] py-2 rounded-lg text-sm transition-colors border border-emerald-700/50"
                  >
                    Re-interpret with new settings
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Token Usage Display */}
        {showTokenUsage && tokenUsage && parsedReading && (
          <div className="text-center text-zinc-500 text-[0.625rem] mt-4">
            Tokens: {tokenUsage.input_tokens?.toLocaleString()} in / {tokenUsage.output_tokens?.toLocaleString()} out • Cost: ${(
              (tokenUsage.input_tokens * getModelPricing(selectedModel).input / 1000000) +
              (tokenUsage.output_tokens * getModelPricing(selectedModel).output / 1000000)
            ).toFixed(4)} ({getModelLabel(selectedModel).split(' ')[0]})
            {translationUsage && (
              <span className="ml-2 text-amber-600/60">
                + Translation: {translationUsage.input_tokens?.toLocaleString()} in / {translationUsage.output_tokens?.toLocaleString()} out • ${(
                  (translationUsage.input_tokens * 0.001 / 1000) +
                  (translationUsage.output_tokens * 0.005 / 1000)
                ).toFixed(4)} (Haiku)
              </span>
            )}
          </div>
        )}

        {/* Reading Sign-off */}
        {parsedReading && !loading && (
          <div className="text-center mt-8 pt-6 border-t border-zinc-800/20">
            <p className="text-zinc-500 text-sm tracking-wide">
              We are love. We are eternal. Consciousness is Primary.
            </p>
          </div>
        )}
      </div>{/* End max-w-4xl content container */}

      {/* Global Footer - outside content container, anchored to bottom */}
      <Footer />
      </div>{/* End z-10 flex wrapper */}

      {/* Info Modal */}
      <InfoModal
        info={selectedInfo}
        onClose={closeInfoModal}
        setSelectedInfo={navigateToInfo}
        showTraditional={showTraditional}
        canGoBack={infoHistory.length > 0}
        onGoBack={infoGoBack}
      />

      {/* Glossary Tooltip */}
      {glossaryTooltip && (
        <GlossaryTooltip
          entry={glossaryTooltip.entry}
          position={glossaryTooltip.position}
          onClose={() => setGlossaryTooltip(null)}
        />
      )}

      {/* Help Mode Overlay & Tooltip */}
      <HelpModeOverlay active={helpMode} onExit={exitHelpMode} />
      {helpTooltip && (
        <HelpTooltip
          helpKey={helpTooltip.helpKey}
          position={helpTooltip.position}
          onClose={() => setHelpTooltip(null)}
          onNavigate={(key) => setHelpTooltip({ ...helpTooltip, helpKey: key })}
        />
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => {
          setAuthModalOpen(false);
          setAuthModalMode('signin');
        }}
        initialMode={authModalMode}
      />

      {/* Badge Achievement Notification */}
      {pendingBadges && pendingBadges.length > 0 && (
        <BadgeNotification
          badges={pendingBadges}
          onDismiss={() => setPendingBadges(null)}
        />
      )}

      {/* Glistened Tale Panel - view glisten data before saving */}
      {showGlistenPanel && glistenData && (
        <GlistenSourcePanel
          data={glistenData}
          onClose={() => setShowGlistenPanel(false)}
          isOpen={showGlistenPanel}
        />
      )}

      {/* Card Detail Modal - full-screen card popup */}
      <CardDetailModal
        isOpen={cardDetailId !== null}
        onClose={() => setCardDetailId(null)}
        transientId={cardDetailId}
        stats={userStatsRef.current}
      />

    </div>
  );
}
