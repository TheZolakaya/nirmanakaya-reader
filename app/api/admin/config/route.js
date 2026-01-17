// app/api/admin/config/route.js
// Admin endpoint to manage site-wide feature configuration

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

const ADMIN_EMAILS = ['chriscrilly@gmail.com'];
const CONFIG_KEY = 'site_features';

// Default configuration
const DEFAULT_CONFIG = {
  // Voice settings visibility
  advancedVoiceFor: 'everyone', // 'admins' | 'everyone'

  // Model availability
  modelsForAdmins: ['haiku', 'sonnet', 'opus'],
  modelsForUsers: ['sonnet'], // Default: only Sonnet for users

  // Default model selection
  defaultModelAdmin: 'sonnet',
  defaultModelUser: 'sonnet'
};

// GET - Fetch current config
export async function GET(request) {
  try {
    if (!supabaseAdmin) {
      // Return defaults if no database
      return Response.json({ config: DEFAULT_CONFIG });
    }

    // Try to get config from site_config table
    const { data, error } = await supabaseAdmin
      .from('site_config')
      .select('value')
      .eq('key', CONFIG_KEY)
      .single();

    if (error || !data) {
      // Return defaults if not found
      return Response.json({ config: DEFAULT_CONFIG });
    }

    // Merge with defaults to ensure all keys exist
    const config = { ...DEFAULT_CONFIG, ...data.value };
    return Response.json({ config });

  } catch (err) {
    console.error('Config fetch error:', err);
    return Response.json({ config: DEFAULT_CONFIG });
  }
}

// POST - Update config (admin only)
export async function POST(request) {
  try {
    const { adminEmail, config } = await request.json();

    // Verify admin
    if (!adminEmail || !ADMIN_EMAILS.includes(adminEmail.toLowerCase())) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!config) {
      return Response.json({ error: 'config required' }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return Response.json({ error: 'Server not configured' }, { status: 500 });
    }

    // Merge with defaults
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };

    // Upsert config
    const { data, error } = await supabaseAdmin
      .from('site_config')
      .upsert({
        key: CONFIG_KEY,
        value: mergedConfig,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'key'
      })
      .select()
      .single();

    if (error) {
      console.error('Config save error:', error);
      // If table doesn't exist, return success with the config anyway
      // (config will work from defaults)
      if (error.code === '42P01') {
        return Response.json({
          success: true,
          config: mergedConfig,
          warning: 'Config table not created yet - using defaults'
        });
      }
      return Response.json({ error: 'Failed to save config' }, { status: 500 });
    }

    return Response.json({ success: true, config: mergedConfig });

  } catch (err) {
    console.error('Config error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
