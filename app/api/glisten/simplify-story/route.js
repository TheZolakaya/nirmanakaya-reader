/**
 * Story Simplify API Route
 * POST /api/glisten/simplify-story
 *
 * Takes a narrative synthesis (transmission) and simplifies it to a shallower depth level.
 * Depth levels: deep -> swim -> wade -> shallow
 */

import { fetchWithRetry } from '../../../../lib/fetchWithRetry.js';

const DEPTH_PROMPTS = {
  deep: `Refine this narrative for clarity while preserving its philosophical depth and poetic quality.
Keep metaphor, symbolism, and evocative language. Graduate-level prose is fine.
Preserve the emotional resonance and meaning.
Output ONLY the refined narrative - no explanation, no meta-commentary.`,

  swim: `Simplify this narrative to clear, direct language a smart high schooler would understand.
Reduce metaphor and abstraction. Keep the core meaning but make it more concrete.
Maintain the emotional arc but in simpler terms.
Output ONLY the simplified narrative - no explanation, no meta-commentary.`,

  wade: `Translate this into everyday language using words a 5th grader knows.
What is this really saying about life? Make it practical and personal.
Use simple sentences and familiar concepts.
Output ONLY the grounded narrative - no explanation, no meta-commentary.`,

  shallow: `Distill to the simplest possible explanation a curious child would understand.
Use only basic words. Get to the raw human truth underneath.
Keep it short and direct - 2-3 simple sentences max.
Output ONLY the essential narrative - no explanation, no meta-commentary.`
};

async function callClaude(prompt, maxTokens = 500) {
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
    const { transmission, targetDepth } = await request.json();

    if (!transmission || !targetDepth) {
      return Response.json({
        success: false,
        error: 'Missing transmission or targetDepth'
      }, { status: 400 });
    }

    if (!DEPTH_PROMPTS[targetDepth]) {
      return Response.json({
        success: false,
        error: 'Invalid targetDepth. Use: deep, swim, wade, or shallow'
      }, { status: 400 });
    }

    const prompt = `${DEPTH_PROMPTS[targetDepth]}

Original narrative:
"${transmission}"

Simplified narrative:`;

    const simplified = await callClaude(prompt, 500);

    // Clean up the response
    let cleanTransmission = simplified.trim()
      .replace(/^["']|["']$/g, '');  // Remove surrounding quotes if present

    return Response.json({
      success: true,
      transmission: cleanTransmission,
      depth: targetDepth
    });

  } catch (error) {
    console.error('Simplify story error:', error);
    return Response.json({
      success: false,
      error: 'Failed to simplify story',
      details: error.message
    }, { status: 500 });
  }
}
