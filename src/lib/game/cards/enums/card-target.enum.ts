/**
 * How a card is aimed by the player.
 * Values must match card-database.json `target` strings + schema CardTargetSchema.
 */
export enum CardTarget {
  /** any enemy unit */
  Enemy = "enemy",
  /** any friendly unit (incl. hero) */
  Ally = "ally",
  /** any unit */
  Unit = "unit",
  /** no target, affects hero / global */
  Self = "self",
  /** an empty tile (summons) */
  EmptyTile = "empty-tile",
}
