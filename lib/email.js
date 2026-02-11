// === EMAIL SERVICE ===
// Resend-powered email functionality for Nirmanakaya

import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.EMAIL_FROM || 'ZolaKaya@nirmanakaya.com';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://nirmanakaya.com';
const SITE_NAME = 'Nirmanakaya';

// House colors for random selection
const BRAND_COLORS = [
  '#f59e0b', // Amber (Gestalt/Soul)
  '#a78bfa', // Violet (Spirit)
  '#22d3ee', // Cyan (Mind)
  '#f472b6', // Pink (Emotion)
  '#4ade80', // Green (Body)
];

function getRandomBrandColor() {
  return BRAND_COLORS[Math.floor(Math.random() * BRAND_COLORS.length)];
}

// === EMAIL TEMPLATES ===

function baseTemplate(content, unsubscribeSection = '') {
  const accentColor = getRandomBrandColor();
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${SITE_NAME}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #e4e4e7; background-color: #09090b; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .header { text-align: center; margin-bottom: 32px; }
    .header h1 { color: ${accentColor}; margin: 0; font-size: 24px; font-weight: 300; letter-spacing: 0.05em; }
    .header .tagline { color: #71717a; font-size: 12px; font-style: italic; margin-top: 8px; }
    .content { background-color: #18181b; border: 1px solid #27272a; border-radius: 8px; padding: 32px; margin-bottom: 24px; }
    .button { display: inline-block; background: ${accentColor}; color: #18181b; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; }
    .button:hover { opacity: 0.9; }
    .footer { text-align: center; font-size: 12px; color: #52525b; }
    .footer a { color: #71717a; }
    h2 { color: #fafafa; margin-top: 0; font-weight: 400; }
    h3 { color: #fafafa; font-weight: 400; }
    p { margin: 0 0 16px 0; }
    .card { background-color: #27272a; border: 1px solid #3f3f46; border-radius: 6px; padding: 16px; margin: 12px 0; }
    .card-name { color: ${accentColor}; font-weight: 600; }
    .card-status { color: #a1a1aa; font-size: 14px; }
    .divider { border: 0; border-top: 1px solid #3f3f46; margin: 24px 0; }
    .accent { color: ${accentColor}; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${SITE_NAME}</h1>
      <p class="tagline">discovered through the math of faith</p>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ${SITE_NAME}</p>
      ${unsubscribeSection}
    </div>
  </div>
</body>
</html>
  `.trim();
}

function unsubscribeLink(userId, prefType) {
  return `<p style="margin-top: 16px;"><a href="${SITE_URL}/api/email/unsubscribe?type=${prefType}&uid=${userId}">Unsubscribe from these emails</a></p>`;
}

// === WELCOME EMAIL ===

export async function sendWelcomeEmail(to, displayName, userId) {
  if (!resend) {
    console.warn('Email not configured - skipping welcome email');
    return { error: 'Email not configured' };
  }

  const content = `
    <h2>Welcome, ${displayName || 'Seeker'}</h2>
    <p>You've taken your first step into a consciousness architecture built on mathematical necessity — not interpretation.</p>
    <p>Here's what awaits:</p>
    <div class="card">
      <p><span class="accent"><strong>Readings</strong></span> — Ask a question and receive guidance through the 78 signatures of consciousness</p>
    </div>
    <div class="card">
      <p><span class="accent"><strong>Community</strong></span> — Connect with fellow seekers exploring the architecture</p>
    </div>
    <div class="card">
      <p><span class="accent"><strong>Your Journey</strong></span> — Save readings, track patterns, deepen your practice</p>
    </div>
    <hr class="divider">
    <p style="text-align: center;">
      <a href="${SITE_URL}" class="button">Begin Your Journey</a>
    </p>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: `${SITE_NAME} <${FROM_EMAIL}>`,
      to: [to],
      subject: `Welcome to ${SITE_NAME}`,
      html: baseTemplate(content, unsubscribeLink(userId, 'welcome'))
    });

    if (error) {
      console.error('Failed to send welcome email:', error);
      return { error };
    }

    return { data };
  } catch (err) {
    console.error('Welcome email error:', err);
    return { error: err.message };
  }
}

// === READING EMAIL ===

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
}

// Get the best available depth content from a depth object or string
function getDepthContent(depthObj) {
  if (!depthObj) return '';
  if (typeof depthObj === 'string') return depthObj;
  // Try depths in order: wade > surface > swim > deep
  return depthObj.wade || depthObj.surface || depthObj.swim || depthObj.deep || '';
}

// Status display helpers
const STATUS_NAMES = { 1: 'Balanced', 2: 'Too Much', 3: 'Too Little', 4: 'Unacknowledged' };
const STATUS_STYLES = {
  1: 'background:#064e3b;color:#6ee7b7;',
  2: 'background:#451a03;color:#fbbf24;',
  3: 'background:#0c4a6e;color:#38bdf8;',
  4: 'background:#2e1065;color:#a78bfa;'
};

export async function sendReadingEmail(to, reading, userId) {
  if (!resend) {
    console.warn('Email not configured - skipping reading email');
    return { error: 'Email not configured' };
  }

  const question = reading.question || 'Your Reading';
  const truncatedQuestion = question.length > 50 ? question.substring(0, 50) + '...' : question;
  const mode = reading.mode || 'reflect';
  const cards = reading.cards || [];
  const shareSlug = reading.share_slug;
  const isPublic = reading.is_public === true;
  const readingUserId = reading.user_id;

  // Build cards section with full interpretations
  let cardsHtml = '';
  cards.forEach((card, idx) => {
    const trans = card.transient || {};
    const cardName = trans.name || card.name || `Card ${idx + 1}`;
    const traditional = trans.traditional || '';
    const statusId = card.status || 1;
    const statusName = STATUS_NAMES[statusId] || 'Balanced';
    const statusStyle = STATUS_STYLES[statusId] || STATUS_STYLES[1];
    const interp = card.interpretation || {};

    // Get the best content for main interpretation
    const mainContent = getDepthContent(interp.wade) || getDepthContent(interp.surface) || getDepthContent(interp);

    cardsHtml += `
      <div class="card" style="margin-bottom:16px;">
        <div style="margin-bottom:8px;">
          <span class="card-name" style="font-size:16px;">${escapeHtml(cardName)}</span>
          ${traditional ? `<span style="color:#71717a;font-size:13px;"> &mdash; ${escapeHtml(traditional)}</span>` : ''}
        </div>
        <span style="display:inline-block;font-size:11px;padding:2px 8px;border-radius:12px;${statusStyle}">${statusName}</span>
        ${mainContent ? `<p style="color:#d4d4d8;font-size:14px;line-height:1.6;margin-top:12px;">${escapeHtml(mainContent)}</p>` : ''}
        ${interp.rebalancer ? `
          <div style="margin-top:12px;padding:12px;background:#022c22;border:1px solid #065f46;border-radius:6px;">
            <span style="display:inline-block;font-size:10px;color:#6ee7b7;background:#064e3b;padding:2px 6px;border-radius:8px;margin-bottom:6px;">Rebalancer</span>
            <p style="color:#a7f3d0;font-size:13px;line-height:1.6;">${escapeHtml(getDepthContent(interp.rebalancer))}</p>
          </div>
        ` : ''}
        ${interp.mirror ? `
          <div style="margin-top:12px;padding:12px;background:#083344;border:1px solid #155e75;border-radius:6px;">
            <span style="display:inline-block;font-size:10px;color:#67e8f9;background:#164e63;padding:2px 6px;border-radius:8px;margin-bottom:6px;">The Why</span>
            <p style="color:#a5f3fc;font-size:13px;font-style:italic;line-height:1.6;">${escapeHtml(getDepthContent(interp.mirror))}</p>
            ${interp.why ? `<p style="color:#cffafe;font-size:13px;line-height:1.6;margin-top:8px;">${escapeHtml(getDepthContent(interp.why))}</p>` : ''}
          </div>
        ` : ''}
      </div>
    `;
  });

  // Build synthesis section
  let synthesisHtml = '';
  if (reading.synthesis) {
    const synth = reading.synthesis;
    const summary = getDepthContent(synth.summary);
    const path = getDepthContent(synth.path);

    if (summary) {
      synthesisHtml += `
        <hr class="divider">
        <h3 style="color: #fafafa; margin-bottom: 12px;">Overview</h3>
        <p style="color: #d4d4d8; line-height: 1.6;">${escapeHtml(summary)}</p>
      `;
    }
    if (path) {
      synthesisHtml += `
        <hr class="divider">
        <div style="padding:16px;background:#064e3b33;border:1px solid #065f46;border-radius:8px;">
          <h3 style="color: #34d399; margin-bottom: 12px;">Path to Balance</h3>
          <p style="color: #d4d4d8; line-height: 1.6;">${escapeHtml(path)}</p>
        </div>
      `;
    }
  }

  // Build letter section
  let letterHtml = '';
  const letterContent = typeof reading.letter === 'string' ? reading.letter : getDepthContent(reading.letter);
  if (letterContent) {
    letterHtml = `
      <hr class="divider">
      <div style="padding:16px;background:#2e106533;border:1px solid #581c8766;border-radius:8px;">
        <h3 style="color: #c4b5fd; margin-bottom: 12px;">Letter</h3>
        <p style="color: #ddd6fe; font-style: italic; line-height: 1.6;">${escapeHtml(letterContent)}</p>
      </div>
    `;
  }

  // Link to full reading
  const viewLink = (isPublic && shareSlug)
    ? `${SITE_URL}/r/${shareSlug}`
    : (readingUserId ? `${SITE_URL}/?load=${reading.id}` : SITE_URL);

  const content = `
    <h2>Your Reading</h2>
    <p style="color: #a1a1aa; font-size: 14px; margin-bottom: 8px;">Mode: ${mode.charAt(0).toUpperCase() + mode.slice(1)}</p>
    <p style="font-size: 18px; color: #fafafa; margin-bottom: 24px; font-style: italic;">&ldquo;${escapeHtml(question)}&rdquo;</p>

    ${synthesisHtml}

    <h3 style="margin-top: 24px; margin-bottom: 12px;">Signatures</h3>
    ${cardsHtml || '<p style="color: #71717a;">No cards recorded</p>'}

    ${letterHtml}

    <hr class="divider">
    <p style="text-align: center;">
      <a href="${viewLink}" class="button">Open Full Reading</a>
    </p>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: `${SITE_NAME} <${FROM_EMAIL}>`,
      to: [to],
      subject: `Your Reading: ${truncatedQuestion}`,
      html: baseTemplate(content, unsubscribeLink(userId, 'readings'))
    });

    if (error) {
      console.error('Failed to send reading email:', error);
      return { error };
    }

    return { data };
  } catch (err) {
    console.error('Reading email error:', err);
    return { error: err.message };
  }
}

// === REPLY NOTIFICATION EMAIL ===

export async function sendReplyNotification(to, discussionTitle, replyContent, replyAuthor, discussionId, userId) {
  if (!resend) {
    console.warn('Email not configured - skipping reply notification');
    return { error: 'Email not configured' };
  }

  const truncatedTitle = discussionTitle.length > 50 ? discussionTitle.substring(0, 50) + '...' : discussionTitle;
  const truncatedContent = replyContent.length > 300 ? replyContent.substring(0, 300) + '...' : replyContent;

  const content = `
    <h2>New Reply to Your Discussion</h2>
    <p style="color: #a1a1aa; margin-bottom: 16px; font-style: italic;">"${discussionTitle}"</p>

    <div class="card">
      <p class="accent" style="font-weight: 600; margin-bottom: 8px;">${replyAuthor || 'Someone'} replied:</p>
      <p style="color: #d4d4d8; margin: 0;">${truncatedContent}</p>
    </div>

    <hr class="divider">
    <p style="text-align: center;">
      <a href="${SITE_URL}/hub/${discussionId}" class="button">View Discussion</a>
    </p>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: `${SITE_NAME} <${FROM_EMAIL}>`,
      to: [to],
      subject: `New reply: ${truncatedTitle}`,
      html: baseTemplate(content, unsubscribeLink(userId, 'replies'))
    });

    if (error) {
      console.error('Failed to send reply notification:', error);
      return { error };
    }

    return { data };
  } catch (err) {
    console.error('Reply notification error:', err);
    return { error: err.message };
  }
}

// === BROADCAST EMAIL ===

export async function sendBroadcast(subject, htmlBody, recipients) {
  if (!resend) {
    console.warn('Email not configured - skipping broadcast');
    return { error: 'Email not configured' };
  }

  if (!recipients || recipients.length === 0) {
    return { error: 'No recipients' };
  }

  // Resend batch API supports up to 100 emails per call
  const results = { sent: 0, failed: 0, errors: [] };
  const batchSize = 100;

  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);

    const emails = batch.map(recipient => ({
      from: `${SITE_NAME} <${FROM_EMAIL}>`,
      to: [recipient.email],
      subject: subject,
      html: baseTemplate(
        `${htmlBody}<hr class="divider"><p style="text-align: center;"><a href="${SITE_URL}" class="button">Visit ${SITE_NAME}</a></p>`,
        unsubscribeLink(recipient.id, 'updates')
      )
    }));

    try {
      const { data, error } = await resend.batch.send(emails);

      if (error) {
        results.failed += batch.length;
        results.errors.push(error);
      } else {
        results.sent += batch.length;
      }
    } catch (err) {
      results.failed += batch.length;
      results.errors.push(err.message);
    }
  }

  return { data: results };
}

// === AUTOMATED READING EMAIL ===

export async function sendAutomatedReadingEmail(to, reading, pulseData, userId) {
  if (!resend) {
    console.warn('Email not configured - skipping automated reading email');
    return { error: 'Email not configured' };
  }

  const topic = reading.topic || 'What wants to be seen?';
  // Build locus label from subjects array (or legacy fields)
  const subjects = Array.isArray(reading.locus_subjects) && reading.locus_subjects.length > 0
    ? reading.locus_subjects
    : [];
  const locusLabel = subjects.length > 0 ? ` (${subjects.join(', ')})` : '';
  const cardCount = reading.card_count || 1;
  const draws = reading.draws || [];
  const interpretation = reading.interpretation || {};
  const shareToken = reading.share_token;
  const readingId = reading.id;

  // Build cards section from draws
  let cardsHtml = '';
  draws.forEach((draw, idx) => {
    const cardName = draw.name || draw.signature || `Card ${idx + 1}`;
    const status = draw.statusName || 'Balanced';
    const interp = interpretation.cards?.[idx] || '';
    const interpText = typeof interp === 'string' ? interp : (interp.surface || interp.text || '');
    const escapedInterp = interpText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
    cardsHtml += `
      <div class="card">
        <span class="card-name">${cardName}</span>
        <span class="card-status"> — ${status}</span>
        ${escapedInterp ? `<p style="color: #d4d4d8; margin: 8px 0 0 0; font-size: 14px;">${escapedInterp}</p>` : ''}
      </div>
    `;
  });

  // Build path to balance / synthesis section
  let synthesisHtml = '';
  const pathText = interpretation.path || interpretation.synthesis || '';
  if (pathText) {
    const escaped = pathText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
    synthesisHtml = `
      <hr class="divider">
      <h3 style="color: #fafafa; margin-bottom: 12px;">Path to Balance</h3>
      <p style="color: #d4d4d8; font-size: 14px;">${escaped}</p>
    `;
  }

  // Build Collective Pulse section
  let pulseHtml = '';
  if (pulseData && pulseData.readings) {
    const monitors = ['global', 'power', 'heart', 'mind', 'body'];
    const monitorMeta = {
      global: { emoji: '🌍', name: 'Global Field' },
      power: { emoji: '🔥', name: 'Governance & Power' },
      heart: { emoji: '💧', name: 'Culture & Belonging' },
      mind: { emoji: '🌬️', name: 'Systems & Technology' },
      body: { emoji: '🪨', name: 'Earth & Health' }
    };

    let monitorCards = '';
    for (const m of monitors) {
      const r = pulseData.readings[m];
      if (!r) continue;
      const meta = monitorMeta[m];
      const sig = r.signature || '';
      const interp = (r.interpretation || '').substring(0, 200);
      const escapedInterp = interp
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');
      monitorCards += `
        <div class="card">
          <span class="card-name">${meta.emoji} ${meta.name}</span>
          <span class="card-status"> — ${sig}</span>
          ${escapedInterp ? `<p style="color: #a1a1aa; margin: 6px 0 0 0; font-size: 13px;">${escapedInterp}${interp.length >= 200 ? '...' : ''}</p>` : ''}
        </div>
      `;
    }

    const throughline = pulseData.throughline || '';
    const escapedThroughline = throughline
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');

    pulseHtml = `
      <hr class="divider">
      <h3 style="color: #fafafa; margin-bottom: 8px;">Today's Collective Pulse</h3>
      ${escapedThroughline ? `<p style="color: #d4d4d8; font-size: 14px; margin-bottom: 16px; font-style: italic;">${escapedThroughline}</p>` : ''}
      ${monitorCards}
      <p style="text-align: center; margin-top: 16px;">
        <a href="${SITE_URL}/pulse" style="color: #71717a; font-size: 13px;">View full Collective Pulse →</a>
      </p>
    `;
  }

  // Build action buttons
  const viewLink = shareToken
    ? `${SITE_URL}/reading/${shareToken}`
    : (readingId ? `${SITE_URL}/my-readings/${readingId}` : `${SITE_URL}/my-readings`);

  const content = `
    <h2>Your Reading${locusLabel}</h2>
    <p style="color: #a1a1aa; font-size: 14px; margin-bottom: 8px;">${cardCount} card${cardCount > 1 ? 's' : ''} drawn</p>
    <p style="font-size: 16px; color: #fafafa; margin-bottom: 24px; font-style: italic;">"${topic}"</p>

    ${cardsHtml || '<p style="color: #71717a;">Your reading is ready</p>'}

    ${synthesisHtml}

    <hr class="divider">
    <p style="text-align: center;">
      <a href="${viewLink}" class="button">View Full Reading</a>
    </p>

    ${pulseHtml}
  `;

  try {
    const unsub = unsubscribeLink(userId, 'email-readings');
    const prefs = `<p style="margin-top: 8px;"><a href="${SITE_URL}/my-readings?settings=open" style="color: #71717a; font-size: 12px;">Manage email preferences</a></p>`;
    const { data, error } = await resend.emails.send({
      from: `${SITE_NAME} <${FROM_EMAIL}>`,
      to: [to],
      subject: `Your Reading: ${topic.length > 40 ? topic.substring(0, 40) + '...' : topic}`,
      html: baseTemplate(content, `${unsub}${prefs}`)
    });

    if (error) {
      console.error('Failed to send automated reading email:', error);
      return { error };
    }

    return { data };
  } catch (err) {
    console.error('Automated reading email error:', err);
    return { error: err.message };
  }
}

// === TEST EMAIL ===

export async function sendTestEmail(to) {
  if (!resend) {
    return { error: 'Email not configured - check RESEND_API_KEY' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `${SITE_NAME} <${FROM_EMAIL}>`,
      to: [to],
      subject: `Test Email from ${SITE_NAME}`,
      html: baseTemplate(`
        <h2>Test Email</h2>
        <p>If you're seeing this, email is working correctly!</p>
        <p style="color: #71717a;">Sent at: ${new Date().toISOString()}</p>
      `)
    });

    if (error) {
      return { error };
    }

    return { data };
  } catch (err) {
    return { error: err.message };
  }
}
