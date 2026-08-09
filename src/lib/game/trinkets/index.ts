export type { TrinketDef, TrinketRarity, TrinketTrigger } from "./trinket-def.model"
export {
  TRINKET_LIBRARY,
  TRINKET_IDS,
  getTrinketDef,
  trinketPrice,
  TRINKET_ICONS,
} from "./trinket-library"
export {
  applyStatModifiers,
  resolveTrigger,
  rollTrinketIds,
  rollTrinketIdsWeighted,
  rollShopTrinkets,
} from "./trinket.service"