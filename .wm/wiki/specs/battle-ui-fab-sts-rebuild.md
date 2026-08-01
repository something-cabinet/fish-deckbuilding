---
title: Battle UI Rebuild — FAB + Slay the Spire Design Language
type: spec
tags:
- ui
- rebuild
- fab
- sts
- battle
- js
implementation_notes: 'DIRECTION LOCKED (impeccable shape, 2026-08-01): concept-seed roll run twice (assigned #3 Aquarium Cross-Section, then #7 Registry Lighthouse); user took the standing exit — CATEGORY STANDARD, played straight: a dark tactical board at Duelyst + Slay the Spire craft level (Duelyst board polish/readability + StS glanceability). No ironic rework; full-fidelity execution. Story surfaces (balloon/bowl/city-above) and institutional copy register stay. Recorded as a brand commitment in PRODUCT.md. DESIGN.md to be written from the built world at finish (impeccable new-work §7). IMPLEMENTED + VERIFIED 2026-08-01 (deepwork pipeline P0–P5): engine rebuilt (contract, rules, orchestration tests), scaffold + design system (app.css tokens, DESIGN.md), Pixi render layer (grid, authored mobster-fish art, intent telegraphs, hover previews, snapshot-diff), DOM UI (hand fan D7, card anatomy D6, piles, end-turn, BULLETIN log w/ balloon filing mark, economy read, story overlays), bridge input (canvas + keyboard Space/1–5/Esc + drag-to-board), motion pass (animate thesis: walk 300ms/tile, floating numbers w/ 150ms merge, ≥7 shake+zoom non-stacking, telegraph 650ms entrance, story scenes, reduced-motion instant paths). Verified: tsc clean, 78/78 vitest (46 engine + 5 snapshot-diff + 6 motion + 21 bridge), vite build ✓, impeccable detector clean, preview serves HTTP 200. Engine contract: snapshot + controller + enemyIntents + GameEvent stream. Pipeline substitutions (disclosed): oracle/designer lanes session-errored after P0; gates/art/DOM-UI executed by orchestrator with the same spec fidelity.'
status: approved
---

# Battle UI Rebuild — FAB + Slay the Spire Design Language

Full rebuild of the JS combat slice (engine + render + UI) with a FAB/StS-grounded design language. The old slice (VU-Meter Desk → mafia pixel world) was deleted; the canonical story carries forward, the world presentation is redesigned from research. Derived from @wiki/reference/battle-ui-research-fab-sts (two-pass web research).

## Locked Decisions

- **D1 — Full slice rebuild.** `app/` (engine + render + UI) is rebuilt from scratch with the FAB/StS design language. Nothing from the deleted slice is carried into code; the research + PRODUCT.md + wiki are the only inputs.
- **D2 — Battle screen core only.** Surface scope: grid board (9×5), hand, piles (deck/discard), intent telegraphs, end-turn, log. No overworld/menus/deck-building in this slice.
- **D3 — Story kept, world redesigned.** Canonical story (balloon execution, fish-bowl escape, city-above pursuit) and motif discipline (balloon=death/danger, bowl=victory, signal-red=damage/debt only) stay binding. The world's visual presentation is redesigned per FAB/StS research; DESIGN.md is regenerated as the theme authority.
- **D4 — Static zone geography (FAB §5.6).** Zones are fixed cells; only cards/units move. Board center; economy pillar (deck/pitch/graveyard-style) per side; pile zones fixed in named corners. No zone ever moves or overlaps the action.
- **D5 — Intent telegraphing = readable dialogue (FAB chain + Into the Breach).** Enemy attacks staged as a readable sequence: attack telegraph → block commitment (running shield number) → damage resolve → hit/no-hit stamp. On the grid: per-enemy intent badge with precise number + tile-level attack trail tint (neon-amber=attack, neon-cyan=move). Signal-red stays damage/debt only.
- **D6 — Fixed corner card anatomy (FAB CR Ch.2).** Cost top-right (red circle), resource/pitch pips top-left, power bottom-left (amber), defense bottom-right (grey). Top-edge color strip = resource read, readable in a fanned hand.
- **D7 — StS hand fan geometry.** Bottom-center pivot, ~90° arc, radius ≈1.2× card width, hover zoom (scale 1.2×, lift ~100px, 0.2s), damped-lerp reflow, neighbors pushed aside. Animations never block input.
- **D8 — Glanceability budget (StS).** One glance answers: "Can I act? What threatens? What will I lose?" Playable-glow affordance: neon-amber glow when affordable, dim/desaturated when not; distinct armed vs finished end-turn states.
- **D9 — Engine is the single source of truth (carried from PRODUCT.md principles).** Pure TS engine; snapshot sync; valid-targets logic in engine only; UI/render never duplicate rules.
- **D10 — Discipline preserved.** prefers-reduced-motion steps every animation; red discipline (no new red); keyboard paths (Space end turn, 1–5 cards, Esc cancel); no engine-only copy in UI; orchestration tests required.

## Requirements

### Functional Requirements

- **FR-1 — Static board + zone layout:** 9×5 grid centered; hand bottom-center; deck/discard piles as fixed stacked zones with counts; economy read (interest/debt) fixed in a named corner; no zone overlaps the grid at any viewport height.
- **FR-2 — Intent telegraphs:** each enemy shows an always-visible intent (precise damage number + action glyph) above it; attacks also render a tile-level trail/target tint in neon-amber; moves tint neon-cyan. Intents update on turn start; never click-to-reveal.
- **FR-3 — Combat-chain staging (enemy turn):** enemy actions resolve as a readable sequence (telegraph → commit → damage → stamp), with the log narrating the exchange in registry copy.
- **FR-4 — Hand fan:** arc-fanned hand, bottom-center pivot, hover zoom + neighbors push, drag-to-board play still works, pick via click or 1–5 keys.
- **FR-5 — Card anatomy:** fixed corners per D6; top-edge resource strip; playable cards glow neon-amber, unplayable dim.
- **FR-6 — Floating numbers:** damage/stat changes float+fade (0.6–1.2s, 20–40px jitter, merge within 100–200ms per unit); damage red, heal green, shield blue; ≥7 single hit triggers one non-stacking screen shake + zoom (reduced-motion: none).
- **FR-7 — End-turn:** anchored bottom-right of hand; armed vs finished states distinct; disabled during resolution; Space shortcut.
- **FR-8 — Log (BULLETIN):** last N engine lines; death lines get the balloon filing mark; copy stays engine-owned.
- **FR-9 — Story surfaces:** defeat overlay = balloon + "BALLOON ORDER SERVED — Guppy the Debtor" (red lamp "FORECLOSURE"); victory overlay = bowl + "GUPPY REACHES THE BOWL — sanctuary, for now" (green lamp "ACCOUNT SETTLED"); enemy-phase label references the city above; foreclosure deadline visible on the economy read.
- **FR-10 — A11y:** end-state announced (role="alert"/aria-live); decorative layers aria-hidden; keyboard-visible focus; color-blind-safe (shape carries meaning, glyphs not color-only).

### Non-Functional Requirements

- **NFR-1:** Pure TS engine, no framework deps; vitest covers engine rules + full turn-cycle orchestration tests (never delete orchestration tests — past P0 source).
- **NFR-2:** 60 FPS in combat; ≤ ~20 transient FX nodes/sprites per turn.
- **NFR-3:** prefers-reduced-motion: every animation has a stepped/no-motion path.
- **NFR-4:** No new red anywhere; `--signal-red` usage exclusive to damage/debt/defeat/foreclosure; balloon/bowl glyphs drawn from ink/steel/ivory + established accents.
- **NFR-5:** Static zone layout responsive across viewport heights (no fixed-px clipping like the old slice).
- **NFR-6:** Token + glyph language single-sourced (CSS custom properties; canvas mirrors one TOKENS constant), DESIGN.md is the single theme authority.

## Acceptance Criteria

- [ ] **AC-1:** Board + all zones visible without clipping on ≥950px tall and ≥1280px wide viewports; zones never overlap the grid.
- [ ] **AC-2:** Every enemy shows intent (number + glyph) with no click required; attacks tint target tiles neon-amber; moves neon-cyan.
- [ ] **AC-3:** Enemy turn resolves as staged sequence; log narrates in registry copy; no engine string changes.
- [ ] **AC-4:** Hand fans on an arc; hover zooms; drag-to-board and click-to-pick both work; 1–5 keys select.
- [ ] **AC-5:** Playable cards glow neon-amber; unplayable dim; end-turn shows distinct armed/finished states.
- [ ] **AC-6:** Two rapid hits merge into one cumulative floating number; single numbers float+fade; ≥7 hit shakes once (or not at all under reduced-motion).
- [ ] **AC-7:** Defeat = FORECLOSURE + balloon + order line; victory = ACCOUNT SETTLED + bowl + sanctuary line; enemy-phase label references the city above; Restart works.
- [ ] **AC-8:** Full turn-cycle orchestration tests green (move/attack/card play/end turn/restart); engine rules unit-tested; vite build green.
- [ ] **AC-9:** Keyboard: Space end turn, 1–5 cards, Esc cancel; end-state announced via aria-live.
- [ ] **AC-10:** Browser smoke pass: move/attack/card play/end turn/restart all work; no red outside grammar; reduced-motion respected.

## Scenarios

### Scenario 1: Enemy intent read
**Given** an enemy unit is in range
**When** the player's turn begins
**Then** the enemy shows a precise damage number + attack glyph above it and the threatened tiles tint neon-amber — no click required, and the player can plan before acting.

### Scenario 2: Rapid double-hit
**Given** a unit takes two hits within 200ms
**When** both resolve
**Then** one cumulative floating number appears over the unit, floats up, fades; no stacked numbers.

### Scenario 3: Big hit
**Given** a unit takes 8 damage
**When** the damage resolves
**Then** a single screen shake + quick focus zoom plays once (never stacking); under reduced-motion, none; input is never blocked.

### Scenario 4: Nothing left to do
**Given** the player has no playable cards, no moves, no attacks
**When** the turn state updates
**Then** the end-turn transport shows the finished glow, nudging the pass.

### Scenario 5: Foreclosure deadline
**Given** the economy read reaches the foreclosure turn
**When** the state updates
**Then** the balloon motif appears on the foreclosure surface and defeat follows the established order line copy.

## Technical Notes

- Stack (from PRODUCT.md): Vite + TypeScript + Svelte 5 (DOM UI) + PixiJS (canvas), Vitest. Engine pure TS.
- Layout skeleton follows D4: `main` grid area (board) center; `aside` zones fixed (piles, economy, log); hand strip bottom; end-turn transport bottom-right of hand.
- Canvas: intent badges + tile tints rendered in PixiJS; mirror CSS tokens via one TOKENS constant (color-blind-safe shapes).
- Engine surface (restore the proven contract from the deleted slice, per PRODUCT.md): snapshot state sync; controller actions selectUnit/moveSelectedTo/attackTarget/setActiveCard/playCard/sellCard/endTurn; valid-targets single source of truth; constants GRID_COLS/ROWS, HAND_LIMIT, INTEREST/FORECLOSURE turns, CREDIT_LIMIT.
- Related: @wiki/reference/battle-ui-research-fab-sts (research), @wiki/specs/mafia-underworld-ui-theme (story motifs, superseded world but motif rules stand), PRODUCT.md (product principles), DESIGN.md (regenerated as theme authority).

## Open Questions

- [ ] Exact pile zone placement (left vs right column) — resolved during design phase (impeccable shape).
- [ ] Whether the FAB pitch/arsenal telegraph (enemy resource ceiling pips) makes it into this slice or is deferred.
- [ ] Card width/hand size tuning on the target viewport.