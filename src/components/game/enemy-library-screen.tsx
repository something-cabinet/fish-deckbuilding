"use client"

import { Coins, Heart, Pencil, Plus, Sparkles, Swords, Trash2 } from "lucide-react"
import type { EnemyDef } from "@/lib/game/units"
import { UnitKind } from "@/lib/game/units"
import { cn } from "@/lib/utils"

interface Props {
  enemies: EnemyDef[]
  onCreate: () => void
  onEdit: (enemy: EnemyDef) => void
  onDelete: (id: string) => void
}

const SPRITE_PATH = "/sprites/"

const KIND_LABELS: Record<UnitKind, string> = {
  [UnitKind.Hero]: "Hero",
  [UnitKind.Goon]: "Goon",
  [UnitKind.Thug]: "Thug",
  [UnitKind.Enforcer]: "Enforcer",
  [UnitKind.Boss]: "Boss",
}

const KIND_STYLES: Record<UnitKind, string> = {
  [UnitKind.Hero]: "bg-teal text-ocean-deep",
  [UnitKind.Goon]: "bg-enemy text-white",
  [UnitKind.Thug]: "bg-enemy text-white",
  [UnitKind.Enforcer]: "bg-teal text-ocean-deep",
  [UnitKind.Boss]: "bg-gold text-ocean-deep",
}

export function EnemyLibraryScreen({ enemies, onCreate, onEdit, onDelete }: Props) {
  return (
    <>
      {/* header action */}
      <div className="flex shrink-0 items-center justify-end border-b border-white/5 px-5 py-3">
        <button
          type="button"
          onClick={onCreate}
          className="flex items-center gap-1.5 rounded-lg bg-gold px-4 py-2 font-display text-sm font-bold uppercase tracking-widest text-ocean-deep transition-transform hover:scale-[1.03]"
        >
          <Plus size={16} />
          Create Enemy
        </button>
      </div>

      {/* grid */}
      <div className="flex-1 overflow-y-auto px-5 py-6">
        <div className="flex flex-wrap justify-center gap-5">
          {enemies.map((enemy) => {
            return (
              <div key={enemy.id} className="relative">
                <div className="relative flex w-[150px] select-none flex-col overflow-hidden rounded-lg border border-black/40 bg-[oklch(0.9_0.03_85)] shadow-lg">
                  {/* sprite area */}
                  <div className="relative flex h-[92px] flex-col bg-[oklch(0.82_0.02_85)]">
                    <span className={cn(
                      "absolute right-1.5 top-1.5 rounded px-1.5 py-0.5 font-display text-[9px] font-bold uppercase tracking-wider",
                      KIND_STYLES[enemy.kind] ?? "bg-enemy text-white",
                    )}>
                      {KIND_LABELS[enemy.kind] ?? "Unknown"}
                    </span>
                    {enemy.isMinion && (
                      <span className="absolute left-1.5 top-1.5 z-10 flex items-center gap-1 rounded-full border border-gold/40 bg-ocean-deep px-1.5 py-0.5 font-display text-[8px] font-bold uppercase tracking-wider text-gold shadow">
                        <Sparkles size={7} />
                        Minion
                      </span>
                    )}
                    <div className="flex flex-1 items-center justify-center">
                      <img
                        src={`${SPRITE_PATH}${enemy.icon}.png`}
                        alt={enemy.name}
                        className="h-16 w-16 object-contain"
                      />
                    </div>
                  </div>

                  {/* name */}
                  <div className="border-t border-black/20 px-2 pt-1.5">
                    <h3 className="font-display text-[13px] font-bold uppercase leading-tight tracking-wide">
                      {enemy.name}
                    </h3>
                  </div>

                  {/* stats row */}
                  <div className="mt-auto flex items-center justify-between border-t border-black/30 bg-[oklch(0.78_0.02_85)] px-2 py-1 font-display text-[10px] font-bold uppercase tracking-wider text-[oklch(0.3_0.04_260)]">
                    <span className="flex items-center gap-1">
                      <Heart size={11} />
                      {enemy.hp}
                    </span>
                    <span className="flex items-center gap-1">
                      <Swords size={11} />
                      {enemy.atk}
                    </span>
                    <span>{enemy.range === 1 ? "Melee" : "Range"}</span>
                    <span className="flex items-center gap-1">
                      <Coins size={11} />
                      {enemy.goldDrop}
                    </span>
                  </div>
                </div>

                {/* actions */}
                <div className="mt-1.5 flex gap-1">
                  <button
                    type="button"
                    onClick={() => onEdit(enemy)}
                    className="flex flex-1 items-center justify-center gap-1 rounded-md border border-white/10 bg-ocean-deep/90 px-2 py-1 font-display text-[9px] font-bold uppercase tracking-wider text-muted-foreground shadow transition-colors hover:border-gold/40 hover:text-gold"
                  >
                    <Pencil size={10} />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(enemy.id)}
                    className="flex items-center justify-center gap-1 rounded-md border border-white/10 bg-ocean-deep/90 px-2 py-1 font-display text-[9px] font-bold uppercase tracking-wider text-muted-foreground shadow transition-colors hover:border-red-400/40 hover:text-red-400"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
        {enemies.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="font-display text-sm uppercase tracking-widest text-muted-foreground">
              No enemies yet — create your first one.
            </p>
          </div>
        )}
      </div>
    </>
  )
}