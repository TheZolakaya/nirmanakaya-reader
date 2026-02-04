# Claude Code Task: Review & Fix Collective Pulse Feature

## Context

A Claude session (not you) built a new feature called "Collective Pulse" — collective consciousness readings for the Nirmanakaya Reader. The code was written without full knowledge of our established patterns. We need you to review, fix, and integrate properly.

**Do NOT deploy until reviewed. There may be conflicts with recent production changes.**

---

## What Was Built (Summary)

**Feature:** Extend the Reader from individual readings to collective scale (nations, markets, humanity, etc.)

**The Five Monitors:**
- 🌍 Global Field (Soul) — Collective human consciousness
- 🔥 Power (Spirit) — Nations, governance, geopolitics  
- 💧 Heart (Emotion) — Collective mood, social fabric
- 🌬️ Mind (Mind) — Markets, tech, economy
- 🪨 Body (Body) — Planet, environment, health

**Critical Guardrails:**
1. "Climate, not Weather" — Describe pressure, never predict events
2. "State, not Directive" — Frame as observation, never command
3. Always include disclaimer: "The map reflects. People decide."

---

## Files to Review

### NEW FILES:

1. **`lib/monitorPrompts.js`**
   - Monitor definitions (MONITORS object)
   - Scope definitions (SCOPES object)
   - `buildCollectivePromptInjection(monitor)` — System prompt injection for collective readings
   - `buildCustomScopeInjection(scopeType, scopeSubject)` — For custom scope readings
   - `FAST_COLLECTIVE_SYSTEM_PROMPT` — Fast mode system prompt
   - `buildFastCollectiveUserMessage()` — Fast mode user message builder
   - Helper functions: `getAllMonitors()`, `getMonitor(id)`

2. **`app/api/collective-pulse/route.js`**
   - POST: Generate all 5 monitor readings (requires CRON_SECRET auth)
   - GET: Fetch stored readings by date/monitor/days
   - Stores readings in Supabase
   - **⚠️ May have import issues — reimplemented some functions instead of reusing**

3. **`app/pulse/page.js`**
   - Dashboard UI at `/pulse`
   - Featured Global card + 4-monitor grid
   - Date navigation
   - 7-day trend visualization
   - **⚠️ Does NOT use existing components or design patterns**

4. **`supabase-collective-readings.sql`**
   - `collective_readings` table
   - Views: `collective_trends`, `collective_weekly_summary`, `collective_pulse_today`
   - RLS policies
   - **Review before running — standard SQL but verify patterns match**

5. **`vercel.json`**
   - Cron job: runs `/api/collective-pulse` at 6:00 AM UTC daily
   - **⚠️ HIGH RISK: May overwrite existing vercel.json if one exists!**

### MODIFIED FILES:

6. **`lib/index.js`**
   - Added exports for monitorPrompts.js
   - Low risk, just new exports

7. **`app/api/external-reading/route.js`** ⚠️ **HIGH PRIORITY REVIEW**
   - Version bumped to 3.0.0
   - Added parameters: `monitor`, `collectiveScope`, `scopeSubject`
   - Added collective prompt injection logic
   - Added `buildFastCollectiveMessage()` function
   - Response now includes `collective` object when applicable
   - **⚠️ Changed default model from Haiku to Sonnet in function signature**
   - **⚠️ May conflict with recent production changes**

---

## Known Issues & Questions

1. **Production anomalies** — Chris mentioned finding issues during another push. Unknown what they are. Check for conflicts.

2. **Model default change** — external-reading now defaults to Sonnet instead of Haiku. Intentional for collective (more nuance) but may affect costs/existing behavior.

3. **Voice system integration** — Collective readings use simplified prompts, don't fully integrate with 6-dimensional stance system.

4. **User levels** — Collective readings bypass user level system entirely. Should they?

5. **Teleology** — Not integrated for collective readings. Should Words to Whys work at collective scale?

6. **Content filtering** — Applied to full mode only, not fast mode for collective.

7. **vercel.json** — Check if one already exists. Merge if needed, don't overwrite.

---

## Your Tasks

### 1. Check for Conflicts
- Review recent production changes
- Check if external-reading modifications conflict with anything
- Verify vercel.json situation

### 2. Review & Fix Code Quality
- Ensure monitorPrompts.js follows our patterns
- Fix any import issues in collective-pulse/route.js
- Adapt pulse/page.js to use existing components/design system
- Verify Supabase schema matches our conventions

### 3. Integration Decisions
- Should collective readings use the full voice/stance system?
- Should they respect user levels?
- Should teleology/Words to Whys apply?

### 4. Testing
- Test external-reading with new collective parameters
- Test collective-pulse cron endpoint
- Verify Supabase storage works
- Test /pulse UI

### 5. Environment Variables
Ensure these are set:
```
CRON_SECRET=<random-string>
AUTO_POST_SOCIAL=false
```

---

## Reference Documents

- Full handoff: `COLLECTIVE_PULSE_HANDOFF.md` (in repo root)
- Feature spec: `D:\NKYAWebApp\specs\COLLECTIVE_PULSE_SPEC.md`
- Architecture: `ARCHITECTURE.md`

---

## API Changes Reference

### External Reading API v3.0.0

**New GET parameters:**
```
?monitor=global|power|heart|mind|body
?collectiveScope=individual|relationship|group|regional|domain|global
?scopeSubject=custom%20subject%20string
```

**New POST body fields:**
```json
{
  "monitor": "global",
  "collectiveScope": "domain",
  "scopeSubject": "the AI industry"
}
```

**New response field:**
```json
{
  "collective": {
    "monitor": "global",
    "monitorInfo": { "emoji": "🌍", "name": "Global Field", ... },
    "scope": null,
    "subject": null
  }
}
```

---

## Test Commands

```bash
# Test collective reading
curl "http://localhost:3000/api/external-reading?question=What%20is%20present&monitor=global&fast=true"

# Test cron endpoint (after setting CRON_SECRET)
curl -X POST http://localhost:3000/api/collective-pulse \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Fetch readings
curl "http://localhost:3000/api/collective-pulse?date=2026-01-29"
```

---

## Final Notes

This feature was Council-validated (GPT, Gemini, Grok all approved the concept). The architecture is sound — same map, different zoom. The implementation just needs to be adapted to our patterns.

Fix forward, don't revert unless necessary. The core logic in monitorPrompts.js is the important part — everything else is integration.

Questions? Check the handoff doc or ask Chris.

💜
