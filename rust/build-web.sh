#!/usr/bin/env bash
set -euo pipefail

CRATE="godot_battle_scaffold"
GODOT=${GODOT_BIN:-godot4}
GODOT=${GODOT:-godot}

RUSTFLAGS="-C link-args=-pthread \
-C target-feature=+atomics \
-C link-args=-sSIDE_MODULE=2 \
-C llvm-args=-enable-emscripten-cxx-exceptions=0 \
-Z default-visibility=hidden \
-Z link-native-libraries=no \
-Z emscripten-wasm-eh=false" \
cargo build --release -Zbuild-std --target wasm32-unknown-emscripten

mv "target/wasm32-unknown-emscripten/release/${CRATE}.wasm" \
   "target/wasm32-unknown-emscripten/release/${CRATE}.threads.wasm"

cargo build --release --features nothreads -Zbuild-std --target wasm32-unknown-emscripten

if command -v $GODOT &>/dev/null; then
  $GODOT --path ../godot/ --export-release "Web" --headless
else
  echo "godot binary not found. Install Godot 4.3+ and set GODOT_BIN. Web export skipped."
fi
