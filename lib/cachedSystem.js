// === CACHED SYSTEM PROMPT HELPER ===
// Splits a system prompt into cacheable stable blocks + variable remainder so
// every request shares cache entries per model, regardless of user settings.
//
// Block 1: BASE_SYSTEM (~6.5k tokens, identical for everyone)
// Block 2: format instructions (~4.2k tokens, exactly 3 variants: brief/standard/full)
// Block 3: the tail (posture, locus, architecture toggle, persona) — ALSO cached.
//   Tail entries are per-settings-combo, so the win is within a reading's own
//   burst of ~6 calls (and any follow-ups): call 1 writes, the rest read at 10%.
//
// Requires promptBuilder to assemble prompts as BASE_SYSTEM → format → rest.
// Cache matching is prefix-based and byte-exact; a caller whose prompt doesn't
// follow that shape still gets block-1 (or whole-prompt) caching as fallback.
//
// Stable blocks use the 1-hour cache TTL; the /api/cache-warm cron keeps them
// warm so readings pay cache-read prices (~10% of normal input) instead of
// re-writing the cache after idle gaps. The 1h TTL requires the
// "extended-cache-ttl-2025-04-11" beta header on the API call.

import { BASE_SYSTEM, getFormatInstructions } from './prompts.js';

export const ANTHROPIC_BETA_HEADERS = 'extended-cache-ttl-2025-04-11';

// Precomputed format variants, each with the joiner promptBuilder uses,
// longest first so 'full' can't be shadowed by a shorter prefix match.
const FORMAT_VARIANTS = ['full', 'standard', 'brief']
  .map((len) => `\n\n${getFormatInstructions(len)}`)
  .sort((a, b) => b.length - a.length);

const CACHE_1H = { type: 'ephemeral', ttl: '1h' };

export function buildCachedSystem(system) {
  const text = system || '';

  if (!text.startsWith(BASE_SYSTEM)) {
    // Custom/legacy caller: cache the whole thing as before, with the longer TTL
    return [{ type: 'text', text, cache_control: CACHE_1H }];
  }

  const blocks = [{ type: 'text', text: BASE_SYSTEM, cache_control: CACHE_1H }];
  let remainder = text.slice(BASE_SYSTEM.length);

  const formatBlock = FORMAT_VARIANTS.find((v) => remainder.startsWith(v));
  if (formatBlock) {
    blocks.push({ type: 'text', text: formatBlock, cache_control: CACHE_1H });
    remainder = remainder.slice(formatBlock.length);
  }

  if (remainder.trim()) {
    // Third breakpoint: cumulative prefix (BASE + format + tail) is well above
    // the cacheable minimum, so this per-combo entry is valid even though the
    // tail itself is small.
    blocks.push({ type: 'text', text: remainder, cache_control: CACHE_1H });
  }
  return blocks;
}
