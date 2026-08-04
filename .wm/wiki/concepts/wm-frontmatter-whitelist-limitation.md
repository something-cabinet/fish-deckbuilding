---
{}
relates_to:
  - {type: relates_to, target: wiki:core:conventions}
---

---
title: Failure: WM frontmatter whitelist limitation
type: concept
id: wiki:concepts:wm-frontmatter-whitelist-limitation
status: draft
tags: [failure, wiki, tooling, wm]
---

## What went wrong

Wiki validation repeatedly flagged rule/pattern/spec pages for missing frontmatter fields (`category`/`rationale` on rules, `when_to_use`/`example` on patterns, `stakeholders` on specs, `context`/`options`/`rationale` on decisions) — and every attempt to add them via `wm_page.update`/`create` failed to clear the warning.

## Root cause

The WM page API only persists a **whitelist of frontmatter params** (`title`, `type`, `status`, `tags`, `id`, `relates_to`). Fields outside the whitelist in your `content` string are **demoted into the body as a second frontmatter block**, not merged into the parsed frontmatter. The validator reads the **first** block only (rule validator) — so the fields are present in the page text but never seen by the check. Even `delete` + `recreate` regenerates only the whitelisted params, and `wm_lint_fix` did not add the missing fields.

## Prevention

- Do not attempt to set non-whitelisted frontmatter fields via `wm_page` — it silently stores them as body text
- To silence these warnings, the WM tooling itself must expose the fields (or the validator must read all frontmatter blocks)
- When authoring pages that need such fields, create them with the fields present in the initial file (e.g., via direct file creation outside the API, if allowed) — or accept the warning as a known tooling gap
- Distinguish validator-field warnings (tooling limitation) from real content problems — don't burn time "fixing" the unfixable

## Time lost

~30 minutes across 10+ page updates and a delete/recreate cycle before the mechanism was identified.

## Related

- @wiki/core:conventions (the pages these warnings target)