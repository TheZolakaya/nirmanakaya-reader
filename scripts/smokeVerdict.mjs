// End-to-end smoke test of the verdict discernment pass (real draw, real API call).
import { readFileSync } from 'fs';
import { generateSpread } from '../lib/utils.js';
import { typeQuestion, computeFieldLean, buildDiscernmentPrompt, parseVerdictResponse } from '../lib/verdictEngine.js';
import { buildCardDossier, drawsToCards } from '../lib/geometryEngine.js';

// load ANTHROPIC_API_KEY from .env.local
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
}

const question = process.argv[2] || 'Is the Reader ready to market to strangers today, with no further safety work?';
const cardCount = Number(process.argv[3]) || 1;
const typerResult = typeQuestion(question);
console.log('QUESTION:', question);
console.log('TYPER:', JSON.stringify(typerResult));
if (typerResult.hardGate) { console.log('HARD GATE — no draw occurs.'); process.exit(0); }

const draws = generateSpread(cardCount);
const cards = drawsToCards(draws);
const lean = computeFieldLean(draws);
const dossiers = cards.map((_, i) => buildCardDossier({ question, cards, index: i }));
console.log('DRAW:', JSON.stringify(draws[0]));
console.log('LEAN:', JSON.stringify({ value: lean.value, band: lean.band, portal: lean.portalPresent }));

const prompt = buildDiscernmentPrompt({ question, typerResult, lean, dossiers });
const res = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01'
  },
  body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: Math.min(1500 + draws.length * 900, 4500), messages: [{ role: 'user', content: prompt }] })
});
const data = await res.json();
if (data.error) { console.error('API ERROR:', data.error.message); process.exit(1); }
const text = data.content?.map((i) => i.text || '').join('\n') || '';
const verdict = parseVerdictResponse(text);
if (!verdict) { console.error('PARSE FAILED. Raw:\n', text.slice(0, 800)); process.exit(1); }
console.log('\nVERDICT:', verdict.verdict);
console.log('HEADLINE:', verdict.headline);
console.log('QUALIFIER:', verdict.qualifier);
console.log('LEAN NOTE:', verdict.leanNote, `(${verdict.leanAgreement})`);
console.log('AUTHORSHIP:', verdict.authorshipReturn);
console.log('\nWALK:');
for (const s of verdict.walk || []) console.log(' •', s);
console.log('\nTOKENS:', JSON.stringify(data.usage));
