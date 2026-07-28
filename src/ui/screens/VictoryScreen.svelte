<script lang="ts">
  import { onMount } from 'svelte';
  import { setScreen, resetGame, gameState } from '../../lib/state.svelte';

  let animPhase: 'entering' | 'explosion' | 'heroPose' | 'goldPop' | 'complete' = $state('entering');
  let showContent = $state(false);

  onMount(() => {
    // Stage 1: Brief pause
    const t1 = setTimeout(() => { animPhase = 'explosion'; }, 300);
    // Stage 2: Hero victory pose
    const t2 = setTimeout(() => { animPhase = 'heroPose'; }, 800);
    // Stage 3: Gold counter pop
    const t3 = setTimeout(() => { animPhase = 'goldPop'; }, 1400);
    // Stage 4: Show full content
    const t4 = setTimeout(() => {
      animPhase = 'complete';
      showContent = true;
    }, 2000);
    return () => { [t1, t2, t3, t4].forEach(clearTimeout); };
  });

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
  <!-- Background explosion animation -->
  {#if animPhase === 'explosion' || animPhase === 'heroPose'}
    <div class="explosion-burst">
      <div class="burst-ring"></div>
      <div class="burst-ring ring-2"></div>
      <div class="burst-ring ring-3"></div>
    </div>
  {/if}

  <!-- Hero victory pose silhouette -->
  {#if animPhase === 'heroPose' || animPhase === 'goldPop' || animPhase === 'complete'}
    <div class="hero-silhouette">
      <div class="hero-fish">
        <div class="fish-body"></div>
        <div class="fish-tail"></div>
        <div class="fish-fin"></div>
      </div>
      <div class="hero-shadow"></div>
    </div>
  {/if}

  <!-- Gold coin pop -->
  {#if animPhase === 'goldPop' || animPhase === 'complete'}
    <div class="gold-rain">
      {#each Array(8) as _, i}
        <div class="coin-particle" style="--angle: {i * 45}deg; --delay: {i * 0.1}s"></div>
      {/each}
    </div>
  {/if}

  <!-- Main content panel -->
  {#if showContent}
    <div class="victory-panel">
      <h1 class="victory-title">DEBT PAID IN FULL</h1>
      <p class="victory-subtitle">The leviathan falls. You are free.</p>
      <div class="victory-stats">
        <div class="stat-row">
          <span class="stat-label">Total Turns</span>
          <span class="stat-value">{gameState.combat.turnNumber || '--'}</span>
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
  {/if}
</div>

<style>
  .victory-screen {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: var(--abyss);
    position: relative;
    overflow: hidden;
  }

  /* ── Explosion burst rings ── */
  .explosion-burst {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .burst-ring {
    position: absolute;
    width: 100px;
    height: 100px;
    border-radius: 50%;
    border: 4px solid rgba(244, 196, 48, 0.6);
    animation: ring-expand 0.8s ease-out forwards;
  }

  .ring-2 {
    animation-delay: 0.15s;
    width: 80px;
    height: 80px;
    border-color: rgba(244, 196, 48, 0.4);
  }

  .ring-3 {
    animation-delay: 0.3s;
    width: 60px;
    height: 60px;
    border-color: rgba(244, 196, 48, 0.2);
  }

  @keyframes ring-expand {
    0% { transform: scale(0.5); opacity: 1; }
    100% { transform: scale(8); opacity: 0; }
  }

  /* ── Hero silhouette ── */
  .hero-silhouette {
    position: absolute;
    bottom: 15%;
    display: flex;
    flex-direction: column;
    align-items: center;
    animation: hero-rise 0.6s ease-out both;
  }

  @keyframes hero-rise {
    0% { opacity: 0; transform: translateY(30px); }
    100% { opacity: 1; transform: translateY(0); }
  }

  .hero-fish {
    position: relative;
    animation: fish-swim 2s ease-in-out infinite;
  }

  @keyframes fish-swim {
    0%, 100% { transform: translateY(0) rotate(-2deg); }
    50% { transform: translateY(-6px) rotate(2deg); }
  }

  .fish-body {
    width: 60px;
    height: 30px;
    background: linear-gradient(135deg, var(--coral-light) 0%, var(--coral) 100%);
    border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
    position: relative;
    box-shadow: 0 0 20px rgba(232, 93, 78, 0.4);
  }

  .fish-body::after {
    content: '';
    position: absolute;
    right: 8px;
    top: 8px;
    width: 8px;
    height: 8px;
    background: white;
    border-radius: 50%;
    box-shadow: 0 0 4px rgba(255, 255, 255, 0.8);
  }

  .fish-tail {
    position: absolute;
    right: -24px;
    top: 5px;
    width: 0;
    height: 0;
    border-style: solid;
    border-width: 12px 0 12px 24px;
    border-color: transparent transparent transparent var(--coral);
    filter: drop-shadow(0 0 8px rgba(232, 93, 78, 0.3));
  }

  .fish-fin {
    position: absolute;
    top: -14px;
    left: 14px;
    width: 0;
    height: 0;
    border-style: solid;
    border-width: 0 8px 14px 8px;
    border-color: transparent transparent var(--coral-light) transparent;
    transform: rotate(-10deg);
  }

  .hero-shadow {
    width: 80px;
    height: 12px;
    background: radial-gradient(ellipse, rgba(0, 0, 0, 0.4) 0%, transparent 70%);
    border-radius: 50%;
    margin-top: -4px;
    animation: shadow-pulse 2s ease-in-out infinite;
  }

  @keyframes shadow-pulse {
    0%, 100% { transform: scale(1); opacity: 0.4; }
    50% { transform: scale(0.9); opacity: 0.2; }
  }

  /* ── Gold rain particles ── */
  .gold-rain {
    position: absolute;
    top: 30%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .coin-particle {
    position: absolute;
    width: 12px;
    height: 12px;
    background: var(--gold);
    border-radius: 50%;
    box-shadow: 0 0 6px rgba(244, 196, 48, 0.6);
    animation: coin-burst 1s ease-out var(--delay) both;
  }

  @keyframes coin-burst {
    0% { transform: translate(0, 0) scale(0); opacity: 1; }
    50% { opacity: 1; }
    100% { transform: translate(calc(cos(var(--angle)) * 100px), calc(sin(var(--angle)) * 100px)) scale(0.3); opacity: 0; }
  }

  /* ── Content panel ── */
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
    z-index: 10;
    animation: panel-slide-up 0.5s ease-out both;
  }

  @keyframes panel-slide-up {
    0% { opacity: 0; transform: translateY(40px); }
    100% { opacity: 1; transform: translateY(0); }
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

  .stat-label { color: var(--parchment-dim); }
  .stat-value { color: var(--parchment); font-weight: 700; }

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

  @media (prefers-reduced-motion: reduce) {
    .burst-ring, .hero-silhouette, .coin-particle, .victory-panel {
      animation: none;
    }
    .hero-fish { animation: none; }
    .hero-shadow { animation: none; }
  }
</style>
