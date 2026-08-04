---
title: WM frontmatter whitelist limitation (validator fields unwritable via API)
type: memory
tags: [wiki, tooling, wm]
status: active
---

WM tooling limitation: wm_page.update/create only persists WHITELISTED frontmatter params (title/type/status/tags/id/relates_to). Fields like rule category/rationale, pattern when_to_use/example, spec stakeholders cannot be set via the API — they land as a second frontmatter block in the body, and the validator reads the FIRST block only (rule validator). delete+recreate and wm_lint_fix don't help. Don't waste time "fixing" these warnings via wm_page — they're a tooling gap. Full: @wiki/concepts/wm-frontmatter-whitelist-limitation