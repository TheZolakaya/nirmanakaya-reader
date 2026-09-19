// app/api/admin/broadcast/route.js
// Admin endpoint to send broadcast emails to users

import { createClient } from '@supabase/supabase-js';
import { sendBroadcast } from '../../../../lib/email.js';
import { getUsersForBroadcast } from '../../../../lib/supabase.js';
import { requireAdmin } from '../../../../lib/adminAuth.js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;


export async function POST(request) {
  try {
    // Identity from the verified session, never from the body.
    const gate = await requireAdmin(request);
    if (!gate.ok) return gate.response;

    const { subject, body, includeAll } = await request.json();

    if (!subject || !body) {
      return Response.json({ error: 'subject and body required' }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return Response.json({ error: 'Server not configured' }, { status: 500 });
    }

    // Get users - includeAll=true for F&F mode (all users with email)
    const { data: recipients, error: recipientsError } = await getUsersForBroadcast(supabaseAdmin, includeAll);

    if (recipientsError) {
      return Response.json({ error: 'Failed to fetch recipients' }, { status: 500 });
    }

    if (!recipients || recipients.length === 0) {
      return Response.json({ error: includeAll ? 'No users with email found' : 'No recipients opted in' }, { status: 400 });
    }

    // Convert markdown-ish body to basic HTML
    const htmlBody = body
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');

    const wrappedHtml = `<p>${htmlBody}</p>`;

    // Send broadcast
    const { data, error } = await sendBroadcast(subject, wrappedHtml, recipients);

    if (error) {
      console.error('Broadcast failed:', error);
      return Response.json({ error: 'Failed to send broadcast' }, { status: 500 });
    }

    return Response.json({
      success: true,
      sent: data.sent,
      failed: data.failed,
      totalRecipients: recipients.length
    });

  } catch (err) {
    console.error('Broadcast error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// GET endpoint to fetch recipient counts
export async function GET(request) {
  // Identity from the verified session, never from the query string.
  const gate = await requireAdmin(request);
  if (!gate.ok) return gate.response;

  if (!supabaseAdmin) {
    return Response.json({ error: 'Server not configured' }, { status: 500 });
  }

  // Get both counts
  const { data: optedIn, error: optedInError } = await getUsersForBroadcast(supabaseAdmin, false);
  const { data: allUsers, error: allError } = await getUsersForBroadcast(supabaseAdmin, true);

  if (optedInError || allError) {
    return Response.json({ error: 'Failed to fetch counts' }, { status: 500 });
  }

  return Response.json({
    subscriberCount: optedIn?.length || 0,
    allUsersCount: allUsers?.length || 0
  });
}
