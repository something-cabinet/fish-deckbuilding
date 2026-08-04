"use client"

import { Coins, Percent } from "lucide-react"
import { Phase, type GameState } from "@/lib/game/battle"
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

  const pct = (state.foreclosure / state.foreclosureMax) * 100
  const danger = state.foreclosure <= 4

  return (
    <header className="flex shrink-0 items-center justify-between gap-4 border-b border-gold/20 bg-ocean-deep/70 px-4 py-2.5 backdrop-blur-sm">
      {/* left: identity */}
      <div className="min-w-[160px]">
        <p className="font-display text-sm font-bold uppercase tracking-wider text-gold">Guppy the Debtor</p>
        <p className="font-display text-xs uppercase tracking-widest text-muted-foreground">
          Turn <span className="text-foreground">{state.turn}</span>
        </p>
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
        <Stat label="Coin" value={state.coin} icon={<Coins size={13} className="text-gold" />} />
        <Stat label="Interest" value={state.interest} icon={<Percent size={13} className="text-enemy" />} />
        <div className="flex flex-col items-end gap-1">
          <span className="flex items-center gap-1.5 font-display text-[10px] uppercase tracking-widest text-muted-foreground">
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
      <span className="flex items-center gap-1 font-display text-[10px] uppercase tracking-widest text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="font-display text-lg font-bold leading-none text-foreground">{value}</span>
    </div>
  )
}
