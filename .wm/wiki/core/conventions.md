---
title: Fish Roguelite Deckbuilding — Conventions
type: core
tags: [core, conventions]
---

---
title: Fish Roguelite Deckbuilding — Conventions
type: core
tags: [core, conventions]
---

# Conventions

## Development Workflow

### SDD — Spec First
Everything has a spec before code. Lock decisions via Socratic exploration, define ACs, then implement.
```bash
# Create a new spec
wm-spec
# Plan from spec
/wm-plan --from @doc/specs/<name>
```
@wiki/rules/spec-driven-development

### TDD — Red-Green-Refactor
All implementation starts with a failing test. Pure functions are always test-first. UI components are excluded.
```bash
npm test          # run all tests (92 tests, ~1s)
npm run test:watch  # watch mode
```
@wiki/rules/tdd

## Code Conventions

**Game logic (pure functions)**: TypeScript functions in `src/game/combat/`. No side effects, no DOM access. All state in → new state out. 79 tests. These are deterministic computations — always test-first.

**ECS orchestration**: Turn-based game actions are coordinated by `CombatOrchestrator` (`src/game/systems/`). It owns Excalibur entities with typed Components (HealthComponent, CoinComponent, TurnComponent, DeckStateComponent, etc.) and emits events after every action. 13 integration tests.

**Event bus**: Typed Excalibur EventEmitter in `src/game/events.ts`. Primary sync via `state:changed` snapshot event. Granular events only for transient UI effects.

**Bridge**: `src/game/bridge.ts` subscribes to events and syncs to Svelte `$state` reactively. UI never accesses Excalibur APIs directly — always goes through bridge or orchestrator.

**UI components**: Svelte 5 with `$state` runes. Components call the orchestrator via bridge or read from synced $state. No game logic, no orchestration, no tests required.

**State**: Run/combat split. `RunState` persists across battles, `CombatState` is per-battle. The run deck is COPIED into the battle deck — never mutated during combat.
@wiki/patterns/run-combat-state-split

**Card system**: FaB-style `action` type. All playable cards are `action` type. A card's combat role is determined by its numeric stats (attack, defense) and effects/keywords — not by a type label. Cards have 3 purposes: SELL for coins (`coinValue`), PLAY as attack (`attack`), BLOCK for defense (`defense`). Effects and keywords resolve via Effects/Keywords modules.
@wiki/decisions/fab-style-action-card-type

**Enemies**: Flat `EnemyInstance[]` array with HP, attack, defense, intent, strategy. No grid positions.

**Testing**: Vitest, ~1s for 92 tests (7 test files on pure functions + 1 on orchestrator). New test files go in `src/game/systems/__tests__/` for orchestration tests, `src/game/combat/__tests__/` for pure function tests.

## Styling

**Color palette**: CSS custom properties in `app.css`. Root variables only — no hex values in components. Theme: abyss (#0a1628), deep (#0f2236), coral (#e85d4e), gold (#f4c430), parchment (#e8dcc5).

**Naming**: camelCase for variables/functions. PascalCase for types/interfaces. Svelte files are PascalCase. Test files match their source file name with `.test.ts` suffix.

## Wiki Structure

| Type | Directory | Purpose |
|------|-----------|---------|
| `core` | `wiki/core/` | Core docs (README, ARCHITECTURE, CONVENTIONS, critical learnings) |
| `task` | `wiki/tasks/` | Actionable work units |
| `spec` | `wiki/specs/` | Requirements + locked decisions |
| `rule` | `wiki/rules/` | Project rules |
| `decision` | `wiki/decisions/` | ADRs |
| `pattern` | `wiki/patterns/` | Reusable solutions |
| `concept` | `wiki/concepts/` | General docs |
| `memory` | `wiki/memory/` | Quick-recall summaries |
| `howto` | `wiki/howto/` | Step-by-step guides |
| `reference` | `wiki/reference/` | Reference material |

All pages use YAML frontmatter with `type` matching the directory. Pages are linked via `@wiki/<type>/<slug>` references.

## Golden Rules

1. **Spec first** — never write code without a spec
2. **Test first** — never implement without a failing test
3. **Pure functions** — domain logic is pure, no side effects
4. **State split** — run state and combat state are separate
5. **Battle deck is a copy** — never mutate the run deck during combat
6. **Snapshot sync** — emit full state snapshots, not per-field events
7. **Thin UI** — Svelte reads from $state, never implements game logic
8. **FaB-style action type** — all playable cards are `action` type; combat role comes from stats, not type label
9. **CSS variables** — colors only in `app.css`, components use `var(--name)`
