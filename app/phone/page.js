'use client';

// /phone — "Put this on your phone" (founder, 2026-09-17). The site is a web app: on iPhone the
// only road is Safari's share sheet (three taps), on Android and desktop Chrome/Edge it is one
// tap, and this page knows which one it is talking to. When it is already running from the
// home screen it says so and gets out of the way.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import BrandHeader from '../../components/layout/BrandHeader';
import Footer from '../../components/layout/Footer';

const SITE = 'https://www.nirmanakaya.com/phone';

function detect() {
  if (typeof window === 'undefined') return { kind: 'unknown' };
  const ua = navigator.userAgent || '';
  const standalone = window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator.standalone === true;
  const iOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const android = /Android/.test(ua);
  if (standalone) return { kind: 'installed' };
  if (iOS) {
    // Safari proper vs. another browser or an in-app view (Messages, Instagram…) on iOS
    const safari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo|GSA|FBAN|FBAV|Instagram|Line\//.test(ua);
    return { kind: safari ? 'ios-safari' : 'ios-other' };
  }
  if (android) return { kind: 'android' };
  return { kind: 'desktop' };
}

const ShareGlyph = () => (
  <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3v12" /><path d="M8 7l4-4 4 4" /><path d="M5 11v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9" />
  </svg>
);
const PlusSquare = () => (
  <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="4" y="4" width="16" height="16" rx="3" /><path d="M12 8v8" /><path d="M8 12h8" />
  </svg>
);

export default function PhonePage() {
  const [d, setD] = useState({ kind: 'unknown' });
  const [prompt, setPrompt] = useState(null); // Android/desktop Chrome's install prompt, if it offers one
  const [shared, setShared] = useState('');

  useEffect(() => {
    setD(detect());
    const onPrompt = (e) => { e.preventDefault(); setPrompt(e); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  const install = async () => {
    if (!prompt) return;
    prompt.prompt();
    try { await prompt.userChoice; } catch {}
    setPrompt(null);
  };
  const share = async () => {
    try {
      if (navigator.share) { await navigator.share({ title: 'Nirmanakaya', text: 'Put Nirmanakaya on your phone', url: SITE }); setShared('sent'); return; }
      await navigator.clipboard.writeText(SITE); setShared('copied');
    } catch { setShared(''); }
  };

  const Step = ({ n, icon, children }) => (
    <li className="flex items-start gap-4">
      <span className="shrink-0 w-9 h-9 rounded-full border border-amber-500/50 text-amber-300 flex items-center justify-center font-mono text-sm">{n}</span>
      <div className="flex items-start gap-3 text-[17px] leading-relaxed text-zinc-200">
        {icon && <span className="shrink-0 mt-0.5 text-zinc-300">{icon}</span>}
        <span>{children}</span>
      </div>
    </li>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#09090b] text-zinc-100">
      <div className="flex-1 w-full max-w-xl mx-auto px-4 pt-4 pb-10">
        <BrandHeader compact />
        <h1 className="font-serif text-3xl text-zinc-100 mt-6 mb-2">{d.kind === 'installed' ? 'Share the app' : 'Put this on your phone'}</h1>
        <p className="text-zinc-400 mb-8">{d.kind === 'installed' ? 'Send someone this page and it walks them through putting Nirmanakaya on their own phone. A few taps, nothing to download.' : 'Nirmanakaya works as an app: its own icon on your home screen, full screen, no browser bars. It takes a few taps and nothing to download.'}</p>

        {d.kind === 'installed' && (
          <div className="rounded-xl border border-emerald-700/50 bg-emerald-950/30 p-5 text-emerald-100">
            You're all set — you're already running Nirmanakaya from your home screen.
            <div className="mt-4"><Link href="/" className="underline decoration-dotted">Back to the reading</Link></div>
          </div>
        )}

        {d.kind === 'ios-other' && (
          <div className="rounded-xl border border-amber-700/50 bg-amber-950/20 p-5 mb-6 text-amber-100">
            <div className="font-medium mb-1">One thing first</div>
            On an iPhone this only works from Safari. Open Safari, type <span className="font-mono">nirmanakaya.com/phone</span>, and follow the three taps below.
          </div>
        )}

        {(d.kind === 'ios-safari' || d.kind === 'ios-other' || d.kind === 'unknown') && (
          <ol className="space-y-5">
            <Step n="1">You're on this page in Safari. Good — that's the only browser Apple lets do this.</Step>
            <Step n="2" icon={<ShareGlyph />}>Tap the share button — the square with the arrow, at the bottom of the screen (on an iPad, at the top).</Step>
            <Step n="3" icon={<PlusSquare />}>Scroll the sheet down a little and tap <span className="text-zinc-100 font-medium">Add to Home Screen</span>, then <span className="text-zinc-100 font-medium">Add</span>.</Step>
          </ol>
        )}

        {d.kind === 'android' && (
          <div className="space-y-5">
            {prompt ? (
              <button onClick={install} className="w-full rounded-xl border border-amber-500/60 bg-amber-950/30 px-5 py-4 text-lg text-amber-100 hover:bg-amber-900/40">Install Nirmanakaya</button>
            ) : (
              <ol className="space-y-5">
                <Step n="1">Open the menu in Chrome — the three dots at the top right.</Step>
                <Step n="2">Tap <span className="text-zinc-100 font-medium">Add to Home screen</span> (or <span className="text-zinc-100 font-medium">Install app</span>), then <span className="text-zinc-100 font-medium">Install</span>.</Step>
              </ol>
            )}
          </div>
        )}

        {d.kind === 'desktop' && (
          <div className="space-y-5">
            {prompt ? (
              <button onClick={install} className="w-full rounded-xl border border-amber-500/60 bg-amber-950/30 px-5 py-4 text-lg text-amber-100 hover:bg-amber-900/40">Install Nirmanakaya</button>
            ) : (
              <p className="text-zinc-300 text-[17px] leading-relaxed">In Chrome or Edge, look for the small install icon at the right end of the address bar and click it. On a phone, open this page there instead — the steps are different.</p>
            )}
          </div>
        )}

        {(
          <div className="mt-10 rounded-xl border border-zinc-800 bg-zinc-950/40 p-5">
            <div className="text-zinc-300 mb-3">{d.kind === 'installed' ? 'Hand it to someone else' : 'Send this page to someone'}</div>
            <button onClick={share} className="rounded-lg border border-amber-600/60 px-4 py-2.5 text-[0.9375rem] text-amber-100 hover:border-amber-400 hover:bg-amber-950/30 transition-colors">{shared === 'sent' ? 'Sent' : shared === 'copied' ? 'Link copied' : 'Share the link'}</button>
            <div className="mt-3 font-mono text-xs text-zinc-500 break-all">{SITE}</div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
