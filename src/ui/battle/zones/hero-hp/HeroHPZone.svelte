<script lang="ts">
  import { gameState } from '../../../../lib/state.svelte';
  import { getRelic } from '../../../../game/relics/relicData';

  let ownedRelics = $derived(
    gameState.run.relics
      .map((id) => getRelic(id))
      .filter((r): r is NonNullable<typeof r> => r != null)
  );
</script>

<div class="hero-hp-zone">
  <div class="hp-section">
    <span class="hp-label">GUPPY</span>
    <div class="hp-bar-bg">
      <div
        class="hp-bar-fill"
        style="width: {(gameState.combat.heroHp / Math.max(1, gameState.combat.heroMaxHp)) * 100}%"
      ></div>
    </div>
    <span class="hp-text">{gameState.combat.heroHp} / {gameState.combat.heroMaxHp}</span>
  </div>

  {#if ownedRelics.length > 0}
    <div class="relic-bar">
      {#each ownedRelics as relic}
        <div
          class="relic-icon"
          style="background: {relic.color}40; border-color: {relic.color}"
          title={relic.description}
        >
          <span class="relic-abbr">
            {relic.name.split(' ').map((w) => w[0]).join('').slice(0, 3)}
          </span>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .hero-hp-zone {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .hp-section {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .hp-label {
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--coral);
    letter-spacing: 0.1em;
  }

  .hp-bar-bg {
    width: 140px;
    height: 12px;
    background: var(--hp-bar-bg);
    border-radius: 6px;
    overflow: hidden;
    border: 1px solid rgba(239, 68, 68, 0.3);
  }

  .hp-bar-fill {
    height: 100%;
    background: var(--hp-bar);
    border-radius: 6px;
    transition: width 0.3s ease;
  }

  .hp-text {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--parchment);
    min-width: 60px;
    font-family: ui-monospace, monospace;
  }

  .relic-bar {
    display: flex;
    gap: 0.3rem;
    align-items: center;
  }

  .relic-icon {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    border: 2px solid;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: help;
    font-size: 0.55rem;
    font-weight: 700;
    color: var(--parchment);
  }

  .relic-abbr {
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
</style>
