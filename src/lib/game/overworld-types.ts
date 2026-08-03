export type ZoneId = "shallows" | "midwaters" | "depths"
export type NodeType = "battle" | "rest" | "boss"

export interface BossDef {
  name: string
  hp: number
  atk: number
  move: number
}

/** A single enemy in a zone's standard battle lineup. */
export interface EnemySpawnTemplate {
  name: string
  kind: "thug" | "enforcer"
  hp: number
  atk: number
  move: number
}

export interface ZoneDef {
  id: ZoneId
  index: number
  name: string
  tagline: string
  /** number of map rows: 5-7, including start + boss rows */
  rows: number
  /** min/max nodes per middle row */
  minNodes: number
  maxNodes: number
  boss: BossDef
  /** standard battle lineups drawn from this pool */
  enemyPool: EnemySpawnTemplate[]
  /** css theme name for the map background */
  theme: string
}

export interface MapNode {
  /** node ref within a zone, e.g. "2-1" (row-col) */
  id: string
  row: number
  col: number
  type: NodeType
  /** ids of nodes reachable from this node */
  edges: string[]
  /** normalized 0..100 layout position */
  x: number
  y: number
}

export interface OverworldState {
  /** current zone index (0 = shallows) */
  zoneIndex: number
  /** current node ref inside the current zone */
  nodeId: string
  hp: number
  maxHp: number
  gold: number
  /** card library ids, grows over the run */
  deck: string[]
  /** node refs that have been cleared / used (greyed) */
  visited: string[]
  /** number of unlocked zones (1 = shallows only) */
  unlockedZones: number
  /** run seed — map layout + rewards derive from it */
  seed: number
}
