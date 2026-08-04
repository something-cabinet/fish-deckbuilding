"use client"

import { Play, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  hasSave: boolean
  onContinue: () => void
  onNewRun: () => void
}

export function SavePrompt({ hasSave, onContinue, onNewRun }: Props) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-ocean-deep/85 backdrop-blur-sm animate-fm-fade-in">
      <div className="flex flex-col items-center gap-5 rounded-2xl border border-gold/30 bg-card/90 px-10 py-8 text-center shadow-2xl">
        <p className="font-display text-xs uppercase tracking-[0.4em] text-muted-foreground">
          {hasSave ? "An Open Ledger Awaits" : "A Fresh Ledger"}
        </p>
        <h2 className="font-display text-4xl font-bold uppercase tracking-widest text-gold">
          {hasSave ? "Continue?" : "New Run"}
        </h2>
        <p className="max-w-xs text-sm text-muted-foreground">
          {hasSave
            ? "You have a run in progress. Pick up where you left off, or start over."
            : "Begin a new debt-collection run through the reef."}
        </p>
        <div className="mt-2 flex flex-col items-center gap-3">
          {hasSave && (
            <button
              type="button"
              onClick={onContinue}
              className={cn(
                "flex w-64 items-center justify-center gap-2 rounded-lg bg-gold px-6 py-3.5",
                "font-display text-base font-bold uppercase tracking-widest text-ocean-deep",
                "shadow-lg transition-all hover:scale-[1.03] hover:shadow-xl",
              )}
            >
              <Play size={18} />
              Continue
            </button>
          )}
          <button
            type="button"
            onClick={onNewRun}
            className={cn(
              "flex w-64 items-center justify-center gap-2 rounded-lg border px-6 py-3",
              hasSave
                ? "border-white/15 bg-ocean-deep/50 font-display text-sm font-bold uppercase tracking-wider text-foreground transition-colors hover:bg-white/10"
                : "bg-gold px-6 py-3.5 font-display text-base font-bold uppercase tracking-widest text-ocean-deep shadow-lg transition-all hover:scale-[1.03] hover:shadow-xl",
            )}
          >
            <RotateCcw size={16} />
            New Run
          </button>
        </div>
      </div>
    </div>
  )
}
