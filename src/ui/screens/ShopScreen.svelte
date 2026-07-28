<script lang="ts">
  import { gameState, setScreen, spendGold, addToDeck } from '../../lib/state.svelte';
  import { CARD_DATA, getCard } from '../../game/cards/cardData';
  import { CardType, type CardDefinition } from '../../game/combat/CardTypes';

  // Mock shop inventory — cards NOT in starter deck + some extras
  const SHOP_INVENTORY = [
    'water_jet',
    'scale_armor',
    'healing_rain',
    'summon_clam_guard',
    'deep_focus',
    'crashing_wave',
  ];

  const CARD_PRICES: Record<string, number> = {
    water_jet: 80,
    scale_armor: 60,
    healing_rain: 50,
    summon_clam_guard: 70,
    deep_focus: 40,
    crashing_wave: 90,
  };

  let purchasedIds = $state<Set<string>>(new Set());
  let animatingCard = $state<string | null>(null);
  let goldDisplay = $derived(gameState.run.gold);

  const availableCards = $derived(
    SHOP_INVENTORY.filter(id => !purchasedIds.has(id))
      .map(id => ({ id, card: getCard(id), price: CARD_PRICES[id] ?? 50 }))
      .filter((item): item is { id: string; card: CardDefinition; price: number } => item.card !== undefined)
  );

  function getCardSprite(type: CardType): string {
    switch (type) {
      case CardType.Attack: return '/sprites/cards/card-attack.svg';
      case CardType.Armor: return '/sprites/cards/card-armor.svg';
      case CardType.Summon: return '/sprites/cards/card-summon.svg';
      default: return '/sprites/cards/card-attack.svg';
    }
  }

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

  function buyCard(cardId: string, price: number) {
    if (gameState.run.gold < price) return;
    animatingCard = cardId;
    setTimeout(() => {
      spendGold(price);
      addToDeck(cardId);
      purchasedIds = new Set([...purchasedIds, cardId]);
      animatingCard = null;
    }, 400);
  }

  function goBack() {
    setScreen('map');
  }
</script>

<div class="shop-screen">
  <div class="shop-header">
    <button class="back-btn" onclick={goBack}>← MAP</button>
    <h1 class="shop-title">MERCHANT OF THE DEEP</h1>
    <div class="gold-display">
      <img src="/sprites/ui/mana-crystal.svg" alt="" class="gold-icon" />
      <span class="gold-amount" class:gold-pulse={animatingCard !== null}>{goldDisplay}</span>
    </div>
  </div>

  <div class="shop-content">
    {#if availableCards.length === 0}
      <div class="empty-state">
        <img src="/sprites/hero/guppy-idle.svg" alt="" class="empty-guppy" />
        <p class="empty-text">Nothing for sale right now.</p>
        <p class="empty-sub">Come back after your next battle.</p>
      </div>
    {:else}
      <div class="cards-grid">
        {#each availableCards as { id, card, price }}
          {@const canAfford = gameState.run.gold >= price}
          {@const isAnimating = animatingCard === id}
          <div class="shop-card" class:animating={isAnimating}>
            <div class="card-frame" style="border-color: {getTypeColor(card.type)}">
              <div class="card-header">
                <span class="mana-cost">{card.manaCost}</span>
                <span class="card-type" style="color: {getTypeColor(card.type)}">{card.type}</span>
              </div>
              <img src={getCardSprite(card.type)} alt={card.name} class="card-art" />
              <h3 class="card-name">{card.name}</h3>
              <p class="card-desc">{card.description}</p>
              <div class="card-stats">
                {#if card.damage}
                  <span class="stat" style="color: var(--stat-atk)">⚔️ {card.damage}</span>
                {/if}
                {#if card.armorAmount}
                  <span class="stat" style="color: var(--unit-blue)">🛡️ {card.armorAmount}</span>
                {/if}
                {#if card.healAmount}
                  <span class="stat" style="color: var(--stat-heal)">💚 {card.healAmount}</span>
                {/if}
                {#if card.buffAttack}
                  <span class="stat" style="color: var(--stat-atk)">⬆️ ATK +{card.buffAttack}</span>
                {/if}
              </div>
            </div>
            <div class="card-actions">
              <span class="price" class:unaffordable={!canAfford}>{price}G</span>
              <button
                class="buy-btn"
                onclick={() => buyCard(id, price)}
                disabled={!canAfford || isAnimating}
              >
                {isAnimating ? '...' : 'BUY'}
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .shop-screen {
    position: fixed;
    inset: 0;
    display: flex;
    flex-direction: column;
    background: var(--abyss);
    z-index: 100;
    animation: screen-fade 0.3s ease-out;
  }

  @keyframes screen-fade {
    0% { opacity: 0; }
    100% { opacity: 1; }
  }

  .shop-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 2rem;
    background: var(--bg-panel);
    border-bottom: 1px solid var(--border-panel);
    gap: 1rem;
  }

  .back-btn {
    padding: 0.5rem 1rem;
    background: var(--shallow);
    border: 1px solid var(--panel-border);
    color: var(--parchment);
    font-family: 'VT323', monospace;
    font-size: 1.1rem;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.2s ease;
    white-space: nowrap;
  }

  .back-btn:hover {
    background: var(--coral);
    border-color: var(--coral);
  }

  .shop-title {
    font-family: 'Press Start 2P', monospace;
    font-size: 1.1rem;
    color: var(--gold);
    margin: 0;
    text-align: center;
    flex: 1;
    letter-spacing: 0.05em;
  }

  .gold-display {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: rgba(244, 196, 48, 0.1);
    padding: 0.4rem 0.8rem;
    border-radius: 6px;
    border: 1px solid rgba(244, 196, 48, 0.3);
  }

  .gold-icon {
    width: 20px;
    height: 20px;
    opacity: 0.8;
  }

  .gold-amount {
    font-family: 'VT323', monospace;
    font-size: 1.4rem;
    color: var(--gold);
    font-weight: 700;
    min-width: 3ch;
    text-align: right;
    transition: all 0.2s ease;
  }

  .gold-pulse {
    animation: gold-tick 0.3s ease;
  }

  @keyframes gold-tick {
    0% { transform: scale(1); }
    50% { transform: scale(1.3); color: var(--coral-light); }
    100% { transform: scale(1); }
  }

  .shop-content {
    flex: 1;
    overflow-y: auto;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1.5rem;
    width: 100%;
    max-width: 900px;
  }

  .shop-card {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    transition: transform 0.2s ease;
  }

  .shop-card:hover {
    transform: translateY(-4px);
  }

  .shop-card.animating {
    animation: card-buy 0.4s ease forwards;
  }

  @keyframes card-buy {
    0% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.1); opacity: 0.8; }
    100% { transform: scale(0.8); opacity: 0; }
  }

  .card-frame {
    background: var(--deep);
    border: 2px solid;
    border-radius: 8px;
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    position: relative;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .mana-cost {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--unit-blue);
    border-radius: 50%;
    font-family: 'VT323', monospace;
    font-size: 1rem;
    color: white;
    font-weight: 700;
  }

  .card-type {
    font-family: 'VT323', monospace;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    opacity: 0.8;
  }

  .card-art {
    width: 100%;
    height: 100px;
    object-fit: contain;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
    padding: 0.5rem;
  }

  .card-name {
    font-family: 'VT323', monospace;
    font-size: 1.2rem;
    color: var(--parchment);
    margin: 0;
    text-align: center;
  }

  .card-desc {
    font-size: 0.8rem;
    color: var(--parchment-dim);
    margin: 0;
    line-height: 1.4;
    text-align: center;
    min-height: 2.8em;
  }

  .card-stats {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
    flex-wrap: wrap;
  }

  .stat {
    font-family: 'VT323', monospace;
    font-size: 0.9rem;
    font-weight: 700;
  }

  .card-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 0.25rem;
  }

  .price {
    font-family: 'VT323', monospace;
    font-size: 1.2rem;
    color: var(--gold);
    font-weight: 700;
  }

  .price.unaffordable {
    color: var(--coral);
    text-decoration: line-through;
    opacity: 0.6;
  }

  .buy-btn {
    padding: 0.5rem 1.25rem;
    background: var(--coral);
    border: none;
    color: var(--parchment);
    font-family: 'VT323', monospace;
    font-size: 1.1rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.2s ease;
  }

  .buy-btn:hover:not(:disabled) {
    background: var(--coral-light);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(232, 93, 78, 0.3);
  }

  .buy-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    background: var(--shallow);
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    margin-top: 4rem;
    animation: fade-in 0.5s ease;
  }

  .empty-guppy {
    width: 80px;
    height: 80px;
    opacity: 0.5;
    animation: guppy-sigh 3s ease-in-out infinite;
  }

  @keyframes guppy-sigh {
    0%, 100% { transform: translateY(0) rotate(0); }
    25% { transform: translateY(-4px) rotate(-3deg); }
    75% { transform: translateY(-4px) rotate(3deg); }
  }

  .empty-text {
    font-family: 'VT323', monospace;
    font-size: 1.5rem;
    color: var(--parchment-dim);
    margin: 0;
  }

  .empty-sub {
    font-size: 0.9rem;
    color: var(--parchment-dim);
    opacity: 0.6;
    margin: 0;
  }

  @media (prefers-reduced-motion: reduce) {
    .shop-screen,
    .shop-card,
    .gold-amount,
    .empty-guppy {
      animation: none;
      transition: none;
    }
  }

  @media (max-width: 640px) {
    .shop-header {
      padding: 0.75rem 1rem;
      flex-wrap: wrap;
    }
    .shop-title {
      font-size: 0.8rem;
      order: 3;
      width: 100%;
      margin-top: 0.5rem;
    }
    .cards-grid {
      grid-template-columns: 1fr;
      padding: 1rem;
    }
    .shop-content {
      padding: 1rem;
    }
  }
</style>
