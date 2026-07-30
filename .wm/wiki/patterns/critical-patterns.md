# Critical Patterns

Promoted learnings from completed work. Read this at the start of every session via `wm-init`. These are lessons that cost the most to learn and save the most by knowing.

---

## 2026-07-30 Snapshot invalidation in gdext bridge

**Category:** failure
**Source:** @task-fix-enemy-reanimation
**Tags:** [gdext, animation, sync]

After every `sync_all()` call, invalidate the animation snapshot (`store_prev_unit_positions()`). A snapshot taken before a mutation will cause phantom re-animations on every subsequent sync if not invalidated. This bug cost ~30min to debug and required adding invalidation at 6 call sites.

**Full entry:** @wiki/concepts/stale-animation-snapshot-gdext