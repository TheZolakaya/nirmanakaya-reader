'use client';

/**
 * Footer - The System Root
 *
 * Minimal footer anchored to page bottom.
 * Row 1: System Axiom (version + consciousness principle)
 * Row 2: Documentation links (About, Privacy, Terms)
 */

import Link from 'next/link';
import { VERSION } from '../../lib/version';

export default function Footer() {
  return (
    <footer className="w-full py-3">
      <div className="container mx-auto px-4 text-center space-y-1.5">

        {/* 1. THE SYSTEM AXIOM (The Soul of the Machine) */}
        <div className="space-y-1.5 select-none group cursor-default">
          {/* Version & Name */}
          <h4 className="text-[11px] font-mono uppercase tracking-[0.3em] text-zinc-500 group-hover:text-zinc-300 transition-colors duration-500">
            Nirmanakaya <span className="text-emerald-500/50 mx-2">::</span> v{VERSION}
          </h4>

          {/* The Law */}
          <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-zinc-500 group-hover:text-zinc-400 transition-colors duration-500">
            Consciousness is Primary <span className="mx-2 text-zinc-600">|</span> Encounter Precedes Understanding
          </p>
        </div>

        {/* 2. THE ARCHIVE LINKS (Documentation) */}
        <nav className="flex justify-center items-center gap-5 text-[10px] font-mono uppercase tracking-[0.1em] text-zinc-500">
          <Link href="/about" className="hover:text-white transition-colors duration-300">
            About
          </Link>
          <span className="text-zinc-600 select-none">/</span>

          <Link href="/privacy" className="hover:text-white transition-colors duration-300">
            Privacy
          </Link>
          <span className="text-zinc-600 select-none">/</span>

          <Link href="/terms" className="hover:text-white transition-colors duration-300">
            Terms
          </Link>
        </nav>

      </div>
    </footer>
  );
}
