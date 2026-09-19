// app/api/admin/delete-user/route.js
// Delete a user from the system (admin only)

import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '../../../../lib/adminAuth.js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export async function POST(request) {
  try {
    // Identity comes from the verified session, never from the body. The previous version
    // accepted an `adminEmail` string supplied by the caller and compared it to a hardcoded
    // list — a password printed in the source, and a public email address at that.
    const gate = await requireAdmin(request);
    if (!gate.ok) return gate.response;

    const { userId } = await request.json();

    if (!userId) {
      return Response.json({ error: 'userId required' }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return Response.json({ error: 'Server not configured' }, { status: 500 });
    }

    // Don't allow deleting self — compared against the id on the verified token.
    if (gate.user.id === userId) {
      return Response.json({ error: 'Cannot delete yourself' }, { status: 400 });
    }

    // Delete user's data in order (respecting foreign keys)
    // 1. Delete replies
    await supabaseAdmin.from('replies').delete().eq('user_id', userId);

    // 2. Delete discussions
    await supabaseAdmin.from('discussions').delete().eq('user_id', userId);

    // 3. Delete readings (unified table)
    await supabaseAdmin.from('user_readings').delete().eq('user_id', userId);

    // 4. Delete profile
    await supabaseAdmin.from('profiles').delete().eq('id', userId);

    // 5. Delete auth user
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authError) {
      console.error('Failed to delete auth user:', authError);
      return Response.json({ error: 'Failed to delete user from auth' }, { status: 500 });
    }

    return Response.json({ success: true });

  } catch (err) {
    console.error('Delete user error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
