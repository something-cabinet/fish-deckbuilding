---
title: JS Combat Vertical Slice (VU-Meter Desk)
type: spec
status: approved
tags: [js, combat, slice, vu-meter-desk, svelte, pixijs, fab-coin]
---

# JS Combat Vertical Slice (VU-Meter Desk)

## Overview

Build the playable grid-combat vertical slice of the Fish Tactical RPG on the `investigate/js-games` branch (`app/`): a pure TypeScript engine as the single source of truth, a PixiJS canvas layer rendering the VU-Meter Desk world, and a Svelte 5 (runes) UI layer for the channel-strip hand, coin meter, end-turn transport, and stat inspection. 9×5 Duelyst-style grid, drag-to-board card play, enemy AI turn, victory/defeat with restart.

Design direction is approved and locked: **VU-Meter Desk** — the battle is the debt department's broadcast console. Warm ivory meter faces behind glass, black scale arcs and ballistic needles as working ink, walnut-and-steel desk frame. THE ARC PAST ZERO IS THE ONLY RED — reserved for damage, debt, defeat. See PRODUCT.md (product record) and the shape brief recorded in `.slim/deepwork/js-combat-slice.md`.

**Economy is FaB-style coins** (approved decision @wiki/decisions/fab-coin-system, researched per user): no mana. Each turn starts at 0 coins. Cards are SOLD from hand for their coinValue (go to a sell pile, then bottom of deck at turn end). Cards COST coins to play. Borrow up to credit limit −5; interest damage = |debt| at end of turn if negative; coins reset to 0 each turn.

## Locked Decisions

- D1: **Stack** — Vite + TypeScript + Svelte 5 (runes: `$state`, `$derived`, `$props`, `$effect`) + PixiJS v8 (8.19.0) + Vitest. Desktop mouse-first.
- D2: **Architecture** — pure TS engine (`app/src/engine/`) with zero framework deps; controller is the single resync fan-out; renderers never subscribe independently; valid-targets logic lives in the engine only.
- D3: **Snapshot sync** — full immutable snapshot after every mutating action (exactly one, synchronous); granular EngineEvents only for transient visuals.
- D4: **Card effects** — cards emit GameAction objects resolved by an ActionResolver; no raw code per card. **Each card has its own unique effect** (10 unique cards × 2 copies); NO summon mechanic (explicitly removed per user; design intent is Guppy-centric positional play). **All cards are `action` type** (FaB model — @wiki/decisions/fab-style-action-card-type): combat role from numeric stats + effect, not a type label.
- D5: **Interaction** — drag card from hand onto board; PixiJS raycasts to grid cell; engine validates; invalid drop = catch + reason near hand. Hover inspection panel for units/cards. Card ghost rides cursor during drag.
- D6: **World/visuals** — VU-Meter Desk (see Overview). Vector graphics via PixiJS Graphics/Text for the slice; Kenney assets (kenney.nl, CC0) as placeholder source where raster art is needed; needles are code-animated (real VU ballistics: 300ms integration, weighted overshoot — plain spring acceptable for slice).
- D7: **Red discipline** — red reserved for immediate cost/damage/failure only; jack geometry (socket+chevron vs split-ring) distinct from color for color-blind safety; damage also signaled non-color (needle drop + numerals). Debt stacks display in red (debt IS the red theme).
- D8: **Starter deck — 20 cards = 10 unique × 2 copies each** (user-locked, no summon). Each card has `cost` (coins to play), `coinValue` (coins gained when sold; FaB pitch colors: red=1, yellow=2, blue=3), and a unique effect:
  1. **Strike** (cost 2, red/1) — Deal 3 damage to an adjacent enemy unit.
  2. **Slam** (cost 3, red/1) — Deal 5 damage to an adjacent enemy unit.
  3. **Riptide** (cost 2, yellow/2) — Deal 2 damage to ALL enemies adjacent to Guppy (small AoE).
  4. **Shell** (cost 2, red/1) — Gain 2 armor (temporary shield; expires at end of turn).
  5. **Patches** (cost 2, yellow/2) — Heal Guppy 3 HP.
  6. **Undercurrent** (cost 1, yellow/2) — Push an adjacent enemy 1 tile away (displacement).
  7. **Gulp** (cost 1, blue/3) — Gain 2 coins.
  8. **Borrowed Time** (cost 2, blue/3) — Draw 2 cards.
  9. **Harpoon** (cost 3, red/1) — Pull an enemy up to 2 tiles toward Guppy (displacement) and apply 1 Debt stack.
  10. **Dart** (cost 1, yellow/2) — Move Guppy up to 2 tiles WITHOUT consuming her move action (dodge card; required because future bosses are strong with AoE).
- D9: **Battle setup — enemy variety** — three enemy templates: **Debt Collector** (5 HP, 2 ATK, move 2, balanced), **Loan Shark** (8 HP, 1 ATK, move 2, tanky), **Hustler** (3 HP, 3 ATK, move 2, glass cannon). Slice battle is deterministic: Guppy (10 HP, 2 ATK, move 2) vs **Loan Shark + Hustler** at fixed positions (mixed pair proves variety and tests AI threat prioritization).
- D10: **Post-battle** — victory/defeat desk-lamp state + Restart button; no overworld, no persistence in this slice.
- D11: **Rules** — move 2 tiles (ortho 1, diag 2, no corner-cutting, units block); attack Chebyshev-1 adjacent with symmetric counterattack (no chain, resolved in one action/snapshot); **coin economy**: turn starts at 0 coins; sell hand card → +coinValue (card to sellPile, bottom of deck at turn end in sell order — reorder UI deferred); play card → pay cost; borrow to −5 credit limit (no deeper); at end of turn if coins < 0 → interest damage = |coins| to Guppy, logged; coins reset to 0 each turn; draw 1 at end of player turn, hand max 5 (full → discard, logged); winner freeze after victory/defeat; armor absorbs damage before HP, expires at end of owner's turn; displacement respects occupied cells and grid bounds (no push off board; blocked push = no-op with log).
- D12: **Enemy AI** — if can attack adjacent player unit → attack lowest-HP player unit; else move toward nearest player unit along shortest path; one action per unit per turn.
- D13: **Desk language** — institutional log copy ("Insufficient current", "Open channel required", "Range: adjacent", "Debt pressure rising", "Interest due — Guppy pays N", "Boss holds ground"), capped at 50 lines.
- D14: **Battle feel** — victory/defeat transitions (desk lamps, needle pinning) + attack-impact particle burst; particles hand-rolled on batched Graphics (per lib-2 research: `@pixi/particle-emitter` is v7-locked, Matter.js not needed for VFX). No physics library.
- D15: **Input & support** — keyboard shortcuts (Space = end turn, Esc = deselect, 1–5 = select card); battle log panel visible in the desk; first-battle hint strip; debug snapshot overlay (toggle); Kenney CC0 audio SFX (card play, sell, attack, coin gain, end turn, victory/defeat) with mute toggle; unit state lamps (move/attack remaining) + enemy intent marker (which player unit an enemy will attack).
- D16: **Interest timer** — debt as clock: turn cap 15. From player turn 9 onward, Guppy takes interest damage = turnNumber − 8 at the start of her turn (turn 9 → 1, 10 → 2, … 15 → 7). At start of turn 16 without victory → defeat ("Foreclosure"). Distinct from D11's end-of-turn debt interest (that one is the FaB mechanic on negative coins; this is the pacing clock). Both logged.
- D17: **Boss displacement immunity** — boss-type units (future content) are immune to push/pull: displacement actions targeting a boss no-op with log ("Boss holds ground"). Rule exists in the resolver now; no boss in the slice.
- D18: **Debt debuff layer** — enemies accumulate Debt stacks (Harpoon applies 1). Each stack = +1 damage taken from all damage sources. Stacks persist for the unit's lifetime. Displayed on the channel strip in red. Resolver applies damage = base + debt stacks.
- D19: **Pile expansion view** — clicking the deck/discard/sell instrument panels expands it into a full card-list view (modal side panel): deck shows card backs + count; discard shows top card face-up + count; sell pile shows sold cards in order; expanded view lists all cards in the pile; closes on click-away / Esc.
- D20: **Desk atmosphere polish** — needle tick audio on damage, lamp flicker animation on the transport/deck lamps, subtle desk material wear (texture detail on walnut frame), gentle animated scanline overlay across the desk; all motion suppressed under prefers-reduced-motion; audio suppressed under reduced motion (or reduced volume per platform norm).

## Requirements

### Functional Requirements

- FR-1: Battle renders 9×5 grid ("patch field") with Guppy + Loan Shark + Hustler at fixed positions.
- FR-2: Player turn: select unit → valid move cells highlight; click to move; adjacent enemy → attack with counterattack; play cards from hand; sell cards from hand; end turn.
- FR-3: Drag-to-board card play: hover card shows valid targets before drag; drag shows card ghost; drop on valid cell plays card; invalid drop rejected with desk-language reason near hand.
- FR-4: **Coin meter** (vertical ballistic needle, 0 baseline, red past zero to −5 credit limit), HP as VU needles per unit channel strip with exact numeral readout, deck/discard/sell counters as instrument panels.
- FR-5: End-turn transport keycap button (armed → amber, pressed → reset).
- FR-6: Enemy AI turn runs after player end-turn, then back to player with turn+1, coin reset to 0, draw.
- FR-7: Victory (all enemies dead) / defeat (Guppy HP ≤ 0 or foreclosure) → desk-lamp state + Restart button rebuilding the same battle.
- FR-8: prefers-reduced-motion honored: needles step to target, no overshoot; ticker keeps running.
- FR-9: Log in desk language (newest last), capped 50.
- FR-10: **Battle feel — transitions**: on victory, the desk transitions (master lamp goes green, needles settle) before the Restart state; on defeat, the debt lamp goes red and needles pin before the Restart state. Transitions are staged (single causal chain, no competing pulses) per des-1.
- FR-11: **Battle feel — particles**: attack impacts emit a hand-rolled particle burst on batched Graphics (sparks at the target tile); coin gain sparkles at the coin meter; suppression under prefers-reduced-motion.
- FR-12: **All 10 unique cards function** (per D8) — including armor expiration, displacement push/pull with bounds, AoE, draw, self-move without consuming action, coin gain; each card's targeting derives from its own effect.
- FR-13: **Keyboard shortcuts**: Space = end turn; Esc = deselect/close overlay; 1–5 = select a hand card (sets active card); S = sell the active/selected card. Shortcuts disabled during enemy turn / transitions.
- FR-14: **Log panel** visible in the desk showing the last N engine log lines (desk-language).
- FR-15: **First-battle hint strip** — brief hint text for new players (move/attack/play/sell/end turn), dismissible, shown only on the first battle of a session.
- FR-16: **Debug snapshot overlay** — toggle key shows engine snapshot JSON (units, coins, hand, valid targets) for playtesting.
- FR-17: **Audio** — Kenney CC0 SFX: card play, sell, attack impact, coin gain, end turn, victory, defeat; mute toggle; no audio under prefers-reduced-motion (or reduced volume per platform norm).
- FR-18: **Unit state lamps** — each channel strip shows move/attack remaining as small lamps; **enemy intent marker** — enemies telegraph which player unit they will attack (visible when actionable).
- FR-19: Unit armor displayed on channel strip (shield numeral/lamp); armor consumed before HP.
- FR-20: **Interest timer** — desk clock/interest gauge shows current interest due; escalating interest per D16; foreclosure at turn 16; end-of-turn debt interest per D11.
- FR-21: **Debt stacks** — enemies display Debt stacks in red on the strip; damage to a debted enemy = base + stacks (D18); stacks persist until death.
- FR-22: **Pile expansion** — deck/discard/sell panels expandable to full card lists (D19).
- FR-23: **Boss immunity rule** — displacement actions against boss-flagged units no-op with desk-language log (D17); flag exists on Unit model for future content.
- FR-24: **Atmosphere polish** — needle tick SFX on damage, lamp flicker, desk wear texture, scanline overlay (D20); all motion/audio suppressed under reduced motion.
- FR-25: **Sell flow** — selling a hand card: +coinValue coins, card to sellPile (visible), at end of turn sellPile goes to bottom of deck in sell order; selling respects hand-emptiness (no cards to sell → no-op log); selling does not consume move/attack.
- FR-26: **Credit & interest** — coins may go negative to −5; at end of turn, negative coins deal |coins| damage to Guppy (interest) then coins reset to 0.

### Non-Functional Requirements

- NFR-1: Pure engine tested via Vitest — unit tests per rule service + orchestration integration tests through the controller (init, play valid/invalid, unaffordable, move rules, attack+counterattack, counterattack-kill, enemy-turn within valid targets, coin sell/reset/credit/interest, draw, victory/defeat, resync fan-out exact-one-snapshot, active-card targets, armor absorption/expiry, displacement bounds, each unique card's effect, self-move card, interest escalation + foreclosure, debt-stack damage, boss-immunity no-op, pile state in snapshot, sell-pile-to-deck ordering).
- NFR-2: `tsc --noEmit` clean; `npx vitest run` green; `vite build` succeeds.
- NFR-3: 60 FPS target; screen-to-cell raycast via manual math (stage.toLocal + floor), not per-sprite hit tests.
- NFR-4: Grid metrics derive from engine constants (9×5), never canvas pixels; geometry recomputed on resize/DPR change.
- NFR-5: Svelte 5 runes only; PixiJS created/destroyed in `$effect` with full destroy; controller at module scope (HMR-safe); ticker reads snapshot via ref, deltaMS not setTimeout.
- NFR-6: pointer-events: none wrapper exempts the canvas element; interactive elements only on hand strips/transport.
- NFR-7: **Particles** — hand-rolled pool on shared GraphicsContext (v8 batches in one draw call), ticker.deltaMS, spawn-rate cap (burst ≤ 24), concurrent particles < 300, suppressed entirely under prefers-reduced-motion.
- NFR-8: **Audio** — small footprint; SFX loaded from Kenney assets; mute state persisted in-session; no blocking loads; audio context initialized on first user gesture (browser autoplay policy).
- NFR-9: Snapshot exposes deck/discard/sellPile card lists (for pile expansion) in addition to counts; snapshot exposes coins, creditLimit, interestDue.

## Acceptance Criteria

- [ ] AC-1: Battle loads with 9×5 grid, Guppy + Loan Shark + Hustler, coins 0, hand 5, correct deck count (20).
- [ ] AC-2: Selecting Guppy highlights valid move cells; clicking one moves her; clicking empty ground deselects; Esc deselects.
- [ ] AC-3: Attack adjacent enemy deals damage and counterattack resolves in one snapshot; unit-died removes unit.
- [ ] AC-4: Dragging a card shows its valid targets (hover and during drag); valid drop plays it (coins deducted, effect applied, card to discard); invalid drop rejected with reason; no state change.
- [ ] AC-5: End turn → enemy AI acts within valid targets → player turn 2 with coins reset to 0 and a drawn card. Space triggers end turn.
- [ ] AC-6: Coins start 0 each turn; credit limit −5; negative coins at end of turn → interest damage = |coins|, then reset. Hand max 5 with full-hand discard logged.
- [ ] AC-7: Victory and defeat both reachable; winner freezes further mutations; Restart rebuilds battle.
- [ ] AC-8: All orchestration + rule unit tests pass in Vitest; tsc clean; build succeeds.
- [ ] AC-9: prefers-reduced-motion: needles step, no overshoot; particle bursts suppressed.
- [ ] AC-10: Only red ink used for damage/debt/failure states (incl. negative coin zone).
- [ ] AC-11: Victory/defeat transition plays (lamp + needle pin) before Restart state is interactive.
- [ ] AC-12: Attack impact emits a particle burst at the target tile; coin gain sparkles at the meter (visible with motion enabled).
- [ ] AC-13: All 10 unique cards playable with correct effects: Strike/Slam single-target damage; Riptide AoE; Shell armor (absorbs then expires end of turn); Patches heal; Undercurrent push (bounds-respecting); Gulp +2 coins; Borrowed Time draw 2; Harpoon pull ≤2 + 1 Debt; Dart self-move without consuming move action.
- [ ] AC-14: Armor shown on strip; damage hits armor before HP; armor expires at end of owner's turn.
- [ ] AC-15: Unit state lamps show move/attack remaining; enemy intent marker telegraphs the enemy's attack target.
- [ ] AC-16: Log panel shows desk-language log; hint strip appears on first battle and is dismissible; debug overlay toggles; audio plays per event and mutes.
- [ ] AC-17: Interest: from turn 9, Guppy takes (turn−8) damage at her turn start; reaching turn 16 → defeat "Foreclosure".
- [ ] AC-18: Debt: Harpoon adds 1 stack; debted enemy takes base+stacks damage; stacks shown in red and persist until death.
- [ ] AC-19: Pile expansion: deck/discard/sell panels expand to full card lists and close on Esc/click-away; snapshot contains deck/discard/sellPile card lists.
- [ ] AC-20: Boss-immunity: displacement against a boss-flagged unit no-ops with log; rule unit-tested.
- [ ] AC-21: Atmosphere: needle-tick SFX on damage, lamp flicker, desk wear, scanline overlay present; all suppressed under reduced motion.
- [ ] AC-22: Sell: selling a card adds its coinValue to coins, moves it to sellPile; at end of turn sellPile cards move to bottom of deck in sell order; no cards → no-op logged.
- [ ] AC-23: Coin meter needle sits at 0 baseline at turn start; goes red past zero into the credit zone; credit clamped at −5.

## Scenarios

### Scenario 1: Normal Battle
**Given** a fresh battle (Guppy vs Loan Shark + Hustler)
**When** the player moves Guppy, attacks the adjacent Hustler, plays a Strike on the wounded Hustler, and ends turn
**Then** the Hustler takes damage + counterattacks once, an impact particle burst plays at the target, the played card leaves hand and coins are deducted, the enemy AI moves/attacks within valid targets, and turn 2 begins with coins reset to 0 and a draw

### Scenario 2: Sell for Coins
**Given** the player needs coins to play a 3-cost card and holds a Gulp (blue/3)
**When** they sell the Gulp (S key or drag to sell pile)
**Then** coins += 3, the Gulp moves to the sell pile panel, and at end of turn it returns to the bottom of the deck

### Scenario 3: Invalid Card Drop
**Given** the player drags a Strike card while adjacent to no enemy
**When** they drop it on an empty cell
**Then** the drop is rejected with a desk-language reason ("Range: adjacent"), coins and hand are unchanged, and the card returns to the hand

### Scenario 4: Credit & Interest
**Given** the player plays a 3-cost card with only 1 coin (borrowing 2)
**When** the turn ends
**Then** coins show −2 in the red credit zone at end of turn, Guppy takes 2 interest damage ("Interest due — Guppy pays 2"), then coins reset to 0

### Scenario 5: Armor & Displacement
**Given** Guppy played Shell (armor 2) and an adjacent enemy
**When** the enemy attacks Guppy for 2 and Guppy plays Undercurrent on the enemy
**Then** armor absorbs the 2 damage (HP unchanged), the enemy is pushed 1 tile away if the cell is empty (no-op + log if blocked), and armor expires at end of turn

### Scenario 6: Victory
**Given** both enemies are at low HP
**When** the player kills the last enemy
**Then** winner = player, further actions are no-ops, the victory transition plays (master lamp green, needles settle), then the Restart state appears and rebuilds the battle

### Scenario 7: Defeat by HP
**Given** Guppy is at low HP
**When** an enemy attack brings her HP to 0
**Then** winner = enemy, the debt lamp goes red and needles pin, then the Restart state appears and rebuilds the battle

### Scenario 8: Reduced Motion
**Given** the OS prefers-reduced-motion is set
**When** any damage lands or an attack resolves
**Then** the HP needle steps directly to its new value with no overshoot animation and no particle burst plays

### Scenario 9: Dodge vs Future Boss
**Given** the design intent of strong boss AoE attacks (future content)
**When** a boss telegraphs an AoE (via enemy intent marker) in a future battle
**Then** Dart lets Guppy move up to 2 tiles without consuming her move action, positioning her out of the AoE — the dodge card exists and functions in the slice

### Scenario 10: Interest Foreclosure
**Given** the battle reaches player turn 9 with enemies still alive
**When** each subsequent turn starts
**Then** Guppy takes (turn−8) interest damage, logged "Interest due — Guppy pays N"; if turn 16 arrives without victory, Guppy loses to "Foreclosure"

### Scenario 11: Debt Stacks
**Given** the Hustler has 1 Debt stack (from Harpoon) and 3 max HP
**When** Guppy deals 2 damage to it
**Then** the Hustler takes 3 damage (base 2 + 1 debt) and dies; the strip showed the red Debt lamp before the hit

### Scenario 12: Boss Holds Ground
**Given** a future boss-flagged unit exists on the board (rule fixture)
**When** Guppy plays Undercurrent/Harpoon targeting it
**Then** displacement no-ops with the log "Boss holds ground" and the boss position is unchanged

## Technical Notes

- Contract: `app/src/engine/contract.ts` (gate-1 reviewed; **to be revised for this model — economy: coins/creditLimit/interest replace mana; GameAction gains gain_armor / move_unit(displacement) / draw_cards / move_self / gain_coins / apply_debt, DROPS summon_unit and gain_mana; Card gains cost + coinValue + pitch color; CardType becomes 'action' (reserved: gear/ally); Unit gains armor + debt + boss flag; GameSnapshot gains coins, creditLimit, sellPile, deck/discard/sellPile card lists; EngineController gains sellCard — then re-reviewed via Oracle before implementation**).
- Engine layout: rule services (`grid.ts`, `combat.ts`, `cards.ts`, `economy.ts`, `ai.ts`) + controller (EngineController impl, orchestration tests). Pure TS, immutable snapshots, `import type` under verbatimModuleSyntax.
- Renderer: `app/src/render/` — PixiJS Application (await init), Graphics v8 chaining, stage-level pointermove + `stage.toLocal` raycast, ticker.deltaMS, renderer.on('resize') geometry rebuild, autoDensity+devicePixelRatio. Ballistic needle integrator = view state chasing snapshot; retargets latest value; reduced-motion branches inside integrator. Scanline overlay = subtle animated Graphics shader/filter layer.
- Particles (lib-2 verdict): hand-rolled pool `{x,y,vx,vy,life,size,color}` in one ticker callback, one shared GraphicsContext, spawn cap ≤ 24/burst, < 300 concurrent, gate on prefers-reduced-motion. NO @pixi/particle-emitter (v7-locked), NO Matter.js (hand springs suffice).
- Audio: Kenney CC0 SFX under `app/public/audio/`; WebAudio API, small AudioBuffer pool, mute toggle, context init on first gesture.
- UI: `app/src/ui/` — Svelte 5 runes; channel-strip hand (each card shows cost + coinValue + pitch color), coin meter, end-turn transport, hover inspection panel, drag source with ghost overlay node (separate from hand re-render); pointer-events discipline; log panel; hint strip; debug overlay; pile expansion panel (deck/discard/sell); interest gauge; sell affordance (drag to sell pile or S key).
- Bridge: `app/src/bridge/` — one subscribe fan-out; drag state written by Svelte, read by PixiJS.
- PixiJS v8.19 reference + physics/particles reference recorded in `.slim/deepwork/js-combat-slice.md`. FaB coin decision: @wiki/decisions/fab-coin-system; FaB action type: @wiki/decisions/fab-style-action-card-type.
- Cut/deferred: weighted-overshoot tuning (plain spring ships), stat hover card (basic readout only), needle-tremble invalid feedback (tint instead), overworld, persistence, deckbuilding, actual boss encounters (Dart + immunity rule exist for them; no boss in slice), mana springs, sell-pile reorder UI (order = sell order, deferred), i18n, settings menu.

## Open Questions

- [ ] OQ-1: Exact palette/typeface values for the desk (resolved in the build; world is committed, chromatic values are not).
- [ ] OQ-2: Whether the card ghost rides in DOM (Svelte) or canvas (PixiJS) — recommend canvas for consistent drag-over-board coordinate space; confirm during renderer build.
- [ ] OQ-3: Audio autoplay policy — browsers block audio until first user gesture; plan: initialize audio context on first click/keydown (locked in NFR-8).
- [ ] OQ-4: Interest start turn / escalation curve — D16 locks turn 9 start, +1/turn; tuning can move the dial without rule changes.
- [ ] OQ-5: Coin values per card (red/yellow/blue 1/2/3) are initial balance; tuning pass may adjust without rule changes.