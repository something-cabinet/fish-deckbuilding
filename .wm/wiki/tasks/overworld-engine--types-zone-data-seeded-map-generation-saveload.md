---
title: Overworld engine — types, zone data, seeded map generation, save/load
type: task
tags:
- from-spec
- spec:overworld-map
- engine
status: done
priority: high
relates_to:
- type: implements
  target: wiki:specs:overworld-map
acceptance_criteria:
- text: 'AC-1: Map shows a branching path with 5-7 rows of 2-3 nodes per zone'
  checked: false
- text: 'AC-16: State is saved to localStorage on node transitions'
  checked: false
- text: 'AC-19: Visited nodes are greyed, current node highlighted'
  checked: false
- text: 'NFR-1: map generation deterministic given a seed'
  checked: false
- text: 'NFR-3: save state < 50KB'
  checked: false
assignee: you
---

Implement overworld-types.ts (Zone, MapNode, OverworldState, NodeType, ZoneId), overworld-data.ts (3 zones: Shallows/Midwaters/Depths, boss defs, node layouts), overworld-engine.ts (seeded deterministic map generation, state transitions, localStorage save/load). Map: 5-7 rows of 2-3 nodes, branch/merge edges, Battle/Rest/Boss node types. Save key `fish-mafia-save`.