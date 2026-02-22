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

  return { data, error };
}
