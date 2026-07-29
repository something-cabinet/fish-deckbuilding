use godot::classes::control::MouseFilter;
use godot::classes::{
    Button, CanvasLayer, ColorRect, INode2D, InputEvent, InputEventMouseButton, Label, Line2D, Node2D,
    Panel, StyleBox, StyleBoxFlat,
};
use godot::global::MouseButton;
use godot::prelude::*;

use crate::core::{
    overworld::{self, NodeType, OverworldNode, RunState, create_zone_1, generate_rewards},
    cards::all_starter_cards,
};

#[derive(GodotClass)]
#[class(base=Node2D)]
pub struct OverworldScene {
    run: Option<RunState>,
    nodes: Vec<OverworldNode>,
    hero_node_idx: i32,
    #[export]
    debug_clicks: i32,
    base: Base<Node2D>,
}

#[godot_api]
impl INode2D for OverworldScene {
    fn init(base: Base<Node2D>) -> Self {
        Self { run: None, nodes: Vec::new(), hero_node_idx: 0, debug_clicks: 0, base }
    }

    fn ready(&mut self) {
        self.build_ui();
        self.start_run();
    }

    fn input(&mut self, event: Gd<InputEvent>) {
        let Ok(mouse) = event.try_cast::<InputEventMouseButton>() else { return };
        self.debug_clicks += 1;
        if !mouse.is_pressed() || mouse.get_button_index() != MouseButton::LEFT { return; }
        let pos = mouse.get_position();
        let screen_x = pos.x as i32;
        let screen_y = pos.y as i32;

        for (i, node) in self.nodes.iter().enumerate() {
            let nx = 200 + node.grid_x * 150;
            let ny = 80 + node.grid_y * 90;
            if (screen_x - nx).abs() < 40 && (screen_y - ny).abs() < 40 {
                self.on_node_click(i);
                return;
            }
        }
    }
}

#[godot_api]
impl OverworldScene {
    fn build_ui(&self) {
        let mut bg = ColorRect::new_alloc();
        bg.set_mouse_filter(MouseFilter::IGNORE);
        bg.set_size(Vector2::new(1280.0, 720.0));
        bg.set_color(rgb(0x0b, 0x1a, 0x24));
        bg.set_name("Background");
        let mut self_gd = self.to_gd();
        self_gd.add_child(&bg);

        let mut ui = CanvasLayer::new_alloc();
        ui.set_name("UI");

        let mut map_container = Node2D::new_alloc();
        map_container.set_name("MapContainer");
        ui.add_child(&map_container);

        let mut hp_label = Label::new_alloc();
        hp_label.set_name("HpLabel");
        hp_label.set_position(Vector2::new(20.0, 20.0));
        hp_label.set_size(Vector2::new(200.0, 24.0));
        ui.add_child(&hp_label);

        let mut gold_label = Label::new_alloc();
        gold_label.set_name("GoldLabel");
        gold_label.set_position(Vector2::new(20.0, 44.0));
        gold_label.set_size(Vector2::new(200.0, 24.0));
        ui.add_child(&gold_label);

        let mut deck_btn = Button::new_alloc();
        deck_btn.set_name("DeckButton");
        deck_btn.set_position(Vector2::new(20.0, 70.0));
        deck_btn.set_size(Vector2::new(100.0, 30.0));
        deck_btn.set_text("Deck");
        deck_btn.signals().pressed().connect_other(&self_gd, OverworldScene::on_deck_button);
        ui.add_child(&deck_btn);

        self_gd.add_child(&ui);
    }

    fn start_run(&mut self) {
        let starter = all_starter_cards();
        self.run = Some(RunState::new(30, 30, starter));
        self.nodes = create_zone_1();
        self.hero_node_idx = 0;
        self.refresh();
    }

    fn refresh(&self) {
        self.clear_map();
        let run = match self.run.as_ref() { Some(r) => r, None => return };
        let ui = self.base().get_node_as::<CanvasLayer>("UI");
        self.draw_connections(&ui);
        self.draw_nodes(&ui, run);
        self.draw_hero(&ui);
        self.update_hud(&ui, run);
    }

    fn clear_map(&self) {
        let ui = self.base().get_node_as::<CanvasLayer>("UI");
        let mut container = ui.get_node_as::<Node2D>("MapContainer");
        while container.get_child_count() > 0 {
            if let Some(mut child) = container.get_child(0) {
                container.remove_child(&child);
                child.queue_free();
            }
        }
    }

    fn draw_connections(&self, ui: &Gd<CanvasLayer>) {
        let mut container = ui.get_node_as::<Node2D>("MapContainer");
        for node in &self.nodes {
            for conn in &node.connections {
                if let Some(target) = self.nodes.iter().find(|n| &n.id == conn) {
                    let x1 = 200 + node.grid_x * 150;
                    let y1 = 80 + node.grid_y * 90;
                    let x2 = 200 + target.grid_x * 150;
                    let y2 = 80 + target.grid_y * 90;
                    let mut line = Line2D::new_alloc();
                    let mut points = PackedVector2Array::new();
                    points.push(Vector2::new(x1 as f32, y1 as f32));
                    points.push(Vector2::new(x2 as f32, y2 as f32));
                    line.set_points(&points);
                    line.set_width(2.0);
                    line.set_default_color(rgb(0x3a, 0x6e, 0x8a));
                    container.add_child(&line);
                }
            }
        }
    }

    fn draw_nodes(&self, ui: &Gd<CanvasLayer>, run: &RunState) {
        let mut container = ui.get_node_as::<Node2D>("MapContainer");
        for node in &self.nodes {
            let nx = (200 + node.grid_x * 150) as f32;
            let ny = (80 + node.grid_y * 90) as f32;

            let is_accessible = node.id == "start"
                || (self.hero_node_idx >= 0
                    && (self.nodes[self.hero_node_idx as usize].connections.contains(&node.id)
                        || node.connections.contains(&self.nodes[self.hero_node_idx as usize].id)));

            let is_cleared = run.defeated_nodes.contains(&node.id);

            let mut panel = Panel::new_alloc();
            panel.set_position(Vector2::new(nx - 30.0, ny - 30.0));
            panel.set_size(Vector2::new(60.0, 60.0));
            let mut style = StyleBoxFlat::new_gd();
            let color = if is_cleared { rgb(0x2a, 0x5a, 0x7a) }
                       else if is_accessible { rgb(0x4f, 0xd1, 0xc5) }
                       else { rgb(0x1e, 0x3a, 0x4c) };
            style.set_bg_color(color);
            style.set_corner_radius_all(30);
            panel.add_theme_stylebox_override("panel", &style.upcast::<StyleBox>());
            container.add_child(&panel);

            let mut label = Label::new_alloc();
            label.set_position(Vector2::new(nx - 28.0, ny + 12.0));
            label.set_size(Vector2::new(56.0, 20.0));
            label.set_text(match node.node_type {
                NodeType::Battle => "B",
                NodeType::Boss => "!",
                NodeType::Rest => "+",
                NodeType::Shop => "$",
                NodeType::Enchanter => "E",
                NodeType::Gambler => "?",
            });
            label.set_horizontal_alignment(godot::global::HorizontalAlignment::CENTER);
            label.add_theme_color_override("font_color", rgb(0x0b, 0x1a, 0x24));
            container.add_child(&label);
        }
    }

    fn draw_hero(&self, ui: &Gd<CanvasLayer>) {
        if self.hero_node_idx < 0 || self.hero_node_idx >= self.nodes.len() as i32 { return; }
        let node = &self.nodes[self.hero_node_idx as usize];
        let nx = (200 + node.grid_x * 150) as f32;
        let ny = (80 + node.grid_y * 90) as f32;
        let mut container = ui.get_node_as::<Node2D>("MapContainer");

        let mut panel = Panel::new_alloc();
        panel.set_name("HeroIcon");
        panel.set_position(Vector2::new(nx - 16.0, ny - 50.0));
        panel.set_size(Vector2::new(32.0, 24.0));
        let mut style = StyleBoxFlat::new_gd();
        style.set_bg_color(rgb(0x7f, 0xff, 0xe6));
        style.set_corner_radius_all(8);
        panel.add_theme_stylebox_override("panel", &style.upcast::<StyleBox>());
        container.add_child(&panel);

        let mut label = Label::new_alloc();
        label.set_position(Vector2::new(nx - 14.0, ny - 50.0));
        label.set_size(Vector2::new(32.0, 24.0));
        label.set_text("G");
        label.set_horizontal_alignment(godot::global::HorizontalAlignment::CENTER);
        label.add_theme_color_override("font_color", rgb(0x0b, 0x1a, 0x24));
        container.add_child(&label);
    }

    fn update_hud(&self, ui: &Gd<CanvasLayer>, run: &RunState) {
        let mut hp_label = ui.get_node_as::<Label>("HpLabel");
        hp_label.set_text(&format!("HP: {}/{}", run.hp, run.max_hp));
        hp_label.add_theme_color_override("font_color", rgb(0x4f, 0xd1, 0xc5));

        let mut gold_label = ui.get_node_as::<Label>("GoldLabel");
        gold_label.set_text(&format!("Gold: {}", run.gold));
        gold_label.add_theme_color_override("font_color", rgb(0xf4, 0xc4, 0x30));
    }

    fn on_node_click(&mut self, idx: usize) {
        let Some(run) = self.run.as_mut() else { return };
        if self.hero_node_idx as usize == idx { return; }
        if self.hero_node_idx < 0 || (self.hero_node_idx as usize) >= self.nodes.len() { return; }
        let node = &self.nodes[idx];
        let current = &self.nodes[self.hero_node_idx as usize];

        if !current.connections.contains(&node.id) { return; }
        if run.defeated_nodes.contains(&node.id) { return; }

        self.hero_node_idx = idx as i32;
        match node.node_type {
            NodeType::Battle | NodeType::Boss => {
                godot_print!("[Overworld] Starting battle at {}", node.id);
            }
            NodeType::Rest => {
                run.heal(10);
                run.defeated_nodes.push(node.id.clone());
            }
            NodeType::Shop => {
                godot_print!("[Overworld] Opening shop");
            }
            NodeType::Enchanter => {
                godot_print!("[Overworld] Opening enchanter");
            }
            NodeType::Gambler => {
                godot_print!("[Overworld] Opening gambler");
            }
        }
        self.refresh();
    }

    #[func]
    fn on_deck_button(&mut self) {
        godot_print!("[Overworld] Opening deck management");
    }
}

fn rgb(r: u8, g: u8, b: u8) -> Color { Color::from_rgb(r as f32 / 255.0, g as f32 / 255.0, b as f32 / 255.0) }