"use client"

import { Footprints, Heart, Plus, Swords, Trash2 } from "lucide-react"
import { SUMMON_DEFS, type SummonDef } from "@/lib/game/summons"
import { spriteUrl } from "./sprites"
import { selectClass } from "./design-ui"
import { cn } from "@/lib/utils"

export interface EffectRow {
  kind: "damage" | "heal" | "drawCards" | "gainCoin" | "buffAtk" | "summon"
  amount: number
  healTarget?: "caster" | "cast-target"
  /** SummonDef id, for kind "summon" */
  summonUnitId?: string
}

interface Props {
  effects: EffectRow[]
  onChange: (effects: EffectRow[]) => void
  /** restrict the kind dropdown; defaults to every kind a card can use */
  allowedKinds?: EffectRow["kind"][]
  /** label on the add button, when "Add Effect" would be ambiguous */
  addLabel?: string
  /** summon templates to choose from; defaults to the shipped database */
  summons?: SummonDef[]
  /** opens the summon designer for the given effect row, when the host offers it */
  onCreateSummon?: (effectIndex: number) => void
}

const EFFECT_KINDS: { id: EffectRow["kind"]; label: string }[] = [
  { id: "damage", label: "Damage" },
  { id: "heal", label: "Heal" },
  { id: "drawCards", label: "Draw" },
  { id: "gainCoin", label: "Coin" },
  { id: "buffAtk", label: "Buff Atk" },
  { id: "summon", label: "Summon" },
]

const HAS_AMOUNT = new Set(["damage", "heal", "drawCards", "gainCoin", "buffAtk"])
const HAS_TARGET = new Set(["heal"])
const HAS_SUMMON_UNIT = new Set(["summon"])

function rangeLabel(range: number) {
  return range === 1 ? "Melee" : "Ranged"
}

/**
 * Stat line for the summon a row currently points at, so a card author can tell
 * the templates apart without leaving for the Summon designer.
 */
function SummonPreview({ def }: { def?: SummonDef }) {
  if (!def) {
    return (
      <p className="mt-1.5 rounded-md border border-dashed border-white/10 px-2 py-1.5 text-xs text-muted-foreground">
        This effect points at a summon that no longer exists — pick another one.
      </p>
    )
  }
  return (
    <div className="mt-1.5 flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1">
      <img src={spriteUrl(def.icon)} alt="" className="h-7 w-7 shrink-0 object-contain" />
      <span className="min-w-0 truncate font-display text-xs font-bold uppercase tracking-wider text-gold">
        {def.name}
      </span>
      <span className="ml-auto flex shrink-0 items-center gap-2 font-display text-xs font-bold text-muted-foreground">
        <span className="flex items-center gap-0.5" title="HP">
          <Heart size={11} />
          {def.hp}
        </span>
        <span className="flex items-center gap-0.5" title="Attack">
          <Swords size={11} />
          {def.atk}
        </span>
        <span className="flex items-center gap-0.5" title="Move">
          <Footprints size={11} />
          {def.move}
        </span>
        <span className="tracking-wider">{rangeLabel(def.range)}</span>
      </span>
    </div>
  )
}

export function EffectEditor({
  effects,
  onChange,
  allowedKinds,
  addLabel,
  summons = SUMMON_DEFS,
  onCreateSummon,
}: Props) {
  // caller order wins, so the first allowed kind is the one Add starts on
  const kinds = allowedKinds
    ? allowedKinds.flatMap((id) => EFFECT_KINDS.filter((k) => k.id === id))
    : EFFECT_KINDS

  function addEffect() {
    onChange([...effects, { kind: kinds[0]?.id ?? "damage", amount: 1 }])
  }

  function removeEffect(idx: number) {
    onChange(effects.filter((_, i) => i !== idx))
  }

  function updateEffect(idx: number, update: Partial<EffectRow>) {
    onChange(effects.map((e, i) => (i === idx ? { ...e, ...update } : e)))
  }

  return (
    <div className="space-y-1.5">
      {effects.map((effect, idx) => {
        const summonId = effect.summonUnitId ?? summons[0]?.id ?? ""
        const summonDef = summons.find((s) => s.id === summonId)
        return (
          <div key={idx} className="rounded-lg border border-white/10 bg-white/[0.04] p-1.5">
            <div className="flex items-center gap-1.5">
              <select
                value={effect.kind}
                aria-label={`Effect ${idx + 1} kind`}
                onChange={(e) => updateEffect(idx, { kind: e.target.value as EffectRow["kind"] })}
                className={cn(selectClass, "min-w-0 flex-1 py-1 sm:max-w-[240px]")}
              >
                {kinds.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.label}
                  </option>
                ))}
              </select>

              {HAS_AMOUNT.has(effect.kind) && (
                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    aria-label="Decrease amount"
                    onClick={() => updateEffect(idx, { amount: Math.max(1, effect.amount - 1) })}
                    className="flex h-6 w-6 items-center justify-center rounded border border-white/10 text-xs text-muted-foreground transition-colors hover:border-gold/40 hover:text-gold"
                  >
                    −
                  </button>
                  <span className="flex h-6 w-7 items-center justify-center font-display text-xs font-bold text-gold">
                    {effect.amount}
                  </span>
                  <button
                    type="button"
                    aria-label="Increase amount"
                    onClick={() => updateEffect(idx, { amount: Math.min(99, effect.amount + 1) })}
                    className="flex h-6 w-6 items-center justify-center rounded border border-white/10 text-xs text-muted-foreground transition-colors hover:border-gold/40 hover:text-gold"
                  >
                    +
                  </button>
                </div>
              )}

              {HAS_TARGET.has(effect.kind) && (
                <select
                  value={effect.healTarget ?? "caster"}
                  aria-label={`Effect ${idx + 1} heal target`}
                  onChange={(e) =>
                    updateEffect(idx, { healTarget: e.target.value as "caster" | "cast-target" })
                  }
                  className="rounded-md border border-white/10 bg-ocean-deep px-1.5 py-1 font-display text-xs uppercase tracking-wider text-foreground outline-none focus:border-gold/50"
                >
                  <option value="caster">Self</option>
                  <option value="cast-target">Target</option>
                </select>
              )}

              {HAS_SUMMON_UNIT.has(effect.kind) && (
                <>
                  <select
                    value={summonId}
                    aria-label={`Effect ${idx + 1} summon unit`}
                    onChange={(e) => updateEffect(idx, { summonUnitId: e.target.value })}
                    className={cn(selectClass, "min-w-0 flex-1 py-1 sm:max-w-[230px]")}
                  >
                    {/* keep a stale id selectable so it is visible, not silently swapped */}
                    {!summonDef && <option value={summonId}>{summonId || "None"}</option>}
                    {summons.map((s) => (
                      // stats ride in the label, the only detail a native option shows
                      <option key={s.id} value={s.id}>
                        {`${s.name} — ${s.hp} HP · ${s.atk} ATK · ${rangeLabel(s.range)}`}
                      </option>
                    ))}
                  </select>
                  {onCreateSummon && (
                    <button
                      type="button"
                      aria-label={`Effect ${idx + 1} new summon`}
                      title="Design a new summon"
                      onClick={() => onCreateSummon(idx)}
                      className="flex h-6 shrink-0 items-center gap-1 rounded border border-white/10 px-1.5 font-display text-xs font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:border-gold/40 hover:text-gold"
                    >
                      <Plus size={12} />
                      New
                    </button>
                  )}
                </>
              )}

              <button
                type="button"
                aria-label="Remove effect"
                onClick={() => removeEffect(idx)}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:text-red-400"
              >
                <Trash2 size={12} />
              </button>
            </div>

            {HAS_SUMMON_UNIT.has(effect.kind) && <SummonPreview def={summonDef} />}
          </div>
        )
      })}

      <button
        type="button"
        onClick={addEffect}
        className={cn(
          "flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-white/10 px-2.5 py-1.5",
          "font-display text-xs font-bold uppercase tracking-wider text-muted-foreground",
          "transition-colors hover:border-gold/40 hover:text-gold",
        )}
      >
        <Plus size={12} />
        {addLabel ?? "Add Effect"}
      </button>
    </div>
  )
}
