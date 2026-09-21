// lib/readingSummary.js
// THE TRACE A READING LEAVES (.510). One function summarises a saved reading row into the 1-2 sentence
// narrative + hashtags that the journey thread (and the Personalized suggestion) is built from. Shared by
// /api/user/reading-summary and the backfill. Understands the full reader's shape (synthesis / letter) AND
// an EZ conversation (interpretation.synthesis._ez.turns) — EZ readings had never left a trace.
import { providerFetch } from './provider.js';
import { MODEL_IDS } from './modelConfig.js';
import { getComponent } from './corrections.js';
import { STATUSES } from './constants.js';

const statusPrefix = (s) => (STATUSES?.[s]?.prefix || (s === 1 ? '' : STATUSES?.[s]?.name || '')).trim();
const nameOf = (id) => getComponent(id)?.name || `#${id}`;

/** The text worth summarising, from either reader's saved shape. Empty string = nothing to summarise yet. */
export function readingText(reading) {
  const interp = reading?.interpretation || {};
  const ez = interp?.synthesis?._ez;
  if (ez && Array.isArray(ez.turns) && ez.turns.length) {
    const lines = [];
    for (const t of ez.turns) {
      if (t.role === 'you') lines.push(`ASKER: ${String(t.text || '').slice(0, 300)}`);
      else if (t.role === 'reader' || t.role === 'wrap') {
        lines.push(`READER${t.draw ? ' (a new card: ' + statusPrefix(t.draw.status) + ' ' + nameOf(t.draw.transient) + ')' : ''}: ${String(t.text || '').slice(0, 600)}`);
        if (t.medicine) lines.push(`  medicine: ${String(t.medicine).slice(0, 200)}`);
        if (t.located) lines.push(`  found: ${String(t.located).slice(0, 120)}`);
      }
    }
    return { kind: 'ez', text: lines.join('\n').slice(0, 3500) };
  }
  const summary = interp.synthesis?.summary;
  const summaryText = typeof summary === 'string' ? summary : (summary?.deep || summary?.swim || summary?.wade || summary?.surface || '');
  const letterText = typeof interp.letter === 'string' ? interp.letter : (interp.letter?.deep || interp.letter?.swim || interp.letter?.wade || interp.letter?.surface || '');
  if (!summaryText && !letterText) return { kind: 'full', text: '' };
  return { kind: 'full', text: `${summaryText ? `SYNTHESIS: ${summaryText.slice(0, 500)}\n` : ''}${letterText ? `LETTER: ${letterText.slice(0, 300)}` : ''}` };
}

/** Summarise a reading row. Returns { summary, hashtags } or null when there is nothing to summarise. */
export async function summarizeReading(reading) {
  const { kind, text } = readingText(reading);
  if (!text) return null;
  const draws = reading.draws || [];
  const drawDescriptions = draws.map((d) => `${statusPrefix(d.status)} ${nameOf(d.transient)}`.trim()).join(', ');
  const question = reading.topic || 'General reading';
  const res = await providerFetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: MODEL_IDS.haiku, max_tokens: 300, thinking: { type: 'disabled' },
      system: 'You generate brief reading summaries for a consciousness mapping system called Nirmanakaya. Each reading draws "signatures" (not cards) that reflect the querent\'s inner landscape. Respond with ONLY valid JSON.',
      messages: [{ role: 'user', content: `Summarize this reading in 1-2 sentences and generate 3-5 lowercase hashtags (single words or hyphenated phrases).

QUESTION: "${question}"
MODE: ${reading.mode || 'reflect'}
SIGNATURES DRAWN: ${drawDescriptions}
${kind === 'ez' ? `THE CONVERSATION (the asker's own words matter most — what they were circling, what they found, what they said they would do):\n${text}` : text}

Return JSON: {"summary": "1-2 sentence narrative of what was explored and what emerged — name the actual subject in the asker's own terms where the conversation names one", "hashtags": ["tag1", "tag2", "tag3"]}

Rules:
- Summary should capture the ESSENCE — what the querent was exploring, what the architecture revealed, and what they themselves named or decided
- Hashtags should be thematic (e.g., "career", "identity", "letting-go", "balance", "relationships") not structural
- Do not use signature names as hashtags
- No # symbol in hashtags` }],
    }),
  });
  const data = await res.json();
  if (data?.error) throw new Error(data.error.message || 'summary call failed');
  const raw = (data.content || []).map((b) => b.text || '').join('');
  let parsed = null;
  try { parsed = JSON.parse(raw); } catch { const m = raw.match(/\{[\s\S]*\}/); if (m) { try { parsed = JSON.parse(m[0]); } catch {} } }
  if (!parsed) throw new Error('summary did not parse');
  const hashtags = (parsed.hashtags || []).filter((t) => typeof t === 'string').map((t) => t.toLowerCase().replace(/^#/, '').trim()).filter(Boolean).slice(0, 7);
  return { summary: String(parsed.summary || ''), hashtags };
}
