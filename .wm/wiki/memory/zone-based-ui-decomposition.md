---
title: Zone-Based UI Decomposition
type: memory
tags: [ui, architecture, svelte]
status: active
---

Decompose game screens into self-contained zone components with CSS Grid layout coordinator. Each zone gets its own folder (zones/{name}/), scoped styles, and owns its state derivation. Modals handled separately via ModalHost. BattleHUD went from 812→190 lines. Full reference: @wiki/patterns/zone-based-ui-decomposition