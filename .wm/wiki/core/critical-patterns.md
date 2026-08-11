---

title: Critical Patterns
type: core
tags: [critical]
---

---
title: Critical Patterns
type: core
tags: [critical]
---

# Critical Patterns

Promoted learnings from completed work. Read this at the start of every session via `wm-init`. These are lessons that cost the most to learn and save the most by knowing.

---

## 2026-07-27 - Test the UI Orchestration Layer, Not Just Pure Functions

**Category:** failure
**Source:** @wiki/concepts:untested-ui-orchestration-p0s
**Tags:** [testing, ui, orchestration]

All P0 bugs across THREE occurrences (roguelite, tactical RPG, and this project's UI orchestration layer) lived in the untested UI/bridge wiring layer. The pure function layer had 0 bugs across 79-194 tests each time. Root cause: no integration tests for the orchestrator/bridge code that connects game logic to UI. The project's own NFR-2 was written to prevent this, but the pattern still recurred - twice via deleted test suites, once via a pure function (pply_affixes_to_effects) that was fully unit-tested but never actually called from the orchestration layer (masked by an unreachable export).

**What to do differently:** Write integration tests that script a full battle cycle (draw -> play -> defend -> victory/death). Test the orchestration, not just the leaf functions. NEVER delete orchestrator tests without replacement. UI components should be thin - call tested controllers. **When you see a core function that is fully unit-tested but never imported at the orchestration call sites, grep its call sites before trusting that the feature it implements actually works in-game** - a green unit test suite proves nothing about whether the orchestration layer ever calls the function. Bridge orchestration tests (boot fan-out, click routing, drag, keyboard) must run with a mocked renderer - a mocked-renderer suite passing while the real boot fails is the same trap, invisible without a browser smoke pass.

**Full entry:** @wiki/concepts/untested-ui-orchestration-p0s

---

## 2026-07-27 - Always Split Roguelite State into Run + Combat

**Category:** pattern
**Source:** @wiki/patterns:run-combat-state-split
**Tags:** [state, architecture, roguelite]

RunState persists across battles (deck, HP, gold, relics). CombatState is per-battle (hand, draw pile, turn phase). Copy the run deck into a battle deck at combat start - never modify the run deck during combat. Discard battle deck on exit.

**What to do differently:** Enforce this split from day 1. The initial flat GameState caused deck corruption. The split fixed it.

**Full entry:** @wiki/patterns/run-combat-state-split

---

## 2026-07-27 - Snapshot-Based State Sync Prevents ECS Desyncs

**Category:** pattern
**Source:** @wiki/patterns:snapshot-state-sync
**Tags:** [ecs, state, sync, event-driven]

In event-driven ECS architectures, per-field granular events (card:played ? sync coins, enemy:hurt ? sync HP) inevitably produce desyncs - 5 P0 bugs in this project were caused by this pattern. Switching to a single `state:changed` snapshot event after every action eliminated all of them.

**What to do differently:** Emit a full state snapshot after every action, not per-field events. The bridge/subscriber does a bulk sync from the snapshot. Keep granular events only for transient UI effects (flashes, animations).

**Full entry:** @wiki/patterns/snapshot-state-sync

---

## 2026-07-28 - Browser Game Storage: localStorage, Not Prisma/SQLite

**Category:** decision
**Source:** @wiki/decisions/browser-localstorage-persistence
**Tags:** [persistence, database, architecture]

Prisma + SQLite with better-sqlite3 imports Node native modules that cannot compile or run in a Vite browser bundle. The build only passes because tree-shaking drops the unreferenced module. For single-player browser game state (<100KB), localStorage is the correct choice - synchronous, always available, no build tooling.

**What to do differently:** Choose localStorage for client-side game persistence from the start. Reserve Prisma/SQLite for server-side tooling (admin panels, data analysis) where Node native modules are available.

**Full entry:** @wiki/decisions/browser-localstorage-persistence

---

## 2026-07-28 - [HISTORICAL: Godot Era] Framework Node Type Must Match the Custom Class Registration

**Category:** failure (historical - Godot 4 era, no longer applicable to JS/TS stack)
**Source:** @wiki/concepts:gdext-scene-node-type-mismatch (retired)
**Tags:** [historical, godot-retired]

**General lesson retained:** In any framework where a custom component/element class extends a base type, ensure the markup/declaration uses the correct type name directly rather than relying on runtime wrappers. Check the declaration before debugging the build chain.


**Full entry (retired):** @wiki/concepts/gdext-scene-node-type-mismatch

---

## 2026-07-29 - [HISTORICAL: Godot Era] Godot Input Event Ordering

**Category:** failure (historical - Godot 4 era, no longer applicable to JS/TS stack)
**Source:** @wiki/concepts:gdext-bridge-pattern (retired)
**Tags:** [historical, godot-retired]

**General lesson retained:** Understand the event propagation order of your UI framework before choosing which handler phase to use. When UI elements can consume events before your handler fires, use an earlier-phase handler rather than trying to set every visual element to ignore mode.

**What to do differently:** For grid/tactical game scenes that need to catch clicks before UI consumes them, override `_input()` (maps to Godot's `_input`) instead of `_unhandled_input()`. `_input()` fires before `_gui_input` on Control nodes, so CanvasLayer UI cannot consume the event first. Do NOT try to fix this by setting `mouse_filter = IGNORE` on every visual node - you'll miss one.

**Full entry (retired):** @wiki/concepts/gdext-bridge-pattern

---

## 2026-07-30 - [HISTORICAL: Rust Era] Build Tool Env Overrides Configuration File Settings in CI

**Category:** failure (historical - legacy Rust era, no longer applicable to JS/TS stack)
**Source:** @wiki/concepts:rustflags-env-overrides-config-toml (retired)
**Tags:** [historical, legacy-build-retired]

The CI toolchain setup action exported a RUSTFLAGS environment variable that overrode project-level .cargo/config.toml settings, causing a silent structurally broken build artifact. In Rust, environment variables for build tools have the highest precedence over config files.

**What to do differently:** Build scripts that rely on `.cargo/config.toml` rustflags must be self-contained. Extract shared flags into a variable and set `RUSTFLAGS` explicitly for **every** cargo invocation, not just the first one. Consider adding `rustflags: ''` to `setup-rust-toolchain` to prevent it from setting `RUSTFLAGS` if you manage flags through config.toml.

**Full entry (retired):** @wiki/concepts/rustflags-env-overrides-config-toml

---

## 2026-07-30 - Valid Targets Single Source of Truth Prevents UI/Logic Drift

**Category:** pattern
**Source:** @wiki/patterns:valid-targets-single-source-of-truth
**Tags:** [testing, ui, orchestration, pattern]

One `valid_targets()` function in the pure core is called by the bridge overlay, click validation, AI, and engine. The same code determines which tiles are valid and validates the player's click. No drift between "what the UI shows" and "what the engine accepts" - the exact failure mode behind every P0 in this project's history. The three-layer bridge deadlock (2026-07-30 repeat of the untested orchestration pattern) was fixed by this architecture.

**What to do differently:** Any time a UI action requires validation, put the validation logic in a pure core function that both the overlay renderer and the action handler call. Never let the bridge implement its own targeting/rules logic. Integration-test the full click path (select ? move ? attack) through the bridge's own test helpers. JS analog implemented: `cardTargeting`/`validCardTargets` in the TS engine, consumed by snapshot, renderer highlights, and playCard validation.

**Full entry:** @wiki/patterns/valid-targets-single-source-of-truth

---

## 2026-07-31 - [HISTORICAL: Godot Era] Component/Scene Branch Extraction

**Category:** pattern (historical - Godot 4 era, general principle adaptable to React/component architecture)
**Source:** @wiki/patterns:scene-branch-extraction (retired)
**Tags:** [historical, godot-retired]

When a scene/component grows too large, extract self-contained branches into their own files with their own script/controller. The sub-component owns its internal element references. The parent only references the sub-component root.

**General principle retained:** Extract any component branch with 3+ children and its own visual identity into a separate component. Give the sub-component its own controller/logic that owns its internal element refs. This keeps components manageable and decouples parents from child implementation details. In React/JS, this maps to extracting compound components with their own state/refs, passing only the necessary props from the parent.

**Full entry (retired):** @wiki/patterns/scene-branch-extraction

---

## 2026-07-31 - [HISTORICAL: Godot Era] Container-Based Layout for Dynamically-Created UI

**Category:** pattern (historical - Godot 4 era, principle now standard in CSS/React via flexbox)
**Source:** @wiki/patterns:container-based-card-slot-layout (migrated to JS/TS pattern)
**Tags:** [historical, godot-retired]

When creating card slots, inventory items, or list entries dynamically, use container-based layout (flexbox/CSS grid) instead of absolute pixel positioning. Absolute positioning on elements inside grid/flex parents causes text overlap because the layout pass overrides child positions. Container-based layout (nested flex containers) avoids this entirely.

**General principle retained:** Never use absolute positioning on children of dynamically-created elements managed by a layout container. Always nest flex containers for structured layouts. In React/JS, this is standard practice with CSS flexbox/grid - use flex column for vertical stacks and flex row for horizontal elements like cost + affix count.

**Full entry:** @wiki/patterns/container-based-card-slot-layout

---

## 2026-07-31 - Every State Mutation Must Resync ALL Displays of That State, Not Just the Active One

**Category:** pattern
**Source:** @wiki/patterns:overworld-node-action-refresh
**Tags:** [ui, state-sync, architecture]

In any UI layer where state mutations and display updates are manual (React hooks, DOM updates), every UI element showing a piece of core state (map hero position, gold) must be explicitly re-synced after every mutation. Two separate bugs followed this exact shape: (1) entering an Enchanter/Gambler node moved the hero position index without calling refresh, leaving the map's hero icon and accessible-node highlighting stale; (2) spending gold on a craft updated the gold count without re-syncing either the top-left HUD gold display or the crafting panel's own header gold display, so the two displays could show different numbers until the player navigated away and back.

**What to do differently:** After any handler that mutates shared state (run state, hero position, gold), explicitly call every sync/refresh function that touches a UI element displaying that state - don't rely on the next unrelated redraw to catch it up. When a value is shown in more than one place (HUD + panel header), resync both at the same call site as the mutation.

**Full entry:** @wiki/patterns/overworld-node-action-refresh

---

## 2026-08-01 - Svelte 5 One-Shot Imperative Init: Callback Prop, Not $bindable/$effect

**Category:** pattern
**Source:** @wiki/patterns:svelte5-one-shot-imperative-init-callback
**Tags:** [svelte5, runes, pixijs, boot]

Mounting a one-shot imperative subsystem (PixiJS app, game bridge) through `$state` element ref + `$bindable` prop + `$effect` causes a re-render feedback loop - the effect re-runs every render, spawning a fresh subsystem and duplicate window listeners each cycle (`effect_update_depth_exceeded` at boot, UI half-working: state renders but input listeners never attach). Cost ~90 min to diagnose; invisible to 124 green unit tests (mocked renderers pass while real boot fails).

**What to do differently:** Child exposes the host via an `onCanvasReady` callback prop fired once; parent creates the subsystem with a one-shot `if (bridge) return` guard. Subscribe BEFORE start() so the initial synchronous snapshot reaches subscribers; try/catch renderer sync so `addEventListener` always attaches. A browser smoke pass is the only way to catch this class.

**Full entry:** @wiki/patterns/svelte5-one-shot-imperative-init-callback · failure story: @wiki/concepts/svelte5-bindable-boot-loop-failure

---

## 2026-08-01 - Fixer-Lane Silent No-Ops: Verify Disk, Don't Trust "Completed"

**Category:** failure
**Source:** @wiki/concepts:fixer-lane-silent-noops-empty-results
**Tags:** [delegation, process, fixer]

The fixer subagent returned `state: completed` with EMPTY result messages and ZERO files written three times in one session (large multi-file implementation tasks silently no-op'd; a 1-file probe succeeded, proving the lane itself worked). Trusting the "completed" status without verifying disk output delayed the engine implementation by ~2 hours before pivoting to orchestrator-direct.

**What to do differently:** After any writer-specialist dispatch, verify disk state (ls/git status) for expected files - never trust the result message alone. Keep delegated tasks bounded (one module, one concern); tiny tasks are the probe. Have an explicit orchestrator-direct fallback when a lane returns empty twice. Don't reissue the unchanged task.

**Full entry:** @wiki/concepts/fixer-lane-silent-noops-empty-results

---

## 2026-08-04 - WM Page API Only Persists Whitelisted Frontmatter

**Category:** failure
**Source:** @wiki/concepts:wm-frontmatter-whitelist-limitation
**Tags:** [wiki, tooling, wm]

`wm_page.update`/`create` only persist WHITELISTED frontmatter params (title/type/status/tags/id/relates_to). Fields the validator requires - rule `category`/`rationale`, pattern `when_to_use`/`example`, spec `stakeholders`, decision `context`/`options`/`rationale` - cannot be set through the API: they land in the body as a second frontmatter block, and the validator reads the FIRST block only (rule validator). delete+recreate and `wm_lint_fix` don't help. Cost ~30 min across 10+ page updates before the mechanism was identified.

**What to do differently:** Don't burn time "fixing" validator-field warnings on rules/patterns/specs via `wm_page` - they're a tooling gap, not a content problem. Distinguish validator-field warnings (unfixable via API) from real content problems. The WM tooling must expose the fields or the validator must read all frontmatter blocks.

**Full entry:** @wiki/concepts/wm-frontmatter-whitelist-limitation

---

## 2026-08-04 - Render-Test jsdom Gotchas: Split Text, Missing APIs

**Category:** pattern
**Source:** @wiki/patterns:render-test-jsdom-gotchas
**Tags:** [testing, vitest, jsdom, react]

`getByText` matches DIRECT text nodes only - split markup (`Fish <span>Mafia</span>`, `Turn <span>{n}</span>`) is unreachable via text regex; use `getByRole("heading", { name })` (accessible name concatenates) or a `textContent` matcher instead. jsdom lacks `document.elementFromPoint`, `ResizeObserver`, canvas `getContext`, `Element.scrollTo` - stub all once in a shared `test-utils.tsx` (ParticleCanvas/SidePanel/targeting code crash without them). Async flows (endTurn) need `vi.useFakeTimers` + `advanceTimersByTimeAsync`. Hit 3+ times this session while building the render-test suite.

**What to do differently:** Centralize the jsdom shims in `src/components/game/test-utils.tsx`; when a render test can't find text, check for split text nodes before suspecting the component; use fake timers for chained async waits.

**Full entry:** @wiki/patterns/render-test-jsdom-gotchas

---

## 2026-08-07 - Utility-Scoring Enemy AI: Enumerate-and-Score Instead of Branching

**Category:** pattern
**Source:** @wiki/patterns:utility-scoring-enemy-ai
**Tags:** [ai, enemy, battle, game-design]

When an AI's action space per turn is small and fully enumerable (this project: BFS reachable tiles × in-range targets, ~10-30 candidates), enumerate every candidate and score it on a fixed set of named axes instead of writing per-enemy branching logic or building a behavior-tree/component editor. "Personality" becomes a weight vector (data) instead of code - new enemy archetypes need zero new branches. Two things that looked like special cases (spec D14 "always take the lethal kill first"; the not-yet-built shield/heal-below-HP-threshold logic) both collapsed into scorer weights instead of dedicated branches once framed this way.

**What to do differently:** Before hand-coding branching AI logic or reaching for a visual behavior-tree editor, check whether the action space is enumerable. If it is, enumerate + score is usually cheaper to build, debug (free decision introspection via `rankCandidates()`), and make designer-tunable than either alternative. Reserve bespoke code/behavior trees for genuinely sequential behavior (multi-step boss phases) that a per-turn scorer cannot express.

**Full entry:** @wiki/patterns/utility-scoring-enemy-ai · decision: @wiki/decisions/utility-scoring-over-behavior-tree-for-enemy-ai

---

## 2026-08-07 - CSS Grid Row-Stretch Strands Blank Space Next to a Shorter, Dynamically-Growing Sibling

**Category:** failure
**Source:** @wiki/concepts:css-grid-row-stretch-vs-multi-column-for-variable-height-siblings
**Tags:** [css, layout, ui]

Two `grid grid-cols-2` cells sharing a row always share the row's height (`max-content` of the tallest cell). When one cell's content can grow interactively (a collapsible explanation toggled open) while its row-mate stays short, the short cell is left with dead space beneath it - and `items-start` does NOT fix this, it only changes alignment *within* the shared row height, not the row height itself. This was hit twice in one session in the same enemy-designer UI: once fixed correctly with `items-start` (independent panels, not sharing a row), once where `items-start` visibly failed to help (two sliders sharing a row, one expandable).

**What to do differently:** When two elements are literal siblings in the same grid row and one's height can change independently at runtime, use CSS multi-column flow (`columns-2 gap-x-6` + `break-inside-avoid` per item) instead of `grid`, so each item stacks down its own column with no shared row height. Reserve `items-start` on `grid` for mismatches between independent rows/panels that don't change height relative to each other after mount. Note: multi-column flow is column-major, not row-major - check whether left-right adjacency matters for the content before switching.

**Full entry:** @wiki/concepts/css-grid-row-stretch-vs-multi-column-for-variable-height-siblings

---

## 2026-08-07 - eslint@10 Is Incompatible with eslint-config-next / eslint-plugin-react

**Category:** failure
**Source:** @wiki/concepts:eslint-10-incompatible-with-current-nextjs-lint-ecosystem
**Tags:** [tooling, eslint, nextjs]

`npm run lint` fails in this repo because `package.json` pins `eslint: ^10.8.0` while `eslint-plugin-react` (pulled in by `eslint-config-next`) only supports ESLint up to `^9.7` as of this session - its `react/display-name` rule calls `context.getFilename()`, an API ESLint 9+ removed. The failure surfaces as two different, confusing errors first (`FlatCompat` circular-JSON crash, then `scopeManager.addGlobals is not a function`) before a single-file repro reveals the real peer-dependency mismatch. No flat-config trick fixes it - the plugin itself throws on ESLint 10's context API.

**What to do differently:** When a lint/plugin chain throws confusing internal errors after a major version bump, check `npm view <plugin>@latest peerDependencies` FIRST, before debugging config shape. Fix here (not yet applied) is downgrading `eslint` to `^9.39` to match what the Next.js lint plugin ecosystem actually supports.

**Full entry:** @wiki/concepts/eslint-10-incompatible-with-current-nextjs-lint-ecosystem