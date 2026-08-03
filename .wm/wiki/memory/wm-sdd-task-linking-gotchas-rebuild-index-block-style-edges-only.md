---
title: WM SDD task-linking gotchas — rebuild index, block-style edges only
type: memory
tags: [wm, sdd, wiki-tooling, failure]
status: active
---

WM SDD task-linking gotchas (Aug 2026): (1) After creating wiki pages, run wm_index_rebuild before wm_task.list/get or SDD validation — new pages are invisible until the keyword index is rebuilt. (2) wm_page.link writes flow-style YAML edges the graph/SDD validator IGNORES; the validator only registers block-style `relates_to:\n- type: implements\n  target: wiki:specs/<name>` in task frontmatter. (3) NEVER pass relates_to to wm_page.update on task pages — it prepends broken `{}` frontmatter blocks and corrupts the file. Fix pattern: create tasks via wm_task.create with spec param, verify with wm_graph.neighbors, hand-edit block-style frontmatter if the edge is missing, then rebuild index. Full: @wiki/concepts/wm-sdd-task-linking-gotchas