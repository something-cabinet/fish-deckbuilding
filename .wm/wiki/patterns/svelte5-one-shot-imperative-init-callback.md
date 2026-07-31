---
{}
relates_to:
  - {type: references, target: wiki:specs:js-combat-vertical-slice}
---

---
title: Pattern: Svelte 5 One-Shot Imperative Init via Callback Prop
type: pattern
id: wiki:patterns:svelte5-one-shot-imperative-init-callback
tags: [pattern, svelte5, runes, pixijs, boot]
---

# Pattern: Svelte 5 One-Shot Imperative Init via Callback Prop

## Problem

Mounting an imperative, one-shot subsystem (a PixiJS Application, a WebGL canvas, a game bridge) inside a Svelte 5 component. The naive wiring — a `$state` element ref + `$bindable` prop + `$effect` that creates the subsystem when the ref is set — causes a re-render feedback loop: the effect re-runs every render, spawning a fresh subsystem and duplicate window listeners each cycle, surfacing as `effect_update_depth_exceeded` at boot with the UI half-working (state renders, but input listeners never attach).

## Solution

Child exposes the host element via a **callback prop fired once**; parent creates the subsystem in that callback with a one-shot guard:

```svelte
<!-- DeskFrame.svelte -->
<script lang="ts">
  let { onCanvasReady, ...rest }: Props = $props();
  let host = $state<HTMLDivElement | null>(null);
  $effect(() => { if (host) onCanvasReady?.(host); });
</script>
<div bind:this={host}>…</div>
```

```ts
// App.svelte (parent)
let bridge: GameBridge | null = null;
onMount(() => () => bridge?.destroy());
const onCanvasReady = (el: HTMLDivElement) => {
  if (bridge) return; // one-shot guard
  bridge = createGameBridge(el);
  bridge.start();
};
```

Companion rules (same lesson family):
- **Subscribe before start**: `controller.subscribe(handler)` BEFORE `controller.start()` so the initial synchronous snapshot reaches subscribers (no `game.snapshot` null-until-first-mutation).
- **Never let a renderer/sync exception abort input wiring**: wrap `desk.applySnapshot`/`controller.start()` in try/catch inside the subscription/start path so `addEventListener` lines always run. A renderer crash should log, not kill keyboard/mouse.

## When to Use

Any Svelte 5 component that hosts a canvas/imperative engine, or any parent that must hand an element to an imperative singleton. Also any controller that emits an initial synchronous event.

## When Not to Use

Pure declarative UI that needs no imperative mount. If the subsystem is safely re-creatable per render (cheap, idempotent), the simpler pattern is fine.

## Related

- @wiki/specs/js-combat-vertical-slice
- @wiki/memory/svelte-5-bindable-boot-loop-use-oncanvasready-callback
- Failure story: @wiki/concepts/fixer-lane-silent-noops (same session's delegation lesson)