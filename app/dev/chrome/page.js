'use client';
// THE CHROME BENCH — /dev/chrome (2026-09-30): the shared corner controls over a page of reading, with no
// session and no API, so the collapsed handle and its roll-out can be looked at cold at phone width.
// Development only: in production this page is a 404.
import { notFound } from 'next/navigation';
import { useBackdropPrefs, Backdrop, CornerControls } from '../../../components/shared/SiteChrome';
import BrandHeader from '../../../components/layout/BrandHeader';
import { READER_CHOICES } from '../../../lib/modelConfig';

export default function ChromeBench() {
  if (process.env.NODE_ENV === 'production') notFound();
  const chrome = useBackdropPrefs();
  return (
    <div className="relative min-h-screen flex flex-col overflow-x-hidden bg-zinc-950 text-zinc-100" data-theme={chrome.prefs.theme}>
      {chrome.loaded && <Backdrop prefs={chrome.prefs} />}
      <CornerControls collapsed prefs={chrome.prefs} set={chrome.set} onAuthChange={() => {}}
        rightExtra={<button className="w-8 h-8 rounded-lg border border-amber-500/40 bg-zinc-900/80 text-amber-200 text-[0.8125rem] font-medium flex items-center justify-center">Aa</button>} />
      <div className="relative z-10 flex-1 flex flex-col w-full">
        <BrandHeader compact />
        <main className="flex-1 w-full max-w-2xl mx-auto px-4 pb-24">
          {/* the same Reader selector EZ shows signed-in people, here without a session, so its mechanism can be tested */}
          <div className="mt-3 flex items-center justify-center gap-1.5 flex-wrap" aria-label="Which Reader answers">
            <span className="text-[0.6875rem] uppercase tracking-[0.15em] text-zinc-500 mr-1">Reader</span>
            {READER_CHOICES.map(([k, label]) => { const on = (chrome.prefs.selectedModel || 'sonnet') === k;
              return <button key={k} onClick={() => chrome.set({ selectedModel: k })} className={`px-3 py-1 rounded-full border text-[0.75rem] ${on ? 'border-amber-400/70 bg-amber-900/30 text-amber-100' : 'border-zinc-700/60 bg-zinc-900/60 text-zinc-400'}`} aria-pressed={on}>{label}</button>; })}
          </div>
          <div className="mt-6 rounded-2xl border border-emerald-900/60 bg-black/40 p-5 text-[1.0625rem] leading-relaxed text-zinc-100 space-y-4">
            <p>There is no exhaustion with no origin, and quiet stops feeling like abandonment and starts feeling like chosen space.</p>
            <p>Letting something be done does not take anything from you; it returns the piece of you that was still holding it.</p>
            <p>Where it landed is your own capacity to choose direction. Not your stamina, your steering. The ability to say this, not that, and mean it.</p>
            <p>This bench page holds nothing real. It exists so the corner controls can be seen over a reading, closed and open, without signing in.</p>
          </div>
        </main>
      </div>
    </div>
  );
}
