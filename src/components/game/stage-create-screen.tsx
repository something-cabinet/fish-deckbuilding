"use client"

import { useState } from "react"
import { Check, Eraser, Map as MapIcon, User } from "lucide-react"
import type { EnemyDef } from "@/lib/game/units"
import type { ZoneId } from "@/lib/game/overworld-types"
import {
  STAGE_DEFAULT_COLS,
  STAGE_DEFAULT_ROWS,
  STAGE_MAX_COLS,
  STAGE_MAX_ROWS,
  STAGE_MIN_COLS,
  STAGE_MIN_ROWS,
  type StageDef,
  type StagePlacement,
  type StageType,
} from "@/lib/game/stages"
import { StageGrid } from "./stage-grid"
import { ZONE_SECTIONS } from "./stage-library-screen"
import {
  Chip,
  DesignHeader,
  EditingBadge,
  Field,
  Panel,
  PreviewRail,
  PrimaryButton,
  Stepper,
  inputClass,
} from "./design-ui"
import { cn } from "@/lib/utils"

interface Props {
  enemies: EnemyDef[]
  /** zone the stage is created in when not editing */
  initialZone?: ZoneId
  onBack: () => void
  onSave: (def: StageDef) => void
  editStage?: StageDef
  onUpdate?: (def: StageDef) => void
}

const SPRITE_PATH = "/sprites/"

/** What a grid click does. "hero" moves the spawn, "erase" clears a tile. */
type Tool = { kind: "enemy"; enemyId: string } | { kind: "hero" } | { kind: "erase" }

const STAGE_TYPE_OPTIONS: { id: StageType; label: string; hint: string }[] = [
  { id: "normal", label: "Normal", hint: "standard battle nodes" },
  { id: "elite", label: "Elite", hint: "elite nodes, used as built" },
  { id: "boss", label: "Boss", hint: "the zone's boss node" },
]

function slugify(name: string) {
  const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")
  return `stage_${base || "stage"}_${Date.now().toString(36)}`
}

export function StageCreateScreen({
  enemies,
  initialZone,
  onBack,
  onSave,
  editStage,
  onUpdate,
}: Props) {
  const [name, setName] = useState(editStage?.name ?? "")
  const [zone, setZone] = useState<ZoneId>(editStage?.zone ?? initialZone ?? "shallows")
  const [cols, setCols] = useState(editStage?.cols ?? STAGE_DEFAULT_COLS)
  const [rows, setRows] = useState(editStage?.rows ?? STAGE_DEFAULT_ROWS)
  const [type, setType] = useState<StageType>(editStage?.type ?? "normal")
  const [heroStart, setHeroStart] = useState(
    editStage?.heroStart ?? { x: 1, y: Math.floor(STAGE_DEFAULT_ROWS / 2) },
  )
  const [placements, setPlacements] = useState<StagePlacement[]>(editStage?.placements ?? [])
  const [tool, setTool] = useState<Tool>(
    enemies.length > 0 ? { kind: "enemy", enemyId: enemies[0].id } : { kind: "hero" },
  )

  const draft: StageDef = {
    id: "preview",
    name: name || "Untitled Stage",
    zone,
    cols,
    rows,
    type,
    heroStart,
    placements,
  }
  const canSave = name.trim().length > 0

  /** Shrinking the grid drops anything that would fall off the board. */
  function resize(nextCols: number, nextRows: number) {
    setCols(nextCols)
    setRows(nextRows)
    setPlacements((prev) => prev.filter((p) => p.x < nextCols && p.y < nextRows))
    setHeroStart((prev) => ({
      x: Math.min(prev.x, nextCols - 1),
      y: Math.min(prev.y, nextRows - 1),
    }))
  }

  function handleTile(x: number, y: number) {
    if (tool.kind === "hero") {
      // the hero cannot share a tile with an enemy
      setPlacements((prev) => prev.filter((p) => !(p.x === x && p.y === y)))
      setHeroStart({ x, y })
      return
    }
    if (tool.kind === "erase") {
      setPlacements((prev) => prev.filter((p) => !(p.x === x && p.y === y)))
      return
    }
    // placing on the hero tile would strand the spawn — ignore it
    if (heroStart.x === x && heroStart.y === y) return
    setPlacements((prev) => [
      ...prev.filter((p) => !(p.x === x && p.y === y)),
      { enemyId: tool.enemyId, x, y },
    ])
  }

  function handleSave() {
    if (!canSave) return
    const stage: StageDef = editStage
      ? { ...draft, id: editStage.id }
      : { ...draft, id: slugify(name) }
    if (editStage && onUpdate) {
      onUpdate(stage)
    } else {
      onSave(stage)
    }
  }

  return (
    <main className="flex h-dvh w-full flex-col overflow-hidden bg-ocean-deep text-foreground">
      <DesignHeader icon={MapIcon} title="Stage" accent="Designer" onBack={onBack}>
        {editStage && <EditingBadge name={editStage.name} />}
      </DesignHeader>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 md:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <Panel title="Identity" bodyClassName="space-y-0 flex flex-wrap gap-x-5 gap-y-3">
            <Field label="Name" htmlFor="stage-name" className="min-w-[200px] flex-1">
              <input
                id="stage-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={28}
                placeholder="Reef Ambush"
                className={inputClass}
              />
            </Field>
            <Field label="Zone">
              <div className="flex flex-wrap gap-1.5">
                {ZONE_SECTIONS.map((z) => (
                  <Chip key={z.id} active={zone === z.id} onClick={() => setZone(z.id)}>
                    {z.name}
                  </Chip>
                ))}
              </div>
            </Field>
            <Field
              label="Type"
              hint={STAGE_TYPE_OPTIONS.find((o) => o.id === type)?.hint}
            >
              <div className="flex gap-1.5">
                {STAGE_TYPE_OPTIONS.map((o) => (
                  <Chip key={o.id} active={type === o.id} onClick={() => setType(o.id)}>
                    {o.label}
                  </Chip>
                ))}
              </div>
            </Field>
            <Field label="Width">
              <Stepper
                value={cols}
                min={STAGE_MIN_COLS}
                max={STAGE_MAX_COLS}
                onChange={(v) => resize(v, rows)}
                label="width"
              />
            </Field>
            <Field label="Height">
              <Stepper
                value={rows}
                min={STAGE_MIN_ROWS}
                max={STAGE_MAX_ROWS}
                onChange={(v) => resize(cols, v)}
                label="height"
              />
            </Field>
          </Panel>

          <Panel title="Place" bodyClassName="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              <ToolButton
                active={tool.kind === "hero"}
                onClick={() => setTool({ kind: "hero" })}
                label="Hero start"
                icon={<User size={14} className="text-teal" />}
              />
              {enemies.map((e) => (
                <ToolButton
                  key={e.id}
                  active={tool.kind === "enemy" && tool.enemyId === e.id}
                  onClick={() => setTool({ kind: "enemy", enemyId: e.id })}
                  label={`${e.name} · ${e.hp}hp`}
                  icon={
                    <img src={`${SPRITE_PATH}${e.icon}.png`} alt="" className="h-4 w-4 object-contain" />
                  }
                />
              ))}
              <ToolButton
                active={tool.kind === "erase"}
                onClick={() => setTool({ kind: "erase" })}
                label="Erase"
                icon={<Eraser size={14} />}
              />
            </div>
            {enemies.length === 0 && (
              <p className="text-[10px] text-muted-foreground">
                No enemy templates yet — create some on the Enemies tab first.
              </p>
            )}
          </Panel>

          <Panel title={`Grid · ${cols}×${rows}`}>
            {/* capped so a small grid does not blow tiles up to poster size */}
            <div className="max-w-[620px]">
              <StageGrid stage={draft} enemies={enemies} onTileClick={handleTile} interactive />
            </div>
            <p className="text-[10px] text-muted-foreground">
              Click a tile to place the armed tool. Placing over an occupied tile replaces it.
            </p>
          </Panel>
        </div>

        <PreviewRail
          note={canSave ? undefined : "Give your stage a name to save it."}
          action={
            <PrimaryButton onClick={handleSave} disabled={!canSave} className="w-full py-2.5 text-sm">
              <Check size={16} />
              {editStage ? "Update" : "Save"}
            </PrimaryButton>
          }
        >
          <div className="w-full max-w-[170px]">
            <StageGrid stage={draft} enemies={enemies} />
          </div>
          <p className="text-center font-display text-[10px] uppercase tracking-wider text-muted-foreground">
            {placements.length} {placements.length === 1 ? "enemy" : "enemies"} · {type} pool
          </p>
        </PreviewRail>
      </div>
    </main>
  )
}

function ToolButton({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean
  onClick: () => void
  label: string
  icon: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-display text-[10px] font-bold uppercase tracking-wider transition-colors",
        active
          ? "border-gold bg-gold/15 text-gold"
          : "border-white/10 text-muted-foreground hover:border-gold/40 hover:text-gold",
      )}
    >
      {icon}
      {label}
    </button>
  )
}
