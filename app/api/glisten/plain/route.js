/**
 * Glistener Plain Language Route
 * POST /api/glisten/plain
 *
 * Converts a mythic transmission to plain language
 */

import { fetchWithRetry } from '../../../../lib/fetchWithRetry.js';
import { buildPlainLanguagePrompt } from '../../../../lib/glistener/index.js';

export async function POST(request) {
  try {
    const { transmission } = await request.json();

    if (!transmission) {
      return Response.json({
        success: false,
        error: 'Missing transmission text'
      }, { status: 400 });
    }

    const prompt = buildPlainLanguagePrompt(transmission);

    const response = await fetchWithRetry("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "prompt-caching-2024-07-31"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",  // Use Haiku for simple translation
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();

    if (data.error) {
      return Response.json({
        success: false,
        error: data.error.message
      }, { status: 500 });
    }

    const text = data.content?.map(item => item.text || "").join("\n") || "";

    return Response.json({
      success: true,
      text: text.trim(),
      usage: data.usage
    });

  } catch (error) {
    console.error('Plain language error:', error);
    return Response.json({
      success: false,
      error: 'Failed to convert to plain language',
      details: error.message
    }, { status: 500 });
  }
}
