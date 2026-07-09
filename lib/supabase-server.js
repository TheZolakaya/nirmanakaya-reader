// === SUPABASE SERVER CLIENT ===
// Server-side client for fetching public data (shared readings, OG images)
// Uses the same anon key but runs in Node.js (no browser APIs)

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getServerClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}

// Post-migration rows store topic/draws/interpretation.{letter,cards,synthesis};
// the share surfaces (page, OG metadata, OG image) still read the pre-migration
// fields (question/letter/cards/synthesis), so shared readings rendered as headers
// over nothing — same schema drift as the Journal (.161) and reload (.163) fixes.
// Normalize here so every consumer of a public reading gets one true shape.
function normalizeSharedReading(data) {
  if (!data) return data;
  const interp = data.interpretation || {};
  const question = data.question ?? data.topic ?? null;
  const letter = data.letter ?? interp.letter ?? null;
  const synthesis = data.synthesis ?? interp.synthesis ?? null;
  let cards = Array.isArray(data.cards) && data.cards.length ? data.cards : null;
  if (!cards && Array.isArray(data.draws) && data.draws.length) {
    cards = data.draws.map((d, i) => {
      const ci = interp.cards?.[i] || {};
      const inner = ci.interpretation || {};
      return {
        ...d,
        interpretation: {
          ...inner,
          // main card content lives at .reading post-migration; expose it as a depth
          deep: inner.deep || inner.reading || inner.summary || null,
          rebalancer: inner.rebalancer ?? ci.rebalancing ?? null
        }
      };
    });
  }
  return { ...data, question, letter, synthesis, cards };
}

// Get a public reading by share token (server-side)
export async function getPublicReadingServer(shareToken) {
  const supabase = getServerClient();
  if (!supabase) return { data: null, error: 'Supabase not configured' };

  const { data, error } = await supabase
    .from('user_readings')
    .select('*')
    .eq('share_token', shareToken)
    .eq('is_public', true)
    .single();

  return { data: normalizeSharedReading(data), error };
}
