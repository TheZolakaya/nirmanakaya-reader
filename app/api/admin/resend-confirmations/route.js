// app/api/admin/resend-confirmations/route.js
// Admin endpoint to resend confirmation emails to unconfirmed users

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.EMAIL_FROM || 'ZolaKaya@nirmanakaya.com';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://nirmanakaya.com';
const SITE_NAME = 'Nirmanakaya Reader';

const ADMIN_EMAILS = ['chriscrilly@gmail.com'];

// GET - List unconfirmed users
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const adminEmail = searchParams.get('adminEmail');

  if (!adminEmail || !ADMIN_EMAILS.includes(adminEmail.toLowerCase())) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  if (!supabaseAdmin) {
    return Response.json({ error: 'Server not configured' }, { status: 500 });
  }

  try {
    // Get all users from auth.users
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    // Filter to unconfirmed users (email_confirmed_at is null)
    const unconfirmed = users.filter(u => !u.email_confirmed_at && u.email);
    const confirmed = users.filter(u => u.email_confirmed_at);

    return Response.json({
      unconfirmedCount: unconfirmed.length,
      confirmedCount: confirmed.length,
      totalUsers: users.length,
      unconfirmedUsers: unconfirmed.map(u => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        confirmation_sent_at: u.confirmation_sent_at,
        confirmation_resent_at: u.user_metadata?.confirmation_resent_at || null,
        provider: u.app_metadata?.provider || 'email'
      }))
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// POST - Resend confirmation to specific user or all unconfirmed
export async function POST(request) {
  try {
    const { adminEmail, userId, resendAll } = await request.json();

    if (!adminEmail || !ADMIN_EMAILS.includes(adminEmail.toLowerCase())) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!supabaseAdmin) {
      return Response.json({ error: 'Server not configured' }, { status: 500 });
    }

    // Get unconfirmed users
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      return Response.json({ error: listError.message }, { status: 500 });
    }

    let targetUsers;
    if (resendAll) {
      // All unconfirmed users
      targetUsers = users.filter(u => !u.email_confirmed_at && u.email);
    } else if (userId) {
      // Specific user
      targetUsers = users.filter(u => u.id === userId && !u.email_confirmed_at);
    } else {
      return Response.json({ error: 'Specify userId or resendAll' }, { status: 400 });
    }

    if (targetUsers.length === 0) {
      return Response.json({ error: 'No unconfirmed users found', sent: 0, failed: 0 });
    }

    if (!resend) {
      return Response.json({ error: 'Email service not configured' }, { status: 500 });
    }

    // Resend confirmations
    const results = { sent: 0, failed: 0, errors: [] };

    for (const user of targetUsers) {
      try {
        // Generate a new confirmation link via Supabase
        const { data, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'signup',
          email: user.email,
          options: {
            redirectTo: `${SITE_URL}/auth/callback`
          }
        });

        if (linkError) {
          results.failed++;
          results.errors.push({ email: user.email, error: linkError.message });
          continue;
        }

        // Extract the confirmation link from the response
        const confirmationLink = data?.properties?.action_link;
        if (!confirmationLink) {
          results.failed++;
          results.errors.push({ email: user.email, error: 'No confirmation link generated' });
          continue;
        }

        // Send the email via Resend (from zolakaya@nirmanakaya.com)
        const { error: emailError } = await resend.emails.send({
          from: `${SITE_NAME} <${FROM_EMAIL}>`,
          to: [user.email],
          subject: `Confirm your ${SITE_NAME} email`,
          html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm Your Email</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #e4e4e7; background-color: #09090b; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .header { text-align: center; margin-bottom: 32px; }
    .header h1 { color: #a78bfa; margin: 0; font-size: 24px; }
    .content { background-color: #18181b; border-radius: 8px; padding: 32px; margin-bottom: 24px; }
    .button { display: inline-block; background-color: #7c3aed; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; }
    .footer { text-align: center; font-size: 12px; color: #71717a; }
    h2 { color: #fafafa; margin-top: 0; }
    p { margin: 0 0 16px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${SITE_NAME}</h1>
    </div>
    <div class="content">
      <h2>Confirm Your Email</h2>
      <p>Click the button below to confirm your email address and activate your account.</p>
      <p style="text-align: center; margin: 24px 0;">
        <a href="${confirmationLink}" class="button">Confirm Email</a>
      </p>
      <p style="color: #71717a; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:</p>
      <p style="color: #a78bfa; font-size: 12px; word-break: break-all;">${confirmationLink}</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ${SITE_NAME}</p>
    </div>
  </div>
</body>
</html>
          `.trim()
        });

        if (emailError) {
          results.failed++;
          results.errors.push({ email: user.email, error: emailError.message });
        } else {
          results.sent++;
          // Track when we resent the confirmation
          await supabaseAdmin.auth.admin.updateUserById(user.id, {
            user_metadata: {
              ...user.user_metadata,
              confirmation_resent_at: new Date().toISOString()
            }
          });
        }
      } catch (err) {
        results.failed++;
        results.errors.push({ email: user.email, error: err.message });
      }
    }

    return Response.json({
      success: true,
      ...results,
      totalTargeted: targetUsers.length
    });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
