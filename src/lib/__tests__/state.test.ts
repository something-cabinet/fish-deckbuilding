/**
 * Tests for game state management — handleDefeat, resetGame, and state preservation.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  gameState,
  resetGame,
  handleDefeat,
  addGold,
  addToDeck,
  completeZone,
  unlockZone,
  setScreen,
} from '../state.svelte';

describe('handleDefeat', () => {
  // Reset game state before each test
  beforeEach(() => {
    resetGame();
    // Start a run-like state: set screen to battle, give gold + deck + map progress
    setScreen('battle');
    addGold(100);
    addToDeck('card_bite');
    addToDeck('card_shell');
    addToDeck('card_dash');
    unlockZone('zone_reef');
    unlockZone('zone_trench');
    completeZone('zone_reef');
    // Set HP low as if after a tough fight
    gameState.run.heroHp = 5;
  });

  it('should set screen to death', () => {
    handleDefeat();
    expect(gameState.screen).toBe('death');
  });

  it('should preserve gold after defeat', () => {
    handleDefeat();
    expect(gameState.run.gold).toBe(100);
  });

  it('should preserve deck cards after defeat (starter cards + added cards)', () => {
    handleDefeat();
    // The starter deck is populated by resetGame; our 3 test cards are appended
    expect(gameState.run.deck.length).toBeGreaterThanOrEqual(3);
    expect(gameState.run.deck).toContain('card_bite');
    expect(gameState.run.deck).toContain('card_shell');
    expect(gameState.run.deck).toContain('card_dash');
  });

  it('should preserve unlocked zones after defeat', () => {
    handleDefeat();
    expect(gameState.map.unlockedZones).toContain('zone_reef');
    expect(gameState.map.unlockedZones).toContain('zone_trench');
  });

  it('should preserve completed zones after defeat', () => {
    handleDefeat();
    expect(gameState.map.completedZones).toContain('zone_reef');
  });

  it('should preserve act progress after defeat', () => {
    gameState.run.act = 2;
    handleDefeat();
    expect(gameState.run.act).toBe(2);
  });

  it('should restore HP to at least 10 when very low', () => {
    gameState.run.heroHp = 2;
    handleDefeat();
    expect(gameState.run.heroHp).toBeGreaterThanOrEqual(10);
    expect(gameState.run.heroHp).toBeLessThanOrEqual(gameState.run.heroMaxHp);
  });

  it('should cap restored HP at heroMaxHp', () => {
    gameState.run.heroMaxHp = 12;
    gameState.run.heroHp = 1;
    handleDefeat();
    // 30% of 12 = 3.6 → floor → 3. max(10, 3) = 10. But maxHp is 12 so 10 is fine.
    expect(gameState.run.heroHp).toBeGreaterThanOrEqual(10);
    expect(gameState.run.heroHp).toBeLessThanOrEqual(12);
  });

  it('should clear combat state after defeat', () => {
    // Set up some combat state
    gameState.combat.hand = ['card_1', 'card_2'];
    gameState.combat.enemies = [{ id: 'e1', hp: 50 } as any];
    gameState.combat.turnNumber = 5;
    gameState.combat.mana = 20;

    handleDefeat();

    expect(gameState.combat.hand).toEqual([]);
    expect(gameState.combat.enemies).toEqual([]);
    expect(gameState.combat.turnNumber).toBe(1);
    expect(gameState.combat.mana).toBe(0);
  });

  it('should preserve current zone after defeat', () => {
    gameState.map.currentZone = 'zone_trench';
    handleDefeat();
    expect(gameState.map.currentZone).toBe('zone_trench');
  });

  it('should preserve relics after defeat', () => {
    gameState.run.relics = ['relic_lucky_fin', 'relic_golden_gill'];
    handleDefeat();
    expect(gameState.run.relics).toEqual(['relic_lucky_fin', 'relic_golden_gill']);
  });

  it('should not call resetGame — gold is preserved, not zeroed', () => {
    handleDefeat();
    // If resetGame were called, gold would be 0
    expect(gameState.run.gold).toBeGreaterThan(0);
  });
});
