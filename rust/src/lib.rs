use godot::prelude::*;

mod bridge;
mod core;

struct FishBattleExtension;

#[gdextension]
unsafe impl ExtensionLibrary for FishBattleExtension {}
