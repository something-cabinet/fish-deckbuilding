---
title: Fish Roguelite Deckbuilding — Conventions
type: core
tags: [core, conventions]
status: reviewed
---

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

**Engine (pure TS)**: lives in `src/lib/game/`. Zero React dependencies — testable standalone via `npm test`. Organized **function-first** (see @wiki/specs/domain-layered-engine-structure): each domain (`cards/`, `units/`, `battle/`, `deck/`) owns `models/` (types), `enums/`, `constants/`, `services/` (logic), `data/` (content); game use-cases live in top-level function folders (`actions/`, `commands/`, `session/`); `shared/helpers/` holds pure cross-cutting plumbing. Card definitions live as JSON packs in `src/lib/game/cards/data/`, validated at load by a zod schema that throws loudly on malformed data.

**Angular-style file system** (see @wiki/specs/angular-style-file-system):
- One top-level type per file
- Role suffixes: `*.service.ts`, `*.interface.ts`, `*.model.ts`, `*.enum.ts`, `*.constants.ts`, `*.helper.ts`
- Every folder has an `index.ts` barrel re-exporting all public items
- Consumers import from the domain/function barrel only — never individual files from outside the domain (exception: cross-domain value imports may target a runtime-leaf segment like `battle/models` when the full barrel would create a runtime cycle — D5 of the engine-structure spec)
- Discriminated unions (e.g. `CardEffect`) stay together as one conceptual unit per file

**Layer discipline**: shared ← units/deck ← cards ← battle ← {actions, commands, session}. `cards/`/`units/`/`deck/`/`actions/`/`commands/`/`session/` may import `battle/models` (runtime-leaf) but never the battle barrel. Type-only imports are always safe (erased at compile).

**Components**: one component per file — screens and battle widgets in `src/components/game/`, shadcn primitives in `src/components/ui/`. Components never import engine internals directly. Presentation helpers that pull UI libs (e.g. `card-icons.ts` with lucide-react) live in `src/components/game/`, not the engine.

**Hook bridge**: `src/hooks/use-fish-mafia.ts` is the only bridge between UI and the engine — it exposes the state snapshot, FX event queue, and player actions; components consume them via props drilling.

**Testing**: `npm test` (Vitest). Unit/component/hook tests are **colocated** next to their code as `*.spec.ts(x)`; only true cross-domain integration suites (`card-parity.spec.ts`, `commands.spec.ts`, `history.spec.ts`) live centralized in `src/lib/game/__tests__/`. Shared jsdom shims live in `src/components/game/test-utils.tsx`. Coverage: `npm run test:coverage` (v8 provider, owned-code include, thresholds lines/stmts/funcs 75 + branches 55 — fails on regression).

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
6. **Barrel discipline** — folders re-export via `index.ts`; consumers import from barrels (leaf-segment exception per the engine-structure spec)
7. **Compiler-driven discriminators** — discriminators are closed types: an `enum` (dispatch via `switch` over members) or a discriminated union (exhaustive match). Dispatch must be exhaustive so the compiler catches unhandled cases — use the `never`-check in a `default`/fallthrough position. No bare string/number literals as discriminators.
   - **Enum values**: prefer value-less (positional) members. Explicit values are allowed only when the member must equal an external string (JSON pack, zod schema, storage) — document the reason at the declaration (see `CardType`, `CardTarget`, `FxKind`; `Phase`, `Team`, `UnitKind`, `EnemyStepKind` are value-less).
   - **zod schemas** for enum-backed fields use `z.nativeEnum` so the AC-16 `_Equal` drift guards keep holding.
