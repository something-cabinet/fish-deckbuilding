"use client"

import { useState } from "react"
import { ArrowLeft, Check, Coins, Heart, Plus, Swords, Trash2 } from "lucide-react"
import { UnitKind, type EnemyDef } from "@/lib/game/units"
import { cn } from "@/lib/utils"

interface Props {
  onBack: () => void
  onSave: (def: EnemyDef) => void
  editEnemy?: EnemyDef
  onUpdate?: (def: EnemyDef) => void
}

const KINDS: { id: UnitKind; label: string }[] = [
  { id: UnitKind.Thug, label: "Thug" },
  { id: UnitKind.Enforcer, label: "Enforcer" },
  { id: UnitKind.Boss, label: "Boss" },
  { id: UnitKind.Goon, label: "Goon" },
]

const KIND_LABELS: Record<UnitKind, string> = {
  [UnitKind.Hero]: "Hero",
  [UnitKind.Goon]: "Goon",
  [UnitKind.Thug]: "Thug",
  [UnitKind.Enforcer]: "Enforcer",
  [UnitKind.Boss]: "Boss",
}

const SPRITE_NAMES = ["thug", "enforcer", "boss", "goon", "hero"] as const
type SpriteName = (typeof SPRITE_NAMES)[number]

const SPRITE_PATH = "/sprites/"

function slugify(name: string) {
  const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")
  return `enemy_${base || "enemy"}_${Date.now().toString(36)}`
}

export function EnemyCreateScreen({ onBack, onSave, editEnemy, onUpdate }: Props) {
  const [name, setName] = useState(editEnemy?.name ?? "")
  const [kind, setKind] = useState<UnitKind>(editEnemy?.kind ?? UnitKind.Thug)
  const [hp, setHp] = useState(editEnemy?.hp ?? 4)
  const [atk, setAtk] = useState(editEnemy?.atk ?? 2)
  const [move, setMove] = useState(editEnemy?.move ?? 2)
  const [range, setRange] = useState(editEnemy?.range ?? 1)
  const [goldDrop, setGoldDrop] = useState(editEnemy?.goldDrop ?? 5)
  const [isMinion, setIsMinion] = useState(editEnemy?.isMinion ?? false)
  const [sprite, setSprite] = useState(editEnemy?.icon ?? "thug")
  const [deck, setDeck] = useState<{ id: string; count: number }[]>(editEnemy?.deck ?? [])

  const canSave = name.trim().length > 0 && hp > 0

  const draft: EnemyDef = {
    id: "preview",
    name: name || "Unnamed",
    kind,
    hp,
    atk,
    move,
    range,
    goldDrop,
    isMinion,
    icon: sprite,
    deck,
  }

  function handleSave() {
    if (!canSave) return
    const enemy: EnemyDef = editEnemy
      ? { ...draft, id: editEnemy.id }
      : { ...draft, id: slugify(name) }
    if (editEnemy && onUpdate) {
      onUpdate(enemy)
    } else {
      onSave(enemy)
    }
  }

  function addDeckEntry() {
    setDeck([...deck, { id: "", count: 1 }])
  }

  function removeDeckEntry(idx: number) {
    setDeck(deck.filter((_, i) => i !== idx))
  }

  function updateDeckEntry(idx: number, update: Partial<{ id: string; count: number }>) {
    setDeck(deck.map((e, i) => (i === idx ? { ...e, ...update } : e)))
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
          <Swords size={16} className="text-gold" />
          {editEnemy ? "Edit" : "Enemy"} <span className="text-gold">Designer</span>
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
              placeholder="Shark Enforcer"
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-gold/50"
            />
          </Field>

          {/* kind */}
          <Field label="Kind">
            <div className="flex gap-1.5">
              {KINDS.map((k) => (
                <Chip key={k.id} active={kind === k.id} onClick={() => setKind(k.id)}>
                  {k.label}
                </Chip>
              ))}
            </div>
          </Field>

          {/* stats */}
          <div className="flex flex-wrap items-end gap-3">
            <Field label="HP">
              <Stepper value={hp} min={1} max={99} onChange={setHp} compact />
            </Field>
            <Field label="Atk">
              <Stepper value={atk} min={0} max={20} onChange={setAtk} compact />
            </Field>
            <Field label="Move">
              <Stepper value={move} min={0} max={10} onChange={setMove} compact />
            </Field>
            <Field label="Range">
              <div className="flex gap-1.5">
                <Chip active={range === 1} onClick={() => setRange(1)}>Melee</Chip>
                <Chip active={range === 2} onClick={() => setRange(2)}>Ranged</Chip>
              </div>
            </Field>
          </div>

          {/* gold drop + isMinion */}
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Gold Drop">
              <Stepper value={goldDrop} min={0} max={99} onChange={setGoldDrop} compact />
            </Field>
            <Field label="Minion">
              <button
                type="button"
                onClick={() => setIsMinion(!isMinion)}
                className={cn(
                  "rounded-lg border px-3 py-2 font-display text-xs font-bold uppercase tracking-wider transition-colors",
                  isMinion
                    ? "border-gold bg-gold/15 text-gold"
                    : "border-white/10 text-muted-foreground hover:border-gold/40 hover:text-gold",
                )}
              >
                {isMinion ? "Yes" : "No"}
              </button>
            </Field>
          </div>

          {/* deck editor */}
          <Field label="Deck">
            <div className="space-y-1.5">
              {deck.map((entry, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] p-1.5"
                >
                  <input
                    value={entry.id}
                    onChange={(e) => updateDeckEntry(idx, { id: e.target.value })}
                    placeholder="card_id"
                    className="flex-1 rounded-md border border-white/10 bg-ocean-deep px-2 py-1 font-mono text-[11px] text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-gold/50"
                  />
                  <span className="font-display text-[10px] uppercase tracking-wider text-muted-foreground">×</span>
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => updateDeckEntry(idx, { count: Math.max(1, entry.count - 1) })}
                      className="flex h-6 w-6 items-center justify-center rounded border border-white/10 text-[10px] text-muted-foreground transition-colors hover:border-gold/40 hover:text-gold"
                    >
                      −
                    </button>
                    <span className="flex h-6 w-7 items-center justify-center font-display text-xs font-bold text-gold">
                      {entry.count}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateDeckEntry(idx, { count: Math.min(9, entry.count + 1) })}
                      className="flex h-6 w-6 items-center justify-center rounded border border-white/10 text-[10px] text-muted-foreground transition-colors hover:border-gold/40 hover:text-gold"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeDeckEntry(idx)}
                    className="flex h-6 w-6 items-center justify-center rounded text-[10px] text-muted-foreground transition-colors hover:text-red-400"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addDeckEntry}
                className={cn(
                  "flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-white/10 px-2.5 py-1.5",
                  "font-display text-[10px] font-bold uppercase tracking-wider text-muted-foreground",
                  "transition-colors hover:border-gold/40 hover:text-gold",
                )}
              >
                <Plus size={12} />
                Add Card to Deck
              </button>
            </div>
          </Field>

          {/* sprite */}
          <Field label="Sprite">
            <div className="flex gap-2">
              {SPRITE_NAMES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSprite(s)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg border p-2 transition-colors",
                    sprite === s
                      ? "border-gold bg-gold/15"
                      : "border-white/10 hover:border-gold/40",
                  )}
                >
                  <img
                    src={`${SPRITE_PATH}${s}.png`}
                    alt={s}
                    className="h-10 w-10 object-contain"
                  />
                  <span className={cn(
                    "font-display text-[9px] font-bold uppercase tracking-wider",
                    sprite === s ? "text-gold" : "text-muted-foreground",
                  )}>
                    {s}
                  </span>
                </button>
              ))}
            </div>
          </Field>
        </div>

        {/* preview + save */}
        <div className="flex shrink-0 flex-col items-center gap-3 md:sticky md:top-0 md:w-[172px]">
          <span className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Preview
          </span>

          {/* stat card preview */}
          <div className="relative flex w-[150px] select-none flex-col overflow-hidden rounded-lg border border-black/40 bg-[oklch(0.9_0.03_85)] shadow-lg">
            {/* sprite area */}
            <div className="relative flex h-[92px] flex-col bg-[oklch(0.82_0.02_85)]">
              <span className={cn(
                "absolute right-1.5 top-1.5 rounded px-1.5 py-0.5 font-display text-[9px] font-bold uppercase tracking-wider",
                kind === UnitKind.Boss
                  ? "bg-gold text-ocean-deep"
                  : kind === UnitKind.Enforcer
                    ? "bg-teal text-ocean-deep"
                    : "bg-enemy text-white",
              )}>
                {KIND_LABELS[kind]}
              </span>
              <div className="flex flex-1 items-center justify-center">
                <img
                  src={`${SPRITE_PATH}${sprite}.png`}
                  alt={sprite}
                  className="h-16 w-16 object-contain"
                />
              </div>
            </div>

            {/* name */}
            <div className="border-t border-black/20 px-2 pt-1.5">
              <h3 className="font-display text-[13px] font-bold uppercase leading-tight tracking-wide">
                {draft.name}
              </h3>
            </div>

            {/* stats row */}
            <div className="mt-auto flex items-center justify-between border-t border-black/30 bg-[oklch(0.78_0.02_85)] px-2 py-1 font-display text-[10px] font-bold uppercase tracking-wider text-[oklch(0.3_0.04_260)]">
              <span className="flex items-center gap-1">
                <Heart size={11} />
                {hp}
              </span>
              <span className="flex items-center gap-1">
                <Swords size={11} />
                {atk}
              </span>
              <span>{range === 1 ? "Melee" : "Range"}</span>
              <span className="flex items-center gap-1">
                <Coins size={11} />
                {goldDrop}
              </span>
            </div>
          </div>

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
            {editEnemy ? "Update" : "Save"}
          </button>
          {!canSave && (
            <p className="text-center text-[10px] text-muted-foreground">
              {name.trim().length === 0 ? "Give your enemy a name." : "HP must be at least 1."}
            </p>
          )}
        </div>
      </div>
    </main>
  )
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 block font-display text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
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

function Stepper({ value, min, max, onChange, compact }: {
  value: number; min: number; max: number; onChange: (v: number) => void; compact?: boolean
}) {
  const size = compact ? "h-7 w-7 text-sm" : "h-9 w-9 text-lg"
  const displaySize = compact ? "h-7 w-10" : "h-9 w-12"
  const displayText = compact ? "text-sm" : "text-lg"
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        className={cn("flex items-center justify-center rounded-lg border border-white/10 font-display font-bold text-foreground transition-colors hover:border-gold/40 hover:text-gold", size)}
      >
        −
      </button>
      <span className={cn("flex items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] font-display font-bold text-gold", displaySize, displayText)}>
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        className={cn("flex items-center justify-center rounded-lg border border-white/10 font-display font-bold text-foreground transition-colors hover:border-gold/40 hover:text-gold", size)}
      >
        +
      </button>
    </div>
  )
}