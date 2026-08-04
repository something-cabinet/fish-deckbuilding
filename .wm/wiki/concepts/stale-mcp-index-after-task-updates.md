---
{}
relates_to:
  - {type: references, target: wiki:tasks:overworld-engine--types-zone-data-seeded-map-generation-saveload}
---

---
title: Failure: Stale WM MCP Index After Task Create/Update
type: concept
id: wiki:concepts:stale-mcp-index-after-task-updates
tags: [failure, wm, mcp, tooling, index, task-management]
---

# Failure: Stale WM MCP Index After Task Create / Update

## What went wrong

During the overworld implementation, `wm_task.create` returned success with valid IDs, but the tasks were **invisible to the MCP server**:
- `wm_task.list` / `wm_page.list(type: task)` did not include the new tasks.
- `wm_task.get(id)` returned `NOT_FOUND` even after creation succeeded.
- `wm_page.link(...)` (to attach the spec edge) returned `NOT_FOUND` for the just-created tasks.
- `wm_task.update(status: "done")` failed repeatedly with `Invalid transition: todo → done` — even though the on-disk `.wm/wiki/tasks/*.md` file clearly showed `status: in-progress` — and an update to `in-progress` sometimes "succeeded" per the API while a subsequent `get` still returned the stale status.

Root symptom: the MCP server returns results from a **cached/in-memory index** that lags behind the markdown files on disk. The API result and the file system disagree for the same entity.

## Root cause

The WM MCP server reads an index (graph + task list) that is not invalidated synchronously when task page files are created/updated through its own API — or at least not reliably within the same session. `wm_index.status` still showed the old node counts (`graph_nodes: 184`) until a rebuild bumped it to `189`. Any decision based on the API response (e.g. "task is still todo", "task doesn't exist", "link failed") is therefore unreliable until the index is refreshed.

## Prevention

- **After `wm_task.create` or `wm_task.update`, run `wm_index_rebuild(skip_embed: true)` before trusting the result** — then re-`get` to confirm. This fixed every occurrence in this session.
- If a task transition ("`todo → done`") is rejected but the disk file looks right, rebuild the index rather than assuming the file is wrong.
- To verify ground truth, read the file directly: `grep -E "assignee|status|acceptance_criteria" .wm/wiki/tasks/<slug>.md`. The file on disk is authoritative.
- Batch the create+link sequence so links are (re)attempted after a rebuild, not against a half-refreshed index.

## Time lost

~15-20 minutes across the session (repeated create/link/status failures, index rebuilds, and re-verification).

## Related

- @wiki/tasks/overworld-engine--types-zone-data-seeded-map-generation-saveload
- @wiki/memory/overworld-map-implemented-seeded-branching-map-save-load-battle-integration