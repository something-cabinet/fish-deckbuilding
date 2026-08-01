// Card definitions + ActionResolver. Cards output GameAction objects resolved
// by resolveCardActions — no raw code per card.

import type { CardDef, CardEffect, CardInstance, GameAction, GridPos, Unit } from './contract';

export const CARDS: CardDef[] = [
  {
    uid: 'demand-letter',
    name: 'Demand Letter',
    type: 'Attack',
    cost: 1,
    text: 'Deal 2 damage to a target unit.',
    target: 'enemy-unit',
    effects: [{ kind: 'damage', amount: 2 }],
  },
  {
    uid: 'collection-call',
    name: 'Collection Call',
    type: 'Attack',
    cost: 2,
    text: 'Deal 3 damage to a target unit.',
    target: 'enemy-unit',
    effects: [{ kind: 'damage', amount: 3 }],
  },
  {
    uid: 'foreclose',
    name: 'Foreclose',
    type: 'Attack',
    cost: 4,
    text: 'Deal 6 damage to a target unit.',
    target: 'enemy-unit',
    effects: [{ kind: 'damage', amount: 6 }],
  },
  {
    uid: 'collateral',
    name: 'Collateral',
    type: 'Armor',
    cost: 1,
    text: 'Grant 3 shield to a friendly unit.',
    target: 'friendly-unit',
    effects: [{ kind: 'shield', amount: 3 }],
  },
  {
    uid: 'refinance',
    name: 'Refinance',
    type: 'Skill',
    cost: 2,
    text: 'Restore 4 HP to a friendly unit.',
    target: 'friendly-unit',
    effects: [{ kind: 'heal', amount: 4 }],
  },
  {
    uid: 'cash-flow',
    name: 'Cash Flow',
    type: 'Skill',
    cost: 1,
    text: 'Gain 3 gold.',
    target: 'none',
    effects: [{ kind: 'gold', amount: 3 }],
  },
  {
    uid: 'market-rate',
    name: 'Market Rate',
    type: 'Skill',
    cost: 1,
    text: 'Draw 1 card.',
    target: 'none',
    effects: [{ kind: 'draw', count: 1 }],
  },
  {
    uid: 'hired-muscle',
    name: 'Hired Muscle',
    type: 'Summon',
    cost: 3,
    text: 'Summon a Muscle (3 HP, 2 ATK) on an empty tile.',
    target: 'empty-tile',
    effects: [{ kind: 'summon', unitName: 'Muscle', hp: 3, attack: 2 }],
  },
  {
    uid: 'safe-deposit',
    name: 'Safe Deposit',
    type: 'Passive',
    cost: 1,
    text: 'Gain 1 mana this turn.',
    target: 'none',
    effects: [{ kind: 'mana', amount: 1 }],
  },
];

export function cardDef(cardUid: string): CardDef {
  const def = CARDS.find((c) => c.uid === cardUid);
  if (!def) throw new Error(`Unknown card: ${cardUid}`);
  return def;
}

export function makeDeck(): CardInstance[] {
  const counts: Record<string, number> = {
    'demand-letter': 3,
    'collection-call': 2,
    foreclose: 1,
    collateral: 2,
    refinance: 2,
    'cash-flow': 2,
    'market-rate': 2,
    'hired-muscle': 2,
    'safe-deposit': 1,
  };
  const deck: CardInstance[] = [];
  for (const [uid, n] of Object.entries(counts)) {
    for (let i = 0; i < n; i++) {
      deck.push({ uid: `${uid}-${deck.length}`, cardUid: uid });
    }
  }
  return deck;
}

export function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = a[i]!;
    a[i] = a[j]!;
    a[j] = tmp;
  }
  return a;
}

export interface ResolveContext {
  units: Unit[];
  heroUid: string;
}

/**
 * Resolve a card's effects into concrete GameActions bound to a target.
 * `unitTarget` for unit-targeting cards; `posTarget` for tile-targeting cards.
 */
export function resolveCardActions(
  card: CardDef,
  ctx: ResolveContext,
  unitTarget?: Unit,
  posTarget?: GridPos,
): GameAction[] {
  const actions: GameAction[] = [];
  const friendly = unitTarget && unitTarget.team !== 'enemy';
  for (const effect of card.effects) {
    switch (effect.kind) {
      case 'damage': {
        if (unitTarget) actions.push({ kind: 'deal-damage', targetUid: unitTarget.uid, amount: effect.amount });
        break;
      }
      case 'heal': {
        if (unitTarget) actions.push({ kind: 'heal', targetUid: unitTarget.uid, amount: effect.amount });
        break;
      }
      case 'shield': {
        if (unitTarget) actions.push({ kind: 'shield', targetUid: unitTarget.uid, amount: effect.amount });
        break;
      }
      case 'summon': {
        if (posTarget) {
          actions.push({
            kind: 'summon',
            pos: posTarget,
            unitName: effect.unitName,
            hp: effect.hp,
            attack: effect.attack,
          });
        }
        break;
      }
      case 'draw':
        actions.push({ kind: 'draw', count: effect.count });
        break;
      case 'gold':
        actions.push({ kind: 'gold', amount: effect.amount });
        break;
      case 'mana':
        actions.push({ kind: 'mana', amount: effect.amount });
        break;
    }
  }
  void friendly;
  return actions;
}
