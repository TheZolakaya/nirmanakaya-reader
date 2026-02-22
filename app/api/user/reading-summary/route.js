// /app/api/user/reading-summary/route.js
// Auto-generates narrative micro-summary + hashtags for a reading using Haiku
// Called non-blocking after synthesis saves — powers the Ariadne Thread journey narrative

import { createClient } from '@supabase/supabase-js';
import { ARCHETYPES, BOUNDS, AGENTS, STATUSES } from '../../../../lib/archetypes.js';

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
    const { readingId } = await request.json();
    if (!readingId) {
      return Response.json({ error: 'readingId is required' }, { status: 400 });
    }

    // Fetch the reading
    const { data: reading, error: readingError } = await supabase
      .from('user_readings')
      .select('topic, draws, interpretation, mode, spread_type, narrative_summary')
      .eq('id', readingId)
      .eq('user_id', user.id)
      .single();

    if (readingError || !reading) {
      return Response.json({ error: 'Reading not found' }, { status: 404 });
    }

    // Skip if already summarized
    if (reading.narrative_summary) {
      return Response.json({ success: true, skipped: true });
    }

    // Build compact reading description for Haiku (~500-800 tokens input)
    const draws = reading.draws || [];
    const drawDescriptions = draws.map(d => {
      const name = getSignatureName(d.transient);
      const status = getStatusPrefix(d.status);
      return `${status} ${name}`;
    }).join(', ');

    const interp = reading.interpretation || {};
    const summary = interp.synthesis?.summary;
    const summaryText = typeof summary === 'string' ? summary
      : (summary?.deep || summary?.swim || summary?.wade || summary?.surface || '');
    const letterText = typeof interp.letter === 'string' ? interp.letter
      : (interp.letter?.deep || interp.letter?.swim || interp.letter?.wade || interp.letter?.surface || '');

    // If no synthesis yet, skip — we'll be called again when it's available
    if (!summaryText && !letterText) {
      return Response.json({ success: true, skipped: true, reason: 'No content yet' });
    }

    const question = reading.topic || 'General reading';
    const mode = reading.mode || 'reflect';

    // Call Haiku — compact prompt for micro-summary + hashtags
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: `You generate brief reading summaries for a consciousness mapping system called Nirmanakaya. Each reading draws "signatures" (not cards) that reflect the querent's inner landscape. Respond with ONLY valid JSON, no other text.`,
        messages: [{
          role: 'user',
          content: `Summarize this reading in 1-2 sentences and generate 3-5 lowercase hashtags (single words or hyphenated phrases).

QUESTION: "${question}"
MODE: ${mode}
SIGNATURES DRAWN: ${drawDescriptions}
${summaryText ? `SYNTHESIS: ${summaryText.slice(0, 500)}` : ''}
${letterText ? `LETTER: ${letterText.slice(0, 300)}` : ''}

Return JSON: {"summary": "1-2 sentence narrative of what was explored and what emerged", "hashtags": ["tag1", "tag2", "tag3"]}

Rules:
- Summary should capture the ESSENCE — what the querent was exploring and what the architecture revealed
- Hashtags should be thematic (e.g., "career", "identity", "letting-go", "balance", "relationships") not structural
- Do not use signature names as hashtags
- No # symbol in hashtags`
        }]
      })
    });

    const aiData = await response.json();
    if (aiData.error) {
      console.error('[ReadingSummary] Haiku error:', aiData.error.message);
      return Response.json({ error: aiData.error.message }, { status: 500 });
    }

    const rawText = aiData.content?.map(item => item.text || '').join('') || '';

    // Parse the JSON response
    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch (parseErr) {
      // Try to extract JSON from surrounding text
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        console.error('[ReadingSummary] Failed to parse:', rawText);
        return Response.json({ error: 'Failed to parse summary' }, { status: 500 });
      }
    }

    const narrativeSummary = parsed.summary || '';
    const hashtags = (parsed.hashtags || [])
      .filter(t => typeof t === 'string')
      .map(t => t.toLowerCase().replace(/^#/, '').trim())
      .filter(t => t.length > 0)
      .slice(0, 7);

    // Store on the reading row
    const { error: updateError } = await supabase
      .from('user_readings')
      .update({
        narrative_summary: narrativeSummary,
        hashtags: hashtags
      })
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
