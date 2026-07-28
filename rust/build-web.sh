#!/usr/bin/env bash
set -euo pipefail

CRATE="godot_battle_scaffold"

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

# The editor loads the GDExtension for the host (native) platform while scanning
# the project, even when only exporting to Web — build a debug host lib so that
# doesn't fail with "dynamic library not found".
cargo build
