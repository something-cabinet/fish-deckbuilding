"use client"

import { Pencil, Trash2, User } from "lucide-react"
import type { CharacterDef } from "@/lib/game/characters"
import { CharacterFace } from "./character-face"
import { EmptyState, TileAction, libraryGridClass } from "./design-ui"

interface Props {
  characters: CharacterDef[]
  onEdit: (character: CharacterDef) => void
  onDelete: (id: string) => void
}

export function CharacterLibraryScreen({ characters, onEdit, onDelete }: Props) {
  // the first character is the one a run starts as until a select screen exists
  const defaultId = characters[0]?.id

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
      {characters.length === 0 ? (
        <EmptyState icon={User}>No characters yet — create one above.</EmptyState>
      ) : (
        <section className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <header className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
            <h2 className="font-display text-sm font-bold uppercase tracking-[0.18em] text-gold">
              Playable
            </h2>
            <span className="font-display text-xs uppercase tracking-wider text-muted-foreground">
              {characters.length} character{characters.length === 1 ? "" : "s"} · runs start as the
              first one
            </span>
          </header>

          <div className={libraryGridClass}>
            {characters.map((def) => (
              <div key={def.id} className="relative w-[150px]">
                {def.id === defaultId && (
                  <span className="absolute -right-1.5 -top-1.5 z-20 rounded-full border border-gold/40 bg-ocean-deep px-2 py-0.5 font-display text-xs font-bold uppercase tracking-wider text-gold shadow">
                    Default
                  </span>
                )}
                <CharacterFace def={def} />
                <div className="mt-1.5 flex gap-1">
                  <TileAction
                    onClick={() => onEdit(def)}
                    label={`Edit ${def.name}`}
                    className="flex-1"
                  >
                    <Pencil size={10} />
                    Edit
                  </TileAction>
                  {characters.length > 1 && (
                    <TileAction onClick={() => onDelete(def.id)} danger label={`Delete ${def.name}`}>
                      <Trash2 size={10} />
                    </TileAction>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
