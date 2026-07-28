---
title: Web Deploy Workflow — Build → Export → Serve
type: spec
id: wiki:specs:web-deploy-workflow
status: draft
tags: [spec, web, deploy, ci]
---

## Overview

Automate the full web deployment pipeline: compile Rust extension, export Godot web player, deploy to Vercel. Currently each step is manual and documented separately.

## Pipeline

```
build-web.sh (Rust → .wasm)
    → godot --headless --export (wasm + scene → HTML/JS/WASM)
        → vercel deploy (HTML/JS/WASM → production URL)
```

## Requirements

- FR-1: Single command builds Rust extension + exports Godot web player
- FR-2: Web player serves with COOP/COEP headers (threaded WASM)
- FR-3: CI can run the full pipeline on push to main
- FR-4: Vercel deploys from `godot/web/` output directory
- FR-5: Build only runs on Linux (Godot + Emscripten + Rust nightly all available)

## Acceptance Criteria

- [ ] AC-1: `./build-web.sh --export` compiles Rust + runs Godot headless export
- [ ] AC-2: Godot web export produces `index.html` + `.wasm` + `.pck` in `godot/web/`
- [ ] AC-3: `npx serve godot/web/ --cors` serves a playable game
- [ ] AC-4: Vercel deploy serves the game with COOP/COEP headers
- [ ] AC-5: CI badge shows green for the pipeline

## Open Questions

- [ ] Q1: Where should the Godot web export output go? `godot/web/` or `dist/`?
- [ ] Q2: Should vercel deploy be part of build-web.sh or a separate CI job?
- [ ] Q3: Which branch triggers auto-deploy? `main` only or `investigate-godot` too?
