// /app/api/collective-pulse/route.js
// Cron endpoint for daily collective consciousness readings
// Generates readings for all 5 monitors and stores them in Supabase
// Call via Vercel cron or external scheduler with CRON_SECRET

// Allow up to 5 minutes for full voice pre-generation (5 defaults + throughline + 25 voices)
export const maxDuration = 300;

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
  PULSE_VOICE_PRESETS,
  buildDailyCollectiveSystemPrompt,
  buildDailyCollectiveUserMessage,
  DAILY_THROUGHLINE_SYSTEM_PROMPT
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

// Re-interpret an existing card draw with a different voice preset
async function generateVoicedReading(monitorId, card, draw, voicePreset) {
  const monitor = getMonitor(monitorId);
  if (!monitor) throw new Error(`Unknown monitor: ${monitorId}`);

  const systemPrompt = buildFullCollectiveSystemPrompt(monitorId, voicePreset);
  const userMessage = buildFullCollectiveUserMessage(
    monitor.question,
    card,
    monitorId
  );

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

    // Check for force parameter and optional targetDate (for backfill)
    let forceGenerate = false;
    let targetDate = null;
    try {
      const body = await request.clone().json().catch(() => ({}));
      forceGenerate = body?.force === true;
      targetDate = body?.targetDate || null; // YYYY-MM-DD for backfill
    } catch (e) { /* no body or not JSON */ }

    // Frequency gating: check pulse_settings to see if enough time has elapsed
    // Skip gating for backfill (targetDate) or forced generation
    if (!forceGenerate && !targetDate) {
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

    const today = targetDate || new Date().toISOString().split('T')[0]; // YYYY-MM-DD (or backfill date)
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

    // Pre-generate daily voice variants (week-normalized, trend-aware)
    let dailyResults = [];
    if (allReadings.length > 0) {
      try {
        console.log('Generating daily voice variants (week-normalized)...');
        // Fetch last 7 days of readings for trend normalization
        const weekStart = new Date(today + 'T12:00:00');
        weekStart.setDate(weekStart.getDate() - 7);
        const weekStartStr = weekStart.toISOString().split('T')[0];
        const { data: weekReadings } = await supabase
          .from('collective_readings')
          .select('reading_date, monitor, signature, status_id')
          .eq('voice', 'default')
          .gte('reading_date', weekStartStr)
          .lt('reading_date', today)
          .order('reading_date', { ascending: false });

        // Group by monitor: { global: [{date, signature, status_name}, ...], ... }
        const weekByMonitor = {};
        if (weekReadings) {
          for (const wr of weekReadings) {
            if (!weekByMonitor[wr.monitor]) weekByMonitor[wr.monitor] = [];
            weekByMonitor[wr.monitor].push({
              date: wr.reading_date,
              signature: wr.signature,
              status_name: STATUSES[wr.status_id]?.name || ''
            });
          }
        }

        for (const reading of allReadings) {
          try {
            const priorReadings = weekByMonitor[reading.monitor] || [];
            const systemPrompt = buildDailyCollectiveSystemPrompt(reading.monitor, priorReadings);
            const userMessage = buildDailyCollectiveUserMessage(
              getMonitor(reading.monitor).question,
              reading.card,
              reading.monitor,
              priorReadings
            );
            const response = await client.messages.create({
              model: 'claude-sonnet-4-20250514',
              max_tokens: 200,
              system: systemPrompt,
              messages: [{ role: 'user', content: userMessage }]
            });
            const dailyReading = {
              ...reading,
              interpretation: response.content[0].text,
              usage: {
                input_tokens: response.usage?.input_tokens,
                output_tokens: response.usage?.output_tokens
              }
            };
            await storeReading(dailyReading, today, 'daily');
            dailyResults.push({ monitor: reading.monitor, success: true });
            await new Promise(resolve => setTimeout(resolve, 300));
          } catch (err) {
            console.error(`Daily voice ${reading.monitor} failed:`, err.message);
            dailyResults.push({ monitor: reading.monitor, success: false, error: err.message });
          }
        }

        // Generate daily throughline (2 sentences, week-aware)
        if (dailyResults.filter(r => r.success).length === 5) {
          try {
            const { data: dailyReadings } = await supabase
              .from('collective_readings')
              .select('monitor, signature, interpretation')
              .eq('reading_date', today)
              .eq('voice', 'daily');

            if (dailyReadings && dailyReadings.length === 5) {
              const monitorSummaries = dailyReadings.map(r => {
                const m = getMonitor(r.monitor);
                return `${m.publicName || m.name}: ${r.signature}\n${r.interpretation}`;
              }).join('\n\n');

              // Build week trend summary for throughline
              const weekStatusSummary = Object.entries(weekByMonitor)
                .map(([mon, readings]) => {
                  const m = getMonitor(mon);
                  const statuses = readings.map(r => r.status_name).join(' → ');
                  return `${m?.publicName || mon}: ${statuses}`;
                }).join('\n');
              const weekContext = weekStatusSummary ? `\nWEEK TREND (status progression, newest first):\n${weekStatusSummary}\n` : '';

              const dailyThroughlineResponse = await client.messages.create({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 200,
                system: DAILY_THROUGHLINE_SYSTEM_PROMPT,
                messages: [{ role: 'user', content: `Here are today's five Collective Pulse readings. Write a 2-sentence throughline that normalizes today against the week's arc.${weekContext}\n${monitorSummaries}` }]
              });
              const dailyThroughlineText = dailyThroughlineResponse.content[0].text;

              // Store daily throughline on the daily global row
              await supabase
                .from('collective_readings')
                .update({ throughline: dailyThroughlineText })
                .eq('reading_date', today)
                .eq('monitor', 'global')
                .eq('voice', 'daily');

              console.log('Daily throughline generated');
            }
          } catch (err) {
            console.error('Daily throughline failed:', err.message);
          }
        }
        console.log(`Daily voice: ${dailyResults.filter(r => r.success).length}/5 ok`);
      } catch (err) {
        console.error('Daily voice generation failed:', err);
      }
    }

    // Pre-generate all voice variants if enabled in pulse_settings
    let voiceResults = [];
    let voiceErrors = [];
    if (allReadings.length > 0) {
      let preGenVoices = false;
      try {
        const { data: pgSettings } = await supabase
          .from('pulse_settings')
          .select('pre_generate_voices')
          .limit(1)
          .single();
        preGenVoices = pgSettings?.pre_generate_voices === true;
      } catch (e) {
        // column/table may not exist yet
      }

      if (preGenVoices) {
        const voiceKeys = Object.keys(PULSE_VOICE_PRESETS);
        console.log(`Pre-generating ${voiceKeys.length} voice variants × ${allReadings.length} monitors...`);

        // Process one voice at a time, but parallelize all 5 monitors within each voice
        for (const voiceKey of voiceKeys) {
          const voicePreset = PULSE_VOICE_PRESETS[voiceKey];
          console.log(`  Generating voice: ${voiceKey} (${allReadings.length} monitors in parallel)...`);

          const monitorPromises = allReadings.map(async (reading) => {
            try {
              const voiced = await generateVoicedReading(
                reading.monitor,
                reading.card,
                reading.draw,
                voicePreset
              );
              await storeReading(voiced, today, voiceKey);
              return { monitor: reading.monitor, voice: voiceKey, success: true };
            } catch (err) {
              console.error(`Voice ${voiceKey}/${reading.monitor} failed:`, err.message);
              return { monitor: reading.monitor, voice: voiceKey, success: false, error: err.message };
            }
          });

          const batchResults = await Promise.all(monitorPromises);
          for (const r of batchResults) {
            if (r.success) {
              voiceResults.push(r);
            } else {
              voiceErrors.push(r);
            }
          }
          console.log(`  Voice ${voiceKey}: ${batchResults.filter(r => r.success).length}/5 ok`);

          // Brief pause between voice batches
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        console.log(`Voice pre-generation done: ${voiceResults.length} ok, ${voiceErrors.length} failed`);
      }
    }

    // Update last_generated_at in pulse_settings (skip for backfill)
    if (results.length > 0 && !targetDate) {
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
      daily: dailyResults.length > 0 ? {
        generated: dailyResults.filter(r => r.success).length,
        failed: dailyResults.filter(r => !r.success).length
      } : undefined,
      voices: voiceResults.length > 0 ? {
        generated: voiceResults.length,
        failed: voiceErrors.length,
        errors: voiceErrors.length > 0 ? voiceErrors : undefined
      } : undefined,
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
