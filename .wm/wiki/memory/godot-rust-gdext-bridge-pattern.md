---
title: godot-rust gdext bridge pattern
type: memory
tags: [godot, rust, gdext, architecture]
status: active
---

Rust core (pure, tested via cargo test) → gdext bridge (thin scene layer). Use #[derive(GodotClass)], StyleBoxFlat::new_gd(), try_cast returns Result. Full: @wiki/concepts/gdext-bridge-pattern