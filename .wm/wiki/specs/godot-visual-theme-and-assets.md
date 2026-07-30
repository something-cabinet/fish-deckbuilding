---
title: Godot Visual Theme & Asset Pipeline
type: spec
id: wiki:specs:godot-visual-theme-and-assets
status: draft
tags: [godot, ui, theming, assets, design]
---

---
title: Godot Visual Theme & Asset Pipeline
type: spec
status: draft
tags: [godot, ui, theming, assets, design]
---

## Overview

Build a shared Godot Theme resource system defining the visual identity of the game: color palette, panel styles, button styles, font hierarchy, and tile/bracket overlay sprites. Create the asset pipeline for unit sprites, card frames, HUD elements, and battle backgrounds. This replaces the old CSS custom-property theming plan and provides a single source of truth for all visual styling.

## Locked Decisions

- D1: **Godot Theme resource** — Single `theme.tres` applied project-wide. All UI nodes reference the Theme for colors, styles, and fonts. No hardcoded colors in scenes.
- D2: **Color palette** — Underwater/fish/debt theme (from designer analysis):
  | Role | Hex | Usage |
  |------|-----|-------|
  | Deep ocean bg | `#0B1F2A` | Battle backdrop, default clear color |
  | UI panels | `#1A3A4A` | Modal frames, panel backgrounds |
  | Mana/highlights | `#00E5FF` | Mana gems, selected tiles, highlights |
  | Gold/attack | `#FFD700` | Attack tiles, ATK stats, gold currency |
  | Danger/enemy | `#FF6B6B` | Enemy tiles, HP loss, nerf |
  | Buff/summon | `#00BFA5` | Summon tiles, buffs, healing |
  | Text primary | `#E8F1F2` | Labels, descriptions |
  | Text secondary | `#90C6C8` | Flavor text, inactive UI |
- D3: **Asset folder convention** — All assets under `godot/assets/` with subdirectories: `ui/`, `tiles/`, `units/`, `cards/`, `fx/`, `maps/`.
- D4: **Sprite approach** — Pixel-art unit sprites authored in Aseprite, exported as PNG sprite sheets, imported as Godot SpriteFrames. In-game display size ~100px. Source sheets 256×1024.
- D5: **Corner-bracket overlay system** — Tile overlays use 4-bit neighbor-mask quarter-bracket sprites (move=white, attack=gold, summon=green, spell=blue). 16 tile variants per color (4 corners × 4 neighbor combinations).
- D6: **Card frame approach** — Static card backgrounds (224×294 source) with type-specific frames: Attack (red tint), Armor (blue), Skill (purple), Summon (green), Passive (gray). Mana gem, ATK/HP badges rendered as separate overlays.

## Requirements

### Functional Requirements

- FR-1: `godot/ui/theme.tres` defines:
  - DefaultPanel style (slate-cyan fill, bright-cyan border, 4px rounded corners)
  - DefaultButton style (dark teal fill, gold hover state, gold border)
  - DefaultLabel settings (Atkinson Hyperlegible font, primary text color)
  - DefaultProgressBar (coral fill for HP, cyan for mana, dark bg)
  - Color overrides for all palette colors (can be referenced in GDScript/Rust)
  - StyleBox variants: `panel_dark`, `panel_light`, `panel_gold_border`, `panel_danger`
- FR-2: Font resources:
  - `ui/fonts/AtkinsonHyperlegible-Regular.ttf` — Body text, card descriptions, UI labels
  - `ui/fonts/AtkinsonHyperlegible-Bold.ttf` — Headers, card names, HUD values
  - Font sizes: HUD values 18px, card names 14px, card text 11px, UI buttons 16px, body 14px
- FR-3: Tile overlays (corner brackets):
  - `assets/tiles/bracket_move.png` — 64×64 quarter-bracket (white/near-white, for valid move targets)
  - `assets/tiles/bracket_attack.png` — 64×64 quarter-bracket (gold, for attackable targets)
  - `assets/tiles/bracket_summon.png` — 64×64 quarter-bracket (seafoam green, for summon locations)
  - `assets/tiles/bracket_spell.png` — 64×64 quarter-bracket (cyan, for spell targeting)
  - `assets/tiles/tile_base.png` — 128×128 base tile with subtle wave pattern (dark teal)
  - `assets/tiles/tile_alt.png` — 128×128 alt tile (slightly different shade for checkerboard)
  - `assets/tiles/tile_mana_spring.png` — 128×128 mana spring tile (cyan accent, rune overlay)
- FR-4: Unit sprites (Phase 1):
  - `assets/units/guppy.ase` → `assets/units/guppy_sheet.png` — Hero idle, breathing, attack
  - `assets/units/shark_enforcer.ase` → `assets/units/shark_enforcer_sheet.png` — Enemy idle, breathing, attack
  - In-game display: ~80×80 to 100×100 px (scaled down from source)
  - AnimatedSprite2D with SpriteFrames imported from sprite sheet
- FR-5: Card frames (Phase 1):
  - `assets/cards/card_attack.png` — 224×294, red-tinted frame
  - `assets/cards/card_armor.png` — 224×294, blue-tinted frame
  - `assets/cards/card_skill.png` — 224×294, purple-tinted frame
  - `assets/cards/card_summon.png` — 224×294, green-tinted frame
  - `assets/cards/card_passive.png` — 224×294, gray-tinted frame
  - `assets/cards/icon_mana.png` — mana cost badge (cyan gem, ~24×24)
  - `assets/cards/icon_atk.png` — ATK badge (gold, ~20×20)
  - `assets/cards/icon_hp.png` — HP badge (red, ~20×20)
  - `assets/cards/icon_rarity_common.png` — gray diamond
  - `assets/cards/icon_rarity_uncommon.png` — blue diamond
  - `assets/cards/icon_rarity_rare.png` — gold diamond
  - `assets/cards/icon_rarity_legendary.png` — rainbow diamond
- FR-6: HUD elements:
  - `assets/ui/bottom_panel.png` — 1280×160 background for hand area (dark teal, subtle wave gradient)
  - `assets/ui/end_turn_button.png` / `_hover.png` / `_disabled.png` — End Turn button states
  - `assets/ui/mana_bubble.png` — Individual mana point indicator (cyan bubble)
  - `assets/ui/turn_banner.png` — "Your Turn" / "Enemy Turn" banner background
  - `assets/ui/action_pip_move.png` — Move action pip (boot icon, green/gray states)
  - `assets/ui/action_pip_attack.png` — Attack action pip (sword icon, green/gray states)
- FR-7: Battle background:
  - `assets/maps/battle_bg_001.png` — 1280×720 underwater arena background (dark ocean, coral silhouettes, light rays from surface)
  - Optional: middle-ground parallax layer (coral spires, sunken ruins)
- FR-8: Tile overlay rendering (gdext bridge):
  - Neighbor-mask computation: for each highlighted tile, check 4 cardinal neighbors for same highlight → 4-bit mask → select correct quarter-sprite rotation (0°/90°/180°/270°)
  - Layer order (bottom to top): board → move tiles → attack tiles → summon tiles → spell tiles → unit → hover/select
  - Overlay tiles are instanced Sprite2D nodes under a Node2D per layer, created/destroyed on highlight change

### Non-Functional Requirements

- NFR-1: Theme resource is the single source of truth for all Control node styling. No hardcoded colors in `.tscn` files.
- NFR-2: Asset loading uses Godot's built-in resource system (`.import`). No runtime asset fetching.
- NFR-3: Overlay rendering must handle 45 tiles (9×5) at 60fps. Corner-bracket sprites are 4× per tile max = 180 sprites. Object-pooling reused per frame.
- NFR-4: Unit sprites optimized for `gl_compatibility` renderer (no custom shaders for Phase 1). CPUParticles2D for FX.

## Acceptance Criteria

- [ ] AC-1: `theme.tres` exists and is referenced by all battle and menu scenes
- [ ] AC-2: All UI nodes use theme colors/styles, no hardcoded colors in scenes
- [ ] AC-3: Font resources load correctly, all text uses Atkinson Hyperlegible
- [ ] AC-4: Tile corner-bracket overlays render correctly for all 16 neighbor-mask variants per color
- [ ] AC-5: Move (white), attack (gold), summon (green), spell (cyan) overlays all render with correct colors
- [ ] AC-6: Base board tiles render in checkerboard pattern (two tile variants)
- [ ] AC-7: Mana spring tile renders with distinct cyan-tinted appearance
- [ ] AC-8: Guppy unit sprite displays with idle animation on the grid
- [ ] AC-9: Shark Enforcer sprite displays with idle animation on the grid
- [ ] AC-10: Card frames render correctly for all 5 card types (attack, armor, skill, summon, passive)
- [ ] AC-11: Mana gem, ATK/HP badges display on cards
- [ ] AC-12: Bottom panel, end turn button, turn banner render in HUD
- [ ] AC-13: Battle background renders behind the grid
- [ ] AC-14: Overlay rendering at 60fps with no perceptible jank on 9×5 grid
- [ ] AC-15: Asset folder structure follows the convention in FR-6

## Scenarios

### Scenario 1: Theme Applied Globally
**Given** `theme.tres` is the project's default Theme
**When** a new Panel node is added to a scene
**Then** it uses the dark-teal fill and cyan border from the theme
**When** a Button is added
**Then** it uses the dark-teal fill, gold hover state, and correct font
**When** a Label is added
**Then** it uses Atkinson Hyperlegible with primary text color

### Scenario 2: Move Overlay Renders
**Given** the player clicks Guppy to see move range
**When** the overlay is built
**Then** 4-bit neighbor mask is computed for each highlighted tile
**Then** quarter-bracket sprites are placed at each tile corner
**Then** white brackets form a continuous perimeter around the move range
**When** the player clicks away
**Then** all overlay sprites are removed

### Scenario 3: Unit Sprite Animation
**Given** Guppy is placed on the grid
**When** the battle scene runs
**Then** Guppy displays at ~80×80 px with the idle/breathing animation looping
**When** Guppy attacks
**Then** the attack animation plays once

### Scenario 4: Battle Background
**Given** a battle starts
**When** the grid renders
**Then** the 1280×720 underwater background shows behind the board
**Then** the background tile is dark teal with light ray effects

## Technical Notes

- Theme: created in Godot editor via `Project → Theme → New ThemeResource`. Saved as `godot/ui/theme.tres`.
- StyleBoxFlat for all panels/buttons (no 9-patch images needed for Phase 1).
- Corner bracket neighbor mask algorithm (pure Rust or GDScript):
  ```
  fn compute_mask(tile_x, tile_y, highlighted: &HashSet<(i32,i32)>) -> u8 {
      let mut mask = 0u8;
      if highlighted.contains(&(tile_x, tile_y - 1)) { mask |= 0b0001; } // N
      if highlighted.contains(&(tile_x + 1, tile_y)) { mask |= 0b0010; } // E
      if highlighted.contains(&(tile_x, tile_y + 1)) { mask |= 0b0100; } // S
      if highlighted.contains(&(tile_x - 1, tile_y)) { mask |= 0b1000; } // W
      mask
  }
  ```
  The mask determines which of 16 bracket variants to use per corner, rotated per tile position.
- Sprite animation: Godot `AnimatedSprite2D` with `SpriteFrames` imported from sprite sheet. Animations: `idle`, `attack`, `death`.
- Tile rendering: `Node2D` per layer. Clear children, instantiate `Sprite2D` for each overlay tile, set texture/position/rotation from mask.
- Asset import: all `.png` assets placed in `godot/assets/` are auto-imported by Godot. No special import presets needed for Phase 1 (2D Texture default).
- Sprite sheets imported as `SpriteFrames` via the Godot editor's SpriteFrames resource. Animation regions set manually.
- Color palette applied via Godot's Theme color overrides. Rust/gdext code references theme colors by name via `theme.get_color("mana", "GameUI")`.

## Open Questions

- [ ] OQ-1: Should bracket sprites be authored as full-tile corner sets or individual quarter-tiles? → Individual quarter-tiles (64×64 each) — simpler to rotate, fewer texture combinations.
- [ ] OQ-2: Font licensing? → Atkinson Hyperlegible is SIL Open Font License (free for commercial).
- [ ] OQ-3: Should we use Godot's TileMapLayer for the board floor? → No — Node2D with instanced Sprite2D textures is simpler and doesn't require TileSet setup for our flat 9×5 grid.
- [ ] OQ-4: Placeholder sprites? → Use colored rectangles (ColorRect) for Phase 1 prototyping. Replace with actual art as assets are created.