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
import { CARD_LIBRARY } from "@/lib/game/cards"
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
    desc: "Fight for gold & cards",
    ring: "border-enemy/70",
    bg: "bg-enemy/15",
    icon: "text-enemy",
    Icon: Swords,
  },
  rest: {
    label: "Rest",
    desc: "Heal 30% of max HP",
    ring: "border-teal/70",
    bg: "bg-teal/15",
    icon: "text-teal",
    Icon: HeartPulse,
  },
  boss: {
    label: "Boss",
    desc: "Defeat to unlock the next zone",
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
      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center overflow-y-auto p-4">
        <svg
          viewBox="0 0 100 100"
          className="w-full max-w-[800px] h-auto"
          preserveAspectRatio="xMidYMid meet"
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
              strokeWidth={e.active ? 1.2 : 0.7}
              strokeDasharray={e.active ? "3 2" : undefined}
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
                    r={5.5}
                    fill="transparent"
                    className="pointer-events-none animate-fm-pulse-ring stroke-gold/70 stroke-[0.9]"
                  />
                )}
                {/* hero highlight ring */}
                {isCurrent && (
                  <circle
                    r={5.8}
                    fill="transparent"
                    className="stroke-gold stroke-[1.3] animate-fm-pulse-ring"
                  />
                )}
                {/* node face */}
                <circle
                  r={4.2}
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
                  x={-2}
                  y={-2}
                  width={4}
                  height={4}
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

        {/* legend */}
        <MapLegend />

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
      {/* soft halo */}
      <circle cx={0} cy={0} r={5.4} className="fill-gold/20" />
      {/* filled gold badge */}
      <circle cx={0} cy={0} r={3.3} className="fill-gold" />
      <circle cx={0} cy={0} r={3.3} fill="none" className="stroke-ocean-deep stroke-[0.7]" />
      {/* fish icon */}
      <Fish x={-1.5} y={-1.5} width={3} height={3} className="text-ocean-deep" />
      {/* you label */}
      <g>
        <rect x={-4.2} y={6.2} width={8.4} height={3.2} rx={1.1} className="fill-ocean-deep" opacity={0.9} />
        <text
          y={8.6}
          textAnchor="middle"
          className="fill-gold font-display text-[2.6px] font-bold uppercase tracking-widest"
        >
          You
        </text>
      </g>
    </g>
  )
}

function MapLegend() {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 rounded-xl border border-white/10 bg-ocean-deep/60 px-4 py-2.5 backdrop-blur-sm">
      {Object.values(NODE_STYLES).map(({ label, desc, Icon, ring, bg, icon }) => (
        <div key={label} className="flex items-center gap-2">
          <span className={cn("flex h-6 w-6 items-center justify-center rounded-full border", ring, bg)}>
            <Icon size={13} className={icon} />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-display text-[11px] font-bold uppercase tracking-wider text-foreground">
              {label}
            </span>
            <span className="text-[10px] text-muted-foreground">{desc}</span>
          </span>
        </div>
      ))}
      {/* player marker */}
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-gold bg-gold">
          <Fish size={13} className="text-ocean-deep" />
        </span>
        <span className="flex flex-col leading-tight">
          <span className="font-display text-[11px] font-bold uppercase tracking-wider text-foreground">You</span>
          <span className="text-[10px] text-muted-foreground">Your current position</span>
        </span>
      </div>
    </div>
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
