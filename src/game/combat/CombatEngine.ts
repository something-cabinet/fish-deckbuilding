/**
 * Combat Engine — turn flow orchestrator for the tactical battle system.
 *
 * Pure functions only: state-in, state-out. No side effects, no classes.
 * Delegates to sub-systems: ManaSystem, DrawSystem, CardEffects, BaseAttack, EnemyAI, ArmorSystem.
 */
import type { CombatState, CombatHero, CombatEnemy, CombatCard, CardDefinition, CombatSummon } from './CardTypes';
import { CardType, TurnPhase, MoveType } from './CardTypes';
import type { GridPosition, GridUnit } from '../grid/GridTypes';
import { createEmptyGrid, placeUnit, moveUnit as gridMoveUnit, cloneGrid } from '../grid/GridFactory';
import { getManaForTurn, canPlayCard as manaCanPlayCard, spendMana } from './ManaSystem';
import { shuffleDeck, drawCards, replaceCardFromHand, canReplace as canReplaceCheck } from './DrawSystem';
import { resolveAttackCard, resolveArmorCard, resolveSkillCard, resolveSummonCard, resolvePassiveCard } from './CardEffects';
import { heroBaseAttack } from './BaseAttack';
import { executeEnemyTurn } from './EnemyAI';
import { tickArmor } from './ArmorSystem';
import { getMovementRange } from '../grid/GridMovement';
import { getAdjacentPositions } from '../grid/GridAttack';

// ───── Helpers ─────

function createCombatCards(definitions: CardDefinition[], counterStart: number): { cards: CombatCard[]; nextCounter: number } {
  let c = counterStart;
  const cards = definitions.map((def) => ({
    id: def.id,
    instanceId: `${def.id}_${c++}`,
    definition: { ...def },
  }));
  return { cards, nextCounter: c };
}

function defaultHeroUnit(id: string): GridUnit {
  return {
    id,
    type: 'hero',
    faction: 'player',
    position: { x: 1, y: 2 },
    moveType: MoveType.Normal,
    moveRange: 2,
    attackRange: 1,
    hasProvoke: false,
    hasActed: false,
    hasMoved: false,
    hasAttacked: false,
    isAlive: true,
  };
}

function enemyGridUnit(enemy: { id: string; attackRange?: number; moveRange?: number; hasProvoke?: boolean }, position: GridPosition): GridUnit {
  return {
    id: enemy.id,
    type: 'enemy',
    faction: 'enemy',
    position: { ...position },
    moveType: MoveType.Normal,
    moveRange: enemy.moveRange ?? 2,
    attackRange: enemy.attackRange ?? 1,
    hasProvoke: enemy.hasProvoke ?? false,
    hasActed: false,
    hasMoved: false,
    hasAttacked: false,
    isAlive: true,
  };
}

function getEnemyPosition(index: number): GridPosition {
  const positions: GridPosition[] = [
    { x: 7, y: 2 },
    { x: 7, y: 1 },
    { x: 7, y: 3 },
    { x: 6, y: 0 },
    { x: 6, y: 4 },
  ];
  return positions[index] ?? { x: 7 - index, y: 2 };
}

// ───── Combat Engine Functions ─────

/**
 * Initialize a battle with the given hero config, enemies, deck, and optional seed.
 *
 * 1. Creates a 9×5 grid and places hero + enemies
 * 2. Shuffles the deck and draws 3 cards
 * 3. Sets mana = 1, maxMana = 1, turnNumber = 1, phase = PlayerAction
 */
export function initBattle(
  heroConfig: { id: string; maxHp: number; baseAttack?: number },
  enemyConfigs: Array<{
    id: string;
    name: string;
    hp: number;
    maxHp: number;
    attack: number;
    defense: number;
    aiStrategy: 'aggressive' | 'balanced' | 'defensive';
    hasProvoke?: boolean;
    moveRange?: number;
    attackRange?: number;
  }>,
  deckDefs: CardDefinition[],
  seed?: number,
): CombatState {
  let grid = createEmptyGrid();

  const heroUnitId = `hero_unit_${heroConfig.id}`;
  const heroUnitObj = defaultHeroUnit(heroUnitId);
  grid = placeUnit(grid, heroUnitObj);

  const hero: CombatHero = {
    id: heroConfig.id,
    unitId: heroUnitId,
    hp: heroConfig.maxHp,
    maxHp: heroConfig.maxHp,
    baseAttack: heroConfig.baseAttack ?? 2,
    armor: 0,
    armorTurns: 0,
  };

  const enemies: CombatEnemy[] = [];
  for (let i = 0; i < enemyConfigs.length; i++) {
    const ec = enemyConfigs[i];
    const enemyUnitId = `enemy_unit_${ec.id}`;
    const pos = getEnemyPosition(i);
    const enemyGridObj = enemyGridUnit({ ...ec, id: enemyUnitId }, pos);
    grid = placeUnit(grid, enemyGridObj);

    enemies.push({
      id: ec.id,
      unitId: enemyUnitId,
      name: ec.name,
      hp: ec.hp,
      maxHp: ec.maxHp,
      attack: ec.attack,
      defense: ec.defense,
      armor: 0,
      aiStrategy: ec.aiStrategy,
      hasProvoke: ec.hasProvoke ?? false,
      moveRange: ec.moveRange ?? 2,
      attackRange: ec.attackRange ?? 1,
    });
  }

  // Create deck with card instance counter starting at 0
  const { cards: combatCards, nextCounter } = createCombatCards(deckDefs, 0);
  const shuffled = shuffleDeck(combatCards, seed);

  const actualSeed = seed ?? Date.now();

  const initialState: CombatState = {
    grid,
    hero,
    enemies,
    hand: [],
    deck: shuffled,
    discard: [],
    mana: 1,
    maxMana: 1,
    turnNumber: 1,
    turnPhase: TurnPhase.PlayerAction,
    canReplace: true,
    battleResult: 'ongoing',
    summons: [],
    summonIdCounter: 0,
    passives: [],
    seed: actualSeed,
    cardInstanceCounter: nextCounter,
  };

  return drawCards(initialState, 3);
}

/**
 * Start a new player turn.
 *
 * 1. Tick armor (decrement durations)
 * 2. Reset hasMoved and hasAttacked on hero's grid unit
 * 3. Draw 1 card
 * 4. Set mana = getManaForTurn(turnNumber)
 * 5. Reset canReplace = true
 * 6. Apply passive effects
 * 7. Set turnPhase = PlayerAction
 */
export function startPlayerTurn(state: CombatState): CombatState {
  let next = tickArmor(state);

  const turnNumber = next.turnNumber + 1;
  const mana = getManaForTurn(turnNumber);

  // Reset hero's hasMoved and hasAttacked on grid unit
  const heroUnit = next.grid.units.get(next.hero.unitId);
  if (heroUnit) {
    const g = cloneGrid(next.grid);
    const updatedUnit = g.units.get(next.hero.unitId)!;
    updatedUnit.hasMoved = false;
    updatedUnit.hasAttacked = false;
    next = { ...next, grid: g };
  }

  next = {
    ...next,
    turnNumber,
    mana,
    maxMana: mana,
    canReplace: true,
    turnPhase: TurnPhase.PlayerAction,
  };

  // M1: Apply passive effects at start of turn
  for (const passive of next.passives) {
    if (passive.effect === 'manaRegen') {
      // deep_focus: hero gains +1 mana at start of each turn
      next = { ...next, mana: Math.min(next.mana + 1, 9) };
    }
  }

  return drawCards(next, 1);
}

/**
 * Play a card from hand by instanceId.
 */
export function playCard(
  state: CombatState,
  cardInstanceId: string,
  targetPosition?: GridPosition,
): CombatState {
  if (state.turnPhase !== TurnPhase.PlayerAction) return state;

  const cardIndex = state.hand.findIndex(c => c.instanceId === cardInstanceId);
  if (cardIndex === -1) return state;

  const card = state.hand[cardIndex];

  if (state.mana < card.definition.manaCost) return state;

  let nextState: CombatState;

  switch (card.definition.type) {
    case CardType.Attack: {
      if (!targetPosition) return state;
      nextState = resolveAttackCard(state, card, targetPosition);
      break;
    }
    case CardType.Armor: {
      nextState = resolveArmorCard(state, card);
      break;
    }
    case CardType.Skill: {
      nextState = resolveSkillCard(state, card, targetPosition);
      break;
    }
    case CardType.Summon: {
      if (!targetPosition) return state;
      nextState = resolveSummonCard(state, card, targetPosition);
      break;
    }
    case CardType.Passive: {
      nextState = resolvePassiveCard(state, card);
      break;
    }
    default:
      return state;
  }

  nextState = spendMana(nextState, card.definition.manaCost);

  const newHand = [...nextState.hand];
  const [playedCard] = newHand.splice(cardIndex, 1);
  const newDiscard = [...nextState.discard, playedCard];

  nextState = {
    ...nextState,
    hand: newHand,
    discard: newDiscard,
  };

  nextState = checkBattleEnd(nextState);

  return nextState;
}

/**
 * Hero performs a base melee attack on an adjacent enemy.
 * C3: Enforces hasAttacked — only one base attack per turn.
 */
export function baseAttack(state: CombatState, enemyId: string): CombatState {
  if (state.turnPhase !== TurnPhase.PlayerAction) return state;

  // C3: Check hasAttacked on hero grid unit
  const heroUnit = state.grid.units.get(state.hero.unitId);
  if (heroUnit && heroUnit.hasAttacked) return state;

  const nextState = heroBaseAttack(state, enemyId);

  // Only set hasAttacked if the attack actually happened (state changed)
  const heroTookDamage = nextState.hero.hp < state.hero.hp;
  const enemyTookDamage = state.enemies.find(e => {
    const updated = nextState.enemies.find(ne => ne.id === e.id);
    return updated && updated.hp < e.hp;
  });
  const attackHappened = heroTookDamage || enemyTookDamage;

  if (attackHappened) {
    const updatedHeroUnit = nextState.grid.units.get(nextState.hero.unitId);
    if (updatedHeroUnit) {
      const g = cloneGrid(nextState.grid);
      g.units.get(nextState.hero.unitId)!.hasAttacked = true;
      return checkBattleEnd({ ...nextState, grid: g });
    }
  }

  return checkBattleEnd(nextState);
}

/**
 * Move a grid unit to a new position.
 * C2: Enforces movement range, faction, and hasMoved.
 */
export function moveUnit(state: CombatState, unitId: string, to: GridPosition): CombatState {
  if (state.turnPhase !== TurnPhase.PlayerAction) return state;

  const unit = state.grid.units.get(unitId);
  if (!unit || !unit.isAlive) return state;

  // C2: Only player faction units can be moved by the player
  if (unit.faction !== 'player') return state;

  // C2: Reject if unit has already moved
  if (unit.hasMoved) return state;

  // C2: Check if target is within movement range
  const moveRange = getMovementRange(state.grid, unitId);
  const targetKey = `${to.x},${to.y}`;
  if (!moveRange.has(targetKey)) return state;

  // Perform the grid move (sets hasMoved=true internally)
  const newGrid = gridMoveUnit(state.grid, unitId, to);
  return { ...state, grid: newGrid };
}

/**
 * End the current player turn.
 */
export function endPlayerTurn(state: CombatState): CombatState {
  if (state.turnPhase !== TurnPhase.PlayerAction) return state;

  let next: CombatState = {
    ...state,
    turnPhase: TurnPhase.EnemyTurn,
    canReplace: false,
  };

  next = executeEnemyTurn(next);
  next = checkBattleEnd(next);

  if (next.battleResult === 'ongoing') {
    next = startPlayerTurn(next);
  }

  return next;
}

/**
 * Replace a card from hand.
 */
export function replaceCard(state: CombatState, handIndex: number): CombatState {
  if (!canReplaceCheck(state)) return state;
  return checkBattleEnd(replaceCardFromHand(state, handIndex));
}

/**
 * Check if the battle has ended.
 */
export function checkBattleEnd(state: CombatState): CombatState {
  const allEnemiesDead = state.enemies.every(e => e.hp <= 0);
  const heroDead = state.hero.hp <= 0;

  if (allEnemiesDead) {
    return { ...state, battleResult: 'victory', turnPhase: TurnPhase.BattleEnd };
  }

  if (heroDead) {
    return { ...state, battleResult: 'defeat', turnPhase: TurnPhase.BattleEnd };
  }

  return state;
}

/**
 * Get the subset of cards in hand that the player can afford to play.
 */
export function getPlayableCards(state: CombatState): CombatCard[] {
  return state.hand.filter(c => c.definition.manaCost <= state.mana);
}

/**
 * Get valid target grid positions for a given card.
 * For attack cards: positions occupied by alive enemies.
 * For summon cards: empty positions adjacent to any friendly unit (hero + living summons).
 * For armor/skill/passive: empty array.
 */
export function getValidTargets(state: CombatState, card: CombatCard): GridPosition[] {
  switch (card.definition.type) {
    case CardType.Attack: {
      return state.enemies
        .filter(e => e.hp > 0)
        .map(e => {
          const unit = state.grid.units.get(e.unitId);
          return unit ? unit.position : null;
        })
        .filter((p): p is GridPosition => p !== null);
    }

    case CardType.Summon: {
      // M4: Check ALL tiles adjacent to any friendly unit (hero + all living summons)
      const validPositions: GridPosition[] = [];
      const friendlyUnits: GridUnit[] = [];

      const heroUnit = state.grid.units.get(state.hero.unitId);
      if (heroUnit && heroUnit.isAlive) friendlyUnits.push(heroUnit);

      for (const summon of state.summons) {
        const summonUnit = state.grid.units.get(summon.unitId);
        if (summonUnit && summonUnit.isAlive) friendlyUnits.push(summonUnit);
      }

      for (const unit of friendlyUnits) {
        const adjacent = getAdjacentPositions(unit.position, state.grid);
        for (const pos of adjacent) {
          if (!state.grid.tiles[pos.y][pos.x].occupiedBy &&
              !validPositions.some(p => p.x === pos.x && p.y === pos.y)) {
            validPositions.push(pos);
          }
        }
      }

      return validPositions;
    }

    default:
      return [];
  }
}

/**
 * Reset card instance counter (for deterministic tests).
 */
export function resetCardInstanceCounter(): void {
  // No-op: counter is now on CombatState.cardInstanceCounter
}

/**
 * Get a summon by unitId from the combat state.
 */
export function getSummonByUnitId(state: CombatState, unitId: string): CombatSummon | undefined {
  return state.summons.find(s => s.unitId === unitId);
}
