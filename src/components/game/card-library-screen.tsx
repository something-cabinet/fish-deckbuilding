"use client"

import { useMemo, useState } from "react"
import { ArrowLeft, Library, Plus, Sparkles } from "lucide-react"
import { CardType, type CardDef } from "@/lib/game/cards"
import { CARD_LIBRARY } from "@/lib/game"
import { CardFace } from "./card-face"
import { cn } from "@/lib/utils"

interface Props {
  customCards: CardDef[]
  onBack: () => void
  onCreate: () => void
}

/** Card filter; null means "All" (no bare literal discriminators). */
type Filter = CardType | null

const FILTERS: { id: Filter; label: string }[] = [
  { id: null, label: "All" },
  { id: CardType.Attack, label: "Attack" },
  { id: CardType.Skill, label: "Skill" },
  { id: CardType.Summon, label: "Summon" },
]

export function CardLibraryScreen({ customCards, onBack, onCreate }: Props) {
  const [filter, setFilter] = useState<Filter>(null)

  const baseCards = useMemo(() => Object.values(CARD_LIBRARY), [])
  const allCards = useMemo(() => [...baseCards, ...customCards], [baseCards, customCards])
  const customIds = useMemo(() => new Set(customCards.map((c) => c.id)), [customCards])

  const visible = filter === null ? allCards : allCards.filter((c) => c.type === filter)

  return (
    <main className="flex h-dvh w-full flex-col overflow-hidden bg-ocean-deep text-foreground">
      {/* header */}
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 bg-ocean-deep/80 px-5 py-4 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 font-display text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:border-gold/40 hover:text-gold"
          >
            <ArrowLeft size={14} />
            Menu
          </button>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold uppercase tracking-widest text-foreground">
            <Library size={22} className="text-gold" />
            Card <span className="text-gold">Library</span>
          </h1>
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="flex items-center gap-1.5 rounded-lg bg-gold px-4 py-2 font-display text-sm font-bold uppercase tracking-widest text-ocean-deep transition-transform hover:scale-[1.03]"
        >
          <Plus size={16} />
          Create
        </button>
      </header>

      {/* filters */}
      <div className="flex shrink-0 items-center gap-2 border-b border-white/5 px-5 py-3">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              "rounded-full px-4 py-1.5 font-display text-xs font-bold uppercase tracking-wider transition-colors",
              filter === f.id
                ? "bg-gold text-ocean-deep"
                : "border border-white/10 text-muted-foreground hover:border-gold/40 hover:text-gold",
            )}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto font-display text-xs uppercase tracking-wider text-muted-foreground">
          {visible.length} cards
        </span>
      </div>

      {/* grid */}
      <div className="flex-1 overflow-y-auto px-5 py-6">
        <div className="flex flex-wrap justify-center gap-5">
          {visible.map((def) => (
            <div key={def.id} className="relative">
              {customIds.has(def.id) && (
                <span className="absolute -right-1.5 -top-1.5 z-20 flex items-center gap-1 rounded-full border border-gold/40 bg-ocean-deep px-2 py-0.5 font-display text-[9px] font-bold uppercase tracking-wider text-gold shadow">
                  <Sparkles size={9} />
                  Custom
                </span>
              )}
              <CardFace def={def} size="md" />
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
