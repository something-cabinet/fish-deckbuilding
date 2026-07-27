<script lang="ts">
  import { gameState } from '../../lib/state.svelte';
  import { getCurrentOrchestrator } from '../../game/bridge';
  import {
    addToDeck,
    markNodeCleared,
    incrementBattleIndex,
    endCombat,
    setScreen,
  } from '../../lib/state.svelte';
  import DefensePrompt from './DefensePrompt.svelte';
  import SellOrderPrompt from './SellOrderPrompt.svelte';
  import CardReward from './CardReward.svelte';

  // Defense prompt state
  let showDefensePrompt = $state(false);
  let pendingEnemyDamage = $state(0);
  let pendingEnemyAttacks = $state<{ enemyId: string; damage: number }[]>([]);

  // Card reward state
  let showCardReward = $state(false);
  let rewardCards: string[] = $state([]);

  // Detect defense phase from state sync
  $effect(() => {
    if (gameState.combat.turnPhase === 'defense' && gameState.combat.incomingDamage != null) {
      pendingEnemyDamage = gameState.combat.incomingDamage;
      pendingEnemyAttacks = gameState.combat.enemyActions.map((a) => ({
        enemyId: gameState.combat.enemies[a.enemyIndex]?.id ?? '',
        damage: a.damage ?? 0,
      }));
      showDefensePrompt = true;
    }
  });

  // Reset defense prompt when leaving defense phase
  $effect(() => {
    if (gameState.combat.turnPhase !== 'defense') {
      showDefensePrompt = false;
    }
  });

  // Detect victory for card reward
  $effect(() => {
    if (gameState.combat.rewardCards.length > 0 && !showCardReward) {
      rewardCards = [...gameState.combat.rewardCards];
      showCardReward = true;
    }
  });

  function handleConfirmBlock(blockedIndices: number[]) {
    getCurrentOrchestrator()?.defend(blockedIndices, pendingEnemyDamage);
    showDefensePrompt = false;
    pendingEnemyDamage = 0;
    getCurrentOrchestrator()?.startPlayerTurn();
  }

  function handleTakeDamage() {
    getCurrentOrchestrator()?.defend([], pendingEnemyDamage);
    showDefensePrompt = false;
    pendingEnemyDamage = 0;
    getCurrentOrchestrator()?.startPlayerTurn();
  }

  function handleConfirmSellOrder(orderedCards: string[]) {
    getCurrentOrchestrator()?.confirmSellOrder(orderedCards);
  }

  function handleRewardSelect(cardId: string) {
    addToDeck(cardId);
    finishAfterVictory();
  }

  function handleRewardSkip() {
    finishAfterVictory();
  }

  function finishAfterVictory() {
    gameState.run.heroHp = gameState.combat.heroHp;
    gameState.run.gold += gameState.combat.rewardGold;
    markNodeCleared(gameState.run.currentNodeId);
    incrementBattleIndex();
    const isBoss = gameState.combat.encounterId === 'boss_leviathan';
    endCombat();
    showCardReward = false;
    if (isBoss) {
      setScreen('victory');
    } else {
      setScreen('map');
    }
  }
</script>

{#if gameState.combat.turnPhase === 'sellOrder'}
  <div class="modal-overlay">
    <SellOrderPrompt sellPile={gameState.combat.sellPile} onConfirm={handleConfirmSellOrder} />
  </div>
{/if}

{#if showDefensePrompt}
  <div class="modal-overlay">
    <DefensePrompt
      incomingDamage={pendingEnemyDamage}
      enemyAttacks={pendingEnemyAttacks}
      onConfirmBlock={handleConfirmBlock}
      onTakeDamage={handleTakeDamage}
    />
  </div>
{/if}

{#if showCardReward}
  <CardReward rewardCards={rewardCards} onSelect={handleRewardSelect} onSkip={handleRewardSkip} />
{/if}

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(10, 22, 40, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    pointer-events: auto;
  }
</style>
