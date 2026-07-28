use godot::prelude::*;

mod bridge;
mod core;

struct FishBattleExtension;

#[gdextension]
unsafe impl ExtensionLibrary for FishBattleExtension {
    fn on_stage_init(stage: InitStage) {
        godot_print!("[gdext] init stage {stage:?}");
    }

    fn on_stage_deinit(stage: InitStage) {
        godot_print!("[gdext] deinit stage {stage:?}");
    }
}
