// ═══════════════════════════════════════════════════════════════
// GESTALT HOUSE CONDITIONS — 256 named states
// ═══════════════════════════════════════════════════════════════
//
// The Gestalt house contains 4 archetypes, each with 4 possible
// transient statuses = 4^4 = 256 unique conditions.
//
// Naming uses two-pair composition:
//   Inner Pair (ENGINE): Potential (0) × Will (1)
//     = What you start with × What drives you
//   Outer Pair (LENS): Actualization (19) × Awareness (20)
//     = What you manifest × What you perceive
//
// Each pair produces a word. The compound names the full condition.
//
// Status key: B=Balanced, TM=Too Much, TL=Too Little, UA=Unacknowledged
//
// Governance cascade:
//   Potential (0) → Spirit house
//   Will (1) → Body house
//   Actualization (19) → Mind house
//   Awareness (20) → Emotion house
//
// ═══════════════════════════════════════════════════════════════

// Status codes used internally
const B = 1;   // Balanced
const TM = 2;  // Too Much
const TL = 3;  // Too Little
const UA = 4;  // Unacknowledged

// ─── INNER PAIR: Potential × Will (The Engine) ───
// These two archetypes represent the foundation of selfhood:
// Potential = raw possibility, the seed of what could be
// Will = the driving force, agency, determination
//
// Together they answer: "What fuel do you have, and what's driving it?"
const ENGINE_NAMES = {
  // Potential Balanced — open, available, flowing seed energy
  [`${B}|${B}`]:   'Sovereign',      // Full inner command — open seed + steady drive
  [`${B}|${TM}`]:  'Champion',       // Open seed + fierce will — ready to charge
  [`${B}|${TL}`]:  'Dreamer',        // Open seed + yielding will — possibility without push
  [`${B}|${UA}`]:  'Wanderer',       // Open seed + hidden will — moving without knowing why

  // Potential Too Much — surging, overflowing raw energy
  [`${TM}|${B}`]:  'Fountain',       // Surging potential + steady will — abundant and directed
  [`${TM}|${TM}`]: 'Volcano',        // Surging potential + fierce will — maximum force
  [`${TM}|${TL}`]: 'Torrent',        // Surging potential + yielding will — energy without direction
  [`${TM}|${UA}`]: 'Geyser',         // Surging potential + hidden will — erupting unconsciously

  // Potential Too Little — dormant, waiting, receptive seed
  [`${TL}|${B}`]:  'Ember',          // Dormant potential + steady will — small flame, well-tended
  [`${TL}|${TM}`]: 'Anvil',          // Dormant potential + fierce will — hammering what little there is
  [`${TL}|${TL}`]: 'Stillness',      // Dormant potential + yielding will — deep quiet
  [`${TL}|${UA}`]: 'Root',            // Dormant potential + hidden will — waiting underground

  // Potential Unacknowledged — hidden possibility, unseen fuel
  [`${UA}|${B}`]:  'Undercurrent',   // Hidden potential + steady will — depth beneath calm surface
  [`${UA}|${TM}`]: 'Storm',          // Hidden potential + fierce will — power from unknown source
  [`${UA}|${TL}`]: 'Whisper',        // Hidden potential + yielding will — barely perceptible signal
  [`${UA}|${UA}`]: 'Deep',           // Both hidden — profound unconscious foundation
};

// ─── OUTER PAIR: Actualization × Awareness (The Lens) ───
// These two archetypes represent the expression of selfhood:
// Actualization = bringing into form, manifesting, making real
// Awareness = perceiving, seeing, recognizing what is
//
// Together they answer: "What are you creating, and how clearly do you see it?"
const LENS_NAMES = {
  // Actualization Balanced — clear manifestation, bringing things into form naturally
  [`${B}|${B}`]:   'Sight',          // Clear creation + clear perception — full clarity
  [`${B}|${TM}`]:  'Floodlit',       // Clear creation + overwhelming perception — seeing too much
  [`${B}|${TL}`]:  'Focus',          // Clear creation + narrow perception — manifesting precisely
  [`${B}|${UA}`]:  'Dreaming',       // Clear creation + hidden perception — making without seeing

  // Actualization Too Much — overproducing, manifesting excessively
  [`${TM}|${B}`]:  'Blaze',          // Overproducing + clear sight — aware of the excess
  [`${TM}|${TM}`]: 'Supernova',      // Overproducing + overwhelmed sight — maximum intensity
  [`${TM}|${TL}`]: 'Laser',          // Overproducing + narrow sight — intense narrow beam
  [`${TM}|${UA}`]: 'Mirage',         // Overproducing + hidden sight — creating illusions

  // Actualization Too Little — underproducing, manifestation constrained
  [`${TL}|${B}`]:  'Dawn',           // Underproducing + clear sight — can see but not yet create
  [`${TL}|${TM}`]: 'Glare',          // Underproducing + overwhelmed sight — blinded, can't act
  [`${TL}|${TL}`]: 'Dusk',           // Underproducing + dim sight — fading on both axes
  [`${TL}|${UA}`]: 'Fog',            // Underproducing + hidden sight — lost in obscurity

  // Actualization Unacknowledged — creating without knowing it
  [`${UA}|${B}`]:  'Glimpse',        // Hidden creation + clear sight — seeing but not owning
  [`${UA}|${TM}`]: 'Overwhelm',      // Hidden creation + flooded sight — too much input, unknown output
  [`${UA}|${TL}`]: 'Shadow',         // Hidden creation + dim sight — operating in the dark
  [`${UA}|${UA}`]: 'Veil',           // Both hidden — complete unconsciousness in outer expression
};

// ─── ENGINE DESCRIPTIONS (what the inner pair state means) ───
const ENGINE_DESCRIPTIONS = {
  'Sovereign':    'Full inner command. Potential flows naturally and Will directs it steadily. The engine is running clean.',
  'Champion':     'Open potential meets fierce determination. Energy is available and the drive to use it is strong — perhaps too strong.',
  'Dreamer':      'Rich possibility without the push to act on it. The seed is open but the will is quiet. Invitation: what would move you?',
  'Wanderer':     'Potential is available but the driving force is hidden. Moving through life without knowing what propels you.',
  'Fountain':     'Surging potential held by steady will. Abundant energy, well-directed. Watch for overflow.',
  'Volcano':      'Maximum force — surging potential meets fierce will. Powerful but potentially overwhelming. Channel carefully.',
  'Torrent':      'Surging energy without direction. Potential overflows but will is yielding. The river needs banks.',
  'Geyser':       'Erupting potential with hidden drive. Energy bursts forth but you may not understand why. Deepest creative surprise.',
  'Ember':        'Small flame, well-tended. Potential is quiet but will is steady. Patient, enduring. The spark is enough.',
  'Anvil':        'Fierce will hammering limited potential. Determination exceeds raw material. Intensity meeting scarcity.',
  'Stillness':    'Deep quiet. Both potential and will are yielding. Not emptiness — receptive spaciousness. What wants to enter?',
  'Root':         'Dormant potential, hidden will. Everything is underground, waiting. The deepest form of pre-emergence.',
  'Undercurrent': 'Hidden depths beneath a calm surface. Potential is unconscious but will moves steadily. Strength you don\'t know you have.',
  'Storm':        'Hidden potential meets fierce will. Driven by forces you can\'t see. Power from an unknown source.',
  'Whisper':      'Hidden potential, yielding will. The faintest signal. Something is there but barely perceptible.',
  'Deep':         'Both potential and will are hidden. The most profound unconscious foundation. Before dawn, before the seed.',
};

// ─── LENS DESCRIPTIONS (what the outer pair state means) ───
const LENS_DESCRIPTIONS = {
  'Sight':        'Full clarity — manifesting naturally and perceiving clearly. What you create and what you see are aligned.',
  'Floodlit':     'Creating clearly but perception is overwhelming. You see too much. Discernment is the invitation.',
  'Focus':        'Clear creation with narrow perception. Manifesting precisely but missing the periphery. Broaden the gaze.',
  'Dreaming':     'Creating without seeing what you\'re creating. The work flows but awareness of it is hidden. A muse state.',
  'Blaze':        'Overproducing with clear sight. You can see the excess. Awareness of abundance is the first step to channeling it.',
  'Supernova':    'Maximum intensity — creating too much and seeing too much. Everything amplified. Profound but unsustainable.',
  'Laser':        'Intense creation through a narrow beam. Overproducing in a focused way with limited sight. Precise but potentially blind to context.',
  'Mirage':       'Creating excessively from hidden sight. What you manifest may not be what you think. Check reality.',
  'Dawn':         'Clear sight with emerging creation. You can see the path but haven\'t fully stepped onto it yet. The beginning.',
  'Glare':        'Overwhelmed perception with constrained creation. Seeing too much, paralyzed from acting. Step back to act.',
  'Dusk':         'Both fading — creation and sight are yielding. Not ending — transitioning. What\'s next wants to emerge.',
  'Fog':          'Constrained creation with hidden sight. Lost in obscurity. The invitation is radical: what do you actually know?',
  'Glimpse':      'You see clearly but don\'t own what you\'re creating. The work is happening but you haven\'t claimed it.',
  'Overwhelm':    'Flooded sight with hidden creation. Perception overloaded, output unconscious. Ground first, then look.',
  'Shadow':       'Operating in the dark. Both creation and sight are constrained or hidden. Here the deepest transformation waits.',
  'Veil':         'Complete unconsciousness in outer expression. Creation and perception both hidden. The most profound invitation to awaken.',
};

// ─── GOVERNANCE CASCADE ───
// Each Gestalt archetype governs a manifest house.
// Its status determines the quality of that governance.
const GOVERNANCE_MAP = {
  0:  { house: 'Spirit',  label: 'Potential governs Spirit' },
  1:  { house: 'Body',    label: 'Will governs Body' },
  19: { house: 'Mind',    label: 'Actualization governs Mind' },
  20: { house: 'Emotion', label: 'Awareness governs Emotion' },
};

const STATUS_NAMES = { 1: 'Balanced', 2: 'Too Much', 3: 'Too Little', 4: 'Unacknowledged' };

/**
 * Get the full Gestalt condition for a given draw map.
 * @param {Object} drawMap - Position-indexed draw lookup
 * @returns {Object} Complete Gestalt condition analysis
 */
export function getGestaltCondition(drawMap) {
  const potential    = drawMap[0]?.status  || 1;
  const will         = drawMap[1]?.status  || 1;
  const actualization = drawMap[19]?.status || 1;
  const awareness    = drawMap[20]?.status || 1;

  const engineKey = `${potential}|${will}`;
  const lensKey   = `${actualization}|${awareness}`;

  const engineName = ENGINE_NAMES[engineKey] || 'Unknown';
  const lensName   = LENS_NAMES[lensKey]     || 'Unknown';
  const fullName   = `${engineName} ${lensName}`;

  // Capacity: how many are balanced
  const statuses = [potential, will, actualization, awareness];
  const balancedCount = statuses.filter(s => s === B).length;
  const tooMuchCount  = statuses.filter(s => s === TM).length;
  const tooLittleCount = statuses.filter(s => s === TL).length;
  const unackCount    = statuses.filter(s => s === UA).length;

  const capacityLabels = ['Uncharted', 'Anchored', 'Partial', 'Strong', 'Full Command'];
  const capacity = capacityLabels[balancedCount];

  // Dominant character of imbalance
  const imbalanced = statuses.filter(s => s !== B);
  let character;
  if (imbalanced.length === 0) {
    character = 'Clear';
  } else if (imbalanced.every(s => s === TM)) {
    character = 'Abundant';
  } else if (imbalanced.every(s => s === TL)) {
    character = 'Receptive';
  } else if (imbalanced.every(s => s === UA)) {
    character = 'Emerging';
  } else if (imbalanced.some(s => s === UA)) {
    character = 'Shadowed';
  } else {
    character = 'Turbulent';
  }

  // Governance analysis
  const governance = [
    { archId: 0,  name: 'Potential',      status: STATUS_NAMES[potential],     house: 'Spirit',  balanced: potential === B },
    { archId: 1,  name: 'Will',           status: STATUS_NAMES[will],          house: 'Body',    balanced: will === B },
    { archId: 19, name: 'Actualization',  status: STATUS_NAMES[actualization], house: 'Mind',    balanced: actualization === B },
    { archId: 20, name: 'Awareness',      status: STATUS_NAMES[awareness],     house: 'Emotion', balanced: awareness === B },
  ];

  const governedHouses = governance.filter(g => g.balanced).map(g => g.house);
  const seekingHouses  = governance.filter(g => !g.balanced).map(g => `${g.house} (${g.status})`);

  // Integration level based on weighted contribution
  const weights = { [B]: 1.0, [TM]: 0.5, [TL]: 0.35, [UA]: 0.2 };
  const integration = Math.round(
    (statuses.reduce((sum, s) => sum + (weights[s] || 0), 0) / 4) * 100
  );

  // Analysis strategy
  let strategy;
  if (balancedCount === 4) {
    strategy = 'Gestalt is fully integrated. All four manifest houses are well-governed. Focus attention on house-level and bound-level patterns.';
  } else if (balancedCount === 3) {
    const seeking = governance.find(g => !g.balanced);
    strategy = `Strong foundation — three governors flowing. ${seeking.name} (${seeking.status}) invites attention, which cascades to ${seeking.house} house. Start there.`;
  } else if (balancedCount === 2) {
    const seekingGovs = governance.filter(g => !g.balanced);
    strategy = `Split governance. ${seekingGovs.map(g => `${g.name} → ${g.house}`).join(' and ')} are seeking balance. Check if the imbalanced governors share a correction path.`;
  } else if (balancedCount === 1) {
    const anchor = governance.find(g => g.balanced);
    strategy = `${anchor.name} is the anchor — ${anchor.house} house is well-governed. The other three houses are seeking governor attention. Work outward from the anchor.`;
  } else {
    strategy = `All four governors are seeking balance. The entire governance layer is in motion. Look for the governor closest to balance (${character === 'Abundant' ? 'Too Much has energy to redirect' : character === 'Receptive' ? 'Too Little has space to fill' : 'begin where awareness can be brought'}).`;
  }

  return {
    name: fullName,
    engineName,
    lensName,
    engineDescription: ENGINE_DESCRIPTIONS[engineName] || '',
    lensDescription: LENS_DESCRIPTIONS[lensName] || '',
    capacity,
    character,
    integration,
    balancedCount,
    profile: { balanced: balancedCount, tooMuch: tooMuchCount, tooLittle: tooLittleCount, unacknowledged: unackCount },
    governance,
    governedHouses,
    seekingHouses,
    strategy,
    statuses: {
      potential:      STATUS_NAMES[potential],
      will:           STATUS_NAMES[will],
      actualization:  STATUS_NAMES[actualization],
      awareness:      STATUS_NAMES[awareness],
    }
  };
}

// Export for testing/inspection
export { ENGINE_NAMES, LENS_NAMES, ENGINE_DESCRIPTIONS, LENS_DESCRIPTIONS, GOVERNANCE_MAP };
