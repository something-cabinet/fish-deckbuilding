"use client"

import { Gem, Percent } from "lucide-react"
import { Phase, type GameState } from "@/lib/game/battle"
import { resolveCharacter } from "@/lib/game/characters"
import { TRINKET_LIBRARY } from "@/lib/game/trinkets"
import { getCardIcon } from "./card-icons"
import { cn } from "@/lib/utils"

function phaseTitle(phase: Phase): string {
  switch (phase) {
    case Phase.Player:
      return "Your Move"
    case Phase.Enemy:
      return "The Mob Moves"
    case Phase.Won:
      return "Debt Collected"
    case Phase.Lost:
      return "Foreclosed"
    default: {
      const _exhaustive: never = phase
      return ""
    }
  }
}

export function TopBar({ state }: { state: GameState }) {
  const title = phaseTitle(state.phase)
  const character = resolveCharacter(state.characterId)

  const pct = (state.foreclosure / state.foreclosureMax) * 100
  const danger = state.foreclosure <= 4

  return (
    <header className="flex shrink-0 items-center justify-between gap-4 border-b border-gold/20 bg-ocean-deep/70 px-4 py-2.5 backdrop-blur-sm">
      {/* left: identity */}
      <div className="flex min-w-[160px] items-center gap-3">
        <div>
          <p className="font-display text-sm font-bold uppercase tracking-wider text-gold">
            {character.name} {character.title}
          </p>
          <p className="font-display text-xs uppercase tracking-widest text-muted-foreground">
            Turn <span className="text-foreground">{state.turn}</span>
          </p>
        </div>
        {/* trinket tray */}
        {state.activeTrinkets.length > 0 && (
          <div className="flex max-w-[316px] flex-wrap content-start gap-1">
            {state.activeTrinkets.map((id) => {
              const def = TRINKET_LIBRARY[id]
              if (!def) return null
              const TrinketIcon = getCardIcon(def.icon)
              return (
                <div key={id} className="group relative">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md border border-gold/30 bg-gold/10">
                    <TrinketIcon size={13} className="text-gold" />
                  </div>
                  <div className="pointer-events-none absolute top-full left-1/2 z-50 mt-1 w-44 -translate-x-1/2 origin-top scale-95 rounded-lg border border-gold/30 bg-ocean-deep/95 px-2.5 py-2 opacity-0 shadow-xl backdrop-blur-sm transition-all group-hover:scale-100 group-hover:opacity-100">
                    <p className="font-display text-xs font-bold uppercase tracking-wider text-gold">{def.name}</p>
                    <p className="mt-0.5 font-display text-xs uppercase tracking-wider text-muted-foreground">
                      {def.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* center: phase title */}
      <h1
        className={cn(
          "font-display text-2xl font-bold uppercase tracking-[0.25em] transition-colors sm:text-3xl",
          state.phase === Phase.Enemy ? "text-enemy" : "text-foreground",
        )}
      >
        {title}
      </h1>

      {/* right: resources */}
      <div className="flex min-w-[160px] items-center justify-end gap-5">
        <Stat label="Fin" value={state.fin} icon={<Gem size={13} className="text-teal" />} />
        <Stat label="Interest" value={state.interest} icon={<Percent size={13} className="text-enemy" />} />
        <div className="flex flex-col items-end gap-1">
          <span className="flex items-center gap-1.5 font-display text-xs uppercase tracking-widest text-muted-foreground">
            Foreclosure
            <span className={cn("font-bold", danger ? "text-enemy" : "text-foreground")}>T-{state.foreclosure}</span>
          </span>
          <span className="h-1.5 w-28 overflow-hidden rounded-full bg-white/10">
            <span
              className={cn("block h-full rounded-full transition-all", danger ? "bg-enemy" : "bg-gold")}
              style={{ width: `${pct}%` }}
            />
          </span>
        </div>
      </div>
    </header>
  )
}

function Stat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-end">
      <span className="flex items-center gap-1 font-display text-xs uppercase tracking-widest text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="font-display text-lg font-bold leading-none text-foreground">{value}</span>
    </div>
  )
}
