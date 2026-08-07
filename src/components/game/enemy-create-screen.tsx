"use client"

import { useMemo, useState } from "react"
import { Check, Plus, Swords, Trash2 } from "lucide-react"
import { CARD_LIBRARY } from "@/lib/game"
import { isDefaultAiProfile, UnitKind, type EnemyAiProfile, type EnemyDef } from "@/lib/game/units"
import { AiProfileEditor } from "./ai-profile-editor"
import { EnemyFace } from "./enemy-face"
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
  selectClass,
} from "./design-ui"
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

const SPRITE_NAMES = ["thug", "enforcer", "boss", "goon", "hero"] as const

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
  const [aiProfile, setAiProfile] = useState<EnemyAiProfile | undefined>(editEnemy?.aiProfile)

  const cardOptions = useMemo(
    () =>
      Object.values(CARD_LIBRARY)
        .map((c) => ({ id: c.id, name: c.name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [],
  )

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
    // a brawler with no tweaks is the engine default — don't write it down
    aiProfile: isDefaultAiProfile(aiProfile) ? undefined : aiProfile,
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
      <DesignHeader icon={Swords} title="Enemy" accent="Designer" onBack={onBack}>
        {editEnemy && <EditingBadge name={editEnemy.name} />}
      </DesignHeader>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 md:flex-row">
        {/* form — splits into two columns once there is room for them */}
        <div className="flex min-w-0 flex-1 flex-col gap-3 xl:flex-row xl:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <Panel title="Identity">
              <Field label="Name" htmlFor="enemy-name">
                <input
                  id="enemy-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={22}
                  placeholder="Shark Enforcer"
                  className={inputClass}
                />
              </Field>
              <Field label="Kind">
                <div className="flex flex-wrap gap-1.5">
                  {KINDS.map((k) => (
                    <Chip key={k.id} active={kind === k.id} onClick={() => setKind(k.id)}>
                      {k.label}
                    </Chip>
                  ))}
                </div>
              </Field>
            </Panel>

            <Panel title="Stats" bodyClassName="space-y-0 flex flex-wrap gap-x-5 gap-y-3">
              <Field label="HP">
                <Stepper value={hp} min={1} max={99} onChange={setHp} label="HP" />
              </Field>
              <Field label="Atk">
                <Stepper value={atk} min={0} max={20} onChange={setAtk} label="attack" />
              </Field>
              <Field label="Move">
                <Stepper value={move} min={0} max={10} onChange={setMove} label="move" />
              </Field>
              <Field label="Gold">
                <Stepper value={goldDrop} min={0} max={99} onChange={setGoldDrop} label="gold drop" />
              </Field>
              <Field label="Range">
                <div className="flex gap-1.5">
                  <Chip active={range === 1} onClick={() => setRange(1)}>Melee</Chip>
                  <Chip active={range === 2} onClick={() => setRange(2)}>Ranged</Chip>
                </div>
              </Field>
              <Field label="Minion" hint="summoned, not placed">
                <div className="flex gap-1.5">
                  <Chip active={!isMinion} onClick={() => setIsMinion(false)}>No</Chip>
                  <Chip active={isMinion} onClick={() => setIsMinion(true)}>Yes</Chip>
                </div>
              </Field>
            </Panel>

            <AiProfileEditor value={aiProfile} onChange={setAiProfile} />
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <Panel title="Deck">
              <div className="space-y-1.5">
                {deck.map((entry, idx) => {
                  const known = entry.id === "" || cardOptions.some((c) => c.id === entry.id)
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] p-1.5"
                    >
                      <select
                        value={entry.id}
                        aria-label={`Deck card ${idx + 1}`}
                        onChange={(e) => updateDeckEntry(idx, { id: e.target.value })}
                        className={cn(selectClass, "min-w-0 flex-1 py-1 sm:max-w-[240px]")}
                      >
                        <option value="">Choose a card…</option>
                        {!known && <option value={entry.id}>{entry.id}</option>}
                        {cardOptions.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <span className="font-display text-[10px] uppercase tracking-wider text-muted-foreground">
                        ×
                      </span>
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          aria-label="Fewer copies"
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
                          aria-label="More copies"
                          onClick={() => updateDeckEntry(idx, { count: Math.min(9, entry.count + 1) })}
                          className="flex h-6 w-6 items-center justify-center rounded border border-white/10 text-[10px] text-muted-foreground transition-colors hover:border-gold/40 hover:text-gold"
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        aria-label="Remove deck entry"
                        onClick={() => removeDeckEntry(idx)}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:text-red-400"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )
                })}
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
            </Panel>

            <Panel title="Artwork">
              <div className="grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-1.5">
                {SPRITE_NAMES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSprite(s)}
                    aria-pressed={sprite === s}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-lg border p-2 transition-colors",
                      sprite === s ? "border-gold bg-gold/15" : "border-white/10 hover:border-gold/40",
                    )}
                  >
                    <img src={`${SPRITE_PATH}${s}.png`} alt="" className="h-10 w-10 object-contain" />
                    <span
                      className={cn(
                        "font-display text-[9px] font-bold uppercase tracking-wider",
                        sprite === s ? "text-gold" : "text-muted-foreground",
                      )}
                    >
                      {s}
                    </span>
                  </button>
                ))}
              </div>
            </Panel>
          </div>
        </div>

        <PreviewRail
          note={
            canSave
              ? undefined
              : name.trim().length === 0
                ? "Give your enemy a name."
                : "HP must be at least 1."
          }
          action={
            <PrimaryButton onClick={handleSave} disabled={!canSave} className="w-full py-2.5 text-sm">
              <Check size={16} />
              {editEnemy ? "Update" : "Save"}
            </PrimaryButton>
          }
        >
          <EnemyFace def={draft} />
        </PreviewRail>
      </div>
    </main>
  )
}
