'use client';

// SITE CHROME — the moving background, its panel, and the four corner controls, lifted from the
// main reader (app/page.js) so easy mode wears the same face. The choices live where the main
// page already keeps them, localStorage 'nirmanakaya_prefs', so a person who set the ocean at
// thirty percent on the front page gets the ocean at thirty percent here. Writes here MERGE into
// that object; the main page keeps its own inline copy of all this for now (convergence later).

import { useEffect, useState, useCallback } from 'react';
import { AuthButton } from '../auth';
import TextSizeSlider from './TextSizeSlider';

export const VIDEO_BACKGROUNDS = [
  { id: 'cosmos', src: '/video/cosmos.mp4', label: 'Cosmos' },
  { id: 'ocean', src: '/video/background.mp4', label: 'Ocean' },
  { id: 'ocean2', src: '/video/ocean2.mp4', label: 'Deep Ocean' },
  { id: 'rainbow', src: '/video/rainbow.mp4', label: 'Rainbow' },
  { id: 'forest', src: '/video/forest.mp4', label: 'Forest' },
  { id: 'violet', src: '/video/violet.mp4', label: 'Violet' },
];

export const IMAGE_BACKGROUNDS = [
  { id: 'deep-ocean-1', src: '/images/Zolakaya_abstract_fractal_deep_blue_ocean_fills_the_image_--s_834b4b03-ff4a-4dba-b095-276ca0078063_1.png', label: 'Deep Ocean 1' },
  { id: 'deep-ocean-2', src: '/images/Zolakaya_abstract_fractal_deep_blue_ocean_fills_the_image_--s_834b4b03-ff4a-4dba-b095-276ca0078063_3.png', label: 'Deep Ocean 2' },
  { id: 'cosmic-1', src: '/images/Zolakaya_Cosmic_rainbow_of_colors_fractal_expressions_of_holy_71e29517-f921-418c-9415-aa100c5acf4e_0.png', label: 'Cosmic 1' },
  { id: 'cosmic-2', src: '/images/Zolakaya_Cosmic_rainbow_of_colors_fractal_expressions_of_holy_71e29517-f921-418c-9415-aa100c5acf4e_1.png', label: 'Cosmic 2' },
  { id: 'cosmic-3', src: '/images/Zolakaya_Cosmic_rainbow_of_colors_fractal_expressions_of_holy_71e29517-f921-418c-9415-aa100c5acf4e_2.png', label: 'Cosmic 3' },
  { id: 'forest', src: '/images/Zolakaya_imaginary_green_Lucious_fractal_garden_calm_forest_w_ff789520-3ec5-437d-b2da-d378d9a837f2_0.png', label: 'Forest' },
  { id: 'violet-1', src: '/images/Zolakaya_Sparkling_fractal_Purple_flowers_radiating_from_ever_2da9d73c-5041-4ae6-8f9f-c09b40d828f2_0.png', label: 'Violet 1' },
  { id: 'violet-2', src: '/images/Zolakaya_Sparkling_fractal_Purple_flowers_radiating_from_ever_2da9d73c-5041-4ae6-8f9f-c09b40d828f2_2.png', label: 'Violet 2' },
  { id: 'violet-3', src: '/images/Zolakaya_Sparkling_fractal_Purple_flowers_radiating_from_ever_2da9d73c-5041-4ae6-8f9f-c09b40d828f2_3.png', label: 'Violet 3' },
  { id: 'tunnel-1', src: '/images/Zolakaya_The_beautiful_glowing_circular_tunnel_to_heaven_no_f_ba01ff35-10b4-4a2b-a941-6d3f084b6e44_0.png', label: 'Tunnel 1' },
  { id: 'tunnel-2', src: '/images/Zolakaya_The_beautiful_glowing_circular_tunnel_to_heaven_no_f_ba01ff35-10b4-4a2b-a941-6d3f084b6e44_3.png', label: 'Tunnel 2' },
];

const PREFS_KEY = 'nirmanakaya_prefs';
const DEFAULTS = { backgroundType: 'video', selectedVideo: 0, selectedImage: 0, backgroundOpacity: 30, contentDim: 0, theme: 'dark', selectedModel: 'sonnet' };   // selectedModel: the same key /advanced persists (2026-09-30)

// The visual preferences, shared with the main page. Reads once on mount; each change merges
// back into the stored object so nothing the main page saved is lost.
export function useBackdropPrefs() {
  const [prefs, setPrefsState] = useState(DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
      // .610: restore EVERY saved key, not only the ones in DEFAULTS — the voice switch (voiceOut, voiceName) was saved
      // but dropped on every reload, so "Speak readings aloud" silently turned itself off (founder: "still not hearing anything").
      const next = { ...DEFAULTS, ...(saved && typeof saved === 'object' ? saved : {}) };
      setPrefsState(next);
    } catch { /* defaults */ }
    setLoaded(true);
  }, []);
  const set = useCallback((patch) => {
    setPrefsState((p) => {
      const next = { ...p, ...patch };
      try {
        const saved = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
        localStorage.setItem(PREFS_KEY, JSON.stringify({ ...saved, ...patch }));
      } catch { /* ignore */ }
      return next;
    });
  }, []);
  return { prefs, set, loaded };
}

// .724 THE LEAN TEST SWITCH (founder, 2026-10-06, the mid-reading resets): ?lean=1 on the reader stores nkya_lean=1 in this browser and
// the page drops its newer visual weight — no background video, no writing loop, no splash — so a reading can be tried without them.
// ?lean=0 restores everything. Nobody who has not set it sees any change.
export const isLean = () => { try { const q = new URLSearchParams(window.location.search).get('lean'); if (q === '1' || q === '0') { localStorage.setItem('nkya_lean', q); if (q === '1') localStorage.setItem('nkya_ez_fx', '0'); else localStorage.removeItem('nkya_ez_fx'); } return localStorage.getItem('nkya_lean') === '1'; } catch { return false; } }; // the address wins on the load that carries it; lean also turns the splash off (and ?lean=0 back on)

// The layer itself: a fixed video or image under everything, at the chosen opacity.
export function Backdrop({ prefs }) {
  const { backgroundType, selectedVideo, selectedImage, backgroundOpacity } = prefs;
  const [lean, setLean] = useState(false); useEffect(() => { setLean(isLean()); }, []); // .724 read after mount, so the server render matches
  if (lean) return null;
  if (backgroundType === 'video') {
    const v = VIDEO_BACKGROUNDS[selectedVideo] || VIDEO_BACKGROUNDS[0];
    return (
      <video key={v.id} autoPlay loop muted playsInline
        ref={(el) => {
          if (!el) return;
          // iOS Low Power Mode refuses autoplay and paints a play glyph over a stuck frame;
          // if playback is refused the video hides itself (same handling as the main page).
          const p = el.play();
          if (p && p.catch) p.catch(() => { el.style.display = 'none'; });
        }}
        className="fixed inset-0 w-full h-full object-cover z-0"
        style={{ pointerEvents: 'none', opacity: backgroundOpacity / 100 }}>
        <source src={v.src} type="video/mp4" />
      </video>
    );
  }
  const im = IMAGE_BACKGROUNDS[selectedImage] || IMAGE_BACKGROUNDS[0];
  return (
    <div key={im.id} className="fixed inset-0 w-full h-full z-0"
      style={{ backgroundImage: `url(${im.src})`, backgroundSize: 'cover', backgroundPosition: 'center', pointerEvents: 'none', opacity: backgroundOpacity / 100 }} />
  );
}

// the phone's status bar (the layout is viewport-fit=cover): every corner placement is pushed down and in by the safe area
const SAFE_TOP = { marginTop: 'var(--safe-top, 0px)' };
const SAFE_CORNER_R = { marginTop: 'var(--safe-top, 0px)', marginRight: 'env(safe-area-inset-right, 0px)' };
const SAFE_CORNER_L = { marginTop: 'var(--safe-top, 0px)', marginLeft: 'env(safe-area-inset-left, 0px)' };
const ICON_BTN = 'w-8 h-8 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/50 backdrop-blur-sm text-zinc-400 hover:text-zinc-200 text-xs font-medium flex items-center justify-center transition-all';

// THE LIBRARY (.483): one book icon in the corner stack, opening the four written doors. Shared by
// both readers so the corner reads the same on each (founder, 2026-09-20).
const LIBRARY_LINKS = [
  { href: '/book', label: 'Book', note: 'the text itself' },
  { href: '/wiki', label: 'Wiki', note: 'the map, entry by entry' },
  { href: '/guide', label: 'Guide', note: 'how to read with it' },
  { href: '/council', label: 'Council', note: 'four architectures, one recognition' },
  { href: '/phone', label: 'Share the app', note: 'hand it to someone' },   // 2026-09-30: off the rail, into the library
];
export function LibraryMenu({ side = 'left' }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(!open)} className={`${ICON_BTN} ${open ? 'text-amber-300' : ''}`} title="Book · Wiki · Guide · Council" aria-label="The library" aria-expanded={open}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div style={SAFE_TOP} className={`fixed top-3 ${side === 'right' ? 'right-14' : 'left-14'} z-50 w-56 bg-zinc-900/95 border border-zinc-700/50 rounded-xl shadow-2xl backdrop-blur-sm p-1.5`} onClick={(e) => e.stopPropagation()}>
            {LIBRARY_LINKS.map((l) => (
              <a key={l.href} href={l.href} className="flex items-baseline gap-2 px-3 py-2 rounded-lg hover:bg-zinc-800 transition-colors">
                <span className="text-sm text-zinc-200">{l.label}</span>
                <span className="text-[0.6875rem] text-zinc-500">{l.note}</span>
              </a>
            ))}
          </div>
        </>
      )}
    </>
  );
}

// The four corner controls: background panel + feedback mail on the left, account + text size on
// the right. Shown only to a signed-in person, as on the main page.
// `collapsed` (2026-09-30, founder): the six fold behind ONE handle, docked in the header's right-hand corner lane
// (absolute, so it scrolls away with the header and never floats over the reading). Tap the handle and the six
// roll out beneath it in three labeled pairs — you / the look / the site — each a beat after the last; tap it
// again, tap anywhere else, or scroll, and they roll back. Closed on every load: the controls are offered, not
// standing. The same component, the same six; a page that does not pass `collapsed` keeps the two corner stacks.
export function CornerControls({ prefs, set, onAuthChange, rightExtra = null, collapsed = false }) {
  const [open, setOpen] = useState(false);
  const [fly, setFly] = useState(false);     // collapsed mode: the six are out
  const list = prefs.backgroundType === 'video' ? VIDEO_BACKGROUNDS : IMAGE_BACKGROUNDS;
  const idx = prefs.backgroundType === 'video' ? prefs.selectedVideo : prefs.selectedImage;
  const current = list[idx] || list[0];
  const nudge = (d) => {
    const n = (idx + d + list.length) % list.length;
    set(prefs.backgroundType === 'video' ? { selectedVideo: n } : { selectedImage: n });
  };
  // scrolling closes the flyout, so the reading always wins (a popover a control opened stays: it is not the flyout)
  useEffect(() => {
    if (!fly) return;
    let y0 = window.scrollY;
    const onScroll = () => { if (Math.abs(window.scrollY - y0) > 24) setFly(false); };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [fly]);
  const bgBtn = (
    <button onClick={() => setOpen(!open)} className={ICON_BTN} title={open ? 'Hide background controls' : 'Show background controls'}>
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </button>
  );
  const mailBtn = <a href="mailto:chriscrilly@gmail.com?subject=Nirmanakaya Feedback" className={`${ICON_BTN} hover:text-amber-400`} title="Send feedback">✉</a>;
  const authBtn = (
    <AuthButton onAuthChange={onAuthChange}
      buttonClassName="w-8 h-8 flex items-center justify-center text-purple-400 hover:text-purple-300 transition-colors rounded-lg bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/50 backdrop-blur-sm" />
  );
  const corners = collapsed ? (
    <>
      {fly && <div className="fixed inset-0 z-40" onClick={() => setFly(false)} />}
      {/* the box itself ignores taps unless the flyout is open (2026-09-30: closed, its invisible extent sat over the Reader control on a phone and swallowed every tap); only the handle is always live */}
      <div style={{ ...SAFE_CORNER_R, pointerEvents: fly ? 'auto' : 'none' }} className={`absolute top-3 right-3 z-50 flex flex-col items-end gap-1 ${fly ? '-m-2 p-2 rounded-2xl border border-zinc-800/70 bg-zinc-950/90 backdrop-blur-md shadow-2xl' : ''}`} onClick={(e) => e.stopPropagation()}> {/* .600: a backing when open — the labels sat over the brand header with the page showing through (founder's screenshot); -m-2 p-2 keeps the handle where it was */}
        <button onClick={() => setFly((f) => !f)} style={{ pointerEvents: 'auto' }} className={`${ICON_BTN} ${fly ? 'text-amber-300 border-amber-500/40' : ''}`} title={fly ? 'Put the controls away' : 'Controls'} aria-label="Controls" aria-expanded={fly}>
          <svg className={`w-4 h-4 transition-transform duration-200 motion-reduce:transition-none ${fly ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h6" />
          </svg>
        </button>
        {/* the six, in three pairs; each item lands a beat after the one before it (40 ms), and leaves in the same order reversed */}
        {[
          { cap: 'you', items: [authBtn, rightExtra].filter(Boolean) },
          { cap: 'the look', items: [<TextSizeSlider key="t" />, bgBtn] },
          { cap: 'the site', items: [mailBtn, <LibraryMenu key="l" side="right" />] },
        ].map((g, gi, arr) => {
          const before = arr.slice(0, gi).reduce((n, x) => n + x.items.length, 0);
          return (
            <div key={g.cap} className="flex items-center gap-1" style={{ pointerEvents: fly ? 'auto' : 'none' }}>
              <span className="text-[0.625rem] tracking-[0.15em] uppercase text-zinc-500 transition-opacity duration-150 motion-reduce:transition-none" style={{ opacity: fly ? 1 : 0, transitionDelay: fly ? `${(before + g.items.length) * 40}ms` : '0ms' }}>{g.cap}</span>
              {g.items.map((it, i) => {
                const n = before + i; const total = 6;
                return (
                  <div key={i} className="transition-all duration-150 ease-out motion-reduce:transition-none" aria-hidden={!fly}
                    style={{ opacity: fly ? 1 : 0, transform: fly ? 'translateY(0) scale(1)' : 'translateY(-8px) scale(0.9)', transitionDelay: `${(fly ? n : total - 1 - n) * 40}ms` }}>
                    {it}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </>
  ) : (
    <>
      <div style={SAFE_CORNER_R} className="fixed top-3 right-3 z-50 flex flex-col items-center gap-1" onClick={(e) => e.stopPropagation()}>
        {authBtn}
        <TextSizeSlider />
        {rightExtra}
      </div>
      <div style={SAFE_CORNER_L} className="fixed top-3 left-3 z-50 flex flex-col items-center gap-1">
        {bgBtn}
        {mailBtn}
        <LibraryMenu />
      </div>
    </>
  );
  return (
    <>
      {corners}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div style={SAFE_TOP} className={`fixed top-14 ${collapsed ? 'right-3' : 'left-3'} z-50 w-72 max-w-[calc(100vw-1.5rem)] bg-zinc-900/95 border border-zinc-700/50 rounded-xl shadow-2xl backdrop-blur-sm`} onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-zinc-800/50 flex items-center justify-between">
              <h3 className="text-sm font-medium text-zinc-200">Background</h3>
              <button onClick={() => setOpen(false)} className="text-zinc-500 hover:text-zinc-300">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                {['video', 'image'].map((t) => (
                  <button key={t} onClick={() => set({ backgroundType: t })}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${prefs.backgroundType === t ? 'bg-amber-600/20 text-amber-400 border border-amber-600/30' : 'bg-zinc-800/50 text-zinc-400 border border-transparent hover:bg-zinc-800'}`}>
                    {t === 'video' ? 'Video' : 'Image'}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <button onClick={() => nudge(-1)} className="p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <span className="text-sm text-zinc-300">{current.label}</span>
                <button onClick={() => nudge(1)} className="p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2"><span className="text-xs text-zinc-500">Brightness</span><span className="text-xs text-zinc-400">{prefs.backgroundOpacity}%</span></div>
                <input type="range" min="5" max="60" value={prefs.backgroundOpacity} onChange={(e) => set({ backgroundOpacity: Number(e.target.value) })}
                  className="w-full h-1 bg-zinc-700 rounded-full appearance-none cursor-pointer accent-amber-500" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2"><span className="text-xs text-zinc-500">Content Dim</span><span className="text-xs text-zinc-400">{prefs.contentDim}%</span></div>
                <input type="range" min="0" max="100" value={prefs.contentDim} onChange={(e) => set({ contentDim: Number(e.target.value) })}
                  className="w-full h-1 bg-zinc-700 rounded-full appearance-none cursor-pointer accent-amber-500" />
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/50">
                <span className="text-xs text-zinc-500">Theme</span>
                <button onClick={() => set({ theme: prefs.theme === 'dark' ? 'light' : 'dark' })} className="p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors" title={prefs.theme === 'dark' ? 'Switch to light' : 'Switch to dark'}>
                  {prefs.theme === 'dark' ? (
                    <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                  ) : (
                    <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
