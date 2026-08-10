---
title: Return-Value Bridge Sync Pattern
type: memory
tags: [godot, rust, gdext, bridge, pattern]
status: active
---

Core functions return Vec<CardDef> and other result types so the bridge can log/display directly instead of inferring from state diffs. Full reference: @wiki/patterns/return-value-bridge-sync