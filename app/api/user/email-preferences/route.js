// /app/api/user/email-preferences/route.js
// CRUD for user email reading preferences (auth required)

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Extract user from Authorization header (expects Supabase JWT)
async function getAuthUser(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.replace('Bearer ', '');
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const { data: { user }, error } = await anonClient.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

// GET — read user's email preferences
export async function GET(request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { data, error } = await supabase
      .from('user_email_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error || !data) {
      // No preferences yet — return defaults
      return Response.json({
        success: true,
        preferences: {
          email_readings_enabled: true,
          topic_mode: 'general',
          custom_topic: null,
          locus_subjects: [],
          card_count: 1,
          voice: 'friend'
        }
      });
    }

    return Response.json({ success: true, preferences: data });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}

// PUT — create or update user's email preferences
export async function PUT(request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const allowed = [
      'email_readings_enabled', 'topic_mode', 'custom_topic',
      'locus_subjects', 'card_count', 'voice'
    ];
    const updates = { user_id: user.id, updated_at: new Date().toISOString() };
    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    const { data, error } = await supabase
      .from('user_email_preferences')
      .upsert(updates, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      return Response.json({ success: false, error: error.message }, { status: 500 });
    }

    return Response.json({ success: true, preferences: data });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
