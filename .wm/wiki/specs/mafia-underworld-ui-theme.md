---
implementation_notes: 'SUPERSEDE NOTE (2026-08-01): D1 (VU-Meter Desk world is the debt-office) is superseded by wiki:decisions/mafia-pixel-world-replacement — the world was replaced with a modern mafia-underworld pixel-art street (sprite units, neon-cyan/amber, wet-dark asphalt). The balloon/bowl/city-above motifs and their discipline rules (D2-D8) carry over unchanged into the pixel world (see DESIGN.md).'
---

---
implementation_notes: "User-approved extension (designer Part B rec #1/#3): add the "Balloon filing mark (UI bullet)" row to the Story-to-Surface Map — LogPanel swaps the brass bullet for a compact steel/ink balloon glyph ONLY on log lines ending in "is sunk." (UI-only, engine copy and tests untouched)."
---

---
title: Mafia Underworld UI Theme — Balloon, Bowl, Human Reach
type: spec
status: approved
priority: high
confidence: high
tags: [ui, theming, story, mafia, handover]
---

# Mafia Underworld UI Theme — Balloon, Bowl, Human Reach

Implements `wiki:tasks:implement-correct-ui-theme--guppys-mafia-underworld-escape-story`. Presentation-layer change only (Svelte UI + `app/src/app.css` tokens + DESIGN.md). Engine untouched.

## Canonical Story (user-provided)

1. **Execution** — Guppy is executed by the mafia fish using a **balloon** (balloon-drop execution — the underworld's method of getting rid of fish).
2. **Escape to a fish bowl** — Guppy escapes into a fish bowl (a human's home / aquarium — sanctuary, but a cage).
3. **Pursuit** — the mafia fish contact the **human mafia underworld** to stop Guppy **on his way back** (bowl → sea/underwater city).

## Locked Decisions

- **D1 — The VU-Meter Desk world IS the mafia-fish debt-office.** No new world built. The approved `wiki:specs:js-combat-vertical-slice` desk stays the setting; the three story motifs are layered into its existing surfaces. The desk's "debt department" tone is the mafia-fish underworld's collections division.
- **D2 — Balloon = the death/danger signature.** The balloon is the mafia's execution device, so balloon imagery/language appears ONLY where death, defeat, and foreclosure already live: the defeat end-state, the foreclosure state of the interest gauge, and death log lines (filing mark). Never on positive surfaces.
- **D3 — Fish bowl = the sanctuary-cage contrast.** Bowl imagery/language appears ONLY on safe/settled surfaces: the victory end-state (escape reached). The bowl is warm, enclosed, at peace — the opposite pole from the balloon.
- **D4 — Human-mafia reach = scale contrast in copy.** The enemy faction is the mafia-fish outfit whose collections escalate to a **human-scale underworld**. Expressed through institutional copy: the enemy-phase field label ("AUTOMATED RESPONSE" → city-above reference). Fish world = the desk (small, precise, metered); human world = "up there", larger, above.
- **D5 — Red discipline unchanged.** Signal red stays exclusive to damage, debt, defeat, foreclosure, invalid drops (DESIGN.md Do's). Balloon motifs never add red; the balloon is drawn in existing ink/steel/ivory tones at danger moments.
- **D6 — Copy stays grounded and institutional.** Desk language preserved ("Insufficient current", "Open channel required", "Interest due"). Motifs enter as paperwork/registry language, not fantasy narration: "Balloon order served", "Sanctuary: the bowl", "The city above".
- **D7 — prefers-reduced-motion preserved.** No new animation families; existing lamp/needle/scanline motion rules unchanged. Balloon and bowl glyphs are static, not motion.
- **D8 — No engine/contract changes.** `app/src/engine/` untouched (tests assert on engine log strings — see FR-5). Theme lives in `app/src/ui/`, tokens in `app/src/app.css`, DESIGN.md is the single theme authority.

## Story-to-Surface Map

| Story beat | Motif | UI surface | Concrete treatment |
|---|---|---|---|
| Balloon execution (death/mafia method) | Balloon glyph + registry language | Defeat end-state | Defeat overlay: red lamp keeps "FORECLOSURE" as the master label; balloon order line beneath ("BALLOON ORDER SERVED — Guppy the Debtor") + small balloon glyph beside the lamp. |
| Balloon execution | Balloon glyph | Interest gauge foreclosure state (turn 15) | When the gauge enters foreclosure, the state lamp renders a balloon glyph — the deadline is the execution. |
| Balloon execution | Balloon filing mark (UI bullet) | Desk log death lines | LogPanel renders a compact steel/ink balloon bullet ONLY on lines ending in "is sunk." — engine copy and tests untouched. (User-approved designer extension.) |
| Fish-bowl escape (sanctuary-cage) | Bowl glyph + warm ivory/water tone | Victory end-state | Victory overlay: green master lamp stays "ACCOUNT SETTLED"; bowl line beneath ("GUPPY REACHES THE BOWL — sanctuary, for now") + small bowl glyph beside the lamp. |
| Human-mafia underworld (scale contrast) | Registry copy + "above" framing | Enemy-phase field label | Enemy-phase label reads "THE CITY ABOVE — human division collecting" (replaces "AUTOMATED RESPONSE" during enemy phase only). Unit names stay engine-owned and unchanged. |

**Log copy is engine-owned and stays unchanged** (`app/src/engine/controller.ts`, `cards.ts` — "Foreclosure. Guppy loses the desk.", "Boss holds ground.", "Guppy is sunk."). Tests assert on these strings; the task forbids engine changes. Balloon registry language appears only on UI surfaces (defeat overlay, foreclosure lamp, log filing mark), never in the engine log.

## Requirements

### Functional Requirements

- **FR-1:** Defeat end-state shows the balloon order line + balloon glyph, without changing the red lamp master label or Restart button behavior.
- **FR-2:** Victory end-state shows the bowl line + bowl glyph, without changing the green lamp master label or Restart button behavior.
- **FR-3:** Interest gauge foreclosure state (turn 15) displays the balloon glyph on the state lamp.
- **FR-4:** Enemy-phase field label references the human division ("THE CITY ABOVE — human division collecting"); player-phase label ("OPERATOR LIVE") unchanged.
- **FR-5:** Engine log strings and all `app/src/engine/` files have zero diffs. Balloon/bowl/above language appears ONLY in UI components.
- **FR-6:** New tokens `--balloon`, `--bowl`, `--above` (or equivalent) in `app/src/app.css`; glyphs drawn from existing palette (ink/steel/ivory + established accents), NO new red.
- **FR-7:** DESIGN.md updated: story mapping documented (D1–D8 + story-to-surface table).
- **FR-8:** Desk log lines ending in "is sunk." render a compact steel/ink balloon filing bullet in place of the brass bullet; all other log lines keep the brass bullet. No log copy changes.

### Non-Functional Requirements

- **NFR-1:** `app/src/engine/` has zero diffs.
- **NFR-2:** All interactions (drag-to-board, click targeting, keyboard, hover inspection) behave identically — theme is visual/copy only.
- **NFR-3:** prefers-reduced-motion: no new animations; existing motion rules untouched.
- **NFR-4:** No new red anywhere; `--signal-red` usages unchanged in count.
- **NFR-5:** Glyphs must be color-blind safe — shape carries meaning, not color (consistent with DESIGN.md geometry language).

## Acceptance Criteria

- [ ] **AC-1:** Defeat overlay shows "FORECLOSURE" master lamp + balloon order line + balloon glyph; Restart works.
- [ ] **AC-2:** Victory overlay shows "ACCOUNT SETTLED" master lamp + bowl line + bowl glyph; Restart works.
- [ ] **AC-3:** Interest gauge at foreclosure (turn 15) shows the balloon glyph on its state lamp.
- [ ] **AC-4:** Enemy-phase field label reads "THE CITY ABOVE — human division collecting" (or grounded equivalent); player-phase label unchanged.
- [ ] **AC-5:** Engine zero diffs (`git diff app/src/engine/` empty); balloon/bowl language only in UI components.
- [ ] **AC-6:** DESIGN.md is the single theme authority and documents the story mapping; any theme changes are reflected there.
- [ ] **AC-7:** No new red; no new animation families; reduced-motion block unchanged.
- [ ] **AC-8:** vite build + vitest suite green (no interaction regressions).
- [ ] **AC-9:** Browser smoke pass: themed UI renders, interactions (move/attack/card play/end turn/restart) still work.
- [ ] **AC-10:** Desk log lines ending in "is sunk." show the balloon filing bullet; all other lines keep the brass bullet.

## Scenarios

### Scenario 1: Defeat shows the mafia method
**Given** the player loses the battle
**When** the defeat end-state appears
**Then** the red lamp reads "FORECLOSURE", a balloon glyph sits beside it, and the line beneath reads "BALLOON ORDER SERVED — Guppy the Debtor" — no fantasy chrome, no new red, Restart still functional.

### Scenario 2: Victory shows the sanctuary
**Given** the player wins the battle
**When** the victory end-state appears
**Then** the green lamp reads "ACCOUNT SETTLED", a bowl glyph sits beside it, and the line beneath reads "GUPPY REACHES THE BOWL — sanctuary, for now".

### Scenario 3: Foreclosure deadline
**Given** the interest gauge reaches turn 15 (foreclosure)
**When** the state lamp updates
**Then** the lamp renders the balloon glyph — the deadline is the execution, visible before defeat lands.

### Scenario 4: Enemy turn scale contrast
**Given** the player ends their turn
**When** the enemy-phase field label updates
**Then** it reads "THE CITY ABOVE — human division collecting", keeping the desk's institutional register; the engine log is untouched.

### Scenario 5: Death filing mark
**Given** a unit dies during combat
**When** the engine logs "... is sunk."
**Then** the Desk Log renders that line with a compact steel/ink balloon bullet instead of the brass bullet; all other lines keep the brass bullet.

## Technical Notes

- All changes in `app/src/ui/*.svelte` and `app/src/app.css`; glyphs as inline SVG or CSS shapes inside existing components (no new assets).
- Defeat/victory overlays live in `DeskFrame.svelte` (end-state section, `.outcome-lamp` + `h2` + `p` + Restart button); foreclosure lamp in `InterestGauge.svelte` (`small` foreclosure line + `.foreclosure` state); enemy-phase label in `DeskFrame.svelte` field-label (`AUTOMATED RESPONSE` span); death filing mark in `LogPanel.svelte` (`p.death i` — balloon envelope + string, triggered by `/is sunk\.$/` on the line).
- Balloon glyph: minimal string + envelope shape in ink/steel; bowl glyph: open-bowl arc in ivory/steel with a warm interior tone; both ~16–20px, matching the existing geometry language (no new colors, no animation).
- Copy register: paperwork/registry. Balloon = "order served". Bowl = "sanctuary / reached". Human division = "the city above". Never invent story claims beyond the three beats.
- Related: `wiki:tasks:implement-correct-ui-theme--guppys-mafia-underworld-escape-story`, `wiki:specs:js-combat-vertical-slice`, `DESIGN.md`.