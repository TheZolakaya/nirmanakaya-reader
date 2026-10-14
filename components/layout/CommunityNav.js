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
    <div className="flex items-center justify-center gap-4 py-2 border-b border-zinc-800/30"> {/* .765 (founder): the tabs speak like the nav — words, not boxes */}
      <Link
        href="/hub"
        className={`px-3 py-1 text-[10px] font-mono uppercase tracking-[0.15em] transition-colors ${
          isHub ? 'text-amber-400' : 'text-zinc-500 hover:text-amber-300'
        }`}
      >
        Hub
      </Link>
      <Link
        href="/lounge"
        className={`px-3 py-1 text-[10px] font-mono uppercase tracking-[0.15em] transition-colors flex items-center gap-2 ${
          isLounge ? 'text-emerald-400' : 'text-zinc-500 hover:text-emerald-300'
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
