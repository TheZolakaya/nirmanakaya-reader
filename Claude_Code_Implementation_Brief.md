# Nirmanakaya Reader Implementation Brief
## For Claude Code — December 21, 2025

---

## Repository

**GitHub Production:** `github.com/TheZolakaya/nirmanakaya-reader`
**GitHub Beta:** `github.com/TheZolakaya/nirmanakaya-reader-beta`
**Main file:** `app/page.js`
**API endpoint:** `app/api/reading/route.js`
**Production URL:** `reader.nirmanakaya.com`
**Beta URL:** `beta.nirmanakaya.com`

---

## Deployment Workflow (CRITICAL — READ FIRST)

⚠️ **STOP: DO NOT push to both repos simultaneously** ⚠️

The current setup has been pushing to beta AND production at the same time. This is wrong.

**CORRECT workflow:**

```
LOCAL → BETA only → [Test] → PRODUCTION only (separate step)
```

### Step 1: Push to Beta ONLY
```bash
cd D:\NKYAWebApp\nirmanakaya-reader-beta
git add .
git commit -m "v0.13.0 'Complexity' - Add Complexity selector"
git push
```
- Vercel auto-deploys to `beta.nirmanakaya.com`
- **STOP HERE. Do not touch production repo yet.**

### Step 2: Test on Beta
- Go to `beta.nirmanakaya.com`
- Test the new feature thoroughly
- Get Chris's approval before proceeding

### Step 3: Promote to Production (SEPARATE STEP)
Only after beta is approved:
```bash
# Copy the file
cp "D:\NKYAWebApp\nirmanakaya-reader-beta\app\page.js" "D:\NKYAWebApp\nirmanakaya-reader\app\page.js"

# Push to production
cd D:\NKYAWebApp\nirmanakaya-reader
git add .
git commit -m "v0.13.0 'Complexity' - Add Complexity selector (promoted from beta)"
git push
```

### ❌ WRONG (what's happening now):
```bash
# DON'T DO THIS - pushing both at once
cp beta/page.js production/page.js && cd production && git push
```

### ✅ CORRECT:
1. Push to beta
2. Wait for testing
3. Only push to production when told to promote

### Version Update (REQUIRED for every push)

Every push MUST include an in-app version update with a **name**:

1. Find the version constant in `app/page.js` (likely near top of file)
2. Increment appropriately:
   - Bug fixes: `0.12.1` → `0.12.2`
   - Features: `0.12.2` → `0.13.0`
   - Major changes: `0.13.0` → `1.0.0`
3. **Add a version name** based on the key feature or fix
4. Version AND name should be visible in the UI (footer, settings, or about)

Example:
```javascript
const APP_VERSION = "0.13.0";
const VERSION_NAME = "Complexity"; // Key feature of this release

// Or combined:
const VERSION = {
  number: "0.13.0",
  name: "Complexity"
};
```

**Display in UI:**
```
v0.13.0 "Complexity"
```

### Version Naming Convention

Name versions after the primary change:

| Version | Name | What Changed |
|---------|------|--------------|
| 0.13.0 | "Complexity" | Added Complexity selector |
| 0.13.1 | "Mobile Fix" | Fixed mobile input button |
| 0.14.0 | "Path to Balance" | Added Rebalancer Summary |
| 0.15.0 | "Hints" | Added UI hints throughout |

Keep names short (1-2 words), memorable, and descriptive.

### Commit Messages

Use clear commit messages with version and name:
- `v0.13.0 "Complexity" - Add Complexity selector ("Speak to me like...")`
- `v0.13.1 "Mobile Fix" - Fix mobile input button visibility`
- `v0.14.0 "Path to Balance" - Add Rebalancer Summary feature`

---

## Tasks (Priority Order)

### 1. BUG FIX: Mobile Input Submit Button Off-Screen

**Problem:** In the "Continue the Conversation" input field, when user starts typing on mobile, the submit button (arrow →) scrolls off the right edge of the screen.

**Expected:** Submit button should remain visible and accessible while typing on mobile.

**Likely fix:** Check the input container's CSS — may need `flex-shrink: 0` on the button, or adjust the input's `flex` behavior, or use `max-width: calc(100% - button-width)` on the input field.

---

### 2. FEATURE: Complexity Selector ("Speak to me like...")

**Purpose:** Add a fifth meta-dimension that controls the sophistication/register of language output, independent of the existing Stance System.

**The existing Stance System (4 dimensions × 4 options = 256 configs):**
- Voice: Wonder / Warm / Direct / Grounded
- Focus: Do / Feel / See / Build  
- Density: Luminous / Rich / Clear / Essential
- Scope: Resonant / Patterned / Connected / Here

**New Complexity dimension (5 options):**

| Level | Label | Hint |
|-------|-------|------|
| 1 | **A Friend** | "Short words, short sentences. No jargon." |
| 2 | **A Guide** | "Warm and clear. Like someone walking with you." |
| 3 | **A Teacher** | "Structured and educational. Terms explained." |
| 4 | **A Mentor** | "Philosophical depth. Wisdom, not just info." |
| 5 | **A Master** | "Full transmission. Nothing simplified." |

**UI Specification:**

```
┌─────────────────────────────────────────────────────────────┐
│ Speak to me like...                                         │
│                                                             │
│ ○ A Friend    ○ A Guide    ● A Teacher    ○ A Mentor    ○ A Master
│   Short words,  Warm and      Structured    Philosophical   Full
│   short         clear. Like   and edu-      depth. Wisdom,  transmission.
│   sentences.    someone       cational.     not just info.  Nothing
│   No jargon.    walking       Terms                         simplified.
│                 with you.     explained.                              
├─────────────────────────────────────────────────────────────┤
│ [Existing Stance Grid below]                                │
│ Voice:   [ Wonder ] [ Warm ] [ Direct ] [ Grounded ]        │
│ Focus:   [ Do ] [ Feel ] [ See ] [ Build ]                  │
│ Density: [ Luminous ] [ Rich ] [ Clear ] [ Essential ]      │
│ Scope:   [ Resonant ] [ Patterned ] [ Connected ] [ Here ]  │
└─────────────────────────────────────────────────────────────┘
```

**Key UI details:**
- Radio buttons (only one selection)
- Hints always visible below each option (smaller text, muted color)
- Default selection: **A Teacher** (middle option)
- Place ABOVE the stance grid (it's the meta-layer)
- Mobile: can stack or wrap, but keep hints visible

**Row labels for Stance dimensions (add if not present):**
| Dimension | Label |
|-----------|-------|
| Voice | "How should this land?" |
| Focus | "What matters most?" |
| Density | "How much do you want?" |
| Scope | "How wide should we look?" |

**Stance dimension hints (for hover/tooltip):**

Voice:
- Wonder: "Curious, open, exploratory."
- Warm: "Supportive, caring, held."
- Direct: "Clear, straightforward, no fluff."
- Grounded: "Practical, solid, real-world."

Focus:
- Do: "What action should I take?"
- Feel: "What does this mean emotionally?"
- See: "Help me understand the pattern."
- Build: "Give me something concrete to work with."

Density:
- Luminous: "Full exploration. Every angle."
- Rich: "Thorough but not exhaustive."
- Clear: "Just what I need. Well-organized."
- Essential: "Core truth only. Minimal."

Scope:
- Resonant: "The deepest pattern showing up now."
- Patterned: "Recurring themes in play."
- Connected: "How this links to what's around it."
- Here: "Just this moment. Nothing else."

**Prompt Modifier Implementation:**

Add to the prompt building:

```javascript
const COMPLEXITY_MODIFIERS = {
  friend: `
Use the simplest words possible. Sentences of 5-7 words max.
One-syllable words when possible. No jargon EVER. No metaphors.
No qualifiers like "perhaps" or "somewhat." Direct "you" language.
Almost blunt. Like texting a busy friend.
`,
  
  guide: `
Use everyday language with occasional richer vocabulary.
Sentences under 15 words. Connect to feelings and lived experience.
Light on terminology — if you use a term, explain it simply.
Write like a supportive friend who understands this deeply.
`,
  
  teacher: `
Use structured, educational language. Sentences can be complex 
but parseable on first read. Introduce terminology with context.
Organize logically. Write like a skilled teacher: precise but accessible.
Balance concept with example.
`,
  
  mentor: `
Philosophical depth welcome. Complex sentences permitted.
Draw on broader meaning and purpose. Use full terminology confidently.
Allow contemplative space. Write like a mentor speaking to someone 
ready for depth. Connect to larger patterns.
`,
  
  master: `
Full technical density. Nothing simplified. Nothing withheld.
Use precise terminology throughout. Include structural details,
mathematical relationships, position numbers, duality paths.
Write as one master to another. Assume framework familiarity.
`
};

const buildFullPrompt = (complexity, voice, focus, density, scope) => {
  return `
${COMPLEXITY_MODIFIERS[complexity]}

${VOICE_MODIFIERS[voice]}
${FOCUS_MODIFIERS[focus]}
${DENSITY_MODIFIERS[density]}
${SCOPE_MODIFIERS[scope]}
`;
};
```

**Relationship to Density:**
- Density = VOLUME (how much content)
- Complexity = REGISTER (how sophisticated the expression)

These are orthogonal:
- Friend + Essential = very brief, very plain
- Friend + Luminous = lots of content, all plain language
- Master + Essential = brief but technically dense
- Master + Luminous = full transmission, nothing held back

**Update presets:**

| Preset | Complexity | Voice | Focus | Density | Scope |
|--------|------------|-------|-------|---------|-------|
| Start Here | Teacher | Wonder | See | Clear | Here |
| Quick Answer | Friend | Direct | Do | Essential | Here |
| Deep Dive | Mentor | Warm | Feel | Rich | Resonant |
| Just the Facts | Teacher | Direct | See | Clear | Here |

**Remove:** The current "Simplicity" button (Complexity replaces it entirely)

---

### 3. FEATURE: Rebalancer Summary

**Purpose:** When 2+ cards are imbalanced, add a synthesis section that interprets the corrections AS A WHOLE and provides unified next steps.

**Placement:** Between the individual card signatures and the Letter.

**Conditional:** Only appears when 2+ cards are imbalanced (any status other than Balanced).

**UI Structure:**

```
┌─────────────────────────────────────────────────────────────────┐
│ ◈ PATH TO BALANCE                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ THE PATTERN                                                     │
│ [One sentence: what the corrections have in common]             │
│                                                                 │
│ THE PATH                                                        │
│ [2-3 sentences: what the corrections together are asking]       │
│                                                                 │
│ NEXT STEPS                                                      │
│ • [Action derived from Rebalancer 1]                           │
│ • [Action derived from Rebalancer 2]                           │
│ • [Action derived from Rebalancer 3]                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Styling:**
```css
.rebalancer-summary {
  background: linear-gradient(to bottom right, rgba(6, 78, 59, 0.3), rgba(16, 185, 129, 0.15));
  border: 2px solid rgba(16, 185, 129, 0.6);
  border-radius: 0.75rem;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}
```

Use similar badge/header styling to individual rebalancers but slightly larger/more prominent.

**Prompt addition:**

Add to the reading prompt when generating output:

```
If 2 or more cards are imbalanced, after the individual card interpretations,
generate a [REBALANCER_SUMMARY] section with:
- THE PATTERN: One sentence identifying what the corrections have in common
  (e.g., "All corrections point to Structure channel" or "All three are Unacknowledged")
- THE PATH: 2-3 sentences synthesizing the unified message
- NEXT STEPS: One concrete action per correction, as bullet points

Focus on ACTION over understanding. Tell the querent what to DO.
```

**Output parsing:**

Add parsing for `[REBALANCER_SUMMARY]` section similar to existing `[SUMMARY]`, `[CARD:N]`, `[LETTER]` parsing.

---

### 4. ENHANCEMENT: Five Loading Phrases

**Purpose:** Display rotating/random phrases during reading generation. Should have exactly 5 phrases.

**Suggested phrases:**

```javascript
const LOADING_PHRASES = [
  "Consulting the architecture...",
  "Drawing from the field...",
  "Patterns emerging...",
  "The structure speaks...",
  "Reading the geometry..."
];
```

Or more poetic options:
```javascript
const LOADING_PHRASES = [
  "Listening to the silence between...",
  "Letting patterns surface...",
  "The cards are speaking...",
  "Finding your thread...",
  "Geometry in motion..."
];
```

**Implementation:** Random selection or sequential rotation through all 5 during longer loads.

---

## Testing Checklist

After implementation, verify:

### Bug Fix
- [ ] Mobile: Submit button visible while typing in "Continue the Conversation"
- [ ] Test on iPhone Safari, Android Chrome

### Complexity
- [ ] All 5 levels produce noticeably different output register
- [ ] "A Friend" output uses very short sentences, simple words
- [ ] "A Master" output includes technical terminology, position numbers
- [ ] Complexity × Density produces expected combinations
- [ ] Default is "A Teacher"
- [ ] Hints visible on all options
- [ ] Mobile layout works

### Rebalancer Summary
- [ ] Only appears with 2+ imbalanced cards
- [ ] Does NOT appear with 0-1 imbalanced cards
- [ ] Pattern identification is accurate
- [ ] Next steps are actionable (verbs, not concepts)
- [ ] Styling matches design system

### Loading Phrases
- [ ] Exactly 5 phrases available
- [ ] Phrases rotate/randomize during load

---

## Files to Modify

1. `app/page.js` — Main UI component
   - Add Complexity selector UI
   - Add hints to Stance selectors
   - Add row labels to Stance dimensions
   - Add Rebalancer Summary section
   - Fix mobile input button
   - Update loading phrases

2. `app/api/reading/route.js` — API endpoint
   - Add COMPLEXITY_MODIFIERS
   - Update buildFullPrompt to include complexity
   - Add REBALANCER_SUMMARY parsing

---

## Notes

- The Complexity selector is the "fifth element" — a meta-layer above the 4-dimension Stance grid
- Remove any existing "Simplicity" toggle/button — Complexity replaces it
- Complexity + Stance creates 5 × 256 = 1,280 unique delivery modes
- The Rebalancer Summary is about ACTION, not understanding — keep next steps concrete

---

*Implementation brief created December 21, 2025*
