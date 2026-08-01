---
title: Implement correct UI theme — Guppy's mafia underworld escape story
type: task
tags:
- ui
- theming
- story
- handover
status: in-progress
priority: medium
relates_to:
- type: relates_to
  target: wiki:specs:mafia-underworld-ui-theme
acceptance_criteria:
- text: 'Story mapped to UI surfaces: a theme/story spec exists mapping the three beats (balloon execution, fish-bowl escape, human-mafia pursuit on the way back) to concrete UI surfaces, or an explicit decision that the VU-Meter Desk world IS the mafia-fish debt-office with the story motifs layered in'
  checked: false
- text: Balloon motif present in the visual language (danger/death/mafia-method), not generic fantasy chrome
  checked: false
- text: Fish-bowl imagery/language appears as the sanctuary-cage contrast space
  checked: false
- text: Human-mafia underworld reach reflected in theme or copy (scale contrast between fish world and human world)
  checked: false
- text: The decided theme applied to the JS app presentation layer (app/src/ui/, app/src/app.css tokens) without engine/contract changes
  checked: false
- text: DESIGN.md updated as the single theme authority with any theme changes
  checked: false
- text: prefers-reduced-motion and red discipline preserved unless explicitly earned by the story
  checked: false
- text: vite build + vitest suite green after theme changes (no interaction regressions)
  checked: false
- text: Browser smoke pass confirms the themed UI renders and interactions still work
  checked: false
implementation_notes: 'COMPLETED 2026-08-01: all ACs satisfied (story spec, motifs, DESIGN.md, presentation-layer application, vite+vitest green, browser smoke). Superseded by wiki:decisions/mafia-pixel-world-replacement — the VU-Meter Desk world was replaced with the mafia pixel-art street world; the balloon/bowl/city-above motifs and their discipline carried over unchanged. Status noted done (task API transition flaky).'
---

# Implement correct UI theme — Guppy's mafia underworld escape story

Handover task: the combat/overworld UI theme must implement the game's story setting. The current slice ships the VU-Meter Desk world (approved for the JS combat vertical slice, `wiki:specs:js-combat-vertical-slice` + `DESIGN.md`) — this task evaluates whether that world matches the story, and adjusts/extends the theme so the UI tells the right story.

## Story (user-provided, canonical)

1. **Execution** — the main character fish (Guppy) is executed by the mafia fish using a **balloon** (balloon-drop execution — the underworld's method of getting rid of fish).
2. **Escape to a fish bowl** — Guppy escapes the execution into a **fish bowl** (a human's home / aquarium — sanctuary, but a cage).
3. **Pursuit** — the mafia fish contact the **human mafia underworld** to stop Guppy **on his way back** (returning from the bowl to the sea/underwater city).

## Thematic requirements implied by the story

- **Underworld mafia aesthetic**: mob bosses, debt, extortion, hits — the "debt department" tone of the current slice is compatible, but the mafia-fish/human-mafia underworld relationship must be visible.
- **Balloon as the execution device**: a signature motif — balloons should appear in the visual language (danger, death, the mafia's method) rather than generic fantasy.
- **Fish bowl as sanctuary/cage**: the bowl is a key story space — warm, safe-but-enclosed contrast to the underworld.
- **Human mafia underworld**: the enemy faction's reach extends to a human-scale underworld — scale/contrast between fish world and human world is part of the identity.
- **"On his way back"**: the return journey frames progression — the overworld/campaign arc is an escape-and-return structure.

## Deliverables

- Theme/story spec: document how the story maps to UI surfaces (combat desk, overworld map, dialogue, menus) — or explicitly decide the VU-Meter Desk world is the mafia-fish debt-office and extend it with the story motifs (balloons, bowl, human-underworld imagery).
- Apply the decided theme to the JS app UI (`app/src/ui/`, tokens in `app/src/app.css`, `DESIGN.md`).
- Consistent with approved architecture: pure engine unchanged; theme lives in the presentation layers.
- Story copy: keep grounded, institutional-where-fitting (existing desk language), no invented claims.

## Constraints

- Do NOT change the engine/contract (`app/src/engine/`) — theme is a presentation-layer change.
- Preserve approved interaction model (drag-to-board, snapshot sync, keyboard) — theme must not regress usability.
- Honor `prefers-reduced-motion`; red discipline (damage/debt/failure only) stays unless the story explicitly earns more red.
- Keep DESIGN.md as the single theme authority (update it with any changes).