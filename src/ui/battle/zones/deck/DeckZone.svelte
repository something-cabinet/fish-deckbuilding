<script lang="ts">
  import { gameState } from '../../../../lib/state.svelte';
  import { getCard } from '../../../../game/cards/cardData';
  import DeckViewer from '../../../battle/DeckViewer.svelte';

  let showDeck = $state(false);
  let showDiscard = $state(false);

  let deckCount = $derived(gameState.combat.battleDeck.length);
  let discardCount = $derived(gameState.combat.battleDiscard.length);
  let topDiscardId = $derived(gameState.combat.battleDiscard[discardCount - 1] ?? null);
  let topDiscardCard = $derived(topDiscardId ? getCard(topDiscardId) : null);
</script>

<div class="deck-zone">
  <!-- Deck stack -->
  <div class="pile-group">
    <div class="pile-label">DECK</div>
    <div class="deck-stack">
      <div class="card-back"></div>
      {#if deckCount > 1}<div class="card-back" style="top: 1px; left: 1px;"></div>{/if}
      {#if deckCount > 2}<div class="card-back" style="top: 2px; left: 2px;"></div>{/if}
      <div class="count-badge">{deckCount}</div>
    </div>
    <button class="pile-btn" onclick={() => (showDeck = !showDeck)}>
      {showDeck ? 'HIDE' : 'VIEW'}
    </button>
  </div>

  <!-- Discard stack -->
  <div class="pile-group">
    <div class="pile-label">DISCARD</div>
    <button
      class="discard-stack"
      onclick={() => (showDiscard = !showDiscard)}
      disabled={discardCount === 0}
      title={discardCount > 0 ? 'Click to view discard pile' : 'No cards discarded'}
    >
      {#if topDiscardCard}
        <div
          class="discard-top-card"
          style="border-color: {topDiscardCard.color}"
        >
          <div class="dtc-name">{topDiscardCard.name}</div>
          <div class="dtc-cost">{topDiscardCard.cost}</div>
        </div>
      {:else}
        <div class="card-back empty-discard"></div>
      {/if}
      {#if discardCount > 1}<div class="card-back" style="top: 1px; left: 1px; opacity: 0.6;"></div>{/if}
      {#if discardCount > 2}<div class="card-back" style="top: 2px; left: 2px; opacity: 0.4;"></div>{/if}
      <div class="count-badge discard-badge">{discardCount}</div>
    </button>
    <button
      class="pile-btn"
      onclick={() => (showDiscard = !showDiscard)}
      disabled={discardCount === 0}
    >
      {showDiscard ? 'HIDE' : 'VIEW'}
    </button>
  </div>
</div>

<!-- Deck modal -->
{#if showDeck}
  <div
    class="modal-overlay"
    role="button"
    tabindex="0"
    onclick={() => (showDeck = false)}
    onkeydown={(e) => e.key === 'Escape' && (showDeck = false)}
  >
    <div
      class="modal-content"
      role="dialog"
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
    >
      <DeckViewer />
      <button class="close-btn" onclick={() => (showDeck = false)}>CLOSE</button>
    </div>
  </div>
{/if}

<!-- Discard modal -->
{#if showDiscard}
  <div
    class="modal-overlay"
    role="button"
    tabindex="0"
    onclick={() => (showDiscard = false)}
    onkeydown={(e) => e.key === 'Escape' && (showDiscard = false)}
  >
    <div
      class="modal-content discard-modal"
      role="dialog"
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
    >
      <div class="discard-header">
        <h3 class="discard-title">DISCARD PILE</h3>
        <span class="discard-count">{discardCount} cards</span>
      </div>
      <div class="discard-list">
        {#each gameState.combat.battleDiscard as cardId, i}
          {@const card = getCard(cardId)}
          {#if card}
            <div class="discard-card" style="border-left-color: {card.color}">
              <div class="discard-card-header">
                <span class="discard-card-name">{card.name}</span>
                <span class="discard-card-cost">{card.cost}C</span>
              </div>
              <div class="discard-card-meta">
                <span class="meta-stat">ATK {card.attack}</span>
                <span class="meta-stat">DEF {card.defense}</span>
                <span class="meta-stat">COIN {card.coinValue}</span>
              </div>
            </div>
          {/if}
        {/each}
      </div>
      <button class="close-btn" onclick={() => (showDiscard = false)}>CLOSE</button>
    </div>
  </div>
{/if}

<style>
  .deck-zone {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    min-width: 160px;
    max-width: 200px;
  }

  .pile-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    align-items: center;
    padding: 0.75rem;
    background: var(--ink-light);
    border: 1px solid var(--panel-border);
    border-radius: 8px;
  }

  .pile-label {
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.15em;
    color: var(--parchment-dim);
  }

  .deck-stack {
    position: relative;
    width: 60px;
    height: 84px;
  }

  .card-back {
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 4px;
    border: 1px solid var(--panel-border);
    background: var(--shallow);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  }

  .card-back.empty-discard {
    opacity: 0.4;
    background: var(--deep);
  }

  .discard-stack {
    position: relative;
    width: 60px;
    height: 84px;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    transition: transform 0.2s ease;
  }

  .discard-stack:hover:not(:disabled) {
    transform: translateY(-2px);
  }

  .discard-stack:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .discard-top-card {
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 4px;
    border: 2px solid;
    background: var(--deep);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
    z-index: 2;
  }

  .dtc-name {
    font-size: 0.55rem;
    font-weight: 700;
    color: var(--parchment);
    text-align: center;
    line-height: 1.2;
    padding: 0 0.25rem;
  }

  .dtc-cost {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--gold-dark);
    color: var(--gold);
    font-size: 0.55rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .count-badge {
    position: absolute;
    bottom: -4px;
    right: -4px;
    background: var(--coral);
    border-radius: 50%;
    width: 20px;
    height: 20px;
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--ink);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    z-index: 3;
  }

  .discard-badge {
    background: var(--unit-blue);
  }

  .pile-btn {
    padding: 0.3rem 0.6rem;
    background: var(--shallow);
    border: 1px solid var(--panel-border);
    color: var(--parchment);
    font-size: 0.6rem;
    font-weight: 700;
    cursor: pointer;
    border-radius: 4px;
    letter-spacing: 0.05em;
    transition: all 0.2s ease;
  }

  .pile-btn:hover:not(:disabled) {
    background: var(--coral);
    border-color: var(--coral);
  }

  .pile-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

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

  .modal-content {
    background: var(--deep);
    border: 1px solid var(--panel-border);
    border-radius: 8px;
    padding: 1.5rem;
    max-width: 600px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .discard-modal {
    max-width: 400px;
  }

  .discard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .discard-title {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--parchment);
    letter-spacing: 0.1em;
    margin: 0;
  }

  .discard-count {
    font-size: 0.75rem;
    color: var(--parchment-dim);
    font-weight: 700;
  }

  .discard-list {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    max-height: 50vh;
    overflow-y: auto;
  }

  .discard-card {
    padding: 0.5rem 0.75rem;
    background: var(--ink-light);
    border-left: 4px solid;
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .discard-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .discard-card-name {
    font-weight: 700;
    color: var(--parchment);
    font-size: 0.8rem;
  }

  .discard-card-cost {
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--gold);
  }

  .discard-card-meta {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .meta-stat {
    font-size: 0.65rem;
    color: var(--parchment-dim);
    font-family: ui-monospace, monospace;
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
