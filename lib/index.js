// === LIB INDEX ===
// Re-exports all lib modules for convenient importing

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

// Voice/Stance system
export {
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
  VOICE_PREVIEW,
  getToneFragment,
  getScopeFragment,
  buildPreviewSentence
} from './voice.js';

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
  shuffleArray,
  generateSpread,
  encodeDraws,
  decodeDraws,
  sanitizeForAPI,
  formatDrawForAI,
  parseReadingResponse
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

// Mode System
export {
  MODES,
  MODE_CONSTRAINTS,
  fallbackReflectOutput,
  TRANSITION_MARKERS,
  AUTHORSHIP_CLOSURES,
  READING_MODE_TO_INTERPRETATION_MODE,
  getModeConstraints,
  canSurfaceLevers,
  canAskQuestions,
  getCoreQuestion
} from './modes.js';

// Mode Prompts
export {
  CANON_HEADER,
  MODE_PREAMBLES,
  getModePreamble,
  buildModeHeader
} from './modePrompts.js';

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
