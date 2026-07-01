// app/api/cache-warm/route.js
// Cron heartbeat (see vercel.json) that keeps the BASE_SYSTEM prompt cache warm.
// Cache entries are per-model: warm Sonnet (cards/synthesis) and Haiku (letter).
// Each ping is a cheap cache read on ~6.5k tokens; without it, the first reading
// after an idle hour pays a fresh cache write instead.

import { BASE_SYSTEM } from '../../../lib/prompts.js';
import { buildCachedSystem, ANTHROPIC_BETA_HEADERS } from '../../../lib/cachedSystem.js';

export const dynamic = 'force-dynamic';

const MODELS = ['claude-sonnet-4-6', 'claude-haiku-4-5-20251001'];

export async function GET(request) {
  // Vercel cron sends "Authorization: Bearer <CRON_SECRET>" when the env var is set
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${cronSecret}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const results = {};
  for (const model of MODELS) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': ANTHROPIC_BETA_HEADERS
        },
        body: JSON.stringify({
          model,
          max_tokens: 1,
          system: buildCachedSystem(BASE_SYSTEM),
          messages: [{ role: 'user', content: 'ping' }]
        })
      });
      const data = await res.json();
      results[model] = data.error
        ? { error: data.error.message }
        : {
            cache_read: data.usage?.cache_read_input_tokens || 0,
            cache_write: data.usage?.cache_creation_input_tokens || 0
          };
    } catch (err) {
      results[model] = { error: err.message };
    }
  }

  return Response.json({ ok: true, results });
}
