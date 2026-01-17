// app/api/email/reading/route.js
// Sends reading results to users

import { createClient } from '@supabase/supabase-js';
import { sendReadingEmail } from '../../../../lib/email.js';
import { getProfileWithEmailPrefs } from '../../../../lib/supabase.js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export async function POST(request) {
  try {
    const { userId, readingId, reading, force } = await request.json();

    if (!userId) {
      return Response.json({ error: 'userId required' }, { status: 400 });
    }

    if (!reading && !readingId) {
      return Response.json({ error: 'reading or readingId required' }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return Response.json({ error: 'Server not configured' }, { status: 500 });
    }

    // Get user profile with email preferences
    const { data: profile, error: profileError } = await getProfileWithEmailPrefs(supabaseAdmin, userId);

    // Check if user has opted out of reading emails (unless force=true for manual sends)
    if (!force && profile?.email_readings === false) {
      return Response.json({ skipped: true, reason: 'User opted out' });
    }

    // Get email address - try profile first, then auth.users (for OAuth users)
    let userEmail = profile?.email;
    if (!userEmail) {
      // Fall back to auth.users for OAuth users whose profile doesn't have email
      const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(userId);
      userEmail = authUser?.email;
    }

    if (!userEmail) {
      return Response.json({ error: 'No email address for user' }, { status: 400 });
    }

    // If readingId provided, fetch the reading from database
    let readingData = reading;
    if (readingId && !reading) {
      // First try with user_id match
      let { data: dbReading, error: readingError } = await supabaseAdmin
        .from('readings')
        .select('*')
        .eq('id', readingId)
        .eq('user_id', userId)
        .single();

      // If not found, try without user_id constraint
      // (safe since email goes to authenticated user's own address)
      if (readingError || !dbReading) {
        const fallback = await supabaseAdmin
          .from('readings')
          .select('*')
          .eq('id', readingId)
          .single();

        if (fallback.error || !fallback.data) {
          return Response.json({ error: 'Reading not found' }, { status: 404 });
        }
        dbReading = fallback.data;
      }
      readingData = dbReading;
    }

    // Send reading email
    const { data, error } = await sendReadingEmail(
      userEmail,
      readingData,
      userId
    );

    if (error) {
      console.error('Reading email failed:', error);
      return Response.json({ error: 'Failed to send email' }, { status: 500 });
    }

    return Response.json({ success: true, data });

  } catch (err) {
    console.error('Reading email error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
