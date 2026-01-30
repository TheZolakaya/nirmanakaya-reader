// /app/api/feature-flags/route.js
// Read and toggle feature flags (public read, admin write via CRON_SECRET)

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// GET — read current feature flags (public, no auth required)
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('feature_flags')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      // Table might not exist yet — return safe defaults
      return Response.json({
        success: true,
        flags: {
          locus_control_enabled: false,
          email_system_enabled: true
        }
      });
    }

    return Response.json({
      success: true,
      flags: {
        locus_control_enabled: data.locus_control_enabled || false,
        email_system_enabled: data.email_system_enabled !== false
      }
    });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}

// PATCH — update feature flags (admin only, requires CRON_SECRET)
export async function PATCH(request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.NEXT_PUBLIC_CRON_SECRET || process.env.CRON_SECRET;
  if (authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const allowed = ['locus_control_enabled', 'email_system_enabled'];
    const updates = {};
    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key];
    }
    updates.updated_at = new Date().toISOString();

    // Get the singleton row ID first
    const { data: existing } = await supabase
      .from('feature_flags')
      .select('id')
      .limit(1)
      .single();

    if (!existing) {
      // No row exists — insert instead
      const { data, error } = await supabase
        .from('feature_flags')
        .insert(updates)
        .select()
        .single();
      if (error) return Response.json({ success: false, error: error.message }, { status: 500 });
      return Response.json({
        success: true,
        flags: {
          locus_control_enabled: data.locus_control_enabled || false,
          email_system_enabled: data.email_system_enabled !== false
        }
      });
    }

    const { data, error } = await supabase
      .from('feature_flags')
      .update(updates)
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      return Response.json({ success: false, error: error.message }, { status: 500 });
    }

    return Response.json({
      success: true,
      flags: {
        locus_control_enabled: data.locus_control_enabled || false,
        email_system_enabled: data.email_system_enabled !== false
      }
    });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
