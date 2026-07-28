<script lang="ts">
  import { gameState } from '../../lib/state.svelte';
  import { getCard } from '../../game/cards/cardData';
  import { CardType } from '../../game/combat/CardTypes';

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

  // ─── Dynamic overlap ───
  const CARD_WIDTH = 140;
  let containerWidth = $state(800);
  let hoveredIndex = $state<number | null>(null);
  let cardsContainer = $state<HTMLDivElement | null>(null);

  function calculateOverlap(cardCount: number): number {
    if (cardCount <= 1) return 0;
    const totalCardWidth = CARD_WIDTH * cardCount;
    if (totalCardWidth <= containerWidth) return 0;
    return Math.max(-80, (containerWidth - totalCardWidth) / (cardCount - 1));
  }

  let overlap = $derived(calculateOverlap(gameState.combat.hand.length));

  function getCardMargin(index: number): string {
    if (index === 0) return '0';
    if (hoveredIndex === null) return `${overlap}px`;
    const spreadOverlap = Math.min(overlap * 0.5, -4);
    if (hoveredIndex === index) return '4px';
    return `${spreadOverlap}px`;
  }

  // Resize observer
  $effect(() => {
    if (!cardsContainer) return;
    const updateWidth = () => {
      if (cardsContainer) {
        containerWidth = cardsContainer.clientWidth;
      }
    };
    updateWidth();

    let rafId: number;
    const onResize = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateWidth);
    };

    const ro = new ResizeObserver(onResize);
    ro.observe(cardsContainer);
    window.addEventListener('resize', onResize);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(rafId);
    };
  });

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

  function handleCardClick(_cardId: string, index: number) {
    if (phase === 'play') {
      onSelectCard?.(index);
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

  <div class="hand-cards" bind:this={cardsContainer}>
    {#each gameState.combat.hand as cardInstanceId, i}
      {@const card = getCard(cardInstanceId.split('_')[0] + (cardInstanceId.includes('_') && isNaN(Number(cardInstanceId.split('_').at(-1))) ? '' : ''))}
      {#if true}
        {@const resolvedCard = cardInstanceId.includes('_') ? getCard(cardInstanceId.split('_').slice(0, -1).join('_')) || getCard(cardInstanceId) : getCard(cardInstanceId)}
        <div
          class="hand-card"
          class:selected={selectedIndex === i}
          class:is-selectable={phase === 'play' && !!resolvedCard}
          class:hovered={hoveredIndex === i}
          style="border-color: {resolvedCard ? getTypeColor(resolvedCard.type) : 'var(--parchment-dim)'}"
          onmouseenter={(e) => {
            hoveredIndex = i;
            onHover(cardInstanceId, e);
          }}
          onmouseleave={() => {
            hoveredIndex = null;
            onLeave();
          }}
          role="button"
          tabindex="0"
          onclick={() => handleCardClick(cardInstanceId, i)}
        >
          {#if resolvedCard}
            <div class="card-cost">{resolvedCard.manaCost}</div>
            <div class="card-name">{resolvedCard.name}</div>
            <div class="card-type-badge">{resolvedCard.type.toUpperCase()}</div>
            <div class="card-stats-row">
              {#if resolvedCard.damage}
                <span class="card-stat atk-stat" title="Damage">{resolvedCard.damage}</span>
              {/if}
              {#if resolvedCard.armorAmount}
                <span class="card-stat def-stat" title="Armor">{resolvedCard.armorAmount}</span>
              {/if}
              {#if resolvedCard.healAmount}
                <span class="card-stat heal-stat" title="Heal">{resolvedCard.healAmount}</span>
              {/if}
            </div>
            {#if selectedIndex === i}
              <div class="selected-badge">SELECTED</div>
            {/if}

            {#if phase === 'play'}
              <div class="card-actions">
                {#if resolvedCard.manaCost <= (gameState.combat.mana || 0)}
                  <button
                    class="card-btn play-btn"
                    onclick={(e) => {
                      e.stopPropagation();
                      onPlayCard?.(i);
                    }}
                  >
                    PLAY
                  </button>
                {:else}
                  <span class="card-btn cost-too-high">{resolvedCard.manaCost}⚡</span>
                {/if}
              </div>
            {:else if phase === 'defense'}
              <div class="card-actions">
                <button
                  class="card-btn block-btn"
                  onclick={(e) => {
                    e.stopPropagation();
                    onBlockCard?.(i);
                  }}
                >
                  BLOCK
                </button>
              </div>
            {/if}
          {:else}
            <div class="card-name">Unknown</div>
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
    gap: 0;
    justify-content: center;
    flex-wrap: nowrap;
    overflow-x: auto;
    padding: 0.5rem 0;
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
    transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease, margin-left 0.3s ease, filter 0.2s ease;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    position: relative;
    flex-shrink: 0;
  }

  .hand-card:hover,
  .hand-card.hovered {
    transform: translateY(-24px) scale(1.05);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
    filter: brightness(1.1);
    z-index: 100;
  }

  .hand-card.selected {
    outline: 2px solid var(--gold);
    box-shadow: 0 0 16px var(--gold);
    transform: translateY(-12px);
    background: rgba(244, 196, 48, 0.06);
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
    background: var(--unit-blue);
    color: white;
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

  .card-type-badge {
    font-size: 0.5rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    padding: 0.1rem 0.3rem;
    border-radius: 2px;
    background: rgba(255,255,255,0.08);
    color: var(--parchment-dim);
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
    color: var(--stat-atk);
  }

  .card-stat.def-stat {
    background: rgba(34, 197, 94, 0.15);
    color: var(--stat-def);
  }

  .card-stat.heal-stat {
    background: rgba(34, 197, 94, 0.15);
    color: var(--stat-heal);
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
    text-align: center;
  }

  .card-btn:hover {
    transform: translateY(-1px);
  }

  .card-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
    transform: none;
  }

  .play-btn {
    background: rgba(232, 93, 78, 0.3);
    color: var(--coral-light);
  }

  .play-btn:hover:not(:disabled) {
    background: rgba(232, 93, 78, 0.5);
  }

  .cost-too-high {
    background: rgba(255,255,255,0.05);
    color: var(--parchment-dim);
    opacity: 0.6;
  }

  .block-btn {
    background: rgba(34, 197, 94, 0.3);
    color: var(--stat-def-light);
  }

  .block-btn:hover:not(:disabled) {
    background: rgba(34, 197, 94, 0.5);
  }
</style>
