---
title: Playtest UI Bug Patterns — SVG, Dialogue, Vite HMR
type: concept
tags: [concept, ui, svg, vite, excalibur, playtesting]
---

## What went wrong
Browser playtesting of the tactical RPG UI found four bugs that are worth documenting as general patterns.

### 1. Zone Unlock Progression Dead-End (P0 — Game-Breaking)
After starting a new game and finishing the `chapter_1_intro` dialogue, all connected zones (Coral Shore, Shell Reef, etc.) remained locked (dark gray). The player was trapped in Guppy Cove with no way to progress — the game was unplayable.

**Root cause:** Three interacting issues:
- `endDialogue()` in `state.svelte.ts` never called `refreshUnlockedZones()`, so act 1 zones were never unlocked after the intro dialogue completed
- `IslandScene.syncFromState()` was only triggered by `map:zoneEntered` events (clicking a zone), not when the map screen first appeared after dialogue ended
- `registerBridge()` in `bridge.ts` had an early-return guard (intended for Vite HMR) that prevented `gameStateRef` from being updated, leading to stale state references

**Fix:** Added `refreshUnlockedZones()` in `endDialogue()`, removed the HMR stale-ref guard in `registerBridge()`, and added a `syncIslandScene()` call when switching to the `'map'` screen.

**Prevention:** Progression-critical features (zone unlocks after dialogue) must be tested in a full playthrough, not just in isolation. The `endDialogue → unlockZones → refreshMap → screenTransition` pipeline had three separate breaks that only manifested in sequence.

### 2. SVG with Duplicate Attributes is Rejected by Browser
The mana crystal sprite (`public/sprites/ui/mana-crystal.svg`) had duplicate `class` attributes on the same element:
```xml
<rect class="parchment" opacity="0.6" class="animate-pulse" .../>
```
SVG is XML, and duplicate attributes in XML are invalid. The browser silently rejects the entire image — the `<img>` tag shows a broken icon with no console error. This is easy to miss because the file opens fine in an editor or SVG viewer (which are more lenient), but the browser's XML parser is strict.

**Prevention:** Always validate SVGs after generation. Check for duplicate attributes, unclosed tags, and invalid XML. A quick `xmllint` or browser open will catch this.

### 3. Svelte `stopPropagation` Blocks Overlay Click Handlers
The dialogue box component had `onclick={(e) => e.stopPropagation()}` on the inner box element. The overlay behind it used `onclick={handleAdvance}` for click-to-advance. Since `stopPropagation` prevents the event from bubbling up, clicking inside the dialogue box did nothing.

**Prevention:** In Svelte, be deliberate about event propagation. If an overlay uses click-to-dismiss, inner panels should either:
- Call the same handler directly instead of stopping propagation
- Use a separate interaction model (e.g., dedicated "Next" button inside the panel)
- Only stop propagation when the inner element has its own distinct click behavior

### 4. Vite HMR Doesn't Reload Excalibur Scene/Bridge Files
During playtesting, changes to `IslandScene.ts` and `bridge.ts` were not picked up by Vite's hot module replacement. The browser showed stale code even after HMR. Only a full dev server restart (kill + restart `npx vite`) loaded the changes correctly.

**Root cause:** Excalibur scene files manage canvas rendering and actor lifecycles. Vite's HMR replaces modules in-place, but Excalibur's internal references to actors, components, and event handlers may hold references to the old module. The canvas state becomes inconsistent without a full page reload.

**Prevention:** When working with Excalibur scene files, scene management code, or the bridge layer, do a full browser hard-reload (Cmd+Shift+R) after code changes. If issues persist, restart the Vite dev server. Reserve HMR for pure Svelte component changes only.

## Time lost
~40 minutes diagnosing and fixing the zone unlock progression P0.
~20 minutes diagnosing each of the other three issues.

## Related
- @wiki/specs/fish-tactical-rpg