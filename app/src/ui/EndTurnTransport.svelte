<script lang="ts">
  // End-turn transport (FR-7): anchored bottom-right of the hand. Distinct
  // armed (amber, active) vs finished (brighter glow when nothing actionable)
  // vs disabled (steel, when not the player's turn or game over). Space handled
  // by the bridge.
  import type { GameSnapshot } from '../engine/contract';
  import { cardDef } from '../engine/cards';

  let {
    snapshot,
    onEndTurn = () => {},
  }: {
    snapshot: GameSnapshot | null;
    onEndTurn?: () => void;
  } = $props();

  // Finished: player phase, no playable card, no moves, no attacks (FR-6 spirit —
  // the engine is the source of truth; this is a presentation-level nudge).
  const playableCard = $derived(
    snapshot?.hand.some((c) => cardDef(c.cardUid).cost <= (snapshot?.mana ?? 0)) ?? false,
  );
  const finished = $derived(
    snapshot?.phase === 'player' &&
      !snapshot.winner &&
      !playableCard &&
      (snapshot?.validMoves.length ?? 0) === 0 &&
      (snapshot?.validAttackTargets.length ?? 0) === 0,
  );
  const disabled = $derived(snapshot?.phase !== 'player' || !!snapshot?.winner);
</script>

<div class="end-turn-zone">
  <button
    type="button"
    class:finished
    class:disabled
    disabled={disabled}
    aria-label="End turn"
    onclick={() => onEndTurn()}
  >
    <span>END</span><strong>TURN</strong><small>SPACE</small>
  </button>
</div>

<style>
  .end-turn-zone {
    position: fixed;
    z-index: 4;
    inset: auto clamp(0.5rem, 1.5vw, 1.5rem) clamp(0.5rem, 1.5vh, 1rem) auto;
    display: grid;
    align-items: end;
    justify-items: end;
  }
  .end-turn-zone button {
    min-width: 8.5rem;
    padding: 0.7rem 0.9rem;
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0 0.35rem;
    color: var(--ink);
    background: var(--action);
    border: 1px solid var(--action-light);
    border-radius: var(--radius-tight);
    box-shadow: 0 8px 18px rgb(0 0 0 / 0.35);
    text-align: left;
    transition: transform 150ms ease, filter 150ms ease, box-shadow 150ms ease;
  }
  .end-turn-zone button:hover:not(:disabled) { transform: translateY(-0.15rem); filter: brightness(1.08); }
  .end-turn-zone span { grid-row: span 2; font: 700 1.5rem/0.9 var(--font-display); }
  .end-turn-zone strong { font: 800 0.85rem var(--font-display); letter-spacing: 0.08em; }
  .end-turn-zone small { margin-top: 0.2rem; color: rgb(7 16 22 / 0.7); }
  .end-turn-zone button.finished { box-shadow: 0 0 0 3px var(--action), 0 10px 22px rgb(0 0 0 / 0.4); filter: brightness(1.12); }
  .end-turn-zone button.disabled { color: var(--ivory-muted); background: var(--panel-steel); border-color: var(--steel); box-shadow: none; cursor: not-allowed; }
  @media (max-width: 520px) {
    .end-turn-zone { inset: auto 0.5rem 0.5rem 0.5rem; justify-items: stretch; }
    .end-turn-zone button { width: 100%; justify-content: center; }
  }
</style>
