// /app/api/user/reading-summary/route.js
// Auto-generates narrative micro-summary + hashtags for a reading using Haiku
// Called non-blocking after synthesis saves — powers the Ariadne Thread journey narrative

import { providerFetch } from '../../../../lib/provider.js'; // .475: the one door
import { summarizeReading } from '../../../../lib/readingSummary.js'; // .510: shared with the backfill; understands EZ
import { createClient } from '@supabase/supabase-js';
import { ARCHETYPES, BOUNDS, AGENTS, STATUSES } from '../../../../lib/archetypes.js';
import { MODEL_IDS } from '../../../../lib/modelConfig.js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function getSignatureName(id) {
  const n = Number(id);
  if (ARCHETYPES[n]) return ARCHETYPES[n].name;
  if (BOUNDS[n]) return BOUNDS[n].name;
  if (AGENTS[n]) return AGENTS[n].name;
  return `Signature ${n}`;
}

function getStatusPrefix(s) {
  return { 1: 'Balanced', 2: 'Too Much', 3: 'Too Little', 4: 'Unacknowledged' }[s] || '';
}

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

export async function POST(request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { readingId, refresh } = await request.json(); // .510: refresh = re-summarise a reading that has grown (EZ)
    if (!readingId) {
      return Response.json({ error: 'readingId is required' }, { status: 400 });
    }

    const { data: reading, error: readingError } = await supabase
      .from('user_readings')
      .select('topic, draws, interpretation, mode, spread_type, narrative_summary')
      .eq('id', readingId)
      .eq('user_id', user.id)
      .single();

    if (readingError || !reading) {
      return Response.json({ error: 'Reading not found' }, { status: 404 });
    }

    if (reading.narrative_summary && !refresh) {
      return Response.json({ success: true, skipped: true });
    }

    const result = await summarizeReading(reading);
    if (!result) return Response.json({ success: true, skipped: true, reason: 'No content yet' });
    const narrativeSummary = result.summary; const hashtags = result.hashtags;

    const { error: updateError } = await supabase
      .from('user_readings')
      .update({ narrative_summary: narrativeSummary, hashtags })
      .eq('id', readingId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('[ReadingSummary] Update error:', updateError.message);
      return Response.json({ error: updateError.message }, { status: 500 });
    }

    return Response.json({ success: true, summary: narrativeSummary, hashtags });
  } catch (err) {
    console.error('[ReadingSummary] Error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
