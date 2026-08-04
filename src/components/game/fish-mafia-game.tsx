"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Home, Layers, Play, ShoppingCart, Trash2 } from "lucide-react"
import type { GameSettings } from "./fish-mafia-app"
import { Board } from "./board"
import { GameCard } from "./card"
import { ResultOverlay } from "./result-overlay"
import { SidePanel } from "./side-panel"
import { TargetingArrow, type ArrowState } from "./targeting-arrow"
import { TopBar } from "./top-bar"
import { useFishMafia } from "@/hooks/use-fish-mafia"
import { BUY_COST } from "@/lib/game/engine"
import type { CardInstance, GameState, Pos, Unit } from "@/lib/game/types"
import { cn } from "@/lib/utils"

interface DragState {
  kind: "card" | "unit"
  card?: CardInstance
  unit?: Unit
  x: number
  y: number
}

interface GameProps {
  settings: GameSettings
  initial?: GameState
  onWin?: (heroHp: number) => void
  onLose?: (heroHp: number) => void
  onExit: () => void
}

export function FishMafiaGame({ settings, initial, onWin, onLose, onExit }: GameProps) {
  const game = useFishMafia(initial)
  const { state, fx, busy, select, move, attack, cast, sell, buy, endTurn, restart, reachable, targetsFor } = game

  const [pendingCard, setPendingCard] = useState<CardInstance | null>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [arrow, setArrow] = useState<ArrowState | null>(null)

  const dragRef = useRef<{
    active: boolean
    moved: boolean
    kind: "card" | "unit"
    card?: CardInstance
    unit?: Unit
    startX: number
    startY: number
  } | null>(null)
  const suppressClick = useRef(false)

  const playerTurn = state.phase === "player" && !busy

  // Overworld mode: report the outcome upward instead of showing the local
  // restart overlay. The parent decides win -> reward, boss unlock, etc.
  const heroHp = state.units.find((u) => u.id === "hero")?.hp ?? 0
  useEffect(() => {
    if (onWin && state.phase === "won") onWin(heroHp)
    if (onLose && state.phase === "lost") onLose(heroHp)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, onWin, onLose])

  /* ---------- highlight sets ---------- */
  const activeCard = drag?.kind === "card" ? drag.card : pendingCard
  const { highlightTiles, highlightUnitIds } = useMemo(() => {
    if (!activeCard) return { highlightTiles: [] as Pos[], highlightUnitIds: [] as string[] }
    const t = targetsFor(activeCard)
    return { highlightTiles: t.tiles, highlightUnitIds: t.unitIds }
  }, [activeCard, targetsFor])

  /* ---------- targeting arrow ---------- */
  // keep latest values readable inside imperative pointer listeners
  const highlightUnitIdsRef = useRef<string[]>([])
  const reachableRef = useRef<Pos[]>([])
  const pendingCardRef = useRef<CardInstance | null>(null)
  highlightUnitIdsRef.current = highlightUnitIds
  reachableRef.current = reachable
  pendingCardRef.current = pendingCard

  const computeArrow = useCallback(
    (clientX: number, clientY: number) => {
      const d = dragRef.current
      const el = document.elementFromPoint(clientX, clientY)
      const drop = el?.closest("[data-drop]") as HTMLElement | null
      const dropType = drop?.getAttribute("data-drop")

      const anchorFrom = (sel: string, yFrac: number) => {
        const node = document.querySelector(sel)
        if (!node) return null
        const r = node.getBoundingClientRect()
        return { x: r.left + r.width / 2, y: r.top + r.height * yFrac }
      }

      let from: { x: number; y: number } | null = null
      let valid = false

      if (d?.kind === "unit" && d.unit) {
        // dragging a fish: arrow doubles as move / attack indicator
        from = anchorFrom(`[data-unit-id="${d.unit.id}"]`, 0.42)
        if (dropType === "unit" && drop?.dataset.unitId && drop.dataset.unitId !== d.unit.id) {
          const tu = state.units.find((u) => u.id === drop.dataset.unitId)
          valid = !!tu && tu.team === "enemy"
        } else if (dropType === "tile" && drop) {
          const tx = Number(drop.dataset.x)
          const ty = Number(drop.dataset.y)
          valid = reachableRef.current.some((p) => p.x === tx && p.y === ty)
        }
      } else {
        // arming / dragging a unit-targeted card
        const card = (d?.kind === "card" ? d.card : undefined) ?? pendingCardRef.current
        if (!card || card.def.target === "empty-tile" || card.def.target === "self") {
          setArrow(null)
          return
        }
        from = anchorFrom(`[data-card-uid="${card.uid}"]`, 0.15)
        if (dropType === "unit" && drop?.dataset.unitId) {
          valid = highlightUnitIdsRef.current.includes(drop.dataset.unitId)
        }
      }

      if (!from) {
        setArrow(null)
        return
      }
      setArrow({ fromX: from.x, fromY: from.y, toX: clientX, toY: clientY, valid })
    },
    [state.units],
  )

  // track the cursor while a card is armed via click (no active drag)
  useEffect(() => {
    if (!pendingCard || pendingCard.def.target === "empty-tile" || pendingCard.def.target === "self") {
      setArrow(null)
      return
    }
    const onMove = (e: PointerEvent) => computeArrow(e.clientX, e.clientY)
    window.addEventListener("pointermove", onMove)
    return () => window.removeEventListener("pointermove", onMove)
  }, [pendingCard, computeArrow])

  /* ---------- drag machinery ---------- */
  const resolveDrop = useCallback(
    (clientX: number, clientY: number, d: NonNullable<typeof dragRef.current>) => {
      const el = document.elementFromPoint(clientX, clientY)
      const drop = el?.closest("[data-drop]") as HTMLElement | null
      if (!drop) return
      const type = drop.getAttribute("data-drop")

      if (d.kind === "unit" && d.unit) {
        if (type === "tile") {
          move(d.unit.id, { x: Number(drop.dataset.x), y: Number(drop.dataset.y) })
        } else if (type === "unit") {
          const targetId = drop.dataset.unitId
          if (targetId) attack(d.unit.id, targetId)
        }
      } else if (d.kind === "card" && d.card) {
        const def = d.card.def
        if (def.target === "self") {
          cast(d.card.uid, {})
        } else if (def.target === "empty-tile") {
          if (type === "tile") cast(d.card.uid, { tile: { x: Number(drop.dataset.x), y: Number(drop.dataset.y) } })
        } else if (type === "unit" && drop.dataset.unitId) {
          cast(d.card.uid, { unitId: drop.dataset.unitId })
        }
      }
    },
    [move, attack, cast],
  )

  const onPointerMove = useCallback((e: PointerEvent) => {
    const d = dragRef.current
    if (!d) return
    const dist = Math.hypot(e.clientX - d.startX, e.clientY - d.startY)
    if (dist > 6) d.moved = true
    if (d.moved) {
      setDrag({ kind: d.kind, card: d.card, unit: d.unit, x: e.clientX, y: e.clientY })
      computeArrow(e.clientX, e.clientY)
    }
  }, [computeArrow])

  const onPointerUp = useCallback(
    (e: PointerEvent) => {
      const d = dragRef.current
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)
      dragRef.current = null
      setDrag(null)
      setArrow(null)
      if (!d) return
      if (d.moved) {
        suppressClick.current = true
        setTimeout(() => (suppressClick.current = false), 60)
        resolveDrop(e.clientX, e.clientY, d)
        setPendingCard(null)
      }
    },
    [onPointerMove, resolveDrop],
  )

  const beginDrag = useCallback(
    (kind: "card" | "unit", e: React.PointerEvent, payload: { card?: CardInstance; unit?: Unit }) => {
      dragRef.current = {
        active: true,
        moved: false,
        kind,
        card: payload.card,
        unit: payload.unit,
        startX: e.clientX,
        startY: e.clientY,
      }
      window.addEventListener("pointermove", onPointerMove)
      window.addEventListener("pointerup", onPointerUp)
    },
    [onPointerMove, onPointerUp],
  )

  /* ---------- card interactions ---------- */
  const onCardPointerDown = useCallback(
    (e: React.PointerEvent, card: CardInstance) => {
      if (!playerTurn || card.def.cost > state.mana) return
      beginDrag("card", e, { card })
    },
    [beginDrag, playerTurn, state.mana],
  )

  const onCardTap = useCallback(
    (card: CardInstance) => {
      // called via onClick fallback when not dragged
      if (suppressClick.current || !playerTurn || card.def.cost > state.mana) return
      if (card.def.target === "self") {
        cast(card.uid, {})
        setPendingCard(null)
        return
      }
      setPendingCard((p) => (p?.uid === card.uid ? null : card))
      select(null)
    },
    [cast, playerTurn, select, state.mana],
  )

  /* ---------- unit interactions ---------- */
  const onUnitPointerDown = useCallback(
    (e: React.PointerEvent, unit: Unit) => {
      if (!playerTurn) return
      setPendingCard(null)
      select(unit.id)
      beginDrag("unit", e, { unit })
    },
    [beginDrag, playerTurn, select],
  )

  const onUnitClick = useCallback(
    (unit: Unit) => {
      if (suppressClick.current || !playerTurn) return
      // casting a pending card onto a unit
      if (pendingCard && pendingCard.def.target !== "empty-tile" && pendingCard.def.target !== "self") {
        cast(pendingCard.uid, { unitId: unit.id })
        setPendingCard(null)
        return
      }
      if (unit.team === "player") {
        select(unit.id)
      } else {
        // attack with selected player unit if adjacent
        const sel = state.units.find((u) => u.id === state.selectedUnitId)
        if (sel && sel.team === "player") attack(sel.id, unit.id)
      }
    },
    [attack, cast, pendingCard, playerTurn, select, state.selectedUnitId, state.units],
  )

  const onCellPointerUp = useCallback(() => {
    /* handled globally by resolveDrop */
  }, [])

  const onCellClick = useCallback(
    (pos: Pos) => {
      if (suppressClick.current || !playerTurn) return
      if (pendingCard?.def.target === "empty-tile") {
        cast(pendingCard.uid, { tile: pos })
        setPendingCard(null)
        return
      }
      if (state.selectedUnitId) {
        move(state.selectedUnitId, pos)
      }
    },
    [cast, move, pendingCard, playerTurn, state.selectedUnitId],
  )

  /* ---------- bottom bar values ---------- */
  const manaPct = (state.mana / state.maxMana) * 100
  const canBuy = playerTurn && state.coin >= BUY_COST && state.hand.length < 8

  return (
    <main className="flex h-dvh w-full flex-col overflow-hidden bg-background text-foreground">
      <TopBar state={state} />

      {/* mid: board + side panel */}
      <div className="flex min-h-0 flex-1">
        <div className="relative flex flex-1 items-center justify-center overflow-hidden p-3 sm:p-5">
          <Board
            state={state}
            fx={fx}
            reachable={settings.movementHints ? reachable : []}
            showEffects={settings.visualEffects}
            highlightTiles={highlightTiles}
            highlightUnitIds={highlightUnitIds}
            onCellPointerUp={onCellPointerUp}
            onCellClick={onCellClick}
            onUnitClick={onUnitClick}
            onUnitPointerDown={onUnitPointerDown}
          />
          <ResultOverlay
            state={state}
            onRestart={restart}
            hidden={!!onWin || !!onLose}
          />
          {busy && (
            <div className="pointer-events-none absolute left-1/2 top-4 z-40 -translate-x-1/2 rounded-full border border-enemy/40 bg-ocean-deep/90 px-4 py-1.5 font-display text-xs uppercase tracking-widest text-enemy">
              The mob is moving...
            </div>
          )}
        </div>

        <div className="hidden w-[300px] shrink-0 lg:block">
          <SidePanel state={state} onHoverUnit={() => {}} onSelectUnit={(u) => onUnitClick(u)} />
        </div>
      </div>

      {/* bottom: hand + controls */}
      <div className="flex shrink-0 items-end gap-3 border-t border-gold/20 bg-ocean-deep/70 px-4 py-3 backdrop-blur-sm">
        {/* left cluster: mana + piles */}
        <div className="flex items-center gap-3">
          <div
            className="relative flex h-16 w-16 items-center justify-center rounded-full"
            style={{
              background: `conic-gradient(var(--gold) ${manaPct}%, oklch(0.3 0.03 248) ${manaPct}%)`,
            }}
          >
            <div className="flex h-[52px] w-[52px] flex-col items-center justify-center rounded-full bg-ocean-deep">
              <span className="font-display text-xl font-bold leading-none text-gold">{state.mana}</span>
              <span className="font-display text-[8px] uppercase tracking-widest text-muted-foreground">Mana</span>
            </div>
          </div>
          <div className="hidden flex-col gap-1 sm:flex">
            <Pile icon={<Layers size={13} />} label="Draw" value={state.deck.length} />
            <Pile icon={<Trash2 size={13} />} label="Spent" value={state.discard.length} />
          </div>
        </div>

        {/* center: hand */}
        <div className="flex flex-1 items-end justify-center gap-2 overflow-x-auto px-2 pt-3">
          {state.hand.length === 0 && (
            <p className="py-8 font-display text-sm uppercase tracking-widest text-muted-foreground">
              Hand empty — end your turn
            </p>
          )}
          {state.hand.map((card) => {
            const isDragged = drag?.kind === "card" && drag.card?.uid === card.uid
            const isUnitTargetDrag =
              isDragged && card.def.target !== "empty-tile" && card.def.target !== "self"
            return (
              <GameCard
                key={card.uid}
                card={card}
                playable={playerTurn && card.def.cost <= state.mana}
                // unit-targeted cards stay lifted in hand while the arrow tracks the cursor
                dragging={isDragged && !isUnitTargetDrag}
                armed={pendingCard?.uid === card.uid || isUnitTargetDrag}
                onPointerDown={onCardPointerDown}
                onTap={onCardTap}
                onSell={(c) => playerTurn && sell(c.uid)}
                compact
              />
            )
          })}
        </div>

        {/* right cluster: buy + end turn */}
        <div className="flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={onExit}
            className="flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 font-display text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:border-gold/40 hover:text-gold"
          >
            <Home size={13} />
            Menu
          </button>
          <button
            type="button"
            onClick={buy}
            disabled={!canBuy}
            className={cn(
              "flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-display text-[11px] font-bold uppercase tracking-wider transition-colors",
              canBuy
                ? "border-gold/50 bg-gold/10 text-gold hover:bg-gold/20"
                : "cursor-not-allowed border-white/10 text-muted-foreground/50",
            )}
          >
            <ShoppingCart size={13} />
            Buy Card · {BUY_COST}
          </button>
          <button
            type="button"
            onClick={endTurn}
            disabled={!playerTurn}
            className={cn(
              "flex items-center gap-2 rounded-lg px-6 py-3 font-display text-base font-bold uppercase tracking-widest shadow-lg transition-all",
              playerTurn
                ? "bg-gold text-ocean-deep hover:scale-[1.03] hover:shadow-xl"
                : "cursor-not-allowed bg-white/10 text-muted-foreground",
            )}
          >
            <Play size={18} />
            End Turn
          </button>
        </div>
      </div>

      {/* click-to-cast hint */}
      {pendingCard && (
        <div className="pointer-events-none fixed bottom-28 left-1/2 z-50 -translate-x-1/2 rounded-full border border-gold/40 bg-ocean-deep/90 px-4 py-1.5 font-display text-xs uppercase tracking-widest text-gold">
          Pick a target for {pendingCard.def.name} · click to cancel
        </div>
      )}

      {/* targeting arrow (unit-targeted casts + unit attacks) */}
      {arrow && <TargetingArrow {...arrow} />}

      {/* drag ghost — only for tile-placed / self cards, which the arrow does not cover */}
      {drag?.kind === "card" &&
        drag.card &&
        (drag.card.def.target === "empty-tile" || drag.card.def.target === "self") && (
          <div
            className="pointer-events-none fixed z-[60] -translate-x-1/2 -translate-y-1/2"
            style={{ left: drag.x, top: drag.y }}
          >
            <div className="rotate-3 opacity-90 drop-shadow-2xl">
              <GameCard
                card={drag.card}
                playable
                dragging={false}
                onPointerDown={() => {}}
                onSell={() => {}}
                compact
              />
            </div>
          </div>
        )}
    </main>
  )
}

function Pile({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1">
      <span className="text-gold/70">{icon}</span>
      <span className="font-display text-[9px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <span className="ml-auto font-display text-sm font-bold text-foreground">{value}</span>
    </div>
  )
}
