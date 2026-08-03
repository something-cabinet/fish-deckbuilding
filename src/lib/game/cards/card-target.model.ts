/** How a card is aimed by the player. */
export type CardTarget =
  | "enemy" // any enemy unit
  | "ally" // any friendly unit (incl. hero)
  | "unit" // any unit
  | "self" // no target, affects hero / global
  | "empty-tile" // an empty tile (summons)
