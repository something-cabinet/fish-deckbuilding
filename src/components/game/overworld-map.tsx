"use client"

import { useMemo, useState } from "react"
import {
  Coins,
  Fish,
  HeartPulse,
  Layers,
  Lock,
  Shield,
  Skull,
  Swords,
  X,
} from "lucide-react"
import type { MapNode, OverworldState } from "@/lib/game/overworld-types"
import { CARD_LIBRARY } from "@/lib/game/data"
import { cn } from "@/lib/utils"

interface Props {
  state: OverworldState
  /** current zone's node map */
  map: MapNode[]
  /** all zone maps (for the zone switcher) */
  maps: MapNode[][]
  /** nodes reachable from the hero's current node */
  reachable: MapNode[]
  /** currently selected zone index for the switcher */
  activeZone: number
  onZoneSelect: (index: number) => void
  onNodeClick: (node: MapNode) => void
  onExit: () => void
}

const NODE_STYLES = {
  battle: {
    label: "Battle",
    ring: "border-enemy/70",
    bg: "bg-enemy/15",
    icon: "text-enemy",
    Icon: Swords,
  },
  rest: {
    label: "Rest",
    ring: "border-teal/70",
    bg: "bg-teal/15",
    icon: "text-teal",
    Icon: HeartPulse,
  },
  boss: {
    label: "Boss",
    ring: "border-gold/80",
    bg: "bg-gold/20",
    icon: "text-gold",
    Icon: Skull,
  },
} as const

export function OverworldMap({
  state,
  map,
  maps,
  reachable,
  activeZone,
  onZoneSelect,
  onNodeClick,
  onExit,
}: Props) {
  const [showDeck, setShowDeck] = useState(false)

  const reachableIds = useMemo(() => new Set(reachable.map((n) => n.id)), [reachable])
  const heroZone = state.zoneIndex
  const heroNode = heroZone === activeZone ? map.find((n) => n.id === state.nodeId) ?? map[0] : undefined
  const curZoneName = ZONE_NAMES[state.zoneIndex] ?? `Zone ${state.zoneIndex + 1}`
  const zoneUnlocked = (i: number) => i < state.unlockedZones

  // edges from every node that has them
  const edges = useMemo(() => {
    const out: { x1: number; y1: number; x2: number; y2: number; active: boolean }[] = []
    const nodeById = new Map(map.map((n) => [n.id, n]))
    for (const n of map) {
      for (const e of n.edges) {
        const t = nodeById.get(e)
        if (!t) continue
        const active = heroNode?.id === n.id
        out.push({ x1: n.x, y1: n.y, x2: t.x, y2: t.y, active })
      }
    }
    return out
  }, [map, heroNode])

  return (
    <main className="relative flex h-dvh w-full flex-col overflow-hidden bg-background text-foreground">
      {/* zone-styled backdrop */}
      <ZoneBackdrop index={activeZone} />

      {/* HUD */}
      <header className="relative z-10 flex items-center justify-between gap-4 border-b border-gold/20 bg-ocean-deep/70 px-4 py-2.5 backdrop-blur-sm">
        <div className="min-w-[170px]">
          <p className="font-display text-sm font-bold uppercase tracking-wider text-gold">
            {ZONE_NAMES[activeZone] ?? `Zone ${activeZone + 1}`}
          </p>
          <p className="font-display text-xs uppercase tracking-widest text-muted-foreground">
            {zoneUnlocked(activeZone) ? "Open Waters" : "Locked"}
          </p>
        </div>

        <h1 className="hidden font-display text-2xl font-bold uppercase tracking-[0.25em] sm:block">
          The {ZONE_NAMES[activeZone] ?? "Ledger"} Map
        </h1>

        <div className="flex min-w-[170px] items-center justify-end gap-4">
          <Stat label="Gold" value={state.gold} icon={<Coins size={13} className="text-gold" />} />
          <Stat
            label="HP"
            value={`${state.hp}/${state.maxHp}`}
            icon={<HeartPulse size={13} className="text-enemy" />}
          />
          <button
            type="button"
            onClick={() => setShowDeck(true)}
            className="flex items-center gap-1.5 rounded-md border border-gold/40 bg-gold/10 px-2.5 py-1.5 font-display text-[11px] font-bold uppercase tracking-wider text-gold transition-colors hover:bg-gold/20"
          >
            <Layers size={13} />
            Deck · {state.deck.length}
          </button>
          <button
            type="button"
            onClick={onExit}
            className="flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 font-display text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:border-gold/40 hover:text-gold"
          >
            Menu
          </button>
        </div>
      </header>

      {/* zone switcher */}
      <div className="relative z-10 flex items-center justify-center gap-2 px-4 pt-3">
        {maps.map((m, i) => {
          const unlocked = zoneUnlocked(i)
          const active = i === activeZone
          return (
            <button
              type="button"
              key={i}
              disabled={!unlocked}
              onClick={() => onZoneSelect(i)}
              title={!unlocked ? "Beat this zone's boss to unlock" : undefined}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1 font-display text-[11px] font-bold uppercase tracking-widest transition-colors",
                active
                  ? "border-gold bg-gold/20 text-gold"
                  : unlocked
                    ? "border-white/15 bg-ocean-deep/50 text-muted-foreground hover:border-gold/40 hover:text-gold"
                    : "cursor-not-allowed border-white/10 bg-ocean-deep/40 text-muted-foreground/50",
              )}
            >
              {!unlocked && <Lock size={11} />}
              {ZONE_NAMES[i] ?? `Zone ${i + 1}`}
            </button>
          )
        })}
      </div>

      {/* map area */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center p-4">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="h-full max-h-[540px] w-full max-w-[1000px]"
          role="img"
          aria-label={`${curZoneName} overworld map`}
        >
          {/* connections */}
          {edges.map((e, i) => (
            <line
              key={i}
              x1={e.x1}
              y1={e.y1}
              x2={e.x2}
              y2={e.y2}
              stroke={e.active ? "var(--gold)" : "var(--gold-dim)"}
              strokeOpacity={e.active ? 0.9 : 0.35}
              strokeWidth={e.active ? 0.9 : 0.5}
              strokeDasharray={e.active ? "2 1.5" : undefined}
            />
          ))}

          {/* nodes */}
          {map.map((n) => {
            const style = NODE_STYLES[n.type]
            const { Icon } = style
            const isCurrent = heroNode?.id === n.id
            const isVisited = state.visited.includes(n.id)
            const isBoss = n.type === "boss"

            // reachable only makes sense on the hero's own zone
            const displayReach = heroZone === activeZone && !isCurrent && reachableIds.has(n.id)

            return (
              <g
                key={n.id}
                transform={`translate(${n.x}, ${n.y})`}
                role={displayReach ? "button" : undefined}
                aria-label={displayReach ? `${style.label} node` : undefined}
                className={cn(
                  displayReach && "cursor-pointer",
                  !displayReach && !isCurrent && "cursor-default",
                )}
                onClick={() => {
                  if (displayReach) onNodeClick(n)
                }}
              >
                {/* reachable pulse ring */}
                {displayReach && (
                  <circle
                    r={4.2}
                    fill="transparent"
                    className="pointer-events-none animate-fm-pulse-ring stroke-gold/70 stroke-[0.7]"
                  />
                )}
                {/* hero highlight ring */}
                {isCurrent && (
                  <circle
                    r={4.4}
                    fill="transparent"
                    className="stroke-gold stroke-[1] animate-fm-pulse-ring"
                  />
                )}
                {/* node face */}
                <circle
                  r={3.2}
                  className={cn(
                    "transition-colors",
                    displayReach
                      ? "fill-ocean-deep stroke-gold stroke-[1]"
                      : isCurrent
                        ? "fill-ocean-deep stroke-gold stroke-[1]"
                        : isVisited
                          ? "fill-white/5 stroke-white/20"
                          : isBoss
                            ? "fill-white/15 stroke-gold/60"
                            : "fill-white/10 stroke-white/30",
                  )}
                />
                {/* node icon */}
                <Icon
                  x={-1.55}
                  y={-1.55}
                  width={3.1}
                  height={3.1}
                  className={cn(
                    isCurrent && "text-gold",
                    !isCurrent && isVisited && "text-white/30",
                    !isCurrent && !isVisited && displayReach && style.icon,
                    !isCurrent && !isVisited && !displayReach && isBoss && "text-gold/70",
                    !isCurrent && !isVisited && !displayReach && !isBoss && "text-white/40",
                  )}
                />
                {/* hero fish marker rides on the current node */}
                {isCurrent && <HeroMarker />}
              </g>
            )
          })}
        </svg>

        {/* hero zone status */}
        <p className="mt-3 max-w-md text-center font-display text-xs uppercase tracking-[0.25em] text-muted-foreground">
          {heroZone === activeZone
            ? heroNode
              ? reachable.length
                ? `${reachable.length} path${reachable.length > 1 ? "s" : ""} reachable — pick your way forward`
                : "No paths open from here"
              : "Overworld"
            : "Viewing another zone"}
        </p>
      </div>

      {/* deck viewer */}
      {showDeck && <DeckModal deck={state.deck} onClose={() => setShowDeck(false)} />}
    </main>
  )
}

function HeroMarker() {
  return (
    <g className="pointer-events-none">
      <circle cx={0} cy={0} r={2} className="fill-gold/20" />
      <Fish x={-0.9} y={-0.9} width={1.8} height={1.8} className="text-ocean-deep" />
    </g>
  )
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string
  value: string | number
  icon: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-end">
      <span className="flex items-center gap-1 font-display text-[10px] uppercase tracking-widest text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="font-display text-base font-bold leading-none text-foreground">{value}</span>
    </div>
  )
}

function ZoneBackdrop({ index }: { index: number }) {
  const zones = [
    "bg-[radial-gradient(ellipse_at_50%_0%,oklch(0.45_0.09_200/0.5),transparent_65%)]",
    "bg-[radial-gradient(ellipse_at_50%_0%,oklch(0.3_0.06_230/0.55),transparent_65%)]",
    "bg-[radial-gradient(ellipse_at_50%_0%,oklch(0.16_0.05_260/0.7),transparent_70%)]",
  ]
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0",
        zones[index % zones.length],
      )}
    />
  )
}

const ZONE_NAMES = ["Shallows", "Midwaters", "Depths"]

function DeckModal({ deck, onClose }: { deck: string[]; onClose: () => void }) {
  const counts = useMemo(() => {
    const m: Record<string, number> = {}
    for (const id of deck) m[id] = (m[id] ?? 0) + 1
    return m
  }, [deck])

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-ocean-deep/85 p-6 backdrop-blur-sm animate-fm-fade-in">
      <div className="flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl border border-gold/25 bg-ocean-deep/95 p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-xl font-bold uppercase tracking-widest text-gold">
            <Layers size={20} />
            Deck · {deck.length} cards
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close deck"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 overflow-y-auto pr-1">
          {Object.entries(counts).map(([id, count]) => {
            const def = CARD_LIBRARY[id]
            if (!def) return null
            return (
              <div
                key={id}
                className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2"
              >
                <span className="flex items-center gap-2 text-sm text-foreground">
                  <Shield size={13} className="text-gold/70" />
                  {def.name}
                </span>
                <span className="font-display text-xs font-bold text-muted-foreground">×{count}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
