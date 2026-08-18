"use client"

import { useMemo, useState } from "react"
import { Check, Search, Sparkles } from "lucide-react"
import type { SummonDef } from "@/lib/game/summons"
import { SummonFace } from "./summon-face"
import { spriteUrl, useSpriteNames } from "./sprites"
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

/** Above this count the Artwork grid grows a search box instead of just scrolling. */
const ARTWORK_SEARCH_THRESHOLD = 12

interface Props {
  onBack: () => void
  onSave: (def: SummonDef) => void
  editSummon?: SummonDef
  onUpdate?: (def: SummonDef) => void
}

function slugify(name: string) {
  const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")
  return `summon_${base || "summon"}_${Date.now().toString(36)}`
}

export function SummonCreateScreen({ onBack, onSave, editSummon, onUpdate }: Props) {
  const [name, setName] = useState(editSummon?.name ?? "")
  const [hp, setHp] = useState(editSummon?.hp ?? 5)
  const [atk, setAtk] = useState(editSummon?.atk ?? 2)
  const [move, setMove] = useState(editSummon?.move ?? 2)
  const [range, setRange] = useState(editSummon?.range ?? 1)
  const [sprite, setSprite] = useState(editSummon?.icon ?? "goon")
  const [artworkFilter, setArtworkFilter] = useState("")
  const spriteNames = useSpriteNames()

  const filteredSprites = useMemo(() => {
    const q = artworkFilter.trim().toLowerCase()
    return q ? spriteNames.filter((s) => s.includes(q)) : spriteNames
  }, [artworkFilter, spriteNames])

  const canSave = name.trim().length > 0 && hp > 0

  const draft: SummonDef = {
    id: "preview",
    name: name || "Unnamed",
    hp,
    atk,
    move,
    range,
    icon: sprite,
  }

  function handleSave() {
    if (!canSave) return
    const summon: SummonDef = editSummon
      ? { ...draft, id: editSummon.id }
      : { ...draft, id: slugify(name) }
    if (editSummon && onUpdate) {
      onUpdate(summon)
    } else {
      onSave(summon)
    }
  }

  return (
    <main className="flex h-dvh w-full flex-col overflow-hidden bg-ocean-deep text-foreground">
      <DesignHeader icon={Sparkles} title="Summon" accent="Designer" onBack={onBack}>
        {editSummon && <EditingBadge name={editSummon.name} />}
      </DesignHeader>

      <div className="flex-1 overflow-y-auto p-4 lg:p-6">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-4 md:flex-row md:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
              <Panel title="Identity">
                <Field label="Name" htmlFor="summon-name">
                  <input
                    id="summon-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={22}
                    placeholder="Goon"
                    className={inputClass}
                  />
                </Field>
                <p className="text-xs leading-snug text-muted-foreground">
                  Summons have no team of their own — a card that summons this unit fields it on
                  whichever side casts the card.
                </p>
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
                <Field label="Range">
                  <div className="flex gap-1.5">
                    <Chip active={range === 1} onClick={() => setRange(1)}>Melee</Chip>
                    <Chip active={range === 2} onClick={() => setRange(2)}>Ranged</Chip>
                  </div>
                </Field>
              </Panel>

              <Panel title="Artwork" className="lg:col-span-2">
                {spriteNames.length > ARTWORK_SEARCH_THRESHOLD && (
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
                      {filteredSprites.length} of {spriteNames.length}
                    </span>
                  </div>
                )}
                {filteredSprites.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    No art matches “{artworkFilter}”.
                  </p>
                ) : (
                  <div className="grid max-h-72 grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-1.5 overflow-y-auto pr-1">
                    {filteredSprites.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSprite(s)}
                        aria-pressed={sprite === s}
                        className={cn(
                          "flex flex-col items-center gap-1 rounded-lg border p-1.5 transition-colors",
                          sprite === s ? "border-gold bg-gold/15" : "border-white/10 hover:border-gold/40",
                        )}
                      >
                        <img src={spriteUrl(s)} alt="" className="h-9 w-9 object-contain" />
                        <span
                          className={cn(
                            "truncate font-display text-xs font-bold uppercase tracking-wider",
                            sprite === s ? "text-gold" : "text-muted-foreground",
                          )}
                        >
                          {s}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </Panel>
            </div>
          </div>

          <PreviewRail
            note={
              canSave
                ? undefined
                : name.trim().length === 0
                  ? "Give your summon a name."
                  : "HP must be at least 1."
            }
            action={
              <PrimaryButton onClick={handleSave} disabled={!canSave} className="w-full py-2.5 text-sm">
                <Check size={16} />
                {editSummon ? "Update" : "Save"}
              </PrimaryButton>
            }
          >
            <SummonFace def={draft} />
          </PreviewRail>
        </div>
      </div>
    </main>
  )
}
