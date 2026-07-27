<script lang="ts">
  import { gameState } from '../../../../lib/state.svelte';

  interface Props {
    targetingMode: boolean;
    onEndTurn: () => void;
    onCancelTargeting: () => void;
  }

  let { targetingMode, onEndTurn, onCancelTargeting }: Props = $props();

  let currentPhase = $derived(gameState.combat.turnPhase);
</script>

<div class="action-bar-zone">
  {#if targetingMode}
    <button class="end-turn-btn cancel-btn-action" onclick={onCancelTargeting}>CANCEL</button>
  {:else if currentPhase === 'play'}
    <button class="end-turn-btn" onclick={onEndTurn}>END TURN</button>
  {:else if currentPhase === 'defense'}
    <div class="waiting-indicator">BLOCK PHASE</div>
  {/if}
</div>

<style>
  .action-bar-zone {
    display: flex;
    justify-content: flex-end;
  }

  .end-turn-btn {
    padding: 0.6rem 1.5rem;
    background: var(--coral);
    border: none;
    color: var(--parchment);
    font-size: 0.9rem;
    font-weight: 700;
    letter-spacing: 0.15em;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.2s ease;
    text-transform: uppercase;
  }

  .end-turn-btn:hover {
    background: var(--coral-light);
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(232, 93, 78, 0.3);
  }

  .cancel-btn-action {
    background: var(--shallow);
    border: 1px solid var(--panel-border);
  }

  .cancel-btn-action:hover {
    background: var(--coral-light);
  }

  .waiting-indicator {
    padding: 0.6rem 1.5rem;
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: var(--parchment-dim);
    animation: pulse-text 1.5s ease-in-out infinite;
  }

  @keyframes pulse-text {
    0%,
    100% {
      opacity: 0.4;
    }
    50% {
      opacity: 1;
    }
  }
</style>
