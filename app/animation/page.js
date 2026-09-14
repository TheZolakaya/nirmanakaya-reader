'use client';

// /animation — the animation workbench.
//
// Step one only: prove the shared <TheMap /> renders EXACTLY like /22-reader, so that every
// animation after this is built on the real map instead of a redrawing of it. Nothing here
// touches EZ mode or the reading page.
//
// Controls are deliberately crude. This is a bench, not a product.

import { useState, useCallback } from 'react';
import Link from 'next/link';
import TheMap from '../../components/map/TheMap.js';
import { generateSpread } from '../../lib/utils.js';

export default function AnimationBench() {
  const [drawMap, setDrawMap] = useState({});
  const [colorLayer, setColorLayer] = useState('status');
  const [zoom, setZoom] = useState(0.45);
  const [labels, setLabels] = useState(true);

  // A full 22-position draw, the same call the reading uses.
  const deal = useCallback(() => {
    const draws = generateSpread(22);
    const map = {};
    draws.forEach(d => { map[d.position] = { transient: d.transient, status: d.status }; });
    setDrawMap(map);
  }, []);

  const clear = useCallback(() => setDrawMap({}), []);

  const layers = ['status', 'practice', 'activity', 'being', 'identity', 'stage'];

  return (
    <div className="h-screen bg-[#0a0a0f] text-zinc-200 flex flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-zinc-800/60 text-xs">
        <span className="uppercase tracking-[0.2em] text-amber-400/80 mr-2">Animation bench</span>

        <button onClick={deal} className="px-3 py-1.5 rounded border border-emerald-700/50 text-emerald-300 hover:bg-emerald-950/40">
          Deal 22
        </button>
        <button onClick={clear} className="px-3 py-1.5 rounded border border-zinc-700 text-zinc-400 hover:text-zinc-200">
          Clear
        </button>

        <span className="ml-3 text-zinc-600">layer</span>
        {layers.map(l => (
          <button key={l} onClick={() => setColorLayer(l)}
            className={`px-2 py-1 rounded border ${colorLayer === l ? 'border-amber-500 text-amber-300' : 'border-zinc-700 text-zinc-500 hover:text-zinc-300'}`}>
            {l}
          </button>
        ))}

        <span className="ml-3 text-zinc-600">zoom</span>
        <input type="range" min="0.2" max="1" step="0.05" value={zoom}
          onChange={(e) => setZoom(parseFloat(e.target.value))} className="w-28" />
        <span className="text-zinc-500 w-10 font-mono">{zoom.toFixed(2)}</span>

        <button onClick={() => setLabels(v => !v)}
          className={`px-2 py-1 rounded border ${labels ? 'border-zinc-500 text-zinc-300' : 'border-zinc-700 text-zinc-600'}`}>
          labels
        </button>

        <Link href="/22-reader" className="ml-auto text-zinc-500 hover:text-zinc-300">compare to /22-reader →</Link>
      </div>

      {/* THE SIZING TRAP, recorded because it has cost this project real time:
          MapCanvas sizes itself with `w-full h-full`. A percentage height resolves to ZERO
          unless its parent has a DEFINITE height — and `flex-1` does not give it one. That is
          why rebuilt maps come out blank or off-screen: all 78 cards render correctly, the
          canvas simply has no height, and MapCanvas's centring transform then throws the
          content above the viewport. /22-reader works because it uses h-screen.
          So: the wrapper below takes an explicit height. Never flex-1 around this component. */}
      <div className="relative overflow-hidden" style={{ height: 'calc(100vh - 56px)' }}>
        <TheMap
          key={zoom}
          drawMap={drawMap}
          colorLayer={colorLayer}
          initialZoom={zoom}
          showLabels={labels}
          className="w-full h-full"
        />
      </div>
    </div>
  );
}
