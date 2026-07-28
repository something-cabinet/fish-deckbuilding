# Fish Tactical RPG — Godot + Rust

Guppy the Debtor fights through an underwater city in this tactical RPG. Built with Godot 4 and godot-rust (gdext).

## Quick Start

```bash
cd rust
cargo build                    # compile Rust extension
cargo test                     # 52 tests, no Godot needed
```

Open `godot/project.godot` in Godot 4 editor — hit F5 to run.

## Prerequisites

- Rust (nightly): `rustup toolchain install nightly`
- Godot 4.3+: [godotengine.org](https://godotengine.org/download/)
- Web export requires Emscripten: `emsdk install 3.1.74` ([emsdk](https://github.com/emscripten-core/emsdk))
- Web export requires wasm32 target:
  ```bash
  rustup component add rust-src --toolchain nightly
  rustup target add wasm32-unknown-emscripten --toolchain nightly
  ```

## Build & Run

### Native (macOS/Linux/Windows)

```bash
cd rust
cargo build
```

Open `godot/project.godot` in Godot 4 editor. The extension compiles to `rust/target/debug/libgodot_battle_scaffold.dylib` (or `.so`/`.dll`).

### Web (WASM)

```bash
source ./emsdk/emsdk_env.sh
cd rust
./build-web.sh
```

Produces `.wasm` and `.threads.wasm` in `rust/target/wasm32-unknown-emscripten/debug/`.

### In Godot Editor

Open `godot/` as a Godot 4 project. The Rust extension loads automatically via `godot/battle.gdextension`. Hit F5 to start the battle scene from the editor.

The extension recompiles automatically on code change (hot-reload). Rebuild with `cd rust && cargo build` while the editor is open.

### Web Export

```bash
source ./emsdk/emsdk_env.sh
cd rust
./build-web.sh
```

Then in Godot editor: `Project > Export...` → enable Extensions Support → export to `godot/web/`. Deploy the output with `vercel.json` (COOP/COEP headers for threaded WASM).

## Tests

```bash
cd rust
cargo test
```

52 tests across 3 domains: grid (BFS movement), combat (attack resolution), battle (turn orchestration + enemy AI).

## Project Structure

```
godot/           Godot project files (scenes, config)
rust/
  src/core/      Pure Rust game logic (no godot deps)
    grid/        Grid domain — units, state, BFS
    combat/      Combat domain — attack resolution
    battle/      Battle domain — state machine, engine, AI
  src/bridge/    gdext classes — thin Godot integration
  Cargo.toml     Rust dependencies
```

## Architecture

```
core/ (pure Rust, cargo test) → bridge/ (gdext) → Godot scenes
```

Core is tested with `cargo test`. Bridge layer is thin — no game logic, only scene tree updates and input forwarding.
