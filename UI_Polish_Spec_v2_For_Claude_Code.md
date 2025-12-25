# UI Polish Spec v2 for Claude Code

## Context

You're working on the Nirmanakaya Reader (`app/page.js`). This is a consciousness architecture reading tool built in Next.js/React, deployed on Vercel.

This is a large batch of UI/UX improvements. Work through them systematically. It's okay to do multiple commits.

---

## Changes to Implement

### 1. Dynamic Lens Explanation Update
Update the Dynamic Lens `?` popup explanation to:
> "Both the energy and where it's showing up emerge together — a complete snapshot of what's active right now."

---

### 2. Loading Phrases — Slow Down
Change the loading phrase cycle interval from 2.5s to **5s** between transitions.

---

### 3. Merge Correction into Same Card Box
The correction/action should be **inside** the same container as its parent signature, not a separate box below it. One unified container per signature that includes both the reading and its correction.

---

### 4. Extend Clickable Popups to ALL Invariant Terms
Ensure ALL framework terms in reading output are clickable with explanations:
- Card/Signature names
- Traditional names
- Channels (Intent, Cognition, Resonance, Structure)
- Houses (Gestalt, Spirit, Mind, Emotion, Body)
- Statuses (Balanced, Too Much, Too Little, Unacknowledged)
- Card types (Major Archetype, Bound, Agent)
- Functions (Seed, Medium, Fruition, Feedback)
- Roles (Initiate, Catalyst, Steward, Executor)

---

### 5. Add HTML Export Option
Add an HTML export alongside or replacing markdown export. The HTML should:
- Be self-contained (inline CSS)
- Match the app's dark theme styling
- Include all reading content (summary, signatures, corrections, letter)
- Look good when opened in any browser

---

### 6. Collapsible Signature Sections
- Signatures show **header only** by default (collapsed)
- Click/tap header to expand and show full content
- **Overview section stays expanded** by default
- Sections expand/collapse **independently** (opening one doesn't close others)

---

### 7. Nested Correction Display
- Correction is **visually indented** as a child of its parent signature
- Could be its own collapsible within the parent
- Should look like a sub-item, not a sibling

---

### 8. Update Spread Display Labels
Change display labels to match new terminology:
- "Single Random" → "Dynamic Lens • One"
- "Three Random" → "Dynamic Lens • Arc"
- "Five Random" → "Dynamic Lens • Five"
- And similar for Fixed Layout spreads

---

### 9. Update Status Popup Descriptions (Nowist Framing)
Update the status explanations with emotional/temporal language:

**Too Little:**
> "Too Little indicates past-anchoring: energy is withdrawn, held back, caught in what was rather than what is. Often shows up as regret, shame, or guilt keeping you from fully arriving in the present. The correction is the Vertical partner — the same archetypal identity at the other scale, which restores recursion and reconnects you to your complete capacity."

**Too Much:**
> "Too Much indicates future-projection: energy is pushed forward, grasping at what hasn't arrived. Often shows up as anxiety, fear, or the need to control outcomes. The correction is the Diagonal partner — the opposite pole that counterbalances the excess and rotates runaway momentum back into alignment."

**Unacknowledged:**
> "Unacknowledged is shadow operation: this energy is running but you can't see it. It's influencing behavior without consent or alignment. The correction is the Reduction pair — returning to the generating source to make the shadow visible."

---

### 10. Rename Stance Preset
- "Start Here" → **"Curious"**

Update in `STANCE_PRESETS` object — both key and display name.

---

### 11. Compact the Examples Section
Make the examples take less vertical space:
- Inline format or smaller text
- Less padding between items

---

### 12. Replace Example Assertions
Change these examples:
- "I'm going to leave this job." → **"I'm going to start a new project."**
- "I'm choosing to prioritize my health." → **"I'm going to stop worrying so much."**

---

### 13. Add Hint Below Examples
Add text below the examples:
> "The more detailed your entry, the more specific the response will be."

---

### 14. Rename "Cards" → "Signatures" Throughout
Global terminology change:
- "Card" → "Signature"
- "Three Card" → handled by #22
- "Card 1" → "Signature 1"
- Any references in labels, headers, popups, comments

---

### 15. Remove Pre-Reading "Show Traditional Names" Button
Delete the "Show Traditional Names" toggle from the pre-reading setup. Keep only the post-reading toggle.

---

### 16. Update Input Placeholder
Change placeholder to:
> "Name your question or declare your intent... or leave blank for a general reading"

---

### 17. Add Enter Key to Submit
Pressing Enter in the question/intention input field should start the reading. Keep the submit button too.

---

### 18. Add `?` Explainer for Expansion Buttons
Add a `?` icon next to the Unpack/Clarify/Architecture/Example buttons with popup:
> "Ways to explore further:
> - **Unpack** — Go deeper on the layers and nuances
> - **Clarify** — Simplify to the core point
> - **Architecture** — Show the structural math behind this
> - **Example** — Give a real-world scenario"

---

### 19. Add `?` Explainer for Bottom Action Buttons
Add a `?` icon next to Share/Export/Trad./Arch./New buttons with popup:
> - **Share** — Copy link to this reading
> - **Export** — Download as HTML file
> - **Trad.** — Toggle traditional tarot names
> - **Arch.** — Show architectural details
> - **New** — Start a fresh reading

---

### 20. Rename "Three Card" → "Arc"
Change the spread name from "Three Card" to **"Arc"**

Also verify/update the API prompt to include frame context:
- Position 1: Situation (what is)
- Position 2: Movement (what's in motion)
- Position 3: Integration (what completes)

These frame names should be passed to the AI for interpretation.

---

### 21. Rename "Four Aspects" → "Quadraverse"
Change the spread name from "Four Aspects" to **"Quadraverse"**

---

### 22. Center Question/Intention Display Box
After reading is generated, the box showing the user's question/intention should have equal indent on both sides — centered, not left-aligned.

---

### 23. Add `?` Explainer Next to Input Box
Add a `?` icon near the question/intention input with popup:
> "Ask about anything — relationships, work, decisions, direction. Or declare an action you're taking and see how it lands. The more specific you are, the more specific the reading will be."

---

### 24. Highlight Follow-Up Input
Make the follow-up question input more visible. Add `?` explainer:
> "Ask anything — dig deeper, challenge it, ask about a specific part, or take the conversation wherever you need."

---

### 25. Verify Frame Names in API Prompts
For Fixed Layout spreads, ensure the frame names/meanings are included in the API prompt so the AI interprets each position correctly:
- **Arc:** Situation → Movement → Integration
- **Quadraverse:** (whatever the four frames are)
- **Five Houses:** Gestalt, Spirit, Mind, Emotion, Body

---

### 26. Version Bump
After all changes, bump version to **v0.23 alpha • mirror & forge polish**

---

## Implementation Notes

### For Collapsible Sections
```javascript
// Suggested approach
const [expandedSections, setExpandedSections] = useState({ overview: true });

const toggleSection = (id) => {
  setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
};
```

### For HTML Export
```javascript
const exportHTML = () => {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Nirmanakaya Reading</title>
  <style>
    /* Inline dark theme CSS */
    body { background: #18181b; color: #e4e4e7; font-family: system-ui; padding: 2rem; }
    /* ... more styles ... */
  </style>
</head>
<body>
  ${buildReadingHTML()}
</body>
</html>`;
  // Download logic
};
```

### For Enter Key Submit
```javascript
onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
```

---

## After Implementation

Commit and push:
```bash
git add .
git commit -m "v0.23: UI polish - signatures, accordion, HTML export, terminology"
git push
```

---

## Testing Checklist

- [ ] Dynamic Lens explanation updated
- [ ] Loading phrases cycle at 5s
- [ ] Corrections nested inside signature boxes
- [ ] All invariant terms clickable
- [ ] HTML export works and looks good
- [ ] Sections collapsible, Overview expanded by default
- [ ] Corrections indented as children
- [ ] Spread labels updated throughout
- [ ] Status descriptions have Nowist language
- [ ] "Curious" replaces "Start Here"
- [ ] Examples section compact
- [ ] New example assertions in place
- [ ] Hint text below examples
- [ ] "Signatures" replaces "cards"
- [ ] Pre-reading Traditional Names button removed
- [ ] Placeholder includes "leave blank" option
- [ ] Enter key submits
- [ ] All `?` explainers working
- [ ] "Arc" replaces "Three Card"
- [ ] "Quadraverse" replaces "Four Aspects"
- [ ] Question box centered
- [ ] Follow-up input highlighted
- [ ] API prompts include frame context
- [ ] Works on mobile

---

## Questions?

Ask me if you need framework clarification or want to adjust any of these.
