// app/api/admin/stats/route.js
// Server-side admin stats - bypasses RLS to see all users' data

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

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

  // Get all readings with service role (bypasses RLS) - include telemetry
  const { data: readings, error: readingsError } = await supabaseAdmin
    .from('readings')
    .select('user_id, input_tokens, output_tokens, estimated_cost, mode, spread_type, reflect_count, forge_count, max_depth, clarify_count, unpack_count, example_count');

  if (readingsError) {
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

  // Aggregate by user
  const userStats = {};
  (readings || []).forEach(r => {
    if (!userStats[r.user_id]) {
      userStats[r.user_id] = {
        totalTokens: 0, totalCost: 0, readingCount: 0,
        totalReflects: 0, totalForges: 0, totalClarifies: 0, totalUnpacks: 0, totalExamples: 0,
        maxDepthReached: 'surface',
        discussionCount: 0, replyCount: 0
      };
    }
    userStats[r.user_id].totalTokens += (r.input_tokens || 0) + (r.output_tokens || 0);
    userStats[r.user_id].totalCost += r.estimated_cost || 0;
    userStats[r.user_id].readingCount += 1;
    // Telemetry
    userStats[r.user_id].totalReflects += r.reflect_count || 0;
    userStats[r.user_id].totalForges += r.forge_count || 0;
    userStats[r.user_id].totalClarifies += r.clarify_count || 0;
    userStats[r.user_id].totalUnpacks += r.unpack_count || 0;
    userStats[r.user_id].totalExamples += r.example_count || 0;
    // Track max depth reached across all readings
    const depthOrder = ['surface', 'wade', 'swim', 'deep'];
    const currentMax = depthOrder.indexOf(userStats[r.user_id].maxDepthReached);
    const readingDepth = depthOrder.indexOf(r.max_depth || 'surface');
    if (readingDepth > currentMax) {
      userStats[r.user_id].maxDepthReached = r.max_depth;
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
    // Telemetry
    totalReflects: userStats[p.id]?.totalReflects || 0,
    totalForges: userStats[p.id]?.totalForges || 0,
    totalClarifies: userStats[p.id]?.totalClarifies || 0,
    totalUnpacks: userStats[p.id]?.totalUnpacks || 0,
    totalExamples: userStats[p.id]?.totalExamples || 0,
    maxDepthReached: userStats[p.id]?.maxDepthReached || 'surface',
    // Community
    discussionCount: userStats[p.id]?.discussionCount || 0,
    replyCount: userStats[p.id]?.replyCount || 0
  }));

  // Calculate totals
  const totals = {
    userCount: profiles.length,
    totalTokens: Object.values(userStats).reduce((sum, u) => sum + u.totalTokens, 0),
    totalCost: Object.values(userStats).reduce((sum, u) => sum + u.totalCost, 0),
    totalReadings: Object.values(userStats).reduce((sum, u) => sum + u.readingCount, 0),
    // Telemetry totals
    totalReflects: Object.values(userStats).reduce((sum, u) => sum + u.totalReflects, 0),
    totalForges: Object.values(userStats).reduce((sum, u) => sum + u.totalForges, 0),
    totalExpansions: Object.values(userStats).reduce((sum, u) => sum + u.totalClarifies + u.totalUnpacks + u.totalExamples, 0),
    // Community totals
    totalDiscussions: (discussions || []).length,
    totalReplies: (replies || []).length
  };

  return Response.json({ users, totals });
}
