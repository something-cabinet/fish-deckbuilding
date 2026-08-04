---
title: app-shell-screen-orchestration
type: decision
---

## Context

Fish Mafia has grown beyond a single game view to include multiple discrete screens:
- Menu (Start / Settings / Card Library / Card Create)
- Game (turn-based tactics board)
- Card Library (browsable collection with filters)
- Card Create (form + live preview)

Each screen is independent (different UX, different data requirements) and must be mutually exclusive. The app needed a clean way to:
1. Track which screen is active
2. Route between screens with minimal prop drilling
3. Manage persistent state (settings, custom cards) that survives navigation
4. Preserve fresh game runs on each "Start" (remount the game component with a new key)

## Decision

Use a **shell component (`FishMafiaApp`) with an `enum` discriminator** and **`switch` dispatch** to orchestrate screen switching:

```tsx
enum Screen {
  Menu,
  Game,
  Library,
  Create,
}

export function FishMafiaApp() {
  const [screen, setScreen] = useState<Screen>(Screen.Menu)
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS)
  const [customCards, setCustomCards] = useState<CardDef[]>([])
  const [runKey, setRunKey] = useState(0)

  switch (screen) {
    case Screen.Menu:
      return <MenuScreen ... />
    case Screen.Library:
      return <CardLibraryScreen ... />
    case Screen.Create:
      return <CardCreateScreen ... />
    case Screen.Game:
      return <FishMafiaGame key={runKey} ... />
    default: {
      const _exhaustive: never = screen // adding a member → compile error here
      return null
    }
  }
}
```

**Rationale:**
- **Single symbol, rename-safe** — `Screen.Menu` is one named symbol; renaming the concept (or reordering members) updates one declaration, never per-site string edits
- **Value-less members** — no magic values in code; every site references a named member, not `0`/`1`/`2`/`3`
- **O(1) dispatch** — a `switch` over dense numeric enum members compiles to a jump table; no linear if-chain
- **Compile-time exhaustive dispatch** — the `default` branch's `const _exhaustive: never = screen` makes adding a screen member a compile error until its `case` exists; no silent fallthrough
- **Single source of truth** — app state lives in one place, screens receive immutable props
- **Persistent state survives navigation** — settings/customCards stay in app state across screen changes
- **Fresh game per run** — `runKey` bumps on Start, remounting `FishMafiaGame` with a new seed
- **No routing library** — keeps dependencies light; simple enough that a router adds friction, not clarity

## Alternatives Considered

1. **String-literal union (`type Screen = "menu" | ...`)** — Pros: value is a plain string, zero runtime emission. Cons: duplicated literals at every comparison/set site; renaming requires multi-site edits; implicit-fallthrough dispatch (the last unhandled case renders silently). Rejected for single-symbol refactorability and exhaustive dispatch.
2. **If-chain dispatch over the enum** — Pros: simple. Cons: linear comparisons, implicit fallthrough risk. Superseded by `switch` (jump table + mandatory `default`).
3. **React Router** — Pros: URL sync, deep linking, browser history. Cons: Overkill for 4 screens, adds bundle/config overhead.
4. **Context for each screen** — Pros: Flexible. Cons: Prop drilling returns; hard to orchestrate transitions; scattered state.
5. **Reducer for screen dispatch** — Pros: Scales to many screens. Cons: Boilerplate; not justified for 4 simple cases.

## Consequences

- **Adding a new screen is compile-guided** — add a member to the enum, add its `case`, and the `default` `never` check confirms both
- **No URL state** — browser back/forward does not work between screens. Acceptable for a game app, would need routing if this changes
- **All persistent state centralizes in FishMafiaApp** — settings, custom cards, future player profiles live here. Easy to extend.
- **Game remounts on each Start** — hooks reset, store resets if present. Keeps runs isolated and fresh.
- **Numeric member values** — the runtime enum object emits `0..3`; devtools show numbers. Accepted trade: `Screen.Menu` is used at every site, so no literal ever appears in code. (If serialized screen values ever become necessary, switch to string-valued members — single declaration change.)

## Implementation Notes

- Each screen (`MenuScreen`, `CardLibraryScreen`, `CardCreateScreen`, `FishMafiaGame`) receives immutable props + callbacks
- Callbacks use `setScreen(Screen.X)` to route (e.g., `onStart={() => { setRunKey(k => k+1); setScreen(Screen.Game) }}`)
- Dispatch is a `switch (screen)` with one `case` per member and a `default` holding the exhaustive `never` check — no implicit default screen
- Custom cards are managed as simple state, appended when a card is saved, and passed to `CardLibraryScreen` to display
- Settings state is plumbed into `FishMafiaGame` via props and applied to the board (movement hints, visual effects toggles)
- Note: project CONVENTIONS golden rule #7 was revised (2026-08-04) to cover both enum and union discriminators with mandatory exhaustiveness; the screen enum is the first enum-style discriminator in the UI layer

## Related

- Pattern: Targeting Arrow Dual Feedback (UI layer built on top of this architecture)
- Pattern: Card Authoring (leverages app-shell custom card state)
- Concept: Screen state orchestration without routing