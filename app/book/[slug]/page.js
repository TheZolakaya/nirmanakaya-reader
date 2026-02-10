import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import MarkdownRenderer from '../../../components/shared/MarkdownRenderer';
import { getAllEntries, getEntryBySlug, getNavigation } from '../../../lib/book-data';

// Generate static params for all chapters and appendices
export function generateStaticParams() {
  return getAllEntries().map(entry => ({ slug: entry.slug }));
}

// Dynamic metadata
export function generateMetadata({ params }) {
  const entry = getEntryBySlug(params.slug);
  if (!entry) return { title: 'Not Found' };
  return {
    title: `${entry.label}: ${entry.title} | Nirmanakaya V7`,
    description: `Read ${entry.label}: ${entry.title} from Nirmanakaya: A Map of Consciousness.`,
  };
}

export default function ChapterPage({ params }) {
  const { slug } = params;
  const entry = getEntryBySlug(slug);

  if (!entry) {
    notFound();
  }

  // Read the markdown file
  const filePath = path.join(process.cwd(), 'lib', 'book', entry.file);
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    notFound();
  }

  const { prev, next } = getNavigation(slug);

  return (
    <article className="pb-12">
      {/* Chapter header */}
      <header className="mb-8 pt-2">
        {entry.partTitle && (
          <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-zinc-600 mb-2">
            {entry.partNumber ? `Part ${entry.partNumber}: ${entry.partTitle}` : entry.partTitle}
          </p>
        )}
        <p className="text-xs font-mono text-amber-400/60 mb-1">
          {entry.label}
        </p>
        <h1 className="text-2xl sm:text-3xl font-serif text-zinc-100">
          {entry.title}
        </h1>
        <div className="mt-4 h-px bg-gradient-to-r from-amber-400/20 via-zinc-800 to-transparent" />
      </header>

      {/* Content */}
      <div className="prose-invert">
        <MarkdownRenderer content={content} />
      </div>

      {/* Previous / Next Navigation */}
      <nav className="mt-16 pt-6 border-t border-zinc-800">
        <div className="flex justify-between items-start gap-4">
          {/* Previous */}
          <div className="flex-1">
            {prev && (
              <Link
                href={`/book/${prev.slug}`}
                className="group block p-3 rounded-lg hover:bg-zinc-800/40 transition-colors"
              >
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-600 group-hover:text-zinc-400 transition-colors">
                  ← Previous
                </span>
                <span className="block text-sm text-zinc-400 group-hover:text-amber-400 transition-colors mt-1">
                  {prev.label}: {prev.title}
                </span>
              </Link>
            )}
          </div>

          {/* TOC link */}
          <div className="shrink-0 pt-3">
            <Link
              href="/book"
              className="text-[10px] font-mono uppercase tracking-wider text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              Contents
            </Link>
          </div>

          {/* Next */}
          <div className="flex-1 text-right">
            {next && (
              <Link
                href={`/book/${next.slug}`}
                className="group block p-3 rounded-lg hover:bg-zinc-800/40 transition-colors"
              >
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-600 group-hover:text-zinc-400 transition-colors">
                  Next →
                </span>
                <span className="block text-sm text-zinc-400 group-hover:text-amber-400 transition-colors mt-1">
                  {next.label}: {next.title}
                </span>
              </Link>
            )}
          </div>
        </div>
      </nav>
    </article>
  );
}
