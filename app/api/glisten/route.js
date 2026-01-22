/**
 * Glistener API Route
 * POST /api/glisten
 *
 * Generates a complete Glisten session:
 * Bones -> Symbolism -> Transmission -> Integration -> Crystal
 */

import { fetchWithRetry } from '../../../lib/fetchWithRetry.js';
import {
  generateBoneSet,
  validateBoneSet,
  buildSymbolismPrompt,
  buildTransmissionPrompt,
  buildIntegrationPrompt,
  buildCrystalPrompt,
  validateTransmission,
  validateCrystal
} from '../../../lib/glistener/index.js';

const MAX_RETRIES = 1;

/**
 * Call Claude API with fetchWithRetry and prompt caching
 */
async function callClaude(prompt, maxTokens = 1000) {
  const response = await fetchWithRetry("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "prompt-caching-2024-07-31"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message);
  }

  const text = data.content?.map(item => item.text || "").join("\n") || "";
  return { text, usage: data.usage };
}

export async function POST(request) {
  try {
    let totalUsage = {
      input_tokens: 0,
      output_tokens: 0,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0
    };

    // ========== PHASE 1: BONES ==========
    const boneResult = generateBoneSet();

    if (!boneResult.success) {
      return Response.json({
        success: false,
        error: 'Failed to generate bones. Please try again.',
        phase: 'bones'
      }, { status: 500 });
    }

    const { bones } = boneResult;

    // Validate
    const validation = validateBoneSet(bones);
    if (!validation.valid) {
      return Response.json({
        success: false,
        error: validation.error,
        phase: 'validation'
      }, { status: 500 });
    }

    // ========== PHASE 2: SYMBOLISM ==========
    const symbolismPrompt = buildSymbolismPrompt(bones);
    const symbolismResult = await callClaude(symbolismPrompt, 800);
    const symbolism = symbolismResult.text;
    addUsage(totalUsage, symbolismResult.usage);

    // ========== PHASE 3: TRANSMISSION ==========
    let transmission;
    for (let i = 0; i <= MAX_RETRIES; i++) {
      const transmissionPrompt = buildTransmissionPrompt(bones, symbolism);
      const transmissionResult = await callClaude(transmissionPrompt, 500);
      transmission = transmissionResult.text;
      addUsage(totalUsage, transmissionResult.usage);

      if (validateTransmission(transmission)) break;

      if (i === MAX_RETRIES) {
        // Proceed anyway - imperfect is better than failed
        console.warn('Transmission lacks directional marker, proceeding anyway');
      }
    }

    // ========== PHASE 4: INTEGRATION ==========
    const integrationPrompt = buildIntegrationPrompt(transmission);
    const integrationResult = await callClaude(integrationPrompt, 400);
    const integration = integrationResult.text;
    addUsage(totalUsage, integrationResult.usage);

    // ========== PHASE 5: CRYSTAL ==========
    let crystal;
    for (let i = 0; i <= MAX_RETRIES; i++) {
      const crystalPrompt = buildCrystalPrompt(integration);
      const crystalResult = await callClaude(crystalPrompt, 100);
      crystal = crystalResult.text;
      addUsage(totalUsage, crystalResult.usage);

      if (validateCrystal(crystal)) break;

      if (i === MAX_RETRIES) {
        // Force question mark if missing
        crystal = crystal.trim();
        if (!crystal.endsWith('?')) {
          crystal = crystal.replace(/[.!]?$/, '?');
        }
      }
    }

    // ========== RESPONSE ==========
    return Response.json({
      success: true,
      bones: bones.map(b => ({
        constraint: b.constraint.toUpperCase(),
        word: b.word
      })),
      symbolism,
      transmission,
      integration,
      crystal: crystal.trim(),
      usage: totalUsage
    });

  } catch (error) {
    console.error('Glistener error:', error);
    return Response.json({
      success: false,
      error: 'An error occurred during the Glisten process.',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * Helper to accumulate usage stats
 */
function addUsage(total, usage) {
  if (!usage) return;
  total.input_tokens += usage.input_tokens || 0;
  total.output_tokens += usage.output_tokens || 0;
  total.cache_creation_input_tokens += usage.cache_creation_input_tokens || 0;
  total.cache_read_input_tokens += usage.cache_read_input_tokens || 0;
}
