---
title: Domain-Driven Barrel Structure
type: memory
tags: [rust, architecture, module-structure]
status: active
---

Each domain gets a folder with model/ and service/ subdirs, barrel mod.rs re-exporting everything. Consumers import from the domain barrel. Full: @wiki/patterns/domain-barrel-structure