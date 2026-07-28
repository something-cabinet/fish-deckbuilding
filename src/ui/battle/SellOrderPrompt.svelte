<script lang="ts">
  import { gameState } from '../../lib/state.svelte';
  import { getCard } from '../../game/cards/cardData';

  interface Props {
    sellPile: string[];
    onConfirm: (orderedCards: string[]) => void;
  }

  let { sellPile, onConfirm }: Props = $props();

  // Capture initial value once — local mutable copy for reordering
  const initialPile = sellPile;
  let orderedCards = $state<string[]>([...initialPile]);
  let selectedIndex = $state<number | null>(null);

  const deckSize = $derived(gameState.combat.battleDeck.length);

  function selectCard(index: number) {
    selectedIndex = index;
  }

  function moveUp() {
    if (selectedIndex === null || selectedIndex <= 0) return;
    const arr = [...orderedCards];
    [arr[selectedIndex - 1], arr[selectedIndex]] = [arr[selectedIndex], arr[selectedIndex - 1]];
    orderedCards = arr;
    selectedIndex = selectedIndex - 1;
  }

  function moveDown() {
    if (selectedIndex === null || selectedIndex >= orderedCards.length - 1) return;
    const arr = [...orderedCards];
    [arr[selectedIndex], arr[selectedIndex + 1]] = [arr[selectedIndex + 1], arr[selectedIndex]];
    orderedCards = arr;
    selectedIndex = selectedIndex + 1;
  }

  function handleConfirm() {
    onConfirm(orderedCards);
  }
</script>

<div class="sell-order-prompt">
  <div class="prompt-header">
    <div class="prompt-title">ORDER YOUR SOLD CARDS</div>
    <div class="prompt-subtitle">
      Cards go to <strong>bottom of your deck</strong> in the order you arrange.
      <br />
      <span class="prompt-emphasis">Top = drawn first.</span>
    </div>
  </div>

  <div class="pile-info">
    <span class="info-pill">Sell Pile: {orderedCards.length} card{orderedCards.length !== 1 ? 's' : ''}</span>
    <span class="info-pill">Deck Size: {deckSize}</span>
  </div>

  <div class="card-list">
    {#each orderedCards as cardId, i}
      {@const card = getCard(cardId)}
      <button
        class="order-card"
        class:selected={selectedIndex === i}
        class:top={i === 0}
        class:bottom={i === orderedCards.length - 1}
        style="border-color: {card?.color ?? 'var(--border-dim)'}"
        onclick={() => selectCard(i)}
      >
        <div class="order-position">
          <span class="pos-badge">#{i + 1}</span>
        </div>
        <div class="order-card-info">
          <div class="order-card-name">{card?.name ?? 'Unknown'}</div>
          <div class="order-card-value">+{card?.coinValue ?? 0} coins</div>
        </div>
        <div class="order-card-icons">
          <span class="move-indicator">↕</span>
        </div>
      </button>
    {/each}
  </div>

  {#if orderedCards.length > 0}
    <div class="move-actions">
      <button
        class="move-btn"
        disabled={selectedIndex === null || selectedIndex <= 0}
        onclick={moveUp}
      >
        ▲ MOVE UP
      </button>
      <button
        class="move-btn"
        disabled={selectedIndex === null || selectedIndex >= orderedCards.length - 1}
        onclick={moveDown}
      >
        ▼ MOVE DOWN
      </button>
    </div>
  {/if}

  <div class="confirm-section">
    <button class="confirm-btn" onclick={handleConfirm}>
      CONFIRM ORDER ({orderedCards.length})
    </button>
  </div>
</div>

<style>
  .sell-order-prompt {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1.5rem;
    background: var(--panel-bg);
    border: 2px solid var(--gold);
    border-radius: 8px;
    min-width: 360px;
    max-width: 460px;
  }

  .prompt-header {
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .prompt-title {
    font-size: 1rem;
    font-weight: 900;
    letter-spacing: 0.15em;
    color: var(--gold);
  }

  .prompt-subtitle {
    font-size: 0.7rem;
    color: var(--parchment-dim);
    line-height: 1.4;
  }

  .prompt-emphasis {
    color: var(--gold);
    font-weight: 700;
  }

  .pile-info {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
  }

  .info-pill {
    padding: 0.25rem 0.6rem;
    background: var(--ink-light);
    border: 1px solid var(--panel-border);
    border-radius: 4px;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    color: var(--parchment-dim);
  }

  .card-list {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    max-height: 260px;
    overflow-y: auto;
  }

  .order-card {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: var(--deep);
    border: 2px solid;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    color: var(--parchment);
    text-align: left;
    width: 100%;
  }

  .order-card:hover {
    transform: translateX(4px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }

  .order-card.selected {
    background: rgba(244, 196, 48, 0.12);
    box-shadow: 0 0 8px rgba(244, 196, 48, 0.2);
  }

  .order-card.top {
    border-top-width: 3px;
  }

  .order-card.bottom {
    border-bottom-width: 3px;
  }

  .order-position {
    display: flex;
    align-items: center;
    min-width: 28px;
  }

  .pos-badge {
    font-size: 0.65rem;
    font-weight: 900;
    font-family: ui-monospace, monospace;
    color: var(--gold);
    background: rgba(244, 196, 48, 0.1);
    padding: 0.15rem 0.35rem;
    border-radius: 3px;
  }

  .order-card-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }

  .order-card-name {
    font-size: 0.75rem;
    font-weight: 700;
  }

  .order-card-value {
    font-size: 0.6rem;
    font-weight: 600;
    color: var(--gold);
    font-family: ui-monospace, monospace;
  }

  .order-card-icons {
    display: flex;
    align-items: center;
  }

  .move-indicator {
    font-size: 1rem;
    color: var(--parchment-dim);
    opacity: 0.6;
  }

  .move-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
  }

  .move-btn {
    padding: 0.5rem 1rem;
    background: var(--ink-light);
    border: 1px solid var(--panel-border);
    color: var(--parchment);
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.2s ease;
    flex: 1;
  }

  .move-btn:hover:not(:disabled) {
    background: var(--shallow);
    border-color: var(--gold);
    color: var(--gold);
  }

  .move-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .confirm-section {
    display: flex;
    justify-content: center;
  }

  .confirm-btn {
    padding: 0.7rem 2rem;
    background: var(--gold);
    border: none;
    color: var(--ink);
    font-size: 0.85rem;
    font-weight: 900;
    letter-spacing: 0.15em;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.2s ease;
    text-transform: uppercase;
    width: 100%;
  }

  .confirm-btn:hover {
    background: var(--gold-light);
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(244, 196, 48, 0.3);
  }
</style>
