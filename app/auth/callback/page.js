'use client';

// === AUTH CALLBACK PAGE ===
// Client-side handler for OAuth callbacks

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState('Signing you in...');

  useEffect(() => {
    const handleCallback = async () => {
      if (!supabase) {
        setStatus('Auth not configured');
        setTimeout(() => router.push('/?auth_error=true'), 2000);
        return;
      }

      // Check for hash-based auth (access_token in URL hash)
      const hash = window.location.hash;
      if (hash && hash.includes('access_token')) {
        setStatus('Processing session...');
        // Supabase client auto-detects hash and sets session
        // Just wait a moment and check for session
        await new Promise(resolve => setTimeout(resolve, 500));
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          router.push('/');
          return;
        }
      }

      // Check for code-based auth (PKCE flow)
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const type = params.get('type');

      if (code) {
        setStatus('Exchanging code...');
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
          if (type === 'recovery') {
            router.push('/?reset_password=true');
            return;
          }
          router.push('/');
          return;
        } else {
          setStatus(`Error: ${error.message}`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      // Final check - maybe session was set automatically
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push('/');
        return;
      }

      // Fallback
      setStatus('Authentication failed');
      setTimeout(() => router.push('/?auth_error=true'), 2000);
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-zinc-400">{status}</div>
    </div>
  );
}
