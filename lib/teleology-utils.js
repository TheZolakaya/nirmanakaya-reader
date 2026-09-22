// === TELEOLOGICAL UTILITIES ===
// Main utilities for Words to the Whys feature

import {
  TELEOLOGY_ARCHETYPES,
  STATUS_FRAMES,
  INSTANT_RETURN,
  HOUSES_TELEOLOGY,
  getArchetypeTeleology,
  getRetrievalRoute,
  getStatusSpecific
} from './teleology.js';

import {
  NUMBER_MODES,
  CHANNELS_TELEOLOGY,
  POLARITY_MEANINGS,
  AGENT_STATUS_MEANINGS,
  getChannelFromPosition,
  getNumberFromPosition,
  getBoundTeleology,
  calculateBoundCorrection,
  getAgentChannelFromPosition,
  getAgentRoleFromPosition,
  getAgentTeleology
} from './teleology-extensions.js';
import { getComponent, getFullCorrection, getCorrectionTargetId } from './corrections.js';

// .534: ONE DRAW, ONE MEDICINE. The teleology data's retrieval partners predate the medicine wheel in corrections.js
// and disagree with it in 16 of 66 archetype×status cases. The record is the authority; the teleology's own
// instruction sentence is kept only when its partner is the record's medicine.
const STATUS_NUM = { too_much: 2, too_little: 3, unacknowledged: 4 };
const PARTNER_TYPE = { too_much: 'diagonal', too_little: 'vertical', unacknowledged: 'reduction' };
const MECHANISM = {
  too_much: 'the capacity in excess crosses the map to the opposite element; the medicine is the partner\'s own action',
  too_little: 'the seat is running on empty; energy into the partner\'s own action pulls the current through the starved seat',
  unacknowledged: 'authorship misattributed; the medicine returns toward the simpler, earlier form of the same line',
};
const RENAMES = { Awareness: 'Recognition', Sacrifice: 'Faith', Change: 'Transformation', Balance: 'Tune', Order: 'Authority' };
function recordRetrieval(cardId, statusKey, teleRoute) {
  const num = STATUS_NUM[statusKey]; if (!num) return teleRoute || null;
  try {
    const trans = getComponent(cardId); const corr = getFullCorrection(cardId, num);
    const mid = corr ? getCorrectionTargetId(corr, trans) : null; const med = mid != null ? getComponent(mid) : null;
    if (!med) return teleRoute || null;
    const teleName = teleRoute ? (RENAMES[teleRoute.name] || teleRoute.name) : null;
    const agrees = teleName === med.name;
    return { partner_type: PARTNER_TYPE[statusKey], archetype: mid, name: med.name,
      instruction: agrees && teleRoute?.instruction ? teleRoute.instruction : `${med.name} is the medicine, by the ${PARTNER_TYPE[statusKey]} — ${MECHANISM[statusKey]}.` };
  } catch { return teleRoute || null; }
}

// Status name mapping
const STATUS_MAP = {
  1: 'balanced',
  2: 'too_much',
  3: 'too_little',
  4: 'unacknowledged'
};

// Determine card type from position
export function getCardType(position) {
  if (position >= 0 && position <= 21) return 'archetype';
  if (position >= 22 && position <= 61) return 'bound';
  if (position >= 62 && position <= 77) return 'agent';
  return null;
}

// Main teleological data lookup function
export function getTeleologicalData(position, status, cardType = null) {
  // Normalize status to string
  const statusStr = typeof status === 'number' ? STATUS_MAP[status] : status.toLowerCase().replace(' ', '_');

  // Auto-detect card type if not provided
  if (!cardType) {
    cardType = getCardType(position);
  }

  let data = {};

  if (cardType === 'archetype') {
    const archTeleology = getArchetypeTeleology(position);
    if (!archTeleology) return null;

    data = {
      name: archTeleology.name,
      traditional: archTeleology.traditional,
      cardType: 'archetype',
      position,
      ...archTeleology,
      status: statusStr,
      statusFrame: STATUS_FRAMES[statusStr],
      houseData: HOUSES_TELEOLOGY[archTeleology.house],
      instantReturn: INSTANT_RETURN
    };

    // Add retrieval route if imbalanced
    if (statusStr !== 'balanced') {
      data.retrieval = recordRetrieval(position, statusStr, getRetrievalRoute(position, statusStr)); // .534: the record's medicine
    }

    // Add status-specific message
    data.statusMessage = getStatusSpecific(position, statusStr);

  } else if (cardType === 'bound') {
    const boundTeleology = getBoundTeleology(position);
    if (!boundTeleology) return null;

    // Get parent archetype data
    const parentArch = getArchetypeTeleology(boundTeleology.associated_archetype);

    data = {
      name: boundTeleology.name,
      traditional: boundTeleology.traditional,
      cardType: 'bound',
      position,
      associatedArchetype: boundTeleology.archetype_name,
      associatedArchetypePosition: boundTeleology.associated_archetype,
      number: boundTeleology.number,
      channel: boundTeleology.channel,
      polarity: boundTeleology.polarity,
      numberMode: boundTeleology.numberMode,
      polarityData: boundTeleology.polarityData,
      channelData: boundTeleology.channelData,
      boundTeleological: boundTeleology.teleological,
      // Parent archetype context
      parent: parentArch,
      status: statusStr,
      statusFrame: STATUS_FRAMES[statusStr],
      instantReturn: INSTANT_RETURN
    };

    // Calculate correction if imbalanced
    if (statusStr !== 'balanced') {
      data.correction = calculateBoundCorrection(
        boundTeleology.number,
        boundTeleology.channel,
        statusStr
      );
    }

  } else if (cardType === 'agent') {
    const agentTeleology = getAgentTeleology(position);
    if (!agentTeleology) return null;

    // Get parent archetype data
    const parentArch = getArchetypeTeleology(agentTeleology.associated_archetype);

    data = {
      name: agentTeleology.name,
      traditional: agentTeleology.traditional,
      cardType: 'agent',
      position,
      associatedArchetype: agentTeleology.archetype_name,
      associatedArchetypePosition: agentTeleology.associated_archetype,
      role: agentTeleology.role,
      channel: agentTeleology.channel,
      roleData: agentTeleology.roleData,
      channelData: agentTeleology.channelData,
      agentTeleological: agentTeleology.teleological,
      // Parent archetype context
      parent: parentArch,
      status: statusStr,
      statusMeaning: AGENT_STATUS_MEANINGS?.[statusStr],
      statusFrame: STATUS_FRAMES[statusStr],
      instantReturn: INSTANT_RETURN
    };

    // For agents, retrieval uses parent archetype's routes
    if (statusStr !== 'balanced' && parentArch) {
      data.retrieval = recordRetrieval(position, statusStr, getRetrievalRoute(agentTeleology.associated_archetype, statusStr)); // .534: the agent's own record medicine
    }
  }

  return data;
}

// Build teleological prompt section for a single card
export function buildTeleologicalPrompt(teleologicalData) {
  if (!teleologicalData) return '';

  const { cardType, name, traditional, status, statusFrame } = teleologicalData;

  let prompt = `## What Emerges
- **Signature:** ${name}
- **Status:** ${status.replace('_', ' ')}
- **Ring:** ${statusFrame?.ring} (${statusFrame?.location})
`;

  if (cardType === 'archetype') {
    prompt += `
## Teleological Context (Archetype)

### Creation Position
- **Step:** ${teleologicalData.step} of 22
- **Phase:** ${teleologicalData.phase}
- **Creates/Operates:** ${teleologicalData.creates}
- **Verb:** ${teleologicalData.verb}

### Structural Location
- **House:** ${teleologicalData.house}
- **House Command:** "${teleologicalData.houseData?.command || ''}"
- **Function:** ${teleologicalData.function}
- **Ring:** ${teleologicalData.ring}
- **Pillar:** ${teleologicalData.pillar}

### Status
- **Status Message:** ${teleologicalData.statusMessage}
- **Creation Type:** ${statusFrame?.creation_type}
`;

    if (teleologicalData.retrieval) {
      prompt += `
### Retrieval Route
- **Partner:** ${teleologicalData.retrieval.name} (${teleologicalData.retrieval.archetype})
- **Instruction:** ${teleologicalData.retrieval.instruction}
`;
    }

    prompt += `
### Core Messages
- **Teaching:** ${teleologicalData.teaching}
- **Question:** ${teleologicalData.question}
- **Instant Return:** ${teleologicalData.instantReturn}
`;

  } else if (cardType === 'bound') {
    prompt += `
## Teleological Context (Bound)

### Bound Identity
- **Number:** ${teleologicalData.number} (${teleologicalData.numberMode?.mode})
- **Channel:** ${teleologicalData.channel}
- **Polarity:** ${teleologicalData.polarity}
- **Associated Archetype:** ${teleologicalData.associatedArchetype}

### Number Mode
- **Mode:** ${teleologicalData.numberMode?.mode}
- **Keywords:** ${teleologicalData.numberMode?.keywords?.join(', ')}
- **Teleological:** ${teleologicalData.numberMode?.teleological}

### Polarity
- **${teleologicalData.polarity}:** ${teleologicalData.polarityData?.teleological}

### Bound Teleological
${teleologicalData.boundTeleological}

### Parent Archetype Context
- **Step:** ${teleologicalData.parent?.step} of 22
- **Verb:** ${teleologicalData.parent?.verb}
- **House:** ${teleologicalData.parent?.house}
- **Teaching:** ${teleologicalData.parent?.teaching}
`;

    if (teleologicalData.correction) {
      prompt += `
### Correction
- **Corrects to:** ${teleologicalData.correction.number} of ${teleologicalData.correction.channel}
- **Correction Bound:** ${teleologicalData.correction.bound?.name}
`;
    }

  } else if (cardType === 'agent') {
    prompt += `
## Teleological Context (Agent)

### Agent Identity
- **Role:** ${teleologicalData.role}
- **Channel:** ${teleologicalData.channel}
- **Associated Archetype:** ${teleologicalData.associatedArchetype}

### Role
- **House:** ${teleologicalData.roleData?.house}
- **Verb:** ${teleologicalData.roleData?.verb}
- **Teleological:** ${teleologicalData.roleData?.teleological}
- **Command Relationship:** ${teleologicalData.roleData?.command_relationship}

### Agent Teleological
${teleologicalData.agentTeleological}

### Parent Archetype Context
- **Step:** ${teleologicalData.parent?.step} of 22
- **Verb:** ${teleologicalData.parent?.verb}
- **House:** ${teleologicalData.parent?.house}
- **Teaching:** ${teleologicalData.parent?.teaching}

### Status
- **Meaning:** ${teleologicalData.statusMeaning}
`;

    if (teleologicalData.retrieval) {
      prompt += `
### Retrieval Route (via Parent Archetype)
- **Partner:** ${teleologicalData.retrieval.name} (${teleologicalData.retrieval.archetype})
- **Instruction:** ${teleologicalData.retrieval.instruction}
`;
    }
  }

  return prompt;
}

// Build combined teleological prompt for all cards in a reading
export function buildReadingTeleologicalPrompt(draws) {
  if (!draws || draws.length === 0) return '';

  let prompt = `\n\n## TELEOLOGICAL CONTEXT FOR THIS READING\n`;

  draws.forEach((draw, index) => {
    // .528: THE CARD, not the seat. Since the two-layer draw, draw.position is where it landed and
    // draw.transient is what emerged; this was keyed on the seat and described the wrong card.
    const teleologyData = getTeleologicalData(draw.transient ?? draw.position, draw.status);
    if (teleologyData) {
      prompt += `\n### Card ${index + 1}: ${teleologyData.name}\n`;
      prompt += buildTeleologicalPrompt(teleologyData);
    }
  });

  prompt += `
## WORDS TO THE WHYS INSTRUCTIONS

Generate 2-4 paragraphs that:
1. Open with what emerges — "[Name] emerges..." — and ground in teleological position
2. Name the verb, the House command, the Ring location
3. Address status specifically — Now (Ring 5) or Un-Now (Ring 7)
4. If imbalanced, name the retrieval route
5. Close with teaching/question and the instant return

Use [brackets] around key terms for hotlinking.

Voice: Declarative, structural, direct. Use "emerges" / "surfaces" — NEVER "draw" / "drew".
`;

  return prompt;
}
