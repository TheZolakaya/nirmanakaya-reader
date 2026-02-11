// /app/api/user/stats/route.js
// Returns computed signature stats for the authenticated user
// Used by: collection page, badge system, heatmap, stats page, prompt context

import { createClient } from '@supabase/supabase-js';
import { buildBadgeStats } from '../../../../lib/badgeStats.js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getAuthUser(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const { data: { user }, error } = await anonClient.auth.getUser(authHeader.replace('Bearer ', ''));
  if (error || !user) return null;
  return user;
}

export async function GET(request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const topicId = searchParams.get('topic_id');
  const days = parseInt(searchParams.get('days') || '0'); // 0 = all time

  try {
    // Build query
    let query = supabase
      .from('user_readings')
      .select('draws, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    // Filter by topic if specified
    if (topicId) {
      query = query.eq('topic_id', topicId);
    }

    // Filter by date range if specified
    if (days > 0) {
      const since = new Date();
      since.setDate(since.getDate() - days);
      query = query.gte('created_at', since.toISOString());
    }

    const { data: readings, error } = await query;

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    const stats = buildBadgeStats(readings || []);

    return Response.json({
      success: true,
      stats,
      ...(topicId ? { topic_id: topicId } : {}),
      ...(days > 0 ? { days } : {})
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
