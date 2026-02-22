// /app/api/admin/backfill-narratives/route.js
// Backfill narrative summaries + hashtags for existing readings.
// Also reconciles topic reading counts.
// Admin-only. Run after migration 009.
//
// GET: Returns status (how many readings need backfill)
// POST: Processes a batch (default 20). Call repeatedly until remaining=0.
//   Optional body: { batchSize: 20, reconcileTopics: true }

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

async function checkAdmin(userId) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .single();
  return !!profile?.is_admin;
}

// Generate summary + hashtags for a single reading using Haiku
async function generateNarrative(reading) {
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

  // Skip if no content to summarize
  if (!summaryText && !letterText) {
    return null;
  }

  const question = reading.topic || 'General reading';
  const mode = reading.mode || 'reflect';

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
    throw new Error(aiData.error.message);
  }

  const rawText = aiData.content?.map(item => item.text || '').join('') || '';

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error(`Failed to parse: ${rawText.slice(0, 100)}`);
    }
  }

  const narrativeSummary = parsed.summary || '';
  const hashtags = (parsed.hashtags || [])
    .filter(t => typeof t === 'string')
    .map(t => t.toLowerCase().replace(/^#/, '').trim())
    .filter(t => t.length > 0)
    .slice(0, 7);

  return { narrativeSummary, hashtags };
}

// GET: Status check — how many readings need backfill
export async function GET(request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await checkAdmin(user.id))) return Response.json({ error: 'Admin only' }, { status: 403 });

  try {
    // Count readings without narrative_summary that have interpretation data
    const { count: needsBackfill } = await supabase
      .from('user_readings')
      .select('id', { count: 'exact', head: true })
      .is('narrative_summary', null)
      .not('interpretation', 'is', null);

    const { count: totalReadings } = await supabase
      .from('user_readings')
      .select('id', { count: 'exact', head: true });

    const { count: alreadyDone } = await supabase
      .from('user_readings')
      .select('id', { count: 'exact', head: true })
      .not('narrative_summary', 'is', null);

    return Response.json({
      totalReadings,
      alreadyDone,
      needsBackfill,
      estimatedCost: `~$${((needsBackfill || 0) * 0.001).toFixed(3)}`
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// POST: Process a batch + optionally reconcile topic counts
export async function POST(request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await checkAdmin(user.id))) return Response.json({ error: 'Admin only' }, { status: 403 });

  let batchSize = 20;
  let reconcileTopics = false;
  try {
    const body = await request.json();
    if (body.batchSize) batchSize = Math.min(body.batchSize, 50);
    if (body.reconcileTopics) reconcileTopics = true;
  } catch { /* no body or invalid JSON — use defaults */ }

  const results = {
    processed: 0,
    skipped: 0,
    errors: 0,
    errorDetails: [],
    topicsReconciled: 0
  };

  try {
    // ── Narrative backfill ──────────────────────────────────────
    const { data: readings } = await supabase
      .from('user_readings')
      .select('id, topic, draws, interpretation, mode, spread_type')
      .is('narrative_summary', null)
      .not('interpretation', 'is', null)
      .order('created_at', { ascending: false })
      .limit(batchSize);

    for (const reading of (readings || [])) {
      try {
        const result = await generateNarrative(reading);

        if (!result) {
          results.skipped++;
          continue;
        }

        const { error: updateError } = await supabase
          .from('user_readings')
          .update({
            narrative_summary: result.narrativeSummary,
            hashtags: result.hashtags
          })
          .eq('id', reading.id);

        if (updateError) {
          results.errors++;
          results.errorDetails.push(`${reading.id}: ${updateError.message}`);
        } else {
          results.processed++;
        }
      } catch (err) {
        results.errors++;
        results.errorDetails.push(`${reading.id}: ${err.message}`);
      }

      // Small delay between Haiku calls
      await new Promise(r => setTimeout(r, 200));
    }

    // ── Topic reading count reconciliation ─────────────────────
    if (reconcileTopics) {
      // Get all topics
      const { data: topics } = await supabase
        .from('user_topics')
        .select('id, user_id, reading_count');

      for (const topic of (topics || [])) {
        // Count actual readings for this topic
        const { count } = await supabase
          .from('user_readings')
          .select('id', { count: 'exact', head: true })
          .eq('topic_id', topic.id)
          .eq('user_id', topic.user_id);

        const actualCount = count || 0;
        if (actualCount !== topic.reading_count) {
          await supabase
            .from('user_topics')
            .update({ reading_count: actualCount })
            .eq('id', topic.id);
          results.topicsReconciled++;
        }
      }
    }

    // Check remaining
    const { count: remaining } = await supabase
      .from('user_readings')
      .select('id', { count: 'exact', head: true })
      .is('narrative_summary', null)
      .not('interpretation', 'is', null);

    return Response.json({
      success: true,
      ...results,
      remaining,
      done: remaining === 0
    });
  } catch (err) {
    return Response.json({ success: false, error: err.message, ...results }, { status: 500 });
  }
}
