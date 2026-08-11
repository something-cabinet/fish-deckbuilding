"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import {
  Bug,
  Coins,
  Gem,
  HeartPulse,
  Layers,
  Plus,
  Trash2,
  X,
  Zap,
  Swords,
  Shield,
} from "lucide-react"
import { CARD_LIBRARY } from "@/lib/game/cards"
import { TRINKET_LIBRARY, TRINKET_IDS } from "@/lib/game/trinkets"
import type { OverworldState } from "@/lib/game/overworld-types"
import { FORECLOSURE_CAP } from "@/lib/game/overworld-data"
import type { GameState } from "@/lib/game/battle"
import { Phase } from "@/lib/game/battle"
import { cn } from "@/lib/utils"

type Tab = "overworld" | "battle" | "cards" | "trinkets"

interface DebugMenuProps {
  overworldState?: OverworldState | null
  onOverworldUpdate?: (partial: Partial<OverworldState>) => void
  battleDebug?: { debugUpdate: (p: Partial<GameState>) => void; drawCards: (n: number) => void } | null
  onBattleUpdate?: (partial: Partial<GameState>) => void
}

export function DebugMenu({
  overworldState,
  onOverworldUpdate,
  battleDebug,
  onBattleUpdate,
}: DebugMenuProps) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>("overworld")
  const [goldInput, setGoldInput] = useState("")
  const [debtInput, setDebtInput] = useState("")
  const [hpInput, setHpInput] = useState("")
  const [finInput, setFinInput] = useState("")
  const [coinInput, setCoinInput] = useState("")
  const [handMaxInput, setHandMaxInput] = useState("")
  const [cardSearch, setCardSearch] = useState("")
  const [trinketSearch, setTrinketSearch] = useState("")

  const toggle = useCallback(() => setOpen((v) => !v), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "`" || (e.key === "F12")) {
        e.preventDefault()
        toggle()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [toggle])

  useEffect(() => {
    if (!open) return
    setGoldInput(String(overworldState?.gold ?? ""))
    setDebtInput(String(overworldState?.debt ?? ""))
    setHpInput(String(overworldState?.hp ?? ""))
    setFinInput(String(overworldState?.fin ?? 0))
    setCoinInput("")
  }, [open, overworldState])

  const isOverworld = !!onOverworldUpdate && !!overworldState
  const isBattle = !!battleDebug || !!onBattleUpdate

  const overworldUpdate = useCallback(
    (partial: Partial<OverworldState>) => {
      onOverworldUpdate?.(partial)
    },
    [onOverworldUpdate],
  )

  const battleUpdate = useCallback(
    (partial: Partial<GameState>) => {
      battleDebug?.debugUpdate(partial)
      onBattleUpdate?.(partial)
    },
    [battleDebug, onBattleUpdate],
  )

  const availableCards = useMemo(() => {
    const ids = Object.keys(CARD_LIBRARY)
    return cardSearch
      ? ids.filter((id) => {
          const def = CARD_LIBRARY[id]
          return (
            def &&
            (def.id.toLowerCase().includes(cardSearch.toLowerCase()) ||
              def.name.toLowerCase().includes(cardSearch.toLowerCase()))
          )
        })
      : ids
  }, [cardSearch])

  const availableTrinkets = useMemo(() => {
    const ids = TRINKET_IDS
    return trinketSearch
      ? ids.filter((id) => {
          const def = TRINKET_LIBRARY[id]
          return (
            def &&
            (def.id.toLowerCase().includes(trinketSearch.toLowerCase()) ||
              def.name.toLowerCase().includes(trinketSearch.toLowerCase()))
          )
        })
      : ids
  }, [trinketSearch])

  const activeTab: Tab = (() => {
    if (isBattle && tab === "battle") return "battle"
    if (isOverworld && tab === "overworld") return "overworld"
    if (tab === "cards") return "cards"
    if (tab === "trinkets") return "trinkets"
    if (isOverworld) return "overworld"
    return "battle"
  })()

  return (
    <>
      {/* floating toggle button */}
      <button
        type="button"
        onClick={toggle}
        aria-label="Debug tools"
        className={cn(
          "fixed bottom-4 left-4 z-[9999] flex h-12 w-12 items-center justify-center rounded-full border shadow-lg transition-all",
          open
            ? "border-enemy/60 bg-enemy/20 text-enemy scale-110"
            : "border-white/20 bg-ocean-deep/80 text-muted-foreground hover:border-gold/40 hover:text-gold",
        )}
      >
        <Bug size={22} />
      </button>

      {/* panel */}
      {open && (
        <div className="fixed inset-0 z-[9998] flex items-start justify-center bg-black/60 p-4 pt-16 backdrop-blur-sm">
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-gold/30 bg-ocean-deep/95 shadow-2xl animate-fm-fade-in">
            {/* header */}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <Bug size={24} className="text-enemy" />
                <h2 className="font-display text-xl font-bold uppercase tracking-widest text-foreground">
                  Debug
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close debug menu"
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
              >
                <X size={24} />
              </button>
            </div>

            {/* tabs */}
            <div className="flex shrink-0 gap-1.5 border-b border-white/10 px-5 py-3 overflow-x-auto">
              {isOverworld && (
                <TabBtn active={activeTab === "overworld"} onClick={() => setTab("overworld")}>
                  <Coins size={18} />
                  Overworld
                </TabBtn>
              )}
              {isBattle && (
                <TabBtn active={activeTab === "battle"} onClick={() => setTab("battle")}>
                  <Swords size={18} />
                  Battle
                </TabBtn>
              )}
              <TabBtn active={activeTab === "cards"} onClick={() => setTab("cards")}>
                <Layers size={18} />
                Cards
              </TabBtn>
              <TabBtn active={activeTab === "trinkets"} onClick={() => setTab("trinkets")}>
                <Gem size={18} />
                Trinkets
              </TabBtn>
            </div>

            {/* body */}
            <div className="flex-1 overflow-y-auto p-5">
              {activeTab === "overworld" && isOverworld && (
                <OverworldTab
                  state={overworldState!}
                  onUpdate={overworldUpdate}
                  goldInput={goldInput}
                  setGoldInput={setGoldInput}
                  debtInput={debtInput}
                  setDebtInput={setDebtInput}
                  hpInput={hpInput}
                  setHpInput={setHpInput}
                  finInput={finInput}
                  setFinInput={setFinInput}
                />
              )}

              {activeTab === "battle" && isBattle && (
                <BattleTab
                  coinInput={coinInput}
                  setCoinInput={setCoinInput}
                  finInput={finInput}
                  setFinInput={setFinInput}
                  handMaxInput={handMaxInput}
                  setHandMaxInput={setHandMaxInput}
                  onUpdate={battleUpdate}
                  drawCards={battleDebug?.drawCards ?? undefined}
                />
              )}

              {activeTab === "cards" && (
                <CardListTab
                  search={cardSearch}
                  setSearch={setCardSearch}
                  cards={availableCards}
                  overworldState={overworldState}
                  onOverworldUpdate={overworldUpdate}
                />
              )}

              {activeTab === "trinkets" && (
                <TrinketListTab
                  search={trinketSearch}
                  setSearch={setTrinketSearch}
                  trinkets={availableTrinkets}
                  overworldState={overworldState}
                  onOverworldUpdate={overworldUpdate}
                  onBattleUpdate={isBattle ? battleUpdate : undefined}
                />
              )}
            </div>

            {/* footer hint */}
            <div className="border-t border-white/10 px-5 py-3 text-center font-display text-xs uppercase tracking-widest text-muted-foreground">
              Press <kbd className="rounded border border-white/20 bg-white/10 px-2 py-1 font-mono text-xs">`</kbd> or{" "}
              <kbd className="rounded border border-white/20 bg-white/10 px-2 py-1 font-mono text-xs">F12</kbd> to toggle
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Tab button                                                          */
/* ------------------------------------------------------------------ */

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 whitespace-nowrap rounded-md px-4 py-2.5 font-display text-sm font-bold uppercase tracking-wider transition-colors",
        active
          ? "bg-gold/15 text-gold"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Input helpers                                                       */
/* ------------------------------------------------------------------ */

function NumInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        "w-full rounded-md border border-white/20 bg-white/5 px-4 py-2.5 font-display text-base text-foreground placeholder:text-muted-foreground/50 focus:border-gold/50 focus:outline-none",
        className,
      )}
    />
  )
}

function ActionBtn({
  onClick,
  children,
  variant = "default",
}: {
  onClick: () => void
  children: React.ReactNode
  variant?: "default" | "danger" | "gold"
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md px-4 py-2 font-display text-sm font-bold uppercase tracking-wider transition-colors",
        variant === "danger" && "border border-enemy/50 bg-enemy/10 text-enemy hover:bg-enemy/20",
        variant === "gold" && "border border-gold/50 bg-gold/10 text-gold hover:bg-gold/20",
        variant === "default" &&
          "border border-white/20 bg-white/5 text-foreground hover:bg-white/10",
      )}
    >
      {children}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Overworld tab                                                       */
/* ------------------------------------------------------------------ */

function OverworldTab({
  state,
  onUpdate,
  goldInput,
  setGoldInput,
  debtInput,
  setDebtInput,
  hpInput,
  setHpInput,
  finInput,
  setFinInput,
}: {
  state: OverworldState
  onUpdate: (p: Partial<OverworldState>) => void
  goldInput: string
  setGoldInput: (v: string) => void
  debtInput: string
  setDebtInput: (v: string) => void
  hpInput: string
  setHpInput: (v: string) => void
  finInput: string
  setFinInput: (v: string) => void
}) {
  const setGold = useCallback(() => {
    const v = parseInt(goldInput, 10)
    if (!isNaN(v)) onUpdate({ gold: Math.max(0, v) })
  }, [goldInput, onUpdate])

  const setDebt = useCallback(() => {
    const v = parseInt(debtInput, 10)
    if (!isNaN(v)) onUpdate({ debt: Math.max(0, Math.min(v, FORECLOSURE_CAP)) })
  }, [debtInput, onUpdate])

  const setHp = useCallback(() => {
    const v = parseInt(hpInput, 10)
    if (!isNaN(v)) onUpdate({ hp: Math.max(1, Math.min(v, state.maxHp)) })
  }, [hpInput, onUpdate, state.maxHp])

  const setFin = useCallback(() => {
    const v = parseInt(finInput, 10)
    if (!isNaN(v)) onUpdate({ fin: Math.max(0, v) })
  }, [finInput, onUpdate])

  return (
    <div className="flex flex-col gap-4">
      {/* gold */}
      <Section label="Gold" icon={<Coins size={16} className="text-gold" />}>
        <div className="flex items-center gap-2">
          <NumInput value={goldInput} onChange={setGoldInput} placeholder={String(state.gold)} />
          <ActionBtn onClick={setGold} variant="gold">Set</ActionBtn>
        </div>
        <div className="flex gap-2">
          <ActionBtn onClick={() => onUpdate({ gold: state.gold + 50 })} variant="gold">+50</ActionBtn>
          <ActionBtn onClick={() => onUpdate({ gold: Math.max(0, state.gold - 50) })} variant="danger">-50</ActionBtn>
          <ActionBtn onClick={() => onUpdate({ gold: 999 })} variant="gold">Max</ActionBtn>
        </div>
      </Section>

      {/* debt */}
      <Section label="Debt" icon={<Coins size={16} className="text-enemy" />}>
        <div className="flex items-center gap-2">
          <NumInput value={debtInput} onChange={setDebtInput} placeholder={String(state.debt)} />
          <ActionBtn onClick={setDebt} variant="danger">Set</ActionBtn>
        </div>
        <div className="flex gap-2">
          <ActionBtn onClick={() => onUpdate({ debt: Math.max(0, state.debt - 25) })} variant="gold">-25</ActionBtn>
          <ActionBtn onClick={() => onUpdate({ debt: Math.min(FORECLOSURE_CAP, state.debt + 25) })} variant="danger">+25</ActionBtn>
          <ActionBtn onClick={() => onUpdate({ debt: 0 })} variant="gold">Clear</ActionBtn>
        </div>
      </Section>

      {/* HP */}
      <Section label="HP" icon={<HeartPulse size={16} className="text-enemy" />}>
        <div className="flex items-center gap-2">
          <NumInput value={hpInput} onChange={setHpInput} placeholder={String(state.hp)} />
          <ActionBtn onClick={setHp}>Set</ActionBtn>
        </div>
        <div className="flex gap-2">
          <ActionBtn onClick={() => onUpdate({ hp: state.maxHp })} variant="gold">Full Heal</ActionBtn>
          <ActionBtn onClick={() => onUpdate({ hp: Math.max(1, state.hp - 5) })} variant="danger">-5</ActionBtn>
        </div>
      </Section>

      {/* Fin */}
      <Section label="Fin" icon={<Gem size={16} className="text-teal" />}>
        <div className="flex items-center gap-2">
          <NumInput value={finInput} onChange={setFinInput} placeholder={String(state.fin)} />
          <ActionBtn onClick={setFin}>Set</ActionBtn>
        </div>
        <div className="flex gap-2">
          <ActionBtn onClick={() => onUpdate({ fin: state.fin + 10 })}>+10</ActionBtn>
          <ActionBtn onClick={() => onUpdate({ fin: Math.max(0, state.fin - 10) })}>-10</ActionBtn>
        </div>
      </Section>

      {/* deck info */}
      <Section label={`Deck (${state.deck.length} cards)`} icon={<Layers size={16} />}>
        <p className="text-sm text-muted-foreground">
          Use the <strong>Cards</strong> tab to add or remove cards from your deck.
        </p>
      </Section>

      {/* trinkets info */}
      <Section label={`Trinkets (${state.trinkets.length})`} icon={<Gem size={16} />}>
        <p className="text-sm text-muted-foreground">
          Use the <strong>Trinkets</strong> tab to add or remove trinkets.
        </p>
      </Section>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Battle tab                                                          */
/* ------------------------------------------------------------------ */

function BattleTab({
  coinInput,
  setCoinInput,
  finInput,
  setFinInput,
  handMaxInput,
  setHandMaxInput,
  onUpdate,
  drawCards,
}: {
  coinInput: string
  setCoinInput: (v: string) => void
  finInput: string
  setFinInput: (v: string) => void
  handMaxInput: string
  setHandMaxInput: (v: string) => void
  onUpdate: (p: Partial<GameState>) => void
  drawCards?: (n: number) => void
}) {
  const setCoin = useCallback(() => {
    const v = parseInt(coinInput, 10)
    if (!isNaN(v)) onUpdate({ coin: Math.max(0, v) })
  }, [coinInput, onUpdate])

  const setFin = useCallback(() => {
    const v = parseInt(finInput, 10)
    if (!isNaN(v)) onUpdate({ fin: Math.max(0, v) })
  }, [finInput, onUpdate])

  const setHandMax = useCallback(() => {
    const v = parseInt(handMaxInput, 10)
    if (!isNaN(v)) onUpdate({ handMax: Math.max(1, v) })
  }, [handMaxInput, onUpdate])

  return (
    <div className="flex flex-col gap-4">
      {/* coin */}
      <Section label="Coin" icon={<Coins size={16} className="text-gold" />}>
        <div className="flex items-center gap-2">
          <NumInput value={coinInput} onChange={setCoinInput} placeholder="coin" />
          <ActionBtn onClick={setCoin} variant="gold">Set</ActionBtn>
        </div>
        <div className="flex gap-2">
          <ActionBtn onClick={() => onUpdate({ coin: 10 })} variant="gold">10</ActionBtn>
          <ActionBtn onClick={() => onUpdate({ coin: 20 })} variant="gold">20</ActionBtn>
          <ActionBtn onClick={() => onUpdate({ coin: 50 })} variant="gold">50</ActionBtn>
          <ActionBtn onClick={() => onUpdate({ coin: 99 })} variant="gold">Max</ActionBtn>
        </div>
      </Section>

      {/* fin */}
      <Section label="Fin" icon={<Gem size={16} className="text-teal" />}>
        <div className="flex items-center gap-2">
          <NumInput value={finInput} onChange={setFinInput} placeholder="fin" />
          <ActionBtn onClick={setFin}>Set</ActionBtn>
        </div>
        <div className="flex gap-2">
          <ActionBtn onClick={() => onUpdate({ fin: 50 })}>50</ActionBtn>
          <ActionBtn onClick={() => onUpdate({ fin: 100 })}>100</ActionBtn>
        </div>
      </Section>

      {/* hand max */}
      <Section label="Hand Max" icon={<Layers size={14} />}>
        <div className="flex items-center gap-2">
          <NumInput value={handMaxInput} onChange={setHandMaxInput} placeholder="hand max" />
          <ActionBtn onClick={setHandMax}>Set</ActionBtn>
        </div>
      </Section>

      {/* quick actions */}
      <Section label="Quick Actions" icon={<Zap size={16} />}>
        <div className="flex flex-wrap gap-2">
          {drawCards && (
            <>
              <ActionBtn onClick={() => drawCards(1)} variant="gold">
                Draw 1
              </ActionBtn>
              <ActionBtn onClick={() => drawCards(3)} variant="gold">
                Draw 3
              </ActionBtn>
            </>
          )}
          <ActionBtn onClick={() => onUpdate({ phase: Phase.Won })} variant="gold">
            Win Battle
          </ActionBtn>
          <ActionBtn onClick={() => onUpdate({ phase: Phase.Lost })} variant="danger">
            Lose Battle
          </ActionBtn>
        </div>
      </Section>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Hover tooltip (portaled so it escapes the scrollable list's clip)   */
/* ------------------------------------------------------------------ */

function HoverCard({
  tooltip,
  children,
}: {
  tooltip: React.ReactNode
  children: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  const show = useCallback(() => {
    const r = ref.current?.getBoundingClientRect()
    if (r) setPos({ top: r.bottom + 4, left: r.left })
  }, [])
  const hide = useCallback(() => setPos(null), [])

  return (
    <div ref={ref} className="relative" onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {pos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[10000] w-72 rounded-lg border border-gold/30 bg-ocean-deep/95 px-3.5 py-3 shadow-xl backdrop-blur-sm"
            style={{ top: pos.top, left: pos.left }}
          >
            {tooltip}
          </div>,
          document.body,
        )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Card list tab                                                       */
/* ------------------------------------------------------------------ */

function CardListTab({
  search,
  setSearch,
  cards,
  overworldState,
  onOverworldUpdate,
}: {
  search: string
  setSearch: (v: string) => void
  cards: string[]
  overworldState?: OverworldState | null
  onOverworldUpdate?: (p: Partial<OverworldState>) => void
}) {
  const deck = overworldState?.deck ?? []
  const deckCounts = useMemo(() => {
    const m: Record<string, number> = {}
    for (const id of deck) m[id] = (m[id] ?? 0) + 1
    return m
  }, [deck])

  return (
    <div className="flex flex-col gap-3">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search cards..."
        className="w-full rounded-md border border-white/20 bg-white/5 px-4 py-2.5 font-display text-base text-foreground placeholder:text-muted-foreground/50 focus:border-gold/50 focus:outline-none"
      />
      <p className="text-sm text-muted-foreground">{cards.length} cards</p>
      {onOverworldUpdate && overworldState && (
        <div className="flex flex-col gap-1.5 max-h-96 overflow-y-auto pr-1">
          {cards.map((id) => {
            const def = CARD_LIBRARY[id]
            if (!def) return null
            const count = deckCounts[id] ?? 0
            return (
              <HoverCard
                key={id}
                tooltip={
                  <>
                    <p className="font-display text-xs font-bold uppercase tracking-wider text-gold">
                      {def.name} <span className="text-muted-foreground">· {def.type} · {def.cost}c</span>
                    </p>
                    <p className="mt-1 font-display text-xs uppercase tracking-wider text-muted-foreground">
                      {def.desc}
                    </p>
                  </>
                }
              >
                <div className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.03] px-4 py-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Shield size={16} className="shrink-0 text-gold/70" />
                    <span className="truncate font-display text-sm font-bold text-foreground">
                      {def.name}
                    </span>
                    {count > 0 && (
                      <span className="shrink-0 font-display text-xs text-muted-foreground">
                        ×{count}
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <ActionBtn
                      onClick={() =>
                        onOverworldUpdate({ deck: [...overworldState.deck, id] })
                      }
                      variant="gold"
                    >
                      <Plus size={14} />
                    </ActionBtn>
                    {count > 0 && (
                      <ActionBtn
                        onClick={() => {
                          const i = overworldState.deck.indexOf(id)
                          if (i >= 0) {
                            const next = [...overworldState.deck]
                            next.splice(i, 1)
                            onOverworldUpdate({ deck: next })
                          }
                        }}
                        variant="danger"
                      >
                        <Trash2 size={14} />
                      </ActionBtn>
                    )}
                  </div>
                </div>
              </HoverCard>
            )
          })}
        </div>
      )}
      {!onOverworldUpdate && (
        <p className="text-sm text-muted-foreground">
          Card management is only available from the Overworld screen.
        </p>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Trinket list tab                                                    */
/* ------------------------------------------------------------------ */

function TrinketListTab({
  search,
  setSearch,
  trinkets,
  overworldState,
  onOverworldUpdate,
  onBattleUpdate,
}: {
  search: string
  setSearch: (v: string) => void
  trinkets: string[]
  overworldState?: OverworldState | null
  onOverworldUpdate?: (p: Partial<OverworldState>) => void
  onBattleUpdate?: (p: Partial<GameState>) => void
}) {
  const owned = overworldState?.trinkets ?? []

  return (
    <div className="flex flex-col gap-3">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search trinkets..."
        className="w-full rounded-md border border-white/20 bg-white/5 px-4 py-2.5 font-display text-base text-foreground placeholder:text-muted-foreground/50 focus:border-gold/50 focus:outline-none"
      />
      <p className="text-sm text-muted-foreground">{trinkets.length} trinkets</p>
      {onOverworldUpdate && overworldState ? (
        <div className="flex flex-col gap-1.5 max-h-96 overflow-y-auto pr-1">
          {trinkets.map((id) => {
            const def = TRINKET_LIBRARY[id]
            if (!def) return null
            const isOwned = owned.includes(id)
            return (
              <HoverCard
                key={id}
                tooltip={
                  <>
                    <p className="font-display text-xs font-bold uppercase tracking-wider text-gold">{def.name}</p>
                    <p className="mt-1 font-display text-xs uppercase tracking-wider text-muted-foreground">
                      {def.description}
                    </p>
                  </>
                }
              >
                <div className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.03] px-4 py-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Gem size={16} className={cn("shrink-0", isOwned ? "text-gold" : "text-muted-foreground/50")} />
                    <span className="truncate font-display text-sm font-bold text-foreground">
                      {def.name}
                    </span>
                    <span className="shrink-0 rounded border border-white/10 px-1.5 py-0.5 font-display text-[10px] uppercase tracking-wider text-muted-foreground">
                      {def.rarity}
                    </span>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    {!isOwned ? (
                      <ActionBtn
                        onClick={() => {
                          const next = [...overworldState.trinkets, id]
                          onOverworldUpdate({ trinkets: next })
                          onBattleUpdate?.({ activeTrinkets: next })
                        }}
                        variant="gold"
                      >
                        <Plus size={14} />
                      </ActionBtn>
                    ) : (
                      <ActionBtn
                        onClick={() => {
                          const next = overworldState.trinkets.filter((t) => t !== id)
                          onOverworldUpdate({ trinkets: next })
                          onBattleUpdate?.({ activeTrinkets: next })
                        }}
                        variant="danger"
                      >
                        <Trash2 size={14} />
                      </ActionBtn>
                    )}
                  </div>
                </div>
              </HoverCard>
            )
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Trinket management is only available from the Overworld screen.
        </p>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Section wrapper                                                     */
/* ------------------------------------------------------------------ */

function Section({
  label,
  icon,
  children,
}: {
  label: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <span className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
          {label}
        </span>
      </div>
      <div className="flex flex-col gap-2.5">{children}</div>
    </div>
  )
}