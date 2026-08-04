---
title: Component system scan Aug 2026
type: memory
tags: [components, architecture, ui, scan]
status: active
---

Component architecture (scan 2026-08-03): App shell fish-mafia-app.tsx does manual screen switch (menu|game|library|create) via early returns; fish-mafia-game.tsx is the only consumer of the use-fish-mafia hook (snapshot GameState + FxEvent[] + actions); children get state via props drilling, never import engine reducers. Known issues from scan: ui/button.tsx dead (zero imports), undo/redo exposed by hook but never wired to UI, DESIGN.md component map stale (predates app shell + 4 screens, paths pre-src-dir), duplicate icon registry (card.tsx local 9-icon ICONS map vs canonical getCardIcon() in lib/game/icons.ts), dead props (onCellPointerUp empty callback in fish-mafia-game, SidePanel onHoverUnit no-op), components.json css path "app/globals.css" mismatch vs actual src/app/globals.css, font-display double-defined, hit flash not gated by showEffects, "Spent" pile label vs tracked spentCount.