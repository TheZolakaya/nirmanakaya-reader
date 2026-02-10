// /app/api/email-readings/route.js
// Cron endpoint: generate and send personalized readings to opted-in users
// Schedule: runs after Collective Pulse (e.g., 7am UTC)

import { randomBytes } from 'crypto';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import {
  ARCHETYPES,
  STATUSES,
  getComponent,
  getFullCorrection,
  getCorrectionText,
  getCorrectionTargetId,
  formatDrawForAI,
  BASE_SYSTEM,
  FORMAT_INSTRUCTIONS,
  buildStancePrompt,
  VOICE_LETTER_TONE,
  parseReadingResponse,
  buildModeHeader,
  WHY_MOMENT_PROMPT,
  buildReadingTeleologicalPrompt,
  filterProhibitedTerms,
  postProcessModeTransitions,
  buildLocusInjection,
  locusToSubjects
} from '../../../lib/index.js';
import { sendAutomatedReadingEmail } from '../../../lib/email.js';

export const maxDuration = 300; // 5 minutes for batch processing

const client = new Anthropic();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Voice preset → stance mapping for email readings
const VOICE_STANCES = {
  friend: { complexity: 'friend', voice: 'warm', focus: 'feel', density: 'clear', scope: 'here', seriousness: 'grounded' },
  guide: { complexity: 'guide', voice: 'warm', focus: 'see', density: 'rich', scope: 'connected', seriousness: 'grounded' },
  teacher: { complexity: 'teacher', voice: 'direct', focus: 'see', density: 'clear', scope: 'patterned', seriousness: 'grounded' },
  mentor: { complexity: 'mentor', voice: 'grounded', focus: 'see', density: 'rich', scope: 'patterned', seriousness: 'grounded' },
  master: { complexity: 'master', voice: 'grounded', focus: 'build', density: 'luminous', scope: 'resonant', seriousness: 'grounded' },
  wonder: { complexity: 'friend', voice: 'wonder', focus: 'feel', density: 'clear', scope: 'here', seriousness: 'grounded' },
  warm: { complexity: 'friend', voice: 'warm', focus: 'feel', density: 'clear', scope: 'here', seriousness: 'grounded' },
  direct: { complexity: 'friend', voice: 'direct', focus: 'do', density: 'essential', scope: 'here', seriousness: 'grounded' },
  grounded: { complexity: 'friend', voice: 'grounded', focus: 'build', density: 'clear', scope: 'here', seriousness: 'grounded' }
};

// Server-side draw generation (same as external-reading)
function generateServerDraws(count) {
  const draws = [];
  const usedTransients = new Set();
  const usedPositions = new Set();

  for (let i = 0; i < count; i++) {
    let transient;
    do {
      const bytes = randomBytes(1);
      transient = bytes[0] % 78;
    } while (usedTransients.has(transient));
    usedTransients.add(transient);

    let position;
    do {
      const bytes = randomBytes(1);
      position = bytes[0] % 22;
    } while (usedPositions.has(position));
    usedPositions.add(position);

    const statusBytes = randomBytes(1);
    const status = (statusBytes[0] % 4) + 1;

    draws.push({ position, transient, status });
  }

  return draws;
}

// Build card data from a draw
function buildCardData(draw) {
  const component = getComponent(draw.transient);
  const status = STATUSES[draw.status];
  const position = ARCHETYPES[draw.position];

  let correction = null;
  if (draw.status !== 1) {
    const fullCorrection = getFullCorrection(draw.transient, draw.status);
    const correctionTarget = getComponent(getCorrectionTargetId(fullCorrection, component));
    correction = {
      target: correctionTarget?.name || 'Unknown',
      targetId: getCorrectionTargetId(fullCorrection, component),
      type: draw.status === 2 ? 'DIAGONAL' : draw.status === 3 ? 'VERTICAL' : 'REDUCTION',
      via: getCorrectionText(fullCorrection, component)
    };
  }

  return {
    transient: {
      id: draw.transient,
      name: component.name,
      traditional: component.traditional,
      house: component.house,
      channel: component.channel
    },
    position: {
      id: draw.position,
      name: position.name,
      traditional: position.traditional,
      house: position.house
    },
    status: {
      id: draw.status,
      name: status.name,
      prefix: status.prefix || 'Balanced'
    },
    correction,
    signature: `${status.prefix || 'Balanced'} ${component.name} in ${position.name}`,
    name: component.name,
    statusName: status.name
  };
}

// Generate a reading for a user with their preferences
async function generateUserReading(userPrefs) {
  const topic = userPrefs.topic_mode === 'custom' && userPrefs.custom_topic
    ? userPrefs.custom_topic
    : 'What wants to be seen today?';
  const cardCount = Math.min(Math.max(1, userPrefs.card_count || 1), 3);
  const voiceKey = userPrefs.voice || 'friend';
  const stance = VOICE_STANCES[voiceKey] || VOICE_STANCES.friend;
  // Locus subjects — prefer new array, fall back to old category+detail
  const locusSubjects = Array.isArray(userPrefs.locus_subjects) && userPrefs.locus_subjects.length > 0
    ? userPrefs.locus_subjects
    : locusToSubjects(userPrefs.locus || 'individual', userPrefs.locus_detail || '');

  // Generate draws
  const draws = generateServerDraws(cardCount);
  const cards = draws.map(buildCardData);

  // Build system prompt
  const stancePrompt = buildStancePrompt(
    stance.complexity, stance.voice, stance.focus,
    stance.density, stance.scope, stance.seriousness
  );
  const letterTone = VOICE_LETTER_TONE[stance.voice] || 'warm and direct';
  const modeHeader = buildModeHeader('discover');

  let locusInjection = '';
  if (locusSubjects.length > 0) {
    locusInjection = buildLocusInjection(locusSubjects);
    if (locusInjection) locusInjection += '\n\n';
  }

  const systemPrompt = `${locusInjection}${modeHeader}\n\n${BASE_SYSTEM}\n\n${stancePrompt}\n\n${FORMAT_INSTRUCTIONS}\n\n${WHY_MOMENT_PROMPT}\n\nLetter tone for this stance: ${letterTone}`;

  // Build user message
  const drawText = formatDrawForAI(draws, 'discover', 'external', false);
  const spreadName = `${cardCount}-Card Discover`;
  const teleologicalPrompt = buildReadingTeleologicalPrompt(draws);

  const userMessage = `QUESTION: "${topic}"\n\nTHE ENCOUNTER (${spreadName}):\n\n${drawText}\n\n${teleologicalPrompt}\n\nRespond using the exact section markers: [SUMMARY], [CARD:1]${cardCount > 1 ? ', [CARD:2]' : ''}${cardCount > 2 ? ', [CARD:3]' : ''}, [CORRECTION:N] for each imbalanced signature, [PATH] (if 2+ imbalanced), [WORDS_TO_WHYS], [LETTER]. Each marker on its own line.`;

  // Call Anthropic
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2500,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }]
  });

  const rawReading = response.content[0].text;
  const modeProcessed = postProcessModeTransitions(rawReading, 'discover', false);
  const filteredReading = filterProhibitedTerms(modeProcessed);
  const parsed = parseReadingResponse(filteredReading, draws);

  return {
    topic,
    locusSubjects,
    cardCount,
    voice: voiceKey,
    draws: draws.map((d, i) => ({
      ...d,
      ...cards[i]
    })),
    cards,
    interpretation: {
      raw: filteredReading,
      parsed: {
        summary: parsed.summary,
        cards: parsed.cards,
        rebalancerSummary: parsed.rebalancerSummary,
        wordsToWhys: parsed.wordsToWhys,
        letter: parsed.letter,
        path: parsed.corrections?.length > 0 ? (parsed.rebalancerSummary || '') : ''
      }
    }
  };
}

// Fetch today's Collective Pulse for email inclusion
async function fetchTodaysPulse() {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('collective_readings')
    .select('*')
    .eq('reading_date', today)
    .eq('voice', 'default');

  if (error || !data || data.length === 0) {
    // Try without voice filter (v1 schema)
    const { data: fallback } = await supabase
      .from('collective_readings')
      .select('*')
      .eq('reading_date', today);
    if (!fallback || fallback.length === 0) return null;
    return formatPulseData(fallback);
  }

  return formatPulseData(data);
}

function formatPulseData(data) {
  const readings = {};
  let throughline = null;

  for (const row of data) {
    readings[row.monitor] = {
      signature: row.signature,
      interpretation: row.interpretation,
      transient_id: row.transient_id,
      position_id: row.position_id,
      status_id: row.status_id
    };
    if (row.monitor === 'global' && row.throughline) {
      throughline = row.throughline;
    }
  }

  return { readings, throughline };
}

export async function POST(request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.NEXT_PUBLIC_CRON_SECRET || process.env.CRON_SECRET;
    if (authHeader !== `Bearer ${cronSecret}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check for force parameter (admin trigger)
    const body = await request.json().catch(() => ({}));
    const force = body.force === true;

    // Check email settings
    const { data: settings } = await supabase
      .from('email_settings')
      .select('*')
      .limit(1)
      .single();

    if (!settings) {
      return Response.json({ error: 'Email settings not configured' }, { status: 500 });
    }

    if (!settings.email_system_enabled && !force) {
      return Response.json({ success: true, message: 'Email system disabled', sent: 0 });
    }

    // Check schedule (unless forced)
    if (!force) {
      const now = new Date();
      const utcHour = now.getUTCHours();
      const utcDay = now.getUTCDay();

      // Only send at the configured hour
      if (utcHour !== settings.send_hour) {
        return Response.json({ success: true, message: `Not send hour (current: ${utcHour}, configured: ${settings.send_hour})`, sent: 0 });
      }

      // For weekly, only send on configured day
      if (settings.email_frequency === 'weekly' && utcDay !== settings.send_day) {
        return Response.json({ success: true, message: `Not send day (current: ${utcDay}, configured: ${settings.send_day})`, sent: 0 });
      }
    }

    // Fetch all users with email enabled
    const { data: prefs, error: prefsError } = await supabase
      .from('user_email_preferences')
      .select('*')
      .eq('email_readings_enabled', true);

    if (prefsError) {
      console.error('Error fetching email preferences:', prefsError);
      return Response.json({ error: prefsError.message }, { status: 500 });
    }

    // Also get users who haven't set preferences (default ON)
    const { data: allUsers } = await supabase
      .from('auth.users')
      .select('id, email')
      .limit(1000);

    // Build user list: users with explicit prefs + users with no prefs (default enabled)
    // Use service role to query auth.users
    const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const allAuthUsers = authUsers?.users || [];

    const prefsByUserId = {};
    (prefs || []).forEach(p => { prefsByUserId[p.user_id] = p; });

    // Filter to eligible users
    const eligibleUsers = [];
    for (const user of allAuthUsers) {
      if (!user.email) continue;
      const userPref = prefsByUserId[user.id];

      // Skip users who explicitly disabled
      if (userPref && !userPref.email_readings_enabled) continue;

      // Check admin override
      if (userPref?.admin_override === 'force_off') continue;

      eligibleUsers.push({
        id: user.id,
        email: user.email,
        prefs: userPref || {
          // Defaults for users without explicit preferences
          email_readings_enabled: true,
          topic_mode: 'general',
          custom_topic: null,
          locus_subjects: [],
          card_count: settings.default_card_count || 1,
          voice: settings.default_voice || 'friend'
        }
      });
    }

    // Also include force_on users who may have disabled
    for (const user of allAuthUsers) {
      if (!user.email) continue;
      const userPref = prefsByUserId[user.id];
      if (userPref?.admin_override === 'force_on' && !eligibleUsers.find(u => u.id === user.id)) {
        eligibleUsers.push({
          id: user.id,
          email: user.email,
          prefs: userPref
        });
      }
    }

    if (eligibleUsers.length === 0) {
      return Response.json({ success: true, message: 'No eligible users', sent: 0 });
    }

    // Fetch today's Collective Pulse for inclusion
    const pulseData = await fetchTodaysPulse();

    // Generate and send readings for each user
    let sent = 0;
    let failed = 0;
    const errors = [];

    // Process in batches of 5 to avoid overwhelming the API
    const batchSize = 5;
    for (let i = 0; i < eligibleUsers.length; i += batchSize) {
      const batch = eligibleUsers.slice(i, i + batchSize);

      const results = await Promise.allSettled(
        batch.map(async (user) => {
          try {
            // Generate personalized reading
            const reading = await generateUserReading(user.prefs);

            // Store in user_readings
            const { data: stored, error: storeError } = await supabase
              .from('user_readings')
              .insert({
                user_id: user.id,
                reading_type: 'automated',
                topic_mode: user.prefs.topic_mode || 'general',
                topic: reading.topic,
                locus_subjects: reading.locusSubjects,
                card_count: reading.cardCount,
                voice: reading.voice,
                draws: reading.draws,
                interpretation: reading.interpretation,
                is_public: false
              })
              .select('id, share_token')
              .single();

            if (storeError) {
              console.error(`Error storing reading for ${user.id}:`, storeError);
              throw storeError;
            }

            // Send email
            const emailResult = await sendAutomatedReadingEmail(
              user.email,
              {
                ...reading,
                id: stored.id,
                share_token: stored.share_token,
                card_count: reading.cardCount
              },
              pulseData,
              user.id
            );

            if (emailResult.error) {
              throw new Error(emailResult.error);
            }

            return { userId: user.id, readingId: stored.id };
          } catch (err) {
            throw new Error(`User ${user.id}: ${err.message}`);
          }
        })
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          sent++;
        } else {
          failed++;
          errors.push(result.reason?.message || 'Unknown error');
        }
      }
    }

    // Update email settings with send stats
    await supabase
      .from('email_settings')
      .update({
        last_send_at: new Date().toISOString(),
        last_send_count: sent,
        last_send_failed: failed,
        updated_at: new Date().toISOString()
      })
      .limit(1);

    return Response.json({
      success: true,
      sent,
      failed,
      total: eligibleUsers.length,
      errors: errors.slice(0, 10), // Cap error list
      pulse_included: !!pulseData
    });

  } catch (error) {
    console.error('Email readings cron error:', error);
    return Response.json({
      success: false,
      error: error.message || 'Failed to send email readings'
    }, { status: 500 });
  }
}

// GET endpoint for status/testing
export async function GET() {
  return Response.json({
    service: 'Email Readings Cron',
    description: 'Generates and sends personalized readings to opted-in users',
    schedule: 'Runs after Collective Pulse generation',
    method: 'POST with CRON_SECRET authorization',
    body: {
      force: 'boolean (optional) - bypass schedule check'
    }
  });
}
