---
{}
relates_to:
  - {type: references, target: wiki:tasks:restructure-engine-layer-into-domain-folders--barrels-one-typeservicehelper-per-file}
---

---
title: Failure: WM SDD task-linking gotchas — stale index, flow-style edges, frontmatter corruption
type: concept
id: wiki:concepts:wm-sdd-task-linking-gotchas
status: draft
tags: [failure, wm, sdd, wiki-tooling]
---

## What went wrong

After creating spec tasks via `wm_task.create`, SDD validation kept reporting "Spec has no linked tasks" even though tasks carried `spec: wiki:specs:<name>` tags and `relates_to` edges had been added. Worse, attempts to fix the links corrupted the task frontmatter.

Three distinct failures compounded:

1. **Stale index hides new pages.** `wm_task.list` / `wm_task.get` / `wm_search` did not see freshly created task pages (`task not found`, empty label-filter lists) until `wm_index_rebuild`. The keyword index starts unloaded (`bm25_loaded: false`); new pages need a rebuild before task tooling resolves them.

2. **`wm_page.link` flow-style edges are ignored by the graph.** `wm_page.link` writes `relates_to:\n  - {type: implements, target: ...}` (flow-style) into frontmatter. The graph extractor and SDD validator only register **block-style** edges:
   ```yaml
   relates_to:
   - type: implements
     target: wiki:specs:<name>
   ```
   After linking, `wm_graph.neighbors` still returned 0 edges and the SDD warning persisted.

3. **`wm_page.update` with `relates_to` param corrupts task frontmatter.** Passing `relates_to: [...]` to `wm_page.update` prepended broken frontmatter blocks (`---\n{}\nrelates_to:\n  - {type: relates_to, target: }\n---`) above the real frontmatter, and duplicated acceptance_criteria into flow-style `relates_to` entries. The parser then read the first (invalid) block → `wm_task.get` failed with "task not found" and version rollback was useless (only the status-change version existed).

## Root cause

WM task tooling resolves pages through an index that must be rebuilt after creates; the link tool serializes edges in a YAML form the graph ignores; and `wm_page.update` does not safely merge `relates_to` into existing task frontmatter.

## Prevention

- After creating or linking wiki pages, run `wm_index_rebuild` (with `skip_embed: true` for speed) before relying on `wm_task.list/get` or SDD validation.
- **Do not** add spec→task links with `wm_page.link`; `wm_task.create` with the `spec:` param + a block-style `relates_to` in frontmatter is the pattern the validator recognizes (see card-effect-registry tasks). Verify with `wm_graph.neighbors` after rebuild.
- **Do not** pass `relates_to` to `wm_page.update` on task pages — it corrupts frontmatter. If an edge is missing, edit the task file's frontmatter directly (block-style YAML) or delete+recreate via `wm_task.create`, then rebuild the index.
- After editing frontmatter by hand, always `wm_index_rebuild` before re-validating.

## Time lost

~20 minutes of link/unlink/update/rebuild cycles against a persistent SDD warning, ending in delete+recreate of two task pages plus manual frontmatter edits.

## Related

- @wiki/tasks/restructure-engine-layer-into-domain-folders--barrels-one-typeservicehelper-per-file
- @wiki/patterns/critical-patterns