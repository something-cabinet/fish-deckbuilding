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
cargo +nightly build -Zbuild-std --target wasm32-unknown-emscripten

mv "target/wasm32-unknown-emscripten/debug/${CRATE}.wasm" \
   "target/wasm32-unknown-emscripten/debug/${CRATE}.threads.wasm"

cargo +nightly build --features nothreads -Zbuild-std --target wasm32-unknown-emscripten
