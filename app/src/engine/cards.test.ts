import { describe, expect, it } from 'vitest';
import type { Card, CardDef, GameAction, GridPos, Unit } from './contract';
import { buildDeck, CARD_DEFS, cardTargeting, resolveActions, sellValue } from './cards';

const hero: Unit = {
  uid: 'hero', templateId: 'guppy', name: 'Guppy', faction: 'player',
  pos: { x: 4, y: 2 }, hp: 10, maxHp: 10, attack: 2, movement: 2,
  armor: 0, debt: 0, isBoss: false, canMove: true, canAttack: true,
};

function enemy(uid: string, pos: GridPos, hp = 5, attack = 2): Unit {
  return {
    uid, templateId: 'debt-collector', name: 'Debt Collector', faction: 'enemy',
    pos, hp, maxHp: hp, attack, movement: 2,
    armor: 0, debt: 0, isBoss: false, canMove: true, canAttack: true,
  };
}

const occupied = (units: Unit[]) => (p: GridPos) => units.some((u) => u.pos.x === p.x && u.pos.y === p.y);
const byUid = (units: Unit[], uid: string) => units.find((u) => u.uid === uid)!;
const byDef = (hand: Card[], defId: string) => hand.find((c) => c.defId === defId)!;

describe('CARD_DEFS', () => {
  it('has exactly 10 unique defs', () => {
    expect(CARD_DEFS).toHaveLength(10);
    const ids = new Set(CARD_DEFS.map((d) => d.defId));
    expect(ids.size).toBe(10);
  });
});

describe('buildDeck', () => {
  it('builds 20 cards = 2 copies of each of the 10 defs', () => {
    const deck = buildDeck();
    expect(deck).toHaveLength(20);
    const counts = new Map<string, number>();
    for (const c of deck) counts.set(c.defId, (counts.get(c.defId) ?? 0) + 1);
    for (const def of CARD_DEFS) expect(counts.get(def.defId)).toBe(2);
  });

  it('gives every card a unique uid', () => {
    const deck = buildDeck();
    const uids = new Set(deck.map((c) => c.uid));
    expect(uids.size).toBe(20);
  });

  it('is deterministic without a seed', () => {
    const a = buildDeck().map((c) => c.uid);
    const b = buildDeck().map((c) => c.uid);
    expect(a).toEqual(b);
  });
});

describe('sellValue', () => {
  it('returns the coinValue of a card', () => {
    const card = buildDeck()[0]!;
    expect(sellValue(card)).toBe(card.coinValue);
  });
});

describe('cardTargeting', () => {
  const units = [hero, enemy('e1', { x: 5, y: 2 }), enemy('e2', { x: 7, y: 3 })];

  it('strike/slam: adjacent enemy unit cells only', () => {
    const strike = byDef(buildDeck(), 'strike');
    const t = cardTargeting(strike, { heroPos: hero.pos, enemyUnits: units.filter((u) => u.faction === 'enemy'), occupied: occupied(units) });
    expect(t.validUnitUids).toEqual(['e1']);
    expect(t.validCells).toContainEqual({ x: 5, y: 2 });
    expect(t.validCells).not.toContainEqual({ x: 7, y: 3 });
  });

  it('strike: empty when no enemy is adjacent', () => {
    const far = enemy('ef', { x: 8, y: 4 });
    const strike = byDef(buildDeck(), 'strike');
    const t = cardTargeting(strike, { heroPos: hero.pos, enemyUnits: [far], occupied: occupied([hero, far]) });
    expect(t.validUnitUids).toEqual([]);
    expect(t.validCells).toEqual([]);
  });

  it('riptide: no cell targeting (auto-hit adjacent enemies at play)', () => {
    const riptide = byDef(buildDeck(), 'riptide');
    const t = cardTargeting(riptide, { heroPos: hero.pos, enemyUnits: units.filter((u) => u.faction === 'enemy'), occupied: occupied(units) });
    expect(t.validCells).toEqual([]);
    expect(t.validUnitUids).toEqual([]);
  });

  it('shell/patches: no targeting (self)', () => {
    for (const defId of ['shell', 'patches']) {
      const card = byDef(buildDeck(), defId);
      const t = cardTargeting(card, { heroPos: hero.pos, enemyUnits: [], occupied: occupied(units) });
      expect(t.validCells).toEqual([]);
      expect(t.validUnitUids).toEqual([]);
    }
  });

  it('undercurrent: adjacent enemy units', () => {
    const card = byDef(buildDeck(), 'undercurrent');
    const t = cardTargeting(card, { heroPos: hero.pos, enemyUnits: units.filter((u) => u.faction === 'enemy'), occupied: occupied(units) });
    expect(t.validUnitUids).toEqual(['e1']);
  });

  it('harpoon: enemies within 2 tiles (Chebyshev)', () => {
    const card = byDef(buildDeck(), 'harpoon');
    const units2 = [hero, enemy('e1', { x: 5, y: 2 }), enemy('e2', { x: 6, y: 3 })];
    const t = cardTargeting(card, { heroPos: hero.pos, enemyUnits: units2.filter((u) => u.faction === 'enemy'), occupied: occupied(units2) });
    expect(t.validUnitUids).toEqual(['e1', 'e2']); // both within Chebyshev 2
  });

  it('gulp/borrowed-time: no targeting', () => {
    for (const defId of ['gulp', 'borrowed_time']) {
      const card = byDef(buildDeck(), defId);
      const t = cardTargeting(card, { heroPos: hero.pos, enemyUnits: [], occupied: occupied(units) });
      expect(t.validCells).toEqual([]);
    }
  });

  it('dart: empty cells within 2 tiles of hero (move cells)', () => {
    const card = byDef(buildDeck(), 'dart');
    // e1 occupies (5,2) — excluded, and cells behind it are unreachable
    const unitsDart = [hero, enemy('e1', { x: 5, y: 2 })];
    const t = cardTargeting(card, { heroPos: hero.pos, enemyUnits: [], occupied: occupied(unitsDart) });
    expect(t.validCells).toContainEqual({ x: 4, y: 4 }); // ortho 2
    expect(t.validCells).toContainEqual({ x: 3, y: 3 }); // diag 1
    expect(t.validCells).not.toContainEqual({ x: 5, y: 2 }); // occupied by e1
    expect(t.validCells).not.toContainEqual({ x: 6, y: 2 }); // blocked behind e1
    expect(t.validCells).not.toContainEqual({ x: 4, y: 2 }); // origin
  });
});

describe('resolveActions', () => {
  const ctx = (units: Unit[], coins = 5) => ({
    units,
    heroUid: 'hero',
    coins,
    occupied: occupied(units),
  });

  it('damage_unit: applies damage incl. debt, marks removal when dead', () => {
    const e = enemy('e1', { x: 5, y: 2 }, 5, 1);
    e.debt = 1;
    const r = resolveActions([{ type: 'damage_unit', targetUid: 'e1', amount: 3 }], ctx([hero, e]));
    expect(byUid(r.units, 'e1').hp).toBe(1); // 3 + 1 debt
    expect(r.removedUids).toEqual([]);
  });

  it('damage_unit: removes dead target', () => {
    const e = enemy('e1', { x: 5, y: 2 }, 2, 1);
    const r = resolveActions([{ type: 'damage_unit', targetUid: 'e1', amount: 3 }], ctx([hero, e]));
    expect(r.units.find((u) => u.uid === 'e1')).toBeUndefined();
    expect(r.removedUids).toEqual(['e1']);
  });

  it('damage_unit: skips missing/dead targets without crashing', () => {
    const r = resolveActions([{ type: 'damage_unit', targetUid: 'ghost', amount: 3 }], ctx([hero]));
    expect(r.units).toHaveLength(1);
    expect(r.log.some((l) => l.toLowerCase().includes('gone'))).toBe(true);
  });

  it('heal_unit: clamps at maxHp', () => {
    const r = resolveActions([{ type: 'heal_unit', targetUid: 'hero', amount: 3 }], ctx([hero]));
    expect(byUid(r.units, 'hero').hp).toBe(10);
    const hurt = { ...hero, hp: 5 };
    const r2 = resolveActions([{ type: 'heal_unit', targetUid: 'hero', amount: 3 }], ctx([hurt]));
    expect(byUid(r2.units, 'hero').hp).toBe(8);
  });

  it('gain_armor: adds armor', () => {
    const r = resolveActions([{ type: 'gain_armor', targetUid: 'hero', amount: 2 }], ctx([hero]));
    expect(byUid(r.units, 'hero').armor).toBe(2);
  });

  it('gain_coins: adds coins', () => {
    const r = resolveActions([{ type: 'gain_coins', amount: 2 }], ctx([hero], 3));
    expect(r.coins).toBe(5);
  });

  it('apply_debt: adds debt stacks', () => {
    const e = enemy('e1', { x: 5, y: 2 });
    const r = resolveActions([{ type: 'apply_debt', targetUid: 'e1', amount: 1 }], ctx([hero, e]));
    expect(byUid(r.units, 'e1').debt).toBe(1);
  });

  it('move_self: moves the unit', () => {
    const r = resolveActions([{ type: 'move_self', unitUid: 'hero', to: { x: 5, y: 2 } }], ctx([hero, enemy('e1', { x: 7, y: 2 })]));
    expect(byUid(r.units, 'hero').pos).toEqual({ x: 5, y: 2 });
    expect(r.events).toContainEqual({ kind: 'unit-moved', unitUid: 'hero', from: { x: 4, y: 2 }, to: { x: 5, y: 2 } });
  });

  it('move_unit push: pushes target away from origin until blocked', () => {
    const e = enemy('e1', { x: 5, y: 2 });
    const r = resolveActions([{ type: 'move_unit', targetUid: 'e1', direction: 'push', tiles: 2, originUid: 'hero' }], ctx([hero, e]));
    expect(byUid(r.units, 'e1').pos).toEqual({ x: 7, y: 2 }); // pushed 2 tiles (max)
  });

  it('move_unit pull: pulls target toward origin, stops adjacent', () => {
    const e = enemy('e1', { x: 7, y: 2 });
    const r = resolveActions([{ type: 'move_unit', targetUid: 'e1', direction: 'pull', tiles: 2, originUid: 'hero' }], ctx([hero, e]));
    expect(byUid(r.units, 'e1').pos).toEqual({ x: 5, y: 2 }); // stops adjacent (Chebyshev 1)
  });

  it('move_unit push: stops at grid bounds', () => {
    const e = enemy('e1', { x: 8, y: 2 });
    const r = resolveActions([{ type: 'move_unit', targetUid: 'e1', direction: 'push', tiles: 3, originUid: 'hero' }], ctx([hero, e]));
    expect(byUid(r.units, 'e1').pos).toEqual({ x: 8, y: 2 }); // clamped at edge, no-op
    expect(r.log.some((l) => l.toLowerCase().includes('blocked'))).toBe(true);
  });

  it('move_unit push: stops at occupied cell', () => {
    const e1 = enemy('e1', { x: 5, y: 2 });
    const e2 = enemy('e2', { x: 6, y: 2 });
    const r = resolveActions([{ type: 'move_unit', targetUid: 'e1', direction: 'push', tiles: 2, originUid: 'hero' }], ctx([hero, e1, e2]));
    expect(byUid(r.units, 'e1').pos).toEqual({ x: 5, y: 2 }); // blocked by e2 at 6,2
  });

  it('move_unit vs boss: no-ops with "Boss holds ground"', () => {
    const boss = enemy('boss', { x: 5, y: 2 });
    boss.isBoss = true;
    const r = resolveActions([{ type: 'move_unit', targetUid: 'boss', direction: 'push', tiles: 2, originUid: 'hero' }], ctx([hero, boss]));
    expect(byUid(r.units, 'boss').pos).toEqual({ x: 5, y: 2 });
    expect(r.log.some((l) => l.toLowerCase().includes('boss holds ground'))).toBe(true);
  });

  it('applies multiple actions in order', () => {
    const e = enemy('e1', { x: 5, y: 2 }, 6);
    const actions: GameAction[] = [
      { type: 'damage_unit', targetUid: 'e1', amount: 2 },
      { type: 'gain_coins', amount: 1 },
      { type: 'apply_debt', targetUid: 'e1', amount: 1 },
    ];
    const r = resolveActions(actions, ctx([hero, e], 3));
    expect(byUid(r.units, 'e1').hp).toBe(4);
    expect(byUid(r.units, 'e1').debt).toBe(1);
    expect(r.coins).toBe(4);
  });
});
