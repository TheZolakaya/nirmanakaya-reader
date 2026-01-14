// === AUTH CALLBACK ROUTE ===
// Handles OAuth redirects from Supabase auth providers

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const type = searchParams.get('type');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // If this is a password recovery, redirect with flag to show reset modal
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/?reset_password=true`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return to home on error
  return NextResponse.redirect(`${origin}/?auth_error=true`);
}
