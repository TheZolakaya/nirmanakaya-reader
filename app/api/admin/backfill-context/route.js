// /app/api/admin/backfill-context/route.js
// One-time backfill: extract personal facts from ALL existing readings with conversations.
// Admin-only. Run after migration 006.

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

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

async function extractPersonalFacts(userMessages) {
  if (!userMessages || userMessages.length === 0) return [];
  const combinedText = userMessages.join('\n\n');
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

    return parsed.filter(f =>
      f.fact && typeof f.fact === 'string' &&
      f.category && VALID_CATEGORIES.includes(f.category)
    );
  } catch (err) {
    console.error('Extraction error:', err.message);
    return [];
  }
}

export async function POST(request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // Admin check
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return Response.json({ error: 'Admin only' }, { status: 403 });
  }

  try {
    // Get all users with personalization enabled
    const { data: users } = await supabase
      .from('profiles')
      .select('id')
      .eq('personalization_enabled', true);

    const results = { users: 0, readingsScanned: 0, factsExtracted: 0, errors: 0 };

    for (const u of (users || [])) {
      results.users++;

      // Get IDs already scanned for this user
      const { data: scannedIds } = await supabase
        .from('user_profile_context')
        .select('source_reading_id')
        .eq('user_id', u.id)
        .eq('source', 'auto')
        .not('source_reading_id', 'is', null);

      const scannedSet = new Set((scannedIds || []).map(r => r.source_reading_id));

      // Get ALL readings with interpretation data (not just last 30 days)
      const { data: readings } = await supabase
        .from('user_readings')
        .select('id, interpretation')
        .eq('user_id', u.id)
        .order('created_at', { ascending: false });

      for (const reading of (readings || [])) {
        if (scannedSet.has(reading.id)) continue;

        const interp = reading.interpretation;
        const hasFollowUps = interp?.synthesis?._followUpMessages?.length > 0;
        const hasContext = interp?.synthesis?._expansions &&
          Object.values(interp.synthesis._expansions).some(exp => exp?.context?.length > 0);

        if (!hasFollowUps && !hasContext) continue;

        results.readingsScanned++;
        const userMessages = [];

        // Extract user messages from follow-ups
        for (const msg of (interp?.synthesis?._followUpMessages || [])) {
          if (msg.role === 'user') userMessages.push(msg.content);
        }

        // Extract user messages from context conversations
        for (const exp of Object.values(interp?.synthesis?._expansions || {})) {
          for (const turn of (exp?.context || [])) {
            if (turn.role === 'user') userMessages.push(turn.content);
          }
        }

        if (userMessages.length === 0) continue;

        try {
          const extracted = await extractPersonalFacts(userMessages);

          if (extracted.length > 0) {
            const inserts = extracted.map(f => ({
              user_id: u.id,
              fact: f.fact,
              category: f.category,
              source: 'auto',
              source_reading_id: reading.id
            }));
            await supabase.from('user_profile_context').insert(inserts);
            results.factsExtracted += extracted.length;
          } else {
            // Mark as scanned
            await supabase.from('user_profile_context').insert({
              user_id: u.id,
              fact: '__scanned__',
              category: 'identity',
              source: 'auto',
              source_reading_id: reading.id,
              archived: true
            });
          }
        } catch (err) {
          results.errors++;
          console.error(`Error extracting from reading ${reading.id}:`, err.message);
        }

        // Small delay between Haiku calls to be nice
        await new Promise(r => setTimeout(r, 200));
      }
    }

    return Response.json({ success: true, ...results });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
