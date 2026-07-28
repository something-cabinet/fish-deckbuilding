/**
 * Card data definitions for the tactical combat engine.
 *
 * 11 starter cards with the new CardDefinition type.
 * Cards are fish-themed for an underwater tactical RPG.
 */
import type { CardDefinition } from '../combat/CardTypes';
import { CardType, MoveType } from '../combat/CardTypes';

/**
 * All card definitions indexed by id.
 */
export const CARD_DATA: Record<string, CardDefinition> = {
  // ───── Attack Cards (4) ─────

  fin_slash: {
    id: 'fin_slash',
    name: 'Fin Slash',
    type: CardType.Attack,
    manaCost: 1,
    damage: 3,
    description: 'A swift slash with your sharp fin. Deals 3 damage.',
  },

  razor_fin: {
    id: 'razor_fin',
    name: 'Razor Fin',
    type: CardType.Attack,
    manaCost: 2,
    damage: 5,
    description: 'A devastating fin strike. Deals 5 damage.',
  },

  crashing_wave: {
    id: 'crashing_wave',
    name: 'Crashing Wave',
    type: CardType.Attack,
    manaCost: 3,
    damage: 4,
    isAoE: true,
    aoeRadius: 1,
    description: 'Summon a crashing wave. Deals 4 damage to all enemies in an area.',
  },

  water_jet: {
    id: 'water_jet',
    name: 'Water Jet',
    type: CardType.Attack,
    manaCost: 4,
    damage: 8,
    description: 'A pressurized jet of water. Deals 8 damage.',
  },

  // ───── Armor Cards (2) ─────

  bubble_shield: {
    id: 'bubble_shield',
    name: 'Bubble Shield',
    type: CardType.Armor,
    manaCost: 1,
    armorAmount: 3,
    description: 'Conjure a protective bubble. Gain 3 armor.',
  },

  scale_armor: {
    id: 'scale_armor',
    name: 'Scale Armor',
    type: CardType.Armor,
    manaCost: 2,
    armorAmount: 6,
    description: 'Tough scale plating. Gain 6 armor.',
  },

  // ───── Skill Cards (2) ─────

  healing_rain: {
    id: 'healing_rain',
    name: 'Healing Rain',
    type: CardType.Skill,
    manaCost: 2,
    healAmount: 4,
    description: 'Soothing waters restore your HP. Heal 4.',
  },

  battle_cry: {
    id: 'battle_cry',
    name: 'Battle Cry',
    type: CardType.Skill,
    manaCost: 1,
    buffAttack: 2,
    description: 'A rallying cry. Gain +2 attack for the battle.',
  },

  // ───── Summon Cards (2) ─────

  summon_minnow: {
    id: 'summon_minnow',
    name: 'Summon Minnow',
    type: CardType.Summon,
    manaCost: 2,
    summonUnit: {
      attack: 2,
      maxHp: 3,
      moveRange: 2,
      attackRange: 1,
      hasProvoke: false,
      moveType: MoveType.Normal,
    },
    description: 'Summon a tiny minnow ally. Weak but mobile.',
  },

  summon_clam_guard: {
    id: 'summon_clam_guard',
    name: 'Summon Clam Guard',
    type: CardType.Summon,
    manaCost: 3,
    summonUnit: {
      attack: 2,
      maxHp: 6,
      moveRange: 1,
      attackRange: 1,
      hasProvoke: true,
      moveType: MoveType.Normal,
    },
    description: 'Summon a sturdy clam guard with Provoke.',
  },

  // ───── Passive Card (1) ─────

  deep_focus: {
    id: 'deep_focus',
    name: 'Deep Focus',
    type: CardType.Passive,
    manaCost: 1,
    passiveEffect: 'manaRegen',
    duration: 0,
    description: 'Enter a deep trance. Grants mana regeneration for the battle.',
  },
};

/**
 * The starter deck — 11 cards.
 * Includes multiple copies of basic cards for consistency.
 */
export const STARTER_DECK_IDS: string[] = [
  'fin_slash',
  'fin_slash',
  'razor_fin',
  'bubble_shield',
  'bubble_shield',
  'scale_armor',
  'healing_rain',
  'battle_cry',
  'summon_minnow',
  'summon_clam_guard',
  'deep_focus',
];

/**
 * Get a card definition by id.
 */
export function getCard(id: string): CardDefinition | undefined {
  return CARD_DATA[id];
}

/**
 * Get the starter deck as CardDefinition[].
 */
export function getStarterDeck(): CardDefinition[] {
  return STARTER_DECK_IDS.map(id => {
    const card = CARD_DATA[id];
    if (!card) throw new Error(`Card "${id}" not found in CARD_DATA`);
    return { ...card };
  });
}
