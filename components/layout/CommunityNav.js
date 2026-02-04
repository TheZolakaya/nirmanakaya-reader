'use client';

/**
 * CommunityNav - Sub-navigation for Community section
 *
 * Simple toggle between Community Hub and Lounge.
 * Used inside /hub and /lounge pages (option 3: inside the page).
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function CommunityNav({ onlineCount = 0 }) {
  const pathname = usePathname();
  const isHub = pathname?.startsWith('/hub');
  const isLounge = pathname?.startsWith('/lounge');

  return (
    <div className="flex items-center justify-center gap-4 py-3 border-b border-zinc-800/30 bg-zinc-900/20 backdrop-blur-sm">
      <Link
        href="/hub"
        className={`px-4 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all ${
          isHub
            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
        }`}
      >
        Hub
      </Link>
      <Link
        href="/lounge"
        className={`px-4 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all flex items-center gap-2 ${
          isLounge
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
        }`}
      >
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
        </span>
        Lounge
        {onlineCount > 0 && (
          <span className="text-emerald-400/70 text-[0.6rem]">({onlineCount})</span>
        )}
      </Link>
    </div>
  );
}
