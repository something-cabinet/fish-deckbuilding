---
title: Spec Before Any Action
type: rule
id: wiki:rules:spec-before-action
status: active
tags: [rule, workflow, sdd]
---

## Rule: Spec Before Any Action

No code is written, no fix is applied, no refactor is started until a spec exists that defines the requirements, acceptance criteria, and locked decisions.

### What counts as an action
- New feature
- Bug fix (anything beyond a one-line typo)
- Refactor
- Cleanup pass
- CI/lint fix
- Architecture change
- Dependency upgrade

### What doesn't need a spec
- Trivial one-line fixes (typos, obvious compiler errors)
- `cargo fix` auto-applied suggestions
- Renaming a local variable

### Process
1. Write the spec (`wm-spec`) — outline what, why, and the ACs
2. Get it approved
3. Implement
4. Verify ACs are met
5. Mark the spec done

### Rationale
A spec forces thinking before doing. It catches wrong assumptions before code is written. The ACs become the test plan. Without a spec, there's no definition of done — just guessing when to stop.

### Related
- @wiki/rules:spec-driven-development
