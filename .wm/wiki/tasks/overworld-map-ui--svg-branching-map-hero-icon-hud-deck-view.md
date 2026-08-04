---
title: Overworld map UI — SVG branching map, hero icon, HUD, deck view
type: task
tags:
- from-spec
- spec:overworld-map
- ui
status: done
priority: high
relates_to:
- type: implements
  target: wiki:specs:overworld-map
acceptance_criteria:
- text: 'AC-2: Battle, Rest, and Boss nodes have distinct visual styles'
  checked: false
- text: 'AC-3: Hero icon is visible on the current node'
  checked: false
- text: 'AC-4: Connected reachable nodes are clickable and highlighted'
  checked: false
- text: 'AC-12: Locked zones show a lock icon on the entry node'
  checked: false
- text: 'AC-13: Gold total displays on map HUD'
  checked: false
- text: 'AC-14: Hero HP displays on map HUD'
  checked: false
- text: 'AC-15: Deck screen shows current cards and deck size from map HUD'
  checked: false
- text: 'NFR-2: Node layout fits 1280x720 without scrolling'
  checked: false
assignee: you
---

Add overworld-map.tsx: SVG/React node map with connections, distinct node icons (Battle red/fight, Rest green/heal, Boss gold/skull), hero icon animating along path, reachable nodes highlighted/clickable, unreachable dimmed with lock, zone themes, locked-zone lock overlay on entry. Map HUD shows gold + HP + deck-size, deck screen accessible from HUD. Fits 1280x720.