'use client';

// THE CARD, IN RELIEF — a generated GLB of a card painting, turned in the hand.
// Built 2026-09-18 to judge whether image-to-3D is worth taking to all 78: the founder made one
// by hand in a web tool and asked whether we could use it. We can, through the same connection
// the loop videos use, so this is where the result lands to be looked at properly.
//
// The light is the point. A relief has real geometry, so a moving light makes it live without a
// video — which is the cheap answer to the Dormant Life idea: a mesh plus a light instead of
// eight megabytes of clip per card.

import { Suspense, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, ContactShadows, Center, Bounds } from '@react-three/drei';

function Model({ url }) {
  const { scene } = useGLTF(url);
  return (
    <Center>
      <primitive object={scene} />
    </Center>
  );
}

// A light that drifts across the face, the way a candle would. This is what makes a carving
// breathe; the geometry does the rest.
function DriftingLight({ moving = true }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (!ref.current || !moving) return;
    const t = clock.getElapsedTime() * 0.35;
    // Drift ACROSS the face — the face is on Y/Z, so the light travels in Z and rides up and
    // down in Y while staying out on X where the viewer is.
    ref.current.position.set(3.4 + Math.cos(t) * 1.1, 1.6 + Math.sin(t * 0.7) * 0.9, Math.sin(t) * 3.2);
  });
  return <directionalLight ref={ref} position={[4, 2, 2]} intensity={2.3} castShadow />;
}

export default function CardRelief({ src = '/models/10_source.glb', label = 'Source' }) {
  const [moving, setMoving] = useState(true);
  return (
    <div className="w-full h-full relative">
      {/* The slab's face is the Y/Z plane — it is thin on X — so the camera sits out on X.
          Opening on the edge of the card is a bench bug, not a feature. */}
      <Canvas shadows camera={{ position: [4, 0, 0], fov: 40 }} dpr={[1, 2]}>
        <color attach="background" args={['#0b0b0f']} />
        <ambientLight intensity={0.35} />
        <DriftingLight moving={moving} />
        <Suspense fallback={null}>
          <Bounds fit clip observe margin={1.15}>
            <Model url={src} />
          </Bounds>
          <Environment preset="sunset" />
        </Suspense>
        <ContactShadows position={[0, -1.4, 0]} opacity={0.5} blur={2.4} far={4} />
        <OrbitControls enablePan={false} minDistance={1.6} maxDistance={8} />
      </Canvas>

      <div className="absolute left-4 top-4 text-zinc-300">
        <div className="font-serif text-xl">{label}</div>
        <div className="text-[0.6875rem] uppercase tracking-wider text-zinc-500">drag to turn · scroll to come closer</div>
      </div>
      <button onClick={() => setMoving(!moving)}
        className="absolute right-4 top-4 rounded-lg border border-zinc-700 px-3 py-1.5 text-[0.8125rem] text-zinc-300 hover:border-zinc-500">
        {moving ? 'hold the light' : 'let the light move'}
      </button>
    </div>
  );
}
