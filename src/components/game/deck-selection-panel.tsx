"use client"

import { useEffect, useMemo, useState } from "react"
import { Layers, Search, X } from "lucide-react"
import { CARD_LIBRARY, CardType } from "@/lib/game/cards"
import { CardFace } from "./card-face"
import { Chip, Panel, PrimaryButton, Stepper, inputClass, libraryGridClass } from "./design-ui"
import { cn } from "@/lib/utils"

/**
 * Shared deck editor for the character and enemy designers. Collapsed it only
 * reports the deck size; opening it reveals a full card-browser popup where
 * every card is shown complete (art, cost, type, target, text, value) with a
 * per-card copy stepper. The deck is normalized to `cardId -> copies`; callers
 * adapt to whatever shape their data model uses.
 */
export function DeckSelectionPanel({
  title = "Deck",
  counts,
  onChange,
  maxCopies = 10,
}: {
  title?: string
  /** copies per card id; cards absent from the record are not in the deck */
  counts: Record<string, number>
  onChange: (counts: Record<string, number>) => void
  /** max copies of a single card allowed in the deck */
  maxCopies?: number
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<CardType | null>(null)

  const cards = useMemo(() => Object.values(CARD_LIBRARY), [])
  const total = useMemo(() => Object.values(counts).reduce((sum, n) => sum + n, 0), [counts])
  const unique = Object.keys(counts).length

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  // cards already in the deck float to the top so edits stay in one place
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    let matches = q ? cards.filter((c) => c.name.toLowerCase().includes(q)) : cards
    if (typeFilter) matches = matches.filter((c) => c.type === typeFilter)
    return [...matches].sort(
      (a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0) || a.name.localeCompare(b.name),
    )
  }, [cards, counts, search, typeFilter])

  function setCount(cardId: string, value: number) {
    const next = { ...counts }
    if (value <= 0) delete next[cardId]
    else next[cardId] = value
    onChange(next)
  }

  return (
    <>
      <Panel title={title}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "group flex w-full items-center justify-between gap-3 rounded-lg border border-white/10",
            "bg-white/[0.04] px-3 py-2.5 text-left transition-colors hover:border-gold/40",
          )}
        >
          <span className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-foreground">
            <Layers size={16} className="text-gold" aria-hidden />
            {total} card{total === 1 ? "" : "s"}
            {unique > 0 && (
              <span className="font-sans text-xs font-normal normal-case tracking-normal text-muted-foreground">
                ({unique} unique)
              </span>
            )}
          </span>
          <span className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground transition-colors group-hover:text-gold">
            Edit Deck
          </span>
        </button>
      </Panel>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ocean-deep/85 p-4 backdrop-blur-sm animate-fm-fade-in"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${title} editor`}
            className={cn(
              "flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-2xl",
              "border border-gold/30 bg-card/95 shadow-2xl",
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center gap-3 border-b border-white/10 px-4 py-3">
              <Layers size={16} className="text-gold" aria-hidden />
              <h2 className="font-display text-base font-bold uppercase tracking-[0.08em] text-gold">
                {title}
              </h2>
              <span className="rounded-full border border-white/10 px-2 py-0.5 font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {total} cards
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close deck editor"
                className="ml-auto flex h-8 w-8 items-center justify-center rounded-md border border-white/10 text-muted-foreground transition-colors hover:border-gold/40 hover:text-gold"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-white/10 px-4 py-3">
              <div className="relative w-full max-w-[240px]">
                <Search
                  size={14}
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search cards…"
                  aria-label="Search cards"
                  className={cn(inputClass, "py-1.5 pl-8 text-sm")}
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Chip active={typeFilter === null} onClick={() => setTypeFilter(null)}>
                  All
                </Chip>
                {[CardType.Attack, CardType.Skill, CardType.Summon].map((t) => (
                  <Chip key={t} active={typeFilter === t} onClick={() => setTypeFilter(t)}>
                    {t}
                  </Chip>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {visible.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No cards match “{search}”.
                </p>
              ) : (
                <ul className={libraryGridClass}>
                  {visible.map((card) => {
                    const count = counts[card.id] ?? 0
                    return (
                      <li key={card.id} className="flex flex-col items-center gap-2">
                        <div className="relative">
                          <CardFace
                            def={card}
                            size="sm"
                            className={cn(count > 0 && "ring-2 ring-gold")}
                          />
                          {count > 0 && (
                            <span
                              className={cn(
                                "absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full",
                                "border border-gold/50 bg-ocean-deep px-1 font-display text-xs font-bold text-gold shadow",
                              )}
                            >
                              ×{count}
                            </span>
                          )}
                        </div>
                        <Stepper
                          value={count}
                          min={0}
                          max={maxCopies}
                          onChange={(v) => setCount(card.id, v)}
                          label={`${card.name} copies`}
                        />
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            <div className="flex shrink-0 items-center justify-between border-t border-white/10 px-4 py-3">
              <span className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {total} card{total === 1 ? "" : "s"} in deck
              </span>
              <PrimaryButton onClick={() => setOpen(false)}>Done</PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
