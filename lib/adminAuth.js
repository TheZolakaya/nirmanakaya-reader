// lib/adminAuth.js
// ONE admin gate for every admin API route.
//
// Written 2026-09-18 after an audit found five admin routes trusting the REQUEST to say who was
// calling: `const { adminEmail } = await request.json()` checked against a hardcoded list holding
// the founder's public email address. That is not authentication — it is a password printed in the
// source. Anyone who sent the right string in the body was an admin.
//
// THE RULE: identity comes from the verified session token, never from the request body or query.
// A caller can say anything; a token is checked against Supabase and cannot be invented.
//
// Usage in a route:
//   const gate = await requireAdmin(request);
//   if (!gate.ok) return gate.response;
//   const admin = gate.user;            // verified, trustworthy

import { createClient } from '@supabase/supabase-js';

// Kept as a floor so the founder's own account works even if its profile row is missing or
// is_admin was never set. NOTE: this is now matched against the email ON THE VERIFIED TOKEN,
// not against a string the caller supplied.
const ADMIN_EMAILS = ['chriscrilly@gmail.com'];

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key) : null;
}

// Verify the bearer token and return the real user, or null. Same shape the user routes already
// use — this is the pattern that was right, lifted so every route can share it.
async function getAuthUser(request) {
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  const anon = createClient(url, anonKey);
  const { data, error } = await anon.auth.getUser(header.replace('Bearer ', ''));
  if (error || !data?.user) return null;
  return data.user;
}

/**
 * Gate an admin route. Returns { ok: true, user } or { ok: false, response }.
 * Never throws — a route can return gate.response directly.
 */
export async function requireAdmin(request) {
  const deny = (status, error) => ({ ok: false, response: Response.json({ error }, { status }) });

  const user = await getAuthUser(request);
  if (!user) return deny(401, 'Unauthorized');

  // The founder's own account, identified by the TOKEN's email.
  if (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    return { ok: true, user };
  }

  const admin = serviceClient();
  if (!admin) return deny(500, 'Server not configured');

  const { data: profile } = await admin
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  // Absent profile, absent flag, or false — all mean no. There is deliberately no branch here
  // that skips the check: the bug this file replaces was an `if (userId)` that let a caller
  // omit the field and sail past the gate entirely.
  if (!profile?.is_admin) return deny(403, 'Admin only');

  return { ok: true, user };
}

export { ADMIN_EMAILS };
