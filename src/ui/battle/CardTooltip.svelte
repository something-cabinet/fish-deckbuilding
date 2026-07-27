<script lang="ts">
  import { getCard } from '../../game/cards/cardData';
  import type { Keyword, CardEffect } from '../../game/combat/CardTypes';

  interface Props {
    cardId: string;
  }

  let { cardId }: Props = $props();

  const card = $derived(getCard(cardId));

  const keywordLabels: Record<Keyword, string> = {
    rush: 'Rush — Can be played the same turn it\'s drawn',
    taunt: 'Taunt — Must be targeted first',
    pierce: 'Pierce — Ignores enemy defense',
    lifesteal: 'Lifesteal — Heal for half damage dealt',
    double_strike: 'Double Strike — Deals 2x damage',
    overdraft: 'Overdraft — Extends credit limit',
  };

  function effectLabel(e: CardEffect): string {
    switch (e.type) {
      case 'damage': return `Deal ${e.value} damage`;
      case 'heal': return `Heal ${e.value} HP`;
      case 'draw': return `Draw ${e.value} card${e.value !== 1 ? 's' : ''}`;
      case 'gainCoins': return `Gain ${e.value} coin${e.value !== 1 ? 's' : ''}`;
      case 'applyBuff': return `Apply buff +${e.value}`;
      case 'applyDebuff': return `Apply debuff -${e.value}`;
      default: return '';
    }
  }
</script>

{#if card}
  <div class="card-tooltip" style="border-color: {card.color}">
    <div class="tooltip-header">
      <span class="tooltip-name">{card.name}</span>
      <span class="tooltip-cost">{card.cost}C</span>
    </div>
    <div class="tooltip-type" style="background: {card.color}">{card.type}</div>
    <div class="tooltip-stats-grid">
      <div class="tooltip-stat-row">
        <span class="tooltip-stat-label">ATK</span>
        <span class="tooltip-stat-value atk">{card.attack}</span>
      </div>
      <div class="tooltip-stat-row">
        <span class="tooltip-stat-label">DEF</span>
        <span class="tooltip-stat-value def">{card.defense}</span>
      </div>
      <div class="tooltip-stat-row">
        <span class="tooltip-stat-label">COIN</span>
        <span class="tooltip-stat-value coin">{card.coinValue}</span>
      </div>
    </div>

    {#if card.keywords && card.keywords.length > 0}
      <div class="tooltip-keywords">
        {#each card.keywords as kw}
          <span class="keyword-badge" style="background: {card.color}33; border-color: {card.color}">
            {kw.replace('_', ' ')}
          </span>
        {/each}
      </div>
    {/if}

    {#if card.effects && card.effects.length > 0}
      <div class="tooltip-effects">
        {#each card.effects as eff}
          <span class="effect-text">{effectLabel(eff)}</span>
        {/each}
      </div>
    {/if}

    <p class="tooltip-desc">{card.description}</p>
  </div>
{/if}

<style>
  .card-tooltip {
    background: var(--deep);
    border: 2px solid;
    border-radius: 8px;
    padding: 1rem;
    width: 220px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .tooltip-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .tooltip-name {
    font-size: 1rem;
    font-weight: 700;
    color: var(--parchment);
  }

  .tooltip-cost {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--gold);
    background: var(--gold-dark);
    padding: 0.15rem 0.4rem;
    border-radius: 50%;
    min-width: 26px;
    text-align: center;
  }

  .tooltip-type {
    font-size: 0.6rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--parchment);
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
    align-self: flex-start;
  }

  .tooltip-stats-grid {
    display: flex;
    gap: 0.75rem;
    padding: 0.35rem 0;
  }

  .tooltip-stat-row {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.1rem;
  }

  .tooltip-stat-label {
    font-size: 0.55rem;
    font-weight: 700;
    color: var(--parchment-dim);
    letter-spacing: 0.1em;
  }

  .tooltip-stat-value {
    font-size: 1rem;
    font-weight: 900;
    font-family: ui-monospace, monospace;
  }

  .tooltip-stat-value.atk { color: #fbbf24; }
  .tooltip-stat-value.def { color: #22c55e; }
  .tooltip-stat-value.coin { color: var(--gold); }

  .tooltip-keywords {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
  }

  .keyword-badge {
    font-size: 0.6rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0.15rem 0.4rem;
    border-radius: 3px;
    border: 1px solid;
  }

  .tooltip-effects {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .effect-text {
    font-size: 0.75rem;
    color: var(--gold);
    font-weight: 600;
  }

  .tooltip-desc {
    font-size: 0.8rem;
    color: var(--parchment-dim);
    line-height: 1.4;
    margin: 0;
  }
</style>
