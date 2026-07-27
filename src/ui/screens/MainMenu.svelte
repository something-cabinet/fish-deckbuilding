<script lang="ts">
  import { setScreen, resetGame } from '../../lib/state.svelte';

  function startGame() {
    resetGame();
    setScreen('map');
  }
</script>

<div class="main-menu">
  <div class="title-block">
    <div class="title-deco top"></div>
    <h1 class="game-title">FISH DEBT</h1>
    <p class="subtitle">A Roguelite Deckbuilder</p>
    <div class="title-deco bottom"></div>
  </div>

  <div class="menu-actions">
    <button class="menu-btn primary" onclick={startGame}>PLAY</button>
    <button class="menu-btn" onclick={() => alert('Settings not yet implemented')}>SETTINGS</button>
    <button class="menu-btn" onclick={() => alert('Credits not yet implemented')}>CREDITS</button>
  </div>

  <div class="menu-footer">
    <p class="version">v0.1.0 — Deep Work Build</p>
  </div>
</div>

<style>
  .main-menu {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: var(--abyss);
    position: relative;
  }

  .title-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 3rem;
  }

  .game-title {
    font-size: 4rem;
    font-weight: 900;
    letter-spacing: 0.15em;
    color: var(--gold);
    text-shadow: 0 0 40px rgba(244, 196, 48, 0.3);
    margin: 0;
  }

  .subtitle {
    font-size: 1.1rem;
    color: var(--parchment-dim);
    letter-spacing: 0.2em;
    text-transform: uppercase;
    margin: 0;
  }

  .title-deco {
    width: 120px;
    height: 3px;
    background: var(--coral);
    border-radius: 2px;
  }

  .title-deco.top {
    margin-bottom: 1rem;
    opacity: 0.6;
  }

  .title-deco.bottom {
    margin-top: 1rem;
    opacity: 0.6;
  }

  .menu-actions {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 240px;
  }

  .menu-btn {
    padding: 1rem 2rem;
    background: var(--shallow);
    border: 1px solid var(--panel-border);
    color: var(--parchment);
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.2s ease;
  }

  .menu-btn:hover {
    background: var(--coral);
    border-color: var(--coral);
    transform: translateY(-2px);
  }

  .menu-btn.primary {
    background: var(--coral);
    border-color: var(--coral-dark);
    box-shadow: 0 4px 20px rgba(232, 93, 78, 0.25);
  }

  .menu-btn.primary:hover {
    background: var(--coral-light);
    box-shadow: 0 6px 24px rgba(232, 93, 78, 0.35);
  }

  .menu-footer {
    position: absolute;
    bottom: 2rem;
  }

  .version {
    font-size: 0.75rem;
    color: var(--parchment-dim);
    opacity: 0.5;
  }
</style>
