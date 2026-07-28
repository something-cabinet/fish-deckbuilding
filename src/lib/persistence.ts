/**
 * Game State Persistence Layer (Phase 5 fix — Issue P0 #2).
 *
 * Pure browser-localStorage implementation.
 * No Prisma, no SQLite, no Node native modules.
 */

const SAVE_KEY_PREFIX = 'fish_tactical_rpg_save_';
const SLOT_COUNT = 3;

export interface SaveData {
  slot: number;
  chapter: number;
  heroName: string;
  heroHp: number;
  heroMaxHp: number;
  gold: number;
  zone: string;
  deck: string[]; // card IDs
  collection: Record<string, number>; // cardId → count
  completedZones: string[];
  unlockedZones: string[];
  act: number;
  timestamp: number;
}

export function saveGame(slot: number, data: Omit<SaveData, 'slot' | 'timestamp'>): void {
  const saveData: SaveData = { ...data, slot, timestamp: Date.now() };
  localStorage.setItem(`${SAVE_KEY_PREFIX}${slot}`, JSON.stringify(saveData));
}

export function loadGame(slot: number): SaveData | null {
  const raw = localStorage.getItem(`${SAVE_KEY_PREFIX}${slot}`);
  return raw ? JSON.parse(raw) : null;
}

export function deleteSave(slot: number): void {
  localStorage.removeItem(`${SAVE_KEY_PREFIX}${slot}`);
}

export function getSaveInfo(slot: number): SaveData | null {
  return loadGame(slot);
}

export function getAllSaveSlots(): (SaveData | null)[] {
  return [0, 1, 2].map(i => loadGame(i));
}

/** Map from GameState-like shape to SaveData format and persist. */
export function saveGameState(slot: number, gameState: {
  run?: { act?: number; heroHp?: number; heroMaxHp?: number; gold?: number; deck?: string[]; collection?: Record<string, number> };
  map?: { currentZone?: string; completedZones?: string[]; unlockedZones?: string[] };
}): void {
  saveGame(slot, {
    chapter: gameState.run?.act ?? 1,
    heroName: 'Guppy',
    heroHp: gameState.run?.heroHp ?? 30,
    heroMaxHp: gameState.run?.heroMaxHp ?? 30,
    gold: gameState.run?.gold ?? 0,
    zone: gameState.map?.currentZone ?? 'guppy_cove',
    deck: gameState.run?.deck ?? [],
    collection: gameState.run?.collection ?? {},
    completedZones: gameState.map?.completedZones ?? [],
    unlockedZones: gameState.map?.unlockedZones ?? ['guppy_cove'],
    act: gameState.run?.act ?? 1,
  });
}

/** Load saved state and return a partial GameState-shaped object for merging. */
export function loadGameState(slot: number): {
  run: Partial<{
    heroHp: number;
    heroMaxHp: number;
    gold: number;
    deck: string[];
    collection: Record<string, number>;
    act: number;
  }>;
  map: Partial<{
    completedZones: string[];
    unlockedZones: string[];
    currentZone: string;
  }>;
} | null {
  const data = loadGame(slot);
  if (!data) return null;
  return {
    run: {
      heroHp: data.heroHp,
      heroMaxHp: data.heroMaxHp,
      gold: data.gold,
      deck: data.deck,
      collection: data.collection ?? {},
      act: data.act,
    },
    map: {
      completedZones: data.completedZones,
      unlockedZones: data.unlockedZones,
      currentZone: data.zone,
    },
  };
}
