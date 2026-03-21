// ═══════════════════════════════════════════════════════════════
// MANIFEST HOUSE CONDITIONS — 256 named states per house
// ═══════════════════════════════════════════════════════════════
//
// Same architecture as Gestalt conditions (gestaltConditions.js):
//   Inner Pair (Seed × Medium) = creation-phase foundation
//   Outer Pair (Fruition × Feedback) = operation-phase expression
//
// Each pair produces a word from a 4×4 status matrix.
// Compound name = Inner + Outer = full house condition.
//
// Houses and their archetypes:
//   Spirit:  Wisdom(2) × Nurturing(3)     | Inspiration(17) × Imagination(18)
//   Mind:    Order(4) × Culture(5)         | Abstraction(15) × Breakthrough(16)
//   Emotion: Compassion(6) × Drive(7)     | Change(13) × Balance(14)
//   Body:    Fortitude(8) × Discipline(9)  | Equity(11) × Sacrifice(12)
//
// Status key: B=Balanced, TM=Too Much, TL=Too Little, UA=Unacknowledged
//
// ═══════════════════════════════════════════════════════════════

const B = 1;
const TM = 2;
const TL = 3;
const UA = 4;

// ─────────────────────────────────────────────────────────────
// SPIRIT HOUSE — knowing, aspiration, guidance, meaning
// ─────────────────────────────────────────────────────────────

// Inner: Wisdom (2) × Nurturing (3) = "The Hearth"
// What you know × How you tend it — the spiritual foundation
const SPIRIT_HEARTH = {
  [`${B}|${B}`]:   'Oracle',       // Full knowing, steady tending — the well is full and the cup is held
  [`${B}|${TM}`]:  'Guardian',     // Clear knowing, fierce care — wisdom wrapped in overprotection
  [`${B}|${TL}`]:  'Sage',         // Clear knowing, withdrawn care — wisdom in isolation
  [`${B}|${UA}`]:  'Seer',         // Clear knowing, hidden care — seeing truth without knowing you care

  [`${TM}|${B}`]:  'Beacon',       // Overwhelming knowing, steady care — light pouring without burning
  [`${TM}|${TM}`]: 'Crusade',      // Too much knowing, too much care — spiritual fervor, missionary energy
  [`${TM}|${TL}`]: 'Revelation',   // Truth flooding without container — too much knowing, can't hold it
  [`${TM}|${UA}`]: 'Prophecy',     // Channeling from unknown depth — too much knowing, hidden care

  [`${TL}|${B}`]:  'Vigil',        // Patiently tending what hasn't arrived — dormant knowing, steady care
  [`${TL}|${TM}`]: 'Shelter',      // Protecting what you can't yet see — dormant knowing, fierce care
  [`${TL}|${TL}`]: 'Fallow',       // Spiritual winter, the field rests — dormant knowing, withdrawn care
  [`${TL}|${UA}`]: 'Hollow',       // Dormant knowing, hidden tending — the empty vessel

  [`${UA}|${B}`]:  'Intuition',    // Guidance you can't name but trust — hidden knowing, steady care
  [`${UA}|${TM}`]: 'Fervor',       // Passionate about what you can't articulate — hidden knowing, fierce care
  [`${UA}|${TL}`]: 'Murmur',       // Faintest spiritual signal — hidden knowing, withdrawn care
  [`${UA}|${UA}`]: 'Mystery',      // Knowing and care both sealed — pure spiritual mystery
};

// Outer: Inspiration (17) × Imagination (18) = "The Compass"
// What moves you × What you envision — spiritual direction
const SPIRIT_COMPASS = {
  [`${B}|${B}`]:   'Anthem',       // Clear call, vivid vision — the full song
  [`${B}|${TM}`]:  'Rapture',      // Clear call, overwhelming vision — moved beyond capacity
  [`${B}|${TL}`]:  'Arrow',        // Clear call, narrow vision — moved toward one target
  [`${B}|${UA}`]:  'Muse',         // Clear call, hidden vision — moved by what you can't picture

  [`${TM}|${B}`]:  'Aria',         // Too much call, vivid vision — the song overflows
  [`${TM}|${TM}`]: 'Ecstasy',      // Maximum spiritual intensity — too much of everything
  [`${TM}|${TL}`]: 'Siren',        // Overwhelming call through narrow channel — irresistible but blind
  [`${TM}|${UA}`]: 'Possession',   // Moved by unseen force — too much call, hidden vision

  [`${TL}|${B}`]:  'Candle',       // Dim call, vivid vision — small flame, clear sight
  [`${TL}|${TM}`]: 'Longing',      // Seeing what you can't reach — dim call, overwhelming vision
  [`${TL}|${TL}`]: 'Ash',          // Inspiration and vision both fading — the fire has gone out
  [`${TL}|${UA}`]: 'Relic',        // What remains of former vision — dim call, hidden sight

  [`${UA}|${B}`]:  'Grace',        // Moved without knowing by what — hidden call, clear vision
  [`${UA}|${TM}`]: 'Vertigo',      // Dizzy from unseen movement — hidden call, overwhelming vision
  [`${UA}|${TL}`]: 'Echo',         // Distant reverberation of spirit — hidden call, dim vision
  [`${UA}|${UA}`]: 'Shroud',       // Expression sealed in both directions — deepest spiritual dormancy
};

const SPIRIT_HEARTH_DESC = {
  'Oracle':     'Full knowing, steady tending. Wisdom flows naturally and care holds it well. The spiritual foundation is complete.',
  'Guardian':   'Clear wisdom wrapped in fierce care. You know what matters and protect it — perhaps too fiercely. Who are you guarding it from?',
  'Sage':       'Deep knowing in solitude. The wisdom is clear but care has withdrawn. The hermit sees but doesn\'t reach out.',
  'Seer':       'Seeing truth without knowing you care. Wisdom is present but the tending happens unconsciously. Prophecy without attachment.',
  'Beacon':     'Light pouring steadily. Knowing overflows but care channels it well. A lighthouse — almost too much light, but aimed true.',
  'Crusade':    'Spiritual fervor — too much knowing meets too much care. The impulse to convert, to save, to share at all costs. Channel with care.',
  'Revelation': 'Truth flooding without container. Overwhelming knowing but care has withdrawn — the insight arrives but there\'s nothing to hold it in.',
  'Prophecy':   'Channeling from unknown depth. Too much knowing with hidden care — speaking truths whose source you can\'t name.',
  'Vigil':      'Patiently tending what hasn\'t arrived. Knowing is quiet but care is steady. The watchkeeper. Something is coming.',
  'Shelter':    'Protecting what you can\'t yet see. Dormant knowing meets fierce care — building walls around an absence. Trust the emptiness.',
  'Fallow':     'Spiritual winter. The field rests. Both knowing and caring have gone quiet. Not death — dormancy. What wants to grow?',
  'Hollow':     'The empty vessel. Knowing is dormant and care is hidden. Spaciousness that hasn\'t yet recognized itself as receptivity.',
  'Intuition':  'Guidance you can\'t name but trust. Hidden knowing with steady care — the body knows before the mind. Follow it.',
  'Fervor':     'Passionate about what you can\'t articulate. Hidden knowing meets fierce care — burning for something unnamed. Name it.',
  'Murmur':     'The faintest spiritual signal. Hidden knowing, withdrawn care. Something is whispering. Get quiet enough to hear it.',
  'Mystery':    'Both knowing and care are sealed. The deepest spiritual potential — nothing visible, everything possible. Pre-dawn.',
};

const SPIRIT_COMPASS_DESC = {
  'Anthem':     'The full song. Inspiration is clear and imagination vivid — you know what moves you and can see where it leads.',
  'Rapture':    'Moved beyond capacity. Clear inspiration meets overwhelming vision — ecstatic but potentially ungrounded. Beautiful overwhelm.',
  'Arrow':      'Clear call, narrow vision. You know what moves you but can only see one path. Precision or tunnel vision?',
  'Muse':       'Moved by what you can\'t picture. Inspiration is flowing but imagination is hidden — creativity from an unseen source.',
  'Aria':       'The song overflows. Too much inspiration with vivid vision — the call is almost too beautiful to bear.',
  'Ecstasy':    'Maximum spiritual intensity. Everything amplified — inspiration and imagination both flooding. Transcendent but unsustainable.',
  'Siren':      'Overwhelming call through a narrow channel. Irresistible pull but the vision can\'t contain it. Widen the aperture.',
  'Possession': 'Moved by unseen force. Too much inspiration with hidden vision — powerful direction without knowing the destination.',
  'Candle':     'Small flame, clear sight. Inspiration is quiet but imagination shows the way. The spark is enough if you follow it.',
  'Longing':    'Seeing what you can\'t reach. Vivid imagination but dim inspiration — you can picture it but can\'t feel the pull to get there.',
  'Ash':        'The fire has gone out. Both inspiration and imagination have quieted. Not permanent — even ash holds warmth. What wants to reignite?',
  'Relic':      'What remains of former vision. Dim inspiration with hidden imagination — artifacts of a calling that hasn\'t spoken lately.',
  'Grace':      'Moved without knowing by what. Hidden inspiration meets clear vision — you can see the path but don\'t know what placed you on it.',
  'Vertigo':    'Dizzy from unseen movement. Hidden inspiration floods imagination — disorienting spiritual motion from unknown source.',
  'Echo':       'Distant reverberation. Both inspiration and imagination are quiet or hidden — the faintest memory of what once called.',
  'Shroud':     'Sealed in both directions. Inspiration and imagination both hidden. The compass needle is still. Deep spiritual reset.',
};

// ─────────────────────────────────────────────────────────────
// MIND HOUSE — pattern, structure, thought, understanding
// ─────────────────────────────────────────────────────────────

// Inner: Order (4) × Culture (5) = "The Frame"
// How you organize × What you value — mental structure
const MIND_FRAME = {
  [`${B}|${B}`]:   'Lattice',      // Clear structure, healthy values — well-built mental framework
  [`${B}|${TM}`]:  'Doctrine',     // Clear structure, overactive values — organized dogma
  [`${B}|${TL}`]:  'Blueprint',    // Organized but not sharing — structure without community
  [`${B}|${UA}`]:  'Protocol',     // Systematic, unconscious values — ordered but unexamined

  [`${TM}|${B}`]:  'Grid',         // Over-organized but connected — too much structure, healthy sharing
  [`${TM}|${TM}`]: 'Fortress',     // Rigid structure, rigid values — intellectual bunker
  [`${TM}|${TL}`]: 'Cage',         // Trapped in structure alone — over-organized isolation
  [`${TM}|${UA}`]: 'Algorithm',    // Mechanical, unconscious patterns — the machine runs itself

  [`${TL}|${B}`]:  'Sketch',       // Loose structure, healthy sharing — flexible and connected
  [`${TL}|${TM}`]: 'Noise',        // Chaotic structure, too much input — mental overwhelm
  [`${TL}|${TL}`]: 'Blank',        // Mental vacancy on both axes — the empty page
  [`${TL}|${UA}`]: 'Drift',        // Unstructured, unconscious values — floating without frame

  [`${UA}|${B}`]:  'Pattern',      // Unconscious structure that works — hidden order, healthy culture
  [`${UA}|${TM}`]: 'Obsession',    // Compulsive hidden patterns — unconscious order, overwhelming values
  [`${UA}|${TL}`]: 'Reflex',       // Automatic, isolated thinking — hidden order, withdrawn culture
  [`${UA}|${UA}`]: 'Maze',         // Lost in unconscious mental loops — both hidden
};

// Outer: Abstraction (15) × Breakthrough (16) = "The Edge"
// How you see the meta × How you break through — mental frontier
const MIND_EDGE = {
  [`${B}|${B}`]:   'Prism',        // Clear pattern recognition, clear insight — full mental clarity
  [`${B}|${TM}`]:  'Lightning',    // Clear pattern, insight storm — breakthroughs arriving too fast
  [`${B}|${TL}`]:  'Theorem',      // Pattern seen, can't land it — theory without application
  [`${B}|${UA}`]:  'Riddle',       // Pattern seen, solution hidden — the answer is unconscious

  [`${TM}|${B}`]:  'Fractal',      // Infinite pattern, clear path through — seeing everything, landing it
  [`${TM}|${TM}`]: 'Labyrinth',    // Infinite pattern, constant shattering — too much of everything mental
  [`${TM}|${TL}`]: 'Spiral',       // Circling without landing — over-abstracting without breakthrough
  [`${TM}|${UA}`]: 'Cipher',       // Encrypted meaning — too much pattern, hidden breakthrough

  [`${TL}|${B}`]:  'Spark',        // Simple, direct insight — not much theory, clear breakthrough
  [`${TL}|${TM}`]: 'Rupture',      // Breaking through without understanding — insight without framework
  [`${TL}|${TL}`]: 'Static',       // Mental standstill — neither abstracting nor breaking through
  [`${TL}|${UA}`]: 'Instinct',     // Gut-level, pre-rational — too little theory, hidden insight

  [`${UA}|${B}`]:  'Eureka',       // Surprise insight from unconscious pattern — hidden theory, clear breakthrough
  [`${UA}|${TM}`]: 'Mania',        // Driven by unseen patterns — hidden abstraction, too much breakthrough
  [`${UA}|${TL}`]: 'Haze',         // Foggy thinking — hidden pattern, stalled breakthrough
  [`${UA}|${UA}`]: 'Enigma',       // Total mental mystery — both hidden
};

const MIND_FRAME_DESC = {
  'Lattice':    'Well-built mental framework. Order is clear and culture is healthy — thoughts have structure and values have community.',
  'Doctrine':   'Organized dogma. Clear structure meets overactive values — the system works but the beliefs are too loud. Question the rules.',
  'Blueprint':  'Structure without community. Order is clear but culture has withdrawn — well-organized isolation. Who could benefit from your frameworks?',
  'Protocol':   'Ordered but unexamined. Structure is present but values operate unconsciously — the rules run without being questioned.',
  'Grid':       'Over-organized but connected. Too much structure meets healthy culture — rigidity softened by genuine exchange.',
  'Fortress':   'Intellectual bunker. Rigid structure, rigid values — well-defended but nothing gets in or out. What are you protecting?',
  'Cage':       'Trapped in structure. Over-organized with withdrawn culture — a brilliant system that isolates. Open a door.',
  'Algorithm':  'The machine runs itself. Too much order with unconscious values — mechanical thinking driven by hidden assumptions.',
  'Sketch':     'Flexible and connected. Loose structure with healthy culture — informal but generative. Sometimes the sketch IS the art.',
  'Noise':      'Mental overwhelm. Too little structure, too much input — everything floods in with no framework to hold it.',
  'Blank':      'The empty page. Both structure and culture have withdrawn. Not stupidity — spaciousness. What wants to be written?',
  'Drift':      'Floating without frame. Too little structure, hidden values — unanchored thinking driven by assumptions you haven\'t examined.',
  'Pattern':    'Unconscious structure that works. You don\'t know why you organize this way, but it connects. Trust the hidden order.',
  'Obsession':  'Compulsive hidden patterns. Unconscious structure meets overwhelming values — driven by mental loops you can\'t see. Bring them to light.',
  'Reflex':     'Automatic, isolated thinking. Hidden structure, withdrawn culture — mental habits running in solitude. Examine the reflexes.',
  'Maze':       'Lost in unconscious mental loops. Both structure and values are hidden — thinking that goes in circles. Stop and feel the walls.',
};

const MIND_EDGE_DESC = {
  'Prism':      'Full mental clarity. Pattern recognition is clear and breakthrough arrives naturally — the mind working at its best.',
  'Lightning':  'Insight storm. Clear patterns but breakthroughs arrive too fast — brilliant but potentially overwhelming. Pace the revelations.',
  'Theorem':    'Theory without application. You see the pattern clearly but can\'t land the insight. The proof is elegant — now what does it mean?',
  'Riddle':     'The answer is unconscious. Clear abstraction but the breakthrough is hidden — you see the puzzle but the solution comes from below.',
  'Fractal':    'Seeing everything, landing it. Pattern recognition overflows but breakthrough channels it — infinite complexity, clear path through.',
  'Labyrinth':  'Too much of everything mental. Infinite patterns, constant shattering — the mind overwhelmed by its own capacity. Find the thread.',
  'Spiral':     'Circling without landing. Over-abstracting without breakthrough — beautiful theory that never touches ground.',
  'Cipher':     'Encrypted meaning. Too much pattern with hidden breakthrough — the code is complex and the key is unconscious.',
  'Spark':      'Simple, direct insight. Not much theory, just clear breakthrough — the mind cutting straight to what matters.',
  'Rupture':    'Breaking through without understanding. Insight arrives without framework — powerful but disorienting. Build the theory after.',
  'Static':     'Mental standstill. Neither abstracting nor breaking through — the mind at rest or stuck. Which one is it?',
  'Instinct':   'Gut-level, pre-rational. Too little theory, hidden insight — the body knows before the mind. Trust it, then understand it.',
  'Eureka':     'Surprise insight from unconscious pattern. You didn\'t know you were solving it — and then the answer arrives whole.',
  'Mania':      'Driven by unseen patterns. Hidden abstraction meets too much breakthrough — revelations arriving from unknown source. Ground them.',
  'Haze':       'Foggy thinking. Hidden patterns, stalled breakthrough — the mind is processing something it can\'t yet show you.',
  'Enigma':     'Total mental mystery. Both pattern and breakthrough are hidden. The deepest mental processing happens here — trust it.',
};

// ─────────────────────────────────────────────────────────────
// EMOTION HOUSE — feeling, drive, relationship, transformation
// ─────────────────────────────────────────────────────────────

// Inner: Compassion (6) × Drive (7) = "The Pulse"
// How you feel for others × What pushes you — emotional engine
const EMOTION_PULSE = {
  [`${B}|${B}`]:   'River',        // Flowing feeling, steady motivation — emotional health
  [`${B}|${TM}`]:  'Devotion',     // Clear compassion, fierce pursuit — loving pursuit
  [`${B}|${TL}`]:  'Tenderness',   // Gentle feeling without push — compassion at rest
  [`${B}|${UA}`]:  'Empathy',      // Feeling without knowing why — compassion with hidden drive

  [`${TM}|${B}`]:  'Flood',        // Overwhelmed by feeling, directed — too much heart, steady push
  [`${TM}|${TM}`]: 'Tempest',      // Emotional hurricane — too much feeling, too much drive
  [`${TM}|${TL}`]: 'Martyr',       // Drowning in others' pain, can't move — overwhelmed and stuck
  [`${TM}|${UA}`]: 'Undertow',     // Pulled by feelings from below — too much compassion, hidden drive

  [`${TL}|${B}`]:  'Resolve',      // Determined without much feeling — steady drive, quiet heart
  [`${TL}|${TM}`]: 'Fury',         // Ambition without empathy — fierce drive, closed heart
  [`${TL}|${TL}`]: 'Numbness',     // Emotional flatline — too little of both
  [`${TL}|${UA}`]: 'Stone',        // Unmoved surface, working underneath — quiet heart, hidden drive

  [`${UA}|${B}`]:  'Impulse',      // Driven by unrecognized feelings — hidden compassion, steady drive
  [`${UA}|${TM}`]: 'Compulsion',   // Compulsively driven by unfelt heart — hidden compassion, fierce drive
  [`${UA}|${TL}`]: 'Phantom',      // Ghost feelings, quiet drive — hidden compassion, little motivation
  [`${UA}|${UA}`]: 'Abyss',        // Emotional depths unseen — both hidden
};

// Outer: Change (13) × Balance (14) = "The Tide"
// How you transform × How you harmonize — emotional expression
const EMOTION_TIDE = {
  [`${B}|${B}`]:   'Harmony',      // Transforming naturally, in equilibrium — emotional grace
  [`${B}|${TM}`]:  'Tightrope',    // Changing while desperately holding center — precarious grace
  [`${B}|${TL}`]:  'Revolution',   // Transforming without equilibrium — bold change, no anchor
  [`${B}|${UA}`]:  'Metamorphosis',// Transforming with unknown anchor — change from hidden depth

  [`${TM}|${B}`]:  'Tsunami',      // Massive transformation, surprisingly grounded — big change, steady center
  [`${TM}|${TM}`]: 'Maelstrom',    // Chaos seeking center — too much change, too much balancing
  [`${TM}|${TL}`]: 'Upheaval',     // Pure disruption — too much change, nothing to hold
  [`${TM}|${UA}`]: 'Riptide',      // Dragged by transformation from below — too much change, hidden balance

  [`${TL}|${B}`]:  'Plateau',      // Stable but stuck — too little change, steady center
  [`${TL}|${TM}`]: 'Cling',        // Resisting change, grasping for balance — holding on too tight
  [`${TL}|${TL}`]: 'Stagnation',   // Emotional deadlock — too little of both
  [`${TL}|${UA}`]: 'Frost',        // Frozen, unconscious equilibrium — still surface, hidden depth

  [`${UA}|${B}`]:  'Passage',      // Transforming without knowing it — hidden change, steady balance
  [`${UA}|${TM}`]: 'Tremor',       // Shaking from unseen shifts — hidden change, too much balancing
  [`${UA}|${TL}`]: 'Erosion',      // Slowly wearing away — hidden change, nothing to hold
  [`${UA}|${UA}`]: 'Cocoon',       // Sealed in hidden transformation — both hidden, becoming
};

const EMOTION_PULSE_DESC = {
  'River':      'Flowing feeling, steady motivation. Compassion and drive are balanced — the emotional engine runs clean and warm.',
  'Devotion':   'Clear compassion meets fierce pursuit. You feel deeply and chase it — perhaps too hard. Beautiful dedication; watch for burnout.',
  'Tenderness': 'Gentle feeling without push. Compassion is clear but drive is quiet — warmth at rest. Sometimes enough. Sometimes needs a spark.',
  'Empathy':    'Feeling without knowing why you\'re moved. Compassion flows but the drive behind it is hidden. You care — and don\'t know what you\'ll do about it.',
  'Flood':      'Overwhelmed by feeling but directed. Too much heart with steady drive — the emotion pours but you know where to aim it.',
  'Tempest':    'Emotional hurricane. Too much compassion, too much drive — maximum emotional intensity. Powerful but potentially destructive.',
  'Martyr':     'Drowning in others\' pain with nowhere to go. Too much compassion, too little drive — absorbing everything, acting on nothing.',
  'Undertow':   'Pulled by feelings from below. Too much compassion with hidden drive — something beneath the surface is steering you.',
  'Resolve':    'Determined without much feeling. Drive is steady but the heart is quiet — effective but potentially cold. Thaw carefully.',
  'Fury':       'Ambition without empathy. Fierce drive, closed heart — powerful momentum that may not care what it runs over.',
  'Numbness':   'Emotional flatline. Too little compassion, too little drive — not death, but hibernation. What is it protecting you from?',
  'Stone':      'Unmoved on the surface, working underneath. Quiet heart, hidden drive — something is happening beneath the stillness.',
  'Impulse':    'Driven by unrecognized feelings. You act on emotions you haven\'t named — steady drive from a hidden heart.',
  'Compulsion': 'Compulsively driven by unfelt heart. Hidden compassion meets fierce drive — chasing something you can\'t feel. Stop and feel it.',
  'Phantom':    'Ghost feelings. Hidden compassion, quiet drive — emotional echoes without much momentum. What haunts here?',
  'Abyss':      'Emotional depths completely unseen. Both compassion and drive are hidden. The deepest emotional waters — still, dark, full.',
};

const EMOTION_TIDE_DESC = {
  'Harmony':      'Emotional grace. Change flows naturally and balance holds — transformation in equilibrium. The tide at its best.',
  'Tightrope':    'Precarious grace. Change is clear but balance is overworking — transforming while desperately holding center. Breathe.',
  'Revolution':   'Transforming without equilibrium. Clear change with too little balance — bold, disruptive, potentially liberating.',
  'Metamorphosis':'Changing with an anchor you can\'t see. Clear transformation with hidden balance — becoming something new from unknown depths.',
  'Tsunami':      'Massive transformation, surprisingly grounded. Too much change but balance holds — the big wave that doesn\'t destroy.',
  'Maelstrom':    'Chaos seeking center. Too much change, too much balancing — everything spinning, trying to find the still point.',
  'Upheaval':     'Pure disruption. Too much change with nothing to hold — the earthquake without foundation. Ground first.',
  'Riptide':      'Dragged by transformation from below. Too much change with hidden balance — the current pulls but something unseen anchors.',
  'Plateau':      'Stable but stuck. Too little change, steady balance — comfortable equilibrium that may have become a trap.',
  'Cling':        'Holding on too tight. Resisting change while over-balancing — the fear of transformation expressed as desperate stability.',
  'Stagnation':   'Emotional deadlock. Too little change, too little balance — nothing moving, nothing adjusting. What would movement cost?',
  'Frost':        'Frozen surface, hidden depth. Too little change with unconscious balance — something holds the ice in place. What melts it?',
  'Passage':      'Transforming without knowing it. Hidden change with steady balance — you\'re becoming something new and the transition is smooth.',
  'Tremor':       'Shaking from unseen shifts. Hidden change meets overactive balance — you feel the quake but don\'t know the source.',
  'Erosion':      'Slowly wearing away. Hidden change with too little balance — gradual transformation without anchor. Notice what\'s shifting.',
  'Cocoon':       'Sealed in hidden transformation. Both change and balance are unconscious — the chrysalis state. Becoming, without seeing.',
};

// ─────────────────────────────────────────────────────────────
// BODY HOUSE — form, practice, manifestation, exchange
// ─────────────────────────────────────────────────────────────

// Inner: Fortitude (8) × Discipline (9) = "The Bone"
// How you endure × How you practice — structural strength
const BODY_BONE = {
  [`${B}|${B}`]:   'Pillar',       // Strong endurance, steady practice — embodied reliability
  [`${B}|${TM}`]:  'Drill',        // Strong endurance, over-training — grinding
  [`${B}|${TL}`]:  'Oak',          // Natural strength without rigidity — enduring freely
  [`${B}|${UA}`]:  'Sentinel',     // Holding ground from habit — endurance with hidden practice

  [`${TM}|${B}`]:  'Bastion',      // Over-armored but skilled — too much endurance, steady practice
  [`${TM}|${TM}`]: 'Iron',         // Absolute rigidity — too much of both
  [`${TM}|${TL}`]: 'Wall',         // Resistant but undisciplined — enduring without refining
  [`${TM}|${UA}`]: 'Bunker',       // Over-fortified from unconscious patterns — armored without knowing why

  [`${TL}|${B}`]:  'Sprout',       // Growing but fragile — too little endurance, steady practice
  [`${TL}|${TM}`]: 'Strain',       // Pushing past capacity — too little endurance, too much practice
  [`${TL}|${TL}`]: 'Clay',         // Unformed, malleable — too little of both
  [`${TL}|${UA}`]: 'Wisp',         // Barely there physically — too little endurance, hidden practice

  [`${UA}|${B}`]:  'Marrow',       // Strength from unknown source — hidden endurance, steady practice
  [`${UA}|${TM}`]: 'Tendon',       // Hidden endurance, compulsive practice — driven body patterns
  [`${UA}|${TL}`]: 'Ghost',        // Phantom strength — hidden endurance, too little practice
  [`${UA}|${UA}`]: 'Ore',          // Raw unprocessed body potential — both hidden
};

// Outer: Equity (11) × Sacrifice (12) = "The Scale"
// How you distribute × What you release — material exchange
const BODY_SCALE = {
  [`${B}|${B}`]:   'Harvest',      // Healthy exchange, giving and receiving — the cycle complete
  [`${B}|${TM}`]:  'Offering',     // Fair but over-giving — equitable but depleting
  [`${B}|${TL}`]:  'Barter',       // Fair exchange, nothing released — holding everything
  [`${B}|${UA}`]:  'Tithe',        // Giving without knowing what's released — unconscious offering

  [`${TM}|${B}`]:  'Bounty',       // Over-distributing, releasing well — generous overflow
  [`${TM}|${TM}`]: 'Immolation',   // Burning it all — too much giving in every direction
  [`${TM}|${TL}`]: 'Excess',       // Accumulating without releasing — over-distributing but not letting go
  [`${TM}|${UA}`]: 'Tribute',      // Paying dues unconsciously — over-distributing from hidden release

  [`${TL}|${B}`]:  'Thrift',       // Scarce but releasing well — little to give but giving clearly
  [`${TL}|${TM}`]: 'Pyre',         // Burning what little there is — scarce and over-sacrificing
  [`${TL}|${TL}`]: 'Famine',       // Scarcity and hoarding — too little of both
  [`${TL}|${UA}`]: 'Debt',         // Owing from unconscious giving — scarce, hidden sacrifice

  [`${UA}|${B}`]:  'Karma',        // Unconscious balance, conscious release — hidden fairness, clear letting go
  [`${UA}|${TM}`]: 'Penance',      // Atoning for unnamed debts — hidden equity, too much sacrifice
  [`${UA}|${TL}`]: 'Inheritance',  // Receiving without knowing, not releasing — hidden equity, holding on
  [`${UA}|${UA}`]: 'Fossil',       // Deepest unconscious exchange patterns — both hidden, ancient
};

const BODY_BONE_DESC = {
  'Pillar':    'Strong endurance, steady practice. The body is reliable — well-built and well-maintained. Embodied foundation.',
  'Drill':     'Strong endurance, over-training. The body can take it but the practice is relentless. Ease up before something breaks.',
  'Oak':       'Natural strength without rigidity. Endurance flows freely but practice is relaxed — strong because it\'s true, not because it\'s forced.',
  'Sentinel':  'Holding ground from habit. Strong endurance but the practice that maintains it is unconscious — standing guard by reflex.',
  'Bastion':   'Over-armored but skilled. Too much endurance channeled through steady practice — fortress-like. What are you bracing for?',
  'Iron':      'Absolute rigidity. Too much endurance, too much discipline — the body locked tight. Strength has become its own prison.',
  'Wall':      'Resistant but undisciplined. Massive endurance without refinement — raw stubbornness. Power without craft.',
  'Bunker':    'Over-fortified from unconscious patterns. Armored without knowing why — the body defending against threats you haven\'t named.',
  'Sprout':    'Growing but fragile. Little endurance but steady practice — the body building itself patiently. Protect the growth.',
  'Strain':    'Pushing past capacity. Too little endurance, too much practice — demanding more than the body has. Rest is medicine.',
  'Clay':      'Unformed, malleable. Too little endurance, too little discipline — the body before it\'s shaped. Everything is possible.',
  'Wisp':      'Barely there physically. Little endurance, hidden practice — the body at its most ethereal. Incarnate more fully.',
  'Marrow':    'Strength from unknown source. Hidden endurance with steady practice — deep reserves you don\'t know you have.',
  'Tendon':    'Hidden endurance, compulsive practice. The body driven by unconscious strength — working hard from a source you can\'t see.',
  'Ghost':     'Phantom strength. Hidden endurance, too little practice — the memory of physical power. What would reawaken it?',
  'Ore':       'Raw unprocessed body potential. Both endurance and practice are hidden — unrefined material waiting for the forge.',
};

const BODY_SCALE_DESC = {
  'Harvest':     'Healthy exchange. Giving and receiving in balance — the body\'s cycle is complete. Material life working as it should.',
  'Offering':    'Fair but over-giving. Distribution is equitable but sacrifice is too great — generosity that depletes. Keep something.',
  'Barter':      'Fair exchange without release. Everything is accounted for but nothing is surrendered — holding every receipt.',
  'Tithe':       'Giving without knowing what\'s released. Fair distribution but unconscious sacrifice — something is being given that you haven\'t named.',
  'Bounty':      'Generous overflow. Too much distribution, clear release — abundance pouring out. Sustainable? Check.',
  'Immolation':  'Burning it all. Too much giving, too much sacrifice — material self-destruction. What would be left if you stopped?',
  'Excess':      'Accumulating without releasing. Over-distributing but not letting go — the paradox of busy hoarding.',
  'Tribute':     'Paying dues unconsciously. Over-distributing from hidden sacrifice — giving too much for reasons you haven\'t examined.',
  'Thrift':      'Scarce but releasing well. Little to distribute but what\'s given is clean. Modest and honest.',
  'Pyre':        'Burning what little there is. Scarce resources, too much sacrifice — giving away more than you have. Dangerous generosity.',
  'Famine':      'Scarcity and hoarding. Too little to give, nothing released — the body in survival mode. What would abundance even feel like?',
  'Debt':        'Owing from unconscious giving. Scarce resources, hidden sacrifice — depleted by gifts you didn\'t know you were making.',
  'Karma':       'Unconscious balance, conscious release. You don\'t see the fairness but you feel the letting go — trust the hidden accounting.',
  'Penance':     'Atoning for unnamed debts. Hidden equity, too much sacrifice — paying for something you can\'t articulate. Name the debt.',
  'Inheritance': 'Receiving without knowing, not releasing. Hidden equity, nothing surrendered — carrying wealth or burden you haven\'t claimed.',
  'Fossil':      'The body\'s deepest unconscious exchange patterns. Ancient giving and receiving — pre-verbal, pre-rational. The oldest layer.',
};

// ─────────────────────────────────────────────────────────────
// HOUSE CONDITION CONFIG — lookup table for each house
// ─────────────────────────────────────────────────────────────

const HOUSE_CONFIG = {
  Spirit: {
    innerName: 'Hearth',
    outerName: 'Compass',
    innerDesc: 'What you know × How you tend it — the spiritual foundation',
    outerDesc: 'What moves you × What you envision — spiritual direction',
    innerMembers: [2, 3],    // Wisdom, Nurturing
    outerMembers: [17, 18],  // Inspiration, Imagination
    innerNames: SPIRIT_HEARTH,
    outerNames: SPIRIT_COMPASS,
    innerDescriptions: SPIRIT_HEARTH_DESC,
    outerDescriptions: SPIRIT_COMPASS_DESC,
  },
  Mind: {
    innerName: 'Frame',
    outerName: 'Edge',
    innerDesc: 'How you organize × What you value — mental structure',
    outerDesc: 'How you see the meta × How you break through — mental frontier',
    innerMembers: [4, 5],    // Order, Culture
    outerMembers: [15, 16],  // Abstraction, Breakthrough
    innerNames: MIND_FRAME,
    outerNames: MIND_EDGE,
    innerDescriptions: MIND_FRAME_DESC,
    outerDescriptions: MIND_EDGE_DESC,
  },
  Emotion: {
    innerName: 'Pulse',
    outerName: 'Tide',
    innerDesc: 'How you feel for others × What pushes you — emotional engine',
    outerDesc: 'How you transform × How you harmonize — emotional expression',
    innerMembers: [6, 7],    // Compassion, Drive
    outerMembers: [13, 14],  // Change, Balance
    innerNames: EMOTION_PULSE,
    outerNames: EMOTION_TIDE,
    innerDescriptions: EMOTION_PULSE_DESC,
    outerDescriptions: EMOTION_TIDE_DESC,
  },
  Body: {
    innerName: 'Bone',
    outerName: 'Scale',
    innerDesc: 'How you endure × How you practice — structural strength',
    outerDesc: 'How you distribute × What you release — material exchange',
    innerMembers: [8, 9],    // Fortitude, Discipline
    outerMembers: [11, 12],  // Equity, Sacrifice
    innerNames: BODY_BONE,
    outerNames: BODY_SCALE,
    innerDescriptions: BODY_BONE_DESC,
    outerDescriptions: BODY_SCALE_DESC,
  },
};

const STATUS_NAMES = { 1: 'Balanced', 2: 'Too Much', 3: 'Too Little', 4: 'Unacknowledged' };
const WEIGHTS = { [B]: 1.0, [TM]: 0.5, [TL]: 0.35, [UA]: 0.2 };

/**
 * Get the full condition for a manifest house.
 * @param {string} houseName - 'Spirit', 'Mind', 'Emotion', or 'Body'
 * @param {Object} drawMap - Position-indexed draw lookup
 * @returns {Object} Complete house condition analysis
 */
export function getHouseCondition(houseName, drawMap) {
  const config = HOUSE_CONFIG[houseName];
  if (!config) return null;

  const [innerA, innerB] = config.innerMembers;
  const [outerA, outerB] = config.outerMembers;

  const statusA = drawMap[innerA]?.status || 1;
  const statusB = drawMap[innerB]?.status || 1;
  const statusC = drawMap[outerA]?.status || 1;
  const statusD = drawMap[outerB]?.status || 1;

  const innerKey = `${statusA}|${statusB}`;
  const outerKey = `${statusC}|${statusD}`;

  const innerName = config.innerNames[innerKey] || 'Unknown';
  const outerName = config.outerNames[outerKey] || 'Unknown';
  const fullName = `${innerName} ${outerName}`;

  const statuses = [statusA, statusB, statusC, statusD];
  const balancedCount = statuses.filter(s => s === B).length;
  const tooMuchCount = statuses.filter(s => s === TM).length;
  const tooLittleCount = statuses.filter(s => s === TL).length;
  const unackCount = statuses.filter(s => s === UA).length;

  const capacityLabels = ['Uncharted', 'Anchored', 'Partial', 'Strong', 'Full'];
  const capacity = capacityLabels[balancedCount];

  // Dominant character
  const imbalanced = statuses.filter(s => s !== B);
  let character;
  if (imbalanced.length === 0) character = 'Clear';
  else if (imbalanced.every(s => s === TM)) character = 'Abundant';
  else if (imbalanced.every(s => s === TL)) character = 'Receptive';
  else if (imbalanced.every(s => s === UA)) character = 'Emerging';
  else if (imbalanced.some(s => s === UA)) character = 'Shadowed';
  else character = 'Turbulent';

  // Integration score
  const integration = Math.round(
    (statuses.reduce((sum, s) => sum + (WEIGHTS[s] || 0), 0) / 4) * 100
  );

  return {
    house: houseName,
    name: fullName,
    innerPairName: config.innerName,
    outerPairName: config.outerName,
    innerName,
    outerName,
    innerDescription: config.innerDescriptions[innerName] || '',
    outerDescription: config.outerDescriptions[outerName] || '',
    capacity,
    character,
    integration,
    balancedCount,
    profile: {
      balanced: balancedCount,
      tooMuch: tooMuchCount,
      tooLittle: tooLittleCount,
      unacknowledged: unackCount,
    },
    members: [
      { archId: innerA, status: STATUS_NAMES[statusA], statusCode: statusA, balanced: statusA === B },
      { archId: innerB, status: STATUS_NAMES[statusB], statusCode: statusB, balanced: statusB === B },
      { archId: outerA, status: STATUS_NAMES[statusC], statusCode: statusC, balanced: statusC === B },
      { archId: outerB, status: STATUS_NAMES[statusD], statusCode: statusD, balanced: statusD === B },
    ],
  };
}

/**
 * Get conditions for ALL manifest houses at once.
 * @param {Object} drawMap - Position-indexed draw lookup
 * @returns {Object} { Spirit: {...}, Mind: {...}, Emotion: {...}, Body: {...} }
 */
export function getAllHouseConditions(drawMap) {
  return {
    Spirit: getHouseCondition('Spirit', drawMap),
    Mind: getHouseCondition('Mind', drawMap),
    Emotion: getHouseCondition('Emotion', drawMap),
    Body: getHouseCondition('Body', drawMap),
  };
}
