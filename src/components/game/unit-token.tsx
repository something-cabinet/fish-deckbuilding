"use client"

import { Team, UnitKind, type Unit } from "@/lib/game/units"
import { cn } from "@/lib/utils"

const SPRITES: Record<Unit["kind"], string> = {
  [UnitKind.Hero]: "/sprites/hero.png",
  [UnitKind.Goon]: "/sprites/goon.png",
  [UnitKind.Thug]: "/sprites/thug.png",
  [UnitKind.Enforcer]: "/sprites/enforcer.png",
  [UnitKind.Boss]: "/sprites/boss.png",
}

interface Props {
  unit: Unit
  /** board dimensions, so tokens position correctly on any stage size */
  cols: number
  rows: number
  selected: boolean
  isValidTarget: boolean
  hit: boolean
  onPointerDown: (e: React.PointerEvent, unit: Unit) => void
  onClick: (unit: Unit) => void
}

export function UnitToken({ unit, cols, rows, selected, isValidTarget, hit, onPointerDown, onClick }: Props) {
  const left = ((unit.pos.x + 0.5) / cols) * 100
  const top = ((unit.pos.y + 0.5) / rows) * 100
  const isPlayer = unit.team === Team.Player
  const canMove = isPlayer && !unit.hasMoved
  const hpPct = Math.max(0, (unit.hp / unit.maxHp) * 100)
  const isBoss = unit.kind === UnitKind.Boss

  return (
    <div
      data-drop="unit"
      data-unit-id={unit.id}
      className={cn(
        "group absolute z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center",
        "transition-[left,top] duration-300 ease-out",
        canMove ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
        isValidTarget && "cursor-pointer",
      )}
      style={{ left: `${left}%`, top: `${top}%`, width: `${100 / cols}%` }}
      onPointerDown={(e) => canMove && onPointerDown(e, unit)}
      onClick={() => onClick(unit)}
      role="button"
      aria-label={`${unit.name} at ${String.fromCharCode(65 + unit.pos.x)}${unit.pos.y + 1}, ${unit.hp} of ${unit.maxHp} health`}
    >
      {/* target / select ring */}
      <div
        className={cn(
          "pointer-events-none absolute left-1/2 top-[46%] aspect-square w-[86%] -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-150",
          selected && "bg-gold/10 ring-2 ring-gold animate-fm-pulse-ring",
          isValidTarget &&
            "bg-gold/15 ring-2 ring-gold animate-fm-pulse-ring group-hover:scale-105 group-hover:bg-gold/35 group-hover:ring-[3px]",
        )}
      />

      {/* sprite disc */}
      <div
        className={cn(
          "relative flex items-center justify-center",
          isBoss ? "w-[94%]" : "w-[78%]",
          hit && "animate-fm-shake",
          isPlayer ? "animate-fm-bob" : "animate-fm-float",
        )}
      >
        <div
          className={cn(
            "relative aspect-square w-full overflow-hidden rounded-full ring-2 shadow-[0_5px_10px_rgba(0,0,0,0.55)] transition-all",
            isPlayer ? "ring-gold/70" : "ring-enemy/70",
            selected && "ring-gold",
            isValidTarget && "ring-gold/80 group-hover:ring-gold group-hover:shadow-[0_0_16px_2px_var(--gold)]",
          )}
          style={{ filter: unit.hp <= 0 ? "grayscale(1)" : undefined }}
        >
          <img
            src={SPRITES[unit.kind] || "/placeholder.svg"}
            alt=""
            draggable={false}
            className="h-full w-full select-none object-cover"
          />
          {/* subtle inner vignette so the disc reads as a token */}
          <span className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_-6px_10px_rgba(0,0,0,0.45),inset_0_3px_6px_rgba(255,255,255,0.12)]" />
        </div>
      </div>

      {/* stat plate: ATK | HP */}
      <div
        className={cn(
          "pointer-events-none relative -mt-1 flex items-stretch overflow-hidden rounded-md border text-[clamp(5px,1cqi,12px)] font-bold leading-none shadow-md",
          "font-display tracking-wide",
          isPlayer ? "border-gold/60 bg-ocean-deep/90" : "border-enemy/60 bg-ocean-deep/90",
        )}
      >
        <span className="flex items-center gap-0.5 bg-enemy/85 px-1.5 py-1 text-white">{unit.atk + unit.buffAtk}</span>
        <span className="flex flex-col justify-center px-1.5 py-0.5 text-foreground">
          <span className="text-center">{unit.hp}</span>
          <span className="mt-0.5 block h-[3px] w-8 overflow-hidden rounded-full bg-white/15">
            <span
              className={cn("block h-full rounded-full", isPlayer ? "bg-emerald-400" : "bg-enemy")}
              style={{ width: `${hpPct}%` }}
            />
          </span>
        </span>
      </div>
    </div>
  )
}
