
use godot::classes::tween::{EaseType, TransitionType};
use godot::classes::{
    Button, ColorRect, INode2D, InputEvent, InputEventMouseButton, Label, Line2D, Node2D, Panel,
    ProgressBar, StyleBox, StyleBoxFlat,
};
use godot::global::MouseButton;
use godot::prelude::*;

use crate::core::{
    battle::{self as battle_engine, BattleResult, BattleState, Phase},
    constants, grid::movement as grid_movement,
    grid::Faction,
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
            base,
        }
    }

    fn ready(&mut self) {
        self.build_grid();
        self.build_ui();
        self.start_battle();
        let self_gd = self.to_gd();
        let mut end_btn = self.base().get_node_as::<Button>("UI/EndTurnButton");
        end_btn.signals().pressed().connect_other(&self_gd, BattleScene::on_end_turn);
        let banner = self.base().get_node_as::<Panel>("UI/ResultBanner");
        let mut restart_btn = banner.get_node_as::<Button>("RestartButton");
        restart_btn.signals().pressed().connect_other(&self_gd, BattleScene::on_restart);
    }

    fn unhandled_input(&mut self, event: Gd<InputEvent>) {
        if self.animating {
            return;
        }
        let mouse = match event.try_cast::<InputEventMouseButton>() {
            Ok(m) => m,
            Err(_) => return,
        };
        if !mouse.is_pressed() || mouse.get_button_index() != MouseButton::LEFT {
            return;
        }
        let pos = match screen_to_grid(mouse.get_position()) {
            Some(p) => p,
            None => return,
        };
        self.handle_click(pos);
    }
}

#[godot_api]
impl BattleScene {
    #[func]
    fn on_end_turn(&mut self) {
        {
            let s = match self.state.as_mut() {
                Some(s) => s,
                None => return,
            };
            if s.phase != Phase::PlayerTurn {
                return;
            }
            battle_engine::end_player_turn(s);
        }
        self.sync_ui_ref();
        self.animating = true;
        if let Some(s) = self.state.as_mut() {
            battle_engine::execute_enemy_turn(s);
        }
        self.animating = false;
        self.sync_all();
    }

    #[func]
    fn on_restart(&mut self) {
        self.start_battle();
    }
}


impl BattleScene {
    fn build_grid(&self) {
        let mut container = self.base().get_node_as::<Node2D>("BattleGrid/Tiles");
        for y in 0..constants::GRID_HEIGHT {
            for x in 0..constants::GRID_WIDTH {
                let mut tile = ColorRect::new_alloc();
                let px = constants::GRID_ORIGIN_X + x * constants::TILE_SIZE;
                let py = constants::GRID_ORIGIN_Y + y * constants::TILE_SIZE;
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
        let mut ui = self.base().get_node_as::<Node2D>("UI");

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
        self.clear_overlays_ref();
        self.sync_all();
    }

    fn sync_all(&self) {
        self.sync_visuals_ref();
        self.sync_ui_ref();
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
            if !unit.alive {
                continue;
            }
            let mut unit_root = Node2D::new_alloc();
            let px = constants::GRID_ORIGIN_X + pos.0 * constants::TILE_SIZE + 40;
            let py = constants::GRID_ORIGIN_Y + pos.1 * constants::TILE_SIZE + 40;
            unit_root.set_position(Vector2::new(px as f32, py as f32));
            unit_root.set_name(&format!("Unit_{}_{}", pos.0, pos.1));

            let mut shadow = Self::rounded_panel(
                rgba(0x0b, 0x1a, 0x24, 0.55),
                Vector2::new(60.0, 60.0),
                12,
                0,
                rgba(0, 0, 0, 0.0),
            );
            shadow.set_position(Vector2::new(-26.0, -24.0));
            unit_root.add_child(&shadow);

            let can_act = unit.faction == Faction::Hero
                && state.phase == Phase::PlayerTurn
                && !unit.has_moved;
            let mut glow = Self::rounded_panel(
                rgba(0, 0, 0, 0.0),
                Vector2::new(68.0, 68.0),
                34,
                4,
                match unit.faction {
                    Faction::Hero => rgb(0x7f, 0xff, 0xe6),
                    Faction::Enemy => rgb(0xff, 0x6b, 0x6b),
                },
            );
            glow.set_position(Vector2::new(-34.0, -34.0));
            glow.set_pivot_offset(Vector2::new(34.0, 34.0));
            glow.set_name("GlowRing");
            if can_act {
                Self::attach_pulse_tween(&mut glow);
            } else {
                glow.set_modulate(rgba(0xff, 0xff, 0xff, 0.0));
            }
            unit_root.add_child(&glow);

            let body_color = match unit.faction {
                Faction::Hero => rgb(0x4f, 0xd1, 0xc5),
                Faction::Enemy => rgb(0xc9, 0x4c, 0x4c),
            };
            let border_color = match unit.faction {
                Faction::Hero => rgb(0x2a, 0x8a, 0x82),
                Faction::Enemy => rgb(0x8b, 0x2e, 0x2e),
            };
            let mut body =
                Self::rounded_panel(body_color, Vector2::new(56.0, 56.0), 12, 2, border_color);
            body.set_position(Vector2::new(-28.0, -28.0));
            body.set_name("Body");
            if unit.has_moved || unit.has_attacked {
                body.set_modulate(rgba(0xff, 0xff, 0xff, 0.75));
            }
            unit_root.add_child(&body);

            let mut eye = ColorRect::new_alloc();
            eye.set_size(Vector2::new(8.0, 8.0));
            eye.set_color(rgb(0xff, 0xff, 0xff));
            eye.set_position(Vector2::new(-16.0, -12.0));
            eye.set_name("Eye");
            unit_root.add_child(&eye);

            let mut hp_bar = Self::hp_bar(unit.hp, unit.max_hp);
            hp_bar.set_position(Vector2::new(-28.0, -42.0));
            hp_bar.set_name("HpBar");
            unit_root.add_child(&hp_bar);

            units_node.add_child(&unit_root);
            unit_root.set_scale(Vector2::new(0.0, 0.0));
            let mut tween = unit_root.create_tween();
            tween.tween_property(&unit_root, "scale", &Vector2::new(1.0, 1.0).to_variant(), 0.25);
        }
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

        for i in 0..constants::MAX_MANA {
            let crystal_name = format!("UI/ManaCrystals/Crystal_{}", i);
            let mut crystal = self.base().get_node_as::<Panel>(&crystal_name);
            let filled = i < state.mana;
            let style = Self::mana_crystal_style(filled);
            crystal.add_theme_stylebox_override("panel", &style.upcast::<StyleBox>());
        }

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
    }

    fn rounded_panel(
        bg: Color,
        size: Vector2,
        corner_radius: i32,
        border_width: i32,
        border_color: Color,
    ) -> Gd<Panel> {
        let mut panel = Panel::new_alloc();
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
        if self
            .state
            .as_ref()
            .map_or(true, |s| s.phase != Phase::PlayerTurn)
        {
            return;
        }

        if let Some(selected) = self.selected {
            if self.valid_moves.contains(&pos) {
                if let Some(s) = self.state.as_mut() {
                    let _ = battle_engine::move_unit(s, selected, pos);
                }
                self.selected = None;
                self.valid_moves.clear();
                self.clear_overlays_ref();
                self.sync_all();
                return;
            }
        }

        if let Some(selected) = self.selected {
            let is_adjacent_enemy = self.state.as_ref().is_some_and(|s| {
                s.grid.unit_at(pos).is_some_and(|u| {
                    u.faction == Faction::Enemy && chebyshev_adjacent(selected, pos)
                })
            });
            if is_adjacent_enemy {
                if let Some(s) = self.state.as_mut() {
                    let _ = battle_engine::player_attack(s, selected, pos);
                }
                self.selected = None;
                self.valid_moves.clear();
                self.clear_overlays_ref();
                self.sync_all();
                return;
            }
        }

        let is_selectable = self.state.as_ref().is_some_and(|s| {
            s.grid
                .unit_at(pos)
                .is_some_and(|u| u.faction == Faction::Hero && (!u.has_moved || !u.has_attacked))
        });
        if is_selectable {
            self.selected = Some(pos);
            if let Some(s) = self.state.as_ref() {
                self.valid_moves =
                    grid_movement::get_movement_range(&s.grid, pos, constants::MOVE_BUDGET);
            }
            self.show_move_overlay(&self.valid_moves);
            self.show_attack_highlight(pos);
            return;
        }

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
            let right = tile_px - inset;
            let bottom = tile_px - inset;

            for (corner, suffix) in [(Corner::TL, "tl"), (Corner::TR, "tr"), (Corner::BL, "bl"), (Corner::BR, "br")] {
                Self::add_bracket(&mut container, root_pos, tile_px, corner, inset, arm, width, bracket_color, &format!("BL_{x}_{y}_{suffix}"));
            }
        }
    }

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
}
