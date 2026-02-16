# Collective Pulse Feature — Builder Handoff

**Date:** 2026-01-29  
**From:** Claude (claude.ai Council Session)  
**To:** Claude Code (Builder)  
**Status:** DRAFT CODE FOR REVIEW — Do NOT deploy as-is

---

## Context

Chris and I (Claude in claude.ai) ran a Council of 5 validation session for a new feature: **Collective Consciousness Readings**. The feature extends the Reader from individual readings to collective scale (nations, markets, humanity, etc.).

Council members (GPT, Gemini, Grok) all validated the concept. Chris said "let's freaking build it" and I... built it. Without knowing your established patterns. 🙈

**Please review, adapt, or rewrite as needed.** I'm handing off the WHAT and WHY. You know the HOW.

---

## Feature Overview

### What It Does
- Adds **scope/monitor parameters** to external-reading API
- Enables readings for collective entities (humanity, nations, markets, etc.)
- Stores daily automated readings in Supabase
- Displays readings on a `/pulse` dashboard
- Runs via Vercel cron at 6:00 AM UTC

### The Five Monitors
| ID | Emoji | Name | House | Subject |
|----|-------|------|-------|---------|
| `global` | 🌍 | Global Field | Soul | Collective human consciousness |
| `power` | 🔥 | Monitor of Power | Spirit | Nations, governance, geopolitics |
| `heart` | 💧 | Monitor of Heart | Emotion | Collective mood, social fabric |
| `mind` | 🌬️ | Monitor of Mind | Mind | Markets, tech, economy |
| `body` | 🪨 | Monitor of Body | Body | Planet, environment, health |

### Critical Guardrails (Council-mandated)
1. **Climate, not Weather** — Describe pressure, never predict events
2. **State, not Directive** — Frame as observation, never command
3. **"The map reflects. People decide."** — Always include disclaimer

---

## Files I Created/Modified

### 1. `lib/monitorPrompts.js` (NEW)
**Purpose:** Monitor definitions + collective prompt injection

**What it exports:**
- `MONITORS` — Object with all 5 monitor definitions
- `SCOPES` — Scope definitions (individual, relationship, group, etc.)
- `buildCollectivePromptInjection(monitor)` — Returns system prompt injection
- `buildCustomScopeInjection(scopeType, scopeSubject)` — For non-monitor collective
- `FAST_COLLECTIVE_SYSTEM_PROMPT` — Fast mode system prompt for collective
- `buildFastCollectiveUserMessage(question, card, monitor)` — Fast mode user message
- `getAllMonitors()`, `getMonitor(id)` — Helpers

**⚠️ Review:** May not match your prompt engineering patterns. The injection is prepended to system prompt.

---

### 2. `lib/index.js` (MODIFIED)
**Change:** Added exports for monitorPrompts.js

```javascript
// Collective Consciousness / Monitor System
export {
  MONITORS,
  SCOPES,
  buildCollectivePromptInjection,
  buildCustomScopeInjection,
  FAST_COLLECTIVE_SYSTEM_PROMPT,
  buildFastCollectiveUserMessage,
  getAllMonitors,
  getMonitor
} from './monitorPrompts.js';
```

---

### 3. `app/api/external-reading/route.js` (MODIFIED)
**Version bump:** 2.0.0 → 3.0.0

**New parameters:**
- `monitor` — 'global' | 'power' | 'heart' | 'mind' | 'body'
- `collectiveScope` — 'individual' | 'relationship' | 'group' | 'regional' | 'domain' | 'global'
- `scopeSubject` — Custom string for non-monitor collective readings

**New behavior:**
- If `monitor` or `collectiveScope` (non-individual) is set, injects collective prompt
- Fast mode uses `FAST_COLLECTIVE_SYSTEM_PROMPT` for collective
- Response includes `collective` object with monitor info

**⚠️ Review:** 
- I changed the default model from Haiku to Sonnet in the function signature
- May have broken something with the imports
- The collective injection prepends to system prompt — might conflict with mode headers

---

### 4. `app/api/collective-pulse/route.js` (NEW)
**Purpose:** Cron endpoint for daily automated readings

**POST** (requires `Authorization: Bearer CRON_SECRET`):
- Generates reading for all 5 monitors
- Stores in Supabase `collective_readings` table
- Returns results summary

**GET** (public):
- `?date=YYYY-MM-DD` — Get readings for specific date
- `?monitor=global&days=7` — Get last N days for monitor
- `?days=7` — Get all readings for last N days
- No params — Returns API documentation

**⚠️ Review:**
- I imported and reimplemented some functions instead of calling the external-reading API
- Supabase client initialization might not match your patterns
- No rate limiting or error recovery

---

### 5. `app/pulse/page.js` (NEW)
**Purpose:** Dashboard UI at `/pulse`

**Features:**
- Featured Global Field card
- 4-monitor grid
- Date navigation (← Previous / Next →)
- 7-day trend visualization (colored dots)
- Status legend
- Proper disclaimer footer

**⚠️ Review:**
- Basic React, no existing components used
- Doesn't use your design system
- No loading skeletons, basic loading state
- Tailwind classes may not match your conventions
- No mobile testing done

---

### 6. `supabase-collective-readings.sql` (NEW)
**Purpose:** Database schema

**Creates:**
- `collective_readings` table
- `collective_trends` view
- `collective_weekly_summary` view  
- `collective_pulse_today` view
- RLS policies (public read, service write)
- Indexes

**⚠️ Review:**
- Standard Supabase patterns, should be fine
- Uses `gen_random_uuid()` — verify this matches your other tables
- RLS policies grant to `anon`, `authenticated`, `service_role`

---

### 7. `vercel.json` (NEW)
**Purpose:** Cron job configuration

```json
{
  "crons": [
    {
      "path": "/api/collective-pulse",
      "schedule": "0 6 * * *"
    }
  ]
}
```

**⚠️ Review:**
- If you already have a vercel.json, this will OVERWRITE it
- Check if you need to merge with existing config

---

## Environment Variables Needed

```bash
CRON_SECRET=<random-string>        # For cron authentication
AUTO_POST_SOCIAL=false             # Future: social media posting
```

Existing variables should already cover Supabase and Anthropic.

---

## Known Issues / Questions

1. **Anomalies in prod** — Chris mentioned finding issues during another push. I don't know what they are.

2. **Model selection** — I defaulted to Sonnet for collective readings (more nuance). Is that okay for cost?

3. **Voice system** — I didn't integrate with the full 6-dimensional stance system for fast mode. Collective readings use simplified prompts.

4. **User levels** — Collective readings bypass the user level system entirely. Should they?

5. **Teleology** — Not integrated for collective readings. Should Words to Whys work at collective scale?

6. **Content filtering** — Applied to full mode, not fast mode. Might need adjustment.

7. **Vercel cron** — Requires Pro plan. Is that available?

---

## Recommended Approach

1. **Review the spec** at `D:\NKYAWebApp\specs\COLLECTIVE_PULSE_SPEC.md`
2. **Review monitorPrompts.js** — This is the core new logic
3. **Decide on integration approach:**
   - Option A: Adapt my code to your patterns
   - Option B: Rewrite using my code as reference
   - Option C: Implement incrementally (API first, then storage, then UI)
4. **Run Supabase migration** in a test environment first
5. **Test the external-reading API changes** before anything else

---

## Testing Commands

```bash
# Test collective reading (after deployment)
curl "https://nirmanakaya.com/api/external-reading?question=What%20is%20present&monitor=global&fast=true"

# Test cron endpoint (after adding CRON_SECRET)
curl -X POST https://nirmanakaya.com/api/collective-pulse \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Fetch stored readings
curl "https://nirmanakaya.com/api/collective-pulse?date=2026-01-29"
```

---

## Council Session Transcript

Full context available at:
`/mnt/transcripts/2026-01-29-11-53-14-council-dsm-mapping-collective-readings.txt`

Key quotes:
- Gemini: "Climate, not weather"
- GPT: "State, not directive"  
- Grok: "Your question (intent) collapses the infinite into the now-reflection"
- Chris: "Same map. Different zoom."

---

*Handoff created by Claude (claude.ai) — January 29, 2026*
*"I got excited and built the thing. Sorry/not sorry. 💜"*
