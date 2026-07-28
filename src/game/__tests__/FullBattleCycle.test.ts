/**
 * Full Battle Cycle Integration Tests (Phase 5).
 *
 * End-to-end tests that script full battle cycles through the CombatEngine.
 * Covers victory, defeat, card variety, replace, mana progression,
 * summon lifecycle, armor expiry, and enemy AI strategy variation.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  initBattle,
  startPlayerTurn,
  playCard,
  baseAttack,
  moveUnit,
  endPlayerTurn,
  replaceCard,
  checkBattleEnd,
} from '../combat/CombatEngine';
import { TurnPhase, CardType, MoveType } from '../combat/CardTypes';
import type { CombatState, CardDefinition } from '../combat/CardTypes';
import { cloneGrid } from '../grid/GridFactory';
import { damageWithArmor } from '../combat/ArmorSystem';
import { executeEnemyTurn, getEnemyAttackTarget } from '../combat/EnemyAI';

// ───── Test Helpers ─────

const attackCard1: CardDefinition = { id: 'test_atk1', name: 'Slash', type: CardType.Attack, manaCost: 1, damage: 3, description: 'Deal 3 damage' };
const attackCard2: CardDefinition = { id: 'test_atk2', name: 'Heavy Slash', type: CardType.Attack, manaCost: 2, damage: 5, description: 'Deal 5 damage' };
const armorCard: CardDefinition = { id: 'test_armor', name: 'Shield', type: CardType.Armor, manaCost: 1, armorAmount: 3, description: 'Gain 3 armor' };
const skillCard: CardDefinition = { id: 'test_heal', name: 'Heal', type: CardType.Skill, manaCost: 2, healAmount: 4, description: 'Heal 4' };
const summonCard: CardDefinition = {
  id: 'test_summon', name: 'Minnow', type: CardType.Summon, manaCost: 2,
  summonUnit: { attack: 2, maxHp: 3, moveRange: 2, attackRange: 1, hasProvoke: false, moveType: MoveType.Normal },
  description: 'Summon minnow',
};

function heroCfg(overrides: Partial<{ id: string; maxHp: number; baseAttack: number }> = {}) {
  return { id: overrides.id ?? 'hero', maxHp: overrides.maxHp ?? 30, baseAttack: overrides.baseAttack ?? 2 };
}

function enemyCfg(id: string, overrides: Partial<{
  name: string; hp: number; maxHp: number; attack: number; defense: number;
  aiStrategy: 'aggressive' | 'balanced' | 'defensive';
  moveRange: number; attackRange: number;
}> = {}) {
  return {
    id,
    name: overrides.name ?? 'Enemy',
    hp: overrides.hp ?? 10,
    maxHp: overrides.maxHp ?? 10,
    attack: overrides.attack ?? 2,
    defense: overrides.defense ?? 1,
    aiStrategy: overrides.aiStrategy ?? 'aggressive',
    moveRange: overrides.moveRange ?? 2,
    attackRange: overrides.attackRange ?? 1,
  };
}

/** Create a combat state with hero and enemy positioned adjacent for base attack testing. */
function adjacentState(heroMaxHp = 30, enemyHp = 10, heroAttack = 2): CombatState {
  const base = initBattle(
    heroCfg({ maxHp: heroMaxHp, baseAttack: heroAttack }),
    [enemyCfg('e1', { hp: enemyHp })],
    [attackCard1, attackCard1, attackCard1, attackCard1, attackCard1],
  );
  const g = cloneGrid(base.grid);
  const heroUnit = g.units.get(base.hero.unitId)!;
  const enemyUnit = g.units.get(base.enemies[0].unitId)!;
  g.tiles[heroUnit.position.y][heroUnit.position.x].occupiedBy = null;
  g.tiles[enemyUnit.position.y][enemyUnit.position.x].occupiedBy = null;
  heroUnit.position = { x: 3, y: 2 };
  enemyUnit.position = { x: 4, y: 2 };
  g.tiles[2][3].occupiedBy = heroUnit.id;
  g.tiles[2][4].occupiedBy = enemyUnit.id;
  return { ...base, grid: g };
}

describe('Full Battle Cycle Integration Tests', () => {
  // ───── Full Victory Cycle ─────
  describe('Full Victory Cycle', () => {
    it('should complete a full victory cycle by dealing enough damage to kill the enemy', () => {
      let state = adjacentState(50, 4, 5);
      let afterAttack = baseAttack(state, state.enemies[0].id);

      // Hero attack of 5 vs 4 HP enemy → victory
      expect(afterAttack.battleResult).toBe('victory');
      expect(afterAttack.turnPhase).toBe(TurnPhase.BattleEnd);
      expect(afterAttack.enemies[0].hp).toBe(0);
    });
  });

  // ───── Full Defeat Cycle ─────
  describe('Full Defeat Cycle', () => {
    it('should result in defeat when hero does nothing and enemies kill them', () => {
      let state = initBattle(
        heroCfg({ maxHp: 8, baseAttack: 1 }),
        [enemyCfg('e1', { hp: 30, attack: 5 })],
        [armorCard, armorCard, armorCard],
      );

      // Position hero adjacent to enemy so enemy can attack
      const g = cloneGrid(state.grid);
      const heroUnit = g.units.get(state.hero.unitId)!;
      const enemyUnit = g.units.get(state.enemies[0].unitId)!;
      g.tiles[heroUnit.position.y][heroUnit.position.x].occupiedBy = null;
      g.tiles[enemyUnit.position.y][enemyUnit.position.x].occupiedBy = null;
      heroUnit.position = { x: 3, y: 2 };
      enemyUnit.position = { x: 4, y: 2 };
      g.tiles[2][3].occupiedBy = heroUnit.id;
      g.tiles[2][4].occupiedBy = enemyUnit.id;
      state = { ...state, grid: g };

      // Keep ending turns — enemy attacks each turn (5 dmg vs 8 HP = ~2 turns)
      let turnCount = 0;
      while (state.battleResult === 'ongoing' && turnCount < 20) {
        state = endPlayerTurn(state);
        turnCount++;
      }

      expect(state.battleResult).toBe('defeat');
      expect(state.hero.hp).toBe(0);
    });
  });

  // ───── Card Play Variety ─────
  describe('Card Play Variety', () => {
    it('should play Attack card and deal damage', () => {
      let state = initBattle(
        heroCfg({ maxHp: 30 }),
        [enemyCfg('e1', { hp: 20 })],
        [attackCard1, attackCard1, attackCard1, attackCard1, attackCard1],
      );

      state = { ...state, mana: 5, maxMana: 5 };

      const atkCard = state.hand.find(c => c.definition.type === CardType.Attack)!;
      const enemyPos = state.grid.units.get(state.enemies[0].unitId)!.position;
      state = playCard(state, atkCard.instanceId, enemyPos);
      expect(state.enemies[0].hp).toBe(17); // 20 - 3
    });

    it('should play Armor card and gain armor', () => {
      // Use a deck where all 5 cards are armor cards, so we're guaranteed to have one in hand
      let state = initBattle(
        heroCfg({ maxHp: 30 }),
        [enemyCfg('e1', { hp: 20 })],
        [armorCard, armorCard, armorCard, armorCard, armorCard],
      );

      state = { ...state, mana: 5, maxMana: 5 };

      const armCard = state.hand.find(c => c.definition.type === CardType.Armor)!;
      expect(armCard).toBeDefined();
      state = playCard(state, armCard.instanceId);
      expect(state.hero.armor).toBe(3);
    });

    it('should play Skill card and heal', () => {
      let state = initBattle(
        heroCfg({ maxHp: 30 }),
        [enemyCfg('e1', { hp: 20 })],
        [skillCard, skillCard, skillCard, skillCard, skillCard],
      );
      state = { ...state, mana: 5, maxMana: 5 };
      state.hero = { ...state.hero, hp: 20 };

      const healCard = state.hand.find(c => c.definition.type === CardType.Skill)!;
      expect(healCard).toBeDefined();
      state = playCard(state, healCard.instanceId);
      expect(state.hero.hp).toBe(24); // 20 + 4
    });

    it('should play Summon card and place unit on grid', () => {
      let state = initBattle(
        heroCfg({ maxHp: 30 }),
        [enemyCfg('e1', { hp: 20 })],
        [summonCard, summonCard, summonCard, summonCard, summonCard],
      );
      state = { ...state, mana: 5, maxMana: 5 };

      const sumCard = state.hand.find(c => c.definition.type === CardType.Summon)!;
      expect(sumCard).toBeDefined();
      state = playCard(state, sumCard.instanceId, { x: 2, y: 2 });

      const summonUnit = state.grid.units.get('summon_0');
      expect(summonUnit).toBeDefined();
      expect(summonUnit!.position).toEqual({ x: 2, y: 2 });
      expect(state.summons).toHaveLength(1);
    });
  });

  // ───── Replace Mechanic ─────
  describe('Replace Mechanic', () => {
    it('should replace a card in hand (remove old, draw new)', () => {
      const state = initBattle(
        heroCfg(),
        [enemyCfg('e1')],
        [attackCard1, attackCard1, attackCard1, attackCard2, attackCard1],
      );

      const originalHandSize = state.hand.length;
      const next = replaceCard(state, 0);

      expect(next.hand.length).toBe(originalHandSize);
      expect(next.canReplace).toBe(false);
    });

    it('should not replace twice in same turn', () => {
      let state = initBattle(
        heroCfg(),
        [enemyCfg('e1')],
        [attackCard1, attackCard1, attackCard1, attackCard1],
      );

      state = replaceCard(state, 0);
      const again = replaceCard(state, 0);
      expect(again).toBe(state);
    });

    it('should reset canReplace on new turn', () => {
      let state = initBattle(
        heroCfg(),
        [enemyCfg('e1')],
        [attackCard1, attackCard1, attackCard1, attackCard1],
      );

      state = replaceCard(state, 0);
      expect(state.canReplace).toBe(false);

      state = startPlayerTurn(state);
      expect(state.canReplace).toBe(true);
    });
  });

  // ───── Mana Progression ─────
  describe('Mana Progression', () => {
    it('should increment mana correctly over turns capped at 9', () => {
      let state = initBattle(
        heroCfg(),
        [enemyCfg('e1')],
        [attackCard1, attackCard1, attackCard1, attackCard1],
      );

      expect(state.mana).toBe(1); // Turn 1

      state = startPlayerTurn(state);
      expect(state.turnNumber).toBe(2);
      expect(state.mana).toBe(2);

      state = startPlayerTurn(state);
      expect(state.turnNumber).toBe(3);
      expect(state.mana).toBe(3);

      // Jump to turn 9
      state = { ...state, turnNumber: 8, mana: 8, maxMana: 8 };
      state = startPlayerTurn(state);
      expect(state.turnNumber).toBe(9);
      expect(state.mana).toBe(9);

      // Turn 10 — capped at 9
      state = startPlayerTurn(state);
      expect(state.turnNumber).toBe(10);
      expect(state.mana).toBe(9);
    });
  });

  // ───── Summon Lifecycle ─────
  describe('Summon Lifecycle', () => {
    it('should place summon on grid and allow damage', () => {
      let state = initBattle(
        heroCfg({ maxHp: 30 }),
        [enemyCfg('e1', { hp: 20 })],
        [summonCard, summonCard, summonCard, summonCard, summonCard],
      );
      state = { ...state, mana: 5 };
      const sumCard = state.hand.find(c => c.definition.type === CardType.Summon)!;
      expect(sumCard).toBeDefined();
      state = playCard(state, sumCard.instanceId, { x: 2, y: 2 });

      // Verify summon on grid
      const summonUnit = state.grid.units.get('summon_0');
      expect(summonUnit).toBeDefined();
      expect(summonUnit!.isAlive).toBe(true);
      expect(state.summons).toHaveLength(1);

      // Damage the summon
      const result = damageWithArmor(state, 'summon_0', 2);
      expect(result.state.summons[0].hp).toBe(1); // maxHp 3 - 2 = 1
    });

    it('should remove dead summon from grid and summons array', () => {
      let state = initBattle(
        heroCfg({ maxHp: 30 }),
        [enemyCfg('e1', { hp: 20 })],
        [summonCard, summonCard, summonCard, summonCard, summonCard],
      );
      state = { ...state, mana: 5 };
      const sumCard = state.hand.find(c => c.definition.type === CardType.Summon)!;
      expect(sumCard).toBeDefined();
      state = playCard(state, sumCard.instanceId, { x: 2, y: 2 });

      // Kill the summon (3 HP) 
      const result = damageWithArmor(state, 'summon_0', 3);
      expect(result.state.summons).toHaveLength(0);
      expect(result.state.grid.units.get('summon_0')).toBeUndefined();
    });
  });

  // ───── Armor Expire ─────
  describe('Armor Expire', () => {
    it('should absorb damage with armor and reduce armor amount', () => {
      let state = initBattle(
        heroCfg(),
        [enemyCfg('e1')],
        [armorCard, armorCard, armorCard, armorCard, armorCard],
      );
      state = { ...state, mana: 5 };
      const armCard = state.hand.find(c => c.definition.type === CardType.Armor)!;
      expect(armCard).toBeDefined();
      state = playCard(state, armCard.instanceId);
      expect(state.hero.armor).toBe(3);

      // Damage with armor absorption
      const result = damageWithArmor(state, state.hero.unitId, 5);
      expect(result.state.hero.armor).toBe(0); // 3 absorbed
      expect(result.state.hero.hp).toBe(state.hero.hp - 2); // 2 HP damage
      expect(result.actualDamage).toBe(2);
    });
  });

  // ───── Enemy AI Variety ─────
  describe('Enemy AI Strategy', () => {
    it('aggressive enemies should move toward hero', () => {
      const state = initBattle(
        heroCfg(),
        [enemyCfg('aggro_e', { aiStrategy: 'aggressive', moveRange: 5 })],
        [attackCard1, attackCard1, attackCard1, attackCard1],
      );

      const enemyUnit = state.grid.units.get(state.enemies[0].unitId)!;
      const heroUnit = state.grid.units.get(state.hero.unitId)!;
      const initialDist = Math.abs(enemyUnit.position.x - heroUnit.position.x) +
                          Math.abs(enemyUnit.position.y - heroUnit.position.y);

      const afterEnemy = executeEnemyTurn({ ...state, turnPhase: TurnPhase.EnemyTurn as any });
      const afterEnemyUnit = afterEnemy.grid.units.get(state.enemies[0].unitId);
      if (afterEnemyUnit) {
        const afterDist = Math.abs(afterEnemyUnit.position.x - heroUnit.position.x) +
                          Math.abs(afterEnemyUnit.position.y - heroUnit.position.y);
        expect(afterDist).toBeLessThanOrEqual(initialDist);
      }
    });

    it('defensive enemies should hold position when hero is far', () => {
      const state = initBattle(
        heroCfg(),
        [enemyCfg('def_e', { aiStrategy: 'defensive', moveRange: 5 })],
        [attackCard1, attackCard1, attackCard1, attackCard1],
      );

      const enemyUnit = state.grid.units.get(state.enemies[0].unitId)!;
      const beforePos = { ...enemyUnit.position };

      const afterEnemy = executeEnemyTurn({ ...state, turnPhase: TurnPhase.EnemyTurn as any });
      const afterEnemyUnit = afterEnemy.grid.units.get(state.enemies[0].unitId);
      if (afterEnemyUnit) {
        // Hero at (1,2), enemy at (7,2) — dist 6 > 3, defensive should not move
        expect(afterEnemyUnit.position).toEqual(beforePos);
      }
    });

    it('aggressive AI should prefer hero over summons when both are in attack range', () => {
      let state = initBattle(
        heroCfg({ maxHp: 30 }),
        [enemyCfg('aggro_e', { aiStrategy: 'aggressive', attack: 2, attackRange: 9 })],
        [summonCard, summonCard, summonCard, summonCard, summonCard],
      );
      state = { ...state, mana: 5 };
      const sumCard = state.hand.find(c => c.definition.type === CardType.Summon)!;
      expect(sumCard).toBeDefined();

      // Place a summon adjacent to the enemy at (7,1) — enemy is at (7,2)
      state = playCard(state, sumCard.instanceId, { x: 7, y: 1 });

      // Now both hero (at 1,2) and summon (at 7,1) are within attack range (9)
      const target = getEnemyAttackTarget(state, state.enemies[0]);
      // Aggressive should prefer hero
      expect(target).toBe(state.hero.unitId);
    });

    it('balanced enemies should consider both hero and summons as targets', () => {
      let state = initBattle(
        heroCfg({ maxHp: 30 }),
        [enemyCfg('bal_e', { aiStrategy: 'balanced', attack: 2, attackRange: 9 })],
        [summonCard, summonCard, summonCard, summonCard, summonCard],
      );
      state = { ...state, mana: 5 };
      const sumCard = state.hand.find(c => c.definition.type === CardType.Summon)!;
      expect(sumCard).toBeDefined();
      state = playCard(state, sumCard.instanceId, { x: 6, y: 2 });

      // Balanced should return some target (either hero or summon)
      const target = getEnemyAttackTarget(state, state.enemies[0]);
      expect(target).toBeTruthy();
      expect([state.hero.unitId, 'summon_0']).toContain(target);
    });
  });

  // ───── End-to-End Battle Lifecycle ─────
  describe('End-to-End Battle Lifecycle', () => {
    it('should flow PlayerAction → EnemyTurn → PlayerAction cycles', () => {
      let state = initBattle(
        heroCfg({ maxHp: 50, baseAttack: 2 }),
        [enemyCfg('e1', { hp: 20, attack: 1 })],
        [attackCard1, attackCard1, attackCard1, attackCard1],
      );

      expect(state.turnPhase).toBe(TurnPhase.PlayerAction);
      expect(state.turnNumber).toBe(1);

      state = endPlayerTurn(state);
      expect(state.turnPhase).toBe(TurnPhase.PlayerAction);
      expect(state.turnNumber).toBe(2);

      state = endPlayerTurn(state);
      expect(state.turnPhase).toBe(TurnPhase.PlayerAction);
      expect(state.turnNumber).toBe(3);
    });
  });
});
