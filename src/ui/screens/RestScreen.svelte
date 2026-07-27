<script lang="ts">
  import { gameState, setScreen, healHero, markNodeCleared } from '../../lib/state.svelte';
  import { getCard, CARD_DATA } from '../../game/cards/cardData';
  import { eventBus } from '../../game/events';

  let showUpgrade = $state(false);
  const healAmount = Math.floor(gameState.run.heroMaxHp * 0.3);

  function handleHeal() {
    healHero(healAmount);
    eventBus.emit('rest:healed', { amount: healAmount, heroHp: gameState.run.heroHp });
    markNodeCleared(gameState.run.currentNodeId);
    setScreen('map');
  }

  function handleUpgrade() {
    showUpgrade = true;
  }

  function upgradeCard(cardId: string) {
    alert(`Upgraded ${getCard(cardId)?.name || 'card'}! (visual only)`);
    eventBus.emit('rest:upgraded', { cardId });
    markNodeCleared(gameState.run.currentNodeId);
    setScreen('map');
  }
</script>

<div class="rest-screen">
  <div class="rest-panel">
    <h2 class="rest-title">REST SITE</h2>
    <p class="rest-desc">A quiet corner of the deep. Tend to your wounds or hone your skills.</p>

    <div class="rest-actions">
      <button class="rest-btn heal-btn" onclick={handleHeal}>
        <span class="btn-title">SLEEP</span>
        <span class="btn-detail">Heal {healAmount} HP</span>
      </button>

      <button class="rest-btn upgrade-btn" onclick={handleUpgrade}>
        <span class="btn-title">FORGE</span>
        <span class="btn-detail">Upgrade a card</span>
      </button>
    </div>

    <button class="leave-btn" onclick={() => { markNodeCleared(gameState.run.currentNodeId); setScreen('map'); }}>CONTINUE</button>
  </div>

  {#if showUpgrade}
    <div class="modal-overlay" role="button" tabindex="0" onclick={() => showUpgrade = false} onkeydown={(e) => e.key === 'Escape' && (showUpgrade = false)}>
      <div class="modal-content" role="dialog" tabindex="-1" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.key === 'Escape' && (showUpgrade = false)}>
        <h3>Choose a card to upgrade</h3>
        <div class="upgrade-list">
          {#each gameState.run.deck as cardId}
            {@const card = getCard(cardId)}
            {#if card}
              <button class="upgrade-card" onclick={() => upgradeCard(cardId)}>
                <span class="upgrade-name">{card.name}</span>
                <span class="upgrade-type" style="background: {card.color}">{card.type}</span>
              </button>
            {/if}
          {/each}
        </div>
        <button class="close-btn" onclick={() => showUpgrade = false}>CANCEL</button>
      </div>
    </div>
  {/if}
</div>

<style>
  .rest-screen {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--abyss);
  }

  .rest-panel {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2rem;
    padding: 3rem;
    background: var(--panel-bg);
    border: 1px solid var(--panel-border);
    border-radius: 8px;
    max-width: 500px;
    width: 90%;
  }

  .rest-title {
    font-size: 1.75rem;
    font-weight: 700;
    letter-spacing: 0.15em;
    color: var(--gold);
    margin: 0;
  }

  .rest-desc {
    font-size: 0.95rem;
    color: var(--parchment-dim);
    text-align: center;
    line-height: 1.5;
    margin: 0;
  }

  .rest-actions {
    display: flex;
    gap: 1.5rem;
    width: 100%;
  }

  .rest-btn {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 1.5rem;
    background: var(--deep);
    border: 2px solid var(--panel-border);
    color: var(--parchment);
    cursor: pointer;
    border-radius: 8px;
    transition: all 0.2s ease;
  }

  .rest-btn:hover {
    transform: translateY(-4px);
    border-color: var(--coral);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  }

  .btn-title {
    font-size: 1.1rem;
    font-weight: 700;
    letter-spacing: 0.1em;
  }

  .btn-detail {
    font-size: 0.8rem;
    color: var(--parchment-dim);
  }

  .heal-btn:hover {
    border-color: #22c55e;
    background: rgba(34, 197, 94, 0.1);
  }

  .upgrade-btn:hover {
    border-color: #f4c430;
    background: rgba(244, 196, 48, 0.1);
  }

  .leave-btn {
    padding: 0.75rem 2rem;
    background: var(--shallow);
    border: 1px solid var(--panel-border);
    color: var(--parchment);
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.2s ease;
  }

  .leave-btn:hover {
    background: var(--coral);
    border-color: var(--coral);
  }

  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(10, 22, 40, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }

  .modal-content {
    background: var(--deep);
    border: 1px solid var(--panel-border);
    border-radius: 8px;
    padding: 1.5rem;
    max-width: 400px;
    width: 90%;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .modal-content h3 {
    margin: 0;
    font-size: 1.1rem;
    color: var(--parchment);
  }

  .upgrade-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-height: 300px;
    overflow-y: auto;
  }

  .upgrade-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background: var(--ink-light);
    border: 1px solid var(--panel-border);
    border-radius: 4px;
    color: var(--parchment);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .upgrade-card:hover {
    border-color: var(--gold);
    background: rgba(244, 196, 48, 0.1);
  }

  .upgrade-name {
    font-weight: 700;
    font-size: 0.9rem;
  }

  .upgrade-type {
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--parchment);
    padding: 0.2rem 0.4rem;
    border-radius: 3px;
  }

  .close-btn {
    padding: 0.5rem 1rem;
    background: var(--shallow);
    border: 1px solid var(--panel-border);
    color: var(--parchment);
    font-weight: 700;
    cursor: pointer;
    border-radius: 4px;
    align-self: center;
    transition: all 0.2s ease;
  }

  .close-btn:hover {
    background: var(--coral);
    border-color: var(--coral);
  }
</style>
