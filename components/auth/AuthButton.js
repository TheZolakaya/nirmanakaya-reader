'use client';

// === AUTH BUTTON ===
// Sign in/out button with user menu

import { useState, useEffect } from 'react';
import { supabase, signOut, getUser } from '../../lib/supabase';

export default function AuthButton({ onAuthChange }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    console.log('[AuthButton] Mounted on:', window.location.href);

    // Check localStorage directly
    const keys = Object.keys(localStorage).filter(k => k.includes('supabase'));
    console.log('[AuthButton] Supabase localStorage keys:', keys);

    // Listen for auth changes FIRST
    let subscription;
    if (supabase) {
      const result = supabase.auth.onAuthStateChange((_event, session) => {
        console.log('[AuthButton] onAuthStateChange:', _event, session?.user?.email);
        setUser(session?.user ?? null);
        setLoading(false);
        onAuthChange?.(session?.user ?? null);
      });
      subscription = result.data.subscription;
    }

    // Then check current session after a delay
    const timer = setTimeout(() => {
      checkUser();
    }, 500);

    return () => {
      clearTimeout(timer);
      subscription?.unsubscribe();
    };
  }, []);

  async function checkUser() {
    console.log('[AuthButton] checkUser() called');
    const { user } = await getUser();
    console.log('[AuthButton] getUser() returned:', user?.email || 'null');
    setUser(user);
    setLoading(false);
    onAuthChange?.(user);
  }

  async function handleSignOut() {
    await signOut();
    setUser(null);
    setShowMenu(false);
    onAuthChange?.(null);
  }

  function handleSignIn() {
    // Open sign-in modal or redirect
    window.dispatchEvent(new CustomEvent('open-auth-modal'));
  }

  if (loading) {
    return (
      <div className="w-8 h-8 rounded-full bg-zinc-800 animate-pulse" />
    );
  }

  if (!user) {
    return (
      <button
        onClick={handleSignIn}
        className="px-3 py-1.5 text-sm bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors"
      >
        Sign In
      </button>
    );
  }

  // User is signed in - show avatar/menu
  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
      >
        {user.user_metadata?.avatar_url ? (
          <img
            src={user.user_metadata.avatar_url}
            alt="Avatar"
            className="w-8 h-8 rounded-full border border-zinc-700"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-amber-600 flex items-center justify-center text-white text-sm font-medium">
            {(user.email?.[0] || 'U').toUpperCase()}
          </div>
        )}
      </button>

      {showMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />

          {/* Menu */}
          <div className="absolute right-0 top-10 z-50 w-48 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl py-1">
            <div className="px-3 py-2 border-b border-zinc-800">
              <p className="text-sm text-zinc-300 truncate">
                {user.user_metadata?.full_name || user.email}
              </p>
              <p className="text-xs text-zinc-500 truncate">{user.email}</p>
            </div>

            <a
              href={`/profile/${user.id}`}
              className="block px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
              onClick={() => setShowMenu(false)}
            >
              My Profile
            </a>

            <a
              href="/journal"
              className="block px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
              onClick={() => setShowMenu(false)}
            >
              My Readings
            </a>

            <a
              href="/hub"
              className="block px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
              onClick={() => setShowMenu(false)}
            >
              Community Hub
            </a>

            <button
              onClick={handleSignOut}
              className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-zinc-800 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
