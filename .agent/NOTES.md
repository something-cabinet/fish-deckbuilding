# AI agent notes (persists across sessions on ai-new-feature)

## Session: 2026-09-10

### Done
- Surfaced Fin (persistent run currency) on the overworld map HUD and run-summary screen.
- Fin was tracked per SPEC D10/D11 but was invisible to the player — it accumulated during battles but never showed anywhere. Added `<Stat label="Fin">` to the overworld map header (conditionally rendered when > 0, teal-colored Fish icon), and a Fin stat to the run-summary end-of-run screen.
- Updated CHANGELOG.md.

### Files changed
- `src/components/game/overworld-map.tsx` — added Fin stat in HUD header
- `src/components/game/run-summary.tsx` — added Fin stat + Fish icon import
- `src/components/game/fish-mafia-app.tsx` — passed `fin` prop to RunSummary
- `CHANGELOG.md` — wrote unreleased entry

### Ideas / TODOs for next session
- The "card-upgrade shop" that Fin is reserved for (SPEC D11) still doesn't exist — Fin can only be earned, never spent. Build a shop overlay that lets players spend Fin to upgrade cards between battles.
- Consider also showing accumulated Fin on the in-battle HUD (`top-bar.tsx`) for live feedback during combat.
- The `fin` display in `overworld-map.tsx` only shows when > 0 — if the player hasn't fought any battles yet, Fin stays hidden. This is intentional (clean HUD), but we may want a "0" shown for new runs to teach the mechanic.