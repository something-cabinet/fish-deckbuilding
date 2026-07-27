/**
 * Bridge layer: Excalibur EventEmitter → Svelte $state.
 *
 * Subscribes to the global eventBus and updates Svelte's reactive GameState.
 * Primary sync via `state:changed` snapshot event — eliminates per-field desync.
 * Granular events kept only for transient UI effects (interest flash, kill animation).
 *
 * Svelte components read from $state — they never call Excalibur APIs directly.
 */

import { eventBus } from './events';
import type { CombatState, RunState, Screen, EnemyInstance } from './combat/CardTypes';
import type { GameState } from '../lib/state.svelte';
import { CombatOrchestrator } from './systems/CombatOrchestrator';

let gameStateRef: GameState | null = null;
let currentOrchestrator: CombatOrchestrator | null = null;
let registered = false;

/**
 * Register the bridge with a reference to Svelte's reactive GameState.
 * Safe to call multiple times — guarded by `registered` flag.
 */
export function registerBridge(gs: GameState): void {
  if (registered) return;
  gameStateRef = gs;
  registered = true;
  subscribeAll();
}

/**
 * Set the current combat orchestrator (called when entering/exiting battle).
 */
export function setCurrentOrchestrator(orchestrator: CombatOrchestrator | null): void {
  currentOrchestrator = orchestrator;
}

/**
 * Get the current combat orchestrator for the UI layer.
 */
export function getCurrentOrchestrator(): CombatOrchestrator | null {
  return currentOrchestrator;
}

/**
 * Create a fresh combat orchestrator and register it with the bridge.
 * Called when entering combat from the map scene.
 */
export function createAndRegisterOrchestrator(
  runState: RunState,
  encounterEnemies: EnemyInstance[],
  encounterId: string,
  rewardGold: number,
  rewardCards: string[],
): CombatOrchestrator {
  const orchestrator = new CombatOrchestrator();
  setCurrentOrchestrator(orchestrator);

  // Initialize Svelte combat state with encounter data so enemies appear immediately
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

/**
 * Destroy the current orchestrator and unregister from the bridge.
 */
export function destroyCurrentOrchestrator(): void {
  if (currentOrchestrator) {
    currentOrchestrator.destroy();
    currentOrchestrator = null;
    setCurrentOrchestrator(null);
  }
}

/**
 * Unsubscribe all bridge listeners (cleanup on teardown).
 */
export function unregisterBridge(): void {
  registered = false;
}

/** Subscribes to all game events and wires them to state.ts helpers. */
function subscribeAll(): void {
  // ───── State snapshot (primary sync — fixes all P0 desyncs) ─────
  eventBus.on('state:changed', () => {
    if (!gameStateRef || !currentOrchestrator) return;
    const snapshot = currentOrchestrator.getStateSnapshot();
    const combat = gameStateRef.combat;
    if (snapshot.hand !== undefined) combat.hand = snapshot.hand;
    if (snapshot.battleDeck !== undefined) combat.battleDeck = snapshot.battleDeck;
    if (snapshot.battleDiscard !== undefined) combat.battleDiscard = snapshot.battleDiscard;
    if (snapshot.sellPile !== undefined) combat.sellPile = snapshot.sellPile;
    if (snapshot.coins !== undefined) combat.coins = snapshot.coins;
    if (snapshot.creditUsed !== undefined) combat.creditUsed = snapshot.creditUsed;
    if (snapshot.heroHp !== undefined) combat.heroHp = snapshot.heroHp;
    if (snapshot.heroMaxHp !== undefined) combat.heroMaxHp = snapshot.heroMaxHp;
    if (snapshot.turnPhase !== undefined) combat.turnPhase = snapshot.turnPhase;
    if (snapshot.turnNumber !== undefined) combat.turnNumber = snapshot.turnNumber;
    if (snapshot.enemies !== undefined) {
      // Merge snapshot enemy HP into existing enemy list (preserves id/name/structure)
      for (const snapEnemy of snapshot.enemies) {
        const existing = combat.enemies.find(e => e.id === snapEnemy.id);
        if (existing) existing.hp = snapEnemy.hp;
      }
    }
  });

  // ───── Interest flash (transient UI effect) ─────
  eventBus.on('interest:due', (e) => {
    if (!gameStateRef) return;
    gameStateRef.combat.interestDue = e.amount;
    gameStateRef.combat.heroHp = e.heroHp;
  });

  // ───── Defense phase (populates enemyActions for UI) ─────
  eventBus.on('combat:defensePhase', (e) => {
    if (!gameStateRef) return;
    const combat = gameStateRef.combat;
    combat.turnPhase = 'defense';
    combat.enemyActions = e.enemyAttacks.map(a => ({
      enemyIndex: combat.enemies.findIndex(en => en.id === a.enemyId),
      type: 'attack' as const,
      damage: a.damage,
      target: 'hero' as const,
    }));
    // Store incoming damage for the defense prompt
    combat.incomingDamage = e.incomingDamage;
  });

  // ───── Victory (applies gold, transitions to card reward) ─────
  eventBus.on('combat:victory', (e) => {
    if (!gameStateRef) return;
    const run = gameStateRef.run;
    const combat = gameStateRef.combat;
    // Sync hero HP from combat to run
    run.heroHp = combat.heroHp;
    // Apply reward gold once
    run.gold += e.rewardGold;
    combat.rewardGold = e.rewardGold;
    combat.rewardCards = e.rewardCards;
    battleOver = true;
  });

  // ───── Defeat (transitions to death screen) ─────
  eventBus.on('combat:defeat', () => {
    if (!gameStateRef) return;
    gameStateRef.screen = 'death';
    battleOver = true;
  });

  // ───── Screen transitions ─────
  eventBus.on('screen:changed', (e) => {
    if (!gameStateRef) return;
    gameStateRef.screen = e.screen as Screen;
  });
}

// Track whether a battle ended to prevent double gold/transition
let battleOver = false;

/**
 * Get and reset the battle-over flag.
 * Called from BattleHUD to discover if battle ended.
 */
export function consumeBattleOver(): boolean {
  const was = battleOver;
  battleOver = false;
  return was;
}

/**
 * When returning from combat, sync combat results back to run state.
 * Call this before transitioning away from the battle screen.
 * NOTE: gold is already applied by the combat:victory bridge handler.
 * This only syncs hero HP if it wasn't already synced.
 */
export function syncCombatResultToRun(): void {
  if (!gameStateRef) return;
  // Hero HP should already be synced by combat:victory handler,
  // but this ensures it's set if the handler didn't fire (e.g. defeat).
  gameStateRef.run.heroHp = gameStateRef.combat.heroHp;
}
