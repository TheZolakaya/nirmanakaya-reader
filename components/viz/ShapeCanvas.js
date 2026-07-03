'use client';
// components/viz/ShapeCanvas.js
// THE CARD — container + story (/shape, v2)
//
// Chris's synthesis (2026-07-02): "why can't both be right?"
//   CONTAINER = the architecture. A glass SQUARE PYRAMID — four faces for the four
//   dimensions (Practice/Activity/Being/Identity), apex = the Why (Gestalt).
//   Four around One — the quincunx (deck slides 54-57, the Sunstone).
//   The container carries the STATUS: clear / running hot / fogged / one face dark.
//   INTERIOR = the story. A meaning-first low-poly scene anyone can read
//   (Fortitude = the mountain). Scenes are chosen by MEANING (Chris's ear),
//   the address grammar renders them (color/motion/material/life-phase).
//
// v2 status: Fortitude (8) has its real scene; the other 15 carry placeholder
// interiors from the v1 grammar until their scenes are chosen.
// Addresses verified against lib/constants.js BEING_GROUPS / IDENTITY_GROUPS.

import { useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr, Edges } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { ELEMENT_COLORS, HOUSE_ELEMENT, VIZ_BG, VIZ_INK, VIZ_DIM } from '../../lib/viz/palette.js';
import { DIMENSION_VERBS } from '../../lib/constants.js';
import { ARCHETYPES } from '../../lib/archetypes.js';

// The 16 canonical addresses (Practice · Activity · Being · Identity · Stage).
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

const STATUSES = [
  { key: 'balanced',       label: 'Balanced' },
  { key: 'tooMuch',        label: 'Too Much' },
  { key: 'tooLittle',      label: 'Too Little' },
  { key: 'unacknowledged', label: 'Unacknowledged' },
];

// Pyramid dimensions (the container)
const PYR_R = 1.5;   // base "radius" (center to corner)
const PYR_H = 2.2;   // height

// ============================================================
// THE CONTAINER — glass square pyramid; four faces, apex Why.
// Status lives HERE: clear / hot / fogged / one face dark.
// ============================================================
function Container({ color, status, children }) {
  const group = useRef();
  const glassRef = useRef();

  useFrame(({ clock }) => {
    const g = group.current; if (!g) return;
    const t = clock.getElapsedTime();
    let s = 1, rotY = t * 0.22, rotZ = 0;
    if (status === 'tooMuch')   { s = 1.1 + Math.sin(t * 10) * 0.015; rotZ = Math.sin(t * 12) * 0.012; rotY = t * 0.38; }
    if (status === 'tooLittle') { s = 0.86 + Math.sin(t * 0.8) * 0.01; rotY = t * 0.1; }
    g.scale.setScalar(s);
    g.rotation.y = rotY; g.rotation.z = rotZ;
  });

  const hot = status === 'tooMuch';
  const fog = status === 'tooLittle';
  const edgeColor = hot ? '#ffb03c' : fog ? '#39404f' : color;

  return (
    <group ref={group}>
      {/* glass faces */}
      <mesh ref={glassRef}>
        <coneGeometry args={[PYR_R, PYR_H, 4, 1, true]} />
        <meshPhysicalMaterial color={hot ? '#ff5a3c' : fog ? '#626b7a' : color}
          transparent opacity={fog ? 0.38 : hot ? 0.2 : 0.1}
          roughness={fog ? 0.9 : 0.12} metalness={0.05} side={THREE.DoubleSide} depthWrite={false} />
        <Edges scale={1.001} threshold={1}>
          <lineBasicMaterial color={edgeColor} transparent opacity={hot ? 1 : 0.85} />
        </Edges>
      </mesh>
      {/* base */}
      <mesh position={[0, -PYR_H / 2, 0]} rotation={[-Math.PI / 2, Math.PI / 4, 0]}>
        <circleGeometry args={[PYR_R, 4]} />
        <meshStandardMaterial color="#0b0e16" transparent opacity={0.9} side={THREE.DoubleSide} />
        <Edges scale={1.001}><lineBasicMaterial color={edgeColor} transparent opacity={0.6} /></Edges>
      </mesh>
      {/* the Why — apex light */}
      <mesh position={[0, PYR_H / 2 + 0.12, 0]} scale={0.07}>
        <sphereGeometry args={[1, 12, 12]} />
        <meshBasicMaterial color={status === 'unacknowledged' ? '#3a3f4d' : '#ffffff'} />
      </mesh>
      {!fog && status !== 'unacknowledged' && (
        <pointLight position={[0, PYR_H / 2 + 0.1, 0]} color="#ffffff" intensity={1.2} distance={5} />
      )}
      {/* Unacknowledged: one face goes dark and shadows the interior */}
      {status === 'unacknowledged' && <DarkFace />}
      {/* the story, seated inside */}
      <group position={[0, -PYR_H / 2 + 0.08, 0]} scale={fog ? 0.5 : 0.58}>
        {children}
      </group>
    </group>
  );
}

// one darkened face of the pyramid (apex + two adjacent base corners)
function DarkFace() {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const apex = [0, PYR_H / 2, 0];
    const a = [0, -PYR_H / 2, PYR_R];
    const b = [PYR_R, -PYR_H / 2, 0];
    g.setAttribute('position', new THREE.Float32BufferAttribute([...apex, ...a, ...b], 3));
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <mesh geometry={geo} scale={1.015}>
      <meshStandardMaterial color="#000000" transparent opacity={0.88} side={THREE.DoubleSide} roughness={1} />
    </mesh>
  );
}

// ============================================================
// THE STORY — meaning-first interior scenes.
// Fortitude (8): the mountain. Others: placeholder grammar forms until chosen.
// ============================================================
function MountainScene({ status }) {
  const gold = ELEMENT_COLORS.Earth;
  const dim = status === 'tooLittle' || status === 'unacknowledged';
  const main = new THREE.Color(gold); if (dim) main.multiplyScalar(0.4);
  const rock = main.clone().multiplyScalar(0.75);
  const jag = status === 'tooMuch' ? 1.35 : 1; // Too Much: over-towering

  return (
    <group>
      {/* main peak */}
      <mesh position={[0, 0.85 * jag, 0]} scale={[1, jag, 1]}>
        <coneGeometry args={[0.95, 1.7, 6]} />
        <meshStandardMaterial color={main} flatShading roughness={0.95}
          emissive={main} emissiveIntensity={dim ? 0.03 : 0.12} />
      </mesh>
      {/* snow cap */}
      <mesh position={[0, 1.42 * jag, 0]} scale={[1, jag, 1]}>
        <coneGeometry args={[0.34, 0.55, 6]} />
        <meshStandardMaterial color={dim ? '#3c3f47' : '#f5f2e8'} flatShading roughness={0.8} />
      </mesh>
      {/* shoulder peak */}
      <mesh position={[0.75, 0.45, -0.25]}>
        <coneGeometry args={[0.5, 0.9, 5]} />
        <meshStandardMaterial color={rock} flatShading roughness={0.95} />
      </mesh>
      {/* foothill */}
      <mesh position={[-0.7, 0.28, 0.3]}>
        <coneGeometry args={[0.42, 0.56, 5]} />
        <meshStandardMaterial color={rock} flatShading roughness={0.95} />
      </mesh>
      {/* ground */}
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 4]} position={[0, 0.01, 0]}>
        <circleGeometry args={[2.2, 4]} />
        <meshStandardMaterial color={dim ? '#14161c' : '#232018'} roughness={1} />
      </mesh>
    </group>
  );
}

// v1 grammar forms, kept as placeholder interiors until each scene is chosen
function PlaceholderForm({ id, status }) {
  const addr = ADDRESSES[id];
  const color = ELEMENT_COLORS[HOUSE_ELEMENT[addr.practice]];
  const ref = useRef();
  const dim = status === 'tooLittle' || status === 'unacknowledged';
  const c = new THREE.Color(color); if (dim) c.multiplyScalar(0.45);

  useFrame(({ clock }) => {
    const g = ref.current; if (!g) return;
    const t = clock.getElapsedTime();
    let s = 1;
    if (addr.activity === 'Intent')    s = 1 + Math.sin(t * 4) * 0.05;
    if (addr.activity === 'Resonance') g.position.y = 1 + Math.sin(t * 1.1) * 0.1;
    g.rotation.y = t * (addr.activity === 'Cognition' ? 0.8 : 0.2);
    g.scale.setScalar(s);
  });

  const geo = addr.being === 'Kindle' ? <octahedronGeometry args={[0.8, 0]} />
    : addr.being === 'Passage' ? <torusGeometry args={[0.7, 0.2, 16, 48]} />
    : addr.being === 'Vessel' ? <cylinderGeometry args={[0.75, 0.4, 1, 5, 1, true]} />
    : <icosahedronGeometry args={[0.8, 0]} />;

  return (
    <group ref={ref} position={[0, 1, 0]}>
      <mesh>
        {geo}
        <meshStandardMaterial color={c} flatShading roughness={0.6}
          emissive={c} emissiveIntensity={dim ? 0.1 : 0.5}
          side={THREE.DoubleSide}
          transparent={addr.identity === 'Intimacy'} opacity={addr.identity === 'Intimacy' ? 0.6 : 1} />
      </mesh>
    </group>
  );
}

function Card({ id, status }) {
  const addr = ADDRESSES[id];
  const color = ELEMENT_COLORS[HOUSE_ELEMENT[addr.practice]];
  return (
    <Container color={color} status={status}>
      {id === 8 ? <MountainScene status={status} /> : <PlaceholderForm id={id} status={status} />}
    </Container>
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
  const [id, setId] = useState(8); // Fortitude — the mountain (first real scene)
  const [status, setStatus] = useState('balanced');
  const [depth, setDepth] = useState(0);
  const arch = ARCHETYPES[id] || {};
  const addr = ADDRESSES[id];
  const color = ELEMENT_COLORS[HOUSE_ELEMENT[addr.practice]];

  return (
    <div style={{ position: 'fixed', inset: 0, background: VIZ_BG, overflow: 'hidden',
      fontFamily: 'ui-monospace, Menlo, monospace', userSelect: 'none' }}>
      <Canvas camera={{ position: [0, 0.8, 5.2], fov: 45 }} dpr={[1, 2]}>
        <color attach="background" args={[VIZ_BG]} />
        <ambientLight intensity={0.4} />
        <directionalLight position={[3, 5, 4]} intensity={1.2} />
        <directionalLight position={[-4, -1, -3]} intensity={0.25} color="#8899ff" />
        <Card id={id} status={status} />
        <OrbitControls enablePan={false} minDistance={3} maxDistance={9} target={[0, 0.1, 0]} />
        <EffectComposer><Bloom intensity={0.6} luminanceThreshold={0.4} mipmapBlur /></EffectComposer>
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
        THE CARD — FOUR FACES AROUND THE WHY
      </div>
    </div>
  );
}
