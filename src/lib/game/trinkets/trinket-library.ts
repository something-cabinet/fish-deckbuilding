import type { TrinketDef } from "./trinket-def.model"

export const TRINKET_LIBRARY: Record<string, TrinketDef> = {
  gold_pinky_ring: {
    id: "gold_pinky_ring",
    name: "Gold Pinky Ring",
    description: "You get 2 extra coin when you sell a card.",
    icon: "Gem",
    rarity: "common",
    triggers: { onCardSold: [{ kind: "gainCoin", amount: 2 }] },
  },
  rusty_hook: {
    id: "rusty_hook",
    name: "Rusty Hook",
    description: "Start each battle with 1 extra card drawn.",
    icon: "Anchor",
    rarity: "common",
    triggers: { onCombatStart: [{ kind: "drawCards", amount: 1 }] },
  },
  chipped_pearl: {
    id: "chipped_pearl",
    name: "Chipped Pearl",
    description: "Start each battle with 3 extra coin.",
    icon: "Gem",
    rarity: "common",
    triggers: { onCombatStart: [{ kind: "gainCoin", amount: 3 }] },
  },
  bent_penny: {
    id: "bent_penny",
    name: "Bent Penny",
    description: "Gain 1 coin whenever you defeat an enemy.",
    icon: "Coins",
    rarity: "common",
    triggers: { onEnemyKilled: [{ kind: "gainCoin", amount: 1 }] },
  },
  lucky_fin: {
    id: "lucky_fin",
    name: "Lucky Fin",
    description: "Gain 1 coin at the start of each turn.",
    icon: "Fish",
    rarity: "common",
    triggers: { onTurnStart: [{ kind: "gainCoin", amount: 1 }] },
  },

  /* ---- uncommon ---- */

  shark_tooth: {
    id: "shark_tooth",
    name: "Shark Tooth",
    description: "Your maximum HP is increased by 5.",
    icon: "Sword",
    rarity: "uncommon",
    stats: { maxHp: 5 },
  },
  crooked_badge: {
    id: "crooked_badge",
    name: "Crooked Badge",
    description: "Heal 2 HP whenever you defeat an enemy.",
    icon: "Shield",
    rarity: "uncommon",
    triggers: { onEnemyKilled: [{ kind: "heal", amount: 2, target: "caster" }] },
  },
  pawn_ticket: {
    id: "pawn_ticket",
    name: "Pawn Ticket",
    description: "Gain 2 coin at the start of each turn.",
    icon: "Scroll",
    rarity: "uncommon",
    triggers: { onTurnStart: [{ kind: "gainCoin", amount: 2 }] },
  },
  smugglers_net: {
    id: "smugglers_net",
    name: "Smuggler's Net",
    description: "Start each battle with +1 attack.",
    icon: "Fish",
    rarity: "uncommon",
    triggers: { onCombatStart: [{ kind: "buffAtk", amount: 1 }] },
  },
  tarnished_locket: {
    id: "tarnished_locket",
    name: "Tarnished Locket",
    description: "Heal 3 HP at the start of each battle.",
    icon: "Gem",
    rarity: "uncommon",
    triggers: { onCombatStart: [{ kind: "heal", amount: 3, target: "caster" }] },
  },

  /* ---- rare ---- */

  foreclosers_ledger: {
    id: "foreclosers_ledger",
    name: "The Forecloser's Ledger",
    description: "You get 5 extra coin when you sell a card.",
    icon: "Scroll",
    rarity: "rare",
    triggers: { onCardSold: [{ kind: "gainCoin", amount: 5 }] },
  },
  glass_reef: {
    id: "glass_reef",
    name: "Glass Reef",
    description: "Draw a card whenever you defeat an enemy.",
    icon: "Gem",
    rarity: "rare",
    triggers: { onEnemyKilled: [{ kind: "drawCards", amount: 1 }] },
  },
  coral_crown: {
    id: "coral_crown",
    name: "Coral Crown",
    description: "Your maximum HP is increased by 8.",
    icon: "Crown",
    rarity: "rare",
    stats: { maxHp: 8 },
  },
  obsidian_scale: {
    id: "obsidian_scale",
    name: "Obsidian Scale",
    description: "Start each battle with 6 coin and draw 1 card.",
    icon: "Shield",
    rarity: "rare",
    triggers: {
      onCombatStart: [
        { kind: "gainCoin", amount: 6 },
        { kind: "drawCards", amount: 1 },
      ],
    },
  },
  spectral_fin: {
    id: "spectral_fin",
    name: "Spectral Fin",
    description: "Gain 3 coin at the start of each turn.",
    icon: "Fish",
    rarity: "rare",
    triggers: { onTurnStart: [{ kind: "gainCoin", amount: 3 }] },
  },
}

export const TRINKET_IDS = Object.keys(TRINKET_LIBRARY)

export function getTrinketDef(id: string): TrinketDef | undefined {
  return TRINKET_LIBRARY[id]
}

export const TRINKET_RARITY_ORDER: Record<string, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
}

export function trinketRarityWeight(rarity: string): number {
  switch (rarity) {
    case "common":
      return 50
    case "uncommon":
      return 35
    case "rare":
      return 15
    default:
      return 0
  }
}

export function trinketPrice(rarity: string): number {
  switch (rarity) {
    case "common":
      return 30
    case "uncommon":
      return 45
    case "rare":
      return 70
    default:
      return 30
  }
}

export const TRINKET_ICONS: Record<string, string> = {
  gold_pinky_ring: "Gem",
  rusty_hook: "Anchor",
  chipped_pearl: "Gem",
  bent_penny: "Coins",
  lucky_fin: "Fish",
  shark_tooth: "Sword",
  crooked_badge: "Shield",
  pawn_ticket: "Scroll",
  smugglers_net: "Fish",
  tarnished_locket: "Gem",
  foreclosers_ledger: "Scroll",
  glass_reef: "Gem",
  coral_crown: "Crown",
  obsidian_scale: "Shield",
  spectral_fin: "Fish",
}