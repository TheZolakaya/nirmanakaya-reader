'use client';

// THE WALL — N copies of a card model on one page, to find the ceiling on a real device.
// Built 2026-09-18 at the founder's question: "post 22 and 78 of our 3d model on a single page
// to see if our phone will serve it."
//
// READ THIS BEFORE TRUSTING THE NUMBER. Every card here is the SAME model, so three.js uploads
// its geometry and its three textures exactly ONCE and every copy reuses them. That makes this
// an honest test of DRAW CALLS and TRIANGLE THROUGHPUT and a dishonest test of MEMORY: 78
// different cards would each carry their own textures — roughly 17 MB of VRAM apiece at the
// phone tier, about 1.3 GB for the deck, which no phone will hold. The panel reports both the
// measured figure and that projection side by side so the flattering one can't be mistaken for
// the real one.
//
// The device that matters is his phone, so everything here is measured live rather than assumed:
// frames per second, draw calls, triangles, and what the renderer says it is actually holding.

import { Suspense, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';

// VRAM for three 1024x1024 maps, uncompressed with mipmaps — what ONE unique card costs.
const MB_PER_UNIQUE_CARD = 17;

function Wall({ url, count }) {
  const { scene } = useGLTF(url);

  // Clones share geometry and material with the original, which is the point: this is the
  // cheap case, and naming it as the cheap case is half the finding.
  const copies = useMemo(() => {
    const cols = Math.ceil(Math.sqrt(count * 1.3));
    const rows = Math.ceil(count / cols);
    const gap = 1.08;
    return Array.from({ length: count }, (_, i) => {
      const c = i % cols;
      const r = Math.floor(i / cols);
      // The face lies on the Y/Z plane and the camera sits out on X, so the wall is laid out
      // in Z (across) and Y (down) — spreading it on X would show 78 edges.
      return {
        key: i,
        obj: scene.clone(true),
        pos: [0, ((rows - 1) / 2 - r) * gap, (c - (cols - 1) / 2) * gap],
      };
    });
  }, [scene, count]);

  return (
    <group>
      {copies.map(({ key, obj, pos }) => (
        <primitive key={key} object={obj} position={pos} />
      ))}
    </group>
  );
}

// Everything on this panel is read off the renderer, not estimated — except the projection,
// which is labelled as a projection.
function Meter({ count, onRead }) {
  const { gl } = useThree();
  const frames = useRef(0);
  const last = useRef(performance.now());

  useFrame(() => {
    frames.current += 1;
    const now = performance.now();
    if (now - last.current >= 500) {
      const fps = Math.round((frames.current * 1000) / (now - last.current));
      frames.current = 0;
      last.current = now;
      onRead({
        fps,
        calls: gl.info.render.calls,
        tris: gl.info.render.triangles,
        geometries: gl.info.memory.geometries,
        textures: gl.info.memory.textures,
      });
    }
  });
  return null;
}

function Spin({ on }) {
  useFrame(({ scene, clock }) => {
    if (on) scene.rotation.y = Math.sin(clock.getElapsedTime() * 0.15) * 0.35;
  });
  return null;
}

export default function CardWall({ src = '/models/10_source_phone.glb', count = 22, tier = 'phone' }) {
  const [read, setRead] = useState(null);
  const [spin, setSpin] = useState(true);

  // The cheap case (what this page measures) against the real case (78 unique cards).
  const projected = count * MB_PER_UNIQUE_CARD;

  // Stand back far enough that the whole wall is in frame, however many cards it holds.
  const cols = Math.ceil(Math.sqrt(count * 1.3));
  const dist = Math.max(6, cols * 1.35 + 4);

  return (
    <div className="w-full h-full relative">
      <Canvas camera={{ position: [dist, 0, 0], fov: 45 }} dpr={[1, 2]}>
        <color attach="background" args={['#0b0b0f']} />
        <ambientLight intensity={0.9} />
        <directionalLight position={[8, 4, 3]} intensity={2.6} />
        <directionalLight position={[6, -3, -4]} intensity={1.1} />
        <Suspense fallback={null}>
          <Wall url={src} count={count} />
        </Suspense>
        <Spin on={spin} />
        <Meter count={count} onRead={setRead} />
        <OrbitControls enablePan={false} minDistance={2} maxDistance={40} />
      </Canvas>

      <div className="absolute left-3 top-3 right-3 flex flex-wrap items-start gap-3">
        <div className="rounded-lg bg-black/70 px-3 py-2 text-zinc-200 text-[0.8125rem] leading-relaxed">
          <div className="font-serif text-lg text-zinc-100">{count} cards · {tier} tier</div>
          {read ? (
            <div className="mt-1 tabular-nums">
              <div className={read.fps >= 50 ? 'text-emerald-400' : read.fps >= 28 ? 'text-amber-400' : 'text-red-400'}>
                {read.fps} fps
              </div>
              <div className="text-zinc-400">{read.calls} draw calls</div>
              <div className="text-zinc-400">{read.tris.toLocaleString()} triangles / frame</div>
              <div className="text-zinc-400">{read.geometries} geometries · {read.textures} textures held</div>
            </div>
          ) : (
            <div className="mt-1 text-zinc-500">measuring…</div>
          )}
        </div>

        <div className="rounded-lg border border-amber-700/50 bg-black/70 px-3 py-2 text-[0.75rem] leading-relaxed text-amber-200/90 max-w-xs">
          <div className="uppercase tracking-wider text-amber-400 text-[0.6875rem]">what this does not measure</div>
          <div className="mt-1 text-zinc-300">
            Every card here is the <strong>same</strong> model, so its textures are uploaded once
            ({read ? read.textures : 3} held). {count} <em>different</em> cards would each carry their own —
            about <strong>{projected} MB</strong> of texture memory at this tier.
            The frame rate is real. The memory is the cheap case.
          </div>
        </div>
      </div>

      <button
        onClick={() => setSpin(!spin)}
        className="absolute right-3 bottom-3 rounded-lg border border-zinc-700 bg-black/70 px-3 py-1.5 text-[0.8125rem] text-zinc-300"
      >
        {spin ? 'hold still' : 'keep it moving'}
      </button>
    </div>
  );
}
