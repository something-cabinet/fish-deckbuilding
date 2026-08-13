---
tags:
- wm
- tooling
- issue-reporting
- wiki-mem
title: WM Issue Report Format — version + logs required
status: reviewed
---

## Rule

When reporting a bug or limitation against wiki-mem (or any WM tooling) upstream — e.g. a GitHub issue on https://github.com/something-cabinet/wiki-mem — the report MUST include:

- **wm-cli local version** — output of `wm-cli version` (also `which wm-cli` if useful)
- **Log output** — relevant `wm_log_recent` / `wm_log_filter` entries, or the server console log if the MCP log API returns empty (state that explicitly when logs are unavailable)
- **Platform context** — OS, Node version (e.g. `node -v`, `nvm` path), MCP server runtime
- **Minimal repro** — exact tool call(s) with parameters, plus expected vs observed on-disk result (e.g. read back the written file)
- **Control case if applicable** — a comparable call that works, to narrow the bug surface

The goal: every report should be reproducible by maintainers without a back-and-forth for environment details. Template:

```markdown
## Environment
- wm-cli version: `...` (wm-cli version)
- OS / Node: ...
- MCP runtime: ...

## Repro
1. <exact tool call with params>
2. <observed on-disk result>

## Expected
...

## Observed
...
```