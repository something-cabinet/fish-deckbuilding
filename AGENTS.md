# AGENTS

Compatibility entrypoint for runtimes that auto-detect `AGENTS.md`.

<!-- WIKI-MEM GUIDELINES START -->

**CRITICAL: Start with `wm_initial` via MCP when available. Use `wm_help` for tool schemas and workflow routing on demand.**

## Runtime Guidance

- WM is the repository memory layer for humans and the AI-friendly working layer for agents.
- `WIKI-MEM.md` is the canonical repo-level guidance file. Read it before doing any work.
- `CLAUDE.md`, `GEMINI.md`, `OPENCODE.md`, `REASONIX.md` are compatibility shims — if they differ from `WIKI-MEM.md`, follow `WIKI-MEM.md`.
- MCP `wm_initial` is the primary AI bootstrap: project state, tool domains, and active rules.
- MCP `wm_help` provides on-demand tool schemas and descriptions.

## Minimum Rules

- Use WM MCP tools (`wm_*`) as the canonical system for tasks, docs, templates, memory, search, code intelligence, and workflow state.
- Never manually edit WM-managed task or doc markdown.
- Search first, then read only relevant docs and code.
- Use `wm_search.query` for discovery; use `wm_search.retrieve` when a workflow needs structured context with citations.
- For code operations, use `wm_code` tools for AST-aware search, symbol lookup, and dependency analysis.
- Plan before implementation unless the user explicitly overrides that workflow.
- Validate before considering work complete.
- Use memory tools: `wm_memory.list` at session start, `wm_memory.add` after tasks for reusable knowledge.
- Proactively capture durable memory; do not wait for explicit instruction.

## Project Rules

### SDD — Spec-Driven Development

**Everything has a spec first.** No code is written until a spec exists that defines the requirements, acceptance criteria, and locked decisions.

1. **Spec first** — create or update a spec page (`wiki:specs:`) before any implementation
2. **Decisions locked** — Socratic exploration resolves gray areas before writing begins
3. **ACs defined** — every spec has observable, testable acceptance criteria
4. **Plans derived from spec** — tasks and implementation plans are generated from approved specs

The game spec is at `wiki:specs:fish-roguelite-deckbuilding`. All phases and tasks reference its locked decisions.

```bash
# Create a new spec
wm-spec

# Plan from an approved spec
/wm-plan --from @doc/specs/<name>
```

### TDD — Test-First for Everything

**Red-Green-Refactor** applies to ALL implementation:

1. **RED** — Write a failing test that defines the expected behavior
2. **GREEN** — Write the minimum code to make it pass
3. **REFACTOR** — Clean up while tests stay green

No implementation code is written without a test first. This includes combat logic, state transitions, card effects, enemy AI, and any other game code. The Godot bridge layer (gdext) is excluded — it calls tested pure Rust functions.

```bash
cd rust
cargo test       # run all tests
```

Tests live in `rust/src/core/`.

### Pre-Commit — Clippy Check

**Run `cargo clippy` before every commit** to catch style issues and potential bugs. Fix all warnings before committing.

```bash
cd rust
cargo clippy     # fix all warnings before commit
```

## Quick Reference

```bash
wm-cli serve              # Start MCP server
wm init                   # Init project
wm init --full            # Install + PATH + config + init
wm upgrade                # Install binary to PATH
wm setup opencode         # MCP config + sync skills
wm page list              # List wiki pages
wm search <q>             # Search wiki
wm task board             # Task board by status
wm lint check             # Wiki health check
wm validate               # Validate refs + SDD coverage
```

<!-- WIKI-MEM GUIDELINES END -->
