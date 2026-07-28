import { EventEmitter } from 'excalibur';

// ───── Event payload types ─────
export interface EnemyAttackEvent {
  enemyId: string;
  damage: number;
}

export interface CombatEvents {
  // ── Animation events (Phase 5) ──
  /** Floating damage number above a target */
  'anim:damage': { targetId: string; amount: number; isCrit?: boolean; position?: { x: number; y: number } };
  /** Floating heal number above hero */
  'anim:heal': { targetId: string; amount: number; position?: { x: number; y: number } };
  /** Floating gold/coin number */
  'anim:gold': { amount: number; position?: { x: number; y: number } };
  /** Card played from hand — triggers card fly-out animation */
  'anim:cardPlayed': { cardName: string; originRect?: { x: number; y: number; width: number; height: number } };
  /** Armor gained shimmer */
  'anim:armorGained': { targetId: string; amount: number };
  /** Screen shake on heavy damage */
  'anim:screenShake': { intensity: number };

  // Enemy events
  'enemy:killed': { enemyIndex: number; enemyId: string };
  'enemy:hurt': { enemyIndex: number; damage: number; remainingHp: number };

  // Combat lifecycle
  'combat:started': { encounterId: string; hand: string[]; enemies: number };
  'combat:victory': { rewardGold: number; rewardCards: string[] };
  'combat:defeat': {};

  // Game lifecycle
  'screen:changed': { screen: string };
  'scene:initialized': { scene: string };

  // Island map
  'map:zoneClicked': { zoneId: string; zoneType: string };
  'map:zoneEntered': { zoneId: string; zoneType: string };
  'map:zoneCompleted': { zoneId: string; zoneType: string };

  // Shop
  'shop:cardBought': { cardId: string; cost: number };
  'shop:relicBought': { relicId: string; cost: number };
  'shop:cardRemoved': { cardId: string; cost: number };

  // Rest
  'rest:healed': { amount: number; heroHp: number };
  'rest:upgraded': { cardId: string };

  // Run
  'run:started': {};
  'run:ended': {};

  // State snapshot (carries full combat state — bridge syncs everything at once)
  'state:changed': {};
}

/**
 * Global typed event bus for all game events.
 * Used by ECS systems to emit state changes and by the bridge layer
 * to sync to Svelte $state.
 */
export const eventBus = new EventEmitter<CombatEvents>();
