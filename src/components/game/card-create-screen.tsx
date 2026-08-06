"use client"

import { useState } from "react"
import { ArrowLeft, Check, PlusCircle } from "lucide-react"
import { CardTarget, CardType, type CardDef } from "@/lib/game/cards"
import type { CardEffect } from "@/lib/game/cards/models"
import { FxKind } from "@/lib/game/battle"
import { CARD_ICON_NAMES, getCardIcon } from "./card-icons"
import { CardFace } from "./card-face"
import { EffectEditor, type EffectRow } from "./effect-editor"
import { cn } from "@/lib/utils"

interface Props {
  onBack: () => void
  onSave: (def: CardDef) => void
  editCard?: CardDef
  onUpdate?: (def: CardDef) => void
}

const TYPES: CardType[] = [CardType.Attack, CardType.Skill, CardType.Summon]
const TARGETS: { id: CardTarget; label: string }[] = [
  { id: CardTarget.Enemy, label: "Enemy" },
  { id: CardTarget.Ally, label: "Ally" },
  { id: CardTarget.Unit, label: "Any unit" },
  { id: CardTarget.Self, label: "Self" },
  { id: CardTarget.EmptyTile, label: "Empty tile" },
]
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
      case "summon": return { kind: "summon", amount: 0 }
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
      case "summon": return { kind: "summon", unit: "goon" }
    }
  })
}

export function CardCreateScreen({ onBack, onSave, editCard, onUpdate }: Props) {
  const [name, setName] = useState(editCard?.name ?? "")
  const [type, setType] = useState<CardType>(editCard?.type ?? CardType.Attack)
  const [target, setTarget] = useState<CardTarget>(editCard?.target ?? CardTarget.Enemy)
  const [cost, setCost] = useState(editCard?.cost ?? 1)
  const [value, setValue] = useState(editCard?.value ?? 1)
  const [desc, setDesc] = useState(editCard?.desc ?? "")
  const [icon, setIcon] = useState(editCard?.icon ?? "Swords")
  const [effects, setEffects] = useState<EffectRow[]>(editCard ? fromCardEffects(editCard.effects) : [])

  const cardEffects = toCardEffects(effects)

  const draft: CardDef = {
    id: "preview",
    name,
    type,
    cost,
    value,
    target,
    desc,
    icon,
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
      {/* header */}
      <header className="flex shrink-0 items-center gap-2 border-b border-white/10 bg-ocean-deep/80 px-4 py-2.5 backdrop-blur-sm">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 rounded-md border border-white/10 px-2.5 py-1 font-display text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:border-gold/40 hover:text-gold"
        >
          <ArrowLeft size={13} />
          Back
        </button>
        <h1 className="flex items-center gap-1.5 font-display text-lg font-bold uppercase tracking-widest text-foreground">
          <PlusCircle size={16} className="text-gold" />
          {editCard ? "Edit" : "Card"} <span className="text-gold">Editor</span>
        </h1>
      </header>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 md:flex-row">
        {/* form */}
        <div className="flex-1 space-y-3">
          {/* name */}
          <Field label="Name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={22}
              placeholder="Racketeering"
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-gold/50"
            />
          </Field>

          {/* type + target */}
          <div className="flex flex-wrap gap-3">
            <Field label="Type">
              <div className="flex gap-1.5">
                {TYPES.map((t) => (
                  <Chip key={t} active={type === t} onClick={() => setType(t)}>
                    {t}
                  </Chip>
                ))}
              </div>
            </Field>
            <Field label="Target">
              <div className="flex flex-wrap gap-1.5">
                {TARGETS.map((t) => (
                  <Chip key={t.id} active={target === t.id} onClick={() => setTarget(t.id)}>
                    {t.label}
                  </Chip>
                ))}
              </div>
            </Field>
          </div>

          {/* cost + value + description */}
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Cost">
              <Stepper value={cost} min={0} max={10} onChange={setCost} compact />
            </Field>
            <Field label="Value">
              <Stepper value={value} min={0} max={10} onChange={setValue} compact />
            </Field>
            <Field label="Description" className="min-w-[180px] flex-1">
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                maxLength={120}
                rows={2}
                placeholder="Deal 3 damage to a target enemy."
                className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm leading-snug text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-gold/50"
              />
            </Field>
          </div>

          {/* effects */}
          <Field label="Effects">
            <EffectEditor effects={effects} onChange={setEffects} />
          </Field>

          {/* icon */}
          <Field label="Icon">
            <div className="grid grid-cols-10 gap-1.5 sm:grid-cols-12">
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
                    <Ico size={14} strokeWidth={1.75} />
                  </button>
                )
              })}
            </div>
          </Field>
        </div>

        {/* preview + save */}
        <div className="flex shrink-0 flex-col items-center gap-3 md:sticky md:top-0 md:w-[172px]">
          <span className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Preview
          </span>
          <CardFace def={draft} size="md" />
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className={cn(
              "flex w-full items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 font-display text-sm font-bold uppercase tracking-widest transition-all",
              canSave
                ? "bg-gold text-ocean-deep hover:scale-[1.03]"
                : "cursor-not-allowed bg-white/10 text-muted-foreground",
            )}
          >
            <Check size={16} />
            {editCard ? "Update" : "Save"}
          </button>
          {!canSave && (
            <p className="text-center text-[10px] text-muted-foreground">Give your card a name to save it.</p>
          )}
        </div>
      </div>
    </main>
  )
}

function Field({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 block font-display text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-2.5 py-1 font-display text-[10px] font-bold uppercase tracking-wider transition-colors",
        active
          ? "bg-gold text-ocean-deep"
          : "border border-white/10 text-muted-foreground hover:border-gold/40 hover:text-gold",
      )}
    >
      {children}
    </button>
  )
}

function Stepper({
  value,
  min,
  max,
  onChange,
  compact,
}: {
  value: number
  min: number
  max: number
  onChange: (v: number) => void
  compact?: boolean
}) {
  const size = compact ? "h-7 w-7 text-sm" : "h-9 w-9 text-lg"
  const displaySize = compact ? "h-7 w-10" : "h-9 w-12"
  const displayText = compact ? "text-sm" : "text-lg"
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        className={cn(
          "flex items-center justify-center rounded-lg border border-white/10 font-display font-bold text-foreground transition-colors hover:border-gold/40 hover:text-gold",
          size,
        )}
      >
        −
      </button>
      <span className={cn(
        "flex items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] font-display font-bold text-gold",
        displaySize,
        displayText,
      )}>
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        className={cn(
          "flex items-center justify-center rounded-lg border border-white/10 font-display font-bold text-foreground transition-colors hover:border-gold/40 hover:text-gold",
          size,
        )}
      >
        +
      </button>
    </div>
  )
}
