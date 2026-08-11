---
title: Domain-Driven Barrel Structure
type: memory
tags: [architecture, module-structure]
status: active
---

Each domain gets a folder with model/ and service/ subdirs, barrel mod.rs re-exporting everything. Consumers import from the domain barrel. Full pattern: @wiki/patterns/domain-barrel-structure