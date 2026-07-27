<script lang="ts">
  import { gameState } from '../../../../lib/state.svelte';
  import { getCard } from '../../../../game/cards/cardData';
  import EnemyRow from '../../../battle/EnemyRow.svelte';

  interface Props {
    selectedCardIndex: number | null;
    selectedCardId: string | null;
    onEnemyClick: (enemyIndex: number) => void;
    onCancelTargeting: () => void;
  }

  let { selectedCardIndex, selectedCardId, onEnemyClick, onCancelTargeting }: Props = $props();

  let currentPhase = $derived(gameState.combat.turnPhase);
  let targetingMode = $derived(selectedCardIndex !== null && currentPhase === 'play');
</script>

<div class="enemy-row-zone">
  <EnemyRow
    selectedTargetIndex={selectedCardIndex ?? -1}
    {targetingMode}
    {onEnemyClick}
  />
  {#if targetingMode}
    <div class="targeting-hint">
      Click an enemy to target with {getCard(selectedCardId ?? '')?.name ?? 'attack'}
      <button class="cancel-btn" onclick={onCancelTargeting}>CANCEL</button>
    </div>
  {/if}
</div>

<style>
  .enemy-row-zone {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    flex: 1;
    gap: 0.5rem;
    padding-top: 2rem;
  }

  .targeting-hint {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.5rem 1rem;
    background: rgba(244, 196, 48, 0.1);
    border: 1px solid var(--gold);
    border-radius: 4px;
    font-size: 0.8rem;
    color: var(--gold);
    font-weight: 700;
    letter-spacing: 0.05em;
  }

  .cancel-btn {
    padding: 0.3rem 0.8rem;
    background: var(--shallow);
    border: 1px solid var(--panel-border);
    color: var(--parchment);
    font-size: 0.7rem;
    font-weight: 700;
    cursor: pointer;
    border-radius: 4px;
    letter-spacing: 0.05em;
  }

  .cancel-btn:hover {
    background: var(--coral);
    border-color: var(--coral);
  }
</style>
