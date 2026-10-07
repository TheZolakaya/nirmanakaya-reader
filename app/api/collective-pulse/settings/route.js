// /app/api/collective-pulse/settings/route.js
// Read and update pulse_settings (admin only, requires CRON_SECRET)

import { createClient } from '@supabase/supabase-js';
import { requireAdminOrCron } from '../../../../lib/adminAuth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// GET — read current pulse settings
export async function GET(request) {
  const gate = await requireAdminOrCron(request); // .728: a signed-in admin, or the server-only CRON_SECRET
  if (!gate.ok) return gate.response;

  try {
    const { data, error } = await supabase
      .from('pulse_settings')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      // Table might not exist yet
      return Response.json({
        success: true,
        settings: {
          frequency: 'daily',
          default_voice: 'default',
          auto_generate: true,
          pre_generate_voices: false,
          last_generated_at: null
        }
      });
    }

    return Response.json({ success: true, settings: data });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}

// PATCH — update pulse settings
export async function PATCH(request) {
  const gate = await requireAdminOrCron(request); // .728: a signed-in admin, or the server-only CRON_SECRET
  if (!gate.ok) return gate.response;

  try {
    const body = await request.json();
    const allowed = ['frequency', 'default_voice', 'auto_generate', 'pre_generate_voices'];
    const updates = {};
    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key];
    }
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('pulse_settings')
      .update(updates)
      .eq('singleton', true)
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
