import type { GameSnapshot, PlayResult } from '../engine/contract';

/**
 * Reactive bridge state (Svelte 5 runes — user directive: $state/$derived).
 * One reactive object so both runes-mode components AND plain TS modules can
 * mutate it (`game.snapshot = snap`); plain .ts files cannot reassign
 * imported runes bindings, but property mutation through the proxy works.
 *
 * The controller's single fan-out writes `snapshot`; UI components read it
 * reactively. `dropResult` carries the last playCard rejection for the
 * hand's "DROP REJECTED" message; `debugVisible` toggles the snapshot overlay.
 */
export const game = $state({
  snapshot: null as GameSnapshot | null,
  dropResult: null as PlayResult | null,
  debugVisible: false,
  hintVisible: true,
  muted: false,
});
