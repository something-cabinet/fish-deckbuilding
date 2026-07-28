<script lang="ts">
  import { gameState } from '../../lib/state.svelte';
  import { getCard, CARD_DATA } from '../../game/cards/cardData';
  import { CardType } from '../../game/combat/CardTypes';

  const allCards = Object.values(CARD_DATA);

  function getTypeColor(type: CardType): string {
    switch (type) {
      case CardType.Attack: return 'var(--coral)';
      case CardType.Armor: return 'var(--unit-blue)';
      case CardType.Skill: return 'var(--stat-heal)';
      case CardType.Summon: return 'var(--spell-green)';
      case CardType.Passive: return 'var(--power-purple)';
      default: return 'var(--parchment-dim)';
    }
  }
</script>

<div class="deck-viewer">
  <div class="deck-header">
    <h3 class="deck-title">DECK VIEWER</h3>
  </div>

  <div class="card-list">
    {#each allCards as card}
      <div class="deck-card" style="border-left-color: {getTypeColor(card.type)}">
        <div class="deck-card-header">
          <span class="deck-card-name">{card.name}</span>
          <span class="deck-card-cost">{card.manaCost}⚡</span>
        </div>
        <div class="deck-card-meta">
          {#if card.damage}<span class="meta-stat">DMG {card.damage}</span>{/if}
          {#if card.armorAmount}<span class="meta-stat">ARMOR {card.armorAmount}</span>{/if}
          {#if card.healAmount}<span class="meta-stat">HEAL {card.healAmount}</span>{/if}
          <span class="meta-stat">{card.type.toUpperCase()}</span>
        </div>
        <p class="deck-card-desc">{card.description}</p>
      </div>
    {/each}
  </div>

  <div class="deck-summary">
    <span>Total: {gameState.run.deck.length} cards</span>
  </div>
</div>

<style>
  .deck-viewer {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    max-height: 60vh;
    overflow-y: auto;
  }

  .deck-header {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .deck-title {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--parchment);
    letter-spacing: 0.1em;
    margin: 0;
  }

  .card-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .deck-card {
    padding: 0.75rem;
    background: var(--ink-light);
    border-left: 4px solid;
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .deck-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .deck-card-name {
    font-weight: 700;
    color: var(--parchment);
    font-size: 0.9rem;
  }

  .deck-card-cost {
    font-size: 0.8rem;
    font-weight: 700;
    color: white;
    background: var(--unit-blue);
    padding: 0.1rem 0.4rem;
    border-radius: 50%;
    min-width: 24px;
    text-align: center;
  }

  .deck-card-meta {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    flex-wrap: wrap;
  }

  .meta-stat {
    font-size: 0.7rem;
    color: var(--parchment-dim);
    font-family: ui-monospace, monospace;
  }

  .deck-card-desc {
    font-size: 0.8rem;
    color: var(--parchment-dim);
    margin: 0;
    line-height: 1.3;
  }

  .deck-summary {
    display: flex;
    gap: 1rem;
    font-size: 0.75rem;
    color: var(--parchment-dim);
    padding-top: 0.5rem;
    border-top: 1px solid var(--panel-border);
  }
</style>
