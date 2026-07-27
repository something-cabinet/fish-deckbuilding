---
title: Fish Roguelite Deckbuilding — Conventions
type: core
id: wiki:core:conventions
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
npm test          # run all tests
npm run test:watch  # watch mode
```
@wiki/rules/tdd

## Code Conventions

**Game logic**: Pure TypeScript functions in `src/game/combat/`. No side effects, no DOM access. All state in → new state out.

**UI components**: Svelte 5 with `$state` runes. Components call tested controllers — they don't implement game logic. No tests required.

**State**: Run/combat split. `RunState` persists across battles, `CombatState` is per-battle. The run deck is COPIED into the battle deck — never mutated during combat.
@wiki/patterns/run-combat-state-split

**Card system**: 3-purpose cards — `coinValue` (sell), `attack` (play), `defense` (block). Cards have `effects[]` and `keywords[]` that are resolved by the Effects/Keywords modules.

**Enemies**: Flat `EnemyInstance[]` array with HP, attack, defense, intent, strategy. No grid positions.

**Testing**: Vitest, ~500ms for 79 tests. New test files go in `src/game/combat/__tests__/`.

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
3. **Pure functions** — game logic has no side effects
4. **State split** — run state and combat state are separate
5. **Battle deck is a copy** — never mutate the run deck during combat
6. **CSS variables** — colors only in `app.css`, components use `var(--name)`
