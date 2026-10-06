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
    if (ez.resolution) lines.push(`THE ASKER'S OWN VERDICT ON THE READING, at the end: ${ez.resolution === 'landed' ? 'I have got it — it landed' : ez.resolution === 'open' ? 'still turning it over — the thread is open' : "that wasn't it — the reading missed"}`);
    return { kind: 'ez', text: lines.join('\n').slice(0, 3500) };
  }
  const summary = interp.synthesis?.summary;
  const summaryText = typeof summary === 'string' ? summary : (summary?.deep || summary?.swim || summary?.wade || summary?.surface || '');
  const letterText = typeof interp.letter === 'string' ? interp.letter : (interp.letter?.deep || interp.letter?.swim || interp.letter?.wade || interp.letter?.surface || '');
  if (!summaryText && !letterText) return { kind: 'full', text: '' };
  return { kind: 'full', text: `${summaryText ? `SYNTHESIS: ${summaryText.slice(0, 500)}\n` : ''}${letterText ? `LETTER: ${letterText.slice(0, 300)}` : ''}` };
}

// .709 PROVENANCE IN JOURNEY MEMORY (Air, 2026-10-05: "model-suggested context must not become user fact"). The summary used to be one flat narrative
// in which the asker's words and the Reader's suggestions blended — "three things pulling on you", the Reader's own Example, came back in a later
// reading as "you've said there are three things". Now the summary keeps authorship, in the same column (no schema change), as labelled lines:
//   ASKER_SAID — only what the asker typed; READER_OFFERED — interpretations, examples, suggestions, hypotheses, images, every Example-door scene;
//   ASKER_CONFIRMED — Reader material the asker later affirmed IN THEIR OWN WORDS (a tapped Reader-written option, continuing, or silence never counts);
//   CAME_DOWN_TO — the move; VERDICT. Hashtags come only from ASKER_SAID + ASKER_CONFIRMED. lib/userContext.js renders them by authority.
export const SUMMARY_V2 = '[provenance v2]';

/** The conversation, with every line's author marked — and a tapped Reader-written option marked as the Reader's words, not the asker's. */
function conversationLines(ez) {
  const offered = new Set();
  for (const t of ez.turns) { if (!t || t.role !== 'reader') continue; for (const c of [...(t.chips || []), ...(t.reflect || []), ...(t.forge || [])]) offered.add(String(typeof c === 'string' ? c : c?.text || '').trim()); if (t.act) offered.add(String(t.act).trim()); }
  const lines = []; const ownWords = []; let askedExample = false; // the Reader turn answering an Example tap is a hypothetical scene; ownWords = what the asker typed
  for (const t of ez.turns) {
    if (t.role === 'you') askedExample = t.move === 'example' || /^give me an example\.?$/i.test(String(t.text || '').trim());
    const isExample = t.role !== 'you' && (askedExample || t.move === 'example');
    if (t.role === 'you') { const said = String(t.text || '').trim(); const tapped = offered.has(said) || /^(Clarify that for me|Unpack that|Give me an example|Help me find which thing this is)\.?$/i.test(said); if (!tapped) ownWords.push(said); lines.push(tapped ? `ASKER TAPPED A BUTTON OR A READER-WRITTEN OPTION (these are NOT the asker's own words): "${said.slice(0, 200)}"` : `ASKER (their own typed words): ${said.slice(0, 300)}`); }
    else if (t.role === 'reader' || t.role === 'wrap') {
      lines.push(`READER${isExample ? ' (an EXAMPLE — a hypothetical scene, never the asker\'s life)' : ''}${t.draw ? ' (a new card: ' + statusPrefix(t.draw.status) + ' ' + nameOf(t.draw.transient) + ')' : ''}: ${String(t.text || '').slice(0, 600)}`);
      if (t.medicine) lines.push(`  READER's medicine: ${String(t.medicine).slice(0, 200)}`);
      if (t.located) lines.push(`  READER found: ${String(t.located).slice(0, 120)}`);
    }
  }
  if (ez.resolution) lines.push(`THE ASKER'S OWN VERDICT, tapped at the end: ${ez.resolution === 'landed' ? 'landed' : ez.resolution === 'open' ? 'still open' : 'missed'}`);
  return { text: lines.join('\n').slice(0, 4000), askerOwn: ownWords.join(' ') };
}

/** Summarise a reading row into the provenance-keeping summary. Returns { summary, hashtags } or null when there is nothing to summarise. */
export async function summarizeReading(reading) {
  const interp = reading?.interpretation || {}; const ez = interp?.synthesis?._ez;
  const question = String(reading.topic || '').trim();
  let convo = '';
  let askerOwn = question; if (ez && Array.isArray(ez.turns) && ez.turns.length) { const c = conversationLines(ez); convo = c.text; askerOwn = `${question} ${c.askerOwn}`; }
  else { const { text } = readingText(reading); if (!text) return null; convo = `READER (the whole reading, the Reader's words): ${text}`; }
  if (!convo) return null;
  const draws = reading.draws || [];
  const drawDescriptions = draws.map((d) => `${statusPrefix(d.status)} ${nameOf(d.transient)}`.trim()).join(', ');
  const res = await providerFetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: MODEL_IDS.haiku, max_tokens: 1000, thinking: { type: 'disabled' },
      system: 'You keep the record of who said what in a conversation between a person (the ASKER) and a reading (the READER). Accuracy of authorship matters more than anything else. Respond with ONLY valid JSON.',
      messages: [{ role: 'user', content: `THE QUESTION THE ASKER TYPED: "${question || '(none — a general reading)'}"
SIGNATURES DRAWN: ${drawDescriptions}

THE CONVERSATION, every line marked with its author:
${convo}

Return JSON:
{"asker_said": ["…"], "reader_offered": ["…"], "asker_confirmed": ["…"], "came_down_to": "…", "verdict": "landed|still open|missed|none", "hashtags": ["…"]}

RULES — authorship is the whole job:
- "asker_said": ONLY facts, feelings, people, events, preferences, constraints or corrections that appear in the QUESTION or in lines marked "ASKER (their own typed words)". Short items in plain words, close to how they said it. Nothing from a READER line, ever — even if the asker kept talking afterwards. A button they tapped is NOT something they said.
- "reader_offered": what the READER introduced — interpretations, guesses, suggestions, images, and EVERY example scene (an example is a hypothetical, never the asker's life). Short items. Anything about the asker's life that only a READER line contains goes HERE, never in asker_said.
- "asker_confirmed": ONLY Reader-introduced items the asker later affirmed IN THEIR OWN TYPED WORDS ("yes, that's it", or restating it as theirs). Continuing the conversation, silence, tapping a button or a Reader-written option is NOT confirmation. When in doubt, leave it out.
- "came_down_to": one plain sentence — the move the reading ended on, as something they could do or stop doing. No images.
- "verdict": the asker's tapped verdict if the conversation shows one, else "none".
- "hashtags": 3–5 lowercase thematic tags drawn ONLY from asker_said and asker_confirmed (e.g. "career", "marriage", "overthinking"); never from reader_offered; no signature names; no # symbol.
- Plain words, never the reading's pictures; say "the reading", never "the cards".` }],
    }),
  });
  const data = await res.json();
  if (data?.error) throw new Error(data.error.message || 'summary call failed');
  const raw = (data.content || []).map((b) => b.text || '').join('');
  let parsed = null;
  try { parsed = JSON.parse(raw); } catch { const m = raw.match(/\{[\s\S]*\}/); if (m) { try { parsed = JSON.parse(m[0]); } catch {} } }
  if (!parsed) throw new Error(`summary did not parse: ${raw.slice(0, 300)}`);
  const list = (x) => (Array.isArray(x) ? x : []).map((s) => String(s || '').replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 8);
  // STRICT AUTHORSHIP, MECHANICAL (proof case: "Probably all of them", the asker's reply to the Reader's "someone you love", was filed as the asker
  // confirming "people they love"). An item filed as the asker's must be CARRIED BY THEIR OWN TYPED WORDS: every content word in it found in what they
  // typed (a five-letter stem allows overthink/overthinking). An item that fails moves to READER_OFFERED — when in doubt, it is the Reader's.
  const STOPW = new Set('about after again also because been before being came come could does doing done each even every from have here into just like made make many more most much need only other over really same some still such than that their them then there these they thing things this those through very want wants were what when where which while will with would your yours yourself asked asking asks reading general feel feels feeling'.split(' '));
  const stem = (w) => w.slice(0, 5);
  const own = new Set(String(askerOwn || '').toLowerCase().replace(/[^a-z'\s]/g, ' ').split(/\s+/).filter((w) => w.length >= 4).map(stem));
  const carried = (item) => String(item).toLowerCase().replace(/[^a-z'\s]/g, ' ').split(/\s+/).filter((w) => w.length >= 4 && !STOPW.has(w)).every((w) => own.has(stem(w)));
  const said0 = list(parsed.asker_said), conf0 = list(parsed.asker_confirmed);
  const saidOk = said0.filter(carried), confOk = conf0.filter(carried), moved = [...said0, ...conf0].filter((x) => !carried(x));
  parsed.asker_said = saidOk; parsed.asker_confirmed = confOk; parsed.reader_offered = [...(Array.isArray(parsed.reader_offered) ? parsed.reader_offered : []).map((s) => String(s || '').replace(/s+/g, ' ').trim()).filter(Boolean).slice(0, 12), ...moved];
  const v = String(parsed.verdict || 'none').toLowerCase();
  const summary = [SUMMARY_V2, `ASKER_SAID: ${list(parsed.asker_said).join(' | ') || '—'}`, `READER_OFFERED: ${(parsed.reader_offered || []).slice(0, 14).join(' | ') || '—'}`, `ASKER_CONFIRMED: ${list(parsed.asker_confirmed).join(' | ') || '—'}`, `CAME_DOWN_TO: ${String(parsed.came_down_to || '').trim() || '—'}`, `VERDICT: ${['landed', 'still open', 'missed'].includes(v) ? v : 'none'}`].join('\n');
  const hashtags = (parsed.hashtags || []).filter((t) => typeof t === 'string').map((t) => t.toLowerCase().replace(/^#/, '').trim()).filter(Boolean).slice(0, 7);
  return { summary, hashtags, usage: data.usage || null }; // .709: usage, so a backfill can stop at a measured cost
}

/** Parse a stored summary. v2 → { v2: true, askerSaid, readerOffered, askerConfirmed, cameDownTo, verdict }; legacy → { v2: false, text }. */
export function parseSummary(s) {
  const t = String(s || ''); if (!t.startsWith(SUMMARY_V2)) return { v2: false, text: t };
  const get = (k) => (t.match(new RegExp(`^${k}: (.*)$`, 'm')) || [])[1] || '';
  const items = (k) => get(k).split(' | ').map((x) => x.trim()).filter((x) => x && x !== '—');
  return { v2: true, askerSaid: items('ASKER_SAID'), readerOffered: items('READER_OFFERED'), askerConfirmed: items('ASKER_CONFIRMED'), cameDownTo: get('CAME_DOWN_TO').replace(/^—$/, ''), verdict: get('VERDICT') };
}
