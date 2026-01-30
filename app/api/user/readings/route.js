// /app/api/user/readings/route.js
// CRUD for stored personal readings (auth required)

import { createClient } from '@supabase/supabase-js';

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
      .select('id, created_at, reading_type, topic_mode, topic, locus, locus_detail, locus_subjects, card_count, voice, draws, share_token, is_public', { count: 'exact' })
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
    const { reading_type, topic_mode, topic, locus_subjects, locus, locus_detail, card_count, voice, draws, interpretation } = body;

    if (!draws || !interpretation) {
      return Response.json({ success: false, error: 'draws and interpretation are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('user_readings')
      .insert({
        user_id: user.id,
        reading_type: reading_type || 'manual',
        topic_mode: topic_mode || 'general',
        topic: topic || null,
        locus_subjects: Array.isArray(locus_subjects) ? locus_subjects : [],
        // Keep legacy columns for backward compat display
        locus: locus || 'individual',
        locus_detail: locus_detail || null,
        card_count: card_count || draws.length,
        voice: voice || 'friend',
        draws,
        interpretation,
        is_public: false
      })
      .select()
      .single();

    if (error) return Response.json({ success: false, error: error.message }, { status: 500 });

    return Response.json({ success: true, reading: data });
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
    const allowed = ['draws', 'interpretation', 'card_count', 'is_public'];
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
