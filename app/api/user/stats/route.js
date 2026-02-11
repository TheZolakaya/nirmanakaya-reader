// /app/api/user/stats/route.js
// Returns computed signature stats for the authenticated user
// Used by: collection page, badge system, heatmap, stats page, prompt context

import { createClient } from '@supabase/supabase-js';
import { buildBadgeStats } from '../../../../lib/badgeStats.js';

// Force dynamic — never cache this route
export const dynamic = 'force-dynamic';

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

  const authHeader = request.headers.get('authorization');
  const token = authHeader.replace('Bearer ', '');

  const { searchParams } = new URL(request.url);
  const topicId = searchParams.get('topic_id');
  const days = parseInt(searchParams.get('days') || '0'); // 0 = all time

  try {
    // Try BOTH approaches: service role key AND user's own token
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    // Query with service role (bypasses RLS)
    const { data: serviceData, error: serviceError, count: serviceCount } = await serviceClient
      .from('user_readings')
      .select('draws, created_at', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    // Query with user token (uses RLS)
    const { data: userData, error: userError, count: userCount } = await userClient
      .from('user_readings')
      .select('draws, created_at', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    // Use whichever has data
    const readings = (serviceData?.length > 0 ? serviceData : userData) || [];
    const stats = buildBadgeStats(readings);

    return Response.json({
      success: true,
      stats,
      _debug: {
        serviceCount: serviceData?.length ?? 'null',
        serviceError: serviceError?.message ?? null,
        userCount: userData?.length ?? 'null',
        userError: userError?.message ?? null,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        userId: user.id,
        sampleDraws: readings[0]?.draws?.slice(0, 2)
      },
      ...(topicId ? { topic_id: topicId } : {}),
      ...(days > 0 ? { days } : {})
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
