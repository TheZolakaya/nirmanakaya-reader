'use client';

// /relief — one card as a carving, to judge whether image-to-3D is worth taking to all 78.
// ?card=10_source picks the model; the files live in public/models.

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const CardRelief = dynamic(() => import('../../components/viz/CardRelief'), {
  ssr: false,
  loading: () => <div className="h-screen flex items-center justify-center text-zinc-500">carving…</div>,
});

export default function ReliefPage() {
  const [card, setCard] = useState('10_source');
  useEffect(() => {
    try {
      const c = new URLSearchParams(window.location.search).get('card');
      if (c && /^[a-z0-9_]+$/i.test(c)) setCard(c);
    } catch {}
  }, []);
  const label = card.replace(/^\d\d_/, '').replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
  return (
    <div className="h-screen w-screen bg-[#0b0b0f]">
      <CardRelief src={`/models/${card}.glb`} label={label} />
    </div>
  );
}
