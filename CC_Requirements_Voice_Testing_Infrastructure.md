# CC REQUIREMENTS: Voice Testing Infrastructure

## Summary

Build API expansion + Supabase table so Claude (Opus) can test voice configs remotely and lock the 16 Royal presets.

---

## REQUIREMENT 1: Expand `/api/external-reading`

### Add `fixedDraw` parameter

Bypasses random draw for testing. Only works when env var enabled.

```javascript
fixedDraw: [
  { transient: 15, position: 2, status: 2 }
  // transient: 0-77 (card index)
  // position: 0-21 (archetype position)
  // status: 1=Balanced, 2=TooLittle, 3=TooMuch, 4=Unacknowledged
]
```

### Add `voiceConfig` parameter

Full voice configuration override.

```javascript
voiceConfig: {
  delivery: "Clear" | "Kind" | "Playful" | "Wise" | "Oracle",
  speakLike: "Friend" | "Guide" | "Teacher" | "Mentor" | "Master",
  tone: "Playful" | "Light" | "Balanced" | "Earnest" | "Grave",
  voice: "Wonder" | "Warm" | "Direct" | "Grounded",
  focus: "Do" | "Feel" | "See" | "Build",
  density: "Luminous" | "Rich" | "Clear" | "Essential",
  scope: "Resonant" | "Patterned" | "Connected" | "Here",
  directMode: boolean
}
```

### Environment Variable Toggle for `fixedDraw`

No token needed. Just an env var:

```
ALLOW_FIXED_DRAW=true   # in dev/testing
ALLOW_FIXED_DRAW=false  # in production (or just don't set it)
```

In the API route:
```javascript
if (fixedDraw && process.env.ALLOW_FIXED_DRAW === 'true') {
  // use fixed draw
} else {
  // ignore fixedDraw param, use normal random
}
```

Once presets are locked, flip it off. Ketamine AIs can't game prod.

### Updated Request Example

```json
POST /api/external-reading

{
  "question": "What am I missing in my work?",
  "cardCount": 1,
  "mode": "discover",
  "fixedDraw": [
    { "transient": 15, "position": 2, "status": 2 }
  ],
  "voiceConfig": {
    "delivery": "Oracle",
    "speakLike": "Master",
    "tone": "Grave",
    "voice": "Direct",
    "focus": "See",
    "density": "Essential",
    "scope": "Here",
    "directMode": true
  }
}
```

Note: `fixedDraw` only works when `ALLOW_FIXED_DRAW=true` in env.

### Updated Response

Add `voiceConfigUsed` and `isFixed` flag:

```json
{
  "success": true,
  "draws": [
    {
      "transient": 15,
      "position": 2,
      "status": 2,
      "isFixed": true
    }
  ],
  "voiceConfigUsed": { ... },
  "interpretation": "...",
  "usage": { ... }
}
```

---

## REQUIREMENT 2: Supabase Table `voice_presets`

```sql
CREATE TABLE voice_presets (
  id SERIAL PRIMARY KEY,
  royal_key VARCHAR(50) UNIQUE NOT NULL,
  preset_name VARCHAR(100) NOT NULL,
  governor VARCHAR(50) NOT NULL,
  governor_number INTEGER NOT NULL,
  delivery VARCHAR(20),
  speak_like VARCHAR(20),
  tone VARCHAR(20),
  voice VARCHAR(20),
  focus VARCHAR(20),
  density VARCHAR(20),
  scope VARCHAR(20),
  direct_mode BOOLEAN DEFAULT false,
  preview_phrase TEXT,
  signature_phrase TEXT,
  avoid_patterns TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Seed with 16 rows

```sql
INSERT INTO voice_presets (royal_key, preset_name, governor, governor_number) VALUES
('page-of-wands', 'The Starlight Voice', 'Inspiration', 17),
('page-of-swords', 'The Priestess Voice', 'Wisdom', 2),
('page-of-cups', 'The Moonlit Voice', 'Imagination', 18),
('page-of-coins', 'The Empress Voice', 'Nurturing', 3),
('knight-of-wands', 'The Emperor Voice', 'Order', 4),
('knight-of-swords', 'The Mechanism Voice', 'Abstraction', 15),
('knight-of-cups', 'The Hierophant Voice', 'Culture', 5),
('knight-of-coins', 'The Tower Voice', 'Breakthrough', 16),
('queen-of-wands', 'The Chariot Voice', 'Drive', 7),
('queen-of-swords', 'The Temperance Voice', 'Balance', 14),
('queen-of-cups', 'The Lovers Voice', 'Compassion', 6),
('queen-of-coins', 'The Threshold Voice', 'Change', 13),
('king-of-wands', 'The Surrender Voice', 'Sacrifice', 12),
('king-of-swords', 'The Hermit Voice', 'Discipline', 9),
('king-of-cups', 'The Justice Voice', 'Equity', 11),
('king-of-coins', 'The Strength Voice', 'Fortitude', 8);
```

Other columns will be populated after testing.

---

## REQUIREMENT 3: Admin Console Tab (Optional but nice)

Add "Voice Presets" tab to Admin Console under Config.

- List all 16 presets
- Edit any field
- "Test" button that generates sample output with current config
- Save updates `updated_at`

This can come later. API + table are the blockers.

---

## REQUIREMENT 4: Increase Question Length Limit

Currently hitting a limit on question/context string length. Remove or significantly increase it.

**Check these locations:**
- API route validation (hardcoded max length?)
- URL query param limit (if GET — switch to POST)
- Database field type (VARCHAR → TEXT)

**Target:** Accept questions up to 10,000 characters minimum. No practical limit preferred.

**Anthropic can handle it** — 200K token context window. The limit is on our side.

---

## REQUIREMENT 5: Fix Export Bug

HTML exports have empty `signature-content` divs. The interpretation is rendering in the UI but not making it into the export.

Check the export function — interpretation content is getting lost somewhere.

---

## IMPLEMENTATION NOTES

### Where `voiceConfig` gets applied

Look at how current voice settings flow into prompt building. The `voiceConfig` param should merge/override at that same point.

Likely files:
- `lib/voice.js`
- `lib/promptBuilder.js`
- `app/api/external-reading/route.js`

### Where `fixedDraw` gets applied

In `lib/utils.js` → `generateSpread()`:

```javascript
if (fixedDraw && process.env.ALLOW_FIXED_DRAW === 'true') {
  return fixedDraw.map(d => ({
    transient: d.transient,
    position: d.position,
    status: d.status,
    isFixed: true,
    // lookup card/position details from archetypes.js
  }));
}
// else: normal crypto random
```

---

## ACCEPTANCE CRITERIA

- [ ] Can POST to `/api/external-reading` with `fixedDraw` + `voiceConfig`
- [ ] Question/context accepts 10,000+ characters
- [ ] Fixed draw returns exact card/position/status specified
- [ ] Voice config shapes interpretation output
- [ ] Response includes `voiceConfigUsed` and `isFixed` flag
- [ ] Supabase table exists with 16 seeded rows
- [ ] `fixedDraw` only works when `ALLOW_FIXED_DRAW=true` env var is set
- [ ] HTML export includes interpretation content (not empty divs)

---

## THEN WHAT

Once this ships:

1. CC sets `ALLOW_FIXED_DRAW=true` in the test environment
2. Chris gives me the API endpoint URL
3. I call API with 16 different voice configs (same fixed draw)
4. I review outputs against target voice profiles
5. I tell you which configs to UPDATE in `voice_presets` table
6. Presets are locked
7. Flip `ALLOW_FIXED_DRAW=false` in prod

---

## PRIORITY

**API expansion is the blocker.** Can't test without it.

Supabase table can be created anytime but nice to have ready.

Admin Console tab is gravy.

Export bug fix is separate but should be knocked out.
