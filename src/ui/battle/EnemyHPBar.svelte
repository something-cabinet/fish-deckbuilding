<script lang="ts">
  import { gameState } from '../../lib/state';

  // Show the boss enemy or the first alive enemy's HP
  let bossEnemy = $derived(
    gameState.combat.enemies.find(e => e.isBoss && e.hp > 0)
  );
  let firstEnemy = $derived(
    gameState.combat.enemies.find(e => e.hp > 0)
  );
  let displayEnemy = $derived(bossEnemy || firstEnemy);

  let pct = $derived(
    displayEnemy && displayEnemy.maxHp > 0
      ? (displayEnemy.hp / displayEnemy.maxHp) * 100
      : 0
  );

  let hpText = $derived(
    displayEnemy ? `${displayEnemy.hp} / ${displayEnemy.maxHp}` : '0 / 0'
  );
</script>

<div class="enemy-hp-bar">
  <div class="ehp-label">ENEMY</div>
  <div class="ehp-bar-bg">
    <div class="ehp-bar-fill" style="width: {pct}%"></div>
  </div>
  <span class="ehp-text">
    {hpText}
  </span>
</div>

<style>
  .enemy-hp-bar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .ehp-label {
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: var(--coral);
  }

  .ehp-bar-bg {
    width: 140px;
    height: 12px;
    background: rgba(232, 93, 78, 0.2);
    border-radius: 6px;
    overflow: hidden;
    border: 1px solid rgba(232, 93, 78, 0.3);
  }

  .ehp-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #e85d4e, #ff7a6b);
    border-radius: 6px;
    transition: width 0.3s ease;
  }

  .ehp-text {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--parchment);
    min-width: 60px;
    font-family: ui-monospace, monospace;
  }
</style>
