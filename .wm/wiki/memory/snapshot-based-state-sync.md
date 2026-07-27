---
title: Snapshot-Based State Sync
type: memory
tags: [ecs, state, sync, pattern]
status: active
---

Emit a full state:changed snapshot after each ECS action instead of per-field granular events. Prevents desyncs — all 5 P0 bugs were caused by granular event handlers. Full reference: @wiki/patterns/snapshot-state-sync