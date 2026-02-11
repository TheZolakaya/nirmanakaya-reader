// /app/api/user/context/route.js
// Builds compact user context block for prompt injection
// Called before each reading to give the AI awareness of the user's journey
// Extended: personal context injection + auto-extraction from conversations

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
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

/**
 * Extract personal facts from conversation messages using Haiku.
 * Returns array of {fact, category} or empty array on failure.
 */
async function extractPersonalFacts(userMessages) {
  if (!userMessages || userMessages.length === 0) return [];

  const combinedText = userMessages.join('\n\n');
  // Skip if very short — unlikely to contain personal info
  if (combinedText.length < 30) return [];

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `Extract personal facts the user revealed about themselves in these messages. Only extract concrete, specific facts — not opinions about readings or vague statements.

Return a JSON array: [{"fact": "string", "category": "string"}]
Categories: identity, life_situation, active_projects, self_knowledge, relationship_to_system

If no personal facts are present, return an empty array: []

USER MESSAGES:
${combinedText}

Respond with ONLY the JSON array, no other text.`
      }]
    });

    const text = response.content[0]?.text?.trim();
    if (!text || text === '[]') return [];

    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) return [];

    const validCategories = ['identity', 'life_situation', 'active_projects', 'self_knowledge', 'relationship_to_system'];
    return parsed.filter(f =>
      f.fact && typeof f.fact === 'string' &&
      f.category && validCategories.includes(f.category)
    );
  } catch (err) {
    console.error('Personal fact extraction error:', err);
    return [];
  }
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

    // Fetch profile for user level + account age + personalization toggle
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_level, created_at, personalization_enabled')
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

    // ── Personal context (if personalization enabled) ──
    let personalFacts = null;
    if (profile?.personalization_enabled) {
      // Fetch existing facts
      const { data: facts } = await supabase
        .from('user_profile_context')
        .select('fact, category')
        .eq('user_id', user.id)
        .eq('archived', false)
        .order('created_at', { ascending: false })
        .limit(10);

      personalFacts = facts || [];

      // Auto-extraction: check for unprocessed conversations (non-blocking, best-effort)
      try {
        // Get IDs of readings we've already scanned
        const { data: scannedIds } = await supabase
          .from('user_profile_context')
          .select('source_reading_id')
          .eq('user_id', user.id)
          .eq('source', 'auto')
          .not('source_reading_id', 'is', null);

        const scannedSet = new Set((scannedIds || []).map(r => r.source_reading_id));

        // Find recent readings with conversation data that haven't been scanned
        const { data: readingsWithConversations } = await supabase
          .from('user_readings')
          .select('id, interpretation')
          .eq('user_id', user.id)
          .gte('created_at', thirtyDaysAgo.toISOString())
          .order('created_at', { ascending: false })
          .limit(10);

        const unscanned = (readingsWithConversations || []).filter(r => {
          if (scannedSet.has(r.id)) return false;
          const interp = r.interpretation;
          // Check for follow-up messages or context conversations
          const hasFollowUps = interp?.synthesis?._followUpMessages?.length > 0;
          const hasContext = interp?.synthesis?._expansions &&
            Object.values(interp.synthesis._expansions).some(exp => exp?.context?.length > 0);
          return hasFollowUps || hasContext;
        }).slice(0, 3); // Cap at 3 per request

        // Extract from unscanned conversations
        for (const reading of unscanned) {
          const interp = reading.interpretation;
          const userMessages = [];

          // Extract user messages from follow-ups
          const followUps = interp?.synthesis?._followUpMessages || [];
          for (const msg of followUps) {
            if (msg.role === 'user') userMessages.push(msg.content);
          }

          // Extract user messages from context conversations
          const expansions = interp?.synthesis?._expansions || {};
          for (const exp of Object.values(expansions)) {
            for (const turn of (exp?.context || [])) {
              if (turn.role === 'user') userMessages.push(turn.content);
            }
          }

          if (userMessages.length > 0) {
            const extracted = await extractPersonalFacts(userMessages);

            if (extracted.length > 0) {
              // Insert extracted facts
              const inserts = extracted.map(f => ({
                user_id: user.id,
                fact: f.fact,
                category: f.category,
                source: 'auto',
                source_reading_id: reading.id
              }));
              await supabase.from('user_profile_context').insert(inserts);

              // Add to current facts list
              personalFacts = [...extracted, ...personalFacts].slice(0, 10);
            } else {
              // Mark as scanned even if no facts found (insert a placeholder to prevent re-scanning)
              await supabase.from('user_profile_context').insert({
                user_id: user.id,
                fact: '__scanned__',
                category: 'identity',
                source: 'auto',
                source_reading_id: reading.id,
                archived: true // Immediately archived — just a scan marker
              });
            }
          }
        }

        // Filter out any scan markers from the facts list
        personalFacts = personalFacts.filter(f => f.fact !== '__scanned__');
      } catch (extractErr) {
        // Auto-extraction is best-effort — don't block context generation
        console.error('Auto-extraction error:', extractErr);
      }
    }

    const stats = buildBadgeStats(allReadings || []);

    const contextBlock = buildUserContextBlock(
      stats,
      currentDraws,
      recentReadings || [],
      topicData,
      profile,
      personalFacts
    );

    return Response.json({ success: true, contextBlock });
  } catch (err) {
    // On error, return empty context (reading still works without it)
    console.error('Context build error:', err);
    return Response.json({ contextBlock: '' });
  }
}
