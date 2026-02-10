import Link from 'next/link';
import BookSidebar from '../../components/book/BookSidebar';

export const metadata = {
  title: 'Nirmanakaya: A Map of Consciousness',
  description: 'The complete text of Nirmanakaya V7 — 40 chapters mapping the architecture of consciousness.',
};

export default function BookLayout({ children }) {
  return (
    <div className="min-h-screen bg-zinc-950">
      <BookSidebar />

      {/* Mobile top bar — back to reader */}
      <div className="lg:hidden fixed top-3 right-3 z-[70]">
        <Link
          href="/"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900/90 border border-zinc-700 text-zinc-400 hover:text-amber-400 transition-colors backdrop-blur-sm text-[10px] font-mono uppercase tracking-wider"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          Reader
        </Link>
      </div>

      {/* Main content area - offset for sidebar on desktop */}
      <div className="lg:ml-64">
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-14 lg:pt-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-zinc-800 px-4 py-6 mt-12">
          <div className="max-w-4xl mx-auto text-center text-zinc-500 text-xs">
            <div className="flex justify-center gap-4 flex-wrap">
              <a href="/" className="hover:text-zinc-400 transition-colors">Reader</a>
              <span className="text-zinc-700">&middot;</span>
              <a href="/guide" className="hover:text-zinc-400 transition-colors">Guide</a>
              <span className="text-zinc-700">&middot;</span>
              <a href="/hub" className="hover:text-zinc-400 transition-colors">Community</a>
              <span className="text-zinc-700">&middot;</span>
              <a href="/council" className="hover:text-zinc-400 transition-colors">Council</a>
              <span className="text-zinc-700">&middot;</span>
              <a href="/map" className="hover:text-zinc-400 transition-colors">Map</a>
            </div>
            <p className="mt-3 text-zinc-600 text-[10px] font-mono">
              Nirmanakaya V7 — A Map of Consciousness
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
