<script lang="ts">
  import { gameState, setScreen, spendGold, addToDeck, removeFromDeck, addRelic } from '../../lib/state';
  import { CARD_DATA } from '../../game/cards/cardData';
  import { RELIC_DATA } from '../../game/relics/relicData';
  import { eventBus } from '../../game/events';

  // Mock shop inventory — sell cards NOT in the starter deck
  const shopCards = [
    CARD_DATA.fin_slash_2,    // Extra copy of a basic card
    CARD_DATA.bubble_shield_2, // Extra defensive option
    CARD_DATA.ink_cloud_2,     // Extra versatile card
    CARD_DATA.desperate_strike, // Heavy hitter
  ].filter(Boolean); // Guard against undefined entries

  const shopRelics = [
    RELIC_DATA.old_coin,
    RELIC_DATA.coral_ring,
  ];

  const removeCost = 25;
  const cardCost = 50;
  const relicCost = 75;

  function buyCard(cardId: string) {
    if (gameState.run.gold >= cardCost) {
      spendGold(cardCost);
      addToDeck(cardId);
      alert(`Bought ${CARD_DATA[cardId]?.name}!`);
      eventBus.emit('shop:cardBought', { cardId, cost: cardCost });
    } else {
      alert('Not enough gold!');
    }
  }

  function buyRelic(relicId: string) {
    if (gameState.run.gold >= relicCost) {
      spendGold(relicCost);
      addRelic(relicId);
      alert(`Acquired ${RELIC_DATA[relicId]?.name}!`);
      eventBus.emit('shop:relicBought', { relicId, cost: relicCost });
    } else {
      alert('Not enough gold!');
    }
  }

  function removeCard() {
    if (gameState.run.gold >= removeCost && gameState.run.deck.length > 0) {
      spendGold(removeCost);
      const toRemove = gameState.run.deck[0];
      removeFromDeck(toRemove);
      alert(`Removed ${CARD_DATA[toRemove]?.name || 'a card'} from deck.`);
      eventBus.emit('shop:cardRemoved', { cardId: toRemove, cost: removeCost });
    } else {
      alert('Not enough gold or deck is empty!');
    }
  }
</script>

<div class="shop-panel">
  <h2 class="shop-title">MERCHANT OF THE DEEP</h2>
  <p class="shop-gold">Your Gold: <span class="gold-amount">{gameState.run.gold}</span></p>

  <div class="shop-section">
    <h3 class="section-title">CARDS FOR SALE</h3>
    <div class="shop-grid">
      {#each shopCards as card}
        <div class="shop-item card-item" style="border-color: {card.color}">
          <div class="item-header">
            <span class="item-name">{card.name}</span>
            <span class="item-cost">{cardCost}G</span>
          </div>
          <span class="item-type" style="background: {card.color}">{card.type}</span>
          <p class="item-desc">{card.description}</p>
          <button class="buy-btn" onclick={() => buyCard(card.id)}>BUY</button>
        </div>
      {/each}
    </div>
  </div>

  <div class="shop-section">
    <h3 class="section-title">RELICS</h3>
    <div class="shop-grid">
      {#each shopRelics as relic}
        <div class="shop-item relic-item" style="border-color: {relic.color}">
          <div class="item-header">
            <span class="item-name">{relic.name}</span>
            <span class="item-cost">{relicCost}G</span>
          </div>
          <span class="item-rarity">{relic.rarity}</span>
          <p class="item-desc">{relic.description}</p>
          <button class="buy-btn" onclick={() => buyRelic(relic.id)}>BUY</button>
        </div>
      {/each}
    </div>
  </div>

  <div class="shop-section">
    <h3 class="section-title">SERVICES</h3>
    <div class="service-row">
      <div class="service-card">
        <span class="service-name">Remove Card</span>
        <span class="service-cost">{removeCost}G</span>
        <p class="service-desc">Remove a card from your deck permanently.</p>
        <button class="buy-btn secondary" onclick={removeCard}>REMOVE</button>
      </div>
    </div>
  </div>

  <button class="leave-btn" onclick={() => setScreen('map')}>LEAVE SHOP</button>
</div>

<style>
  .shop-panel {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    padding: 2rem;
    background: var(--abyss);
    overflow-y: auto;
  }

  .shop-title {
    font-size: 1.75rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: var(--gold);
    margin: 0;
  }

  .shop-gold {
    font-size: 1rem;
    color: var(--parchment-dim);
  }

  .gold-amount {
    color: var(--gold);
    font-weight: 700;
  }

  .shop-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    width: 100%;
    max-width: 700px;
  }

  .section-title {
    font-size: 0.85rem;
    font-weight: 700;
    letter-spacing: 0.15em;
    color: var(--parchment-dim);
    margin: 0;
  }

  .shop-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1rem;
  }

  .shop-item {
    background: var(--deep);
    border: 2px solid;
    border-radius: 8px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .item-name {
    font-weight: 700;
    color: var(--parchment);
    font-size: 0.9rem;
  }

  .item-cost {
    font-weight: 700;
    color: var(--gold);
    font-size: 0.85rem;
  }

  .item-type, .item-rarity {
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--parchment);
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
    align-self: flex-start;
  }

  .item-desc {
    font-size: 0.8rem;
    color: var(--parchment-dim);
    margin: 0;
    line-height: 1.3;
  }

  .buy-btn {
    padding: 0.5rem 1rem;
    background: var(--coral);
    border: none;
    color: var(--parchment);
    font-weight: 700;
    font-size: 0.8rem;
    cursor: pointer;
    border-radius: 4px;
    margin-top: auto;
    transition: all 0.2s ease;
  }

  .buy-btn:hover {
    background: var(--coral-light);
    transform: translateY(-1px);
  }

  .buy-btn.secondary {
    background: var(--shallow);
    border: 1px solid var(--panel-border);
  }

  .service-row {
    display: flex;
    gap: 1rem;
  }

  .service-card {
    background: var(--deep);
    border: 1px solid var(--panel-border);
    border-radius: 8px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    min-width: 200px;
  }

  .service-name {
    font-weight: 700;
    color: var(--parchment);
  }

  .service-cost {
    font-weight: 700;
    color: var(--gold);
    font-size: 0.9rem;
  }

  .service-desc {
    font-size: 0.8rem;
    color: var(--parchment-dim);
    margin: 0;
  }

  .leave-btn {
    padding: 0.75rem 2.5rem;
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
</style>
