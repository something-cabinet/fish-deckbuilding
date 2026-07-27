import { STARTER_DECK } from '../game/cards/cardData';
import type {
  EnemyInstance,
  TurnPhase,
  NodeType,
  Screen,
  MapNode,
  RunState,
  CombatState,
  AIStrategy,
  EnemyAction,
} from '../game/combat/CardTypes';
export type { EnemyInstance, TurnPhase, NodeType, Screen, MapNode, RunState, CombatState, AIStrategy, EnemyAction };

// ───── Global Game State ─────
export interface GameState {
  screen: Screen;
  run: RunState;
  combat: CombatState;
}

function createInitialRunState(): RunState {
  return {
    heroHp: 30,
    heroMaxHp: 30,
    heroMaxHand: 4,
    creditLimit: 5,
    gold: 0,
    deck: [...STARTER_DECK],
    mapNodes: [],
    currentNodeId: '',
    relics: [],
    allies: [],
    seed: Date.now(),
    act: 1,
    battleIndex: 0,
  };
}

function createInitialCombatState(): CombatState {
  return {
    hand: [],
    battleDeck: [],
    battleDiscard: [],
    sellPile: [],
    coins: 0,
    creditUsed: 0,
    enemies: [],
    heroHp: 30,
    heroMaxHp: 30,
    turnPhase: 'draw',
    turnNumber: 1,
    encounterId: '',
    rewardGold: 0,
    rewardCards: [],
    interestDue: 0,
    incomingDamage: 0,
    enemyActions: [],
    aiStrategy: 'balanced',
  };
}

function createInitialState(): GameState {
  return {
    screen: 'menu',
    run: createInitialRunState(),
    combat: createInitialCombatState(),
  };
}

export const gameState = $state<GameState>(createInitialState());

// ───── Screen helpers ─────
export function setScreen(screen: Screen) {
  gameState.screen = screen;
}

export function resetGame() {
  const fresh = createInitialState();
  Object.assign(gameState, fresh);
}

// ───── Run state helpers ─────
export function healHero(amount: number) {
  gameState.run.heroHp = Math.min(
    gameState.run.heroMaxHp,
    gameState.run.heroHp + amount
  );
}

export function addGold(amount: number) {
  gameState.run.gold += amount;
}

export function spendGold(amount: number) {
  gameState.run.gold = Math.max(0, gameState.run.gold - amount);
}

export function addToDeck(cardId: string) {
  gameState.run.deck.push(cardId);
}

export function removeFromDeck(cardId: string) {
  const idx = gameState.run.deck.indexOf(cardId);
  if (idx !== -1) gameState.run.deck.splice(idx, 1);
}

export function addRelic(relicId: string) {
  gameState.run.relics.push(relicId);
}

// ───── Map helpers ─────
export function setMapNodes(nodes: MapNode[]) {
  gameState.run.mapNodes = nodes;
}

export function setCurrentNode(nodeId: string) {
  gameState.run.currentNodeId = nodeId;
  const node = gameState.run.mapNodes.find((n) => n.id === nodeId);
  if (node) node.visited = true;
}

export function markNodeCleared(nodeId: string) {
  const node = gameState.run.mapNodes.find((n) => n.id === nodeId);
  if (node) node.cleared = true;
}

// ───── Combat helpers ─────
export function startCombat() {
  // Combat state managed via CombatController
}

export function endCombat() {
  gameState.combat.hand = [];
  gameState.combat.battleDeck = [];
  gameState.combat.battleDiscard = [];
  gameState.combat.sellPile = [];
  gameState.combat.coins = 0;
  gameState.combat.creditUsed = 0;
  gameState.combat.enemies = [];
  gameState.combat.turnPhase = 'draw';
  gameState.combat.turnNumber = 1;
  gameState.combat.encounterId = '';
  gameState.combat.rewardGold = 0;
  gameState.combat.rewardCards = [];
  gameState.combat.interestDue = 0;
  gameState.combat.enemyActions = [];
  gameState.combat.aiStrategy = 'balanced';
}

export function incrementBattleIndex() {
  gameState.run.battleIndex++;
}

export function setCombatHand(hand: string[]) {
  gameState.combat.hand = hand;
}

export function setCombatBattleDeck(deck: string[]) {
  gameState.combat.battleDeck = deck;
}

export function setCombatBattleDiscard(discard: string[]) {
  gameState.combat.battleDiscard = discard;
}

export function setCombatCoins(coins: number) {
  gameState.combat.coins = coins;
}

export function setCombatTurnPhase(phase: TurnPhase) {
  gameState.combat.turnPhase = phase;
}

export function setCombatSellPile(pile: string[]) {
  gameState.combat.sellPile = pile;
}

export function getLivingEnemies(): EnemyInstance[] {
  return gameState.combat.enemies.filter((e) => e.hp > 0);
}

/** Get the EnemyAction for a specific enemy index (or undefined if no action computed) */
export function getEnemyAction(enemyIndex: number): EnemyAction | undefined {
  return gameState.combat.enemyActions.find(a => a.enemyIndex === enemyIndex);
}

export function combatNextTurn() {
  gameState.combat.turnNumber++;
}
