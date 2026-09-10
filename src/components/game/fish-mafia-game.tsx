"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Home, Layers, MousePointer2, Play, Trash2 } from "lucide-react"
import type { GameSettings } from "./fish-mafia-app"
import { Board } from "./board"
import { GameCard } from "./card"
import { CoinRegister } from "./coin-register"
import { ResultOverlay } from "./result-overlay"
import { SidePanel } from "./side-panel"
import { TargetingArrow, type ArrowState } from "./targeting-arrow"
import { TopBar } from "./top-bar"
import { useFishMafia } from "@/hooks/use-fish-mafia"
import {
  AOE_SINGLE_TILE,
  AimMode,
  aimMode,
  aoeTiles,
  unitsInAoe,
  type CardDef,
  type CardInstance,
} from "@/lib/game/cards"
import { Phase, type Pos, type GameState } from "@/lib/game/battle"
import { Team, type Unit } from "@/lib/game/units"
import { cn } from "@/lib/utils"
import { DragKind } from "./drag-kind.enum"

interface DragState {
  kind: DragKind
  card?: CardInstance
  unit?: Unit
  x: number
  y: number
}

interface GameProps {
  settings: GameSettings
  initial?: GameState
  onWin?: (heroHp: number, fin: number) => void
  onLose?: (heroHp: number) => void
  onExit: () => void
  onDebugReady?: (debug: {
    debugUpdate: (p: Partial<GameState>) => void
    drawCards: (n: number) => void
    state: GameState
  }) => void
}

export function FishMafiaGame({ settings, initial, onWin, onLose, onExit, onDebugReady }: GameProps) {
  const game = useFishMafia(initial)
  const { state, fx, busy, select, move, attack, cast, sell, endTurn, restart, reachable, targetsFor, debugUpdate, debugDrawCards } = game

  const [pendingCard, setPendingCard] = useState<CardInstance | null>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [arrow, setArrow] = useState<ArrowState | null>(null)
  const [aimTile, setAimTile] = useState<Pos | null>(null)
  const [hoveredUid, setHoveredUid] = useState<string | null>(null)

  // measured width of the hand track + viewport height, so both the card size and
  // the fan spacing follow the window instead of assuming a fixed card footprint
  const handRef = useRef<HTMLDivElement | null>(null)
  const [handWidth, setHandWidth] = useState(0)
  const [viewportH, setViewportH] = useState(() => (typeof window === "undefined" ? 900 : window.innerHeight))
  useEffect(() => {
    const el = handRef.current
    if (!el || typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(([entry]) => setHandWidth(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  useEffect(() => {
    const onResize = () => setViewportH(window.innerHeight)
    onResize()
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  const cardScale = handScale(handWidth, viewportH)
  const handH = Math.round(CARD_H * cardScale)

  const dragRef = useRef<{
    active: boolean
    moved: boolean
    kind: DragKind
    card?: CardInstance
    unit?: Unit
    startX: number
    startY: number
  } | null>(null)
  const suppressClick = useRef(false)

  const playerTurn = state.phase === Phase.Player && !busy

  // A card is only truly playable when its player can both afford it AND aim it
  // at something. A cost-affordable attack with every enemy out of range would
  // otherwise glow gold but silently fizzle on cast (Bug A) — that reads as a
  // broken button, so gray it out like any other unplayable card.
  const canPlay = useCallback(
    (card: CardInstance) => {
      if (!playerTurn || card.def.cost > state.coin) return false
      const mode = aimMode(card.def)
      if (mode === AimMode.None) return true
      const t = targetsFor(card)
      return mode === AimMode.Tile ? t.tiles.length > 0 : t.unitIds.length > 0
    },
    [playerTurn, state.coin, targetsFor],
  )

  // Overworld mode: report the outcome upward instead of showing the local
  // restart overlay. The parent decides win -> reward, boss unlock, etc.
  const heroHp = state.units.find((u) => u.id === "hero")?.hp ?? 0
  useEffect(() => {
    if (onWin && state.phase === Phase.Won) onWin(heroHp, state.fin)
    if (onLose && state.phase === Phase.Lost) onLose(heroHp)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, onWin, onLose])

  /* ---------- highlight sets ---------- */
  const activeCard = drag?.kind === DragKind.Card ? drag.card : pendingCard
  const { highlightTiles, highlightUnitIds } = useMemo(() => {
    if (!activeCard) return { highlightTiles: [] as Pos[], highlightUnitIds: [] as string[] }
    const t = targetsFor(activeCard)
    return { highlightTiles: t.tiles, highlightUnitIds: t.unitIds }
  }, [activeCard, targetsFor])

  /* ---------- blast preview ---------- */
  // A card with a blast radius aims at a tile, so the preview has to answer
  // "what does this cover from here" before the player commits to a centre.
  const aimingAtTile = !!activeCard && isBlastCard(activeCard.def)
  const blast = useMemo(() => {
    if (!activeCard || !aimTile || !isBlastCard(activeCard.def)) return EMPTY_BLAST
    return {
      tiles: aoeTiles(state, aimTile, activeCard.def.aoe),
      unitIds: unitsInAoe(state, activeCard.def, aimTile).map((u) => u.id),
      damage: damageTotal(activeCard.def),
    }
  }, [activeCard, aimTile, state])

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

      if (d?.kind === DragKind.Unit && d.unit) {
        // dragging a fish: arrow doubles as move / attack indicator
        from = anchorFrom(`[data-unit-id="${d.unit.id}"]`, 0.42)
        if (dropType === "unit" && drop?.dataset.unitId && drop.dataset.unitId !== d.unit.id) {
          const tu = state.units.find((u) => u.id === drop.dataset.unitId)
          valid = !!tu && tu.team === Team.Enemy
        } else if (dropType === "tile" && drop) {
          const tx = Number(drop.dataset.x)
          const ty = Number(drop.dataset.y)
          valid = reachableRef.current.some((p) => p.x === tx && p.y === ty)
        }
      } else {
        // arming / dragging a card: tile-aimed ones drive the blast preview,
        // unit-aimed ones drive the arrow
        const card = (d?.kind === DragKind.Card ? d.card : undefined) ?? pendingCardRef.current
        if (!card || aimMode(card.def) !== AimMode.Unit) {
          setAimTile(tileFromDrop(drop, dropType))
          setArrow(null)
          return
        }
        from = anchorFrom(`[data-card-uid="${card.uid}"]`, 0.15)
        if (dropType === "unit" && drop?.dataset.unitId) {
          valid = highlightUnitIdsRef.current.includes(drop.dataset.unitId)
        }
      }

      setAimTile(null)

      if (!from) {
        setArrow(null)
        return
      }
      setArrow({ fromX: from.x, fromY: from.y, toX: clientX, toY: clientY, valid })
    },
    [state.units],
  )

  // expose battle debug handle to parent, refreshed with the live state so
  // the debug menu can prefill its inputs from the current game
  useEffect(() => {
    onDebugReady?.({ debugUpdate, drawCards: debugDrawCards, state })
  }, [onDebugReady, debugUpdate, debugDrawCards, state])

  // track the cursor while a card is armed via click (no active drag)
  useEffect(() => {
    if (!pendingCard || aimMode(pendingCard.def) === AimMode.None) {
      setArrow(null)
      setAimTile(null)
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

      if (d.kind === DragKind.Unit && d.unit) {
        if (type === "tile") {
          move(d.unit.id, { x: Number(drop.dataset.x), y: Number(drop.dataset.y) })
        } else if (type === "unit") {
          const targetId = drop.dataset.unitId
          if (targetId) attack(d.unit.id, targetId)
        }
      } else if (d.kind === DragKind.Card && d.card) {
        const mode = aimMode(d.card.def)
        if (mode === AimMode.None) {
          cast(d.card.uid, {})
        } else if (mode === AimMode.Tile) {
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
      setAimTile(null)
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
    (kind: DragKind, e: React.PointerEvent, payload: { card?: CardInstance; unit?: Unit }) => {
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
      if (!canPlay(card)) return
      beginDrag(DragKind.Card, e, { card })
    },
    [beginDrag, canPlay],
  )

  const onCardTap = useCallback(
    (card: CardInstance) => {
      // called via onClick fallback when not dragged
      if (suppressClick.current || !canPlay(card)) return
      if (aimMode(card.def) === AimMode.None) {
        cast(card.uid, {})
        setPendingCard(null)
        return
      }
      setPendingCard((p) => (p?.uid === card.uid ? null : card))
      select(null)
    },
    [cast, canPlay, select],
  )

  /* ---------- unit interactions ---------- */
  const onUnitPointerDown = useCallback(
    (e: React.PointerEvent, unit: Unit) => {
      if (!playerTurn) return
      setPendingCard(null)
      select(unit.id)
      beginDrag(DragKind.Unit, e, { unit })
    },
    [beginDrag, playerTurn, select],
  )

  const onUnitClick = useCallback(
    (unit: Unit) => {
      if (suppressClick.current || !playerTurn) return
      // casting a pending card onto a unit
      if (pendingCard && aimMode(pendingCard.def) === AimMode.Unit) {
        cast(pendingCard.uid, { unitId: unit.id })
        setPendingCard(null)
        return
      }
      if (unit.team === Team.Player) {
        select(unit.id)
      } else {
        // attack with selected player unit if adjacent
        const sel = state.units.find((u) => u.id === state.selectedUnitId)
        if (sel && sel.team === Team.Player) attack(sel.id, unit.id)
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
      if (pendingCard && aimMode(pendingCard.def) === AimMode.Tile) {
        cast(pendingCard.uid, { tile: pos })
        setPendingCard(null)
        setAimTile(null)
        return
      }
      if (state.selectedUnitId) {
        move(state.selectedUnitId, pos)
      }
    },
    [cast, move, pendingCard, playerTurn, state.selectedUnitId],
  )

  /* ---------- cancel an armed card (right-click / Escape) ---------- */
  const cancelPending = useCallback(() => {
    setPendingCard(null)
    setArrow(null)
    setAimTile(null)
    select(null)
  }, [select])

  useEffect(() => {
    if (!pendingCard) return
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      cancelPending()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancelPending()
    }
    window.addEventListener("contextmenu", onContextMenu)
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("contextmenu", onContextMenu)
      window.removeEventListener("keydown", onKey)
    }
  }, [pendingCard, cancelPending])

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
            blastTiles={blast.tiles}
            blastUnitIds={blast.unitIds}
            blastDamage={blast.damage}
            aimingAtTile={aimingAtTile}
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

        <div className="w-[180px] shrink-0 sm:w-[220px] md:w-[260px] lg:w-[300px]">
          <SidePanel state={state} onHoverUnit={() => {}} onSelectUnit={(u) => onUnitClick(u)} />
        </div>
      </div>

      {/* bottom: hand + controls */}
      {/* fixed height so the bar never resizes with hand size (empty hand included) */}
      {/* `relative z-20`: a hovered card lifts out of this bar and must paint over the board */}
      <div
        className="relative z-20 flex shrink-0 items-end gap-3 border-t border-gold/20 bg-ocean-deep/70 px-4 py-3 backdrop-blur-sm"
        // height follows the card size so the bar tracks the window instead of a fixed 192px
        style={{ height: handH + 24 }}
      >
        {/* left cluster: coin register + piles */}
        <div className="flex items-center gap-3">
          <CoinRegister coin={state.coin} active={playerTurn} />
          <div className="hidden flex-col gap-1 sm:flex">
            <Pile icon={<Layers size={13} />} label="Draw" value={state.deck.length} />
            <Pile icon={<Trash2 size={13} />} label="Spent" value={state.discard.length} />
          </div>
        </div>

        {/* center: hand — fanned, cards overlap so the row never scrolls or resizes the bar */}
        <div ref={handRef} className="flex flex-1 items-end justify-center px-2" style={{ height: handH }}>
          {state.hand.length === 0 && (
            <p className="flex h-full items-center font-display text-sm uppercase tracking-widest text-muted-foreground">
              Hand empty — end your turn
            </p>
          )}
          {state.hand.map((card, i) => {
            const isDragged = drag?.kind === DragKind.Card && drag.card?.uid === card.uid
            const isUnitTargetDrag = isDragged && aimMode(card.def) === AimMode.Unit
            const isArmed = pendingCard?.uid === card.uid || isUnitTargetDrag
            const isHovered = hoveredUid === card.uid
            const fan = fanTransform(i, state.hand.length, handWidth / cardScale)
            // z-index lives inline because inline styles beat the utility classes; a
            // hovered / armed card must sit above every neighbour to read in full.
            const z = isHovered ? 60 : isDragged || isArmed ? 50 : i
            return (
              // outer slot stays put and owns the hover hit area, so lifting the card
              // never slides it out from under the cursor and re-triggers hover
              <div
                key={card.uid}
                onPointerEnter={() => setHoveredUid(card.uid)}
                onPointerLeave={() => setHoveredUid((u) => (u === card.uid ? null : u))}
                className="relative"
                // `zoom` (not `transform: scale`) so the slot's *layout* box shrinks with
                // the card — margins, hit area and getBoundingClientRect all stay honest.
                // Everything inside is therefore in card-local units.
                style={{ zoom: cardScale, marginLeft: i === 0 ? 0 : fan.overlap, zIndex: z }}
              >
                <div
                  className={cn(
                    "origin-bottom transition-transform duration-150 ease-out",
                    isHovered || isArmed
                      ? // lifted flat and enlarged, fully clear of the cards it was tucked under
                        "[transform:rotate(0deg)_translateY(var(--lift))_scale(var(--scale))]"
                      : "[transform:rotate(var(--fan-r))_translateY(var(--fan-y))]",
                  )}
                  style={
                    {
                      "--fan-r": `${fan.rotate}deg`,
                      "--fan-y": `${fan.lift}px`,
                      "--lift": isHovered ? "-44px" : "-16px",
                      "--scale": isHovered ? "1.12" : "1.04",
                    } as React.CSSProperties
                  }
                >
                  <GameCard
                    card={card}
                    playable={canPlay(card)}
                    // unit-targeted cards stay lifted in hand while the arrow tracks the cursor
                    dragging={isDragged && !isUnitTargetDrag}
                    armed={isArmed}
                    onPointerDown={onCardPointerDown}
                    onTap={onCardTap}
                    onSell={(c) => playerTurn && sell(c.uid)}
                    compact
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* right cluster: buy + end turn */}
        <div className="flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={onExit}
            className="flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 font-display text-xs font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:border-gold/40 hover:text-gold"
          >
            <Home size={13} />
            Menu
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
        <div className="pointer-events-none fixed bottom-28 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-gold/40 bg-ocean-deep/90 px-4 py-1.5 font-display text-xs uppercase tracking-widest text-gold">
          <span>
            {isBlastCard(pendingCard.def) ? "Pick a blast centre for" : "Pick a target for"}{" "}
            {pendingCard.def.name}
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <span aria-hidden>·</span>
            <MousePointer2 size={12} className="-scale-x-100" aria-hidden />
            right-click to cancel
          </span>
        </div>
      )}

      {/* targeting arrow (unit-targeted casts + unit attacks) */}
      {arrow && <TargetingArrow {...arrow} />}

      {/* drag ghost — only for tile-placed / self cards, which the arrow does not cover */}
      {drag?.kind === DragKind.Card &&
        drag.card &&
        aimMode(drag.card.def) !== AimMode.Unit && (
          <div
            className="pointer-events-none fixed z-[60] -translate-x-1/2 -translate-y-1/2"
            style={{ left: drag.x, top: drag.y }}
          >
            <div className="rotate-3 scale-105 drop-shadow-2xl" style={{ zoom: cardScale }}>
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

const EMPTY_BLAST = { tiles: [] as Pos[], unitIds: [] as string[], damage: 0 }

/** A card that covers more than the tile it lands on, and so aims at tiles. */
function isBlastCard(def: CardDef): boolean {
  return aimMode(def) === AimMode.Tile && def.aoe > AOE_SINGLE_TILE
}

/** Damage the card would deal to each unit inside its blast, for the preview. */
function damageTotal(def: CardDef): number {
  return def.effects.reduce((sum, e) => (e.kind === "damage" ? sum + e.amount : sum), 0)
}

function tileFromDrop(drop: HTMLElement | null, dropType: string | null | undefined): Pos | null {
  if (!drop || dropType !== "tile") return null
  return { x: Number(drop.dataset.x), y: Number(drop.dataset.y) }
}

const CARD_W = 149 // compact GameCard width, at scale 1
const CARD_H = 202 // compact GameCard height, at scale 1
const CARD_GAP = 8 // spacing used while the hand is still small
const TARGET_STEP = 55 // spacing we try to keep between cards — cost pip + art stay visible
const MIN_STEP = 34 // hard floor once even the target spacing cannot fit
const MIN_SCALE = 0.66
const MAX_SCALE = 1.3
const HAND_VH = 0.29 // the hand may claim at most this share of the window height
const HAND_REF = 7 // card size is sized for a hand this big, so playing a card never resizes the bar

/**
 * How large a card should render for the current window. Cards grow on roomy screens
 * and shrink on cramped ones, bounded so the hand never eats the board (height) and a
 * reference-sized hand still fits the track at readable spacing (width). Deliberately
 * independent of the live card count: the fan spacing absorbs that instead, so the bar
 * keeps a stable height as cards are played.
 */
function handScale(available: number, viewportH: number) {
  const byHeight = (viewportH * HAND_VH) / CARD_H
  const byWidth = available > 0 ? available / (CARD_W + (HAND_REF - 1) * TARGET_STEP) : MAX_SCALE
  return Math.max(MIN_SCALE, Math.min(MAX_SCALE, byHeight, byWidth))
}

/**
 * Fan geometry for card `i` of `n`: cards spread from the centre, tilt outward and
 * dip along an arc. As the hand grows they slide under each other instead of widening
 * the row, so the hand keeps a stable footprint no matter the card count. Works in
 * card-local units — the slot is zoomed by `handScale`, so `available` is divided by
 * that scale before it gets here.
 */
function fanTransform(i: number, n: number, available: number) {
  const fits = available > CARD_W ? (available - CARD_W) / Math.max(n - 1, 1) : CARD_W + CARD_GAP
  const step = Math.max(MIN_STEP, Math.min(CARD_W + CARD_GAP, fits))
  const offset = i - (n - 1) / 2
  const half = Math.max((n - 1) / 2, 0.5)
  const spread = Math.min(14, (n - 1) * 2.5) // total degrees edge to edge
  return {
    overlap: step - CARD_W,
    rotate: n <= 1 ? 0 : (offset / half) * (spread / 2),
    lift: (offset / half) ** 2 * Math.min(12, n * 1.5),
  }
}

function Pile({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1">
      <span className="text-gold/70">{icon}</span>
      <span className="font-display text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
      <span className="ml-auto font-display text-sm font-bold text-foreground">{value}</span>
    </div>
  )
}
