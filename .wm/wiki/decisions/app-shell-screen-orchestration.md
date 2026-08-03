---
title: "Decision: App Shell Screen Orchestration via State Union"
type: decision
status: approved
tags: ["decision", "architecture", "app-structure"]
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

Use a **shell component (`FishMafiaApp`) with a state union type** to orchestrate screen switching:

```tsx
type Screen = "menu" | "game" | "library" | "create"

export function FishMafiaApp() {
  const [screen, setScreen] = useState<Screen>("menu")
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS)
  const [customCards, setCustomCards] = useState<CardDef[]>([])
  const [runKey, setRunKey] = useState(0)

  if (screen === "menu") return <MenuScreen ... />
  if (screen === "library") return <CardLibraryScreen ... />
  if (screen === "create") return <CardCreateScreen ... />
  return <FishMafiaGame key={runKey} ... />
}
```

**Rationale:**
- **Type-safe enum dispatch** — each screen is a known case; TS catches mismatches
- **Single source of truth** — app state lives in one place, screens receive immutable props
- **Persistent state survives navigation** — settings/customCards stay in app state across screen changes
- **Fresh game per run** — `runKey` bumps on Start, remounting `FishMafiaGame` with a new seed
- **No routing library** — keeps dependencies light; simple enough that a router adds friction, not clarity

## Alternatives Considered

1. **React Router** — Pros: URL sync, deep linking, browser history. Cons: Overkill for 4 screens, adds bundle/config overhead.
2. **Context for each screen** — Pros: Flexible. Cons: Prop drilling returns; hard to orchestrate transitions; scattered state.
3. **Reducer for screen dispatch** — Pros: Scales to many screens. Cons: Boilerplate; not justified for 4 simple cases.

## Consequences

- **Adding a new screen is trivial** — add a case in the union, a new if-block, and a callback to route to it
- **No URL state** — browser back/forward does not work between screens. Acceptable for a game app, would need routing if this changes
- **All persistent state centralizes in FishMafiaApp** — settings, custom cards, future player profiles live here. Easy to extend.
- **Game remounts on each Start** — hooks reset, Zustand store resets if present. Keeps runs isolated and fresh.

## Implementation Notes

- Each screen (`MenuScreen`, `CardLibraryScreen`, `CardCreateScreen`, `FishMafiaGame`) receives immutable props + callbacks
- Callbacks use `setScreen` to route (e.g., `onStart={() => { setRunKey(k => k+1); setScreen("game") }}`)
- Custom cards are managed as simple state, appended when a card is saved, and passed to `CardLibraryScreen` to display
- Settings state is plumbed into `FishMafiaGame` via props and applied to the board (movement hints, visual effects toggles)

## Related

- Pattern: Targeting Arrow Dual Feedback (UI layer built on top of this architecture)
- Pattern: Card Authoring (leverages app-shell custom card state)
- Concept: Screen state orchestration without routing
