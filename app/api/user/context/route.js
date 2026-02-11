// /app/api/user/context/route.js
// Builds compact user context block for prompt injection
// Called before each reading to give the AI awareness of the user's journey

import { createClient } from '@supabase/supabase-js';
import { buildBadgeStats } from '../../../../lib/badgeStats.js';
import { buildUserContextBlock } from '../../../../lib/userContext.js';

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

export async function GET(request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ contextBlock: '' });

  const { searchParams } = new URL(request.url);
  const topicId = searchParams.get('topic_id');
  // Current draws passed as JSON string for echo detection
  const currentDrawsParam = searchParams.get('draws');
  const currentDraws = currentDrawsParam ? JSON.parse(currentDrawsParam) : [];

  try {
    // Fetch all readings for stats
    const { data: allReadings } = await supabase
      .from('user_readings')
      .select('draws, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    // Fetch recent readings for recency context (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { data: recentReadings } = await supabase
      .from('user_readings')
      .select('draws, created_at, topic')
      .eq('user_id', user.id)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    // Fetch profile for user level + account age
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_level, created_at')
      .eq('id', user.id)
      .single();

    // Fetch topic data if topic reading
    let topicData = null;
    if (topicId) {
      const { data: topic } = await supabase
        .from('user_topics')
        .select('*')
        .eq('id', topicId)
        .eq('user_id', user.id)
        .single();

      if (topic) {
        // Get topic-specific readings
        const { data: topicReadings } = await supabase
          .from('user_readings')
          .select('draws, created_at')
          .eq('user_id', user.id)
          .eq('topic_id', topicId)
          .order('created_at', { ascending: true });

        topicData = {
          label: topic.label,
          readingCount: topic.reading_count,
          readings: topicReadings || []
        };
      }
    }

    const stats = buildBadgeStats(allReadings || []);

    const contextBlock = buildUserContextBlock(
      stats,
      currentDraws,
      recentReadings || [],
      topicData,
      profile
    );

    return Response.json({ success: true, contextBlock });
  } catch (err) {
    // On error, return empty context (reading still works without it)
    console.error('Context build error:', err);
    return Response.json({ contextBlock: '' });
  }
}
