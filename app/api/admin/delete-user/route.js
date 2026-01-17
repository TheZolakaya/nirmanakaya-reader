// app/api/admin/delete-user/route.js
// Delete a user from the system (admin only)

import { createClient } from '@supabase/supabase-js';

const ADMIN_EMAILS = ['chriscrilly@gmail.com'];

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export async function POST(request) {
  try {
    const { adminEmail, userId } = await request.json();

    // Verify admin
    if (!ADMIN_EMAILS.includes(adminEmail?.toLowerCase())) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!userId) {
      return Response.json({ error: 'userId required' }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return Response.json({ error: 'Server not configured' }, { status: 500 });
    }

    // Don't allow deleting self
    const { data: adminUser } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', adminEmail.toLowerCase())
      .single();

    if (adminUser?.id === userId) {
      return Response.json({ error: 'Cannot delete yourself' }, { status: 400 });
    }

    // Delete user's data in order (respecting foreign keys)
    // 1. Delete replies
    await supabaseAdmin.from('replies').delete().eq('user_id', userId);

    // 2. Delete discussions
    await supabaseAdmin.from('discussions').delete().eq('user_id', userId);

    // 3. Delete readings
    await supabaseAdmin.from('readings').delete().eq('user_id', userId);

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
