// /app/api/user/badges/route.js
// CRUD for user badges/achievements

import { createClient } from '@supabase/supabase-js';

// Force dynamic — Vercel edge will cache this route otherwise
export const dynamic = 'force-dynamic';

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

// GET — list user's earned badges
export async function GET(request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { data: badges, error } = await supabase
      .from('user_badges')
      .select('*')
      .eq('user_id', user.id)
      .order('earned_at', { ascending: true });

    if (error) return Response.json({ error: error.message }, { status: 500 });

    // Also get unnotified count
    const unnotified = (badges || []).filter(b => !b.notified);

    return Response.json({
      success: true,
      badges: badges || [],
      unnotifiedCount: unnotified.length
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// PATCH — mark badges as notified
export async function PATCH(request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { badge_keys } = await request.json();

    if (!badge_keys || !Array.isArray(badge_keys)) {
      return Response.json({ error: 'badge_keys array required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('user_badges')
      .update({ notified: true })
      .eq('user_id', user.id)
      .in('badge_key', badge_keys);

    if (error) return Response.json({ error: error.message }, { status: 500 });

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
