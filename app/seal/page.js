'use client';
import dynamic from 'next/dynamic';

// WebGL must run client-side only
const SealCanvas = dynamic(() => import('../../components/viz/SealCanvas'), {
  ssr: false,
  loading: () => (
    <div style={{ position: 'fixed', inset: 0, background: '#06070b', color: '#8b93a4',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 13, letterSpacing: '.1em' }}>
      LOADING THE SEAL…
    </div>
  ),
});

export default function SealPage() {
  return <SealCanvas />;
}
