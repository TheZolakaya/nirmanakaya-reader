// /app/api/user/readings/route.js
// CRUD for stored personal readings (auth required)
// Extended: badge checking after save, topic_id support

import { createClient } from '@supabase/supabase-js';
import { buildBadgeStats } from '../../../../lib/badgeStats.js';
import { checkForNewBadges } from '../../../../lib/badges.js';

// Force dynamic — Vercel edge will cache this route otherwise
export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getAuthUser(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const { data: { user }, error } = await anonClient.auth.getUser(authHeader.replace('Bearer ', ''));
  if (error || !user) return null;
  return user;
}

// GET — list user's readings (paginated)
export async function GET(request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
  const readingId = searchParams.get('id');
  const shareToken = searchParams.get('share_token');

  try {
    // Single reading by ID
    if (readingId) {
      const { data, error } = await supabase
        .from('user_readings')
        .select('*')
        .eq('id', readingId)
        .eq('user_id', user.id)
        .single();

      if (error) return Response.json({ success: false, error: 'Reading not found' }, { status: 404 });
      return Response.json({ success: true, reading: data });
    }

    // Single reading by share token (for public access)
    if (shareToken) {
      const { data, error } = await supabase
        .from('user_readings')
        .select('*')
        .eq('share_token', shareToken)
        .single();

      if (error || !data) return Response.json({ success: false, error: 'Reading not found' }, { status: 404 });
      // Only return if public or owned by user
      if (!data.is_public && data.user_id !== user.id) {
        return Response.json({ success: false, error: 'Not authorized' }, { status: 403 });
      }
      return Response.json({ success: true, reading: data });
    }

    // List readings
    const offset = (page - 1) * limit;
    const { data, error, count } = await supabase
      .from('user_readings')
      .select('id, created_at, reading_type, topic_mode, topic, locus, locus_detail, locus_subjects, card_count, voice, draws, share_token, is_public, topic_id, hashtags', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return Response.json({ success: false, error: error.message }, { status: 500 });

    return Response.json({
      success: true,
      readings: data || [],
      total: count || 0,
      page,
      limit
    });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST — store a new reading
export async function POST(request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { reading_type, topic_mode, topic, locus_subjects, locus, locus_detail, card_count, voice, draws, interpretation, glisten, topic_id, token_usage, model, mode, spread_type, telemetry } = body;

    if (!draws || !interpretation) {
      return Response.json({ success: false, error: 'draws and interpretation are required' }, { status: 400 });
    }

    // Build interpretation object, optionally including glisten data
    const fullInterpretation = {
      ...interpretation,
      ...(glisten ? {
        glisten: {
          ...glisten,
          createdAt: new Date().toISOString()
        }
      } : {})
    };

    // Calculate estimated cost based on model
    const inputTokens = token_usage?.input_tokens || 0;
    const outputTokens = token_usage?.output_tokens || 0;
    const MODEL_PRICING = {
      haiku: { input: 1.00, output: 5.00 },
      sonnet: { input: 3.00, output: 15.00 },
      opus: { input: 15.00, output: 75.00 }
    };
    const pricing = MODEL_PRICING[model || 'sonnet'] || MODEL_PRICING.sonnet;
    const estimatedCost = (inputTokens * pricing.input + outputTokens * pricing.output) / 1000000;

    const insertData = {
      user_id: user.id,
      reading_type: reading_type || 'automated',
      topic_mode: topic_mode || 'general',
      topic: topic || null,
      locus_subjects: Array.isArray(locus_subjects) ? locus_subjects : [],
      // Keep legacy columns for backward compat display
      locus: locus || 'individual',
      locus_detail: locus_detail || null,
      card_count: card_count || draws.length,
      voice: voice || 'friend',
      draws,
      interpretation: fullInterpretation,
      is_public: false,
      // Token tracking
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: inputTokens + outputTokens,
      estimated_cost: estimatedCost,
      model: model || 'sonnet',
      // Mode and spread for admin stats
      mode: mode || null,
      spread_type: spread_type || null,
      // Telemetry
      reflect_count: telemetry?.reflectCount || 0,
      forge_count: telemetry?.forgeCount || 0,
      clarify_count: telemetry?.clarifyCount || 0
    };

    // Link to saved topic if provided
    if (topic_id) {
      insertData.topic_id = topic_id;
    }

    const { data, error } = await supabase
      .from('user_readings')
      .insert(insertData)
      .select()
      .single();

    if (error) return Response.json({ success: false, error: error.message }, { status: 500 });

    // Update topic counters if linked to a topic
    if (topic_id) {
      await supabase
        .from('user_topics')
        .update({
          last_used_at: new Date().toISOString(),
          reading_count: supabase.rpc ? undefined : undefined // handled below
        })
        .eq('id', topic_id)
        .eq('user_id', user.id);

      // Increment reading_count via raw update
      await supabase.rpc('increment_topic_reading_count', { p_topic_id: topic_id }).catch(() => {
        // Fallback: manual increment if RPC not available
        supabase
          .from('user_topics')
          .select('reading_count')
          .eq('id', topic_id)
          .single()
          .then(({ data: t }) => {
            if (t) {
              supabase
                .from('user_topics')
                .update({ reading_count: (t.reading_count || 0) + 1 })
                .eq('id', topic_id);
            }
          });
      });
    }

    // Badge check (non-blocking — don't wait for it to complete)
    let newBadges = [];
    try {
      const { data: allReadings } = await supabase
        .from('user_readings')
        .select('draws, created_at')
        .eq('user_id', user.id);

      const stats = buildBadgeStats(allReadings || []);

      const { data: existingBadges } = await supabase
        .from('user_badges')
        .select('badge_key')
        .eq('user_id', user.id);

      const existingKeys = (existingBadges || []).map(b => b.badge_key);
      const earned = checkForNewBadges(stats, existingKeys);

      if (earned.length > 0) {
        const badgeInserts = earned.map(b => ({
          user_id: user.id,
          badge_key: b.key,
          reading_id: data.id
        }));

        await supabase.from('user_badges').insert(badgeInserts);
        newBadges = earned.map(b => ({ key: b.key, name: b.name, description: b.description }));
      }
    } catch (badgeErr) {
      // Badge check failure should not block reading save
      console.error('Badge check error:', badgeErr);
    }

    return Response.json({ success: true, reading: data, newBadges });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}

// PATCH — update reading (for expand, toggle public)
export async function PATCH(request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) return Response.json({ success: false, error: 'id is required' }, { status: 400 });

    // Only allow certain fields
    const allowed = ['draws', 'interpretation', 'card_count', 'is_public', 'input_tokens', 'output_tokens', 'total_tokens', 'estimated_cost', 'reflect_count', 'forge_count', 'clarify_count', 'narrative_summary', 'hashtags'];
    const safeUpdates = {};
    for (const key of allowed) {
      if (updates[key] !== undefined) safeUpdates[key] = updates[key];
    }

    const { data, error } = await supabase
      .from('user_readings')
      .update(safeUpdates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) return Response.json({ success: false, error: error.message }, { status: 500 });

    return Response.json({ success: true, reading: data });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
