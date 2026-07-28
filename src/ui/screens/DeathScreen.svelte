<script lang="ts">
  import { onMount } from 'svelte';
  import { setScreen, gameState, clearPendingAction } from '../../lib/state.svelte';
  import { getZoneById } from '../../game/map/islandData';
  import { getRandomEncounter } from '../../game/enemies/encounterData';
  import { createAndRegisterOrchestrator, getCurrentOrchestrator } from '../../game/bridge';
  import { ZoneType } from '../../game/map/IslandTypes';

  let animPhase: 'fadeIn' | 'fadeToBlack' | 'showText' | 'complete' = $state('fadeIn');
  let showContent = $state(false);

  const currentZoneDef = $derived(getZoneById(gameState.map.currentZone));

  onMount(() => {
    // Stage 1: Fade in (brief)
    const t1 = setTimeout(() => { animPhase = 'fadeToBlack'; }, 500);
    // Stage 2: Fade to black
    const t2 = setTimeout(() => { animPhase = 'showText'; }, 1200);
    // Stage 3: Show defeat text
    const t3 = setTimeout(() => {
      animPhase = 'complete';
      showContent = true;
    }, 2000);
    return () => { [t1, t2, t3].forEach(clearTimeout); };
  });

  function returnToMap() {
    setScreen('map');
  }

  function retryBattle() {
    const zone = currentZoneDef;
    if (!zone) {
      // Fallback: go to map if zone not found
      setScreen('map');
      return;
    }

    const encounterType = zone.isBossZone ? 'boss' : 'combat';
    const encounter = getRandomEncounter(encounterType, gameState.run.act);
    if (!encounter) {
      console.error(`No encounter found for zone "${zone.id}".`);
      setScreen('map');
      return;
    }

    // Clean up any previous combat orchestrator
    const old = getCurrentOrchestrator();
    if (old) old.destroy();

    createAndRegisterOrchestrator(
      gameState.run,
      encounter.enemies,
      encounter.id,
      encounter.rewardGold,
      encounter.rewardCards || [],
    );
    clearPendingAction();
    setScreen('battle');
  }
</script>

<div class="death-screen">
  <!-- Screen dimming overlay that becomes full black -->
  <div class="death-overlay" class:full-black={animPhase === 'fadeToBlack' || animPhase === 'showText' || animPhase === 'complete'}></div>

  <!-- "Defeated" text that fades in over black -->
  {#if animPhase === 'showText' || animPhase === 'complete'}
    <div class="death-text-group">
      <div class="death-skull"></div>
      <h1 class="death-title">DEFEATED</h1>
      <p class="death-subtitle">The depths pushed back. Regroup and try again.</p>
    </div>
  {/if}

  <!-- Content panel — shows current state, not a wipe -->
  {#if showContent}
    <div class="death-panel">
      <div class="death-stats">
        <div class="stat-row">
          <span class="stat-label">HP Remaining</span>
          <span class="stat-value">{gameState.run.heroHp} / {gameState.run.heroMaxHp}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Gold</span>
          <span class="stat-value">{gameState.run.gold}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Deck Size</span>
          <span class="stat-value">{gameState.run.deck.length}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Current Zone</span>
          <span class="stat-value">{currentZoneDef?.name ?? '--'}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Zones Cleared</span>
          <span class="stat-value">{gameState.map.completedZones.length}</span>
        </div>
      </div>
      <p class="death-hint">Your gold, deck, and progress remain intact.</p>
      <div class="death-actions">
        <button class="btn btn-primary" onclick={returnToMap}>Return to Map</button>
        <button class="btn btn-secondary" onclick={retryBattle}>Retry Battle</button>
      </div>
    </div>
  {/if}
</div>

<style>
  .death-screen {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
  }

  .death-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0);
    transition: background 1.5s ease;
    z-index: 1;
  }

  .death-overlay.full-black {
    background: rgba(0, 0, 0, 1);
  }

  .death-text-group {
    position: relative;
    z-index: 5;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    animation: text-fade-in 1s ease-out both;
  }

  @keyframes text-fade-in {
    0% { opacity: 0; transform: scale(0.8); }
    100% { opacity: 1; transform: scale(1); }
  }

  .death-skull {
    width: 48px;
    height: 48px;
    border: 3px solid var(--coral);
    border-radius: 50%;
    position: relative;
    box-shadow: 0 0 30px rgba(232, 93, 78, 0.3);
  }

  .death-skull::before,
  .death-skull::after {
    content: '';
    position: absolute;
    width: 8px;
    height: 8px;
    background: var(--coral);
    border-radius: 50%;
    top: 14px;
  }

  .death-skull::before { left: 12px; }
  .death-skull::after { right: 12px; }

  .death-title {
    font-size: 2.5rem;
    font-weight: 900;
    letter-spacing: 0.15em;
    color: var(--coral);
    text-shadow: 0 0 30px rgba(232, 93, 78, 0.3);
    margin: 0;
  }

  .death-subtitle {
    font-size: 1rem;
    color: var(--parchment-dim);
    text-align: center;
    margin: 0;
    letter-spacing: 0.05em;
  }

  /* ── Content panel ── */
  .death-panel {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 1.5rem 2.5rem;
    background: var(--panel-bg);
    border: 1px solid rgba(232, 93, 78, 0.3);
    border-radius: 8px;
    max-width: 400px;
    width: 90%;
    z-index: 10;
    margin-top: 2rem;
    animation: panel-slide-up 0.5s ease-out both;
  }

  @keyframes panel-slide-up {
    0% { opacity: 0; transform: translateY(40px); }
    100% { opacity: 1; transform: translateY(0); }
  }

  .death-stats {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    padding: 0.75rem 0;
    border-top: 1px solid var(--panel-border);
    border-bottom: 1px solid var(--panel-border);
  }

  .stat-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.85rem;
  }

  .stat-label { color: var(--parchment-dim); }
  .stat-value { color: var(--parchment); font-weight: 700; }

  .death-hint {
    font-size: 0.75rem;
    color: var(--parchment-dim);
    text-align: center;
    margin: 0;
    font-style: italic;
    opacity: 0.7;
  }

  .death-actions {
    display: flex;
    gap: 0.75rem;
    width: 100%;
  }

  .btn {
    flex: 1;
    padding: 0.8rem 1rem;
    border: none;
    font-size: 0.85rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.2s ease;
    text-transform: uppercase;
  }

  .btn-primary {
    background: var(--coral);
    color: var(--parchment);
  }

  .btn-primary:hover {
    background: var(--coral-light);
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(232, 93, 78, 0.3);
  }

  .btn-secondary {
    background: var(--shallow);
    color: var(--parchment);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .btn-secondary:hover {
    background: var(--ink-light);
    transform: translateY(-2px);
  }

  @media (prefers-reduced-motion: reduce) {
    .death-overlay { transition: none; }
    .death-text-group, .death-panel { animation: none; }
  }
</style>
