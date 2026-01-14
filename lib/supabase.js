// === SUPABASE CLIENT ===
// Browser client for auth and database operations

import { createClient } from '@supabase/supabase-js';

// Admin emails - can delete any discussion/reply
const ADMIN_EMAILS = [
  'chriscrilly@gmail.com'
];

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

export async function resetPasswordForEmail(email) {
  if (!supabase) return { error: 'Supabase not configured' };

  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/callback?type=recovery`
  });
  return { data, error };
}

export async function updatePassword(newPassword) {
  if (!supabase) return { error: 'Supabase not configured' };

  const { data, error } = await supabase.auth.updateUser({
    password: newPassword
  });
  return { data, error };
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

// Check if user is an admin
export function isAdmin(user) {
  if (!user?.email) return false;
  return ADMIN_EMAILS.includes(user.email.toLowerCase());
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

  // Use upsert to handle case where profile doesn't exist yet
  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      ...updates
    })
    .select()
    .single();

  return { data, error };
}

// Create or get profile (upsert)
export async function ensureProfile() {
  if (!supabase) return { data: null, error: 'Supabase not configured' };

  const { user } = await getUser();
  if (!user) return { data: null, error: 'Not authenticated' };

  // Try to get existing profile first
  const { data: existing, error: fetchError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (existing) {
    return { data: existing, error: null };
  }

  // Profile doesn't exist, create it
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      display_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Anonymous',
      avatar_url: user.user_metadata?.avatar_url || null,
      bio: ''
    })
    .select()
    .single();

  return { data, error };
}

// Get any user's public profile by ID
export async function getPublicProfile(userId) {
  if (!supabase) return { data: null, error: 'Supabase not configured' };

  console.log('[getPublicProfile] Looking up:', userId);

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, bio, created_at')
    .eq('id', userId)
    .single();

  console.log('[getPublicProfile] Result:', { data, error });

  return { data, error };
}

// Get a user's public readings
export async function getUserPublicReadings(userId, limit = 20) {
  if (!supabase) return { data: [], error: 'Supabase not configured' };

  const { data, error } = await supabase
    .from('readings')
    .select('id, question, mode, spread_type, created_at, share_slug')
    .eq('user_id', userId)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  return { data: data || [], error };
}

// Get a user's discussion posts
export async function getUserDiscussions(userId, limit = 20) {
  if (!supabase) return { data: [], error: 'Supabase not configured' };

  const { data, error } = await supabase
    .from('discussions')
    .select('id, title, topic_type, created_at, reply_count')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  return { data: data || [], error };
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

// === DISCUSSION HELPERS ===

// Get all discussions (with optional filters)
export async function getDiscussions(options = {}) {
  if (!supabase) return { data: [], error: 'Supabase not configured' };

  const { topicType, limit = 50, offset = 0 } = options;

  let query = supabase
    .from('discussions')
    .select(`
      *,
      profiles:user_id (display_name, avatar_url)
    `)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (topicType) {
    query = query.eq('topic_type', topicType);
  }

  const { data, error } = await query;
  return { data: data || [], error };
}

// Get a single discussion with replies
export async function getDiscussion(id) {
  if (!supabase) return { data: null, error: 'Supabase not configured' };

  const { data: discussion, error: discussionError } = await supabase
    .from('discussions')
    .select(`
      *,
      profiles:user_id (display_name, avatar_url)
    `)
    .eq('id', id)
    .single();

  if (discussionError) return { data: null, error: discussionError };

  const { data: replies, error: repliesError } = await supabase
    .from('discussion_replies')
    .select(`
      *,
      profiles:user_id (display_name, avatar_url)
    `)
    .eq('discussion_id', id)
    .order('created_at', { ascending: true });

  return {
    data: { ...discussion, replies: replies || [] },
    error: repliesError
  };
}

// Create a new discussion
export async function createDiscussion(discussion) {
  if (!supabase) return { error: 'Supabase not configured' };

  const { user } = await getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('discussions')
    .insert({
      user_id: user.id,
      title: discussion.title,
      content: discussion.content,
      topic_type: discussion.topicType || 'general',
      topic_ref: discussion.topicRef || null
    })
    .select()
    .single();

  return { data, error };
}

// Create a reply to a discussion
export async function createReply(discussionId, content) {
  if (!supabase) return { error: 'Supabase not configured' };

  const { user } = await getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('discussion_replies')
    .insert({
      discussion_id: discussionId,
      user_id: user.id,
      content
    })
    .select(`
      *,
      profiles:user_id (display_name, avatar_url)
    `)
    .single();

  // Note: reply_count is auto-updated by database trigger

  return { data, error };
}

// Delete a discussion (owner only)
export async function deleteDiscussion(id) {
  if (!supabase) return { error: 'Supabase not configured' };

  const { error } = await supabase
    .from('discussions')
    .delete()
    .eq('id', id);

  return { error };
}

// Delete a reply (owner only)
export async function deleteReply(id) {
  if (!supabase) return { error: 'Supabase not configured' };

  const { error } = await supabase
    .from('discussion_replies')
    .delete()
    .eq('id', id);

  // Note: reply_count is auto-updated by database trigger

  return { error };
}

// === UNREAD NOTIFICATIONS ===

// Get count of discussions newer than user's last hub visit
export async function getUnreadCount() {
  if (!supabase) return { count: 0, error: null };

  const { user } = await getUser();
  if (!user) return { count: 0, error: null };

  // Get user's last hub visit from profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('last_hub_visit')
    .eq('id', user.id)
    .single();

  const lastVisit = profile?.last_hub_visit || '1970-01-01';

  // Count discussions created after last visit
  const { count, error } = await supabase
    .from('discussions')
    .select('*', { count: 'exact', head: true })
    .gt('created_at', lastVisit);

  return { count: count || 0, error };
}

// Update user's last hub visit timestamp
export async function updateLastHubVisit() {
  if (!supabase) return { error: 'Supabase not configured' };

  const { user } = await getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('profiles')
    .update({ last_hub_visit: new Date().toISOString() })
    .eq('id', user.id);

  return { error };
}

// Update notification preferences
export async function updateNotificationPrefs(prefs) {
  if (!supabase) return { error: 'Supabase not configured' };

  const { user } = await getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('profiles')
    .update({ notification_prefs: prefs })
    .eq('id', user.id)
    .select()
    .single();

  return { data, error };
}
