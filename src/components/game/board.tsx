"use client"

import { useMemo } from "react"
import { ParticleCanvas } from "./particle-canvas"
import { UnitToken } from "./unit-token"
import { COLS, ROWS, type FxEvent, type GameState, type Pos, type Unit } from "@/lib/game/types"
import { cn } from "@/lib/utils"

const COL_LABELS = Array.from({ length: COLS }, (_, i) => String.fromCharCode(65 + i))
const ROW_LABELS = Array.from({ length: ROWS }, (_, i) => `${i + 1}`)

interface Props {
  state: GameState
  fx: FxEvent[]
  reachable: Pos[]
  showEffects?: boolean
  highlightTiles: Pos[]
  highlightUnitIds: string[]
  onCellPointerUp: (pos: Pos) => void
  onCellClick: (pos: Pos) => void
  onUnitClick: (unit: Unit) => void
  onUnitPointerDown: (e: React.PointerEvent, unit: Unit) => void
}

export function Board({
  state,
  fx,
  reachable,
  showEffects = true,
  highlightTiles,
  highlightUnitIds,
  onCellPointerUp,
  onCellClick,
  onUnitClick,
  onUnitPointerDown,
}: Props) {
  const reachSet = useMemo(() => new Set(reachable.map((p) => `${p.x},${p.y}`)), [reachable])
  const tileSet = useMemo(() => new Set(highlightTiles.map((p) => `${p.x},${p.y}`)), [highlightTiles])
  const unitTargets = useMemo(() => new Set(highlightUnitIds), [highlightUnitIds])

  const hitIds = useMemo(() => {
    const s = new Set<string>()
    for (const e of fx) {
      if ((e.kind === "shock" || e.kind === "melee" || e.kind === "death") && e.to) {
        const u = state.units.find((x) => x.pos.x === e.to!.x && x.pos.y === e.to!.y)
        if (u) s.add(u.id)
      }
    }
    return s
  }, [fx, state.units])

  const floaters = useMemo(
    () =>
      fx.filter(
        (e) =>
          e.amount != null &&
          e.to != null &&
          (e.kind === "shock" || e.kind === "melee" || e.kind === "heal" || e.kind === "coin"),
      ),
    [fx],
  )

  return (
    <div className="flex w-full max-w-[1150px] flex-col">
      {/* board frame */}
      <div className="relative rounded-2xl border border-gold/25 bg-ocean-deep/60 p-3 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.7)] sm:p-4">
        <div className="flex gap-1.5 sm:gap-2">
          {/* row numbers */}
          <div className="flex flex-col justify-around py-[2px] font-display text-xs text-gold/70">
            {ROW_LABELS.map((r) => (
              <span key={r} className="leading-none">
                {r}
              </span>
            ))}
          </div>

          {/* grid area */}
          <div className="relative flex-1">
            <div
              className="relative w-full overflow-hidden rounded-lg ring-1 ring-inset ring-teal/20"
              style={{ aspectRatio: `${COLS} / ${ROWS}` }}
            >
              {/* water backdrop */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,oklch(0.3_0.05_220/0.5),transparent_60%)]" />

              {/* cells */}
              <div
                className="absolute inset-0 grid"
                style={{
                  gridTemplateColumns: `repeat(${COLS}, 1fr)`,
                  gridTemplateRows: `repeat(${ROWS}, 1fr)`,
                }}
              >
                {Array.from({ length: COLS * ROWS }, (_, i) => {
                  const x = i % COLS
                  const y = Math.floor(i / COLS)
                  const key = `${x},${y}`
                  const isReach = reachSet.has(key)
                  const isTile = tileSet.has(key)
                  return (
                    <div
                      key={key}
                      data-drop="tile"
                      data-x={x}
                      data-y={y}
                      onPointerUp={() => onCellPointerUp({ x, y })}
                      onClick={() => onCellClick({ x, y })}
                      className={cn(
                        "relative border border-grid-line/40 transition-colors",
                        (x + y) % 2 === 0 ? "bg-white/[0.015]" : "bg-white/[0.04]",
                        isReach && "cursor-pointer bg-teal/15 hover:bg-teal/30",
                        isTile && "cursor-pointer bg-gold/20 ring-1 ring-inset ring-gold/60 hover:bg-gold/35",
                      )}
                    >
                      {isReach && (
                        <span className="pointer-events-none absolute inset-0 m-auto h-2 w-2 rounded-full bg-teal/70 shadow-[0_0_8px] shadow-teal" />
                      )}
                    </div>
                  )
                })}
              </div>

              {/* particle overlay */}
              {showEffects && <ParticleCanvas fx={fx} />}

              {/* units */}
              {state.units.map((u) => (
                <UnitToken
                  key={u.id}
                  unit={u}
                  selected={state.selectedUnitId === u.id}
                  isValidTarget={unitTargets.has(u.id)}
                  hit={hitIds.has(u.id)}
                  onClick={onUnitClick}
                  onPointerDown={onUnitPointerDown}
                />
              ))}

              {/* floating numbers */}
              {showEffects && floaters.map((e) => {
                const left = ((e.to!.x + 0.5) / COLS) * 100
                const top = ((e.to!.y + 0.2) / ROWS) * 100
                const isHeal = e.kind === "heal"
                const isCoin = e.kind === "coin"
                return (
                  <span
                    key={`f${e.id}`}
                    className={cn(
                      "pointer-events-none absolute z-40 -translate-x-1/2 animate-fm-rise font-display text-lg font-bold text-outline-shadow",
                      isHeal ? "text-emerald-300" : isCoin ? "text-gold" : "text-red-300",
                    )}
                    style={{ left: `${left}%`, top: `${top}%` }}
                  >
                    {isHeal || isCoin ? "+" : "-"}
                    {e.amount}
                  </span>
                )
              })}
            </div>

            {/* column letters */}
            <div
              className="mt-1 grid font-display text-xs text-gold/70"
              style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}
            >
              {COL_LABELS.map((c) => (
                <span key={c} className="text-center leading-none">
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
