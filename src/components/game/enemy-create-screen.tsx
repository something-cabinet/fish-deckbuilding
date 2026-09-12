"use client"

import { useMemo, useState } from "react"
import { Check, Search, Swords } from "lucide-react"
import { isDefaultAiProfile, UnitKind, type EnemyAiProfile, type EnemyDef } from "@/lib/game/units"
import { AiProfileEditor } from "./ai-profile-editor"
import { DeckSelectionPanel } from "./deck-selection-panel"
import { EnemyFace } from "./enemy-face"
import { PLACEHOLDER_SPRITE, spriteUrl, useSpriteNames } from "./sprites"
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
  onSave: (def: EnemyDef) => void
  editEnemy?: EnemyDef
  onUpdate?: (def: EnemyDef) => void
}

const KINDS: { id: UnitKind; label: string }[] = [
  { id: UnitKind.Soldier, label: "Soldier" },
  { id: UnitKind.Capo, label: "Capo" },
  { id: UnitKind.Boss, label: "Boss" },
  { id: UnitKind.Goon, label: "Goon" },
]

function slugify(name: string) {
  const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")
  return `enemy_${base || "enemy"}_${Date.now().toString(36)}`
}

/** Deck entries (id + count) -> copies per card id; drops empty placeholders. */
function toCounts(deck: { id: string; count: number }[]): Record<string, number> {
  return deck.reduce<Record<string, number>>((acc, e) => {
    if (!e.id) return acc
    acc[e.id] = (acc[e.id] ?? 0) + e.count
    return acc
  }, {})
}

/** Copies per card id -> deck entries. */
function toEntries(counts: Record<string, number>): { id: string; count: number }[] {
  return Object.entries(counts).map(([id, count]) => ({ id, count }))
}

export function EnemyCreateScreen({ onBack, onSave, editEnemy, onUpdate }: Props) {
  const [name, setName] = useState(editEnemy?.name ?? "")
  const [kind, setKind] = useState<UnitKind>(editEnemy?.kind ?? UnitKind.Soldier)
  const [hp, setHp] = useState(editEnemy?.hp ?? 4)
  const [atk, setAtk] = useState(editEnemy?.atk ?? 2)
  const [move, setMove] = useState(editEnemy?.move ?? 2)
  const [range, setRange] = useState(editEnemy?.range ?? 1)
  const [goldDrop, setGoldDrop] = useState(editEnemy?.goldDrop ?? 5)
  const [isMinion, setIsMinion] = useState(editEnemy?.isMinion ?? false)
  const [sprite, setSprite] = useState<string>(editEnemy?.icon ?? PLACEHOLDER_SPRITE.enemy)
  const [deckCounts, setDeckCounts] = useState<Record<string, number>>(() =>
    toCounts(editEnemy?.deck ?? []),
  )
  const [aiProfile, setAiProfile] = useState<EnemyAiProfile | undefined>(editEnemy?.aiProfile)
  const [artworkFilter, setArtworkFilter] = useState("")
  const spriteNames = useSpriteNames()

  const filteredSprites = useMemo(() => {
    const q = artworkFilter.trim().toLowerCase()
    return q ? spriteNames.filter((s) => s.includes(q)) : spriteNames
  }, [artworkFilter, spriteNames])

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
    deck: toEntries(deckCounts),
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

  return (
    <main className="flex h-dvh w-full flex-col overflow-hidden bg-ocean-deep text-foreground">
      <DesignHeader icon={Swords} title="Enemy" accent="Designer" onBack={onBack}>
        {editEnemy && <EditingBadge name={editEnemy.name} />}
      </DesignHeader>

      <div className="flex-1 overflow-y-auto p-4 lg:p-6">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-4 md:flex-row md:items-start">
          {/* main content — vitals + loadout up top as a balanced grid, Behavior
              gets the full width below since its six sliders are the tallest
              content and benefit most from a two-column layout */}
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
              <Panel title="Identity">
                <Field label="Name" htmlFor="enemy-name">
                  <input
                    id="enemy-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={22}
                    placeholder="Shark Capo"
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

              <DeckSelectionPanel
                title="Deck"
                counts={deckCounts}
                onChange={setDeckCounts}
                maxCopies={9}
              />

              <Panel title="Artwork">
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

            <AiProfileEditor value={aiProfile} onChange={setAiProfile} />
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
      </div>
    </main>
  )
}
