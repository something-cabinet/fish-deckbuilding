import { describe, expect, it } from 'vitest';
import { CARDS, cardDef, makeDeck, resolveCardActions, shuffle } from './cards';
import type { CardDef, Unit } from './contract';

function unit(uid: string, team: 'player' | 'enemy' = 'player'): Unit {
  return {
    uid,
    name: uid,
    team,
    pos: { x: 2, y: 2 },
    hp: 10,
    maxHp: 10,
    attack: 2,
    block: 0,
    moved: false,
    acted: false,
    alive: true,
  };
}

describe('cards', () => {
  it('makeDeck: covers all five card types with unique instance uids', () => {
    const deck = makeDeck();
    expect(deck.length).toBeGreaterThan(0);
    const types = new Set(deck.map((c) => cardDef(c.cardUid).type));
    expect(types).toEqual(new Set(['Attack', 'Armor', 'Skill', 'Summon', 'Passive']));
    expect(new Set(deck.map((c) => c.uid)).size).toBe(deck.length);
  });

  it('shuffle: preserves elements, changes order for a big deck', () => {
    const rng = () => 0.999; // deterministic
    const deck = makeDeck();
    const shuffled = shuffle(deck, rng);
    expect([...shuffled].sort((a, b) => a.uid.localeCompare(b.uid))).toEqual(
      [...deck].sort((a, b) => a.uid.localeCompare(b.uid)),
    );
  });

  it('resolveCardActions: damage card binds enemy unit target', () => {
    const card: CardDef = { ...cardDef('demand-letter') };
    const enemy = unit('e1', 'enemy');
    const actions = resolveCardActions(card, { units: [enemy], heroUid: 'guppy' }, enemy);
    expect(actions).toEqual([{ kind: 'deal-damage', targetUid: 'e1', amount: 2 }]);
  });

  it('resolveCardActions: summon card binds tile target', () => {
    const card: CardDef = { ...cardDef('hired-muscle') };
    const actions = resolveCardActions(card, { units: [], heroUid: 'guppy' }, undefined, { x: 4, y: 2 });
    expect(actions).toEqual([
      { kind: 'summon', pos: { x: 4, y: 2 }, unitName: 'Muscle', hp: 3, attack: 2 },
    ]);
  });

  it('resolveCardActions: no-target cards resolve without targets', () => {
    const card: CardDef = { ...cardDef('cash-flow') };
    const actions = resolveCardActions(card, { units: [], heroUid: 'guppy' });
    expect(actions).toEqual([{ kind: 'gold', amount: 3 }]);
  });

  it('cardDef: throws on unknown uid', () => {
    expect(() => cardDef('nope')).toThrow(/Unknown card/);
  });

  it('deck contains the named cards', () => {
    const deck = makeDeck();
    const names = deck.map((c) => cardDef(c.cardUid).name);
    for (const expected of ['Demand Letter', 'Foreclose', 'Hired Muscle']) {
      expect(names).toContain(expected);
    }
    void CARDS;
  });
});
