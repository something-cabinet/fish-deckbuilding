---
title: Fish Roguelite Deckbuilding — Conventions
type: core
status: reviewed
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

### TDD — Test-First
All game logic starts with a failing test (Vitest). The engine is pure React-free TypeScript; `npm test` runs the full suite.

## Code Conventions

**Stack**: Next.js 16 + React 19 + TypeScript, Tailwind v4, shadcn (base-nova style), lucide icons, zod, Vitest.

**Engine (pure TS)**: lives in `src/lib/game/`. Zero React dependencies — testable standalone via `npm test`. Organized into domain folders (`cards/`, `units/`, `battle/`) plus `services/` (pure logic) and `helpers/` (icon/util support). Card definitions live as JSON packs in `src/lib/game/cards/*.json`, validated at load by a zod schema that throws loudly on malformed data.

**Angular-style file system** (see @wiki/specs/angular-style-file-system):
- One top-level type per file
- Role suffixes: `*.service.ts`, `*.interface.ts`, `*.model.ts`, `*.enum.ts`, `*.helper.ts`, `*.constants.ts`
- Every domain folder has an `index.ts` barrel re-exporting all public items
- Consumers import from the domain barrel only — never individual files from outside the domain
- Discriminated unions (e.g. `CardEffect`) stay together as one conceptual unit per file

**Components**: one component per file — screens and battle widgets in `src/components/game/`, shadcn primitives in `src/components/ui/`. Components never import engine internals directly.

**Hook bridge**: `src/hooks/use-fish-mafia.ts` is the only bridge between UI and the engine — it exposes the state snapshot, FX event queue, and player actions; components consume them via props drilling.

**Testing**: `npm test` (Vitest). Engine unit, resolver, command/history, schema, and card-parity tests in `src/lib/game/__tests__/`.

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
3. **Pure engine** — domain logic in `src/lib/game/` has zero React dependencies
4. **Bridge is thin** — `use-fish-mafia.ts` only translates between UI and the engine
5. **One thing per file** — one top-level type/service/helper per file with role suffixes
6. **Barrel discipline** — domain folders re-export via `index.ts`; consumers import from barrels
7. **Compiler-driven** — prefer discriminated unions and exhaustive matches over runtime checks
