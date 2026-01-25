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

  // Build cards section
  let cardsHtml = '';
  cards.forEach((card, idx) => {
    const cardName = card.name || card.transient?.name || `Card ${idx + 1}`;
    const status = card.status?.name || card.statusName || 'Balanced';
    cardsHtml += `
      <div class="card">
        <span class="card-name">${cardName}</span>
        <span class="card-status"> — ${status}</span>
      </div>
    `;
  });

  // Build synthesis section - include full content, no truncation
  let synthesisHtml = '';
  if (reading.synthesis) {
    const synthesis = typeof reading.synthesis === 'string'
      ? reading.synthesis
      : reading.synthesis.summary || reading.synthesis.path || '';
    if (synthesis) {
      // Escape HTML characters to prevent XSS and preserve formatting
      const escapedSynthesis = synthesis
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');
      synthesisHtml = `
        <hr class="divider">
        <h3 style="color: #fafafa; margin-bottom: 12px;">Synthesis</h3>
        <p style="color: #d4d4d8;">${escapedSynthesis}</p>
      `;
    }
  }

  // Link to public reading if available, otherwise to user's profile
  const viewLink = (isPublic && shareSlug)
    ? `${SITE_URL}/r/${shareSlug}`
    : (readingUserId ? `${SITE_URL}/profile/${readingUserId}` : SITE_URL);

  const content = `
    <h2>Your Reading</h2>
    <p style="color: #a1a1aa; font-size: 14px; margin-bottom: 8px;">Mode: ${mode.charAt(0).toUpperCase() + mode.slice(1)}</p>
    <p style="font-size: 18px; color: #fafafa; margin-bottom: 24px; font-style: italic;">"${question}"</p>

    <h3 style="margin-bottom: 12px;">Cards Drawn</h3>
    ${cardsHtml || '<p style="color: #71717a;">No cards recorded</p>'}

    ${synthesisHtml}

    <hr class="divider">
    <p style="text-align: center;">
      <a href="${viewLink}" class="button">${(isPublic && shareSlug) ? 'View Full Reading' : 'View Your Readings'}</a>
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
