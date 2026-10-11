// .737 smoke: one draw through the four Go-deeper floors on the NEW brazierSystem (the Handing base), the user message built the way
// app/ez/page.js builds it. Prints the four floors to read. Real model calls (4), on the house lane.
//   READER_PROVIDER=openrouter npx tsx scripts/_smoke_floors_737.mjs [transient=64] [position=7] [status=3] ["question"] [voice=plain]
import fs from 'node:fs';
const ENV = fs.readFileSync('.env.local', 'utf8');
for (const line of ENV.split(/\r?\n/)) { const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^"|"$/g, ''); }
const [T = '64', P = '7', S = '3', Q = "Why did the app crash right after today's deploy?", VOICE = 'plain'] = process.argv.slice(2);
const DEFS = (await import('../lib/data/nirmanakaya_78_definitions.json', { with: { type: 'json' } })).default;
const { buildKernel, kernelBlock } = await import('../lib/kernel.js');
const { drawRecord } = await import('../lib/record.js');
const { seedParts } = await import('../lib/ezSeed.js');
const { brazierSystem } = await import('../lib/ezPrompts.js');
const { callProvider } = await import('../lib/provider.js');
const { buildCachedSystem } = await import('../lib/cachedSystem.js');
const { MODEL_IDS } = await import('../lib/modelConfig.js');
const card = { transient: Number(T), position: Number(P), status: Number(S) };
const k = buildKernel(card, DEFS);
let tele = ''; try { tele = seedParts({ question: Q, draws: [card], index: 0 }).block || ''; } catch {}
const sys1 = brazierSystem(1, VOICE);
console.error(`[smoke] system for ring 1 (${VOICE}): ${sys1.split(/\s+/).length} words · starts: ${JSON.stringify(sys1.slice(0, 70))}`);
const turnText = 'A pretend prior turn is not available in this smoke; deepen the draw itself.';
let ring1 = '';
for (const floor of [1, 'meaning', 'moon', 'mechanism']) {
  const turnBlock = floor !== 1 ? `\n\nTHE TURN TO DEEPEN (the Reader's latest words to them — deepen THIS, never change the subject):\n${turnText}` : '';
  const seen = floor !== 1 && ring1 ? `\n\nWHY THIS IS HAPPENING, already shown to them (do not repeat it):\n${ring1}` : '';
  const ask = floor === 1 ? 'Write ring 1. JSON only.' : `Write the ${floor} floor. JSON only.`;
  const msg = `THE PERSON'S QUESTION: "${Q}"\n\n${kernelBlock(k)}\n\n${drawRecord(card, DEFS)}${tele ? `\n\n${tele}` : ''}${turnBlock}${seen}\n\n${ask}`;
  const model = MODEL_IDS.sonnet;
  const { data, provider } = await callProvider({ model, max_tokens: floor === 1 ? 500 : 1000, system: buildCachedSystem(brazierSystem(floor, VOICE)), messages: [{ role: 'user', content: msg }] }, { tag: 'smoke-floors' });
  const text = data?.content?.map((i) => i.text || '').join('\n') || '';
  let obj = null; try { obj = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, '')); } catch { const m = text.match(/\{[\s\S]*\}/); if (m) { try { obj = JSON.parse(m[0]); } catch {} } }
  const out = obj?.text || text;
  if (floor === 1) ring1 = out;
  console.log(`\n==================== floor: ${floor} · served by ${provider} · ${String(out).split(/\s+/).length} words\n${out}`);
}
