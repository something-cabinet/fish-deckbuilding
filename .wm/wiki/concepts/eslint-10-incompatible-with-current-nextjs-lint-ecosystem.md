---
title: 'Failure: eslint@10 Breaks eslint-config-next / eslint-plugin-react in This Repo'
type: concept
id: wiki:concepts:eslint-10-incompatible-with-current-nextjs-lint-ecosystem
status: draft
tags:
- failure
- tooling
- eslint
- nextjs
relates_to:
  - {type: relates_to, target: wiki:core:conventions}
---

## What went wrong

`npm run lint` (`eslint .`) fails in this repo. The apparent cause looked like a missing config file — `package.json` declares `"eslint": "^10.8.0"` and a `lint` script, but there was no `eslint.config.js`/`.mjs` anywhere (ESLint 9+ requires flat config and refuses to run without one). That diagnosis was correct but incomplete: generating a flat config does not fix lint, because the real blocker is a version incompatibility one layer down.

Attempting to fix it properly (`npm install -D eslint-config-next@16.2.6 @eslint/eslintrc`, then an `eslint.config.mjs`) surfaced a chain of three different failures in sequence, each masking the next:

1. `compat.extends("next/core-web-vitals", "next/typescript")` via `FlatCompat` → `TypeError: Converting circular structure to JSON`. Root cause: `eslint-plugin-react@7.37.5`'s native flat-config export (`configs.flat.recommended`) contains an intentional self-reference (the plugin object references itself under `plugins.react`), which is valid for ESLint's flat-config loader to consume directly but breaks `FlatCompat`'s legacy `ConfigArrayFactory`, which tries to JSON-serialize configs for schema validation.
2. Switching to `eslint-config-next`'s native flat-config export directly (`import nextConfig from "eslint-config-next"` — it ships a flat array, no `FlatCompat` needed) fixed #1 but surfaced `TypeError: scopeManager.addGlobals is not a function`, a symptom of some plugin/scope-manager version in the dependency graph not yet updated for ESLint 10's `SourceCode.finalize()` internals.
3. Root-caused via a minimal repro (`eslint <single-file>.ts`): `eslint-plugin-react`'s `react/display-name` rule calls `context.getFilename()`, an API ESLint 9+ removed/changed (`context.filename` now) — `eslint-plugin-react@7.37.5` (npm's latest as of this session) declares `peerDependencies: { eslint: "^3 || ... || ^9.7" }`. **It does not support ESLint 10 at all.** That's the actual root cause; the two errors above were just different partial breakages along the way to the same wall.

All package.json/lockfile/node_modules changes from this investigation were reverted; `npm run lint` is left exactly as broken as before, now for a documented reason.

## Root cause

`package.json` pins `eslint: ^10.8.0`, but `eslint-plugin-react` (a transitive dependency of `eslint-config-next`, which supplies Next's React/hooks/a11y/core-web-vitals rules) has not shipped ESLint 10 support — its latest published version caps peer support at `^9.7`. This is an upstream ecosystem gap, not a misconfiguration in this repo. Likely the `eslint` version in `package.json` was bumped (or scaffolded) ahead of what the Next.js lint plugin ecosystem actually supports.

## Prevention

- **Don't chase the error message to the next layer without checking peer-dependency ranges first.** `npm view eslint-plugin-react@latest peerDependencies` would have shown `^9.7` immediately, before spending time on `FlatCompat` vs native flat-config exports.
- If lint is needed, downgrade `eslint` to the latest 9.x (`^9.39` as of this session) to match what `eslint-config-next`/`eslint-plugin-react` actually support — do not try to work around it with a hand-rolled flat config while staying on eslint 10; the plugin itself throws on ESLint 10's rule-context API, no config can route around that.
- Re-check this when `eslint-plugin-react` ships an ESLint 10-compatible release — the incompatibility is time-bound to the plugin's release cadence, not a permanent constraint of this repo.

## Time lost

~20-30 minutes across three failed attempts (FlatCompat circular JSON, native flat-config scope-manager error, single-file repro to find the real peer-dependency mismatch) before reverting.

## Related
- @wiki/core/conventions — where the actual lint setup would eventually be documented once fixed