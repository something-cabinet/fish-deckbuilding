<script lang="ts">
  import { getCard } from '../../game/cards/cardData';
  import { CardType } from '../../game/combat/CardTypes';

  interface Props {
    cardId: string;
  }

  let { cardId }: Props = $props();

  const card = $derived(getCard(cardId));

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

{#if card}
  <div class="card-tooltip" style="border-color: {getTypeColor(card.type)}">
    <div class="tooltip-header">
      <span class="tooltip-name" style="color: {getTypeColor(card.type)}">{card.name}</span>
      <span class="tooltip-cost">{card.manaCost}⚡</span>
    </div>

    <div class="tooltip-type-badge">{card.type.toUpperCase()}</div>

    <div class="tooltip-stats-grid">
      {#if card.damage}
        <div class="tooltip-stat-row">
          <span class="tooltip-stat-label">DMG</span>
          <span class="tooltip-stat-value atk">{card.damage}</span>
        </div>
      {/if}
      {#if card.armorAmount}
        <div class="tooltip-stat-row">
          <span class="tooltip-stat-label">ARMOR</span>
          <span class="tooltip-stat-value def">{card.armorAmount}</span>
        </div>
      {/if}
      {#if card.healAmount}
        <div class="tooltip-stat-row">
          <span class="tooltip-stat-label">HEAL</span>
          <span class="tooltip-stat-value def">{card.healAmount}</span>
        </div>
      {/if}
      {#if card.buffAttack}
        <div class="tooltip-stat-row">
          <span class="tooltip-stat-label">ATK+</span>
          <span class="tooltip-stat-value atk">{card.buffAttack}</span>
        </div>
      {/if}
      {#if card.isAoE}
        <div class="tooltip-stat-row">
          <span class="tooltip-stat-label">AOE</span>
          <span class="tooltip-stat-value">R{card.aoeRadius ?? 1}</span>
        </div>
      {/if}
    </div>

    {#if card.summonUnit}
      <div class="tooltip-summon">
        <span class="summon-label">Summon: ATK {card.summonUnit.attack} / HP {card.summonUnit.maxHp}</span>
      </div>
    {/if}

    {#if card.passiveEffect}
      <div class="tooltip-passive">
        <span class="passive-label">Passive: {card.passiveEffect}</span>
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
    animation: tooltip-enter 0.15s ease-out;
  }

  @keyframes tooltip-enter {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
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
    color: white;
    background: var(--unit-blue);
    padding: 0.15rem 0.4rem;
    border-radius: 50%;
    min-width: 26px;
    text-align: center;
  }

  .tooltip-type-badge {
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: var(--parchment-dim);
    text-transform: uppercase;
    padding: 0.1rem 0.3rem;
    background: rgba(255,255,255,0.06);
    border-radius: 3px;
    align-self: flex-start;
  }

  .tooltip-stats-grid {
    display: flex;
    gap: 0.75rem;
    padding: 0.35rem 0;
    flex-wrap: wrap;
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

  .tooltip-stat-value.atk { color: var(--stat-atk); }
  .tooltip-stat-value.def { color: var(--stat-def); }

  .tooltip-summon,
  .tooltip-passive {
    padding: 0.25rem 0.5rem;
    background: rgba(168, 85, 247, 0.1);
    border: 1px solid rgba(168, 85, 247, 0.2);
    border-radius: 4px;
  }

  .summon-label,
  .passive-label {
    font-size: 0.7rem;
    color: var(--stat-purple);
    font-weight: 600;
  }

  .tooltip-desc {
    font-size: 0.8rem;
    color: var(--parchment-dim);
    line-height: 1.4;
    margin: 0;
  }
</style>
