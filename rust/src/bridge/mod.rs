/// GDExt bridge — Rust classes exposed to Godot scene nodes.
///
/// These classes inherit Godot node types and are registered via
/// `#[derive(GodotClass)]`. They call the pure `core` logic and
/// update the Godot scene tree in response.
mod battle_scene;
// BattleScene is registered via #[derive(GodotClass)]; no re-export needed.
