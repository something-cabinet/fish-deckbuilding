use godot::classes::{
    Button, CanvasLayer, GridContainer, INode2D, InputEvent, InputEventMouseButton, Label,
    Line2D, Node2D, Panel, StyleBox, StyleBoxFlat,
};
use godot::global::MouseButton;
use godot::prelude::*;

use crate::core::cards::Rarity;
use crate::core::{
    overworld::{NodeType, OverworldNode, RunState, create_zone_1},
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

        let grid = self.base().get_node_as::<GridContainer>("UI/CraftingPanel/CardBrowser/Grid");
        grid.signals().gui_input().connect_other(self_gd, OverworldScene::on_grid_gui_input);

        let action_btn = self.base().get_node_as::<Button>("UI/CraftingPanel/ActionSection/ActionButton");
        action_btn.signals().pressed().connect_other(self_gd, OverworldScene::on_action);

        let confirm_btn = self.base().get_node_as::<Button>("UI/CraftingPanel/ConfirmDialog/ConfirmButton");
        confirm_btn.signals().pressed().connect_other(self_gd, OverworldScene::on_confirm);

        let cancel_btn = self.base().get_node_as::<Button>("UI/CraftingPanel/ConfirmDialog/CancelButton");
        cancel_btn.signals().pressed().connect_other(self_gd, OverworldScene::on_cancel);

        let accept_btn = self.base().get_node_as::<Button>("UI/CraftingPanel/ResultSection/AcceptButton");
        accept_btn.signals().pressed().connect_other(self_gd, OverworldScene::on_accept_result);
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
                self.open_crafting(CraftingMode::Enchanter);
            }
            NodeType::Gambler => {
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

        let mut panel = self.base().get_node_as::<Panel>("UI/CraftingPanel");
        panel.set_visible(true);
        self.populate_grid();
        self.sync_crafting_ui();
    }

    fn populate_grid(&self) {
        let Some(run) = self.run.as_ref() else { return };
        let mut grid = self.base().get_node_as::<GridContainer>("UI/CraftingPanel/CardBrowser/Grid");
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
            slot.set_size(Vector2::new(180.0, 80.0));

            let can_use = self.can_craft_on_card(card);
            let mut style = StyleBoxFlat::new_gd();
            if can_use {
                style.set_bg_color(rarity_color(card.rarity));
            } else {
                style.set_bg_color(rgb(0x1e, 0x3a, 0x4c));
            }
            style.set_corner_radius_all(4);
            if card.corrupted {
                style.set_border_color(rgb(0xcc, 0x1a, 0x1a));
                style.set_border_width_all(2);
            }
            slot.add_theme_stylebox_override("panel", &style.upcast::<StyleBox>());

            let mut name_label = Label::new_alloc();
            name_label.set_position(Vector2::new(5.0, 3.0));
            name_label.set_size(Vector2::new(170.0, 20.0));
            name_label.set_text(card.name);
            name_label.add_theme_color_override("font_color", if can_use { rgb(0xe8, 0xe8, 0xe8) } else { rgb(0x6a, 0x7a, 0x8a) });
            slot.add_child(&name_label);

            let mut cost_label = Label::new_alloc();
            cost_label.set_position(Vector2::new(5.0, 25.0));
            cost_label.set_size(Vector2::new(50.0, 18.0));
            cost_label.set_text(&format!("{}g", card.cost));
            cost_label.add_theme_color_override("font_color", rgb(0xf4, 0xc4, 0x30));
            slot.add_child(&cost_label);

            let mut affix_label = Label::new_alloc();
            affix_label.set_position(Vector2::new(60.0, 25.0));
            affix_label.set_size(Vector2::new(120.0, 18.0));
            affix_label.set_text(&format!("{} affix", card.affixes.len()));
            affix_label.add_theme_color_override("font_color", if can_use { rgb(0x99, 0xcc, 0xff) } else { rgb(0x6a, 0x7a, 0x8a) });
            slot.add_child(&affix_label);

            if card.corrupted {
                let mut corr_label = Label::new_alloc();
                corr_label.set_position(Vector2::new(5.0, 45.0));
                corr_label.set_size(Vector2::new(170.0, 18.0));
                corr_label.set_text("CORRUPTED");
                corr_label.add_theme_color_override("font_color", rgb(0xcc, 0x1a, 0x1a));
                slot.add_child(&corr_label);
            }

            if !can_use {
                let mut reason = Label::new_alloc();
                reason.set_position(Vector2::new(5.0, 60.0));
                reason.set_size(Vector2::new(170.0, 18.0));
                reason.set_text(self.ineligibility_reason(card));
                reason.add_theme_color_override("font_color", rgb(0x8a, 0x4a, 0x4a));
                slot.add_child(&reason);
            }

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
            CraftingMode::Corrupt => "",
        }
    }

    fn sync_crafting_ui(&self) {
        let Some(run) = self.run.as_ref() else { return };

        let mut gold_display = self.base().get_node_as::<Label>("UI/CraftingPanel/Header/GoldDisplay");
        gold_display.set_text(&format!("Gold: {}", run.gold));

        let mut cost_label = self.base().get_node_as::<Label>("UI/CraftingPanel/ActionSection/CostLabel");
        cost_label.set_text(&format!("Cost: {}g", self.crafting_mode.cost()));

        let mut action_btn = self.base().get_node_as::<Button>("UI/CraftingPanel/ActionSection/ActionButton");
        action_btn.set_text(self.crafting_mode.action_label());
        let can_afford = run.gold >= self.crafting_mode.cost();
        action_btn.set_disabled(!can_afford || self.selected_card_idx < 0);

        let mut warning = self.base().get_node_as::<Label>("UI/CraftingPanel/ActionSection/WarningLabel");
        warning.set_visible(self.crafting_mode == CraftingMode::Corrupt);

        let mut enchanter_tab = self.base().get_node_as::<Button>("UI/CraftingPanel/ModeTabs/EnchanterTab");
        let mut gambler_tab = self.base().get_node_as::<Button>("UI/CraftingPanel/ModeTabs/GamblerTab");
        let mut corrupt_tab = self.base().get_node_as::<Button>("UI/CraftingPanel/ModeTabs/CorruptTab");
        enchanter_tab.set_pressed(self.crafting_mode == CraftingMode::Enchanter);
        gambler_tab.set_pressed(self.crafting_mode == CraftingMode::Gambler);
        corrupt_tab.set_pressed(self.crafting_mode == CraftingMode::Corrupt);
    }

    fn show_card_detail(&self, card_idx: usize) {
        let Some(run) = self.run.as_ref() else { return };
        let cards = if self.showing_stash { &run.stash } else { &run.combat_deck };
        let Some(card) = cards.get(card_idx) else { return };

        let mut detail = self.base().get_node_as::<Panel>("UI/CraftingPanel/CardDetail");
        detail.set_visible(true);

        let mut name_label = self.base().get_node_as::<Label>("UI/CraftingPanel/CardDetail/NameLabel");
        name_label.set_text(card.name);

        let mut cost_label = self.base().get_node_as::<Label>("UI/CraftingPanel/CardDetail/CostLabel");
        cost_label.set_text(&format!("Cost: {}g", card.cost));

        let mut effects_label = self.base().get_node_as::<Label>("UI/CraftingPanel/CardDetail/EffectsLabel");
        let effect_strs: Vec<String> = card.effects.iter().map(|e| format!("{:?}", e.effect)).collect();
        effects_label.set_text(&effect_strs.join(", "));

        for ai in 0..4 {
            let mut affix_node = self.base().get_node_as::<Label>(&format!("UI/CraftingPanel/CardDetail/AffixList/Affix_{}", ai));
            if let Some(affix) = card.affixes.get(ai) {
                affix_node.set_text(affix.description);
                affix_node.set_visible(true);
            } else {
                affix_node.set_visible(false);
            }
        }

        let mut implicit = self.base().get_node_as::<Label>("UI/CraftingPanel/CardDetail/ImplicitAffix");
        if let Some(ref imp) = card.implicit_affix {
            implicit.set_text(imp.description);
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
        if run.gold < self.crafting_mode.cost() { return; }

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
    }

    #[func]
    fn on_confirm(&mut self) {
        let idx = self.selected_card_idx;
        if idx < 0 { return; }
        let Some(run) = self.run.as_mut() else { return };
        let cards = if self.showing_stash { &run.stash } else { &run.combat_deck };
        let Some(original) = cards.get(idx as usize) else { return };
        self.result_original = Some(original.clone());

        let seed = self.crafting_seed;
        self.crafting_seed += 1;

        let result = match self.crafting_mode {
            CraftingMode::Enchanter => {
                run.enchanter_add_slot(idx as usize, seed).cloned()
            }
            CraftingMode::Gambler => {
                run.gambler_reroll_affix(idx as usize, seed).cloned()
            }
            CraftingMode::Corrupt => {
                run.corrupt_card(idx as usize, seed).cloned()
            }
        };

        if let Some(modified) = result {
            self.result_modified = Some(modified);
        }

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
            let mut name = Label::new_alloc();
            name.set_position(Vector2::new(5.0, 5.0));
            name.set_size(Vector2::new(280.0, 20.0));
            name.set_text(original.name);
            name.add_theme_color_override("font_color", rgb(0xe8, 0xe8, 0xe8));
            before.add_child(&name);

            let mut affix_text = String::new();
            for a in &original.affixes {
                affix_text.push_str(a.description);
                affix_text.push('\n');
            }
            let mut aff = Label::new_alloc();
            aff.set_position(Vector2::new(5.0, 30.0));
            aff.set_size(Vector2::new(280.0, 200.0));
            aff.set_text(&affix_text);
            aff.add_theme_color_override("font_color", rgb(0x99, 0xcc, 0xff));
            before.add_child(&aff);
        }

        if let Some(ref modified) = self.result_modified {
            let mut after = self.base().get_node_as::<Panel>("UI/CraftingPanel/ResultSection/AfterCard");
            while after.get_child_count() > 0 {
                if let Some(mut c) = after.get_child(0) { after.remove_child(&c); c.queue_free(); }
            }
            let mut name = Label::new_alloc();
            name.set_position(Vector2::new(5.0, 5.0));
            name.set_size(Vector2::new(280.0, 20.0));
            name.set_text(modified.name);
            name.add_theme_color_override("font_color", rgb(0xe8, 0xe8, 0xe8));
            after.add_child(&name);

            let mut affix_text = String::new();
            for a in &modified.affixes {
                affix_text.push_str(a.description);
                affix_text.push('\n');
            }
            if let Some(ref imp) = modified.implicit_affix {
                affix_text.push_str("-- ");
                affix_text.push_str(imp.description);
                affix_text.push('\n');
            }
            let mut aff = Label::new_alloc();
            aff.set_position(Vector2::new(5.0, 30.0));
            aff.set_size(Vector2::new(280.0, 200.0));
            aff.set_text(&affix_text);
            aff.add_theme_color_override("font_color", rgb(0x99, 0xcc, 0xff));
            after.add_child(&aff);
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
        let mut result = self.base().get_node_as::<Panel>("UI/CraftingPanel/ResultSection");
        result.set_visible(false);
        let mut detail = self.base().get_node_as::<Panel>("UI/CraftingPanel/CardDetail");
        detail.set_visible(false);
        self.populate_grid();
        self.sync_crafting_ui();
    }

    #[func]
    fn on_close_crafting(&mut self) {
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
        let mut detail = self.base().get_node_as::<Panel>("UI/CraftingPanel/CardDetail");
        detail.set_visible(false);
        self.populate_grid();
        self.sync_crafting_ui();
    }

    #[func]
    fn on_stash_toggle(&mut self) {
        self.showing_stash = true;
        self.selected_card_idx = -1;
        let mut detail = self.base().get_node_as::<Panel>("UI/CraftingPanel/CardDetail");
        detail.set_visible(false);
        self.populate_grid();
        self.sync_crafting_ui();
    }

    #[func]
    fn on_grid_gui_input(&mut self, event: Gd<InputEvent>) {
        let Ok(mouse) = event.try_cast::<InputEventMouseButton>() else { return };
        if !mouse.is_pressed() || mouse.get_button_index() != MouseButton::LEFT { return; }
        let pos = mouse.get_position();
        let col = (pos.x as i32) / 190;
        let row = (pos.y as i32) / 90;
        let idx = (row * 3 + col) as usize;
        let cards = if self.showing_stash {
            self.run.as_ref().map(|r| r.stash.len()).unwrap_or(0)
        } else {
            self.run.as_ref().map(|r| r.combat_deck.len()).unwrap_or(0)
        };
        if idx < cards {
            self.selected_card_idx = idx as i32;
            self.show_card_detail(idx);
            self.sync_crafting_ui();
        }
    }

    #[func]
    fn on_deck_button(&mut self) {
        godot_print!("[Overworld] Opening deck management");
    }
}

fn rgb(r: u8, g: u8, b: u8) -> Color { Color::from_rgb(r as f32 / 255.0, g as f32 / 255.0, b as f32 / 255.0) }

fn rarity_color(rarity: Rarity) -> Color {
    match rarity {
        Rarity::Common => rgb(0x8a, 0x9a, 0xaa),
        Rarity::Uncommon => rgb(0x4f, 0xbf, 0x4f),
        Rarity::Rare => rgb(0x4f, 0x9f, 0xef),
        Rarity::Legendary => rgb(0xbf, 0x7f, 0x3f),
    }
}