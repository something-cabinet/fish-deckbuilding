"use client"

import { useMemo, useState } from "react"
import { Check, Footprints, Heart, Swords, User } from "lucide-react"
import { CARD_LIBRARY, type CardDef } from "@/lib/game/cards"
import type { CharacterDef } from "@/lib/game/characters"
import { CharacterFace } from "./character-face"
import { DeckSelectionPanel } from "./deck-selection-panel"
import { spriteUrl, useSpriteNames } from "./sprites"
import {
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
  onSave: (def: CharacterDef) => void
  editCharacter?: CharacterDef
  onUpdate?: (def: CharacterDef) => void
}

/** Authoring bounds — wide enough to design around, tight enough to stay sane. */
const MAX_HP_RANGE = { min: 1, max: 60 }
const ATK_RANGE = { min: 0, max: 12 }
/** Speed is squares per round; the smallest authored board is 5 tiles across. */
const MOVE_RANGE = { min: 1, max: 8 }
/** Copies of one card allowed in a starter deck. */
const MAX_COPIES = 10

function slugify(name: string) {
  const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")
  return `character_${base || "hero"}_${Date.now().toString(36)}`
}

/** Deck array (ids, repeated) -> copies per card id. */
function toCounts(deck: string[]): Record<string, number> {
  return deck.reduce<Record<string, number>>((acc, id) => {
    acc[id] = (acc[id] ?? 0) + 1
    return acc
  }, {})
}

/** Copies per card id -> deck array, in library order. */
function toDeck(counts: Record<string, number>, cards: CardDef[]): string[] {
  return cards.flatMap((c) => Array.from({ length: counts[c.id] ?? 0 }, () => c.id))
}

export function CharacterCreateScreen({ onBack, onSave, editCharacter, onUpdate }: Props) {
  const [name, setName] = useState(editCharacter?.name ?? "")
  const [title, setTitle] = useState(editCharacter?.title ?? "")
  const [description, setDescription] = useState(editCharacter?.description ?? "")
  const [icon, setIcon] = useState(editCharacter?.icon ?? "hero")
  const [maxHp, setMaxHp] = useState(editCharacter?.stats.maxHp ?? 14)
  const [atk, setAtk] = useState(editCharacter?.stats.atk ?? 2)
  const [move, setMove] = useState(editCharacter?.stats.move ?? 2)
  const [counts, setCounts] = useState<Record<string, number>>(() =>
    toCounts(editCharacter?.starterDeck ?? []),
  )
  const spriteNames = useSpriteNames()

  const cards = useMemo(() => Object.values(CARD_LIBRARY), [])

  const starterDeck = toDeck(counts, cards)

  const draft: CharacterDef = {
    id: "preview",
    name: name || "Unnamed",
    title,
    description,
    icon,
    stats: { maxHp, atk, move },
    starterDeck,
  }

  const canSave = name.trim().length > 0 && starterDeck.length > 0

  function setCount(cardId: string, value: number) {
    setCounts((prev) => {
      const next = { ...prev }
      if (value <= 0) delete next[cardId]
      else next[cardId] = value
      return next
    })
  }

  function handleSave() {
    if (!canSave) return
    const character: CharacterDef = editCharacter
      ? { ...draft, id: editCharacter.id }
      : { ...draft, id: slugify(name) }
    if (editCharacter && onUpdate) {
      onUpdate(character)
    } else {
      onSave(character)
    }
  }

  return (
    <main className="flex h-dvh w-full flex-col overflow-hidden bg-ocean-deep text-foreground">
      <DesignHeader icon={User} title="Character" accent="Designer" onBack={onBack}>
        {editCharacter && <EditingBadge name={editCharacter.name} />}
      </DesignHeader>

      <div className="flex-1 overflow-y-auto p-4 lg:p-6">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-4 md:flex-row md:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
              <Panel title="Identity">
                <Field label="Name" htmlFor="character-name">
                  <input
                    id="character-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={20}
                    placeholder="Guppy"
                    className={inputClass}
                  />
                </Field>
                <Field label="Title" htmlFor="character-title" hint="epithet under the name">
                  <input
                    id="character-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={24}
                    placeholder="The Debtor"
                    className={inputClass}
                  />
                </Field>
                <Field
                  label="Description"
                  htmlFor="character-desc"
                  hint="shown on the character select"
                >
                  <textarea
                    id="character-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={140}
                    rows={3}
                    placeholder="Small fish, big ledger."
                    className={cn(inputClass, "resize-none")}
                  />
                </Field>
              </Panel>

              <Panel title="Stats" bodyClassName="space-y-0 flex flex-wrap gap-x-5 gap-y-3">
                <Field label="Health" hint="starting and max HP">
                  <div className="flex items-center gap-2">
                    <Heart size={14} className="text-enemy" aria-hidden />
                    <Stepper
                      value={maxHp}
                      min={MAX_HP_RANGE.min}
                      max={MAX_HP_RANGE.max}
                      onChange={setMaxHp}
                      label="health"
                    />
                  </div>
                </Field>
                <Field label="Melee Damage" hint="per basic attack">
                  <div className="flex items-center gap-2">
                    <Swords size={14} className="text-gold" aria-hidden />
                    <Stepper
                      value={atk}
                      min={ATK_RANGE.min}
                      max={ATK_RANGE.max}
                      onChange={setAtk}
                      label="melee damage"
                    />
                  </div>
                </Field>
                <Field label="Speed" hint="squares per round">
                  <div className="flex items-center gap-2">
                    <Footprints size={14} className="text-teal" aria-hidden />
                    <Stepper
                      value={move}
                      min={MOVE_RANGE.min}
                      max={MOVE_RANGE.max}
                      onChange={setMove}
                      label="speed"
                    />
                  </div>
                </Field>
              </Panel>

              <Panel title="Artwork" className="lg:col-span-2">
                <div className="grid max-h-64 grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-1.5 overflow-y-auto pr-1">
                  {spriteNames.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setIcon(s)}
                      aria-pressed={icon === s}
                      aria-label={`Use ${s} sprite`}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-lg border p-1.5 transition-colors",
                        icon === s ? "border-gold bg-gold/15" : "border-white/10 hover:border-gold/40",
                      )}
                    >
                      <img src={spriteUrl(s)} alt="" className="h-10 w-10 object-contain" />
                      <span
                        className={cn(
                          "w-full truncate font-display text-xs font-bold uppercase tracking-wider",
                          icon === s ? "text-gold" : "text-muted-foreground",
                        )}
                      >
                        {s}
                      </span>
                    </button>
                  ))}
                </div>
              </Panel>
            </div>

            <DeckSelectionPanel
              title="Starter Deck"
              counts={counts}
              onChange={setCounts}
              maxCopies={MAX_COPIES}
            />
          </div>

          <PreviewRail
            note={
              canSave
                ? undefined
                : name.trim().length === 0
                  ? "Give your character a name."
                  : "Add at least one starter card."
            }
            action={
              <PrimaryButton
                onClick={handleSave}
                disabled={!canSave}
                className="w-full py-2.5 text-sm"
              >
                <Check size={16} />
                {editCharacter ? "Update" : "Save"}
              </PrimaryButton>
            }
          >
            <CharacterFace def={draft} />
          </PreviewRail>
        </div>
      </div>
    </main>
  )
}
