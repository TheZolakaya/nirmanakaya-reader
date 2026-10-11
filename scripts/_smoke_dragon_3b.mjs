// .740 smoke: one draw through the DRAGON door, the system built as the page builds it (the Handing + DRAGON_STANDARD), the user message a
// close copy of the page's. One model call. Run in each checkout for before / after.
//   READER_PROVIDER=openrouter npx tsx scripts/_smoke_dragon_3b.mjs [transient] [position] [status] ["question"] [voice=plain]
import fs from 'node:fs';
const ENV = fs.readFileSync('.env.local', 'utf8');
for (const line of ENV.split(/\r?\n/)) { const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^"|"$/g, ''); }
const [T = '64', P = '7', S = '3', Q = "Why did the app crash right after today's deploy?", VOICE = 'plain'] = process.argv.slice(2);
const DEFS = (await import('../lib/data/nirmanakaya_78_definitions.json', { with: { type: 'json' } })).default;
const { buildKernel, kernelBlock } = await import('../lib/kernel.js');
const { drawRecord } = await import('../lib/record.js');
const { ezSystem, DRAGON_STANDARD, dragonBlock } = await import('../lib/ezPrompts.js');
const { HANDING_SET } = await import('../lib/handingPrompt.js');
const { fmtDrawForEz, spreadKeyFor } = await import('../lib/ezOpening.js');
const { callProvider } = await import('../lib/provider.js');
const { buildCachedSystem } = await import('../lib/cachedSystem.js');
const { MODEL_IDS } = await import('../lib/modelConfig.js');
const card = { transient: Number(T), position: Number(P), status: Number(S) };
const k = buildKernel(card, DEFS);
const drawText = fmtDrawForEz([card], 'discover', spreadKeyFor(1), false, null, null, null, true, Q, '');
const system = `${ezSystem(HANDING_SET.BASE_SYSTEM, VOICE, { rules: HANDING_SET.EZ_RULES })}\n\n${DRAGON_STANDARD}`;
const msg = `QUESTION: "${Q}"\n\nTHE ORIGINAL DRAW (unchanged):\n${drawText}\n\nTHE DISCOURSE SO FAR, in order:\n(the opening turn is not reproduced in this smoke)\n\nTHE SIGNATURE IN PLAY:\n${kernelBlock(k)}\n\n${drawRecord(card, DEFS)}${dragonBlock(k)}`;
console.error(`[dragon] system ${system.split(/\s+/).length} words · standard starts: ${JSON.stringify(DRAGON_STANDARD.slice(0, 60))}`);
const { data, provider } = await callProvider({ model: MODEL_IDS.sonnet, max_tokens: 600, system: buildCachedSystem(system), messages: [{ role: 'user', content: msg }] }, { tag: 'smoke-dragon' });
const text = data?.content?.map((i) => i.text || '').join('\n') || '';
let obj = null; try { obj = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, '')); } catch { const m = text.match(/\{[\s\S]*\}/); if (m) { try { obj = JSON.parse(m[0]); } catch {} } }
const out = obj?.reader || text;
console.log(`==================== dragon · t${T}/p${P}/st${S} · served by ${provider} · ${String(out).split(/\s+/).length} words\n${out}`);
