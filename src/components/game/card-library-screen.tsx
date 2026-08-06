"use client"

import { useMemo, useState } from "react"
import { Library, Pencil, Plus, ScrollText, Shield, Sparkles, Swords, Trash2 } from "lucide-react"
import { CardType, type CardDef } from "@/lib/game/cards"
import type { EnemyDef } from "@/lib/game/units"
import type { StageDef } from "@/lib/game/stages"
import type { ZoneId } from "@/lib/game/overworld-types"
import { CardFace } from "./card-face"
import { EnemyLibraryScreen } from "./enemy-library-screen"
import { StageLibraryScreen } from "./stage-library-screen"
import {
  Chip,
  DesignHeader,
  EmptyState,
  PrimaryButton,
  TileAction,
  libraryGridClass,
} from "./design-ui"

interface Props {
  /** every card in the library — base pack and session-authored alike */
  cards: CardDef[]
  /** ids authored this session, badged as Custom */
  customIds?: string[]
  enemies: EnemyDef[]
  stages: StageDef[]
  /** tab to open on; lets the app restore the tab after an editor round-trip */
  initialSubtab?: SubTab
  onSubtabChange?: (tab: SubTab) => void
  onBack: () => void
  onCreate: () => void
  onEdit: (card: CardDef) => void
  onDelete: (id: string) => void
  onEnemyCreate: () => void
  onEnemyEdit: (enemy: EnemyDef) => void
  onEnemyDelete: (id: string) => void
  onStageCreate: (zone: ZoneId) => void
  onStageEdit: (stage: StageDef) => void
  onStageDelete: (id: string) => void
}

/** Card filter; null means "All" (no bare literal discriminators). */
type Filter = CardType | null

export type SubTab = "cards" | "enemies" | "stages"

const SUBTABS: { id: SubTab; label: string; icon: React.ElementType }[] = [
  { id: "cards", label: "Cards", icon: Swords },
  { id: "enemies", label: "Enemies", icon: Shield },
  { id: "stages", label: "Stages", icon: ScrollText },
]

const FILTERS: { id: Filter; label: string }[] = [
  { id: null, label: "All" },
  { id: CardType.Attack, label: "Attack" },
  { id: CardType.Skill, label: "Skill" },
  { id: CardType.Summon, label: "Summon" },
]

export function CardLibraryScreen({
  cards,
  customIds,
  enemies,
  stages,
  initialSubtab,
  onSubtabChange,
  onBack,
  onCreate,
  onEdit,
  onDelete,
  onEnemyCreate,
  onEnemyEdit,
  onEnemyDelete,
  onStageCreate,
  onStageEdit,
  onStageDelete,
}: Props) {
  const [subtab, setSubtab] = useState<SubTab>(initialSubtab ?? "cards")
  const [filter, setFilter] = useState<Filter>(null)

  const custom = useMemo(() => new Set(customIds ?? []), [customIds])

  const visible = filter === null ? cards : cards.filter((c) => c.type === filter)

  function selectSubtab(tab: SubTab) {
    setSubtab(tab)
    onSubtabChange?.(tab)
  }

  return (
    <main className="flex h-dvh w-full flex-col overflow-hidden bg-ocean-deep text-foreground">
      <DesignHeader icon={Library} title="Game" accent="Design" onBack={onBack} backLabel="Menu">
        <span className="hidden font-display text-[11px] font-bold uppercase tracking-wider text-muted-foreground sm:inline">
          {subtab === "cards" && `${visible.length} cards`}
          {subtab === "enemies" && `${enemies.length} enemies`}
          {subtab === "stages" && `${stages.length} stages`}
        </span>
        {subtab === "cards" && (
          <PrimaryButton onClick={onCreate}>
            <Plus size={15} />
            Create
          </PrimaryButton>
        )}
        {subtab === "enemies" && (
          <PrimaryButton onClick={onEnemyCreate}>
            <Plus size={15} />
            Create Enemy
          </PrimaryButton>
        )}
      </DesignHeader>

      {/* subtabs + contextual filters share one bar so the grid starts higher */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-1 gap-y-2 border-b border-white/10 px-4 py-2">
        {SUBTABS.map((t) => {
          const Icon = t.icon
          const active = subtab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => selectSubtab(t.id)}
              aria-pressed={active}
              className={
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 font-display text-xs font-bold uppercase tracking-wider transition-colors " +
                (active ? "bg-gold/15 text-gold" : "text-muted-foreground hover:text-foreground")
              }
            >
              <Icon size={14} />
              {t.label}
            </button>
          )
        })}

        {subtab === "cards" && (
          <div className="ml-auto flex items-center gap-1.5">
            {FILTERS.map((f) => (
              <Chip key={f.label} active={filter === f.id} onClick={() => setFilter(f.id)}>
                {f.label}
              </Chip>
            ))}
          </div>
        )}
      </div>

      {/* cards tab */}
      {subtab === "cards" && (
        <div className="flex flex-1 flex-col overflow-y-auto px-4 py-4">
          {visible.length === 0 ? (
            <EmptyState icon={Swords}>No cards match this filter.</EmptyState>
          ) : (
            <div className={libraryGridClass}>
              {visible.map((def) => (
                <div key={def.id} className="relative w-[150px]">
                  {custom.has(def.id) && (
                    <span className="absolute -right-1.5 -top-1.5 z-20 flex items-center gap-1 rounded-full border border-gold/40 bg-ocean-deep px-2 py-0.5 font-display text-[9px] font-bold uppercase tracking-wider text-gold shadow">
                      <Sparkles size={9} />
                      Custom
                    </span>
                  )}
                  <CardFace def={def} size="md" />
                  <div className="mt-1.5 flex gap-1">
                    <TileAction onClick={() => onEdit(def)} label={`Edit ${def.name}`} className="flex-1">
                      <Pencil size={10} />
                      Edit
                    </TileAction>
                    <TileAction onClick={() => onDelete(def.id)} danger label={`Delete ${def.name}`}>
                      <Trash2 size={10} />
                    </TileAction>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* enemies tab */}
      {subtab === "enemies" && (
        <EnemyLibraryScreen enemies={enemies} onEdit={onEnemyEdit} onDelete={onEnemyDelete} />
      )}

      {/* stages tab */}
      {subtab === "stages" && (
        <StageLibraryScreen
          stages={stages}
          enemies={enemies}
          onCreate={onStageCreate}
          onEdit={onStageEdit}
          onDelete={onStageDelete}
        />
      )}
    </main>
  )
}
