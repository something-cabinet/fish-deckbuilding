<script lang="ts">
  import { gameState, setScreen, resetGame, startDialogue } from '../../lib/state.svelte';
  import { getStarterDeck } from '../../game/cards/cardData';
  import { loadGame, loadGameState } from '../../lib/persistence';

  let hasSave = $derived(
    loadGame(1) !== null ||
    gameState.run.act > 1 ||
    gameState.run.gold > 0 ||
    gameState.run.deck.length > getStarterDeck().length
  );

  function startGame() {
    resetGame();
    startDialogue('chapter_1_intro');
  }

  function continueGame() {
    // Prefer loading from save if available (restores state after refresh)
    const saved = loadGameState(1);
    if (saved) {
      Object.assign(gameState.run, saved.run);
      Object.assign(gameState.map, saved.map);
    }
    setScreen('map');
  }

  function openSettings() {
    setScreen('settings');
  }

  function openSaveLoad() {
    setScreen('save');
  }
</script>

<div class="main-menu">
  <div class="ocean-bg">
    <div class="wave wave-1"></div>
    <div class="wave wave-2"></div>
    <div class="wave wave-3"></div>
    <div class="bubbles">
      {#each Array(12) as _, i}
        <div class="bubble" style="left: {Math.random() * 100}%; animation-delay: {Math.random() * 6}s; animation-duration: {4 + Math.random() * 4}s;"></div>
      {/each}
    </div>
  </div>

  <div class="menu-content">
    <div class="title-block">
      <div class="title-deco top"></div>
      <div class="logo-row">
        <img src="/sprites/hero/guppy-idle.svg" alt="Guppy" class="guppy-deco left" />
        <div class="title-text">
          <h1 class="game-title">FISH DEBT</h1>
          <p class="subtitle">TACTICAL RPG</p>
        </div>
        <img src="/sprites/hero/guppy-idle.svg" alt="Guppy" class="guppy-deco right" />
      </div>
      <div class="title-deco bottom"></div>
      <div class="mana-crystals">
        {#each Array(5) as _, i}
          <img
            src="/sprites/ui/mana-crystal.svg"
            alt=""
            class="crystal"
            style="animation-delay: {i * 0.3}s"
          />
        {/each}
      </div>
    </div>

    <div class="menu-actions">
      <button class="menu-btn primary" onclick={startGame}>NEW GAME</button>
      <button class="menu-btn" onclick={continueGame} disabled={!hasSave}>
        CONTINUE
      </button>
      <button class="menu-btn" onclick={openSaveLoad}>
        SAVE / LOAD
      </button>
      <button class="menu-btn" onclick={openSettings}>SETTINGS</button>
    </div>

    <div class="menu-footer">
      <p class="version">v0.2.0 — Tactical Build</p>
    </div>
  </div>
</div>

<style>
  .main-menu {
    position: fixed;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: var(--abyss);
    overflow: hidden;
    z-index: 100;
  }

  .ocean-bg {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, var(--abyss) 0%, var(--deep) 40%, var(--shallow) 100%);
    opacity: 0.6;
  }

  .wave {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 200%;
    height: 100px;
    background: repeating-linear-gradient(
      90deg,
      transparent,
      transparent 50px,
      rgba(26, 58, 92, 0.3) 50px,
      rgba(26, 58, 92, 0.3) 100px
    );
    animation: wave-scroll 8s linear infinite;
    opacity: 0.4;
  }

  .wave-2 {
    animation-duration: 12s;
    animation-delay: -2s;
    opacity: 0.2;
    height: 80px;
  }

  .wave-3 {
    animation-duration: 16s;
    animation-delay: -4s;
    opacity: 0.15;
    height: 60px;
  }

  @keyframes wave-scroll {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }

  .bubbles {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .bubble {
    position: absolute;
    bottom: -20px;
    width: 8px;
    height: 8px;
    background: rgba(232, 220, 197, 0.2);
    border-radius: 50%;
    animation: bubble-rise linear infinite;
  }

  @keyframes bubble-rise {
    0% { transform: translateY(0) scale(1); opacity: 0; }
    10% { opacity: 0.6; }
    90% { opacity: 0.3; }
    100% { transform: translateY(-100vh) scale(0.5); opacity: 0; }
  }

  .menu-content {
    position: relative;
    z-index: 10;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2.5rem;
    animation: menu-enter 0.8s ease-out both;
  }

  @keyframes menu-enter {
    0% { opacity: 0; transform: translateY(30px); }
    100% { opacity: 1; transform: translateY(0); }
  }

  .title-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    animation: title-slide 0.6s ease-out 0.2s both;
  }

  @keyframes title-slide {
    0% { opacity: 0; transform: translateY(-20px); }
    100% { opacity: 1; transform: translateY(0); }
  }

  .logo-row {
    display: flex;
    align-items: center;
    gap: 1.5rem;
  }

  .guppy-deco {
    width: 48px;
    height: 48px;
    opacity: 0.8;
    animation: guppy-float 3s ease-in-out infinite;
  }

  .guppy-deco.right {
    animation-delay: 1.5s;
  }

  @keyframes guppy-float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }

  .title-text {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .game-title {
    font-family: 'Press Start 2P', monospace;
    font-size: 2.8rem;
    font-weight: 400;
    letter-spacing: 0.1em;
    color: var(--gold);
    text-shadow:
      0 0 20px rgba(244, 196, 48, 0.4),
      0 4px 8px rgba(0, 0, 0, 0.5);
    margin: 0;
    line-height: 1.3;
  }

  .subtitle {
    font-family: 'VT323', monospace;
    font-size: 1.5rem;
    color: var(--parchment-dim);
    letter-spacing: 0.3em;
    text-transform: uppercase;
    margin: 0.5rem 0 0;
  }

  .title-deco {
    width: 160px;
    height: 3px;
    background: var(--coral);
    border-radius: 2px;
    box-shadow: 0 0 8px rgba(232, 93, 78, 0.4);
  }

  .title-deco.top {
    margin-bottom: 0.5rem;
    opacity: 0.7;
  }

  .title-deco.bottom {
    margin-top: 0.5rem;
    opacity: 0.7;
  }

  .mana-crystals {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .crystal {
    width: 20px;
    height: 20px;
    animation: crystal-pulse 2s ease-in-out infinite;
    opacity: 0.7;
  }

  @keyframes crystal-pulse {
    0%, 100% { opacity: 0.4; transform: scale(1); }
    50% { opacity: 0.9; transform: scale(1.15); }
  }

  .menu-actions {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 280px;
    animation: buttons-stagger 0.5s ease-out 0.5s both;
  }

  @keyframes buttons-stagger {
    0% { opacity: 0; transform: translateY(20px); }
    100% { opacity: 1; transform: translateY(0); }
  }

  .menu-btn {
    padding: 1rem 2rem;
    background: var(--shallow);
    border: 2px solid var(--panel-border);
    color: var(--parchment);
    font-family: 'VT323', monospace;
    font-size: 1.3rem;
    font-weight: 700;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    cursor: pointer;
    border-radius: 6px;
    transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
    position: relative;
    overflow: hidden;
  }

  .menu-btn::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
    transform: translateX(-100%);
    transition: transform 0.4s ease;
  }

  .menu-btn:hover::before {
    transform: translateX(100%);
  }

  .menu-btn:hover {
    background: var(--coral);
    border-color: var(--coral-light);
    transform: translateY(-3px);
    box-shadow: 0 8px 24px rgba(232, 93, 78, 0.35);
  }

  .menu-btn:active {
    transform: translateY(-1px) scale(0.98);
  }

  .menu-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    pointer-events: none;
  }

  .menu-btn.primary {
    background: var(--coral);
    border-color: var(--coral-dark);
    box-shadow: 0 4px 20px rgba(232, 93, 78, 0.3);
  }

  .menu-btn.primary:hover {
    background: var(--coral-light);
    box-shadow: 0 8px 28px rgba(232, 93, 78, 0.45);
  }

  .menu-footer {
    animation: fade-in 0.5s ease-out 0.8s both;
  }

  @keyframes fade-in {
    0% { opacity: 0; }
    100% { opacity: 1; }
  }

  .version {
    font-family: 'VT323', monospace;
    font-size: 0.9rem;
    color: var(--parchment-dim);
    opacity: 0.5;
    letter-spacing: 0.1em;
  }

  @media (prefers-reduced-motion: reduce) {
    .menu-content,
    .title-block,
    .menu-actions,
    .menu-footer,
    .guppy-deco,
    .crystal,
    .wave,
    .bubble {
      animation: none;
      transition: none;
    }
  }

  @media (max-width: 640px) {
    .game-title {
      font-size: 1.8rem;
    }
    .subtitle {
      font-size: 1.1rem;
    }
    .guppy-deco {
      width: 32px;
      height: 32px;
    }
    .menu-actions {
      width: 240px;
    }
    .menu-btn {
      font-size: 1.1rem;
      padding: 0.8rem 1.5rem;
    }
  }
</style>
