# Collective Pulse v2 — Claude Code Task

**Date:** 2026-01-29  
**From:** Chris + Claude (Council Session)  
**Status:** APPROVED — Ready for Implementation

---

## Context

The Collective Pulse is LIVE and working. Council validated. Now we need v2 refinements based on feedback from GPT, Gemini, Grok, and Chris.

**What exists:** Basic pulse with 5 monitors, daily cron, simple UI  
**What we need:** Fuller content, multiple voices, admin controls, share feature, proper polish

---

## Task List

### ✅ DONE
- [x] "Correction" → "Path to Balance" (already changed)

---

### 🔴 HIGH PRIORITY

#### 1. Lock Collective Pronouns
**Location:** `lib/monitorPrompts.js`

Add explicit guardrail to all collective prompts:
```
CRITICAL: NEVER use "you" or "your" in collective readings.
ALWAYS use: "we", "humanity", "the collective", "the system", "the nations", etc.
```

#### 2. Architectural Language Only
**Location:** `lib/monitorPrompts.js`

Add to prompts:
```
Stay in architectural language. Name the archetype and correction path.
Do NOT recommend specific technologies, policies, products, or actions.
Diagnose the pattern. Let readers supply the implementation.
```

#### 3. Soften Monitor Names (Public-Facing)
**Location:** `lib/monitorPrompts.js` + `app/pulse/page.js`

Add `publicName` field to MONITORS:

| ID | Internal Name | Public Name |
|----|---------------|-------------|
| `global` | Global Field | Global Field |
| `power` | Monitor of Power | Governance & Power |
| `heart` | Monitor of Heart | Social & Cultural Field |
| `mind` | Monitor of Mind | Economic & Systems Intelligence |
| `body` | Monitor of Body | Planetary & Material Reality |

Use `publicName` in UI, keep `name` for internal/API.

#### 4. Throughline Section — TOP of Page
**Location:** `app/pulse/page.js` + `app/api/collective-pulse/route.js`

- Add new section at TOP of pulse page (above Global Field)
- Full paragraph synthesis (4-6 sentences)
- Looks across all 5 monitors, identifies the meta-pattern
- Example: "Across all domains, humanity is confusing endurance with alignment. Motion continues, but coherence lags. The system is not failing—it is asking to be felt before it is pushed further."

**Generation:** After all 5 monitors generated, make one more call that sees all 5 readings and synthesizes.

**Schema:** Add `throughline` field to storage (per reading_time + voice)

#### 5. Longer Content — FULL Interpretations
**Location:** `app/api/collective-pulse/route.js`

Switch from fast mode to full mode. Target lengths:

| Section | Current | Target |
|---------|---------|--------|
| Throughline | N/A | 4-6 sentences |
| Interpretation | 2-3 sentences | 5-8 sentences |
| Rebalancing Path | 1 sentence | 2-3 sentences (include WHY) |

This is a dashboard people READ. Give it room.

---

### 🟡 MEDIUM PRIORITY

#### 6. Pre-render All Voice Variants — USE EXISTING VOICE SYSTEM
**Location:** `app/api/collective-pulse/route.js`

Generate 5 voices × 5 monitors = 25 interpretations at cron time.

**⚠️ IMPORTANT: Reuse the existing voice/stance system from `lib/voice.js`**

Map Pulse voices to existing presets:

| Pulse Voice | Display Name | Existing Config / Preset |
|-------------|--------------|-------------------------|
| `friend` | Friend | `{ complexity: 'friend', voice: 'warm', density: 'clear', seriousness: 'light' }` |
| `analyst` | Analyst | **NEW PRESET NEEDED** — `{ complexity: 'guide', voice: 'direct', density: 'clear', seriousness: 'balanced' }` |
| `scientist` | Scientist | `{ complexity: 'master', voice: 'direct', density: 'rich', seriousness: 'earnest' }` |
| `mentor` | Mentor | Use existing `DELIVERY_PRESETS.Wise` |
| `oracle` | Oracle | Use existing `DELIVERY_PRESETS.Oracle` |

**Only new thing:** Add "Analyst" preset to `lib/voice.js` for news-style briefing tone.

**Implementation:** 
- Collective prompt injection (`buildCollectivePromptInjection`) + existing `buildStancePrompt()` 
- Same voice system, just with collective framing on top

**UI:** Voice switcher at top of page (dropdown or toggle buttons). Instant switch — all pre-loaded.

**Default:** `analyst` (most accessible for general public)

#### 7. Schema Updates
**Location:** `supabase-collective-readings.sql` (new migration)

```sql
-- Change date to timestamp for frequency support
ALTER TABLE collective_readings 
ALTER COLUMN reading_date TYPE TIMESTAMP WITH TIME ZONE 
USING reading_date::timestamp with time zone;

ALTER TABLE collective_readings 
RENAME COLUMN reading_date TO reading_time;

-- Add voice column
ALTER TABLE collective_readings 
ADD COLUMN voice TEXT DEFAULT 'analyst';

-- Add throughline column
ALTER TABLE collective_readings 
ADD COLUMN throughline TEXT;

-- Update unique constraint
ALTER TABLE collective_readings 
DROP CONSTRAINT IF EXISTS collective_readings_reading_date_monitor_key;

ALTER TABLE collective_readings 
ADD CONSTRAINT collective_readings_unique 
UNIQUE(reading_time, monitor, voice);

-- Create settings table
CREATE TABLE IF NOT EXISTS pulse_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by TEXT,
  
  -- Generation settings
  default_voice TEXT DEFAULT 'analyst',
  prerender_voices TEXT[] DEFAULT ARRAY['friend', 'analyst', 'scientist', 'mentor', 'oracle'],
  frequency TEXT DEFAULT 'daily', -- 'hourly', '6hour', 'daily', 'weekly'
  cron_hour INTEGER DEFAULT 6,
  model TEXT DEFAULT 'claude-sonnet-4-20250514',
  interpretation_length TEXT DEFAULT 'full', -- 'short', 'medium', 'full'
  
  -- Feature flags
  generate_throughline BOOLEAN DEFAULT true,
  auto_publish BOOLEAN DEFAULT true
);

-- Initialize single row
INSERT INTO pulse_settings DEFAULT VALUES;
```

#### 8. Admin Panel: Pulse Settings
**Location:** New section in existing admin, or `app/admin/pulse/page.js`

**Manual Controls:**
- **"Generate Now"** button — Trigger immediate pulse generation
- **"Regenerate Monitor"** — Redo specific monitor (dropdown to select)
- **"Regenerate Voice"** — Redo specific voice variant
- **"Regenerate All"** — Full regeneration of current period

**Settings (persisted to `pulse_settings` table):**

| Setting | Type | Options | Default |
|---------|------|---------|---------|
| Default Voice | dropdown | friend/analyst/scientist/mentor/oracle | analyst |
| Pre-render Voices | multi-select | (same list) | all 5 |
| Frequency | dropdown | Hourly / Every 6 Hours / Daily / Weekly | Daily |
| Cron Hour (UTC) | number input | 0-23 | 6 |
| Model | dropdown | Sonnet / Haiku | Sonnet |
| Interpretation Length | dropdown | Short / Medium / Full | Full |
| Generate Throughline | toggle | on/off | on |
| Auto-publish | toggle | on/off | on |

**Display:**
- Last generated: timestamp
- Next scheduled: timestamp
- Generation status/logs

#### 9. Frequency Support
**Location:** `app/api/collective-pulse/route.js` + `vercel.json` + Admin

| Frequency | Cron Expression | URL Pattern |
|-----------|-----------------|-------------|
| Hourly | `0 * * * *` | `/pulse/2026-01-29/14:00` |
| Every 6 Hours | `0 */6 * * *` | `/pulse/2026-01-29/12:00` |
| Daily | `0 6 * * *` | `/pulse/2026-01-29` |
| Weekly | `0 6 * * 0` | `/pulse/week/2026-01-27` |

**UI adjustments:**
- Date nav becomes date+time nav for sub-daily
- Weekly shows "Week of [date]"
- Handle edge cases gracefully

**Note:** Frequency change requires updating Vercel cron or using a different scheduler.

---

### 🟢 STANDARD PRIORITY

#### 10. Share Feature
**Location:** `app/pulse/page.js`

**USE EXISTING SHARE IMPLEMENTATION** from Reader. No new tech.

**Single share target:** Full daily pulse (not individual cards)
- Link: `nirmanakaya.com/pulse/2026-01-29`
- People land on full page, find what resonates

**Share options (via existing share modal):**
- Copy Link
- Share Image (throughline + 5 status indicators)
- Native Share (mobile)

**UI:**
- Share button at top of page near date
- Uses same modal/component as Reader

**OG Meta Tags:**
```html
<meta property="og:title" content="Collective Pulse — January 29, 2026" />
<meta property="og:description" content="[Throughline text]" />
<meta property="og:image" content="/api/og/pulse?date=2026-01-29" />
<meta name="twitter:card" content="summary_large_image" />
```

#### 11. Info Modals / Hotlinks
**Location:** `app/pulse/page.js`

**USE EXISTING HOTLINK SYSTEM** from Reader.

Apply to all Nirmanakaya terms in Pulse:
- Card names (Resilience, Actualization, Harvest, etc.)
- Status names (Too Much, Too Little, Balanced, Unacknowledged)
- Position names (Change, Awareness, Drive, Will, Discipline, etc.)
- House names (Soul, Spirit, Mind, Emotion, Body)
- Correction terms (Diagonal, Vertical, Reduction)
- Any architecture terms in interpretations

Same glossary, same modal component, just wired up on Pulse page.

#### 12. Pulse Button on Reader Home Page
**Location:** `app/page.js`

Add prominent link/button to Collective Pulse from main Reader UI.

**Placement options:**
- Header/nav area
- Near mode selector
- Floating button
- Whatever fits current design

**Label suggestions:**
- "Collective Pulse" with 🌍 emoji
- "Today's Pulse"
- "Global Reading"

**Behavior:** Links to `/pulse` (current day's reading)

---

## File Summary

**Modified:**
- `lib/monitorPrompts.js` — Pronouns, architectural language, public names
- `lib/index.js` — Any new exports
- `app/api/collective-pulse/route.js` — Full mode, voices, throughline, frequency
- `app/pulse/page.js` — Voice switcher, throughline section, share, hotlinks, longer content
- `vercel.json` — Dynamic cron based on frequency setting

**New:**
- `app/admin/pulse/page.js` (or section in existing admin)
- `supabase-migration-pulse-v2.sql`

**Use Existing:**
- Share modal/component
- Hotlink/glossary system
- Voice/stance system

---

## Testing Checklist

- [ ] All 5 monitors generate with full-length content
- [ ] All 5 voices render correctly
- [ ] Voice switcher works (instant, no reload)
- [ ] Throughline appears at top, synthesizes all 5
- [ ] No "you/your" in any collective reading
- [ ] No specific product/policy recommendations
- [ ] Public names display in UI
- [ ] Share copies correct URL
- [ ] Share image generates with throughline
- [ ] Hotlinks work on all terms
- [ ] Admin: Generate Now works
- [ ] Admin: Settings persist and apply
- [ ] Frequency change updates cron behavior
- [ ] Date/time navigation works for all frequencies

---

## Council Quotes (For Reference)

**GPT:** "You didn't build a prophecy machine. You built geometric weather."

**Gemini:** "High friction, low traction" — the meta-diagnosis

**Grok:** "The architecture remembering itself at planetary scale."

**Guardrails:**
- Climate, not weather (describe pressure, not predict events)
- State, not directive (observe, don't command)
- "The map reflects. People decide."

---

*Task doc created: January 29, 2026*  
*Let's make v2 sing.* 💜
