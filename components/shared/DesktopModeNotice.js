'use client';
// .790 THE DESKTOP-MODE NOTICE (founder, 2026-10-15, the first Android test — a Galaxy Z Flip 7, the site installed as an app): Chrome's
// "Desktop site" mode ignores the page's viewport and lays the page out ~980 px wide, then shrinks it to the screen — everything tiny, and an
// installed app has no menu to switch it off. A page cannot turn that mode off, so when a phone-sized touch screen is being drawn far wider
// than it is, this says where the switch lives (in Chrome itself, which the installed app shares).
import { useEffect, useState } from 'react';

export default function DesktopModeNotice() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      if (localStorage.getItem('nkya_desktop_notice') === 'never') return;
      const touch = (navigator.maxTouchPoints || 0) > 0 || 'ontouchstart' in window;
      const sw = Math.min(window.screen?.width || 0, window.screen?.height || 0) || window.screen?.width || 0;
      const drawnWide = sw > 0 && sw < 700 && window.innerWidth > sw * 1.4;
      if (touch && drawnWide) setShow(true);
    } catch {}
  }, []);
  if (!show) return null;
  const standalone = (() => { try { return window.matchMedia('(display-mode: standalone)').matches; } catch { return false; } })();
  return (
    <div role="status" style={{ fontSize: '2.4rem', lineHeight: 1.35 }} className="fixed inset-x-0 top-0 z-[100] bg-amber-950/95 border-b-4 border-amber-500/60 text-amber-50 px-8 py-8">
      <p className="font-medium">This phone is showing the desktop version of Nirmanakaya, so everything is tiny.</p>
      <p className="mt-4 text-amber-100/90">
        {standalone
          ? <>Open the Chrome app itself, tap the three dots ⋮ → Settings → Site settings → Desktop site, and turn it off. Then come back here and reopen the app.</>
          : <>Tap the three dots ⋮ at the top right of Chrome and uncheck “Desktop site”. If it keeps coming back: ⋮ → Settings → Site settings → Desktop site → off.</>}
      </p>
      <div className="mt-6 flex gap-6">
        <button type="button" onClick={() => setShow(false)} className="underline">Not now</button>
        <button type="button" onClick={() => { setShow(false); try { localStorage.setItem('nkya_desktop_notice', 'never'); } catch {} }} className="underline">Don’t show again</button>
      </div>
    </div>
  );
}
