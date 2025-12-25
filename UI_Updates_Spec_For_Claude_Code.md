# UI Updates Spec for Claude Code

## Context

You're working on the Nirmanakaya Reader (`app/page.js`). This is a consciousness architecture reading tool built in Next.js/React, deployed on Vercel.

These are a batch of UI/UX improvements to make the interface clearer for newcomers.

---

## Changes to Implement

### 1. Rename Spread Type Buttons

**Find and replace:**
- `Random Positions` → `Dynamic Lens`
- `Durable Spreads` → `Fixed Layout`

**Add `?` icon buttons** next to each with tap-to-reveal explanations (modal or popover that works on mobile — no hover tooltips):

- **Dynamic Lens (?):** "Both the energy and where it's showing up are randomly drawn — a complete snapshot of what's active right now."
- **Fixed Layout (?):** "The energy is random, but it lands in specific life areas you choose — like your five houses or a relationship spread."

---

### 2. Add Stance Section Header

Above the stance preset buttons (Start Here, Quick Answer, etc.), add:

**Header text:** `How should this land?`

**Add `?` icon** with tap-to-reveal explanation:

- "Stance shapes the voice and depth of your reading — from quick and direct to layered and contemplative. The structure stays the same; the delivery adapts to you."

---

### 3. Rename Stance Preset

**Find and replace:**
- `Crisis Mode` → `Grounded`

This is in the `STANCE_PRESETS` object. Update both the key name and display name.

---

### 4. Update Intro Text

Find the intro paragraph at the top of the page. Replace with:

```
The Nirmanakaya is both mirror and forge. Bring a question or declare an intention — the draw finds what's ready to be seen. Where you are, what's moving, what might need attention.
```

---

### 5. Update Examples Section

**Rename header:**
- `EXAMPLE QUESTIONS` → `EXAMPLES`

**Replace example list with mix of questions and assertions:**

```
"What do I need to see about this relationship?"
"Where am I stuck in my work right now?"
"I'm going to leave this job."
"What's asking for my attention today?"
"I'm choosing to prioritize my health."
"Am I on the right path with this decision?"
```

---

### 6. Update Question Input Placeholder

Find the input field where users enter their question.

**Update placeholder text to:**
```
Name your question or declare your intent...
```

If there's a label above it that says "Your Question" or similar, update to:
```
Your Question or Intention
```

---

### 7. Loading State Cycling Phrases

During reading generation (while `loading` is true), display cycling affirmations that fade in/out every 2-3 seconds.

**Phrases to cycle through:**

```javascript
const LOADING_PHRASES = [
  "You are a creator and consumer.",
  "The map is both mirror and forge.",
  "Polarity and recursion are the beating heart of consciousness.",
  "Your authentic presence in the now expands reality.",
  "The structure is the authority.",
  "Encounter precedes understanding.",
  "The draw finds what's ready to be seen.",
  "Correction enables purpose."
];
```

**Implementation notes:**
- Use `useState` and `useEffect` with `setInterval` to cycle through
- Fade transition between phrases (CSS opacity transition)
- Clear interval when loading completes
- Display in place of or alongside the loading spinner

---

## Styling Notes

- Match existing dark theme (zinc-700, zinc-800, zinc-900 backgrounds)
- `?` icons should be subtle (small, zinc-500 or zinc-600) but tappable
- Modal/popover for `?` explanations should be dismissible by tapping outside
- Loading phrases should have subtle fade animation (opacity 0 → 1 → 0)

---

## Files to Update

- `app/page.js` — all changes are in this file

---

## After Implementation

Commit and push:
```bash
git add .
git commit -m "UI improvements: clearer labels, stance header, mirror/forge intro, loading phrases"
git push
```

---

## Testing Checklist

- [ ] Spread type buttons show new names
- [ ] `?` icons appear and are tappable on mobile
- [ ] `?` explanations display correctly and dismiss properly
- [ ] "How should this land?" header appears above stance buttons
- [ ] "Grounded" replaces "Crisis Mode"
- [ ] New intro text displays correctly
- [ ] Examples section shows mix of questions and assertions
- [ ] Input placeholder shows new text
- [ ] Loading phrases cycle during reading generation
- [ ] Fade transitions work smoothly
- [ ] All changes work on mobile

---

## Questions?

Ask me if you need clarification on any of these changes.
