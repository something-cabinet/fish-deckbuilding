<script lang="ts">
  import { setScreen, resetGame } from '../../lib/state';

  function returnToMenu() {
    resetGame();
    setScreen('menu');
  }
</script>

<div class="death-screen">
  <div class="death-panel">
    <h1 class="death-title">DEBT COLLECTED</h1>
    <p class="death-subtitle">The deep claims all who cannot pay.</p>
    <div class="death-stats">
      <div class="stat-row">
        <span class="stat-label">Turns Survived</span>
        <span class="stat-value">--</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Gold Earned</span>
        <span class="stat-value">--</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Enemies Defeated</span>
        <span class="stat-value">--</span>
      </div>
    </div>
    <button class="retry-btn" onclick={returnToMenu}>TRY AGAIN</button>
  </div>
</div>

<style>
  .death-screen {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--abyss);
  }

  .death-panel {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    padding: 3rem;
    background: var(--panel-bg);
    border: 1px solid rgba(232, 93, 78, 0.3);
    border-radius: 8px;
    max-width: 450px;
    width: 90%;
  }

  .death-title {
    font-size: 2.5rem;
    font-weight: 900;
    letter-spacing: 0.1em;
    color: var(--coral);
    text-shadow: 0 0 30px rgba(232, 93, 78, 0.3);
    margin: 0;
  }

  .death-subtitle {
    font-size: 1rem;
    color: var(--parchment-dim);
    text-align: center;
    margin: 0;
  }

  .death-stats {
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

  .retry-btn {
    padding: 1rem 2.5rem;
    background: var(--coral);
    border: none;
    color: var(--parchment);
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: 0.15em;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.2s ease;
    text-transform: uppercase;
  }

  .retry-btn:hover {
    background: var(--coral-light);
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(232, 93, 78, 0.3);
  }
</style>
