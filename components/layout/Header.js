'use client';

/**
 * Header - The HUD (Heads-Up Display)
 *
 * Ghost links, terminal style, monospace typography. Five doors (2026-09-30, founder: "what really needs
 * to belong there"): home, Community, Journey, Map, Explore — plus "On your phone" until the app is installed.
 * Book, Wiki, Guide, Council and Share the app live in the library menu (the corner controls).
 * Community indicator only pulses when there's activity (users online or unread messages).
 * Council link has tooltip for "Synthetic Witness" reveal.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Header({ hasActivity = false }) {
  const pathname = usePathname();

  // Check if we're in the community section (includes /hub and /lounge)
  const isCommunityActive = pathname?.startsWith('/hub') || pathname?.startsWith('/lounge');
  const isMapActive = pathname?.startsWith('/22-reader');
  const isExploreActive = pathname?.startsWith('/explore');
  const isJourneyActive = pathname?.startsWith('/stats') || pathname?.startsWith('/collection') || pathname?.startsWith('/journal');

  const isHome = pathname === '/';
  const isPhoneActive = pathname?.startsWith('/phone');
  // "Put this on your phone" hides once the site IS on the phone (running from the home screen)
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    try { setInstalled(window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true); } catch {}
  }, []);

  return (
    // px reserves the corner lanes on mobile so the wrapping nav pill can't slide
    // under the floating icon buttons (blur-over-icons bug, founder 2026-08-18)
    <nav className="w-full flex justify-center items-center py-2 z-50 relative pointer-events-none px-14 md:px-4" style={{ paddingTop: 'calc(0.5rem + var(--safe-top, 0px))' }}>
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 sm:gap-x-6 md:gap-x-10 backdrop-blur-sm px-3 sm:px-6 py-2 rounded-2xl sm:rounded-full border border-white/0 hover:border-white/5 transition-all duration-500 pointer-events-auto">

        {/* HOME - Nirmanakaya wordmark */}
        <Link
          href="/"
          className={`text-[8px] sm:text-[10px] font-mono uppercase tracking-[0.1em] sm:tracking-[0.2em] transition-colors duration-300 whitespace-nowrap ${
            isHome ? 'text-amber-400' : 'text-zinc-500 hover:text-amber-400'
          }`}
        >
          Nirmanakaya
        </Link>

        {/* ON YOUR PHONE — the web-app install page (founder, 2026-09-17). Once installed the same page
            becomes "Share the app" and moves into the library menu (rail trimmed 2026-09-30). */}
        {!installed && (
          <Link
            href="/phone"
            className={`text-[8px] sm:text-[10px] font-mono uppercase tracking-[0.1em] sm:tracking-[0.15em] transition-colors duration-300 whitespace-nowrap ${
              isPhoneActive ? 'text-amber-300' : 'text-zinc-500 hover:text-amber-300'
            }`}
          >
            On your phone
          </Link>
        )}

        {/* COMMUNITY - dot on right for centering */}
        <Link
          href="/hub"
          className={`group flex items-center gap-1 sm:gap-2 text-[8px] sm:text-[10px] font-mono uppercase tracking-[0.1em] sm:tracking-[0.15em] transition-colors duration-300 whitespace-nowrap ${
            isCommunityActive ? 'text-emerald-400' : 'text-zinc-400 hover:text-emerald-400'
          }`}
        >
          <span>Community</span>
          <div className="relative flex h-1.5 w-1.5">
            {hasActivity && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            )}
            <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${hasActivity ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-zinc-600'}`}></span>
          </div>
        </Link>

        {/* JOURNEY (Stats / Collection) */}
        <Link
          href="/stats"
          className={`text-[8px] sm:text-[10px] font-mono uppercase tracking-[0.1em] sm:tracking-[0.15em] transition-colors duration-300 whitespace-nowrap ${
            isJourneyActive ? 'text-violet-400' : 'text-zinc-500 hover:text-violet-400'
          }`}
        >
          Journey
        </Link>

        {/* 4. MAP (The Coordinates) */}
        <Link
          href="/22-reader"
          className={`text-[8px] sm:text-[10px] font-mono uppercase tracking-[0.1em] sm:tracking-[0.15em] transition-colors duration-300 whitespace-nowrap ${
            isMapActive ? 'text-white' : 'text-zinc-500 hover:text-white'
          }`}
        >
          Map
        </Link>

        {/* 5. EXPLORE (The Architecture) */}
        <Link
          href="/explore"
          className={`text-[8px] sm:text-[10px] font-mono uppercase tracking-[0.1em] sm:tracking-[0.15em] transition-colors duration-300 whitespace-nowrap ${
            isExploreActive ? 'text-cyan-300' : 'text-zinc-500 hover:text-cyan-300'
          }`}
        >
          Explore
        </Link>

      </div>
    </nav>
  );
}
