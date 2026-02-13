// === USER CONTEXT BUILDER ===
// Builds compact text block for prompt injection (~200-400 tokens)
// Injected into user message to preserve system prompt caching

import { ARCHETYPES, BOUNDS, AGENTS } from './archetypes.js';

const USER_LEVEL_NAMES = {
  0: 'First Contact',
  1: 'Explorer',
  2: 'Practitioner',
  3: 'Architect',
  4: 'Master'
};

// Get human name for a transient ID
function getSignatureName(transientId) {
  const id = Number(transientId);
  if (ARCHETYPES[id]) return ARCHETYPES[id].name;
  if (BOUNDS[id]) return BOUNDS[id].name;
  if (AGENTS[id]) return AGENTS[id].name;
  return `Signature ${id}`;
}

// Format duration between two dates as human string
function formatDuration(fromDate, toDate) {
  const days = Math.floor((toDate - fromDate) / (1000 * 60 * 60 * 24));
  if (days < 7) return `${days} day${days !== 1 ? 's' : ''}`;
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) !== 1 ? 's' : ''}`;
  const months = Math.floor(days / 30);
  return `${months} month${months !== 1 ? 's' : ''}`;
}

// Format status name
function statusName(s) {
  return { 1: 'Balanced', 2: 'Too Much', 3: 'Too Little', 4: 'Unacknowledged' }[s] || 'Unknown';
}

/**
 * Build the user context block for prompt injection.
 * Goes into the user message BEFORE the question.
 *
 * @param {object} stats - Output from buildBadgeStats()
 * @param {object[]} currentDraws - The current reading's draws [{transient, position, status}]
 * @param {object[]} recentReadings - Last 30 days of readings with draws + created_at + topic
 * @param {object|null} topicData - { label, readingCount, readings } if topic reading
 * @param {object|null} profile - { user_level, created_at }
 * @param {object[]|null} personalFacts - [{fact, category}] from user_profile_context
 * @returns {string} Context block text, or '' if insufficient data
 */
export function buildUserContextBlock(stats, currentDraws, recentReadings, topicData, profile, personalFacts) {
  if (!stats || stats.totalReadings === 0) return '';

  const lines = [];
  lines.push('=== READER CONTEXT ===');

  // ── Identity line ─────────────────────────────────────────────
  const readingNum = stats.totalReadings + 1; // This will be their Nth reading
  const levelName = profile ? USER_LEVEL_NAMES[profile.user_level] || '' : '';
  const accountAge = profile?.created_at
    ? formatDuration(new Date(profile.created_at), new Date())
    : null;

  let identityLine = `Reading #${readingNum}.`;
  if (accountAge) identityLine += ` ${accountAge} journey.`;
  if (levelName) identityLine += ` Level: ${levelName}.`;
  lines.push(identityLine);

  // ── Recurring signatures (last 30 days, 3+ appearances) ──────
  const recentCounts = {};
  const recentStatuses = {};
  for (const reading of recentReadings) {
    for (const draw of (reading.draws || [])) {
      const t = Number(draw.transient);
      recentCounts[t] = (recentCounts[t] || 0) + 1;
      if (!recentStatuses[t]) recentStatuses[t] = {};
      const s = Number(draw.status);
      recentStatuses[t][s] = (recentStatuses[t][s] || 0) + 1;
    }
  }

  const recurring = Object.entries(recentCounts)
    .filter(([, count]) => count >= 2)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  if (recurring.length > 0) {
    const recurringDesc = recurring.map(([tid, count]) => {
      const name = getSignatureName(tid);
      const statuses = recentStatuses[tid] || {};
      const statusParts = Object.entries(statuses)
        .map(([s, c]) => `${c}x ${statusName(Number(s))}`)
        .join(', ');
      return `${name} (${count}x last 30d: ${statusParts})`;
    }).join(', ');
    lines.push(`Recurring: ${recurringDesc}.`);
  }

  // ── Echo detection (current draws that appeared recently) ─────
  if (currentDraws?.length > 0) {
    const echoes = [];
    for (const draw of currentDraws) {
      const t = Number(draw.transient);
      if (recentCounts[t] && recentCounts[t] >= 1) {
        const name = getSignatureName(t);
        // Find when it last appeared
        let lastSeen = null;
        for (const reading of recentReadings) {
          if ((reading.draws || []).some(d => Number(d.transient) === t)) {
            lastSeen = reading.created_at;
            break; // recentReadings sorted DESC, so first match is most recent
          }
        }
        const daysAgo = lastSeen
          ? Math.floor((Date.now() - new Date(lastSeen).getTime()) / (1000 * 60 * 60 * 24))
          : null;
        const timeStr = daysAgo !== null
          ? (daysAgo === 0 ? 'earlier today' : `${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago`)
          : 'recently';
        echoes.push(`${name} appears AGAIN — last seen ${timeStr}`);
      }
    }
    if (echoes.length > 0) {
      lines.push(`Echo: ${echoes.join('; ')}.`);
    }
  }

  // ── House distribution ────────────────────────────────────────
  const houses = stats.houseDistribution;
  const totalHouseDraws = Object.values(houses).reduce((a, b) => a + b, 0);
  if (totalHouseDraws > 0) {
    const houseParts = ['Spirit', 'Mind', 'Emotion', 'Body', 'Gestalt']
      .map(h => `${h} ${Math.round((houses[h] / totalHouseDraws) * 100)}%`)
      .join(', ');
    lines.push(`Houses: ${houseParts}.`);
  }

  // ── Status distribution ───────────────────────────────────────
  const statuses = stats.statusDistribution;
  const totalStatusDraws = Object.values(statuses).reduce((a, b) => a + b, 0);
  if (totalStatusDraws > 0) {
    const statusParts = [
      `Balanced ${Math.round((statuses[1] / totalStatusDraws) * 100)}%`,
      `Too Much ${Math.round((statuses[2] / totalStatusDraws) * 100)}%`,
      `Too Little ${Math.round((statuses[3] / totalStatusDraws) * 100)}%`,
      `Unacknowledged ${Math.round((statuses[4] / totalStatusDraws) * 100)}%`
    ].join(', ');
    lines.push(`Status: ${statusParts}.`);
  }

  // ── Instruction to AI ─────────────────────────────────────────
  lines.push('Note patterns if relevant — do not force connections.');
  lines.push('=== END READER CONTEXT ===');

  // ── Topic context (appended if topic reading) ─────────────────
  if (topicData && topicData.readingCount >= 1) {
    lines.push('');
    lines.push(`=== TOPIC: "${topicData.label}" (reading #${topicData.readingCount + 1} on this topic) ===`);

    // Topic-specific recurring signatures
    const topicCounts = {};
    const topicStatuses = {};
    for (const reading of (topicData.readings || [])) {
      for (const draw of (reading.draws || [])) {
        const t = Number(draw.transient);
        topicCounts[t] = (topicCounts[t] || 0) + 1;
        if (!topicStatuses[t]) topicStatuses[t] = {};
        const s = Number(draw.status);
        topicStatuses[t][s] = (topicStatuses[t][s] || 0) + 1;
      }
    }

    const topicRecurring = Object.entries(topicCounts)
      .filter(([, count]) => count >= 2)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    if (topicRecurring.length > 0) {
      const topicDesc = topicRecurring.map(([tid, count]) => {
        const name = getSignatureName(tid);
        return `${name} ${count}x`;
      }).join(', ');
      lines.push(`On this topic: ${topicDesc}.`);
    }

    // Status trend for topic (compare first half vs second half)
    const topicReadings = topicData.readings || [];
    if (topicReadings.length >= 4) {
      const mid = Math.floor(topicReadings.length / 2);
      const earlyBalance = countBalanceRatio(topicReadings.slice(0, mid));
      const recentBalance = countBalanceRatio(topicReadings.slice(mid));

      if (recentBalance > earlyBalance + 10) {
        lines.push('Trend: shifting toward more Balanced (improving).');
      } else if (recentBalance < earlyBalance - 10) {
        lines.push('Trend: shifting away from Balance (more imbalance recently).');
      } else {
        lines.push('Trend: relatively stable balance ratio.');
      }
    }

    lines.push('=== END TOPIC ===');
  }

  // ── Personal context (if personalization enabled + facts exist) ──
  if (personalFacts && personalFacts.length > 0) {
    lines.push('');
    lines.push('=== PERSONAL CONTEXT ===');
    lines.push('The reader has shared these things about themselves:');
    // Cap at 10 facts, most recent first
    const capped = personalFacts.slice(0, 10);
    for (const f of capped) {
      lines.push(`- ${f.fact}`);
    }
    lines.push('Use this to ground your interpretation. Do not repeat these facts back — just let them shape how you read the signatures.');
    lines.push('=== END PERSONAL CONTEXT ===');
  }

  const result = lines.join('\n');

  // Hard cap: if over ~500 tokens (rough 4 chars/token), truncate
  if (result.length > 2000) {
    // Remove the less critical sections (house/status distribution)
    return lines
      .filter(l => !l.startsWith('Houses:') && !l.startsWith('Status:'))
      .join('\n');
  }

  return result;
}

// Helper: calculate balance ratio (% of Balanced draws) for a set of readings
function countBalanceRatio(readings) {
  let total = 0;
  let balanced = 0;
  for (const r of readings) {
    for (const d of (r.draws || [])) {
      total++;
      if (Number(d.status) === 1) balanced++;
    }
  }
  return total > 0 ? Math.round((balanced / total) * 100) : 0;
}
