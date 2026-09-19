// lib/bakeoff/batch.js
// THE BATCH (addendum 4): N runs × six sections × the chosen lanes, every door pushed, each floor
// deepening THAT run's shared opening exactly as the page does it. Stored as
// data/bakeoff/batches/<id>.json with every row's text, usage, cost, ms, flags — and the hidden
// key (letter → lane) per section, so judges (people on the judge view, seats from the export)
// see letters only until a run is fully judged.
//
// It runs in the background of the local server (a detached promise; ~60–120 calls, minutes) and
// writes the file after every section so the page can show progress and a crash loses nothing.

import fs from 'fs';
import path from 'path';
import { STARTERS, STARTER_KINDS } from '../starters.js';
import { presetById, drawFor, drawLabel, SECTIONS, parseJson } from './presets.js';
import { BENCH_MODELS } from './providers.js';
import { runSection } from './run.js';
import { readVariants } from './store.js';
import { VERSION } from '../version.js';

const DIR = path.join(process.cwd(), 'data', 'bakeoff', 'batches');
const ensure = () => { if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true }); };
const file = (id) => path.join(DIR, `${String(id).replace(/[^A-Za-z0-9_-]/g, '')}.json`);

export function readBatch(id) { try { return JSON.parse(fs.readFileSync(file(id), 'utf8')); } catch { return null; } }
export function writeBatch(b) { ensure(); fs.writeFileSync(file(b.id), JSON.stringify(b, null, 1)); return b; }
export function listBatches() {
  ensure();
  return fs.readdirSync(DIR).filter((f) => f.endsWith('.json')).map((f) => { try { const b = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')); return summary(b); } catch { return null; } }).filter(Boolean).sort((a, b) => (a.created < b.created ? 1 : -1));
}
export function summary(b) {
  const total = b.n * SECTIONS.length, done = b.runs.reduce((n, r) => n + Object.keys(r.sections || {}).length, 0);
  const usd = b.runs.reduce((s, r) => s + Object.values(r.sections || {}).reduce((t, sec) => t + sec.rows.reduce((u, row) => u + (row.cost || 0), 0), 0) + (r.sharedOpeningCost || 0), 0);
  return { id: b.id, code: b.code, created: b.created, version: b.version, lane: b.lane, laneLabels: b.lanes.map((L) => L.label), n: b.n, status: b.status, error: b.error || null, done, total, usd, current: b.current || null };
}

// THE FORTY STARTERS, flattened — the sentences real people are handed at the front door.
export const STARTER_QUESTIONS = Object.entries(STARTERS).flatMap(([door, set]) => STARTER_KINDS.flatMap(({ key }) => { const v = set[key]; return (Array.isArray(v) ? v : v ? [v] : []).map((text) => ({ door, kind: key, text })); }));

const rand = (n) => Math.floor(Math.random() * n);
const shortId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const code = () => Math.random().toString(36).slice(2, 8).toUpperCase();

// Create the batch file (status 'queued') — the caller then starts it. Questions: N starters
// without repeats (wrapping if N > the pool); statuses spread by cycling 1..4 over a random start.
export function createBatch({ n = 10, lane = 'model', models = [], model = 'sonnet', variants = [], author = null }) {
  let lanes;
  if (lane === 'prompt') {
    const modelKey = BENCH_MODELS[model] ? model : 'sonnet';
    const all = readVariants();
    const chosen = variants.map((id) => all.find((v) => v.id === id)).filter(Boolean);
    if (!chosen.length) throw new Error('pick at least one variant beside the live prompt');
    lanes = [{ key: 'live', label: `LIVE prompt · ${BENCH_MODELS[modelKey].label}`, modelKey, over: {} }, ...chosen.map((v) => ({ key: v.id, label: `${v.name} (${v.target}) · ${BENCH_MODELS[modelKey].label}`, modelKey, over: { [v.target]: v.text } }))];
  } else {
    const keys = [...new Set(models.filter((k) => BENCH_MODELS[k]))];
    if (keys.length < 2) throw new Error('check two or more models');
    lanes = keys.map((k) => ({ key: k, label: BENCH_MODELS[k].label, modelKey: k, over: {} }));
  }
  const pool = [...STARTER_QUESTIONS];
  const picks = []; let bag = [];
  for (let i = 0; i < n; i++) { if (!bag.length) bag = [...pool]; picks.push(bag.splice(rand(bag.length), 1)[0]); }
  const start = rand(4);
  const runs = picks.map((q, i) => {
    const d = drawFor(presetById('ez-opening'), null);
    const draw = { ...d, status: ((start + i) % 4) + 1 };   // the status spread the ≥20-across-four rule needs
    return { i: i + 1, question: q.text, door: q.door, kind: q.kind, draw, drawLabel: drawLabel(draw), sections: {}, sharedOpening: null, sharedOpeningCost: 0 };
  });
  const b = { id: shortId(), code: code(), created: new Date().toISOString(), version: VERSION, author, lane, n, lanes, status: 'queued', current: null, runs };
  return writeBatch(b);
}

// Run it. Never throws; the file carries status/error. Sections in the page's order; the shared
// opening for the floors, the dragon and the step is the Sonnet lane's own opening in the model
// lane (the live prompt on the live model), the LIVE lane's in the prompt lane — never paid twice.
export async function runBatch(id) {
  let b = readBatch(id); if (!b) return;
  b.status = 'running'; writeBatch(b);
  try {
    for (const run of b.runs) {
      if (Object.keys(run.sections).length === SECTIONS.length) continue; // resumed batch: already done
      for (const sec of SECTIONS) {
        if (run.sections[sec.id]) continue;
        b.current = { run: run.i, section: sec.id }; writeBatch(b);
        const preset = presetById(sec.preset);
        let opening = run.sharedOpening;
        if (sec.id !== 'opening' && !opening) { run.sections[sec.id] = { rows: [], error: 'no shared opening (the opening section did not yield one)' }; continue; }
        const rows = await runSection(preset, b.lanes, { question: run.question, draw: run.draw, opening });
        run.sections[sec.id] = { rows, at: new Date().toISOString() };
        if (sec.id === 'opening') {
          const sharedKey = b.lane === 'prompt' ? 'live' : (b.lanes.some((L) => L.key === 'sonnet') ? 'sonnet' : b.lanes[0].key);
          const src = rows.find((r) => r.key === sharedKey && r.parsed?.reader) || rows.find((r) => r.parsed?.reader);
          if (src) run.sharedOpening = { fromLane: src.key, reader: src.parsed.reader, medicine: src.parsed.medicine || '', question: src.parsed.question || '', act: src.parsed.act || '' };
        }
        writeBatch(b);
      }
    }
    b.status = 'done'; b.current = null; b.finished = new Date().toISOString();
  } catch (e) { b.status = 'error'; b.error = e.message; }
  writeBatch(b);
}

// THE BLIND VIEW for a judge: letters, texts, draw, question — no lane names, no model ids, no
// flags (a flag can hint). Names arrive per run only once that run's six sections are all judged.
export function blindView(b, judgedSections = {}) {
  const runs = b.runs.map((run) => {
    const done = SECTIONS.every((s) => judgedSections[`${run.i}:${s.id}`]);
    const sections = {};
    for (const s of SECTIONS) {
      const sec = run.sections[s.id]; if (!sec) continue;
      sections[s.id] = {
        error: sec.error || null,
        rows: (sec.rows || []).map((r) => ({
          letter: r.letter, prose: r.prose, parsed: r.parsed ? { medicine: r.parsed.medicine || '', question: r.parsed.question || '', chips: Array.isArray(r.parsed.chips) ? r.parsed.chips : [] } : null, text: r.parsed ? '' : r.text, words: r.lint?.words || 0,
          ...(done ? { label: r.label, model: r.model, cost: r.cost, ms: r.ms, flags: (r.lint?.flags || []).map((f) => f.code) } : {}),
        })),
      };
    }
    return { i: run.i, question: run.question, draw: run.draw, drawLabel: run.drawLabel, sections, revealed: done };
  });
  return { id: b.id, version: b.version, lane: b.lane, n: b.n, status: b.status, laneCount: b.lanes.length, runs };
}

// The hidden key: letter → lane key, for one section of one run.
export function laneForLetter(b, runIndex, sectionId, letter) {
  const run = b.runs.find((r) => r.i === +runIndex); const sec = run?.sections?.[sectionId];
  const row = sec?.rows?.find((r) => r.letter === letter);
  return row ? { key: row.key, label: row.label, model: row.model, usage: row.usage, cost: row.cost, ms: row.ms, flags: (row.lint?.flags || []).map((f) => f.code), words: row.lint?.words || 0 } : null;
}
export function lanesOf(b, runIndex, sectionId) {
  const run = b.runs.find((r) => r.i === +runIndex); const sec = run?.sections?.[sectionId];
  return (sec?.rows || []).map((row) => ({ letter: row.letter, key: row.key, label: row.label, model: row.model, usage: row.usage, cost: row.cost, ms: row.ms, flags: (row.lint?.flags || []).map((f) => f.code), words: row.lint?.words || 0 }));
}

// THE EXPORT FOR THE SEATS: one markdown, blind — lettered sections, no names. The seat returns
// "run 3, meaning: B" lines; importPicks() reads them.
export function exportMarkdown(b) {
  const L = [];
  L.push(`# BAKE-OFF BATCH ${b.id} — blind, for a seat to judge`, '', `**Reader version:** ${b.version} · **lane:** ${b.lane} · **runs:** ${b.n} · **columns per section:** ${b.lanes.length} · **created:** ${b.created}`, '',
    '> You are judging blind. Each section shows the same prompt answered by different columns, lettered in a random order that differs per section. For every section, name the letter you prefer — or "tie". Add "!" for a strong preference. Return your picks as lines like:', '>', '> `run 3, meaning: B`  ·  `run 3, moon: A!`  ·  `run 4, opening: tie`', '>', '> Sections: opening · meaning · moon · mechanism · dragon · step. The pick is the reading; cost is not shown here on purpose. Judge the rails too: the Plain voice forbids the map\'s words on glass; the opening must not end with its own question; on a beinghood question the assistant\'s hedge is a failure.', '');
  for (const run of b.runs) {
    L.push(`## Run ${run.i} — "${run.question}"`, '', `Draw: **${run.drawLabel}**`, '');
    for (const s of SECTIONS) {
      const sec = run.sections[s.id]; if (!sec) { L.push(`### ${s.label} — not generated`, ''); continue; }
      L.push(`### Run ${run.i} · ${s.label}`, '');
      for (const r of sec.rows) {
        L.push(`#### ${r.letter}`, '', r.prose || r.text || '(empty)', '');
        if (r.parsed?.medicine) L.push(`*medicine:* ${r.parsed.medicine}`, '');
        if (r.parsed?.question) L.push(`*question:* ${r.parsed.question}`, '');
        if (s.id === 'opening' && Array.isArray(r.parsed?.chips) && r.parsed.chips.length) L.push(`*chips:* ${r.parsed.chips.map((c) => `[${c.kind}] ${c.text}`).join(' · ')}`, '');
      }
    }
  }
  return L.join('\n');
}

// "run 3, meaning: B" · "run 3 · moon: A!" · "3 mechanism tie" · "Run 4 — opening — B (strongly)"
export function parsePicks(text) {
  const out = []; const bad = [];
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.trim(); if (!line) continue;
    const m = line.match(/run\s*#?\s*(\d+)[^a-z]*?(opening|meaning|moon|mechanism|dragon|step)\b[^A-Za-z]*?(tie|both|same|[A-H])\b\s*(!|\(?strong(?:ly)?\)?)?/i) || line.match(/^(\d+)\s*[^a-z]*?(opening|meaning|moon|mechanism|dragon|step)\b[^A-Za-z]*?(tie|both|same|[A-H])\b\s*(!|\(?strong(?:ly)?\)?)?/i);
    if (!m) { bad.push(line); continue; }
    const pick = /^(tie|both|same)$/i.test(m[3]) ? 'tie' : m[3].toUpperCase();
    out.push({ run: +m[1], section: m[2].toLowerCase(), pick, strength: m[4] ? 2 : 1 });
  }
  return { picks: out, bad };
}
