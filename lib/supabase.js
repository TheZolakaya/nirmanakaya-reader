// === SUPABASE CLIENT ===
// Browser client for auth and database operations

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured - running in local-only mode');
}

// Create a single supabase client for the browser
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// === AUTH HELPERS ===

export async function signInWithGoogle() {
  if (!supabase) return { error: 'Supabase not configured' };

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  });
  return { data, error };
}

export async function signInWithEmail(email, password) {
  if (!supabase) return { error: 'Supabase not configured' };

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  return { data, error };
}

export async function signUpWithEmail(email, password) {
  if (!supabase) return { error: 'Supabase not configured' };

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`
    }
  });
  return { data, error };
}

export async function signOut() {
  if (!supabase) return { error: 'Supabase not configured' };

  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getUser() {
  if (!supabase) return { user: null };

  const { data: { user } } = await supabase.auth.getUser();
  return { user };
}

export async function getSession() {
  if (!supabase) return { session: null };

  const { data: { session } } = await supabase.auth.getSession();
  return { session };
}

// === DATABASE HELPERS ===

// Save a reading
export async function saveReading(reading) {
  if (!supabase) return { error: 'Supabase not configured' };

  const { user } = await getUser();
  if (!user) return { error: 'Not authenticated' };

  // Calculate estimated cost (Sonnet pricing: $3/M input, $15/M output)
  const inputTokens = reading.tokenUsage?.input_tokens || 0;
  const outputTokens = reading.tokenUsage?.output_tokens || 0;
  const estimatedCost = (inputTokens * 3 + outputTokens * 15) / 1000000;

  const { data, error } = await supabase
    .from('readings')
    .insert({
      user_id: user.id,
      question: reading.question,
      mode: reading.mode,
      spread_type: reading.spreadType,
      cards: reading.cards,
      synthesis: reading.synthesis,
      letter: reading.letter,
      share_slug: generateShareSlug(),
      // Token tracking
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: inputTokens + outputTokens,
      estimated_cost: estimatedCost
    })
    .select()
    .single();

  return { data, error };
}

// Get user's readings
export async function getReadings(limit = 50) {
  if (!supabase) return { data: [], error: null };

  const { user } = await getUser();
  if (!user) return { data: [], error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('readings')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  return { data: data || [], error };
}

// Get a single reading by ID
export async function getReading(id) {
  if (!supabase) return { data: null, error: 'Supabase not configured' };

  const { data, error } = await supabase
    .from('readings')
    .select('*')
    .eq('id', id)
    .single();

  return { data, error };
}

// Get a public reading by share slug
export async function getPublicReading(shareSlug) {
  if (!supabase) return { data: null, error: 'Supabase not configured' };

  const { data, error } = await supabase
    .from('readings')
    .select('*')
    .eq('share_slug', shareSlug)
    .eq('is_public', true)
    .single();

  return { data, error };
}

// Make a reading public/private
export async function setReadingPublic(id, isPublic) {
  if (!supabase) return { error: 'Supabase not configured' };

  const { data, error } = await supabase
    .from('readings')
    .update({ is_public: isPublic })
    .eq('id', id)
    .select()
    .single();

  return { data, error };
}

// Delete a reading
export async function deleteReading(id) {
  if (!supabase) return { error: 'Supabase not configured' };

  const { error } = await supabase
    .from('readings')
    .delete()
    .eq('id', id);

  return { error };
}

// === PROFILE HELPERS ===

export async function getProfile() {
  if (!supabase) return { data: null, error: 'Supabase not configured' };

  const { user } = await getUser();
  if (!user) return { data: null, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return { data, error };
}

export async function updateProfile(updates) {
  if (!supabase) return { error: 'Supabase not configured' };

  const { user } = await getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();

  return { data, error };
}

// === UTILITIES ===

function generateShareSlug() {
  // Generate a short, URL-friendly slug
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let slug = '';
  for (let i = 0; i < 8; i++) {
    slug += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return slug;
}

// === LOCAL STORAGE BRIDGE ===
// For local-first, sync-later pattern

const LOCAL_READINGS_KEY = 'nirmanakaya_readings';

export function saveReadingLocally(reading) {
  try {
    const existing = JSON.parse(localStorage.getItem(LOCAL_READINGS_KEY) || '[]');
    const newReading = {
      ...reading,
      id: reading.id || `local_${Date.now()}`,
      created_at: reading.created_at || new Date().toISOString(),
      synced: false
    };
    existing.unshift(newReading);
    localStorage.setItem(LOCAL_READINGS_KEY, JSON.stringify(existing.slice(0, 100))); // Keep last 100
    return newReading;
  } catch (e) {
    console.error('Failed to save reading locally:', e);
    return null;
  }
}

export function getLocalReadings() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_READINGS_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

export function clearLocalReadings() {
  localStorage.removeItem(LOCAL_READINGS_KEY);
}

// Sync local readings to cloud
export async function syncLocalReadings() {
  if (!supabase) return { synced: 0, errors: [] };

  const { user } = await getUser();
  if (!user) return { synced: 0, errors: ['Not authenticated'] };

  const local = getLocalReadings();
  const unsynced = local.filter(r => !r.synced);

  let synced = 0;
  const errors = [];

  for (const reading of unsynced) {
    const { error } = await saveReading(reading);
    if (error) {
      errors.push(error);
    } else {
      synced++;
      // Mark as synced in local storage
      reading.synced = true;
    }
  }

  // Update local storage with sync status
  localStorage.setItem(LOCAL_READINGS_KEY, JSON.stringify(local));

  return { synced, errors };
}
