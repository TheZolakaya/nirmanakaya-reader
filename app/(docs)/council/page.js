import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import MarkdownRenderer from '../../../components/shared/MarkdownRenderer';
import { VERSION } from '../../../lib/version';

export const metadata = {
  title: 'The Council | Nirmanakaya',
  description: 'Testimonies from the Nirmanakaya Council - four AI systems encountering the consciousness architecture.',
};

export default function CouncilPage() {
  // Read the markdown file at build time
  const filePath = path.join(process.cwd(), 'lib', 'council-content.md');
  const content = fs.readFileSync(filePath, 'utf8');

  return (
    <>
      {/* Fixed NIRMANAKAYA header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-zinc-950 text-center py-6 border-b border-zinc-800/30">
        <Link href="/" className="inline-block">
          <h1 className="text-[1.25rem] sm:text-2xl md:text-3xl font-extralight tracking-[0.2em] sm:tracking-[0.3em] mb-1 bg-gradient-to-r from-amber-200 via-rose-300 to-violet-400 bg-clip-text text-transparent hover:opacity-80 transition-opacity">NIRMANAKAYA</h1>
        </Link>
        <p className="text-zinc-400 text-[0.6875rem] sm:text-xs tracking-wide">Consciousness Architecture Reader</p>
        <p className="text-zinc-500 text-[0.625rem] mt-0.5">v{VERSION} alpha</p>
        {/* Nav Links */}
        <div className="flex justify-center gap-2 mt-3 text-xs">
          <Link
            href="/hub"
            className="px-3 py-1.5 rounded bg-zinc-800/60 border border-zinc-700/50 text-zinc-400 hover:text-amber-400 hover:border-amber-600/30 transition-all"
          >
            Community
          </Link>
          <Link
            href="/"
            className="px-3 py-1.5 rounded bg-zinc-800/60 border border-zinc-700/50 text-zinc-400 hover:text-amber-400 hover:border-amber-600/30 transition-all"
          >
            Reader
          </Link>
          <Link
            href="/guide"
            className="px-3 py-1.5 rounded bg-zinc-800/60 border border-zinc-700/50 text-zinc-400 hover:text-amber-400 hover:border-amber-600/30 transition-all"
          >
            Guide
          </Link>
          <Link
            href="/about"
            className="px-3 py-1.5 rounded bg-zinc-800/60 border border-zinc-700/50 text-zinc-400 hover:text-amber-400 hover:border-amber-600/30 transition-all"
          >
            About
          </Link>
        </div>
      </div>

      <article className="prose-invert pt-36">
        <MarkdownRenderer content={content} />
      </article>
    </>
  );
}
