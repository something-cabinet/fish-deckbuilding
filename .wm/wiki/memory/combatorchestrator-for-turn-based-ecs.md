---
title: CombatOrchestrator for Turn-Based ECS
type: memory
tags: [ecs, turn-based, pattern]
status: active
---

For turn-based games in Excalibur, create a plain orchestrator class that owns ECS entities with typed Components. Exposes action methods (playCard, sellCard, endTurn), calls pure domain functions, emits state snapshots. Headless-testable without Excalibur Engine/World. Full reference: @wiki/patterns/turn-based-ecs-orchestrator