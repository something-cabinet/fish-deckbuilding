/**
 * Core data types for the combat system.
 *
 * All combat logic follows a pure-function pattern: state-in, state-out, no side effects.
 * The grid system (GridState, GridUnit, etc.) from ../grid/GridTypes.ts is embedded in CombatState.
 *
 * Also defines shared types used by the UI/Svelte layer (UIBattleState, RunState, etc.).
 */
import type { GridPosition, GridState } from '../grid/GridTypes';
import { MoveType } from '../grid/GridTypes';

// ───── Enums ─────

export enum CardType {
  Attack = 'attack',
  Armor = 'armor',
  Skill = 'skill',
  Summon = 'summon',
  Passive = 'passive',
}

export enum TurnPhase {
  PlayerDraw = 'playerDraw',
  PlayerAction = 'playerAction',
  PlayerEnd = 'playerEnd',
  EnemyTurn = 'enemyTurn',
  BattleEnd = 'battleEnd',
}

// ───── Card Definition (template from card library) ─────

export interface CardDefinition {
  id: string;
  name: string;
  type: CardType;
  manaCost: number; // 1-9
  description: string;
  // Attack-specific
  damage?: number;
  isAoE?: boolean;
  aoeRadius?: number;
  // Armor-specific
  armorAmount?: number;
  // Skill-specific
  healAmount?: number;
  buffAttack?: number;
  buffArmor?: number;
  // Summon-specific
  summonUnit?: {
    attack: number;
    maxHp: number;
    moveRange: number;
    attackRange: number;
    hasProvoke: boolean;
    moveType: MoveType;
  };
  // Passive-specific
  passiveEffect?: string;
  duration?: number;
}

// ───── Combat Engine State ─────

export interface CombatHero {
  id: string;
  unitId: string; // links to GridUnit
  hp: number;
  maxHp: number;
  baseAttack: number; // default 2
  armor: number; // temporary
  armorTurns: number; // remaining
}

export interface CombatEnemy {
  id: string;
  unitId: string;
  name: string;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  armor: number;
  aiStrategy: 'aggressive' | 'balanced' | 'defensive';
  hasProvoke: boolean;
  moveRange: number;
  attackRange: number;
}

export interface CombatCard {
  id: string;
  instanceId: string; // unique per-battle instance
  definition: CardDefinition;
}

/** A summon tracked in combat state separate from the GridUnit. */
export interface CombatSummon {
  id: string;
  unitId: string;
  hp: number;
  maxHp: number;
  attack: number;
}

/** A passive effect active for the battle duration. */
export interface PassiveEffect {
  cardId: string;
  effect: string; // e.g. 'manaRegen'
}

export interface CombatState {
  grid: GridState;
  hero: CombatHero;
  enemies: CombatEnemy[];
  hand: CombatCard[];
  deck: CombatCard[];
  discard: CombatCard[];
  mana: number;
  maxMana: number;
  turnNumber: number;
  turnPhase: TurnPhase;
  canReplace: boolean;
  battleResult: 'ongoing' | 'victory' | 'defeat';
  // C4: Summon tracking
  summons: CombatSummon[];
  summonIdCounter: number;
  // M1: Passive tracking
  passives: PassiveEffect[];
  // M3: Seed for reproducible shuffles
  seed: number;
  // Counter for card instance IDs (moved from module-level)
  cardInstanceCounter: number;
}

// ───── Shared UI/State Types (used by Svelte/Excalibur layer) ─────

/** Shape of the combat state as consumed by the Svelte UI. */
export interface UIBattleState {
  hand: string[];
  battleDeck: string[];
  battleDiscard: string[];
  mana: number;
  enemies: EnemyInstance[];
  heroHp: number;
  heroMaxHp: number;
  turnPhase: string;
  turnNumber: number;
  encounterId: string;
  rewardGold: number;
  rewardCards: string[];
  incomingDamage: number;
  enemyActions: EnemyAction[];
  // Phase 5: Last animation event for Svelte animation components
  lastAnimEvent?: AnimEvent;
  // Phase 5 P0 Fix: Grid data for Svelte UI rendering
  /** Tiles array serialized from GridState (tiles[y][x]) */
  tiles?: { type: string; occupiedBy: string | null }[][];
  /** All unit positions keyed by unitId */
  unitPositions?: Record<string, { x: number; y: number; type: string; faction: string; isAlive: boolean }>;
  /** Hero's current grid position */
  heroPosition?: { x: number; y: number };
  /** Enemy positions with full enemy data */
  enemyPositions?: Array<EnemyInstance & { position?: { x: number; y: number } }>;
  /** Summon positions */
  summonPositions?: Array<{ id: string; unitId: string; hp: number; maxHp: number; position?: { x: number; y: number } }>;
  /** Set of reachable tile keys ("x,y") for movement this turn */
  movementRange?: string[];
  /** Set of attackable target keys ("x,y") — enemy positions currently in attack range */
  attackRange?: string[];
  /** Cards that can be played with current mana */
  playableCardInstanceIds?: string[];
  /** Valid target positions for the currently selected card (if any) */
  targetPositions?: { x: number; y: number }[];
  /** True if hero has already moved this turn */
  heroHasMoved?: boolean;
  /** True if hero has already attacked this turn */
  heroHasAttacked?: boolean;
  /** Can replace this turn */
  canReplace?: boolean;
}

/** Animation event type passed from bridge to Svelte animation components. */
export interface AnimEvent {
  type: 'damage' | 'heal' | 'gold' | 'cardPlayed' | 'armorGained' | 'screenShake';
  targetId?: string;
  amount?: number;
  isCrit?: boolean;
  cardName?: string;
  position?: { x: number; y: number };
  originRect?: { x: number; y: number; width: number; height: number };
  intensity?: number;
}

export interface EnemyInstance {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  intent: 'attack' | 'defend' | 'buff';
  isBoss: boolean;
}

export interface RunState {
  heroHp: number;
  heroMaxHp: number;
  gold: number;
  deck: string[];
  relics: string[];
  seed: number;
  act: number;
  battleIndex: number;
}

export type Screen = 'menu' | 'map' | 'battle' | 'shop' | 'rest' | 'event' | 'death' | 'cardReward' | 'deck' | 'save' | 'settings' | 'victory' | 'dialogue';

export type AIStrategy = 'aggressive' | 'balanced' | 'defensive';

export interface EnemyAction {
  enemyIndex: number;
  type: 'attack' | 'defend';
  damage?: number;
  block?: number;
}

// ───── Constants ─────

export const HERO_STARTING_HP = 30;

// ───── Re-exports for convenience ─────

export { MoveType };
export type { GridPosition, GridState };
