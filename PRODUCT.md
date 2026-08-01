# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Vite + TypeScript + Svelte 5 (DOM UI layer) + PixiJS (canvas layer), Vitest for tests. Pure TS engine with zero framework dependencies — single source of truth for both render layers. (User-confirmed on investigate/js-games branch: JS is the real platform going forward, not a throwaway spike.)

## Users

Tactical card-game players — people who enjoy positional grid combat where movement, adjacency, and card play combine. Single-player, session-based play. Primary context: a desktop browser at 16:9; the rebuilt battle screen is desktop-first and responsive (must not clip zones at smaller heights, unlike the scrapped slice).

## Product Purpose

A tactical card-combat game about a fish settling a debt — battles on a 9×5 grid where the player moves, attacks, and plays card skills from a deck, with a story campaign structure.

**Canonical story (user-provided, binding):** the main fish is executed by the mafia fish via **balloon drop** (the underworld's method); it escapes into a **fish bowl** (a human's home — sanctuary, but a cage); the mafia contacts the **human mafia underworld** to stop it on the way back. Motif discipline is binding: balloon = death/danger only, bowl = victory/sanctuary only, "the city above" = the human-division's reach; signal-red stays exclusive to damage/debt/defeat/foreclosure.

## Positioning

Grid-tactics card combat (Duelyst-style positional play) with a fish/debt/underworld theme and a story campaign. The combination of positional grid decisions + card skills + the fish-mafia story is the distinct position. **Product name and theme references (Duelyst/Cross Blitz etc.) are OPEN for revision in this rebuild** — user decision 2026-08-01; the canonical story beats remain binding.

## Operating Context

- Battle screen core (this rebuild): 9×5 grid, hand, piles, intent telegraphs, end-turn, log — scoped in `wiki:specs/battle-ui-fab-sts-rebuild`.
- Turn structure: player turn (move → act → end turn) then enemy turn, cycling until one side is defeated.
- Player unit on the grid with base attack; moves a bounded number of tiles per turn (orthogonal/diagonal costs); attacks adjacent with symmetric counterattack.
- Mana +1 per turn (start 1, capped); unused mana lost at turn end.
- Hand of 5 cards; draw at end of turn; discard when hand is full; once-per-turn Replace mechanic (target spec).
- Card types: Attack, Armor, Skill, Summon, Passive (target spec).
- Battle rewards (cards 1–3 choices + gold), shops, campaign chapters — target spec, outside the rebuilt slice.
- Web deploy target (Vite static build).

## Capabilities and Constraints

- Rebuild scope (this branch): full JS slice — engine + render + UI — rebuilt from scratch with the FAB + Slay the Spire design language (research: `wiki:reference/battle-ui-research-fab-sts`). Nothing from the deleted slice carries into code.
- Pure TS engine: board state, mana, hand, rules, card effects. Cards output action objects resolved by an engine resolver — no raw code per card.
- Engine is the single source of truth: both Svelte UI and PixiJS canvas read engine snapshots; valid-targets logic lives in the engine and is used by overlay, click validation, and AI (no drift).
- Design-language commitments (from the rebuild spec): static zone geography (FAB); intent telegraphing with precise always-visible numbers + tile-level tints (StS + Into the Breach); fixed corner card anatomy + top-edge resource strip (FAB); hand fan with hover zoom (StS); playable-glow affordance; floating-number feedback; pile UX with counts.
- Custom art commitment: this rebuild ships custom art (not placeholder Kenney assets) — user decision 2026-08-01.
- NFR (from spec): 60 FPS in combat; vitest unit + orchestration tests required (untested UI layer caused past P0s — never delete orchestrator tests without replacement); prefers-reduced-motion respected; desktop-first responsive layout with no fixed-px zone clipping; ≤ ~20 transient FX nodes/sprites per turn; keyboard paths (Space end turn, 1–5 cards, Esc cancel); end-state announced via aria-live; color-blind-safe glyphs.
- Undecided (recorded, not resolved): healing between battles, mana springs on grid, Replace tuning, island map node-style vs rendered, enemy variety per zone, chapter count/length, product name and theme references (identity reopened).

## Brand Commitments

- **Visual register (standing preference, locked 2026-08-01):** the category standard, played straight — a dark tactical board at **Duelyst + Slay the Spire craft level**. No ironic rework of the concept; full-fidelity execution. Craft bar: Duelyst's board polish/readability + StS's glanceability (hand, piles, intent telegraphs). Story surfaces (balloon/bowl/city-above) and the institutional copy register stay.
- Canonical story beats and motif discipline (above) are binding and not up for revision.
- References the user previously made binding: Duelyst (grid combat), Cross Blitz (campaign) — **now open for revision** per the identity-reopen decision; treat as context, not constraint, until resolved.
- Copy register: institutional/registry language on story surfaces ("Balloon order served", "Guppy reaches the bowl", "THE CITY ABOVE — human division collecting"); engine copy is never themed.
- CC0/public-domain assets may be sourced with licensing recorded; custom art commitment supersedes placeholder use for the rebuilt slice.

## Evidence on Hand

- `wiki:reference/battle-ui-research-fab-sts` — two-pass FAB + Slay the Spire UI/UX research with implementation-ready values and sources.
- `wiki:specs:battle-ui-fab-sts-rebuild` — approved-direction rebuild spec (locked decisions D1–D10, FRs/NFRs, ACs, scenarios); validated clean.
- `wiki:specs:mafia-underworld-ui-theme` — superseded world, but motif rules (D2–D8 carry: balloon/bowl/city-above, red discipline, no new animation families, reduced-motion) remain the story-to-surface authority.
- `wiki:specs:battle-ui-polish` (draft) — earlier Duelyst/Hearthstone polish spec; its deferred items overlap the new spec's intent surfaces.
- Retired-stack implementation history (Godot 4 + godot-rust) in wiki: snapshot-based state sync, valid-targets single source of truth, run/combat state split, orchestration testing, container-based layout.
- Deleted slice history: engine contract (snapshot + controller actions) and themed surfaces documented in wiki; the code itself is removed from the tree.
- Referenced-but-missing on disk: `wiki/specs/fish-tactical-rpg` (approved design intent per old PRODUCT.md) and `wiki/reference/battle-ui-research-duelyst-hearthstone` — dangling refs; do not treat as current authorities.
- No live demo, screenshots, testimonials, pricing, or press exist — must not be fabricated.

## Product Principles

1. **The engine is the single source of truth.** No game rules in PixiJS or Svelte; both layers read snapshots and dispatch validated actions.
2. **Validation lives once, in the engine.** The same pure function determines valid targets for the overlay, click validation, and AI — no UI/engine drift.
3. **Snapshot state sync over granular events.** Full snapshot after every action; granular events only for transient visuals (animations, flashes).
4. **Test the orchestration, not just leaves.** Pure-logic unit tests plus full turn-cycle integration tests through the controller/bridge.
5. **Positional decisions + card depth are the fun.** Movement, adjacency, counterattacks, and mana economy must stay tight; scope cuts protect the core combat loop.
6. **Legibility is the design language.** Every surface answers "Can I act? What threatens? What will I lose?" at a glance (glanceability budget); zones never move, only cards/units do.

## Accessibility & Inclusion

- prefers-reduced-motion must be respected for all combat animations (stepped/no-motion path).
- End-states announced (role="alert"/aria-live); decorative layers aria-hidden; keyboard-visible focus; glyphs color-blind-safe (shape carries meaning, not color alone).
