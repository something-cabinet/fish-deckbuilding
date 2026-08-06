"use client"

import { Plus, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

export interface EffectRow {
  kind: "damage" | "heal" | "drawCards" | "gainCoin" | "buffAtk" | "summon"
  amount: number
  healTarget?: "caster" | "cast-target"
}

interface Props {
  effects: EffectRow[]
  onChange: (effects: EffectRow[]) => void
}

const EFFECT_KINDS: { id: EffectRow["kind"]; label: string }[] = [
  { id: "damage", label: "Damage" },
  { id: "heal", label: "Heal" },
  { id: "drawCards", label: "Draw" },
  { id: "gainCoin", label: "Coin" },
  { id: "buffAtk", label: "Buff Atk" },
  { id: "summon", label: "Summon Goon" },
]

const HAS_AMOUNT = new Set(["damage", "heal", "drawCards", "gainCoin", "buffAtk"])
const HAS_TARGET = new Set(["heal"])

export function EffectEditor({ effects, onChange }: Props) {
  function addEffect() {
    onChange([...effects, { kind: "damage", amount: 1 }])
  }

  function removeEffect(idx: number) {
    onChange(effects.filter((_, i) => i !== idx))
  }

  function updateEffect(idx: number, update: Partial<EffectRow>) {
    onChange(effects.map((e, i) => (i === idx ? { ...e, ...update } : e)))
  }

  return (
    <div className="space-y-1.5">
      {effects.map((effect, idx) => (
        <div
          key={idx}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] p-1.5"
        >
          <select
            value={effect.kind}
            onChange={(e) => updateEffect(idx, { kind: e.target.value as EffectRow["kind"] })}
            className="rounded-md border border-white/10 bg-ocean-deep px-2 py-1 font-display text-[10px] font-bold uppercase tracking-wider text-foreground outline-none focus:border-gold/50"
          >
            {EFFECT_KINDS.map((k) => (
              <option key={k.id} value={k.id}>
                {k.label}
              </option>
            ))}
          </select>

          {HAS_AMOUNT.has(effect.kind) && (
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => updateEffect(idx, { amount: Math.max(1, effect.amount - 1) })}
                className="flex h-6 w-6 items-center justify-center rounded border border-white/10 text-[10px] text-muted-foreground transition-colors hover:border-gold/40 hover:text-gold"
              >
                −
              </button>
              <span className="flex h-6 w-7 items-center justify-center font-display text-xs font-bold text-gold">
                {effect.amount}
              </span>
              <button
                type="button"
                onClick={() => updateEffect(idx, { amount: Math.min(99, effect.amount + 1) })}
                className="flex h-6 w-6 items-center justify-center rounded border border-white/10 text-[10px] text-muted-foreground transition-colors hover:border-gold/40 hover:text-gold"
              >
                +
              </button>
            </div>
          )}

          {HAS_TARGET.has(effect.kind) && (
            <select
              value={effect.healTarget ?? "caster"}
              onChange={(e) =>
                updateEffect(idx, { healTarget: e.target.value as "caster" | "cast-target" })
              }
              className="rounded-md border border-white/10 bg-ocean-deep px-1.5 py-1 font-display text-[9px] uppercase tracking-wider text-foreground outline-none focus:border-gold/50"
            >
              <option value="caster">Self</option>
              <option value="cast-target">Target</option>
            </select>
          )}

          <button
            type="button"
            onClick={() => removeEffect(idx)}
            className="ml-auto flex h-6 w-6 items-center justify-center rounded text-[10px] text-muted-foreground transition-colors hover:text-red-400"
          >
            <Trash2 size={12} />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addEffect}
        className={cn(
          "flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-white/10 px-2.5 py-1.5",
          "font-display text-[10px] font-bold uppercase tracking-wider text-muted-foreground",
          "transition-colors hover:border-gold/40 hover:text-gold",
        )}
      >
        <Plus size={12} />
        Add Effect
      </button>
    </div>
  )
}