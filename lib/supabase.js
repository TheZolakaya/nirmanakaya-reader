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
      estimated_cost: estimatedCost,
      // Telemetry
      reflect_count: reading.reflectCount || 0,
      forge_count: reading.forgeCount || 0,
      max_depth: reading.maxDepth || 'surface',
      clarify_count: reading.clarifyCount || 0,
      unpack_count: reading.unpackCount || 0,
      example_count: reading.exampleCount || 0,
      // Thread data (Reflect/Forge continuations)
      thread_data: reading.threadData || null
    })
    .select()
    .single();

  return { data, error };
}

// Update reading telemetry (called when user finishes interacting with a reading)
export async function updateReadingTelemetry(readingId, telemetry) {
  if (!supabase || !readingId) return { error: 'Missing required params' };

  const { user } = await getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('readings')
    .update({
      reflect_count: telemetry.reflectCount || 0,
      forge_count: telemetry.forgeCount || 0,
      max_depth: telemetry.maxDepth || 'surface',
      clarify_count: telemetry.clarifyCount || 0,
      unpack_count: telemetry.unpackCount || 0,
      example_count: telemetry.exampleCount || 0
    })
    .eq('id', readingId)
    .eq('user_id', user.id) // Ensure user owns this reading
    .select()
    .single();

  return { data, error };
}

// Update reading content (cards with interpretations, synthesis)
export async function updateReadingContent(readingId, { cards, synthesis, letter }) {
  if (!supabase || !readingId) return { error: 'Missing required params' };

  const { user } = await getUser();
  if (!user) return { error: 'Not authenticated' };

  const updateData = {};
  if (cards !== undefined) updateData.cards = cards;
  if (synthesis !== undefined) updateData.synthesis = synthesis;
  if (letter !== undefined) updateData.letter = letter;

  const { data, error } = await supabase
    .from('readings')
    .update(updateData)
    .eq('id', readingId)
    .eq('user_id', user.id)
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

// Get user's reading count (for Glistener gating)
export async function getUserReadingCount(userId) {
  if (!supabase) return 0;

  const { count, error } = await supabase
    .from('readings')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) {
    console.error('Error getting reading count:', error);
    return 0;
  }

  return count || 0;
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

// Make a reading public/private, optionally updating content
export async function setReadingPublic(id, isPublic, content = null) {
  if (!supabase) return { error: 'Supabase not configured' };

  // Build update object
  const updateData = { is_public: isPublic };

  // If content provided, update the reading data too
  if (content) {
    if (content.cards) updateData.cards = content.cards;
    if (content.synthesis) updateData.synthesis = content.synthesis;
    if (content.letter) updateData.letter = content.letter;
  }

  const { data, error } = await supabase
    .from('readings')
    .update(updateData)
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

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, bio, created_at')
    .eq('id', userId)
    .single();

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
// Now includes reactions and top 3 replies for each discussion
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

  const { data: discussions, error } = await query;
  if (error || !discussions) return { data: [], error };

  // Fetch reactions and top 3 replies for each discussion
  const discussionIds = discussions.map(d => d.id);

  // Get all reactions for these discussions
  const { data: allReactions } = await supabase
    .from('reactions')
    .select('discussion_id, emoji, user_id')
    .in('discussion_id', discussionIds);

  // Get top 3 replies for each discussion (most recent)
  const { data: allReplies } = await supabase
    .from('discussion_replies')
    .select(`
      id,
      discussion_id,
      content,
      created_at,
      user_id,
      profiles:user_id (display_name)
    `)
    .in('discussion_id', discussionIds)
    .order('created_at', { ascending: false });

  // Also get reactions for replies
  const replyIds = (allReplies || []).map(r => r.id);
  const { data: replyReactions } = replyIds.length > 0 ? await supabase
    .from('reactions')
    .select('reply_id, emoji, user_id')
    .in('reply_id', replyIds) : { data: [] };

  // Group reactions and replies by discussion
  const reactionsMap = {};
  const repliesMap = {};
  const replyReactionsMap = {};

  (allReactions || []).forEach(r => {
    if (!reactionsMap[r.discussion_id]) reactionsMap[r.discussion_id] = [];
    reactionsMap[r.discussion_id].push(r);
  });

  (allReplies || []).forEach(r => {
    if (!repliesMap[r.discussion_id]) repliesMap[r.discussion_id] = [];
    repliesMap[r.discussion_id].push(r);
  });

  (replyReactions || []).forEach(r => {
    if (!replyReactionsMap[r.reply_id]) replyReactionsMap[r.reply_id] = [];
    replyReactionsMap[r.reply_id].push(r);
  });

  // Attach to discussions (top 3 replies only, sorted newest first)
  const enrichedDiscussions = discussions.map(d => ({
    ...d,
    reactions: reactionsMap[d.id] || [],
    topReplies: (repliesMap[d.id] || []).slice(0, 3).map(r => ({
      ...r,
      reactions: replyReactionsMap[r.id] || []
    }))
  }));

  return { data: enrichedDiscussions, error: null };
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

  // Get user's last hub visit and notification prefs from profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('last_hub_visit, notification_prefs')
    .eq('id', user.id)
    .single();

  const lastVisit = profile?.last_hub_visit || '1970-01-01';
  const notifyPref = profile?.notification_prefs || 'all';

  // If notifications are disabled, return 0
  if (notifyPref === 'none') {
    return { count: 0, error: null };
  }

  let totalCount = 0;

  if (notifyPref === 'all') {
    // Count new discussions
    const { count: discCount } = await supabase
      .from('discussions')
      .select('*', { count: 'exact', head: true })
      .gt('created_at', lastVisit);
    totalCount += discCount || 0;

    // Count new replies (excluding user's own)
    const { count: replyCount } = await supabase
      .from('discussion_replies')
      .select('*', { count: 'exact', head: true })
      .gt('created_at', lastVisit)
      .neq('user_id', user.id);
    totalCount += replyCount || 0;
  } else if (notifyPref === 'replies') {
    // Only count replies to user's own discussions
    const { data: userDiscussions } = await supabase
      .from('discussions')
      .select('id')
      .eq('user_id', user.id);

    if (userDiscussions && userDiscussions.length > 0) {
      const discussionIds = userDiscussions.map(d => d.id);
      const { count: replyCount } = await supabase
        .from('discussion_replies')
        .select('*', { count: 'exact', head: true })
        .in('discussion_id', discussionIds)
        .gt('created_at', lastVisit)
        .neq('user_id', user.id);
      totalCount = replyCount || 0;
    }
  }

  return { count: totalCount, error: null };
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

// === REACTIONS ===

export const REACTION_EMOJIS = ['👍', '❤️', '🙏', '💡'];

// Toggle a reaction (add if not exists, remove if exists)
export async function toggleReaction({ discussionId, replyId, emoji }) {
  if (!supabase) return { error: 'Supabase not configured' };

  const { user } = await getUser();
  if (!user) return { error: 'Not authenticated' };

  if (!REACTION_EMOJIS.includes(emoji)) {
    return { error: 'Invalid emoji' };
  }

  // Check if reaction already exists
  let query = supabase
    .from('reactions')
    .select('id')
    .eq('user_id', user.id)
    .eq('emoji', emoji);

  if (discussionId) {
    query = query.eq('discussion_id', discussionId);
  } else if (replyId) {
    query = query.eq('reply_id', replyId);
  } else {
    return { error: 'Must provide discussionId or replyId' };
  }

  const { data: existing } = await query.single();

  if (existing) {
    // Remove reaction
    const { error } = await supabase
      .from('reactions')
      .delete()
      .eq('id', existing.id);
    return { action: 'removed', error };
  } else {
    // Add reaction
    const insertData = {
      user_id: user.id,
      emoji
    };
    if (discussionId) insertData.discussion_id = discussionId;
    if (replyId) insertData.reply_id = replyId;

    const { data, error } = await supabase
      .from('reactions')
      .insert(insertData)
      .select()
      .single();
    return { action: 'added', data, error };
  }
}

// Get reactions for a discussion
export async function getDiscussionReactions(discussionId) {
  if (!supabase) return { data: [], error: 'Supabase not configured' };

  const { data, error } = await supabase
    .from('reactions')
    .select('emoji, user_id')
    .eq('discussion_id', discussionId);

  return { data: data || [], error };
}

// Get reactions for a reply
export async function getReplyReactions(replyId) {
  if (!supabase) return { data: [], error: 'Supabase not configured' };

  const { data, error } = await supabase
    .from('reactions')
    .select('emoji, user_id')
    .eq('reply_id', replyId);

  return { data: data || [], error };
}

// Get reactions for multiple discussions/replies at once (for list views)
export async function getBulkReactions({ discussionIds = [], replyIds = [] }) {
  if (!supabase) return { discussions: {}, replies: {}, error: 'Supabase not configured' };

  const discussions = {};
  const replies = {};

  if (discussionIds.length > 0) {
    const { data } = await supabase
      .from('reactions')
      .select('discussion_id, emoji, user_id')
      .in('discussion_id', discussionIds);

    // Group by discussion_id
    (data || []).forEach(r => {
      if (!discussions[r.discussion_id]) discussions[r.discussion_id] = [];
      discussions[r.discussion_id].push({ emoji: r.emoji, user_id: r.user_id });
    });
  }

  if (replyIds.length > 0) {
    const { data } = await supabase
      .from('reactions')
      .select('reply_id, emoji, user_id')
      .in('reply_id', replyIds);

    // Group by reply_id
    (data || []).forEach(r => {
      if (!replies[r.reply_id]) replies[r.reply_id] = [];
      replies[r.reply_id].push({ emoji: r.emoji, user_id: r.user_id });
    });
  }

  return { discussions, replies, error: null };
}

// === ADMIN FUNCTIONS ===

const SUPER_ADMIN_EMAIL = 'chriscrilly@gmail.com';

// Get all users with their stats (admin only)
export async function getAdminStats() {
  if (!supabase) return { users: [], totals: {}, error: 'Supabase not configured' };

  // Get all profiles with user emails
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (profileError) return { users: [], totals: {}, error: profileError };

  // Get token usage per user from readings
  const { data: readings } = await supabase
    .from('readings')
    .select('user_id, input_tokens, output_tokens, estimated_cost');

  // Aggregate by user
  const userStats = {};
  (readings || []).forEach(r => {
    if (!userStats[r.user_id]) {
      userStats[r.user_id] = { totalTokens: 0, totalCost: 0, readingCount: 0 };
    }
    userStats[r.user_id].totalTokens += (r.input_tokens || 0) + (r.output_tokens || 0);
    userStats[r.user_id].totalCost += r.estimated_cost || 0;
    userStats[r.user_id].readingCount += 1;
  });

  // Merge stats into profiles
  const users = profiles.map(p => ({
    ...p,
    totalTokens: userStats[p.id]?.totalTokens || 0,
    totalCost: userStats[p.id]?.totalCost || 0,
    readingCount: userStats[p.id]?.readingCount || 0
  }));

  // Calculate totals
  const totals = {
    userCount: profiles.length,
    totalTokens: Object.values(userStats).reduce((sum, u) => sum + u.totalTokens, 0),
    totalCost: Object.values(userStats).reduce((sum, u) => sum + u.totalCost, 0),
    totalReadings: Object.values(userStats).reduce((sum, u) => sum + u.readingCount, 0)
  };

  return { users, totals, error: null };
}

// Update user ban status (admin only)
export async function updateUserBanStatus(userId, isBanned) {
  if (!supabase) return { error: 'Supabase not configured' };

  const { error } = await supabase
    .from('profiles')
    .update({ is_banned: isBanned })
    .eq('id', userId);

  return { error };
}

// Update user community ban status (admin only)
export async function updateUserCommunityBan(userId, isBanned) {
  if (!supabase) return { error: 'Supabase not configured' };

  const { error } = await supabase
    .from('profiles')
    .update({ community_banned: isBanned })
    .eq('id', userId);

  return { error };
}

// Update user admin status (super admin only)
export async function updateUserAdminStatus(userId, isAdminStatus, currentUserEmail) {
  if (!supabase) return { error: 'Supabase not configured' };

  // Only super admin can change admin status
  if (currentUserEmail?.toLowerCase() !== SUPER_ADMIN_EMAIL) {
    return { error: 'Only super admin can modify admin status' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({ is_admin: isAdminStatus })
    .eq('id', userId);

  return { error };
}

// Update user daily token limit (admin only)
export async function updateUserTokenLimit(userId, limit) {
  if (!supabase) return { error: 'Supabase not configured' };

  const { error } = await supabase
    .from('profiles')
    .update({ daily_token_limit: limit })
    .eq('id', userId);

  return { error };
}

// Reset user's daily token count (admin only)
export async function resetUserDailyTokens(userId) {
  if (!supabase) return { error: 'Supabase not configured' };

  const { error } = await supabase
    .from('profiles')
    .update({
      tokens_used_today: 0,
      last_token_reset: new Date().toISOString().split('T')[0]
    })
    .eq('id', userId);

  return { error };
}

// Check if user can make a reading (not banned, under limit)
export async function checkUserCanRead(userId) {
  if (!supabase) return { canRead: true, reason: null };

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('is_banned, daily_token_limit, tokens_used_today, last_token_reset')
    .eq('id', userId)
    .single();

  if (error || !profile) return { canRead: true, reason: null };

  // Check ban
  if (profile.is_banned) {
    return { canRead: false, reason: 'Account suspended' };
  }

  // Check daily limit
  if (profile.daily_token_limit !== null) {
    const today = new Date().toISOString().split('T')[0];
    const lastReset = profile.last_token_reset;

    // Reset if new day
    if (lastReset !== today) {
      await supabase
        .from('profiles')
        .update({ tokens_used_today: 0, last_token_reset: today })
        .eq('id', userId);
      return { canRead: true, reason: null };
    }

    // Check limit
    if (profile.tokens_used_today >= profile.daily_token_limit) {
      return { canRead: false, reason: 'Daily token limit reached' };
    }
  }

  return { canRead: true, reason: null };
}

// Update user's token usage after a reading
export async function recordTokenUsage(userId, tokensUsed) {
  if (!supabase) return { error: null };

  const { data: profile } = await supabase
    .from('profiles')
    .select('tokens_used_today, last_token_reset')
    .eq('id', userId)
    .single();

  if (!profile) return { error: null };

  const today = new Date().toISOString().split('T')[0];
  const newCount = profile.last_token_reset === today
    ? (profile.tokens_used_today || 0) + tokensUsed
    : tokensUsed;

  const { error } = await supabase
    .from('profiles')
    .update({
      tokens_used_today: newCount,
      last_token_reset: today
    })
    .eq('id', userId);

  return { error };
}

// === EMAIL PREFERENCE HELPERS ===

// Get user's email preferences
export async function getEmailPrefs() {
  if (!supabase) return { data: null, error: 'Supabase not configured' };

  const { user } = await getUser();
  if (!user) return { data: null, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('profiles')
    .select('email_welcome, email_readings, email_replies, email_updates, email')
    .eq('id', user.id)
    .single();

  return { data, error };
}

// Update user's email preferences
export async function updateEmailPrefs(prefs) {
  if (!supabase) return { error: 'Supabase not configured' };

  const { user } = await getUser();
  if (!user) return { error: 'Not authenticated' };

  const allowedFields = ['email_welcome', 'email_readings', 'email_replies', 'email_updates'];
  const updates = {};

  for (const [key, value] of Object.entries(prefs)) {
    if (allowedFields.includes(key) && typeof value === 'boolean') {
      updates[key] = value;
    }
  }

  if (Object.keys(updates).length === 0) {
    return { error: 'No valid fields to update' };
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();

  return { data, error };
}

// Get users for broadcast - requires service role
// Always pulls emails from auth.users (includes Google OAuth users)
// includeAll=true: all users with email (F&F mode)
// includeAll=false: only users who opted in (email_updates=true in profiles)
export async function getUsersForBroadcast(supabaseAdmin, includeAll = false) {
  if (!supabaseAdmin) return { data: [], error: 'Admin client required' };

  try {
    // Always get all users from auth.users (the authoritative source for emails)
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) return { data: [], error: error.message };

    // Filter to users with email
    let usersWithEmail = users.filter(u => u.email);

    // If not F&F mode, filter to only opted-in users
    if (!includeAll) {
      // Get opted-in user IDs from profiles
      const { data: optedIn, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email_updates', true);

      if (profilesError) return { data: [], error: profilesError.message };

      const optedInIds = new Set((optedIn || []).map(p => p.id));
      usersWithEmail = usersWithEmail.filter(u => optedInIds.has(u.id));
    }

    // Map to expected format
    const result = usersWithEmail.map(u => ({
      id: u.id,
      email: u.email,
      display_name: u.user_metadata?.full_name || u.email.split('@')[0]
    }));

    return { data: result, error: null };
  } catch (err) {
    return { data: [], error: err.message };
  }
}

// Get profile with email preferences by user ID (for API routes with admin client)
export async function getProfileWithEmailPrefs(supabaseAdmin, userId) {
  if (!supabaseAdmin) return { data: null, error: 'Admin client required' };

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, email, display_name, email_welcome, email_readings, email_replies, email_updates')
    .eq('id', userId)
    .single();

  return { data, error };
}

// Update single email preference by user ID (for unsubscribe links)
export async function unsubscribeByUserId(supabaseAdmin, userId, prefType) {
  if (!supabaseAdmin) return { error: 'Admin client required' };

  const fieldMap = {
    welcome: 'email_welcome',
    readings: 'email_readings',
    replies: 'email_replies',
    updates: 'email_updates'
  };

  const field = fieldMap[prefType];
  if (!field) return { error: 'Invalid preference type' };

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ [field]: false })
    .eq('id', userId);

  return { error };
}

// ============================================
// REAL-TIME CHAT FUNCTIONS
// ============================================

// Get all chat rooms
export async function getChatRooms() {
  const { data, error } = await supabase
    .from('chat_rooms')
    .select('*')
    .order('sort_order', { ascending: true });

  return { data, error };
}

// Get messages for a room (with pagination)
export async function getChatMessages(roomId, limit = 50, before = null) {
  let query = supabase
    .from('chat_messages')
    .select(`
      *,
      profiles:user_id (
        display_name,
        avatar_url
      )
    `)
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (before) {
    query = query.lt('created_at', before);
  }

  const { data, error } = await query;

  // Reverse to get chronological order for display
  return { data: data?.reverse() || [], error };
}

// Send a chat message
export async function sendChatMessage(roomId, content) {
  const { user } = await getUser();
  if (!user) return { data: null, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      room_id: roomId,
      user_id: user.id,
      content: content.trim()
    })
    .select(`
      *,
      profiles:user_id (
        display_name,
        avatar_url
      )
    `)
    .single();

  return { data, error };
}

// Delete a chat message (owner or admin)
export async function deleteChatMessage(messageId) {
  const { error } = await supabase
    .from('chat_messages')
    .delete()
    .eq('id', messageId);

  return { error };
}

// Subscribe to new messages in a room
// Returns the channel - call channel.unsubscribe() to clean up
export function subscribeToRoom(roomId, onMessage) {
  const channel = supabase
    .channel(`chat:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `room_id=eq.${roomId}`
      },
      async (payload) => {
        // Fetch the full message with profile
        const { data } = await supabase
          .from('chat_messages')
          .select(`
            *,
            profiles:user_id (
              display_name,
              avatar_url
            )
          `)
          .eq('id', payload.new.id)
          .single();

        if (data) {
          onMessage(data);
        }
      }
    )
    .subscribe();

  return channel;
}

// Subscribe to presence in a room (who's online)
// Returns the channel - call channel.unsubscribe() to clean up
export function subscribeToPresence(roomId, onSync) {
  const channel = supabase.channel(`presence:${roomId}`);

  channel
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      // Flatten the presence state to an array of users
      const users = Object.values(state).flat();
      onSync(users);
    })
    .subscribe();

  return channel;
}

// Track user presence in a room
export async function trackPresence(channel, user, displayName) {
  await channel.track({
    user_id: user.id,
    display_name: displayName || user.email?.split('@')[0] || 'Anonymous',
    online_at: new Date().toISOString()
  });
}

// Broadcast typing indicator
export function broadcastTyping(channel, displayName) {
  channel.send({
    type: 'broadcast',
    event: 'typing',
    payload: { user: displayName, timestamp: Date.now() }
  });
}

// Subscribe to typing events
export function onTyping(channel, callback) {
  channel.on('broadcast', { event: 'typing' }, ({ payload }) => {
    callback(payload);
  });
}
