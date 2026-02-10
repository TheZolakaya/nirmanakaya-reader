import Link from 'next/link';
import { BOOK_PARTS, APPENDICES, QUOTES } from '../../lib/book-data';

export const metadata = {
  title: 'Nirmanakaya: A Map of Consciousness — Table of Contents',
  description: 'Navigate the complete text of Nirmanakaya V7 — 10 parts, 40 chapters, 6 appendices.',
};

export default function BookPage() {
  // Pick a random quote at build time
  const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];

  return (
    <article className="pb-12">
      {/* Header */}
      <header className="text-center mb-12 pt-4">
        <h1 className="text-3xl sm:text-4xl font-serif text-amber-400 mb-2">
          Nirmanakaya
        </h1>
        <p className="text-lg sm:text-xl font-serif text-zinc-300 italic">
          A Map of Consciousness
        </p>
        <p className="text-xs font-mono text-zinc-600 mt-3 uppercase tracking-widest">
          Version 7 — The Definitive Edition
        </p>

        {/* Divider */}
        <div className="mt-8 flex items-center justify-center gap-3">
          <div className="h-px w-16 bg-gradient-to-r from-transparent to-zinc-700" />
          <span className="text-amber-400/40 text-xs">✦</span>
          <div className="h-px w-16 bg-gradient-to-l from-transparent to-zinc-700" />
        </div>
      </header>

      {/* Random Quote */}
      <blockquote className="max-w-xl mx-auto mb-12 px-4 py-4 border-l-2 border-amber-500/30 bg-amber-500/5 rounded-r">
        <p className="text-zinc-300 text-sm italic leading-relaxed">
          &ldquo;{quote.text}&rdquo;
        </p>
        <cite className="block mt-2 text-xs text-zinc-500 not-italic">
          — {quote.source}
        </cite>
      </blockquote>

      {/* Table of Contents */}
      <div className="space-y-8">
        {BOOK_PARTS.map((part) => (
          <section key={part.number}>
            <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-zinc-500 mb-3 px-1">
              Part {part.number} — {part.title}
            </h2>
            <div className="space-y-0.5">
              {part.chapters.map((ch) => (
                <Link
                  key={ch.slug}
                  href={`/book/${ch.slug}`}
                  className="group flex items-baseline gap-3 px-3 py-2 rounded-lg hover:bg-zinc-800/40 transition-colors"
                >
                  <span className="text-zinc-600 font-mono text-xs w-6 text-right shrink-0">
                    {ch.number}
                  </span>
                  <span className="text-zinc-300 text-sm group-hover:text-amber-400 transition-colors">
                    {ch.title}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}

        {/* Appendices */}
        <section className="border-t border-zinc-800 pt-6">
          <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-zinc-500 mb-3 px-1">
            Appendices
          </h2>
          <div className="space-y-0.5">
            {APPENDICES.map((app) => (
              <Link
                key={app.slug}
                href={`/book/${app.slug}`}
                className="group flex items-baseline gap-3 px-3 py-2 rounded-lg hover:bg-zinc-800/40 transition-colors"
              >
                <span className="text-zinc-600 font-mono text-xs w-6 text-right shrink-0">
                  {app.title.match(/[A-F]/)?.[0]}
                </span>
                <span className="text-zinc-300 text-sm group-hover:text-amber-400 transition-colors">
                  {app.title}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* Stats */}
      <div className="mt-12 text-center">
        <div className="inline-flex gap-6 text-[10px] font-mono text-zinc-600 uppercase tracking-wider">
          <span>40 Chapters</span>
          <span className="text-zinc-800">·</span>
          <span>10 Parts</span>
          <span className="text-zinc-800">·</span>
          <span>6 Appendices</span>
          <span className="text-zinc-800">·</span>
          <span>~500 Pages</span>
        </div>
      </div>
    </article>
  );
}
