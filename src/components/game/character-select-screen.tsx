"use client"

import { useState } from "react"
import { ArrowLeft, Footprints, Heart, Layers, Play, Swords } from "lucide-react"
import type { CharacterDef } from "@/lib/game/characters"
import { spriteUrl } from "./sprites"
import { cn } from "@/lib/utils"

interface Props {
  characters: CharacterDef[]
  onBack: () => void
  /** start a run as the picked character */
  onConfirm: (characterId: string) => void
}

/**
 * Run-start roster. One character today, so the first is preselected and the
 * screen reads as a confirmation — the grid is what grows as more are authored.
 */
export function CharacterSelectScreen({ characters, onBack, onConfirm }: Props) {
  const [selectedId, setSelectedId] = useState(characters[0]?.id ?? "")
  const selected = characters.find((c) => c.id === selectedId)

  return (
    <main className="relative flex h-dvh w-full flex-col overflow-hidden bg-background text-foreground">
      <img
        src="/menu-bg.png"
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover opacity-40"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-ocean-deep/80 via-ocean-deep/60 to-ocean-deep/95" />

      <header className="relative z-10 flex h-14 shrink-0 items-center gap-3 px-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1.5 font-display text-xs font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:border-gold/40 hover:text-gold"
        >
          <ArrowLeft size={14} />
          Menu
        </button>
      </header>

      <div className="relative z-10 flex flex-1 flex-col items-center overflow-y-auto px-6 pb-8 text-center">
        <h1 className="font-display text-4xl font-bold uppercase tracking-widest text-foreground drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] sm:text-5xl">
          Choose Your <span className="text-gold">Fish</span>
        </h1>
        <p className="mt-3 max-w-md text-pretty leading-relaxed text-muted-foreground">
          Every fish owes the syndicate something different. Pick who swims into the red today.
        </p>

        {characters.length === 0 ? (
          <p className="mt-16 font-display text-sm uppercase tracking-[0.2em] text-muted-foreground">
            No characters authored — create one in the Design tool.
          </p>
        ) : (
          <div className="mt-8 flex flex-wrap items-stretch justify-center gap-4">
            {characters.map((def) => {
              const active = def.id === selectedId
              return (
                <button
                  key={def.id}
                  type="button"
                  onClick={() => setSelectedId(def.id)}
                  aria-pressed={active}
                  className={cn(
                    "flex w-[220px] flex-col items-center gap-2 rounded-2xl border-2 bg-ocean-deep/70 p-4 text-center backdrop-blur-sm transition-all",
                    active
                      ? "border-gold shadow-[0_0_24px_rgba(0,0,0,0.5)]"
                      : "border-white/10 opacity-80 hover:border-gold/40 hover:opacity-100",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-24 w-24 items-center justify-center rounded-full border bg-gold/10",
                      active ? "border-gold/60" : "border-white/15",
                    )}
                  >
                    <img
                      src={spriteUrl(def.icon)}
                      alt={`${def.name} portrait`}
                      className="h-20 w-20 object-contain"
                    />
                  </div>

                  <h2 className="font-display text-lg font-bold uppercase tracking-wide text-foreground">
                    {def.name}
                  </h2>
                  {def.title && (
                    <span className="font-display text-xs font-bold uppercase tracking-[0.2em] text-gold">
                      {def.title}
                    </span>
                  )}
                  {def.description && (
                    <p className="text-xs leading-snug text-muted-foreground">{def.description}</p>
                  )}

                  <div className="mt-auto flex w-full flex-col gap-1.5 border-t border-white/10 pt-2.5 font-display text-xs font-bold uppercase tracking-wider">
                    <StatRow icon={Heart} label="Health" value={def.stats.maxHp} className="text-enemy" />
                    <StatRow icon={Swords} label="Melee" value={def.stats.atk} className="text-gold" />
                    <StatRow icon={Footprints} label="Speed" value={def.stats.move} className="text-teal" />
                    <StatRow
                      icon={Layers}
                      label="Deck"
                      value={def.starterDeck.length}
                      className="text-muted-foreground"
                    />
                  </div>
                </button>
              )
            })}
          </div>
        )}

        <button
          type="button"
          disabled={!selected}
          onClick={() => selected && onConfirm(selected.id)}
          className={cn(
            "mt-8 flex w-64 items-center justify-center gap-2 rounded-lg px-6 py-4 font-display text-xl font-bold uppercase tracking-widest shadow-lg transition-all",
            selected
              ? "bg-gold text-ocean-deep hover:scale-[1.03] hover:shadow-xl"
              : "cursor-not-allowed bg-white/10 text-muted-foreground",
          )}
        >
          <Play size={22} />
          Begin Run
        </button>
      </div>
    </main>
  )
}

function StatRow({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: React.ElementType
  label: string
  value: number
  className?: string
}) {
  return (
    <span className="flex items-center justify-between gap-2 text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <Icon size={12} className={className} aria-hidden />
        {label}
      </span>
      <span className="text-foreground">{value}</span>
    </span>
  )
}
