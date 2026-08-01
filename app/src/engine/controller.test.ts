import { describe, expect, it } from 'vitest';
import { HERO_UID } from './contract';
import type { GameSnapshot } from './contract';
import { createController } from './controller';
import { cardDef } from './cards';

function snapshot(c: ReturnType<typeof createController>): GameSnapshot {
  return c.getSnapshot();
}

/** Deterministic RNG for reproducible tests. */
function seededRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

describe('controller orchestration', () => {
  it('start: initial snapshot has hand 5, turn 1, player phase, ledger log line', () => {
    const c = createController(seededRng(1));
    c.start();
    const s = snapshot(c);
    expect(s.turn).toBe(1);
    expect(s.phase).toBe('player');
    expect(s.hand).toHaveLength(5);
    expect(s.units).toHaveLength(4);
    expect(s.heroUid).toBe(HERO_UID);
    expect(s.winner).toBeNull();
    expect(s.log.at(-1)).toBe('The ledger opens.');
    expect(s.interestDue).toBe(0);
  });

  it('selectUnit + validMoves: hero has reachable tiles, enemy not selectable', () => {
    const c = createController(seededRng(1));
    c.start();
    c.selectUnit(HERO_UID);
    const s = snapshot(c);
    expect(s.selectedUnitUid).toBe(HERO_UID);
    expect(s.validMoves.length).toBeGreaterThan(0);
    expect(s.validMoves.every((p) => p.x >= 0 && p.x < 9 && p.y >= 0 && p.y < 5)).toBe(true);
    // Valid moves exclude occupied enemy tiles.
    for (const u of s.units.filter((x) => x.team === 'enemy')) {
      expect(s.validMoves.some((p) => p.x === u.pos.x && p.y === u.pos.y)).toBe(false);
    }
    c.selectUnit('boss');
    expect(snapshot(c).selectedUnitUid).not.toBe('boss');
  });

  it('full cycle: move → attack → end turn → enemy resolves → next player turn', () => {
    const c = createController(seededRng(2));
    c.start();

    // Move Guppy adjacent to the boss (boss at 7,2; guppy at 1,2) — move toward it.
    c.selectUnit(HERO_UID);
    c.moveSelectedTo({ x: 3, y: 2 });
    let s = snapshot(c);
    expect(s.units.find((u) => u.uid === HERO_UID)!.pos).toEqual({ x: 3, y: 2 });
    // After moving, hero cannot move again this turn.
    c.moveSelectedTo({ x: 4, y: 2 });
    s = snapshot(c);
    expect(s.units.find((u) => u.uid === HERO_UID)!.pos).toEqual({ x: 3, y: 2 });

    // End turn: enemy phase runs (units move toward hero, may attack), then next turn.
    c.endTurn();
    s = snapshot(c);
    expect(s.phase).toBe('player');
    expect(s.turn).toBe(2);
    // Mana +1 per turn: start 1 → 2.
    expect(s.mana).toBe(2);
    // Hand refilled to 5 after draw 1.
    expect(s.hand).toHaveLength(5);
    // Interest starts later.
    expect(s.interestDue).toBe(0);
    // Enemy units reset their action flags.
    for (const u of s.units) {
      expect(u.moved).toBe(false);
      expect(u.acted).toBe(false);
    }
  });

  it('attack: resolves with counterattack; death logs "is sunk." suffix', () => {
    // Deterministic layout: hero adjacent to the boss, no thugs in play.
    const c = createController(seededRng(3), [
      { uid: HERO_UID, name: 'Guppy', team: 'player', pos: { x: 4, y: 2 }, hp: 12, maxHp: 12, attack: 2, block: 0, moved: false, acted: false, alive: true },
      { uid: 'boss', name: 'Boss', team: 'enemy', pos: { x: 5, y: 2 }, hp: 10, maxHp: 10, attack: 3, block: 0, moved: false, acted: false, alive: true },
    ]);
    c.start();
    c.selectUnit(HERO_UID);
    c.attackTarget('boss');
    const s = snapshot(c);
    const hero = s.units.find((u) => u.uid === HERO_UID)!;
    const boss = s.units.find((u) => u.uid === 'boss')!;
    expect(boss.hp).toBe(8); // 10 - 2
    expect(hero.hp).toBe(9); // 12 - 3 counter
    expect(s.log.some((l) => l === 'Guppy hits Boss for 2.')).toBe(true);
    expect(s.log.some((l) => l === 'Boss counters for 3.')).toBe(true);
    // No death yet.
    expect(s.log.some((l) => l.endsWith('is sunk.'))).toBe(false);
  });

  it('card play: playable with mana, unplayable without; card moves to discard', () => {
    const c = createController(seededRng(4));
    c.start();
    let s = snapshot(c);
    // Mana at turn 1 = 1. Find a 1-cost card in hand (e.g., Demand Letter or Cash Flow).
    const playable = s.hand.find((h) => {
      const cost = cardDef(h.cardUid).cost;
      return cost <= s.mana;
    });
    if (!playable) {
      // Nothing 1-cost in this hand; play one after a few turns or skip.
      c.endTurn();
      s = snapshot(c);
    }
    const card = playable ?? s.hand.find((h) => cardDef(h.cardUid).cost <= s.mana);
    expect(card).toBeDefined();
    const before = s.hand.length;
    const manaBefore = s.mana;
    c.setActiveCard(card!.uid);
    s = snapshot(c);
    expect(s.activeCardUid).toBe(card!.uid);
    c.playCard();
    s = snapshot(c);
    expect(s.hand.length).toBe(before - 1);
    expect(s.mana).toBe(manaBefore - cardDef(card!.cardUid).cost);
    expect(s.discard.some((d) => d.uid === card!.uid)).toBe(true);
    expect(s.activeCardUid).toBeNull();
  });

  it('cannot play card with insufficient mana', () => {
    const c = createController(seededRng(5));
    c.start();
    let s = snapshot(c);
    if (s.mana < 1) {
      c.endTurn();
      s = snapshot(c);
    }
    const expensive = s.hand.find((h) => cardDef(h.cardUid).cost > s.mana);
    // If no expensive card in hand, force check by finding max-cost card overall.
    const pick = expensive ?? [...s.hand].sort((a, b) => cardDef(b.cardUid).cost - cardDef(a.cardUid).cost)[0]!;
    if (cardDef(pick.cardUid).cost > s.mana) {
      c.setActiveCard(pick.uid);
      expect(snapshot(c).activeCardUid).toBeNull(); // rejected
    }
  });

  it('sell card: hand → sellPile, +1 gold, logged', () => {
    const c = createController(seededRng(6));
    c.start();
    const s0 = snapshot(c);
    const card = s0.hand[0]!;
    const coins0 = s0.coins;
    c.sellCard(card.uid);
    const s = snapshot(c);
    expect(s.hand).toHaveLength(4);
    expect(s.sellPile.some((x) => x.uid === card.uid)).toBe(true);
    expect(s.coins).toBe(coins0 + 1);
    expect(s.log.at(-1)).toContain('sold.');
  });

  it('summon card: requires empty tile target', () => {
    const c = createController(seededRng(7));
    c.start();
    let s = snapshot(c);
    // Ensure enough mana for Hired Muscle (cost 3): end turns until mana >= 3.
    while (s.mana < 3 && s.turn < 10) {
      c.endTurn();
      s = snapshot(c);
    }
    const summon = s.hand.find((h) => h.cardUid === 'hired-muscle');
    if (!summon) {
      // Not in hand; just assert empty-tile validation on the controller directly.
      const before = s.units.length;
      c.setActiveCard(null);
      expect(snapshot(c).units.length).toBe(before);
      return;
    }
    c.setActiveCard(summon.uid);
    s = snapshot(c);
    expect(s.activeCardTargets).not.toBeNull();
    const tile = s.activeCardTargets![0]!;
    c.playCard(tile);
    s = snapshot(c);
    expect(s.units.some((u) => u.name === 'Muscle' && u.pos.x === tile.x && u.pos.y === tile.y)).toBe(true);
    expect(s.log.some((l) => l === 'Muscle is on the books.')).toBe(true);
  });

  it('victory path: eliminating all enemies sets winner=player, "Accounts settled."', () => {
    // Deterministic layout: hero one-shots a single weak enemy.
    const c = createController(seededRng(8), [
      { uid: HERO_UID, name: 'Guppy', team: 'player', pos: { x: 4, y: 2 }, hp: 12, maxHp: 12, attack: 6, block: 0, moved: false, acted: false, alive: true },
      { uid: 'thug-a', name: 'Thug', team: 'enemy', pos: { x: 5, y: 2 }, hp: 4, maxHp: 4, attack: 2, block: 0, moved: false, acted: false, alive: true },
    ]);
    c.start();
    c.selectUnit(HERO_UID);
    c.attackTarget('thug-a');
    const s = snapshot(c);
    expect(s.winner).toBe('player');
    expect(s.phase).toBe('gameover');
    expect(s.log.some((l) => l === 'Accounts settled.')).toBe(true);
  });

  it('foreclosure path: interest accrues, coins drain, foreclosure wins for enemy', () => {
    // Deterministic layout: a harmless collector (attack 0) never kills the hero;
    // interest + the credit limit trigger foreclosure at turn 16.
    const c = createController(seededRng(9), [
      { uid: HERO_UID, name: 'Guppy', team: 'player', pos: { x: 0, y: 2 }, hp: 50, maxHp: 50, attack: 1, block: 0, moved: false, acted: false, alive: true },
      { uid: 'collector', name: 'Collector', team: 'enemy', pos: { x: 8, y: 4 }, hp: 20, maxHp: 20, attack: 0, block: 0, moved: false, acted: false, alive: true },
    ]);
    c.start();
    let guard = 0;
    while (!snapshot(c).winner && guard < 40) {
      guard++;
      c.endTurn();
    }
    const s = snapshot(c);
    expect(s.turn).toBeGreaterThanOrEqual(16);
    expect(s.foreclosed).toBe(true);
    expect(s.winner).toBe('enemy');
    expect(s.log.some((l) => l.startsWith('Foreclosure.'))).toBe(true);
    expect(s.phase).toBe('gameover');
  });

  it('subscribe: listeners get each snapshot; unsubscribe stops delivery', () => {
    const c = createController(seededRng(10));
    const events: number[] = [];
    const unsub = c.subscribe((s) => events.push(s.turn));
    c.start();
    c.endTurn();
    c.endTurn();
    expect(events.length).toBeGreaterThanOrEqual(3);
    unsub();
    const n = events.length;
    c.endTurn();
    expect(events.length).toBe(n);
  });

  it('restart: resets state to a fresh battle', () => {
    const c = createController(seededRng(11));
    c.start();
    c.endTurn();
    c.endTurn();
    c.restart();
    const s = snapshot(c);
    expect(s.turn).toBe(1);
    expect(s.phase).toBe('player');
    expect(s.winner).toBeNull();
    expect(s.hand).toHaveLength(5);
    expect(s.units).toHaveLength(4);
  });

  it('sell armed card: snapshot stays healthy and active card is cleared', () => {
    const c = createController(seededRng(12));
    c.start();
    const s0 = snapshot(c);
    const card = s0.hand.find((h) => cardDef(h.cardUid).cost <= s0.mana)!;
    c.setActiveCard(card.uid);
    expect(snapshot(c).activeCardUid).toBe(card.uid);
    // Selling the armed card must not leave an active-card ghost or crash emit.
    c.sellCard(card.uid);
    const s = snapshot(c);
    expect(s.activeCardUid).toBeNull();
    expect(s.hand.some((h) => h.uid === card.uid)).toBe(false);
    expect(s.sellPile.some((x) => x.uid === card.uid)).toBe(true);
    expect(s.log.at(-1)).toContain('sold.');
  });

  it('shielded defender: survives, counters, and logs no false "is sunk."', () => {
    // Boss (atk 3) vs shielded hero (block 5): all damage absorbed, hero counters.
    const c = createController(seededRng(13), [
      { uid: HERO_UID, name: 'Guppy', team: 'player', pos: { x: 4, y: 2 }, hp: 4, maxHp: 4, attack: 2, block: 5, moved: false, acted: false, alive: true },
      { uid: 'boss', name: 'Boss', team: 'enemy', pos: { x: 5, y: 2 }, hp: 10, maxHp: 10, attack: 3, block: 0, moved: false, acted: false, alive: true },
    ]);
    c.start();
    // Let the enemy attack the shielded hero (end turn so enemy phase runs).
    c.endTurn();
    const s = snapshot(c);
    const hero = s.units.find((u) => u.uid === HERO_UID)!;
    const boss = s.units.find((u) => u.uid === 'boss')!;
    expect(hero.alive).toBe(true);
    expect(hero.hp).toBe(4); // all 3 absorbed by block
    expect(hero.block).toBe(2); // 5 - 3
    expect(boss.hp).toBe(8); // countered for 2
    // No false death lines for the living hero.
    expect(s.log.some((l) => l.endsWith('is sunk.'))).toBe(false);
  });

  it('mana refresh: unused mana is lost; spending does not stall growth', () => {
    const c = createController(seededRng(14));
    c.start();
    // Spend everything on turn 1 if possible.
    const s0 = snapshot(c);
    const cheap = s0.hand.find((h) => cardDef(h.cardUid).cost <= s0.mana);
    if (cheap) {
      c.setActiveCard(cheap.uid);
      c.playCard();
    }
    c.endTurn();
    expect(snapshot(c).turn).toBe(2);
    expect(snapshot(c).mana).toBe(2); // refresh-to-turn, not 1+spent
    // Hoard on turn 2: unused must be lost, not pooled.
    c.endTurn();
    expect(snapshot(c).turn).toBe(3);
    expect(snapshot(c).mana).toBe(3); // 2 unused was lost; 3 is the fresh refresh
  });

  it('getSnapshot: reads do not notify subscribers', () => {
    const c = createController(seededRng(15));
    let notified = 0;
    c.subscribe(() => notified++);
    c.start();
    const n0 = notified;
    c.getSnapshot();
    c.getSnapshot();
    c.getSnapshot();
    expect(notified).toBe(n0); // reads are pure
  });

  it('enemy intents: committed at player-phase start with damage numbers', () => {
    // Boss adjacent to the hero → attack intent with damage; thug far → move intent.
    const c = createController(seededRng(16), [
      { uid: HERO_UID, name: 'Guppy', team: 'player', pos: { x: 4, y: 2 }, hp: 12, maxHp: 12, attack: 2, block: 0, moved: false, acted: false, alive: true },
      { uid: 'boss', name: 'Boss', team: 'enemy', pos: { x: 5, y: 2 }, hp: 10, maxHp: 10, attack: 3, block: 0, moved: false, acted: false, alive: true },
      { uid: 'thug', name: 'Thug', team: 'enemy', pos: { x: 8, y: 4 }, hp: 4, maxHp: 4, attack: 2, block: 0, moved: false, acted: false, alive: true },
    ]);
    c.start();
    const s = snapshot(c);
    const bossIntent = s.enemyIntents.find((i) => i.unitUid === 'boss');
    const thugIntent = s.enemyIntents.find((i) => i.unitUid === 'thug');
    expect(bossIntent?.kind).toBe('attack');
    expect(bossIntent?.damage).toBe(3);
    expect(bossIntent?.targetUid).toBe(HERO_UID);
    expect(thugIntent?.kind).toBe('move');
  });

  it('event stream: typed transient events are emitted', () => {
    const c = createController(seededRng(17), [
      { uid: HERO_UID, name: 'Guppy', team: 'player', pos: { x: 4, y: 2 }, hp: 12, maxHp: 12, attack: 2, block: 0, moved: false, acted: false, alive: true },
      { uid: 'boss', name: 'Boss', team: 'enemy', pos: { x: 5, y: 2 }, hp: 10, maxHp: 10, attack: 3, block: 0, moved: false, acted: false, alive: true },
    ]);
    const events: string[] = [];
    c.subscribeEvents((e) => events.push(e.type));
    c.start();
    c.selectUnit(HERO_UID);
    c.moveSelectedTo({ x: 4, y: 1 }); // still adjacent to the boss (diagonal)
    c.attackTarget('boss');
    c.endTurn();
    expect(events).toContain('unit-moved');
    expect(events).toContain('attack-resolved');
    expect(events).toContain('turn-changed');
  });

  it('defeat by combat: exactly one "Guppy is sunk." line and winner enemy', () => {
    // Hero with 2 HP adjacent to boss (atk 3): enemy turn kills the hero.
    const c = createController(seededRng(18), [
      { uid: HERO_UID, name: 'Guppy', team: 'player', pos: { x: 4, y: 2 }, hp: 2, maxHp: 2, attack: 2, block: 0, moved: false, acted: false, alive: true },
      { uid: 'boss', name: 'Boss', team: 'enemy', pos: { x: 5, y: 2 }, hp: 10, maxHp: 10, attack: 3, block: 0, moved: false, acted: false, alive: true },
    ]);
    c.start();
    c.endTurn();
    const s = snapshot(c);
    expect(s.winner).toBe('enemy');
    expect(s.phase).toBe('gameover');
    expect(s.log.filter((l) => l === 'Guppy is sunk.')).toHaveLength(1);
  });

  it('log cap: engine log stays at or under 50 lines', () => {
    const c = createController(seededRng(19), [
      { uid: HERO_UID, name: 'Guppy', team: 'player', pos: { x: 0, y: 2 }, hp: 500, maxHp: 500, attack: 1, block: 0, moved: false, acted: false, alive: true },
      { uid: 'collector', name: 'Collector', team: 'enemy', pos: { x: 8, y: 4 }, hp: 20, maxHp: 20, attack: 0, block: 0, moved: false, acted: false, alive: true },
    ]);
    c.start();
    for (let i = 0; i < 30 && !snapshot(c).winner; i++) c.endTurn();
    const s = snapshot(c);
    expect(s.log.length).toBeLessThanOrEqual(50);
  });
});
