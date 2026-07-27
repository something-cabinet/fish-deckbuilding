<script lang="ts">
  import { gameState } from '../../lib/state';
  import { calculateInterest } from '../../game/combat';

  let coins = $derived(gameState.combat.coins);
  let creditUsed = $derived(gameState.combat.creditUsed);
  let interest = $derived(calculateInterest(gameState.combat.coins));
  let sellPile = $derived(gameState.combat.sellPile);
</script>

<div class="coin-display">
  <div class="sell-section">
    <div class="sell-label">SOLD CARDS</div>
    <div class="sell-cards">
      {#if sellPile.length === 0}
        <div class="sell-empty">No cards sold</div>
      {:else}
        {#each sellPile as _, i}
          <div class="sold-card" style="--offset: {i * 3}px">
            <div class="sold-card-inner">Sold</div>
          </div>
        {/each}
      {/if}
    </div>
  </div>

  <div class="coins-section">
    <div class="coins-label">COINS</div>
    <div class="coins-display">
      <div class="coins-value" class:in-debt={coins < 0}>
        <span class="coins-number">{coins}</span>
      </div>
      {#if interest > 0}
        <div class="interest-badge">INTEREST: {interest}</div>
      {/if}
      {#if creditUsed > 0}
        <div class="credit-badge">CREDIT: -{creditUsed}</div>
      {/if}
    </div>
    <div class="credit-info">
      Credit limit: {gameState.run.creditLimit}
    </div>
  </div>
</div>

<style>
  .coin-display {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 0.75rem;
    background: var(--ink-light);
    border: 1px solid var(--panel-border);
    border-radius: 8px;
    min-width: 180px;
  }

  .sell-section {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .sell-label {
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.15em;
    color: var(--parchment-dim);
  }

  .sell-cards {
    display: flex;
    gap: 0.25rem;
    min-height: 40px;
    flex-wrap: wrap;
  }

  .sell-empty {
    font-size: 0.7rem;
    color: var(--parchment-dim);
    opacity: 0.5;
    font-style: italic;
  }

  .sold-card {
    width: 36px;
    height: 40px;
    position: relative;
  }

  .sold-card-inner {
    width: 100%;
    height: 100%;
    background: var(--shallow);
    border: 1px solid var(--panel-border);
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.55rem;
    color: var(--parchment-dim);
    font-weight: 700;
    letter-spacing: 0.05em;
  }

  .coins-section {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .coins-label {
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.15em;
    color: var(--parchment-dim);
  }

  .coins-display {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .coins-value {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .coins-number {
    font-size: 1.25rem;
    font-weight: 900;
    color: var(--gold);
    font-family: ui-monospace, monospace;
  }

  .coins-value.in-debt .coins-number {
    color: var(--coral);
    text-shadow: 0 0 8px rgba(232, 93, 78, 0.4);
  }

  .interest-badge {
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: var(--coral);
    background: rgba(232, 93, 78, 0.15);
    padding: 0.15rem 0.4rem;
    border-radius: 3px;
  }

  .credit-badge {
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: var(--gold-dark);
    background: rgba(244, 196, 48, 0.15);
    padding: 0.15rem 0.4rem;
    border-radius: 3px;
  }

  .credit-info {
    font-size: 0.6rem;
    font-weight: 700;
    color: var(--parchment-dim);
    opacity: 0.6;
  }
</style>
