<script lang="ts">
  import { gameState } from '../../../../lib/state.svelte';

  let currentPhase = $derived(gameState.combat.turnPhase);
</script>

<div class="turn-info-zone">
  <div class="combat-info">
    <span class="turn-badge">TURN {gameState.combat.turnNumber}</span>
    <span class="phase-badge">{currentPhase.toUpperCase()}</span>
  </div>
  <div class="gold-display">
    <span class="gold-icon">G</span>
    <span class="gold-value">{gameState.run.gold}</span>
  </div>
</div>

<style>
  .turn-info-zone {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.35rem;
  }

  .combat-info {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .turn-badge,
  .phase-badge {
    padding: 0.25rem 0.6rem;
    border-radius: 4px;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    background: var(--shallow);
    border: 1px solid var(--panel-border);
  }

  .phase-badge {
    color: var(--coral);
  }

  .gold-display {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-weight: 700;
  }

  .gold-icon {
    color: var(--gold);
    font-size: 0.9rem;
  }

  .gold-value {
    color: var(--parchment);
    font-size: 0.85rem;
  }
</style>
