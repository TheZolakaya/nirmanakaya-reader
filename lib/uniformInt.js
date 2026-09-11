// lib/uniformInt.js — exact uniform integers in [0, n) from crypto bytes (server side).
//
// `randomBytes(1)[0] % n` is biased whenever 256 is not a multiple of n:
//   n = 78 → ids 0–21 (the archetypes) at 4/256 each vs 3/256 for the rest (+33%)
//   n = 22 → ids 0–13 at 12/256 vs 11/256 (+9%)
//   n = 4  → exact (256 % 4 === 0)
// Found by Lumen (Mind seat) 2026-09-11 while writing the why-readings-work prereg;
// confirmed by the bench. Rejection sampling: discard bytes in the biased tail.
import { randomBytes } from 'crypto';

export function uniformInt(n) {
  if (!Number.isInteger(n) || n < 1 || n > 256) throw new Error(`uniformInt: n must be 1..256, got ${n}`);
  const limit = 256 - (256 % n);          // largest multiple of n that fits in a byte
  let b;
  do { b = randomBytes(1)[0]; } while (b >= limit);
  return b % n;
}
