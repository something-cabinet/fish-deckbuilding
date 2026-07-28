import { getStarterDeck } from '../game/cards/cardData';
import type {
  EnemyInstance,
  Screen,
  RunState,
  UIBattleState,
  EnemyAction,
} from '../game/combat/CardTypes';
import { ISLAND_ZONES, getStartingZone } from '../game/map/islandData';
import type { MapStateUI, PendingZoneAction } from '../game/map/IslandTypes';
import { DIALOGUES } from '../game/story/dialogueData';
import type { DialogueScene } from '../game/story/dialogueData';
export type { EnemyInstance, Screen, RunState, UIBattleState, EnemyAction };
export { DIALOGUES };
export type { DialogueScene };

// ───── Global Game State ─────
export interface DialogueState {
  sceneId: string;
  lineIndex: number;
  visible: boolean;
}

export interface GameState {
  screen: Screen;
  run: RunState;
  combat: UIBattleState;
  map: MapStateUI;
  activeDialogue: DialogueState | null;
}

function createInitialRunState(): RunState {
  return {
    heroHp: 30,
    heroMaxHp: 30,
    gold: 0,
    deck: getStarterDeck().map(c => c.id),
    relics: [],
    seed: Date.now(),
    act: 1,
    battleIndex: 0,
  };
}

function createInitialCombatState(): UIBattleState {
  return {
    hand: [],
    battleDeck: [],
    battleDiscard: [],
    mana: 0,
    enemies: [],
    heroHp: 30,
    heroMaxHp: 30,
    turnPhase: 'playerDraw',
    turnNumber: 1,
    encounterId: '',
    rewardGold: 0,
    rewardCards: [],
    incomingDamage: 0,
    enemyActions: [],
    lastAnimEvent: undefined,
  };
}

function createInitialMapState(): MapStateUI {
  const start = getStartingZone();
  const unlockedZones = ISLAND_ZONES.filter((z) => z.requiredChapter <= 1).map((z) => z.id);
  if (!unlockedZones.includes(start.id)) {
    unlockedZones.push(start.id);
  }
  return {
    currentZone: start.id,
    unlockedZones,
    completedZones: [],
    heroPosition: { x: start.position.x, y: start.position.y },
    pendingAction: null,
  };
}

function createInitialState(): GameState {
  return {
    screen: 'menu',
    run: createInitialRunState(),
    combat: createInitialCombatState(),
    map: createInitialMapState(),
    activeDialogue: null,
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

// ───── Dialogue helpers ─────

export function startDialogue(sceneId: string) {
  if (DIALOGUES[sceneId]) {
    gameState.activeDialogue = { sceneId, lineIndex: 0, visible: true };
    gameState.screen = 'dialogue';
  }
}

export function advanceDialogue() {
  const ad = gameState.activeDialogue;
  if (!ad) return;
  const scene = DIALOGUES[ad.sceneId];
  if (!scene) return;
  if (ad.lineIndex < scene.lines.length - 1) {
    gameState.activeDialogue = { ...ad, lineIndex: ad.lineIndex + 1 };
  } else {
    endDialogue();
  }
}

export function endDialogue() {
  const ad = gameState.activeDialogue;
  if (!ad) return;
  const scene = DIALOGUES[ad.sceneId];
  if (!scene) return;

  // Apply zone unlocks
  if (scene.zoneUnlock) {
    for (const zoneId of scene.zoneUnlock) {
      unlockZone(zoneId);
    }
  }

  // Navigate to next screen
  gameState.screen = (scene.onEnd as Screen) || 'map';
  gameState.activeDialogue = null;
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

const MAX_DECK_SIZE = 30;
const MAX_COPIES = 2;

export function countDeckCopies(cardId: string): number {
  return gameState.run.deck.filter(id => id === cardId).length;
}

export function addToDeck(cardId: string) {
  if (gameState.run.deck.length >= MAX_DECK_SIZE) return;
  if (countDeckCopies(cardId) >= MAX_COPIES) return;
  gameState.run.deck.push(cardId);
}

export function removeFromDeck(cardId: string) {
  const idx = gameState.run.deck.indexOf(cardId);
  if (idx !== -1) gameState.run.deck.splice(idx, 1);
}

export function canAddToDeck(cardId: string): boolean {
  return gameState.run.deck.length < MAX_DECK_SIZE && countDeckCopies(cardId) < MAX_COPIES;
}

export function addRelic(relicId: string) {
  gameState.run.relics.push(relicId);
}

// ───── Island map helpers ─────

export function setCurrentZone(zoneId: string) {
  gameState.map.currentZone = zoneId;
  const zone = ISLAND_ZONES.find((z) => z.id === zoneId);
  if (zone) {
    gameState.map.heroPosition = { x: zone.position.x, y: zone.position.y };
  }
}

export function unlockZone(zoneId: string) {
  if (!gameState.map.unlockedZones.includes(zoneId)) {
    gameState.map.unlockedZones.push(zoneId);
  }
}

export function completeZone(zoneId: string) {
  if (!gameState.map.completedZones.includes(zoneId)) {
    gameState.map.completedZones.push(zoneId);
  }
}

export function setPendingAction(action: PendingZoneAction | null) {
  gameState.map.pendingAction = action;
}

export function clearPendingAction() {
  gameState.map.pendingAction = null;
}

/** Unlock any zones whose requiredChapter is ≤ current act. */
export function refreshUnlockedZones() {
  const chapter = gameState.run.act;
  for (const zone of ISLAND_ZONES) {
    if (zone.requiredChapter <= chapter && !gameState.map.unlockedZones.includes(zone.id)) {
      gameState.map.unlockedZones.push(zone.id);
    }
  }
}

// ───── Combat helpers ─────
export function startCombat() {
  // Combat state managed via CombatController
}

export function endCombat() {
  gameState.combat.hand = [];
  gameState.combat.battleDeck = [];
  gameState.combat.battleDiscard = [];
  gameState.combat.mana = 0;
  gameState.combat.enemies = [];
  gameState.combat.turnPhase = 'playerDraw';
  gameState.combat.turnNumber = 1;
  gameState.combat.encounterId = '';
  gameState.combat.rewardGold = 0;
  gameState.combat.rewardCards = [];
  gameState.combat.enemyActions = [];
}

/**
 * Handle player defeat — preserves all run progress (gold, deck, collection, map).
 * Restores a minimal HP so the player can continue or retry.
 * Sets screen to 'death' for the defeat animation/UI.
 */
export function handleDefeat() {
  // Preserve everything — gold, deck, collection, map progress
  // Restore HP to at least 10, or 30% of max HP (whichever is higher), capped at max
  gameState.run.heroHp = Math.min(
    gameState.run.heroMaxHp,
    Math.max(10, Math.floor(gameState.run.heroMaxHp * 0.3)),
  );
  // Clear combat state for the next battle
  endCombat();
  // Show death screen with options to return to map or retry
  gameState.screen = 'death';
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

export function setCombatMana(mana: number) {
  gameState.combat.mana = mana;
}

export function setCombatTurnPhase(phase: string) {
  gameState.combat.turnPhase = phase;
}

export function getLivingEnemies(): EnemyInstance[] {
  return gameState.combat.enemies.filter((e: EnemyInstance) => e.hp > 0);
}

/** Get the EnemyAction for a specific enemy index (or undefined if no action computed) */
export function getEnemyAction(enemyIndex: number): EnemyAction | undefined {
  return gameState.combat.enemyActions.find((a: EnemyAction) => a.enemyIndex === enemyIndex);
}

export function combatNextTurn() {
  gameState.combat.turnNumber++;
}
