---
title: GoF Design Patterns (23) — Catalog with Codebase Mapping
type: reference
tags: [design-patterns, gof, reference, architecture, refactoring-guru]
description: The 23 classic GoF design patterns from refactoring.guru — intent, applicability, and where each appears (or would apply) in the Fish Mafia codebase.
---

# GoF Design Patterns (23) — Catalog with Codebase Mapping

Research source: [refactoring.guru/design-patterns](https://refactoring.guru/design-patterns) (catalog + classification). A pattern is a typical, customizable solution to a common design problem. Patterns are categorized by **intent** into three groups; they also differ by scale (idiom → pattern → architecture). This page records the 23 classic GoF patterns, each with its intent, when to use it, and its presence/absence in this repo (`src/lib/game/`, `src/hooks/`, `src/components/game/`).

Related project knowledge: @wiki/core/critical-patterns (snapshot sync, valid-targets single source of truth, run/combat split), @wiki/patterns/snapshot-state-sync, @wiki/patterns/turn-based-ecs-orchestrator.

## Catalog at a glance

| Category | Count | Patterns |
|----------|-------|----------|
| Creational | 5 | Factory Method, Abstract Factory, Builder, Prototype, Singleton |
| Structural | 7 | Adapter, Bridge, Composite, Decorator, Facade, Flyweight, Proxy |
| Behavioral | 11 | Chain of Responsibility, Command, Iterator, Mediator, Memento, Observer, State, Strategy, Template Method, Visitor |

## Category definitions (refactoring.guru)

- **Creational** — provide object creation mechanisms that increase flexibility and reuse of existing code.
- **Structural** — explain how to assemble objects and classes into larger structures, while keeping these structures flexible and efficient.
- **Behavioral** — take care of effective communication and the assignment of responsibilities between objects.

---

## Creational

### Factory Method
- **Intent:** define an interface for creating an object, but let subclasses decide which class to instantiate.
- **When to use:** a class can't anticipate the concrete types it must create; you want to centralize construction logic.
- **In this repo:** `makeCard(libId)` in `src/lib/game/engine.ts` is a factory function — `CARD_LIBRARY[libId]` + a fresh `uid` via `nid("c")`. `createInitialState()` also acts as a factory for the initial `GameState` (deterministic, SSR-safe). If the switch in `castCard` grew, per-card factories would replace it.

### Abstract Factory
- **Intent:** create families of related objects without specifying their concrete classes.
- **When to use:** the system must be independent of how its products are created; you want families that vary together.
- **In this repo:** not present as a class family. Closest: `data.ts` exports cohesive content groups (`CARD_LIBRARY`, `ENEMY_SPAWNS`, `HERO_DEF`, `GOON_DEF`, `STARTER_DECK`). A future campaign/theme variant (different faction content sets) would be the natural Abstract Factory seam.

### Builder
- **Intent:** construct complex objects step by step, separating construction from representation.
- **When to use:** an object has many optional parts or multi-step construction; you want the same process to build different representations.
- **In this repo:** not present. Unit construction in `createInitialState()` and `castCard`'s `muscle` case uses spread-from-def + explicit fields. The card-create screen (`card-create-screen.tsx`) is form-driven, not builder-driven — a Builder would apply if card defs gained many optional/validated fields.

### Prototype
- **Intent:** create new objects by copying an existing object (a prototype), without depending on their classes.
- **When to use:** construction is costly or complex; you want to clone with slight variations.
- **In this repo:** `{ ...HERO_DEF }` / `{ ...e }` object spreads in `engine.ts` are shallow prototype-cloning of data defs. `clone(state)` in `engine.ts` is a deep-ish structural clone of `GameState` — closer to Memento in role, Prototype in mechanism.

### Singleton
- **Intent:** ensure a class has exactly one instance and provide a global access point to it.
- **When to use:** exactly one object must coordinate actions system-wide.
- **In this repo:** not used as a class. Module-level state (`let idSeed` in engine.ts, the `useFishMafia` hook instance) covers the need. **Anti-pattern caution:** GoF-era singletons are usually a code smell in JS/React — prefer module singletons or context. No action needed.

---

## Structural

### Adapter
- **Intent:** convert one interface into another clients expect, letting incompatible interfaces work together.
- **When to use:** you need to reuse a component whose interface doesn't match your domain calls.
- **In this repo:** `src/hooks/use-fish-mafia.ts` adapts the pure engine functions (`moveUnit`, `castCard`, `sellCard`, …) to React's state model — it wraps engine calls in `setState` updaters and translates `FxEvent[]` into transient UI effects. This is the engine→React adapter layer.

### Bridge
- **Intent:** split an abstraction from its implementation so both can vary independently.
- **When to use:** you want to avoid a permanent binding between an abstraction and an implementation; both change often.
- **In this repo:** the architecture's core split — pure engine (`src/lib/game/engine.ts`, `types.ts`, `data.ts`) as the abstraction of game rules, and the React UI as one implementation of it. The README states the intent: any future canvas renderer could read the same engine. This is Bridge at the architecture level.

### Composite
- **Intent:** compose objects into tree structures and treat individual objects and compositions uniformly.
- **When to use:** the UI/data has part-whole hierarchies with identical operations.
- **In this repo:** the React component tree (game → board → unit-token / card; game → top-bar / side-panel) is a Composite. The unit roster is a flat list, not a nested tree, so no custom composite class — React's composition model covers it.

### Decorator
- **Intent:** attach responsibilities to objects dynamically, wrapping them instead of subclassing.
- **When to use:** you need to add behaviors to specific instances without affecting others.
- **In this repo:** `buffAtk` on `Unit` + `effAtk()` (`Math.max(0, atk + buffAtk)`) is a lightweight decorator over base attack — damage-dealing code reads the decorated value without the base changing. Card/unit visual states (hover, selected ring) also decorate presentation. A full Decorator (wrapper objects) would be overkill here.

### Facade
- **Intent:** provide a simplified interface to a complex subsystem.
- **When to use:** you want a single entry point that hides subsystem complexity; you want to decouple clients from internals.
- **In this repo:** `engine.ts` is the facade over the game rules — React calls `moveUnit`/`castCard`/`planEnemyTurn` instead of manipulating `GameState` internals directly. The hook is a second, smaller facade over the engine facade for the UI.

### Flyweight
- **Intent:** share common state between many objects instead of keeping it all in each object.
- **When to use:** many objects with identical intrinsic state; memory matters.
- **In this repo:** `CardInstance` = `{ uid, def }` where `def: CardDef` is shared from `CARD_LIBRARY` — textbook intrinsic/extrinsic split. Every drawn card is a flyweight referencing one immutable `CardDef`. The same is true for `Unit` defs spread from `HERO_DEF`/`GOON_DEF`.

### Proxy
- **Intent:** provide a substitute/placeholder for another object to control access to it.
- **When to use:** lazy init, access control, logging, or caching around a real object.
- **In this repo:** not present. `clone(state)` immutability isn't a proxy. A Proxy would apply for deferred computation (e.g., expensive reachability caching) — not currently needed.

---

## Behavioral

### Chain of Responsibility
- **Intent:** pass a request along a chain of handlers; each handler decides to process it or pass it on.
- **When to use:** several handlers could process a request; the order matters; you don't want to couple the sender to a specific handler.
- **In this repo:** not explicit. The validation pipeline in `castCard` (cost check → target-type check → valid-targets check) is a fixed sequence, not a chain. If card rules gained arbitrary composable pre-conditions (see affix-based effects history), CoR would be the seam — see @wiki/patterns/affix-based-effect-composition.

### Command
- **Intent:** turn a request into a standalone object with all its parameters, enabling undo/queue/logging.
- **When to use:** you need to parameterize, queue, log, or undo operations.
- **In this repo:** `FxEvent[]` returned by every engine action is command-like — a description of what happened, played by the UI then discarded. `EnemyStep` (`{ kind: "move" | "attack", unitId, ... }`) is a true Command object: planned against a simulation, then applied later via `applyEnemyStep`. The engine's stated design (README) also references `GameAction` objects resolved by an `ActionResolver` for card effects — Command is the project's native pattern.

### Iterator
- **Intent:** provide sequential access to elements without exposing the underlying representation.
- **When to use:** you want to traverse a collection without coupling to its structure.
- **In this repo:** idiomatic JS iteration everywhere — `for…of` over `state.units`, `state.hand`. `reachableTiles` BFS is a queue-based traversal. No custom iterator needed.

### Mediator
- **Intent:** reduce chaotic dependencies between objects by routing communication through a central object.
- **When to use:** many objects interact in ways that create tangled links; you want central control.
- **In this repo:** `use-fish-mafia.ts` is the mediator between engine and UI — components never call engine functions directly; they call hook actions, and the hook orchestrates state + fx + enemy-turn sequencing. `fish-mafia-game.tsx` mediates between child components (board, top-bar, hand, side-panel) and the hook.

### Memento
- **Intent:** capture and externalize an object's internal state so it can be restored later, without violating encapsulation.
- **When to use:** you need snapshots/undo; state must be saved outside the object.
- **In this repo:** the core pattern behind this project's snapshot-based state sync (see @wiki/patterns/snapshot-state-sync and @wiki/core/critical-patterns). `planEnemyTurn` works on a **simulated copy** (`sim` array) so the real state is untouched until steps are applied — a Memento of the board. `clone(state)` produces restore-safe snapshots for immutable updates.

### Observer
- **Intent:** define a one-to-many dependency so when one object changes state, dependents are notified automatically.
- **When to use:** multiple components must react to a state change; you want loose coupling.
- **In this repo:** `FxEvent[]` + the `fx` state in the hook is an observer channel — engine actions emit effects, the UI observes and animates, then discards. The Bulletin log entries are also observed notifications. React's re-render on `setState` is the substrate; the `fx` stream is the explicit event bus. See @wiki/patterns/excalibur-scene-state-sync-on-activation for the historical sync discipline.

### State
- **Intent:** let an object alter its behavior when its internal state changes.
- **When to use:** an object's behavior depends on its state and changes at runtime; state-specific logic grows.
- **In this repo:** `Phase = "player" | "enemy" | "won" | "lost"` in `types.ts`, transitioned by `checkEnd()`, `startEnemyPhase()`, `beginPlayerTurn()`. This is an enum/flag state machine rather than the full State pattern (no per-state objects) — appropriate at this size. If phases gained distinct behaviors with shared skeleton, the full State pattern would formalize it (this repo keeps the enum-FSM form, which is adequate at this scale).

### Strategy
- **Intent:** define a family of algorithms, encapsulate each, and make them interchangeable.
- **When to use:** several algorithms for the same task; you want to swap them without touching the caller.
- **In this repo:** `planEnemyTurn()` in `engine.ts` is the enemy AI strategy — greedy nearest-target move + attack. `cardTargets()` switches strategy by `CardTarget` type (enemy/ally/unit/empty-tile/self). Swapping in a smarter AI (pathfinding, threat evaluation — see `ai-strategy` task history) is exactly a Strategy swap.

### Template Method
- **Intent:** define the skeleton of an algorithm, letting subclasses override steps without changing the structure.
- **When to use:** several variants of an algorithm share the same steps but differ in details.
- **In this repo:** the turn cycle is a template: `beginPlayerTurn` → player actions → `startEnemyPhase` → `planEnemyTurn`/`applyEnemyStep` → `beginPlayerTurn`. The `endTurn()` orchestration in the hook runs that skeleton. `dealDamage` → `cleanupDead` → `checkEnd` is a smaller recurring template invoked by every damaging action.

### Visitor
- **Intent:** add new operations to existing classes without changing them, by passing a visitor object.
- **When to use:** you have a stable set of classes and a changing set of operations over them.
- **In this repo:** not used, and the natural candidate is the big `switch (card.def.id)` inside `castCard` (demand_letter, collection_call, foreclose, kneecap, loan_shark, cash_flow, market_rate, hush_money, muscle). Today, adding a card means editing that switch. A Visitor/effect-registry (card id → effect function) would make card effects extensible without touching `castCard` — see @wiki/patterns/effects-first-card-model and @wiki/patterns/card-library-authoring.

---

## Codebase summary

| Pattern | In repo? | Where |
|---------|----------|-------|
| Factory Method | ✅ | `makeCard`, `createInitialState` (engine.ts) |
| Abstract Factory | 🟡 seam only | content groups in data.ts |
| Builder | ❌ | card-create is form-driven |
| Prototype | ✅ (shallow) | `{ ...def }` spreads; `clone(state)` |
| Singleton | ❌ (by design) | module state / hook instance |
| Adapter | ✅ | use-fish-mafia.ts wraps engine for React |
| Bridge | ✅ (architectural) | pure engine ↔ React UI split |
| Composite | ✅ (React) | component tree |
| Decorator | ✅ (lightweight) | `buffAtk` / `effAtk` |
| Facade | ✅ | engine.ts; hook |
| Flyweight | ✅ | CardInstance.def shared from CARD_LIBRARY |
| Proxy | ❌ | not needed |
| Chain of Responsibility | 🟡 seam | validation pipeline could become a chain |
| Command | ✅ | `EnemyStep`, `FxEvent[]`, GameAction design |
| Iterator | ✅ (idiomatic) | for…of, BFS queue |
| Mediator | ✅ | use-fish-mafia.ts; fish-mafia-game.tsx |
| Memento | ✅ | snapshot sync; `clone`, `sim` copies |
| Observer | ✅ | fx event stream; Bulletin log |
| State | ✅ (enum FSM) | `Phase` transitions |
| Strategy | ✅ | `planEnemyTurn`, `cardTargets` |
| Template Method | ✅ | turn-cycle skeleton; dealDamage→checkEnd |
| Visitor | 🟡 natural fit | card-effect switch in `castCard` |

**Legend:** ✅ present · 🟡 not yet, but a natural seam · ❌ absent / not needed

## Practical guidance

- The engine already applies the project's hard-won patterns (Command, Memento/snapshot, Observer/fx, Mediator) — keep extending those rather than introducing new machinery.
- The highest-value open seams are **Visitor/effect-registry for card effects** (kills the `castCard` switch) and **Strategy** once enemy AI grows beyond greedy.
- GoF class diagrams are OOP-centric; in this TS/React codebase, prefer function composition, hooks, and data-driven registries — the patterns above are mapped in that spirit.
