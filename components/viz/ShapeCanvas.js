'use client';
// components/viz/ShapeCanvas.js
// THE SIGNATURE SHAPE GRAMMAR — prototype (/shape)
//
// Shapes are DERIVED, not designed. Each manifest archetype's body is generated
// from its five-part canonical address (spec: SPEC_Signature_Shape_Grammar_2026-07-02):
//   Being      → base form   (Mantle shell · Kindle radiant core · Vessel cup · Passage ring)
//   Activity   → motion      (Intent pulse · Cognition orbit · Resonance wave · Structure stillness)
//   Identity   → material    (Composure matte · Conviction facets · Exploration wireframe · Intimacy translucent)
//   Practice   → color       (element-true, lib/viz/palette.js)
//   Stage      → life-phase  (Seed compact → Feedback return-loop)
// Status is rendered, never labeled (Balanced / Too Much / Too Little / Unacknowledged).
//
// Addresses verified against lib/constants.js BEING_GROUPS / IDENTITY_GROUPS (Latin squares).

import { useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { ELEMENT_COLORS, HOUSE_ELEMENT, VIZ_BG, VIZ_INK, VIZ_DIM } from '../../lib/viz/palette.js';
import { DIMENSION_VERBS, BEING_GROUPS, IDENTITY_GROUPS } from '../../lib/constants.js';
import { ARCHETYPES } from '../../lib/archetypes.js';

// The 16 canonical addresses (Practice · Activity · Being · Identity · Stage).
// Source of truth: lib/constants.js group tables; hardcoded here for render speed,
// cross-checked in the spec. Latin square: Being×Identity intersections ARE the 16.
const ADDRESSES = {
  2:  { practice: 'Spirit',  activity: 'Cognition', being: 'Kindle',  identity: 'Conviction',  stage: 'Seed'     },
  3:  { practice: 'Spirit',  activity: 'Structure', being: 'Vessel',  identity: 'Intimacy',    stage: 'Medium'   },
  4:  { practice: 'Mind',    activity: 'Intent',    being: 'Vessel',  identity: 'Exploration', stage: 'Seed'     },
  5:  { practice: 'Mind',    activity: 'Resonance', being: 'Kindle',  identity: 'Composure',   stage: 'Medium'   },
  6:  { practice: 'Emotion', activity: 'Resonance', being: 'Passage', identity: 'Intimacy',    stage: 'Seed'     },
  7:  { practice: 'Emotion', activity: 'Intent',    being: 'Mantle',  identity: 'Conviction',  stage: 'Medium'   },
  8:  { practice: 'Body',    activity: 'Structure', being: 'Mantle',  identity: 'Composure',   stage: 'Seed'     },
  9:  { practice: 'Body',    activity: 'Cognition', being: 'Passage', identity: 'Exploration', stage: 'Medium'   },
  11: { practice: 'Body',    activity: 'Resonance', being: 'Vessel',  identity: 'Conviction',  stage: 'Fruition' },
  12: { practice: 'Body',    activity: 'Intent',    being: 'Kindle',  identity: 'Intimacy',    stage: 'Feedback' },
  13: { practice: 'Emotion', activity: 'Structure', being: 'Kindle',  identity: 'Exploration', stage: 'Fruition' },
  14: { practice: 'Emotion', activity: 'Cognition', being: 'Vessel',  identity: 'Composure',   stage: 'Feedback' },
  15: { practice: 'Mind',    activity: 'Cognition', being: 'Mantle',  identity: 'Intimacy',    stage: 'Fruition' },
  16: { practice: 'Mind',    activity: 'Structure', being: 'Passage', identity: 'Conviction',  stage: 'Feedback' },
  17: { practice: 'Spirit',  activity: 'Intent',    being: 'Passage', identity: 'Composure',   stage: 'Fruition' },
  18: { practice: 'Spirit',  activity: 'Resonance', being: 'Mantle',  identity: 'Exploration', stage: 'Feedback' },
};
const MANIFEST_IDS = Object.keys(ADDRESSES).map(Number);

const STAGE_SCALE = { Seed: 0.62, Medium: 0.82, Fruition: 1.0, Feedback: 1.0 };

const STATUSES = [
  { key: 'balanced',       label: 'Balanced' },
  { key: 'tooMuch',        label: 'Too Much' },
  { key: 'tooLittle',      label: 'Too Little' },
  { key: 'unacknowledged', label: 'Unacknowledged' },
];

// ---------- material by Identity ----------
function useIdentityMaterial(identity, color, status) {
  return useMemo(() => {
    const c = new THREE.Color(color);
    const dim = status === 'tooLittle' || status === 'unacknowledged';
    if (dim) c.multiplyScalar(0.45);
    const hot = status === 'tooMuch';
    const base = {
      color: c,
      emissive: c.clone().multiplyScalar(hot ? 0.9 : dim ? 0.08 : 0.3),
      roughness: 0.9, metalness: 0.05, flatShading: false,
      transparent: false, opacity: 1,
    };
    if (identity === 'Conviction')  { base.flatShading = true; base.metalness = 0.6; base.roughness = 0.25; }
    if (identity === 'Exploration') { base.roughness = 0.7; base.metalness = 0.2; base.flatShading = true; }
    if (identity === 'Intimacy')    { base.transparent = true; base.opacity = 0.55; base.roughness = 0.4;
                                      base.emissive = c.clone().multiplyScalar(hot ? 1.0 : 0.45); }
    return base;
  }, [identity, color, status]);
}

// ---------- base form by Being ----------
function BeingForm({ being, identity, color, status }) {
  const mat = useIdentityMaterial(identity, color, status);
  const wire = identity === 'Exploration';
  const inner = new THREE.Color(color).multiplyScalar(status === 'tooLittle' ? 0.5 : 1.4);

  if (being === 'Mantle') {
    // shell around a core: force beneath the surface
    return (
      <group>
        <mesh>
          <icosahedronGeometry args={[1, wire ? 1 : 2]} />
          <meshStandardMaterial {...mat} transparent opacity={identity === 'Intimacy' ? 0.4 : 0.55} side={THREE.DoubleSide} />
        </mesh>
        {wire && (
          <mesh scale={1.001}>
            <icosahedronGeometry args={[1, 1]} />
            <meshBasicMaterial color={color} wireframe transparent opacity={0.5} />
          </mesh>
        )}
        <mesh scale={0.5}>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color={inner} emissive={inner} emissiveIntensity={1.4} />
        </mesh>
      </group>
    );
  }

  if (being === 'Kindle') {
    // radiant core: light passes through the carrier
    return (
      <group>
        <mesh>
          <octahedronGeometry args={[0.85, wire ? 0 : 1]} />
          <meshStandardMaterial {...mat} emissiveIntensity={status === 'tooMuch' ? 2.2 : 1.3} />
        </mesh>
        {wire && (
          <mesh scale={1.002}>
            <octahedronGeometry args={[0.85, 0]} />
            <meshBasicMaterial color={color} wireframe transparent opacity={0.55} />
          </mesh>
        )}
        <mesh scale={1.25}>
          <octahedronGeometry args={[0.85, 1]} />
          <meshBasicMaterial color={inner} transparent opacity={0.12} />
        </mesh>
        <pointLight color={color} intensity={status === 'tooMuch' ? 6 : 3} distance={8} />
      </group>
    );
  }

  if (being === 'Vessel') {
    // open cup holding a float: form that contains
    const points = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      points.push(new THREE.Vector2(0.25 + 0.75 * Math.pow(t, 0.65), -0.8 + 1.6 * t));
    }
    return (
      <group>
        <mesh>
          <latheGeometry args={[points, wire ? 12 : 40]} />
          <meshStandardMaterial {...mat} side={THREE.DoubleSide} />
        </mesh>
        {wire && (
          <mesh scale={1.002}>
            <latheGeometry args={[points, 12]} />
            <meshBasicMaterial color={color} wireframe transparent opacity={0.4} />
          </mesh>
        )}
        <mesh position={[0, 0.45, 0]} scale={0.3}>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color={inner} emissive={inner} emissiveIntensity={1.2} />
        </mesh>
      </group>
    );
  }

  // Passage: the ring — density gives way, you can see through
  return (
    <group>
      <mesh rotation={[Math.PI / 2 - 0.35, 0, 0]}>
        <torusGeometry args={[0.85, 0.24, wire ? 8 : 24, wire ? 24 : 64]} />
        <meshStandardMaterial {...mat} />
      </mesh>
      {wire && (
        <mesh rotation={[Math.PI / 2 - 0.35, 0, 0]} scale={1.002}>
          <torusGeometry args={[0.85, 0.24, 8, 24]} />
          <meshBasicMaterial color={color} wireframe transparent opacity={0.5} />
        </mesh>
      )}
      <PassingLight color={inner} />
    </group>
  );
}

// small sphere that passes through the Passage aperture
function PassingLight({ color }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const z = Math.sin(t * 0.9) * 1.6;
    if (ref.current) {
      ref.current.position.set(0, z * 0.33, z);
      ref.current.scale.setScalar(0.14 * (1 - Math.abs(Math.sin(t * 0.9)) * 0.4));
    }
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[1, 12, 12]} />
      <meshBasicMaterial color={color} transparent opacity={0.85} />
    </mesh>
  );
}

// Cognition satellites
function Satellites({ color }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = clock.getElapsedTime() * 0.9;
  });
  return (
    <group ref={ref}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[
          Math.cos((i / 3) * Math.PI * 2) * 1.5, Math.sin(i * 2.1) * 0.25,
          Math.sin((i / 3) * Math.PI * 2) * 1.5]} scale={0.12}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} />
        </mesh>
      ))}
    </group>
  );
}

// dark twin for Unacknowledged
function DarkTwin({ being }) {
  const geo = being === 'Kindle' ? <octahedronGeometry args={[0.85, 1]} />
    : being === 'Passage' ? <torusGeometry args={[0.85, 0.24, 16, 48]} />
    : <icosahedronGeometry args={[1, 2]} />;
  const rot = being === 'Passage' ? [Math.PI / 2 - 0.35, 0, 0] : [0, 0, 0];
  return (
    <mesh position={[0.45, 0.3, -1.1]} scale={1.08} rotation={rot}>
      {geo}
      <meshStandardMaterial color="#000000" roughness={1} transparent opacity={0.82} />
    </mesh>
  );
}

// ---------- the assembled signature: motion (Activity) + life-phase (Stage) + status ----------
function Signature({ id, status }) {
  const addr = ADDRESSES[id];
  const color = ELEMENT_COLORS[HOUSE_ELEMENT[addr.practice]];
  const group = useRef();
  const base = STAGE_SCALE[addr.stage]
    * (status === 'tooMuch' ? 1.22 : status === 'tooLittle' ? 0.72 : 1);

  useFrame(({ clock }) => {
    const g = group.current; if (!g) return;
    const t = clock.getElapsedTime();
    let s = base, x = 0, y = 0, rotY = t * 0.15, rotZ = 0;

    // Activity → motion
    if (addr.activity === 'Intent')      { s *= 1 + Math.sin(t * 4.2) * 0.05 + Math.sin(t * 9.1) * 0.015; rotY = t * 0.45; }
    if (addr.activity === 'Cognition')   { rotY = t * 0.7; }
    if (addr.activity === 'Resonance')   { y = Math.sin(t * 1.1) * 0.12; rotZ = Math.sin(t * 0.7) * 0.08; s *= 1 + Math.sin(t * 1.1) * 0.02; }
    if (addr.activity === 'Structure')   { rotY = t * 0.06; y = Math.sin(t * 0.4) * 0.02; }

    // Stage → Feedback return-loop drift
    if (addr.stage === 'Feedback') { x = Math.cos(t * 0.5) * 0.18; y += Math.sin(t * 0.5) * 0.18; }

    // Status → strain / flicker
    if (status === 'tooMuch')   { rotZ += Math.sin(t * 13) * 0.02; s *= 1 + Math.sin(t * 11) * 0.02; }
    if (status === 'tooLittle') { s *= 1 + Math.sin(t * 0.9) * 0.03; }

    g.scale.setScalar(s);
    g.position.set(x, y, 0);
    g.rotation.y = rotY; g.rotation.z = rotZ;
  });

  return (
    <group>
      <group ref={group}>
        <BeingForm being={addr.being} identity={addr.identity} color={color} status={status} />
        {addr.activity === 'Cognition' && <Satellites color={color} />}
      </group>
      {status === 'unacknowledged' && <DarkTwin being={addr.being} />}
    </group>
  );
}

// ---------- text pyramid ----------
function addressSentence(id) {
  const a = ADDRESSES[id];
  return [
    DIMENSION_VERBS.Practice[a.practice] + 's',
    DIMENSION_VERBS.Activity[a.activity] + 's',
    DIMENSION_VERBS.Being[a.being] + 's',
    DIMENSION_VERBS.Identity[a.identity] + 's',
  ].join(' · ') + ' — ' + a.stage;
}

export default function ShapeCanvas() {
  const [id, setId] = useState(7); // Drive — the Chariot charges
  const [status, setStatus] = useState('balanced');
  const [depth, setDepth] = useState(0); // text pyramid: 0 name, 1 address, 2 description
  const arch = ARCHETYPES[id] || {};
  const addr = ADDRESSES[id];
  const color = ELEMENT_COLORS[HOUSE_ELEMENT[addr.practice]];

  return (
    <div style={{ position: 'fixed', inset: 0, background: VIZ_BG, overflow: 'hidden',
      fontFamily: 'ui-monospace, Menlo, monospace', userSelect: 'none' }}>
      <Canvas camera={{ position: [0, 0.4, 4.2], fov: 45 }} dpr={[1, 2]}>
        <color attach="background" args={[VIZ_BG]} />
        <ambientLight intensity={0.35} />
        <directionalLight position={[3, 4, 5]} intensity={1.1} />
        <directionalLight position={[-4, -2, -3]} intensity={0.25} color="#8899ff" />
        <Signature id={id} status={status} />
        <OrbitControls enablePan={false} minDistance={2.2} maxDistance={8} />
        <EffectComposer><Bloom intensity={0.7} luminanceThreshold={0.35} mipmapBlur /></EffectComposer>
        <AdaptiveDpr pixelated />
      </Canvas>

      {/* name + text pyramid (tap to deepen) */}
      <div onClick={() => setDepth((d) => (d + 1) % 3)}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 96, padding: '0 20px',
          textAlign: 'center', color: VIZ_INK, cursor: 'pointer' }}>
        <div style={{ fontSize: 20, letterSpacing: '.25em', color }}>{(arch.name || '').toUpperCase()}</div>
        {depth >= 1 && (
          <div style={{ fontSize: 12, marginTop: 8, color: VIZ_DIM, letterSpacing: '.08em' }}>
            {addressSentence(id)}
          </div>
        )}
        {depth >= 2 && (
          <div style={{ fontSize: 12, marginTop: 8, color: VIZ_DIM, maxWidth: 560,
            marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
            {arch.description}
          </div>
        )}
        {depth === 0 && <div style={{ fontSize: 10, marginTop: 6, color: '#3a4152' }}>tap to deepen</div>}
      </div>

      {/* status pills */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 56, display: 'flex',
        justifyContent: 'center', gap: 8, flexWrap: 'wrap', padding: '0 12px' }}>
        {STATUSES.map((s) => (
          <button key={s.key} onClick={() => setStatus(s.key)}
            style={{ background: status === s.key ? '#1b2233' : 'transparent',
              border: `1px solid ${status === s.key ? color : '#252b3a'}`,
              color: status === s.key ? VIZ_INK : VIZ_DIM, borderRadius: 999,
              padding: '5px 12px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* archetype selector */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 10, display: 'flex',
        gap: 6, overflowX: 'auto', padding: '4px 12px', WebkitOverflowScrolling: 'touch' }}>
        {MANIFEST_IDS.map((n) => {
          const c = ELEMENT_COLORS[HOUSE_ELEMENT[ADDRESSES[n].practice]];
          return (
            <button key={n} onClick={() => { setId(n); setDepth(0); }}
              style={{ minWidth: 34, height: 34, borderRadius: 8, flex: '0 0 auto',
                background: id === n ? '#141a28' : 'transparent',
                border: `1px solid ${id === n ? c : '#20263500'}`,
                color: c, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
              {n}
            </button>
          );
        })}
      </div>

      <div style={{ position: 'absolute', top: 14, left: 0, right: 0, textAlign: 'center',
        fontSize: 10, letterSpacing: '.3em', color: '#3a4152' }}>
        THE SHAPE GRAMMAR — DERIVED, NOT DESIGNED
      </div>
    </div>
  );
}
