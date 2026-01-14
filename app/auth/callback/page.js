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
        // Parse the hash to get tokens
        const hashParams = new URLSearchParams(hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (accessToken) {
          // Explicitly set the session
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || ''
          });

          if (!error) {
            // Verify session was stored
            const { data: { session: verifySession } } = await supabase.auth.getSession();
            if (verifySession) {
              setStatus(`Session verified for ${verifySession.user?.email}! Redirecting...`);
              await new Promise(resolve => setTimeout(resolve, 1000));
              window.location.href = window.location.origin + '/';
              return;
            } else {
              setStatus('Session set but not persisted - check localStorage');
              await new Promise(resolve => setTimeout(resolve, 3000));
            }
          } else {
            setStatus(`Session error: ${error.message}`);
          }
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
