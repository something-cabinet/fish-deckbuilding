---
title: Scene Branch Extraction Pattern
type: memory
tags: [godot, scene, refactor, gdext]
status: active
---

Extract self-contained node branches into their own .tscn files with their own scripts owning internal @export refs. Parent only exports sub-scene root. Rust uses full paths: `self.base().get_node_as::<T>("Parent/SubScene/Child")`. Full reference: @wiki/patterns/scene-branch-extraction