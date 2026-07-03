'use client';
import dynamic from 'next/dynamic';

// WebGL must run client-side only
const ShapeCanvas = dynamic(() => import('../../components/viz/ShapeCanvas'), {
  ssr: false,
  loading: () => (
    <div style={{ position: 'fixed', inset: 0, background: '#06070b', color: '#8b93a4',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 13, letterSpacing: '.1em' }}>
      DERIVING THE SHAPES…
    </div>
  ),
});

export default function ShapePage() {
  return <ShapeCanvas />;
}
