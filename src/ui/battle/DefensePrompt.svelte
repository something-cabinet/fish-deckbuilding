<script lang="ts">
  import { gameState } from '../../lib/state.svelte';
  import { getCard } from '../../game/cards/cardData';
  import type { EnemyAction } from '../../game/combat';

  interface Props {
    incomingDamage: number;
    enemyAttacks: { enemyId: string; damage: number }[];
    onConfirmBlock: (blockedCardIndices: number[]) => void;
    onTakeDamage: () => void;
  }

  let { incomingDamage, enemyAttacks, onConfirmBlock, onTakeDamage }: Props = $props();

  // Track selected cards by hand index (not cardId — handles duplicates)
  let selectedBlockIndices = $state<number[]>([]);

  // Derive per-enemy attack breakdown with names from current state
  let attackBreakdown = $derived.by(() => {
    return gameState.combat.enemyActions
      .filter((a: EnemyAction) => a.type === 'attack')
      .map((a: EnemyAction) => {
        const enemy = gameState.combat.enemies[a.enemyIndex];
        return {
          name: enemy?.name ?? 'Unknown',
          damage: a.damage ?? 0,
        };
      });
  });

  const blockValue = $derived(
    selectedBlockIndices.reduce((sum, idx) => {
      const card = getCard(gameState.combat.hand[idx]);
      return sum + (card?.defense ?? 0);
    }, 0)
  );
  const remainingDamage = $derived(Math.max(0, incomingDamage - blockValue));

  function toggleBlockCard(_cardId: string, index: number) {
    if (selectedBlockIndices.includes(index)) {
      selectedBlockIndices = selectedBlockIndices.filter((i) => i !== index);
    } else {
      selectedBlockIndices = [...selectedBlockIndices, index];
    }
  }

  function handleConfirm() {
    onConfirmBlock(selectedBlockIndices);
    selectedBlockIndices = [];
  }

  function handleTakeDamage() {
    selectedBlockIndices = [];
    onTakeDamage();
  }

  $effect(() => {
    gameState.combat.hand;
  });
</script>

<div class="defense-prompt">
  <div class="defense-header">
    <div class="defense-title">INCOMING ATTACK</div>
    <div class="incoming-damage">{incomingDamage} DMG</div>
  </div>

  {#if attackBreakdown.length > 0}
    <div class="enemy-attacks">
      <div class="attacks-label">ENEMY ATTACKS:</div>
      {#each attackBreakdown as attack}
        <div class="attack-row">
          <span class="attack-enemy">{attack.name}</span>
          <span class="attack-dmg">{attack.damage} DMG</span>
        </div>
      {/each}
    </div>
  {:else if enemyAttacks.length > 0}
    <div class="enemy-attacks">
      <div class="attacks-label">ENEMY ATTACKS:</div>
      {#each enemyAttacks as attack}
        <div class="attack-row">
          <span class="attack-enemy">{attack.enemyId}</span>
          <span class="attack-dmg">{attack.damage} DMG</span>
        </div>
      {/each}
    </div>
  {/if}

  <div class="block-summary">
    <div class="block-stat">
      <span class="stat-label">Blocked:</span>
      <span class="stat-value">{blockValue}</span>
    </div>
    <div class="block-stat remaining">
      <span class="stat-label">Remaining:</span>
      <span class="stat-value" class:critical={remainingDamage > 0}>
        {remainingDamage}
      </span>
    </div>
  </div>

  <div class="defense-cards">
    <div class="defense-label">SELECT CARDS TO BLOCK:</div>
    <div class="hand-cards">
      {#each gameState.combat.hand as cardId, i}
        {@const card = getCard(cardId)}
        {#if card}
          <button
            class="block-card"
            class:selected={selectedBlockIndices.includes(i)}
            style="border-color: {card.color}"
            onclick={() => toggleBlockCard(cardId, i)}
          >
            <div class="bc-name">{card.name}</div>
            <div class="bc-defense">BLOCK {card.defense}</div>
          </button>
        {/if}
      {/each}
    </div>
  </div>

  <div class="defense-actions">
    <button
      class="btn confirm-btn"
      disabled={selectedBlockIndices.length === 0}
      onclick={handleConfirm}
    >
      BLOCK ({blockValue})
    </button>
    <button class="btn take-damage-btn" onclick={handleTakeDamage}>
      TAKE DAMAGE
    </button>
  </div>
</div>

<style>
  .defense-prompt {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1.5rem;
    background: var(--panel-bg);
    border: 2px solid var(--coral);
    border-radius: 8px;
    min-width: 350px;
  }

  .defense-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .defense-title {
    font-size: 0.9rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: var(--coral);
  }

  .incoming-damage {
    font-size: 1.25rem;
    font-weight: 900;
    color: var(--coral-light);
    font-family: ui-monospace, monospace;
  }

  .enemy-attacks {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    padding: 0.5rem;
    background: var(--ink-light);
    border-radius: 6px;
  }

  .attacks-label {
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: var(--parchment-dim);
  }

  .attack-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    font-weight: 700;
  }

  .attack-enemy {
    color: var(--coral-light);
  }

  .attack-dmg {
    color: var(--coral);
    font-family: ui-monospace, monospace;
  }

  .block-summary {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.75rem;
    background: var(--ink-light);
    border-radius: 6px;
  }

  .block-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.15rem;
  }

  .stat-label {
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: var(--parchment-dim);
  }

  .stat-value {
    font-size: 1.5rem;
    font-weight: 900;
    color: var(--spell-green);
    font-family: ui-monospace, monospace;
  }

  .stat-value.critical {
    color: var(--coral);
  }

  .defense-cards {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .defense-label {
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: var(--parchment-dim);
  }

  .hand-cards {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .block-card {
    width: 90px;
    padding: 0.5rem;
    background: var(--deep);
    border: 2px solid;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    color: var(--parchment);
  }

  .block-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  }

  .block-card.selected {
    background: rgba(34, 197, 94, 0.15);
    border-color: var(--stat-def) !important;
    box-shadow: 0 0 12px rgba(34, 197, 94, 0.2);
  }

  .bc-name {
    font-size: 0.65rem;
    font-weight: 700;
    text-align: center;
    line-height: 1.2;
  }

  .bc-defense {
    font-size: 0.7rem;
    font-weight: 900;
    color: var(--spell-green);
    font-family: ui-monospace, monospace;
  }

  .defense-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: center;
  }

  .btn {
    padding: 0.6rem 1.25rem;
    border: none;
    border-radius: 4px;
    font-size: 0.85rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    cursor: pointer;
    transition: all 0.2s ease;
    text-transform: uppercase;
  }

  .btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .confirm-btn {
    background: var(--spell-green);
    color: var(--ink);
  }

  .confirm-btn:hover:not(:disabled) {
    background: var(--stat-heal);
    transform: translateY(-2px);
  }

  .take-damage-btn {
    background: var(--shallow);
    border: 1px solid var(--panel-border);
    color: var(--parchment);
  }

  .take-damage-btn:hover {
    background: var(--coral);
    border-color: var(--coral);
    transform: translateY(-2px);
  }
</style>
