import { UnitKind } from "../enums/unit-kind.enum"
import type { Unit } from "../models/unit.interface"

/**
 * Tier contribution to a unit's bounty. Listed explicitly rather than reusing
 * the enum's ordinal so reordering `UnitKind` can never silently retune the
 * order enemies act in.
 */
export const UNIT_KIND_BOUNTY: Record<UnitKind, number> = {
  [UnitKind.Hero]: 0,
  [UnitKind.Goon]: 0,
  [UnitKind.Thug]: 1,
  [UnitKind.Enforcer]: 2,
  [UnitKind.Boss]: 4,
}

/**
 * How much of a threat a unit is, used to decide which enemy acts first
 * (spec D13). Bigger, angrier units move before their chaff, so a boss claims
 * the tile it wants before a thug wanders into it.
 */
export function unitBounty(unit: Unit): number {
  return Math.max(0, unit.atk + unit.buffAtk) + unit.hp + UNIT_KIND_BOUNTY[unit.kind]
}
