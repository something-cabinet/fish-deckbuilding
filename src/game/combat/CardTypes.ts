export interface CardDef {
  id: string;
  name: string;
  type: 'action' | 'gear' | 'ally';
  cost: number;             // Coins needed to play
  coinValue: 1 | 2 | 3;    // Coins gained when selling
  attack: number;           // Damage when used offensively
  defense: number;          // Damage blocked when used defensively
  keywords?: Keyword[];     // NEW: keyword modifiers
  effects?: CardEffect[];   // NEW: supplementary effects
  description: string;
  color: string;
}

/** Keyword types for card modifiers */
export type Keyword = 'rush' | 'taunt' | 'pierce' | 'lifesteal' | 'double_strike' | 'overdraft';

/** Effect types for card/relic effects */
export type EffectType =
  | 'damage'        // Deal N damage to target enemy
  | 'heal'          // Heal hero for N HP
  | 'draw'          // Draw N cards
  | 'gainCoins'     // Gain N coins
  | 'applyBuff'     // Apply buff (future: +ATK, +DEF)
  | 'applyDebuff'   // Apply debuff to enemy (future: -ATK)
  ;

/** An effect that a card or relic produces */
export interface CardEffect {
  type: EffectType;
  value: number;
  target?: 'enemy' | 'hero' | 'self';
}

export interface EnemyInstance {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  attack: number;       // Base attack damage per turn
  defense: number;      // Base block
  intent: 'attack' | 'buff' | 'debuff' | 'defend'; // What enemy plans to do
  isBoss: boolean;      // Mark the "boss" enemy
}

export type TurnPhase = 'draw' | 'play' | 'sellOrder' | 'defense' | 'resolve';

export type AIStrategy = 'aggressive' | 'balanced' | 'defensive';

export interface EnemyAction {
  enemyIndex: number;
  type: 'attack' | 'defend';
  damage?: number;   // If attacking
  block?: number;    // If defending
  target: 'hero';    // For now, always hero. Could expand later
}

export interface RunState {
  heroHp: number;
  heroMaxHp: number;
  heroMaxHand: number;
  creditLimit: number;    // How far below 0 coins can go (FaB-style)
  gold: number;
  deck: string[];          // Full run deck (persistent across battles)
  mapNodes: MapNode[];
  currentNodeId: string;
  relics: string[];
  allies: string[];        // Recruited ally IDs
  seed: number;
  act: number;
  battleIndex: number;     // Incremented each battle for seed diversity
}

export interface CombatState {
  hand: string[];
  battleDeck: string[];    // Shuffled copy of run.deck for this battle
  battleDiscard: string[]; // Cards played/blocked during battle
  sellPile: string[];      // Cards sold this turn (display only — cards also added to bottom of battleDeck)
  coins: number;            // Current coins (FaB-style, resets to 0 each turn)
  creditUsed: number;       // How much below 0 coins have gone (for interest calc)
  enemies: EnemyInstance[]; // Flat array of enemies in the encounter
  heroHp: number;
  heroMaxHp: number;
  turnPhase: TurnPhase;
  turnNumber: number;
  encounterId: string;
  rewardGold: number;
  rewardCards: string[];
  interestDue: number;      // Damage taken at end of turn if in debt
  incomingDamage?: number;   // Total incoming damage from enemy attacks (defense phase, optional for tests)
  enemyActions: EnemyAction[];  // Computed AI actions for the current enemy turn
  aiStrategy: AIStrategy;       // AI strategy for this encounter
}

export interface MapNode {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  children: string[];
  visited: boolean;
  cleared?: boolean;
}

export type NodeType = 'combat' | 'elite' | 'shop' | 'rest' | 'boss' | 'start';

export type Screen = 'menu' | 'map' | 'battle' | 'shop' | 'rest' | 'death' | 'victory';

export const DEFAULT_CREDIT_LIMIT = 5;
export const HERO_STARTING_HP = 30;
export const HERO_MAX_HAND = 4;
