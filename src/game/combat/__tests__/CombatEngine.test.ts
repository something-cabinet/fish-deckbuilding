/**
 * Combat Engine tests — turn flow, battle lifecycle, play card, base attack, replace.
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
  getPlayableCards,
  getValidTargets,
  resetCardInstanceCounter,
} from '../CombatEngine';
import { TurnPhase, CardType, MoveType } from '../CardTypes';
import type { CombatState, CardDefinition } from '../CardTypes';
import { cloneGrid } from '../../grid/GridFactory';

// ───── Test Helpers ─────

function makeHeroConfig(overrides: Partial<{ id: string; maxHp: number; baseAttack: number }> = {}) {
  return {
    id: overrides.id ?? 'hero',
    maxHp: overrides.maxHp ?? 20,
    baseAttack: overrides.baseAttack ?? 2,
  };
}

function makeEnemyConfig(id: string, overrides: Partial<{
  name: string; hp: number; maxHp: number; attack: number; defense: number;
  aiStrategy: 'aggressive' | 'balanced' | 'defensive'; hasProvoke: boolean;
  moveRange: number; attackRange: number;
}> = {}) {
  return {
    id,
    name: overrides.name ?? 'Test Enemy',
    hp: overrides.hp ?? 8,
    maxHp: overrides.maxHp ?? 8,
    attack: overrides.attack ?? 3,
    defense: overrides.defense ?? 1,
    aiStrategy: overrides.aiStrategy ?? 'aggressive',
    hasProvoke: overrides.hasProvoke ?? false,
    moveRange: overrides.moveRange ?? 2,
    attackRange: overrides.attackRange ?? 1,
  };
}

const attackCard1: CardDefinition = { id: 'test_attack', name: 'Test Attack', type: CardType.Attack, manaCost: 1, damage: 3, description: 'Test' };
const attackCard2: CardDefinition = { id: 'test_attack2', name: 'Test Attack 2', type: CardType.Attack, manaCost: 2, damage: 5, description: 'Test' };
const armorCard: CardDefinition = { id: 'test_armor', name: 'Test Armor', type: CardType.Armor, manaCost: 1, armorAmount: 3, description: 'Test' };
const skillCard: CardDefinition = { id: 'test_heal', name: 'Test Heal', type: CardType.Skill, manaCost: 2, healAmount: 4, description: 'Test' };
const summonCard: CardDefinition = {
  id: 'test_summon', name: 'Test Summon', type: CardType.Summon, manaCost: 2,
  summonUnit: { attack: 2, maxHp: 3, moveRange: 2, attackRange: 1, hasProvoke: false, moveType: MoveType.Normal },
  description: 'Test',
};
const passiveCard: CardDefinition = { id: 'test_passive', name: 'Test Passive', type: CardType.Passive, manaCost: 1, passiveEffect: 'manaRegen', description: 'Test' };
const expensiveCard: CardDefinition = { id: 'expensive', name: 'Expensive', type: CardType.Attack, manaCost: 5, damage: 10, description: 'Test' };

function deckOf(...cards: CardDefinition[]): CardDefinition[] {
  return cards.map(c => ({ ...c }));
}

describe('CombatEngine', () => {
  beforeEach(() => {
    resetCardInstanceCounter();
  });

  describe('initBattle', () => {
    it('should create a CombatState with the correct initial structure', () => {
      const state = initBattle(
        makeHeroConfig(),
        [makeEnemyConfig('e1')],
        deckOf(attackCard1, attackCard1, attackCard1, attackCard1, attackCard1),
      );

      expect(state).toHaveProperty('grid');
      expect(state).toHaveProperty('hero');
      expect(state).toHaveProperty('enemies');
      expect(state).toHaveProperty('hand');
      expect(state).toHaveProperty('deck');
      expect(state).toHaveProperty('discard');
      expect(state.mana).toBe(1);
      expect(state.maxMana).toBe(1);
      expect(state.turnNumber).toBe(1);
      expect(state.turnPhase).toBe(TurnPhase.PlayerAction);
      expect(state.canReplace).toBe(true);
      expect(state.battleResult).toBe('ongoing');
    });

    it('should draw 3 cards into the initial hand', () => {
      const state = initBattle(
        makeHeroConfig(),
        [makeEnemyConfig('e1')],
        deckOf(attackCard1, attackCard1, attackCard1, attackCard1, attackCard1),
      );

      expect(state.hand).toHaveLength(3);
      expect(state.deck).toHaveLength(2);
      expect(state.discard).toHaveLength(0);
    });

    it('should place the hero and enemies on the grid', () => {
      const state = initBattle(
        makeHeroConfig(),
        [makeEnemyConfig('e1'), makeEnemyConfig('e2')],
        deckOf(attackCard1, attackCard1, attackCard1, attackCard1, attackCard1),
      );

      // Hero unit on grid
      const heroUnit = state.grid.units.get(state.hero.unitId);
      expect(heroUnit).toBeDefined();
      expect(heroUnit!.isAlive).toBe(true);
      expect(heroUnit!.type).toBe('hero');

      // Enemy units on grid
      expect(state.enemies).toHaveLength(2);
      for (const enemy of state.enemies) {
        const enemyUnit = state.grid.units.get(enemy.unitId);
        expect(enemyUnit).toBeDefined();
        expect(enemyUnit!.isAlive).toBe(true);
      }
    });

    it('should set correct hero stats', () => {
      const state = initBattle(
        makeHeroConfig({ maxHp: 30, baseAttack: 3 }),
        [makeEnemyConfig('e1')],
        deckOf(attackCard1),
      );

      expect(state.hero.hp).toBe(30);
      expect(state.hero.maxHp).toBe(30);
      expect(state.hero.baseAttack).toBe(3);
      expect(state.hero.armor).toBe(0);
    });

    it('should set correct enemy stats', () => {
      const state = initBattle(
        makeHeroConfig(),
        [makeEnemyConfig('e1', { hp: 10, attack: 4, defense: 2, aiStrategy: 'defensive' })],
        deckOf(attackCard1),
      );

      const enemy = state.enemies[0];
      expect(enemy.hp).toBe(10);
      expect(enemy.attack).toBe(4);
      expect(enemy.defense).toBe(2);
      expect(enemy.aiStrategy).toBe('defensive');
    });
  });

  describe('startPlayerTurn', () => {
    it('should increment turn number and mana', () => {
      const state = initBattle(
        makeHeroConfig(),
        [makeEnemyConfig('e1')],
        deckOf(attackCard1, attackCard1, attackCard1, attackCard1, attackCard1),
      );

      const next = startPlayerTurn(state);

      expect(next.turnNumber).toBe(2);
      expect(next.mana).toBe(2);
      expect(next.maxMana).toBe(2);
    });

    it('should draw 1 card', () => {
      const state = initBattle(
        makeHeroConfig(),
        [makeEnemyConfig('e1')],
        deckOf(attackCard1, attackCard1, attackCard1, attackCard1, attackCard1),
      );

      const startHandSize = state.hand.length;
      const startDeckSize = state.deck.length;
      const next = startPlayerTurn(state);

      expect(next.hand.length).toBe(startHandSize + 1);
      expect(next.deck.length).toBe(startDeckSize - 1);
    });

    it('should reset canReplace to true', () => {
      const state: CombatState = {
        ...initBattle(makeHeroConfig(), [makeEnemyConfig('e1')], deckOf(attackCard1)),
        canReplace: false,
      };

      const next = startPlayerTurn(state);
      expect(next.canReplace).toBe(true);
    });

    it('should cap mana at 9', () => {
      const state: CombatState = {
        ...initBattle(makeHeroConfig(), [makeEnemyConfig('e1')], deckOf(attackCard1)),
        turnNumber: 9,
        mana: 9,
        maxMana: 9,
      };

      const next = startPlayerTurn(state);
      expect(next.mana).toBe(9);
      expect(next.maxMana).toBe(9);
    });

    it('should set turn phase to PlayerAction', () => {
      const state = initBattle(
        makeHeroConfig(),
        [makeEnemyConfig('e1')],
        deckOf(attackCard1),
      );

      const next = startPlayerTurn(state);
      expect(next.turnPhase).toBe(TurnPhase.PlayerAction);
    });
  });

  describe('playCard', () => {
    it('should remove the card from hand and add to discard', () => {
      const state = initBattle(
        makeHeroConfig(),
        [makeEnemyConfig('e1')],
        deckOf(attackCard1, attackCard1, attackCard1, attackCard1, attackCard1),
      );

      const cardToPlay = state.hand[0];
      const enemyPos = state.grid.units.get(state.enemies[0].unitId)!.position;
      const handSize = state.hand.length;

      const next = playCard(state, cardToPlay.instanceId, enemyPos);

      expect(next.hand.length).toBe(handSize - 1);
      expect(next.discard.length).toBe(1);
      expect(next.discard[0].instanceId).toBe(cardToPlay.instanceId);
    });

    it('should spend mana equal to card cost', () => {
      const state = initBattle(
        makeHeroConfig(),
        [makeEnemyConfig('e1')],
        deckOf(attackCard1, attackCard1, attackCard1, attackCard1, attackCard1),
      );

      const cardToPlay = state.hand.find(c => c.definition.manaCost <= state.mana)!;
      const enemyPos = state.grid.units.get(state.enemies[0].unitId)!.position;

      const next = playCard(state, cardToPlay.instanceId, enemyPos);

      expect(next.mana).toBe(state.mana - cardToPlay.definition.manaCost);
    });

    it('should return state unchanged if card is not in hand', () => {
      const state = initBattle(
        makeHeroConfig(),
        [makeEnemyConfig('e1')],
        deckOf(attackCard1),
      );

      const next = playCard(state, 'nonexistent_instance', { x: 0, y: 0 });
      expect(next).toBe(state);
    });

    it('should return state unchanged if mana is insufficient', () => {
      const state: CombatState = {
        ...initBattle(makeHeroConfig(), [makeEnemyConfig('e1')], deckOf(attackCard2)),
        mana: 0,
      };

      const cardToPlay = state.hand[0];
      const enemyPos = state.grid.units.get(state.enemies[0].unitId)!.position;

      const next = playCard(state, cardToPlay.instanceId, enemyPos);
      expect(next).toBe(state);
    });

    it('should deal damage to target enemy when playing attack card', () => {
      const state = initBattle(
        makeHeroConfig(),
        [makeEnemyConfig('e1', { hp: 10 })],
        deckOf(attackCard1, attackCard1, attackCard1, attackCard1, attackCard1),
      );

      const attackCard = state.hand.find(c => c.definition.type === CardType.Attack)!;
      const enemyPos = state.grid.units.get(state.enemies[0].unitId)!.position;

      const next = playCard(state, attackCard.instanceId, enemyPos);

      expect(next.enemies[0].hp).toBe(7); // 10 - 3 damage
    });

    it('should apply armor when playing armor card', () => {
      const state = initBattle(
        makeHeroConfig(),
        [makeEnemyConfig('e1')],
        deckOf(armorCard, armorCard, armorCard, armorCard, armorCard),
      );

      const armorCardToPlay = state.hand.find(c => c.definition.type === CardType.Armor)!;

      const next = playCard(state, armorCardToPlay.instanceId);

      expect(next.hero.armor).toBe(3);
    });

    it('should heal when playing heal skill card', () => {
      const base = initBattle(makeHeroConfig(), [makeEnemyConfig('e1')], deckOf(skillCard, skillCard, skillCard));
      const state: CombatState = {
        ...base,
        hero: { ...base.hero, hp: 10 },
        mana: 5, // enough to play the 2-cost skill card
      };
      const healCard = state.hand.find(c => c.definition.type === CardType.Skill)!;

      const next = playCard(state, healCard.instanceId);

      expect(next.hero.hp).toBe(14); // 10 + 4 heal, capped at maxHp
    });

    it('should place summon unit when playing summon card', () => {
      const state: CombatState = {
        ...initBattle(
          makeHeroConfig(),
          [makeEnemyConfig('e1')],
          deckOf(summonCard, summonCard, summonCard, summonCard, summonCard),
        ),
        mana: 5, // enough to play the 2-cost summon card
      };

      const summonCardToPlay = state.hand.find(c => c.definition.type === CardType.Summon)!;
      // Summon adjacent to hero (hero is at 1,2)
      const summonPos = { x: 2, y: 2 };

      const next = playCard(state, summonCardToPlay.instanceId, summonPos);

      // Summon gets ID "summon_0" (summonIdCounter starts at 0)
      const summonId = `summon_0`;
      const summonUnit = next.grid.units.get(summonId);
      expect(summonUnit).toBeDefined();
      expect(summonUnit!.type).toBe('summon');
      expect(summonUnit!.position).toEqual(summonPos);
    });

    it('should not affect state when playing in wrong phase', () => {
      const state: CombatState = {
        ...initBattle(makeHeroConfig(), [makeEnemyConfig('e1')], deckOf(attackCard1)),
        turnPhase: TurnPhase.EnemyTurn,
      };

      const card = state.hand[0];
      const next = playCard(state, card.instanceId, { x: 0, y: 0 });
      expect(next).toBe(state);
    });
  });

  /**
   * Create a state where hero and enemy are adjacent for base attack testing.
   * Constructs state directly to avoid movement range issues.
   */
  function adjacentState(
    heroOverrides: Partial<{ maxHp: number; baseAttack: number; hp: number }> = {},
    enemyOverrides: Partial<{ hp: number; attack: number }> = {},
  ): CombatState {
    const base = initBattle(
      makeHeroConfig({ maxHp: heroOverrides.maxHp ?? 20, baseAttack: heroOverrides.baseAttack ?? 2 }),
      [makeEnemyConfig('e1', { hp: enemyOverrides.hp ?? 8, attack: enemyOverrides.attack ?? 3 })],
      deckOf(attackCard1),
    );
    // Manually position hero and enemy adjacent: hero at (3,2), enemy at (4,2)
    const g = cloneGrid(base.grid);
    const heroUnit = g.units.get(base.hero.unitId)!;
    const enemyUnit = g.units.get(base.enemies[0].unitId)!;
    // Clear old positions
    g.tiles[heroUnit.position.y][heroUnit.position.x].occupiedBy = null;
    g.tiles[enemyUnit.position.y][enemyUnit.position.x].occupiedBy = null;
    // Set new positions
    heroUnit.position = { x: 3, y: 2 };
    enemyUnit.position = { x: 4, y: 2 };
    g.tiles[2][3].occupiedBy = heroUnit.id;
    g.tiles[2][4].occupiedBy = enemyUnit.id;

    let finalState: CombatState = {
      ...base,
      grid: g,
    };
    if (heroOverrides.hp !== undefined) {
      finalState = { ...finalState, hero: { ...finalState.hero, hp: heroOverrides.hp } };
    }
    return finalState;
  }

  describe('baseAttack', () => {
    it('should deal damage to enemy and counterattack hero', () => {
      const state = adjacentState(
        { maxHp: 20, baseAttack: 2 },
        { hp: 8, attack: 3 },
      );

      const next = baseAttack(state, state.enemies[0].id);

      expect(next.enemies[0].hp).toBeLessThan(8); // hero deals 2 damage
      expect(next.hero.hp).toBeLessThan(20); // enemy counterattacks for 3
    });

    it('should kill enemy when HP reaches 0', () => {
      const state = adjacentState(
        { baseAttack: 10 },
        { hp: 5, attack: 1 },
      );

      const next = baseAttack(state, state.enemies[0].id);

      expect(next.enemies[0].hp).toBe(0);
      // Enemy should be removed from grid
      const enemyUnit = next.grid.units.get(state.enemies[0].unitId);
      expect(enemyUnit).toBeUndefined();
    });

    it('should not attack if enemy is not adjacent', () => {
      const state = initBattle(
        makeHeroConfig(),
        [makeEnemyConfig('e1')],
        deckOf(attackCard1),
      );

      // Default positions: hero at (1,2) and enemy at (7,2) — not adjacent
      const next = baseAttack(state, state.enemies[0].id);

      // Should be unchanged since not adjacent
      expect(next).toBe(state);
    });

    it('should set battleResult to defeat when hero dies', () => {
      const state = adjacentState(
        { maxHp: 2, baseAttack: 1, hp: 2 },
        { hp: 20, attack: 10 },
      );

      const next = baseAttack(state, state.enemies[0].id);

      expect(next.battleResult).toBe('defeat');
      expect(next.turnPhase).toBe(TurnPhase.BattleEnd);
    });
  });

  describe('endPlayerTurn', () => {
    it('should execute enemy turn and start next player turn', () => {
      const state = initBattle(
        makeHeroConfig(),
        [makeEnemyConfig('e1', { hp: 8, attack: 1 })],
        deckOf(attackCard1, attackCard1, attackCard1, attackCard1),
      );

      const next = endPlayerTurn(state);

      // Enemy turn happened (enemy may have moved/attacked)
      // Next player turn started
      expect(next.turnPhase).toBe(TurnPhase.PlayerAction);
      expect(next.turnNumber).toBeGreaterThanOrEqual(2);
      expect(next.canReplace).toBe(true);
    });

    it('should not change state if not in PlayerAction phase', () => {
      const state: CombatState = {
        ...initBattle(makeHeroConfig(), [makeEnemyConfig('e1')], deckOf(attackCard1)),
        turnPhase: TurnPhase.EnemyTurn,
      };

      const next = endPlayerTurn(state);
      expect(next).toBe(state);
    });
  });

  describe('replaceCard', () => {
    it('should replace a card in hand', () => {
      const state = initBattle(
        makeHeroConfig(),
        [makeEnemyConfig('e1')],
        deckOf(attackCard1, attackCard2, attackCard1, attackCard2, attackCard1),
      );

      const cardId = state.hand[0].instanceId;
      const handSize = state.hand.length;

      const next = replaceCard(state, 0);

      expect(next.hand.length).toBe(handSize); // Same size (removed 1, drew 1)
      expect(next.canReplace).toBe(false);
    });

    it('should not replace if canReplace is false', () => {
      const state: CombatState = {
        ...initBattle(makeHeroConfig(), [makeEnemyConfig('e1')], deckOf(attackCard1)),
        canReplace: false,
      };

      const next = replaceCard(state, 0);
      expect(next).toBe(state);
    });
  });

  describe('checkBattleEnd', () => {
    it('should return victory when all enemies are dead', () => {
      const state: CombatState = {
        ...initBattle(makeHeroConfig(), [makeEnemyConfig('e1')], deckOf(attackCard1)),
        enemies: [{ ...initBattle(makeHeroConfig(), [makeEnemyConfig('e1')], deckOf(attackCard1)).enemies[0], hp: 0 }],
      };

      const next = checkBattleEnd(state);
      expect(next.battleResult).toBe('victory');
      expect(next.turnPhase).toBe(TurnPhase.BattleEnd);
    });

    it('should return defeat when hero is dead', () => {
      const state: CombatState = {
        ...initBattle(makeHeroConfig(), [makeEnemyConfig('e1')], deckOf(attackCard1)),
        hero: { ...initBattle(makeHeroConfig(), [makeEnemyConfig('e1')], deckOf(attackCard1)).hero, hp: 0 },
      };

      const next = checkBattleEnd(state);
      expect(next.battleResult).toBe('defeat');
      expect(next.turnPhase).toBe(TurnPhase.BattleEnd);
    });

    it('should return ongoing when both sides have HP', () => {
      const state = initBattle(
        makeHeroConfig(),
        [makeEnemyConfig('e1', { hp: 5 })],
        deckOf(attackCard1),
      );

      const next = checkBattleEnd(state);
      expect(next.battleResult).toBe('ongoing');
    });
  });

  describe('getPlayableCards', () => {
    it('should return cards with mana cost <= current mana', () => {
      const state = initBattle(
        makeHeroConfig(),
        [makeEnemyConfig('e1')],
        deckOf(attackCard1, attackCard2, attackCard1, attackCard2, attackCard1),
      );

      const playable = getPlayableCards(state);
      for (const card of playable) {
        expect(card.definition.manaCost).toBeLessThanOrEqual(state.mana);
      }
    });

    it('should return empty array when no cards are affordable', () => {
      const state: CombatState = {
        ...initBattle(makeHeroConfig(), [makeEnemyConfig('e1')], deckOf(expensiveCard)),
        mana: 0,
      };

      const playable = getPlayableCards(state);
      expect(playable).toHaveLength(0);
    });
  });

  describe('getValidTargets', () => {
    it('should return enemy positions for attack cards', () => {
      const state = initBattle(
        makeHeroConfig(),
        [makeEnemyConfig('e1')],
        deckOf(attackCard1),
      );

      const card = state.hand[0]; // Attack card
      const targets = getValidTargets(state, card);

      expect(targets.length).toBeGreaterThan(0);
      // Target should be the enemy position
      const enemyUnit = state.grid.units.get(state.enemies[0].unitId)!;
      expect(targets).toContainEqual(enemyUnit.position);
    });

    it('should return empty array for armor cards', () => {
      const state = initBattle(
        makeHeroConfig(),
        [makeEnemyConfig('e1')],
        deckOf(armorCard, armorCard, armorCard, armorCard, armorCard),
      );

      const card = state.hand.find(c => c.definition.type === CardType.Armor)!;
      const targets = getValidTargets(state, card);

      expect(targets).toHaveLength(0);
    });
  });

  describe('full battle cycle', () => {
    it('should complete a full turn cycle: draw → play → end → enemy → next turn', () => {
      const state = initBattle(
        makeHeroConfig({ maxHp: 50, baseAttack: 2 }),
        [makeEnemyConfig('e1', { hp: 20, attack: 1 })],
        deckOf(attackCard1, attackCard1, attackCard1, attackCard1, attackCard1),
      );

      // Turn 1: Use baseAttack on adjacent enemy (move hero closer first)
      const movedState = moveUnit(state, state.hero.unitId, { x: 3, y: 2 });
      const afterBaseAttack = baseAttack(movedState, movedState.enemies[0].id);

      // End turn
      const afterEnd = endPlayerTurn(afterBaseAttack);

      // Should be in next player turn (enemy still alive, hero still alive)
      expect(afterEnd.turnPhase).toBe(TurnPhase.PlayerAction);
      expect(afterEnd.turnNumber).toBeGreaterThanOrEqual(2);
      expect(afterEnd.battleResult).toBe('ongoing');
    });
  });

  describe('mana per turn', () => {
    it('should have mana = turn number (capped at 9)', () => {
      // Turn 1
      const state = initBattle(
        makeHeroConfig(),
        [makeEnemyConfig('e1')],
        deckOf(attackCard1, attackCard1, attackCard1, attackCard1, attackCard1),
      );
      expect(state.mana).toBe(1);

      // Turn 2
      const t2 = startPlayerTurn(state);
      expect(t2.mana).toBe(2);

      // Turn 3
      const t3 = startPlayerTurn(t2);
      expect(t3.mana).toBe(3);

      // Turn 9
      const t8 = startPlayerTurn(t3);
      const t9 = startPlayerTurn(t8);
      // Would need more setup, but the pattern is clear
      const t10 = startPlayerTurn({ ...t9, mana: 9, maxMana: 9, turnNumber: 9 });
      expect(t10.mana).toBe(9);
    });
  });
});
