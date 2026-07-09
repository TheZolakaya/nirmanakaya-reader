// End-to-end smoke of the YIELD pass (real draw, real API call).
// Usage: npx tsx scripts/smokeYield.mjs <reflect|discover|forge> "question or assertion"
import { readFileSync } from 'fs';
import { generateSpread } from '../lib/utils.js';
import { typeQuestion, buildYieldPrompt, parseYieldResponse } from '../lib/verdictEngine.js';
import { buildCardDossier, drawsToCards } from '../lib/geometryEngine.js';

for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
}

const posture = process.argv[2] || 'reflect';
const question = process.argv[3] || 'How is my work on the Reader unfolding?';
const typer = typeQuestion(question);
console.log('POSTURE:', posture, '| QUESTION:', question);
if (typer.hardGate) { console.log('HARD GATE'); process.exit(0); }

const draws = generateSpread(2);
const cards = drawsToCards(draws);
const dossiers = cards.map((_, i) => buildCardDossier({ question, cards, index: i }));

const prompt = buildYieldPrompt({ posture, question, dossiers });
const res = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
  body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: Math.min(1500 + draws.length * 900, 4500), messages: [{ role: 'user', content: prompt }] })
});
const data = await res.json();
if (data.error) { console.error('API ERROR:', data.error.message); process.exit(1); }
const text = data.content?.map((i) => i.text || '').join('\n') || '';
const y = parseYieldResponse(text);
if (!y) { console.error('PARSE FAILED. Raw:\n', text.slice(0, 600)); process.exit(1); }

console.log('\nYIELD:', y.yield);
if (y.assertion) console.log('ASSERTION:', y.assertion);
console.log('HEADLINE:', y.headline);
console.log('ITEMS:');
for (const it of y.items) console.log(` • ${it.statement}\n   (from: ${it.source})`);
if (y.authorshipReturn) console.log('AUTHORSHIP:', y.authorshipReturn);
console.log('\nTOKENS:', JSON.stringify(data.usage));
