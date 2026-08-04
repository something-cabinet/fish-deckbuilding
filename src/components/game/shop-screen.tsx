"use client"

import { useState } from "react"
import { Coins, Scale, ShoppingBag, Trash2, X } from "lucide-react"
import type { ShopOffer } from "@/lib/game/overworld-engine"
import { CARD_LIBRARY } from "@/lib/game/cards"
import { CardFace } from "./card-face"
import { cn } from "@/lib/utils"

interface Props {
  gold: number
  debt: number
  deck: string[]
  offers: ShopOffer[]
  removePrice: number
  /** ids already bought this visit (so each offer sells once) */
  onBuy: (cardId: string, price: number) => void
  onRemove: (cardId: string) => void
  onPayDebt: (amount: number) => void
  onLeave: () => void
}

const DEBT_STEPS = [25, 50, 100]

export function ShopScreen({
  gold,
  debt,
  deck,
  offers,
  removePrice,
  onBuy,
  onRemove,
  onPayDebt,
  onLeave,
}: Props) {
  const [bought, setBought] = useState<Set<string>>(new Set())
  const [removeMode, setRemoveMode] = useState(false)

  const buy = (cardId: string, price: number) => {
    if (gold < price || bought.has(cardId)) return
    onBuy(cardId, price)
    setBought((prev) => new Set(prev).add(cardId))
  }

  const uniqueDeck = Array.from(new Set(deck))

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-ocean-deep/92 p-4 backdrop-blur-sm animate-fm-fade-in sm:p-6">
      {/* header */}
      <div className="mx-auto flex w-full max-w-4xl items-center justify-between">
        <div>
          <p className="font-display text-xs uppercase tracking-[0.4em] text-muted-foreground">
            The Fishmonger&apos;s Back Room
          </p>
          <h2 className="flex items-center gap-2 font-display text-3xl font-bold uppercase tracking-widest text-gold">
            <ShoppingBag size={26} />
            Shop
          </h2>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-display text-sm font-bold uppercase tracking-wider text-gold">
            <Coins size={16} />
            {gold}
          </span>
          <button
            type="button"
            onClick={onLeave}
            aria-label="Leave shop"
            className="flex items-center gap-1.5 rounded-md border border-white/15 px-3 py-1.5 font-display text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:border-gold/40 hover:text-gold"
          >
            <X size={14} />
            Leave
          </button>
        </div>
      </div>

      <div className="mx-auto mt-5 flex w-full max-w-4xl flex-1 flex-col gap-6 overflow-y-auto">
        {/* cards for sale */}
        <section>
          <h3 className="mb-3 font-display text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground">
            Cards for sale
          </h3>
          <div className="flex flex-wrap gap-4">
            {offers.map(({ cardId, price }) => {
              const def = CARD_LIBRARY[cardId]
              if (!def) return null
              const sold = bought.has(cardId)
              const afford = gold >= price
              return (
                <div key={cardId} className="flex flex-col items-center gap-2">
                  <div className={cn("relative", sold && "opacity-40 grayscale")}>
                    <CardFace def={def} size="md" />
                    {sold && (
                      <span className="absolute inset-0 flex items-center justify-center font-display text-sm font-bold uppercase tracking-widest text-gold">
                        Sold
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={sold || !afford}
                    onClick={() => buy(cardId, price)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-display text-xs font-bold uppercase tracking-wider transition-colors",
                      sold
                        ? "cursor-not-allowed border-white/10 text-muted-foreground/50"
                        : afford
                          ? "border-gold/50 bg-gold/15 text-gold hover:bg-gold/25"
                          : "cursor-not-allowed border-enemy/40 text-enemy/70",
                    )}
                  >
                    <Coins size={13} />
                    {price}
                  </button>
                </div>
              )
            })}
          </div>
        </section>

        {/* services: pay debt + strike a card */}
        <section className="grid gap-4 sm:grid-cols-2">
          {/* pay down debt */}
          <div className="rounded-xl border border-gold/25 bg-white/[0.03] p-4">
            <h3 className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-gold">
              <Scale size={16} />
              Pay tribute
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Outstanding debt: <span className="font-bold text-foreground">{debt}</span>. Gold pays
              it down 1:1 and buys you time before foreclosure.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {DEBT_STEPS.map((amt) => {
                const payable = Math.min(amt, gold, debt)
                const disabled = payable <= 0
                return (
                  <button
                    key={amt}
                    type="button"
                    disabled={disabled}
                    onClick={() => onPayDebt(amt)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-display text-xs font-bold uppercase tracking-wider transition-colors",
                      disabled
                        ? "cursor-not-allowed border-white/10 text-muted-foreground/50"
                        : "border-gold/50 bg-gold/10 text-gold hover:bg-gold/20",
                    )}
                  >
                    <Coins size={13} />
                    {amt}
                  </button>
                )
              })}
              <button
                type="button"
                disabled={gold <= 0 || debt <= 0}
                onClick={() => onPayDebt(Math.min(gold, debt))}
                className={cn(
                  "rounded-md border px-3 py-1.5 font-display text-xs font-bold uppercase tracking-wider transition-colors",
                  gold <= 0 || debt <= 0
                    ? "cursor-not-allowed border-white/10 text-muted-foreground/50"
                    : "border-gold/50 bg-gold/10 text-gold hover:bg-gold/20",
                )}
              >
                Max
              </button>
            </div>
          </div>

          {/* strike a card */}
          <div className="rounded-xl border border-enemy/25 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-enemy">
                <Trash2 size={16} />
                Strike a card
              </h3>
              <span className="flex items-center gap-1 font-display text-xs font-bold text-gold">
                <Coins size={12} />
                {removePrice}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Thin your deck — remove a card so the ones that matter come up more.
            </p>
            {!removeMode ? (
              <button
                type="button"
                disabled={gold < removePrice || deck.length <= 1}
                onClick={() => setRemoveMode(true)}
                className={cn(
                  "mt-3 rounded-md border px-3 py-1.5 font-display text-xs font-bold uppercase tracking-wider transition-colors",
                  gold < removePrice || deck.length <= 1
                    ? "cursor-not-allowed border-white/10 text-muted-foreground/50"
                    : "border-enemy/50 bg-enemy/10 text-enemy hover:bg-enemy/20",
                )}
              >
                Choose a card
              </button>
            ) : (
              <div className="mt-3 flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
                {uniqueDeck.map((id) => {
                  const def = CARD_LIBRARY[id]
                  if (!def) return null
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        onRemove(id)
                        setRemoveMode(false)
                      }}
                      className="rounded border border-enemy/40 bg-enemy/5 px-2 py-1 text-[11px] text-foreground transition-colors hover:bg-enemy/20"
                    >
                      {def.name}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
