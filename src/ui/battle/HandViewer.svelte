<script lang="ts">
  import { gameState } from '../../lib/state.svelte';
  import { getCard } from '../../game/cards/cardData';
  import { canPlayCard } from '../../game/combat';

  interface Props {
    onHover: (cardId: string, event: MouseEvent) => void;
    onLeave: () => void;
    onSellCard?: (cardIndex: number) => void;
    onPlayCard?: (cardIndex: number) => void;
    onBlockCard?: (cardIndex: number) => void;
    /** Card selected for targeting (index in hand array) */
    selectedIndex?: number | null;
    /** Click handler for selecting a card for targeting */
    onSelectCard?: (cardIndex: number) => void;
    phase?: 'play' | 'defense';
  }

  let {
    onHover,
    onLeave,
    onSellCard,
    onPlayCard,
    onBlockCard,
    selectedIndex = null,
    onSelectCard,
    phase = 'play',
  }: Props = $props();

  $effect(() => {
    gameState.combat.hand;
  });

  function handleCardClick(cardId: string, index: number) {
    if (phase === 'play') {
      // If card has attack, select it for targeting
      const card = getCard(cardId);
      if (card && card.attack > 0 && canPlayCard(card, gameState.combat.coins, gameState.run.creditLimit)) {
        onSelectCard?.(index);
      }
    } else if (phase === 'defense') {
      onBlockCard?.(index);
    }
  }
</script>

<div class="hand-viewer">
  <div class="hand-header">
    <div class="hand-label">HAND ({gameState.combat.hand.length})</div>
    {#if phase === 'defense'}
      <div class="phase-indicator defense-indicator">BLOCK PHASE</div>
    {:else}
      <div class="phase-indicator play-indicator">PLAY PHASE</div>
    {/if}
  </div>

  <div class="hand-cards">
    {#each gameState.combat.hand as cardId, i}
      {@const card = getCard(cardId)}
      {#if card}
        <div
          class="hand-card"
          class:selected={selectedIndex === i}
          class:is-selectable={phase === 'play' && card.attack > 0 && canPlayCard(card, gameState.combat.coins, gameState.run.creditLimit)}
          style="border-color: {selectedIndex === i ? 'var(--gold)' : card.color}"
          onmouseenter={(e) => onHover(cardId, e)}
          onmouseleave={onLeave}
          role="button"
          tabindex="0"
          onclick={() => handleCardClick(cardId, i)}
        >
          <div class="card-cost">{card.cost}</div>
          <div class="card-name">{card.name}</div>
          <div class="card-stats-row">
            <span class="card-stat atk-stat" title="Attack">{card.attack}</span>
            <span class="card-stat def-stat" title="Defense">{card.defense}</span>
            <span class="card-stat coin-stat" title="Coin Value">{card.coinValue}</span>
          </div>
          <div class="card-type-label" style="background: {card.color}">
            {card.type}
          </div>

          {#if selectedIndex === i}
            <div class="selected-badge">SELECTED</div>
          {/if}

          <!-- Action buttons -->
          {#if phase === 'play'}
            <div class="card-actions">
              <button
                class="card-btn sell-btn"
                title="Sell for {card.coinValue} coin{card.coinValue > 1 ? 's' : ''}"
                onclick={(e) => {
                  e.stopPropagation();
                  onSellCard?.(i);
                }}
              >
                SELL {card.coinValue}
              </button>
              {#if card.attack > 0}
                <button
                  class="card-btn play-btn"
                  class:cant-afford={!canPlayCard(card, gameState.combat.coins, gameState.run.creditLimit)}
                  disabled={!canPlayCard(card, gameState.combat.coins, gameState.run.creditLimit)}
                  title="Play as attack ({card.cost} coin{card.cost !== 1 ? 's' : ''})"
                  onclick={(e) => {
                    e.stopPropagation();
                    if (canPlayCard(card, gameState.combat.coins, gameState.run.creditLimit)) {
                      onPlayCard?.(i);
                    }
                  }}
                >
                  ATK {card.attack}
                </button>
              {/if}
            </div>
          {:else if phase === 'defense'}
            <div class="card-actions">
              <button
                class="card-btn block-btn"
                title="Block {card.defense} damage"
                onclick={(e) => {
                  e.stopPropagation();
                  onBlockCard?.(i);
                }}
              >
                BLOCK {card.defense}
              </button>
            </div>
          {/if}
        </div>
      {/if}
    {/each}
  </div>
</div>

<style>
  .hand-viewer {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .hand-header {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .hand-label {
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.15em;
    color: var(--parchment-dim);
  }

  .phase-indicator {
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    padding: 0.15rem 0.5rem;
    border-radius: 3px;
  }

  .defense-indicator {
    background: rgba(232, 93, 78, 0.15);
    color: var(--coral);
    border: 1px solid rgba(232, 93, 78, 0.3);
  }

  .play-indicator {
    background: rgba(59, 130, 246, 0.15);
    color: var(--unit-blue);
    border: 1px solid rgba(59, 130, 246, 0.3);
  }

  .hand-cards {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
    flex-wrap: wrap;
  }

  .hand-card {
    width: 110px;
    padding: 0.5rem;
    background: var(--deep);
    border: 2px solid;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.3rem;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    position: relative;
  }

  .hand-card:hover {
    transform: translateY(-6px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
    filter: brightness(1.1);
  }

  .hand-card.selected {
    border-color: var(--gold) !important;
    box-shadow: 0 0 20px rgba(244, 196, 48, 0.3);
    background: rgba(244, 196, 48, 0.06);
    transform: translateY(-6px);
  }

  .hand-card.is-selectable {
    cursor: pointer;
  }

  .selected-badge {
    font-size: 0.5rem;
    font-weight: 900;
    letter-spacing: 0.1em;
    color: var(--ink);
    background: var(--gold);
    padding: 0.1rem 0.35rem;
    border-radius: 3px;
    text-transform: uppercase;
  }

  .card-cost {
    position: absolute;
    top: 4px;
    left: 4px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--gold-dark);
    color: var(--gold);
    font-size: 0.7rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .card-name {
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--parchment);
    text-align: center;
    line-height: 1.2;
    margin-top: 0.35rem;
  }

  .card-stats-row {
    display: flex;
    gap: 0.25rem;
    width: 100%;
    justify-content: center;
  }

  .card-stat {
    font-size: 0.55rem;
    font-weight: 700;
    padding: 0.1rem 0.3rem;
    border-radius: 3px;
    min-width: 18px;
    text-align: center;
  }

  .card-stat.atk-stat {
    background: rgba(251, 191, 36, 0.15);
    color: #fbbf24;
  }

  .card-stat.def-stat {
    background: rgba(34, 197, 94, 0.15);
    color: #22c55e;
  }

  .card-stat.coin-stat {
    background: rgba(244, 196, 48, 0.15);
    color: var(--gold);
  }

  .card-type-label {
    font-size: 0.5rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--parchment);
    padding: 0.1rem 0.35rem;
    border-radius: 3px;
  }

  .card-actions {
    display: flex;
    gap: 0.2rem;
    width: 100%;
  }

  .card-btn {
    flex: 1;
    padding: 0.25rem 0.15rem;
    border: none;
    border-radius: 3px;
    font-size: 0.55rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s ease;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .card-btn:hover {
    transform: translateY(-1px);
  }

  .card-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
    transform: none;
  }

  .sell-btn {
    background: rgba(168, 85, 247, 0.3);
    color: #c084fc;
  }

  .sell-btn:hover:not(:disabled) {
    background: rgba(168, 85, 247, 0.5);
  }

  .play-btn {
    background: rgba(232, 93, 78, 0.3);
    color: #ff7a6b;
  }

  .play-btn:hover:not(:disabled) {
    background: rgba(232, 93, 78, 0.5);
  }

  .play-btn.cant-afford {
    opacity: 0.4;
  }

  .block-btn {
    background: rgba(34, 197, 94, 0.3);
    color: #4ade80;
  }

  .block-btn:hover:not(:disabled) {
    background: rgba(34, 197, 94, 0.5);
  }
</style>
