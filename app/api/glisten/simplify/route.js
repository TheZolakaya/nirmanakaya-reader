/**
 * Crystal Simplify API Route
 * POST /api/glisten/simplify
 *
 * Takes a crystal question and simplifies it to a shallower depth level.
 * Depth levels: deep -> swim -> wade -> shallow
 */

import { fetchWithRetry } from '../../../../lib/fetchWithRetry.js';

const DEPTH_PROMPTS = {
  swim: `You are simplifying a profound question to make it more accessible.
Take this deep, metaphysically-rich question and make it somewhat simpler while keeping its essence.
Reduce abstract concepts, use more concrete language, but maintain the core inquiry.
Output ONLY the simplified question - no explanation, no quotes, just the question ending with ?`,

  wade: `You are simplifying a question for everyday understanding.
Take this question and make it practical and relatable.
Use simple, everyday language. Remove metaphysical or abstract framing.
Focus on the actionable or emotional core.
Output ONLY the simplified question - no explanation, no quotes, just the question ending with ?`,

  shallow: `You are distilling a question to its simplest form.
Take this question and reduce it to the most basic, direct version possible.
One simple question anyone could immediately understand and answer.
Maximum 10 words if possible.
Output ONLY the simplified question - no explanation, no quotes, just the question ending with ?`
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
        error: 'Invalid targetDepth. Use: swim, wade, or shallow'
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
