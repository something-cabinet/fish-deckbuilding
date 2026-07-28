<script lang="ts">
  import { gameState, setScreen, clearPendingAction, refreshUnlockedZones, setPendingAction } from '../../lib/state.svelte';
  import { getZoneById, ISLAND_ZONES } from '../../game/map/islandData';
  import { getRandomEncounter, getEncounter } from '../../game/enemies/encounterData';
  import { createAndRegisterOrchestrator, getCurrentOrchestrator } from '../../game/bridge';
  import { ZoneType } from '../../game/map/IslandTypes';
  import type { ZoneDefinition } from '../../game/map/IslandTypes';

  // ── Derived ──

  const currentZoneDef = $derived<ZoneDefinition | undefined>(
    getZoneById(gameState.map.currentZone),
  );

  const pendingAction = $derived(gameState.map.pendingAction);

  const completedCount = $derived(gameState.map.completedZones.length);
  const totalZones = $derived(ISLAND_ZONES.length);

  // M6: Re-arm battle prompt when entering screen — check if current zone is uncompleted combat/boss
  $effect(() => {
    const zone = currentZoneDef;
    if (!zone) return;
    const isCombatZone = zone.type === ZoneType.Combat || zone.type === ZoneType.Boss;
    const isUncompleted = !gameState.map.completedZones.includes(zone.id);
    const noPendingAction = !pendingAction;
    if (isCombatZone && isUncompleted && noPendingAction) {
      setPendingAction({ type: 'battle', zoneId: zone.id, zoneName: zone.name });
    }
  });

  // ── Actions ──

  function confirmBattle() {
    if (!pendingAction || pendingAction.type !== 'battle') return;
    const action = pendingAction;
    clearPendingAction();

    // Find enemies for this zone
    const zone = getZoneById(action.zoneId);
    if (!zone) return;

    // Use zone-specific enemyPool for encounter selection
    let encounter;
    if (zone.enemyPool && zone.enemyPool.length > 0) {
      const poolId = zone.enemyPool[Math.floor(Math.random() * zone.enemyPool.length)];
      encounter = getEncounter(poolId);
    } else {
      const encounterType = zone.isBossZone ? 'boss' : 'combat';
      encounter = getRandomEncounter(encounterType, gameState.run.act);
    }
    if (!encounter) {
      console.error(`No encounter found for zone "${zone.id}".`);
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
    setScreen('battle');
  }

  function handleEvent() {
    if (!pendingAction || pendingAction.type !== 'event') return;
    clearPendingAction();
    // For now, just mark completed and return to map
    // Future: show event dialog
    console.log('Event zone entered — no event UI yet.');
  }

  function dismissZone() {
    clearPendingAction();
  }

  function handleRestartNewGame() {
    // Navigate away from map — for now, go back to menu
    setScreen('menu');
  }

  // ── Zone type aesthetic helpers ──

  function zoneTypeLabel(type: ZoneType): string {
    switch (type) {
      case ZoneType.Town: return 'Town';
      case ZoneType.Combat: return 'Combat';
      case ZoneType.Boss: return 'Boss';
      case ZoneType.Shop: return 'Shop';
      case ZoneType.Rest: return 'Rest';
      case ZoneType.Event: return 'Event';
    }
  }

  function zoneTypeColor(type: ZoneType): string {
    switch (type) {
      case ZoneType.Town: return 'var(--unit-blue)';
      case ZoneType.Combat: return 'var(--coral)';
      case ZoneType.Boss: return 'var(--hp-enemy)';
      case ZoneType.Shop: return 'var(--gold)';
      case ZoneType.Rest: return 'var(--stat-def)';
      case ZoneType.Event: return 'var(--stat-purple)';
    }
  }
</script>

<div class="map-overlay">
  <!-- Top bar HUD -->
  <header class="hud-bar">
    <div class="hud-left">
      <span class="chapter-badge">ACT {gameState.run.act}</span>
      <span class="zone-progress">{completedCount}/{totalZones}</span>
    </div>
    <div class="hud-center">
      <h1 class="map-title">ISLAND MAP</h1>
    </div>
    <div class="hud-right">
      <span class="hp-stat">
        <span class="stat-icon">&#9829;</span>
        {gameState.run.heroHp}/{gameState.run.heroMaxHp}
      </span>
      <span class="gold-stat">
        <span class="stat-icon">&#9679;</span>
        {gameState.run.gold}
      </span>
      <button class="menu-btn" onclick={handleRestartNewGame} title="Back to menu">
        &#9881;
      </button>
    </div>
  </header>

  <!-- Zone info panel (bottom-left when a zone is selected) -->
  {#if currentZoneDef}
    <div class="zone-panel">
      <div class="zone-header">
        <span
          class="zone-type-badge"
          style="background: {zoneTypeColor(currentZoneDef.type)}"
        >
          {zoneTypeLabel(currentZoneDef.type)}
        </span>
        <h2 class="zone-name">{currentZoneDef.name}</h2>
      </div>
      <p class="zone-desc">{currentZoneDef.description}</p>
      <div class="zone-meta">
        <span class="meta-item">
          Unlocked: {gameState.map.unlockedZones.includes(currentZoneDef.id) ? 'Yes' : 'No'}
        </span>
        <span class="meta-item">
          Cleared: {gameState.map.completedZones.includes(currentZoneDef.id) ? 'Yes' : 'No'}
        </span>
      </div>
    </div>
  {/if}

  <!-- Legend -->
  <div class="legend">
    <span class="legend-item">
      <span class="legend-dot dot-town"></span> Town
    </span>
    <span class="legend-item">
      <span class="legend-dot dot-combat"></span> Combat
    </span>
    <span class="legend-item">
      <span class="legend-dot dot-boss"></span> Boss
    </span>
    <span class="legend-item">
      <span class="legend-dot dot-shop"></span> Shop
    </span>
    <span class="legend-item">
      <span class="legend-dot dot-rest"></span> Rest
    </span>
    <span class="legend-item">
      <span class="legend-dot dot-event"></span> Event
    </span>
  </div>

  <!-- Battle confirmation prompt -->
  {#if pendingAction?.type === 'battle'}
    <div class="prompt-overlay" onclick={dismissZone}>
      <div class="prompt-card" onclick={(e) => e.stopPropagation()}>
        <h3 class="prompt-title">Enter Battle?</h3>
        <p class="prompt-desc">{pendingAction.zoneName}</p>
        <p class="prompt-hint">Prepare your deck — this fight awaits.</p>
        <div class="prompt-actions">
          <button class="btn btn-primary" onclick={confirmBattle}>Fight!</button>
          <button class="btn btn-secondary" onclick={() => { clearPendingAction(); setScreen('deck'); }}>Deck</button>
          <button class="btn btn-secondary" onclick={dismissZone}>Not Yet</button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Event prompt (placeholder) -->
  {#if pendingAction?.type === 'event'}
    <div class="prompt-overlay" onclick={dismissZone}>
      <div class="prompt-card" onclick={(e) => e.stopPropagation()}>
        <h3 class="prompt-title">Event Zone</h3>
        <p class="prompt-desc">{pendingAction.zoneName}</p>
        <p class="prompt-hint">Something mysterious awaits... (coming soon)</p>
        <div class="prompt-actions">
          <button class="btn btn-primary" onclick={handleEvent}>Proceed</button>
          <button class="btn btn-secondary" onclick={dismissZone}>Leave</button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .map-overlay {
    width: 100%;
    height: 100%;
    position: relative;
    /* !important needed: App.svelte's ".ui-overlay > *" rule ties this selector's
       specificity and wins the cascade order tiebreak, forcing auto otherwise —
       which would make this full-screen wrapper swallow every canvas click. */
    pointer-events: none !important;
  }

  .map-overlay > * {
    pointer-events: auto; /* interactive elements catch clicks */
  }

  /* ── HUD bar ── */
  .hud-bar {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.6rem 1.2rem;
    background: rgba(10, 22, 40, 0.85);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    z-index: 20;
  }

  .hud-left,
  .hud-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .chapter-badge {
    background: var(--gold-dark);
    color: var(--parchment);
    font-size: 0.65rem;
    font-weight: 800;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    letter-spacing: 0.08em;
  }

  .zone-progress {
    font-size: 0.7rem;
    color: var(--parchment-dim);
    font-weight: 600;
  }

  .map-title {
    font-size: 0.9rem;
    font-weight: 700;
    letter-spacing: 0.2em;
    color: var(--gold);
    margin: 0;
  }

  .stat-icon {
    font-size: 0.8rem;
    margin-right: 0.15rem;
  }

  .hp-stat {
    color: var(--hp-bar);
    font-size: 0.8rem;
    font-weight: 700;
  }

  .gold-stat {
    color: var(--gold);
    font-size: 0.8rem;
    font-weight: 700;
  }

  .menu-btn {
    background: none;
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: var(--parchment-dim);
    font-size: 1rem;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s;
  }

  .menu-btn:hover {
    color: var(--parchment);
    border-color: var(--parchment-dim);
  }

  /* ── Zone info panel ── */
  .zone-panel {
    position: absolute;
    bottom: 5rem;
    left: 1.2rem;
    background: rgba(10, 22, 40, 0.88);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 0.8rem 1rem;
    max-width: 260px;
    z-index: 15;
  }

  .zone-header {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin-bottom: 0.35rem;
  }

  .zone-type-badge {
    font-size: 0.55rem;
    font-weight: 800;
    padding: 0.15rem 0.45rem;
    border-radius: 3px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: white;
  }

  .zone-name {
    font-size: 1rem;
    font-weight: 700;
    color: var(--parchment);
    margin: 0;
  }

  .zone-desc {
    font-size: 0.7rem;
    color: var(--parchment-dim);
    line-height: 1.3;
    margin: 0 0 0.4rem 0;
  }

  .zone-meta {
    display: flex;
    gap: 0.75rem;
    font-size: 0.6rem;
    color: var(--parchment-dim);
  }

  /* ── Legend ── */
  .legend {
    position: absolute;
    bottom: 1rem;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 0.6rem;
    padding: 0.4rem 0.8rem;
    background: rgba(10, 22, 40, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 6px;
    z-index: 15;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.6rem;
    color: var(--parchment-dim);
    font-weight: 600;
  }

  .legend-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 2px;
  }

  .dot-town { background: var(--unit-blue); border-radius: 50%; }
  .dot-combat { background: var(--coral); transform: rotate(45deg); width: 7px; height: 7px; }
  .dot-boss { background: var(--hp-enemy); clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%); }
  .dot-shop { background: var(--gold); }
  .dot-rest { background: var(--stat-def); border-radius: 50%; }
  .dot-event { background: var(--stat-purple); clip-path: polygon(50% 0%, 0% 100%, 100% 100%); }

  /* ── Prompt overlay ── */
  .prompt-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.55);
    z-index: 30;
  }

  .prompt-card {
    background: var(--panel-bg);
    border: 1px solid var(--panel-border);
    border-radius: 10px;
    padding: 1.5rem 2rem;
    text-align: center;
    max-width: 320px;
  }

  .prompt-title {
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--parchment);
    margin: 0 0 0.25rem 0;
  }

  .prompt-desc {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--gold);
    margin: 0 0 0.4rem 0;
  }

  .prompt-hint {
    font-size: 0.75rem;
    color: var(--parchment-dim);
    margin: 0 0 1rem 0;
  }

  .prompt-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: center;
  }

  .btn {
    padding: 0.5rem 1.2rem;
    border-radius: 6px;
    font-size: 0.8rem;
    font-weight: 700;
    cursor: pointer;
    border: none;
    transition: all 0.15s;
  }

  .btn-primary {
    background: var(--coral);
    color: white;
  }

  .btn-primary:hover {
    background: var(--coral-light);
    transform: scale(1.05);
  }

  .btn-secondary {
    background: var(--shallow);
    color: var(--parchment);
  }

  .btn-secondary:hover {
    background: var(--ink-light);
  }
</style>
