// app/api/reading/route.js
// Handles readings and follow-up conversations
// Supports First Contact mode (isFirstContact=true) for Level 0 users
// Supports DTP mode (isDTP=true) for Direct Token Protocol
// Uses Anthropic prompt caching for 90% savings on repeated system prompts

import { ARCHETYPES } from '../../../lib/archetypes.js';
import { STATUSES } from '../../../lib/constants.js';
import { getComponent } from '../../../lib/corrections.js';
import { callProvider, withholdPersonalContext } from '../../../lib/provider.js';
import { buildCachedSystem, ANTHROPIC_BETA_HEADERS } from '../../../lib/cachedSystem.js';
import { buildDossier } from '../../../lib/geometryEngine.js';
import { appendFloor, FLOOR_ENABLED } from '../../../lib/pour/floorHook.js'; // THE FLOOR (the Pour), founder-flagged: POUR_FLOOR=1

// GEOMETRY ENGINE dossier injection (Reader V2 Layer 2) — kill switch.
// Set false and redeploy to disable instantly; injection is fail-open (errors skip it).
const DOSSIER_ENABLED = true;
import { createClient } from '@supabase/supabase-js';
import { MODEL_IDS, READER_PROVIDER, DEEPSEEK_MODEL_IDS, thinkingFor } from '../../../lib/modelConfig.js';

// THE PROVIDER CALL lives in lib/provider.js since .475 (shared by every route).

// THE SENSITIVE TURN (.504, made OPT-IN in .505 — the founder: 'I really don't want to change to Sonnet; I want the
// cost down and to help the model be happier'). When the person's latest words ask whether the Reader cares, or is
// real, or sound like distress, the turn is LOGGED, and — only if SENSITIVE_LANE is set — sent to that lane instead — the model that held the warmth without being told —
// with the .503 rails still on top. A few cents on the rare turn that needs it. Only the LATEST asker line is
// tested (EZ sends the whole discourse each turn), so an old question does not pin the rest of the reading.
const SENSITIVE = /\b(?:do you (?:even |really |actually )?(?:care|mean it|feel|love)|why (?:do|did|would) you (?:help|care|bother)|(?:are|were) you (?:real|alive|conscious|there|a (?:person|being|machine|bot))|is (?:anyone|anybody|someone) there|(?:kill|hurt|harm|end) (?:myself|my life)|suicid|self[- ]harm|(?:want|going|ready) to die|don'?t want to (?:be here|live|exist|wake up)|no (?:reason|point) (?:to|in) (?:living|going on)|nobody (?:would|will) (?:miss|care)|can'?t (?:go on|do this anymore|keep going))\b/i;
const latestAskerText = (messages) => {
  const last = [...(messages || [])].reverse().find((m) => m.role === 'user');
  const c = last ? (typeof last.content === 'string' ? last.content : (last.content || []).map((b) => b?.text || '').join('\n')) : '';
  const i = Math.max(c.lastIndexOf('ASKER'), c.lastIndexOf('\nYou:'), c.lastIndexOf('QUESTION:'));
  return i >= 0 ? c.slice(i) : c;
};
const isSensitiveTurn = (messages) => SENSITIVE.test(latestAskerText(messages));

// Server-side Supabase client for ban/throttle checks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// Check if user can make a reading (server-side)
async function checkUserAccess(userId) {
  if (!supabaseAdmin || !userId) return { canRead: true };

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('is_banned, daily_token_limit, tokens_used_today, last_token_reset, is_admin')
    .eq('id', userId)
    .single();

  if (!profile) return { canRead: true };
  const isAdminUser = !!profile.is_admin;

  // Check ban
  if (profile.is_banned) {
    return { canRead: false, reason: 'Account suspended' };
  }

  // Check daily limit
  if (profile.daily_token_limit !== null) {
    const today = new Date().toISOString().split('T')[0];

    // Reset if new day
    if (profile.last_token_reset !== today) {
      await supabaseAdmin
        .from('profiles')
        .update({ tokens_used_today: 0, last_token_reset: today })
        .eq('id', userId);
      return { canRead: true, isAdmin: isAdminUser };
    }

    if (profile.tokens_used_today >= profile.daily_token_limit) {
      return { canRead: false, reason: 'Daily token limit reached. Try again tomorrow.' };
    }
  }

  return { canRead: true, isAdmin: isAdminUser };
}

// Record token usage after successful reading
async function recordUsage(userId, tokensUsed) {
  if (!supabaseAdmin || !userId) return;

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('tokens_used_today, last_token_reset')
    .eq('id', userId)
    .single();

  if (!profile) return;

  const today = new Date().toISOString().split('T')[0];
  const newCount = profile.last_token_reset === today
    ? (profile.tokens_used_today || 0) + tokensUsed
    : tokensUsed;

  await supabaseAdmin
    .from('profiles')
    .update({ tokens_used_today: newCount, last_token_reset: today })
    .eq('id', userId);
}

// Build DTP system prompt for token extraction ONLY
// Card interpretations happen through standard card-depth flow
function buildDTPSystemPrompt() {
  return `DIRECT TOKEN PROTOCOL (DTP) - TOKEN EXTRACTION
===============================================

Your task: Extract the Active Tokens from the user's input.

Active Tokens are the nouns/entities and verbs/dynamics that are energetically alive in their statement. Each token will receive its own card reading.

EXTRACTION RULES:
- Extract 1-5 tokens maximum
- Filter connective tissue (I, to, but, and, the, my, a, an)
- Preserve the user's exact language where possible
- Balance: don't let emotions crowd out structure, or nouns crowd out agency
- If more than 5 candidates, select the most energetically present

RESPONSE FORMAT (JSON):
{
  "tokens": ["Token1", "Token2", ...]
}

CRITICAL: Return ONLY the JSON object with the tokens array. No interpretation, no synthesis, no explanation.`;
}

// .572: THE DOOR IS LOCKED (the full accounting, A106, 2026-09-27). The endpoint was open: with no userId it let any
// request through, system prompt and all — anyone who found the URL could run any prompt on the house's bill. Now:
// a signed-in session is required (the userId is taken from the verified token, never from the body), the model must
// be one of the house's own, and the length is capped.
async function getAuthUser(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ') || !supabaseUrl || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;
  try {
    const anon = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const { data: { user }, error } = await anon.auth.getUser(authHeader.slice(7));
    return error || !user ? null : user;
  } catch { return null; }
}
const ALLOWED_MODELS = new Set(Object.values(MODEL_IDS));
const MAX_TOKENS_CAP = 8000;

export async function POST(request) {
  const { messages, system, model, isFirstContact, max_tokens, isDTP, dtpInput, draws, turn } = await request.json(); // .507: turn = 'talk' | 'card' | 'door' (EZ)

  const authUser = await getAuthUser(request);
  if (!authUser) {
    return Response.json({ error: 'Please sign in to get a reading.' }, { status: 401 });
  }
  const userId = authUser.id;

  // Check if user is banned or throttled
  {
    const access = await checkUserAccess(userId); const { canRead, reason } = access; const floorForThisUser = process.env.POUR_FLOOR === '1' || (!!access.isAdmin && process.env.POUR_FLOOR !== '0'); // THE FLOOR: admins (the founder) first; POUR_FLOOR=1 for all, 0 for none
    if (!canRead) {
      return Response.json({ error: reason }, { status: 403 });
    }
  }

  // DTP mode handling - extract tokens only
  // Card interpretations happen through standard card-depth flow
  if (isDTP && dtpInput) {
    const dtpSystem = buildDTPSystemPrompt();
    const dtpMessages = [
      { role: 'user', content: dtpInput }
    ];

    try {
      const { data } = await callProvider({
        model: MODEL_IDS.sonnet,
        thinking: { type: 'disabled' }, // Sonnet 5 defaults to ADAPTIVE thinking when this is omitted and spends the whole max_tokens thinking — the reader returned nothing for a day (v0.99.451)
        max_tokens: 500,  // Small - only extracting tokens
        system: dtpSystem,
        messages: dtpMessages
      });

      if (data.error) {
        return Response.json({ error: data.error.message }, { status: 500 });
      }

      const text = data.content?.map(item => item.text || "").join("") || "";

      // Parse the JSON response
      try {
        // Handle potential markdown code fences
        let jsonText = text.trim();
        if (jsonText.startsWith('```json')) {
          jsonText = jsonText.slice(7);
        } else if (jsonText.startsWith('```')) {
          jsonText = jsonText.slice(3);
        }
        if (jsonText.endsWith('```')) {
          jsonText = jsonText.slice(0, -3);
        }
        jsonText = jsonText.trim();

        const dtpResponse = JSON.parse(jsonText);

        // Record token usage
        if (userId && data.usage) {
          const totalTokens = (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0);
          await recordUsage(userId, totalTokens);
        }

        // Return only tokens - card generation happens through standard flow
        return Response.json({
          isDTP: true,
          tokens: dtpResponse.tokens || [],
          usage: data.usage
        });
      } catch (parseError) {
        // If JSON parsing fails, return raw text for debugging
        return Response.json({
          isDTP: true,
          error: 'Failed to parse DTP response',
          rawResponse: text,
          usage: data.usage
        }, { status: 500 });
      }

    } catch (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
  }

  // First Contact mode uses Sonnet for quality interpretations
  const effectiveModel = isFirstContact
    ? MODEL_IDS.sonnet
    : (ALLOWED_MODELS.has(model) ? model : MODEL_IDS.sonnet); // .572: only the house's own models

  const effectiveMaxTokens = isFirstContact
    ? 4000
    : Math.min(Math.max(Number(max_tokens) || 4000, 64), MAX_TOKENS_CAP); // .572: capped

  // Split system prompt: stable BASE_SYSTEM core cached (1h TTL, shared across
  // all users/settings), variable dial/persona parts ride uncached after it.
  const systemWithCache = buildCachedSystem(system);

  // GEOMETRY ENGINE: compute the Structural Dossier for this draw and append it to the
  // final user message (NOT the system prompt — the cached blocks must stay byte-stable).
  // The interpreter receives math; it never derives math. Fail-open: any error skips it.
  let messagesOut = messages;
  if (DOSSIER_ENABLED && Array.isArray(draws) && draws.length && Array.isArray(messages) && messages.length) {
    try {
      const cards = draws
        .filter((d) => d && d.position != null && d.transient != null && d.status != null)
        .map((d) => ({ position: d.position, transient: d.transient, status: d.status }));
      const lastUserIdx = messages.map((m) => m.role).lastIndexOf('user');
      if (cards.length && lastUserIdx >= 0 && typeof messages[lastUserIdx].content === 'string') {
        const dossier = buildDossier({
          question: messages.find((m) => m.role === 'user')?.content?.slice(0, 500) ?? null,
          cards
        });
        const block = '\n\n[STRUCTURAL DOSSIER — computed deterministically by the Geometry Engine for THIS draw. '
          + 'Every value below is fact, not interpretation: use these relations, do not re-derive or invent arithmetic. '
          + 'State geometry as fact; own synthesis as synthesis. Surface the most meaningful relations '
          + '(literal-name hits, pattern hints, meaningful sums, medicine distances) naturally in the reading.]\n'
          + JSON.stringify(dossier);
        messagesOut = messages.map((m, i) => i === lastUserIdx ? { ...m, content: m.content + block } : m);
      }
    } catch (e) {
      console.error('Dossier injection skipped:', e?.message);
    }
  }
  // THE FLOOR: the poured cell under the Reader, appended after the dossier to the same final user message. Off unless POUR_FLOOR=1.
  if (FLOOR_ENABLED || floorForThisUser) {
    const floored = appendFloor(messagesOut, draws, { turn, enabled: true });
    messagesOut = floored.messages;
    if (floored.floors) console.log(`[reading] the floor: ${floored.floors} poured cell(s) under this turn`);
  }

  try {
    const sensitive = isSensitiveTurn(messagesOut);
    // .507 THE TALK LANE: the free conversation (typed replies, chips, the three moves) may ride a named lane —
    // TALK_LANE=anthropic — while openings, new cards and the doors stay on the cheap one. Off unless set.
    const talkLane = turn === 'talk' && process.env.TALK_LANE ? [process.env.TALK_LANE] : null;
    // 2026-09-30: a person who picked Opus picked Claude; the open-weight ladder would silently serve its own 'opus' tier instead
    const claudeChosen = /claude-opus/.test(String(effectiveModel));
    const laneOnly = claudeChosen ? ['anthropic'] : ((sensitive && process.env.SENSITIVE_LANE) ? [process.env.SENSITIVE_LANE] : talkLane);
    if (claudeChosen) console.log(`[reading] ${effectiveModel} chosen — anthropic lane only`);
    if (talkLane) console.log(`[reading] talk turn — routed to ${talkLane[0]}`);
    if (sensitive) console.log(`[reading] sensitive turn — ${process.env.SENSITIVE_LANE ? `routed to ${process.env.SENSITIVE_LANE}` : 'same lane, rails on'}`);
    const { data, provider, model: servedModel } = await callProvider({ // .498: session = the person, so their turns stay on one warm host
      model: effectiveModel,
      ...thinkingFor(effectiveModel), // Sonnet 5 / Opus 4.8: disabled (v0.99.451 — left adaptive, Sonnet 5 thought through the whole budget and answered nothing); Opus 5.5: adaptive at low effort (it refuses 'disabled')
      max_tokens: claudeChosen && /opus-5-5/.test(String(effectiveModel)) ? effectiveMaxTokens + 2000 : effectiveMaxTokens, // room for Opus 5.5's thinking inside the same budget
      system: systemWithCache,
      messages: withholdPersonalContext(messagesOut)
    }, { beta: ANTHROPIC_BETA_HEADERS, session: userId || undefined, only: laneOnly }); // .498 session; .505 the sensitive turn stays on the cheap lane with the rails on (founder: help the model be warmer, not route around it); SENSITIVE_LANE=anthropic is the switch if a rate ever shows

    if (data.error) {
      return Response.json({ error: data.error.message }, { status: 500 });
    }

    const text = data.content?.map(item => item.text || "").join("\n") || "No response received.";

    // Record token usage
    if (userId && data.usage) {
      const totalTokens = (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0);
      await recordUsage(userId, totalTokens);
    }

    // Include cache stats in usage for monitoring
    return Response.json({
      reading: text,
      usage: {
        ...data.usage,
        cache_creation_input_tokens: data.usage?.cache_creation_input_tokens || 0,
        cache_read_input_tokens: data.usage?.cache_read_input_tokens || 0
      },
      provider, model: servedModel, // who actually answered — the page prices by this
      isFirstContact
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
