<script lang="ts">
  import { gameState, setScreen, canAddToDeck, addToDeck, removeFromDeck } from '../../lib/state.svelte';
  import { CARD_DATA, getCard } from '../../game/cards/cardData';
  import { CardType } from '../../game/combat/CardTypes';
  import { getStarterDeck } from '../../game/cards/cardData';

  const MIN_DECK_SIZE = getStarterDeck().length;
  const MAX_DECK_SIZE = 30;
  const MAX_COPIES = 2;

  let battleDeck = $state<string[]>([...gameState.run.deck]);
  let activeTab = $state<CardType | 'all'>('all');
  let hoveredCard = $state<string | null>(null);
  let tooltipPos = $state({ x: 0, y: 0 });

  const deckCount = $derived(battleDeck.length);
  const isValid = $derived(deckCount >= MIN_DECK_SIZE && deckCount <= MAX_DECK_SIZE);

  // Collection: cards already owned in the player's run deck
  const collection = $derived(
    Object.values(CARD_DATA).filter(c => gameState.run.deck.includes(c.id))
  );

  const filteredCollection = $derived(
    activeTab === 'all'
      ? collection
      : collection.filter(c => c.type === activeTab)
  );

  function getCopiesInDeck(cardId: string): number {
    return battleDeck.filter(id => id === cardId).length;
  }

  function canAdd(cardId: string): boolean {
    return deckCount < MAX_DECK_SIZE && getCopiesInDeck(cardId) < MAX_COPIES;
  }

  function addCard(cardId: string) {
    if (!canAdd(cardId)) return;
    battleDeck = [...battleDeck, cardId];
  }

  function removeCard(index: number) {
    battleDeck = battleDeck.filter((_, i) => i !== index);
  }

  function ready() {
    if (!isValid) return;
    gameState.run.deck = [...battleDeck];
    setScreen('map');
  }

  function goBack() {
    setScreen('map');
  }

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

  function handleHover(cardId: string, e: MouseEvent) {
    hoveredCard = cardId;
    tooltipPos = { x: e.clientX, y: e.clientY };
  }

  function handleLeave() {
    hoveredCard = null;
  }

  const tabs = [
    { key: 'all' as const, label: 'ALL' },
    { key: CardType.Attack, label: 'ATTACK' },
    { key: CardType.Armor, label: 'ARMOR' },
    { key: CardType.Skill, label: 'SKILL' },
    { key: CardType.Summon, label: 'SUMMON' },
  ];
</script>

<div class="deck-screen">
  <div class="deck-header">
    <button class="back-btn" onclick={goBack}>← MAP</button>
    <h1 class="deck-title">ASSEMBLE YOUR SQUAD</h1>
    <div class="deck-count" class:valid={isValid} class:invalid={!isValid}>
      <span class="count-number">{deckCount}</span>
      <span class="count-sep">/</span>
      <span class="count-target">{MIN_DECK_SIZE}-{MAX_DECK_SIZE}</span>
    </div>
  </div>

  <div class="deck-body">
    <!-- Left: Collection -->
    <div class="collection-panel">
      <div class="panel-header">
        <h2 class="panel-title">COLLECTION</h2>
        <div class="tabs">
          {#each tabs as tab}
            <button
              class="tab"
              class:active={activeTab === tab.key}
              onclick={() => activeTab = tab.key}
            >
              {tab.label}
            </button>
          {/each}
        </div>
      </div>

      <div class="collection-grid">
        {#each filteredCollection as card}
          {@const copies = getCopiesInDeck(card.id)}
          {@const canAddCard = canAdd(card.id)}
          <button
            class="collection-card"
            class:maxed={copies >= MAX_COPIES}
            disabled={!canAddCard}
            onclick={() => addCard(card.id)}
            onmouseenter={(e) => handleHover(card.id, e)}
            onmouseleave={handleLeave}
          >
            <div class="mini-frame" style="border-color: {getTypeColor(card.type)}">
              <img src={getCardSprite(card.type)} alt={card.name} class="mini-art" />
              <span class="mini-name">{card.name}</span>
              <span class="mini-mana">{card.manaCost}</span>
              <span class="mini-copies" class:full={copies >= MAX_COPIES}>{copies}/{MAX_COPIES}</span>
            </div>
          </button>
        {/each}
      </div>
    </div>

    <!-- Right: Battle Deck -->
    <div class="deck-panel">
      <div class="panel-header">
        <h2 class="panel-title">BATTLE DECK</h2>
        <span class="deck-size">{deckCount} cards</span>
      </div>

      <div class="deck-slots">
        {#each Array(MAX_DECK_SIZE) as _, i}
          {@const cardId = battleDeck[i]}
          {@const card = cardId ? getCard(cardId) : null}
          <div class="deck-slot" class:filled={card !== null} class:empty={card === null}>
            {#if card}
              <button class="slot-card" onclick={() => removeCard(i)}>
                <div class="slot-inner" style="border-color: {getTypeColor(card.type)}">
                  <img src={getCardSprite(card.type)} alt={card.name} class="slot-art" />
                  <span class="slot-name">{card.name}</span>
                  <span class="slot-mana">{card.manaCost}</span>
                </div>
              </button>
            {:else}
              <div class="slot-placeholder">
                <span class="slot-number">{i + 1}</span>
              </div>
            {/if}
          </div>
        {/each}
      </div>

      <button class="ready-btn" onclick={ready} disabled={!isValid}>
        {isValid ? 'READY FOR BATTLE' : `NEED ${MIN_DECK_SIZE - deckCount} MORE`}
      </button>
    </div>
  </div>
</div>

<!-- Tooltip -->
{#if hoveredCard}
  {@const card = getCard(hoveredCard)}
  {#if card}
    <div class="tooltip" style="left: {tooltipPos.x + 16}px; top: {tooltipPos.y}px;">
      <div class="tooltip-header" style="color: {getTypeColor(card.type)}">
        <span class="tooltip-name">{card.name}</span>
        <span class="tooltip-mana">{card.manaCost}⚡</span>
      </div>
      <p class="tooltip-desc">{card.description}</p>
      <div class="tooltip-stats">
        {#if card.damage}<span style="color: var(--stat-atk)">⚔️ {card.damage}</span>{/if}
        {#if card.armorAmount}<span style="color: var(--unit-blue)">🛡️ {card.armorAmount}</span>{/if}
        {#if card.healAmount}<span style="color: var(--stat-heal)">💚 {card.healAmount}</span>{/if}
        {#if card.buffAttack}<span style="color: var(--stat-atk)">⬆️ ATK +{card.buffAttack}</span>{/if}
      </div>
    </div>
  {/if}
{/if}

<style>
  .deck-screen {
    position: fixed;
    inset: 0;
    display: flex;
    flex-direction: column;
    background: var(--abyss);
    z-index: 100;
    animation: screen-fade 0.3s ease;
  }

  @keyframes screen-fade {
    0% { opacity: 0; }
    100% { opacity: 1; }
  }

  .deck-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 2rem;
    background: var(--bg-panel);
    border-bottom: 1px solid var(--border-panel);
    gap: 1rem;
    flex-shrink: 0;
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

  .deck-title {
    font-family: 'Press Start 2P', monospace;
    font-size: 1rem;
    color: var(--gold);
    margin: 0;
    text-align: center;
    flex: 1;
    letter-spacing: 0.05em;
  }

  .deck-count {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.4rem 0.8rem;
    border-radius: 6px;
    border: 2px solid;
    font-family: 'VT323', monospace;
    font-size: 1.3rem;
    transition: all 0.3s ease;
  }

  .deck-count.valid {
    border-color: var(--stat-def);
    background: rgba(34, 197, 94, 0.1);
    color: var(--stat-def);
  }

  .deck-count.invalid {
    border-color: var(--coral);
    background: rgba(232, 93, 78, 0.1);
    color: var(--coral);
  }

  .count-number {
    font-weight: 700;
    font-size: 1.5rem;
  }

  .deck-body {
    display: flex;
    flex: 1;
    overflow: hidden;
    gap: 1px;
    background: var(--border-panel);
  }

  .collection-panel,
  .deck-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: var(--bg-panel);
    overflow: hidden;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--border-panel);
    flex-shrink: 0;
  }

  .panel-title {
    font-family: 'VT323', monospace;
    font-size: 1.1rem;
    color: var(--parchment-dim);
    margin: 0;
    letter-spacing: 0.1em;
  }

  .tabs {
    display: flex;
    gap: 0.25rem;
  }

  .tab {
    padding: 0.3rem 0.6rem;
    background: transparent;
    border: 1px solid transparent;
    color: var(--parchment-dim);
    font-family: 'VT323', monospace;
    font-size: 0.85rem;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.2s ease;
  }

  .tab:hover {
    background: var(--shallow);
    color: var(--parchment);
  }

  .tab.active {
    background: var(--shallow);
    border-color: var(--panel-border);
    color: var(--parchment);
  }

  .deck-size {
    font-family: 'VT323', monospace;
    font-size: 1rem;
    color: var(--parchment-dim);
  }

  .collection-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 0.5rem;
    padding: 1rem;
    overflow-y: auto;
    flex: 1;
  }

  .collection-card {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    transition: transform 0.15s ease;
  }

  .collection-card:hover:not(:disabled) {
    transform: translateY(-2px) scale(1.05);
  }

  .collection-card:disabled {
    cursor: not-allowed;
    opacity: 0.4;
  }

  .collection-card.maxed {
    opacity: 0.5;
  }

  .mini-frame {
    background: var(--deep);
    border: 2px solid;
    border-radius: 6px;
    padding: 0.5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    position: relative;
  }

  .mini-art {
    width: 48px;
    height: 48px;
    object-fit: contain;
  }

  .mini-name {
    font-family: 'VT323', monospace;
    font-size: 0.8rem;
    color: var(--parchment);
    text-align: center;
    line-height: 1.1;
  }

  .mini-mana {
    position: absolute;
    top: 4px;
    left: 4px;
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--unit-blue);
    border-radius: 50%;
    font-family: 'VT323', monospace;
    font-size: 0.75rem;
    color: white;
    font-weight: 700;
  }

  .mini-copies {
    position: absolute;
    top: 4px;
    right: 4px;
    font-family: 'VT323', monospace;
    font-size: 0.7rem;
    color: var(--parchment-dim);
    background: rgba(0,0,0,0.4);
    padding: 1px 4px;
    border-radius: 3px;
  }

  .mini-copies.full {
    color: var(--coral);
  }

  .deck-slots {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
    gap: 0.5rem;
    padding: 1rem;
    overflow-y: auto;
    flex: 1;
    align-content: start;
  }

  .deck-slot {
    aspect-ratio: 3/4;
    min-height: 100px;
  }

  .slot-card {
    width: 100%;
    height: 100%;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    transition: transform 0.15s ease;
  }

  .slot-card:hover {
    transform: translateY(-2px) scale(1.05);
  }

  .slot-inner {
    background: var(--deep);
    border: 2px solid;
    border-radius: 6px;
    padding: 0.5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    height: 100%;
    position: relative;
  }

  .slot-art {
    width: 40px;
    height: 40px;
    object-fit: contain;
  }

  .slot-name {
    font-family: 'VT323', monospace;
    font-size: 0.75rem;
    color: var(--parchment);
    text-align: center;
    line-height: 1.1;
  }

  .slot-mana {
    position: absolute;
    top: 4px;
    left: 4px;
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--unit-blue);
    border-radius: 50%;
    font-family: 'VT323', monospace;
    font-size: 0.7rem;
    color: white;
    font-weight: 700;
  }

  .slot-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(15, 34, 54, 0.4);
    border: 2px dashed var(--border-panel);
    border-radius: 6px;
  }

  .slot-number {
    font-family: 'VT323', monospace;
    font-size: 1.2rem;
    color: var(--parchment-dim);
    opacity: 0.3;
  }

  .ready-btn {
    margin: 1rem;
    padding: 1rem;
    background: var(--coral);
    border: none;
    color: var(--parchment);
    font-family: 'VT323', monospace;
    font-size: 1.3rem;
    font-weight: 700;
    letter-spacing: 0.15em;
    cursor: pointer;
    border-radius: 6px;
    transition: all 0.2s ease;
    flex-shrink: 0;
  }

  .ready-btn:hover:not(:disabled) {
    background: var(--coral-light);
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(232, 93, 78, 0.3);
  }

  .ready-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    background: var(--shallow);
  }

  .tooltip {
    position: fixed;
    z-index: 200;
    background: var(--deep);
    border: 1px solid var(--panel-border);
    border-radius: 8px;
    padding: 0.75rem 1rem;
    min-width: 200px;
    max-width: 280px;
    pointer-events: none;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  }

  .tooltip-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .tooltip-name {
    font-family: 'VT323', monospace;
    font-size: 1.1rem;
    font-weight: 700;
  }

  .tooltip-mana {
    font-family: 'VT323', monospace;
    font-size: 1rem;
  }

  .tooltip-desc {
    font-size: 0.85rem;
    color: var(--parchment-dim);
    margin: 0 0 0.5rem;
    line-height: 1.4;
  }

  .tooltip-stats {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    font-family: 'VT323', monospace;
    font-size: 0.9rem;
  }

  @media (prefers-reduced-motion: reduce) {
    .deck-screen,
    .collection-card,
    .slot-card,
    .deck-count {
      animation: none;
      transition: none;
    }
  }

  @media (max-width: 768px) {
    .deck-body {
      flex-direction: column;
    }
    .collection-panel {
      max-height: 40vh;
    }
    .deck-panel {
      max-height: 50vh;
    }
    .collection-grid {
      grid-template-columns: repeat(3, 1fr);
    }
    .deck-slots {
      grid-template-columns: repeat(4, 1fr);
    }
    .deck-title {
      font-size: 0.7rem;
    }
    .tabs {
      flex-wrap: wrap;
    }
  }
</style>
