---
title: Review and rename card types to thematic names (Rust core)
type: task
tags:
- godot
- rust
- cards
- naming
- theming
status: todo
priority: medium
acceptance_criteria:
- text: New card type names feel thematic to the fish/debt/underwater setting
  checked: false
- text: Card type enum/model updated in the Rust core
  checked: false
- text: Godot UI labels, color coding, and filters updated to match new type names
  checked: false
- text: cargo test and Godot playtest confirm no broken references
  checked: false
assignee: you
---

Rename generic card types ('attack', 'defense', 'equipment', 'recruit') to thematic fish/debt/underwater-city equivalents in the Rust core card model, and update Godot UI (labels, filters, color coding) to match.