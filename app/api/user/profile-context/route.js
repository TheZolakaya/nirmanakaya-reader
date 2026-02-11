// /app/api/user/profile-context/route.js
// CRUD for user personal context facts (private personalization)
// These facts are injected into reading prompts to personalize interpretations.

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const VALID_CATEGORIES = ['identity', 'life_situation', 'active_projects', 'self_knowledge', 'relationship_to_system'];

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

// GET — list all non-archived facts for current user
export async function GET(request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { data, error } = await supabase
      .from('user_profile_context')
      .select('*')
      .eq('user_id', user.id)
      .eq('archived', false)
      .order('created_at', { ascending: false });

    if (error) return Response.json({ success: false, error: error.message }, { status: 500 });

    return Response.json({ success: true, facts: data || [] });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST — add a new fact
export async function POST(request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { fact, category } = await request.json();

    if (!fact?.trim()) {
      return Response.json({ success: false, error: 'fact is required' }, { status: 400 });
    }
    if (!VALID_CATEGORIES.includes(category)) {
      return Response.json({ success: false, error: `category must be one of: ${VALID_CATEGORIES.join(', ')}` }, { status: 400 });
    }

    // Cap at 20 active facts per user
    const { count } = await supabase
      .from('user_profile_context')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('archived', false);

    if (count >= 20) {
      return Response.json({ success: false, error: 'Maximum of 20 active facts reached. Archive some to add more.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('user_profile_context')
      .insert({
        user_id: user.id,
        fact: fact.trim(),
        category,
        source: 'manual'
      })
      .select()
      .single();

    if (error) return Response.json({ success: false, error: error.message }, { status: 500 });

    return Response.json({ success: true, fact: data });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE — archive a fact (soft delete)
export async function DELETE(request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await request.json();

    if (!id) return Response.json({ success: false, error: 'id is required' }, { status: 400 });

    const { data, error } = await supabase
      .from('user_profile_context')
      .update({ archived: true })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) return Response.json({ success: false, error: error.message }, { status: 500 });

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
