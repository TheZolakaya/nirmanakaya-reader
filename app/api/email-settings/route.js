// /app/api/email-settings/route.js
// Admin CRUD for email settings (singleton table)

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// GET — read email settings (admin only, uses cron secret)
export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.NEXT_PUBLIC_CRON_SECRET || process.env.CRON_SECRET;
  if (authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data, error } = await supabase
      .from('email_settings')
      .select('*')
      .limit(1)
      .single();

    if (error || !data) {
      return Response.json({
        success: true,
        settings: {
          email_frequency: 'weekly',
          send_hour: 7,
          send_day: 1,
          default_card_count: 1,
          default_voice: 'friend',
          email_system_enabled: true,
          last_send_at: null,
          last_send_count: 0,
          last_send_failed: 0
        }
      });
    }

    return Response.json({ success: true, settings: data });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}

// PATCH — update email settings (admin only)
export async function PATCH(request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.NEXT_PUBLIC_CRON_SECRET || process.env.CRON_SECRET;
  if (authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const allowed = [
      'email_frequency', 'send_hour', 'send_day',
      'default_card_count', 'default_voice', 'email_system_enabled'
    ];
    const updates = { updated_at: new Date().toISOString() };
    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    // Get existing row ID
    const { data: existing } = await supabase
      .from('email_settings')
      .select('id')
      .limit(1)
      .single();

    if (!existing) {
      // Create singleton row
      const { data, error } = await supabase
        .from('email_settings')
        .insert(updates)
        .select()
        .single();
      if (error) return Response.json({ success: false, error: error.message }, { status: 500 });
      return Response.json({ success: true, settings: data });
    }

    const { data, error } = await supabase
      .from('email_settings')
      .update(updates)
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      return Response.json({ success: false, error: error.message }, { status: 500 });
    }

    return Response.json({ success: true, settings: data });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
