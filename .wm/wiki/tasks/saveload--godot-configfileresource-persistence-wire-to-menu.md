---
title: Save/Load — Godot ConfigFile/Resource persistence, wire to menu
type: task
tags:
- godot
- p0
- persistence
- save
status: todo
priority: high
acceptance_criteria:
- text: Save writes game/run state to user:// via ConfigFile or Resource
  checked: false
- text: Load restores state and resumes at the correct scene
  checked: false
- text: Save slots persist across app restarts
  checked: false
- text: No leftover Prisma/Node/browser persistence code paths
  checked: false
assignee: you
---

Replace the old browser-localStorage save concept with Godot's native persistence (ConfigFile or Resource saved under user://). Wire save and load actions into the Godot menu scenes so slots actually persist and restore game state, instead of mock/no-op handlers.