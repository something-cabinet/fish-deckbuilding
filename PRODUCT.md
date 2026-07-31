# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Vite + TypeScript + Svelte 5 (UI layer) + PixiJS (canvas layer), Vitest for tests. Pure TS engine with zero framework dependencies — single source of truth for both render layers. (User-confirmed on investigate/js-games branch: JS is the real platform going forward, not a throwaway spike.)

## Users

Tactical card game players — people who enjoy Duelyst / Cross Blitz style positional grid combat: movement matters, adjacency matters, and card play combines with positioning. Single-player, session-based play.

## Product Purpose

A tactical RPG about **Guppy the Debtor** — a fish trying to pay off debt in an underwater city. Explore an overworld island map, and fight Duelyst-style 9×5 grid battles where Guppy moves, attacks, and plays card skills from a deck. Success: satisfying positional grid combat with card-game depth, in a fish/debt/underwater-city theme.

## Positioning

Grid-tactics card combat (Duelyst-style) with a fish/debt/underwater-city theme and a story campaign. The combination of positional grid decisions + card skills + thematic fish/debt world is the distinct position.

## Operating Context

- Player fights battles on a 9×5 tactical grid (target spec; prototype = vertical slice of grid combat)
- Turn structure: player turn (move → act → end turn) then enemy AI turn, cycling until one side is defeated
- Guppy is an active unit on the grid with base attack; moves 2 tiles/turn (orthogonal cost 1, diagonal cost 2); attacks adjacent (8-way/Chebyshev 1) with symmetric counterattack
- Mana +1 per turn, starting at 1, max 9; unused mana lost at turn end
- Hand of 5 cards; draw 1 at end of turn; discard if hand full; once-per-turn Replace mechanic (target spec)
- Card types: Attack, Armor, Skill, Summon, Passive (target spec)
- Battle rewards: cards (1–3 choices) + gold; shops; campaign chapters with zone unlocks (target spec)
- Prototype placeholder art from https://kenney.nl/assets (CC0)
- Engine migrated off Godot 4 + godot-rust (gdext) and Excalibur.js/Svelte — those stacks are retired; wiki history retains the design intent

## Capabilities and Constraints

- Prototype scope (current branch): 9×5 grid combat vertical slice — Guppy + enemies, move/attack/counterattack, mana, hand, card types, end turn, basic enemy AI, snapshot-based state sync. Overworld not in prototype.
- Pure TS engine: board state, mana, hand, rules, card effects. Cards output `GameAction` objects resolved by an ActionResolver — no raw code per card.
- Both Svelte UI and PixiJS canvas read from the engine snapshot as single source of truth; valid-targets logic lives in the engine and is used by both renderer and action handler (no drift).
- Web deploy target (Vite static build); gl_compatibility-class web constraints from the Godot era no longer apply.
- NFR (from spec): 60 FPS in combat; pure game logic tested via Vitest; UI orchestration integration tests required (untested UI layer caused all past P0s — never delete orchestrator tests without replacement); prefers-reduced-motion respected for combat animations; at least 3 save slots (target spec).
- Undecided (recorded from spec open questions, not resolved): healing system between battles (placeholder ~10 HP/battle), mana springs on grid, Replace tuning, island map node-style vs rendered top-down, enemy variety per zone, chapter count/length.

## Brand Commitments

- Game name/identity: **Guppy the Debtor** — a fish paying off debt in an underwater city.
- Theme commitments: fish, debt, underwater city, roguelite/tactical positioning (Duelyst-style). References the user made binding: Duelyst (grid combat), Cross Blitz (story campaign / island map).
- Placeholder assets from Kenney (CC0) during prototyping; no custom art commitment yet.

## Evidence on Hand

- Full game design spec with locked decisions, FRs/NFRs, ACs, scenarios: `wiki/specs/fish-tactical-rpg` (approved). Tech references in that spec predate the JS pivot; read Excalibur.js/Svelte mentions as "JS engine equivalent" — Vite+Svelte 5+PixiJS is the current stack.
- Retired-stack implementation history (Godot 4 + godot-rust) in wiki, including critical patterns: snapshot-based state sync, valid-targets single source of truth, run/combat state split, orchestration testing, container-based layout, scene branch extraction.
- No live demo, screenshots, testimonials, pricing, or press exist — must not be fabricated.

## Product Principles

1. **The engine is the single source of truth.** No game rules in PixiJS or Svelte; both layers read snapshots and dispatch validated actions.
2. **Validation lives once, in the engine.** The same pure function determines valid targets for the overlay, click validation, and AI — no UI/engine drift.
3. **Snapshot state sync over granular events.** Full snapshot after every action; granular events only for transient visuals (animations, flashes).
4. **Test the orchestration, not just leaves.** Pure-logic unit tests plus full turn-cycle integration tests through the controller/bridge.
5. **Positional decisions + card depth are the fun.** Movement, adjacency, counterattacks, and mana economy must stay tight; scope cuts protect the core combat loop.

## Accessibility & Inclusion

- prefers-reduced-motion must be respected for combat animations (NFR-4 from spec).
- No other product-specific accessibility requirement established.
