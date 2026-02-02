// app/api/reading/route.js
// Handles readings and follow-up conversations
// Supports First Contact mode (isFirstContact=true) for Level 0 users
// Supports DTP mode (isDTP=true) for Direct Token Protocol
// Uses Anthropic prompt caching for 90% savings on repeated system prompts

import { ARCHETYPES } from '../../../lib/archetypes.js';
import { STATUSES } from '../../../lib/constants.js';
import { getComponent } from '../../../lib/corrections.js';
import { fetchWithRetry } from '../../../lib/fetchWithRetry.js';
import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client for ban/throttle checks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// Check if user can make a reading (server-side)
async function checkUserAccess(userId) {
  if (!supabaseAdmin || !userId) return { canRead: true };

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('is_banned, daily_token_limit, tokens_used_today, last_token_reset')
    .eq('id', userId)
    .single();

  if (!profile) return { canRead: true };

  // Check ban
  if (profile.is_banned) {
    return { canRead: false, reason: 'Account suspended' };
  }

  // Check daily limit
  if (profile.daily_token_limit !== null) {
    const today = new Date().toISOString().split('T')[0];

    // Reset if new day
    if (profile.last_token_reset !== today) {
      await supabaseAdmin
        .from('profiles')
        .update({ tokens_used_today: 0, last_token_reset: today })
        .eq('id', userId);
      return { canRead: true };
    }

    if (profile.tokens_used_today >= profile.daily_token_limit) {
      return { canRead: false, reason: 'Daily token limit reached. Try again tomorrow.' };
    }
  }

  return { canRead: true };
}

// Record token usage after successful reading
async function recordUsage(userId, tokensUsed) {
  if (!supabaseAdmin || !userId) return;

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('tokens_used_today, last_token_reset')
    .eq('id', userId)
    .single();

  if (!profile) return;

  const today = new Date().toISOString().split('T')[0];
  const newCount = profile.last_token_reset === today
    ? (profile.tokens_used_today || 0) + tokensUsed
    : tokensUsed;

  await supabaseAdmin
    .from('profiles')
    .update({ tokens_used_today: newCount, last_token_reset: today })
    .eq('id', userId);
}

// Build DTP system prompt for token extraction ONLY
// Card interpretations happen through standard card-depth flow
function buildDTPSystemPrompt() {
  return `DIRECT TOKEN PROTOCOL (DTP) - TOKEN EXTRACTION
===============================================

Your task: Extract the Active Tokens from the user's input.

Active Tokens are the nouns/entities and verbs/dynamics that are energetically alive in their statement. Each token will receive its own card reading.

EXTRACTION RULES:
- Extract 1-5 tokens maximum
- Filter connective tissue (I, to, but, and, the, my, a, an)
- Preserve the user's exact language where possible
- Balance: don't let emotions crowd out structure, or nouns crowd out agency
- If more than 5 candidates, select the most energetically present

RESPONSE FORMAT (JSON):
{
  "tokens": ["Token1", "Token2", ...]
}

CRITICAL: Return ONLY the JSON object with the tokens array. No interpretation, no synthesis, no explanation.`;
}

export async function POST(request) {
  const { messages, system, model, isFirstContact, max_tokens, isDTP, dtpInput, draws, userId } = await request.json();

  // Check if user is banned or throttled (if userId provided)
  if (userId) {
    const { canRead, reason } = await checkUserAccess(userId);
    if (!canRead) {
      return Response.json({ error: reason }, { status: 403 });
    }
  }

  // DTP mode handling - extract tokens only
  // Card interpretations happen through standard card-depth flow
  if (isDTP && dtpInput) {
    const dtpSystem = buildDTPSystemPrompt();
    const dtpMessages = [
      { role: 'user', content: dtpInput }
    ];

    try {
      const response = await fetchWithRetry("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 500,  // Small - only extracting tokens
          system: dtpSystem,
          messages: dtpMessages
        })
      });

      const data = await response.json();

      if (data.error) {
        return Response.json({ error: data.error.message }, { status: 500 });
      }

      const text = data.content?.map(item => item.text || "").join("") || "";

      // Parse the JSON response
      try {
        // Handle potential markdown code fences
        let jsonText = text.trim();
        if (jsonText.startsWith('```json')) {
          jsonText = jsonText.slice(7);
        } else if (jsonText.startsWith('```')) {
          jsonText = jsonText.slice(3);
        }
        if (jsonText.endsWith('```')) {
          jsonText = jsonText.slice(0, -3);
        }
        jsonText = jsonText.trim();

        const dtpResponse = JSON.parse(jsonText);

        // Record token usage
        if (userId && data.usage) {
          const totalTokens = (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0);
          await recordUsage(userId, totalTokens);
        }

        // Return only tokens - card generation happens through standard flow
        return Response.json({
          isDTP: true,
          tokens: dtpResponse.tokens || [],
          usage: data.usage
        });
      } catch (parseError) {
        // If JSON parsing fails, return raw text for debugging
        return Response.json({
          isDTP: true,
          error: 'Failed to parse DTP response',
          rawResponse: text,
          usage: data.usage
        }, { status: 500 });
      }

    } catch (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
  }

  // First Contact mode uses Sonnet for quality interpretations
  const effectiveModel = isFirstContact
    ? "claude-sonnet-4-20250514"
    : (model || "claude-sonnet-4-20250514");

  const effectiveMaxTokens = isFirstContact
    ? 4000
    : (max_tokens || 4000);

  // Convert system prompt to cached format for 90% input token savings
  // Cache lasts 5 minutes and refreshes on each use
  const systemWithCache = [
    {
      type: "text",
      text: system,
      cache_control: { type: "ephemeral" }
    }
  ];

  try {
    const response = await fetchWithRetry("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "prompt-caching-2024-07-31"
      },
      body: JSON.stringify({
        model: effectiveModel,
        max_tokens: effectiveMaxTokens,
        system: systemWithCache,
        messages: messages
      })
    });

    const data = await response.json();

    if (data.error) {
      return Response.json({ error: data.error.message }, { status: 500 });
    }

    const text = data.content?.map(item => item.text || "").join("\n") || "No response received.";

    // Record token usage
    if (userId && data.usage) {
      const totalTokens = (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0);
      await recordUsage(userId, totalTokens);
    }

    // Include cache stats in usage for monitoring
    return Response.json({
      reading: text,
      usage: {
        ...data.usage,
        cache_creation_input_tokens: data.usage?.cache_creation_input_tokens || 0,
        cache_read_input_tokens: data.usage?.cache_read_input_tokens || 0
      },
      isFirstContact
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
