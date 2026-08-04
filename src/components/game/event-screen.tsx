"use client"

import { useState } from "react"
import { Coins, HeartPulse, HelpCircle, Layers, Scale } from "lucide-react"
import type { EventChoice, EventDef } from "@/lib/game/overworld-data"
import { CARD_LIBRARY } from "@/lib/game/cards"
import { cn } from "@/lib/utils"

interface Props {
  event: EventDef
  onChoose: (choice: EventChoice) => void
}

/** A `?` encounter: pick one of a few outcomes, see the result, move on. */
export function EventScreen({ event, onChoose }: Props) {
  const [picked, setPicked] = useState<EventChoice | null>(null)

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-ocean-deep/92 p-6 backdrop-blur-sm animate-fm-fade-in">
      <div className="flex w-full max-w-lg flex-col rounded-2xl border border-teal/30 bg-ocean-deep/95 p-6 shadow-2xl">
        <p className="flex items-center gap-2 font-display text-xs uppercase tracking-[0.4em] text-teal">
          <HelpCircle size={14} />
          Encounter
        </p>
        <h2 className="mt-1 font-display text-2xl font-bold uppercase tracking-widest text-foreground">
          {event.title}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{event.prompt}</p>

        {!picked ? (
          <div className="mt-5 flex flex-col gap-2.5">
            {event.choices.map((choice, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPicked(choice)}
                className="group flex items-center justify-between gap-3 rounded-lg border border-white/12 bg-white/[0.03] px-4 py-3 text-left transition-colors hover:border-teal/50 hover:bg-teal/10"
              >
                <span className="font-display text-sm font-bold uppercase tracking-wide text-foreground">
                  {choice.label}
                </span>
                <span className="flex items-center gap-2">
                  <Effects choice={choice} />
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-5 flex flex-col items-center gap-4 text-center">
            <p className="text-sm italic text-foreground">{picked.result}</p>
            <span className="flex items-center gap-3">
              <Effects choice={picked} />
            </span>
            <button
              type="button"
              onClick={() => onChoose(picked)}
              className="mt-1 rounded-lg bg-teal px-6 py-2.5 font-display text-sm font-bold uppercase tracking-wider text-ocean-deep transition-transform hover:scale-105"
            >
              Move on
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/** Compact icon summary of a choice's outcome. */
function Effects({ choice }: { choice: EventChoice }) {
  const items: React.ReactNode[] = []
  if (choice.gold) items.push(<Chip key="g" icon={<Coins size={12} />} value={choice.gold} tone="gold" suffix="gold" />)
  if (choice.hp) items.push(<Chip key="h" icon={<HeartPulse size={12} />} value={choice.hp} tone="hp" suffix="HP" />)
  if (choice.debt) items.push(<Chip key="d" icon={<Scale size={12} />} value={choice.debt} tone="debt" suffix="debt" invert />)
  if (choice.card) {
    const def = CARD_LIBRARY[choice.card]
    items.push(
      <span key="c" className="flex items-center gap-1 font-display text-[11px] font-bold uppercase tracking-wide text-teal">
        <Layers size={12} />+{def?.name ?? "card"}
      </span>,
    )
  }
  if (items.length === 0) {
    return <span className="font-display text-[11px] uppercase tracking-wide text-muted-foreground">No cost</span>
  }
  return <>{items}</>
}

function Chip({
  icon,
  value,
  tone,
  suffix,
  invert,
}: {
  icon: React.ReactNode
  value: number
  tone: "gold" | "hp" | "debt"
  suffix: string
  /** for debt: a positive number is bad (red), negative is good (green) */
  invert?: boolean
}) {
  const positive = value > 0
  const good = invert ? !positive : positive
  return (
    <span
      className={cn(
        "flex items-center gap-1 font-display text-[11px] font-bold uppercase tracking-wide",
        tone === "gold" ? "text-gold" : good ? "text-teal" : "text-enemy",
      )}
    >
      {icon}
      {positive ? "+" : ""}
      {value} {suffix}
    </span>
  )
}
