// app/api/admin/stats/route.js
// Server-side admin stats - bypasses RLS to see all users' data

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// Time boundaries for filtering
function getTimeBoundaries() {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const monthAgo = new Date(now);
  monthAgo.setDate(monthAgo.getDate() - 30);

  return {
    today: todayStart.toISOString(),
    week: weekAgo.toISOString(),
    month: monthAgo.toISOString()
  };
}

export async function POST(request) {
  if (!supabaseAdmin) {
    return Response.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  // Verify the requester is an admin
  const { userId } = await request.json();

  if (userId) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();

    if (!profile?.is_admin) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }
  }

  // Get all profiles
  const { data: profiles, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (profileError) {
    return Response.json({ error: profileError.message }, { status: 500 });
  }

  // Get all readings - only select columns that definitely exist
  // The readings table has: id, user_id, question, mode, spread_type, cards, synthesis, letter, created_at, updated_at, is_public, share_slug
  // Token columns may exist from migration: input_tokens, output_tokens, total_tokens, estimated_cost
  const { data: readings, error: readingsError } = await supabaseAdmin
    .from('readings')
    .select('id, user_id, created_at, mode, spread_type, input_tokens, output_tokens, estimated_cost')
    .order('created_at', { ascending: false });

  if (readingsError) {
    console.error('[Stats] Readings query error:', readingsError.message);
    return Response.json({ error: readingsError.message }, { status: 500 });
  }

  // Get discussions per user
  const { data: discussions } = await supabaseAdmin
    .from('discussions')
    .select('user_id');

  // Get replies per user
  const { data: replies } = await supabaseAdmin
    .from('discussion_replies')
    .select('user_id');

  // Time boundaries
  const times = getTimeBoundaries();

  // Aggregate by user with time-based counts
  const userStats = {};
  const modeCounts = { reflect: 0, discover: 0, forge: 0, explore: 0 };
  const spreadCounts = { single: 0, triad: 0, pentad: 0, septad: 0 };

  // Site-wide time-based totals
  let readingsToday = 0;
  let readingsThisWeek = 0;
  let readingsThisMonth = 0;

  (readings || []).forEach(r => {
    if (!userStats[r.user_id]) {
      userStats[r.user_id] = {
        totalTokens: 0,
        totalCost: 0,
        readingCount: 0,
        readingsToday: 0,
        readingsThisWeek: 0,
        readingsThisMonth: 0,
        discussionCount: 0,
        replyCount: 0,
        modes: { reflect: 0, discover: 0, forge: 0, explore: 0 },
        spreads: { single: 0, triad: 0, pentad: 0, septad: 0 },
        lastReadingAt: null
      };
    }

    const stats = userStats[r.user_id];
    stats.totalTokens += (r.input_tokens || 0) + (r.output_tokens || 0);
    stats.totalCost += r.estimated_cost || 0;
    stats.readingCount += 1;

    // Track last reading
    if (!stats.lastReadingAt || r.created_at > stats.lastReadingAt) {
      stats.lastReadingAt = r.created_at;
    }

    // Time-based counts
    const readingTime = r.created_at;
    if (readingTime >= times.today) {
      stats.readingsToday += 1;
      readingsToday += 1;
    }
    if (readingTime >= times.week) {
      stats.readingsThisWeek += 1;
      readingsThisWeek += 1;
    }
    if (readingTime >= times.month) {
      stats.readingsThisMonth += 1;
      readingsThisMonth += 1;
    }

    // Track modes
    const mode = (r.mode || '').toLowerCase();
    if (modeCounts[mode] !== undefined) {
      modeCounts[mode]++;
      stats.modes[mode]++;
    }

    // Track spreads
    const spread = (r.spread_type || '').toLowerCase();
    if (spreadCounts[spread] !== undefined) {
      spreadCounts[spread]++;
      stats.spreads[spread]++;
    }
  });

  // Add discussion counts
  (discussions || []).forEach(d => {
    if (userStats[d.user_id]) {
      userStats[d.user_id].discussionCount += 1;
    }
  });

  // Add reply counts
  (replies || []).forEach(r => {
    if (userStats[r.user_id]) {
      userStats[r.user_id].replyCount += 1;
    }
  });

  // Get user emails from auth.users
  const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
  const emailMap = {};
  (authUsers?.users || []).forEach(u => {
    emailMap[u.id] = u.email;
  });

  // Merge stats into profiles
  const users = profiles.map(p => ({
    ...p,
    email: emailMap[p.id] || null,
    totalTokens: userStats[p.id]?.totalTokens || 0,
    totalCost: userStats[p.id]?.totalCost || 0,
    readingCount: userStats[p.id]?.readingCount || 0,
    readingsToday: userStats[p.id]?.readingsToday || 0,
    readingsThisWeek: userStats[p.id]?.readingsThisWeek || 0,
    readingsThisMonth: userStats[p.id]?.readingsThisMonth || 0,
    lastReadingAt: userStats[p.id]?.lastReadingAt || null,
    modes: userStats[p.id]?.modes || { reflect: 0, discover: 0, forge: 0, explore: 0 },
    spreads: userStats[p.id]?.spreads || { single: 0, triad: 0, pentad: 0, septad: 0 },
    discussionCount: userStats[p.id]?.discussionCount || 0,
    replyCount: userStats[p.id]?.replyCount || 0
  }));

  // Calculate totals
  const totals = {
    userCount: profiles.length,
    totalTokens: Object.values(userStats).reduce((sum, u) => sum + u.totalTokens, 0),
    totalCost: Object.values(userStats).reduce((sum, u) => sum + u.totalCost, 0),
    totalReadings: Object.values(userStats).reduce((sum, u) => sum + u.readingCount, 0),
    // Time-based totals
    readingsToday,
    readingsThisWeek,
    readingsThisMonth,
    // Mode and spread totals
    modeCounts,
    spreadCounts,
    // Community totals
    totalDiscussions: (discussions || []).length,
    totalReplies: (replies || []).length
  };

  return Response.json({ users, totals });
}
