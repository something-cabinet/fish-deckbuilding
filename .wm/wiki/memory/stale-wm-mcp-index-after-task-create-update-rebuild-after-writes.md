---
title: Stale WM MCP index after task create/update — rebuild after writes
type: memory
tags: [failure, wm, mcp, tooling, index]
status: active
---

WM MCP server reads a cached index that lags behind task file changes: after wm_task.create/update, list/get may return NOT_FOUND or stale status and todo→done transitions fail even when the .md on disk is correct. Fix: run wm_index_rebuild(skip_embed:true) after task writes, then re-get; verify ground truth via grep on .wm/wiki/tasks/<slug>.md. Full reference: @wiki/concepts/stale-mcp-index-after-task-updates