import { EventEmitter } from 'excalibur';

// ───── Event payload types ─────
export interface EnemyAttackEvent {
  enemyId: string;
  damage: number;
}

export interface CombatEvents {
  // Turn flow
  'turn:started': { turnNumber: number; hand: string[]; coins: number; heroHp: number };
  'turn:resolved': { turnNumber: number };
  'interest:due': { amount: number; heroHp: number };

  // Player actions
  'card:played': { cardId: string; cardIndex: number; targetEnemyIndex: number; damage: number; coins: number };
  'card:sold': { cardId: string; cardIndex: number; coins: number; sellPile: string[] };
  'card:blocked': { blockedCardIds: string[]; blockedEnemyDamage: number; heroHp: number };

  // Enemy actions
  'enemy:action': { enemyAttacks: EnemyAttackEvent[]; incomingDamage: number };
  'enemy:killed': { enemyIndex: number; enemyId: string };
  'enemy:hurt': { enemyIndex: number; damage: number; remainingHp: number };

  // Combat lifecycle
  'combat:started': { encounterId: string; hand: string[]; enemies: number };
  'combat:victory': { rewardGold: number; rewardCards: string[] };
  'combat:defeat': {};
  'combat:defensePhase': { incomingDamage: number; enemyAttacks: EnemyAttackEvent[] };

  // Game lifecycle
  'screen:changed': { screen: string };
  'scene:initialized': { scene: string };

  // Map
  'map:generated': { seed: number; nodeCount: number };
  'map:nodeEntered': { nodeId: string; nodeType: string };

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
