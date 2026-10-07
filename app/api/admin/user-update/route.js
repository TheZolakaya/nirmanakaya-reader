// app/api/admin/user-update/route.js — 2026-10-07 (.728)
// The admin page's per-user buttons (ban, community ban, admin, token limit, reset tokens) used to write `profiles` straight
// from the browser. The row rule only ever let a user write their OWN row, so on anyone else they silently did nothing; and
// since the 10-07 write lock those columns can't be written from a browser at all. They go through here now: a verified admin
// session, the service role, one whitelisted change per call.

import { createClient } from '@supabase/supabase-js';
import { requireAdmin, ADMIN_EMAILS } from '../../../../lib/adminAuth.js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

const today = () => new Date().toISOString().split('T')[0];

export async function POST(request) {
  try {
    const gate = await requireAdmin(request);
    if (!gate.ok) return gate.response;
    if (!supabaseAdmin) return Response.json({ error: 'Server not configured' }, { status: 500 });

    const { userId, action, value } = await request.json().catch(() => ({}));
    if (!userId || typeof userId !== 'string') return Response.json({ error: 'userId required' }, { status: 400 });

    let updates;
    if (action === 'ban') updates = { is_banned: !!value };
    else if (action === 'community_ban') updates = { community_banned: !!value };
    else if (action === 'admin') {
      // only the founder's account (by the email on the VERIFIED token) changes who is an admin
      if (!ADMIN_EMAILS.includes((gate.user.email || '').toLowerCase())) return Response.json({ error: 'Only super admin can modify admin status' }, { status: 403 });
      if (gate.user.id === userId && !value) return Response.json({ error: 'Cannot remove your own admin status' }, { status: 400 });
      updates = { is_admin: !!value };
    } else if (action === 'token_limit') {
      if (value !== null && !(Number.isInteger(value) && value >= 0)) return Response.json({ error: 'limit must be a whole number or empty' }, { status: 400 });
      updates = { daily_token_limit: value };
    } else if (action === 'reset_tokens') updates = { tokens_used_today: 0, last_token_reset: today() };
    else return Response.json({ error: 'unknown action' }, { status: 400 });

    const { data, error } = await supabaseAdmin.from('profiles').update(updates).eq('id', userId).select('id');
    if (error) return Response.json({ error: error.message }, { status: 500 });
    if (!data?.length) return Response.json({ error: 'no such user' }, { status: 404 });
    return Response.json({ success: true });
  } catch (e) {
    return Response.json({ error: e.message || 'update failed' }, { status: 500 });
  }
}
