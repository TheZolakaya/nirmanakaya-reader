// /app/api/user/topic-analysis/route.js
// Auto-generates meta-analysis for a saved topic using Haiku
// Called after each reading saved with a topic_id

import { createClient } from '@supabase/supabase-js';
import { ARCHETYPES, BOUNDS, AGENTS } from '../../../../lib/archetypes.js';

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

function getStatusName(s) {
  return { 1: 'Balanced', 2: 'Too Much', 3: 'Too Little', 4: 'Unacknowledged' }[s] || '?';
}

function getPositionName(p) {
  if (p == null) return null;
  return ARCHETYPES[Number(p)]?.name || `Position ${p}`;
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
    const { topic_id } = await request.json();

    if (!topic_id) {
      return Response.json({ error: 'topic_id is required' }, { status: 400 });
    }

    // Verify topic ownership
    const { data: topic, error: topicError } = await supabase
      .from('user_topics')
      .select('*')
      .eq('id', topic_id)
      .eq('user_id', user.id)
      .single();

    if (topicError || !topic) {
      return Response.json({ error: 'Topic not found' }, { status: 404 });
    }

    // Get last 10 readings for this topic
    const { data: readings, error: readingsError } = await supabase
      .from('user_readings')
      .select('draws, created_at')
      .eq('user_id', user.id)
      .eq('topic_id', topic_id)
      .order('created_at', { ascending: true })
      .limit(10);

    if (readingsError) {
      return Response.json({ error: readingsError.message }, { status: 500 });
    }

    if (!readings || readings.length < 2) {
      return Response.json({
        success: true,
        meta_analysis: null,
        reason: 'Need at least 2 readings for meta-analysis'
      });
    }

    // Build compact reading summary for the AI
    const readingSummaries = readings.map((r, i) => {
      const date = new Date(r.created_at).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric'
      });
      const draws = (r.draws || []).map(d => {
        const name = getSignatureName(d.transient);
        const status = getStatusName(d.status);
        const pos = getPositionName(d.position);
        return pos ? `${status} ${name} in ${pos}` : `${status} ${name}`;
      }).join(', ');
      return `Reading ${i + 1} (${date}): ${draws}`;
    }).join('\n');

    // Call Haiku for meta-analysis
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        system: `You are the Nirmanakaya Reader analyzing the development of a recurring topic across multiple readings. Speak with warmth and recognition. Use "signature" not "card." Use present tense. Do not use pet names. Do not give advice — observe patterns and name what's moving.`,
        messages: [{
          role: 'user',
          content: `Analyze the development of this topic: "${topic.label}"

${readingSummaries}

Provide a brief meta-analysis (150-200 words) covering:
- The overall arc — what trajectory do you see?
- Recurring patterns — what signatures keep appearing and what does that signal?
- Balance trend — is the topic moving toward or away from balance?
- Current state — where are they now compared to where they started?

Speak directly to the reader. Be specific about the signatures you see.`
        }]
      })
    });

    const aiData = await response.json();

    if (aiData.error) {
      return Response.json({ error: aiData.error.message }, { status: 500 });
    }

    const analysisText = aiData.content?.map(item => item.text || '').join('') || '';

    // Store the meta-analysis on the topic
    const metaAnalysis = {
      text: analysisText,
      generated_at: new Date().toISOString(),
      reading_count: readings.length
    };

    await supabase
      .from('user_topics')
      .update({ meta_analysis: metaAnalysis })
      .eq('id', topic_id)
      .eq('user_id', user.id);

    return Response.json({
      success: true,
      meta_analysis: metaAnalysis
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
