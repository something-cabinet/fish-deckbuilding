/**
 * Bridge layer: Excalibur EventEmitter → Svelte $state.
 *
 * Subscribes to the global eventBus and updates Svelte's reactive GameState.
 * Primary sync via `state:changed` snapshot event.
 *
 * Svelte components read from $state — they never call Excalibur APIs directly.
 */

import { eventBus } from './events';
import type { UIBattleState, RunState, Screen, EnemyInstance } from './combat/CardTypes';
import type { GameState } from '../lib/state.svelte';
import { CombatOrchestrator } from './systems/CombatOrchestrator';
import { IslandScene } from './scenes/IslandScene';
import { getZoneById } from './map/islandData';
import { ZoneType } from './map/IslandTypes';
import { setCurrentZone, refreshUnlockedZones, setPendingAction, completeZone, handleDefeat, startDialogue } from '../lib/state.svelte';

let gameStateRef: GameState | null = null;
let currentOrchestrator: CombatOrchestrator | null = null;
let islandSceneRef: IslandScene | null = null;
let registered = false;

export function registerBridge(gs: GameState): void {
  if (registered) return;
  gameStateRef = gs;
  registered = true;
  subscribeAll();
}

export function setCurrentOrchestrator(orchestrator: CombatOrchestrator | null): void {
  currentOrchestrator = orchestrator;
}

export function getCurrentOrchestrator(): CombatOrchestrator | null {
  return currentOrchestrator;
}

export function createAndRegisterOrchestrator(
  runState: RunState,
  encounterEnemies: EnemyInstance[],
  encounterId: string,
  rewardGold: number,
  rewardCards: string[],
): CombatOrchestrator {
  const orchestrator = new CombatOrchestrator();
  setCurrentOrchestrator(orchestrator);

  if (gameStateRef) {
    gameStateRef.combat.enemies = encounterEnemies.map(e => ({ ...e }));
    gameStateRef.combat.encounterId = encounterId;
    gameStateRef.combat.rewardGold = rewardGold;
    gameStateRef.combat.rewardCards = rewardCards || [];
    gameStateRef.combat.heroHp = runState.heroHp;
    gameStateRef.combat.heroMaxHp = runState.heroMaxHp;
  }

  orchestrator.startBattle(runState, encounterEnemies, encounterId, rewardGold, rewardCards);
  return orchestrator;
}

export function destroyCurrentOrchestrator(): void {
  if (currentOrchestrator) {
    currentOrchestrator.destroy();
    currentOrchestrator = null;
    setCurrentOrchestrator(null);
  }
}

export function unregisterBridge(): void {
  registered = false;
}

/** Register the IslandScene so the bridge can sync state back to it. */
export function registerIslandScene(scene: IslandScene): void {
  islandSceneRef = scene;
  // Don't immediately call syncFromState — IslandScene may not be initialized yet.
  // syncFromState is called on map screen activation and on map state changes.
}

/** Push the current Svelte map state into the IslandScene. Call whenever the map screen becomes active. */
export function syncIslandScene(): void {
  if (islandSceneRef && gameStateRef) {
    islandSceneRef.syncFromState(gameStateRef.map);
  }
}

function subscribeAll(): void {
  eventBus.on('state:changed', () => {
    if (!gameStateRef || !currentOrchestrator) return;
    const snapshot = currentOrchestrator.getStateSnapshot();
    const combat = gameStateRef.combat;
    if (snapshot.hand !== undefined) combat.hand = snapshot.hand;
    if (snapshot.battleDeck !== undefined) combat.battleDeck = snapshot.battleDeck;
    if (snapshot.battleDiscard !== undefined) combat.battleDiscard = snapshot.battleDiscard;
    if (snapshot.mana !== undefined) combat.mana = snapshot.mana;
    if (snapshot.heroHp !== undefined) combat.heroHp = snapshot.heroHp;
    if (snapshot.heroMaxHp !== undefined) combat.heroMaxHp = snapshot.heroMaxHp;
    if (snapshot.turnPhase !== undefined) combat.turnPhase = snapshot.turnPhase;
    if (snapshot.turnNumber !== undefined) combat.turnNumber = snapshot.turnNumber;
    if (snapshot.enemies !== undefined) {
      for (const snapEnemy of snapshot.enemies) {
        const existing = combat.enemies.find(e => e.id === snapEnemy.id);
        if (existing) existing.hp = snapEnemy.hp;
      }
    }
  });

  // ── Animation event wiring (Phase 5) ──
  // CombatOrchestrator emits these; the bridge stores the latest event
  // for the Svelte animation layer to consume.

  eventBus.on('anim:damage', (e) => {
    if (!gameStateRef) return;
    // Store latest damage event for FloatingText/DamageFlash components
    gameStateRef.combat.lastAnimEvent = {
      type: 'damage',
      targetId: e.targetId,
      amount: e.amount,
      isCrit: e.isCrit ?? false,
      position: e.position,
    } as any;
  });

  eventBus.on('anim:heal', (e) => {
    if (!gameStateRef) return;
    gameStateRef.combat.lastAnimEvent = {
      type: 'heal',
      targetId: e.targetId,
      amount: e.amount,
      position: e.position,
    } as any;
  });

  eventBus.on('anim:gold', (e) => {
    if (!gameStateRef) return;
    gameStateRef.combat.lastAnimEvent = {
      type: 'gold',
      amount: e.amount,
      position: e.position,
    } as any;
  });

  eventBus.on('anim:cardPlayed', (e) => {
    if (!gameStateRef) return;
    gameStateRef.combat.lastAnimEvent = {
      type: 'cardPlayed',
      cardName: e.cardName,
      originRect: e.originRect,
    } as any;
  });

  eventBus.on('anim:armorGained', (e) => {
    if (!gameStateRef) return;
    gameStateRef.combat.lastAnimEvent = {
      type: 'armorGained',
      targetId: e.targetId,
      amount: e.amount,
    } as any;
  });

  eventBus.on('anim:screenShake', (e) => {
    if (!gameStateRef) return;
    gameStateRef.combat.lastAnimEvent = {
      type: 'screenShake',
      intensity: e.intensity,
    } as any;
  });

  eventBus.on('combat:victory', (e) => {
    if (!gameStateRef) return;
    const run = gameStateRef.run;
    const combat = gameStateRef.combat;
    // M1: bridge does NOT modify gold — RewardScreen owns the gold economy
    run.heroHp = combat.heroHp;
    // AC-17: Post-battle heal — restore ~10 HP after victory, capped at maxHp
    run.heroHp = Math.min(run.heroMaxHp, run.heroHp + 10);
    combat.rewardGold = e.rewardGold;
    combat.rewardCards = e.rewardCards;

    // C4: Progression — complete the zone, check boss → advance act
    const zone = getZoneById(gameStateRef.map.currentZone);
    if (zone) {
      completeZone(zone.id);
      if (zone.isBossZone) {
        // Advance to next act
        gameStateRef.run.act++;
        refreshUnlockedZones();
        eventBus.emit('map:zoneCompleted', { zoneId: zone.id, zoneType: zone.type });

        // Chapter 2 intro plays after the first boss (act 1 → 2)
        if (gameStateRef.run.act === 2) {
          startDialogue('chapter_2_intro');
          battleOver = true;
          return;
        }
      }
    }

    // Navigate to card reward screen
    gameStateRef.screen = 'cardReward';
    battleOver = true;
  });

  eventBus.on('combat:defeat', () => {
    if (!gameStateRef) return;
    // AC-16: Defeat preserves gold, deck, collection, map progress
    // Restores minimal HP so player can continue or retry
    handleDefeat();
    battleOver = true;
  });

  eventBus.on('screen:changed', (e) => {
    if (!gameStateRef) return;
    gameStateRef.screen = e.screen as Screen;
  });

  // ── Island map events ──

  eventBus.on('map:zoneEntered', (e) => {
    if (!gameStateRef) return;

    const zone = getZoneById(e.zoneId);
    if (!zone) return;

    // Update Svelte state
    setCurrentZone(e.zoneId);
    refreshUnlockedZones();

    // Sync Illuminated scene visuals
    if (islandSceneRef) {
      islandSceneRef.syncFromState(gameStateRef.map);
    }

    // Zone-type-specific transitions
    if (zone.type === ZoneType.Shop) {
      gameStateRef.screen = 'shop';
    } else if (zone.type === ZoneType.Rest) {
      gameStateRef.screen = 'rest';
    } else if (zone.type === ZoneType.Combat || zone.type === ZoneType.Boss) {
      // Show confirmation prompt in overlay
      setPendingAction({ type: 'battle', zoneId: e.zoneId, zoneName: zone.name });

      // Final boss intro dialogue
      if (zone.id === 'final_battle') {
        startDialogue('final_boss_intro');
      }
    } else if (zone.type === ZoneType.Event) {
      setPendingAction({ type: 'event', zoneId: e.zoneId, zoneName: zone.name });
    }
    // Town zones just update currentZone — no transition
  });

  eventBus.on('map:zoneCompleted', (e) => {
    if (!gameStateRef) return;
    completeZone(e.zoneId);
    if (islandSceneRef) {
      islandSceneRef.syncFromState(gameStateRef.map);
    }
  });
}

let battleOver = false;

export function consumeBattleOver(): boolean {
  const was = battleOver;
  battleOver = false;
  return was;
}

export function syncCombatResultToRun(): void {
  if (!gameStateRef) return;
  gameStateRef.run.heroHp = gameStateRef.combat.heroHp;
}
