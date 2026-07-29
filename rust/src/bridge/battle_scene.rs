use std::collections::HashMap;

use godot::classes::tween::{EaseType, TransitionType};
use godot::classes::notify::CanvasItemNotification;
use godot::classes::control::MouseFilter;
use godot::classes::{
    Button, CanvasLayer, ColorRect, INode2D, InputEvent, InputEventMouseButton, InputEventMouseMotion, Label, Line2D, Node2D,
    Panel, ProgressBar, RichTextLabel, StyleBox, StyleBoxFlat,
};
use godot::classes::text_server::AutowrapMode;
use godot::global::{HorizontalAlignment, MouseButton, VerticalAlignment};
use godot::prelude::*;

use crate::core::{
    battle::{self as battle_engine, BattleResult, BattleState, Phase, Decision},
    constants, grid::movement as grid_movement,
    grid::{Faction, GridUnit},
    cards::{CardEffect, Effect, cross_aoe},
    overworld::{generate_rewards},
};
use super::game_state;

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
    combat_log: Vec<String>,
    prev_units: HashMap<String, (i32, i32)>,
    hovered_card: Option<usize>,
    aoe_preview_pos: Option<(i32, i32)>,
    self_gd: Option<Gd<BattleScene>>,
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
            combat_log: Vec::new(),
            prev_units: HashMap::new(),
            hovered_card: None,
            aoe_preview_pos: None,
            self_gd: None,
            debug_unhandled_input_calls: 0,
            debug_click_events_received: 0,
            base,
        }
    }

    fn ready(&mut self) {
        let base_gd = self.base.__script_gd();
        self.self_gd = Some(base_gd.cast::<BattleScene>());
        self.build_grid();
        self.build_ui();
        self.start_battle();
        self.connect_signals();
    }

    fn on_notification(&mut self, what: CanvasItemNotification) {
        if what == CanvasItemNotification::EXTENSION_RELOADED {
            godot_print!("[BattleScene] EXTENSION_RELOADED — reconnecting signals + refreshing UI");
            self.connect_signals();
            self.sync_all();
        }
    }

    fn input(&mut self, event: Gd<InputEvent>) {
        if self.animating { return; }

        // Handle mouse motion for hover effects and AOE preview
        if let Ok(motion) = event.clone().try_cast::<InputEventMouseMotion>() {
            let pos = motion.get_position();
            self.handle_mouse_motion(pos);
            return;
        }

        let Ok(mouse) = event.try_cast::<InputEventMouseButton>() else { return };
        self.debug_click_events_received += 1;
        if !mouse.is_pressed() || mouse.get_button_index() != MouseButton::LEFT { return; }

        let pos = mouse.get_position();

        // Card targeting mode: click on grid to resolve card effect
        if self.card_targeting {
            let Some(grid_pos) = screen_to_grid(pos) else { return };
            let Some(s) = self.state.as_mut() else { return };
            let Some(card) = s.play_card(self.selected_card_index) else {
                self.card_targeting = false;
                self.aoe_preview_pos = None;
                self.clear_overlays_ref();
                self.sync_all();
                return;
            };
            let card_name = card.name.to_string();
            let effects = card.effects.clone();
            // Apply state changes first
            for effect in &effects {
                Self::apply_card_effect_to_state(s, effect, grid_pos);
            }
            // Then apply visual effects (drop mutable borrow first)
            let hero_pos = s.grid.find_faction(Faction::Hero).first().copied();
            let _ = s;
            for effect in &effects {
                self.visualize_card_effect(effect, grid_pos, hero_pos);
            }
            self.append_log(&format!("Played {} targeting ({},{})", card_name, grid_pos.0, grid_pos.1));
            self.card_targeting = false;
            self.aoe_preview_pos = None;
            self.clear_selection();
            self.sync_all();
            return;
        }

        // Check card hand clicks (bottom area)
        if pos.y >= 600.0 && pos.y <= 720.0 && pos.x >= 300.0 && pos.x <= 1050.0 {
            let card_idx = ((pos.x - 300.0) / 150.0) as i32;
            if (0..5).contains(&card_idx) {
                self.on_card_click(card_idx);
                return;
            }
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
        self.append_log("--- Enemy Turn ---");
        self.hovered_card = None;
        self.hide_tooltip();
        self.card_targeting = false;
        self.aoe_preview_pos = None;
        self.clear_overlays_ref();
        self.sync_ui_ref();
        self.run_enemy_turn();
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

        // Save positions before execution for slide diffing
        self.store_prev_unit_positions();

        // Show enemy turn banner
        let mut banner = self.base().get_node_as::<Label>("UI/EnemyTurnBanner");
        banner.set_visible(true);
        banner.set_modulate(rgba(255, 255, 255, 0.0));
        let mut tween = banner.create_tween();
        tween.tween_property(&banner, "modulate", &rgba(255, 255, 255, 1.0).to_variant(), 0.3);

        // Execute enemy decision (mana + move/attack)
        let decision = self.state.as_mut().map(battle_engine::execute_enemy_decision_and_mana);
        if let Some(Decision::Attack { target }) = decision {
            self.append_log(&format!("Enemy attacks hero at ({},{})", target.0, target.1));
        } else if let Some(Decision::Move { target, attack_after }) = decision {
            self.append_log(&format!("Enemy moves to ({},{})", target.0, target.1));
            if attack_after.is_some() {
                self.append_log("Enemy attacks!");
            }
        } else {
            self.append_log("Enemy waits");
        }

        self.sync_visuals_ref();
        self.sync_ui_ref();
        self.sync_hand_ref();

        // Execute enemy card plays
        if let Some(s) = self.state.as_mut() {
            battle_engine::play_enemy_cards_sync(s);
        }

        self.append_log("Enemy plays cards");

        // Draw enemy card and transition
        if let Some(s) = self.state.as_mut() {
            battle_engine::enemy_draw_and_transition(s);
            let count = s.enemy_hand.len();
            self.append_log(&format!("Enemy draws a card (hand: {})", count));
        }

        self.sync_all();

        // Schedule end of enemy turn with pacing delay
        let Some(ref self_gd) = self.self_gd else { return };
        let mut grid_node = self.base().get_node_as::<Node2D>("BattleGrid");
        let mut end_tween = grid_node.create_tween();
        end_tween.tween_interval(1.5);
        end_tween.tween_callback(&Callable::from_object_method(self_gd, "_finish_enemy_turn"));
    }

    #[func]
    fn _finish_enemy_turn(&mut self) {
        let mut banner = self.base().get_node_as::<Label>("UI/EnemyTurnBanner");
        let mut tween = banner.create_tween();
        tween.tween_property(&banner, "modulate", &rgba(255, 255, 255, 0.0).to_variant(), 0.3);
        let banner_clone = banner.clone();
        tween.tween_callback(&Callable::from_object_method(&banner_clone, "set_visible").bind(&[false.to_variant()]));
        self.animating = false;
    }

    #[func]
    fn on_restart(&mut self) {
        self.start_battle();
    }

    #[func]
    fn on_return_to_overworld(&mut self) {
        let is_boss = false;
        let (reward_cards, gold) = generate_rewards(42, is_boss);
        game_state::with_run_state(|run| {
            run.add_gold(gold);
            if let Some(card) = reward_cards.first() {
                run.add_card(card.clone());
            }
            run.hp = self.state.as_ref().map_or(30, |s| {
                s.grid.find_faction(Faction::Hero).first()
                    .and_then(|p| s.grid.unit_at(*p))
                    .map_or(30, |u| u.hp)
            });
        });

        let mut tree = self.base().get_tree();
        let _ = tree.change_scene_to_file("res://scenes/overworld.tscn");
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
            self.append_log(&format!("Select target for {}", card.name));
            godot_print!("[BattleScene] Select a target for {}", card.name);
            self.sync_ui_ref();
            return;
        }

        // Play card
        let card_name = card.name.to_string();
        let card = s.play_card(idx);
        let Some(card) = card else { return };
        let effects = card.effects.clone();
        let hero_pos = s.grid.find_faction(Faction::Hero).first().copied();
        // Apply state changes
        for effect in &effects {
            Self::apply_card_effect_to_state(s, effect, match hero_pos { Some(p) => p, None => return });
        }
        // Apply visual effects (drop mutable borrow)
        let _ = s;
        for effect in &effects {
            self.visualize_card_effect(effect, match hero_pos { Some(p) => p, None => return }, hero_pos);
        }
        self.append_log(&format!("Played {} on self", card_name));
        self.card_targeting = false;
        self.clear_selection();
        self.sync_all();
        // Animate card play after sync
        self.animate_card_play(idx);
    }

    #[func]
    fn test_click(&mut self, gx: i32, gy: i32) {
        godot_print!("[RT:OK] test_click at grid ({}, {})", gx, gy);
        self.handle_click((gx, gy));
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
        let Some(ref self_gd) = self.self_gd else { return };
        let end_btn = self.base().get_node_as::<Button>("UI/EndTurnButton");
        end_btn.signals().pressed().connect_other(self_gd, BattleScene::on_end_turn);
        let banner = self.base().get_node_as::<Panel>("UI/ResultBanner");
        let restart_btn = banner.get_node_as::<Button>("RestartButton");
        restart_btn.signals().pressed().connect_other(self_gd, BattleScene::on_restart);
        let return_btn = banner.get_node_as::<Button>("ReturnToOverworld");
        return_btn.signals().pressed().connect_other(self_gd, BattleScene::on_return_to_overworld);
        let replace_btn = self.base().get_node_as::<Button>("UI/ReplaceButton");
        replace_btn.signals().pressed().connect_other(self_gd, BattleScene::on_replace);
    }
}

// ---------------------------------------------------------------------------
// Visual & UI helpers
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

        // Mana crystals
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

        // Hand container - larger cards 150x120 (FR-15)
        let mut hand_container = Node2D::new_alloc();
        hand_container.set_name("HandContainer");
        hand_container.set_position(Vector2::new(300.0, 610.0));
        for i in 0..5 {
            let mut card_slot = Panel::new_alloc();
            card_slot.set_size(Vector2::new(150.0, 120.0));
            card_slot.set_position(Vector2::new(i as f32 * 150.0, 0.0));
            card_slot.set_name(&format!("CardSlot_{}", i));
            let mut style = StyleBoxFlat::new_gd();
            style.set_bg_color(rgb(0x1e, 0x3a, 0x4c));
            style.set_corner_radius_all(6);
            style.set_border_width_all(1);
            style.set_border_color(rgb(0x3a, 0x6e, 0x8a));
            card_slot.add_theme_stylebox_override("panel", &style.upcast::<StyleBox>());

            // Card name at top (FR-15)
            let mut name_label = Label::new_alloc();
            name_label.set_name("NameLabel");
            name_label.set_position(Vector2::new(6.0, 4.0));
            name_label.set_size(Vector2::new(138.0, 24.0));
            name_label.set_text("");
            name_label.add_theme_color_override("font_color", rgb(0xd6, 0xe8, 0xef));
            name_label.add_theme_font_size_override("font_size", 14);
            card_slot.add_child(&name_label);

            // Mana cost badge in top-right corner (FR-15)
            let mut cost_label = Label::new_alloc();
            cost_label.set_name("CostLabel");
            cost_label.set_position(Vector2::new(118.0, 4.0));
            cost_label.set_size(Vector2::new(28.0, 28.0));
            cost_label.set_text("");
            cost_label.set_horizontal_alignment(HorizontalAlignment::CENTER);
            cost_label.set_vertical_alignment(VerticalAlignment::CENTER);
            cost_label.add_theme_color_override("font_color", rgb(0x60, 0xa5, 0xfa));
            cost_label.add_theme_font_size_override("font_size", 14);
            let mut cost_style = StyleBoxFlat::new_gd();
            cost_style.set_bg_color(rgba(0x0b, 0x1a, 0x24, 0.7));
            cost_style.set_corner_radius_all(14);
            cost_style.set_border_width_all(0);
            cost_label.add_theme_stylebox_override("normal", &cost_style.upcast::<StyleBox>());
            card_slot.add_child(&cost_label);

            // Effect description in dedicated lower section (FR-15)
            let mut effects_label = Label::new_alloc();
            effects_label.set_name("EffectsLabel");
            effects_label.set_position(Vector2::new(6.0, 36.0));
            effects_label.set_size(Vector2::new(138.0, 80.0));
            effects_label.set_text("");
            effects_label.add_theme_color_override("font_color", rgb(0x8e, 0xb4, 0xc4));
            effects_label.add_theme_font_size_override("font_size", 12);
            effects_label.set_autowrap_mode(AutowrapMode::WORD_SMART);
            card_slot.add_child(&effects_label);

            hand_container.add_child(&card_slot);
        }
        ui.add_child(&hand_container);

        // Replace button
        let mut replace_btn = Button::new_alloc();
        replace_btn.set_name("ReplaceButton");
        replace_btn.set_position(Vector2::new(1060.0, 610.0));
        replace_btn.set_size(Vector2::new(100.0, 40.0));
        replace_btn.set_text("Replace");
        ui.add_child(&replace_btn);

        // Deck count label
        let mut deck_label = Label::new_alloc();
        deck_label.set_name("DeckCountLabel");
        deck_label.set_position(Vector2::new(1060.0, 660.0));
        deck_label.set_size(Vector2::new(100.0, 20.0));
        deck_label.set_text("");
        deck_label.add_theme_color_override("font_color", rgb(0x8e, 0xb4, 0xc4));
        ui.add_child(&deck_label);

        // Enemy hand label
        let mut enemy_hand_label = Label::new_alloc();
        enemy_hand_label.set_name("EnemyHandLabel");
        enemy_hand_label.set_position(Vector2::new(1080.0, 80.0));
        enemy_hand_label.set_size(Vector2::new(200.0, 20.0));
        enemy_hand_label.set_text("");
        enemy_hand_label.add_theme_color_override("font_color", rgb(0xff, 0x6b, 0x6b));
        ui.add_child(&enemy_hand_label);

        // Enemy turn banner (FR-4)
        let mut enemy_banner = Label::new_alloc();
        enemy_banner.set_name("EnemyTurnBanner");
        enemy_banner.set_position(Vector2::new(340.0, 280.0));
        enemy_banner.set_size(Vector2::new(600.0, 80.0));
        enemy_banner.set_text("Enemy Turn...");
        enemy_banner.set_horizontal_alignment(HorizontalAlignment::CENTER);
        enemy_banner.set_vertical_alignment(VerticalAlignment::CENTER);
        enemy_banner.set_visible(false);
        enemy_banner.add_theme_color_override("font_color", rgb(0xff, 0x6b, 0x6b));
        enemy_banner.add_theme_font_size_override("font_size", 48);
        ui.add_child(&enemy_banner);

        // Combat log panel (FR-14)
        let mut log_bg = Panel::new_alloc();
        log_bg.set_name("CombatLog");
        log_bg.set_position(Vector2::new(20.0, 400.0));
        log_bg.set_size(Vector2::new(240.0, 200.0));
        let mut log_style = StyleBoxFlat::new_gd();
        log_style.set_bg_color(rgba(0x0b, 0x1a, 0x24, 0.85));
        log_style.set_corner_radius_all(6);
        log_style.set_border_width_all(1);
        log_style.set_border_color(rgb(0x3a, 0x6e, 0x8a));
        log_bg.add_theme_stylebox_override("panel", &log_style.upcast::<StyleBox>());
        ui.add_child(&log_bg);

        let mut log_label = RichTextLabel::new_alloc();
        log_label.set_name("LogLabel");
        log_label.set_position(Vector2::new(4.0, 4.0));
        log_label.set_size(Vector2::new(232.0, 192.0));
        log_label.set_text("Combat Log");
        log_label.set_use_bbcode(true);
        log_label.set_scroll_active(true);
        log_label.set_fit_content(true);
        log_label.add_theme_color_override("default_color", rgb(0x8e, 0xb4, 0xc4));
        log_label.add_theme_font_size_override("font_size", 11);
        log_bg.add_child(&log_label);

        // Card tooltip panel (FR-6) — hidden by default
        let mut tooltip = Panel::new_alloc();
        tooltip.set_name("CardTooltip");
        tooltip.set_position(Vector2::new(0.0, 0.0));
        tooltip.set_size(Vector2::new(200.0, 100.0));
        tooltip.set_visible(false);
        let mut tooltip_style = StyleBoxFlat::new_gd();
        tooltip_style.set_bg_color(rgba(0x0b, 0x1a, 0x24, 0.95));
        tooltip_style.set_corner_radius_all(8);
        tooltip_style.set_border_width_all(1);
        tooltip_style.set_border_color(rgb(0x60, 0xa5, 0xfa));
        tooltip.add_theme_stylebox_override("panel", &tooltip_style.upcast::<StyleBox>());
        ui.add_child(&tooltip);

        let mut tooltip_name = Label::new_alloc();
        tooltip_name.set_name("TooltipName");
        tooltip_name.set_position(Vector2::new(10.0, 8.0));
        tooltip_name.set_size(Vector2::new(180.0, 24.0));
        tooltip_name.set_text("");
        tooltip_name.add_theme_color_override("font_color", rgb(0xd6, 0xe8, 0xef));
        tooltip_name.add_theme_font_size_override("font_size", 14);
        tooltip.add_child(&tooltip_name);

        let mut tooltip_cost = Label::new_alloc();
        tooltip_cost.set_name("TooltipCost");
        tooltip_cost.set_position(Vector2::new(10.0, 32.0));
        tooltip_cost.set_size(Vector2::new(180.0, 18.0));
        tooltip_cost.set_text("");
        tooltip_cost.add_theme_color_override("font_color", rgb(0x60, 0xa5, 0xfa));
        tooltip_cost.add_theme_font_size_override("font_size", 12);
        tooltip.add_child(&tooltip_cost);

        let mut tooltip_desc = Label::new_alloc();
        tooltip_desc.set_name("TooltipDesc");
        tooltip_desc.set_position(Vector2::new(10.0, 52.0));
        tooltip_desc.set_size(Vector2::new(180.0, 60.0));
        tooltip_desc.set_text("");
        tooltip_desc.add_theme_color_override("font_color", rgb(0x8e, 0xb4, 0xc4));
        tooltip_desc.add_theme_font_size_override("font_size", 11);
        tooltip_desc.set_autowrap_mode(AutowrapMode::WORD_SMART);
        tooltip.add_child(&tooltip_desc);
    }

    fn handle_mouse_motion(&mut self, pos: Vector2) {
        // Card hover detection (FR-6)
        if pos.y >= 600.0 && pos.y <= 740.0 && pos.x >= 300.0 && pos.x <= 1050.0 {
            let card_idx = ((pos.x - 300.0) / 150.0) as i32;
            if (0..5).contains(&card_idx) {
                let idx = card_idx as usize;
                if self.hovered_card != Some(idx) {
                    self.hovered_card = Some(idx);
                    self.show_card_tooltip(idx);
                    self.sync_hand_ref();
                }
                return;
            }
        }
        // Not hovering a card
        if self.hovered_card.is_some() {
            self.hovered_card = None;
            self.hide_tooltip();
            self.sync_hand_ref();
        }

        // AOE targeting preview (FR-9)
        if self.card_targeting {
            if let Some(grid_pos) = screen_to_grid(pos) {
                if let Some(s) = self.state.as_ref() {
                    if let Some(card) = s.hand.cards.get(self.selected_card_index) {
                        if let Some(effect) = card.effects.first() {
                            if effect.aoe > 1 && self.aoe_preview_pos != Some(grid_pos) {
                                self.aoe_preview_pos = Some(grid_pos);
                                self.show_aoe_preview(grid_pos, effect.aoe);
                            }
                        }
                    }
                }
            }
        }
    }

    fn show_card_tooltip(&mut self, idx: usize) {
        let Some(s) = self.state.as_ref() else { return };
        let Some(card) = s.hand.cards.get(idx) else { return };
        let mut tooltip = self.base().get_node_as::<Panel>("UI/CardTooltip");
        let mut name_label = tooltip.get_node_as::<Label>("TooltipName");
        let mut cost_label = tooltip.get_node_as::<Label>("TooltipCost");
        let mut desc_label = tooltip.get_node_as::<Label>("TooltipDesc");

        name_label.set_text(card.name);
        cost_label.set_text(&format!("Cost: {}", card.cost));
        let effect_strs: Vec<String> = card.effects.iter().map(|e| format!("{:?}", e.effect)).collect();
        desc_label.set_text(&effect_strs.join(", "));

        let tooltip_x = 300.0 + (idx as f32 * 150.0);
        tooltip.set_position(Vector2::new(tooltip_x, 510.0));
        tooltip.set_visible(true);
    }

    fn hide_tooltip(&mut self) {
        let mut tooltip = self.base().get_node_as::<Panel>("UI/CardTooltip");
        tooltip.set_visible(false);
    }

    fn show_aoe_preview(&self, center: (i32, i32), aoe_radius: i32) {
        let mut container = self.base().get_node_as::<Node2D>("BattleGrid/MovementOverlay");
        // Remove only AOE preview tiles
        let mut to_remove = Vec::new();
        for i in 0..container.get_child_count() {
            if let Some(child) = container.get_child(i) {
                let name = child.get_name().to_string();
                if name.starts_with("AoeTile_") {
                    to_remove.push(i);
                }
            }
        }
        for i in to_remove.into_iter().rev() {
            if let Some(mut child) = container.get_child(i) {
                container.remove_child(&child);
                child.queue_free();
            }
        }

        let tile_px = (constants::TILE_SIZE - 2) as f32;
        let tiles = cross_aoe(center, aoe_radius);
        for &(x, y) in &tiles {
            let px = constants::GRID_ORIGIN_X + x * constants::TILE_SIZE;
            let py = constants::GRID_ORIGIN_Y + y * constants::TILE_SIZE;
            let mut highlight = ColorRect::new_alloc();
            highlight.set_mouse_filter(MouseFilter::IGNORE);
            highlight.set_position(Vector2::new(px as f32, py as f32));
            highlight.set_size(Vector2::new(tile_px, tile_px));
            highlight.set_color(rgba(0xf4, 0x97, 0x2c, 0.4));
            highlight.set_name(&format!("AoeTile_{}_{}", x, y));
            container.add_child(&highlight);
        }
    }

    fn animate_card_play(&self, idx: usize) {
        let mut slot = self.base().get_node_as::<Panel>(&format!("UI/HandContainer/CardSlot_{}", idx));
        let mut tween = slot.create_tween();
        tween.set_trans(TransitionType::QUINT);
        tween.set_ease(EaseType::IN);
        tween.tween_property(&slot, "scale", &Vector2::new(0.0, 0.0).to_variant(), 0.25);
        tween.parallel().tween_property(&slot, "modulate", &rgba(255, 255, 255, 0.0).to_variant(), 0.25);
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
        style.set_bg_color(if filled { rgb(0x60, 0xa5, 0xfa) } else { rgb(0x1e, 0x3a, 0x4c) });
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
        self.aoe_preview_pos = None;
        self.hovered_card = None;
        self.combat_log.clear();
        self.prev_units.clear();
        self.clear_overlays_ref();
        let mut log_label = self.base().get_node_as::<RichTextLabel>("UI/CombatLog/LogLabel");
        log_label.set_text("Combat Log");
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
        let mut existing_names: Vec<String> = Vec::new();
        for i in 0..units_node.get_child_count() {
            if let Some(child) = units_node.get_child(i) {
                existing_names.push(child.get_name().to_string());
            }
        }

        let mut kept: Vec<String> = Vec::new();

        for (&pos, unit) in &state.grid.units {
            if !unit.alive { continue; }
            let name = match unit.faction {
                Faction::Hero => "Unit_Hero".to_string(),
                Faction::Enemy => "Unit_Enemy".to_string(),
            };
            let px = constants::GRID_ORIGIN_X + pos.0 * constants::TILE_SIZE + 40;
            let py = constants::GRID_ORIGIN_Y + pos.1 * constants::TILE_SIZE + 40;
            let target_pos = Vector2::new(px as f32, py as f32);

            if units_node.has_node(&name) {
                let mut existing = units_node.get_node_as::<Node2D>(&name);
                // Unit exists — update position and visual state
                let old_pos = self.prev_units.get(&name).copied();
                if let Some(op) = old_pos {
                    if op != pos {
                        let opx = constants::GRID_ORIGIN_X + op.0 * constants::TILE_SIZE + 40;
                        let opy = constants::GRID_ORIGIN_Y + op.1 * constants::TILE_SIZE + 40;
                        existing.set_position(Vector2::new(opx as f32, opy as f32));
                        let mut slide_tween = existing.create_tween();
                        slide_tween.set_trans(TransitionType::SINE);
                        slide_tween.set_ease(EaseType::OUT);
                        slide_tween.tween_property(&existing, "position", &target_pos.to_variant(), 0.3);
                    } else {
                        existing.set_position(target_pos);
                    }
                } else {
                    existing.set_position(target_pos);
                }

                // Update body modulate
                if existing.has_node("Body") {
                    let mut body = existing.get_node_as::<Panel>("Body");
                    body.set_modulate(if unit.has_moved || unit.has_attacked {
                        rgba(255, 255, 255, 0.75)
                    } else {
                        rgba(255, 255, 255, 1.0)
                    });
                }

                // Update HP bar
                if existing.has_node("HpBar") {
                    let mut hp_bar = existing.get_node_as::<ProgressBar>("HpBar");
                    hp_bar.set_max(unit.max_hp as f64);
                    hp_bar.set_value(unit.hp as f64);
                }

                // Update selection ring (FR-11)
                if existing.has_node("SelectionRing") {
                    let mut sel_ring = existing.get_node_as::<Panel>("SelectionRing");
                    sel_ring.set_visible(self.selected == Some(pos));
                }

                // Update action pips (FR-12)
                if existing.has_node("MovePip") {
                    let mut move_pip = existing.get_node_as::<Label>("MovePip");
                    if unit.faction == Faction::Hero {
                        move_pip.set_text(if unit.has_moved { "X" } else { "Y" });
                        move_pip.set_modulate(if unit.has_moved { rgb(0xff, 0x6b, 0x6b) } else { rgb(0x4f, 0xd1, 0xc5) });
                    }
                }
                if existing.has_node("AtkPip") {
                    let mut atk_pip = existing.get_node_as::<Label>("AtkPip");
                    if unit.faction == Faction::Hero {
                        atk_pip.set_text(if unit.has_attacked { "X" } else { "Y" });
                        atk_pip.set_modulate(if unit.has_attacked { rgb(0xff, 0x6b, 0x6b) } else { rgb(0x4f, 0xd1, 0xc5) });
                    }
                }

                kept.push(name);
            } else {
                // New unit — create with spawn animation
                let mut unit_root = self.build_unit_root(pos, unit, state);
                let can_pulse = unit.faction == Faction::Hero && state.phase == Phase::PlayerTurn && !unit.has_moved;
                if can_pulse {
                    Self::attach_pulse_tween(&mut unit_root.get_node_as::<Panel>("GlowRing"));
                }
                unit_root.set_scale(Vector2::new(0.0, 0.0));
                let mut tween = unit_root.create_tween();
                tween.tween_property(&unit_root, "scale", &Vector2::new(1.0, 1.0).to_variant(), 0.25);
                units_node.add_child(&unit_root);
                kept.push(name);
            }
        }

        // Death dissolve (FR-13): units that existed before but not in kept set
        for name in &existing_names {
            if !kept.contains(name) && units_node.has_node(name) && (name.starts_with("Unit_Hero") || name.starts_with("Unit_Enemy")) {
                let Some(mut node) = units_node.try_get_node_as::<Node2D>(name) else { continue };
                let mut death_tween = node.create_tween();
                death_tween.set_trans(TransitionType::QUINT);
                death_tween.set_ease(EaseType::IN);
                death_tween.tween_property(&node, "scale", &Vector2::new(0.0, 0.0).to_variant(), 0.3);
                death_tween.parallel()
                    .tween_property(&node, "modulate", &rgba(255, 255, 255, 0.0).to_variant(), 0.3);
                let mut node_clone = node.clone();
                death_tween.tween_callback(&Callable::from_fn("death_free", move |_args: &[&Variant]| {
                    if let Some(mut parent) = node_clone.get_parent() {
                        parent.remove_child(&node_clone);
                    }
                    node_clone.queue_free();
                }));
            }
        }
    }

    fn store_prev_unit_positions(&mut self) {
        self.prev_units.clear();
        if let Some(s) = self.state.as_ref() {
            for (&pos, unit) in &s.grid.units {
                if !unit.alive { continue; }
                let name = match unit.faction {
                    Faction::Hero => "Unit_Hero".to_string(),
                    Faction::Enemy => "Unit_Enemy".to_string(),
                };
                self.prev_units.insert(name, pos);
            }
        }
    }

    fn build_unit_root(&self, pos: (i32, i32), unit: &GridUnit, state: &BattleState) -> Gd<Node2D> {
        let mut root = Node2D::new_alloc();
        let px = constants::GRID_ORIGIN_X + pos.0 * constants::TILE_SIZE + 40;
        let py = constants::GRID_ORIGIN_Y + pos.1 * constants::TILE_SIZE + 40;
        root.set_position(Vector2::new(px as f32, py as f32));
        let name = match unit.faction {
            Faction::Hero => "Unit_Hero",
            Faction::Enemy => "Unit_Enemy",
        };
        root.set_name(name);

        let mut shadow = Self::rounded_panel(rgba(0x0b, 0x1a, 0x24, 0.55), Vector2::new(60.0, 60.0), 12, 0, rgba(0, 0, 0, 0.0));
        shadow.set_position(Vector2::new(-26.0, -24.0));
        root.add_child(&shadow);

        let can_act = unit.faction == Faction::Hero && state.phase == Phase::PlayerTurn && !unit.has_moved;
        let glow_color = match unit.faction { Faction::Hero => rgb(0x7f, 0xff, 0xe6), Faction::Enemy => rgb(0xff, 0x6b, 0x6b) };
        let mut glow = Self::rounded_panel(rgba(0, 0, 0, 0.0), Vector2::new(68.0, 68.0), 34, 4, glow_color);
        glow.set_position(Vector2::new(-34.0, -34.0));
        glow.set_pivot_offset(Vector2::new(34.0, 34.0));
        glow.set_name("GlowRing");
        if !can_act { glow.set_modulate(rgba(255, 255, 255, 0.0)); }
        root.add_child(&glow);

        let body_color = match unit.faction { Faction::Hero => rgb(0x4f, 0xd1, 0xc5), Faction::Enemy => rgb(0xc9, 0x4c, 0x4c) };
        let border_color = match unit.faction { Faction::Hero => rgb(0x2a, 0x8a, 0x82), Faction::Enemy => rgb(0x8b, 0x2e, 0x2e) };
        let mut body = Self::rounded_panel(body_color, Vector2::new(56.0, 56.0), 12, 2, border_color);
        body.set_position(Vector2::new(-28.0, -28.0));
        body.set_name("Body");
        if unit.has_moved || unit.has_attacked { body.set_modulate(rgba(255, 255, 255, 0.75)); }
        root.add_child(&body);

        // Selection ring (FR-11) — bright outline, hidden by default
        let mut sel_ring = Self::rounded_panel(rgba(0, 0, 0, 0.0), Vector2::new(72.0, 72.0), 36, 5, rgb(0x7f, 0xff, 0xe6));
        sel_ring.set_position(Vector2::new(-36.0, -36.0));
        sel_ring.set_pivot_offset(Vector2::new(36.0, 36.0));
        sel_ring.set_name("SelectionRing");
        sel_ring.set_visible(self.selected == Some(pos));
        root.add_child(&sel_ring);

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

        // Action pips (FR-12) — M/A indicators for hero
        if unit.faction == Faction::Hero {
            let mut move_pip = Label::new_alloc();
            move_pip.set_name("MovePip");
            move_pip.set_position(Vector2::new(-32.0, 22.0));
            move_pip.set_size(Vector2::new(16.0, 16.0));
            move_pip.set_text(if unit.has_moved { "X" } else { "Y" });
            move_pip.set_modulate(if unit.has_moved { rgb(0xff, 0x6b, 0x6b) } else { rgb(0x4f, 0xd1, 0xc5) });
            move_pip.add_theme_color_override("font_color", rgb(0xff, 0xff, 0xff));
            move_pip.add_theme_font_size_override("font_size", 14);
            move_pip.set_horizontal_alignment(HorizontalAlignment::CENTER);
            root.add_child(&move_pip);

            let mut atk_pip = Label::new_alloc();
            atk_pip.set_name("AtkPip");
            atk_pip.set_position(Vector2::new(-16.0, 22.0));
            atk_pip.set_size(Vector2::new(16.0, 16.0));
            atk_pip.set_text(if unit.has_attacked { "X" } else { "Y" });
            atk_pip.set_modulate(if unit.has_attacked { rgb(0xff, 0x6b, 0x6b) } else { rgb(0x4f, 0xd1, 0xc5) });
            atk_pip.add_theme_color_override("font_color", rgb(0xff, 0xff, 0xff));
            atk_pip.add_theme_font_size_override("font_size", 14);
            atk_pip.set_horizontal_alignment(HorizontalAlignment::CENTER);
            root.add_child(&atk_pip);
        }

        root
    }

    fn show_attack_highlight(&self, selected_pos: (i32, i32)) {
        let state = match self.state.as_ref() {
            Some(s) => s,
            None => return,
        };
        let Some(unit) = state.grid.unit_at(selected_pos) else { return };
        if unit.has_attacked { return; }
        let enemies = state.grid.adjacent_enemies(selected_pos);
        if enemies.is_empty() { return; }
        let mut container = self.base().get_node_as::<Node2D>("BattleGrid/MovementOverlay");
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

    fn rounded_panel(bg: Color, size: Vector2, corner_radius: i32, border_width: i32, border_color: Color) -> Gd<Panel> {
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
        tween.tween_property(&*node, "scale", &Variant::from(Vector2::new(1.12, 1.12)), 0.6);
        tween.tween_property(&*node, "scale", &Variant::from(Vector2::new(1.0, 1.0)), 0.6);
    }

    // Spawn a floating damage/heal number (FR-1)
    fn spawn_floating_number(&self, grid_pos: (i32, i32), amount: i32, color: Color) {
        let px = (constants::GRID_ORIGIN_X + grid_pos.0 * constants::TILE_SIZE + 40) as f32;
        let py = (constants::GRID_ORIGIN_Y + grid_pos.1 * constants::TILE_SIZE + 20) as f32;
        let mut label = Label::new_alloc();
        label.set_text(&format!("{}", amount));
        label.set_name("FloatingDamage");
        label.set_position(Vector2::new(px, py));
        label.set_horizontal_alignment(HorizontalAlignment::CENTER);
        label.add_theme_color_override("font_color", color);
        label.add_theme_font_size_override("font_size", 20);
        label.set_mouse_filter(MouseFilter::IGNORE);

        let mut units_node = self.base().get_node_as::<Node2D>("Units");
        units_node.add_child(&label);

        let mut tween = label.create_tween();
        tween.set_trans(TransitionType::SINE);
        tween.set_ease(EaseType::OUT);
        tween.parallel()
            .tween_property(&label, "position", &Vector2::new(px, py - 40.0).to_variant(), 0.8);
        tween.parallel()
            .tween_property(&label, "modulate", &rgba(255, 255, 255, 0.0).to_variant(), 0.8);
        let mut label_clone = label.clone();
        tween.tween_callback(&Callable::from_fn("float_free", move |_args: &[&Variant]| {
            label_clone.queue_free();
        }));
    }

    // Hit flash on a unit (FR-2)
    fn flash_unit(&self, grid_pos: (i32, i32)) {
        let faction_name = if self.state.as_ref().and_then(|s| s.grid.unit_at(grid_pos)).is_some_and(|u| u.faction == Faction::Hero) {
            "Unit_Hero"
        } else {
            "Unit_Enemy"
        };
        let units_node = self.base().get_node_as::<Node2D>("Units");
        let body_path = format!("{}/Body", faction_name);
        if units_node.has_node(&body_path) {
            let mut body = units_node.get_node_as::<Panel>(&body_path);
            let mut tween = body.create_tween();
            tween.set_trans(TransitionType::SINE);
            tween.set_ease(EaseType::OUT);
            tween.tween_property(&body, "modulate", &rgb(0xff, 0xff, 0xff).to_variant(), 0.05);
            tween.tween_property(&body, "modulate", &rgba(255, 255, 255, 0.75).to_variant(), 0.1);
        }
    }

    // Append to combat log (FR-14)
    fn append_log(&self, text: &str) {
        let mut log_label = self.base().get_node_as::<RichTextLabel>("UI/CombatLog/LogLabel");
        let current = log_label.get_text().to_string();
        let lines: Vec<&str> = current.split('\n').collect();
        let mut new_lines: Vec<&str> = lines.to_vec();
        new_lines.push(text);
        if new_lines.len() > 11 {
            new_lines.remove(0);
        }
        log_label.set_text(&new_lines.join("\n"));
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
        self.append_log(&format!("Hero moves to ({},{})", pos.0, pos.1));
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
        let result = self.state.as_mut().and_then(|s| {
            battle_engine::player_attack(s, selected, pos).ok()
        });
        if let Some(r) = &result {
            self.append_log(&format!("Hero attacks enemy for {} damage", r.combat_result.damage_dealt));
            self.spawn_floating_number(pos, r.combat_result.damage_dealt, rgb(0xff, 0x6b, 0x6b));
            self.flash_unit(pos);
            if r.combat_result.counter_damage > 0 {
                self.append_log(&format!("Enemy counterattacks for {} damage", r.combat_result.counter_damage));
                self.spawn_floating_number(selected, r.combat_result.counter_damage, rgb(0xff, 0x6b, 0x6b));
                self.flash_unit(selected);
            }
        }
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
        self.sync_visuals_ref();
        true
    }

    fn clear_selection(&mut self) {
        self.selected = None;
        self.valid_moves.clear();
        self.clear_overlays_ref();
    }

    fn show_move_overlay(&self, moves: &[(i32, i32)]) {
        let tile_px = (constants::TILE_SIZE - 2) as f32;
        let mut container = self.base().get_node_as::<Node2D>("BattleGrid/MovementOverlay");
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
        let mut container = self.base().get_node_as::<Node2D>("BattleGrid/MovementOverlay");
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
                cost_label.set_text(&format!("{}", card.cost));
                let effect_strs: Vec<String> = card.effects.iter().map(|e| format!("{:?}", e.effect)).collect();
                effects_label.set_text(&effect_strs.join(", "));

                let mut style = StyleBoxFlat::new_gd();
                if can_play {
                    style.set_bg_color(rgb(0x2a, 0x5a, 0x7a));
                    style.set_border_width_all(2);
                    style.set_border_color(rgb(0x60, 0xa5, 0xfa));
                } else {
                    style.set_bg_color(rgb(0x1e, 0x3a, 0x4c));
                    style.set_border_width_all(1);
                    style.set_border_color(rgb(0x3a, 0x6e, 0x8a));
                }
                style.set_corner_radius_all(6);
                let border = if self.card_targeting && self.selected_card_index == i { rgb(0x60, 0xa5, 0xfa) } else { style.get_border_color() };
                style.set_border_color(border);
                slot.add_theme_stylebox_override("panel", &style.upcast::<StyleBox>());

                // Cannot-play dimming (FR-10)
                if !can_play {
                    slot.set_modulate(rgba(255, 255, 255, 0.5));
                } else {
                    slot.set_modulate(rgba(255, 255, 255, 1.0));
                }

                // Card hover lift (FR-6)
                if self.hovered_card == Some(i) && can_play {
                    slot.set_position(Vector2::new(i as f32 * 150.0, -10.0));
                } else {
                    slot.set_position(Vector2::new(i as f32 * 150.0, 0.0));
                }

                slot.set_visible(true);
            } else {
                name_label.set_text("");
                cost_label.set_text("");
                effects_label.set_text("");
                slot.set_visible(false);
            }
        }
    }

    fn apply_card_effect_to_state(state: &mut BattleState, card_effect: &CardEffect, target: (i32, i32)) {
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

    fn visualize_card_effect(&self, card_effect: &CardEffect, target: (i32, i32), _hero_pos: Option<(i32, i32)>) {
        let affected = cross_aoe(target, card_effect.aoe);
        for pos in affected {
            match &card_effect.effect {
                Effect::Damage(d) => {
                    self.spawn_floating_number(pos, *d, rgb(0xff, 0x6b, 0x6b));
                    self.flash_unit(pos);
                }
                Effect::Heal(h) => {
                    self.spawn_floating_number(pos, *h, rgb(0x4f, 0xd1, 0xc5));
                }
                Effect::Shield(s) => {
                    self.spawn_floating_number(pos, *s, rgb(0x60, 0xa5, 0xfa));
                }
                _ => {}
            }
        }
    }
}