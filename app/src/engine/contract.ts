// Shared contract: types, constants, and the controller surface.
// Pure TS — no framework dependencies. Single source of truth for UI + render layers.

export const GRID_COLS = 9;
export const GRID_ROWS = 5;
export const HAND_LIMIT = 5;
export const INTEREST_START_TURN = 9;
export const FORECLOSURE_TURN = 16;
export const CREDIT_LIMIT = -5;
export const MANA_MAX = 9;
export const MOVE_BUDGET = 2;
export const LOG_CAP = 50;
export const HERO_UID = 'guppy';

export interface GridPos {
  x: number;
  y: number;
}

export type Team = 'player' | 'enemy';
export type Phase = 'player' | 'enemy' | 'gameover';
export type Winner = 'player' | 'enemy' | null;

export interface Unit {
  uid: string;
  name: string;
  team: Team;
  pos: GridPos;
  hp: number;
  maxHp: number;
  attack: number;
  block: number; // temporary shield (armor cards); absorbs damage first
  moved: boolean; // consumed move budget this turn
  acted: boolean; // attacked this turn
  alive: boolean;
}

export type CardType = 'Attack' | 'Armor' | 'Skill' | 'Summon' | 'Passive';
export type CardTarget = 'none' | 'enemy-unit' | 'friendly-unit' | 'empty-tile';

export interface CardDef {
  uid: string;
  name: string;
  type: CardType;
  cost: number;
  text: string;
  target: CardTarget;
  effects: CardEffect[];
}

export type CardEffect =
  | { kind: 'damage'; amount: number }
  | { kind: 'heal'; amount: number }
  | { kind: 'shield'; amount: number }
  | { kind: 'summon'; unitName: string; hp: number; attack: number }
  | { kind: 'draw'; count: number }
  | { kind: 'gold'; amount: number }
  | { kind: 'mana'; amount: number };

export interface CardInstance {
  uid: string; // instance id (deck copy)
  cardUid: string; // card definition id
}

export type GameAction =
  | { kind: 'deal-damage'; targetUid: string; amount: number }
  | { kind: 'heal'; targetUid: string; amount: number }
  | { kind: 'shield'; targetUid: string; amount: number }
  | { kind: 'summon'; pos: GridPos; unitName: string; hp: number; attack: number }
  | { kind: 'draw'; count: number }
  | { kind: 'gold'; amount: number }
  | { kind: 'mana'; amount: number };

export interface GameSnapshot {
  turn: number;
  phase: Phase;
  coins: number;
  interestDue: number;
  mana: number;
  hand: CardInstance[];
  deck: CardInstance[];
  discard: CardInstance[];
  sellPile: CardInstance[];
  units: Unit[];
  heroUid: string;
  selectedUnitUid: string | null;
  validMoves: GridPos[];
  validAttackTargets: string[]; // unit uids
  activeCardUid: string | null;
  activeCardTargets: GridPos[] | null; // empty tiles for empty-tile target cards; null otherwise
  activeCardUnitTargets: string[]; // unit uids for enemy-unit/friendly-unit target cards
  enemyIntents: EnemyIntent[]; // committed at player-phase start (StS/ItB model)
  log: string[];
  winner: Winner;
  foreclosed: boolean;
}

/** What an enemy unit will do on the upcoming enemy phase — committed when the player turn begins. */
export interface EnemyIntent {
  unitUid: string;
  kind: 'attack' | 'move' | 'hold';
  targetUid?: string; // for attack
  damage?: number; // expected damage (post-block), for attack
  to?: GridPos; // for move
}

/** Transient-resolution events for staged visuals (floating numbers, telegraphs). */
export type GameEvent =
  | { type: 'unit-moved'; uid: string; from: GridPos; to: GridPos }
  | { type: 'attack-resolved'; attackerUid: string; defenderUid: string; damage: number; counterDamage: number; deaths: string[] }
  | { type: 'card-played'; cardUid: string }
  | { type: 'card-drawn'; cardUid: string; burned: boolean }
  | { type: 'interest-charged'; amount: number; coins: number }
  | { type: 'foreclosed' }
  | { type: 'turn-changed'; turn: number; phase: Phase }
  | { type: 'game-over'; winner: Winner };

export type ControllerAction =
  | { type: 'select-unit'; uid: string | null }
  | { type: 'move'; pos: GridPos }
  | { type: 'attack'; uid: string }
  | { type: 'select-card'; uid: string | null }
  | { type: 'play-card'; target?: GridPos }
  | { type: 'sell-card'; uid: string }
  | { type: 'end-turn' }
  | { type: 'restart' };

export interface Controller {
  subscribe(fn: (snapshot: GameSnapshot) => void): () => void;
  subscribeEvents(fn: (event: GameEvent) => void): () => void;
  onEvent(action: ControllerAction): void;
  getSnapshot(): GameSnapshot;
  start(): void;
  restart(): void;
  selectUnit(uid: string | null): void;
  moveSelectedTo(pos: GridPos): void;
  attackTarget(uid: string): void;
  setActiveCard(uid: string | null): void;
  validCardTargets(): GridPos[] | null;
  playCard(target?: GridPos): void;
  sellCard(uid: string): void;
  endTurn(): void;
}
