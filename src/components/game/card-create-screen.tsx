"use client"

import { useEffect, useState } from "react"
import { Check, PlusCircle } from "lucide-react"
import {
  AOE_MAX,
  AOE_SINGLE_TILE,
  CardTarget,
  CardType,
  aoeTileCount,
  type CardDef,
} from "@/lib/game/cards"
import type { CardEffect } from "@/lib/game/cards/models"
import { FxKind } from "@/lib/game/battle"
import { DEFAULT_SUMMON, SUMMON_DEFS, type SummonDef } from "@/lib/game/summons"
import { GENERIC_CARD_ART, cardArtUrl, useCardArtNames } from "./card-art"
import { CARD_ICON_NAMES, getCardIcon } from "./card-icons"
import { CardFace } from "./card-face"
import { EffectEditor, type EffectRow } from "./effect-editor"
import { SummonCreateScreen } from "./summon-create-screen"
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
  onBack: () => void
  onSave: (def: CardDef) => void
  editCard?: CardDef
  onUpdate?: (def: CardDef) => void
  /** summon templates a summon effect can pick from; defaults to the database */
  summons?: SummonDef[]
  /**
   * Persists a summon authored from inside this editor. Passing it turns on the
   * "New" button next to a summon effect's picker.
   */
  onSummonCreated?: (def: SummonDef) => void
}

const DRAFT_KEY = "fm.design.card.draft"

interface CardDraft {
  /** the card this draft belongs to, "new" for an unsaved one */
  forId: string
  name: string
  type: CardType
  target: CardTarget
  range: number
  aoe: number
  cost: number
  value: number
  desc: string
  icon: string
  art: string
  effects: EffectRow[]
}

/**
 * Saving a summon from inside this editor rewrites a JSON database, and the dev
 * server answers that with a full page reload — so the in-progress card is
 * stashed in sessionStorage and read back when the editor remounts. Leaving the
 * editor for real clears it, so a fresh card never starts on someone's leftovers.
 */
function readDraft(forId: string): CardDraft | null {
  if (typeof window === "undefined") return null
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const draft = JSON.parse(raw) as CardDraft
    return draft.forId === forId ? draft : null
  } catch {
    return null
  }
}

const TYPES: CardType[] = [CardType.Attack, CardType.Skill, CardType.Summon]
const TARGETS: { id: CardTarget; label: string }[] = [
  { id: CardTarget.Enemy, label: "Enemy" },
  { id: CardTarget.Ally, label: "Ally" },
  { id: CardTarget.Unit, label: "Any unit" },
  { id: CardTarget.Self, label: "Self" },
  { id: CardTarget.EmptyTile, label: "Empty tile" },
]
/** Reads the blast back to the designer in tiles, which is what they picture. */
function aoeHint(def: CardDef): string {
  if (def.aoe === AOE_SINGLE_TILE) return "single tile"
  return `${aoeTileCount(def.aoe)} tiles · aims at a tile`
}

const BLAST_GRID = AOE_MAX * 2 + 1

/** Mini board showing the diamond the current radius covers. */
function BlastPreview({ radius }: { radius: number }) {
  const centre = AOE_MAX
  return (
    <div
      className="grid gap-px"
      style={{ gridTemplateColumns: `repeat(${BLAST_GRID}, 8px)` }}
      aria-hidden
    >
      {Array.from({ length: BLAST_GRID * BLAST_GRID }, (_, i) => {
        const x = i % BLAST_GRID
        const y = Math.floor(i / BLAST_GRID)
        const inBlast = Math.abs(x - centre) + Math.abs(y - centre) <= radius
        return (
          <span
            key={i}
            className={cn(
              "h-2 w-2 rounded-[1px]",
              inBlast ? "bg-enemy/80" : "bg-white/10",
              x === centre && y === centre && "ring-1 ring-gold",
            )}
          />
        )
      })}
    </div>
  )
}

function slugify(name: string) {
  const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")
  return `custom_${base || "card"}_${Date.now().toString(36)}`
}

function fromCardEffects(effects: CardEffect[]): EffectRow[] {
  return effects.map((e) => {
    switch (e.kind) {
      case "damage": return { kind: "damage", amount: e.amount }
      case "heal": return { kind: "heal", amount: e.amount, healTarget: e.target }
      case "drawCards": return { kind: "drawCards", amount: e.amount }
      case "gainCoin": return { kind: "gainCoin", amount: e.amount }
      case "buffAtk": return { kind: "buffAtk", amount: e.amount }
case "summon": return { kind: "summon", amount: 0, summonUnitId: e.unit }
      case "custom": return { kind: "damage", amount: 0 }
    }
  })
}

function toCardEffects(rows: EffectRow[]): CardEffect[] {
  return rows.map((r) => {
    switch (r.kind) {
      case "damage": return { kind: "damage", amount: r.amount }
      case "heal": return { kind: "heal", amount: r.amount, target: r.healTarget ?? "caster" }
      case "drawCards": return { kind: "drawCards", amount: r.amount }
      case "gainCoin": return { kind: "gainCoin", amount: r.amount }
      case "buffAtk": return { kind: "buffAtk", amount: r.amount }
      case "summon": return { kind: "summon", unit: r.summonUnitId ?? DEFAULT_SUMMON.id }
    }
  })
}

export function CardCreateScreen({
  onBack,
  onSave,
  editCard,
  onUpdate,
  summons = SUMMON_DEFS,
  onSummonCreated,
}: Props) {
  const draftKey = editCard?.id ?? "new"
  const [stashed] = useState(() => readDraft(draftKey))
  const [name, setName] = useState(stashed?.name ?? editCard?.name ?? "")
  const [type, setType] = useState<CardType>(stashed?.type ?? editCard?.type ?? CardType.Attack)
  const [target, setTarget] = useState<CardTarget>(
    stashed?.target ?? editCard?.target ?? CardTarget.Enemy,
  )
  const [range, setRange] = useState(stashed?.range ?? editCard?.range ?? 4)
  const [aoe, setAoe] = useState(stashed?.aoe ?? editCard?.aoe ?? AOE_SINGLE_TILE)
  const [cost, setCost] = useState(stashed?.cost ?? editCard?.cost ?? 1)
  const [value, setValue] = useState(stashed?.value ?? editCard?.value ?? 1)
  const [desc, setDesc] = useState(stashed?.desc ?? editCard?.desc ?? "")
  const [icon, setIcon] = useState(stashed?.icon ?? editCard?.icon ?? "Swords")
  /** "" means "use the generic art for this card type" */
  const [art, setArt] = useState(stashed?.art ?? editCard?.art ?? "")
  const artNames = useCardArtNames()
  const [effects, setEffects] = useState<EffectRow[]>(
    stashed?.effects ?? (editCard ? fromCardEffects(editCard.effects) : []),
  )
  /** effect row waiting on a summon from the designer overlay, if any */
  const [summonRow, setSummonRow] = useState<number | null>(null)

  useEffect(() => {
    const stash: CardDraft = { forId: draftKey, name, type, target, range, aoe, cost, value, desc, icon, art, effects }
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(stash))
  }, [draftKey, name, type, target, range, aoe, cost, value, desc, icon, art, effects])

  // only a genuine unmount (leaving the editor) discards it; a reload does not
  useEffect(() => () => sessionStorage.removeItem(DRAFT_KEY), [])

  function handleSummonCreated(def: SummonDef) {
    onSummonCreated?.(def)
    setEffects((prev) => prev.map((e, i) => (i === summonRow ? { ...e, summonUnitId: def.id } : e)))
    setSummonRow(null)
  }

  const cardEffects = toCardEffects(effects)

  const draft: CardDef = {
    id: "preview",
    name,
    type,
    cost,
    value,
    target,
    range,
    aoe,
    desc,
    icon,
    ...(art ? { art } : {}),
    fx: FxKind.Shock,
    effects: cardEffects,
    log: "",
    logTone: "neutral",
  }
  const canSave = name.trim().length > 0

  function handleSave() {
    if (!canSave) return
    const card: CardDef = editCard
      ? { ...draft, id: editCard.id }
      : { ...draft, id: slugify(name) }
    if (editCard && onUpdate) {
      onUpdate(card)
    } else {
      onSave(card)
    }
  }

  return (
    <main className="flex h-dvh w-full flex-col overflow-hidden bg-ocean-deep text-foreground">
      <DesignHeader icon={PlusCircle} title="Card" accent="Editor" onBack={onBack}>
        {editCard && <EditingBadge name={editCard.name} />}
      </DesignHeader>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 md:flex-row">
        {/* form — splits into two columns once there is room for them */}
        <div className="flex min-w-0 flex-1 flex-col gap-3 xl:flex-row xl:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <Panel title="Identity">
              <Field label="Name" htmlFor="card-name">
                <input
                  id="card-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={22}
                  placeholder="Racketeering"
                  className={inputClass}
                />
              </Field>
              <Field label="Description" htmlFor="card-desc" hint={`${desc.length}/120`}>
                <textarea
                  id="card-desc"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  maxLength={120}
                  rows={2}
                  placeholder="Deal 3 damage to a target enemy."
                  className={cn(inputClass, "resize-none leading-snug")}
                />
              </Field>
            </Panel>

            <Panel title="Rules" bodyClassName="space-y-0 flex flex-wrap gap-x-5 gap-y-3">
              <Field label="Type">
                <div className="flex gap-1.5">
                  {TYPES.map((t) => (
                    <Chip key={t} active={type === t} onClick={() => setType(t)}>
                      {t}
                    </Chip>
                  ))}
                </div>
              </Field>
              <Field label="Cost">
                <Stepper value={cost} min={0} max={10} onChange={setCost} label="cost" />
              </Field>
              <Field label="Value" hint="sell price">
                <Stepper value={value} min={0} max={10} onChange={setValue} label="value" />
              </Field>
              {target !== CardTarget.Self && (
                <Field label="Range" hint="steps from your fish">
                  <Stepper value={range} min={1} max={9} onChange={setRange} label="range" />
                </Field>
              )}
              {target !== CardTarget.Self && (
                <Field label="Blast" hint={aoeHint(draft)}>
                  <div className="flex items-center gap-3">
                    <Stepper value={aoe} min={AOE_SINGLE_TILE} max={AOE_MAX} onChange={setAoe} label="blast" />
                    <BlastPreview radius={aoe} />
                  </div>
                </Field>
              )}
              <Field label="Target" className="basis-full">
                <div className="flex flex-wrap gap-1.5">
                  {TARGETS.map((t) => (
                    <Chip key={t.id} active={target === t.id} onClick={() => setTarget(t.id)}>
                      {t.label}
                    </Chip>
                  ))}
                </div>
              </Field>
            </Panel>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <Panel title="Effects">
              <EffectEditor
                effects={effects}
                onChange={setEffects}
                summons={summons}
                onCreateSummon={onSummonCreated ? setSummonRow : undefined}
              />
            </Panel>

            <Panel title="Artwork">
              <Field
                label="Art"
                hint={`Drop a 640x400 PNG in public/card-art/ to add more. Default: ${GENERIC_CARD_ART[type]}.`}
              >
                <div className="grid grid-cols-[repeat(auto-fill,minmax(84px,1fr))] gap-1.5">
                  <button
                    type="button"
                    onClick={() => setArt("")}
                    aria-pressed={art === ""}
                    className={cn(
                      "flex aspect-[16/10] items-center justify-center rounded-md border text-[11px] uppercase tracking-wider transition-colors",
                      art === ""
                        ? "border-gold bg-gold/15 text-gold"
                        : "border-white/10 text-muted-foreground hover:border-gold/40 hover:text-foreground",
                    )}
                  >
                    Default
                  </button>
                  {artNames.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setArt(n)}
                      aria-label={n}
                      aria-pressed={art === n}
                      className={cn(
                        "overflow-hidden rounded-md border transition-colors",
                        art === n ? "border-gold" : "border-white/10 hover:border-gold/40",
                      )}
                    >
                      <img
                        src={cardArtUrl(n)}
                        alt=""
                        className="aspect-[16/10] w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Fallback icon" hint="Drawn only if the art file is missing.">
              <div className="grid grid-cols-[repeat(auto-fill,minmax(32px,1fr))] gap-1.5">
                {CARD_ICON_NAMES.map((n) => {
                  const Ico = getCardIcon(n)
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setIcon(n)}
                      aria-label={n}
                      aria-pressed={icon === n}
                      className={cn(
                        "flex aspect-square items-center justify-center rounded-md border transition-colors",
                        icon === n
                          ? "border-gold bg-gold/15 text-gold"
                          : "border-white/10 text-muted-foreground hover:border-gold/40 hover:text-foreground",
                      )}
                    >
                      <Ico size={15} strokeWidth={1.75} />
                    </button>
                  )
                })}
              </div>
              </Field>
            </Panel>
          </div>
        </div>

        <PreviewRail
          note={canSave ? undefined : "Give your card a name to save it."}
          action={
            <PrimaryButton onClick={handleSave} disabled={!canSave} className="w-full py-2.5 text-sm">
              <Check size={16} />
              {editCard ? "Update" : "Save"}
            </PrimaryButton>
          }
        >
          <CardFace def={draft} size="md" />
        </PreviewRail>
      </div>

      {/* the summon designer runs over the card editor, so the draft stays put
          and the new template lands straight in the effect row that asked for it */}
      {summonRow !== null && (
        <div className="fixed inset-0 z-50 bg-ocean-deep" role="dialog" aria-modal="true">
          <SummonCreateScreen
            onBack={() => setSummonRow(null)}
            onSave={handleSummonCreated}
          />
        </div>
      )}
    </main>
  )
}
