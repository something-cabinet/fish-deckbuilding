"use client"

import { useState } from "react"
import { ArrowLeft, Check, PlusCircle } from "lucide-react"
import { CardTarget, CardType, type CardDef } from "@/lib/game/cards"
import { FxKind } from "@/lib/game/battle"
import { CARD_ICON_NAMES, getCardIcon } from "./card-icons"
import { CardFace } from "./card-face"
import { cn } from "@/lib/utils"

interface Props {
  onBack: () => void
  onSave: (def: CardDef) => void
}

const TYPES: CardType[] = [CardType.Attack, CardType.Skill, CardType.Summon]
const TARGETS: { id: CardTarget; label: string }[] = [
  { id: CardTarget.Enemy, label: "Enemy" },
  { id: CardTarget.Ally, label: "Ally" },
  { id: CardTarget.Unit, label: "Any unit" },
  { id: CardTarget.Self, label: "Self" },
  { id: CardTarget.EmptyTile, label: "Empty tile" },
]
const FX_OPTIONS: FxKind[] = [
  FxKind.Letter,
  FxKind.Phone,
  FxKind.Gavel,
  FxKind.Coin,
  FxKind.Draw,
  FxKind.Heal,
  FxKind.Shock,
  FxKind.Summon,
]

function slugify(name: string) {
  const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")
  return `custom_${base || "card"}_${Date.now().toString(36)}`
}

export function CardCreateScreen({ onBack, onSave }: Props) {
  const [name, setName] = useState("")
  const [type, setType] = useState<CardType>(CardType.Attack)
  const [target, setTarget] = useState<CardTarget>(CardTarget.Enemy)
  const [cost, setCost] = useState(1)
  const [value, setValue] = useState(1)
  const [desc, setDesc] = useState("")
  const [icon, setIcon] = useState("Swords")
  const [fx, setFx] = useState<FxKind>(FxKind.Shock)

  const draft: CardDef = {
    id: "preview",
    name,
    type,
    cost,
    value,
    target,
    desc,
    icon,
    fx,
    // custom cards are display-only (D3) — no resolvable effects yet
    effects: [],
    log: "",
    logTone: "neutral",
  }
  const canSave = name.trim().length > 0

  function handleSave() {
    if (!canSave) return
    onSave({ ...draft, id: slugify(name) })
  }

  return (
    <main className="flex h-dvh w-full flex-col overflow-hidden bg-ocean-deep text-foreground">
      {/* header */}
      <header className="flex shrink-0 items-center gap-3 border-b border-white/10 bg-ocean-deep/80 px-5 py-4 backdrop-blur-sm">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 font-display text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:border-gold/40 hover:text-gold"
        >
          <ArrowLeft size={14} />
          Back
        </button>
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold uppercase tracking-widest text-foreground">
          <PlusCircle size={22} className="text-gold" />
          Create <span className="text-gold">Card</span>
        </h1>
      </header>

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6 lg:flex-row lg:items-start">
        {/* form */}
        <div className="flex-1 space-y-5">
          {/* name */}
          <Field label="Name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={22}
              placeholder="Racketeering"
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-gold/50"
            />
          </Field>

          {/* type */}
          <Field label="Type">
            <div className="flex gap-2">
              {TYPES.map((t) => (
                <Chip key={t} active={type === t} onClick={() => setType(t)}>
                  {t}
                </Chip>
              ))}
            </div>
          </Field>

          {/* target */}
          <Field label="Target">
            <div className="flex flex-wrap gap-2">
              {TARGETS.map((t) => (
                <Chip key={t.id} active={target === t.id} onClick={() => setTarget(t.id)}>
                  {t.label}
                </Chip>
              ))}
            </div>
          </Field>

          {/* cost + value */}
          <div className="flex gap-4">
            <Field label="Mana Cost" className="flex-1">
              <Stepper value={cost} min={0} max={10} onChange={setCost} />
            </Field>
            <Field label="Sell Value" className="flex-1">
              <Stepper value={value} min={0} max={10} onChange={setValue} />
            </Field>
          </div>

          {/* description */}
          <Field label="Description">
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              maxLength={120}
              rows={3}
              placeholder="Deal 3 damage to a target enemy."
              className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm leading-snug text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-gold/50"
            />
          </Field>

          {/* fx */}
          <Field label="Resolve Effect">
            <div className="flex flex-wrap gap-2">
              {FX_OPTIONS.map((f) => (
                <Chip key={f} active={fx === f} onClick={() => setFx(f)}>
                  {f}
                </Chip>
              ))}
            </div>
          </Field>

          {/* icon */}
          <Field label="Icon">
            <div className="grid grid-cols-8 gap-2 sm:grid-cols-10">
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
                      "flex aspect-square items-center justify-center rounded-lg border transition-colors",
                      icon === n
                        ? "border-gold bg-gold/15 text-gold"
                        : "border-white/10 text-muted-foreground hover:border-gold/40 hover:text-foreground",
                    )}
                  >
                    <Ico size={18} strokeWidth={1.75} />
                  </button>
                )
              })}
            </div>
          </Field>
        </div>

        {/* preview + save */}
        <div className="flex shrink-0 flex-col items-center gap-5 lg:sticky lg:top-0 lg:w-64">
          <span className="font-display text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">
            Preview
          </span>
          <CardFace def={draft} size="lg" />
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3.5 font-display text-base font-bold uppercase tracking-widest transition-all",
              canSave
                ? "bg-gold text-ocean-deep hover:scale-[1.03]"
                : "cursor-not-allowed bg-white/10 text-muted-foreground",
            )}
          >
            <Check size={18} />
            Save to Library
          </button>
          {!canSave && (
            <p className="text-center text-xs text-muted-foreground">Give your card a name to save it.</p>
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
      <span className="mb-1.5 block font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
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
        "rounded-full px-3.5 py-1.5 font-display text-xs font-bold uppercase tracking-wider transition-colors",
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
}: {
  value: number
  min: number
  max: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 font-display text-lg font-bold text-foreground transition-colors hover:border-gold/40 hover:text-gold"
      >
        −
      </button>
      <span className="flex h-9 w-12 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] font-display text-lg font-bold text-gold">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 font-display text-lg font-bold text-foreground transition-colors hover:border-gold/40 hover:text-gold"
      >
        +
      </button>
    </div>
  )
}
