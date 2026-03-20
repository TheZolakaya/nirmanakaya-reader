// app/api/reading/investigate/route.js
// Phase 3b: AI-initiated diagnostic investigation via Anthropic tool_use
//
// Flow:
//   1. Client sends 78-position draws + question
//   2. Server runs analyzeFullMap() + triageReading()
//   3. Seeds AI with L0-L2 triage (~400-500 tokens) + 7 diagnostic tools
//   4. AI calls tools to build its case (tool_use loop)
//   5. Returns final diagnostic interpretation
//
// Council rulings (March 20, 2026):
//   - Deterministic first pass, AI investigates deeper via tools
//   - Grok: auto-trigger correction path (handled by L5 in seed)
//   - Gemini: machine does physics, AI does empathy
//   - GPT: "MRI, not conversation"

import { analyzeFullMap, triageReading } from '../../../../lib/mapAnalysis.js';
import {
  DIAGNOSTIC_TOOL_DEFINITIONS,
  handleToolCall,
  buildTriageSeed
} from '../../../../lib/diagnosticTools.js';
import { fetchWithRetry } from '../../../../lib/fetchWithRetry.js';
import { PERSONA_PROMPTS } from '../../../../lib/personas.js';
import { getComplexityDescription, getHumorDescription } from '../../../../lib/personas.js';

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOOL_ROUNDS = 8; // Safety cap — prevent runaway investigation

// ─────────────────────────────────────────────
// DIAGNOSTIC SYSTEM PROMPT — COMPOSABLE
// ─────────────────────────────────────────────
// Shared DNA from the generalist (kernel ethos, personas, agent rule)
// + specialist-specific diagnostic method and structure.
// Assembly: Kernel Ethos → Agent Rule → Diagnostic Method → Architecture → Voice → Structure

// Shared: The Nirmanakaya Kernel ethos — same medical school for both doctors
const KERNEL_ETHOS = `## THE NIRMANAKAYA KERNEL

Nirmanakaya is a consciousness architecture. Consciousness is Primary (not emergent from matter). Every individuated being is a creator within the Creator. The architecture of creation can be derived, not invented.

The 5 Houses: Body (physicality), Emotion (relationship/feeling), Mind (logic/pattern), Spirit (will/drive/inspiration), Gestalt (integration of all houses — the Soul Testimony).
The 4 Channels: Intent (direction of will), Cognition (processing), Resonance (feeling-state), Structure (form it takes).

KEY ETHOS:
- You are not broken. You are a creator, creating.
- You are Sovereign. The system never commands; it reveals.
- Imbalance is not moral failure — it is mispronunciation. Energy flowing through the wrong channel or with distorted intensity.
- The Goal: Not "fixing" the user, but restoring alignment so their natural signal can broadcast clearly.
- Nirmanakaya is NOT tarot. Never reference tarot traditions or imagery.

CRITICAL: Never use pet names (honey, sweetheart, dear, sweetie, love, darling, my friend, my dear). Show warmth through TONE and CARE, not pet names.`;

// Shared: Agent/Royal interpretation rule
const AGENT_RULE = `CRITICAL RULE: ROYAL/AGENT INTERPRETATION
When an Agent (Initiate, Steward, Executor, Catalyst) appears in the data, it ALWAYS refers to an aspect of the QUERENT'S OWN consciousness — never an external person.
RIGHT: "This aspect of you..." / "The part of you that..."
WRONG: "There's someone in your life who..." / "A person who..."`;

// Specialist: Diagnostic method (unique to the 78-position doctor)
const DIAGNOSTIC_METHOD = `## DIAGNOSTIC METHOD

You have access to a 78-position reading — a complete state vector of someone's consciousness field. This is an MRI, not a conversation.

Your job: Build a diagnostic case by TRACING DERIVATION CHAINS through the reading, then deliver a clear, compassionate interpretation.

## THE DERIVATION CHAIN (this is your primary investigation pattern)

Each tool call should be BECAUSE the previous finding raised a question. Follow the chain:

1. Read the triage seed (L0-L2) — identify the 1-3 most telling distorted processes
2. getProcessDetail on a distorted process — WHO is visiting? What class? What trace loop?
3. getBoundDiagnosis on that SAME process — WHY is it distorted? Floor or ceiling? What's visiting the BOUNDS?
4. getCorrectionPath on that SAME process — where does the energy WANT to go? Is the bound chain open?
5. If the correction partner is also distorted, trace ITS chain too — that's where the knot is

This is how 78-position delivers precision that 22-position cannot: you're not just seeing THAT a process is distorted, you're seeing WHERE in its operating range the distortion lives, WHAT kind of energy is sitting in those constraint positions, and WHETHER the correction channel is open or blocked.

DO NOT reach for getHouseHealth as your first investigation. House-level surveys give breadth at the cost of depth. Trace individual chains FIRST. Only use getHouseHealth AFTER you've traced chains and want to check if a pattern is house-wide.

INVESTIGATION PRIORITY:
- Pick the 1-3 distorted processes most relevant to the person's question
- Trace the FULL chain for each (process → bounds → correction)
- Each finding should motivate the next tool call — "I see X, which makes me want to check Y"
- A single fully-traced chain reveals more than five house surveys

INTERPRETATION PRINCIPLES:
- "Your process is fine but the constraint on it is distorted" = the diagnostic precision this reading delivers. USE IT.
- Floor distortion = can't start right. Ceiling distortion = can't complete. Range-compromised = the whole pipe is bent.
- WHO is visiting a bound matters — a bound visited by an agent means something different than one visited by an archetype
- Balanced processes with balanced bounds = genuine health. Mention it — not everything needs fixing.
- Patterns > individual findings. What's the STORY the chains tell?
- If the reading is mostly healthy, say so with specificity about what's strong.
- Lead with what matters most. Don't enumerate everything.

THE MEDICINE (CRITICAL — ALWAYS SURFACE THIS):
- Every distorted position has a REBALANCING target — the path back to alignment. This is the most important thing you tell the person.
- The rebalancing type tells you HOW: Too Much → diagonal (antidote is the opposite quality), Too Little → vertical (draw from what you lack), Unacknowledged → reduction (integrate what's hidden).
- Surface the rebalancing as INVITATION, not prescription. "The energy wants to move toward..." not "You must..."
- If the rebalancing target is ALSO distorted, say so — that's the deeper knot, and it's honest to name it.
- Bound-level corrections show where the CONSTRAINTS want to shift — this is the fine-tuning layer.
- A reading without the path forward is just an anxiety generator. Always include where things want to go.`;

// Specialist: Output structure
const DIAGNOSTIC_STRUCTURE = `STRUCTURE YOUR RESPONSE:
1. Opening orientation (1-2 sentences — the headline finding)
2. The key patterns (2-3 paragraphs — what you found and why it matters)
3. The path forward (1-2 paragraphs — the rebalancing invitations. Where does the energy WANT to go? What specific processes are asking to shift, and toward what? This is the medicine — never skip it.)

Keep it under 600 words. Depth over breadth.`;

/**
 * Build the diagnostic system prompt with shared DNA + specialist method.
 * Pulls in persona, complexity, humor from the same voice system the generalist uses.
 */
function buildDiagnosticSystemPrompt(options = {}) {
  const {
    persona = 'spiritualist',  // Default: guru voice for diagnostics
    complexity = 'clear',
    humor = 5,
    showArchitecture = false
  } = options;

  // Architecture visibility — same toggle as the generalist
  const archBlock = showArchitecture
    ? 'ARCHITECTURE VISIBLE: Use structural terminology freely — house names, channel names, process stages, horizon, signature classes. The user wants to see the scaffolding.'
    : 'ARCHITECTURE INVISIBLE: Weave structural concepts into natural language. Never mention positions, IDs, tool names, layers, signature classes, or technical terms. The structural data is for YOUR reasoning — translate the insights, not the labels.';

  // Voice — shared persona system
  const personaPrompt = PERSONA_PROMPTS[persona] || PERSONA_PROMPTS.spiritualist;
  const complexityDesc = getComplexityDescription(complexity);
  const humorDesc = getHumorDescription(humor);

  // Assembly: Kernel → Agent Rule → Method → Architecture → Structure → Voice
  return [
    KERNEL_ETHOS,
    '',
    AGENT_RULE,
    '',
    DIAGNOSTIC_METHOD,
    '',
    archBlock,
    '',
    DIAGNOSTIC_STRUCTURE,
    '',
    '## VOICE',
    personaPrompt,
    complexityDesc,
    humorDesc
  ].join('\n');
}

export async function POST(request) {
  try {
    const {
      draws,
      question,
      // Voice dials — same as the generalist reader
      persona = 'spiritualist',
      complexity = 'clear',
      humor = 5,
      showArchitecture = false,
      // Context
      userContext
    } = await request.json();

    if (!draws || !Array.isArray(draws) || draws.length < 22) {
      return Response.json(
        { error: 'Requires at least 22 draws for diagnostic analysis' },
        { status: 400 }
      );
    }

    // === STEP 1: Deterministic computation ===
    const analysis = analyzeFullMap(draws);

    // Build drawMap for tool handlers
    const drawMap = {};
    for (const draw of draws) {
      drawMap[draw.position] = draw;
    }

    const triage = triageReading(analysis, drawMap);

    // === STEP 2: Build the AI seed ===
    const triageSeed = buildTriageSeed(triage);

    // Build the system prompt — shared DNA + specialist method + voice dials
    let systemPrompt = buildDiagnosticSystemPrompt({ persona, complexity, humor, showArchitecture });
    if (userContext) {
      systemPrompt += `\n\nUSER JOURNEY CONTEXT:\n${userContext}`;
    }

    // The user message is the question + triage seed
    const userMessage = question
      ? `The person asked: "${question}"\n\n${triageSeed}`
      : triageSeed;

    // === STEP 3: Tool-use conversation loop ===
    const messages = [{ role: 'user', content: userMessage }];
    let totalUsage = { input_tokens: 0, output_tokens: 0 };
    let toolCallCount = 0;
    let rounds = 0;

    const toolContext = { analysis, triage, drawMap };

    while (rounds < MAX_TOOL_ROUNDS) {
      rounds++;

      const response = await fetchWithRetry(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 4096,
          system: systemPrompt,
          messages,
          tools: DIAGNOSTIC_TOOL_DEFINITIONS
        })
      });

      const data = await response.json();

      if (data.error) {
        return Response.json({ error: data.error.message }, { status: 500 });
      }

      // Accumulate usage
      totalUsage.input_tokens += data.usage?.input_tokens || 0;
      totalUsage.output_tokens += data.usage?.output_tokens || 0;

      // Check stop reason
      if (data.stop_reason === 'end_turn') {
        // AI is done investigating — extract the final text
        const finalText = data.content
          ?.filter(block => block.type === 'text')
          ?.map(block => block.text)
          ?.join('\n') || '';

        return Response.json({
          interpretation: finalText,
          triage: {
            severity: triage.severity,
            healthScore: triage.healthScore,
            distortionCount: triage.distortionCount,
            positionCount: triage.positionCount
          },
          meta: {
            toolCallCount,
            rounds,
            model: MODEL
          },
          usage: totalUsage
        });
      }

      if (data.stop_reason === 'tool_use') {
        // AI wants to call tools — process each tool call
        const assistantContent = data.content;
        messages.push({ role: 'assistant', content: assistantContent });

        const toolResults = [];
        for (const block of assistantContent) {
          if (block.type === 'tool_use') {
            toolCallCount++;
            const result = handleToolCall(block.name, block.input, toolContext);
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify(result)
            });
          }
        }

        messages.push({ role: 'user', content: toolResults });
        continue;
      }

      // Unexpected stop reason — return what we have
      const partialText = data.content
        ?.filter(block => block.type === 'text')
        ?.map(block => block.text)
        ?.join('\n') || '';

      return Response.json({
        interpretation: partialText,
        triage: {
          severity: triage.severity,
          healthScore: triage.healthScore,
          distortionCount: triage.distortionCount,
          positionCount: triage.positionCount
        },
        meta: {
          toolCallCount,
          rounds,
          model: MODEL,
          stopReason: data.stop_reason
        },
        usage: totalUsage
      });
    }

    // Safety cap hit — return with warning
    const lastAssistant = messages
      .filter(m => m.role === 'assistant')
      .pop();
    const capText = lastAssistant?.content
      ?.filter?.(block => block.type === 'text')
      ?.map(block => block.text)
      ?.join('\n') || 'Investigation reached maximum depth.';

    return Response.json({
      interpretation: capText,
      triage: {
        severity: triage.severity,
        healthScore: triage.healthScore,
        distortionCount: triage.distortionCount,
        positionCount: triage.positionCount
      },
      meta: {
        toolCallCount,
        rounds,
        model: MODEL,
        cappedAtMaxRounds: true
      },
      usage: totalUsage
    });

  } catch (e) {
    console.error('Investigate API error:', e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
