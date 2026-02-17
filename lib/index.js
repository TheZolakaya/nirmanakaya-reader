// === LIB INDEX ===
// Re-exports all lib modules for convenient importing

// Version (single source of truth)
export { VERSION } from './version.js';

// Core data
export { ARCHETYPES, BOUNDS, AGENTS } from './archetypes.js';

// Constants
export {
  STATUSES,
  STATUS_INFO,
  CHANNELS,
  HOUSES,
  ROLES,
  HOUSE_COLORS,
  STATUS_COLORS,
  CHANNEL_CROSSINGS,
  CHANNEL_COLORS
} from './constants.js';

// Spreads
export {
  DURABLE_SPREADS,
  RANDOM_SPREADS,
  MODE_HELPER_TEXT,
  REFLECT_SPREADS,
  SPREADS_BY_COUNT,
  MODE_EXPLANATIONS
} from './spreads.js';

// Voice/Stance system — REMOVED in V3 voice refactor
// voice.js deleted. All voice control now in personas.js.
// Stubs below keep page.js compiling until Phase 3 removes these imports.
const _emptyObj = {};
const _noop = () => '';
export const VOICE_MODIFIERS = _emptyObj;
export const FOCUS_MODIFIERS = _emptyObj;
export const DENSITY_MODIFIERS = _emptyObj;
export const SCOPE_MODIFIERS = _emptyObj;
export const COMPLEXITY_MODIFIERS = _emptyObj;
export const SERIOUSNESS_MODIFIERS = _emptyObj;
export const DELIVERY_PRESETS = _emptyObj;
export const STANCE_PRESETS = _emptyObj;
export const VOICE_LETTER_TONE = _emptyObj;
export const buildStancePrompt = _noop;
export const buildPreviewSentence = _noop;
// Old personas.js exports removed in V3
export const reconstructReadingText = _noop;
export const validateMarkerPreservation = () => true;
export const parseTranslatedReading = (text) => text;
export const DEFAULT_PERSONA_SETTINGS = { persona: 'friend', humor: 5, complexity: 'clear' };
export const REGISTER_LEVELS = _emptyObj;
export const CREATOR_LEVELS = _emptyObj;

// Prompts
export {
  BASE_SYSTEM,
  FORMAT_INSTRUCTIONS,
  EXPANSION_PROMPTS,
  SUGGESTIONS,
  STARTERS,
  LOADING_PHRASES,
  CORE_PROMPT,
  FIRST_CONTACT_FORMAT
} from './prompts.js';

// Prompt Builder (level-based assembly)
export {
  USER_LEVELS,
  buildSystemPrompt,
  buildUserMessage,
  getAPIConfig,
  parseFirstContactResponse
} from './promptBuilder.js';

// Corrections
export {
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
  getCorrectionTargetId
} from './corrections.js';

// Utilities
export {
  ensureParagraphBreaks,
  shuffleArray,
  generateSpread,
  generateDynamicDraws,
  encodeDraws,
  decodeDraws,
  sanitizeForAPI,
  formatDrawForAI,
  parseReadingResponse,
  parseReadingResponseLegacy,
  getCorrectionTargetName
} from './utils.js';

// Hotlinks
export {
  parseSimpleMarkdown,
  buildHotlinkTerms,
  HOTLINK_TERMS,
  SORTED_TERM_KEYS,
  HOTLINK_PATTERN,
  renderWithHotlinks,
  // Glossary hotlinks
  GLOSSARY_PATTERN,
  processBracketHotlinks,
  autoLinkGlossaryTerms,
  renderWithAllHotlinks
} from './hotlinks.js';

// Glossary
export {
  GLOSSARY,
  GLOSSARY_TERMS,
  GLOSSARY_META,
  GLOSSARY_BY_SLUG,
  GLOSSARY_BY_NAME,
  SORTED_GLOSSARY_NAMES,
  getGlossaryEntry,
  getGlossaryByName,
  nameToSlug
} from './glossary.js';

// Teleology
export {
  TELEOLOGY,
  TELEOLOGY_META,
  TELEOLOGY_CONSTANTS,
  TELEOLOGY_ARCHETYPES,
  PHASES,
  RINGS,
  HOUSES_TELEOLOGY,
  FUNCTIONS,
  PILLARS,
  STATUS_FRAMES,
  INSTANT_RETURN,
  getArchetypeTeleology,
  getRetrievalRoute,
  getStatusSpecific
} from './teleology.js';

// Teleology Extensions (Bounds & Agents)
export {
  TELEOLOGY_EXTENSIONS,
  NUMBER_MODES,
  CHANNELS_TELEOLOGY,
  POLARITY_MEANINGS,
  BOUNDS_TELEOLOGY,
  ROLES_TELEOLOGY,
  AGENTS_TELEOLOGY,
  BOUND_CORRECTION_RULES,
  AGENT_STATUS_MEANINGS,
  getChannelFromPosition,
  getNumberFromPosition,
  getBoundTeleology,
  calculateBoundCorrection,
  getAgentChannelFromPosition,
  getAgentRoleFromPosition,
  getAgentTeleology
} from './teleology-extensions.js';

// Teleology Utilities
export {
  getCardType,
  getTeleologicalData,
  buildTeleologicalPrompt,
  buildReadingTeleologicalPrompt
} from './teleology-utils.js';

// Mode System (legacy — being replaced by postures)
export {
  MODES,
  MODE_CONSTRAINTS,
  fallbackReflectOutput as fallbackReflectOutputLegacy,
  TRANSITION_MARKERS as TRANSITION_MARKERS_LEGACY,
  AUTHORSHIP_CLOSURES as AUTHORSHIP_CLOSURES_LEGACY,
  READING_MODE_TO_INTERPRETATION_MODE,
  getModeConstraints,
  canSurfaceLevers as canSurfaceLeversLegacy,
  canAskQuestions as canAskQuestionsLegacy,
  getCoreQuestion as getCoreQuestionLegacy
} from './modes.js';

// Posture System (replaces modes)
export {
  POSTURES,
  POSTURE_CONSTRAINTS,
  POSTURE_TO_PROCESS_STAGE,
  TRANSITION_MARKERS,
  AUTHORSHIP_CLOSURES,
  fallbackReflectOutput,
  getPostureConstraints,
  canSurfaceLevers,
  canAskQuestions,
  getCoreQuestion,
  getProcessStage
} from './postures.js';

// Mode Prompts (legacy)
export {
  CANON_HEADER as CANON_HEADER_LEGACY,
  MODE_PREAMBLES,
  getModePreamble,
  buildModeHeader
} from './modePrompts.js';

// Posture Prompts (V1)
export {
  CANON_HEADER,
  TONE_GOVERNANCE,
  POSTURE_PREAMBLES,
  getPosturePreamble,
  buildPostureHeader
} from './posturePrompts.js';

// Why Vector
export {
  HOUSE_VOCABULARY,
  STATUS_TONE,
  STATUS_NAMES,
  PORTAL_POSITIONS,
  getDepthPermission,
  detectPortals,
  generateWhyVector,
  WHY_MOMENT_PROMPT
} from './whyVector.js';

// Content Filter
export {
  filterProhibitedTerms,
  filterContent,
  validateModeCompliance,
  logViolations
} from './contentFilter.js';

// Mode Transition
export {
  DISCOVER_TRANSITION_MARKER,
  FORGE_ACKNOWLEDGEMENT,
  shouldInjectTransitionMarker,
  hasTransitionMarker,
  getRandomTransitionMarker,
  getRandomAuthorshipClosure,
  ensureTransitionMarker,
  prependForgeAcknowledgement,
  ensureAuthorshipReturn,
  postProcessModeTransitions
} from './modeTransition.js';

// Voice System V3 — one-pass, three dials
export {
  PERSONA_PROMPTS,
  PERSONAS,
  buildPersonaPrompt,
  getHumorDescription,
  getComplexityDescription,
  HUMOR_LEVELS,
  COMPLEXITY_LEVELS,
  COMPLEXITY_OPTIONS,
  DEFAULT_VOICE_SETTINGS
} from './personas.js';

// Collective Consciousness / Monitor System
export {
  MONITORS,
  SCOPES,
  buildCollectivePromptInjection,
  buildCustomScopeInjection,
  FAST_COLLECTIVE_SYSTEM_PROMPT,
  buildFastCollectiveUserMessage,
  getAllMonitors,
  getMonitor,
  // v2: Full mode
  FULL_COLLECTIVE_FORMAT,
  buildFullCollectiveSystemPrompt,
  buildFullCollectiveUserMessage,
  THROUGHLINE_SYSTEM_PROMPT,
  PULSE_VOICE_PRESETS,
  // v2.1: Daily voice (lighter, trend-aware)
  DAILY_COLLECTIVE_FORMAT,
  DAILY_THROUGHLINE_SYSTEM_PROMPT,
  buildDailyCollectiveSystemPrompt,
  buildDailyCollectiveUserMessage
} from './monitorPrompts.js';

// Locus Control (subjects-based focus)
export {
  buildLocusInjection,
  locusToSubjects
} from './locusPrompts.js';

// Frame Context (normalized position context across all modes)
export {
  buildFrameContext,
  hasFrameContent,
  FRAME_SOURCE_STYLES
} from './frameContext.js';
