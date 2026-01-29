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
  buildFastCollectiveUserMessage
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

// Generate a collective reading for a specific monitor
async function generateMonitorReading(monitorId) {
  const monitor = getMonitor(monitorId);
  if (!monitor) {
    throw new Error(`Unknown monitor: ${monitorId}`);
  }

  // Generate the draw
  const draw = generateSingleDraw();
  const card = buildCardData(draw);

  // Build the fast collective message
  const userMessage = buildFastCollectiveUserMessage(
    monitor.question,
    card,
    monitorId
  );

  // Call Anthropic for interpretation
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',  // Use Sonnet for collective readings
    max_tokens: 300,
    system: FAST_COLLECTIVE_SYSTEM_PROMPT,
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

// Store reading in Supabase
async function storeReading(reading, readingDate) {
  const { error } = await supabase
    .from('collective_readings')
    .upsert({
      reading_date: readingDate,
      monitor: reading.monitor,
      transient_id: reading.draw.transient,
      position_id: reading.draw.position,
      status_id: reading.draw.status,
      correction_target_id: reading.card.correctionTargetId,
      signature: reading.card.signature,
      interpretation: reading.interpretation,
      model: 'claude-sonnet-4-20250514',
      tokens_used: (reading.usage?.input_tokens || 0) + (reading.usage?.output_tokens || 0)
    }, {
      onConflict: 'reading_date,monitor'
    });

  if (error) {
    console.error('Error storing reading:', error);
    throw error;
  }
}

// POST endpoint - generate all 5 monitor readings
export async function POST(request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const monitors = ['global', 'power', 'heart', 'mind', 'body'];
    const results = [];
    const errors = [];

    for (const monitorId of monitors) {
      try {
        console.log(`Generating reading for ${monitorId}...`);
        const reading = await generateMonitorReading(monitorId);
        
        // Store in database
        await storeReading(reading, today);
        
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

    // Optional: Post to social media if configured
    if (process.env.AUTO_POST_SOCIAL === 'true' && results.length > 0) {
      // TODO: Implement social posting
      console.log('Social posting enabled but not yet implemented');
    }

    return Response.json({
      success: true,
      date: today,
      readings: results,
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

// GET endpoint - retrieve today's readings or documentation
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const monitor = searchParams.get('monitor');
  const days = parseInt(searchParams.get('days')) || 7;

  // If no params, return documentation
  if (!date && !monitor) {
    return Response.json({
      service: 'Collective Pulse API',
      version: '1.0.0',
      description: 'Daily collective consciousness readings for the 5 Monitors',
      monitors: Object.fromEntries(
        getAllMonitors().map(m => [m.id, { emoji: m.emoji, name: m.name, house: m.house }])
      ),
      endpoints: {
        'GET ?date=YYYY-MM-DD': 'Get all readings for a specific date',
        'GET ?monitor=global&days=7': 'Get last N days for a specific monitor',
        'GET ?days=7': 'Get all readings for last N days',
        'POST (with CRON_SECRET)': 'Generate today\'s readings (cron job)'
      },
      schedule: 'Readings generated daily at 06:00 UTC',
      guardrails: {
        rule1: 'CLIMATE, NOT WEATHER: Describe pressure, not predict events',
        rule2: 'STATE, NOT DIRECTIVE: Frame as state, never command',
        rule3: 'The map reflects. People decide.'
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

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // Group by date for easier consumption
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

  } catch (error) {
    console.error('Error fetching readings:', error);
    return Response.json({
      success: false,
      error: error.message || 'Failed to fetch readings'
    }, { status: 500 });
  }
}
