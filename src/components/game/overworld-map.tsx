"use client"

import { useMemo, useState } from "react"
import {
  AlertTriangle,
  Coins,
  Crown,
  Fish,
  Gem,
  HeartPulse,
  HelpCircle,
  Layers,
  Scale,
  Shield,
  ShoppingBag,
  Skull,
  Swords,
  X,
} from "lucide-react"
import type { MapNode, NodeType, OverworldState } from "@/lib/game/overworld-types"
import { FORECLOSURE_CAP, FORECLOSURE_WARN } from "@/lib/game/overworld-data"
import { accrueInterest } from "@/lib/game/overworld-engine"
import { CARD_LIBRARY } from "@/lib/game/cards"
import { cn } from "@/lib/utils"

interface Props {
  state: OverworldState
  /** current zone's node map */
  map: MapNode[]
  /** nodes reachable from the hero's current node */
  reachable: MapNode[]
  onNodeClick: (node: MapNode) => void
  onExit: () => void
}

interface NodeStyle {
  label: string
  desc: string
  ring: string
  bg: string
  icon: string
  Icon: typeof Swords
}

const NODE_STYLES: Record<NodeType, NodeStyle> = {
  battle: {
    label: "Battle",
    desc: "Standard fight — gold & a card",
    ring: "border-enemy/70",
    bg: "bg-enemy/15",
    icon: "text-enemy",
    Icon: Swords,
  },
  elite: {
    label: "Elite",
    desc: "Tough fight — richer purse",
    ring: "border-enemy",
    bg: "bg-enemy/25",
    icon: "text-enemy",
    Icon: Skull,
  },
  rest: {
    label: "Rest",
    desc: "Heal 30% of max HP",
    ring: "border-teal/70",
    bg: "bg-teal/15",
    icon: "text-teal",
    Icon: HeartPulse,
  },
  shop: {
    label: "Shop",
    desc: "Spend gold — cards, strikes, tribute",
    ring: "border-gold/70",
    bg: "bg-gold/15",
    icon: "text-gold",
    Icon: ShoppingBag,
  },
  event: {
    label: "Encounter",
    desc: "A choice with consequences",
    ring: "border-teal/70",
    bg: "bg-teal/10",
    icon: "text-teal",
    Icon: HelpCircle,
  },
  treasure: {
    label: "Treasure",
    desc: "Free gold + a card",
    ring: "border-gold/80",
    bg: "bg-gold/15",
    icon: "text-gold",
    Icon: Gem,
  },
  boss: {
    label: "Boss",
    desc: "Defeat to descend to the next zone",
    ring: "border-gold",
    bg: "bg-gold/25",
    icon: "text-gold",
    Icon: Crown,
  },
}

/** Legend only surfaces the kinds that read as distinct affordances. */
const LEGEND_ORDER: NodeType[] = ["battle", "elite", "event", "shop", "treasure", "rest", "boss"]

export function OverworldMap({ state, map, reachable, onNodeClick, onExit }: Props) {
  const [showDeck, setShowDeck] = useState(false)

  const reachableIds = useMemo(() => new Set(reachable.map((n) => n.id)), [reachable])
  const heroNode = map.find((n) => n.id === state.nodeId) ?? map[0]
  const curZoneName = ZONE_NAMES[state.zoneIndex] ?? `Zone ${state.zoneIndex + 1}`
  const nextInterest = accrueInterest(state)
  const debtPct = Math.min(1, state.debt / FORECLOSURE_CAP)
  const debtCritical = debtPct >= FORECLOSURE_WARN

  const edges = useMemo(() => {
    const out: { x1: number; y1: number; x2: number; y2: number; active: boolean }[] = []
    const nodeById = new Map(map.map((n) => [n.id, n]))
    for (const n of map) {
      for (const e of n.edges) {
        const t = nodeById.get(e)
        if (!t) continue
        out.push({ x1: n.x, y1: n.y, x2: t.x, y2: t.y, active: heroNode?.id === n.id })
      }
    }
    return out
  }, [map, heroNode])

  return (
    <main className="relative flex h-dvh w-full flex-col overflow-hidden bg-background text-foreground">
      <ZoneBackdrop index={state.zoneIndex} />

      {/* HUD */}
      <header className="relative z-10 flex items-center justify-between gap-4 border-b border-gold/20 bg-ocean-deep/70 px-4 py-2.5 backdrop-blur-sm">
        <div className="min-w-[150px]">
          <p className="font-display text-sm font-bold uppercase tracking-wider text-gold">
            {curZoneName}
          </p>
          <p className="font-display text-[10px] uppercase tracking-widest text-muted-foreground">
            Zone {state.zoneIndex + 1} of 3
          </p>
        </div>

        <h1 className="hidden font-display text-2xl font-bold uppercase tracking-[0.25em] lg:block">
          The Ledger Map
        </h1>

        <div className="flex min-w-[150px] items-center justify-end gap-4">
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

      {/* debt ledger — the always-visible pressure gauge */}
      <LedgerBar
        debt={state.debt}
        interest={nextInterest}
        pct={debtPct}
        critical={debtCritical}
      />

      {/* map area */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center overflow-y-auto p-4">
        <svg
          viewBox="0 0 100 100"
          className="h-auto w-full max-w-[820px]"
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
              strokeOpacity={e.active ? 0.9 : 0.28}
              strokeWidth={e.active ? 1.2 : 0.6}
              strokeDasharray={e.active ? "3 2" : undefined}
            />
          ))}

          {/* nodes */}
          {map.map((n) => {
            const style = NODE_STYLES[n.type]
            const { Icon } = style
            const isCurrent = heroNode?.id === n.id
            const isVisited = state.visited.includes(n.id)
            const isReachable = !isCurrent && reachableIds.has(n.id)
            // dead = neither current, reachable, nor already cleared -> dimmed
            const isDim = !isCurrent && !isReachable && !isVisited
            const showThreat = n.threat > 0 && !isVisited

            return (
              <g
                key={n.id}
                transform={`translate(${n.x}, ${n.y})`}
                role={isReachable ? "button" : undefined}
                aria-label={isReachable ? `${style.label} node, threat ${n.threat}` : undefined}
                className={cn(isReachable ? "cursor-pointer" : "cursor-default")}
                onClick={() => {
                  if (isReachable) onNodeClick(n)
                }}
              >
                {isReachable && (
                  <circle
                    r={5.6}
                    fill="transparent"
                    className="pointer-events-none animate-fm-pulse-ring stroke-gold/70 stroke-[0.9]"
                  />
                )}
                {isCurrent && (
                  <circle
                    r={5.8}
                    fill="transparent"
                    className="animate-fm-pulse-ring stroke-gold stroke-[1.3]"
                  />
                )}

                {/* node face */}
                <circle
                  r={4.2}
                  className={cn(
                    "transition-opacity",
                    isCurrent
                      ? "fill-ocean-deep stroke-gold stroke-[1.1]"
                      : isReachable
                        ? "fill-ocean-deep stroke-gold stroke-[1]"
                        : isVisited
                          ? "fill-white/5 stroke-white/20"
                          : "fill-white/[0.06] stroke-white/20",
                  )}
                  opacity={isDim ? 0.5 : 1}
                />

                {/* node icon */}
                <Icon
                  x={-2.1}
                  y={-2.1}
                  width={4.2}
                  height={4.2}
                  className={cn(
                    isVisited
                      ? "text-white/25"
                      : isCurrent || isReachable
                        ? style.icon
                        : "text-white/40",
                  )}
                  opacity={isDim ? 0.6 : 1}
                />

                {/* threat telegraph pips */}
                {showThreat && (
                  <ThreatPips threat={n.threat} dim={isDim} elite={n.type === "elite"} />
                )}

                {isCurrent && <HeroMarker />}
              </g>
            )
          })}
        </svg>

        <MapLegend />

        <p className="mt-3 max-w-md text-center font-display text-xs uppercase tracking-[0.25em] text-muted-foreground">
          {reachable.length
            ? `${reachable.length} path${reachable.length > 1 ? "s" : ""} open — the interest never sleeps`
            : "No paths open from here"}
        </p>
      </div>

      {showDeck && <DeckModal deck={state.deck} onClose={() => setShowDeck(false)} />}
    </main>
  )
}

/** Small skull/dot pips beneath a combat node, telegraphing danger. */
function ThreatPips({ threat, dim, elite }: { threat: number; dim: boolean; elite: boolean }) {
  const pips = Array.from({ length: threat })
  const w = 1.5
  const gap = 0.6
  const total = pips.length * w + (pips.length - 1) * gap
  return (
    <g opacity={dim ? 0.55 : 1} transform={`translate(${-total / 2}, 5)`}>
      {pips.map((_, i) => (
        <circle
          key={i}
          cx={i * (w + gap) + w / 2}
          cy={0}
          r={w / 2}
          className={cn(elite ? "fill-enemy" : "fill-enemy/80")}
        />
      ))}
    </g>
  )
}

function LedgerBar({
  debt,
  interest,
  pct,
  critical,
}: {
  debt: number
  interest: number
  pct: number
  critical: boolean
}) {
  return (
    <div className="relative z-10 flex items-center justify-center gap-3 px-4 pt-3">
      <div
        className={cn(
          "flex w-full max-w-[820px] items-center gap-3 rounded-lg border px-3 py-2 backdrop-blur-sm transition-colors",
          critical
            ? "border-enemy/60 bg-enemy/10"
            : "border-gold/25 bg-ocean-deep/60",
        )}
      >
        <span
          className={cn(
            "flex items-center gap-1.5 font-display text-[11px] font-bold uppercase tracking-widest",
            critical ? "text-enemy" : "text-gold",
          )}
        >
          {critical ? <AlertTriangle size={14} /> : <Scale size={14} />}
          Debt
        </span>

        {/* meter */}
        <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-white/10">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              critical ? "bg-enemy animate-fm-pulse-ring" : "bg-gold",
            )}
            style={{ width: `${Math.max(3, pct * 100)}%` }}
          />
        </div>

        <span
          className={cn(
            "min-w-[130px] text-right font-display text-xs font-bold tabular-nums",
            critical ? "text-enemy" : "text-foreground",
          )}
        >
          {debt} / {FORECLOSURE_CAP}
          <span className="ml-1.5 font-normal text-muted-foreground">+{interest}/node</span>
        </span>
      </div>
    </div>
  )
}

function HeroMarker() {
  return (
    <g className="pointer-events-none">
      <circle cx={0} cy={0} r={5.4} className="fill-gold/20" />
      <circle cx={0} cy={0} r={3.3} className="fill-gold" />
      <circle cx={0} cy={0} r={3.3} fill="none" className="stroke-ocean-deep stroke-[0.7]" />
      <Fish x={-1.5} y={-1.5} width={3} height={3} className="text-ocean-deep" />
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
      {LEGEND_ORDER.map((type) => {
        const { label, Icon, ring, bg, icon } = NODE_STYLES[type]
        return (
          <div key={type} className="flex items-center gap-2">
            <span className={cn("flex h-6 w-6 items-center justify-center rounded-full border", ring, bg)}>
              <Icon size={13} className={icon} />
            </span>
            <span className="font-display text-[11px] font-bold uppercase tracking-wider text-foreground">
              {label}
            </span>
          </div>
        )
      })}
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-enemy/70 bg-enemy/15">
          <span className="h-1.5 w-1.5 rounded-full bg-enemy" />
        </span>
        <span className="font-display text-[11px] font-bold uppercase tracking-wider text-foreground">
          Threat
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
    <div className={cn("pointer-events-none absolute inset-0", zones[index % zones.length])} />
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
