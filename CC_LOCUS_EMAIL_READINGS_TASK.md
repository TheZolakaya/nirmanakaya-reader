# Personal Locus Control + Automated Email Readings — Claude Code Task

**Date:** 2026-01-29  
**From:** Chris + Claude (Council Session)  
**Status:** SPEC COMPLETE — Build after Pulse v2 is done  
**Prerequisite:** CC_COLLECTIVE_PULSE_V2_TASK.md must be completed first

---

## Overview

Two connected features:
1. **Locus Control** — Let users change the "zoom level" of their readings (just me → relationship → family → team → etc.)
2. **Automated Email Readings** — Send users personalized readings on a schedule, including the daily Collective Pulse

---

## Part 1: Locus Control in Personal Reader

### Default Behavior
- **Default is ALWAYS "Just Me"**
- Existing Reader behavior is UNCHANGED unless user explicitly selects different locus
- This is an OPT-IN expansion, not a change to baseline

### Feature Flag (REQUIRED)

**Admin toggle, not just env var.**

**Location:** Admin settings panel

```
┌─────────────────────────────────────────────────────────────┐
│ Locus Control                                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Enable Locus Selector:  [Off ▼]                             │
│                                                             │
│ When OFF: All users see default Reader (Just Me only)       │
│ When ON: Locus dropdown visible to all users                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Schema:**
```sql
-- Add to app_settings or create new table
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  locus_control_enabled BOOLEAN DEFAULT false,
  -- future flags go here
);

INSERT INTO feature_flags DEFAULT VALUES;
```

**Logic:**
```javascript
const { locus_control_enabled } = await getFeatureFlags();

// In Reader UI:
{locus_control_enabled && <LocusSelector />}
```

Admin can flip it on/off instantly. No redeploy needed.

### UI: Locus Selector
**Location:** Reader input area, near question field

```
Locus: [Just Me ▼]         ← collapsed by default
├── Just Me                 ← no change to existing behavior
├── A Relationship          → [Who? ___________]
├── My Family
├── My Team/Group           → [Which? ___________]
├── My Community
└── Custom...               → [_________________]
```

**Behavior:**
- Collapsed dropdown, minimal footprint
- Some options prompt for clarifying text
- Selection persists for session (not permanently unless in profile settings)

---

### Locus Prompt Injections

**CRITICAL: "Just Me" = NO INJECTION. Existing prompts unchanged.**

Create `lib/locusPrompts.js`:

#### RELATIONSHIP
```javascript
const RELATIONSHIP_INJECTION = `
═══════════════════════════════════════════════════════════════
LOCUS: RELATIONSHIP
═══════════════════════════════════════════════════════════════

This reading is for a RELATIONSHIP, not an individual alone.

PRONOUNS:
- Use: "you both", "the relationship", "your connection", "between you", "the bond"
- Avoid: Solo "you" unless referring to the reader's role in the dynamic

METAPHORS:
- Draw from: polarity, dance, dialogue, mirroring, attunement, tension, resonance
- The space between two people, not inside one person
- The relationship as its own living system

AGENCY/AUTHORSHIP:
- The reader is ONE participant, not the whole system
- Frame levers as: "your side of the dynamic", "what you bring to this"
- Avoid: implying reader can fix it alone or control the other person

POSITION MEANING SHIFT:
- Change = transformation the relationship is undergoing
- Drive = the shared momentum or desire between them
- Awareness = what the relationship is conscious of (or avoiding)
- Balance = equilibrium between the two

ETHICS FRAMING (include once in reading):
"This reflects the field as you experience it — your partner may sense different patterns."
`;
```

#### FAMILY
```javascript
const FAMILY_INJECTION = `
═══════════════════════════════════════════════════════════════
LOCUS: FAMILY
═══════════════════════════════════════════════════════════════

This reading is for a FAMILY SYSTEM, not an individual alone.

PRONOUNS:
- Use: "your family", "the family", "the system you share", "this lineage"
- "You" = the reader's role/position within the family

METAPHORS:
- Draw from: inheritance, patterns, roles, boundaries, generations, roots
- Spoken and unspoken rules, assigned roles, repetition across time
- The family as organism with memory

AGENCY/AUTHORSHIP:
- Reader is one node in the system, not the controller
- Frame levers as: "your position in this system", "what you can shift from where you stand"
- Acknowledge: systems resist change, one person can seed shift but not force it

POSITION MEANING SHIFT:
- Change = what the family is collectively metabolizing (loss, transition, growth)
- Discipline = family patterns of structure, expectation, rigor
- Nurturing = how care flows (or doesn't) through the system
- Awareness = what the family knows about itself vs. what it hides

ETHICS FRAMING (include once in reading):
"This reading reflects the family field as you experience it. Others in the system may hold different truths."
`;
```

#### TEAM / GROUP
```javascript
const TEAM_INJECTION = `
═══════════════════════════════════════════════════════════════
LOCUS: TEAM / GROUP
═══════════════════════════════════════════════════════════════

This reading is for a TEAM or GROUP, not an individual alone.

PRONOUNS:
- Use: "the team", "your group", "the collective", "this working body"
- "You" = the reader's role within the team

METAPHORS:
- Draw from: alignment, friction, mission, contribution, roles, coordination
- Shared goals, competing priorities, communication flows
- The team as functional (or dysfunctional) organism

AGENCY/AUTHORSHIP:
- Reader's position matters: leader, member, or observer?
- Frame levers as: "what you can influence from your seat", "where you have leverage"
- Acknowledge: team dynamics have inertia, culture resists individual will

POSITION MEANING SHIFT:
- Drive = the team's shared momentum, motivation, hunger
- Order = structure, hierarchy, process (too much = bureaucracy, too little = chaos)
- Culture = team identity, norms, belonging
- Breakthrough = innovation, disruption to stale patterns

ETHICS FRAMING (include once in reading):
"This reflects the team field from your vantage point. Others may experience different patterns."
`;
```

#### COMMUNITY
```javascript
const COMMUNITY_INJECTION = `
═══════════════════════════════════════════════════════════════
LOCUS: COMMUNITY
═══════════════════════════════════════════════════════════════

This reading is for a COMMUNITY, not an individual alone.

PRONOUNS:
- Use: "the community", "your people", "this collective body", "the group you belong to"
- "You" = the reader's position as a community member

METAPHORS:
- Draw from: belonging, contribution, identity, gathering, boundaries, commons
- Shared space, shared values, inclusion/exclusion dynamics
- The community as living network

AGENCY/AUTHORSHIP:
- Reader is participant, not owner
- Frame levers as: "your contribution", "what you can offer or withhold"
- Acknowledge: communities move slowly, shift through participation not mandate

POSITION MEANING SHIFT:
- Compassion = how the community cares for its members
- Culture = shared identity, rituals, norms
- Balance = harmony between subgroups, interests
- Sacrifice = what the community asks of its members

ETHICS FRAMING (include once in reading):
"This reflects the community as you experience it. Others may hold different truths about this space."
`;
```

#### CUSTOM
```javascript
const CUSTOM_INJECTION = (userInput) => `
═══════════════════════════════════════════════════════════════
LOCUS: CUSTOM — "${userInput}"
═══════════════════════════════════════════════════════════════

The user has defined a custom locus: "${userInput}"

INTERPRETATION GUIDELINES:
- Parse the input to infer: Is this about a person? A group? A project? A relationship?
- Adapt pronouns accordingly
- Use the user's language where possible

METAPHOR SELECTION:
- If relational → use relationship metaphors
- If project/work → use team/mission metaphors  
- If abstract ("my healing") → blend personal + journey metaphors
- If living being ("my dog") → honor the being as co-participant

AGENCY/AUTHORSHIP:
- Infer reader's position relative to the locus
- Default to: "what you can influence from where you stand"

ETHICS FRAMING (include once in reading):
"This reading reflects the field from your perspective."
`;
```

---

### Locus Summary Table

| Locus | Pronouns | Metaphor World | Agency Frame | Ethics Note |
|-------|----------|----------------|--------------|-------------|
| Just Me | you, your | psychological, spiritual | Full author | (none) |
| Relationship | you both, the bond | polarity, dance, mirroring | One side of dynamic | Partner may see differently |
| Family | the family, this system | patterns, inheritance, roles | One node in system | Others hold different truths |
| Team | the team, your group | alignment, mission, friction | Depends on role | Others experience differently |
| Community | the community, your people | belonging, commons, identity | Participant, not owner | Community views vary |
| Custom | [inferred] | [inferred] | [inferred] | From your perspective |

---

### API Changes

**Update `/api/reading` and `/api/external-reading`:**

New parameters:
```javascript
{
  locus: 'individual' | 'relationship' | 'family' | 'team' | 'community' | 'custom',
  locusDetail: string  // "my wife Sarah", "the EPPM team", etc.
}
```

**Logic:**
```javascript
if (locus === 'individual' || !locus) {
  // NO INJECTION — existing behavior unchanged
} else {
  const injection = buildLocusInjection(locus, locusDetail);
  systemPrompt = injection + systemPrompt;
}
```

---

## Part 2: Automated Email Readings

### Default Behavior
- **Default is ON** — users receive automated readings unless they opt out
- Frequency controlled by admin (daily or weekly)

### User Profile Settings

**Location:** User profile/settings page

```
┌─────────────────────────────────────────────────────────────┐
│ Email Readings                                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Receive automated readings:  [On ▼]                         │
│                                                             │
│ ─────────────────────────────────────────────────────────── │
│                                                             │
│ Reading Focus:                                              │
│ ○ General (What's present for you)        ← default         │
│ ○ Custom Topic: [____________________________]              │
│ ○ Glistener (auto-generates topic)                          │
│                                                             │
│ ─────────────────────────────────────────────────────────── │
│                                                             │
│ Locus: [Just Me ▼]                                          │
│        ├── Just Me                                          │
│        ├── A Relationship → [___________]                   │
│        ├── My Family                                        │
│        ├── My Team → [___________]                          │
│        ├── My Community                                     │
│        └── Custom... → [___________]                        │
│                                                             │
│ ─────────────────────────────────────────────────────────── │
│                                                             │
│ Number of Cards:  [1]  [2]  [3]                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Schema: User Email Preferences

```sql
CREATE TABLE user_email_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Email toggle
  email_readings_enabled BOOLEAN DEFAULT true,
  
  -- Topic settings
  topic_mode TEXT DEFAULT 'general' CHECK (topic_mode IN ('general', 'custom', 'glistener')),
  custom_topic TEXT,
  
  -- Locus settings
  locus TEXT DEFAULT 'individual' CHECK (locus IN ('individual', 'relationship', 'family', 'team', 'community', 'custom')),
  locus_detail TEXT,
  
  -- Reading settings
  card_count INTEGER DEFAULT 1 CHECK (card_count BETWEEN 1 AND 3),
  voice TEXT DEFAULT 'friend',
  
  UNIQUE(user_id)
);

-- Index for cron job
CREATE INDEX idx_user_email_prefs_enabled ON user_email_preferences(email_readings_enabled) WHERE email_readings_enabled = true;
```

### Schema: Stored Personal Readings

```sql
CREATE TABLE user_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Reading metadata
  reading_type TEXT DEFAULT 'automated' CHECK (reading_type IN ('automated', 'manual')),
  topic_mode TEXT,
  topic TEXT,
  locus TEXT,
  locus_detail TEXT,
  card_count INTEGER,
  voice TEXT,
  
  -- The draws (JSON array)
  draws JSONB NOT NULL,
  
  -- Interpretation content
  interpretation JSONB NOT NULL,
  
  -- For sharing
  share_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  is_public BOOLEAN DEFAULT false
);

-- Index for user's reading history
CREATE INDEX idx_user_readings_user ON user_readings(user_id, created_at DESC);

-- Index for share links
CREATE INDEX idx_user_readings_share ON user_readings(share_token) WHERE share_token IS NOT NULL;
```

### Admin Settings

**Add to existing `pulse_settings` table or create new:**

```sql
CREATE TABLE email_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by TEXT,
  
  -- Schedule
  email_frequency TEXT DEFAULT 'weekly' CHECK (email_frequency IN ('daily', 'weekly')),
  send_hour INTEGER DEFAULT 7,  -- UTC
  send_day INTEGER DEFAULT 1,   -- 0=Sunday, 1=Monday (for weekly)
  
  -- Defaults for new users
  default_card_count INTEGER DEFAULT 1,
  default_voice TEXT DEFAULT 'friend',
  
  -- Feature flags
  email_system_enabled BOOLEAN DEFAULT true
);

INSERT INTO email_settings DEFAULT VALUES;
```

### Admin Panel UI

**Location:** `/admin/email` or section in existing admin

```
┌─────────────────────────────────────────────────────────────┐
│ Email Reading Settings                                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ System enabled:  [On ▼]                                     │
│                                                             │
│ Frequency:  [Weekly ▼]                                      │
│                                                             │
│ Send time:  [7] :00 UTC                                     │
│                                                             │
│ Send day (weekly):  [Monday ▼]                              │
│                                                             │
│ ─────────────────────────────────────────────────────────── │
│                                                             │
│ Defaults for New Users:                                     │
│                                                             │
│ Default cards:  [1]  [2]  [3]                               │
│ Default voice:  [Friend ▼]                                  │
│                                                             │
│ ─────────────────────────────────────────────────────────── │
│                                                             │
│ Actions:                                                    │
│                                                             │
│ [Send Test Email to Me]                                     │
│ [Trigger Send Now (All Users)]  ⚠️ Careful!                 │
│                                                             │
│ ─────────────────────────────────────────────────────────── │
│                                                             │
│ Stats:                                                      │
│ Users with email enabled: 1,234                             │
│ Last send: January 27, 2026 at 07:00 UTC                    │
│ Emails sent: 1,198 / 1,234 (36 failed)                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Part 3: Email Cron Job

### Endpoint

**Location:** `/app/api/email-readings/route.js`

**POST** (requires CRON_SECRET):
- Fetches all users with `email_readings_enabled = true`
- Generates personalized reading for each user
- Stores reading in `user_readings` table
- Fetches current Collective Pulse
- Sends email via Resend
- Logs results

### Cron Configuration

**Add to `vercel.json`:**
```json
{
  "crons": [
    {
      "path": "/api/collective-pulse",
      "schedule": "0 6 * * *"
    },
    {
      "path": "/api/email-readings",
      "schedule": "0 7 * * 1"
    }
  ]
}
```

Note: Email runs AFTER Pulse (7am vs 6am) so Pulse data is available.

Weekly = `0 7 * * 1` (Monday 7am UTC)
Daily = `0 7 * * *` (Every day 7am UTC)

Admin setting changes require manual vercel.json update or use external scheduler.

---

## Part 4: Email Template

### Structure

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  🌅 Your Nirmanakaya Reading                                │
│  January 30, 2026                                           │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  YOUR READING                                               │
│                                                             │
│  Topic: What's present for you                              │
│  Locus: Just Me                                             │
│                                                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                             │
│  [CARD IMAGE]                                               │
│                                                             │
│  Too Much Resilience in Change                              │
│                                                             │
│  [Full interpretation paragraph - 5-8 sentences]            │
│                                                             │
│  PATH TO BALANCE                                            │
│  [Full rebalancing path - 2-3 sentences with WHY]           │
│                                                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                             │
│  [Repeat for cards 2 and 3 if applicable]                   │
│                                                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                             │
│  → View on site: [link]                                     │
│  → Share this reading: [share link]                         │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🌍 TODAY'S COLLECTIVE PULSE                                │
│                                                             │
│  [Full throughline paragraph]                               │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  🌍 Global Field                                            │
│  Too Much Resilience in Change                              │
│  [2-3 sentence summary]                                     │
│                                                             │
│  🔥 Governance & Power                                      │
│  Too Much Steward of Cognition in Drive                     │
│  [2-3 sentence summary]                                     │
│                                                             │
│  💧 Social & Cultural Field                                 │
│  Too Little Actualization in Awareness                      │
│  [2-3 sentence summary]                                     │
│                                                             │
│  🌬️ Economic & Systems Intelligence                         │
│  Too Little Calculation in Will                             │
│  [2-3 sentence summary]                                     │
│                                                             │
│  🪨 Planetary & Material Reality                            │
│  Too Little Harvest in Discipline                           │
│  [2-3 sentence summary]                                     │
│                                                             │
│  → View full Pulse: [link]                                  │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Manage preferences]  •  [Unsubscribe]                     │
│                                                             │
│  Nirmanakaya Reader • nirmanakaya.com                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Email Implementation

**Use Resend + React Email:**

```javascript
// lib/emails/reading-email.jsx
import { Html, Head, Body, Container, Section, Text, Link, Img } from '@react-email/components';

export function ReadingEmail({ reading, pulse, user }) {
  return (
    <Html>
      <Head />
      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* Personal Reading Section */}
          <Section style={styles.header}>
            <Text style={styles.title}>🌅 Your Nirmanakaya Reading</Text>
            <Text style={styles.date}>{formatDate(reading.created_at)}</Text>
          </Section>
          
          {/* Cards */}
          {reading.interpretation.cards.map((card, i) => (
            <Section key={i} style={styles.card}>
              <Text style={styles.cardTitle}>{card.signature}</Text>
              <Text style={styles.interpretation}>{card.interpretation}</Text>
              <Text style={styles.pathLabel}>PATH TO BALANCE</Text>
              <Text style={styles.path}>{card.rebalancingPath}</Text>
            </Section>
          ))}
          
          {/* Links */}
          <Section style={styles.links}>
            <Link href={`https://nirmanakaya.com/my-readings/${reading.id}`}>
              View on site
            </Link>
            <Link href={`https://nirmanakaya.com/reading/${reading.share_token}`}>
              Share this reading
            </Link>
          </Section>
          
          {/* Collective Pulse Section */}
          <Section style={styles.pulseSection}>
            <Text style={styles.pulseTitle}>🌍 TODAY'S COLLECTIVE PULSE</Text>
            <Text style={styles.throughline}>{pulse.throughline}</Text>
            
            {pulse.monitors.map(monitor => (
              <Section key={monitor.id} style={styles.monitor}>
                <Text style={styles.monitorName}>
                  {monitor.emoji} {monitor.publicName}
                </Text>
                <Text style={styles.monitorSignature}>{monitor.signature}</Text>
                <Text style={styles.monitorSummary}>{monitor.summary}</Text>
              </Section>
            ))}
            
            <Link href="https://nirmanakaya.com/pulse">
              View full Pulse
            </Link>
          </Section>
          
          {/* Footer */}
          <Section style={styles.footer}>
            <Link href={`https://nirmanakaya.com/settings`}>
              Manage preferences
            </Link>
            <Text> • </Text>
            <Link href={`https://nirmanakaya.com/unsubscribe?token=${user.unsubscribe_token}`}>
              Unsubscribe
            </Link>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
```

---

## Part 5: Reading History Page

### Location: `/my-readings`

```
┌─────────────────────────────────────────────────────────────┐
│ My Readings                                    [Settings ⚙️] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ January 30, 2026 — Weekly Reading                       │ │
│ │ Topic: General • Locus: Just Me • 2 cards               │ │
│ │                                                         │ │
│ │ Too Much Resilience in Change                           │ │
│ │ Too Little Actualization in Will                        │ │
│ │                                                         │ │
│ │ [View] [Share]                                          │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ January 23, 2026 — Weekly Reading                       │ │
│ │ Topic: My career • Locus: Just Me • 3 cards             │ │
│ │                                                         │ │
│ │ Balanced Order in Drive                                 │ │
│ │ Too Little Wisdom in Culture                            │ │
│ │ Too Much Fortitude in Change                            │ │
│ │                                                         │ │
│ │ [View] [Share]                                          │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [Load More]                                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Share Page: `/reading/[share_token]`

Public page (no login required) showing the reading.

Same layout as viewing your own reading, but:
- No edit controls
- "Get your own reading" CTA
- Respects `is_public` flag

---

## Part 6: Glistener Integration

### How It Works

When user selects "Glistener" as topic mode:
- System checks if user has active Glisteners
- If yes: Glistener auto-generates the topic/question
- If no: Falls back to "General"

**API call to Glistener system:**
```javascript
const topic = await generateGlistenerTopic(userId);
// Returns something like: "What wants to be seen about my career transition?"
```

### Topic Mode Logic

```javascript
async function getReadingTopic(user, preferences) {
  switch (preferences.topic_mode) {
    case 'general':
      return "What's present for you right now?";
    
    case 'custom':
      return preferences.custom_topic || "What's present for you right now?";
    
    case 'glistener':
      const glistenerTopic = await generateGlistenerTopic(user.id);
      return glistenerTopic || "What's present for you right now?";
    
    default:
      return "What's present for you right now?";
  }
}
```

---

## Files to Create/Modify

### New Files:
- `lib/locusPrompts.js` — Locus injection definitions
- `app/api/email-readings/route.js` — Email cron endpoint
- `lib/emails/reading-email.jsx` — Email template
- `app/my-readings/page.js` — Reading history
- `app/my-readings/[id]/page.js` — Single reading view
- `app/reading/[share_token]/page.js` — Public share view
- `app/settings/page.js` — User preferences (or add section to existing)
- `app/admin/email/page.js` — Admin email settings
- `supabase-migration-email-readings.sql` — Schema

### Modified Files:
- `app/page.js` — Add locus selector to Reader
- `lib/index.js` — Export locus functions
- `lib/promptBuilder.js` — Inject locus prompts when applicable
- `vercel.json` — Add email cron
- `app/api/reading/route.js` — Accept locus params
- `app/api/external-reading/route.js` — Accept locus params (may already have this from Pulse work)

---

## Testing Checklist

### Locus Control:
- [ ] "Just Me" = existing behavior, NO changes
- [ ] Each locus changes pronouns correctly
- [ ] Each locus changes metaphors appropriately
- [ ] Ethics framing appears once per reading
- [ ] Custom locus parses user input sensibly
- [ ] Feature flag hides UI when disabled
- [ ] Locus selector doesn't break mobile layout

### Email System:
- [ ] New users default to email_readings_enabled = true
- [ ] Cron generates readings for all enabled users
- [ ] Readings stored in user_readings table
- [ ] Email includes full personal reading
- [ ] Email includes Collective Pulse
- [ ] View link goes to /my-readings/[id]
- [ ] Share link goes to /reading/[share_token]
- [ ] Share page works without login
- [ ] Unsubscribe link works
- [ ] Manage preferences link works
- [ ] Glistener topic mode generates topic
- [ ] Admin can trigger test email
- [ ] Admin can change frequency/timing

### Profile Settings:
- [ ] Toggle email on/off works
- [ ] Topic mode selection persists
- [ ] Custom topic field saves
- [ ] Locus selection persists
- [ ] Card count selection persists
- [ ] Settings apply to next email send

---

## Implementation Order

1. **Schema first** — Run migrations
2. **Locus prompts** — lib/locusPrompts.js
3. **Locus in API** — Update reading endpoints
4. **Locus in UI** — Add selector (behind feature flag)
5. **User preferences table** — Schema + basic CRUD
6. **Profile settings UI** — Let users configure
7. **Email template** — Design + build
8. **Email cron** — Generation + sending
9. **Reading history page** — /my-readings
10. **Share page** — /reading/[token]
11. **Admin controls** — Settings + triggers
12. **Glistener integration** — Topic generation

---

## Guardrails Reminder

**Locus Control is EXPERIMENTAL:**
- Feature flagged
- "Just Me" = zero changes to existing behavior
- Test with Chris + Council before public
- Ethics framing mandatory for non-individual loci

**Email is OPT-OUT:**
- Default ON for all users
- Clear unsubscribe in every email
- Respect preferences immediately

---

## Part 7: Expand Reading Feature

### Concept
"Card laid is a card played." Users can ADD cards to an existing reading, never remove or re-draw.

### Rules
| Rule | Behavior |
|------|----------|
| Max cards | 5 |
| Add only | Can't remove or re-draw |
| Locked | Each card's interpretation frozen when drawn |
| Synthesis | Regenerates with each expansion |

### What Stays Locked (per card):
- Card interpretation
- Card rebalancing path

### What Regenerates:
- Synthesis / Path section (weaves all cards)
- Throughline (if applicable)

### Flow:

**1-card reading:**
```
Card 1: Too Much Resilience in Change
[interpretation — LOCKED]
[rebalancing — LOCKED]

Synthesis: [based on 1 card]

[+ Add a card]
```

**User clicks [+ Add a card] → 2-card reading:**
```
Card 1: Too Much Resilience in Change
[interpretation — LOCKED, unchanged]
[rebalancing — LOCKED, unchanged]

Card 2: Too Little Wisdom in Culture  ← NEW
[interpretation — NEW]
[rebalancing — NEW]

Synthesis: [REGENERATED with both cards]

[+ Add a card]
```

**Continue until 5 cards max.**

### UI:
```
[Card 1] [Card 2] [Card 3] [+ Add] [+ Add]
                              ↑        ↑
                           (slot 4) (slot 5)
```

At 5 cards: no more [+ Add] buttons.

### Email Integration:
- 1-card email includes: "Want more depth? [Add a card →]"
- Link goes to `/my-readings/[id]?expand=true`
- User sees their reading with [+ Add] option
- New cards drawn on site, not in email

### API:
```javascript
POST /api/reading/expand
{
  readingId: uuid,
  existingDraws: [...],           // locked draws
  existingInterpretations: [...], // locked interpretations
  cardCount: 1                    // how many to add (usually 1)
}

Returns:
{
  newDraws: [...],
  newInterpretations: [...],
  synthesis: "...",              // regenerated
  updatedReading: {...}          // full reading object
}
```

### Storage:
- Update `user_readings.draws` (append new draws)
- Update `user_readings.interpretation` (append new cards, replace synthesis)
- Keep `share_token` same (shared link shows expanded reading)

---

## Part 7: Expand Reading (Add Cards)

### Core Principle
**"Card laid is a card played."**

Once a card is drawn and interpreted, it's LOCKED. Users can only go deeper, never undo.

### Rules

| Rule | Behavior |
|------|----------|
| Max cards | 5 |
| Can add | ✅ Always (until 5) |
| Can remove | ❌ Never |
| Can re-draw | ❌ Never |
| Card interpretation | Locked once generated |
| Card rebalancing path | Locked once generated |
| Synthesis | Regenerates with each add |

### Flow

**1-card reading:**
```
Card 1: Too Much Resilience in Change
[interpretation — LOCKED]
[rebalancing — LOCKED]

Synthesis: [based on 1 card]

[+ Add a card]
```

**User clicks [+ Add a card] →**

**2-card reading:**
```
Card 1: Too Much Resilience in Change
[interpretation — LOCKED, unchanged]
[rebalancing — LOCKED, unchanged]

Card 2: Too Little Wisdom in Culture  ← NEW
[interpretation — GENERATED]
[rebalancing — GENERATED]

Synthesis: [REGENERATED with both cards]

[+ Add a card]
```

**At 5 cards:**
```
Card 1-5: [all LOCKED]

Synthesis: [final]

[Maximum depth reached]
```

### Where This Appears

1. **Email reading** — "Want more depth? [Add a card]" → links to site
2. **Reader** — Button below interpretation
3. **My Readings history** — Can expand past readings
4. **Collective Pulse** — NOT applicable (fixed 1-card per monitor)

### API: Expand Reading Endpoint

**Location:** `/app/api/expand-reading/route.js`

**POST body:**
```javascript
{
  reading_id: "uuid",           // Existing reading to expand
  // OR for new readings not yet stored:
  existing_draws: [...],         // Locked draws
  existing_interpretations: [...], // Locked interpretations
  question: "...",
  locus: "...",
  voice: "..."
}
```

**Response:**
```javascript
{
  new_card: {
    draw: { transient, position, status },
    interpretation: "...",
    rebalancing_path: "..."
  },
  synthesis: "..."  // Regenerated with ALL cards
}
```

### Schema Update

Readings already store draws as JSONB array. Just append:

```javascript
// Existing
draws: [{ transient, position, status, interpretation, rebalancing }]

// After expand
draws: [
  { ...card1, interpretation: "locked", rebalancing: "locked" },
  { ...card2, interpretation: "locked", rebalancing: "locked" },
  { ...card3, interpretation: "new", rebalancing: "new" }  // just added
]

synthesis: "regenerated with all 3"
```

### UI Component

```jsx
{cards.length < 5 && (
  <button onClick={handleAddCard}>
    + Add a card
  </button>
)}

{cards.length === 5 && (
  <div className="text-muted">Maximum depth reached</div>
)}
```

---

## Updated Testing Checklist

### Expand Reading:
- [ ] Can add card to 1-card reading
- [ ] Can add cards up to 5 total
- [ ] Cannot add beyond 5
- [ ] Original interpretations unchanged after expand
- [ ] Synthesis regenerates correctly
- [ ] Works from email link
- [ ] Works in Reader UI
- [ ] Works in My Readings history
- [ ] Stored reading updates in database

---

*Spec created: January 29, 2026*  
*Build after Pulse v2 is complete.* 💜

---

## Part 7: Expandable Readings (Add Cards)

### Concept
"Card laid is a card played." Users can ADD cards to any reading, but never remove.

### Rules
| Rule | Behavior |
|------|----------|
| Add only | Can add cards, never remove or redo |
| Max 5 | Stop offering "add" button at 5 cards |
| Locked interpretations | Previous cards' interpretations NEVER change |
| Fresh synthesis | Synthesis/Path regenerates with each addition |
| Stored | Each expansion updates the stored reading |

### Flow

**1-card reading:**
```
Card 1: Too Much Resilience in Change
[interpretation — LOCKED]
[rebalancing — LOCKED]

Synthesis: [based on 1 card]

[+ Add a card]
```

**User clicks [+ Add a card]**

**2-card reading:**
```
Card 1: Too Much Resilience in Change
[interpretation — LOCKED, unchanged]
[rebalancing — LOCKED, unchanged]

Card 2: Too Little Wisdom in Culture  ← NEW
[interpretation — NEW]
[rebalancing — NEW]

Synthesis: [REGENERATED with both cards]

[+ Add a card]
```

**At 5 cards:** No more add button. Reading complete.

### UI Locations

**In Reader:**
- Below the reading: `[+ Add a card]` button
- Disabled/hidden at 5 cards

**In Email:**
- Link: "Want more depth? Add a card →"
- Goes to site, expands the reading there

**In /my-readings:**
- Each stored reading shows current card count
- Can expand from history view if < 5 cards

### API

**Endpoint:** `POST /api/reading/expand`

```javascript
{
  readingId: "uuid",           // Existing reading to expand
  // No other params — draws happen server-side
}
```

**Response:**
```javascript
{
  success: true,
  newCard: { draw, interpretation, rebalancing },
  synthesis: "regenerated synthesis with all cards",
  totalCards: 3
}
```

### What Gets Regenerated

| Component | On Expand |
|-----------|----------|
| Previous card interpretations | ❌ LOCKED |
| Previous card rebalancing | ❌ LOCKED |
| New card interpretation | ✅ Generated |
| New card rebalancing | ✅ Generated |
| Synthesis / Path | ✅ Regenerated |
| Throughline (if applicable) | ✅ Regenerated |

### Storage Update

When expanding, update the `user_readings` record:
- Append new draw to `draws` array
- Append new interpretation to `interpretation` object
- Replace synthesis with new one
- Increment implicit card count

---

## Part 8: Admin User Management

### User List View

**Location:** `/admin/users`

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Users                                                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ Sort by: [24 Hours ▼]  [Week]  [All Time]                                   │
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ User              │ 24h  │ Week │ All Time │ Email    │ Override       │ │
│ ├───────────────────┼──────┼──────┼──────────┼──────────┼────────────────┤ │
│ │ chris@example.com │ 47   │ 312  │ 4,521    │ ✅ On    │ [User Default] │ │
│ │ jane@example.com  │ 23   │ 156  │ 2,103    │ ✅ On    │ [User Default] │ │
│ │ bob@example.com   │ 12   │ 89   │ 1,847    │ ❌ Off   │ [Force On ▼]   │ │
│ │ spam@bad.com      │ 0    │ 2    │ 15       │ ✅ On    │ [Force Off ▼]  │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ [Load More]                                                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Sort Options

| Sort | Description | Query |
|------|-------------|-------|
| 24 Hours | Readings in last 24h | `WHERE created_at > NOW() - INTERVAL '24 hours'` |
| Week | Readings in last 7 days | `WHERE created_at > NOW() - INTERVAL '7 days'` |
| All Time | Total readings ever | No time filter |

All sorted descending (most active users first).

### Email Override Column

| Override State | Behavior |
|----------------|----------|
| User Default | Respects user's own `email_readings_enabled` preference |
| Force On | User gets emails regardless of their setting |
| Force Off | User does NOT get emails regardless of their setting |

### Schema Update

```sql
ALTER TABLE user_email_preferences
ADD COLUMN admin_override TEXT DEFAULT 'default' 
CHECK (admin_override IN ('default', 'force_on', 'force_off'));
```

### Email Cron Logic Update

```javascript
// When determining who gets emails:
function shouldSendEmail(user) {
  if (user.admin_override === 'force_off') {
    return false;
  }
  if (user.admin_override === 'force_on') {
    return true;
  }
  // Default: respect user preference
  return user.email_readings_enabled;
}
```

### API Endpoints

**GET `/api/admin/users`**
```javascript
// Query params:
?sort=24h|week|alltime  // default: 24h
?page=1
?limit=50

// Response:
{
  users: [
    {
      id, email,
      usage_24h, usage_week, usage_alltime,
      email_enabled, admin_override
    }
  ],
  total: 1234,
  page: 1
}
```

**PATCH `/api/admin/users/[id]`**
```javascript
// Body:
{ admin_override: 'default' | 'force_on' | 'force_off' }
```

---

## Updated File List

### New Files:
- `app/admin/users/page.js` — User management UI
- `app/api/admin/users/route.js` — User list endpoint
- `app/api/admin/users/[id]/route.js` — User update endpoint

### Modified:
- `app/api/email-readings/route.js` — Respect admin_override
- Supabase migration — Add admin_override column

---

*Spec updated: January 29, 2026*  
*Build after Pulse v2 is complete.* 💜

