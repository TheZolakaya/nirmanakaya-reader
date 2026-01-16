// === HELP MODE CONTENT ===
// Contextual help definitions for UI elements
// Each entry should be readable in under 30 seconds

export const HELP_CONTENT = {
  // === READING MODES ===
  'mode-reflect': {
    title: 'Reflect Mode',
    text: 'Mirror what already exists. Shows patterns currently active in your situation without suggesting changes. Best for understanding where you are.',
    related: ['mode-discover', 'mode-forge']
  },
  'mode-discover': {
    title: 'Discover Mode',
    text: 'Reveals where authorship is available. Shows opportunities for conscious participation you may not have noticed.',
    related: ['mode-reflect', 'mode-forge']
  },
  'mode-forge': {
    title: 'Forge Mode',
    text: 'Active intention-setting. Engages when you want to consciously shape outcomes. Requires clarity about what you want to create.',
    related: ['mode-reflect', 'mode-discover']
  },
  'mode-explore': {
    title: 'Explore Mode',
    text: 'Threaded conversation with the cards. Each card becomes a doorway for deeper inquiry through follow-up questions.',
    related: []
  },

  // === SPREADS ===
  'spread-single': {
    title: 'Single Card',
    text: 'One signature. Direct, focused insight. Best for simple questions or daily practice.',
  },
  'spread-triad': {
    title: 'Triad Spread',
    text: 'Three cards exploring a dynamic. Common layouts: Past-Present-Future, Situation-Challenge-Advice.',
  },
  'spread-pentad': {
    title: 'Pentad Spread',
    text: 'Five positions for nuanced exploration. Covers context, obstacles, supports, and synthesis.',
  },
  'spread-septad': {
    title: 'Septad Spread',
    text: 'Seven cards for comprehensive analysis. Maps the full arc of a situation with maximum depth.',
  },
  'spread-selector': {
    title: 'Spread Selector',
    text: 'Choose how many cards to draw and their layout. More cards provide more nuance but require more time.',
  },

  // === VOICE SETTINGS ===
  'voice-panel': {
    title: 'Voice Settings',
    text: 'Customize how the reader speaks to you. Affects tone, complexity, and style of interpretations.',
  },
  'voice-complexity': {
    title: 'Complexity Level',
    text: 'Friend: casual and accessible. Guide: balanced depth. Elder: philosophical. Oracle: full framework density.',
  },
  'voice-tone': {
    title: 'Tone/Seriousness',
    text: 'From playful and light to profound and weighty. Affects emotional register of the reading.',
  },
  'delivery-preset': {
    title: 'Delivery Presets',
    text: 'Quick voice configurations. Clear (direct), Kind (gentle), Playful (light), Wise (elder), Oracle (full depth).',
  },
  'stance-selector': {
    title: 'Stance Grid',
    text: 'Fine-tune four dimensions: Voice (how warm), Focus (how specific), Density (how much detail), Scope (how broad).',
  },

  // === POST-READING ACTIONS ===
  'action-export': {
    title: 'Export Reading',
    text: 'Download this reading as an HTML file you can save, print, or share.',
  },
  'action-traditional': {
    title: 'Traditional Names',
    text: 'Toggle to show traditional tarot correspondences alongside Nirmanakaya names.',
  },
  'action-architecture': {
    title: 'Architecture View',
    text: 'Show the underlying structural details: channels, houses, correction pairs.',
  },
  'action-new': {
    title: 'New Reading',
    text: 'Clear this reading and return to the question input for a fresh start.',
  },
  'action-share': {
    title: 'Share Reading',
    text: 'Create a public link to this reading that anyone can view.',
  },
  'action-email': {
    title: 'Email Reading',
    text: 'Send this reading to your email for future reference.',
  },

  // === CARDS & HOTLINKS ===
  'card-click': {
    title: 'Card Information',
    text: 'Click any card name to see its full definition, associations, and related concepts.',
  },
  'status-click': {
    title: 'Status Information',
    text: 'Click status badges (Balanced, Too Much, etc.) to understand what each expression means.',
  },
  'hotlink-nav': {
    title: 'Hotlink Navigation',
    text: 'Terms in amber/cyan/violet are clickable. Use Back button to retrace your exploration.',
  },

  // === INPUT & SPARK ===
  'spark-button': {
    title: 'Spark Button',
    text: 'Generates a random question starter when you need inspiration or want to explore without a specific query.',
  },
  'question-input': {
    title: 'Your Question',
    text: 'Enter what you want to explore. Can be a question, situation description, or area of inquiry.',
  },
  'get-reading': {
    title: 'Get Reading',
    text: 'Begin the reading with your current question and settings. Cards will be drawn and interpreted.',
  },

  // === FOLLOW-UP ===
  'followup-input': {
    title: 'Follow-up',
    text: 'Continue the conversation. Ask for clarification, deeper exploration, or redirect the inquiry.',
  },
  'stance-adjust': {
    title: 'Adjust Stance',
    text: 'Change voice settings mid-reading. Re-interpret the same cards with different delivery.',
  },

  // === BACKGROUND CONTROLS ===
  'bg-controls': {
    title: 'Background Controls',
    text: 'Customize the visual atmosphere. Choose video or image backgrounds, adjust opacity and content dimming.',
  },
  'bg-toggle': {
    title: 'Background Toggle',
    text: 'Show or hide the background control panel.',
  },

  // === SECTIONS ===
  'section-signatures': {
    title: 'Signatures Section',
    text: 'Overview of all cards drawn. Each signature combines a card identity with an expression status.',
  },
  'section-synthesis': {
    title: 'Synthesis Section',
    text: 'The integrated meaning of all cards together. Shows how they interact to address your question.',
  },
  'section-path': {
    title: 'Path Section',
    text: 'Practical guidance and next steps suggested by the reading.',
  },

  // === NAVIGATION ===
  'nav-guide': {
    title: 'Reader Guide',
    text: 'Full documentation covering modes, spreads, voice settings, and framework concepts.',
  },
  'nav-about': {
    title: 'About',
    text: 'The philosophical foundation, transmission story, and consciousness-primary thesis.',
  },
  'nav-council': {
    title: 'Council',
    text: 'Perspectives from four AI systems on the Nirmanakaya framework.',
  },
  'nav-hub': {
    title: 'Community Hub',
    text: 'Discussion forum for sharing insights and connecting with other practitioners.',
  },
};

// Get help content by key
export const getHelpContent = (key) => HELP_CONTENT[key] || null;

// Get all help keys
export const getHelpKeys = () => Object.keys(HELP_CONTENT);
