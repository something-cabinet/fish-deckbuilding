---
title: Seeded deterministic procedural map generation (mulberry32 per zone)
type: memory
tags: [pattern, procedural, seeded, rng, map-generation]
status: active
---

For deterministic procedural content (StS maps, dungs, rewards) per run seed: use mulberry32 seeded per zone (seed*7919+zoneIndex*104729), derive row counts→types→edges→layout all from rng, then run a guarantee pass so every next-row node has an incoming edge (start→boss always connected). Layout from row/cols, not rng. Full reference: @wiki/patterns/seeded-deterministic-map-generation