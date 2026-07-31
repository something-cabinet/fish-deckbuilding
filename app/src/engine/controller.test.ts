import { describe, expect, it, vi } from 'vitest';
import type { Card, GameSnapshot, GridPos } from './contract';
import { FORECLOSURE_TURN, HAND_LIMIT, INTEREST_START_TURN } from './contract';
import { createBattleController, BattleController } from './controller';
import { buildDeck } from './cards';

// Deterministic deck override so tests know the opening hand:
// hand 1 = [strike a1, strike a2, slam b1, slam b2, riptide c1]
const FIXED_DECK = (): Card[] =>
  ([
    ['strike', 'a1'], ['strike', 'a2'], ['slam', 'b1'], ['slam', 'b2'],
    ['riptide', 'c1'], ['riptide', 'c2'], ['shell', 'd1'], ['shell', 'd2'],
    ['patches', 'e1'], ['patches', 'e2'], ['undercurrent', 'f1'], ['undercurrent', 'f2'],
    ['gulp', 'g1'], ['gulp', 'g2'], ['borrowed_time', 'h1'], ['borrowed_time', 'h2'],
    ['harpoon', 'i1'], ['harpoon', 'i2'], ['dart', 'j1'], ['dart', 'j2'],
  ] as const).map(([defId, uid]) => ({ ...buildDeck().find((c) => c.defId === defId)!, uid }));

/**
 * Close-up battle: hero starts ADJACENT to the Loan Shark so attack/card
 * tests need no walking. Hustler stays 2 tiles away.
 */
const CLOSE_POSITIONS = {
  guppy: { x: 6, y: 1 },
  'loan-shark': { x: 7, y: 1 },
  hustler: { x: 7, y: 3 },
};

function setup(opts: Partial<{ deck: Card[]; positions: Record<string, GridPos>; heroHp: number; enemyHp: number }> = {}) {
  const controller = createBattleController({
    deck: opts.deck ?? FIXED_DECK(),
    positions: opts.positions ?? CLOSE_POSITIONS,
    heroHp: opts.heroHp ?? 10,
    enemyHp: opts.enemyHp,
  }) as BattleController;
  controller.start();
  return controller;
}

/** Build a deck with the given defIds FIRST (so they land in the opening hand). */
function deckWith(defIds: string[]): Card[] {
  const all = FIXED_DECK();
  const head = defIds.map((defId) => all.find((c) => c.defId === defId)!);
  const rest = all.filter((c) => !defIds.includes(c.defId));
  return [...head, ...rest];
}

const hero = (snap: GameSnapshot) => snap.units.find((u) => u.uid === 'guppy')!;
const enemies = (snap: GameSnapshot) => snap.units.filter((u) => u.faction === 'enemy');
const shark = (snap: GameSnapshot) => snap.units.find((u) => u.uid === 'loan-shark')!;
const hustler = (snap: GameSnapshot) => snap.units.find((u) => u.uid === 'hustler')!;
const cardIn = (snap: GameSnapshot, defId: string) => snap.hand.find((c) => c.defId === defId)!;

describe('orchestration — init', () => {
  it('start() emits initial snapshot: 3 units, coins 0, hand 5, deck 15, player phase', () => {
    const snap = setup().getSnapshot();
    expect(snap.units.map((u) => u.uid)).toEqual(['guppy', 'loan-shark', 'hustler']);
    expect(hero(snap).hp).toBe(10);
    expect(enemies(snap)).toHaveLength(2);
    expect(snap.coins).toBe(0);
    expect(snap.hand).toHaveLength(5);
    expect(snap.deck).toHaveLength(15);
    expect(snap.phase).toBe('player');
    expect(snap.turn).toBe(1);
    expect(snap.winner).toBeNull();
    expect(snap.log.length).toBeGreaterThan(0);
  });

  it('getSnapshot() before start() throws', () => {
    const c = createBattleController();
    expect(() => c.getSnapshot()).toThrow();
  });

  it('snapshots are immutable copies (mutating one does not affect engine)', () => {
    const c = setup();
    const s1 = c.getSnapshot();
    s1.units[0]!.hp = 999;
    s1.hand.pop();
    expect(c.getSnapshot().units.find((u) => u.uid === 'guppy')!.hp).toBe(10);
    expect(c.getSnapshot().hand).toHaveLength(5);
  });
});

describe('orchestration — resync fan-out', () => {
  it('each mutating method emits EXACTLY one snapshot', () => {
    const c = setup();
    const spy = vi.fn();
    c.subscribe(spy);
    spy.mockClear();
    c.sellCard(cardIn(c.getSnapshot(), 'strike').uid); // gulp is not in the opening hand
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockClear();
    c.endTurn();
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockClear();
    c.selectUnit('guppy');
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockClear();
    c.setActiveCard(null);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe('orchestration — selection & move', () => {
  it('selectUnit highlights valid move cells; move consumes canMove; deselect works', () => {
    const c = setup();
    c.selectUnit('guppy');
    let snap = c.getSnapshot();
    expect(snap.validMoves.length).toBeGreaterThan(0);
    expect(snap.validMoves.every((p) => p.x >= 0 && p.x < 9 && p.y >= 0 && p.y < 5)).toBe(true);
    const to = snap.validMoves.find((p) => p.x === 4 && p.y === 1)!;
    c.moveSelectedTo(to);
    snap = c.getSnapshot();
    expect(hero(snap).pos).toEqual(to);
    expect(hero(snap).canMove).toBe(false);
    expect(snap.validMoves).toEqual([]);
    c.selectUnit(null);
    expect(c.getSnapshot().selectedUnitUid).toBeNull();
  });

  it('moveSelectedTo on an occupied/out-of-range cell is a no-op', () => {
    const c = setup();
    c.selectUnit('guppy');
    const before = c.getSnapshot();
    c.moveSelectedTo({ x: 8, y: 4 }); // far corner, out of range
    const after = c.getSnapshot();
    expect(after.units).toEqual(before.units);
  });
});

describe('orchestration — active card + targeting', () => {
  it('setActiveCard populates activeCardTargets; cleared after play', () => {
    const c = setup(); // hero (6,1) adjacent to shark (7,1)
    const strike = cardIn(c.getSnapshot(), 'strike');
    c.setActiveCard(strike.uid);
    let snap = c.getSnapshot();
    expect(snap.activeCardUid).toBe(strike.uid);
    expect(snap.activeCardTargets).not.toBeNull();
    expect(snap.activeCardTargets!.validUnitUids).toContain('loan-shark');
    c.playCard(strike.uid, { x: 7, y: 1 });
    snap = c.getSnapshot();
    expect(snap.activeCardUid).toBeNull();
    expect(snap.activeCardTargets).toBeNull();
  });

  it('validCardTargets is empty for wrong-phase and unaffordable cards', () => {
    const c = setup();
    const snap0 = c.getSnapshot();
    const slam = cardIn(snap0, 'slam');
    // affordable at 0 coins (0-3 = -3 ≥ -5): targeting non-empty (shark adjacent)
    expect(c.validCardTargets(slam.uid).validUnitUids).toContain('loan-shark');
    // play slam → coins -3; second slam is unaffordable (-3-3 = -6 < -5)
    c.playCard(slam.uid, { x: 7, y: 1 });
    const slam2 = cardIn(c.getSnapshot(), 'slam');
    expect(c.validCardTargets(slam2.uid)).toEqual({ validCells: [], validUnitUids: [] });
  });
});

describe('orchestration — attack & counterattack', () => {
  it('attack: damage + symmetric counterattack in one snapshot; canAttack consumed', () => {
    const c = setup(); // hero (6,1) vs shark (7,1)
    c.selectUnit('guppy');
    const hpBefore = shark(c.getSnapshot()).hp;
    const heroHpBefore = hero(c.getSnapshot()).hp;
    c.attackTarget('loan-shark');
    const snap = c.getSnapshot();
    expect(shark(snap).hp).toBe(hpBefore - 2); // hero attack 2
    expect(hero(snap).hp).toBe(heroHpBefore - 1); // shark attack 1 counterattack
    expect(hero(snap).canAttack).toBe(false);
  });

  it('counterattack-kill: dead target does not counterattack; dead attacker removed', () => {
    const c = setup({ positions: { guppy: { x: 7, y: 3 }, 'loan-shark': { x: 7, y: 1 }, hustler: { x: 6, y: 3 } } });
    // hero (7,3) adjacent to hustler (6,3): hustler 3 HP, attack 3
    c.selectUnit('guppy');
    c.attackTarget('hustler');
    let snap = c.getSnapshot();
    expect(hustler(snap).hp).toBe(1); // 3 - 2
    expect(hero(snap).hp).toBe(7); // 10 - 3 counterattack
    // canAttack consumed — second attack this turn is a no-op
    c.attackTarget('hustler');
    expect(hustler(c.getSnapshot()).hp).toBe(1);
    // enemy phase: wounded hustler still attacks hero once
    c.endTurn();
    snap = c.getSnapshot();
    expect(hero(snap).hp).toBe(4); // 7 - 3 hustler attack
    // next turn, the kill lands WITHOUT a counterattack (target dead)
    const hpBeforeKill = hero(snap).hp;
    c.selectUnit('guppy');
    c.attackTarget('hustler');
    snap = c.getSnapshot();
    expect(snap.units.some((u) => u.uid === 'hustler')).toBe(false); // killed
    expect(hero(snap).hp).toBe(hpBeforeKill); // NO counterattack on kill
  });
});

describe('orchestration — cards', () => {
  it('play valid card: coins deducted, card to discard, effect applied', () => {
    const c = setup();
    const strike = cardIn(c.getSnapshot(), 'strike');
    const sharkHp = shark(c.getSnapshot()).hp;
    c.setActiveCard(strike.uid);
    const res = c.playCard(strike.uid, { x: 7, y: 1 });
    expect(res).toEqual({ ok: true });
    const snap = c.getSnapshot();
    expect(snap.coins).toBe(-2);
    expect(snap.discard.some((x) => x.uid === strike.uid)).toBe(true);
    expect(snap.hand.some((x) => x.uid === strike.uid)).toBe(false);
    expect(shark(snap).hp).toBe(sharkHp - 3);
  });

  it('play invalid target: rejected with reason, zero state change', () => {
    const c = setup();
    const before = c.getSnapshot();
    const strike = cardIn(before, 'strike');
    const res = c.playCard(strike.uid, { x: 4, y: 4 }); // far cell
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toMatch(/Range/i);
    const after = c.getSnapshot();
    expect(after.coins).toBe(before.coins);
    expect(after.hand.length).toBe(before.hand.length);
  });

  it('rejected play clears activeCardUid and emits exactly one snapshot', () => {
    const c = setup();
    const spy = vi.fn();
    c.subscribe(spy);
    const strike = cardIn(c.getSnapshot(), 'strike');
    c.setActiveCard(strike.uid);
    spy.mockClear();
    const res = c.playCard(strike.uid, { x: 4, y: 4 }); // invalid target
    expect(res.ok).toBe(false);
    expect(spy).toHaveBeenCalledTimes(1); // exactly one snapshot per mutation
    expect(c.getSnapshot().activeCardUid).toBeNull(); // cleared on both outcomes
  });

  it('play unaffordable: rejected with "Insufficient current"', () => {
    const c = setup();
    // coins 0 → slam (-3) → slam again is unaffordable (-6 < -5)
    c.playCard(cardIn(c.getSnapshot(), 'slam').uid, { x: 7, y: 1 });
    expect(c.getSnapshot().coins).toBe(-3);
    const res = c.playCard(cardIn(c.getSnapshot(), 'slam').uid, { x: 7, y: 1 });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toMatch(/Insufficient/i);
    expect(c.getSnapshot().coins).toBe(-3); // unchanged
  });

  it('sell: coins += coinValue, card to sellPile; sell pile to bottom of deck at end turn', () => {
    const c = setup();
    const strike = cardIn(c.getSnapshot(), 'strike'); // coinValue 1
    c.sellCard(strike.uid);
    let snap = c.getSnapshot();
    expect(snap.coins).toBe(1);
    expect(snap.sellPile.some((x) => x.uid === strike.uid)).toBe(true);
    c.endTurn();
    snap = c.getSnapshot();
    expect(snap.sellPile).toHaveLength(0);
    expect(snap.deck[snap.deck.length - 1]!.uid).toBe(strike.uid); // bottom of deck
    expect(snap.coins).toBe(0);
  });

  it('riptide: AoE hits ALL adjacent enemies', () => {
    const c = setup({ positions: { guppy: { x: 6, y: 2 }, 'loan-shark': { x: 7, y: 1 }, hustler: { x: 7, y: 3 } } });
    // hero (6,2) adjacent to both shark (7,1) and hustler (7,3)
    const riptide = cardIn(c.getSnapshot(), 'riptide');
    c.playCard(riptide.uid, { x: 6, y: 2 }); // targetMode none: pos ignored
    const snap = c.getSnapshot();
    expect(shark(snap).hp).toBe(6);
    expect(hustler(snap).hp).toBe(1);
  });

  it('shell armor absorbs damage then expires at start of player turn', () => {
    const c = setup({ deck: deckWith(['gulp', 'shell']) }); // shell + gulp in opening hand
    // fund the shell: sell gulp (+3), then play shell (2) → coins 1, no interest due
    c.sellCard(cardIn(c.getSnapshot(), 'gulp').uid);
    const shell = cardIn(c.getSnapshot(), 'shell');
    c.playCard(shell.uid, { x: 0, y: 0 }); // no target
    let snap = c.getSnapshot();
    expect(hero(snap).armor).toBe(2);
    c.endTurn(); // shark (7,1) attacks hero for 1 → absorbed by armor
    snap = c.getSnapshot();
    expect(hero(snap).armor).toBe(0); // expired at start of player turn
    expect(hero(snap).hp).toBe(10); // shark's 1 dmg absorbed; hustler not adjacent yet
  });

  it('undercurrent pushes; harpoon pulls + applies debt; dart moves without consuming move', () => {
    // gulp funds the combo: sell gulp (+3) → coins 3; undercurrent(1)+harpoon(3)+strike(2)+dart(1) = 7 ≤ 3+5
    const c = setup({ deck: deckWith(['gulp', 'undercurrent', 'harpoon', 'dart']) });
    c.sellCard(cardIn(c.getSnapshot(), 'gulp').uid);
    // hero (6,1), shark (7,1) adjacent, hustler (7,3)
    const undercurrent = cardIn(c.getSnapshot(), 'undercurrent');
    expect(c.playCard(undercurrent.uid, { x: 7, y: 1 })).toEqual({ ok: true });
    let snap = c.getSnapshot();
    expect(shark(snap).pos).toEqual({ x: 8, y: 1 }); // pushed 1 tile away
    // harpoon pulls it back toward hero + applies debt
    const harpoon = cardIn(snap, 'harpoon');
    expect(c.playCard(harpoon.uid, { x: 8, y: 1 })).toEqual({ ok: true });
    snap = c.getSnapshot();
    expect(shark(snap).pos).toEqual({ x: 7, y: 1 }); // pulled adjacent again
    expect(shark(snap).debt).toBe(1);
    // debt adds +1 damage: strike deals 4
    const hpBefore = shark(snap).hp;
    const strike = cardIn(snap, 'strike');
    expect(c.playCard(strike.uid, { x: 7, y: 1 })).toEqual({ ok: true });
    expect(shark(c.getSnapshot()).hp).toBe(hpBefore - 4);
    // dart moves hero without consuming move action
    const snap2 = c.getSnapshot();
    const dart = cardIn(snap2, 'dart');
    const dartTargets = c.validCardTargets(dart.uid);
    expect(dartTargets.validCells.length).toBeGreaterThan(0);
    const heroBefore = hero(snap2);
    c.playCard(dart.uid, dartTargets.validCells[0]!);
    snap = c.getSnapshot();
    expect(hero(snap).pos).not.toEqual(heroBefore.pos);
    expect(hero(snap).canMove).toBe(true); // move action NOT consumed
  });
});

describe('orchestration — enemy turn & economy', () => {
  it('endTurn: enemy AI acts within valid targets; player turn 2 with coins 0 + a draw', () => {
    const c = setup();
    const deckBefore = c.getSnapshot().deck.length;
    c.endTurn();
    const snap = c.getSnapshot();
    expect(snap.turn).toBe(2);
    expect(snap.phase).toBe('player');
    expect(snap.coins).toBe(0);
    expect(snap.deck.length).toBe(deckBefore - 1); // drew 1 at end of player turn
    expect(snap.hand.length).toBe(HAND_LIMIT); // full hand: drawn card to discard
    // no unit overlap / out-of-bounds after enemy moves
    const posSet = new Set(snap.units.map((u) => `${u.pos.x},${u.pos.y}`));
    expect(posSet.size).toBe(snap.units.length);
    for (const u of snap.units) {
      expect(u.pos.x).toBeGreaterThanOrEqual(0);
      expect(u.pos.x).toBeLessThan(9);
      expect(u.pos.y).toBeGreaterThanOrEqual(0);
      expect(u.pos.y).toBeLessThan(5);
    }
  });

  it('interest: end of turn with negative coins damages Guppy, then resets', () => {
    const c = setup();
    c.playCard(cardIn(c.getSnapshot(), 'slam').uid, { x: 7, y: 1 }); // coins -3
    const hpBefore = hero(c.getSnapshot()).hp;
    c.endTurn();
    const snap = c.getSnapshot();
    expect(snap.coins).toBe(0);
    // interest = |−3|; shark also attacks hero 1 (armor 0) → 4 total
    expect(hero(snap).hp).toBe(hpBefore - 4);
    expect(snap.log.some((l) => /Interest due/.test(l))).toBe(true);
  });

  it('interest clock: from turn 9, Guppy takes (turn−8) at turn start', () => {
    const c = setup({ heroHp: 999 }); // survive long enough
    let snap = c.getSnapshot();
    while (snap.turn < INTEREST_START_TURN && !snap.winner) {
      c.endTurn();
      snap = c.getSnapshot();
    }
    if (!snap.winner && snap.turn >= INTEREST_START_TURN) {
      expect(snap.log.some((l) => /Interest due/.test(l))).toBe(true);
    }
  });
});

describe('orchestration — victory/defeat & freeze', () => {
  it('killing both enemies sets winner=player; further mutations are no-ops', () => {
    // hero (6,2) adjacent to both shark (7,1) and hustler (7,3); hero 30 HP for safety
    const c = setup({
      heroHp: 30,
      positions: { guppy: { x: 6, y: 2 }, 'loan-shark': { x: 7, y: 1 }, hustler: { x: 7, y: 3 } },
    });
    // turn 1: attack hustler (3→1) + strike hustler (1→0 dies)
    c.selectUnit('guppy');
    c.attackTarget('hustler');
    c.playCard(cardIn(c.getSnapshot(), 'strike').uid, { x: 7, y: 3 });
    expect(c.getSnapshot().units.some((u) => u.uid === 'hustler')).toBe(false);
    c.endTurn();
    // turn 2: attack shark (8→6) + slam (6→1) + strike (1→0 dies)
    c.selectUnit('guppy');
    c.attackTarget('loan-shark');
    c.playCard(cardIn(c.getSnapshot(), 'slam').uid, { x: 7, y: 1 });
    c.playCard(cardIn(c.getSnapshot(), 'strike').uid, { x: 7, y: 1 });
    const snap = c.getSnapshot();
    expect(snap.units.every((u) => u.faction !== 'enemy')).toBe(true);
    expect(snap.winner).toBe('player');
    // freeze: further mutations are no-ops
    const frozen = c.getSnapshot();
    c.endTurn();
    c.playCard('nope', { x: 0, y: 0 });
    c.selectUnit('guppy');
    c.moveSelectedTo({ x: 1, y: 1 });
    expect(c.getSnapshot()).toEqual(frozen);
  });

  it('defeat: hero hp 0 → winner enemy', () => {
    const c = setup({ heroHp: 3 }); // dies fast
    let snap = c.getSnapshot();
    let guard = 0;
    while (!snap.winner && guard < 20) {
      c.endTurn();
      snap = c.getSnapshot();
      guard++;
    }
    expect(snap.winner).toBe('enemy');
  });
});

describe('orchestration — foreclosure', () => {
  it('reaching turn 16 without victory → defeat "Foreclosure"', () => {
    // hero + enemies both survive everything (999 HP each) so only the clock ends it
    const c = setup({ heroHp: 999, enemyHp: 999 });
    let snap = c.getSnapshot();
    let guard = 0;
    while (snap.turn < FORECLOSURE_TURN && !snap.winner && guard < 60) {
      c.endTurn();
      snap = c.getSnapshot();
      guard++;
    }
    expect(snap.turn).toBeGreaterThanOrEqual(FORECLOSURE_TURN);
    expect(snap.winner).toBe('enemy');
    expect(snap.log.some((l) => /Foreclosure/i.test(l))).toBe(true);
  });
});
