---
title: Pattern: Godot Web Deploy Pipeline
type: pattern
id: wiki:patterns:godot-web-deploy-pipeline
tags: [pattern, godot, web, deploy, ci]
---

## Problem
Building and deploying a godot-rust game to web requires multiple tools: Rust nightly, Emscripten SDK, Godot editor, and a hosting platform. The steps are easy to forget.

## Solution
Single pipeline script that chains: Rust compile → WASM rename → Godot headless export → deploy.

```bash
# 1. Build Rust extension (produces .wasm side-module)
cargo +nightly build -Zbuild-std --target wasm32-unknown-emscripten
mv target/.../mycrate.wasm target/.../mycrate.threads.wasm
cargo +nightly build --features nothreads -Zbuild-std --target wasm32-unknown-emscripten

# 2. Export Godot web player
godot --path godot/ --export-release "Web" --headless

# 3. Deploy (vercel, itch.io, etc)
npx serve godot/web/ --cors
```

## Key Files
- `rust/build-web.sh` — Rust + Godot export
- `godot/export_presets.cfg` — Web preset with Extensions + Thread Support
- `godot/battle.gdextension` — Maps .wasm files per platform (web.debug.threads.wasm32, web.debug.wasm32)
- `vercel.json` — COOP/COEP headers for threaded WASM

## When to Use
- Initial web deployment for a godot-rust project
- CI pipeline for automatic web builds

## Related
- @wiki/specs:godot-battle-scaffold
- @wiki/specs:web-deploy-workflow
- @wiki/concepts:gdext-bridge-pattern
