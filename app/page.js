"use client";
import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

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
  SUGGESTIONS,
  STARTERS,
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
  generateDTPDraws,
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
  PERSONAS
} from '../lib/index.js';

// Import renderWithHotlinks for reading text parsing
import { renderWithHotlinks, processBracketHotlinks } from '../lib/hotlinks.js';

// Import glossary utilities
import { getGlossaryEntry } from '../lib/glossary.js';
import GlossaryTooltip from '../components/shared/GlossaryTooltip.js';

// Import teleology utilities for Words to the Whys
import { buildReadingTeleologicalPrompt } from '../lib/teleology-utils.js';

// Import content filter for prohibited terms
import { filterProhibitedTerms } from '../lib/contentFilter.js';

// Import mode system for governance
import { buildModeHeader } from '../lib/modePrompts.js';
import { postProcessModeTransitions } from '../lib/modeTransition.js';
import { WHY_MOMENT_PROMPT } from '../lib/whyVector.js';

// Import React components
import ClickableTermContext from '../components/shared/ClickableTermContext.js';
import InfoModal from '../components/shared/InfoModal.js';
import ThreadedCard from '../components/reader/ThreadedCard.js';
import ReadingSection from '../components/reader/ReadingSection.js';
import StanceSelector from '../components/reader/StanceSelector.js';
import PersonaSelector from '../components/reader/PersonaSelector.js';
import IntroSection from '../components/reader/IntroSection.js';
import DepthCard from '../components/reader/DepthCard.js';
import TextSizeSlider from '../components/shared/TextSizeSlider.js';

// NOTE: All data constants have been extracted to /lib modules.
// See lib/archetypes.js, lib/constants.js, lib/spreads.js, lib/voice.js, lib/prompts.js, lib/corrections.js, lib/utils.js
// VERSION is now imported from lib/version.js - update it there when releasing

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

// Helper to extract summary content from either string (legacy) or object (new depth format)
const getSummaryContent = (summary, depth = 'shallow') => {
  if (!summary) return '';
  if (typeof summary === 'string') return summary;
  // New format: { wade, swim, deep } - shallow derives from wade
  // Use explicit null check to avoid empty string fallback issues
  if (depth === 'shallow') {
    // Extract first 1-2 sentences from wade
    const wadeContent = summary.wade || summary.surface || '';
    if (!wadeContent) return '';
    const sentences = wadeContent.split(/(?<=[.!?])\s+/);
    return sentences.slice(0, 2).join(' ');
  }
  if (summary[depth] != null && summary[depth] !== '') return summary[depth];
  if (summary.wade != null && summary.wade !== '') return summary.wade;
  if (summary.swim != null && summary.swim !== '') return summary.swim;
  if (summary.deep != null && summary.deep !== '') return summary.deep;
  return '';
};

// Helper to extract letter content from either string (legacy) or object (new depth format)
const getLetterContent = (letter, depth = 'shallow') => {
  if (!letter) return '';
  if (typeof letter === 'string') return letter;
  // New format: { wade, swim, deep } - shallow derives from wade
  // Use explicit null check to avoid empty string fallback issues
  if (depth === 'shallow') {
    // Extract first 1-2 sentences from wade
    const wadeContent = letter.wade || '';
    if (!wadeContent) return '';
    const sentences = wadeContent.split(/(?<=[.!?])\s+/);
    return sentences.slice(0, 2).join(' ');
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
  const [spreadType, setSpreadType] = useState('discover'); // 'reflect' | 'discover' | 'forge' | 'explore'
  const [dtpInput, setDtpInput] = useState(''); // DTP (Explore mode) text input
  const [dtpResponse, setDtpResponse] = useState(null); // DTP response: { tokens, readings, synthesis }
  const [spreadKey, setSpreadKey] = useState('three');
  const [reflectCardCount, setReflectCardCount] = useState(3); // 1-6 for Reflect mode
  const [reflectSpreadKey, setReflectSpreadKey] = useState('arc'); // Selected spread in Reflect mode
  const [stance, setStance] = useState({ complexity: 'friend', seriousness: 'playful', voice: 'warm', focus: 'feel', density: 'essential', scope: 'here' }); // Default: Clear
  const [showCustomize, setShowCustomize] = useState(false);
  const [draws, setDraws] = useState(null);
  const [parsedReading, setParsedReading] = useState(null);
  const [expansions, setExpansions] = useState({}); // {sectionKey: {unpack: '...', clarify: '...'}}
  const [expanding, setExpanding] = useState(null); // {section: 'card:1', type: 'unpack'}
  const [collapsedSections, setCollapsedSections] = useState({}); // {sectionKey: true/false} - tracks collapsed state
  const [letterDepth, setLetterDepth] = useState('shallow'); // 'shallow' | 'wade' | 'swim' | 'deep'
  const [pathDepth, setPathDepth] = useState('shallow'); // 'shallow' | 'wade' | 'swim' | 'deep'
  const [summaryDepth, setSummaryDepth] = useState('shallow'); // 'shallow' | 'wade' | 'swim' | 'deep'

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
  const [glossaryTooltip, setGlossaryTooltip] = useState(null); // {entry, position: {x, y}}
  const [showMidReadingStance, setShowMidReadingStance] = useState(false);
  const [showFineTune, setShowFineTune] = useState(false);
  const [helpPopover, setHelpPopover] = useState(null); // 'dynamicLens' | 'fixedLayout' | 'stance' | null
  const [loadingPhrases, setLoadingPhrases] = useState([]);
  const [loadingPhraseIndex, setLoadingPhraseIndex] = useState(0);
  const [loadingPhraseVisible, setLoadingPhraseVisible] = useState(true);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [sparkPlaceholder, setSparkPlaceholder] = useState('');
  const [showSparkSuggestions, setShowSparkSuggestions] = useState(false); // Show starters + spark suggestions
  const [showLandingFineTune, setShowLandingFineTune] = useState(false);
  const [showVoicePreview, setShowVoicePreview] = useState(true); // Voice sample preview toggle (default ON)
  const [useHaiku, setUseHaiku] = useState(true); // Model toggle: false = Sonnet, true = Haiku (default ON)
  const [showTokenUsage, setShowTokenUsage] = useState(true); // Show token costs (default ON)
  const [tokenUsage, setTokenUsage] = useState(null); // { input_tokens, output_tokens }

  // === PERSONA VOICE SYSTEM V2 (One-Pass) ===
  // Voice is baked into generation - no separate translation layer
  const [persona, setPersona] = useState('none'); // 'none' | 'friend' | 'therapist' | 'spiritualist' | 'scientist' | 'coach'
  const [humor, setHumor] = useState(5); // 1-10: Unhinged Comedy to Sacred
  const [register, setRegister] = useState(5); // 1-10: Unhinged Street to Oracle
  const [creator, setCreator] = useState(5); // 1-10: Witness to Creator (agency/authorship language)
  const [roastMode, setRoastMode] = useState(false); // Loving but savage
  const [directMode, setDirectMode] = useState(false); // No softening
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

  // On-demand depth generation state
  const [cardLoaded, setCardLoaded] = useState({}); // {0: true, 1: false, ...} - which cards have content
  const [cardLoading, setCardLoading] = useState({}); // {0: true, ...} - which cards are currently loading
  const [cardLoadingDeeper, setCardLoadingDeeper] = useState({}); // {0: true, ...} - which cards are loading deeper content
  const [synthesisLoaded, setSynthesisLoaded] = useState(false); // Whether summary/path have been fetched
  const [synthesisLoading, setSynthesisLoading] = useState(false); // Whether synthesis is currently loading
  const [letterLoadingDeeper, setLetterLoadingDeeper] = useState(false); // Whether letter is loading deeper content
  const [synthesisLoadingDeeper, setSynthesisLoadingDeeper] = useState(false); // Whether synthesis is loading deeper
  const [systemPromptCache, setSystemPromptCache] = useState(''); // Cached system prompt for on-demand calls

  // User level for progressive disclosure (0 = First Contact, 1-4 = progressive features)
  const [userLevel, setUserLevel] = useState(1); // Default to Full Reader Mode

  const messagesEndRef = useRef(null);
  const hasAutoInterpreted = useRef(false);

  // Watch for all cards loaded to trigger synthesis
  useEffect(() => {
    if (!draws || !parsedReading?._onDemand || synthesisLoaded || synthesisLoading) return;

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
          humor,
          register,
          roastMode,
          directMode
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
        if (prefs.register !== undefined) setRegister(prefs.register);
        if (prefs.creator !== undefined) setCreator(prefs.creator);
        if (prefs.roastMode !== undefined) setRoastMode(prefs.roastMode);
        if (prefs.directMode !== undefined) setDirectMode(prefs.directMode);
      }
    } catch (e) {
      console.warn('Failed to load preferences:', e);
    }

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
    const prefs = {
      spreadType,
      spreadKey,
      stance,
      showVoicePreview,
      // Persona layer settings (V2)
      persona,
      humor,
      register,
      creator,
      roastMode,
      directMode
    };
    try {
      localStorage.setItem('nirmanakaya_prefs', JSON.stringify(prefs));
    } catch (e) {
      console.warn('Failed to save preferences:', e);
    }
  }, [spreadType, spreadKey, stance, showVoicePreview, persona, humor, register, creator, roastMode, directMode]);

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

  // Suggestion pills - random rotation every 8 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setSuggestionIndex(Math.floor(Math.random() * SUGGESTIONS.length));
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Warn before leaving if there's a reading
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (draws && parsedReading) {
        e.preventDefault();
        e.returnValue = "You'll lose your reading if you leave. Are you sure?";
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [draws, parsedReading]);

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

  // Spark: toggle suggestions panel and show random suggestion
  const handleSpark = () => {
    const randomSuggestion = SUGGESTIONS[Math.floor(Math.random() * SUGGESTIONS.length)];
    setSparkPlaceholder(randomSuggestion);
    setShowSparkSuggestions(true);
  };

  // Strip trailing signatures from API responses (e.g., "A.", "[A]", "— A")
  const stripSignature = (text) => {
    if (!text) return text;
    return text.replace(/\s*[-—]?\s*\[?A\.?\]?\s*$/i, '').trim();
  };

  const copyShareUrl = async () => {
    try { await navigator.clipboard.writeText(shareUrl); alert('Link copied!'); }
    catch { prompt('Copy this link:', shareUrl); }
  };

  const performReadingWithDraws = async (drawsToUse, questionToUse = question) => {
    setLoading(true); setError(''); setParsedReading(null); setExpansions({}); setFollowUpMessages([]);
    // Reset persona translation state
    setRawParsedReading(null); setTranslationUsage(null); setTranslating(false);
    // Reset on-demand state
    setCardLoaded({}); setCardLoading({}); setSynthesisLoaded(false); setSynthesisLoading(false);
    // Reset depth states to default (shallow)
    setLetterDepth('shallow'); setPathDepth('shallow'); setSummaryDepth('shallow');
    const isReflect = spreadType === 'reflect';
    const currentSpreadKey = isReflect ? reflectSpreadKey : spreadKey;
    const safeQuestion = sanitizeForAPI(questionToUse);

    // Check if First Contact Mode (Level 0)
    const isFirstContact = userLevel === USER_LEVELS.FIRST_CONTACT;

    if (isFirstContact) {
      // First Contact Mode: Use simplified single-call approach (unchanged)
      const systemPrompt = buildSystemPrompt(userLevel);
      const userMessage = buildUserMessage(safeQuestion, drawsToUse, userLevel);
      try {
        const res = await fetch('/api/reading', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: userMessage }],
            system: systemPrompt,
            model: "claude-haiku-4-5-20251001",
            isFirstContact: true,
            max_tokens: 300
          })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        const parsed = parseFirstContactResponse(data.reading);
        setParsedReading(parsed);
        setTokenUsage(data.usage);
      } catch (e) { setError(`Error: ${e.message}`); }
      setLoading(false);
      return;
    }

    // Standard Mode: On-demand depth generation
    // Phase 1: Fetch Letter only (card content loaded on-demand)
    // V2: Include persona params for one-pass voice integration
    const systemPrompt = buildSystemPrompt(userLevel, {
      spreadType,
      stance,
      letterTone: VOICE_LETTER_TONE[stance.voice],
      // Persona Voice V2 params
      persona,
      humor,
      register,
      creator,
      roastMode,
      directMode
    });
    // Cache system prompt for on-demand calls
    setSystemPromptCache(systemPrompt);

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
          model: useHaiku ? "claude-haiku-4-5-20251001" : "claude-sonnet-4-20250514"
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Create initial parsed reading with letter and card placeholders
      const cardPlaceholders = drawsToUse.map((_, i) => ({
        index: i,
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
        _onDemand: true // Flag indicating on-demand mode
      });
      setTokenUsage(data.usage);

      // Auto-load ALL cards in parallel immediately for better UX
      // This uses the on-demand architecture but loads everything upfront
      setTimeout(() => {
        drawsToUse.forEach((_, i) => {
          loadCardDepth(i, drawsToUse, safeQuestion, data.letter, systemPrompt);
        });
      }, 100);

    } catch (e) { setError(`Error: ${e.message}`); }
    setLoading(false);
  };

  // On-demand: Load a single card's depth content
  const loadCardDepth = async (cardIndex, drawsToUse, questionToUse, letterData, systemPromptToUse) => {
    if (cardLoaded[cardIndex] || cardLoading[cardIndex]) return; // Already loaded or loading

    setCardLoading(prev => ({ ...prev, [cardIndex]: true }));

    try {
      const letterContent = letterData?.swim || letterData?.wade || letterData?.surface || '';
      const res = await fetch('/api/card-depth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardIndex,
          draw: drawsToUse[cardIndex],
          question: questionToUse,
          spreadType,
          spreadKey: spreadType === 'reflect' ? reflectSpreadKey : spreadKey,
          stance,
          system: systemPromptToUse || systemPromptCache,
          letterContent,
          model: useHaiku ? "claude-haiku-4-5-20251001" : "claude-sonnet-4-20250514"
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Validate that we got actual content (not just empty strings)
      const hasContent = data.cardData && (data.cardData.wade || data.cardData.surface || data.cardData.swim || data.cardData.deep);
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
  const loadDeeperContent = async (cardIndex, targetDepth, previousContent) => {
    if (cardLoadingDeeper[cardIndex]) return; // Already loading

    setCardLoadingDeeper(prev => ({ ...prev, [cardIndex]: true }));

    try {
      const letterContent = getLetterContent(parsedReading?.letter);
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
          model: useHaiku ? "claude-haiku-4-5-20251001" : "claude-sonnet-4-20250514",
          // Progressive deepening params
          targetDepth,
          previousContent
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // V2: Voice is baked into generation - no translation needed
      const updatedReading = {
        ...parsedReading,
        cards: parsedReading?.cards?.map((card, i) =>
          i === cardIndex ? { ...card, ...data.cardData } : card
        ) || []
      };
      setParsedReading(updatedReading);

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

    setCardLoadingDeeper(prev => ({ ...prev, [cardIndex]: false }));
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
          model: useHaiku ? "claude-haiku-4-5-20251001" : "claude-sonnet-4-20250514"
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

      // Build complete reading
      const completeReading = {
        ...parsedReading,
        summary: data.summary,
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
          model: useHaiku ? "claude-haiku-4-5-20251001" : "claude-sonnet-4-20250514",
          targetDepth,
          previousContent
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

  // Progressive deepening: Load SWIM or DEEP for Synthesis (Summary + Path)
  const loadDeeperSynthesis = async (targetDepth) => {
    if (synthesisLoadingDeeper) return;

    const summary = parsedReading?.summary;
    const path = parsedReading?.path;

    // Check if content already exists at target depth
    if (summary?.[targetDepth] && path?.[targetDepth]) {
      setSummaryDepth(targetDepth);
      setPathDepth(targetDepth);
      return;
    }

    setSynthesisLoadingDeeper(true);

    try {
      const previousContent = {
        summary: {
          wade: summary?.wade || '',
          swim: summary?.swim || ''
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
          model: useHaiku ? "claude-haiku-4-5-20251001" : "claude-sonnet-4-20250514",
          targetDepth,
          previousContent
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // V2: Voice is baked into generation - update reading directly
      const updatedReading = {
        ...parsedReading,
        summary: {
          ...parsedReading?.summary,
          ...data.summary
        },
        path: {
          ...parsedReading?.path,
          ...data.path
        }
      };
      setParsedReading(updatedReading);
      setSummaryDepth(targetDepth);
      setPathDepth(targetDepth);

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

    setSynthesisLoadingDeeper(false);
  };

  const performReading = async () => {
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
      const newDraws = generateSpread(1, false);
      setDraws(newDraws);
      await performReadingWithDraws(newDraws, actualQuestion);
      return;
    }

    const isReflect = spreadType === 'reflect';
    const isForge = spreadType === 'forge';
    // Forge mode always draws 1 card
    // Reflect mode uses REFLECT_SPREADS, Discover uses RANDOM_SPREADS
    const count = isForge ? 1 : (isReflect ? REFLECT_SPREADS[reflectSpreadKey].count : RANDOM_SPREADS[spreadKey].count);
    const newDraws = generateSpread(count, isReflect);
    setDraws(newDraws);
    await performReadingWithDraws(newDraws, actualQuestion);
  };

  // DTP (Explore mode) reading - token extraction + interpretation
  const performDTPReading = async (input) => {
    setLoading(true);
    setError('');
    setDtpResponse(null);

    // Generate 5 draws (unique positions guaranteed)
    const newDraws = generateDTPDraws();
    setDraws(newDraws);

    try {
      const response = await fetch('/api/reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isDTP: true,
          dtpInput: input,
          draws: newDraws
        })
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
        setLoading(false);
        return;
      }

      if (data.isDTP) {
        // Store the DTP response
        setDtpResponse({
          tokens: data.tokens || [],
          readings: data.readings || [],
          synthesis: data.synthesis || '',
          draws: data.draws || newDraws
        });
        setTokenUsage(data.usage);
      }

      setLoading(false);
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
      parentLabel = `${parentStatusPrefix} ${parentTrans.name}`;
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
            let cardSection = `CARD ${i + 1}: ${stat.prefix || 'Balanced'} ${trans.name}\n${cardContent}`;
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

    if (operation === 'reflect') {
      // REFLECT: User is INQUIRING - architecture responds to their QUESTION with a new card
      systemPrompt = `${BASE_SYSTEM}

${stancePrompt}

OPERATION: REFLECT (Inquiry/Question)
The user is asking a question, exploring, or seeking clarity about this reading.
A new card has been drawn as the architecture's RESPONSE to their inquiry.

Your job:
- Acknowledge their question briefly
- Interpret the NEW CARD as the architecture's answer to what they asked
- This is a SUB-READING: the drawn card speaks directly to their inquiry
- Be specific about how the new card addresses their question
- The card IS the architecture speaking back to them
- If the card is IMBALANCED, include a REBALANCER section with the correction path

Output structure:
1. Brief acknowledgment of their question (1-2 sentences)
2. "The architecture responds with [Card Name]..."
3. How this card answers or illuminates their inquiry (2-3 paragraphs)
4. If imbalanced: "REBALANCER:" followed by the correction path (1-2 paragraphs)

Use paragraph breaks. Max 2-3 sentences per paragraph.`;

      userMessage = `ORIGINAL QUESTION: "${safeQuestion}"

FULL READING CONTEXT:
${fullReadingContext}

SECTION BEING DISCUSSED: ${parentLabel}
${parentContent}

USER'S INQUIRY/QUESTION:
"${userInput}"

NEW CARD DRAWN IN RESPONSE: ${newCardName}
Traditional: ${newTrans.traditional}
${newTrans.description}
${newTrans.extended || ''}
${correctionInfo}
Interpret this new card as the architecture's response to their question.`;

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
${correctionInfo}
Interpret this new card as the architecture's response to their declared direction.`;
    }

    try {
      const res = await fetch('/api/reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: userMessage }],
          system: systemPrompt,
          model: useHaiku ? "claude-haiku-4-5-20251001" : "claude-sonnet-4-20250514",
          max_tokens: 8000
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
          model: useHaiku ? "claude-haiku-4-5-20251001" : "claude-sonnet-4-20250514",
          max_tokens: 8000
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

  const handleExpand = async (sectionKey, expansionType, remove = false) => {
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
    
    // If already has this expansion, toggle it off
    if (expansions[sectionKey]?.[expansionType]) {
      handleExpand(sectionKey, expansionType, true);
      return;
    }
    
    // Otherwise, fetch the expansion
    setExpanding({ section: sectionKey, type: expansionType });

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
    } else if (sectionKey.startsWith('correction:') || sectionKey.startsWith('rebalancer:')) {
      const cardIndex = parseInt(sectionKey.split(':')[1]);
      const cardSection = parsedReading.cards.find(c => c.index === cardIndex);
      const rebalancer = cardSection?.rebalancer;
      const draw = draws[cardIndex];
      const trans = getComponent(draw.transient);
      const stat = STATUSES[draw.status];
      // SCOPED: Only send this specific card's draw info
      drawText = `Signature ${cardIndex + 1}: ${stat.prefix || 'Balanced'} ${trans.name}\nStatus: ${stat.name}\nRebalancer Architecture: ${rebalancer?.architecture || ''}`;
      sectionContent = rebalancer?.wade || rebalancer?.surface || '';
      sectionContext = `the rebalancer path for ${trans.name} (Signature ${cardIndex + 1}) — THIS CARD ONLY`;
    } else if (sectionKey === 'path') {
      drawText = formatDrawForAI(draws, spreadType, spreadKey, false); // Full reading for path synthesis
      sectionContent = parsedReading.path?.wade || parsedReading.rebalancerSummary || '';
      sectionContext = 'the Path to Balance section (synthesis of all corrections)';
    }

    // Custom prompts for Path section
    let expansionPrompt;
    if (sectionKey === 'path') {
      const pathPrompts = {
        unpack: "Expand on the Path to Balance with more detail. Go deeper on the synthesis of these corrections and what they're pointing to together.",
        clarify: "Restate the Path to Balance in simpler, everyday language. Plain words, short sentences — make it completely accessible.",
        architecture: "Explain the geometric relationships between the corrections. Why do these specific corrections work together? Show the structural logic.",
        example: "Give concrete real-world examples of how to apply this guidance. Specific scenarios someone might encounter — make it tangible."
      };
      expansionPrompt = pathPrompts[expansionType];
    } else {
      expansionPrompt = EXPANSION_PROMPTS[expansionType].prompt;
    }
    
    // Pass the original stance to expansion
    const stancePrompt = buildStancePrompt(stance.complexity, stance.voice, stance.focus, stance.density, stance.scope, stance.seriousness);
    const systemPrompt = `${BASE_SYSTEM}\n\n${stancePrompt}\n\nYou are expanding on a specific section of a reading. Keep the same tone as the original reading. Be concise but thorough. Always connect your expansion back to the querent's specific question.\n\nCRITICAL FORMATTING RULES:\n1. NEVER write walls of text\n2. Each paragraph must be 2-4 sentences MAX\n3. Put TWO blank lines between each paragraph (this is required for rendering)\n4. Break your response into 3-5 distinct paragraphs\n5. Each paragraph should explore ONE aspect or dimension`;
    const userMessage = `QUERENT'S QUESTION: "${question}"

THE DRAW:
${drawText}

SECTION BEING EXPANDED (${sectionContext}):
${sectionContent}

EXPANSION REQUEST:
${expansionPrompt}

Respond directly with the expanded content. No section markers needed. Keep it focused on this specific section AND relevant to their question: "${question}"

REMINDER: Use SHORT paragraphs (2-3 sentences each) with blank lines between them. Never write a wall of text.`;

    try {
      const res = await fetch('/api/reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: userMessage }], system: systemPrompt, model: useHaiku ? "claude-haiku-4-5-20251001" : "claude-sonnet-4-20250514", max_tokens: 2000 })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Post-process to ensure paragraph breaks (AI often ignores formatting instructions)
      const formattedContent = ensureParagraphBreaks(stripSignature(filterProhibitedTerms(data.reading)));

      setExpansions(prev => ({
        ...prev,
        [sectionKey]: {
          ...(prev[sectionKey] || {}),
          [expansionType]: formattedContent
        }
      }));

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
    const systemPrompt = `${BASE_SYSTEM}\n\n${stancePrompt}\n\nYou are continuing a conversation about a reading. Answer their follow-up question directly, referencing the reading context as needed. No section markers — just respond naturally.

CRITICAL FORMATTING RULES:
1. Write SHORT paragraphs (2-3 sentences MAX each)
2. Put a BLANK LINE between each paragraph
3. Break your response into 3-5 distinct paragraphs
4. NEVER write a wall of text - readers need visual breathing room`;

    const messages = [
      ...followUpMessages,
      { role: 'user', content: followUp }
    ];

    const contextMessage = `THE DRAW:\n${drawText}\n\n${readingContext}\n\nFOLLOW-UP QUESTION: ${followUp}\n\nREMINDER: Use short paragraphs with blank lines between them.`;
    
    try {
      const res = await fetch('/api/reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: contextMessage }],
          system: systemPrompt,
          model: useHaiku ? "claude-haiku-4-5-20251001" : "claude-sonnet-4-20250514",
          max_tokens: 2000
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      // Post-process to ensure paragraph breaks
      const formattedResponse = ensureParagraphBreaks(stripSignature(filterProhibitedTerms(data.reading)));
      setFollowUpMessages([...messages, { role: 'assistant', content: formattedResponse }]);
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
    setDraws(null); setParsedReading(null); setExpansions({}); setFollowUpMessages([]);
    setQuestion(''); setFollowUp(''); setError(''); setFollowUpLoading(false);
    setShareUrl(''); setIsSharedReading(false); setShowArchitecture(false);
    setShowMidReadingStance(false);
    // Clear DTP state
    setDtpInput(''); setDtpResponse(null);
    // Clear thread state
    setThreadData({}); setThreadOperations({}); setThreadContexts({}); setThreadLoading({}); setCollapsedThreads({});
    // Reset on-demand state
    setCardLoaded({}); setCardLoading({}); setSynthesisLoaded(false); setSynthesisLoading(false);
    // Reset depth states to default (shallow)
    setLetterDepth('shallow'); setPathDepth('shallow'); setSummaryDepth('shallow');
    hasAutoInterpreted.current = false;
    window.history.replaceState({}, '', window.location.pathname);
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

  // === CARD DISPLAY (simplified, visual only) ===
  const CardDisplay = ({ draw, index }) => {
    const isReflect = spreadType === 'reflect';
    const spreadConfig = isReflect ? REFLECT_SPREADS[spreadKey] : RANDOM_SPREADS[spreadKey];
    const trans = getComponent(draw.transient);
    const stat = STATUSES[draw.status];
    const transArchetype = trans.archetype !== undefined ? ARCHETYPES[trans.archetype] : null;
    const isMajor = trans.type === "Archetype";
    const correction = getFullCorrection(draw.transient, draw.status);
    const correctionText = getCorrectionText(correction, trans, draw.status);
    const correctionTargetId = getCorrectionTargetId(correction, trans);

    const house = getCardHouse(draw, index);
    const houseColors = HOUSE_COLORS[house];

    const contextLabel = isReflect ? spreadConfig?.positions?.[index]?.name : (draw.position !== null ? ARCHETYPES[draw.position]?.name : 'Draw');
    const contextSub = isReflect ? null : (draw.position !== null ? `Position ${draw.position}` : null);
    
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

    return (
      <div 
        id={`card-${index}`}
        className={`rounded-xl border-2 p-4 ${houseColors.border} ${houseColors.bg} transition-all cursor-pointer hover:border-opacity-80 group`}
        onClick={scrollToContent}
      >
        <div className="mb-3 flex justify-between items-start">
          <span 
            className={`text-xs px-2 py-1 rounded-full cursor-pointer hover:opacity-80 ${STATUS_COLORS[draw.status]}`}
            onClick={(e) => { e.stopPropagation(); openStatusInfo(draw.status); }}
          >
            {stat.name}
          </span>
          <span className="text-zinc-600 text-xs opacity-0 group-hover:opacity-100 transition-opacity">↓ read</span>
        </div>

        <div className="mb-3">
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

        <div className="text-sm text-zinc-400 mb-3">
          in your <span 
            className={`font-medium cursor-pointer hover:underline decoration-dotted ${houseColors.text}`}
            onClick={(e) => { e.stopPropagation(); isReflect ? openHouseInfo(house) : openCardInfo(draw.position); }}
          >{contextLabel}</span>
          {contextSub && <span className="text-zinc-600 text-xs ml-1">({contextSub})</span>}
        </div>

        <div className="border-t border-zinc-700/30 pt-3 space-y-1">
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
          <div className="border-t border-zinc-700/30 pt-3 mt-3">
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Rebalancer</div>
            <div className="text-sm text-zinc-300">
              → <span 
                className={correctionTargetId !== null ? "cursor-pointer hover:text-zinc-100 transition-colors" : ""}
                onClick={(e) => { e.stopPropagation(); correctionTargetId !== null && openCardInfo(correctionTargetId); }}
              >{correctionText}</span>
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

    const modelName = useHaiku ? 'haiku' : 'sonnet';
    return `nirmanakaya-${slug}-${date}-${modelName}.${extension}`;
  };

  // Export reading to markdown
  const exportToMarkdown = () => {
    if (!parsedReading || !draws) return;

    const isReflect = spreadType === 'reflect';
    const spreadName = isReflect
      ? REFLECT_SPREADS[spreadKey]?.name
      : `${RANDOM_SPREADS[spreadKey]?.name} Emergent`;
    const spreadConfig = isReflect ? REFLECT_SPREADS[spreadKey] : null;

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

      const context = isReflect && spreadConfig
        ? spreadConfig.positions?.[card.index]?.name
        : `Position ${card.index + 1}`;
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

      // Card expansions (Unpack, Clarify, Example, Architecture)
      const cardExpansions = expansions[`card-${card.index}`] || {};
      Object.entries(cardExpansions).forEach(([expType, content]) => {
        if (content) {
          const label = EXPANSION_PROMPTS[expType]?.label || expType;
          md += `#### ${label}\n\n${content}\n\n`;
        }
      });
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
      Object.entries(letterExpansions).forEach(([expType, content]) => {
        if (content) {
          const label = EXPANSION_PROMPTS[expType]?.label || expType;
          md += `### ${label}\n\n${content}\n\n`;
        }
      });
    }

    // Summary expansions
    const summaryExpansions = expansions['summary'] || {};
    if (Object.keys(summaryExpansions).length > 0) {
      Object.entries(summaryExpansions).forEach(([expType, content]) => {
        if (content) {
          const label = EXPANSION_PROMPTS[expType]?.label || expType;
          md += `### Overview ${label}\n\n${content}\n\n`;
        }
      });
    }

    md += `---\n\n*Generated by Nirmanakaya Consciousness Architecture Reader*\n`;

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
    const spreadName = isReflect
      ? `Reflect • ${REFLECT_SPREADS[spreadKey]?.name}`
      : `Discover • ${RANDOM_SPREADS[spreadKey]?.name}`;
    const spreadConfig = isReflect ? REFLECT_SPREADS[spreadKey] : null;

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
      const context = isReflect && spreadConfig ? spreadConfig.positions?.[card.index]?.name : `Position ${card.index + 1}`;
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
      Object.entries(cardExpansions).forEach(([expType, content]) => {
        if (content) {
          const label = EXPANSION_PROMPTS[expType]?.label || expType;
          expansionsHtml += `
            <div class="expansion">
              <span class="expansion-badge">${label}</span>
              <div class="expansion-content">${escapeHtml(content)}</div>
            </div>`;
        }
      });

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
          <div class="signature-content">${escapeHtml(cardContent)}</div>
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
    Object.entries(letterExpansions).forEach(([expType, content]) => {
      if (content) {
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
    Object.entries(summaryExpansions).forEach(([expType, content]) => {
      if (content) {
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
  <p class="subtitle">Consciousness Architecture Reader</p>
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
      Cost: $${((tokenUsage.input_tokens * (useHaiku ? 0.001 : 0.003) / 1000) + (tokenUsage.output_tokens * (useHaiku ? 0.005 : 0.015) / 1000)).toFixed(4)}
    </div>
  </div>` : ''}

  <p class="footer">Generated by Nirmanakaya • ${useHaiku ? 'Haiku' : 'Sonnet'}</p>
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

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8 mobile-container">
        
        {/* Floating Text Size Slider - fixed position */}
        <TextSizeSlider />

        {/* Header - click to scroll to top */}
        <div
          className="text-center mb-4 md:mb-6 mobile-header relative cursor-pointer"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <h1 className="text-[1.25rem] sm:text-2xl md:text-3xl font-extralight tracking-[0.2em] sm:tracking-[0.3em] mb-1 text-zinc-100">NIRMANAKAYA</h1>
          <p className="text-zinc-400 text-[0.6875rem] sm:text-xs tracking-wide">
            {userLevel === USER_LEVELS.FIRST_CONTACT ? 'Pattern Reader' : 'Consciousness Architecture Reader'}
          </p>
          <p className="text-zinc-500 text-[0.625rem] mt-0.5">v{VERSION} alpha</p>
          {helpPopover === 'intro' && (
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 w-80 sm:w-96">
              <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 shadow-xl">
                <p className="text-zinc-300 text-sm leading-relaxed">
                  The Nirmanakaya is both mirror and forge. Bring a question or declare an intention —
                  the draw finds what's ready to be seen. Where you are, what's moving, what might need attention.
                </p>
                <button onClick={() => setHelpPopover(null)} className="mt-3 text-xs text-zinc-500 hover:text-zinc-300 w-full text-center">Got it</button>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        {!draws && (
          <>
            {/* First Contact Mode - Simplified UI */}
            {userLevel === USER_LEVELS.FIRST_CONTACT && (
              <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-6 sm:p-8 mb-6 max-w-lg mx-auto">
                <div className="text-center mb-6">
                  <p className="text-zinc-400 text-sm">Ask a question or share what's on your mind</p>
                </div>

                {/* Simple question input */}
                <div className="mb-4">
                  <textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="What would you like clarity on?"
                    className="w-full p-4 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 placeholder:text-zinc-500 resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-base"
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
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 text-zinc-900 font-medium text-lg hover:from-amber-500 hover:to-amber-400 transition-all disabled:opacity-50"
                >
                  {loading ? 'Reading...' : 'Get a Reading'}
                </button>

                {/* Subtle spark suggestions */}
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS.slice(0, 3).map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => setQuestion(suggestion)}
                      className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded bg-zinc-800/50 hover:bg-zinc-700/50 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>

                {error && <p className="text-red-400 text-sm text-center mt-4">{error}</p>}
              </div>
            )}

            {/* Standard Mode - Full UI */}
            {userLevel !== USER_LEVELS.FIRST_CONTACT && (
            <>
            <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-4 sm:p-6 mb-6 relative">
              {/* Unified Help Button - top right */}
              <button
                onClick={() => setHelpPopover(helpPopover === 'unified' ? null : 'unified')}
                className="help-trigger absolute top-3 right-3 sm:top-4 sm:right-4 w-7 h-7 sm:w-6 sm:h-6 rounded-full bg-[#f59e0b]/20 border border-[#f59e0b]/50 text-[#f59e0b] hover:bg-[#f59e0b]/30 hover:text-[#f59e0b] text-xs flex items-center justify-center transition-all z-10"
              >
                ?
              </button>
              {helpPopover === 'unified' && (
                <div className="help-popover-content absolute top-12 right-2 sm:right-4 z-50 w-80 sm:w-96">
                  <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 shadow-xl">
                    <div className="space-y-4 text-sm">
                      <div>
                        <div className="text-amber-400 text-xs font-medium mb-2 uppercase tracking-wide">Modes</div>
                        <div className="space-y-2">
                          <div><span className="text-zinc-200 font-medium">Reflect:</span> <span className="text-zinc-400 text-xs">Static positions you choose. See how specific territories are functioning.</span></div>
                          <div><span className="text-zinc-200 font-medium">Discover:</span> <span className="text-zinc-400 text-xs">Dynamic positions. The system chooses what to show you.</span></div>
                          <div><span className="text-zinc-200 font-medium">Forge:</span> <span className="text-zinc-400 text-xs">Declaration mode. State an intention, draw one card, iterate.</span></div>
                          <div><span className="text-zinc-200 font-medium">Explore:</span> <span className="text-zinc-400 text-xs">Direct Token Protocol. Name what's active, each token gets its own card.</span></div>
                        </div>
                      </div>
                      <div>
                        <div className="text-amber-400 text-xs font-medium mb-2 uppercase tracking-wide">Positions</div>
                        <p className="text-zinc-400 text-xs">In Reflect, positions are semantic lenses you choose. In Discover, they're depth levels — how many signatures the system reveals.</p>
                      </div>
                      <div>
                        <div className="text-amber-400 text-xs font-medium mb-2 uppercase tracking-wide">Voice</div>
                        <p className="text-zinc-400 text-xs">Presets shape how the reading speaks to you — from quick and direct to deep and expansive.</p>
                      </div>
                      <div>
                        <div className="text-amber-400 text-xs font-medium mb-2 uppercase tracking-wide">Spark</div>
                        <p className="text-zinc-400 text-xs">Click Spark to see prompt suggestions if you need inspiration for your question.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Mode Toggle - centered */}
              <div className="flex justify-center items-center mb-4">
                <div className="inline-flex rounded-lg bg-zinc-900 p-1 mode-tabs-container">
                  <button onClick={() => { setSpreadType('reflect'); }}
                    className={`mode-tab px-4 py-2 min-h-[44px] sm:min-h-0 rounded-md text-[0.9375rem] sm:text-sm font-medium sm:font-normal transition-all ${spreadType === 'reflect' ? 'bg-[#2e1065] text-amber-400' : 'text-zinc-400 hover:text-zinc-200'}`}>
                    Reflect
                  </button>
                  <button onClick={() => { setSpreadType('discover'); setSpreadKey('three'); }}
                    className={`mode-tab px-4 py-2 min-h-[44px] sm:min-h-0 rounded-md text-[0.9375rem] sm:text-sm font-medium sm:font-normal transition-all ${spreadType === 'discover' ? 'bg-[#2e1065] text-amber-400' : 'text-zinc-400 hover:text-zinc-200'}`}>
                    Discover
                  </button>
                  <button onClick={() => { setSpreadType('forge'); }}
                    className={`mode-tab px-4 py-2 min-h-[44px] sm:min-h-0 rounded-md text-[0.9375rem] sm:text-sm font-medium sm:font-normal transition-all ${spreadType === 'forge' ? 'bg-[#2e1065] text-amber-400' : 'text-zinc-400 hover:text-zinc-200'}`}>
                    Forge
                  </button>
                  <button onClick={() => { setSpreadType('explore'); }}
                    className={`mode-tab px-4 py-2 min-h-[44px] sm:min-h-0 rounded-md text-[0.9375rem] sm:text-sm font-medium sm:font-normal transition-all ${spreadType === 'explore' ? 'bg-[#2e1065] text-amber-400' : 'text-zinc-400 hover:text-zinc-200'}`}>
                    Explore
                  </button>
                </div>
              </div>

              {/* Spread Selection - changes based on mode */}
              <div className="flex flex-col items-center justify-center w-full max-w-lg mx-auto mb-4 relative">
                {spreadType === 'forge' || spreadType === 'explore' ? (
                  /* Forge/Explore mode - no position selector needed */
                  null
                ) : spreadType === 'reflect' ? (
                  <>
                    {/* Position count selector for Reflect mode */}
                    <div className="flex gap-1 justify-center mb-3">
                      {[1, 2, 3, 4, 5, 6].map((count) => (
                        <button
                          key={count}
                          onClick={() => {
                            setReflectCardCount(count);
                            // Auto-select first spread for this count
                            setReflectSpreadKey(SPREADS_BY_COUNT[count][0]);
                          }}
                          className={`w-9 h-9 sm:w-8 sm:h-8 rounded-md text-sm font-medium transition-all ${
                            reflectCardCount === count
                              ? 'bg-[#2e1065] text-amber-400'
                              : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                          }`}
                        >
                          {count}
                        </button>
                      ))}
                    </div>
                    {/* Spread options for selected count */}
                    <div className="flex gap-1.5 justify-center flex-wrap">
                      {SPREADS_BY_COUNT[reflectCardCount].map((spreadId) => {
                        const spread = REFLECT_SPREADS[spreadId];
                        return (
                          <button
                            key={spreadId}
                            onClick={() => setReflectSpreadKey(spreadId)}
                            className={`px-3 py-2 sm:py-1.5 min-h-[44px] sm:min-h-0 rounded-sm text-[0.8125rem] sm:text-xs font-medium sm:font-normal transition-all ${
                              reflectSpreadKey === spreadId
                                ? 'bg-[#2e1065] text-amber-400'
                                : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                            }`}
                          >
                            {spread.name}
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  /* Discover mode - simple position count as numbers */
                  <div className="flex gap-1 justify-center">
                    {Object.entries(RANDOM_SPREADS).map(([key, value]) => (
                      <button
                        key={key}
                        onClick={() => setSpreadKey(key)}
                        className={`w-9 h-9 sm:w-8 sm:h-8 rounded-md text-sm font-medium transition-all ${
                          spreadKey === key
                            ? 'bg-[#2e1065] text-amber-400'
                            : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                        }`}
                      >
                        {value.count}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Description Block - shows immediately after selections, before style presets */}
              <div className="w-full max-w-lg mx-auto mb-4">
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

              {/* Interpreter Voice Section */}
              <div className="mt-4 pt-4 border-t border-zinc-800/50">
                {/* Header */}
                <div className="text-zinc-600 text-[0.625rem] tracking-widest uppercase mb-3 text-center">── Interpreter Voice ──</div>

                {/* Persona Selector - Always visible */}
                <div className="mb-4">
                  <PersonaSelector
                    persona={persona}
                    setPersona={setPersona}
                    humor={humor}
                    setHumor={setHumor}
                    register={register}
                    setRegister={setRegister}
                    creator={creator}
                    setCreator={setCreator}
                    roastMode={roastMode}
                    setRoastMode={setRoastMode}
                    directMode={directMode}
                    setDirectMode={setDirectMode}
                  />
                </div>

                {/* Advanced Config toggle */}
                <div className="flex justify-center mt-4">
                  <button
                    onClick={() => setShowLandingFineTune(!showLandingFineTune)}
                    className="px-3 py-1.5 text-[0.625rem] text-zinc-500 hover:text-zinc-300 transition-all flex items-center gap-1"
                  >
                    <span>{showLandingFineTune ? '▾' : '▸'}</span>
                    <span>Advanced</span>
                  </button>
                </div>

                {/* Advanced Config panel (hidden by default) */}
                {showLandingFineTune && (
                  <div className="mt-3 bg-zinc-900/50 rounded-xl p-3 border border-zinc-800/50">
                    {/* Delivery Presets - moved here from top level */}
                    <div className="mb-3 pb-3 border-b border-zinc-700/50">
                      <div className="text-[0.625rem] text-zinc-500 mb-1.5 text-center">Delivery Preset</div>
                      <div className="w-full max-w-lg mx-auto">
                        <div className="flex gap-0.5 sm:gap-1.5 justify-center w-full px-0.5 sm:px-0">
                          {Object.entries(DELIVERY_PRESETS).map(([key, preset]) => {
                            const isActive = getCurrentDeliveryPreset()?.[0] === key;
                            const mobileNames = { clear: "Clear", kind: "Kind", playful: "Playful", wise: "Wise", oracle: "Oracle" };
                            return (
                              <button
                                key={key}
                                onClick={() => applyDeliveryPreset(key)}
                                className={`flex-1 px-0.5 sm:px-2 py-2.5 sm:py-1.5 min-h-[44px] sm:min-h-0 rounded-sm text-[0.8125rem] sm:text-[0.6875rem] font-medium sm:font-normal transition-all text-center overflow-hidden ${
                                  isActive
                                    ? 'bg-[#2e1065] text-amber-400'
                                    : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 active:bg-zinc-700'
                                }`}
                              >
                                <span className="sm:hidden">{mobileNames[key]}</span>
                                <span className="hidden sm:inline">{preset.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Voice Preview */}
                    <div className="text-center mb-3 pb-3 border-b border-zinc-700/50">
                      <p className="text-zinc-400 text-sm italic leading-relaxed px-4">
                        <span className="text-zinc-500 not-italic text-xs">Preview:</span> "{buildPreviewSentence(stance.complexity, stance.voice, stance.focus, stance.density, stance.scope, stance.seriousness)}"
                      </p>
                    </div>
                    {/* Complexity Selector */}
                    <div className="mb-3">
                      <div className="text-[0.625rem] text-zinc-500 mb-1.5 text-center">Speak to me like...</div>
                      <div className="flex gap-1 justify-center w-full max-w-sm mx-auto">
                        {Object.entries(COMPLEXITY_OPTIONS).map(([key, opt]) => (
                            <button
                              key={key}
                              onClick={() => setStance({ ...stance, complexity: key })}
                              className={`flex-1 px-1 py-1.5 min-h-[36px] sm:min-h-0 sm:py-1 rounded-sm text-[0.625rem] sm:text-xs transition-all whitespace-nowrap text-center ${
                                stance.complexity === key
                                  ? 'bg-zinc-600 text-zinc-100 border border-zinc-500'
                                  : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300 active:bg-zinc-700 border border-zinc-700/50'
                              }`}
                            >
                              {opt.label}
                            </button>
                        ))}
                      </div>
                    </div>

                    {/* Seriousness/Tone Selector */}
                    <div className="mb-3">
                      <div className="text-[0.625rem] text-zinc-500 mb-1.5 text-center">Tone</div>
                      <div className="flex gap-1 justify-center w-full max-w-sm mx-auto">
                        {Object.entries(SERIOUSNESS_MODIFIERS).map(([key]) => (
                          <button
                            key={key}
                            onClick={() => setStance({ ...stance, seriousness: key })}
                            className={`flex-1 px-1 py-1.5 min-h-[36px] sm:min-h-0 sm:py-1 rounded-sm text-[0.625rem] sm:text-xs transition-all whitespace-nowrap text-center capitalize ${
                              stance.seriousness === key
                                ? 'bg-zinc-600 text-zinc-100 border border-zinc-500'
                                : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300 active:bg-zinc-700 border border-zinc-700/50'
                            }`}
                          >
                            {key}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Stance Grid - only the 4x4 grid */}
                    <StanceSelector
                      stance={stance}
                      setStance={setStance}
                      showCustomize={true}
                      setShowCustomize={() => {}}
                      gridOnly={true}
                    />

                    {/* Model Toggle */}
                    <div className="mt-3 pt-2 border-t border-zinc-700/50">
                      <label className="flex items-center justify-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={useHaiku}
                          onChange={(e) => setUseHaiku(e.target.checked)}
                          className="w-3.5 h-3.5 rounded border-zinc-600 bg-zinc-800 text-amber-500 focus:ring-amber-500 focus:ring-offset-0 cursor-pointer"
                        />
                        <span className="text-[0.625rem] text-zinc-400">Use Haiku (faster)</span>
                      </label>
                      <label className="flex items-center justify-center gap-2 cursor-pointer mt-1.5">
                        <input
                          type="checkbox"
                          checked={showTokenUsage}
                          onChange={(e) => setShowTokenUsage(e.target.checked)}
                          className="w-3.5 h-3.5 rounded border-zinc-600 bg-zinc-800 text-amber-500 focus:ring-amber-500 focus:ring-offset-0 cursor-pointer"
                        />
                        <span className="text-[0.625rem] text-zinc-400">Show token usage</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Question Input Section */}
            <div className="relative mb-3 mt-4">
              {/* Input row with Spark button on left */}
              <div className="flex gap-2">
                {/* Spark button */}
                <button
                  onClick={handleSpark}
                  className="flex-shrink-0 px-3 py-2 rounded-xl bg-[#2e1065] text-amber-400 hover:bg-[#3b1f6e] flex items-center gap-1.5 text-xs transition-colors border border-purple-800/50"
                  title="Get a spark prompt"
                >
                  <span>✨</span>
                  <span className="hidden sm:inline">Spark</span>
                </button>

                {/* Question textarea - switches to DTP input for Explore mode */}
                <div className="relative flex-1">
                  {spreadType === 'explore' ? (
                    <textarea
                      value={dtpInput}
                      onChange={(e) => { setDtpInput(e.target.value); setSparkPlaceholder(''); setShowSparkSuggestions(false); }}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && !loading && (e.preventDefault(), performReading())}
                      placeholder="Describe what's active for you right now...

Example: I want to leave my job to start a bakery but I'm scared and my partner isn't sure about it"
                      className="w-full bg-zinc-800/60 border-2 border-zinc-700/80 rounded-xl p-4 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-600/50 focus:bg-zinc-800/80 resize-none transition-colors text-[1rem] sm:text-base min-h-[120px]"
                      rows={4}
                    />
                  ) : (
                    <textarea
                      value={question}
                      onChange={(e) => { setQuestion(e.target.value); setSparkPlaceholder(''); setShowSparkSuggestions(false); }}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && !loading && (e.preventDefault(), performReading())}
                      placeholder={sparkPlaceholder || (
                        spreadType === 'forge'
                          ? "What are you forging? Declare your intention..."
                          : spreadType === 'reflect'
                            ? "What area of life are you examining?"
                            : "Name your question or declare your intent..."
                      )}
                      className="w-full bg-zinc-800/60 border-2 border-zinc-700/80 rounded-xl p-4 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-600/50 focus:bg-zinc-800/80 resize-none transition-colors text-[1rem] sm:text-base min-h-[100px] sm:min-h-0"
                      rows={3}
                    />
                  )}
                </div>
              </div>

              {/* Spark suggestions panel - shown when Spark is clicked */}
              {showSparkSuggestions && !question.trim() && (
                <div className="mt-3 p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-zinc-500">Tap to insert, or click Spark for more</span>
                    <button
                      onClick={() => setShowSparkSuggestions(false)}
                      className="text-xs text-zinc-600 hover:text-zinc-400"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {STARTERS.map((starter, idx) => (
                      <button
                        key={idx}
                        onClick={() => { setQuestion(starter); setShowSparkSuggestions(false); }}
                        className="text-[0.6875rem] sm:text-xs px-3 py-1.5 rounded-full bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/80 border border-zinc-700/50 transition-all"
                      >
                        {starter}
                      </button>
                    ))}
                    {sparkPlaceholder && (
                      <button
                        onClick={() => { setQuestion(sparkPlaceholder); setShowSparkSuggestions(false); }}
                        className="text-[0.6875rem] sm:text-xs px-3 py-1.5 rounded-full bg-[#2e1065]/50 text-amber-400 hover:bg-[#2e1065] border border-purple-800/50 transition-all"
                      >
                        {sparkPlaceholder}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Action button below input */}
              <div className="mt-3">
                <button
                  onClick={performReading}
                  disabled={loading}
                  className="w-full sm:w-auto sm:mx-auto sm:block px-8 py-3 min-h-[48px] bg-[#052e23] hover:bg-[#064e3b] disabled:bg-zinc-900 disabled:text-zinc-700 rounded-xl transition-all text-base text-[#f59e0b] font-medium border border-emerald-700/50"
                >
                  {loading ? 'Drawing...' : (spreadType === 'forge' ? 'Forge →' : spreadType === 'reflect' ? 'Reflect →' : spreadType === 'explore' ? 'Read This →' : 'Discover →')}
                </button>
              </div>
            </div>
            </>
            )}
          </>
        )}

        {/* Loading */}
        {loading && !expanding && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="relative">
              <div className="w-16 h-16 border-2 border-zinc-800 rounded-full"></div>
              <div className="absolute inset-0 w-16 h-16 border-2 border-transparent border-t-zinc-400 rounded-full animate-spin"></div>
            </div>
            <p
              className="mt-6 text-zinc-500 text-sm text-center max-w-xs transition-opacity duration-300"
              style={{ opacity: loadingPhraseVisible ? 1 : 0 }}
            >
              {loadingPhrases[loadingPhraseIndex] || ''}
            </p>
          </div>
        )}

        {/* Error */}
        {error && <div className="bg-red-950/30 border border-red-900/50 rounded-xl p-4 my-4 text-red-400 text-sm">{error}</div>}

        {/* DTP (Explore) Reading Output */}
        {dtpResponse && !loading && (
          <div className="max-w-4xl mx-auto mb-8">
            {/* Header with token count */}
            <div className="text-center mb-6">
              <span className="text-xs text-zinc-500 uppercase tracking-wider">
                Explore • {dtpResponse.tokens.length} token{dtpResponse.tokens.length !== 1 ? 's' : ''} extracted
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex justify-center gap-2 items-center mb-6">
              <button onClick={resetReading} className="text-xs text-[#f59e0b] hover:text-yellow-300 transition-colors px-2 py-1 rounded bg-[#052e23] hover:bg-[#064e3b] border border-emerald-700/50">New Reading</button>
            </div>

            {/* Token readings */}
            <div className="space-y-6">
              {dtpResponse.readings.map((reading, idx) => {
                const draw = dtpResponse.draws[reading.drawIndex ?? idx];
                const trans = draw ? getComponent(draw.transient) : null;
                const pos = draw ? ARCHETYPES[draw.position] : null;
                const stat = draw ? STATUSES[draw.status] : null;
                const statusColor = stat?.id === 1 ? 'border-emerald-600/50 bg-emerald-950/20' :
                                   stat?.id === 2 ? 'border-red-600/50 bg-red-950/20' :
                                   stat?.id === 3 ? 'border-blue-600/50 bg-blue-950/20' : 'border-purple-600/50 bg-purple-950/20';

                return (
                  <div key={idx} className={`rounded-xl border ${statusColor} p-6`}>
                    {/* Token header */}
                    <div className="text-amber-400 text-sm font-medium mb-3 uppercase tracking-wider">
                      Regarding: {reading.token}
                    </div>

                    {/* Three-line sentence */}
                    {reading.threeLine && (
                      <div className="text-zinc-400 text-sm italic mb-4">
                        {reading.threeLine}
                      </div>
                    )}

                    {/* Card info */}
                    {trans && (
                      <div className="text-zinc-500 text-xs mb-4">
                        {stat?.prefix ? `${stat.prefix} ` : ''}{trans.name} in {pos?.name || 'Unknown'} — {stat?.name}
                      </div>
                    )}

                    {/* Interpretation */}
                    <div className="text-zinc-300 text-base leading-relaxed">
                      <ReactMarkdown>{reading.interpretation || ''}</ReactMarkdown>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Synthesis */}
            {dtpResponse.synthesis && (
              <div className="mt-8 rounded-xl border border-zinc-700/50 bg-zinc-900/30 p-6">
                <div className="text-zinc-400 text-xs uppercase tracking-wider mb-3">Synthesis</div>
                <div className="text-zinc-300 text-base leading-relaxed">
                  <ReactMarkdown>{dtpResponse.synthesis}</ReactMarkdown>
                </div>
              </div>
            )}

            {/* Token usage */}
            {showTokenUsage && tokenUsage && (
              <div className="mt-4 text-center text-xs text-zinc-600">
                Tokens: {tokenUsage.input_tokens?.toLocaleString()} in / {tokenUsage.output_tokens?.toLocaleString()} out
              </div>
            )}
          </div>
        )}

        {/* First Contact Reading Output - Simplified display */}
        {draws && !loading && parsedReading?.firstContact && userLevel === USER_LEVELS.FIRST_CONTACT && (
          <div className="max-w-lg mx-auto mb-8">
            {/* Simple card display */}
            <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-6 mb-4">
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
            <div className="bg-zinc-900/30 rounded-xl border border-zinc-800/50 p-6">
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
            <div className="flex justify-center gap-3 mt-6">
              <button
                onClick={resetReading}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 text-zinc-900 font-medium hover:from-amber-500 hover:to-amber-400 transition-all"
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
                  {spreadType === 'reflect' ? `Reflect • ${REFLECT_SPREADS[reflectSpreadKey]?.name}` : `Discover • ${RANDOM_SPREADS[spreadKey]?.name}`} • {getCurrentStanceLabel()}
                </span>
              </div>
              {/* Action buttons row */}
              <div className="flex justify-center gap-2 items-center relative mb-4">
                {parsedReading && !loading && (
                  <button onClick={exportToHTML} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1 rounded bg-zinc-800/50">Export</button>
                )}
                <button onClick={() => setShowTraditional(!showTraditional)} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1 rounded bg-zinc-800/50">{showTraditional ? 'Hide Traditional' : 'Traditional'}</button>
                <button onClick={() => setShowArchitecture(!showArchitecture)} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1 rounded bg-zinc-800/50">{showArchitecture ? 'Hide Architecture' : 'Architecture'}</button>
                <button onClick={resetReading} className="text-xs text-[#f59e0b] hover:text-yellow-300 transition-colors px-2 py-1 rounded bg-[#052e23] hover:bg-[#064e3b] border border-emerald-700/50">New</button>
                <button
                  onClick={() => setHelpPopover(helpPopover === 'actions' ? null : 'actions')}
                  className="w-4 h-4 rounded-full bg-[#f59e0b]/20 border border-[#f59e0b]/50 text-[#f59e0b] hover:bg-[#f59e0b]/30 hover:text-[#f59e0b] text-[0.625rem] flex items-center justify-center transition-all"
                >
                  ?
                </button>
                {helpPopover === 'actions' && (
                  <div className="absolute top-full right-0 mt-2 z-50 w-64">
                    <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-3 shadow-xl text-xs">
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
              <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 overflow-hidden">
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
              <div className="mt-6 bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-4">
                <div className="text-xs text-zinc-500 uppercase tracking-wider mb-4">Architecture Details</div>
                
                <div className="space-y-4 mb-6">
                  {draws.map((draw, i) => {
                    const isReflect = spreadType === 'reflect';
                    const spreadConfig = isReflect ? REFLECT_SPREADS[spreadKey] : RANDOM_SPREADS[spreadKey];
                    const trans = getComponent(draw.transient);
                    const stat = STATUSES[draw.status];
                    const pos = draw.position !== null ? ARCHETYPES[draw.position] : null;
                    const transArchetype = trans.archetype !== undefined ? ARCHETYPES[trans.archetype] : null;
                    const correction = getFullCorrection(draw.transient, draw.status);
                    const label = isReflect ? spreadConfig?.positions?.[i]?.name : (pos?.name || 'Draw');
                    
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
                        const isReflect = spreadType === 'reflect';
                        const spreadConfig = isReflect ? REFLECT_SPREADS[spreadKey] : null;

                        // House grouping only for Discover mode (Reflect mode doesn't have house per position)
                        if (!isReflect) {
                          const houseGroups = {};
                          draws.forEach((draw, i) => {
                            const house = draw.position !== null ? ARCHETYPES[draw.position]?.house : null;
                            if (house) {
                              if (!houseGroups[house]) houseGroups[house] = [];
                              const label = ARCHETYPES[draw.position]?.name;
                              houseGroups[house].push(label);
                            }
                          });
                          Object.entries(houseGroups).forEach(([house, cards]) => {
                            if (cards.length > 1) {
                              relationships.push(`${house} House: ${cards.join(' & ')} share domain`);
                            }
                          });
                        }

                        const channelGroups = {};
                        draws.forEach((draw, i) => {
                          const trans = getComponent(draw.transient);
                          if (trans.channel) {
                            if (!channelGroups[trans.channel]) channelGroups[trans.channel] = [];
                            const label = isReflect ? spreadConfig?.positions?.[i]?.name : (draw.position !== null ? ARCHETYPES[draw.position]?.name : `Signature ${i+1}`);
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
                                    const label1 = isReflect ? spreadConfig?.positions?.[i]?.name : ARCHETYPES[draw.position]?.name;
                                    const label2 = isReflect ? spreadConfig?.positions?.[j]?.name : ARCHETYPES[otherDraw.position]?.name;
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

        {/* Your Question - shows after visual spread */}
        {parsedReading && !loading && !parsedReading.firstContact && question && (
          <div className="bg-zinc-800/50 rounded-xl p-4 mb-6 mx-8">
            <div className="text-[0.625rem] text-zinc-500 tracking-wider mb-2">Your question or intention</div>
            <div className="text-zinc-300 text-sm">{question}</div>
          </div>
        )}

        {/* Letter - after Question */}
        {parsedReading && !loading && parsedReading.letter && !parsedReading.firstContact && (() => {
          // Handle both legacy (string) and new (object) formats
          const letter = parsedReading.letter;
          const isLegacy = typeof letter === 'string';
          // Helper to get shallow content (first 1-2 sentences from wade)
          const getShallowContent = (wadeContent) => {
            if (!wadeContent) return '';
            const sentences = wadeContent.split(/(?<=[.!?])\s+/);
            return sentences.slice(0, 2).join(' ');
          };
          const letterContent = isLegacy
            ? letter
            : letterDepth === 'shallow'
              ? getShallowContent(letter.wade || letter.surface || '')
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
            <div className="mb-6 rounded-xl border-2 border-violet-500/40 bg-violet-950/20 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-violet-400">✉</span>
                  <span className="text-sm font-medium text-violet-400 uppercase tracking-wider">Letter</span>
                </div>
                {/* Depth navigation buttons */}
                {hasDepthLevels && !letterLoadingDeeper && (
                  <div className="flex gap-1">
                    {['shallow', 'wade', 'swim', 'deep'].map((level) => {
                      // Shallow derives from wade, so has content if wade does
                      const hasContent = level === 'shallow' ? letter.wade : letter[level];
                      const isActive = letterDepth === level;
                      return (
                        <button
                          key={level}
                          onClick={() => {
                            // Shallow and Wade don't need API calls
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
              <div className="text-zinc-300 leading-relaxed text-sm space-y-3 mb-4">
                {letterContent ? (
                  letterContent.split(/\n\n+/).filter(p => p.trim()).map((para, i) => (
                    <p key={i} className="whitespace-pre-wrap">
                      {renderWithHotlinks(para.trim(), setSelectedInfo, showTraditional)}
                    </p>
                  ))
                ) : (
                  <span className="text-zinc-500 italic">Letter content unavailable</span>
                )}
              </div>

              {/* Expansion buttons (excluding architecture - cards have that as own section) */}
              {handleExpand && (
                <div className="flex gap-2 flex-wrap mb-4">
                  {Object.entries(EXPANSION_PROMPTS)
                    .filter(([key]) => key !== 'architecture')
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
                </div>
              )}

              {/* Expansion content display - collapsible, never deleted */}
              {Object.entries(sectionExpansions).map(([expType, content]) => {
                if (!content) return null;
                const expKey = `letter-exp-${expType}`;
                const isExpCollapsed = collapsedSections[expKey] === true;
                return (
                  <div key={expType} className="mb-3 rounded-lg border border-zinc-700/50 overflow-hidden bg-zinc-900/60">
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

        {/* Overview (Summary) - after Letter, with depth navigation */}
        {parsedReading && !loading && parsedReading.summary && !parsedReading.firstContact && (() => {
          const isSummaryCollapsed = collapsedSections['summary'] === true; // expanded by default
          const summary = parsedReading.summary;
          const hasDepthLevels = typeof summary === 'object' && (summary.surface || summary.wade || summary.swim || summary.deep);
          const summaryContent = getSummaryContent(summary, summaryDepth);
          const summaryExpansions = expansions['summary'] || {};
          const isSummaryExpanding = expanding?.section === 'summary';

          return (
            <div className="mb-6 rounded-xl border-2 border-amber-500/50 overflow-hidden" style={{background: 'linear-gradient(to bottom right, rgba(69, 26, 3, 0.4), rgba(120, 53, 15, 0.2))'}}>
              <div className="p-5">
                {/* Summary Header - clickable for collapse */}
                <div
                  className={`flex items-center justify-between cursor-pointer ${!isSummaryCollapsed ? 'mb-4' : ''}`}
                  onClick={() => toggleCollapse('summary', false)}
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-xs transition-transform duration-200 ${isSummaryCollapsed ? 'text-red-500' : 'text-amber-500'}`} style={{ transform: isSummaryCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>
                      ▼
                    </span>
                    <span className="text-sm font-medium text-amber-400 uppercase tracking-wider">Overview</span>
                  </div>
                  {/* Depth navigation buttons */}
                  {hasDepthLevels && !isSummaryCollapsed && !synthesisLoadingDeeper && (
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      {['shallow', 'wade', 'swim', 'deep'].map((level) => {
                        // Shallow derives from wade, so has content if wade does
                        const hasContent = typeof summary === 'object' && (level === 'shallow' ? summary.wade : summary[level]);
                        const isActive = summaryDepth === level;
                        return (
                          <button
                            key={level}
                            onClick={() => {
                              // Shallow and Wade don't need API calls
                              if (level === 'shallow' || level === 'wade') {
                                setSummaryDepth(level);
                              } else {
                                loadDeeperSynthesis(level);
                              }
                            }}
                            disabled={synthesisLoadingDeeper}
                            className={`px-2 py-0.5 text-xs rounded transition-colors ${
                              isActive
                                ? 'bg-amber-500 text-white'
                                : hasContent
                                  ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300'
                                  : 'bg-zinc-800/50 text-zinc-600 border border-dashed border-zinc-700 hover:border-amber-500/50'
                            }`}
                          >
                            {level.charAt(0).toUpperCase() + level.slice(1)}
                            {!hasContent && <span className="ml-0.5 opacity-60">+</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {synthesisLoadingDeeper && !isSummaryCollapsed && (
                    <span className="text-xs"><PulsatingLoader color="text-amber-400" /></span>
                  )}
                </div>

                {/* Summary Content - collapsible */}
                {!isSummaryCollapsed && (
                  <>
                    <div className="text-zinc-300 leading-relaxed text-sm space-y-3 mb-4">
                      {summaryContent ? (
                        ensureParagraphBreaks(summaryContent).split(/\n\n+/).filter(p => p.trim()).map((para, i) => (
                          <p key={i} className="whitespace-pre-wrap">
                            {renderWithHotlinks(para.trim(), setSelectedInfo, showTraditional)}
                          </p>
                        ))
                      ) : (
                        <span className="text-zinc-500 italic">Overview content unavailable</span>
                      )}
                    </div>

                    {/* Summary Expansion Buttons (excluding architecture) */}
                    <div className="flex gap-2 flex-wrap mb-4">
                      {Object.entries(EXPANSION_PROMPTS)
                        .filter(([key]) => key !== 'architecture')
                        .map(([key, { label }]) => {
                        const isThisExpanding = isSummaryExpanding && expanding?.type === key;
                        const hasExpansion = !!summaryExpansions[key];
                        const isExpandingOther = expanding && !isThisExpanding;

                        return (
                          <button
                            key={key}
                            onClick={(e) => { e.stopPropagation(); handleExpand('summary', key); }}
                            disabled={expanding}
                            className={`text-xs px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                              hasExpansion
                                ? 'bg-amber-800/50 text-amber-200 border border-amber-600/50'
                                : 'bg-zinc-800/50 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                            } ${isExpandingOther ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {isThisExpanding ? (
                              <span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></span>
                            ) : null}
                            {label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Expansion content display - collapsible */}
                    {Object.entries(summaryExpansions).map(([expType, content]) => {
                      if (!content) return null;
                      const expKey = `summary-exp-${expType}`;
                      const isExpCollapsed = collapsedSections[expKey] === true;
                      return (
                        <div key={expType} className="mb-3 rounded-lg border border-zinc-700/50 overflow-hidden bg-zinc-900/60">
                          <div
                            className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-zinc-800/50 transition-colors"
                            onClick={() => toggleCollapse(expKey, true)}
                          >
                            <span
                              className={`text-xs transition-transform duration-200 ${isExpCollapsed ? 'text-red-500' : 'text-amber-400'}`}
                              style={{ transform: isExpCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
                            >
                              ▼
                            </span>
                            <span className="text-xs text-zinc-400 uppercase tracking-wider">{EXPANSION_PROMPTS[expType]?.label}</span>
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
                  </>
                )}
              </div>
            </div>
          );
        })()}

        {/* Parsed Reading Sections (Individual Cards, Path, Words to the Whys) - hide in First Contact mode */}
        {parsedReading && !loading && !parsedReading.firstContact && (
          <div className="space-y-2">
            {/* Signature Sections with nested Rebalancers - using new DepthCard component */}
            {parsedReading.cards.map((card) => {
              // New structure: card has .surface, .wade, .swim, .architecture, .mirror, .rebalancer
              const cardSectionKey = `card-${card.index}`;
              const isCardLoading = cardLoading[card.index];
              const isCardLoaded = cardLoaded[card.index] || !card._notLoaded;

              // On-demand loading trigger
              const triggerCardLoad = () => {
                if (!isCardLoaded && !isCardLoading && parsedReading._onDemand) {
                  loadCardDepth(card.index, draws, question, parsedReading.letter, systemPromptCache);
                }
              };

              return (
                <div key={`card-group-${card.index}`} id={`content-${card.index}`}>
                  <DepthCard
                    cardData={card}
                    draw={draws[card.index]}
                    showTraditional={showTraditional}
                    setSelectedInfo={setSelectedInfo}
                    spreadType={spreadType}
                    spreadKey={spreadType === 'reflect' ? reflectSpreadKey : spreadKey}
                    // Expansion props
                    onExpand={handleExpand}
                    expansions={expansions}
                    expanding={expanding}
                    // Thread props
                    threadData={threadData[cardSectionKey] || []}
                    threadOperation={threadOperations[cardSectionKey]}
                    threadContext={threadContexts[cardSectionKey]}
                    onSetThreadOperation={(op) => setThreadOperations(prev => ({ ...prev, [cardSectionKey]: op }))}
                    onSetThreadContext={(ctx) => setThreadContexts(prev => ({ ...prev, [cardSectionKey]: ctx }))}
                    onContinueThread={() => continueThread(cardSectionKey)}
                    threadLoading={threadLoading[cardSectionKey]}
                    collapsedThreads={collapsedThreads}
                    setCollapsedThreads={setCollapsedThreads}
                    question={question}
                    // On-demand loading props
                    isLoading={isCardLoading}
                    isNotLoaded={card._notLoaded && !isCardLoaded}
                    onRequestLoad={triggerCardLoad}
                    // Progressive deepening props
                    onLoadDeeper={loadDeeperContent}
                    isLoadingDeeper={!!cardLoadingDeeper[card.index]}
                  />
                </div>
              );
            })}

            {/* Synthesis Loading Indicator - shows when all cards loaded but synthesis pending */}
            {parsedReading._onDemand && synthesisLoading && (
              <div className="mb-6 rounded-xl border-2 border-zinc-600/40 p-5 bg-zinc-900/50">
                <div className="flex items-center gap-3">
                  <span className="text-sm"><PulsatingLoader color="text-amber-400" /></span>
                </div>
              </div>
            )}

            {/* Translation Loading Indicator - shows when persona translation in progress */}
            {translating && (
              <div className="mb-6 rounded-xl border-2 border-amber-600/40 p-5 bg-amber-900/20">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-amber-400 animate-pulse">
                    Finding your {persona.charAt(0).toUpperCase() + persona.slice(1)} voice...
                  </span>
                </div>
              </div>
            )}

            {/* Synthesis Not Yet Available - shows when cards still loading */}
            {parsedReading._onDemand && !synthesisLoaded && !synthesisLoading && !parsedReading.summary && (
              <div className="mb-6 rounded-xl border-2 border-zinc-600/40 p-5 bg-zinc-900/30">
                <div className="flex items-center gap-3 text-zinc-500">
                  <span className="text-sm">Overview and Path will appear after all cards are loaded</span>
                </div>
              </div>
            )}

            {/* Path to Balance - ALWAYS shown (holistic synthesis), collapsed by default */}
            {/* Uses parsedReading.path with depth levels (surface, wade, swim, deep) */}
            {(parsedReading.path?.surface || parsedReading.path?.wade || parsedReading.path?.swim || parsedReading.path?.deep || parsedReading.rebalancerSummary) && (() => {
              const path = parsedReading.path || {};
              const hasDepthLevels = path.surface || path.wade || path.swim || path.deep;
              // Use explicit null check to avoid empty string fallback issues
              const getPathContent = () => {
                if (hasDepthLevels) {
                  // Handle shallow depth - derive from wade content
                  if (pathDepth === 'shallow') {
                    const wadeContent = path.wade || path.surface || '';
                    if (!wadeContent) return '';
                    const sentences = wadeContent.split(/(?<=[.!?])\s+/);
                    return sentences.slice(0, 2).join(' ');
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
                <div className="mb-6 rounded-xl border-2 border-emerald-500/60 overflow-hidden" style={{background: 'linear-gradient(to bottom right, rgba(6, 78, 59, 0.3), rgba(16, 185, 129, 0.15))'}}>
                  <div className="p-5">
                    {/* Path Header - clickable for collapse */}
                    <div
                      className={`flex items-center justify-between cursor-pointer ${!isPathCollapsed ? 'mb-4' : ''}`}
                      onClick={() => toggleCollapse('path', true)}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`text-xs transition-transform duration-200 ${isPathCollapsed ? 'text-red-500' : 'text-emerald-500'}`} style={{ transform: isPathCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>
                          ▼
                        </span>
                        <span className="text-lg">◈</span>
                        <span className="text-sm font-medium text-emerald-400 uppercase tracking-wider">Path to Balance</span>
                      </div>
                      {/* Depth navigation buttons */}
                      {hasDepthLevels && !isPathCollapsed && !synthesisLoadingDeeper && (
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          {['shallow', 'wade', 'swim', 'deep'].map((level) => {
                            // Shallow derives from wade, so has content if wade does
                            const hasContent = level === 'shallow' ? path.wade : path[level];
                            const isActive = pathDepth === level;
                            return (
                              <button
                                key={level}
                                onClick={() => {
                                  // Shallow and Wade don't need API calls
                                  if (level === 'shallow' || level === 'wade') {
                                    setPathDepth(level);
                                  } else {
                                    loadDeeperSynthesis(level);
                                  }
                                }}
                                disabled={synthesisLoadingDeeper}
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
                      {synthesisLoadingDeeper && !isPathCollapsed && (
                        <span className="text-xs"><PulsatingLoader color="text-emerald-400" /></span>
                      )}
                    </div>

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
                            .filter(([key]) => key !== 'architecture')
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
                        </div>

                        {/* Path Expansion Content */}
                        {Object.entries(pathExpansions).map(([expType, expContent]) => (
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
                                className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${threadOperations['path'] && !threadLoading['path'] ? 'bg-[#052e23] text-[#f59e0b] hover:bg-[#064e3b] border border-emerald-700/50' : 'bg-zinc-900 text-zinc-600 cursor-not-allowed'}`}
                              >
                                {threadLoading['path'] ? <><span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></span>Drawing...</> : 'Continue'}
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Thread Results for Path */}
                        {threadData['path'] && threadData['path'].length > 0 && (
                          <div className="border-t border-emerald-700/50 mt-5 pt-5 space-y-4">
                            {threadData['path'].map((threadItem, threadIndex) => {
                              const isReflect = threadItem.operation === 'reflect';
                              const trans = getComponent(threadItem.draw.transient);
                              const stat = STATUSES[threadItem.draw.status];
                              const statusPrefix = stat.prefix || 'Balanced';
                              return (
                                <div key={threadIndex} className={`rounded-lg p-4 ${isReflect ? 'border border-sky-500/30 bg-sky-950/20' : 'border border-orange-500/30 bg-orange-950/20'}`}>
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
                                  <div className="flex items-center gap-2 mb-2">
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
              <div className="mb-6 rounded-xl border-2 border-violet-500/40 overflow-hidden" style={{background: 'linear-gradient(to bottom right, rgba(76, 29, 149, 0.2), rgba(139, 92, 246, 0.1))'}}>
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

            {/* Unified Reflect/Forge Section - ONE set of buttons at the bottom */}
            <div className="mt-6 pt-4 border-t border-zinc-800/50">
              <div className="text-center mb-4">
                <span className="text-xs text-zinc-500 uppercase tracking-wider">Continue exploring</span>
              </div>

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
                      className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        threadOperations['unified'] === 'reflect'
                          ? 'bg-sky-900/60 text-sky-300 border-2 border-sky-500/60'
                          : 'bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:text-zinc-200 hover:border-zinc-600'
                      }`}
                    >
                      ↩ Reflect
                    </button>
                    <button
                      onClick={() => setThreadOperations(prev => ({ ...prev, unified: 'forge' }))}
                      className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        threadOperations['unified'] === 'forge'
                          ? 'bg-orange-900/60 text-orange-300 border-2 border-orange-500/60'
                          : 'bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:text-zinc-200 hover:border-zinc-600'
                      }`}
                    >
                      ⚡ Forge
                    </button>
                  </div>

                  <textarea
                    value={threadContexts['unified'] || ''}
                    onChange={(e) => setThreadContexts(prev => ({ ...prev, unified: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && threadOperations['unified'] && !threadLoading['unified']) {
                        e.preventDefault();
                        continueThread('unified');
                      }
                    }}
                    placeholder="What are you exploring or creating?"
                    rows={2}
                    className="w-full bg-zinc-900/50 border border-zinc-700/50 rounded-lg px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors resize-none mb-4"
                  />

                  <button
                    onClick={() => continueThread('unified')}
                    disabled={!threadOperations['unified'] || threadLoading['unified']}
                    className={`w-full px-6 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                      threadOperations['unified'] && !threadLoading['unified']
                        ? 'bg-[#052e23] text-[#f59e0b] hover:bg-[#064e3b] border border-emerald-700/50'
                        : 'bg-zinc-900 text-zinc-600 cursor-not-allowed'
                    }`}
                  >
                    {threadLoading['unified'] ? (
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

              {/* Unified Thread Results */}
              {threadData['unified'] && threadData['unified'].length > 0 && (
                <div className="mt-5 space-y-4">
                  {threadData['unified'].map((threadItem, threadIndex) => {
                    const isReflect = threadItem.operation === 'reflect';
                    const trans = getComponent(threadItem.draw.transient);
                    const stat = STATUSES[threadItem.draw.status];
                    const statusPrefix = stat.prefix || 'Balanced';
                    return (
                      <div key={threadIndex} className={`rounded-lg p-4 ${isReflect ? 'border border-sky-500/30 bg-sky-950/20' : 'border border-orange-500/30 bg-orange-950/20'}`}>
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
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full cursor-pointer hover:ring-1 hover:ring-white/30 ${STATUS_COLORS[threadItem.draw.status]}`}
                            onClick={() => setSelectedInfo({ type: 'status', id: threadItem.draw.status, data: STATUS_INFO[threadItem.draw.status] })}
                          >
                            {stat.name}
                          </span>
                          <span className="text-sm font-medium text-zinc-200">
                            <span
                              className="cursor-pointer hover:underline decoration-dotted underline-offset-2"
                              onClick={() => setSelectedInfo({ type: 'status', id: threadItem.draw.status, data: STATUS_INFO[threadItem.draw.status] })}
                            >
                              {statusPrefix}
                            </span>
                            {statusPrefix && ' '}
                            <span
                              className="cursor-pointer hover:underline decoration-dotted underline-offset-2 text-amber-300/90"
                              onClick={() => setSelectedInfo({ type: 'card', id: threadItem.draw.transient, data: getComponent(threadItem.draw.transient) })}
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
            </div>

            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Follow-up Messages */}
        {followUpMessages.length > 0 && (
          <div className="space-y-4 mt-6">
            {followUpMessages.map((msg, i) => (
              <div key={i} className={`rounded-xl p-4 ${msg.role === 'user' ? 'bg-zinc-800/50 ml-8' : 'bg-zinc-900/50 border border-zinc-800/50'}`}>
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
        {parsedReading && !loading && !parsedReading.firstContact && (
          <div className="mt-6 pt-4 border-t border-zinc-800/50 relative">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[0.625rem] text-zinc-500 tracking-wider">Continue the conversation</span>
              <button
                onClick={() => setHelpPopover(helpPopover === 'followup' ? null : 'followup')}
                className="w-4 h-4 rounded-full bg-[#f59e0b]/20 border border-[#f59e0b]/50 text-[#f59e0b] hover:bg-[#f59e0b]/30 hover:text-[#f59e0b] text-[0.625rem] flex items-center justify-center transition-all"
              >
                ?
              </button>
              {helpPopover === 'followup' && (
                <div className="absolute top-8 left-0 z-50 w-72">
                  <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-3 shadow-xl">
                    <p className="text-zinc-400 text-xs leading-relaxed">
                      Ask anything — dig deeper, challenge it, ask about a specific part, or take the conversation wherever you need.
                    </p>
                    <button onClick={() => setHelpPopover(null)} className="mt-2 text-xs text-zinc-500 hover:text-zinc-300 w-full text-center">Got it</button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2 items-center">
              <input type="text" value={followUp} onChange={(e) => setFollowUp(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !followUpLoading && sendFollowUp()}
                placeholder={followUpLoading ? "Thinking..." : "Ask a follow-up question..."}
                disabled={followUpLoading}
                className="flex-1 min-w-0 bg-zinc-900/50 border border-zinc-700/50 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors text-sm disabled:opacity-50" />
              <button onClick={sendFollowUp} disabled={followUpLoading || !followUp.trim()}
                className="flex-shrink-0 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-700 border border-zinc-600 px-6 py-3 rounded-xl transition-all flex items-center justify-center min-w-[52px] text-zinc-200">
                {followUpLoading ? (
                  <div className="w-4 h-4 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin"></div>
                ) : '→'}
              </button>
            </div>
          </div>
        )}

        {/* Adjust Stance - at the bottom - hide in First Contact mode */}
        {parsedReading && !loading && !parsedReading.firstContact && (
          <div className="mt-6 relative">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowMidReadingStance(!showMidReadingStance)}
                className={`flex-1 text-left px-4 py-3 rounded-xl transition-all ${
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
                <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 shadow-xl">
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
              <div className="mt-3 bg-zinc-900/30 rounded-xl border border-zinc-800/30 p-4">
                {/* Voice Settings - Post-Reading (locked) */}
                <div>
                  <PersonaSelector
                    persona={persona}
                    setPersona={setPersona}
                    humor={humor}
                    setHumor={setHumor}
                    register={register}
                    setRegister={setRegister}
                    creator={creator}
                    setCreator={setCreator}
                    roastMode={roastMode}
                    setRoastMode={setRoastMode}
                    directMode={directMode}
                    setDirectMode={setDirectMode}
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
                  <div className="mt-3 bg-zinc-900/50 rounded-xl p-3 border border-zinc-800/50 space-y-3">
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

                    {/* Model Toggle */}
                    <div className="pt-3 border-t border-zinc-700/50">
                      <label className="flex items-center justify-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={useHaiku}
                          onChange={(e) => setUseHaiku(e.target.checked)}
                          className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-amber-500 focus:ring-amber-500 focus:ring-offset-0 cursor-pointer"
                        />
                        <span className="text-xs text-zinc-400">Use Haiku (faster)</span>
                      </label>
                      <label className="flex items-center justify-center gap-2 cursor-pointer mt-2">
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
                    className="w-full bg-[#052e23] hover:bg-[#064e3b] text-[#f59e0b] py-2 rounded-lg text-sm transition-colors border border-emerald-700/50"
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
              (tokenUsage.input_tokens * (useHaiku ? 0.001 : 0.003) / 1000) +
              (tokenUsage.output_tokens * (useHaiku ? 0.005 : 0.015) / 1000)
            ).toFixed(4)} ({useHaiku ? 'Haiku' : 'Sonnet'})
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

        {/* Footer */}
        <p className="text-center text-zinc-800 text-[0.625rem] mt-8 tracking-wider">The structure is the authority. Encounter precedes understanding.</p>
      </div>

      {/* Info Modal */}
      <InfoModal info={selectedInfo} onClose={() => setSelectedInfo(null)} setSelectedInfo={setSelectedInfo} showTraditional={showTraditional} />

      {/* Glossary Tooltip */}
      {glossaryTooltip && (
        <GlossaryTooltip
          entry={glossaryTooltip.entry}
          position={glossaryTooltip.position}
          onClose={() => setGlossaryTooltip(null)}
        />
      )}
    </div>
  );
}
