---
title: Bridge-Engine Deadlock Pattern
type: memory
tags: [failure, orchestration]
status: active
---

Three-layer deadlock between bridge selection, move, and engine attack validation made attack impossible through UI despite working in core tests. Same root cause as critical-patterns entry: untested orchestration. Fix: valid_targets() single source of truth + integration tests. Full reference: @wiki/concepts:three-layer-bridge-deadlock