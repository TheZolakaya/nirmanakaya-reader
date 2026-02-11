// /app/api/user/topics/route.js
// CRUD for saved reading topics (max 7 active per user)

import { createClient } from '@supabase/supabase-js';

const MAX_ACTIVE_TOPICS = 7;

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

// GET — list user's topics (active by default)
export async function GET(request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const includeArchived = searchParams.get('include_archived') === 'true';
  const topicId = searchParams.get('id');

  try {
    // Single topic by ID
    if (topicId) {
      const { data, error } = await supabase
        .from('user_topics')
        .select('*')
        .eq('id', topicId)
        .eq('user_id', user.id)
        .single();

      if (error) return Response.json({ error: 'Topic not found' }, { status: 404 });
      return Response.json({ success: true, topic: data });
    }

    // List topics
    let query = supabase
      .from('user_topics')
      .select('*')
      .eq('user_id', user.id)
      .order('last_used_at', { ascending: false });

    if (!includeArchived) {
      query = query.eq('archived', false);
    }

    const { data: topics, error } = await query;

    if (error) return Response.json({ error: error.message }, { status: 500 });

    return Response.json({
      success: true,
      topics: topics || [],
      activeCount: (topics || []).filter(t => !t.archived).length,
      maxTopics: MAX_ACTIVE_TOPICS
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// POST — create a new topic
export async function POST(request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { label } = await request.json();

    if (!label || !label.trim()) {
      return Response.json({ error: 'label is required' }, { status: 400 });
    }

    // Check active topic count
    const { count, error: countError } = await supabase
      .from('user_topics')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('archived', false);

    if (countError) return Response.json({ error: countError.message }, { status: 500 });

    if (count >= MAX_ACTIVE_TOPICS) {
      return Response.json({
        error: `Maximum ${MAX_ACTIVE_TOPICS} active topics. Archive one to create a new one.`,
        maxReached: true
      }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('user_topics')
      .insert({
        user_id: user.id,
        label: label.trim()
      })
      .select()
      .single();

    if (error) return Response.json({ error: error.message }, { status: 500 });

    return Response.json({ success: true, topic: data });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// PATCH — update topic (rename, archive, update last_used_at)
export async function PATCH(request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id, ...updates } = await request.json();

    if (!id) return Response.json({ error: 'id is required' }, { status: 400 });

    // Only allow certain fields
    const allowed = ['label', 'archived', 'last_used_at', 'reading_count', 'meta_analysis'];
    const safeUpdates = {};
    for (const key of allowed) {
      if (updates[key] !== undefined) safeUpdates[key] = updates[key];
    }

    const { data, error } = await supabase
      .from('user_topics')
      .update(safeUpdates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) return Response.json({ error: error.message }, { status: 500 });

    return Response.json({ success: true, topic: data });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// DELETE — permanently delete a topic (readings keep their topic_id as NULL)
export async function DELETE(request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await request.json();

    if (!id) return Response.json({ error: 'id is required' }, { status: 400 });

    const { error } = await supabase
      .from('user_topics')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) return Response.json({ error: error.message }, { status: 500 });

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
