// THE ADDRESS CORE (2026-11-06, the Recognition route): addressOf, moved here verbatim from lib/address.js with the definitions
// JSON INJECTED (as lib/kernel.js does), so plain node — the four-arm harness and its unit tests — can load the same function the
// Reader uses. lib/address.js keeps `addressOf(id)` as a one-line wrapper over this; every caller is unchanged.
import { ARCHETYPES } from './archetypes.js';
import { getComponent } from './corrections.js';

// The four coordinates for any signature: an archetype's own; a bound's or agent's through its parent archetype;
// Gestalt and the portals stand outside the grid (Practice only).
export function addressOfIn(DEFS, id) {
  const sig = DEFS?.signatures?.[id];
  const comp = getComponent(id) || {};
  const c = sig?.coordinate4D;
  if (c?.practice && c?.activity) return { ...c, name: comp.name || sig?.name, via: null, element: sig?.elementalDesignator || comp.element || null };
  if (comp.archetype != null && comp.archetype !== id) {
    const parent = DEFS?.signatures?.[comp.archetype]; const pc = parent?.coordinate4D;
    if (pc?.practice && pc?.activity) return { ...pc, name: comp.name || sig?.name, via: ARCHETYPES[comp.archetype]?.name || parent?.name || null, element: sig?.elementalDesignator || comp.element || pc.element || null };
  }
  return { practice: c?.practice || comp.house || null, activity: null, being: null, identity: null, name: comp.name || sig?.name, via: null, element: sig?.elementalDesignator || comp.element || null, outside: c?.note || 'outside the grid' };
}
