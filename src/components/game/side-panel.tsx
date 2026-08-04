"use client"

import { useEffect, useRef } from "react"
import { cellLabel } from "@/lib/game/engine"
import type { GameState, Unit } from "@/lib/game/types"
import { cn } from "@/lib/utils"

interface Props {
  state: GameState
  onHoverUnit: (id: string | null) => void
  onSelectUnit: (unit: Unit) => void
}

export function SidePanel({ state, onHoverUnit, onSelectUnit }: Props) {
  const logRef = useRef<HTMLOListElement>(null)
  const sorted = [...state.units].sort((a, b) => {
    if (a.team !== b.team) return a.team === "player" ? -1 : 1
    return 0
  })

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" })
  }, [state.log.length])

  return (
    <aside className="flex h-full w-full flex-col gap-4 border-l border-gold/20 bg-ocean-deep/50 p-4" style={{ containerType: "inline-size" }}>
      <section>
        <h2 className="mb-2 font-display text-[clamp(9px,4cqi,12px)] font-bold uppercase tracking-[0.25em] text-gold">On the Table</h2>
        <ul className="flex flex-col gap-1.5">
          {sorted.map((u) => {
            const isPlayer = u.team === "player"
            const pct = Math.max(0, (u.hp / u.maxHp) * 100)
            return (
              <li key={u.id}>
                <button
                  type="button"
                  onMouseEnter={() => onHoverUnit(u.id)}
                  onMouseLeave={() => onHoverUnit(null)}
                  onClick={() => onSelectUnit(u)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md border-l-2 bg-white/[0.03] px-2 py-1.5 text-left transition-colors hover:bg-white/[0.07]",
                    isPlayer ? "border-gold" : "border-enemy",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-display text-[clamp(9px,4cqi,12px)] font-bold uppercase tracking-wide text-foreground">
                        {u.name}
                      </span>
                      <span className="font-display text-[clamp(7px,3cqi,10px)] text-muted-foreground">{cellLabel(u.pos)}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="h-[clamp(4px,2cqi,6px)] flex-1 overflow-hidden rounded-full bg-white/10">
                        <span
                          className={cn("block h-full rounded-full", isPlayer ? "bg-emerald-400" : "bg-enemy")}
                          style={{ width: `${pct}%` }}
                        />
                      </span>
                      <span className="font-display text-[clamp(7px,3cqi,10px)] tabular-nums text-muted-foreground">
                        {u.hp}/{u.maxHp}
                      </span>
                    </div>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="flex min-h-0 flex-1 flex-col">
        <h2 className="mb-2 font-display text-[clamp(9px,4cqi,12px)] font-bold uppercase tracking-[0.25em] text-gold">Bulletin</h2>
        <ol
          ref={logRef}
          className="flex flex-1 flex-col gap-1.5 overflow-y-auto pr-1 text-[clamp(8px,3.5cqi,12px)] leading-snug"
        >
          {state.log.map((e) => (
            <li key={e.id} className="flex gap-2 animate-fm-fade-in">
              <span className="mt-[1px] font-display text-[clamp(6px,2.5cqi,10px)] text-muted-foreground/70">{e.turn}</span>
              <span
                className={cn(
                  e.tone === "good" && "text-emerald-300",
                  e.tone === "bad" && "text-enemy",
                  e.tone === "gold" && "text-gold",
                  e.tone === "neutral" && "text-muted-foreground",
                )}
              >
                {e.text}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </aside>
  )
}
