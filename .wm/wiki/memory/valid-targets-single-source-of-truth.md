---
title: Valid Targets Single Source of Truth
type: memory
tags: [pattern, ui, validation]
status: active
---

One `valid_targets()` function in core is called by bridge overlay, click validation, AI, and engine. Prevents UI/logic drift — the project's #1 P0 pattern. Full reference: @wiki/patterns/valid-targets-single-source-of-truth