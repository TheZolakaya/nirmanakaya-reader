// End-to-end smoke test of the CHOICE discernment pass (real draw, real API call).
// Usage: npx tsx scripts/smokeChoice.mjs "question" "Option A" "Option B" ["Option C" ...]
import { readFileSync } from 'fs';
import { generateSpread } from '../lib/utils.js';
import { typeQuestion, computeBranchScores, buildChoicePrompt, parseVerdictResponse } from '../lib/verdictEngine.js';
import { buildCardDossier, drawsToCards } from '../lib/geometryEngine.js';

for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
}

const question = process.argv[2] || 'Which path should I lean into next?';
const options = process.argv.slice(3);
if (options.length < 2) { console.error('Need at least 2 options.'); process.exit(1); }

const typerResult = typeQuestion(question);
console.log('QUESTION:', question);
console.log('OPTIONS:', options.join(' | '));
console.log('TYPER:', JSON.stringify(typerResult));
const gated = typerResult.hardGate || options.some(o => typeQuestion(o).hardGate);
if (gated) { console.log('HARD GATE — no draw occurs.'); process.exit(0); }

const draws = generateSpread(options.length);
const cards = drawsToCards(draws);
const branchScores = computeBranchScores(draws, options);
const dossiers = cards.map((_, i) => buildCardDossier({ question: options[i], cards, index: i }));
console.log('RANKED (mechanical):', branchScores.ranked.map(b => `${b.option}: ${b.score} (${b.card} ${b.status})`).join(' | '));
if (branchScores.ties.length) console.log('TIES:', JSON.stringify(branchScores.ties));

const prompt = buildChoicePrompt({ question, options, typerResult, branchScores, dossiers });
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
console.log('SELECTION:', verdict.selection);
console.log('HEADLINE:', verdict.headline);
console.log('QUALIFIER:', verdict.qualifier);
console.log('RANK NOTE:', verdict.rankNote, `(${verdict.rankAgreement})`);
console.log('\nBRANCH NOTES:');
for (const n of verdict.branchNotes || []) console.log(` • ${n.option}: ${n.note}`);
console.log('\nAUTHORSHIP:', verdict.authorshipReturn);
console.log('\nWALK:');
for (const s of verdict.walk || []) console.log(' •', s.slice(0, 220));
console.log('\nTOKENS:', JSON.stringify(data.usage));
