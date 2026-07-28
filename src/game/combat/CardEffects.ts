/**
 * Card effect resolution for the tactical combat engine.
 *
 * Each function resolves a specific card type's effect on the combat state.
 * Pure functions: state-in, state-out.
 */
import type { CombatState, CombatCard, CombatSummon } from './CardTypes';
import { CardType } from './CardTypes';
import type { GridPosition, GridUnit } from '../grid/GridTypes';
import { damageWithArmor, applyArmor } from './ArmorSystem';
import { placeUnit, cloneGrid } from '../grid/GridFactory';
import { getChebyshevDistance } from '../grid/GridMovement';
import { areAdjacent } from '../grid/GridAttack';

// ───── Helpers ─────

function findEnemyAt(state: CombatState, pos: GridPosition): CombatState['enemies'][number] | null {
  const unitId = state.grid.tiles[pos.y]?.[pos.x]?.occupiedBy;
  if (!unitId) return null;
  return state.enemies.find(e => e.unitId === unitId) ?? null;
}

// ───── Card Resolvers ─────

/**
 * Resolve an Attack card effect.
 * Deals damage to the enemy at targetPos. If isAoE, damages all enemies within aoeRadius.
 */
export function resolveAttackCard(state: CombatState, card: CombatCard, targetPos: GridPosition): CombatState {
  const def = card.definition;
  const damage = def.damage ?? 0;
  let nextState = state;

  if (def.isAoE) {
    const radius = def.aoeRadius ?? 1;
    for (const enemy of nextState.enemies) {
      const gridUnit = nextState.grid.units.get(enemy.unitId);
      if (!gridUnit || !gridUnit.isAlive) continue;
      const dist = getChebyshevDistance(gridUnit.position, targetPos);
      if (dist <= radius) {
        const result = damageWithArmor(nextState, enemy.unitId, damage);
        nextState = result.state;
      }
    }
  } else {
    const targetEnemy = findEnemyAt(nextState, targetPos);
    if (!targetEnemy) return nextState;
    if (targetEnemy.hp <= 0) return nextState;

    const result = damageWithArmor(nextState, targetEnemy.unitId, damage);
    nextState = result.state;
  }

  // Remove dead enemies from grid
  for (const enemy of state.enemies) {
    const updatedEnemy = nextState.enemies.find(e => e.id === enemy.id);
    if (updatedEnemy && updatedEnemy.hp <= 0) {
      const gridUnit = nextState.grid.units.get(enemy.unitId);
      if (gridUnit && gridUnit.isAlive) {
        const g = cloneGrid(nextState.grid);
        g.tiles[gridUnit.position.y][gridUnit.position.x].occupiedBy = null;
        g.units.delete(enemy.unitId);
        nextState = { ...nextState, grid: g };
      }
    }
  }

  return nextState;
}

/**
 * Resolve an Armor card effect.
 */
export function resolveArmorCard(state: CombatState, card: CombatCard): CombatState {
  const amount = card.definition.armorAmount ?? 0;
  if (amount <= 0) return state;
  return applyArmor(state, state.hero.unitId, amount, 1);
}

/**
 * Resolve a Skill card effect.
 */
export function resolveSkillCard(state: CombatState, card: CombatCard, _targetPos?: GridPosition): CombatState {
  const def = card.definition;
  let nextState = state;

  if (def.healAmount && def.healAmount > 0) {
    const newHp = Math.min(nextState.hero.maxHp, nextState.hero.hp + def.healAmount);
    nextState = { ...nextState, hero: { ...nextState.hero, hp: newHp } };
  }

  if (def.buffAttack && def.buffAttack > 0) {
    nextState = {
      ...nextState,
      hero: { ...nextState.hero, baseAttack: nextState.hero.baseAttack + def.buffAttack },
    };
  }

  if (def.buffArmor && def.buffArmor > 0) {
    nextState = applyArmor(nextState, nextState.hero.unitId, def.buffArmor, 1);
  }

  return nextState;
}

/**
 * Resolve a Summon card effect.
 * C4: Creates CombatSummon in state, uses summonIdCounter for ID generation.
 */
export function resolveSummonCard(state: CombatState, card: CombatCard, targetPos: GridPosition): CombatState {
  const summonDef = card.definition.summonUnit;
  if (!summonDef) return state;

  const tile = state.grid.tiles[targetPos.y]?.[targetPos.x];
  if (!tile || tile.occupiedBy !== null) return state;

  // Must be adjacent to hero or existing friendly summon
  const heroUnit = state.grid.units.get(state.hero.unitId);
  if (!heroUnit) return state;

  const isAdjacentToHero = areAdjacent(heroUnit.position, targetPos);
  const isAdjacentToSummon = state.summons.some(s => {
    const u = state.grid.units.get(s.unitId);
    return u && u.isAlive && areAdjacent(u.position, targetPos);
  });

  if (!isAdjacentToHero && !isAdjacentToSummon) return state;

  // Create summon unit — use summonIdCounter for unique ID
  const summonIndex = state.summonIdCounter;
  const summonUnitId = `summon_${summonIndex}`;

  const summonUnit: GridUnit = {
    id: summonUnitId,
    type: 'summon',
    faction: 'player',
    position: { ...targetPos },
    moveType: summonDef.moveType,
    moveRange: summonDef.moveRange,
    attackRange: summonDef.attackRange,
    hasProvoke: summonDef.hasProvoke,
    hasActed: false,
    hasMoved: false,
    hasAttacked: false,
    isAlive: true,
  };

  // Create CombatSummon with its own HP tracking
  const combatSummon: CombatSummon = {
    id: `combat_summon_${summonIndex}`,
    unitId: summonUnitId,
    hp: summonDef.maxHp,
    maxHp: summonDef.maxHp,
    attack: summonDef.attack,
  };

  // Place on grid
  const newGrid = placeUnit(cloneGrid(state.grid), summonUnit);

  return {
    ...state,
    grid: newGrid,
    summons: [...state.summons, combatSummon],
    summonIdCounter: state.summonIdCounter + 1,
  };
}

/**
 * Resolve a Passive card effect.
 * M1: Actually implement passive effects — stores them in CombatState.passives.
 */
export function resolvePassiveCard(state: CombatState, card: CombatCard): CombatState {
  const def = card.definition;
  const effect = def.passiveEffect;

  if (!effect) return state;

  // Check if this passive is already active
  const alreadyActive = state.passives.some(
    p => p.cardId === card.id && p.effect === effect,
  );
  if (alreadyActive) return state;

  return {
    ...state,
    passives: [...state.passives, { cardId: card.id, effect }],
  };
}
