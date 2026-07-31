use godot::classes::control::MouseFilter;
use godot::classes::tween::{EaseType, TransitionType};
use godot::classes::{
    Button, CanvasLayer, GridContainer, HBoxContainer, INode2D, InputEvent,
    InputEventMouseButton, InputEventMouseMotion, Label, Line2D, Node2D, Panel, StyleBox,
    StyleBoxFlat, VBoxContainer,
};
use godot::global::MouseButton;
use godot::prelude::*;

use crate::core::cards::Rarity;
use crate::core::{
    overworld::{CardLocation, NodeType, OverworldNode, RunState, create_zone_1},
    cards::all_starter_cards,
};
use super::game_state;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum CraftingMode {
    Enchanter,
    Gambler,
    Corrupt,
}

impl CraftingMode {
    fn cost(&self) -> i32 {
        match self {
            CraftingMode::Enchanter => 100,
            CraftingMode::Gambler => 50,
            CraftingMode::Corrupt => 200,
        }
    }

    fn action_label(&self) -> &'static str {
        match self {
            CraftingMode::Enchanter => "Add Slot",
            CraftingMode::Gambler => "Reroll",
            CraftingMode::Corrupt => "Corrupt",
        }
    }

    fn name(&self) -> &'static str {
        match self {
            CraftingMode::Enchanter => "Enchanter",
            CraftingMode::Gambler => "Gambler",
            CraftingMode::Corrupt => "Corrupt",
        }
    }
}

#[derive(GodotClass)]
#[class(base=Node2D)]
pub struct OverworldScene {
    run: Option<RunState>,
    nodes: Vec<OverworldNode>,
    hero_node_idx: i32,
    self_gd: Option<Gd<OverworldScene>>,
    #[export]
    debug_clicks: i32,
    crafting_mode: CraftingMode,
    selected_card_idx: i32,
    showing_stash: bool,
    crafting_seed: u64,
    result_original: Option<crate::core::cards::CardDef>,
    result_modified: Option<crate::core::cards::CardDef>,
    hovered_crafting_slot: Option<usize>,
    hovered_slot_base_y: f32,
    hovered_map_node: Option<usize>,
    base: Base<Node2D>,
}

#[godot_api]
impl INode2D for OverworldScene {
    fn init(base: Base<Node2D>) -> Self {
        Self {
            run: None,
            nodes: Vec::new(),
            hero_node_idx: 0,
            self_gd: None,
            debug_clicks: 0,
            crafting_mode: CraftingMode::Enchanter,
            selected_card_idx: -1,
            showing_stash: false,
            crafting_seed: 0,
            result_original: None,
            result_modified: None,
            hovered_crafting_slot: None,
            hovered_slot_base_y: 0.0,
            hovered_map_node: None,
            base,
        }
    }

    fn ready(&mut self) {
        let base_gd = self.base.__script_gd();
        self.self_gd = Some(base_gd.cast::<OverworldScene>());
        self.build_ui();
        self.start_run();
    }

    fn input(&mut self, event: Gd<InputEvent>) {
        if let Ok(motion) = event.clone().try_cast::<InputEventMouseMotion>() {
            let panel = self.base().get_node_as::<Panel>("UI/CraftingPanel");
            if !panel.is_visible_in_tree() {
                self.update_map_hover(motion.get_position());
            }
            return;
        }

        let Ok(mouse) = event.try_cast::<InputEventMouseButton>() else { return };
        self.debug_clicks += 1;
        if !mouse.is_pressed() || mouse.get_button_index() != MouseButton::LEFT { return; }
        let pos = mouse.get_position();

        let panel = self.base().get_node_as::<Panel>("UI/CraftingPanel");
        if panel.is_visible_in_tree() {
            let grid = self.base().get_node_as::<GridContainer>("UI/CraftingPanel/CardBrowser/Scroll/Grid");
            let grid_origin = grid.get_global_rect().position;
            let local_pos = Vector2::new(pos.x - grid_origin.x, pos.y - grid_origin.y);
            if let Some(idx) = self.index_from_grid_pos(local_pos) {
                self.selected_card_idx = idx as i32;
                self.hovered_crafting_slot = None;
                self.show_card_detail(idx);
                self.populate_grid();
                self.sync_crafting_ui();
                return;
            }
            return;
        }

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
    fn build_ui(&mut self) {
        let Some(ref self_gd) = self.self_gd else { return };
        let ui = self.base().get_node_as::<CanvasLayer>("UI");
        let deck_btn: Gd<Button> = ui.get("deck_button").try_to().expect("deck_button missing");
        deck_btn.signals().pressed().connect_other(self_gd, OverworldScene::on_deck_button);

        let close_btn = self.base().get_node_as::<Button>("UI/CraftingPanel/Header/CloseButton");
        close_btn.signals().pressed().connect_other(self_gd, OverworldScene::on_close_crafting);

        let enchanter_tab = self.base().get_node_as::<Button>("UI/CraftingPanel/ModeTabs/EnchanterTab");
        enchanter_tab.signals().pressed().connect_other(self_gd, OverworldScene::on_enchanter_tab);

        let gambler_tab = self.base().get_node_as::<Button>("UI/CraftingPanel/ModeTabs/GamblerTab");
        gambler_tab.signals().pressed().connect_other(self_gd, OverworldScene::on_gambler_tab);

        let corrupt_tab = self.base().get_node_as::<Button>("UI/CraftingPanel/ModeTabs/CorruptTab");
        corrupt_tab.signals().pressed().connect_other(self_gd, OverworldScene::on_corrupt_tab);

        let deck_toggle = self.base().get_node_as::<Button>("UI/CraftingPanel/CardBrowser/DeckStashToggle/DeckButton");
        deck_toggle.signals().pressed().connect_other(self_gd, OverworldScene::on_deck_toggle);

        let stash_toggle = self.base().get_node_as::<Button>("UI/CraftingPanel/CardBrowser/DeckStashToggle/StashButton");
        stash_toggle.signals().pressed().connect_other(self_gd, OverworldScene::on_stash_toggle);

        let grid = self.base().get_node_as::<GridContainer>("UI/CraftingPanel/CardBrowser/Scroll/Grid");
        grid.signals().gui_input().connect_other(self_gd, OverworldScene::on_grid_gui_input);

        let action_btn = self.base().get_node_as::<Button>("UI/CraftingPanel/ActionSection/ActionButton");
        action_btn.signals().pressed().connect_other(self_gd, OverworldScene::on_action);

        let confirm_btn = self.base().get_node_as::<Button>("UI/CraftingPanel/ConfirmDialog/ConfirmButton");
        confirm_btn.signals().pressed().connect_other(self_gd, OverworldScene::on_confirm);

        let cancel_btn = self.base().get_node_as::<Button>("UI/CraftingPanel/ConfirmDialog/CancelButton");
        cancel_btn.signals().pressed().connect_other(self_gd, OverworldScene::on_cancel);

        let accept_btn = self.base().get_node_as::<Button>("UI/CraftingPanel/ResultSection/AcceptButton");
        accept_btn.signals().pressed().connect_other(self_gd, OverworldScene::on_accept_result);

        self.build_legend();
    }

    fn start_run(&mut self) {
        // Try to load existing run state (e.g., returning from battle)
        if let Some(existing) = game_state::take_run_state() {
            self.run = Some(existing);
        } else {
            let starter = all_starter_cards();
            self.run = Some(RunState::new(30, 30, starter));
        }
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
        let mut container: Gd<Node2D> = ui.get("map_container").try_to().expect("map_container missing");
        while container.get_child_count() > 0 {
            if let Some(mut child) = container.get_child(0) {
                container.remove_child(&child);
                child.queue_free();
            }
        }
    }

    fn draw_connections(&self, ui: &Gd<CanvasLayer>) {
        let mut container: Gd<Node2D> = ui.get("map_container").try_to().expect("map_container missing");
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
        let mut container: Gd<Node2D> = ui.get("map_container").try_to().expect("map_container missing");
        for (i, node) in self.nodes.iter().enumerate() {
            let nx = (200 + node.grid_x * 150) as f32;
            let ny = (80 + node.grid_y * 90) as f32;

            let is_accessible = node.id == "start"
                || (self.hero_node_idx >= 0
                    && (self.nodes[self.hero_node_idx as usize].connections.contains(&node.id)
                        || node.connections.contains(&self.nodes[self.hero_node_idx as usize].id)));

            let is_cleared = run.defeated_nodes.contains(&node.id);
            let is_boss = node.node_type == NodeType::Boss;
            let size = if is_boss { 68.0 } else { 60.0 };

            let mut panel = Panel::new_alloc();
            panel.set_name(&format!("MapNodePanel_{}", i));
            panel.set_position(Vector2::new(nx - size / 2.0, ny - size / 2.0));
            panel.set_size(Vector2::new(size, size));
            let mut style = StyleBoxFlat::new_gd();

            let base_color = node_type_color(node.node_type);
            if is_cleared {
                style.set_bg_color(desaturate(base_color, 0.35));
                style.set_border_width_all(2);
                style.set_border_color(rgb(0x3f, 0x6f, 0x5a));
            } else if is_accessible {
                style.set_bg_color(base_color);
                style.set_border_width_all(4);
                style.set_border_color(rgb(0x4f, 0xd1, 0xc5));
            } else {
                style.set_bg_color(desaturate(base_color, 0.55));
                style.set_border_width_all(1);
                style.set_border_color(rgb(0x1e, 0x3a, 0x4c));
            }
            style.set_corner_radius_all(if is_boss { 12 } else { (size / 2.0) as i32 });
            panel.add_theme_stylebox_override("panel", &style.upcast::<StyleBox>());
            container.add_child(&panel);

            let mut label = Label::new_alloc();
            label.set_position(Vector2::new(nx - size / 2.0, ny - 14.0));
            label.set_size(Vector2::new(size, 28.0));
            label.set_text(node_type_icon(node.node_type));
            label.set_horizontal_alignment(godot::global::HorizontalAlignment::CENTER);
            label.set_vertical_alignment(godot::global::VerticalAlignment::CENTER);
            label.add_theme_font_size_override("font_size", 22);
            label.add_theme_color_override(
                "font_color",
                if is_cleared || !is_accessible { rgb(0xc8, 0xc8, 0xc8) } else { rgb(0x0b, 0x1a, 0x24) },
            );
            container.add_child(&label);

            if is_cleared {
                let mut badge_bg = Panel::new_alloc();
                badge_bg.set_position(Vector2::new(nx + size / 2.0 - 12.0, ny - size / 2.0 - 10.0));
                badge_bg.set_size(Vector2::new(20.0, 20.0));
                let mut badge_style = StyleBoxFlat::new_gd();
                badge_style.set_bg_color(rgb(0x2f, 0x8f, 0x5a));
                badge_style.set_corner_radius_all(10);
                badge_bg.add_theme_stylebox_override("panel", &badge_style.upcast::<StyleBox>());
                container.add_child(&badge_bg);

                let mut badge = Label::new_alloc();
                badge.set_position(Vector2::new(nx + size / 2.0 - 12.0, ny - size / 2.0 - 12.0));
                badge.set_size(Vector2::new(20.0, 20.0));
                badge.set_text("OK");
                badge.set_horizontal_alignment(godot::global::HorizontalAlignment::CENTER);
                badge.add_theme_font_size_override("font_size", 9);
                badge.add_theme_color_override("font_color", rgb(0xe8, 0xff, 0xf0));
                container.add_child(&badge);
            }

            let mut caption = Label::new_alloc();
            caption.set_position(Vector2::new(nx - 45.0, ny + size / 2.0 + 4.0));
            caption.set_size(Vector2::new(90.0, 16.0));
            caption.set_text(node_type_name(node.node_type));
            caption.set_horizontal_alignment(godot::global::HorizontalAlignment::CENTER);
            caption.add_theme_font_size_override("font_size", 11);
            caption.add_theme_color_override(
                "font_color",
                if is_accessible && !is_cleared { rgb(0x4f, 0xd1, 0xc5) } else { rgb(0x5a, 0x6a, 0x78) },
            );
            container.add_child(&caption);
        }
    }

    fn build_legend(&self) {
        let ui = self.base().get_node_as::<CanvasLayer>("UI");
        let mut legend = VBoxContainer::new_alloc();
        legend.set_name("Legend");
        // Sits clear of CraftingPanel (x: 190-1090) so it never overlaps
        // panel controls like the close button, whether the panel is open or not.
        legend.set_position(Vector2::new(1100.0, 20.0));
        legend.set_size(Vector2::new(170.0, 200.0));
        legend.add_theme_constant_override("separation", 4);

        let types = [
            NodeType::Battle,
            NodeType::Boss,
            NodeType::Rest,
            NodeType::Shop,
            NodeType::Enchanter,
            NodeType::Gambler,
        ];
        for t in types {
            let mut row = HBoxContainer::new_alloc();
            row.add_theme_constant_override("separation", 8);

            let mut swatch = Panel::new_alloc();
            swatch.set_custom_minimum_size(Vector2::new(22.0, 22.0));
            let mut style = StyleBoxFlat::new_gd();
            style.set_bg_color(node_type_color(t));
            style.set_corner_radius_all(if t == NodeType::Boss { 5 } else { 11 });
            swatch.add_theme_stylebox_override("panel", &style.upcast::<StyleBox>());
            row.add_child(&swatch);

            let mut icon = Label::new_alloc();
            icon.set_custom_minimum_size(Vector2::new(16.0, 22.0));
            icon.set_text(node_type_icon(t));
            icon.set_horizontal_alignment(godot::global::HorizontalAlignment::CENTER);
            icon.add_theme_color_override("font_color", rgb(0x0b, 0x1a, 0x24));
            row.add_child(&icon);

            let mut name = Label::new_alloc();
            name.set_text(node_type_name(t));
            name.add_theme_color_override("font_color", rgb(0xc8, 0xd8, 0xe0));
            row.add_child(&name);

            legend.add_child(&row);
        }

        let mut container = ui;
        container.add_child(&legend);
    }

    fn draw_hero(&self, ui: &Gd<CanvasLayer>) {
        if self.hero_node_idx < 0 || self.hero_node_idx >= self.nodes.len() as i32 { return; }
        let node = &self.nodes[self.hero_node_idx as usize];
        let nx = (200 + node.grid_x * 150) as f32;
        let ny = (80 + node.grid_y * 90) as f32;
        let mut container: Gd<Node2D> = ui.get("map_container").try_to().expect("map_container missing");

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
        let mut hp_label: Gd<Label> = ui.get("hp_label").try_to().expect("hp_label missing");
        hp_label.set_text(&format!("HP: {}/{}", run.hp, run.max_hp));
        hp_label.add_theme_color_override("font_color", rgb(0x4f, 0xd1, 0xc5));

        let mut gold_label: Gd<Label> = ui.get("gold_label").try_to().expect("gold_label missing");
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
                let run = self.run.take().unwrap();
                game_state::set_run_state(run);
                self.nodes = Vec::new();
                let base = self.base_mut();
                let mut tree = base.get_tree();
                let _ = tree.change_scene_to_file("res://scenes/battle/battle.tscn");
            }
            NodeType::Rest => {
                run.heal(10);
                run.defeated_nodes.push(node.id.clone());
                self.refresh();
            }
            NodeType::Shop => {
                godot_print!("[Overworld] Opening shop");
            }
            NodeType::Enchanter => {
                self.refresh();
                self.open_crafting(CraftingMode::Enchanter);
            }
            NodeType::Gambler => {
                self.refresh();
                self.open_crafting(CraftingMode::Gambler);
            }
        }
    }

    fn open_crafting(&mut self, mode: CraftingMode) {
        if self.run.is_none() { return; }
        self.crafting_mode = mode;
        self.selected_card_idx = -1;
        self.showing_stash = false;
        self.crafting_seed += 1;
        self.hovered_crafting_slot = None;
        self.hovered_map_node = None;

        let mut panel = self.base().get_node_as::<Panel>("UI/CraftingPanel");
        panel.set_visible(true);
        self.populate_grid();
        self.sync_crafting_ui();
    }

    fn populate_grid(&self) {
        let Some(run) = self.run.as_ref() else { return };
        let mut grid = self.base().get_node_as::<GridContainer>("UI/CraftingPanel/CardBrowser/Scroll/Grid");
        while grid.get_child_count() > 0 {
            if let Some(mut child) = grid.get_child(0) {
                grid.remove_child(&child);
                child.queue_free();
            }
        }

        let cards = if self.showing_stash { &run.stash } else { &run.combat_deck };
        for (i, card) in cards.iter().enumerate() {
            let mut slot = Panel::new_alloc();
            slot.set_name(&format!("CardSlot_{}", i));
            slot.set_custom_minimum_size(Vector2::new(180.0, 70.0));
            slot.set_mouse_filter(MouseFilter::PASS);

            let can_use = self.can_craft_on_card(card);
            let is_selected = self.selected_card_idx == i as i32;
            let mut style = StyleBoxFlat::new_gd();
            if can_use {
                style.set_bg_color(rarity_color(card.rarity));
            } else {
                style.set_bg_color(rgb(0x1e, 0x3a, 0x4c));
            }
            style.set_corner_radius_all(4);
            if is_selected {
                style.set_border_color(rgb(0x4f, 0xd1, 0xc5));
                style.set_border_width_all(3);
            } else if card.corrupted {
                style.set_border_color(rgb(0xcc, 0x1a, 0x1a));
                style.set_border_width_all(2);
            }
            slot.add_theme_stylebox_override("panel", &style.upcast::<StyleBox>());

            let mut vbox = VBoxContainer::new_alloc();
            vbox.add_theme_constant_override("separation", 2);
            vbox.set_mouse_filter(MouseFilter::IGNORE);

            let mut name_label = Label::new_alloc();
            name_label.set_text(&card.name);
            name_label.set_mouse_filter(MouseFilter::IGNORE);
            name_label.add_theme_color_override("font_color", if can_use { rgb(0xe8, 0xe8, 0xe8) } else { rgb(0x6a, 0x7a, 0x8a) });
            vbox.add_child(&name_label);

            let mut row = HBoxContainer::new_alloc();
            row.set_mouse_filter(MouseFilter::IGNORE);
            let mut cost_label = Label::new_alloc();
            cost_label.set_text(&format!("Mana {}", card.cost));
            cost_label.set_mouse_filter(MouseFilter::IGNORE);
            cost_label.add_theme_color_override("font_color", rgb(0x60, 0xa5, 0xfa));
            row.add_child(&cost_label);

            let mut affix_label = Label::new_alloc();
            affix_label.set_text(&format!("{} affix", card.affixes.len()));
            affix_label.set_mouse_filter(MouseFilter::IGNORE);
            affix_label.add_theme_color_override("font_color", if can_use { rgb(0x99, 0xcc, 0xff) } else { rgb(0x6a, 0x7a, 0x8a) });
            row.add_child(&affix_label);

            vbox.add_child(&row);

            if card.corrupted {
                let mut corr_label = Label::new_alloc();
                corr_label.set_text("CORRUPTED");
                corr_label.set_mouse_filter(MouseFilter::IGNORE);
                corr_label.add_theme_color_override("font_color", rgb(0xcc, 0x1a, 0x1a));
                vbox.add_child(&corr_label);
            }

            if !can_use {
                let mut reason = Label::new_alloc();
                reason.set_text(self.ineligibility_reason(card));
                reason.set_mouse_filter(MouseFilter::IGNORE);
                reason.add_theme_color_override("font_color", rgb(0x8a, 0x4a, 0x4a));
                vbox.add_child(&reason);
            }

            slot.add_child(&vbox);
            grid.add_child(&slot);
        }
    }

    fn can_craft_on_card(&self, card: &crate::core::cards::CardDef) -> bool {
        if card.corrupted { return false; }
        match self.crafting_mode {
            CraftingMode::Enchanter => card.affixes.len() < card.rarity.max_affixes(),
            CraftingMode::Gambler => !card.affixes.is_empty(),
            CraftingMode::Corrupt => true,
        }
    }

    fn ineligibility_reason(&self, card: &crate::core::cards::CardDef) -> &'static str {
        if card.corrupted { return "Already corrupted" }
        match self.crafting_mode {
            CraftingMode::Enchanter => "Max affixes",
            CraftingMode::Gambler => "No affixes",
            CraftingMode::Corrupt => unreachable!(),
        }
    }

    fn sync_crafting_ui(&self) {
        let Some(run) = self.run.as_ref() else { return };
        let mode_color = crafting_mode_color(self.crafting_mode);
        let can_afford = run.gold >= self.crafting_mode.cost();

        let mut title = self.base().get_node_as::<Label>("UI/CraftingPanel/Header/Title");
        title.set_text(&format!("Crafting - {}", self.crafting_mode.name()));
        title.add_theme_color_override("font_color", lighten(mode_color, 0.35));

        let mut cost_label = self.base().get_node_as::<Label>("UI/CraftingPanel/ActionSection/CostLabel");
        cost_label.set_text(&format!("Cost: {}g", self.crafting_mode.cost()));
        cost_label.add_theme_color_override(
            "font_color",
            if can_afford { rgb(0xf4, 0xc4, 0x30) } else { rgb(0xcc, 0x5a, 0x3a) },
        );

        let mut action_btn = self.base().get_node_as::<Button>("UI/CraftingPanel/ActionSection/ActionButton");
        action_btn.set_text(self.crafting_mode.action_label());
        action_btn.set_disabled(!can_afford || self.selected_card_idx < 0);
        let mut action_style = StyleBoxFlat::new_gd();
        action_style.set_bg_color(if can_afford { mode_color } else { rgb(0x2a, 0x2a, 0x2a) });
        action_style.set_corner_radius_all(4);
        action_btn.add_theme_stylebox_override("normal", &action_style.upcast::<StyleBox>());

        let mut warning = self.base().get_node_as::<Label>("UI/CraftingPanel/ActionSection/WarningLabel");
        warning.set_visible(self.crafting_mode == CraftingMode::Corrupt);

        let tabs = [
            ("UI/CraftingPanel/ModeTabs/EnchanterTab", CraftingMode::Enchanter),
            ("UI/CraftingPanel/ModeTabs/GamblerTab", CraftingMode::Gambler),
            ("UI/CraftingPanel/ModeTabs/CorruptTab", CraftingMode::Corrupt),
        ];
        for (path, mode) in tabs {
            let mut tab = self.base().get_node_as::<Button>(path);
            let active = self.crafting_mode == mode;
            tab.set_pressed(active);
            let make_style = || {
                let mut style = StyleBoxFlat::new_gd();
                style.set_bg_color(if active { crafting_mode_color(mode) } else { rgb(0x16, 0x2a, 0x38) });
                style.set_corner_radius_all(4);
                if active {
                    style.set_border_width_all(2);
                    style.set_border_color(rgb(0x4f, 0xd1, 0xc5));
                }
                style
            };
            tab.add_theme_stylebox_override("normal", &make_style().upcast::<StyleBox>());
            tab.add_theme_stylebox_override("pressed", &make_style().upcast::<StyleBox>());
            tab.add_theme_color_override(
                "font_color",
                if active { rgb(0xf5, 0xf5, 0xf5) } else { rgb(0x8a, 0x9a, 0xaa) },
            );
        }
    }

    fn show_card_detail(&self, card_idx: usize) {
        let Some(run) = self.run.as_ref() else { return };
        let cards = if self.showing_stash { &run.stash } else { &run.combat_deck };
        let Some(card) = cards.get(card_idx) else { return };

        let mut detail = self.base().get_node_as::<Panel>("UI/CraftingPanel/CardDetail");
        detail.set_visible(true);

        let mut name_label = self.base().get_node_as::<Label>("UI/CraftingPanel/CardDetail/NameLabel");
        name_label.set_text(&card.name);

        let mut cost_label = self.base().get_node_as::<Label>("UI/CraftingPanel/CardDetail/CostLabel");
        cost_label.set_text(&format!("Mana: {}", card.cost));

        let mut effects_label = self.base().get_node_as::<Label>("UI/CraftingPanel/CardDetail/EffectsLabel");
        let effect_strs: Vec<String> = card.effects.iter().map(|e| format!("{:?}", e.effect)).collect();
        effects_label.set_text(&effect_strs.join(", "));

        for ai in 0..4 {
            let mut affix_node = self.base().get_node_as::<Label>(&format!("UI/CraftingPanel/CardDetail/AffixList/Affix_{}", ai));
            if let Some(affix) = card.affixes.get(ai) {
                affix_node.set_text(&affix.description);
                affix_node.set_visible(true);
            } else {
                affix_node.set_visible(false);
            }
        }

        let mut implicit = self.base().get_node_as::<Label>("UI/CraftingPanel/CardDetail/ImplicitAffix");
        if let Some(ref imp) = card.implicit_affix {
            implicit.set_text(&imp.description);
            implicit.set_visible(true);
        } else {
            implicit.set_visible(false);
        }

        let mut banner = self.base().get_node_as::<Label>("UI/CraftingPanel/CardDetail/CorruptedBanner");
        banner.set_visible(card.corrupted);
    }

    fn set_mode(&mut self, mode: CraftingMode) {
        self.crafting_mode = mode;
        self.selected_card_idx = -1;
        self.hovered_crafting_slot = None;
        let mut detail = self.base().get_node_as::<Panel>("UI/CraftingPanel/CardDetail");
        detail.set_visible(false);
        self.populate_grid();
        self.sync_crafting_ui();
    }

    #[func]
    fn on_action(&mut self) {
        let Some(run) = self.run.as_ref() else { return };
        let idx = self.selected_card_idx;
        if idx < 0 { return; }

        let cards = if self.showing_stash { &run.stash } else { &run.combat_deck };
        let Some(card) = cards.get(idx as usize) else { return };

        let mut confirm = self.base().get_node_as::<Panel>("UI/CraftingPanel/ConfirmDialog");
        let mut message = self.base().get_node_as::<Label>("UI/CraftingPanel/ConfirmDialog/Message");
        let msg = match self.crafting_mode {
            CraftingMode::Enchanter => format!("Add a random affix slot to {} for {}g?", card.name, self.crafting_mode.cost()),
            CraftingMode::Gambler => format!("Reroll a random affix on {} for {}g?", card.name, self.crafting_mode.cost()),
            CraftingMode::Corrupt => format!("This will permanently corrupt {}. The result is random and cannot be undone. Continue? ({}g)", card.name, self.crafting_mode.cost()),
        };
        message.set_text(&msg);
        confirm.set_visible(true);

        let mut confirm_btn = self.base().get_node_as::<Button>("UI/CraftingPanel/ConfirmDialog/ConfirmButton");
        let mut style = StyleBoxFlat::new_gd();
        style.set_bg_color(crafting_mode_color(self.crafting_mode));
        style.set_corner_radius_all(4);
        confirm_btn.add_theme_stylebox_override("normal", &style.upcast::<StyleBox>());
    }

    #[func]
    fn on_confirm(&mut self) {
        let idx = self.selected_card_idx;
        if idx < 0 { return; }
        let location = if self.showing_stash { CardLocation::Stash } else { CardLocation::Deck };
        let Some(run) = self.run.as_mut() else { return };
        let cards = if self.showing_stash { &run.stash } else { &run.combat_deck };
        let Some(original) = cards.get(idx as usize) else { return };
        self.result_original = Some(original.clone());

        let seed = self.crafting_seed;
        self.crafting_seed += 1;

        let result = match self.crafting_mode {
            CraftingMode::Enchanter => {
                run.enchanter_add_slot(location, idx as usize, seed).cloned()
            }
            CraftingMode::Gambler => {
                run.gambler_reroll_affix(location, idx as usize, seed).cloned()
            }
            CraftingMode::Corrupt => {
                run.corrupt_card(location, idx as usize, seed).cloned()
            }
        };

        if let Some(modified) = result {
            self.result_modified = Some(modified);
        }

        if let Some(run) = self.run.as_ref() {
            super::save_manager::save_run_state(run);
        }

        // Gold was just spent — keep the HUD label and the in-panel label
        // (and the action button's afford-check) in sync immediately,
        // rather than waiting for the next map refresh or grid repopulate.
        let ui = self.base().get_node_as::<CanvasLayer>("UI");
        if let Some(run) = self.run.as_ref() {
            self.update_hud(&ui, run);
        }
        self.sync_crafting_ui();

        let mut confirm = self.base().get_node_as::<Panel>("UI/CraftingPanel/ConfirmDialog");
        confirm.set_visible(false);

        self.populate_result_section();
        let mut result = self.base().get_node_as::<Panel>("UI/CraftingPanel/ResultSection");
        result.set_visible(true);
    }

    fn populate_result_section(&self) {
        let mut outcome_label = self.base().get_node_as::<Label>("UI/CraftingPanel/ResultSection/OutcomeLabel");

        if self.crafting_mode == CraftingMode::Corrupt {
            if let Some(run) = self.run.as_ref() {
                match run.last_corrupt_outcome {
                    Some(crate::core::cards::affix::CorruptOutcome::NoChange) => {
                        outcome_label.set_text("No Change");
                        outcome_label.add_theme_color_override("font_color", rgb(0xaa, 0xaa, 0xaa));
                    }
                    Some(crate::core::cards::affix::CorruptOutcome::Boost) => {
                        outcome_label.set_text("Boost!");
                        outcome_label.add_theme_color_override("font_color", rgb(0x4f, 0xbf, 0x4f));
                    }
                    Some(crate::core::cards::affix::CorruptOutcome::Weaken) => {
                        outcome_label.set_text("Bricked...");
                        outcome_label.add_theme_color_override("font_color", rgb(0xcc, 0x1a, 0x1a));
                    }
                    Some(crate::core::cards::affix::CorruptOutcome::RerollAffixes) => {
                        outcome_label.set_text("Rerolled!");
                        outcome_label.add_theme_color_override("font_color", rgb(0xbf, 0x7f, 0x3f));
                    }
                    Some(crate::core::cards::affix::CorruptOutcome::AddImplicit) => {
                        outcome_label.set_text("Implicit Added!");
                        outcome_label.add_theme_color_override("font_color", rgb(0x7f, 0x4f, 0xbf));
                    }
                    Some(crate::core::cards::affix::CorruptOutcome::AddImplicitAndBoost) => {
                        outcome_label.set_text("Implicit + Boost!");
                        outcome_label.add_theme_color_override("font_color", rgb(0xbf, 0x4f, 0xbf));
                    }
                    None => {
                        outcome_label.set_text("Corrupted");
                        outcome_label.add_theme_color_override("font_color", rgb(0xcc, 0x1a, 0x1a));
                    }
                }
            }
        } else {
            outcome_label.set_text("Operation Complete");
            outcome_label.add_theme_color_override("font_color", rgb(0x4f, 0xd1, 0xc5));
        }

        if let Some(ref original) = self.result_original {
            let mut before = self.base().get_node_as::<Panel>("UI/CraftingPanel/ResultSection/BeforeCard");
            while before.get_child_count() > 0 {
                if let Some(mut c) = before.get_child(0) { before.remove_child(&c); c.queue_free(); }
            }
            let mut vbox = VBoxContainer::new_alloc();
            vbox.add_theme_constant_override("separation", 2);

            let mut name = Label::new_alloc();
            name.set_text(&original.name);
            name.add_theme_color_override("font_color", rgb(0xe8, 0xe8, 0xe8));
            vbox.add_child(&name);

            for a in &original.affixes {
                let mut aff = Label::new_alloc();
                aff.set_text(&a.description);
                aff.add_theme_color_override("font_color", rgb(0x99, 0xcc, 0xff));
                vbox.add_child(&aff);
            }

            before.add_child(&vbox);
        }

        if let Some(ref modified) = self.result_modified {
            let mut after = self.base().get_node_as::<Panel>("UI/CraftingPanel/ResultSection/AfterCard");
            while after.get_child_count() > 0 {
                if let Some(mut c) = after.get_child(0) { after.remove_child(&c); c.queue_free(); }
            }

            let border_color = if self.crafting_mode == CraftingMode::Corrupt {
                match self.run.as_ref().and_then(|r| r.last_corrupt_outcome) {
                    Some(crate::core::cards::affix::CorruptOutcome::Boost)
                    | Some(crate::core::cards::affix::CorruptOutcome::AddImplicitAndBoost) => rgb(0x4f, 0xbf, 0x4f),
                    Some(crate::core::cards::affix::CorruptOutcome::Weaken) => rgb(0xcc, 0x1a, 0x1a),
                    Some(crate::core::cards::affix::CorruptOutcome::AddImplicit) => rgb(0x7f, 0x4f, 0xbf),
                    _ => rgb(0x5a, 0x6a, 0x78),
                }
            } else {
                rgb(0x4f, 0xbf, 0x4f)
            };
            let mut after_style = StyleBoxFlat::new_gd();
            after_style.set_bg_color(rgb(0x0f, 0x21, 0x2d));
            after_style.set_corner_radius_all(4);
            after_style.set_border_width_all(3);
            after_style.set_border_color(border_color);
            after.add_theme_stylebox_override("panel", &after_style.upcast::<StyleBox>());

            let mut vbox = VBoxContainer::new_alloc();
            vbox.add_theme_constant_override("separation", 2);

            let mut name = Label::new_alloc();
            name.set_text(&modified.name);
            name.add_theme_color_override("font_color", rgb(0xe8, 0xe8, 0xe8));
            vbox.add_child(&name);

            for a in &modified.affixes {
                let mut aff = Label::new_alloc();
                aff.set_text(&a.description);
                aff.add_theme_color_override("font_color", rgb(0x99, 0xcc, 0xff));
                vbox.add_child(&aff);
            }

            if let Some(ref imp) = modified.implicit_affix {
                let mut aff = Label::new_alloc();
                aff.set_text(&format!("-- {}", imp.description));
                aff.add_theme_color_override("font_color", rgb(0x7f, 0x4f, 0xbf));
                vbox.add_child(&aff);
            }

            after.add_child(&vbox);
        }
    }

    #[func]
    fn on_cancel(&mut self) {
        let mut confirm = self.base().get_node_as::<Panel>("UI/CraftingPanel/ConfirmDialog");
        confirm.set_visible(false);
    }

    #[func]
    fn on_accept_result(&mut self) {
        self.result_original = None;
        self.result_modified = None;
        self.selected_card_idx = -1;
        self.hovered_crafting_slot = None;
        let mut result = self.base().get_node_as::<Panel>("UI/CraftingPanel/ResultSection");
        result.set_visible(false);
        let mut detail = self.base().get_node_as::<Panel>("UI/CraftingPanel/CardDetail");
        detail.set_visible(false);
        self.populate_grid();
        self.sync_crafting_ui();
    }

    #[func]
    fn on_close_crafting(&mut self) {
        self.hovered_crafting_slot = None;
        let mut panel = self.base().get_node_as::<Panel>("UI/CraftingPanel");
        panel.set_visible(false);
        let mut detail = self.base().get_node_as::<Panel>("UI/CraftingPanel/CardDetail");
        detail.set_visible(false);
        let mut result = self.base().get_node_as::<Panel>("UI/CraftingPanel/ResultSection");
        result.set_visible(false);
        let mut confirm = self.base().get_node_as::<Panel>("UI/CraftingPanel/ConfirmDialog");
        confirm.set_visible(false);
    }

    #[func]
    fn on_enchanter_tab(&mut self) {
        self.set_mode(CraftingMode::Enchanter);
    }

    #[func]
    fn on_gambler_tab(&mut self) {
        self.set_mode(CraftingMode::Gambler);
    }

    #[func]
    fn on_corrupt_tab(&mut self) {
        self.set_mode(CraftingMode::Corrupt);
    }

    #[func]
    fn on_deck_toggle(&mut self) {
        self.showing_stash = false;
        self.selected_card_idx = -1;
        self.hovered_crafting_slot = None;
        let mut detail = self.base().get_node_as::<Panel>("UI/CraftingPanel/CardDetail");
        detail.set_visible(false);
        self.populate_grid();
        self.sync_crafting_ui();
    }

    #[func]
    fn on_stash_toggle(&mut self) {
        self.showing_stash = true;
        self.selected_card_idx = -1;
        self.hovered_crafting_slot = None;
        let mut detail = self.base().get_node_as::<Panel>("UI/CraftingPanel/CardDetail");
        detail.set_visible(false);
        self.populate_grid();
        self.sync_crafting_ui();
    }

    fn index_from_grid_pos(&self, pos: Vector2) -> Option<usize> {
        let grid = self.base().get_node_as::<GridContainer>("UI/CraftingPanel/CardBrowser/Scroll/Grid");
        let cards = if self.showing_stash {
            self.run.as_ref().map(|r| r.stash.len()).unwrap_or(0)
        } else {
            self.run.as_ref().map(|r| r.combat_deck.len()).unwrap_or(0)
        };
        for i in 0..grid.get_child_count().min(cards as i32) {
            let Some(slot) = grid.get_child(i).and_then(|c| c.try_cast::<Panel>().ok()) else { continue };
            let rect = slot.get_rect();
            if pos.x >= rect.position.x && pos.x <= rect.position.x + rect.size.x
                && pos.y >= rect.position.y && pos.y <= rect.position.y + rect.size.y
            {
                return Some(i as usize);
            }
        }
        None
    }

    fn update_map_hover(&mut self, global_pos: Vector2) {
        let screen_x = global_pos.x as i32;
        let screen_y = global_pos.y as i32;
        let mut new_hover: Option<usize> = None;
        if let Some(run) = self.run.as_ref() {
            if self.hero_node_idx >= 0 && (self.hero_node_idx as usize) < self.nodes.len() {
                let current = &self.nodes[self.hero_node_idx as usize];
                for (i, node) in self.nodes.iter().enumerate() {
                    let nx = 200 + node.grid_x * 150;
                    let ny = 80 + node.grid_y * 90;
                    if (screen_x - nx).abs() < 40 && (screen_y - ny).abs() < 40
                        && current.connections.contains(&node.id)
                        && !run.defeated_nodes.contains(&node.id)
                    {
                        new_hover = Some(i);
                        break;
                    }
                }
            }
        }
        if new_hover == self.hovered_map_node { return; }

        let ui = self.base().get_node_as::<CanvasLayer>("UI");
        let container: Gd<Node2D> = ui.get("map_container").try_to().expect("map_container missing");

        if let Some(prev) = self.hovered_map_node {
            let name = format!("MapNodePanel_{}", prev);
            for i in 0..container.get_child_count() {
                let Some(mut child) = container.get_child(i) else { continue };
                if child.get_name().to_string() == name {
                    let mut tween = child.create_tween();
                    tween.set_trans(TransitionType::QUINT);
                    tween.set_ease(EaseType::OUT);
                    tween.tween_property(&child, "scale", &Vector2::new(1.0, 1.0).to_variant(), 0.15);
                    break;
                }
            }
        }

        self.hovered_map_node = new_hover;

        if let Some(idx) = new_hover {
            let name = format!("MapNodePanel_{}", idx);
            for i in 0..container.get_child_count() {
                let Some(mut child) = container.get_child(i) else { continue };
                if child.get_name().to_string() == name {
                    let mut tween = child.create_tween();
                    tween.set_trans(TransitionType::QUINT);
                    tween.set_ease(EaseType::OUT);
                    tween.tween_property(&child, "scale", &Vector2::new(1.2, 1.2).to_variant(), 0.15);
                    break;
                }
            }
        }
    }

    fn update_crafting_hover(&mut self, new_hover: Option<usize>) {
        let grid = self.base().get_node_as::<GridContainer>("UI/CraftingPanel/CardBrowser/Scroll/Grid");

        if let Some(prev) = self.hovered_crafting_slot {
            if let Some(mut slot) = grid.get_child(prev as i32).and_then(|c| c.try_cast::<Panel>().ok()) {
                let mut tween = slot.create_tween();
                tween.set_trans(TransitionType::QUINT);
                tween.set_ease(EaseType::OUT);
                tween.set_parallel();
                tween.tween_property(&slot, "scale", &Vector2::new(1.0, 1.0).to_variant(), 0.15);
                tween.tween_property(&slot, "position", &Vector2::new(slot.get_position().x, self.hovered_slot_base_y).to_variant(), 0.15);
            }
        }

        self.hovered_crafting_slot = new_hover;

        if let Some(idx) = new_hover {
            if let Some(mut slot) = grid.get_child(idx as i32).and_then(|c| c.try_cast::<Panel>().ok()) {
                self.hovered_slot_base_y = slot.get_position().y;
                let mut tween = slot.create_tween();
                tween.set_trans(TransitionType::QUINT);
                tween.set_ease(EaseType::OUT);
                tween.set_parallel();
                tween.tween_property(&slot, "scale", &Vector2::new(1.05, 1.05).to_variant(), 0.15);
                tween.tween_property(&slot, "position", &Vector2::new(slot.get_position().x, self.hovered_slot_base_y - 10.0).to_variant(), 0.15);
            }
        }
    }

    #[func]
    fn on_grid_gui_input(&mut self, event: Gd<InputEvent>) {
        if let Ok(motion) = event.try_cast::<InputEventMouseMotion>() {
            let new_hover = self.index_from_grid_pos(motion.get_position());
            if new_hover != self.hovered_crafting_slot {
                self.update_crafting_hover(new_hover);
            }
        }
    }

    #[func]
    fn on_deck_button(&mut self) {
        godot_print!("[Overworld] Opening deck management");
    }
}

fn rgb(r: u8, g: u8, b: u8) -> Color { Color::from_rgb(r as f32 / 255.0, g as f32 / 255.0, b as f32 / 255.0) }

fn lighten(color: Color, factor: f32) -> Color {
    Color::from_rgb(
        color.r + (1.0 - color.r) * factor,
        color.g + (1.0 - color.g) * factor,
        color.b + (1.0 - color.b) * factor,
    )
}

fn desaturate(color: Color, factor: f32) -> Color {
    let gray = color.r * 0.299 + color.g * 0.587 + color.b * 0.114;
    Color::from_rgb(
        color.r + (gray - color.r) * factor,
        color.g + (gray - color.g) * factor,
        color.b + (gray - color.b) * factor,
    )
}

fn node_type_color(t: NodeType) -> Color {
    match t {
        NodeType::Battle => rgb(0xb0, 0x3a, 0x3a),
        NodeType::Boss => rgb(0x8a, 0x1a, 0x2a),
        NodeType::Rest => rgb(0x3a, 0x8a, 0x4a),
        NodeType::Shop => rgb(0xc9, 0x9a, 0x2e),
        NodeType::Enchanter => rgb(0x7a, 0x4a, 0xb0),
        NodeType::Gambler => rgb(0x3a, 0x6a, 0xb0),
    }
}

fn node_type_icon(t: NodeType) -> &'static str {
    match t {
        NodeType::Battle => "B",
        NodeType::Boss => "!",
        NodeType::Rest => "+",
        NodeType::Shop => "$",
        NodeType::Enchanter => "E",
        NodeType::Gambler => "?",
    }
}

fn crafting_mode_color(m: CraftingMode) -> Color {
    match m {
        CraftingMode::Enchanter => rgb(0x7a, 0x4a, 0xb0),
        CraftingMode::Gambler => rgb(0x3a, 0x6a, 0xb0),
        CraftingMode::Corrupt => rgb(0xb0, 0x2a, 0x2a),
    }
}

fn node_type_name(t: NodeType) -> &'static str {
    match t {
        NodeType::Battle => "Battle",
        NodeType::Boss => "Boss",
        NodeType::Rest => "Rest",
        NodeType::Shop => "Shop",
        NodeType::Enchanter => "Enchanter",
        NodeType::Gambler => "Gambler",
    }
}

fn rarity_color(rarity: Rarity) -> Color {
    match rarity {
        Rarity::Common => rgb(0x8a, 0x9a, 0xaa),
        Rarity::Uncommon => rgb(0x4f, 0xbf, 0x4f),
        Rarity::Rare => rgb(0x4f, 0x9f, 0xef),
        Rarity::Legendary => rgb(0xbf, 0x7f, 0x3f),
    }
}