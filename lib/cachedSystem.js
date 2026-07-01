// === CACHED SYSTEM PROMPT HELPER ===
// Splits a system prompt into [stable BASE_SYSTEM block, variable remainder] so
// every request shares ONE cache entry per model, regardless of user settings
// (persona, posture, length, locus, etc.). Requires promptBuilder to place
// BASE_SYSTEM at the very start of the assembled prompt — cache matching is
// prefix-based and byte-exact.
//
// The stable block uses the 1-hour cache TTL; the /api/cache-warm cron keeps it
// warm so readings pay cache-read prices (~10% of normal input) instead of
// re-writing the cache after idle gaps. The 1h TTL requires the
// "extended-cache-ttl-2025-04-11" beta header on the API call.

import { BASE_SYSTEM } from './prompts.js';

export const ANTHROPIC_BETA_HEADERS = 'extended-cache-ttl-2025-04-11';

export function buildCachedSystem(system) {
  const text = system || '';

  if (text.startsWith(BASE_SYSTEM)) {
    const remainder = text.slice(BASE_SYSTEM.length);
    const blocks = [
      {
        type: 'text',
        text: BASE_SYSTEM,
        cache_control: { type: 'ephemeral', ttl: '1h' }
      }
    ];
    if (remainder.trim()) {
      blocks.push({ type: 'text', text: remainder });
    }
    return blocks;
  }

  // Prompt doesn't lead with BASE_SYSTEM (custom/legacy callers):
  // cache the whole thing as before, just with the longer TTL.
  return [
    {
      type: 'text',
      text,
      cache_control: { type: 'ephemeral', ttl: '1h' }
    }
  ];
}
