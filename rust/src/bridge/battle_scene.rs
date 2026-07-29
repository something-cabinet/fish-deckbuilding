
use godot::classes::tween::{EaseType, TransitionType};
use godot::classes::notify::CanvasItemNotification;
use godot::classes::control::MouseFilter;
use godot::classes::{
    Button, CanvasLayer, ColorRect, INode2D, InputEvent, InputEventMouseButton, Label, Line2D, Node2D,
    Panel, ProgressBar, StyleBox, StyleBoxFlat,
};
use godot::classes::text_server::AutowrapMode;
use godot::global::MouseButton;
use godot::prelude::*;

use crate::core::{
    battle::{self as battle_engine, BattleResult, BattleState, Phase},
    constants, grid::movement as grid_movement,
    grid::{Faction, GridUnit},
    cards::{CardEffect, Effect, cross_aoe},
};

fn chebyshev_adjacent(a: (i32, i32), b: (i32, i32)) -> bool {
    (a.0 - b.0).abs().max((a.1 - b.1).abs()) == 1
}

enum Corner { TL, TR, BL, BR }

fn hex(v: u8) -> f32 {
    v as f32 / 255.0
}

fn rgb(r: u8, g: u8, b: u8) -> Color {
    Color::from_rgb(hex(r), hex(g), hex(b))
}

fn rgba(r: u8, g: u8, b: u8, a: f32) -> Color {
    Color::from_rgba(hex(r), hex(g), hex(b), a)
}

fn screen_to_grid(pos: Vector2) -> Option<(i32, i32)> {
    let gx = pos.x - constants::GRID_ORIGIN_X as f32;
    let gy = pos.y - constants::GRID_ORIGIN_Y as f32;
    if gx < 0.0 || gy < 0.0 {
        return None;
    }
    let tx = (gx / constants::TILE_SIZE as f32) as i32;
    let ty = (gy / constants::TILE_SIZE as f32) as i32;
    if !(0..constants::GRID_WIDTH).contains(&tx) || !(0..constants::GRID_HEIGHT).contains(&ty) {
        return None;
    }
    Some((tx, ty))
}

#[derive(GodotClass)]
#[class(base=Node2D)]
pub struct BattleScene {
    state: Option<BattleState>,
    selected: Option<(i32, i32)>,
    valid_moves: Vec<(i32, i32)>,
    animating: bool,
    card_targeting: bool,
    selected_card_index: usize,
    selected_card_effect_idx: usize,
    #[export]
    debug_unhandled_input_calls: i32,
    #[export]
    debug_click_events_received: i32,
    base: Base<Node2D>,
}

#[godot_api]
impl INode2D for BattleScene {
    fn init(base: Base<Node2D>) -> Self {
        Self {
            state: None,
            selected: None,
            valid_moves: Vec::new(),
            animating: false,
            card_targeting: false,
            selected_card_index: 0,
            selected_card_effect_idx: 0,
            debug_unhandled_input_calls: 0,
            debug_click_events_received: 0,
            base,
        }
    }

    fn ready(&mut self) {
        self.build_grid();
        self.build_ui();
        self.start_battle();
        self.connect_signals();
    }

    /// Reconnect typed signals after hot-reload.
    ///
    /// Godot auto-disconnects typed signal closures before unloading the old
    /// library, so they must be re-bound after the new library loads.  This
    /// method is called from both `ready()` and `EXTENSION_RELOADED` to
    /// keep signal bindings alive across reload cycles.
    fn on_notification(&mut self, what: CanvasItemNotification) {
        if what == CanvasItemNotification::EXTENSION_RELOADED {
            godot_print!("[BattleScene] EXTENSION_RELOADED — reconnecting signals + refreshing UI");
            self.connect_signals();
            self.sync_all();
        }
    }

    fn input(&mut self, event: Gd<InputEvent>) {
        if self.animating { return; }
        let Ok(mouse) = event.try_cast::<InputEventMouseButton>() else { return };
        self.debug_click_events_received += 1;
        if !mouse.is_pressed() || mouse.get_button_index() != MouseButton::LEFT { return; }

        let pos = mouse.get_position();

        // Check card hand clicks (bottom area)
        if pos.y >= 600.0 && pos.y <= 720.0 && pos.x >= 300.0 && pos.x <= 900.0 {
            let card_idx = ((pos.x - 300.0) / 120.0) as i32;
            if (0..5).contains(&card_idx) {
                self.on_card_click(card_idx);
                return;
            }
        }

        // Card targeting mode: click on grid to resolve card effect
        if self.card_targeting {
            let Some(grid_pos) = screen_to_grid(pos) else { return };
            let Some(s) = self.state.as_mut() else { return };
            let card = s.play_card(self.selected_card_index);
            let Some(card) = card else { self.card_targeting = false; self.sync_all(); return; };
            for effect in &card.effects {
                Self::apply_card_effect(s, effect, grid_pos);
            }
            self.card_targeting = false;
            self.clear_selection();
            self.sync_all();
            return;
        }

        // Grid clicks for movement/attack
        let Some(grid_pos) = screen_to_grid(pos) else { return };
        self.handle_click(grid_pos);
    }
}

#[godot_api]
impl BattleScene {
    #[func]
    fn on_end_turn(&mut self) {
        if !self.end_player_turn_if_valid() { return; }
        self.card_targeting = false;
        self.sync_ui_ref();
        self.run_enemy_turn();
        self.sync_all();
    }

    fn end_player_turn_if_valid(&mut self) -> bool {
        let s = match self.state.as_mut() {
            Some(s) => s,
            None => return false,
        };
        if s.phase != Phase::PlayerTurn { return false; }
        battle_engine::end_player_turn(s);
        true
    }

    fn run_enemy_turn(&mut self) {
        self.animating = true;
        if let Some(s) = self.state.as_mut() {
            battle_engine::execute_enemy_turn(s);
        }
        self.animating = false;
    }

    #[func]
    fn on_restart(&mut self) {
        self.start_battle();
    }

    #[func]
    fn on_replace(&mut self) {
        let Some(s) = self.state.as_mut() else { return };
        if s.phase != Phase::PlayerTurn { return; }
        let idx = 0;
        if s.replace_card(idx) {
            self.sync_all();
        }
    }

    #[func]
    fn on_card_click(&mut self, hand_index: i32) {
        let idx = hand_index as usize;
        let Some(s) = self.state.as_mut() else { return };
        if s.phase != Phase::PlayerTurn { return; }
        if !s.can_play_card(idx) { return; }

        let card = &s.hand.cards[idx].clone();
        let has_self_target = card.effects.iter().any(|e| e.range == 0);
        let has_targeted = card.effects.iter().any(|e| e.range > 0);

        if has_targeted && !has_self_target {
            self.card_targeting = true;
            self.selected_card_index = idx;
            self.selected_card_effect_idx = 0;
            godot_print!("[BattleScene] Select a target for {}", card.name);
            self.sync_ui_ref();
            return;
        }

        let card = s.play_card(idx);
        let Some(card) = card else { return };
        let hero_pos = s.grid.find_faction(Faction::Hero).first().copied();
        if let Some(hero) = hero_pos {
            for effect in &card.effects {
                Self::apply_card_effect(s, effect, hero);
            }
        }
        self.card_targeting = false;
        self.clear_selection();
        self.sync_all();
    }

    /// Test-click at grid coordinate (gx, gy) — bypasses Godot's input pipeline.
    /// Calls handle_click directly so we can test the selection/move logic
    /// from GDScript/RuntimeTest without needing real mouse events.
    #[func]
    fn test_click(&mut self, gx: i32, gy: i32) {
        godot_print!("[RT:OK] test_click at grid ({}, {})", gx, gy);
        self.handle_click((gx, gy));
        // Print debug state after click
        match self.selected {
            Some((x, y)) => godot_print!("[RT:PRINT] selected = ({}, {})", x, y),
            None => godot_print!("[RT:PRINT] selected = None"),
        }
        godot_print!("[RT:PRINT] valid_move_count = {}", self.valid_moves.len());
    }

    #[func]
    fn debug_input_count(&self) {
        godot_print!("[RT:PRINT] unhandled_input calls = {}", self.debug_unhandled_input_calls);
        godot_print!("[RT:PRINT] click events received = {}", self.debug_click_events_received);
    }

    #[func]
    fn debug_state(&self) {
        match &self.state {
            Some(s) => {
                godot_print!("[RT:PRINT] turn = {}, mana = {}/{}", s.turn_number, s.mana, s.max_mana);
                let p = match s.phase {
                    Phase::PlayerTurn => "PlayerTurn",
                    Phase::EnemyTurn => "EnemyTurn",
                    Phase::BattleOver => "BattleOver",
                };
                godot_print!("[RT:PRINT] phase = {}", p);
                godot_print!("[RT:PRINT] units = {}", s.grid.units.len());
                godot_print!("[RT:PRINT] hand = {}, deck = {}, gy = {}", s.hand.len(), s.deck.len(), s.graveyard.len());
                godot_print!("[RT:PRINT] enemy_hand = {}, enemy_deck = {}", s.enemy_hand.len(), s.enemy_deck.len());
                for (pos, unit) in &s.grid.units {
                    godot_print!("[RT:PRINT]   unit at ({},{}): faction={:?} hp={} atk={} moved={} attacked={} alive={}",
                        pos.0, pos.1, unit.faction, unit.hp, unit.atk, unit.has_moved, unit.has_attacked, unit.alive);
                }
            }
            None => godot_print!("[RT:PRINT] state = None"),
        }
    }

    fn connect_signals(&self) {
        let self_gd = self.to_gd();
        let end_btn = self.base().get_node_as::<Button>("UI/EndTurnButton");
        end_btn.signals().pressed().connect_other(&self_gd, BattleScene::on_end_turn);
        let banner = self.base().get_node_as::<Panel>("UI/ResultBanner");
        let restart_btn = banner.get_node_as::<Button>("RestartButton");
        restart_btn.signals().pressed().connect_other(&self_gd, BattleScene::on_restart);
        let replace_btn = self.base().get_node_as::<Button>("UI/ReplaceButton");
        replace_btn.signals().pressed().connect_other(&self_gd, BattleScene::on_replace);
    }
}


// ---------------------------------------------------------------------------
// Visual & UI helpers
//
// The BattleScene struct stores no `#[export]` fields.  All game state is
// ephemeral: `init()` creates a blank scene, and `ready()` / `start_battle()`
// populate it fresh.  This means hot-reload always resets the battle — which
// is fine for the prototype.  If mid-battle state preservation across reload
// is desired later, add `#[export]` fields on the struct with `#[init(val =
// ...)]` defaults.  Godot serialises export fields before unloading the old
// library and restores them onto the fresh instance.
// ---------------------------------------------------------------------------
impl BattleScene {
    fn build_grid(&self) {
        let mut container = self.base().get_node_as::<Node2D>("BattleGrid/Tiles");
        for y in 0..constants::GRID_HEIGHT {
            for x in 0..constants::GRID_WIDTH {
                let mut tile = ColorRect::new_alloc();
                let px = constants::GRID_ORIGIN_X + x * constants::TILE_SIZE;
                let py = constants::GRID_ORIGIN_Y + y * constants::TILE_SIZE;
                tile.set_mouse_filter(MouseFilter::IGNORE);
                tile.set_position(Vector2::new(px as f32, py as f32));
                tile.set_size(Vector2::new(
                    (constants::TILE_SIZE - 2) as f32,
                    (constants::TILE_SIZE - 2) as f32,
                ));
                tile.set_color(if (x + y) % 2 == 0 {
                    rgb(0x18, 0x3b, 0x4a)
                } else {
                    rgb(0x22, 0x4e, 0x60)
                });
                tile.set_name(&format!("Tile_{}_{}", x, y));
                container.add_child(&tile);
            }
        }
    }

    fn build_ui(&self) {
        let mut ui = self.base().get_node_as::<CanvasLayer>("UI");

        let mut crystals = Node2D::new_alloc();
        crystals.set_name("ManaCrystals");
        crystals.set_position(Vector2::new(1080.0, 50.0));
        for i in 0..constants::MAX_MANA {
            let mut crystal = Panel::new_alloc();
            crystal.set_size(Vector2::new(18.0, 26.0));
            crystal.set_position(Vector2::new(i as f32 * 28.0, 0.0));
            crystal.set_name(&format!("Crystal_{}", i));
            let style = Self::mana_crystal_style(true);
            crystal.add_theme_stylebox_override("panel", &style.upcast::<StyleBox>());
            crystals.add_child(&crystal);
        }
        ui.add_child(&crystals);

        let mut hand_container = Node2D::new_alloc();
        hand_container.set_name("HandContainer");
        hand_container.set_position(Vector2::new(300.0, 620.0));
        for i in 0..5 {
            let mut card_slot = Panel::new_alloc();
            card_slot.set_size(Vector2::new(110.0, 90.0));
            card_slot.set_position(Vector2::new(i as f32 * 120.0, 0.0));
            card_slot.set_name(&format!("CardSlot_{}", i));
            let mut style = StyleBoxFlat::new_gd();
            style.set_bg_color(rgb(0x1e, 0x3a, 0x4c));
            style.set_corner_radius_all(6);
            style.set_border_width_all(1);
            style.set_border_color(rgb(0x3a, 0x6e, 0x8a));
            card_slot.add_theme_stylebox_override("panel", &style.upcast::<StyleBox>());

            let mut name_label = Label::new_alloc();
            name_label.set_name("NameLabel");
            name_label.set_position(Vector2::new(4.0, 2.0));
            name_label.set_size(Vector2::new(102.0, 20.0));
            name_label.set_text("");
            name_label.add_theme_color_override("font_color", rgb(0xd6, 0xe8, 0xef));
            card_slot.add_child(&name_label);

            let mut cost_label = Label::new_alloc();
            cost_label.set_name("CostLabel");
            cost_label.set_position(Vector2::new(4.0, 22.0));
            cost_label.set_size(Vector2::new(102.0, 18.0));
            cost_label.set_text("");
            cost_label.add_theme_color_override("font_color", rgb(0x60, 0xa5, 0xfa));
            card_slot.add_child(&cost_label);

            let mut effects_label = Label::new_alloc();
            effects_label.set_name("EffectsLabel");
            effects_label.set_position(Vector2::new(4.0, 42.0));
            effects_label.set_size(Vector2::new(102.0, 44.0));
            effects_label.set_text("");
            effects_label.add_theme_color_override("font_color", rgb(0x8e, 0xb4, 0xc4));
            effects_label.set_autowrap_mode(AutowrapMode::WORD_SMART);
            card_slot.add_child(&effects_label);

            hand_container.add_child(&card_slot);
        }
        ui.add_child(&hand_container);

        let mut replace_btn = Button::new_alloc();
        replace_btn.set_name("ReplaceButton");
        replace_btn.set_position(Vector2::new(920.0, 620.0));
        replace_btn.set_size(Vector2::new(100.0, 40.0));
        replace_btn.set_text("Replace");
        ui.add_child(&replace_btn);

        let mut deck_label = Label::new_alloc();
        deck_label.set_name("DeckCountLabel");
        deck_label.set_position(Vector2::new(920.0, 670.0));
        deck_label.set_size(Vector2::new(100.0, 20.0));
        deck_label.set_text("");
        deck_label.add_theme_color_override("font_color", rgb(0x8e, 0xb4, 0xc4));
        ui.add_child(&deck_label);

        let mut enemy_hand_label = Label::new_alloc();
        enemy_hand_label.set_name("EnemyHandLabel");
        enemy_hand_label.set_position(Vector2::new(1080.0, 80.0));
        enemy_hand_label.set_size(Vector2::new(200.0, 20.0));
        enemy_hand_label.set_text("");
        enemy_hand_label.add_theme_color_override("font_color", rgb(0xff, 0x6b, 0x6b));
        ui.add_child(&enemy_hand_label);
    }

    fn sync_mana_crystals(&self, state: &BattleState) {
        for i in 0..constants::MAX_MANA {
            let mut crystal = self.base().get_node_as::<Panel>(&format!("UI/ManaCrystals/Crystal_{}", i));
            let style = Self::mana_crystal_style(i < state.mana);
            crystal.add_theme_stylebox_override("panel", &style.upcast::<StyleBox>());
        }
    }

    fn mana_crystal_style(filled: bool) -> Gd<StyleBoxFlat> {
        let mut style = StyleBoxFlat::new_gd();
        style.set_bg_color(if filled {
            rgb(0x60, 0xa5, 0xfa)
        } else {
            rgb(0x1e, 0x3a, 0x4c)
        });
        style.set_corner_radius_all(4);
        style.set_border_width_all(1);
        style.set_border_color(rgb(0x0b, 0x1a, 0x24));
        style
    }

    fn start_battle(&mut self) {
        self.state = Some(BattleState::new());
        self.selected = None;
        self.valid_moves.clear();
        self.card_targeting = false;
        self.clear_overlays_ref();
        self.sync_all();
    }

    fn sync_all(&self) {
        self.sync_visuals_ref();
        self.sync_ui_ref();
        self.sync_hand_ref();
    }

    fn sync_visuals_ref(&self) {
        let state = match self.state.as_ref() {
            Some(s) => s,
            None => return,
        };

        let mut units_node = self.base().get_node_as::<Node2D>("Units");
        while units_node.get_child_count() > 0 {
            if let Some(mut child) = units_node.get_child(0) {
                units_node.remove_child(&child);
                child.queue_free();
            }
        }

        for (&pos, unit) in &state.grid.units {
            if !unit.alive { continue; }
            let mut unit_root = self.build_unit_root(pos, unit, state);
            units_node.add_child(&unit_root);
            let can_pulse = unit.faction == Faction::Hero && state.phase == Phase::PlayerTurn && !unit.has_moved;
            if can_pulse {
                Self::attach_pulse_tween(&mut unit_root.get_node_as::<Panel>("GlowRing"));
            }
            unit_root.set_scale(Vector2::new(0.0, 0.0));
            let mut tween = unit_root.create_tween();
            tween.tween_property(&unit_root, "scale", &Vector2::new(1.0, 1.0).to_variant(), 0.25);
        }
    }

    fn build_unit_root(&self, pos: (i32, i32), unit: &GridUnit, state: &BattleState) -> Gd<Node2D> {
        let mut root = Node2D::new_alloc();
        let px = constants::GRID_ORIGIN_X + pos.0 * constants::TILE_SIZE + 40;
        let py = constants::GRID_ORIGIN_Y + pos.1 * constants::TILE_SIZE + 40;
        root.set_position(Vector2::new(px as f32, py as f32));
        root.set_name(&format!("Unit_{}_{}", pos.0, pos.1));

        let mut shadow = Self::rounded_panel(rgba(0x0b, 0x1a, 0x24, 0.55), Vector2::new(60.0, 60.0), 12, 0, rgba(0, 0, 0, 0.0));
        shadow.set_position(Vector2::new(-26.0, -24.0));
        root.add_child(&shadow);

        let can_act = unit.faction == Faction::Hero && state.phase == Phase::PlayerTurn && !unit.has_moved;
        let glow_color = match unit.faction { Faction::Hero => rgb(0x7f, 0xff, 0xe6), Faction::Enemy => rgb(0xff, 0x6b, 0x6b) };
        let mut glow = Self::rounded_panel(rgba(0, 0, 0, 0.0), Vector2::new(68.0, 68.0), 34, 4, glow_color);
        glow.set_position(Vector2::new(-34.0, -34.0));
        glow.set_pivot_offset(Vector2::new(34.0, 34.0));
        glow.set_name("GlowRing");
        if !can_act { glow.set_modulate(rgba(0xff, 0xff, 0xff, 0.0)); }
        root.add_child(&glow);

        let body_color = match unit.faction { Faction::Hero => rgb(0x4f, 0xd1, 0xc5), Faction::Enemy => rgb(0xc9, 0x4c, 0x4c) };
        let border_color = match unit.faction { Faction::Hero => rgb(0x2a, 0x8a, 0x82), Faction::Enemy => rgb(0x8b, 0x2e, 0x2e) };
        let mut body = Self::rounded_panel(body_color, Vector2::new(56.0, 56.0), 12, 2, border_color);
        body.set_position(Vector2::new(-28.0, -28.0));
        body.set_name("Body");
        if unit.has_moved || unit.has_attacked { body.set_modulate(rgba(0xff, 0xff, 0xff, 0.75)); }
        root.add_child(&body);

        let mut eye = ColorRect::new_alloc();
        eye.set_mouse_filter(MouseFilter::IGNORE);
        eye.set_size(Vector2::new(8.0, 8.0));
        eye.set_color(rgb(0xff, 0xff, 0xff));
        eye.set_position(Vector2::new(-16.0, -12.0));
        eye.set_name("Eye");
        root.add_child(&eye);

        let mut hp_bar = Self::hp_bar(unit.hp, unit.max_hp);
        hp_bar.set_position(Vector2::new(-28.0, -42.0));
        hp_bar.set_name("HpBar");
        root.add_child(&hp_bar);

        root
    }

    fn show_attack_highlight(&self, selected_pos: (i32, i32)) {
        let state = match self.state.as_ref() {
            Some(s) => s,
            None => return,
        };
        let Some(unit) = state.grid.unit_at(selected_pos) else { return };
        if unit.has_attacked {
            return;
        }
        let enemies = state.grid.adjacent_enemies(selected_pos);
        if enemies.is_empty() {
            return;
        }
        let mut container = self
            .base()
            .get_node_as::<Node2D>("BattleGrid/MovementOverlay");
        let tile_px = (constants::TILE_SIZE - 2) as f32;
        for &(x, y) in &enemies {
            let px = constants::GRID_ORIGIN_X + x * constants::TILE_SIZE;
            let py = constants::GRID_ORIGIN_Y + y * constants::TILE_SIZE;
            let mut highlight = ColorRect::new_alloc();
            highlight.set_mouse_filter(MouseFilter::IGNORE);
            highlight.set_position(Vector2::new(px as f32, py as f32));
            highlight.set_size(Vector2::new(tile_px, tile_px));
            highlight.set_color(rgba(0xe8, 0x5d, 0x4e, 0.45));
            highlight.set_name(&format!("AtkHighlight_{}_{}", x, y));
            container.add_child(&highlight);
        }
    }

    fn sync_ui_ref(&self) {
        let state = match self.state.as_ref() {
            Some(s) => s,
            None => return,
        };

        let mut ml = self.base().get_node_as::<Label>("UI/ManaLabel");
        ml.set_text(&format!("{} / {}", state.mana, state.max_mana));
        ml.set_modulate(rgb(0xd6, 0xe8, 0xef));

        self.sync_mana_crystals(state);

        let mut tl = self.base().get_node_as::<Label>("UI/TurnLabel");
        tl.set_text(&match state.phase {
            Phase::PlayerTurn => format!("Your Turn — Turn {}", state.turn_number),
            Phase::EnemyTurn => "Enemy Turn...".into(),
            Phase::BattleOver => match state.result {
                Some(BattleResult::Victory) => "Victory!".into(),
                Some(BattleResult::Defeat) => "Defeat!".into(),
                None => "Battle Over".into(),
            },
        });
        tl.set_modulate(match state.phase {
            Phase::PlayerTurn => rgb(0x7f, 0xff, 0xe6),
            Phase::EnemyTurn => rgb(0xff, 0x6b, 0x6b),
            Phase::BattleOver => rgb(0xf4, 0xc4, 0x30),
        });

        let mut eb = self.base().get_node_as::<Button>("UI/EndTurnButton");
        eb.set_disabled(state.phase != Phase::PlayerTurn);

        let mut banner = self.base().get_node_as::<Panel>("UI/ResultBanner");
        banner.set_visible(state.phase == Phase::BattleOver);

        let mut dl = self.base().get_node_as::<Label>("UI/DeckCountLabel");
        dl.set_text(&format!("Deck: {} | Gy: {}", state.deck.len(), state.graveyard.len()));

        let mut ehl = self.base().get_node_as::<Label>("UI/EnemyHandLabel");
        ehl.set_text(&format!("Enemy hand: {} cards", state.enemy_hand.len()));

        let mut rb = self.base().get_node_as::<Button>("UI/ReplaceButton");
        rb.set_disabled(state.replace_used || state.phase != Phase::PlayerTurn);
    }

    fn rounded_panel(
        bg: Color,
        size: Vector2,
        corner_radius: i32,
        border_width: i32,
        border_color: Color,
    ) -> Gd<Panel> {
        let mut panel = Panel::new_alloc();
        panel.set_mouse_filter(MouseFilter::IGNORE);
        panel.set_size(size);
        let mut style = StyleBoxFlat::new_gd();
        style.set_bg_color(bg);
        style.set_corner_radius_all(corner_radius);
        style.set_border_width_all(border_width);
        style.set_border_color(border_color);
        panel.add_theme_stylebox_override("panel", &style.upcast::<StyleBox>());
        panel
    }

    fn hp_bar(hp: i32, max_hp: i32) -> Gd<ProgressBar> {
        let mut bar = ProgressBar::new_alloc();
        bar.set_mouse_filter(MouseFilter::IGNORE);
        bar.set_size(Vector2::new(56.0, 8.0));
        bar.set_min(0.0);
        bar.set_max(max_hp as f64);
        bar.set_value(hp as f64);
        bar.set_show_percentage(false);

        let mut fill = StyleBoxFlat::new_gd();
        fill.set_bg_color(rgb(0x4f, 0xd1, 0xc5));
        fill.set_corner_radius_all(3);
        bar.add_theme_stylebox_override("fill", &fill.upcast::<StyleBox>());

        let mut bg = StyleBoxFlat::new_gd();
        bg.set_bg_color(rgb(0x0b, 0x1a, 0x24));
        bg.set_corner_radius_all(3);
        bar.add_theme_stylebox_override("background", &bg.upcast::<StyleBox>());

        bar
    }

    fn attach_pulse_tween(node: &mut Gd<Panel>) {
        let mut tween = node.create_tween();
        tween.set_loops();
            tween.set_trans(TransitionType::SINE);
            tween.set_ease(EaseType::IN_OUT);
            tween.tween_property(
                &*node,
                "scale",
                &Variant::from(Vector2::new(1.12, 1.12)),
                0.6,
            );
            tween.tween_property(&*node, "scale", &Variant::from(Vector2::new(1.0, 1.0)), 0.6);
    }

    fn handle_click(&mut self, pos: (i32, i32)) {
        if self.state.as_ref().map_or(true, |s| s.phase != Phase::PlayerTurn) { return; }
        if self.try_move_selected(pos) { return; }
        if self.try_attack_adjacent(pos) { return; }
        if self.try_select_unit(pos) { return; }
        self.clear_selection();
    }

    fn try_move_selected(&mut self, pos: (i32, i32)) -> bool {
        let selected = match self.selected { Some(s) => s, None => return false };
        if !self.valid_moves.contains(&pos) { return false; }
        if let Some(s) = self.state.as_mut() { let _ = battle_engine::move_unit(s, selected, pos); }
        self.selected = None;
        self.valid_moves.clear();
        self.clear_overlays_ref();
        self.sync_all();
        true
    }

    fn try_attack_adjacent(&mut self, pos: (i32, i32)) -> bool {
        let selected = match self.selected { Some(s) => s, None => return false };
        let is_target = self.state.as_ref().is_some_and(|s| {
            s.grid.unit_at(pos).is_some_and(|u| u.faction == Faction::Enemy && chebyshev_adjacent(selected, pos))
        });
        if !is_target { return false; }
        if let Some(s) = self.state.as_mut() { let _ = battle_engine::player_attack(s, selected, pos); }
        self.selected = None;
        self.valid_moves.clear();
        self.clear_overlays_ref();
        self.sync_all();
        true
    }

    fn try_select_unit(&mut self, pos: (i32, i32)) -> bool {
        let is_selectable = self.state.as_ref().is_some_and(|s| {
            s.grid.unit_at(pos).is_some_and(|u| u.faction == Faction::Hero && (!u.has_moved || !u.has_attacked))
        });
        if !is_selectable { return false; }
        self.selected = Some(pos);
        if let Some(s) = self.state.as_ref() {
            self.valid_moves = grid_movement::get_movement_range(&s.grid, pos, constants::MOVE_BUDGET);
            let has_moved = s.grid.unit_at(pos).is_some_and(|u| u.has_moved);
            if !has_moved { self.show_move_overlay(&self.valid_moves); }
        }
        self.show_attack_highlight(pos);
        true
    }

    fn clear_selection(&mut self) {
        self.selected = None;
        self.valid_moves.clear();
        self.clear_overlays_ref();
    }

    fn show_move_overlay(&self, moves: &[(i32, i32)]) {
        let tile_px = (constants::TILE_SIZE - 2) as f32;
        let mut container = self
            .base()
            .get_node_as::<Node2D>("BattleGrid/MovementOverlay");
        for &(x, y) in moves {
            let px = constants::GRID_ORIGIN_X + x * constants::TILE_SIZE;
            let py = constants::GRID_ORIGIN_Y + y * constants::TILE_SIZE;
            let root_pos = Vector2::new(px as f32, py as f32);

            let mut tint = ColorRect::new_alloc();
            tint.set_position(root_pos);
            tint.set_size(Vector2::new(tile_px, tile_px));
            tint.set_color(rgba(0x4f, 0xd1, 0xc5, 0.12));
            tint.set_name(&format!("Tint_{}_{}", x, y));
            container.add_child(&tint);

            let bracket_color = rgb(0xe8, 0xdc, 0xc5);
            let inset = 4.0;
            let arm = 16.0;
            let width = 3.0;

            for (corner, suffix) in [(Corner::TL, "tl"), (Corner::TR, "tr"), (Corner::BL, "bl"), (Corner::BR, "br")] {
                Self::add_bracket(&mut container, root_pos, tile_px, corner, inset, arm, width, bracket_color, &format!("BL_{x}_{y}_{suffix}"));
            }
        }
    }

    #[allow(clippy::too_many_arguments)]
    fn add_bracket(
        container: &mut Gd<Node2D>,
        root: Vector2,
        tile_px: f32,
        corner: Corner,
        inset: f32,
        arm: f32,
        width: f32,
        color: Color,
        name: &str,
    ) {
        let (x1, y1, x2, y2, x3, y3) = match corner {
            Corner::TL => (inset, inset + arm, inset, inset, inset + arm, inset),
            Corner::TR => (tile_px - inset, inset + arm, tile_px - inset, inset, tile_px - inset - arm, inset),
            Corner::BL => (inset, tile_px - inset - arm, inset, tile_px - inset, inset + arm, tile_px - inset),
            Corner::BR => (tile_px - inset, tile_px - inset - arm, tile_px - inset, tile_px - inset, tile_px - inset - arm, tile_px - inset),
        };
        let mut line = Line2D::new_alloc();
        let mut points = PackedVector2Array::new();
        points.push(Vector2::new(x1, y1));
        points.push(Vector2::new(x2, y2));
        points.push(Vector2::new(x3, y3));
        line.set_points(&points);
        line.set_width(width);
        line.set_default_color(color);
        line.set_position(root);
        line.set_name(name);
        container.add_child(&line);
    }

    fn clear_overlays_ref(&self) {
        let mut container = self
            .base()
            .get_node_as::<Node2D>("BattleGrid/MovementOverlay");
        while container.get_child_count() > 0 {
            if let Some(mut child) = container.get_child(0) {
                container.remove_child(&child);
                child.queue_free();
            }
        }
    }

    fn sync_hand_ref(&self) {
        let state = match self.state.as_ref() {
            Some(s) => s,
            None => return,
        };
        let ui = self.base().get_node_as::<CanvasLayer>("UI");
        let hand_container = ui.get_node_as::<Node2D>("HandContainer");
        for i in 0..5 {
            let slot_name = format!("CardSlot_{}", i);
            let mut slot = hand_container.get_node_as::<Panel>(&slot_name);
            let mut name_label = slot.get_node_as::<Label>("NameLabel");
            let mut cost_label = slot.get_node_as::<Label>("CostLabel");
            let mut effects_label = slot.get_node_as::<Label>("EffectsLabel");
            if i < state.hand.len() {
                let card = &state.hand.cards[i];
                let can_play = state.mana >= card.cost && state.phase == Phase::PlayerTurn;
                name_label.set_text(card.name);
                cost_label.set_text(&format!("Cost: {}", card.cost));
                let effect_strs: Vec<String> = card.effects.iter().map(|e| format!("{:?}", e.effect)).collect();
                effects_label.set_text(&effect_strs.join(", "));
                let mut style = StyleBoxFlat::new_gd();
                style.set_bg_color(if can_play { rgb(0x2a, 0x5a, 0x7a) } else { rgb(0x1e, 0x3a, 0x4c) });
                style.set_corner_radius_all(6);
                style.set_border_width_all(1);
                let border = if self.card_targeting && self.selected_card_index == i { rgb(0x60, 0xa5, 0xfa) } else { rgb(0x3a, 0x6e, 0x8a) };
                style.set_border_color(border);
                slot.add_theme_stylebox_override("panel", &style.upcast::<StyleBox>());
                slot.set_visible(true);
            } else {
                name_label.set_text("");
                cost_label.set_text("");
                effects_label.set_text("");
                slot.set_visible(false);
            }
        }
    }

    fn apply_card_effect(state: &mut BattleState, card_effect: &CardEffect, target: (i32, i32)) {
        let affected = cross_aoe(target, card_effect.aoe);
        for pos in affected {
            if !state.grid.in_bounds(pos) { continue; }
            match &card_effect.effect {
                Effect::Damage(d) => {
                    if let Some(u) = state.grid.unit_at_mut(pos) {
                        u.take_damage(*d);
                        if !u.alive { state.grid.remove_unit(pos); }
                    }
                }
                Effect::Heal(h) => {
                    if let Some(u) = state.grid.unit_at_mut(pos) {
                        u.hp = (u.hp + h).min(u.max_hp);
                    }
                }
                Effect::Shield(s) => {
                    if let Some(u) = state.grid.unit_at_mut(pos) {
                        u.hp = (u.hp + s).min(u.max_hp + s);
                        u.max_hp += s;
                    }
                }
                Effect::DrawCards(n) => {
                    for _ in 0..*n { state.draw_player_card(); }
                }
                Effect::ApplyBuff(_, _) => {}
            }
        }
        state.check_over();
    }
}
