// app/api/email/reply-notify/route.js
// Sends notification when someone replies to a user's discussion

import { createClient } from '@supabase/supabase-js';
import { sendReplyNotification } from '../../../../lib/email.js';
import { getProfileWithEmailPrefs } from '../../../../lib/supabase.js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export async function POST(request) {
  try {
    const { discussionId, replyContent, replyAuthorId } = await request.json();

    if (!discussionId || !replyContent) {
      return Response.json({ error: 'discussionId and replyContent required' }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return Response.json({ error: 'Server not configured' }, { status: 500 });
    }

    // Get the discussion to find the owner
    const { data: discussion, error: discussionError } = await supabaseAdmin
      .from('discussions')
      .select('id, title, user_id')
      .eq('id', discussionId)
      .single();

    if (discussionError || !discussion) {
      return Response.json({ error: 'Discussion not found' }, { status: 404 });
    }

    // Don't notify if user is replying to their own discussion
    if (discussion.user_id === replyAuthorId) {
      return Response.json({ skipped: true, reason: 'Self-reply' });
    }

    // Get discussion owner's profile with email preferences
    const { data: ownerProfile, error: ownerError } = await getProfileWithEmailPrefs(
      supabaseAdmin,
      discussion.user_id
    );

    if (ownerError || !ownerProfile) {
      return Response.json({ error: 'Discussion owner not found' }, { status: 404 });
    }

    // Check if owner has opted out of reply notifications
    if (ownerProfile.email_replies === false) {
      return Response.json({ skipped: true, reason: 'User opted out' });
    }

    // Check if we have an email address
    if (!ownerProfile.email) {
      return Response.json({ error: 'No email address for user' }, { status: 400 });
    }

    // Get reply author's display name
    let replyAuthorName = 'Someone';
    if (replyAuthorId) {
      const { data: authorProfile } = await supabaseAdmin
        .from('profiles')
        .select('display_name')
        .eq('id', replyAuthorId)
        .single();

      if (authorProfile?.display_name) {
        replyAuthorName = authorProfile.display_name;
      }
    }

    // Send notification email
    const { data, error } = await sendReplyNotification(
      ownerProfile.email,
      discussion.title,
      replyContent,
      replyAuthorName,
      discussionId,
      discussion.user_id
    );

    if (error) {
      console.error('Reply notification failed:', error);
      return Response.json({ error: 'Failed to send email' }, { status: 500 });
    }

    return Response.json({ success: true, data });

  } catch (err) {
    console.error('Reply notification error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
