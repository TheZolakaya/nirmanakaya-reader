// Smoke test: does Fable 5.1 answer on the Anthropic lane, and which thinking shape does it take? One tiny call per shape
// tried, stopping at the first that answers. No reading is made or saved. Run: npx tsx scripts/smoke_fable_lane.mjs
import fs from 'node:fs';
for (const line of (fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8').split(/\r?\n/) : [])) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (!m || line.trim().startsWith('#')) continue;
  const v = m[2].replace(/^["']|["']$/g, ''); if (process.env[m[1]] === undefined) process.env[m[1]] = v;
}
const { callProvider } = await import('../lib/provider.js');
const MODEL = process.argv[2] || 'claude-fable-5-1';
const SHAPES = [
  ['disabled', { thinking: { type: 'disabled' } }],
  ['adaptive/low', { thinking: { type: 'adaptive' }, output_config: { effort: 'low' } }],
  ['none', {}],
];
for (const [name, shape] of SHAPES) {
  const t0 = Date.now();
  try {
    const r = await callProvider({ model: MODEL, max_tokens: 2040, ...shape, system: 'Answer in five words or fewer.', messages: [{ role: 'user', content: 'Which model are you, briefly?' }] }, { tag: 'smoke', only: ['anthropic'] });
    const text = (r.data?.content || []).map((c) => c.text || '').join('').trim();
    console.log(`${MODEL} [${name}]: served=${r.model} ok=${r.ok} ${Date.now() - t0}ms usage=${JSON.stringify(r.data?.usage || null)} → ${JSON.stringify(text).slice(0, 80)}${r.data?.error ? ' ERROR ' + JSON.stringify(r.data.error) : ''}`);
    if (r.ok) break;
  } catch (e) { console.log(`${MODEL} [${name}]: threw ${e.message}`); }
}
