// GET /api/user/tier — the tier this person holds (.779): admins 9; else max(profiles.tier, the tier earned by closed readings).
import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '../../../../lib/requireUser.js';
import { tierFor, earnedTier, EARN } from '../../../../lib/features.js';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ tier: 1, closed: 0, signedIn: false });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return Response.json({ tier: 1, closed: 0 });
  const db = createClient(url, key, { auth: { persistSession: false } });
  const { data: profile } = await db.from('profiles').select('tier, is_admin, total_readings').eq('id', user.id).single();
  const isAdmin = !!profile?.is_admin || String(user.email || '').toLowerCase() === 'chriscrilly@gmail.com';
  // closed readings = readings that were wrapped up (a 'wrap' turn in the saved conversation); counted from the saved readings
  let closed = 0;
  try {
    const { data: rows } = await db.from('user_readings').select('interpretation').eq('user_id', user.id).order('created_at', { ascending: false }).limit(200);
    closed = (rows || []).filter((r) => (r?.interpretation?.synthesis?._ez?.turns || []).some((t) => t?.role === 'wrap')).length;
  } catch {}
  const tier = tierFor({ isAdmin, profileTier: profile?.tier || 1, closedReadings: closed });
  return Response.json({ tier, closed, granted: profile?.tier || 1, earned: earnedTier(closed), isAdmin, earn: EARN });
}
