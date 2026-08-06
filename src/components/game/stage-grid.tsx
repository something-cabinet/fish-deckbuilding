"use client"

import type { EnemyDef } from "@/lib/game/units"
import type { StageDef, StagePlacement } from "@/lib/game/stages"
import { cn } from "@/lib/utils"

const SPRITE_PATH = "/sprites/"

interface Props {
  stage: Pick<StageDef, "cols" | "rows" | "heroStart" | "placements">
  /** enemy templates, for resolving each placement's sprite and name */
  enemies: EnemyDef[]
  /** interactive editing; omit for a read-only thumbnail */
  onTileClick?: (x: number, y: number) => void
  /** highlights the armed tool's would-be target */
  interactive?: boolean
  className?: string
}

/**
 * Renders a stage's grid with its placed enemies and hero start. Shared by the
 * library thumbnail and the editor canvas so both stay in step.
 */
export function StageGrid({ stage, enemies, onTileClick, interactive, className }: Props) {
  const { cols, rows, heroStart, placements } = stage
  const byId = new Map(enemies.map((e) => [e.id, e]))
  const byTile = new Map<string, StagePlacement>()
  for (const p of placements) byTile.set(`${p.x},${p.y}`, p)

  return (
    <div
      className={cn(
        "grid w-full overflow-hidden rounded-lg ring-1 ring-inset ring-teal/20",
        "bg-[radial-gradient(ellipse_at_50%_0%,oklch(0.3_0.05_220/0.5),transparent_60%)]",
        className,
      )}
      style={{
        aspectRatio: `${cols} / ${rows}`,
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
      }}
    >
      {Array.from({ length: cols * rows }, (_, i) => {
        const x = i % cols
        const y = Math.floor(i / cols)
        const placement = byTile.get(`${x},${y}`)
        const def = placement ? byId.get(placement.enemyId) : undefined
        const isHero = heroStart.x === x && heroStart.y === y

        const label = isHero
          ? "Hero start"
          : placement
            ? (def?.name ?? placement.enemyId)
            : "Empty"

        const content = (
          <>
            {isHero && (
              <img src={`${SPRITE_PATH}hero.png`} alt="" className="h-full w-full object-contain p-[6%]" />
            )}
            {!isHero && placement && (
              <img
                src={`${SPRITE_PATH}${def?.icon ?? "thug"}.png`}
                alt=""
                className="h-full w-full object-contain p-[6%]"
              />
            )}
          </>
        )

        const tileClass = cn(
          "relative border border-grid-line/40",
          (x + y) % 2 === 0 ? "bg-white/[0.015]" : "bg-white/[0.04]",
          isHero && "bg-teal/15 ring-1 ring-inset ring-teal/50",
          !isHero && placement && "bg-enemy/10",
          interactive && "transition-colors hover:bg-gold/25",
        )

        if (!onTileClick) {
          return (
            <div key={`${x},${y}`} className={tileClass} title={label}>
              {content}
            </div>
          )
        }

        return (
          <button
            key={`${x},${y}`}
            type="button"
            onClick={() => onTileClick(x, y)}
            aria-label={`${String.fromCharCode(65 + x)}${y + 1}: ${label}`}
            className={cn(tileClass, "cursor-pointer")}
          >
            {content}
          </button>
        )
      })}
    </div>
  )
}
