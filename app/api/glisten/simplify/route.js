/**
 * Crystal Simplify API Route
 * POST /api/glisten/simplify
 *
 * Takes a crystal question and simplifies it to a shallower depth level.
 * Depth levels: deep -> swim -> wade -> shallow
 */

import { fetchWithRetry } from '../../../../lib/fetchWithRetry.js';

const DEPTH_PROMPTS = {
  deep: `Refine this question for clarity while preserving its philosophical depth and poetic quality.
Keep metaphor and abstraction. Graduate-level language is fine.
Target: 15-25 words. Evocative and profound.
If already clear, return unchanged or with minimal polish.
Output ONLY the refined question - no explanation, no quotes, just the question ending with ?`,

  swim: `Simplify this question to clear, direct language a smart high schooler would understand.
Remove metaphor and abstraction. Keep the core meaning but make it concrete.
Target: 12-18 words. Clear and thoughtful.
Output ONLY the simplified question - no explanation, no quotes, just the question ending with ?`,

  wade: `Translate this into everyday language about real life, using words a 5th grader knows.
What is this really asking about? Make it practical and personal.
Target: 10-15 words. Simple and grounded.
Output ONLY the grounded question - no explanation, no quotes, just the question ending with ?`,

  shallow: `Distill to the simplest possible question a curious child would ask.
Use only basic words. Get to the raw human question underneath.
MAXIMUM 10 words. Short and direct.
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
