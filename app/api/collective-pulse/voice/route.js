// /app/api/collective-pulse/voice/route.js
// On-demand voice variant generation for Collective Pulse
// Reads existing card draws and re-interprets with a different voice preset
// Results are cached in the DB after first generation

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import {
  STATUSES,
  getComponent,
  getFullCorrection,
  getCorrectionText,
  getCorrectionTargetId,
  getMonitor,
  ARCHETYPES,
  buildFullCollectiveSystemPrompt,
  buildFullCollectiveUserMessage,
  PULSE_VOICE_PRESETS
} from '../../../../lib/index.js';

const client = new Anthropic();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Rebuild card data from stored draw IDs (same as route.js buildCardData)
function rebuildCardData(transientId, positionId, statusId, correctionTargetId) {
  const component = getComponent(transientId);
  const status = STATUSES[statusId];
  const position = ARCHETYPES[positionId];

  let correction = null;
  if (statusId !== 1 && correctionTargetId != null) {
    const correctionTarget = getComponent(correctionTargetId);
    correction = {
      target: correctionTarget?.name || 'Unknown',
      targetId: correctionTargetId,
      type: statusId === 2 ? 'DIAGONAL' : statusId === 3 ? 'VERTICAL' : 'REDUCTION',
      via: getCorrectionText(getFullCorrection(transientId, statusId), component)
    };
  }

  return {
    transient: {
      id: transientId,
      name: component.name,
      traditional: component.traditional,
      house: component.house,
      channel: component.channel,
      description: component.description
    },
    position: {
      id: positionId,
      name: position.name,
      traditional: position.traditional,
      house: position.house,
      channel: position.channel
    },
    status: {
      id: statusId,
      name: status.name,
      prefix: status.prefix || 'Balanced'
    },
    correction,
    correctionTargetId,
    signature: `${status.prefix || 'Balanced'} ${component.name} in ${position.name}`
  };
}

// GET ?date=YYYY-MM-DD&monitor=power&voice=analyst
// Returns cached voice variant or generates on-demand
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const monitorId = searchParams.get('monitor');
  const voiceKey = searchParams.get('voice');

  if (!date || !monitorId || !voiceKey) {
    return Response.json({
      error: 'Required params: date, monitor, voice',
      example: '?date=2026-01-29&monitor=power&voice=analyst'
    }, { status: 400 });
  }

  const voicePreset = PULSE_VOICE_PRESETS[voiceKey];
  if (!voicePreset) {
    return Response.json({
      error: `Unknown voice: ${voiceKey}`,
      available: Object.keys(PULSE_VOICE_PRESETS)
    }, { status: 400 });
  }

  const monitor = getMonitor(monitorId);
  if (!monitor) {
    return Response.json({ error: `Unknown monitor: ${monitorId}` }, { status: 400 });
  }

  try {
    // Check if this voice variant already exists in DB
    const { data: existing } = await supabase
      .from('collective_readings')
      .select('*')
      .eq('reading_date', date)
      .eq('monitor', monitorId)
      .eq('voice', voiceKey)
      .single();

    if (existing) {
      return Response.json({
        success: true,
        cached: true,
        reading: {
          signature: existing.signature,
          interpretation: existing.interpretation,
          transient_id: existing.transient_id,
          position_id: existing.position_id,
          status_id: existing.status_id,
          correction_target_id: existing.correction_target_id,
          throughline: existing.throughline,
          voice: existing.voice
        }
      });
    }

    // Not cached — get the default reading to extract card draws
    const { data: defaultReading, error: fetchErr } = await supabase
      .from('collective_readings')
      .select('*')
      .eq('reading_date', date)
      .eq('monitor', monitorId)
      .eq('voice', 'default')
      .single();

    if (fetchErr || !defaultReading) {
      return Response.json({
        error: `No default reading found for ${monitorId} on ${date}`,
        detail: fetchErr?.message
      }, { status: 404 });
    }

    // Rebuild card data from the stored draw
    const card = rebuildCardData(
      defaultReading.transient_id,
      defaultReading.position_id,
      defaultReading.status_id,
      defaultReading.correction_target_id
    );

    // Generate voiced interpretation using the same card draws
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

    const interpretation = response.content[0].text;
    const tokensUsed = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);

    // Cache in DB
    const { error: storeErr } = await supabase
      .from('collective_readings')
      .upsert({
        reading_date: date,
        reading_time: new Date().toISOString(),
        monitor: monitorId,
        voice: voiceKey,
        transient_id: defaultReading.transient_id,
        position_id: defaultReading.position_id,
        status_id: defaultReading.status_id,
        correction_target_id: defaultReading.correction_target_id,
        signature: defaultReading.signature,
        interpretation,
        model: 'claude-sonnet-4-20250514',
        tokens_used: tokensUsed
      }, {
        onConflict: 'reading_date,monitor,voice'
      });

    if (storeErr) {
      console.error('Failed to cache voice variant:', storeErr);
      // Still return the generated reading even if caching fails
    }

    return Response.json({
      success: true,
      cached: false,
      generated: true,
      reading: {
        signature: defaultReading.signature,
        interpretation,
        transient_id: defaultReading.transient_id,
        position_id: defaultReading.position_id,
        status_id: defaultReading.status_id,
        correction_target_id: defaultReading.correction_target_id,
        voice: voiceKey
      }
    });

  } catch (error) {
    console.error('Voice variant error:', error);
    return Response.json({
      success: false,
      error: error.message || 'Failed to generate voice variant'
    }, { status: 500 });
  }
}
