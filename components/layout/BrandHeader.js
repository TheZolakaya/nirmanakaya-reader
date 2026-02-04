'use client';

/**
 * BrandHeader - Full branding header for all pages
 *
 * Combines:
 * - Navigation bar (Header component)
 * - Rainbow NIRMANAKAYA title
 * - "The Soul Search Engine" tagline with shimmer
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from './Header';

export default function BrandHeader({ hasActivity = false, compact = false }) {
  // Shimmer direction alternates randomly on mount
  const [shimmerLTR, setShimmerLTR] = useState(true);

  useEffect(() => {
    setShimmerLTR(Math.random() > 0.5);
  }, []);

  return (
    <>
      {/* Navigation */}
      <Header hasActivity={hasActivity} />

      {/* Brand Title */}
      <div className="text-center mb-2 md:mb-3 relative">
        <Link href="/" className="inline-block">
          <h1 className={`${compact ? 'text-base sm:text-lg md:text-xl' : 'text-lg sm:text-2xl md:text-3xl'} font-extralight tracking-[0.15em] sm:tracking-[0.2em] md:tracking-[0.3em] mb-1`}>
            <span className="rainbow-letter rainbow-letter-0">N</span>
            <span className="rainbow-letter rainbow-letter-1">I</span>
            <span className="rainbow-letter rainbow-letter-2">R</span>
            <span className="rainbow-letter rainbow-letter-3">M</span>
            <span className="rainbow-letter rainbow-letter-4">A</span>
            <span className="rainbow-letter rainbow-letter-5">N</span>
            <span className="rainbow-letter rainbow-letter-6">A</span>
            <span className="rainbow-letter rainbow-letter-7">K</span>
            <span className="rainbow-letter rainbow-letter-8">A</span>
            <span className="rainbow-letter rainbow-letter-9">Y</span>
            <span className="rainbow-letter rainbow-letter-10">A</span>
          </h1>
        </Link>
        <p className={`font-mono text-zinc-400/60 ${compact ? 'text-[8px] sm:text-[10px] md:text-xs' : 'text-[10px] sm:text-xs md:text-sm'} tracking-[0.1em] sm:tracking-[0.15em] md:tracking-[0.2em] uppercase`}>
          {'The Soul Search Engine'.split('').map((char, i, arr) => {
            const delay = shimmerLTR
              ? -(i * 0.1 + 0.1)
              : -((arr.length - 1 - i) * 0.1 + 0.1);
            return (
              <span
                key={`${i}-${shimmerLTR}`}
                className="shimmer-letter"
                style={{ animationDelay: `${delay}s` }}
              >
                {char === ' ' ? '\u00A0' : char}
              </span>
            );
          })}
        </p>
      </div>
    </>
  );
}
