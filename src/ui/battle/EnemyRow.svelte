<script lang="ts">
  import { gameState, getEnemyAction } from '../../lib/state';
  import { getLivingEnemies } from '../../lib/state';
  import { getCard } from '../../game/cards/cardData';
  import type { EnemyInstance, EnemyAction } from '../../game/combat';

  interface Props {
    /** Index of currently selected target (for highlighting) */
    selectedTargetIndex?: number;
    /** Whether targeting mode is active */
    targetingMode?: boolean;
    /** Click handler for selecting an enemy target */
    onEnemyClick?: (enemyIndex: number) => void;
  }

  let {
    selectedTargetIndex = -1,
    targetingMode = false,
    onEnemyClick,
  }: Props = $props();

  let livingEnemies = $derived(getLivingEnemies());
  let enemies = $derived(gameState.combat.enemies);
  let enemyActions = $derived(gameState.combat.enemyActions);

  $effect(() => {
    // Re-track when enemies change
    gameState.combat.enemies;
    gameState.combat.enemyActions;
  });

  function getAttackValue(action: EnemyAction | undefined): string {
    if (!action || action.type !== 'attack') return '';
    return `${action.damage} DMG`;
  }

  function getDefendValue(action: EnemyAction | undefined): string {
    if (!action || action.type !== 'defend') return '';
    return `DEF ${action.block}`;
  }
</script>

<div class="enemy-row">
  <div class="enemy-header">
    <span class="enemies-label">ENEMIES ({livingEnemies.length})</span>
  </div>
  <div class="enemy-cards">
    {#each enemies as enemy, i}
      {@const card = getCard(enemy.id.startsWith('enemy_') ? enemy.id.replace('enemy_', '') : '')}
      {@const action = getEnemyAction(i)}
      <button
        class="enemy-card"
        class:dead={enemy.hp <= 0}
        class:targetable={targetingMode && enemy.hp > 0}
        class:selected={selectedTargetIndex === i}
        disabled={!targetingMode || enemy.hp <= 0}
        onclick={() => targetingMode && enemy.hp > 0 && onEnemyClick?.(i)}
      >
        <div class="enemy-name">{enemy.name}</div>
        <div class="enemy-hp-bar-bg">
          <div
            class="enemy-hp-bar-fill"
            style="width: {(enemy.hp / Math.max(1, enemy.maxHp)) * 100}%"
          ></div>
        </div>
        <div class="enemy-stats">
          <span class="stat hp-stat">{enemy.hp}</span>
          <span class="stat max-hp-stat">{enemy.maxHp}</span>
        </div>
        {#if enemy.hp > 0}
          <div class="enemy-intent">
            {#if action?.type === 'attack'}
              <span class="intent-badge attack">{getAttackValue(action)}</span>
            {:else if action?.type === 'defend'}
              <span class="intent-badge defend">{getDefendValue(action)}</span>
            {:else}
              <span class="intent-badge {enemy.intent}">{enemy.intent.toUpperCase()}</span>
            {/if}
          </div>
        {:else}
          <div class="dead-badge">DEFEATED</div>
        {/if}
        {#if selectedTargetIndex === i && targetingMode}
          <div class="target-indicator">▼ TARGET</div>
        {/if}
      </button>
    {/each}
  </div>
</div>

<style>
  .enemy-row {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.75rem;
    background: var(--panel-bg);
    border: 1px solid var(--panel-border);
    border-radius: 8px;
  }

  .enemy-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .enemies-label {
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.15em;
    color: var(--parchment-dim);
  }

  .enemy-cards {
    display: flex;
    gap: 0.75rem;
    justify-content: center;
    flex-wrap: wrap;
  }

  .enemy-card {
    width: 110px;
    padding: 0.75rem;
    background: var(--deep);
    border: 2px solid var(--coral);
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.3rem;
    cursor: default;
    transition: all 0.2s ease;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    color: var(--parchment);
    position: relative;
  }

  .enemy-card.dead {
    border-color: var(--shallow);
    opacity: 0.4;
    background: var(--ink-light);
  }

  .enemy-card.targetable {
    cursor: pointer;
    border-color: var(--gold);
  }

  .enemy-card.targetable:hover {
    transform: translateY(-4px);
    box-shadow: 0 0 20px rgba(244, 196, 48, 0.3);
    border-color: var(--gold-light);
    background: rgba(244, 196, 48, 0.06);
  }

  .enemy-card.targetable.selected {
    border-color: var(--gold) !important;
    background: rgba(244, 196, 48, 0.1);
    box-shadow: 0 0 20px rgba(244, 196, 48, 0.4);
    transform: translateY(-4px);
  }

  .enemy-name {
    font-size: 0.65rem;
    font-weight: 700;
    text-align: center;
    line-height: 1.2;
    color: var(--coral-light);
  }

  .enemy-hp-bar-bg {
    width: 100%;
    height: 6px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 3px;
    overflow: hidden;
  }

  .enemy-hp-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #e85d4e, #ff7a6b);
    border-radius: 3px;
    transition: width 0.2s ease;
  }

  .enemy-stats {
    display: flex;
    gap: 0.25rem;
  }

  .stat {
    font-size: 0.7rem;
    font-weight: 700;
    padding: 0.1rem 0.35rem;
    border-radius: 3px;
    min-width: 20px;
    text-align: center;
  }

  .stat.hp-stat {
    background: rgba(239, 68, 68, 0.2);
    color: #ef4444;
  }

  .stat.max-hp-stat {
    background: rgba(255, 255, 255, 0.08);
    color: var(--parchment-dim);
  }

  .enemy-intent {
    display: flex;
    gap: 0.25rem;
  }

  .intent-badge {
    font-size: 0.5rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    padding: 0.15rem 0.4rem;
    border-radius: 3px;
  }

  .intent-badge.attack {
    background: rgba(232, 93, 78, 0.2);
    color: var(--coral-light);
    border: 1px solid rgba(232, 93, 78, 0.3);
  }

  .intent-badge.buff {
    background: rgba(168, 85, 247, 0.2);
    color: #c084fc;
    border: 1px solid rgba(168, 85, 247, 0.3);
  }

  .intent-badge.debuff {
    background: rgba(244, 196, 48, 0.2);
    color: var(--gold);
    border: 1px solid rgba(244, 196, 48, 0.3);
  }

  .intent-badge.defend {
    background: rgba(34, 197, 94, 0.2);
    color: #4ade80;
    border: 1px solid rgba(34, 197, 94, 0.3);
  }

  .dead-badge {
    font-size: 0.55rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: var(--shallow);
    padding: 0.1rem 0.35rem;
    border-radius: 3px;
  }

  .target-indicator {
    position: absolute;
    bottom: -22px;
    font-size: 0.55rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: var(--gold);
    animation: pulse-target 1s ease-in-out infinite;
  }

  @keyframes pulse-target {
    0%, 100% { opacity: 0.5; transform: translateY(0); }
    50% { opacity: 1; transform: translateY(-4px); }
  }
</style>
