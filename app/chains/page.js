'use client';

// THE CHAIN VIEWER (founder, 2026-09-25): "we do the full 78 into 78 ... and we focus on the chain."
// A bench page for the founder's eye before any Reader prompt work: cast all 78 signatures into all 78
// seats (one casting), open on one seat at random (the field still chooses), and follow the chain —
// the card in a seat has a home seat; who sits there? follow them home; until it loops back. Beside it,
// the medicine chain: each card's own rebalancer, from the record.
//
// Two home rules, toggled, because they read differently:
//   OWN SEAT  — card N's home is seat N. The cast is a true permutation: every chain is a closed loop,
//               every card is in exactly one.
//   PARENT    — the rule lib/mapAnalysis.js uses: bounds and agents go home to their parent archetype's
//               seat. Chains funnel into the 22 and can merge; a chain may end by joining one already seen.
// Nothing here reaches a model. No reading is saved.

import { useEffect, useMemo, useState } from 'react';
import { generateSpread } from '../../lib/utils.js';
import { getComponent, getFullCorrection, getCorrectionTargetId } from '../../lib/corrections.js';
import { ARCHETYPES, BOUNDS, AGENTS } from '../../lib/archetypes.js';
import { STATUSES } from '../../lib/constants.js';

const nameOf = (id) => `${getComponent(id)?.name || '#'} ${id}`; // the number disambiguates repeated names (two bounds are both "Discernment")
const classOf = (id) => (id < 22 ? 'archetype' : id < 62 ? 'bound' : 'agent');
const parentOf = (id) => (id < 22 ? id : id < 62 ? BOUNDS[id]?.archetype : AGENTS[id]?.archetype);
const houseOf = (id) => ARCHETYPES[parentOf(id)]?.house || '—';
const STATUS_COLOR = { 1: 'text-emerald-300', 2: 'text-orange-300', 3: 'text-sky-300', 4: 'text-violet-300' };

function medicineOf(transient, status) {
  try {
    const corr = getFullCorrection(transient, status);
    const t = corr ? getCorrectionTargetId(corr, getComponent(transient)) : null;
    const kind = { 1: 'growth', 2: 'diagonal', 3: 'vertical', 4: 'reduction' }[status];
    return t == null ? null : { id: t, name: nameOf(t), kind };
  } catch { return null; }
}

function castAll() {
  const draws = generateSpread(78); // 78 seats, 78 signatures, each exactly once
  const bySeat = {};
  for (const d of draws) bySeat[d.position] = d;
  return bySeat;
}

function traceChain(bySeat, startSeat, rule) {
  const home = (transient) => (rule === 'parent' ? parentOf(transient) : transient);
  const steps = [];
  const seen = new Set();
  let seat = startSeat;
  while (seat != null && bySeat[seat] && !seen.has(seat) && steps.length < 78) {
    seen.add(seat);
    const d = bySeat[seat];
    steps.push({ seat, card: d.transient, status: d.status, next: home(d.transient) });
    seat = home(d.transient);
  }
  const closesOn = seat; // the seat we would revisit
  const loopBack = closesOn === startSeat ? 'loops back to the start' : closesOn != null && seen.has(closesOn) ? `joins the loop at ${nameOf(closesOn)}` : 'ends';
  return { steps, loopBack };
}

function cycleLengths(bySeat) {
  // own-seat rule only: the permutation's cycle structure
  const seen = new Set();
  const lens = [];
  for (let s = 0; s < 78; s++) {
    if (seen.has(s)) continue;
    let n = 0, cur = s;
    while (!seen.has(cur)) { seen.add(cur); n++; cur = bySeat[cur].transient; }
    lens.push(n);
  }
  return lens.sort((a, b) => b - a);
}

export default function ChainsPage() {
  // cast in the browser only (a random cast on the server would not match the browser's)
  const [bySeat, setBySeat] = useState(null);
  const [start, setStart] = useState(0);
  const [rule, setRule] = useState('own');
  useEffect(() => { setBySeat(castAll()); setStart(Math.floor(Math.random() * 78)); }, []);

  const chain = useMemo(() => (bySeat ? traceChain(bySeat, start, rule) : { steps: [], loopBack: '' }), [bySeat, start, rule]);
  const cycles = useMemo(() => (bySeat ? cycleLengths(bySeat) : []), [bySeat]);
  const summary = useMemo(() => {
    const st = { 1: 0, 2: 0, 3: 0, 4: 0 }; const houses = {}; const classes = { archetype: 0, bound: 0, agent: 0 };
    for (const s of chain.steps) { st[s.status]++; houses[houseOf(s.card)] = (houses[houseOf(s.card)] || 0) + 1; classes[classOf(s.card)]++; }
    return { st, houses, classes };
  }, [chain]);

  const recast = () => { setBySeat(castAll()); setStart(Math.floor(Math.random() * 78)); };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-200 px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-light tracking-wide text-amber-200">The Chain Viewer</h1>
          <p className="text-sm text-zinc-400">All 78 cast into all 78 seats. The reading opens on one seat; the chain follows each card to its home seat, and whoever sits there, home again, until it loops.</p>
        </header>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <button onClick={recast} className="rounded-lg border border-amber-500/50 px-3 py-1.5 text-amber-100 hover:bg-amber-900/30">Cast again</button>
          <button onClick={() => setStart(Math.floor(Math.random() * 78))} className="rounded-lg border border-zinc-600 px-3 py-1.5 hover:bg-zinc-800">Open another seat</button>
          <label className="flex items-center gap-2">
            <span className="text-zinc-400">Home rule</span>
            <select value={rule} onChange={(e) => setRule(e.target.value)} className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1">
              <option value="own">own seat (true permutation)</option>
              <option value="parent">parent archetype (diagnostic rule)</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            <span className="text-zinc-400">Open on seat</span>
            <select value={start} onChange={(e) => setStart(Number(e.target.value))} className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 max-w-[14rem]">
              {Array.from({ length: 78 }, (_, i) => <option key={i} value={i}>{i} · {nameOf(i)}</option>)}
            </select>
          </label>
        </div>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-2 text-sm">
          <div className="text-[0.7rem] uppercase tracking-wider text-zinc-500">This chain</div>
          <div>Length <span className="text-amber-200">{chain.steps.length}</span> · {chain.loopBack}</div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {[1, 2, 3, 4].map((k) => <span key={k} className={STATUS_COLOR[k]}>{STATUSES[k].name} {summary.st[k]}</span>)}
          </div>
          <div className="text-zinc-400">Houses: {Object.entries(summary.houses).map(([h, n]) => `${h} ${n}`).join(' · ')}</div>
          <div className="text-zinc-400">Classes: archetypes {summary.classes.archetype} · bounds {summary.classes.bound} · agents {summary.classes.agent}</div>
          {rule === 'own' && <div className="text-zinc-500">Whole cast (own-seat rule): {cycles.length} loops, lengths {cycles.join(', ')}</div>}
        </section>

        <section className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-[0.7rem] uppercase tracking-wider text-zinc-500">
                <th className="py-2 pr-3">#</th>
                <th className="py-2 pr-3">In the seat of</th>
                <th className="py-2 pr-3">Sits</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Its home seat</th>
                <th className="py-2 pr-3">Its medicine</th>
              </tr>
            </thead>
            <tbody>
              {chain.steps.map((s, i) => {
                const med = medicineOf(s.card, s.status);
                return (
                  <tr key={s.seat} className="border-t border-zinc-800 align-top">
                    <td className="py-2 pr-3 text-zinc-500">{i + 1}</td>
                    <td className="py-2 pr-3"><button onClick={() => setStart(s.seat)} className="underline decoration-dotted hover:text-amber-200">{nameOf(s.seat)}</button><div className="text-[0.7rem] text-zinc-500">{houseOf(s.seat)} · {classOf(s.seat)}</div></td>
                    <td className="py-2 pr-3 text-zinc-100">{nameOf(s.card)}<div className="text-[0.7rem] text-zinc-500">{houseOf(s.card)} · {classOf(s.card)}</div></td>
                    <td className={`py-2 pr-3 ${STATUS_COLOR[s.status]}`}>{STATUSES[s.status].name}</td>
                    <td className="py-2 pr-3 text-zinc-400">{s.next != null ? nameOf(s.next) : '—'}{s.card === s.seat ? <span className="text-emerald-400"> (sitting at home)</span> : null}</td>
                    <td className="py-2 pr-3 text-zinc-300">{med ? <>{med.name}<div className="text-[0.7rem] text-zinc-500">{med.kind}</div></> : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <p className="text-xs text-zinc-500">Bench only: nothing here is sent to a model or saved. Click any seat name to open the chain from there.</p>
      </div>
    </main>
  );
}
