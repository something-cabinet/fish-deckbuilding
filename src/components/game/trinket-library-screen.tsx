"use client"

import { Gem, Pencil, Trash2 } from "lucide-react"
import type { TrinketDef, TrinketRarity } from "@/lib/game/trinkets"
import { TrinketFace } from "./trinket-face"
import { EmptyState, TileAction, libraryGridClass } from "./design-ui"

interface Props {
  trinkets: TrinketDef[]
  onEdit: (trinket: TrinketDef) => void
  onDelete: (id: string) => void
}

/** Rarity tiers in drop order — one authoring section each, like stage zones. */
const RARITY_SECTIONS: { id: TrinketRarity; name: string; tagline: string }[] = [
  { id: "common", name: "Common", tagline: "50% of rolls" },
  { id: "uncommon", name: "Uncommon", tagline: "35% of rolls" },
  { id: "rare", name: "Rare", tagline: "15% of rolls" },
]

export function TrinketLibraryScreen({ trinkets, onEdit, onDelete }: Props) {
  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
      {trinkets.length === 0 && (
        <EmptyState icon={Gem}>No trinkets yet — create one above.</EmptyState>
      )}

      {RARITY_SECTIONS.map((tier) => {
        const tierTrinkets = trinkets.filter((t) => t.rarity === tier.id)
        if (trinkets.length === 0) return null

        return (
          <section key={tier.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <header className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
              <h2 className="font-display text-sm font-bold uppercase tracking-[0.18em] text-gold">
                {tier.name}
              </h2>
              <span className="font-display text-xs uppercase tracking-wider text-muted-foreground">
                {tier.tagline} · {tierTrinkets.length} trinket{tierTrinkets.length === 1 ? "" : "s"}
              </span>
            </header>

            {tierTrinkets.length === 0 ? (
              <p className="py-6 text-center font-display text-xs uppercase tracking-wider text-muted-foreground/60">
                No {tier.name.toLowerCase()} trinkets — this tier never drops.
              </p>
            ) : (
              <div className={libraryGridClass}>
                {tierTrinkets.map((def) => (
                  <div key={def.id} className="w-[150px]">
                    <TrinketFace def={def} />
                    <div className="mt-1.5 flex gap-1">
                      <TileAction onClick={() => onEdit(def)} label={`Edit ${def.name}`} className="flex-1">
                        <Pencil size={10} />
                        Edit
                      </TileAction>
                      <TileAction onClick={() => onDelete(def.id)} danger label={`Delete ${def.name}`}>
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
