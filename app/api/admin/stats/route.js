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

  // Get all readings with service role (bypasses RLS)
  const { data: readings, error: readingsError } = await supabaseAdmin
    .from('readings')
    .select('user_id, input_tokens, output_tokens, estimated_cost, mode, spread_type');

  if (readingsError) {
    return Response.json({ error: readingsError.message }, { status: 500 });
  }

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
    readingCount: userStats[p.id]?.readingCount || 0
  }));

  // Calculate totals
  const totals = {
    userCount: profiles.length,
    totalTokens: Object.values(userStats).reduce((sum, u) => sum + u.totalTokens, 0),
    totalCost: Object.values(userStats).reduce((sum, u) => sum + u.totalCost, 0),
    totalReadings: Object.values(userStats).reduce((sum, u) => sum + u.readingCount, 0)
  };

  return Response.json({ users, totals });
}
