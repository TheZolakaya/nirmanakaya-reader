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
      data.retrieval = getRetrievalRoute(position, statusStr);
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
      data.retrieval = getRetrievalRoute(agentTeleology.associated_archetype, statusStr);
    }
  }

  return data;
}

// Build teleological prompt section for a single card
export function buildTeleologicalPrompt(teleologicalData) {
  if (!teleologicalData) return '';

  const { cardType, name, traditional, status, statusFrame } = teleologicalData;

  let prompt = `## What Emerges
- **Signature:** ${name}${traditional ? ` (${traditional})` : ''}
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
    const teleologyData = getTeleologicalData(draw.position, draw.status);
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
