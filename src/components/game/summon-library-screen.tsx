"use client"

import { Pencil, Sparkles, Trash2 } from "lucide-react"
import type { SummonDef } from "@/lib/game/summons"
import { SummonFace } from "./summon-face"
import { EmptyState, TileAction, libraryGridClass } from "./design-ui"

interface Props {
  summons: SummonDef[]
  onEdit: (summon: SummonDef) => void
  onDelete: (id: string) => void
}

export function SummonLibraryScreen({ summons, onEdit, onDelete }: Props) {
  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
      {summons.length === 0 ? (
        <EmptyState icon={Sparkles}>No summons yet — create one above.</EmptyState>
      ) : (
        <div className={libraryGridClass}>
          {summons.map((def) => (
            <div key={def.id} className="relative w-[180px]">
              <SummonFace def={def} />
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
    </div>
  )
}
