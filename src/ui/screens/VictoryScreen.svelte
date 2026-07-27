<script lang="ts">
  import { setScreen, resetGame, gameState } from '../../lib/state.svelte';

  function returnToMenu() {
    resetGame();
    setScreen('menu');
  }

  function newRun() {
    resetGame();
    setScreen('menu');
  }
</script>

<div class="victory-screen">
  <div class="victory-panel">
    <h1 class="victory-title">DEBT PAID IN FULL</h1>
    <p class="victory-subtitle">The leviathan falls. You are free.</p>
    <div class="victory-stats">
      <div class="stat-row">
        <span class="stat-label">Total Turns</span>
        <span class="stat-value">--</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Gold Hoarded</span>
        <span class="stat-value">{gameState.run.gold}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Cards Collected</span>
        <span class="stat-value">{gameState.run.deck.length}</span>
      </div>
    </div>
    <div class="victory-actions">
      <button class="menu-btn primary" onclick={newRun}>NEW RUN</button>
      <button class="menu-btn" onclick={returnToMenu}>MAIN MENU</button>
    </div>
  </div>
</div>

<style>
  .victory-screen {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--abyss);
  }

  .victory-panel {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    padding: 3rem;
    background: var(--panel-bg);
    border: 1px solid rgba(244, 196, 48, 0.3);
    border-radius: 8px;
    max-width: 450px;
    width: 90%;
  }

  .victory-title {
    font-size: 2.5rem;
    font-weight: 900;
    letter-spacing: 0.1em;
    color: var(--gold);
    text-shadow: 0 0 30px rgba(244, 196, 48, 0.3);
    margin: 0;
  }

  .victory-subtitle {
    font-size: 1rem;
    color: var(--parchment-dim);
    text-align: center;
    margin: 0;
  }

  .victory-stats {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 1rem 0;
    border-top: 1px solid var(--panel-border);
    border-bottom: 1px solid var(--panel-border);
  }

  .stat-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.9rem;
  }

  .stat-label {
    color: var(--parchment-dim);
  }

  .stat-value {
    color: var(--parchment);
    font-weight: 700;
  }

  .victory-actions {
    display: flex;
    gap: 1rem;
    width: 100%;
  }

  .menu-btn {
    flex: 1;
    padding: 1rem 1.5rem;
    background: var(--shallow);
    border: 1px solid var(--panel-border);
    color: var(--parchment);
    font-size: 0.9rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.2s ease;
    text-transform: uppercase;
  }

  .menu-btn:hover {
    background: var(--coral);
    border-color: var(--coral);
    transform: translateY(-2px);
  }

  .menu-btn.primary {
    background: var(--gold);
    border-color: var(--gold-dim);
    color: var(--ink);
  }

  .menu-btn.primary:hover {
    background: var(--gold-dim);
    box-shadow: 0 4px 16px rgba(244, 196, 48, 0.3);
  }
</style>
