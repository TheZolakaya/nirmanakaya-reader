import BookSidebar from '../../components/book/BookSidebar';

export const metadata = {
  title: 'Nirmanakaya: A Map of Consciousness',
  description: 'The complete text of Nirmanakaya V7 — 40 chapters mapping the architecture of consciousness.',
};

export default function BookLayout({ children }) {
  return (
    <div className="min-h-screen bg-zinc-950">
      <BookSidebar />

      {/* Main content area - offset for sidebar on desktop */}
      <div className="lg:ml-64">
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-14 lg:pt-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-zinc-800 px-4 py-6 mt-12">
          <div className="max-w-4xl mx-auto text-center text-zinc-500 text-xs">
            <div className="flex justify-center gap-4 flex-wrap">
              <a href="/" className="hover:text-zinc-400 transition-colors">Home</a>
              <span className="text-zinc-700">·</span>
              <a href="/guide" className="hover:text-zinc-400 transition-colors">Guide</a>
              <span className="text-zinc-700">·</span>
              <a href="/council" className="hover:text-zinc-400 transition-colors">Council</a>
              <span className="text-zinc-700">·</span>
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
