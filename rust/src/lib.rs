/// Godot Battle Scaffold — gdext entry point.
///
/// This is the dynamic library loaded by Godot 4.
/// The `#[gdextension]` macro generates the C entry point.
///
/// Layout:
///   - `core` — pure Rust game logic (no godot dependency), tested via `cargo test`
///   - `bridge` — gdext classes that bridge core to Godot scene nodes
use godot::prelude::*;

mod bridge;
mod core;

struct FishBattleExtension;

#[gdextension]
unsafe impl ExtensionLibrary for FishBattleExtension {}
