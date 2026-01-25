import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import MarkdownRenderer from '../../../components/shared/MarkdownRenderer';

export const metadata = {
  title: 'What Is Nirmanakaya? | Nirmanakaya',
  description: 'A complete introduction to the consciousness architecture - the map, the math, and the invitation.',
};

export default function AboutPage() {
  // Read the markdown file at build time
  const filePath = path.join(process.cwd(), 'lib', 'about-content.md');
  const content = fs.readFileSync(filePath, 'utf8');

  return (
    <>
      {/* Fixed NIRMANAKAYA header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-zinc-900/30 backdrop-blur-sm text-center py-6 border-b border-zinc-800/30">
        <Link href="/" className="inline-block">
          <h1 className="text-[1.25rem] sm:text-2xl md:text-3xl font-extralight tracking-[0.2em] sm:tracking-[0.3em] mb-1 hover:opacity-80 transition-opacity">
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
        <p className="text-zinc-300 text-sm tracking-wide font-light">About</p>
        {/* Nav Links - rainbow hover colors */}
        <div className="flex justify-center gap-2 mt-3 text-xs">
          <Link
            href="/"
            className="px-3 py-1.5 rounded bg-zinc-900/90 border border-zinc-600/60 text-zinc-300 hover:text-rose-400 hover:border-rose-500/50 transition-all"
          >
            Reader
          </Link>
          <Link
            href="/hub"
            className="px-3 py-1.5 rounded bg-zinc-900/90 border border-zinc-600/60 text-zinc-300 hover:text-amber-400 hover:border-amber-500/50 transition-all"
          >
            Community
          </Link>
          <Link
            href="/guide"
            className="px-3 py-1.5 rounded bg-zinc-900/90 border border-zinc-600/60 text-zinc-300 hover:text-emerald-400 hover:border-emerald-500/50 transition-all"
          >
            Guide
          </Link>
          <Link
            href="/lounge"
            className="px-3 py-1.5 rounded bg-zinc-900/90 border border-zinc-600/60 text-zinc-300 hover:text-cyan-400 hover:border-cyan-500/50 transition-all"
          >
            Lounge
          </Link>
          <Link
            href="/council"
            className="px-3 py-1.5 rounded bg-zinc-900/90 border border-zinc-600/60 text-zinc-300 hover:text-violet-400 hover:border-violet-500/50 transition-all"
          >
            Council
          </Link>
          <a
            href="/map"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded bg-zinc-900/90 border border-zinc-600/60 text-zinc-300 hover:text-fuchsia-400 hover:border-fuchsia-500/50 transition-all"
          >
            Map
          </a>
        </div>
      </div>

      <article className="prose-invert pt-36">
        <MarkdownRenderer content={content} />
      </article>
    </>
  );
}
