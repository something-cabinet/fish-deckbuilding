---
title: Vite HMR Incompatible with Excalibur Scenes
type: memory
tags: [vite, hmr, excalibur, dev]
status: active
---

Vite HMR doesn't reliably reload Excalibur scene/bridge files. Excalibur holds internal references to old modules. After changing IslandScene.ts or bridge.ts, do a hard reload (Cmd+Shift+R) or restart the dev server. Full reference: @wiki/concepts/playtest-ui-bug-patterns