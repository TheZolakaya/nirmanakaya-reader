// .573: THE REST OF THE DOORS (founder, 2026-09-26 "Let's do it after I say good night"). The model routes were open:
// anyone who found the URL could run prompts on the house's bill. Every route that calls a model now asks for a
// signed-in session, the same way /api/reading has since .572. Server-only — callers send `...(await readingAuth())`.
import { createClient } from '@supabase/supabase-js';

export async function getAuthUser(request) {
  const authHeader = request.headers.get('authorization');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!authHeader?.startsWith('Bearer ') || !url || !anonKey) return null;
  try {
    const anon = createClient(url, anonKey);
    const { data: { user }, error } = await anon.auth.getUser(authHeader.slice(7));
    return error || !user ? null : user;
  } catch { return null; }
}

// Returns a 401 Response when there is no signed-in user, or null when the request may proceed.
export async function requireUser(request) {
  const user = await getAuthUser(request);
  return user ? null : Response.json({ error: 'Please sign in to continue.' }, { status: 401 });
}
