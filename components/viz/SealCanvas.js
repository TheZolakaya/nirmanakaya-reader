'use client';
// components/viz/SealCanvas.js
// THE LIVING MAP — one react-three-fiber scene that animates through the entire derivation:
//
//   I AM → First Node → The Four → The Ten → Map → Axis → Seal
//
// The four stages ARE the four Gestalt archetypes (canonical, RPA §IV.B):
//   Fool(0)=Seed · Magician(1)=Medium · Sun(19)=Fruition · Judgment(20)=Feedback.
// Node A = Fool↔Judgment (Seed/Feedback). Node B = Magician↔Sun (Medium/Fruition).
// Two polarities require four positions — four from one. From there: the ten fundamental
// nodes (Tetractys), the five houses (Map / Axis), and the 40-fold tesseract (Seal).
//
// General morph engine: every object eases position (snapshot→target) and opacity per view.

import { useRef, useMemo, useState, useEffect } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, AdaptiveDpr, Billboard } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { ARCHETYPES } from '../../lib/archetypes.js';
import { FUNDAMENTAL_NODES } from '../../lib/viz/fundamentalNodes.js';
import { houseColor, ELEMENT_COLORS, VIZ_INK, VIZ_DIM } from '../../lib/viz/palette.js';

const AETHER = ELEMENT_COLORS.Aether;
const SOURCE_GLOW = '#2a0a52';
const CREATION_COLOR = '#1d4ed8';

const VERTICES = {
  17: [0,0,0,0],  7: [1,0,0,0],  4: [0,1,0,0], 12: [1,1,0,0],
   2: [0,0,0,1], 14: [1,0,0,1], 15: [0,1,0,1],  9: [1,1,0,1],
  18: [0,0,1,0],  6: [1,0,1,0],  5: [0,1,1,0], 11: [1,1,1,0],
   3: [0,0,1,1], 13: [1,0,1,1], 16: [0,1,1,1],  8: [1,1,1,1],
};
const IDS = Object.keys(VERTICES).map(Number);
const GESTALT_IDS = [0, 1, 19, 20]; // Fool, Magician, Sun, Judgment

const EDGES = (() => {
  const e = [];
  for (let i = 0; i < IDS.length; i++) for (let j = i + 1; j < IDS.length; j++) {
    const a = VERTICES[IDS[i]], b = VERTICES[IDS[j]]; let c = 0;
    for (let k = 0; k < 4; k++) if (a[k] !== b[k]) c++;
    if (c === 1) e.push([IDS[i], IDS[j]]);
  }
  return e;
})();

// MAP layout
const HOUSE = { Soul:[0,3.0], Mind:[-3.9,0.5], Emotion:[3.9,0.5], Body:[-3.9,-3.4], Spirit:[3.9,-3.4] };
const D = 1.1, DD = 0.82;
const MAP_POS = {};
const setHouse = (c, m) => { const [cx, cy] = c; for (const id in m) MAP_POS[id] = [cx + m[id][0], cy + m[id][1], 0]; };
setHouse(HOUSE.Mind,    { 15:[0,D], 5:[D,0], 4:[0,-D], 16:[-D,0] });
setHouse(HOUSE.Emotion, { 14:[0,D], 13:[D,0], 7:[0,-D], 6:[-D,0] });
setHouse(HOUSE.Body,    { 9:[0,D], 8:[D,0], 12:[0,-D], 11:[-D,0] });
setHouse(HOUSE.Spirit,  { 2:[0,D], 18:[D,0], 17:[0,-D], 3:[-D,0] });
setHouse(HOUSE.Soul,    { 20:[-DD,DD], 19:[DD,DD], 0:[-DD,-DD], 1:[DD,-DD] });
MAP_POS[10] = [0, 5.9, 0]; MAP_POS[21] = [0, -5.8, 0];

// AXIS / SOURCE PATTERN — the 1991 "first unfolding", laid on its side:
// ten fundamental nodes on a horizontal spine; each carries a vertical pair summing to 20
// (bottom id c, top id 20−c). Wheel(10)=Creator at the right hinge, World(21)=Creation at the left.
const AX_GAP = 0.95, AX_ROW = 1.6, AX_END = 1.5;
const axCol = (c) => (c - 4.5) * AX_GAP;     // column c = 0..9, left → right
const AXIS_POS = {};
for (let c = 0; c <= 9; c++) { AXIS_POS[c] = [axCol(c), -AX_ROW, 0]; AXIS_POS[20 - c] = [axCol(c), AX_ROW, 0]; }
AXIS_POS[10] = [axCol(9) + AX_END, 0, 0];    // Wheel / Creator — right hinge
AXIS_POS[21] = [axCol(0) - AX_END, 0, 0];    // World / Creation — left hinge
const FN_AXIS = {}; for (let N = 1; N <= 10; N++) FN_AXIS[N] = [axCol(10 - N), 0, 0];  // node N at col 10−N (node 1 by the Wheel)
// each fundamental node sources two signatures: node k → left (10−k) and right (10+k)
const ARCH_NODE = {};
for (let i = 0; i <= 9; i++) ARCH_NODE[i] = 10 - i;       // left arm: 9←1 … 0←10
for (let a = 11; a <= 20; a++) ARCH_NODE[a] = a - 10;     // right arm: 11←1 … 20←10
const ALL_ARCH = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
const GESTALT_SET = new Set([0, 1, 19, 20]);

// THE FORTY-FOLD SEAL — the 4×4 magic square (canonical, Elemental_Designator_Derivation):
// every row, every column, every 2×2 quadrant sums to 40.
const GRID_ORDER = [[17, 7, 4, 12], [2, 14, 15, 9], [18, 6, 5, 11], [3, 13, 16, 8]];
const GRID_GAP = 1.7;
const GRID_POS = {};
GRID_ORDER.forEach((row, r) => row.forEach((id, c) => { GRID_POS[id] = [(c - 1.5) * GRID_GAP, (1.5 - r) * GRID_GAP, 0]; }));
const GRID_EDGE = 1.5 * GRID_GAP;

// FIRST NODE — the single polarity. I Am lower, Why Am I? on top — matches the Four (no flip).
const FIRST_POS = { 0: [0, -1.6, 0], 20: [0, 1.6, 0] };
// THE FOUR — two parallel vertical nodes. Node A (left): Seed bottom, Feedback top.
// Node B (right): Medium bottom, Fruition top. The light cycles Seed→Medium→Fruition→Feedback.
const FOUR_POS = { 0: [-1.05, -1.5, 0], 20: [-1.05, 1.5, 0], 1: [1.05, -1.5, 0], 19: [1.05, 1.5, 0] };
const CYCLE_ORDER = [0, 1, 19, 20]; // Seed → Medium → Fruition → Feedback

// THE TEN — the Four (cubes) become row headers on the left; each header spawns its count
// of spheres (Seed=1, Medium=2, Fruition=3, Feedback=4 → 10). The ten quantify the four.
const TEN_HEADER_POS = { 0: [-2.8, 1.7, 0], 1: [-2.8, 0.55, 0], 19: [-2.8, -0.6, 0], 20: [-2.8, -1.75, 0] };
const TEN_COUNT = { 0: 1, 1: 2, 19: 3, 20: 4 };
// links from each header cube to the fundamental-node spheres of its row: [gid, fnodeCount]
const TEN_LINKS = [[0, 1], [1, 2], [1, 3], [19, 4], [19, 5], [19, 6], [20, 7], [20, 8], [20, 9], [20, 10]];
// the Ten's traveling light cycles the four headers; each row pulses when its stage is active
const HEADER_BY_STAGE = [0, 1, 19, 20]; // Seed, Medium, Fruition, Feedback
const FN_STAGE = { 1: 0, 2: 1, 3: 1, 4: 2, 5: 2, 6: 2, 7: 3, 8: 3, 9: 3, 10: 3 };
const TET_POS = {}; { let n = 0; for (let r = 0; r < 4; r++) { const y = 1.7 - r * 1.15; for (let i = 0; i <= r; i++) TET_POS[++n] = [0.6 + (i - r / 2) * 1.05, y, 0]; } }

const bitVec = (b) => b.map((x) => (x ? 1 : -1));
const rot4 = (p, a, b, ang) => { const q = p.slice(), c = Math.cos(ang), s = Math.sin(ang); q[a] = p[a]*c - p[b]*s; q[b] = p[a]*s + p[b]*c; return q; };
const project = (p, d = 2.6) => { const f = 1.8 / (d - p[3]); return [p[0]*f, p[1]*f, p[2]*f]; };
const rotY = ([x,y,z], a) => { const c = Math.cos(a), s = Math.sin(a); return [x*c + z*s, y, -x*s + z*c]; };
const rotX = ([x,y,z], a) => { const c = Math.cos(a), s = Math.sin(a); return [x, y*c - z*s, y*s + z*c]; };
const SCALE = 2.3;
const ease = (x) => x * x * (3 - 2 * x);
const approach = (cur, tgt, k) => cur + (tgt - cur) * k;

const ORBIT_VIEWS = new Set(['seal']);
const CUBE_VIEWS = new Set(['iam', 'first', 'four', 'ten']);   // the transcendent Four render as cubes
const SPHERE_VIEWS = new Set(['map', 'axis', 'seal']);          // in manifestation they become spheres
const flatZ = { iam: 8, first: 8, four: 8, ten: 11, map: 14, axis: 13.5, grid: 11 };
// content extents per state (scene units, incl. label margin) → fit the camera to any screen/aspect
const CONTENT = { iam: { w: 4, h: 4 }, first: { w: 4, h: 5 }, four: { w: 5, h: 5 }, ten: { w: 8, h: 6 }, axis: { w: 13, h: 5.5 }, map: { w: 10, h: 14 }, grid: { w: 7, h: 7.5 } };
const TANHALF = Math.tan((50 * Math.PI / 180) / 2);
function fitZ(view, aspect) {
  const c = CONTENT[view]; if (!c) return 12;
  const zH = (c.h / 2) / TANHALF;
  const zW = (c.w / 2) / (TANHALF * Math.max(aspect, 0.4));
  return Math.max(zH, zW) * 1.08;
}
const AXIS_PAUSE = 1.7, AXIS_EMERGE = 1.5;   // axis: pillar instantiates, a beat, then the 20 emerge
const clamp01 = (x) => Math.min(1, Math.max(0, x));

function labelStyle(color, dy = -22, size = 13) {
  return { fontFamily: 'ui-monospace, Menlo, monospace', color, fontSize: size, fontWeight: 700, whiteSpace: 'nowrap', textShadow: '0 1px 6px #000', transform: `translateY(${dy}px)`, pointerEvents: 'none' };
}

function SealScene({ view, segments, controlsRef, aspect }) {
  const manifest = useRef({}), gestalt = useRef({}), fnode = useRef({});
  const gCube = useRef({}), gSphere = useRef({});
  const sourceGrp = useRef(), srcCore = useRef(), srcCorona = useRef();
  const creationRingGrp = useRef(), creationRipple = useRef(), creationNode = useRef();
  const edgeLine = useRef(), radialLine = useRef(), tetraEdge = useRef(), nodeA = useRef(), nodeB = useRef();
  const pulse = useRef(), cycleEdges = useRef(), tenLinks = useRef(), emergeLines = useRef();
  const cycleArr = useMemo(() => new Float32Array(2 * 2 * 3), []);
  const tenLinkArr = useMemo(() => new Float32Array(TEN_LINKS.length * 2 * 3), []);
  const emergeArr = useMemo(() => new Float32Array(ALL_ARCH.length * 2 * 3), []);

  const base = useMemo(() => Object.fromEntries(IDS.map((id) => [id, bitVec(VERTICES[id])])), []);
  const tetraBase = useMemo(() => [[1,1,1],[-1,-1,1],[-1,1,-1],[1,-1,-1]].map((v) => v.map((c) => c * 0.55)), []);
  const edgeArr = useMemo(() => new Float32Array(EDGES.length * 2 * 3), []);
  const radialArr = useMemo(() => new Float32Array(IDS.length * 2 * 3), []);
  const tetraPairs = useMemo(() => { const e = []; for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) e.push([i, j]); return e; }, []);
  const tetraArr = useMemo(() => new Float32Array(6 * 2 * 3), []);
  const nodeAArr = useMemo(() => new Float32Array(2 * 3), []);
  const nodeBArr = useMemo(() => new Float32Array(2 * 3), []);

  const fromM = useMemo(() => Object.fromEntries(IDS.map((id) => [id, new THREE.Vector3()])), []);
  const fromG = useMemo(() => Object.fromEntries(GESTALT_IDS.map((id) => [id, new THREE.Vector3()])), []);
  const fromF = useMemo(() => Object.fromEntries(FUNDAMENTAL_NODES.map((n) => [n.count, new THREE.Vector3()])), []);
  const fromSrc = useMemo(() => new THREE.Vector3(), []);
  const tmpT = useMemo(() => new THREE.Vector3(), []);
  const tmpC = useMemo(() => new THREE.Vector3(), []);
  const camTarget = useMemo(() => new THREE.Vector3(), []);
  const crescentShape = useMemo(() => {
    const o = new THREE.Shape(); o.absarc(0, 0, 0.16, 0, Math.PI * 2, false);
    const h = new THREE.Path(); h.absarc(0.085, 0, 0.135, 0, Math.PI * 2, true); o.holes.push(h);
    return o;
  }, []);

  const morph = useRef(0), viewRef = useRef(view), ringScale = useRef(1), viewT = useRef(0);

  const sealTarget = (id, t) => { let q = base[id]; q = rot4(q,0,3,t*0.28); q = rot4(q,1,3,t*0.1736); q = rot4(q,2,3,t*0.112); const pr = project(q); return [pr[0]*SCALE, pr[1]*SCALE, pr[2]*SCALE]; };
  const gestaltSeal = (id, t) => { const i = GESTALT_IDS.indexOf(id); const ga = t * 0.9; return rotX(rotY(tetraBase[i], ga*0.3), ga*0.15); };

  // ---- targets ----
  const manifestPos = (id, t) => view === 'map' ? MAP_POS[id] : view === 'grid' ? GRID_POS[id] : view === 'axis' ? AXIS_POS[id] : view === 'seal' ? sealTarget(id, t) : [0, 0, 0];
  const manifestOp = () => (view === 'map' || view === 'grid' || view === 'axis' || view === 'seal') ? 1 : 0;
  const gestaltPos = (id, t) => {
    if (view === 'first') return FIRST_POS[id] || FOUR_POS[id];
    if (view === 'four') return FOUR_POS[id];
    if (view === 'ten') return TEN_HEADER_POS[id];
    if (view === 'map') return MAP_POS[id]; if (view === 'axis') return AXIS_POS[id]; if (view === 'seal') return gestaltSeal(id, t);
    return [0, 0, 0];
  };
  const gestaltVis = (id) => {
    if (view === 'iam') return id === 0 ? 1 : 0;       // I AM = the Soul seed alone
    if (view === 'first') return (id === 0 || id === 20) ? 1 : 0;
    return 1;                                           // four, ten, map, axis, seal
  };
  const fnodePos = (c) => view === 'ten' ? TET_POS[c] : view === 'axis' ? FN_AXIS[c] : [0, 0, 0];
  const fnodeOp = () => (view === 'ten' || view === 'axis') ? 1 : 0;
  const sourcePos = () => view === 'map' ? MAP_POS[10] : view === 'axis' ? AXIS_POS[10] : [0, 0, 0];

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    if (view !== viewRef.current) {
      IDS.forEach((id) => manifest.current[id] && fromM[id].copy(manifest.current[id].position));
      GESTALT_IDS.forEach((id) => gestalt.current[id] && fromG[id].copy(gestalt.current[id].position));
      FUNDAMENTAL_NODES.forEach((n) => fnode.current[n.count] && fromF[n.count].copy(fnode.current[n.count].position));
      if (sourceGrp.current) fromSrc.copy(sourceGrp.current.position);
      morph.current = 0; viewRef.current = view; viewT.current = 0;
    }
    morph.current = Math.min(1, morph.current + dt * 1.8);
    viewT.current += dt;
    const m = ease(morph.current);
    const ok = Math.min(1, dt * 3.2); // opacity ease
    // axis: the pillar forms first (morph m), then after a beat the 20 emerge (axisEmerge)
    const axisEmerge = view === 'axis' ? ease(clamp01((viewT.current - AXIS_PAUSE) / AXIS_EMERGE)) : 0;
    const tenPhase = (viewT.current * 0.5) % 4;          // the Ten's traveling light
    const tenActiveStage = Math.floor(tenPhase);
    const flat = !ORBIT_VIEWS.has(view);

    // manifest
    IDS.forEach((id) => {
      const me = manifest.current[id]; if (!me) return;
      if (view === 'axis') {
        const N = fnode.current[ARCH_NODE[id]]?.position; const tg = AXIS_POS[id];
        if (N) me.position.set(N.x + (tg[0] - N.x) * axisEmerge, N.y + (tg[1] - N.y) * axisEmerge, N.z + (tg[2] - N.z) * axisEmerge);
        me.material.opacity = approach(me.material.opacity, axisEmerge, ok);
      } else {
        const tg = manifestPos(id, t); tmpT.set(tg[0], tg[1], tg[2]);
        me.position.lerpVectors(fromM[id], tmpT, m);
        me.material.opacity = approach(me.material.opacity, manifestOp(), ok);
      }
      me.visible = me.material.opacity > 0.02;
    });
    // gestalt — the Four: cubes (transcendent) in the derivation, spheres in manifestation
    GESTALT_IDS.forEach((id) => {
      const grp = gestalt.current[id]; if (!grp) return;
      if (view === 'axis') {
        const N = fnode.current[ARCH_NODE[id]]?.position; const tg = AXIS_POS[id];
        if (N) grp.position.set(N.x + (tg[0] - N.x) * axisEmerge, N.y + (tg[1] - N.y) * axisEmerge, N.z + (tg[2] - N.z) * axisEmerge);
      } else {
        const tg = gestaltPos(id, t); tmpT.set(tg[0], tg[1], tg[2]);
        grp.position.lerpVectors(fromG[id], tmpT, m);
      }
      const cubeTarget = CUBE_VIEWS.has(view) ? gestaltVis(id) : 0;
      const sphereTarget = view === 'axis' ? axisEmerge : (SPHERE_VIEWS.has(view) ? gestaltVis(id) : 0);
      if (gCube.current[id]) { const o = approach(gCube.current[id].material.opacity, cubeTarget, ok); gCube.current[id].material.opacity = o; gCube.current[id].visible = o > 0.02; }
      if (gSphere.current[id]) { const o = approach(gSphere.current[id].material.opacity, sphereTarget, ok); gSphere.current[id].material.opacity = o; gSphere.current[id].visible = o > 0.02; }
    });
    // fundamental nodes
    FUNDAMENTAL_NODES.forEach((n) => {
      const me = fnode.current[n.count]; if (!me) return;
      const tg = fnodePos(n.count); tmpT.set(tg[0], tg[1], tg[2]);
      me.position.lerpVectors(fromF[n.count], tmpT, m);
      me.material.opacity = approach(me.material.opacity, fnodeOp(), ok);
      me.visible = me.material.opacity > 0.02;
      const sTarget = (view === 'ten' && FN_STAGE[n.count] === tenActiveStage) ? 1.5 : 1;
      me.scale.setScalar(approach(me.scale.x, sTarget, Math.min(1, dt * 6)));
    });
    // links: each header cube → its row of fundamental nodes (The Ten)
    if (tenLinks.current) {
      const a = tenLinks.current.geometry.attributes.position.array; let k = 0;
      for (const [gid, cnt] of TEN_LINKS) { const A = gestalt.current[gid]?.position, B = fnode.current[cnt]?.position; if (A && B) { a[k++]=A.x;a[k++]=A.y;a[k++]=A.z; a[k++]=B.x;a[k++]=B.y;a[k++]=B.z; } }
      tenLinks.current.geometry.attributes.position.needsUpdate = true;
      tenLinks.current.material.opacity = approach(tenLinks.current.material.opacity, view === 'ten' ? 0.28 : 0, ok);
    }
    // emergence: each fundamental node → its two signatures (The Axis)
    if (emergeLines.current) {
      const a = emergeLines.current.geometry.attributes.position.array; let k = 0;
      for (const id of ALL_ARCH) {
        const N = fnode.current[ARCH_NODE[id]]?.position;
        const P = (GESTALT_SET.has(id) ? gestalt.current[id] : manifest.current[id])?.position;
        if (N && P) { a[k++]=N.x;a[k++]=N.y;a[k++]=N.z; a[k++]=P.x;a[k++]=P.y;a[k++]=P.z; }
      }
      emergeLines.current.geometry.attributes.position.needsUpdate = true;
      emergeLines.current.material.opacity = approach(emergeLines.current.material.opacity, view === 'axis' ? 0.22 * axisEmerge : 0, ok);
    }
    // source core — in the axis it emerges from the top of the pillar, synced with the rest
    if (sourceGrp.current) {
      if (view === 'axis') {
        const N = fnode.current[1]?.position; const tg = AXIS_POS[10];
        if (N) sourceGrp.current.position.set(N.x + (tg[0] - N.x) * axisEmerge, N.y + (tg[1] - N.y) * axisEmerge, N.z + (tg[2] - N.z) * axisEmerge);
      } else {
        const tg = sourcePos(); tmpT.set(tg[0], tg[1], tg[2]);
        sourceGrp.current.position.lerpVectors(fromSrc, tmpT, m);
      }
      sourceGrp.current.scale.setScalar(1 + Math.sin(t * 1.5) * 0.13);
    }
    const srcOp = view === 'axis' ? axisEmerge : (view === 'map' || view === 'seal') ? 1 : 0;
    if (srcCore.current) srcCore.current.material.opacity = approach(srcCore.current.material.opacity, srcOp, ok);
    if (srcCorona.current) srcCorona.current.material.opacity = approach(srcCorona.current.material.opacity, 0.22 * srcOp, ok);
    if (sourceGrp.current) sourceGrp.current.visible = (srcCore.current?.material.opacity ?? 0) > 0.02;
    if (creationNode.current) creationNode.current.visible = creationNode.current.material.opacity > 0.02;

    // node-pair lines (first/four) — Node A: Fool(0)↔Judgment(20); Node B: Magician(1)↔Sun(19)
    const setLine = (ref, arr, idA, idB, opTarget) => {
      if (!ref.current) return;
      const A = gestalt.current[idA]?.position, B = gestalt.current[idB]?.position;
      if (A && B) { const a = ref.current.geometry.attributes.position.array; a[0]=A.x;a[1]=A.y;a[2]=A.z;a[3]=B.x;a[4]=B.y;a[5]=B.z; ref.current.geometry.attributes.position.needsUpdate = true; }
      ref.current.material.opacity = approach(ref.current.material.opacity, opTarget, ok);
    };
    setLine(nodeA, nodeAArr, 0, 20, (view === 'first' || view === 'four') ? 0.6 : 0);
    setLine(nodeB, nodeBArr, 1, 19, (view === 'four') ? 0.6 : 0);

    // the light: First Node = echo bouncing Seed↔Feedback; The Four = echo, then the full cycle
    const BOUNCE = 3.4;
    if (pulse.current) {
      const seedP = gestalt.current[0]?.position, fbP = gestalt.current[20]?.position;
      if (view === 'first' && seedP && fbP) {
        pulse.current.position.lerpVectors(seedP, fbP, 0.5 + 0.5 * Math.sin(t * 2.3));
      } else if (view === 'four' && seedP && fbP) {
        if (viewT.current < BOUNCE) {
          pulse.current.position.lerpVectors(seedP, fbP, 0.5 + 0.5 * Math.sin(t * 2.3)); // still just up-and-down
        } else {
          const cp = ((viewT.current - BOUNCE) * 0.55) % 4;            // travel the cycle
          const seg = Math.floor(cp), fr = cp - seg;
          const A = gestalt.current[CYCLE_ORDER[seg]]?.position, B = gestalt.current[CYCLE_ORDER[(seg + 1) % 4]]?.position;
          if (A && B) pulse.current.position.lerpVectors(A, B, fr);
        }
      } else if (view === 'ten') {
        const A = gestalt.current[HEADER_BY_STAGE[tenActiveStage]]?.position, B = gestalt.current[HEADER_BY_STAGE[(tenActiveStage + 1) % 4]]?.position;
        if (A && B) pulse.current.position.lerpVectors(A, B, ease(tenPhase - tenActiveStage));
      }
      pulse.current.material.opacity = approach(pulse.current.material.opacity, (view === 'first' || view === 'four' || view === 'ten') ? 0.95 : 0, ok);
    }
    // the cycle rectangle's horizontals (bottom Seed–Medium, top Feedback–Fruition) appear once it cycles
    if (cycleEdges.current) {
      const S = gestalt.current[0]?.position, M = gestalt.current[1]?.position, F = gestalt.current[19]?.position, Fb = gestalt.current[20]?.position;
      if (S && M && F && Fb) {
        const a = cycleEdges.current.geometry.attributes.position.array;
        a[0]=S.x;a[1]=S.y;a[2]=S.z; a[3]=M.x;a[4]=M.y;a[5]=M.z;       // bottom: Seed–Medium
        a[6]=Fb.x;a[7]=Fb.y;a[8]=Fb.z; a[9]=F.x;a[10]=F.y;a[11]=F.z;   // top: Feedback–Fruition
        cycleEdges.current.geometry.attributes.position.needsUpdate = true;
      }
      cycleEdges.current.material.opacity = approach(cycleEdges.current.material.opacity, (view === 'four' && viewT.current >= BOUNCE) ? 0.45 : 0, ok);
    }

    // seal-only structure lines
    if (edgeLine.current) {
      const arr = edgeLine.current.geometry.attributes.position.array; let k = 0;
      for (const [f, to] of EDGES) { const A = manifest.current[f]?.position, B = manifest.current[to]?.position; if (A && B) { arr[k++]=A.x;arr[k++]=A.y;arr[k++]=A.z;arr[k++]=B.x;arr[k++]=B.y;arr[k++]=B.z; } }
      edgeLine.current.geometry.attributes.position.needsUpdate = true;
      edgeLine.current.material.opacity = approach(edgeLine.current.material.opacity, view === 'seal' ? 0.45 : 0, ok);
    }
    if (radialLine.current) {
      const arr = radialLine.current.geometry.attributes.position.array; let k = 0; const s = sourceGrp.current?.position;
      IDS.forEach((id) => { const P = manifest.current[id]?.position; if (P && s) { arr[k++]=s.x;arr[k++]=s.y;arr[k++]=s.z;arr[k++]=P.x;arr[k++]=P.y;arr[k++]=P.z; } });
      radialLine.current.geometry.attributes.position.needsUpdate = true;
      radialLine.current.material.opacity = approach(radialLine.current.material.opacity, view === 'seal' ? 0.16 : 0, ok);
    }
    if (tetraEdge.current) {
      const arr = tetraEdge.current.geometry.attributes.position.array; let k = 0;
      tetraPairs.forEach(([i, j]) => { const A = gestalt.current[GESTALT_IDS[i]]?.position, B = gestalt.current[GESTALT_IDS[j]]?.position; if (A && B) { arr[k++]=A.x;arr[k++]=A.y;arr[k++]=A.z;arr[k++]=B.x;arr[k++]=B.y;arr[k++]=B.z; } });
      tetraEdge.current.geometry.attributes.position.needsUpdate = true;
      tetraEdge.current.material.opacity = approach(tetraEdge.current.material.opacity, view === 'seal' ? 0.4 : 0, ok);
    }

    // creation ring + node
    const k = Math.min(1, dt * 2.2);
    if (creationRingGrp.current) {
      if (view === 'axis') {
        const N = fnode.current[10]?.position; const tg = AXIS_POS[21];
        if (N) creationRingGrp.current.position.set(N.x + (tg[0] - N.x) * axisEmerge, N.y + (tg[1] - N.y) * axisEmerge, N.z + (tg[2] - N.z) * axisEmerge);
        creationRingGrp.current.scale.setScalar(0.066 * (1 + Math.sin(t * 1.1) * 0.04));
        creationRingGrp.current.children.forEach((c) => { if (c.material && c.userData.base != null) c.material.opacity = c.userData.base * axisEmerge; });
      } else {
        const tg = view === 'seal' ? [0, 0, 0] : view === 'map' ? MAP_POS[21] : [0, 0, 0];
        const ringOn = (view === 'seal' || view === 'map') ? 1 : 0;
        ringScale.current = approach(ringScale.current, view === 'seal' ? 1 : 0.066, k);
        creationRingGrp.current.position.lerp(tmpC.set(tg[0], tg[1], tg[2]), k);
        creationRingGrp.current.scale.setScalar(ringScale.current * (1 + Math.sin(t * 1.1) * 0.04));
        creationRingGrp.current.children.forEach((c) => { if (c.material && c.userData.base != null) c.material.opacity = approach(c.material.opacity, c.userData.base * ringOn, ok); });
      }
    }
    if (creationRipple.current) { const T = 4.5, ph = (t % T) / T; creationRipple.current.scale.setScalar(1 + ph * 0.42); creationRipple.current.material.opacity = 0.24 * (1 - ph) * (view === 'seal' ? 1 : 0); }
    if (creationNode.current) {
      if (view === 'axis') {
        const N = fnode.current[10]?.position; const tg = AXIS_POS[21];
        if (N) creationNode.current.position.set(N.x + (tg[0] - N.x) * axisEmerge, N.y + (tg[1] - N.y) * axisEmerge, N.z + (tg[2] - N.z) * axisEmerge);
        creationNode.current.material.opacity = approach(creationNode.current.material.opacity, axisEmerge, ok);
      } else {
        const tg = view === 'map' ? MAP_POS[21] : [0, 0, 0];
        creationNode.current.position.lerp(tmpC.set(tg[0], tg[1], tg[2]), k);
        creationNode.current.material.opacity = approach(creationNode.current.material.opacity, view === 'map' ? 1 : 0, ok);
      }
      creationNode.current.material.emissiveIntensity = 2.6 * creationNode.current.material.opacity;
    }

    // camera — flat views fit to screen then hand pan/zoom to the user; seal orbits
    if (controlsRef.current) {
      const ctrl = controlsRef.current;
      if (flat) {
        ctrl.enableRotate = false; ctrl.autoRotate = false; ctrl.enablePan = true; ctrl.enableZoom = true;
        if (morph.current < 0.985) {
          ctrl.enabled = false;
          const zT = Math.max(flatZ[view] ?? 12, fitZ(view, aspect));
          state.camera.position.lerp(tmpC.set(0, 0.2, zT), Math.min(1, dt * 2.2));
          ctrl.target.lerp(camTarget.set(0, 0, 0), Math.min(1, dt * 2.2));
        } else {
          ctrl.enabled = true; // pinch-zoom + pan now belong to the user
        }
      } else {
        ctrl.enableRotate = true; ctrl.autoRotate = true; ctrl.enablePan = true; ctrl.enableZoom = true; ctrl.enabled = true;
      }
    }
  });

  const showFnLabels = view === 'ten' || view === 'axis';
  const [labelsOn, setLabelsOn] = useState(true);
  useEffect(() => {
    if (view === 'axis') { setLabelsOn(false); const id = setTimeout(() => setLabelsOn(true), (AXIS_PAUSE + AXIS_EMERGE) * 1000 + 150); return () => clearTimeout(id); }
    setLabelsOn(true);
  }, [view]);
  return (
    <group>
      <lineSegments ref={radialLine}><bufferGeometry><bufferAttribute attach="attributes-position" count={IDS.length * 2} array={radialArr} itemSize={3} /></bufferGeometry><lineBasicMaterial color={SOURCE_GLOW} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} /></lineSegments>
      <lineSegments ref={edgeLine}><bufferGeometry><bufferAttribute attach="attributes-position" count={EDGES.length * 2} array={edgeArr} itemSize={3} /></bufferGeometry><lineBasicMaterial color="#3f6fa8" transparent opacity={0} /></lineSegments>

      {/* node-pair lines */}
      <lineSegments ref={nodeA}><bufferGeometry><bufferAttribute attach="attributes-position" count={2} array={nodeAArr} itemSize={3} /></bufferGeometry><lineBasicMaterial color={MIND_COLOR} transparent opacity={0} /></lineSegments>
      <lineSegments ref={nodeB}><bufferGeometry><bufferAttribute attach="attributes-position" count={2} array={nodeBArr} itemSize={3} /></bufferGeometry><lineBasicMaterial color={MIND_COLOR} transparent opacity={0} /></lineSegments>
      {/* cycle rectangle horizontals (The Four) */}
      <lineSegments ref={cycleEdges}><bufferGeometry><bufferAttribute attach="attributes-position" count={4} array={cycleArr} itemSize={3} /></bufferGeometry><lineBasicMaterial color={MIND_COLOR} transparent opacity={0} /></lineSegments>
      {/* the light — echo, then cycle */}
      <mesh ref={pulse}><sphereGeometry args={[0.075, 16, 16]} /><meshStandardMaterial color="#eaf2ff" emissive="#eaf2ff" emissiveIntensity={3} transparent opacity={0} /></mesh>

      {/* manifest 16 */}
      {IDS.map((id) => { const a = ARCHETYPES[id]; const col = houseColor(a.house);
        return (
          <mesh key={id} ref={(el) => (manifest.current[id] = el)}>
            <sphereGeometry args={[0.13, segments, segments]} />
            <meshStandardMaterial color={col} emissive={col} emissiveIntensity={2.2} roughness={0.35} metalness={0.1} transparent opacity={0} />
            {(view === 'map' || view === 'grid' || view === 'seal' || (view === 'axis' && labelsOn)) && (
              <Html center distanceFactor={9}>
                {view === 'axis' ? (
                  <div style={{ ...labelStyle(VIZ_INK, id <= 9 ? 34 : -34, 14), textAlign: 'center' }}>
                    <span style={{ color: col }}>{id}</span>
                    <div style={{ fontSize: 10, fontWeight: 400, color: VIZ_DIM }}>{a.function}</div>
                  </div>
                ) : (
                  <div style={labelStyle(VIZ_INK)}><span style={{ color: col }}>{id}</span> {a.name}</div>
                )}
              </Html>
            )}
          </mesh>
        );
      })}

      {/* gestalt tetra edges (seal) + the four */}
      <lineSegments ref={tetraEdge}><bufferGeometry><bufferAttribute attach="attributes-position" count={6 * 2} array={tetraArr} itemSize={3} /></bufferGeometry><lineBasicMaterial color={AETHER} transparent opacity={0} /></lineSegments>
      {GESTALT_IDS.map((gid) => { const a = ARCHETYPES[gid]; const stage = STAGE_OF[gid];
        const gShown = view === 'iam' ? gid === 0 : view === 'first' ? (gid === 0 || gid === 20) : view === 'axis' ? labelsOn : view === 'grid' ? false : true;
        const text = view === 'iam' ? 'I AM'
          : view === 'first' ? FOUR_PHRASE[gid]
          : view === 'four' ? `${FOUR_PHRASE[gid]} · ${stage}`
          : view === 'ten' ? `${stage} = ${TEN_COUNT[gid]}`
          : `${gid} ${a.name}`;
        return (
          <group key={gid} ref={(el) => (gestalt.current[gid] = el)}>
            <mesh ref={(el) => (gCube.current[gid] = el)}>
              <sphereGeometry args={[0.13, segments, segments]} />
              <meshStandardMaterial color="#b3a3ff" emissive={AETHER} emissiveIntensity={2.6} roughness={0.3} transparent opacity={0} />
            </mesh>
            <mesh ref={(el) => (gSphere.current[gid] = el)}>
              <sphereGeometry args={[0.13, segments, segments]} />
              <meshStandardMaterial color="#b3a3ff" emissive={AETHER} emissiveIntensity={2.6} roughness={0.3} transparent opacity={0} />
            </mesh>
            {gShown && (
              <Html center distanceFactor={9}>
                {view === 'axis' ? (
                  <div style={{ ...labelStyle('#cdbcff', (gid === 0 || gid === 1) ? 34 : -34, 14), textAlign: 'center' }}>
                    {gid}
                    <div style={{ fontSize: 10, fontWeight: 400, color: VIZ_DIM }}>{stage}</div>
                  </div>
                ) : (
                  <div style={{ ...labelStyle('#cdbcff', -22, view === 'ten' ? 17 : 13), textAlign: 'center' }}>
                    {text}{view === 'iam' && <><br /><span style={{ fontSize: 10, color: VIZ_DIM }}>awareness</span></>}
                  </div>
                )}
              </Html>
            )}
          </group>
        );
      })}

      {/* links from each header cube to its row of nodes (The Ten) */}
      <lineSegments ref={tenLinks}><bufferGeometry><bufferAttribute attach="attributes-position" count={TEN_LINKS.length * 2} array={tenLinkArr} itemSize={3} /></bufferGeometry><lineBasicMaterial color="#9aa6c8" transparent opacity={0} /></lineSegments>
      {/* emergence links: each fundamental node → its two signatures (The Axis) */}
      <lineSegments ref={emergeLines}><bufferGeometry><bufferAttribute attach="attributes-position" count={ALL_ARCH.length * 2} array={emergeArr} itemSize={3} /></bufferGeometry><lineBasicMaterial color={AETHER} transparent opacity={0} /></lineSegments>
      {/* Forty-Fold Seal — every row & column sums to 40 */}
      {view === 'grid' && (<>
        {[0, 1, 2, 3].map((r) => <Html key={`rs${r}`} center position={[GRID_EDGE + 1.45, (1.5 - r) * GRID_GAP, 0]}><div style={labelStyle('#9aa6c8', 0, 15)}>= 40</div></Html>)}
        {[0, 1, 2, 3].map((c) => <Html key={`cs${c}`} center position={[(c - 1.5) * GRID_GAP, -GRID_EDGE - 1.45, 0]}><div style={labelStyle('#9aa6c8', 0, 15)}>= 40</div></Html>)}
      </>)}
      {/* ten fundamental nodes — white (the quantifying kind) */}
      {FUNDAMENTAL_NODES.map((n) => (
        <mesh key={`fn${n.count}`} ref={(el) => (fnode.current[n.count] = el)}>
          <sphereGeometry args={[0.13, segments, segments]} />
          <meshStandardMaterial color="#f4f7ff" emissive="#dfe8ff" emissiveIntensity={1.1} roughness={0.4} transparent opacity={0} />
          {showFnLabels && <Html center distanceFactor={9}><div style={labelStyle(VIZ_INK, -30, 16)}>{n.count}</div></Html>}
        </mesh>
      ))}

      {/* source — the Wheel / the I AM */}
      <group ref={sourceGrp}>
        <mesh ref={srcCore}><sphereGeometry args={[0.17, 32, 32]} /><meshStandardMaterial color="#5a3a8f" emissive={SOURCE_GLOW} emissiveIntensity={3.0} roughness={0.25} transparent opacity={1} /></mesh>
        <mesh ref={srcCorona}><sphereGeometry args={[0.30, 24, 24]} /><meshBasicMaterial color={SOURCE_GLOW} transparent opacity={0.22} blending={THREE.AdditiveBlending} depthWrite={false} /></mesh>
        {(view === 'map' || view === 'seal' || (view === 'axis' && labelsOn)) && (
          <Html center distanceFactor={9}><div style={{ ...labelStyle('#a78bd8', 36, 12), letterSpacing: '.12em', textAlign: 'center' }}>SOURCE<br /><span style={{ fontSize: 10, color: VIZ_DIM }}>the Wheel</span></div></Html>
        )}
      </group>

      {/* creation ring + node */}
      <Billboard ref={creationRingGrp}>
        <mesh userData={{ base: 0.9 }}><ringGeometry args={[5.5, 5.62, 160]} /><meshBasicMaterial color={CREATION_COLOR} transparent opacity={0} side={THREE.DoubleSide} /></mesh>
        <mesh userData={{ base: 0.12 }}><ringGeometry args={[5.62, 6.1, 160]} /><meshBasicMaterial color={CREATION_COLOR} transparent opacity={0} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} /></mesh>
        <mesh ref={creationRipple}><ringGeometry args={[5.5, 5.7, 160]} /><meshBasicMaterial color={CREATION_COLOR} transparent opacity={0} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} /></mesh>
        {(view === 'seal' || view === 'map' || (view === 'axis' && labelsOn)) && <Html center position={[0, 6.3, 0]}><div style={{ ...labelStyle('#9db4ff', 0, 12), letterSpacing: '.12em', textAlign: 'center' }}>CREATION<br /><span style={{ fontSize: 10, color: VIZ_DIM }}>the World</span></div></Html>}
      </Billboard>
      <mesh ref={creationNode}><sphereGeometry args={[0.13, segments, segments]} /><meshStandardMaterial color="#8aa6ff" emissive={CREATION_COLOR} emissiveIntensity={0} roughness={0.3} transparent opacity={0} /></mesh>
    </group>
  );
}

const MIND_COLOR = '#cfe0ff';
const STAGE_OF = { 0: 'Seed', 1: 'Medium', 19: 'Fruition', 20: 'Feedback' };
// the four elemental shapes of the prototype stages: Seed=cube(Earth) · Medium=crescent(Water) · Fruition=circle(Air) · Feedback=pyramid(Fire)
const SHAPE_OF = { 0: 'cube', 1: 'crescent', 19: 'circle', 20: 'pyramid' };
// the four recursive self-statements (RPA, Chris+GPT canon):
// I Am (Seed) · What Am I? (Medium) · I Am This (Fruition) · Why Am I? (Feedback = the Why-pointer)
const FOUR_PHRASE = { 0: 'I Am', 1: 'What Am I?', 19: 'I Am This', 20: 'Why Am I?' };

function Stars({ count }) {
  const ref = useRef();
  const positions = useMemo(() => { const arr = new Float32Array(count * 3); for (let i = 0; i < count * 3; i++) arr[i] = (Math.random() - 0.5) * 70; return arr; }, [count]);
  useFrame((s, dt) => { if (ref.current) { ref.current.rotation.y += dt * 0.012; ref.current.rotation.x += dt * 0.005; } });
  return (<points ref={ref}><bufferGeometry><bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} /></bufferGeometry><pointsMaterial color="#2a3650" size={0.09} sizeAttenuation /></points>);
}

const VIEWS = [
  { id: 'iam', label: 'I AM', sub: 'awareness', cap: 'I AM. Awareness wakes to the bare fact that it exists. One assertion — and everything that follows is forced.' },
  { id: 'first', label: 'First Node', sub: 'the echo', cap: 'To know itself, awareness turns back on itself: "I Am" and its return, "Why Am I?". One polarity — it can pulse back and forth forever, but with only two poles it reflects, never becomes. An echo.' },
  { id: 'four', label: 'The Four', sub: 'four from one', cap: 'A second polarity crosses the first, opening a middle and an end. Now the loop can travel: I Am → What Am I? → I Am This → Why Am I? — and the last seeds the next. Four stages: the minimum complete cycle, the engine beneath all process.' },
  { id: 'ten', label: 'The Ten', sub: 'four, quantified', cap: 'The four are transcendent — the Soul, beyond manifestation (the cubes). To render them measurable takes ten fundamental nodes (the white spheres): Seed 1, Medium 2, Fruition 3, Feedback 4. The ten quantify the four.' },
  { id: 'axis', label: 'Axis', sub: 'the first unfolding', cap: 'The 1991 first unfolding, laid on its side: ten fundamental nodes on a horizontal spine, each carrying a vertical pair that sums to 20 (bottom 0–9, top 11–20). The Wheel — Creator — is the right hinge; the World — Creation — the left. This flattened circle is the lemniscate, and the seed of the whole map.' },
  { id: 'map', label: 'Map', sub: 'five houses', cap: 'Polarity alternating with recursion is x² = x + 1 — its constant is φ, which forces five-fold symmetry. So the twenty gather into five houses: Soul, Spirit, Mind, Emotion, Body — four stages within each. The living map for reading.' },
  { id: 'grid', label: 'Forty-Fold Seal', sub: 'every line = 40', cap: 'The sixteen manifest signatures fall into a 4×4 square where every row, every column, every quadrant sums to 40. Intuited in 1991, derived from pentagram geometry decades later — and they converge exactly. This is the Forty-Fold Seal.' },
  { id: 'seal', label: 'Hypercube', sub: 'the 4D seal', cap: 'The 4×4 seal lifts into four dimensions — the sixteen on the vertices of a tesseract, every plane still summing to 40. Source at the core, the Gestalt around it, Creation enclosing all. Drag to orbit.' },
];

export default function SealCanvas() {
  const [isMobile, setIsMobile] = useState(false);
  const [aspect, setAspect] = useState(1.6);
  const [view, setView] = useState('iam');
  const [playing, setPlaying] = useState(false);
  const controlsRef = useRef();
  useEffect(() => {
    const f = () => { setIsMobile(window.innerWidth < 768); setAspect(window.innerWidth / Math.max(1, window.innerHeight)); };
    f(); window.addEventListener('resize', f); window.addEventListener('orientationchange', f);
    return () => { window.removeEventListener('resize', f); window.removeEventListener('orientationchange', f); };
  }, []);
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setView((v) => { const i = VIEWS.findIndex((x) => x.id === v); if (i >= VIEWS.length - 1) { setPlaying(false); return v; } return VIEWS[i + 1].id; }), 4200);
    return () => clearInterval(id);
  }, [playing]);

  const dpr = isMobile ? [1, 1.25] : [1, 2];
  const segments = isMobile ? 16 : 28;
  const starCount = isMobile ? 350 : 900;
  const cap = VIEWS.find((v) => v.id === view)?.cap;
  const togglePlay = () => { setPlaying((p) => !p); if (!playing && view === 'seal') setView('iam'); };
  const chip = (active) => ({ flex: '0 0 auto', fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', cursor: 'pointer', color: active ? '#fff' : '#aab2c5', background: active ? 'rgba(91,33,182,.6)' : 'rgba(20,24,34,.75)', border: `1px solid ${active ? '#7c4dff' : '#2a3344'}`, borderRadius: 18, padding: '8px 13px' });

  const btn = (active) => ({ display: 'block', width: '100%', textAlign: 'left', marginBottom: 5, cursor: 'pointer', fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12.5, fontWeight: 700, letterSpacing: '.03em', color: active ? '#fff' : '#aab2c5', background: active ? 'rgba(91,33,182,.55)' : 'rgba(20,24,34,.6)', border: `1px solid ${active ? '#7c4dff' : '#2a3344'}`, borderRadius: 7, padding: '7px 11px' });

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#06070b' }}>
      <div style={{ position: 'fixed', top: 14, left: 0, right: 0, textAlign: 'center', zIndex: 2, pointerEvents: 'none', fontFamily: 'ui-monospace, Menlo, monospace' }}>
        <div style={{ fontSize: 'clamp(13px,2.2vw,19px)', fontWeight: 700, letterSpacing: '.06em', color: VIZ_INK }}>THE LIVING MAP</div>
      </div>

      {/* desktop control panel */}
      {!isMobile && (
        <div style={{ position: 'fixed', top: 60, left: 16, zIndex: 4, width: 184, background: 'rgba(10,12,18,.74)', border: '1px solid #222a38', borderRadius: 12, padding: 13, backdropFilter: 'blur(6px)', fontFamily: 'ui-monospace, Menlo, monospace' }}>
          <button onClick={togglePlay}
            style={{ ...btn(false), background: playing ? 'rgba(91,33,182,.55)' : 'rgba(20,24,34,.6)', color: playing ? '#fff' : '#cdbcff', marginBottom: 10, textAlign: 'center', letterSpacing: '.1em' }}>
            {playing ? '❚❚ PAUSE' : '▶ PLAY DERIVATION'}
          </button>
          <div style={{ fontSize: 10, letterSpacing: '.16em', color: VIZ_DIM, marginBottom: 8 }}>STATES</div>
          {VIEWS.map((v) => (
            <button key={v.id} onClick={() => { setPlaying(false); setView(v.id); }} style={btn(view === v.id)}>
              {v.label}<div style={{ fontSize: 9.5, fontWeight: 400, color: view === v.id ? '#cdbcff' : '#6b7488', marginTop: 1 }}>{v.sub}</div>
            </button>
          ))}
          <div style={{ height: 1, background: '#222a38', margin: '11px 0' }} />
          <div style={{ fontSize: 10, letterSpacing: '.16em', color: VIZ_DIM, marginBottom: 7 }}>LAYERS</div>
          <button disabled style={{ ...btn(false), opacity: 0.45, cursor: 'not-allowed', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Elemental designators</span><span style={{ fontSize: 9, color: '#6b7488' }}>soon</span>
          </button>
        </div>
      )}

      {/* caption (sits above the mobile bar) */}
      <div style={{ position: 'fixed', bottom: isMobile ? 86 : 26, left: 0, right: 0, textAlign: 'center', zIndex: 3, pointerEvents: 'none', padding: '0 18px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', fontFamily: 'ui-monospace, Menlo, monospace', fontSize: isMobile ? 12 : 13, color: VIZ_DIM, lineHeight: 1.45, textShadow: '0 1px 8px #000' }}>{cap}</div>
      </div>

      {/* mobile bottom bar: play + horizontally-scrollable state chips */}
      {isMobile && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 4, background: 'linear-gradient(to top, rgba(6,7,11,.96), rgba(6,7,11,0))', padding: '12px 8px 14px' }}>
          <div style={{ display: 'flex', gap: 7, alignItems: 'center', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <button onClick={togglePlay} style={{ ...chip(playing), color: playing ? '#fff' : '#cdbcff' }}>{playing ? '❚❚' : '▶'}</button>
            {VIEWS.map((v) => (
              <button key={v.id} onClick={() => { setPlaying(false); setView(v.id); }} style={chip(view === v.id)}>{v.label}</button>
            ))}
          </div>
        </div>
      )}

      <Canvas camera={{ position: [0, 0, 9], fov: 50 }} dpr={dpr}>
        <color attach="background" args={['#06070b']} />
        <ambientLight intensity={0.35} />
        <pointLight position={[6, 6, 8]} intensity={120} />
        <pointLight position={[-8, -4, -6]} intensity={60} color="#5b7fd0" />
        <Stars count={starCount} />
        <SealScene view={view} segments={segments} controlsRef={controlsRef} aspect={aspect} />
        <OrbitControls ref={controlsRef} enableDamping dampingFactor={0.08} autoRotate autoRotateSpeed={isMobile ? 0.35 : 0.5} minDistance={0.8} maxDistance={48} />
        <AdaptiveDpr pixelated />
        <EffectComposer enabled={!isMobile} multisampling={isMobile ? 0 : 4}>
          <Bloom intensity={isMobile ? 0.6 : 1.1} luminanceThreshold={0.25} luminanceSmoothing={0.9} mipmapBlur={!isMobile} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
