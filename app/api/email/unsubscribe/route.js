// app/api/email/unsubscribe/route.js
// Handles unsubscribe requests from email links

import { createClient } from '@supabase/supabase-js';
import { unsubscribeByUserId } from '../../../../lib/supabase.js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export async function POST(request) {
  try {
    const { userId, prefType } = await request.json();

    if (!userId || !prefType) {
      return Response.json({ error: 'userId and prefType required' }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return Response.json({ error: 'Server not configured' }, { status: 500 });
    }

    const validTypes = ['welcome', 'readings', 'replies', 'updates'];
    if (!validTypes.includes(prefType)) {
      return Response.json({ error: 'Invalid preference type' }, { status: 400 });
    }

    const { error } = await unsubscribeByUserId(supabaseAdmin, userId, prefType);

    if (error) {
      console.error('Unsubscribe failed:', error);
      return Response.json({ error: 'Failed to unsubscribe' }, { status: 500 });
    }

    return Response.json({ success: true, message: `Unsubscribed from ${prefType} emails` });

  } catch (err) {
    console.error('Unsubscribe error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// Also support GET for direct link clicks
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('uid');
  const prefType = searchParams.get('type');

  if (!userId || !prefType) {
    return new Response('Missing parameters', { status: 400 });
  }

  if (!supabaseAdmin) {
    return new Response('Server not configured', { status: 500 });
  }

  const validTypes = ['welcome', 'readings', 'replies', 'updates'];
  if (!validTypes.includes(prefType)) {
    return new Response('Invalid preference type', { status: 400 });
  }

  const { error } = await unsubscribeByUserId(supabaseAdmin, userId, prefType);

  if (error) {
    return new Response('Failed to unsubscribe', { status: 500 });
  }

  // Return a simple HTML page confirming unsubscribe
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Unsubscribed</title>
  <style>
    body { font-family: -apple-system, sans-serif; background: #09090b; color: #e4e4e7; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .container { text-align: center; padding: 40px; }
    h1 { color: #a78bfa; }
    a { color: #7c3aed; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Unsubscribed</h1>
    <p>You've been unsubscribed from ${prefType} emails.</p>
    <p><a href="/">Return to Nirmanakaya Reader</a></p>
  </div>
</body>
</html>
  `;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  });
}
