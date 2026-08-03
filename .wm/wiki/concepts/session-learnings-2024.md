---
title: "Session Learnings: Fish Mafia UI Polish & Architecture (2024)"
type: concept
tags: ["session", "learnings", "ui-patterns", "architecture", "game-ui"]
---

## Overview

A comprehensive session implementing targeting feedback, menu architecture, and card creation UI for Fish Mafia. Generated four reusable patterns and one core architectural decision.

## Key Extractions

### 1. Targeting Arrow Dual Feedback (Pattern)
**Category:** UI Pattern  
**Time saved estimate:** 60+ minutes (avoids separately designing click-to-arm and drag feedback systems)

Unified feedback system replacing two separate interaction modes (click-to-arm card + drag-and-drop) with a single animated SVG arrow flowing from source to cursor. Gold/red color-coded for valid/invalid targets. Quadratic Bézier curve gives "throw" aesthetic.

**Why this matters:** Turn-based tactics games inherently have dual targeting modes. This pattern shows how to unify them visually without adding cognitive friction.

**Applicable to:** Any deck-builder, roguelike, or tactics game with ranged/targeted abilities.

Full reference: @wiki/patterns/targeting-arrow-dual-feedback

### 2. App Shell Screen Orchestration (Decision)
**Category:** Architecture  
**Time saved estimate:** 45+ minutes (avoids routing library config or scattered state management)

Use a shell component with a state union type (`type Screen = "menu" | "game" | "library" | "create"`) to orchestrate navigation. Centralizes persistent state (settings, custom cards) while keeping screen logic independent.

**Why this matters:** Most games start simple (one screen) then grow. This pattern scales from 1 → 10 screens without framework overhead.

**Applicable to:** Any multi-screen game or app that doesn't need URL state or deep linking.

Full reference: @wiki/decisions/app-shell-screen-orchestration

### 3. Card Library and Authoring UI (Pattern)
**Category:** UI Pattern + Component Architecture  
**Time saved estimate:** 75+ minutes (avoids duplicating card display across library, preview, inventory)

Extract a shared `CardFace` presentational component used by library, creator, and in-game views. Pair with centralized icon registry to eliminate scattered lookups. Keep form state local to the creator screen; only commit on save.

**Why this matters:** Card games proliferate in indie dev. This pattern shows how to build a flexible, reusable card display system that scales from basic collections to full deck-builders.

**Applicable to:** Card games, deck-builders, roguelikes with card discovery.

Full reference: @wiki/patterns/card-library-authoring

### 4. Game Menu Architecture (Concept)
**Category:** Game UX Concept  
**Time saved estimate:** 30+ minutes (avoids re-doing menu/settings flow)

Complete turn-key menu system with atmospheric backdrop, settings overlay, and navigation to card library/creator. Settings toggle visual aids (movement hints, particle effects) that feed into the game board.

**Why this matters:** Menu design is often overlooked as "just buttons." This concept shows how to integrate settings, theming, and navigation cohesively.

**Applicable to:** Any turn-based strategy game or tactics title.

Full reference: @wiki/concepts/game-menu-architecture

### 5. Movement Limit Adjustment
**Change:** Reduced Guppy's movement from 3 to 2 tiles/turn.  
**Implementation:** One-line change in `HERO_DEF.move`.  
**Impact:** Increases tactical depth by forcing tighter positioning choices.

## Session Summary

- Completed targeting arrow unifying two input modes with one visual metaphor
- Wired multi-screen app shell with settings state plumbing
- Built reusable card library + creator infrastructure
- Added full menu flow with atmosphere and accessibility toggles
- Reduced hero movement to increase tactical challenge

## Related Tasks

- UI Polish: Targeting Arrow for Click-to-Arm and Drag
- Feature: Menu Page with Start & Settings
- Feature: Card Library Page with Filtering
- Feature: Card Create Page with Live Preview
- Gameplay Tweak: Guppy Movement Limit (2 spaces)

## Lessons for Future Work

1. **Dual-mode feedback unification** — When a game has two input paths for the same outcome, ask "Can one visual metaphor cover both?" Saves UI cruft and reduces cognitive load.

2. **App shell first** — Route management should be solved early and kept minimal. A simple screen union beats routing-library config for most games.

3. **Shared component registries** — Icon lookups, card display, unit rendering — centralize these early to avoid drift between screens.

4. **Settings that affect visuals** — Make toggles for performance-draining features (particles, floating numbers) available before the first game. Improves accessibility and low-end device support.
