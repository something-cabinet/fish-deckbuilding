"use client"

import { useMemo, useState } from "react"
import { Check, Gem, Search } from "lucide-react"
import type { CardEffect } from "@/lib/game/cards"
import type { TrinketDef, TrinketRarity, TrinketTrigger } from "@/lib/game/trinkets"
import { CARD_ICON_NAMES, getCardIcon } from "./card-icons"
import { EffectEditor, type EffectRow } from "./effect-editor"
import { TRIGGER_LABELS, TrinketFace } from "./trinket-face"
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
  onSave: (def: TrinketDef) => void
  editTrinket?: TrinketDef
  onUpdate?: (def: TrinketDef) => void
}

const RARITIES: { id: TrinketRarity; label: string }[] = [
  { id: "common", label: "Common" },
  { id: "uncommon", label: "Uncommon" },
  { id: "rare", label: "Rare" },
]

/** The four hooks trinket.service resolves, in the order a run meets them. */
const TRIGGERS: { id: TrinketTrigger; hint: string }[] = [
  { id: "onCombatStart", hint: "when a battle begins" },
  { id: "onTurnStart", hint: "at the start of each of your turns" },
  { id: "onCardSold", hint: "when you sell a card in a shop" },
  { id: "onEnemyKilled", hint: "when an enemy dies" },
]

/**
 * Only these four kinds are handled by applyTrinketEffect — offering damage or
 * summon here would author a trinket that silently does nothing.
 */
const TRINKET_EFFECT_KINDS: EffectRow["kind"][] = ["gainCoin", "drawCards", "heal", "buffAtk"]

function slugify(name: string) {
  const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")
  return `trinket_${base || "trinket"}_${Date.now().toString(36)}`
}

function fromCardEffects(effects: CardEffect[]): EffectRow[] {
  return effects.map((e) => {
    switch (e.kind) {
      case "heal": return { kind: "heal", amount: e.amount, healTarget: e.target }
      case "drawCards": return { kind: "drawCards", amount: e.amount }
      case "gainCoin": return { kind: "gainCoin", amount: e.amount }
      case "buffAtk": return { kind: "buffAtk", amount: e.amount }
      default: return { kind: "gainCoin", amount: 1 }
    }
  })
}

function toCardEffects(rows: EffectRow[]): CardEffect[] {
  return rows.map((r) => {
    switch (r.kind) {
      case "heal": return { kind: "heal", amount: r.amount, target: r.healTarget ?? "caster" }
      case "drawCards": return { kind: "drawCards", amount: r.amount }
      case "buffAtk": return { kind: "buffAtk", amount: r.amount }
      default: return { kind: "gainCoin", amount: r.amount }
    }
  })
}

type TriggerRows = Record<TrinketTrigger, EffectRow[]>

const EMPTY_TRIGGERS: TriggerRows = {
  onCombatStart: [],
  onTurnStart: [],
  onCardSold: [],
  onEnemyKilled: [],
}

function initialTriggers(def?: TrinketDef): TriggerRows {
  if (!def?.triggers) return EMPTY_TRIGGERS
  return TRIGGERS.reduce((acc, t) => {
    acc[t.id] = fromCardEffects(def.triggers?.[t.id] ?? [])
    return acc
  }, { ...EMPTY_TRIGGERS })
}

export function TrinketCreateScreen({ onBack, onSave, editTrinket, onUpdate }: Props) {
  const [name, setName] = useState(editTrinket?.name ?? "")
  const [description, setDescription] = useState(editTrinket?.description ?? "")
  const [rarity, setRarity] = useState<TrinketRarity>(editTrinket?.rarity ?? "common")
  const [icon, setIcon] = useState(editTrinket?.icon ?? "Gem")
  const [maxHp, setMaxHp] = useState(editTrinket?.stats?.maxHp ?? 0)
  const [atk, setAtk] = useState(editTrinket?.stats?.atk ?? 0)
  const [move, setMove] = useState(editTrinket?.stats?.move ?? 0)
  const [triggers, setTriggers] = useState<TriggerRows>(() => initialTriggers(editTrinket))
  const [artworkFilter, setArtworkFilter] = useState("")

  const filteredIcons = useMemo(() => {
    const q = artworkFilter.trim().toLowerCase()
    return q ? CARD_ICON_NAMES.filter((n) => n.toLowerCase().includes(q)) : CARD_ICON_NAMES
  }, [artworkFilter])

  // a stat of 0 is "no modifier" — leave it out so the JSON stays readable
  const stats =
    maxHp || atk || move
      ? {
          ...(maxHp ? { maxHp } : {}),
          ...(atk ? { atk } : {}),
          ...(move ? { move } : {}),
        }
      : undefined

  const builtTriggers = TRIGGERS.reduce<Partial<Record<TrinketTrigger, CardEffect[]>>>((acc, t) => {
    const rows = triggers[t.id]
    if (rows.length > 0) acc[t.id] = toCardEffects(rows)
    return acc
  }, {})
  const hasTriggers = Object.keys(builtTriggers).length > 0

  const draft: TrinketDef = {
    id: "preview",
    name: name || "Unnamed",
    description,
    icon,
    rarity,
    stats,
    triggers: hasTriggers ? builtTriggers : undefined,
  }

  const canSave = name.trim().length > 0 && (stats !== undefined || hasTriggers)

  function handleSave() {
    if (!canSave) return
    const trinket: TrinketDef = editTrinket
      ? { ...draft, id: editTrinket.id }
      : { ...draft, id: slugify(name) }
    if (editTrinket && onUpdate) {
      onUpdate(trinket)
    } else {
      onSave(trinket)
    }
  }

  function setTriggerRows(trigger: TrinketTrigger, rows: EffectRow[]) {
    setTriggers((prev) => ({ ...prev, [trigger]: rows }))
  }

  return (
    <main className="flex h-dvh w-full flex-col overflow-hidden bg-ocean-deep text-foreground">
      <DesignHeader icon={Gem} title="Trinket" accent="Designer" onBack={onBack}>
        {editTrinket && <EditingBadge name={editTrinket.name} />}
      </DesignHeader>

      <div className="flex-1 overflow-y-auto p-4 lg:p-6">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-4 md:flex-row md:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
              <Panel title="Identity">
                <Field label="Name" htmlFor="trinket-name">
                  <input
                    id="trinket-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={26}
                    placeholder="Gold Pinky Ring"
                    className={inputClass}
                  />
                </Field>
                <Field label="Description" htmlFor="trinket-desc" hint="shown in shops and rewards">
                  <textarea
                    id="trinket-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={120}
                    rows={3}
                    placeholder="You get 2 extra coin when you sell a card."
                    className={cn(inputClass, "resize-none")}
                  />
                </Field>
                <Field label="Rarity" hint="sets drop weight and shop price">
                  <div className="flex flex-wrap gap-1.5">
                    {RARITIES.map((r) => (
                      <Chip key={r.id} active={rarity === r.id} onClick={() => setRarity(r.id)}>
                        {r.label}
                      </Chip>
                    ))}
                  </div>
                </Field>
              </Panel>

              <Panel title="Passive Stats" bodyClassName="space-y-0 flex flex-wrap gap-x-5 gap-y-3">
                <Field label="Max HP" hint="0 = none">
                  <Stepper value={maxHp} min={0} max={30} onChange={setMaxHp} label="max HP" />
                </Field>
                <Field label="Atk" hint="0 = none">
                  <Stepper value={atk} min={0} max={10} onChange={setAtk} label="attack" />
                </Field>
                <Field label="Move" hint="0 = none">
                  <Stepper value={move} min={0} max={5} onChange={setMove} label="move" />
                </Field>
              </Panel>

              <Panel title="Artwork" className="lg:col-span-2">
                <div className="relative mb-2.5">
                  <Search
                    size={14}
                    className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    value={artworkFilter}
                    onChange={(e) => setArtworkFilter(e.target.value)}
                    placeholder="Search art…"
                    aria-label="Search artwork"
                    className={cn(inputClass, "py-1.5 pl-8 text-sm")}
                  />
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {filteredIcons.length} of {CARD_ICON_NAMES.length}
                  </span>
                </div>
                {filteredIcons.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    No art matches “{artworkFilter}”.
                  </p>
                ) : (
                  <div className="grid max-h-64 grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-1.5 overflow-y-auto pr-1">
                    {filteredIcons.map((n) => {
                      const Icon = getCardIcon(n)
                      return (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setIcon(n)}
                          aria-pressed={icon === n}
                          className={cn(
                            "flex flex-col items-center gap-1 rounded-lg border p-1.5 transition-colors",
                            icon === n ? "border-gold bg-gold/15" : "border-white/10 hover:border-gold/40",
                          )}
                        >
                          <Icon size={18} className={icon === n ? "text-gold" : "text-muted-foreground"} />
                          <span
                            className={cn(
                              "w-full truncate font-display text-xs font-bold uppercase tracking-wider",
                              icon === n ? "text-gold" : "text-muted-foreground",
                            )}
                          >
                            {n}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </Panel>
            </div>

            <Panel title="Triggers">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {TRIGGERS.map((t) => (
                  <Field key={t.id} label={TRIGGER_LABELS[t.id]} hint={t.hint}>
                    <EffectEditor
                      effects={triggers[t.id]}
                      onChange={(rows) => setTriggerRows(t.id, rows)}
                      allowedKinds={TRINKET_EFFECT_KINDS}
                      addLabel={`Add ${TRIGGER_LABELS[t.id]} Effect`}
                    />
                  </Field>
                ))}
              </div>
            </Panel>
          </div>

          <PreviewRail
            note={
              canSave
                ? undefined
                : name.trim().length === 0
                  ? "Give your trinket a name."
                  : "Add a stat bonus or a trigger effect."
            }
            action={
              <PrimaryButton onClick={handleSave} disabled={!canSave} className="w-full py-2.5 text-sm">
                <Check size={16} />
                {editTrinket ? "Update" : "Save"}
              </PrimaryButton>
            }
          >
            <TrinketFace def={draft} />
          </PreviewRail>
        </div>
      </div>
    </main>
  )
}
