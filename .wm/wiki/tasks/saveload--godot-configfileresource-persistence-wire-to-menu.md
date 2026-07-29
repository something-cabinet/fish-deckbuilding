---
title: Save/Load — Godot ConfigFile/Resource persistence, wire to menu
type: task
id: wiki:tasks:saveload--godot-configfileresource-persistence-wire-to-menu
status: todo
priority: high
tags: [godot, p0, persistence, save]
acceptance_criteria:
  - text: "Save writes game/run state to user:// via ConfigFile or Resource"
  - text: "Load restores state and resumes at the correct scene"
  - text: "Save slots persist across app restarts"
  - text: "No leftover Prisma/Node/browser persistence code paths"
---

Replace the old browser-localStorage save concept with Godot's native persistence (ConfigFile or Resource saved under user://). Wire save and load actions into the Godot menu scenes so slots actually persist and restore game state, instead of mock/no-op handlers.