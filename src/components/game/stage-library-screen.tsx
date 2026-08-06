"use client"

import { Crown, Pencil, Plus, ScrollText, Trash2 } from "lucide-react"
import type { EnemyDef } from "@/lib/game/units"
import type { StageDef } from "@/lib/game/stages"
import type { ZoneId } from "@/lib/game/overworld-types"
import { StageGrid } from "./stage-grid"
import { EmptyState, TileAction } from "./design-ui"
import { cn } from "@/lib/utils"

interface Props {
  stages: StageDef[]
  enemies: EnemyDef[]
  onCreate: (zone: ZoneId) => void
  onEdit: (stage: StageDef) => void
  onDelete: (id: string) => void
}

/** The three run zones, in play order — one authoring area each. */
export const ZONE_SECTIONS: { id: ZoneId; name: string; tagline: string }[] = [
  { id: "shallows", name: "The Shallows", tagline: "Zone 1" },
  { id: "midwaters", name: "The Midwaters", tagline: "Zone 2" },
  { id: "depths", name: "The Depths", tagline: "Zone 3" },
]

export function StageLibraryScreen({ stages, enemies, onCreate, onEdit, onDelete }: Props) {
  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
      {stages.length === 0 && (
        <EmptyState icon={ScrollText}>
          No stages yet — create one in a zone below.
        </EmptyState>
      )}

      {ZONE_SECTIONS.map((zone) => {
        const zoneStages = stages.filter((s) => s.zone === zone.id)
        const bossCount = zoneStages.filter((s) => s.isBossStage).length

        return (
          <section
            key={zone.id}
            className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
          >
            <header className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
              <h2 className="font-display text-sm font-bold uppercase tracking-[0.18em] text-gold">
                {zone.name}
              </h2>
              <span className="font-display text-[10px] uppercase tracking-wider text-muted-foreground">
                {zone.tagline} · {zoneStages.length} {zoneStages.length === 1 ? "stage" : "stages"}
                {zoneStages.length > 0 && ` · ${bossCount} boss`}
              </span>
              <button
                type="button"
                onClick={() => onCreate(zone.id)}
                className="ml-auto flex items-center gap-1 rounded-md border border-white/10 px-2.5 py-1 font-display text-[10px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:border-gold/40 hover:text-gold"
              >
                <Plus size={12} />
                New stage
              </button>
            </header>

            {zoneStages.length === 0 ? (
              <p className="py-6 text-center font-display text-[11px] uppercase tracking-wider text-muted-foreground/60">
                No stages — battles here fall back to the built-in lineup.
              </p>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-3">
                {zoneStages.map((stage) => (
                  <div key={stage.id} className="flex flex-col gap-1.5">
                    <div className="relative">
                      <StageGrid stage={stage} enemies={enemies} />
                      {stage.isBossStage && (
                        <span className="absolute -right-1.5 -top-1.5 z-20 flex items-center gap-1 rounded-full border border-gold/40 bg-ocean-deep px-2 py-0.5 font-display text-[9px] font-bold uppercase tracking-wider text-gold shadow">
                          <Crown size={9} />
                          Boss
                        </span>
                      )}
                    </div>

                    <div className="flex items-baseline gap-2">
                      <h3 className="truncate font-display text-xs font-bold uppercase tracking-wide text-foreground">
                        {stage.name}
                      </h3>
                      <span className={cn(
                        "ml-auto shrink-0 font-display text-[10px] uppercase tracking-wider",
                        "text-muted-foreground",
                      )}>
                        {stage.cols}×{stage.rows} · {stage.placements.length}
                      </span>
                    </div>

                    <div className="flex gap-1">
                      <TileAction onClick={() => onEdit(stage)} label={`Edit ${stage.name}`} className="flex-1">
                        <Pencil size={10} />
                        Edit
                      </TileAction>
                      <TileAction onClick={() => onDelete(stage.id)} danger label={`Delete ${stage.name}`}>
                        <Trash2 size={10} />
                      </TileAction>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
