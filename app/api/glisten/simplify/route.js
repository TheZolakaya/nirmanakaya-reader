/**
 * Crystal Simplify API Route
 * POST /api/glisten/simplify
 *
 * Takes a crystal question and simplifies it to a shallower depth level.
 * Depth levels: deep -> swim -> wade -> shallow
 */

import { fetchWithRetry } from '../../../../lib/fetchWithRetry.js';

const DEPTH_PROMPTS = {
  deep: `You are refining a question for clarity and coherence while preserving its depth.
This question emerged from a creative process and may have unusual phrasing.
Make it grammatically sensible and clear while keeping its philosophical depth and poetic quality.
Do not simplify the meaning - only ensure it reads naturally as a profound question.
If it's already clear, return it unchanged or with minimal polish.
Output ONLY the refined question - no explanation, no quotes, just the question ending with ?`,

  swim: `Reframe this philosophical question using clearer, more direct language.
Keep the depth and meaning intact, but make it accessible without metaphor or heavy abstraction.
The question should feel equally profound but easier to hold in mind.
Output ONLY the reframed question - no explanation, no quotes, just the question ending with ?`,

  wade: `Extract the practical, lived-experience version of this question.
What is this question really asking about daily life, relationships, or decisions?
Ground the cosmic in the personal without losing the thread of inquiry.
Output ONLY the grounded question - no explanation, no quotes, just the question ending with ?`,

  shallow: `Find the essential question hiding inside this one.
Strip away all framing and get to the raw, human question at its core.
What would a child ask that points to the same thing? Maximum 10 words.
Output ONLY the essential question - no explanation, no quotes, just the question ending with ?`
};

async function callClaude(prompt, maxTokens = 100) {
  const response = await fetchWithRetry("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
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

  return data.content?.map(item => item.text || "").join("\n") || "";
}

export async function POST(request) {
  try {
    const { crystal, targetDepth } = await request.json();

    if (!crystal || !targetDepth) {
      return Response.json({
        success: false,
        error: 'Missing crystal or targetDepth'
      }, { status: 400 });
    }

    if (!DEPTH_PROMPTS[targetDepth]) {
      return Response.json({
        success: false,
        error: 'Invalid targetDepth. Use: deep, swim, wade, or shallow'
      }, { status: 400 });
    }

    const prompt = `${DEPTH_PROMPTS[targetDepth]}

Original question: "${crystal}"

Simplified question:`;

    const simplified = await callClaude(prompt, 100);

    // Clean up the response
    let cleanCrystal = simplified.trim()
      .replace(/^["']|["']$/g, '')  // Remove quotes
      .replace(/^Question:\s*/i, '');  // Remove "Question:" prefix

    // Ensure it ends with ?
    if (!cleanCrystal.endsWith('?')) {
      cleanCrystal = cleanCrystal.replace(/[.!]?$/, '?');
    }

    return Response.json({
      success: true,
      crystal: cleanCrystal,
      depth: targetDepth
    });

  } catch (error) {
    console.error('Simplify error:', error);
    return Response.json({
      success: false,
      error: 'Failed to simplify crystal',
      details: error.message
    }, { status: 500 });
  }
}
