"use client"

import { useState } from "react"
import { Fish, Library, Play, Settings as SettingsIcon, Sparkles, Footprints, X } from "lucide-react"
import type { GameSettings } from "./fish-mafia-app"
import { cn } from "@/lib/utils"

interface Props {
  settings: GameSettings
  onChangeSettings: (s: GameSettings) => void
  onStart: () => void
  onContinue?: () => void
  onOpenLibrary: () => void
}

export function MenuScreen({
  settings,
  onChangeSettings,
  onStart,
  onContinue,
  onOpenLibrary,
}: Props) {
  const [showSettings, setShowSettings] = useState(false)

  return (
    <main className="relative flex h-dvh w-full flex-col items-center justify-center overflow-hidden bg-background text-foreground">
      {/* backdrop */}
      <img
        src="/menu-bg.png"
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover opacity-60"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-ocean-deep/70 via-ocean-deep/40 to-ocean-deep/95" />

      {/* title + actions */}
      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        <span className="mb-4 flex items-center gap-2 rounded-full border border-gold/40 bg-ocean-deep/60 px-4 py-1.5 font-display text-xs uppercase tracking-[0.25em] text-gold backdrop-blur-sm">
          <Fish size={14} />
          Ledger Tactics
        </span>

        <h1 className="font-display text-6xl font-bold uppercase leading-none tracking-tight text-balance text-foreground drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] sm:text-8xl">
          Fish <span className="text-gold">Mafia</span>
        </h1>

        <p className="mt-5 max-w-md text-pretty leading-relaxed text-muted-foreground">
          Move your crew, cast debt-collection skills, and settle the ledger before the mob
          forecloses on the whole reef.
        </p>

        <div className="mt-10 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={onStart}
            className="flex w-64 items-center justify-center gap-2 rounded-lg bg-gold px-6 py-4 font-display text-xl font-bold uppercase tracking-widest text-ocean-deep shadow-lg transition-all hover:scale-[1.03] hover:shadow-xl"
          >
            <Play size={22} />
            Start
          </button>
          {onContinue && (
            <button
              type="button"
              onClick={onContinue}
              className="flex w-64 items-center justify-center gap-2 rounded-lg border border-gold/40 bg-ocean-deep/50 px-6 py-3 font-display text-base font-bold uppercase tracking-widest text-gold backdrop-blur-sm transition-colors hover:bg-gold/15"
            >
              <Play size={18} />
              Continue
            </button>
          )}
          <div className="flex w-64 gap-3">
            <button
              type="button"
              onClick={onOpenLibrary}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gold/40 bg-ocean-deep/50 px-4 py-3 font-display text-sm font-bold uppercase tracking-wider text-gold backdrop-blur-sm transition-colors hover:bg-gold/15"
            >
              <Library size={16} />
              Design
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="flex w-64 items-center justify-center gap-2 rounded-lg border border-gold/40 bg-ocean-deep/50 px-6 py-3 font-display text-base font-bold uppercase tracking-widest text-gold backdrop-blur-sm transition-colors hover:bg-gold/15"
          >
            <SettingsIcon size={18} />
            Settings
          </button>
        </div>
      </div>

      {showSettings && (
        <SettingsPanel
          settings={settings}
          onChange={onChangeSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </main>
  )
}

function SettingsPanel({
  settings,
  onChange,
  onClose,
}: {
  settings: GameSettings
  onChange: (s: GameSettings) => void
  onClose: () => void
}) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-ocean-deep/80 p-6 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-gold/25 bg-ocean-deep/95 p-6 shadow-2xl animate-fm-fade-in">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-xl font-bold uppercase tracking-widest text-gold">
            <SettingsIcon size={20} />
            Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <Toggle
            icon={<Footprints size={18} />}
            label="Movement Hints"
            desc="Highlight reachable tiles for the selected fish."
            on={settings.movementHints}
            onToggle={() => onChange({ ...settings, movementHints: !settings.movementHints })}
          />
          <Toggle
            icon={<Sparkles size={18} />}
            label="Visual Effects"
            desc="Particle bursts and floating combat numbers."
            on={settings.visualEffects}
            onToggle={() => onChange({ ...settings, visualEffects: !settings.visualEffects })}
          />
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-lg bg-gold px-4 py-2.5 font-display text-sm font-bold uppercase tracking-widest text-ocean-deep transition-transform hover:scale-[1.02]"
        >
          Done
        </button>
      </div>
    </div>
  )
}

function Toggle({
  icon,
  label,
  desc,
  on,
  onToggle,
}: {
  icon: React.ReactNode
  label: string
  desc: string
  on: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left transition-colors hover:bg-white/[0.06]"
    >
      <span className={cn("shrink-0 transition-colors", on ? "text-gold" : "text-muted-foreground")}>
        {icon}
      </span>
      <span className="flex-1">
        <span className="block font-display text-sm font-bold uppercase tracking-wide text-foreground">
          {label}
        </span>
        <span className="block text-xs leading-snug text-muted-foreground">{desc}</span>
      </span>
      <span
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          on ? "bg-gold" : "bg-white/15",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-ocean-deep transition-all",
            on ? "left-[22px]" : "left-0.5",
          )}
        />
      </span>
    </button>
  )
}
