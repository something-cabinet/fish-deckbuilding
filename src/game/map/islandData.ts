/**
 * Island zone definitions for the over-world map.
 *
 * Zones are laid out on a ~850×650 pixel canvas space.
 * Positions are hardcoded pixel coordinates.
 */

import { ZoneType } from './IslandTypes';
import type { ZoneDefinition } from './IslandTypes';

export const ISLAND_ZONES: ZoneDefinition[] = [
  {
    id: 'guppy_cove',
    name: 'Guppy Cove',
    type: ZoneType.Town,
    position: { x: 200, y: 350 },
    description: 'Your home town. Rest and prepare here.',
    requiredChapter: 0,
    connections: ['coral_shore', 'sunken_grotto'],
    isStartingZone: true,
  },
  {
    id: 'coral_shore',
    name: 'Coral Shore',
    type: ZoneType.Combat,
    position: { x: 350, y: 250 },
    description: 'A beautiful shore patrolled by crabs.',
    requiredChapter: 1,
    connections: ['guppy_cove', 'tide_pool', 'shell_reef'],
    enemyPool: ['crab_crew'],
  },
  {
    id: 'tide_pool',
    name: 'Tide Pool',
    type: ZoneType.Combat,
    position: { x: 500, y: 180 },
    description: 'Calm waters hiding dangerous jellyfish.',
    requiredChapter: 1,
    connections: ['coral_shore', 'manafall_peak'],
    enemyPool: ['jelly_drifter'],
  },
  {
    id: 'shell_reef',
    name: 'Shell Reef',
    type: ZoneType.Shop,
    position: { x: 500, y: 350 },
    description: 'A trading outpost run by hermit crabs.',
    requiredChapter: 1,
    connections: ['coral_shore', 'manafall_peak'],
    shopItems: ['scale_shield', 'small_heal', 'summon_shrimp'],
  },
  {
    id: 'manafall_peak',
    name: 'Manafall Peak',
    type: ZoneType.Boss,
    position: { x: 650, y: 280 },
    description: "The source of the island's mana — guarded by something big.",
    requiredChapter: 1,
    connections: ['tide_pool', 'shell_reef'],
    isBossZone: true,
    enemyPool: ['hammerhead'],
  },
  {
    id: 'sunken_grotto',
    name: 'Sunken Grotto',
    type: ZoneType.Event,
    position: { x: 350, y: 450 },
    description: 'An underwater cave with ancient secrets.',
    requiredChapter: 1,
    connections: ['guppy_cove', 'abyssal_trench'],
  },
  {
    id: 'abyssal_trench',
    name: 'Abyssal Trench',
    type: ZoneType.Combat,
    position: { x: 500, y: 550 },
    description: 'The deep dark. Only the brave venture here.',
    requiredChapter: 2,
    connections: ['sunken_grotto', 'final_battle'],
    enemyPool: ['puffer_patrol', 'collector_eel'],
  },
  {
    id: 'final_battle',
    name: 'The Maw',
    type: ZoneType.Boss,
    position: { x: 650, y: 500 },
    description: "The debt collector's lair. End this.",
    requiredChapter: 2,
    connections: ['abyssal_trench'],
    isBossZone: true,
    enemyPool: ['boss_leviathan'],
  },
];

/** Look up a zone definition by ID. */
export function getZoneById(id: string): ZoneDefinition | undefined {
  return ISLAND_ZONES.find((z) => z.id === id);
}

/** Return the pixel position of a zone. */
export function getZonePosition(id: string): { x: number; y: number } {
  const zone = getZoneById(id);
  return zone ? { ...zone.position } : { x: 0, y: 0 };
}

/** Get the starting zone definition. */
export function getStartingZone(): ZoneDefinition {
  return ISLAND_ZONES.find((z) => z.isStartingZone) ?? ISLAND_ZONES[0];
}
