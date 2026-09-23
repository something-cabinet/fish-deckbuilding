"use client"

import { Team, UnitKind, type Unit } from "@/lib/game/units"
import { EnemyStepKind, type EnemyIntention } from "@/lib/game/battle"
import { PLACEHOLDER_SPRITE, spriteUrl } from "./sprites"
import { cn } from "@/lib/utils"

/** Fallback art per kind, used by any unit that carries no sprite of its own. */
const SPRITES: Record<Unit["kind"], string> = {
  [UnitKind.Hero]: spriteUrl(PLACEHOLDER_SPRITE.player),
  [UnitKind.Goon]: spriteUrl(PLACEHOLDER_SPRITE.summon),
  [UnitKind.Soldier]: spriteUrl(PLACEHOLDER_SPRITE.enemy),
  [UnitKind.Capo]: spriteUrl(PLACEHOLDER_SPRITE.enemy),
  [UnitKind.Boss]: spriteUrl(PLACEHOLDER_SPRITE.enemy),
}

/** A unit's own sprite (the character picked in the designer) wins over its kind's. */
function unitSprite(unit: Unit): string {
  return unit.icon ? spriteUrl(unit.icon) : SPRITES[unit.kind]
}

function IntentionIcon({ kind }: { kind: EnemyStepKind }) {
  if (kind === EnemyStepKind.Move) {
    return (
      <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.5" className="drop-shadow-sm">
        <path d="M1 8h10M7 4l4 4-4 4" />
      </svg>
    )
  }
  if (kind === EnemyStepKind.Attack) {
    return (
      <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.5" className="drop-shadow-sm">
        <circle cx="8" cy="8" r="2.5" />
        <path d="M8 2v2M8 12v2M2 8h2M12 8h2" />
      </svg>
    )
  }
  // CastCard
  return (
    <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.5" className="drop-shadow-sm">
      <rect x="2" y="1.5" width="12" height="13" rx="1.5" />
      <path d="M5 4.5h6M5 7.5h6M5 10.5h4" />
    </svg>
  )
}

interface Props {
  unit: Unit
  /** board dimensions, so tokens position correctly on any stage size */
  cols: number
  rows: number
  selected: boolean
  isValidTarget: boolean
  hit: boolean
  /** inside the blast the armed card would land — outlined, with its damage */
  previewHit: boolean
  previewDamage: number
  enemyIntention: EnemyIntention | null
  /**
   * False while a tile-aimed card is armed, so pointer events fall through to
   * the tile underneath and a blast can be centred on an occupied square.
   */
  interactive: boolean
  onPointerDown: (e: React.PointerEvent, unit: Unit) => void
  onPointerEnter: (unit: Unit) => void
  onPointerLeave: () => void
  onClick: (unit: Unit) => void
}

export function UnitToken({
  unit,
  cols,
  rows,
  selected,
  isValidTarget,
  hit,
  previewHit,
  previewDamage,
  enemyIntention,
  interactive,
  onPointerDown,
  onPointerEnter,
  onPointerLeave,
  onClick,
}: Props) {
  const left = ((unit.pos.x + 0.5) / cols) * 100
  const top = ((unit.pos.y + 0.5) / rows) * 100
  const isPlayer = unit.team === Team.Player
  const canMove = isPlayer && !unit.hasMoved
  const hpPct = Math.max(0, (unit.hp / unit.maxHp) * 100)
  const isBoss = unit.kind === UnitKind.Boss
  const isEnemy = unit.team === Team.Enemy

  return (
    <div
      data-drop="unit"
      data-unit-id={unit.id}
      className={cn(
        "group absolute z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center",
        "transition-[left,top] duration-300 ease-out",
        canMove ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
        isValidTarget && "cursor-pointer",
        !interactive && "pointer-events-none",
      )}
      style={{ left: `${left}%`, top: `${top}%`, width: `${100 / cols}%` }}
      onPointerDown={(e) => canMove && onPointerDown(e, unit)}
      onPointerEnter={() => onPointerEnter(unit)}
      onPointerLeave={onPointerLeave}
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
          previewHit && "bg-enemy/25 ring-2 ring-enemy animate-fm-pulse-ring",
        )}
      />

      {/* intention icon for enemy units */}
      {isEnemy && enemyIntention && (
        <div
          className={cn(
            "pointer-events-none absolute -top-1 z-30 flex items-center justify-center",
            "rounded-full border px-1 py-0.5",
            "font-display text-xs font-bold leading-none shadow-md",
            enemyIntention.kind === EnemyStepKind.Move
              ? "border-teal/60 bg-ocean-deep/95 text-teal"
              : enemyIntention.kind === EnemyStepKind.Attack
                ? "border-enemy/70 bg-ocean-deep/95 text-enemy"
                : "border-gold/60 bg-ocean-deep/95 text-gold-dim",
          )}
        >
          <IntentionIcon kind={enemyIntention.kind} />
        </div>
      )}

      {previewHit && previewDamage > 0 && (
        <span className="pointer-events-none absolute -top-1 left-1/2 z-30 -translate-x-1/2 rounded-full border border-enemy/70 bg-ocean-deep/95 px-1.5 py-0.5 font-display text-[clamp(6px,1.4cqi,13px)] font-bold leading-none text-enemy shadow">
          -{previewDamage}
        </span>
      )}

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
            previewHit && "ring-enemy shadow-[0_0_16px_2px_var(--enemy)]",
          )}
          style={{ filter: unit.hp <= 0 ? "grayscale(1)" : undefined }}
        >
          <img
            src={unitSprite(unit) || "/placeholder.svg"}
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
        <span className="flex items-center gap-0.5 bg-enemy/85 px-1.5 py-1 text-white">
        {unit.atk + unit.buffAtk}
        {unit.buffAtk > 0 && (
          <span className="ml-0.5 rounded-sm bg-gold/85 px-0.5 text-[9px] font-bold leading-none text-ocean-deep">
            +{unit.buffAtk}
          </span>
        )}
        {unit.buffAtk < 0 && (
          <span className="ml-0.5 rounded-sm bg-red-400/85 px-0.5 text-[9px] font-bold leading-none text-white">
            {unit.buffAtk}
          </span>
        )}
      </span>
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