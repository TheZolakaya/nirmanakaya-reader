# Nirmanakaya Reader - Image Generation Spec

## Style Guide

All images should maintain visual consistency with the existing card artwork:
- **Art style**: Art nouveau / mystical illustration (like the Celebration card shown - warm, organic, flowing)
- **Color palette**: Rich, saturated colors with golden accents
- **Mood**: Contemplative, consciousness-focused, elegant but not sterile
- **Frame**: Optional decorative border for hero images (matching card frames)
- **Background**: Can be transparent for icons, or contextual for heroes

---

## Size Specifications

| Size | Dimensions | Format | Use Case |
|------|------------|--------|----------|
| **Hero** | 400×400 px | PNG | Main image in modals/popups |
| **Icon** | 48×48 px | PNG (transparent bg) | Inline badges, data points |
| **Thumb** | 120×120 px | PNG | Grid displays (optional) |

---

## PART 1: STRUCTURAL ELEMENTS (Need Hero + Icon)

These appear both as standalone concepts AND as inline data points on cards.

### Houses (5 items)

| Slug | Name | Hero | Icon | Description |
|------|------|------|------|-------------|
| `gestalt-house` | Gestalt House | 400×400 | 48×48 | The Soul domain. Self-governing observer. Ring 2. Colors: Deep purple/violet with golden light. Symbol: An eye within a spiral, or a figure observing itself. The watcher and the watched unified. |
| `spirit-house` | Spirit House | 400×400 | 48×48 | Domain of aspiration and witness. Ring 6. Colors: Brilliant white/silver with flame accents. Symbol: A star or flame reaching upward, luminous and aspirational. Fire element feeling. |
| `mind-house` | Mind House | 400×400 | 48×48 | Domain of cognition and pattern. Ring 5. Colors: Clear sky blue with geometric patterns. Symbol: A crystalline structure or sacred geometry, air element. Mental clarity. |
| `emotion-house` | Emotion House | 400×400 | 48×48 | Domain of feeling and choice. Ring 4. Colors: Deep oceanic blue-green with flowing forms. Symbol: Waves, cups, or flowing water. Heart-centered, relational. |
| `body-house` | Body House | 400×400 | 48×48 | Domain of form and embodiment. Ring 3. Colors: Rich earth tones - amber, green, brown. Symbol: Mountain, tree, or rooted form. Solid, grounded, stable. |

### Channels (4 items)

| Slug | Name | Hero | Icon | Description |
|------|------|------|------|-------------|
| `intent` | Intent | 400×400 | 48×48 | Channel of directed will (Fire/Wands). Colors: Vibrant orange-red flames with golden sparks. Symbol: A wand or torch blazing with purpose. Dynamic, propulsive energy. Action-oriented. |
| `cognition` | Cognition | 400×400 | 48×48 | Channel of discernment (Air/Swords). Colors: Silver, white, pale blue - crisp and clear. Symbol: A sword or blade of light cutting through fog. Sharp, precise, differentiation. |
| `resonance` | Resonance | 400×400 | 48×48 | Channel of connection (Water/Cups). Colors: Deep blues, teals, aquamarine with iridescence. Symbol: A chalice or cup with water reflecting light. Emotional attunement, flow. |
| `structure` | Structure | 400×400 | 48×48 | Channel of manifestation (Earth/Pentacles). Colors: Rich browns, gold, deep greens. Symbol: A pentacle or coin emerging from earth. Solid, material, embodied. |

### Statuses (4 items)

| Slug | Name | Hero | Icon | Description |
|------|------|------|------|-------------|
| `balanced` | Balanced | 400×400 | 48×48 | Present-aligned, creating at Ring 5 (Now). Colors: Harmonious gold with soft white light. Symbol: A figure standing centered in a mandala, scales in perfect equilibrium, or a still point with ripples. Serene, aligned, present. |
| `too-much` | Too Much | 400×400 | 48×48 | Future-projected, anxiety-forms. Colors: Hot red-orange, urgent, over-saturated. Symbol: A figure reaching too far forward, grasping, flames burning too bright, or scales tipping forward. Tension, excess, pushing. |
| `too-little` | Too Little | 400×400 | 48×48 | Past-anchored, regret-forms. Colors: Muted, faded, grey-blue desaturated tones. Symbol: A figure pulling back, shrinking, or scales tipping backward. Withdrawal, inhibition, holding back. |
| `unacknowledged` | Unacknowledged | 400×400 | 48×48 | Shadow-forms, operating without consent. Colors: Deep shadow with hidden glimmers, purple-black. Symbol: A figure with its shadow acting independently, or something half-visible in darkness. What's unseen but active. |

### Process Stages (4 items)

| Slug | Name | Hero | Icon | Description |
|------|------|------|------|-------------|
| `seed` | Seed | 400×400 | 48×48 | Initiates the cycle. Pure Yang. Spring. Colors: Fresh greens, morning light, new growth. Symbol: A seed cracking open, a sprout emerging, the first spark. Beginning energy, potential activating. |
| `medium` | Medium | 400×400 | 48×48 | Develops and sustains. Yin-in-Yang. Summer. Colors: Full, lush greens and golds, peak vitality. Symbol: A plant in full growth, sustained work, the held breath at its deepest. Carrying forward. |
| `fruition` | Fruition | 400×400 | 48×48 | Completes the expression. Pure Yin. Autumn. Colors: Rich harvest tones - amber, orange, deep red. Symbol: Ripe fruit, full harvest, the exhale complete. Achievement, manifestation. |
| `feedback` | Feedback | 400×400 | 48×48 | Integrates and returns. Yang-in-Yin. Winter. Colors: Cool blues, silver, quiet contemplation. Symbol: Seeds falling back to earth, a spiral returning to center, reflection. Learning, closure, preparation for new cycle. |

### Roles (4 items)

| Slug | Name | Hero | Icon | Description |
|------|------|------|------|-------------|
| `initiate` | Initiate | 400×400 | 48×48 | Learning the function (Page). Spirit House. Colors: Soft, innocent, aspirational - pale golds and whites. Symbol: A young figure studying, reaching toward light, beginning a journey. Curiosity, openness, learning. |
| `catalyst` | Catalyst | 400×400 | 48×48 | Activating the function (Knight). Mind House. Colors: Dynamic, electric - silver and blue with motion blur. Symbol: A figure in rapid movement, charging forward, creating change. Speed, activation, force. |
| `steward` | Steward | 400×400 | 48×48 | Nurturing the function (Queen). Emotion House. Colors: Warm, receptive - deep blues and soft golds. Symbol: A figure holding space, tending a garden or hearth. Care, sustenance, emotional wisdom. |
| `executor` | Executor | 400×400 | 48×48 | Mastering the function (King). Body House. Colors: Solid, authoritative - deep golds and earth tones. Symbol: A figure seated in power, fully embodied, commanding through presence. Mastery, completion, embodiment. |

### Rings (8 items)

| Slug | Name | Hero | Icon | Description |
|------|------|------|------|-------------|
| `ring-0` | Ring 0 | 400×400 | 48×48 | Source/Origin. The original creative act. Colors: Brilliant white light emerging from void. Symbol: A single point of light in infinite darkness, or the moment of cosmic creation. Pure origin. |
| `ring-1` | Ring 1 | 400×400 | 48×48 | Ingress portal boundary. Colors: Golden threshold light. Symbol: A doorway or membrane with light passing through. The boundary where potential enters. |
| `ring-2` | Ring 2 | 400×400 | 48×48 | Identity / Gestalt House. Soul coherence. Colors: Deep violet with self-referential patterns. Symbol: A figure aware of itself, recursive loops. The observer recognizing itself. |
| `ring-3` | Ring 3 | 400×400 | 48×48 | Foundation / Body House. Embodied structure. Colors: Earth tones, solid forms. Symbol: A foundation being laid, structure taking form. Where things become real. |
| `ring-4` | Ring 4 | 400×400 | 48×48 | Resonance / Emotion House. Felt connection. Colors: Ocean blues, flowing connections. Symbol: Two forms connected by flowing energy. Relational attunement. |
| `ring-5` | Ring 5 | 400×400 | 48×48 | Agency / Mind House. WHERE CREATION HAPPENS. The Now. Colors: Bright, vivid, ALIVE - gold and clear light. Symbol: A figure actively creating, hands shaping reality. The present moment in action. Most important ring. |
| `ring-6` | Ring 6 | 400×400 | 48×48 | Direction / Spirit House. Where creation points before manifestation. Colors: Starlight, aspirational silver-white. Symbol: An arrow or ray pointing toward possibility. Setting course. |
| `ring-7` | Ring 7 | 400×400 | 48×48 | Egress / Un-Now. Residue beyond recursive reach. Colors: Dim, distant, not-dark but not-present - grey-violet haze. Symbol: Forms drifting at the edge, not lost but not here. Retrievable through conscious return. |

---

## PART 2: CARD TYPE CONCEPTS (Hero only)

These explain what different card categories mean.

| Slug | Name | Size | Description |
|------|------|------|-------------|
| `archetype` | Archetype | 400×400 | The 22 major patterns of consciousness. Colors: Royal purple and gold. Symbol: A grand figure or symbol representing a fundamental pattern - like a constellation or archetypal form. Primary, foundational. |
| `inner-archetype` | Inner Archetype | 400×400 | Archetypes 0-9. What you cultivate internally. Colors: Warm interior light, introspective. Symbol: A figure in meditation or inner work, capacities forming within. Building, preparing. |
| `outer-archetype` | Outer Archetype | 400×400 | Archetypes 11-20. What emerges through engagement. Colors: Dynamic outward energy, expressive. Symbol: A figure in action, engaging with the world. Transformation through encounter. |
| `ingress-portal` | Ingress Portal | 400×400 | Source (10). The entry point. Colors: Golden light streaming inward. Symbol: A gateway with light/energy entering, the threshold of arrival. What's coming in. |
| `egress-portal` | Egress Portal | 400×400 | Creation (21). The completion point. Colors: Rainbow light streaming outward. Symbol: A gateway with completed forms departing, the threshold of release. What's fully realized. |
| `bound` | Bound | 400×400 | The 40 parametric cards. Range of archetypal expression. Colors: Spectrum showing range. Symbol: A scale or gradient showing capacity at different levels. Parameters of expression. |
| `inner-bound` | Inner Bound | 400×400 | Bounds 1-5 (Ace-5). Capacity at rest. The inhale. Colors: Soft, potential, coiled. Symbol: A spring coiled, breath held, energy gathering. What's forming, not yet expressed. |
| `outer-bound` | Outer Bound | 400×400 | Bounds 6-10. Capacity expressed. The exhale. Colors: Released, dynamic, manifest. Symbol: A spring released, breath exhaled, energy extending. What's expressing, moving into form. |
| `agent` | Agent | 400×400 | The 16 behavioral personas (Court cards). Colors: Four distinct quadrants for each role. Symbol: Four figures representing the roles - Initiate, Catalyst, Steward, Executor. Lived expression. |
| `transient` | Transient | 400×400 | The identity of a drawn card - what it IS. Colors: Clear, defined, named. Symbol: A card face showing its identity. The "what" before the "how." |
| `signature` | Signature | 400×400 | Complete card identity: Transient + Status. Colors: Combined elements. Symbol: A card with both identity and expression state visible. "Too Little Equity" as a complete unit. |

---

## PART 3: RELATIONSHIPS & CORRECTIONS (Hero only)

| Slug | Name | Size | Description |
|------|------|------|-------------|
| `vertical-partner` | Vertical Partner | 400×400 | Sum to 20. Same node, different phases. Path home for Too Little. Colors: Two forms connected by vertical line. Symbol: Two archetypes mirroring across Creation/Operation boundary. Same essence, different expression. |
| `diagonal-partner` | Diagonal Partner | 400×400 | Sum to 19 or 21. Creative tension within House. Path home for Too Much. Colors: Two forms in dynamic diagonal tension. Symbol: Two archetypes pulling against each other constructively. Counter-balance. |
| `reduction-partner` | Reduction Partner | 400×400 | Same digital root. Cross-House shadow illumination. Path home for Unacknowledged. Colors: Distant connection across void. Symbol: Two archetypes at maximum distance, connected by hidden thread. The farthest mirror. |
| `correction` | Correction | 400×400 | The path back to balance. Colors: Movement from displaced to centered. Symbol: An arrow or path leading from edge back to center. Geometry, not opinion. |
| `rebalancer` | Rebalancer | 400×400 | The correction pathway for imbalanced cards. Colors: Three paths converging to center. Symbol: Three different routes (diagonal, vertical, reduction) all leading home. |
| `duality` | Duality | 400×400 | Partnership relationships built into architecture. Colors: Complementary pairs. Symbol: Two forms in relationship, showing the three types of duality. |
| `transpose-pair` | Transpose Pair | 400×400 | Lateral growth for Balanced cards. Colors: Mirror reflection horizontally. Symbol: Two forms reflecting across a vertical axis. Growth through lateral extension. |
| `polarity-anchor` | Polarity Anchor | 400×400 | Vertical growth for pure expressions. Colors: Elemental opposition. Symbol: Fire and Water, Air and Earth in creative tension. Integration through opposition. |
| `growth-opportunity` | Growth Opportunity | 400×400 | What Balanced cards can extend toward. Colors: Expanding outward. Symbol: A centered form with paths extending in multiple directions. Balance as launchpad. |

---

## PART 4: FRAMEWORK CONCEPTS (Hero only)

| Slug | Name | Size | Description |
|------|------|------|-------------|
| `nirmanakaya` | Nirmanakaya | 400×400 | The complete framework. "Emanation body" - how consciousness appears. Colors: Full spectrum, cosmic, complete. Symbol: The entire architecture as a mandala or cosmic diagram. Everything unified. |
| `the-78-signatures` | The 78 Signatures | 400×400 | Complete alphabet of consciousness. Colors: 78 distinct elements arranged in pattern. Symbol: All cards arranged showing Archetypes, Bounds, Agents as one system. The full deck. |
| `the-law` | The Law | 400×400 | Law of Conscious Self-Creation. P-R alternation. Colors: Binary rhythm, alternating. Symbol: Polarity and Recursion interweaving - the fundamental pulse. |
| `law-of-conscious-self-creation` | Law of Conscious Self-Creation | 400×400 | Same as above - can reuse. Consciousness creates through P/R alternation. |
| `polarity` | Polarity | 400×400 | P - Differentiation. Yang operation. Colors: Separating, distinguishing, hot. Symbol: One becoming two, a split, boundaries forming. |
| `recursion` | Recursion | 400×400 | R - Integration. Yin operation. Self-reference. Colors: Unifying, cooling, returning. Symbol: Many becoming one, a spiral returning, self-referential loop. |
| `phi` | Phi | 400×400 | Golden ratio (~1.618). Mathematical signature of the Law. Colors: Golden spiral, natural proportion. Symbol: The golden spiral, nautilus shell, or Fibonacci visual. Mathematical beauty. |
| `fibonacci` | Fibonacci | 400×400 | The sequence converging to Phi. Colors: Growing sequence, natural progression. Symbol: 1,1,2,3,5,8,13,21 visualized as growing forms. Note: 21 = Creation. |
| `forty-fold-seal` | Forty-Fold Seal | 400×400 | 4×4 arrangement summing to 40. Mathematical validation. Colors: Geometric precision, satisfying completion. Symbol: A 4×4 grid with visible mathematical harmony. The receipt. |
| `the-three-seals` | The Three Seals | 400×400 | Three nested validations. Colors: Three layers of proof. Symbol: Concentric seals showing 40-fold, 22-fold, and 10-fold validation. Self-checking system. |
| `tesseract` | Tesseract | 400×400 | 4D hypercube underlying architecture. Colors: Mind-bending geometry. Symbol: A tesseract projection showing maximum distances. Where reduction pairs sit. |
| `digital-root` | Digital Root | 400×400 | Single digit from repeated summing. Colors: Numbers collapsing to essence. Symbol: 19 → 10 → 1 visualized. The hidden connection. |

---

## PART 5: PHASES & PORTALS (Hero only)

| Slug | Name | Size | Description |
|------|------|------|-------------|
| `creation-phase` | Creation Phase | 400×400 | Steps 0-9. Building architecture. Before the Turn. Colors: Ascending, constructing. Symbol: Structure being built, foundations laid. Not yet operating. |
| `the-turn` | The Turn | 400×400 | Step 10 (Source). Pivot from creation to operation. Colors: The hinge point, pivoting. Symbol: A wheel turning, or a door swinging from building to using. |
| `operation-phase` | Operation Phase | 400×400 | Steps 11-21. Operating through architecture. After the Turn. Colors: Functioning, active. Symbol: The completed architecture in use, consciousness operating. |
| `ingress` | Ingress | 400×400 | Portal of reception (Source). Colors: Entering light. Symbol: Gateway with energy streaming in. |
| `egress` | Egress | 400×400 | Portal of contribution (Creation). Colors: Departing completion. Symbol: Gateway with completed forms streaming out. |
| `portal` | Portal | 400×400 | Threshold positions (Source & Creation). Colors: Liminal, threshold. Symbol: A doorway between states. Neither fully in nor out. |

---

## PART 6: ALIGNMENT & YIN-YANG (Hero only)

| Slug | Name | Size | Description |
|------|------|------|-------------|
| `forge` | Forge | 400×400 | Sun-aligned archetypes. Sum to 19. Creates, differentiates, exhales. Colors: Solar, active, outward. Symbol: A forge or sun radiating outward, making distinctions. Yang movement. |
| `mirror` | Mirror | 400×400 | World-aligned archetypes. Sum to 21. Receives, integrates, inhales. Colors: Lunar, receptive, inward. Symbol: A mirror or moon reflecting, drawing in. Yin movement. |
| `yang` | Yang | 400×400 | Differentiating, outward movement. Colors: Bright, expanding, hot. Symbol: The yang half of yin-yang, or outward arrows. Exhale of consciousness. |
| `yin` | Yin | 400×400 | Integrating, inward movement. Colors: Dark, contracting, cool. Symbol: The yin half of yin-yang, or inward arrows. Inhale of consciousness. |

---

## PART 7: PILLARS (Hero only)

| Slug | Name | Size | Description |
|------|------|------|-------------|
| `pillar-1` | Pillar 1: You Are Creating | 400×400 | First truth. Always creating. Colors: Active, generative. Symbol: Hands shaping light or form. You are creating right now. |
| `pillar-2` | Pillar 2: You Are the Creator | 400×400 | Second truth. Not just creating but a creator. Colors: Empowered, directional. Symbol: A figure aware of their creative agency. Authorship. |
| `pillar-3` | Pillar 3: Seven Pillars | 400×400 | Portal truth. Purpose flows through seven truths. Colors: Seven rays from Source. Symbol: Seven pillars or seven streams from one source. |
| `pillar-4` | Pillar 4: Authentic Creation | 400×400 | Spirit House pillar. Authentically yours. Colors: Genuine, original. Symbol: A unique flame or signature. Not borrowed patterns. |
| `pillar-5` | Pillar 5: Genuine Participation | 400×400 | Mind House pillar. Actually participating. Colors: Engaged, present. Symbol: Hands touching, not just observing. |
| `pillar-6` | Pillar 6: Unified Purpose | 400×400 | Emotion House pillar. Purpose unified with feeling. Colors: Heart and direction aligned. Symbol: Heart and arrow pointing same way. Not split. |
| `pillar-7` | Pillar 7: Present Moment Awareness | 400×400 | Body House pillar. Creation happens NOW. Colors: Vivid present, clear. Symbol: A figure fully here, no ghosts of past/future. |
| `seven-pillars` | Seven Pillars | 400×400 | All seven interdependent truths. Colors: Seven distinct but unified. Symbol: Seven pillars supporting one structure. |

---

## PART 8: KEY CONCEPTS (Hero only)

| Slug | Name | Size | Description |
|------|------|------|-------------|
| `now` | Now | 400×400 | Ring 5. Where conscious creation happens. Colors: Brilliant, alive, present. Symbol: A point of pure clarity, no shadows. This moment. |
| `un-now` | Un-Now | 400×400 | Ring 7. Where imbalanced creation accumulates. Colors: Dim, distant, hazy but not dark. Symbol: Forms at the edge, reachable but not present. Not punishment - just not-now. |
| `the-un-now` | The Un-Now | 400×400 | Same as above - can reuse. |
| `veil` | The Veil | 400×400 | Limit on awareness that preserves authenticity. Colors: Translucent, protective. Symbol: A soft veil or membrane allowing individuation. Gift, not barrier. |
| `veil-of-individuation` | Veil of Individuation | 400×400 | Same as above - can reuse. |
| `instant-return` | Instant Return | 400×400 | Return to Now is always instant. Colors: Immediate, no distance. Symbol: A snap back to center, instant reconnection. Always available. |
| `retrieval` | Retrieval | 400×400 | Structural path home from Ring 7. Colors: A path through fog. Symbol: A route leading back to clarity. Not punishment, just geometry. |
| `collapse-point` | Collapse Point | 400×400 | Present moment where possibilities become actualities. Colors: Quantum to classical. Symbol: Wave function collapsing to particle, potential to actual. |
| `return-to-now` | Return to Now | 400×400 | Practice of recognizing you're already present. Colors: Clarity dawning. Symbol: Eyes opening, recognition. You never actually left. |
| `nowism` | Nowism | 400×400 | Teaching that Now is only moment with write-access. Colors: Single point of power. Symbol: A pen or tool only working in present moment. |
| `nowism-pyramid` | Nowism Pyramid | 400×400 | One Balanced at top, three displaced at base. Colors: Pyramid structure. Symbol: Geometric pyramid with one apex (Balanced) and three base points (the imbalances). |
| `imbalance` | Imbalance | 400×400 | Any of the three displaced states. Colors: Off-center, tilted. Symbol: A form that's not quite aligned. Mispronunciation, not wrongness. |
| `reading` | Reading | 400×400 | Focused conversation with the architecture. Colors: Reflective, inquiring. Symbol: Cards spread with light of inquiry. Receiving location, not prediction. |
| `realitycraft` | Realitycraft | 400×400 | Practice of conscious creation using the framework. Colors: Artisan, intentional. Symbol: Hands shaping reality with the map. Applied awareness. |
| `the-one-thing-happening` | The One Thing Happening | 400×400 | Unity beneath apparent multiplicity. Colors: Many becoming one. Symbol: Multiple threads converging to single dynamic. Look for this. |
| `meet-then-elevate` | Meet Then Elevate | 400×400 | Interpretive movement: ground, elevate, return. Colors: Three-stage journey. Symbol: Down-up-down movement, or meet-rise-land. |
| `house` | House | 400×400 | One of five irreducible domains. Colors: Five distinct regions. Symbol: Five houses arranged showing their relationships. WHERE things happen. |
| `channel` | Channel | 400×400 | One of four ways consciousness moves. Colors: Four distinct flows. Symbol: Four channels or rivers flowing. HOW things move. |
| `status` | Status | 400×400 | Expression state of a card. Colors: Four states visualized. Symbol: Balanced center with three displacements around it. |
| `ring` | Ring | 400×400 | Ontological layer in consciousness. Colors: Concentric rings. Symbol: Seven nested rings with Ring 5 highlighted. Depth layers. |
| `position` | Position | 400×400 | Domain where a pattern is expressing. Colors: Location marker. Symbol: A pin or marker showing "you are here." The room, not the action. |
| `in-your` | In Your | 400×400 | Connector linking what's happening to where. Colors: Connection, ownership. Symbol: An arrow or link saying "this is YOUR location." |

---

## PART 9: READING MODES (Hero only - for UI help)

| Slug | Name | Size | Description |
|------|------|------|-------------|
| `mode-reflect` | Reflect Mode | 400×400 | Read-only observation. "What is already happening?" Colors: Mirror-like, still, receptive. Symbol: A calm mirror reflecting without distortion. Pure observation. |
| `mode-discover` | Discover Mode | 400×400 | Reveals authorship locations. "Where is authorship available?" Colors: Revealing, illuminating. Symbol: A lamp or light showing hidden opportunities. Finding agency. |
| `mode-forge` | Forge Mode | 400×400 | Active intention-setting. "What changes when intention is asserted?" Colors: Forge fire, active creation. Symbol: Hammer and anvil, or hands shaping. Making, not observing. |
| `mode-explore` | Explore Mode | 400×400 | Threaded conversation with cards. Colors: Conversational, curious. Symbol: Speech bubbles or threads connecting cards. Dialogue, not monologue. |
| `reflect-mode` | Reflect Mode | 400×400 | Same as mode-reflect - can reuse. |
| `discover-mode` | Discover Mode | 400×400 | Same as mode-discover - can reuse. |
| `forge-mode` | Forge Mode | 400×400 | Same as mode-forge - can reuse. |
| `inquiry-mode` | Inquiry Mode | 400×400 | Reading mode for questions. Receptive stance. Colors: Open, questioning. Symbol: A question mark or open hands receiving. |

---

## PART 10: SPREADS (Hero only - for UI help)

| Slug | Name | Size | Description |
|------|------|------|-------------|
| `spread-single` | Single Card | 400×400 | One signature. Direct, focused. Colors: Simple, singular. Symbol: One card centered, clear and direct. |
| `spread-triad` | Triad Spread | 400×400 | Three cards exploring a dynamic. Colors: Triangular arrangement. Symbol: Three cards in triangle or line. Past-Present-Future or similar. |
| `spread-pentad` | Pentad Spread | 400×400 | Five positions for nuanced exploration. Colors: Five-pointed arrangement. Symbol: Five cards in cross or pentagon. Context, obstacles, supports, synthesis. |
| `spread-septad` | Septad Spread | 400×400 | Seven cards for comprehensive analysis. Colors: Seven-card arrangement. Symbol: Seven cards in horseshoe or line. Maximum depth. |
| `spread-selector` | Spread Selector | 400×400 | Choose layout. Colors: Multiple options. Symbol: Several spread layouts to choose from. |

---

## PART 11: VOICE & DELIVERY (Hero only - for UI help)

| Slug | Name | Size | Description |
|------|------|------|-------------|
| `voice-panel` | Voice Settings | 400×400 | Customize how the reader speaks. Colors: Adjustable, personal. Symbol: Sliders or dials for voice control. |
| `voice-complexity` | Complexity Level | 400×400 | Friend/Guide/Elder/Oracle progression. Colors: Gradient of depth. Symbol: Four faces or figures showing increasing wisdom/complexity. |
| `voice-tone` | Tone/Seriousness | 400×400 | Playful to profound scale. Colors: Light to deep gradient. Symbol: Spectrum from smiling to contemplative. |
| `delivery-preset` | Delivery Presets | 400×400 | Quick configurations: Clear/Kind/Playful/Wise/Oracle. Colors: Five distinct styles. Symbol: Five preset buttons or cards. |
| `stance-selector` | Stance Grid | 400×400 | Four dimensions: Voice, Focus, Density, Scope. Colors: Four-axis grid. Symbol: A 2×2 or compass grid with four qualities. |
| `stance-adjust` | Adjust Stance | 400×400 | Change voice mid-reading. Colors: Dynamic adjustment. Symbol: Dials being turned, settings changing. |
| `fine-tune-voice` | Fine-Tune Voice | 400×400 | Advanced voice customization. Colors: Precise controls. Symbol: Fine adjustment controls, detailed sliders. |
| `advanced-voice` | Advanced Voice | 400×400 | Same as fine-tune-voice - can reuse. |

---

## PART 12: POST-READING ACTIONS (Hero only - for UI help)

| Slug | Name | Size | Description |
|------|------|------|-------------|
| `action-export` | Export Reading | 400×400 | Download as HTML file. Colors: Download, save. Symbol: Download arrow or file icon. |
| `action-traditional` | Traditional Names | 400×400 | Toggle tarot correspondences. Colors: Classic tarot imagery. Symbol: Traditional tarot card overlaid with Nirmanakaya card. Both names visible. |
| `action-architecture` | Architecture View | 400×400 | Show structural details. Colors: Blueprint, technical. Symbol: Wireframe or structural view of the reading. Channels, houses, corrections visible. |
| `action-new` | New Reading | 400×400 | Clear and start fresh. Colors: Fresh start, clean. Symbol: Blank page or refresh icon. |
| `action-share` | Share Reading | 400×400 | Create public link. Colors: Social, sharing. Symbol: Link icon or share arrows. |
| `action-email` | Email Reading | 400×400 | Send to email. Colors: Email envelope. Symbol: Envelope with reading inside. |

---

## PART 13: CARDS & HOTLINKS (Hero only - for UI help)

| Slug | Name | Size | Description |
|------|------|------|-------------|
| `card-click` | Card Information | 400×400 | Click card name for definition. Colors: Interactive, clickable. Symbol: Card with cursor hovering, about to click. |
| `status-click` | Status Information | 400×400 | Click status badges for meaning. Colors: Badge being clicked. Symbol: Status badge (Balanced, Too Much, etc.) with click indicator. |
| `hotlink-nav` | Hotlink Navigation | 400×400 | Amber/cyan/violet clickable terms. Colors: Three distinct hotlink colors. Symbol: Text with highlighted terms in the three colors. Back button visible. |

---

## PART 14: INPUT & CONTROLS (Hero only - for UI help)

| Slug | Name | Size | Description |
|------|------|------|-------------|
| `spark-button` | Spark Button | 400×400 | Generate random question starter. Colors: Sparking, inspiring. Symbol: Lightning bolt or spark generating a question. |
| `question-input` | Your Question | 400×400 | Enter what you want to explore. Colors: Input, receiving. Symbol: Text field with cursor, waiting for question. |
| `get-reading` | Get Reading | 400×400 | Begin the reading. Colors: Action, go. Symbol: Play button or "Begin" with cards about to be drawn. |
| `followup-input` | Follow-up | 400×400 | Continue the conversation. Colors: Continuing, threading. Symbol: Speech bubble continuing a conversation. |

---

## PART 15: BACKGROUND CONTROLS (Hero only - for UI help)

| Slug | Name | Size | Description |
|------|------|------|-------------|
| `bg-controls` | Background Controls | 400×400 | Customize visual atmosphere. Colors: Ambient, atmospheric. Symbol: Sliders controlling background imagery. |
| `bg-toggle` | Background Toggle | 400×400 | Show/hide control panel. Colors: Toggle switch. Symbol: Eye icon or toggle showing/hiding controls. |

---

## PART 16: READING SECTIONS (Hero only - for UI help)

| Slug | Name | Size | Description |
|------|------|------|-------------|
| `section-signatures` | Signatures Section | 400×400 | Overview of all cards drawn. Colors: Multiple cards arrayed. Symbol: Cards laid out showing the spread. |
| `section-synthesis` | Synthesis Section | 400×400 | Integrated meaning of all cards. Colors: Coming together, weaving. Symbol: Multiple threads weaving into one understanding. |
| `section-path` | Path Section | 400×400 | Practical guidance and next steps. Colors: Forward direction. Symbol: Path leading forward from reading. |

---

## PART 17: NAVIGATION (Hero only - for UI help)

| Slug | Name | Size | Description |
|------|------|------|-------------|
| `nav-guide` | Reader Guide | 400×400 | Full documentation. Colors: Book, reference. Symbol: Open book or guide icon. |
| `nav-about` | About | 400×400 | Philosophical foundation. Colors: Story, origin. Symbol: Scroll or origin symbol. |
| `nav-council` | Council | 400×400 | AI perspectives on framework. Colors: Multiple viewpoints. Symbol: Four or more figures in council, different perspectives. |
| `nav-hub` | Community Hub | 400×400 | Discussion forum. Colors: Community, connection. Symbol: People gathered, discussing. |

---

## PART 18: PERSONAS (Hero + Icon)

These appear in the "Who reads this to you?" selector and need both hero images for help popups AND icons to replace the current emoji icons (👋 🗨️ ✨ 🔬 🎯).

| Slug | Name | Hero | Icon | Description |
|------|------|------|------|-------------|
| `persona-none` | None | 400×400 | 48×48 | Default, neutral voice. No persona translation. Colors: Neutral grey/silver, understated. Symbol: A simple circle or empty vessel - pure, uncolored potential. Clean, minimal. Current emoji: ○ |
| `persona-friend` | Friend | 400×400 | 48×48 | Casual, supportive, warm. Colors: Warm amber/orange, inviting. Symbol: An open hand in greeting, or two figures side by side. Approachable, relaxed, human warmth. Current emoji: 👋 |
| `persona-therapist` | Therapist | 400×400 | 48×48 | Clinical but caring, reflective listening. Colors: Soft teal/sage green, calming. Symbol: A figure in attentive listening posture, or a thought bubble suggesting reflection. Professional care. Current emoji: 🗨️ |
| `persona-spiritualist` | Spiritualist | 400×400 | 48×48 | Mystical, cosmic, transcendent. Colors: Deep violet/purple with starlight accents. Symbol: Stars, cosmic swirls, or a figure with raised hands channeling light. Ethereal wisdom. Current emoji: ✨ |
| `persona-scientist` | Scientist | 400×400 | 48×48 | Rational, evidence-based, analytical. Colors: Cool blue/silver, precise. Symbol: A microscope, atomic structure, or analytical eye. Objective clarity. Current emoji: 🔬 |
| `persona-coach` | Coach | 400×400 | 48×48 | Motivational, action-oriented, encouraging. Colors: Energetic red/coral, dynamic. Symbol: A target/bullseye, or a figure in forward motion. Drive and direction. Current emoji: 🎯 |

---

## PART 19: UI CONTROLS & BUTTONS (Icon only - 48×48)

These are small UI elements that currently use system icons or text. Custom icons would unify the visual language.

### Top Bar Icons

| Slug | Name | Icon | Description |
|------|------|------|-------------|
| `ui-background` | Background Selector | 48×48 | Opens background/atmosphere controls. Colors: Subtle, ambient. Symbol: Layered landscape or atmosphere layers, suggests visual customization. Current: Generic image icon. |
| `ui-email` | Email | 48×48 | Send reading to email. Colors: Warm gold. Symbol: An elegant envelope with subtle glow or seal. Current: Generic envelope icon. |
| `ui-text-size` | Text Sizer | 48×48 | Adjust text size. Colors: Neutral. Symbol: Elegant "T" with size variation indicators, or "Aa" in art nouveau style. Current: Plain "T". |
| `ui-help` | Help Mode | 48×48 | Enter help mode. Colors: Amber/gold (matches help tooltip color). Symbol: Elegant question mark with decorative flourish. Current: Plain "?". |
| `ui-account` | Account/User | 48×48 | User account access. Colors: Personal, warm. Symbol: Stylized figure or initial letter frame in art nouveau style. Current: Letter initial. |

### Depth Settings (Shallow/Wade/Deep)

| Slug | Name | Icon | Description |
|------|------|------|-------------|
| `depth-shallow` | Shallow | 48×48 | Surface-level reading, quick insight. Colors: Light, airy, sky blue. Symbol: Feet at water's edge, ripples on surface, or a figure standing at shore. Just touching the water. |
| `depth-wade` | Wade | 48×48 | Medium depth, more exploration. Colors: Mid-tones, teal/aqua. Symbol: Figure wading waist-deep, water at mid-level. Committed but not submerged. |
| `depth-deep` | Deep / Swim | 48×48 | Full immersion, comprehensive. Colors: Deep ocean blue/indigo. Symbol: Figure fully submerged, swimming in depths, or deep water with light filtering from above. Total immersion. |

### Card Visibility

| Slug | Name | Icon | Description |
|------|------|------|-------------|
| `cards-closed` | Closed | 48×48 | Cards face-down, not revealed. Colors: Mysterious, hidden. Symbol: Card backs, face-down deck, or veiled forms. What's not yet seen. |
| `cards-open` | Open | 48×48 | Cards face-up, revealed. Colors: Illuminated, clear. Symbol: Card faces visible, revealed spread, or unveiled forms. What's been shown. |

### Quick Spread Buttons

| Slug | Name | Icon | Description |
|------|------|------|-------------|
| `quick-1` | Quick 1 | 48×48 | One-card quick draw. Colors: Simple, singular. Symbol: Single card or "1" in decorative style. |
| `quick-2` | Quick 2 | 48×48 | Two-card quick draw. Colors: Paired. Symbol: Two cards or "2" in decorative style. |
| `quick-3` | Quick 3 | 48×48 | Three-card quick draw. Colors: Triadic. Symbol: Three cards or "3" in decorative style. |

### Glisten

| Slug | Name | Icon | Description |
|------|------|------|-------------|
| `glisten` | Glisten | 48×48 | Random question/prompt generator. "Don't have words yet?" Colors: Sparkling amber/gold. Symbol: A diamond or crystal catching light, or a spark of inspiration. The moment before words form. |

### Navigation Icons (optional - to pair with nav text)

| Slug | Name | Icon | Description |
|------|------|------|-------------|
| `nav-community` | Community | 48×48 | Community forum. Colors: Warm, connected. Symbol: Multiple figures gathered, or interconnected nodes. |
| `nav-lounge` | Lounge | 48×48 | Casual discussion space. Colors: Relaxed, ambient. Symbol: Comfortable gathering space, or figures in repose. The green dot indicates activity. |
| `nav-map` | Map | 48×48 | Visual map of the architecture. Colors: Cartographic, structured. Symbol: A map or diagram showing the framework visually. |

---

## SUMMARY

**Total images needed:**

| Category | Hero (400×400) | Icon (48×48) | Thumb (120×120) |
|----------|----------------|--------------|-----------------|
| Houses | 5 | 5 | optional |
| Channels | 4 | 4 | optional |
| Statuses | 4 | 4 | optional |
| Process Stages | 4 | 4 | optional |
| Roles | 4 | 4 | optional |
| Rings | 8 | 8 | optional |
| Card Types | 11 | - | - |
| Relationships | 9 | - | - |
| Framework | 12 | - | - |
| Phases & Portals | 6 | - | - |
| Alignment | 4 | - | - |
| Pillars | 8 | - | - |
| Concepts | 24 | - | - |
| Reading Modes | 8 | - | - |
| Spreads | 5 | - | - |
| Voice & Delivery | 8 | - | - |
| Post-Reading Actions | 6 | - | - |
| Cards & Hotlinks | 3 | - | - |
| Input & Controls | 4 | - | - |
| Background Controls | 2 | - | - |
| Reading Sections | 3 | - | - |
| Navigation | 4 | - | - |
| Personas | 6 | 6 | - |
| UI Controls (top bar) | - | 5 | - |
| Depth Settings | - | 3 | - |
| Card Visibility | - | 2 | - |
| Quick Spread Buttons | - | 3 | - |
| Glisten | - | 1 | - |
| Navigation Icons | - | 3 | - |

**Totals:**
- **Hero images**: ~144
- **Icon images**: 52 (29 structural + 6 personas + 17 UI controls)
- **Total unique images**: ~196

(Some can be reused where noted - actual unique designs closer to ~170)
