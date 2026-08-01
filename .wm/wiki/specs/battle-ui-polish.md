---
title: Battle UI Polish — Duelyst/Hearthstone Patterns
type: spec
status: draft
implementation_notes: 'STATUS NOTE (2026-08-01): The mafia-pixel world replacement (wiki:decisions/mafia-pixel-world-replacement) landed several of this spec''s items in the new world: actionability glow grammar (FR-1 → neon cyan/amber), scrollable log (FR-2, 50-line scroll), high-damage drama ≥7 (FR-4 → 350ms shake + zoom), turn banner pacing partially (enemy-phase label themed; full banner deferred). Deferred: damage squash merge window (FR-3 partial — burst squash not implemented), end-turn finished state (FR-6), hover previews (FR-7), hand-full warning (FR-8). Re-target these at the pixel world when picked up.'
---

---
title: Battle UI Polish — Duelyst/Hearthstone Patterns
type: spec
status: draft
priority: high
confidence: high
tags: [ui, ux, battle, js, polish]
---

# Battle UI Polish — Duelyst/Hearthstone Patterns

Presentation-layer polish for the JS combat vertical slice, derived from @wiki/reference/battle-ui-research-duelyst-hearthstone. Re-targets the design intent of the Godot-era @wiki/specs/battle-ui-ux-upgrades to the JS stack (Vite + Svelte 5 UI + PixiJS canvas + pure TS engine). Implemented UI already covers the theme layer (@wiki/specs/mafia-underworld-ui-theme); this spec is about feedback readability and actionability.

## Locked Decisions

- **D1 — Scope:** glow grammar (actionability), scrollable persistent log, floating-damage squash + high-damage drama, turn banner pacing, end-turn "finished" state, hover previews (friendly move-zone / enemy range), hand-full warning. Hand "living preview" (Duelyst sprite cards) is DEFERRED (needs asset pipeline decision).
- **D2 — Desk language preserved:** amber/brass = actionable glow, dim = unavailable, signal-red = damage/debt/failure only. No new color grammar; the research's "green = playable" translates to our amber.
- **D3 — Engine stays the single source of truth:** any new state needed by UI (e.g., "nothing playable remains") is computed in the pure engine with unit tests; UI/bridge only renders it. Valid-targets single source of truth applies to all hover previews.
- **D4 — Input never locked:** animations never block input; actions can be queued (HS lesson).
- **D5 — prefers-reduced-motion:** all new animation (banner, shake, squash) has a stepped/no-motion path.
- **D6 — Pacing numbers (Duelyst):** turn banner 0.35s scale-in, 1.0s hold, 0.2s slide+fade; damage squash merge window 0.75s; screen drama only at damage ≥ 7.

## Requirements

### Functional Requirements

- **FR-1 — Actionability glow grammar:** hand cards, board units (canvas), and the end-turn transport all use one grammar: amber/brass glow = actionable, dim/desaturated = unavailable. Conditional bonuses may add a second accent (brass-light) when they become live.
- **FR-2 — Scrollable persistent log:** Desk Log (LogPanel) shows all engine lines (engine caps at 50) in a scrollable view; newest visible at rest; resets at battle start; stays readable during the battle.
- **FR-3 — Floating damage squash:** successive stat changes to the same unit within 0.75s merge into one cumulative floating number, then float+fade (0.8s). Damage numbers red; heal green; shield blue (existing floating-damage behavior from @wiki/specs/battle-ui-ux-upgrades, add squash).
- **FR-4 — High-damage drama:** a single hit ≥ 7 triggers one screen shake + focus zoom (0.1s in / 0.25s out, shake ~0.35s), never stacking, suppressed under reduced motion.
- **FR-5 — Turn banner:** "YOUR TURN" / "ENEMY TURN" banner center-screen: 0.35s scale-in, hold 1.0s, slide 30px + fade 0.2s (Duelyst values). Existing themed enemy-phase label ("THE CITY ABOVE…") remains; banner is the phase-change announcement.
- **FR-6 — End-turn finished state:** when no playable card, no usable action remains, and no valid move/attack exists, the transport shows a bright "finished" glow (desk amber, stronger than armed) nudging the pass. Computed by a pure engine function (unit-tested).
- **FR-7 — Hover previews:** hovering a friendly unit previews its move zone at reduced emphasis; hovering an enemy shows its range overlay (re-target of battle-ui-ux-upgrades FR-17 to PixiJS; uses the engine's single valid-targets/reachability functions). Click-to-select unaffected.
- **FR-8 — Hand-full warning:** when the hand is at cap, the hand rack gets a visible warning affordance (glow/edge accent) before the next draw would over-discard; no engine rule change, warning only.

### Non-Functional Requirements

- **NFR-1:** Engine changes (FR-6 helper, FR-7 reachability exposure) are pure functions with `vitest` tests; no rules duplicated in UI.
- **NFR-2:** No more than ~20 transient nodes/sprites per turn; FX batched/squashed (Duelyst concurrency lesson).
- **NFR-3:** prefers-reduced-motion steps every new animation.
- **NFR-4:** Keyboard paths preserved and extended: Space end turn, 1-5 cards, Esc cancel; keyboard-visible focus states for the new affordances.
- **NFR-5:** No new red outside the existing grammar; no new font/color tokens without DESIGN.md update.

## Acceptance Criteria

- [ ] **AC-1:** Playable cards glow amber; unplayable dim; end-turn transport armed/finished states distinct and readable.
- [ ] **AC-2:** Log scrolls through all 50 engine lines; auto-shows newest; resets per battle.
- [ ] **AC-3:** Two rapid hits on one unit produce one cumulative number; single numbers float+fade 0.8s.
- [ ] **AC-4:** A ≥7 damage hit shakes+zooms once; repeat hits don't stack; reduced motion = no shake.
- [ ] **AC-5:** Turn banner plays on phase change with 0.35/1.0/0.2 pacing; enemy-phase themed label unchanged.
- [ ] **AC-6:** Transport shows finished-glow exactly when engine says nothing actionable remains (unit test + UI state).
- [ ] **AC-7:** Hovering friendly unit previews move zone; hovering enemy previews range; selection clicks unaffected.
- [ ] **AC-8:** Hand at cap shows warning affordance; draw rules unchanged.
- [ ] **AC-9:** vitest suite green (new engine helpers covered); vite build green.
- [ ] **AC-10:** Browser smoke pass: all interactions (move/attack/card play/end turn/restart) work with the new feedback.

## Scenarios

### Scenario 1: Rapid double-hit
**Given** a unit takes two hits within 0.75s
**When** both resolve
**Then** one cumulative floating number appears over the unit, floats up, fades; no stacked numbers.

### Scenario 2: Big hit
**Given** a unit takes 8 damage
**When** the damage resolves
**Then** a single screen shake + quick focus zoom plays, then normal play continues without input lock.

### Scenario 3: Nothing left to do
**Given** the player has no playable cards, no moves, no attacks
**When** the turn state updates
**Then** the transport glows "finished" (brighter than armed), nudging End Turn; engine helper returns true under test.

### Scenario 4: Enemy range check
**Given** the mouse hovers an enemy
**When** 0.2s elapse
**Then** the enemy's reachable tiles + attack tiles render as an overlay; moving away clears within 0.1s; clicking still selects normally.

## Technical Notes

- UI: `app/src/ui/LogPanel.svelte` (scroll), `app/src/ui/HandRack.svelte` (glow grammar + hand-full), `app/src/ui/EndTurnTransport.svelte` (finished state), `app/src/ui/DeskFrame.svelte` (banner node), `app/src/bridge/game.ts` (wiring).
- Canvas: `app/src/render/` — hover previews + overlay rendering in PixiJS (desk.ts / units.ts), damage-squash in the needle/stat-change view state.
- Engine: `app/src/engine/` — new pure helper(s): e.g., `hasAnyActionable(state)` and reachability exposure for hover previews, with tests in `controller.test.ts`-style suites. Valid-targets logic remains the single source of truth.
- Related: @wiki/reference/battle-ui-research-duelyst-hearthstone, @wiki/specs/battle-ui-ux-upgrades (design intent, Godot-era), @wiki/specs/js-combat-vertical-slice (approved baseline), @wiki/specs/mafia-underworld-ui-theme (theme layer).