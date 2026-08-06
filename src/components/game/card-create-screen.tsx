"use client"

import { useState } from "react"
import { Check, PlusCircle } from "lucide-react"
import { CardTarget, CardType, type CardDef } from "@/lib/game/cards"
import type { CardEffect } from "@/lib/game/cards/models"
import { FxKind } from "@/lib/game/battle"
import { CARD_ICON_NAMES, getCardIcon } from "./card-icons"
import { CardFace } from "./card-face"
import { EffectEditor, type EffectRow } from "./effect-editor"
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
              <EffectEditor effects={effects} onChange={setEffects} />
            </Panel>

            <Panel title="Artwork">
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
    </main>
  )
}
