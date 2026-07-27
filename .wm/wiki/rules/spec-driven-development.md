---
title: Spec-Driven Development
type: rule
id: wiki:rules:spec-driven-development
tags: [sdd, spec, workflow]
---

# SDD — Spec-Driven Development

**Everything has a spec first.** No code is written until a spec exists that defines the requirements, acceptance criteria, and locked decisions.

## The Cycle

1. **Spec first** — create or update a spec page (`wiki:specs:`) before any implementation
2. **Decisions locked** — Socratic exploration resolves gray areas before writing begins
3. **ACs defined** — every spec has observable, testable acceptance criteria
4. **Plans derived from spec** — tasks and implementation plans are generated from approved specs
5. **Verify against spec** — implementation is validated by checking acceptance criteria

## Why

- Prevents guessing wrong about requirements
- Forces gray-area resolution before code commits
- Creates a single source of truth for what should be built
- Acceptance criteria make it clear when "done" is reached

## Tooling

```bash
# Create a new spec
wm-spec

# Validate spec coverage
wm-validate

# Plan from an approved spec
/wm-plan --from @doc/specs/<name>
```

## Existing Specs

- `wiki:specs:fish-roguelite-deckbuilding` — the full game spec

## Exceptions

- Quick bug fixes with single-AC scope
- Exploratory spikes with an explicit "spike" tag
