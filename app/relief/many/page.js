'use client';

// /relief/many — the stress bench. ?n=22 or ?n=78, ?tier=phone|mid|hero.
// The question it answers: how many card models can a real device push at once.
// The question it does NOT answer is on the panel, in amber, so nobody takes the easy number.

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const CardWall = dynamic(() => import('../../../components/viz/CardWall'), {
  ssr: false,
  loading: () => <div className="h-screen flex items-center justify-center text-zinc-500">building the wall…</div>,
});

const TIERS = { phone: '10_source_phone', mid: '10_source_mid', hero: '10_source_hero', full: '10_source' };

export default function ManyPage() {
  const [n, setN] = useState(22);
  const [tier, setTier] = useState('phone');

  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      const c = parseInt(q.get('n'), 10);
      if (c > 0 && c <= 200) setN(c);
      const t = q.get('tier');
      if (t && TIERS[t]) setTier(t);
    } catch {}
  }, []);

  return (
    <div className="h-screen w-screen bg-[#0b0b0f]">
      <CardWall src={`/models/${TIERS[tier]}.glb`} count={n} tier={tier} />
    </div>
  );
}
