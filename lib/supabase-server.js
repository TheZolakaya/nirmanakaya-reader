// === SUPABASE SERVER CLIENT ===
// Server-side client for fetching public data (shared readings, OG images)
// Uses the same anon key but runs in Node.js (no browser APIs)

import { createClient } from '@supabase/supabase-js';
import { rebalancerFor } from './geometryEngine.js';

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
      // Rebalancer/growth target is pure geometry — recompute at render time so the
      // share can show the medicine card + pathway (it was never persisted).
      let computed = null;
      try {
        const reb = rebalancerFor(d.transient, d.status);
        if (reb?.target) computed = { pathway: reb.pathway, targetId: reb.target.id, targetName: reb.target.name };
      } catch { /* geometry optional — share renders without it */ }
      return {
        ...d,
        computed,
        interpretation: {
          ...inner,
          // main card content lives at .reading post-migration; expose it as a depth
          deep: inner.deep || inner.reading || inner.summary || null,
          rebalancer: inner.rebalancer ?? ci.rebalancing ?? null
        }
      };
    });
  }
  // Follow-up conversation: saved as chat messages under synthesis._followUpMessages
  // ([{role:'user'|'assistant', content}]); the share renders {question, response} pairs.
  let followUps = data.followUps ?? null;
  const fuMsgs = interp.synthesis?._followUpMessages;
  if (!followUps && Array.isArray(fuMsgs) && fuMsgs.length) {
    followUps = [];
    let pendingQ = null;
    for (const m of fuMsgs) {
      if (m.role === 'user') pendingQ = m.content;
      else if (m.role === 'assistant' && pendingQ !== null) {
        followUps.push({ question: pendingQ, response: m.content });
        pendingQ = null;
      }
    }
  }

  // Reflect/Forge thread continuations: saved as interpretation.thread_data —
  // an object keyed by section ({key: [{operation, context, interpretation, ...}]}).
  let threads = data.threads ?? null;
  const td = interp.thread_data;
  if (!threads && td && typeof td === 'object') {
    threads = [];
    for (const items of Object.values(td)) {
      if (!Array.isArray(items)) continue;
      for (const t of items) {
        const raw = t?.interpretation;
        const response = typeof raw === 'string'
          ? raw
          : (raw?.reading || raw?.deep || raw?.swim || raw?.wade || raw?.surface || null);
        if (response) threads.push({ type: t.operation || 'reflect', input: t.context || t.input || null, response });
      }
    }
    if (!threads.length) threads = null;
  }

  return {
    ...data,
    question,
    letter,
    synthesis,
    cards,
    followUps,
    threads,
    verdict: data.verdict ?? interp.verdict ?? null,
    posture: data.posture ?? interp.posture ?? null,
    yieldData: data.yieldData ?? interp.yield ?? null
  };
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
