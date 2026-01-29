// /app/api/collective-pulse/route.js
// Cron endpoint for daily collective consciousness readings
// Generates readings for all 5 monitors and stores them in Supabase
// Call via Vercel cron or external scheduler with CRON_SECRET

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { randomBytes } from 'crypto';
import {
  ARCHETYPES,
  STATUSES,
  getComponent,
  getFullCorrection,
  getCorrectionText,
  getCorrectionTargetId,
  getAllMonitors,
  getMonitor,
  MONITORS,
  FAST_COLLECTIVE_SYSTEM_PROMPT,
  buildFastCollectiveUserMessage,
  buildFullCollectiveSystemPrompt,
  buildFullCollectiveUserMessage,
  THROUGHLINE_SYSTEM_PROMPT,
  PULSE_VOICE_PRESETS
} from '../../../lib/index.js';

const client = new Anthropic();

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Generate a single draw with crypto randomness
function generateSingleDraw() {
  const transientBytes = randomBytes(1);
  const transient = transientBytes[0] % 78;
  
  const positionBytes = randomBytes(1);
  const position = positionBytes[0] % 22;
  
  const statusBytes = randomBytes(1);
  const status = (statusBytes[0] % 4) + 1;
  
  return { transient, position, status };
}

// Build card data from draw
function buildCardData(draw) {
  const component = getComponent(draw.transient);
  const status = STATUSES[draw.status];
  const position = ARCHETYPES[draw.position];

  let correction = null;
  let correctionTargetId = null;
  
  if (draw.status !== 1) {
    const fullCorrection = getFullCorrection(draw.transient, draw.status);
    const correctionTarget = getComponent(getCorrectionTargetId(fullCorrection, component));
    correctionTargetId = getCorrectionTargetId(fullCorrection, component);
    correction = {
      target: correctionTarget?.name || 'Unknown',
      targetId: correctionTargetId,
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
      channel: component.channel,
      description: component.description
    },
    position: {
      id: draw.position,
      name: position.name,
      traditional: position.traditional,
      house: position.house,
      channel: position.channel
    },
    status: {
      id: draw.status,
      name: status.name,
      prefix: status.prefix || 'Balanced'
    },
    correction,
    correctionTargetId,
    signature: `${status.prefix || 'Balanced'} ${component.name} in ${position.name}`
  };
}

// Generate a collective reading for a specific monitor (full mode v2)
async function generateMonitorReading(monitorId, voicePreset = null) {
  const monitor = getMonitor(monitorId);
  if (!monitor) {
    throw new Error(`Unknown monitor: ${monitorId}`);
  }

  // Generate the draw
  const draw = generateSingleDraw();
  const card = buildCardData(draw);

  // Build the full collective prompt (v2: 5-8 sentence interpretations)
  const systemPrompt = buildFullCollectiveSystemPrompt(monitorId, voicePreset);
  const userMessage = buildFullCollectiveUserMessage(
    monitor.question,
    card,
    monitorId
  );

  // Call Anthropic for interpretation
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }]
  });

  return {
    monitor: monitorId,
    monitorInfo: monitor,
    draw,
    card,
    interpretation: response.content[0].text,
    usage: {
      input_tokens: response.usage?.input_tokens,
      output_tokens: response.usage?.output_tokens
    }
  };
}

// Store reading in Supabase (v2: supports voice + reading_time columns)
async function storeReading(reading, readingDate, voice = 'default') {
  const row = {
    reading_date: readingDate,
    monitor: reading.monitor,
    voice: voice,
    transient_id: reading.draw.transient,
    position_id: reading.draw.position,
    status_id: reading.draw.status,
    correction_target_id: reading.card.correctionTargetId,
    signature: reading.card.signature,
    interpretation: reading.interpretation,
    model: 'claude-sonnet-4-20250514',
    tokens_used: (reading.usage?.input_tokens || 0) + (reading.usage?.output_tokens || 0)
  };

  // Include reading_time if the column exists (v2 schema)
  try {
    row.reading_time = new Date().toISOString();
  } catch (e) { /* column may not exist yet */ }

  const { error } = await supabase
    .from('collective_readings')
    .upsert(row, {
      onConflict: 'reading_date,monitor,voice'
    });

  if (error) {
    // Fallback to v1 conflict key if v2 constraint doesn't exist yet
    if (error.message?.includes('collective_readings_date_monitor_voice_key')) {
      const { error: err2 } = await supabase
        .from('collective_readings')
        .upsert(row, { onConflict: 'reading_date,monitor' });
      if (err2) {
        console.error('Error storing reading (v1 fallback):', err2);
        throw err2;
      }
      return;
    }
    console.error('Error storing reading:', error);
    throw error;
  }
}

// Generate throughline synthesis across all 5 monitors (v2)
async function generateThroughline(allReadings, readingDate) {
  const monitorSummaries = allReadings.map(r => {
    const m = getMonitor(r.monitor);
    return `${m.publicName || m.name} (${m.emoji}): ${r.card.signature}\n${r.interpretation}`;
  }).join('\n\n---\n\n');

  const userMessage = `Here are today's five Collective Pulse readings. Synthesize them into one throughline.

${monitorSummaries}

Write a 4-6 sentence throughline paragraph that captures the overall pattern across all five monitors.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    system: THROUGHLINE_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }]
  });

  const throughlineText = response.content[0].text;

  // Store throughline on the global monitor row
  const { error } = await supabase
    .from('collective_readings')
    .update({ throughline: throughlineText })
    .eq('reading_date', readingDate)
    .eq('monitor', 'global')
    .eq('voice', 'default');

  // Fallback: try without voice filter if v2 schema not yet applied
  if (error) {
    await supabase
      .from('collective_readings')
      .update({ throughline: throughlineText })
      .eq('reading_date', readingDate)
      .eq('monitor', 'global');
  }

  return throughlineText;
}

// POST endpoint - generate all 5 monitor readings (v2: full mode + throughline)
export async function POST(request) {
  try {
    // Verify cron secret (supports both old CRON_SECRET and new NEXT_PUBLIC_CRON_SECRET)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.NEXT_PUBLIC_CRON_SECRET || process.env.CRON_SECRET;
    if (authHeader !== `Bearer ${cronSecret}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check for force parameter (admin Generate Now bypasses frequency gate)
    let forceGenerate = false;
    try {
      const body = await request.clone().json().catch(() => ({}));
      forceGenerate = body?.force === true;
    } catch (e) { /* no body or not JSON */ }

    // Frequency gating: check pulse_settings to see if enough time has elapsed
    if (!forceGenerate) {
      try {
        const { data: settings } = await supabase
          .from('pulse_settings')
          .select('*')
          .limit(1)
          .single();

        if (settings) {
          // Check auto_generate flag
          if (settings.auto_generate === false) {
            return Response.json({
              success: false,
              skipped: true,
              reason: 'Auto-generate is disabled'
            });
          }

          // Check frequency interval
          if (settings.last_generated_at) {
            const lastGen = new Date(settings.last_generated_at);
            const now = new Date();
            const hoursSince = (now - lastGen) / (1000 * 60 * 60);

            const frequencyHours = {
              'hourly': 1,
              '6hour': 6,
              'daily': 24,
              'weekly': 168
            };
            const requiredHours = frequencyHours[settings.frequency] || 24;

            if (hoursSince < requiredHours) {
              return Response.json({
                success: false,
                skipped: true,
                reason: `Frequency gate: ${settings.frequency}, last generated ${Math.round(hoursSince)}h ago, next in ${Math.round(requiredHours - hoursSince)}h`
              });
            }
          }
        }
      } catch (e) {
        // pulse_settings table may not exist yet - continue with generation
        console.log('Frequency gate check skipped (table may not exist):', e.message);
      }
    }

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const monitors = ['global', 'power', 'heart', 'mind', 'body'];
    const results = [];
    const allReadings = []; // Full reading objects for throughline
    const errors = [];

    for (const monitorId of monitors) {
      try {
        console.log(`Generating reading for ${monitorId}...`);
        const reading = await generateMonitorReading(monitorId);

        // Store in database
        await storeReading(reading, today);

        allReadings.push(reading);
        results.push({
          monitor: monitorId,
          signature: reading.card.signature,
          interpretation: reading.interpretation,
          success: true
        });

        // Small delay between API calls to be respectful
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        console.error(`Error generating ${monitorId} reading:`, err);
        errors.push({ monitor: monitorId, error: err.message });
      }
    }

    // Purge cached voice variants so they regenerate from new card draws
    if (results.length > 0) {
      try {
        const { error: purgeErr } = await supabase
          .from('collective_readings')
          .delete()
          .eq('reading_date', today)
          .neq('voice', 'default');
        if (purgeErr) {
          console.log('Voice cache purge failed (non-critical):', purgeErr.message);
        } else {
          console.log('Purged cached voice variants for', today);
        }
      } catch (e) {
        console.log('Voice cache purge skipped:', e.message);
      }
    }

    // Generate throughline if all 5 monitors succeeded (v2)
    let throughline = null;
    if (allReadings.length === 5) {
      try {
        console.log('Generating throughline synthesis...');
        throughline = await generateThroughline(allReadings, today);
        console.log('Throughline generated successfully');
      } catch (err) {
        console.error('Throughline generation failed:', err);
        errors.push({ monitor: 'throughline', error: err.message });
      }
    }

    // Update last_generated_at in pulse_settings
    if (results.length > 0) {
      try {
        await supabase
          .from('pulse_settings')
          .update({ last_generated_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('singleton', true);
      } catch (e) {
        console.log('Failed to update last_generated_at (table may not exist):', e.message);
      }
    }

    return Response.json({
      success: true,
      date: today,
      readings: results,
      throughline,
      errors: errors.length > 0 ? errors : undefined,
      totalGenerated: results.length,
      totalFailed: errors.length
    });

  } catch (error) {
    console.error('Collective pulse error:', error);
    return Response.json({
      success: false,
      error: error.message || 'Failed to generate collective pulse'
    }, { status: 500 });
  }
}

// GET endpoint - retrieve readings (v2: supports voice filter + throughline)
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const monitor = searchParams.get('monitor');
  const voice = searchParams.get('voice') || 'default';
  const days = parseInt(searchParams.get('days')) || 7;

  // If no params, return documentation
  if (!date && !monitor) {
    return Response.json({
      service: 'Collective Pulse API',
      version: '2.0.0',
      description: 'Daily collective consciousness readings for the 5 Monitors',
      monitors: Object.fromEntries(
        getAllMonitors().map(m => [m.id, { emoji: m.emoji, name: m.name, publicName: m.publicName, house: m.house }])
      ),
      endpoints: {
        'GET ?date=YYYY-MM-DD': 'Get all readings for a specific date',
        'GET ?date=YYYY-MM-DD&voice=analyst': 'Get readings for a specific voice',
        'GET ?monitor=global&days=7': 'Get last N days for a specific monitor',
        'GET ?days=7': 'Get all readings for last N days',
        'POST (with CRON_SECRET)': 'Generate today\'s readings (cron job)'
      },
      voices: ['default', 'friend', 'analyst', 'scientist', 'mentor', 'oracle'],
      schedule: 'Readings generated daily at 06:00 UTC',
      guardrails: {
        rule1: 'CLIMATE, NOT WEATHER: Describe pressure, not predict events',
        rule2: 'STATE, NOT DIRECTIVE: Frame as state, never command',
        rule3: 'ARCHITECTURE ONLY: Patterns, not prescriptions',
        rule4: 'The map reflects. People decide.'
      }
    });
  }

  try {
    let query = supabase
      .from('collective_readings')
      .select('*')
      .order('reading_date', { ascending: false });

    if (date) {
      query = query.eq('reading_date', date);
    } else {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      query = query.gte('reading_date', startDate.toISOString().split('T')[0]);
    }

    if (monitor) {
      query = query.eq('monitor', monitor);
    }

    // Filter by voice if the column exists (v2 schema)
    // For trends (multi-day), always use default voice
    if (date) {
      query = query.eq('voice', voice);
    } else {
      query = query.eq('voice', 'default');
    }

    const { data, error } = await query;

    if (error) {
      // If voice column doesn't exist yet, retry without filter
      if (error.message?.includes('voice')) {
        const { data: fallbackData, error: fallbackErr } = await supabase
          .from('collective_readings')
          .select('*')
          .order('reading_date', { ascending: false })
          .eq('reading_date', date || new Date().toISOString().split('T')[0]);

        if (fallbackErr) throw fallbackErr;
        return buildGroupedResponse(fallbackData);
      }
      throw error;
    }

    return buildGroupedResponse(data);

  } catch (error) {
    console.error('Error fetching readings:', error);
    return Response.json({
      success: false,
      error: error.message || 'Failed to fetch readings'
    }, { status: 500 });
  }
}

// Helper to build grouped response from reading data
function buildGroupedResponse(data) {
  const grouped = data.reduce((acc, reading) => {
    const dateKey = reading.reading_date;
    if (!acc[dateKey]) {
      acc[dateKey] = {};
    }
    acc[dateKey][reading.monitor] = {
      signature: reading.signature,
      interpretation: reading.interpretation,
      transient_id: reading.transient_id,
      position_id: reading.position_id,
      status_id: reading.status_id,
      correction_target_id: reading.correction_target_id,
      throughline: reading.throughline || null,
      voice: reading.voice || 'default',
      created_at: reading.created_at
    };
    return acc;
  }, {});

  return Response.json({
    success: true,
    readings: grouped,
    count: data.length,
    dateRange: {
      from: data.length > 0 ? data[data.length - 1].reading_date : null,
      to: data.length > 0 ? data[0].reading_date : null
    }
  });
}
