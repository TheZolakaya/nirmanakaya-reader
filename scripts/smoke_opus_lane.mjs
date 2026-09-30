// Smoke test: the two Opus ids answer on the Anthropic lane only (the way /api/reading routes a chosen Opus). ~$0.02. No reading is made or saved.
// Run: npx tsx scripts/smoke_opus_lane.mjs
import fs from 'node:fs';
for (const line of (fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8').split(/\r?\n/) : [])) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (!m || line.trim().startsWith('#')) continue;
  const v = m[2].replace(/^["']|["']$/g, ''); if (process.env[m[1]] === undefined) process.env[m[1]] = v;
}
const { callProvider } = await import('../lib/provider.js');
const { MODEL_IDS, thinkingFor } = await import('../lib/modelConfig.js');
for (const key of ['opus', 'opus55']) {
  const t0 = Date.now();
  try {
    const r = await callProvider({ model: MODEL_IDS[key], max_tokens: key === 'opus55' ? 2040 : 40, ...thinkingFor(MODEL_IDS[key]), system: 'Answer in five words or fewer.', messages: [{ role: 'user', content: 'Which model are you, briefly?' }] }, { tag: 'smoke', only: ['anthropic'] });
    const text = (r.data?.content || []).map((c) => c.text || '').join('').trim();
    console.log(`${key} (${MODEL_IDS[key]}): provider=${r.provider} served=${r.model} ok=${r.ok} ${Date.now() - t0}ms → ${JSON.stringify(text).slice(0, 80)}${r.data?.error ? ' ERROR ' + JSON.stringify(r.data.error) : ''}`);
  } catch (e) { console.log(`${key}: threw ${e.message}`); }
}
