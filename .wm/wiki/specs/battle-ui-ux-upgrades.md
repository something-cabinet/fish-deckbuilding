---
title: Battle UI/UX Upgrades
type: spec
tags: [ui, ux, battle, godot, gdext]
status: approved
priority: high
confidence: high
---

---
title: Battle UI/UX Upgrades
type: spec
status: approved
tags:
- ui
- ux
- battle
- godot
- gdext
priority: high
confidence: high
---

## Overview

Improve gameplay feedback in the Godot battle scene by adding visual and interactive feedback for core combat actions. The current system is functional but silent — attacks deal damage without numbers, units teleport when moving, and the enemy turn resolves in a single frame. This spec covers high- and medium-priority upgrades that make the tactical loop readable, satisfying, and learnable. Updated to include valid target highlighting for card play and hover preview of enemy movement/attack ranges (Duelyst parity).

## Locked Decisions

- **D1:** Scope = all high + medium priority items (floating damage, hit flash, unit slide tween, enemy turn banner, stepped enemy pacing, card hover/tooltip, card play animation, mana preview glow, AOE targeting preview, cannot-play dimming, selection indicator, action-point pips, death dissolve tween, combat log panel, **card size increase and internal layout repositioning**, **valid target highlighting**, **hover preview of enemy ranges**)
- **D2:** Visual style = Color-coded flat (red damage, green heal, blue shield), moderate size, slight outline for dark background contrast
- **D3:** Enemy turn pacing = Turn banner + variable delays per action type (move = 0.4s, attack = 0.8s, card play = 1.0s), no skip button
- **D4:** Card hover = lift up (y -10px) + brighter bg + expanded tooltip panel above with full description
- **D5:** Valid target highlighting = When a card is selected for play, only valid target tiles are highlighted (yellow/gold). Invalid tiles are dimmed or show a no-entry indicator.
- **D6:** Hover preview of enemy ranges = When hovering over an enemy unit, show its movement range (white overlay) and attack range (red overlay) in real-time. Updates as mouse moves between enemies.

## Requirements

### Functional Requirements

- **FR-1:** Floating damage numbers — When any unit takes damage, healing, or counter-attack damage, a number appears at the unit position, floats upward, and fades out over 0.8s. Damage and counter-attack damage are red, healing is green, shield gain is blue.
- **FR-2:** Hit flash — When a unit takes damage, its body panel flashes white for 0.15s via modulate tween.
- **FR-3:** Unit slide tween — When a unit moves, it slides from old position to new position over 0.3s instead of teleporting.
- **FR-4:** Enemy turn banner — A centered panel/label appears at the start of the enemy turn ("Enemy Turn..."), fades in over 0.3s, stays for the duration, then fades out.
- **FR-5:** Stepped enemy actions — Enemy turn executes with a delay between each action: move = 0.4s, attack = 0.8s, card play = 1.0s. Each step updates the board visually before the next begins.
- **FR-6:** Card hover tooltip — On mouse hover, a card lifts up (y -10px), background brightens, and a tooltip panel appears above the card showing full name, cost, and detailed effect description.
- **FR-7:** Card play animation — When a card is played, it scales down to 0 and fades out over 0.25s before disappearing from the hand.
- **FR-8:** Mana preview glow — Cards that are playable (cost <= current mana) receive a subtle bright border glow; unplayable cards are desaturated/dimmed.
- **FR-9:** AOE targeting preview — When in card targeting mode, affected tiles are highlighted in real-time as the mouse moves over different grid cells. The preview updates dynamically to show all tiles within the AOE range of the currently hovered cell before the player clicks to confirm.
- **FR-10:** Cannot-play dimming — Unplayable cards have opacity 0.5 and desaturated background color.
- **FR-11:** Selection indicator — The currently selected unit gets a bright outline ring in addition to the existing glow.
- **FR-12:** Action-point pips — Small check/cross icons on each unit indicating whether move and attack actions are still available this turn.
- **FR-13:** Death dissolve tween — When a unit dies, it scales down to 0 over 0.3s while fading out, then is removed.
- **FR-14:** Combat log panel — A small scrollable text panel on the right side of the screen shows the last 10 game events (e.g., "Hero dealt 2 damage to Enemy", "Enemy moved to (3,1)"). The log persists across turns within a single battle and is cleared when a new battle starts.
- **FR-15:** Card size and layout — Cards are increased from 110x90 to approximately 150x120 pixels. Internal elements are repositioned for readability: card name at top in a larger, bold label area; mana cost displayed as a prominent circular badge in the top-right corner; effect description in a dedicated lower section with 20+ pixels of vertical space and comfortable padding (minimum 8px from edges). Hand container spacing and overall hand width are adjusted to fit the larger cards without overlap.
- **FR-16:** **Valid target highlighting** — When a card is selected (card targeting mode), compute all tiles within the card's Range from the caster. If the card has an AoE component, compute all valid center tiles and their blast areas. Overlay valid tiles with a gold/yellow highlight. Non-valid tiles get no highlight or a dim overlay. Preview updates in real-time as the player moves the mouse (dynamic tile filtering).
- **FR-17:** **Hover preview of enemy ranges** — When the mouse hovers over an enemy unit for >0.2s (debounce), compute and display the enemy's movement range (white semi-transparent overlay) and attack range (red semi-transparent overlay) on the grid. When the mouse moves away, clear the overlays. If multiple enemies are hovered in quick succession, debounce to avoid flickering.

### Non-Functional Requirements

- **NFR-1:** All visual feedback must be driven from the gdext bridge (`rust/src/bridge/battle_scene.rs`) — core Rust logic remains pure and testable.
- **NFR-2:** Enemy turn pacing must not block the main thread; use Godot's tween/Timer system.
- **NFR-3:** Performance — No more than 20 additional nodes created per turn; object pooling preferred where practical.
- **NFR-4:** Maintain existing color palette and flat-panel aesthetic.
- **NFR-5:** Hover preview of enemy ranges must not conflict with click-to-select (mouse enter/exit events separated from click events).
- **NFR-6:** Valid target highlighting must recompute in < 5ms per mouse move (no perceptible lag).

## Acceptance Criteria

- [ ] **AC-1:** Dealing damage shows red floating number, counter-attack damage also shows red number, healing shows green, shield shows blue.
- [ ] **AC-2:** Taking damage triggers white flash on the unit body for 0.15s.
- [ ] **AC-3:** Moving a unit plays a 0.3s position tween instead of instant teleport.
- [ ] **AC-4:** Enemy turn starts with "Enemy Turn..." banner visible for the full duration.
- [ ] **AC-5:** Each enemy action (move, attack, card) has a visible delay and updates the board before the next action.
- [ ] **AC-6:** Hovering a playable card lifts it, brightens bg, and shows full tooltip text.
- [ ] **AC-7:** Playing a card scales it down and fades it out before hand update.
- [ ] **AC-8:** Playable cards glow; unplayable cards are dimmed (opacity 0.5).
- [ ] **AC-9:** In card targeting mode, AOE preview highlights all tiles that will be affected and updates dynamically as the mouse moves over different tiles.
- [ ] **AC-10:** Selected unit has a bright ring outline.
- [ ] **AC-11:** Action pips (move/attack) show checkmark when available, cross when used.
- [ ] **AC-12:** Dying unit scales to 0 and fades over 0.3s.
- [ ] **AC-13:** Combat log shows the last 10 events, auto-scrolls, persists across turns, and resets at battle start.
- [ ] **AC-14:** Cards are visibly larger than before (target ~150x120), with clear visual hierarchy: name at top, cost as corner badge, effect text in a spacious lower panel. No text overlaps or cramped edges.
- [ ] **AC-15:** Selecting a card for play highlights only valid target tiles in gold. Invalid tiles are not highlighted.
- [ ] **AC-16:** Hovering an enemy for >0.2s shows its move range (white) and attack range (red).
- [ ] **AC-17:** Enemy range overlays clear within 0.1s of mouse leaving the enemy.
- [ ] **AC-18:** Hover preview does not interfere with click-to-select or drag actions.

## Scenarios

### Scenario 1: Player attacks enemy
**Given** the player has selected their hero and an adjacent enemy is highlighted
**When** the player clicks the enemy
**Then** the enemy takes damage, a red floating number appears, the enemy flashes white, and the combat log records the hit.

### Scenario 2: Enemy turn resolves
**Given** the player ends their turn
**When** the enemy turn begins
**Then** an "Enemy Turn..." banner appears, and each enemy action (move → attack → card) executes with a visible pause between steps.

### Scenario 3: Card hover discoverability
**Given** the player has cards in hand
**When** the player hovers over a card with a complex effect
**Then** the card lifts, brightens, and a tooltip shows the full effect text.

### Scenario 4: Unit death
**Given** a unit is reduced to 0 HP
**When** the damage is applied
**Then** the unit flashes white, a floating number appears, then the unit shrinks to nothing over 0.3s and is removed.

### Scenario 5: AOE card targeting
**Given** the player selects an AOE damage card
**When** the card targeting mode activates
**Then** all tiles within the AOE range of the hovered grid cell are highlighted before the player confirms.

### Scenario 6: Valid target highlighting
**Given** the player selects a card with Range 3, AoE 2
**When** card targeting mode activates
**Then** all tiles within range 3 of the hero are highlighted gold
**Then** tiles outside range 3 are dimmed/not highlighted
**When** the player moves the mouse over a highlighted center tile
**Then** the cross AoE blast area is shown on top of the gold tiles

### Scenario 7: Enemy hover preview
**Given** an enemy unit is on the grid at position (4, 2) with move_points = 2, attack_range = 1
**When** the player hovers the mouse over the enemy for 0.2s
**Then** a white overlay shows all tiles the enemy can reach (BFS budget 2)
**Then** a red overlay shows all tiles adjacent to the enemy (attack range 1)
**When** the player moves the mouse away
**Then** the overlays clear

## Technical Notes

- All changes are in `rust/src/bridge/battle_scene.rs` unless noted.
- Floating numbers: spawn a `Label` node, tween `position.y` up by 40px and `modulate.alpha` to 0 over 0.8s, then `queue_free()`.
- Hit flash: tween `modulate` to white (rgb(255,255,255)) over 0.05s, then back to original over 0.1s.
- Unit slide: instead of full rebuild in `sync_visuals_ref()`, detect position changes and tween `position` on the existing `Node2D`.
- Enemy banner: toggle visibility + modulate tween on a new `Label` node under `UI/`.
- Stepped enemy turn: refactor `run_enemy_turn()` to use a sequence of Godot `Tween`s or `Timer`s with callbacks. May require exposing per-action hooks from `rust/src/core/battle/ai/decide.rs`.
- Card hover: detect mouse position in `input()` or use Godot `Control` mouse-entered signals. Tooltip is a new `Panel` + `Label` nodes under `UI/`.
- Card play animation: tween `scale` to 0 and `modulate.alpha` to 0 on the `CardSlot` panel before calling `sync_hand_ref()`.
- AOE preview: reuse `show_move_overlay()` logic but with a different color (e.g., orange tint) for predicted AOE tiles.
- Action pips: add two small `Label` nodes (or `ColorRect` dots) per unit root — "M" and "A" that are green/gray based on `moves_made` / `attacks_made`.
- Death tween: tween `scale` to `Vector2(0,0)` and `modulate.alpha` to 0 over 0.3s, then remove from `Units` node.
- Combat log: `RichTextLabel` under `UI/`, append lines with `push_color()` for damage/heal/shield differentiation.
- **Valid target highlighting**: New overlay layer `TargetOverlay` (Node2D with ColorRect children). On card select, core computes `fn get_valid_targets(card: &CardDef, caster_pos, state: &BattleState) -> Vec<GridCoord>` — filters by range and valid target type. Bridge renders gold tiles on the overlay layer. On mouse move, `input()` updates the hovered tile; if within valid set, shows cross-blast for AoE cards.
- **Hover preview**: `_input()` tracks mouse position mapped to grid tile. If over an enemy tile, debounce 0.2s, then call `show_enemy_range(enemy_id)` which computes BFS + attack tiles and renders overlays. On mouse exit, clear overlays. Use a `hover_timer: Timer` node for debounce.

## Open Questions

- **Should counter-attack damage get its own floating number and flash?** → Yes, answered.
- **Should the combat log persist across turns or reset each battle?** → Persist across turns; reset at battle start.
- **Should the AOE preview update dynamically as the mouse moves over different tiles during targeting?** → Yes, answered.
- **Should valid target highlighting update during mouse move?** → Yes, answered — dynamic filtering.
- **Should enemy hover preview have a debounce?** → Yes, 0.2s to prevent flickering when scanning across enemies.