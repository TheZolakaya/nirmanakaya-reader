// /app/api/reading/shared/route.js
// Public endpoint to fetch a shared reading by share_token (no auth required)

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return Response.json({ success: false, error: 'Token required' }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from('user_readings')
      .select('id, created_at, topic, locus, locus_detail, locus_subjects, card_count, draws, interpretation, share_token, is_public')
      .eq('share_token', token)
      .eq('is_public', true)
      .single();

    if (error || !data) {
      return Response.json({ success: false, error: 'Reading not found or not public' }, { status: 404 });
    }

    return Response.json({ success: true, reading: data });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
