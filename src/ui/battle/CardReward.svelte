<script lang="ts">
  import { getCard } from '../../game/cards/cardData';
  import type { Keyword, CardEffect } from '../../game/combat/CardTypes';

  interface Props {
    rewardCards: string[];
    onSelect: (cardId: string) => void;
    onSkip: () => void;
  }

  let { rewardCards, onSelect, onSkip }: Props = $props();

  let selectedCardId = $state<string | null>(null);

  // If rewardCards is empty, provide some default choices
  const displayCards = $derived(
    rewardCards.length >= 3
      ? rewardCards.slice(0, 3)
      : ['fin_slash', 'bubble_shield', 'ink_cloud']
  );

  function handleConfirm() {
    if (selectedCardId) {
      onSelect(selectedCardId);
    }
  }

  function effectLabel(e: CardEffect): string {
    switch (e.type) {
      case 'damage': return `+${e.value} DMG`;
      case 'heal': return `+${e.value} HP`;
      case 'draw': return `+${e.value} draw`;
      case 'gainCoins': return `+${e.value} coin${e.value !== 1 ? 's' : ''}`;
      default: return '';
    }
  }
</script>

<div class="card-reward-overlay">
  <div class="card-reward-panel">
    <h2 class="reward-title">CHOOSE A REWARD</h2>
    <p class="reward-subtitle">Select a card to add to your deck</p>

    <div class="reward-cards">
      {#each displayCards as cardId, i}
        {@const card = getCard(cardId)}
        {#if card}
          <button
            class="reward-card"
            class:selected={selectedCardId === cardId}
            style="border-color: {selectedCardId === cardId ? card.color : 'var(--panel-border)'}"
            onclick={() => (selectedCardId = cardId)}
          >
            <div class="card-color-bar" style="background: {card.color}"></div>
            <div class="card-cost-badge">{card.cost}</div>
            <div class="card-name">{card.name}</div>
            <div class="card-stats">
              <span class="stat atk">ATK {card.attack}</span>
              <span class="stat def">DEF {card.defense}</span>
              <span class="stat coin">C {card.coinValue}</span>
            </div>
            {#if card.keywords && card.keywords.length > 0}
              <div class="card-keywords">
                {#each card.keywords as kw}
                  <span class="kw-badge">{kw.replace('_', ' ')}</span>
                {/each}
              </div>
            {/if}
            {#if card.effects && card.effects.length > 0}
              <div class="card-extra-effects">
                {#each card.effects as eff}
                  <span class="extra-effect">{effectLabel(eff)}</span>
                {/each}
              </div>
            {/if}
            <div class="card-type" style="background: {card.color}">
              {card.type}
            </div>
            <div class="card-desc">{card.description}</div>
          </button>
        {/if}
      {/each}
    </div>

    <div class="reward-actions">
      <button
        class="btn confirm-btn"
        disabled={!selectedCardId}
        onclick={handleConfirm}
      >
        CONFIRM
      </button>
      <button class="btn skip-btn" onclick={onSkip}>
        SKIP
      </button>
    </div>
  </div>
</div>

<style>
  .card-reward-overlay {
    position: fixed;
    inset: 0;
    background: rgba(10, 22, 40, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    pointer-events: auto;
  }

  .card-reward-panel {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    padding: 2rem;
    background: var(--panel-bg);
    border: 1px solid var(--panel-border);
    border-radius: 8px;
    max-width: 700px;
    width: 90%;
  }

  .reward-title {
    font-size: 1.75rem;
    font-weight: 700;
    letter-spacing: 0.15em;
    color: var(--gold);
    margin: 0;
    text-align: center;
  }

  .reward-subtitle {
    font-size: 0.9rem;
    color: var(--parchment-dim);
    margin: 0;
    text-align: center;
  }

  .reward-cards {
    display: flex;
    gap: 1rem;
    justify-content: center;
    flex-wrap: wrap;
  }

  .reward-card {
    width: 160px;
    padding: 1rem 0.75rem 0.75rem;
    background: var(--deep);
    border: 2px solid var(--panel-border);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4rem;
    color: var(--parchment);
    position: relative;
    overflow: hidden;
  }

  .reward-card:hover {
    transform: translateY(-6px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    border-color: var(--parchment-dim);
  }

  .reward-card.selected {
    background: rgba(244, 196, 48, 0.08);
    box-shadow: 0 0 20px rgba(244, 196, 48, 0.15);
    transform: translateY(-6px);
  }

  .card-color-bar {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
  }

  .card-cost-badge {
    position: absolute;
    top: 8px;
    left: 8px;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: var(--gold-dark);
    color: var(--gold);
    font-size: 0.75rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .card-name {
    font-size: 0.85rem;
    font-weight: 700;
    text-align: center;
    margin-top: 0.25rem;
    line-height: 1.2;
  }

  .card-stats {
    display: flex;
    gap: 0.3rem;
    width: 100%;
    justify-content: center;
  }

  .stat {
    font-size: 0.6rem;
    font-weight: 700;
    padding: 0.15rem 0.35rem;
    border-radius: 3px;
  }

  .stat.atk {
    background: rgba(251, 191, 36, 0.15);
    color: #fbbf24;
  }

  .stat.def {
    background: rgba(34, 197, 94, 0.15);
    color: #22c55e;
  }

  .stat.coin {
    background: rgba(244, 196, 48, 0.15);
    color: var(--gold);
  }

  .card-keywords {
    display: flex;
    flex-wrap: wrap;
    gap: 0.2rem;
    justify-content: center;
  }

  .kw-badge {
    font-size: 0.5rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0.1rem 0.3rem;
    border-radius: 2px;
    background: rgba(168, 85, 247, 0.2);
    color: #c084fc;
    border: 1px solid rgba(168, 85, 247, 0.3);
  }

  .card-extra-effects {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.1rem;
  }

  .extra-effect {
    font-size: 0.6rem;
    font-weight: 600;
    color: var(--gold);
  }

  .card-type {
    font-size: 0.55rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--parchment);
    padding: 0.15rem 0.4rem;
    border-radius: 3px;
  }

  .card-desc {
    font-size: 0.7rem;
    color: var(--parchment-dim);
    text-align: center;
    line-height: 1.3;
  }

  .reward-actions {
    display: flex;
    gap: 1rem;
  }

  .btn {
    padding: 0.75rem 2rem;
    border: none;
    border-radius: 4px;
    font-size: 0.9rem;
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
    background: var(--gold);
    color: var(--ink);
  }

  .confirm-btn:hover:not(:disabled) {
    background: var(--gold-dim);
    transform: translateY(-2px);
  }

  .skip-btn {
    background: var(--shallow);
    border: 1px solid var(--panel-border);
    color: var(--parchment);
  }

  .skip-btn:hover {
    background: var(--coral);
    border-color: var(--coral);
    transform: translateY(-2px);
  }
</style>
