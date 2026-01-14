'use client';

// === AUTH CALLBACK PAGE ===
// Client-side handler for OAuth callbacks

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      // Get the URL params
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const type = params.get('type');

      if (code && supabase) {
        // Exchange code for session
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
          // If password recovery, redirect with flag
          if (type === 'recovery') {
            router.push('/?reset_password=true');
            return;
          }
          router.push('/');
          return;
        }
      }

      // If no code or error, check if we already have a session from hash
      // (Supabase sometimes uses hash-based auth)
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          router.push('/');
          return;
        }
      }

      // Fallback - redirect with error
      router.push('/?auth_error=true');
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-zinc-400">Signing you in...</div>
    </div>
  );
}
