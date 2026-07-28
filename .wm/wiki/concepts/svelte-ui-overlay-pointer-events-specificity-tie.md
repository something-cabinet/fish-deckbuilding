---
title: Failure: Global overlay pointer-events rule silently overrides child component's own rule
type: concept
id: wiki:concepts:svelte-ui-overlay-pointer-events-specificity-tie
tags: [failure, css, svelte, pointer-events, map]
---

## What went wrong

Map nodes in `IslandScene` (Excalibur canvas) were completely unclickable at every window size. `MapOverlay.svelte`'s root `.map-overlay` div declared `pointer-events: none` specifically so clicks would pass through to the canvas beneath it, with `.map-overlay > *` re-enabling `auto` for its own interactive children (HUD bar, legend, prompt dialogs). This is the standard pattern used throughout the UI (see `ShopPanel.svelte`, `MainMenu.svelte`, `DeckScreen.svelte`).

But `App.svelte` also has a blanket rule on the shared overlay root:
```css
.ui-overlay > :global(*) { pointer-events: auto; }
```
`MapOverlay`'s root div is a **direct child** of `.ui-overlay`, so this rule also matches it.

Both `.map-overlay.svelte-xxxxx { pointer-events: none }` and `.ui-overlay.svelte-yyyyy > *` compute to the same specificity, `(0,2,0)` (two classes each). CSS resolves specificity ties by **cascade order** — whichever rule is later in the compiled stylesheet wins. `App.svelte`'s rule happened to land later, so `pointer-events: auto` silently won, and the entire full-screen `.map-overlay` div swallowed every click before it ever reached the canvas.

## Root cause

Two independently-reasonable, independently-correct-looking CSS rules (a per-screen "let clicks pass through to canvas" rule and a shared "make overlay children clickable" rule) collided at a specificity tie, and the loser was invisible — no console error, no lint warning, `getComputedStyle` just silently reported the wrong value. It only showed up as "nothing happens when the user clicks."

## Prevention

- When a screen-level component's root needs `pointer-events: none` to let clicks fall through to a canvas/game layer below it, and it's a direct child of a shared overlay container that unconditionally sets `pointer-events: auto` on `> *`, the screen's rule needs `!important` (or a deliberately higher-specificity selector) to guarantee it wins regardless of cascade order.
- Don't trust that "my rule is more specific" holds without checking — count classes/ids on both sides, including Svelte's injected scope-hash class, which adds to specificity on **both** sides of a comparison equally and doesn't break the tie.
- Verify with `getComputedStyle(el).pointerEvents` (or `document.elementFromPoint(x, y)`) directly in a browser session when clicks silently no-op — don't assume the CSS as-written is the CSS as-applied.

## Time lost
~30-40 min of source-level Excalibur/DisplayMode investigation before the actual DOM-level CSS tie was found via headless-browser inspection (`elementFromPoint` + `getComputedStyle` + enumerating matched `CSSStyleSheet` rules).

## Related
- Fix: `src/ui/hud/MapOverlay.svelte` `.map-overlay { pointer-events: none !important; }`
- Conflicting rule: `src/App.svelte` `.ui-overlay > :global(*) { pointer-events: auto; }`
