"use client"

import { Pencil, Shield, Trash2 } from "lucide-react"
import type { EnemyDef } from "@/lib/game/units"
import { EnemyFace } from "./enemy-face"
import { EmptyState, TileAction, libraryGridClass } from "./design-ui"

interface Props {
  enemies: EnemyDef[]
  onEdit: (enemy: EnemyDef) => void
  onDelete: (id: string) => void
}

/**
 * Enemies tab of the library. The header owns the Create action and the count,
 * so this renders nothing but the grid — same shape as the cards tab.
 */
export function EnemyLibraryScreen({ enemies, onEdit, onDelete }: Props) {
  return (
    <div className="flex flex-1 flex-col overflow-y-auto px-4 py-4">
      {enemies.length === 0 ? (
        <EmptyState icon={Shield}>No enemies yet — create your first one.</EmptyState>
      ) : (
        <div className={libraryGridClass}>
          {enemies.map((enemy) => (
            <div key={enemy.id} className="w-[150px]">
              <EnemyFace def={enemy} />
              <div className="mt-1.5 flex gap-1">
                <TileAction onClick={() => onEdit(enemy)} label={`Edit ${enemy.name}`} className="flex-1">
                  <Pencil size={10} />
                  Edit
                </TileAction>
                <TileAction onClick={() => onDelete(enemy.id)} danger label={`Delete ${enemy.name}`}>
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
