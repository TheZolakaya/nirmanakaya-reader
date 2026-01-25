import DocsBackground from '../../components/shared/DocsBackground';
import TextSizeSlider from '../../components/shared/TextSizeSlider';

export default function DocsLayout({ children }) {
  return (
    <DocsBackground>
      {/* Text size slider - top right, above fixed headers */}
      <div className="fixed top-3 right-3 z-[60]">
        <TextSizeSlider />
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {children}
      </main>

      {/* Simple footer */}
      <footer className="border-t border-zinc-800 px-4 py-6 mt-12">
        <div className="max-w-4xl mx-auto text-center text-zinc-500 text-xs">
          <div className="flex justify-center gap-4 flex-wrap">
            <a href="/guide" className="hover:text-zinc-400 transition-colors">
              Guide
            </a>
            <span>•</span>
            <a href="/about" className="hover:text-zinc-400 transition-colors">
              About
            </a>
            <span>•</span>
            <a href="/privacy" className="hover:text-zinc-400 transition-colors">
              Privacy
            </a>
            <span>•</span>
            <a href="/terms" className="hover:text-zinc-400 transition-colors">
              Terms
            </a>
            <span>•</span>
            <a
              href="https://nirmanakaya.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-zinc-400 transition-colors"
            >
              Nirmanakaya.com
            </a>
          </div>
        </div>
      </footer>
    </DocsBackground>
  );
}
