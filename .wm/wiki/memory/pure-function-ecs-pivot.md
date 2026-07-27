---
title: Pure Function → ECS Pivot
type: memory
tags: [decision, architecture]
status: active
---

Game initially built with pure TypeScript functions + Svelte $state. Now pivoting to full Excalibur ECS with EventEmitter. Pure functions were great for prototyping (0 P0s in tested code). ECS is the canonical Excalibur pattern. Full entry: @wiki/decisions/pure-function-ecs-pivot