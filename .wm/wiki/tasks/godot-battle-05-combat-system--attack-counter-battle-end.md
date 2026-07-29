---
title: [godot-battle-05] Combat system — attack, counter, battle end
type: task
id: wiki:tasks:godot-battle-05-combat-system--attack-counter-battle-end
status: done
superseded_by: Combat + battle end wired in Rust bridge (battle_scene.rs:try_attack_adjacent) — attack resolution via base_attack.rs, dead units removed, victory/defeat banner with restart. AC-7, AC-10 fulfilled.
priority: medium
tags: [from-spec, spec:godot-battle-scaffold, godot, combat]
spec: wiki:specs:godot-battle-scaffold
acceptance_criteria:
  - text: "AC-7: Attacker deals ATK; if defender survives, counters for its ATK; dead units removed"
  - text: "AC-10: Unit reaching 0 HP triggers banner (Victory/Defeat) with Restart button"
---

Wire combat logic to visual layer. Base attack on adjacent enemy: damage number popup, counterattack popup. Dead units removed from grid + view. Victory/defeat banner with restart button.