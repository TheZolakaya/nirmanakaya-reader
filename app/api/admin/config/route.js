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
  defaultModelUser: 'sonnet',

  // Default voice settings (matches app/page.js voice panel)
  defaultVoice: {
    // === READING VOICE (top bar) ===
    preset: 'kind',          // clear | kind | playful | wise | oracle

    // === FINE-TUNE VOICE section ===
    // Persona - "Who reads this to you?"
    persona: 'friend',       // none | friend | therapist | spiritualist | scientist | coach

    // Sliders (1-10 scale matching HUMOR_LEVELS, REGISTER_LEVELS, CREATOR_LEVELS)
    humor: 5,                // 1=Unhinged → 10=Sacred
    register: 5,             // 1=Chaos → 10=Oracle
    creator: 5,              // 1=Witness → 10=Creator

    // Special modes
    roastMode: false,        // savage mode
    directMode: false,       // unfiltered mode

    // === ADVANCED section ===
    // Complexity - "Speak to me like..."
    complexity: 'guide',     // friend | guide | teacher | mentor | master

    // Tone
    seriousness: 'light',    // playful | light | balanced | earnest | grave

    // Voice
    voice: 'warm',           // wonder | warm | direct | grounded

    // Focus
    focus: 'feel',           // do | feel | see | build

    // Density
    density: 'essential',    // luminous | rich | clear | essential

    // Scope
    scope: 'here'            // resonant | patterned | connected | here
  },

  // Default reading settings
  defaultMode: 'reflect',     // reflect | discover | forge | explore
  defaultSpread: 'triad',     // single | triad | pentad | septad

  // Complexity slider settings (20-level system)
  maxUserLevel: 10,           // Users can access levels 1-10 by default
  defaultComplexityLevel: 3,  // Default to level 3 (Reflect/Air/3 cards)
  showElementLabels: true,    // Show Earth/Water/Air/Fire/Gestalt labels

  // Default background settings
  defaultBackground: {
    type: 'video',           // video | image | solid
    videoId: 'default',      // video identifier
    opacity: 0.4,            // 0-1
    dimContent: 0.3          // 0-1
  }
};

// GET - Fetch current config
export async function GET(request) {
  try {
    if (!supabaseAdmin) {
      // Return defaults if no database
      console.log('[Config GET] No supabaseAdmin, returning defaults');
      return Response.json({ config: DEFAULT_CONFIG });
    }

    // Try to get config from site_config table
    const { data, error } = await supabaseAdmin
      .from('site_config')
      .select('value')
      .eq('key', CONFIG_KEY)
      .single();

    console.log('[Config GET] Query result:', { data: data ? 'found' : 'null', error: error?.message });

    if (error || !data) {
      // Return defaults if not found
      console.log('[Config GET] Error or no data, returning defaults');
      return Response.json({ config: DEFAULT_CONFIG });
    }

    // Merge with defaults to ensure all keys exist
    const config = { ...DEFAULT_CONFIG, ...data.value };
    console.log('[Config GET] Returning saved config, persona:', config.defaultVoice?.persona);
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
      // If table doesn't exist or any other error, return success with the config anyway
      // The config will work from defaults until the table is created
      // Error codes: 42P01 = table doesn't exist, PGRST116 = no rows returned
      return Response.json({
        success: true,
        config: mergedConfig,
        warning: `Config not persisted: ${error.message}. Using session defaults.`
      });
    }

    return Response.json({ success: true, config: mergedConfig });

  } catch (err) {
    console.error('Config error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
