---
title: agent
type: core
id: wiki:core:agent
status: reviewed
relates_to:
  - {type: relates_to, target: wiki:core:spec}
---

# agent.md — Working in Fish Mafia

Guidance for AI agents (and humans) contributing to **Fish Mafia: Ledger Tactics**.
Read this alongside `product.md` (what the game is) and `design.md` (how it looks).
See @wiki/core/spec for the upcoming-feature roadmap.

---

## 1. Golden rules

1. **Game logic is pure and lives in `src/lib/game/`.** It must contain *no* React, no
   DOM, and no side effects. Every mutation returns a **new** `GameState` — never
   mutate the incoming state object. This keeps the engine testable and the hook
   predictable.
2. **No randomness during render.** `createInitialState()` is deterministic so SSR
   and the first client render match. All shuffling/drawing happens in
   `startGame()`, which only runs on the client (mount `useEffect` or a user
   click). Breaking this reintroduces hydration mismatches.
3. **The hook is the only bridge.** `src/hooks/use-fish-mafia.ts` owns React state,
   timers, and the enemy-turn choreography. Components receive data + callbacks
   from it; they never call the engine directly.
4. **Components are presentational.** Anything in `src/components/game/` renders state
   and forwards user intent upward. Keep engine imports out of them (types are OK).

---

## 2. Architecture map

All application code lives under `src/` (Next.js src-dir layout; `@/*` aliases to
`src/`). `public/` stays at the repo root and serves `/sprites/{kind}.png`.

```
src/app/
  page.tsx         entry → <FishMafiaGame /> (server component, no logic)
  layout.tsx       fonts (Inter + Oswald), metadata, dark class, Analytics
  globals.css      Tailwind v4 + design tokens + fm-* keyframes
src/lib/game/
  types.ts         GameState, Unit, CardDef, CardInstance, Pos, FxEvent,
                   COLS/ROWS, CardTarget, Phase, LogEntry
  data.ts          CARD_LIBRARY, STARTER_DECK (ids), HERO_DEF,
                   ENEMY_SPAWNS, GOON_DEF, EnemySpawn
  engine.ts        pure reducers + helpers + enemy AI planning
src/hooks/
  use-fish-mafia.ts   React state + timers + enemy-turn choreography + FX queue
src/components/game/
  fish-mafia-game.tsx  top-level: drag/drop + tap wiring, layout bands, Buy/End Turn
  board.tsx            grid, tiles, reachable dots, target rings, drop zones
  unit-token.tsx       circular fish token, HP bar, ATK/HP plates, animations
  card.tsx             hand card: cost, type, art, SELL price, tap/drag/armed
  top-bar.tsx          coin, interest, foreclosure clock, turn label
  side-panel.tsx       roster ("ON THE TABLE") + bulletin log
  result-overlay.tsx   win/lose screen + restart
  particle-canvas.tsx  imperative canvas FX (bursts, floating numbers)
src/components/ui/
  button.tsx           shadcn-style button (CVA + slot)
```

Data flow: **user event → component callback → hook → engine (pure) → new state →
re-render**. FX are queued by the hook and drawn by `particle-canvas`.

Engine API (all pure; state-changing ones return `{ state, fx }` or new state):
`createInitialState`, `startGame(base?)`, `selectUnit`, `moveUnit`, `unitAttack`,
`canCast`, `cardTargets`, `castCard`, `sellCard`, `buyCard`, `startEnemyPhase`,
`planEnemyTurn`, `applyEnemyStep`, `beginPlayerTurn`, `reachableTiles`, `posKey`,
`cellLabel`, `unitAt`, `heroUnit`, `BUY_COST = 3`.

---

## 3. How to add things

### Add a card
Add a `CardDef` to `CARD_LIBRARY` in `data.ts` (id, name, type `attack | skill |
summon`, cost, value, target `enemy | ally | unit | self | empty-tile`, desc,
icon, fx). Then append its id to `STARTER_DECK`. If the effect kind is new, handle
it in the engine's `castCard` switch **and** add a matching FX case in
`particle-canvas`.

### Add a unit / enemy
Add an `EnemySpawn` to `ENEMY_SPAWNS` in `data.ts` (or extend `GOON_DEF` for
summons). If it needs new AI behavior, extend `planEnemyTurn` in `engine.ts` —
keep the decision logic pure and emit `EnemyStep` descriptors for the hook to
apply via `applyEnemyStep`.

### Add an effect type
1. Extend the effect union in `types.ts`.
2. Resolve it in the engine's `castCard` switch.
3. Emit an FX descriptor and render it in `particle-canvas.tsx`.

---

## 4. Conventions

- **Coordinates:** `Pos = { x, y }`, `x` = column (0-indexed, shown A–I), `y` = row
  (0-indexed, shown 1–5). Use `posKey(p)` for map keys. Don't invent parallel
  coordinate systems.
- **IDs:** units use stable string ids (`hero`, `enemy_0`, `goon_1`); cards use
  `uid`. Never key React lists by array index for units/cards.
- **Imports:** use `@/` aliases (`@/lib/game/engine`, `@/components/game/...`,
  `@/hooks/...`) — they resolve inside `src/`.
- **Styling:** Tailwind v4 + design tokens only (`bg-card`, `text-gold`,
  `ring-enemy`, `bg-ocean-deep`, …). No raw hex in components, no
  `bg-white`/`text-black`. See `design.md` for the token list.
- **Timing:** all animation delays live in the hook. Enemy phase runs
  `planEnemyTurn` → sequential `applyEnemyStep` (480 ms per attack, 300 ms per
  move) → `beginPlayerTurn`, all gated by the hook's `busy` flag so input is
  locked during enemy turns.

---

## 5. Before you finish

- [ ] `npm run build` from `src/` succeeds (and `pnpm exec tsc --noEmit` is clean
      if you touched types).
- [ ] No new randomness in render / `createInitialState`.
- [ ] Engine changes returned new state (no mutation) and stayed React-free.
- [ ] Verified the affected flow in the browser, not just a successful compile.
- [ ] New colors/fonts go through tokens in `globals.css`, not inline values.

---

## 6. Gotchas

- Generated fish PNGs do **not** have true alpha — they are drawn as solid-bg
  circular tokens clipped by `rounded-full` + `object-cover` in `unit-token.tsx`.
  Regenerate with a *solid flat background*, never "transparent". Sprites live in
  `public/sprites/{hero|goon|thug|enforcer|boss}.png` and must exist for drag
  ghosts and tokens.
- The enemy turn is asynchronous (timed). Guard against double-input by respecting
  the hook's `busy` flag; don't fire engine actions while it's true.
- Tunables live in `engine.ts`: `BUY_COST = 3`, `HAND_START = 5`, `HAND_MAX = 8`,
  foreclosure starts at 15, mana ramps `maxMana` by +1 up to 10. Interest ticks
  +1 per player turn and every 4th turn grants enemies +1 ATK.
- `revalidate`/caching and integrations are not used — this is a client-only game.