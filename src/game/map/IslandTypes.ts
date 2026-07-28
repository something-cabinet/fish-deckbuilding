/**
 * Island Map — overworld types for the Cross Blitz-style zone map.
 *
 * Zones are positioned on a stylised canvas with path connections.
 * Story chapters gate zone access; combat/boss zones trigger battles.
 */

export enum ZoneType {
  Town = 'town',
  Combat = 'combat',
  Boss = 'boss',
  Shop = 'shop',
  Rest = 'rest',
  Event = 'event',
}

export interface ZoneDefinition {
  /** Unique identifier (kebab-case, e.g. "guppy_cove") */
  id: string;
  /** Display name shown in overlays */
  name: string;
  /** Semantic type that drives shape, colour, and behaviour */
  type: ZoneType;
  /** Pixel position on the map canvas (exposed to Excalibur world coords) */
  position: { x: number; y: number };
  /** Short flavour text */
  description: string;
  /** Minimum story chapter required to unlock this zone (0 = always available) */
  requiredChapter: number;
  /** IDs of zones this zone connects to (undirected edges) */
  connections: string[];
  /** Enemy encounter IDs used for random encounters (combat/boss zones) */
  enemyPool?: string[];
  /** True if this is a boss encounter zone */
  isBossZone?: boolean;
  /** True if the hero starts here on a new run */
  isStartingZone?: boolean;
  /** Card IDs available for purchase (shop zones) */
  shopItems?: string[];
}

/** Describes an in-progress hero travel between two zones */
export interface HeroPathProgress {
  from: string;
  to: string;
  /** 0–1 animation progress along the path segment */
  progress: number;
}

/** Pending zone action that the HUD overlay may prompt about */
export interface PendingZoneAction {
  type: 'battle' | 'event';
  zoneId: string;
  zoneName: string;
}

/** Reactive state slice for the island map (lives in GameState.map) */
export interface MapStateUI {
  currentZone: string;
  unlockedZones: string[];
  completedZones: string[];
  heroPosition: { x: number; y: number };
  pendingAction: PendingZoneAction | null;
}
