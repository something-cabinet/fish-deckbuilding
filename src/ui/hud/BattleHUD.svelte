<script lang="ts">
  import { gameState } from '../../lib/state.svelte';
  import { getCurrentOrchestrator } from '../../game/bridge';
  import { CardType } from '../../game/combat/CardTypes';
  import { getValidTargets } from '../../game/combat/CombatEngine';
  import type { CombatState, CombatCard } from '../../game/combat/CardTypes';
  import type { GridPosition } from '../../game/grid/GridTypes';
  import { getCard } from '../../game/cards/cardData';
  import GridTile from '../battle/GridTile.svelte';
  import HandViewer from '../battle/HandViewer.svelte';
  import CardTooltip from '../battle/CardTooltip.svelte';
  import CombatFeedbackZone from '../battle/zones/combat-feedback/CombatFeedbackZone.svelte';

  const GRID_COLS = 9;
  const GRID_ROWS = 5;

  // ── Reactive state ──

  let combat = $derived(gameState.combat);
  let tiles: Array<Array<{ type: string; occupiedBy: string | null }>> = $derived((combat as any).tiles ?? []);
  let unitPositions: Record<string, { x: number; y: number; type: string; faction: string; isAlive: boolean }> = $derived((combat as any).unitPositions ?? {});
  let movementRangeArr: string[] = $derived((combat as any).movementRange ?? []);
  let attackRangeArr: string[] = $derived((combat as any).attackRange ?? []);
  let turnPhase = $derived(combat.turnPhase);
  let hand = $derived(combat.hand);
  let mana = $derived(combat.mana ?? 0);
  let heroHp = $derived(combat.heroHp ?? 0);
  let heroMaxHp = $derived(combat.heroMaxHp ?? 0);
  let canReplaceVal = $derived((combat as any).canReplace ?? false);
  let heroHasMovedVal = $derived((combat as any).heroHasMoved ?? false);
  let heroHasAttackedVal = $derived((combat as any).heroHasAttacked ?? false);
  let enemyPositions: Array<any> = $derived((combat as any).enemyPositions ?? []);

  // ── Interaction state ──

  let selectedCardIndex: number | null = $state(null);
  let selectedCardInstanceId: string | null = $state(null);
  let targetPositions: GridPosition[] = $state([]);
  let hoveredCardInstanceId = $state<string | null>(null);
  let mousePos = $state({ x: 0, y: 0 });
  let isPlayerAction = $derived(turnPhase === 'playerAction' || turnPhase === 'playerDraw');

  // ── Derived sets ──
  let targetingMode = $derived(selectedCardIndex !== null && targetPositions.length > 0 && isPlayerAction);
  let movementRangeSet = $derived(new Set(movementRangeArr));
  let attackRangeSet = $derived(new Set(attackRangeArr));
  let targetPosSet = $derived(new Set(targetPositions.map(p => `${p.x},${p.y}`)));

  // ── Compute target positions when card selection changes ──
  $effect(() => {
    if (selectedCardInstanceId && isPlayerAction) {
      targetPositions = computeTargets(selectedCardInstanceId);
    } else if (!isPlayerAction) {
      targetPositions = [];
      selectedCardIndex = null;
      selectedCardInstanceId = null;
    }
  });

  function computeTargets(cardInstanceId: string): GridPosition[] {
    const orch = getCurrentOrchestrator();
    if (!orch) return [];
    const state = (orch as any).state as CombatState | null;
    if (!state) return [];
    const card = state.hand.find((c: CombatCard) => c.instanceId === cardInstanceId);
    if (!card) return [];
    return getValidTargets(state, card);
  }

  // ── Interaction handlers ──

  function handleTileClick(x: number, y: number) {
    const key = `${x},${y}`;
    const orch = getCurrentOrchestrator();
    if (!orch) return;

    if (targetingMode && targetPosSet.has(key)) {
      const target = targetPositions.find(p => p.x === x && p.y === y);
      if (target) orch.playCardByIndex(selectedCardIndex!, target);
      cancelTargeting();
      return;
    }

    if (movementRangeSet.has(key) && !heroHasMovedVal) {
      orch.moveUnit('hero_unit_hero', { x, y });
      return;
    }

    if (attackRangeSet.has(key) && !heroHasAttackedVal) {
      const enemy = enemyPositions.find((e: any) => e.position?.x === x && e.position?.y === y);
      if (enemy) orch.baseAttack(enemy.id);
      return;
    }
  }

  function handleSelectCard(index: number) {
    const instanceId = hand[index];
    if (!instanceId) return;
    selectedCardIndex = index;
    selectedCardInstanceId = instanceId;

    const cardId = instanceId.split('_').slice(0, -1).join('_');
    const cardDef = getCard(cardId);
    if (!cardDef) {
      getCurrentOrchestrator()?.playCardByIndex(index);
      cancelTargeting();
      return;
    }

    if (cardDef.type === CardType.Attack || cardDef.type === CardType.Summon) {
      const targets = computeTargets(instanceId);
      targetPositions = targets;
      if (targets.length === 0) {
        getCurrentOrchestrator()?.playCardByIndex(index);
        cancelTargeting();
      }
    } else {
      getCurrentOrchestrator()?.playCardByIndex(index);
      cancelTargeting();
    }
  }

  function cancelTargeting() {
    selectedCardIndex = null;
    selectedCardInstanceId = null;
    targetPositions = [];
  }

  function handlePlayCard(cardIndex: number) {
    handleSelectCard(cardIndex);
  }

  function handleEndTurn() {
    getCurrentOrchestrator()?.endPlayerTurn();
    cancelTargeting();
  }

  function handleReplaceCard(index: number) {
    getCurrentOrchestrator()?.replaceCard(index);
  }

  function handleCardHover(cardInstanceId: string, event: MouseEvent) {
    hoveredCardInstanceId = cardInstanceId;
    mousePos = { x: event.clientX, y: event.clientY };
  }

  function handleCardLeave() {
    hoveredCardInstanceId = null;
  }

  // ── Tile helpers ──

  function getTileType(x: number, y: number): string | undefined {
    if (tiles[y] && tiles[y][x]) return tiles[y][x].type;
    return undefined;
  }

  function getOccupant(x: number, y: number): { id: string; type: string; faction: string; isAlive: boolean } | null {
    const entries = Object.entries(unitPositions);
    for (let i = 0; i < entries.length; i++) {
      const [id, unit] = entries[i] as [string, any];
      if (unit.x === x && unit.y === y && unit.isAlive) {
        return { id, type: unit.type, faction: unit.faction, isAlive: true };
      }
    }
    return null;
  }

  function getHighlight(x: number, y: number): 'movement' | 'attackable' | 'target' | undefined {
    const key = `${x},${y}`;
    if (targetPosSet.has(key)) return 'target';
    if (movementRangeSet.has(key)) return 'movement';
    if (attackRangeSet.has(key)) return 'attackable';
    return undefined;
  }

  function getEnemyHP(x: number, y: number): { current: number; max: number } | null {
    const enemy = enemyPositions.find((e: any) => e.position?.x === x && e.position?.y === y);
    if (enemy) return { current: enemy.hp, max: enemy.maxHp };
    return null;
  }
</script>

<div class="battle-layout">
  <!-- Top bar -->
  <div class="top-bar">
    <div class="hero-hp-section">
      <span class="hero-hp-label">HP</span>
      <div class="hero-hp-bar-bg">
        <div class="hero-hp-bar-fill" style="width: {(heroMaxHp > 0 ? (heroHp / heroMaxHp) * 100 : 100)}%"></div>
      </div>
      <span class="hero-hp-text">{heroHp}/{heroMaxHp}</span>
    </div>
    <div class="turn-info-section">
      <span class="turn-label">Turn {combat.turnNumber}</span>
      <span class="phase-label">{isPlayerAction ? 'YOUR TURN' : turnPhase.toUpperCase()}</span>
    </div>
    <div class="mana-section">
      <span class="mana-label">MANA</span>
      <div class="mana-crystals">
        {#each Array(Math.min(mana, 9)) as _, i}<span class="mana-crystal filled"></span>{/each}
        {#each Array(Math.max(0, 9 - Math.min(mana, 9))) as _, i}<span class="mana-crystal empty"></span>{/each}
      </div>
      <span class="mana-text">{mana}/9</span>
    </div>
  </div>

  <!-- Grid area -->
  <div class="grid-area">
    <div class="grid-container" style="--cols: {GRID_COLS}; --rows: {GRID_ROWS}">
      {#each Array(GRID_ROWS) as _, rowIdx}
        {#each Array(GRID_COLS) as _, colIdx}
          <div class="tile-wrapper">
            <GridTile x={colIdx} y={rowIdx} tileType={getTileType(colIdx, rowIdx)} occupiedBy={getOccupant(colIdx, rowIdx)} highlight={getHighlight(colIdx, rowIdx)} onclick={() => handleTileClick(colIdx, rowIdx)} />
            <div class="enemy-hp-mini">
              <div class="mini-hp-fill" style="width: {((getEnemyHP(colIdx, rowIdx)?.current ?? 0) / Math.max(1, getEnemyHP(colIdx, rowIdx)?.max ?? 1)) * 100}%"></div>
            </div>
          </div>
        {/each}
      {/each}
    </div>
    {#if targetingMode}
      <div class="targeting-hint">
        Click a highlighted tile to target
        <button class="cancel-btn" onclick={cancelTargeting}>CANCEL</button>
      </div>
    {/if}
  </div>

  <!-- Bottom area -->
  <div class="bottom-area">
    <div class="hand-section">
      <HandViewer
        onHover={handleCardHover}
        onLeave={handleCardLeave}
        onPlayCard={handlePlayCard}
        onSellCard={(_i: number) => {}}
        onBlockCard={undefined}
        selectedIndex={selectedCardIndex}
        onSelectCard={handleSelectCard}
        phase={isPlayerAction ? 'play' : 'defense'}
      />
    </div>
    <div class="action-bar">
      {#if targetingMode}
        <button class="action-btn cancel-btn" onclick={cancelTargeting}>CANCEL</button>
      {:else if isPlayerAction}
        <button class="action-btn replace-btn" disabled={!canReplaceVal} onclick={() => { if (selectedCardIndex !== null) handleReplaceCard(selectedCardIndex); }}>REPLACE</button>
        <button class="action-btn end-turn-btn" onclick={handleEndTurn}>END TURN</button>
      {:else}
        <span class="waiting-text">ENEMY TURN...</span>
      {/if}
    </div>
  </div>
</div>

{#if hoveredCardInstanceId}
  {@const resolvedId = hoveredCardInstanceId.split('_').slice(0, -1).join('_')}
  <div class="tooltip-wrapper" style="left: {mousePos.x + 16}px; top: {mousePos.y + 16}px;">
    <CardTooltip cardId={resolvedId} />
  </div>
{/if}

<CombatFeedbackZone />

<style>
  .battle-layout { display: flex; flex-direction: column; width: 100%; height: 100%; background: var(--abyss); overflow: hidden; }
  .top-bar { display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 1rem; background: var(--panel-bg); border-bottom: 1px solid var(--panel-border); gap: 1rem; flex-shrink: 0; }
  .hero-hp-section { display: flex; align-items: center; gap: 0.5rem; }
  .hero-hp-label { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.1em; color: var(--parchment-dim); }
  .hero-hp-bar-bg { width: 100px; height: 8px; background: rgba(0,0,0,0.3); border-radius: 4px; overflow: hidden; }
  .hero-hp-bar-fill { height: 100%; background: linear-gradient(90deg, var(--coral), var(--coral-light)); border-radius: 4px; transition: width 0.3s ease; }
  .hero-hp-text { font-size: 0.8rem; font-weight: 700; color: var(--parchment); font-family: 'VT323', monospace; }
  .turn-info-section { display: flex; flex-direction: column; align-items: center; gap: 0.15rem; }
  .turn-label { font-size: 0.65rem; font-weight: 700; color: var(--parchment-dim); letter-spacing: 0.1em; }
  .phase-label { font-size: 0.75rem; font-weight: 900; color: var(--gold); letter-spacing: 0.15em; animation: pulse-text 1.5s ease-in-out infinite; }
  @keyframes pulse-text { 0%,100%{opacity:0.6} 50%{opacity:1} }
  .mana-section { display: flex; align-items: center; gap: 0.5rem; }
  .mana-label { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.1em; color: var(--parchment-dim); }
  .mana-crystals { display: flex; gap: 3px; }
  .mana-crystal { width: 10px; height: 14px; border-radius: 2px; transition: all 0.2s ease; }
  .mana-crystal.filled { background: var(--unit-blue); box-shadow: 0 0 4px rgba(59,130,246,0.4); }
  .mana-crystal.empty { background: rgba(255,255,255,0.08); }
  .mana-text { font-size: 0.7rem; font-weight: 700; color: var(--unit-blue); font-family: 'VT323', monospace; }
  .grid-area { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 1rem; overflow: auto; }
  .grid-container { display: grid; grid-template-columns: repeat(var(--cols), 64px); grid-template-rows: repeat(var(--rows), 64px); gap: 1px; background: rgba(0,0,0,0.2); border: 2px solid rgba(255,255,255,0.06); border-radius: 4px; }
  .tile-wrapper { position: relative; width: 64px; height: 64px; }
  .enemy-hp-mini { position: absolute; bottom: 2px; left: 4px; right: 4px; height: 4px; background: rgba(0,0,0,0.4); border-radius: 2px; overflow: hidden; z-index: 5; pointer-events: none; }
  .mini-hp-fill { height: 100%; background: var(--coral); border-radius: 2px; transition: width 0.2s ease; }
  .targeting-hint { margin-top: 0.5rem; display: flex; align-items: center; gap: 0.75rem; padding: 0.4rem 1rem; background: rgba(244,196,48,0.1); border: 1px solid rgba(244,196,48,0.3); border-radius: 4px; font-size: 0.75rem; color: var(--gold); font-weight: 700; letter-spacing: 0.05em; }
  .cancel-btn { padding: 0.25rem 0.75rem; background: var(--shallow); border: 1px solid var(--panel-border); color: var(--parchment); font-size: 0.7rem; font-weight: 700; cursor: pointer; border-radius: 4px; letter-spacing: 0.05em; }
  .cancel-btn:hover { background: var(--coral); border-color: var(--coral); }
  .bottom-area { flex-shrink: 0; background: var(--panel-bg); border-top: 1px solid var(--panel-border); display: flex; flex-direction: column; }
  .hand-section { padding: 0.5rem 1rem; }
  .action-bar { display: flex; justify-content: center; gap: 1rem; padding: 0.5rem 1rem 0.75rem; }
  .action-btn { padding: 0.5rem 1.5rem; border: none; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.1em; cursor: pointer; border-radius: 4px; transition: all 0.15s ease; text-transform: uppercase; }
  .action-btn:disabled { opacity: 0.35; cursor: default; }
  .end-turn-btn { background: var(--coral); color: var(--parchment); }
  .end-turn-btn:hover:not(:disabled) { background: var(--coral-light); transform: translateY(-1px); }
  .replace-btn { background: var(--shallow); border: 1px solid var(--panel-border); color: var(--parchment-dim); }
  .replace-btn:hover:not(:disabled) { background: var(--deep); color: var(--parchment); border-color: var(--gold-dim); }
  .waiting-text { font-size: 0.8rem; font-weight: 700; color: var(--parchment-dim); letter-spacing: 0.15em; animation: pulse-text 1.5s ease-in-out infinite; }
  .tooltip-wrapper { position: fixed; z-index: 200; pointer-events: none; }
  @media (max-width: 768px) { .grid-container { grid-template-columns: repeat(var(--cols), 48px); grid-template-rows: repeat(var(--rows), 48px); } .tile-wrapper { width: 48px; height: 48px; } }
</style>
