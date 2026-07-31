---
title: Snapshot-diff orchestration seam
type: memory
tags: [snapshot, orchestration, renderer]
status: active
---

Engine→renderer sync: put a pure unit-tested diff between the snapshot stream and renderers (damageOccurrences/diffSnapshots). Capture prev BEFORE reassigning lastSnap — diffing against the NEW snapshot silently kills all damage visuals. Damage visuals drive off snapshot diff only; events are transient flourishes. Full ref: @wiki/patterns/snapshot-diff-orchestration-seam