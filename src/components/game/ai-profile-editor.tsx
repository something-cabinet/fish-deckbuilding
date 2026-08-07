"use client"

import { useState } from "react"
import { HelpCircle, RotateCcw } from "lucide-react"
import {
  ARCHETYPE_WEIGHTS,
  DEFAULT_AI_PROFILE,
  type AiScorer,
  type EnemyAiProfile,
} from "@/lib/game/units"
import { AI_ARCHETYPE_META, AI_SCORER_META, AI_SCORER_ORDER } from "./ai-scorer-meta"
import { Chip, Field, Panel } from "./design-ui"
import { cn } from "@/lib/utils"

interface Props {
  value?: EnemyAiProfile
  onChange: (profile: EnemyAiProfile) => void
}

/**
 * Behaviour editor: pick an archetype, then nudge individual axes.
 *
 * Only axes the designer actually moved are stored, so an enemy's saved
 * profile stays a readable diff against its archetype instead of a wall of
 * numbers — and retuning an archetype preset still propagates to every enemy
 * that didn't override that axis.
 */
export function AiProfileEditor({ value, onChange }: Props) {
  const profile = value ?? DEFAULT_AI_PROFILE
  const preset = ARCHETYPE_WEIGHTS[profile.archetype]
  const overrides = profile.weights ?? {}
  // explanations start collapsed — the sliders + values are the working view,
  // the wordy "what does this do" text is a lookup a designer reaches for on demand
  const [explained, setExplained] = useState<Set<AiScorer>>(new Set())

  function toggleExplain(scorer: AiScorer) {
    const next = new Set(explained)
    if (next.has(scorer)) next.delete(scorer)
    else next.add(scorer)
    setExplained(next)
  }

  function setArchetype(archetype: EnemyAiProfile["archetype"]) {
    // overrides are relative to a preset, so they do not survive a switch —
    // picking an archetype means "give me that behaviour", not "keep my edits"
    onChange({ archetype })
  }

  function setWeight(scorer: AiScorer, raw: number) {
    const next = { ...overrides }
    // storing a value identical to the preset would freeze this axis against
    // future preset retunes, so drop it back to inherited instead
    if (raw === preset[scorer]) delete next[scorer]
    else next[scorer] = raw
    onChange({
      archetype: profile.archetype,
      ...(Object.keys(next).length > 0 ? { weights: next } : {}),
    })
  }

  function resetAll() {
    onChange({ archetype: profile.archetype })
  }

  const overrideCount = Object.keys(overrides).length

  return (
    <Panel title="Behavior">
      <Field label="Archetype" hint={AI_ARCHETYPE_META[profile.archetype].hint}>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(AI_ARCHETYPE_META).map(([id, meta]) => (
            <Chip
              key={id}
              active={profile.archetype === id}
              onClick={() => setArchetype(id as EnemyAiProfile["archetype"])}
            >
              {meta.label}
            </Chip>
          ))}
        </div>
      </Field>

      <div className="mt-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <span className="font-display text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Tuning
            {overrideCount > 0 && (
              <span className="ml-1.5 font-sans text-xs font-normal normal-case tracking-normal text-gold">
                {overrideCount} changed
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={resetAll}
            disabled={overrideCount === 0}
            className={cn(
              "flex items-center gap-1 rounded font-display text-xs font-bold uppercase tracking-wider transition-colors",
              overrideCount === 0
                ? "cursor-not-allowed text-muted-foreground/40"
                : "text-muted-foreground hover:text-gold",
            )}
          >
            <RotateCcw size={12} />
            Reset to preset
          </button>
        </div>

        {/* CSS columns, not grid — sliders vary in height once a hint expands,
            and a grid row stretches to its tallest cell, stranding blank
            space next to the shorter neighbor. Columns let each stack
            independently. */}
        <div className="mt-3 columns-1 gap-x-6 lg:columns-2">
          {AI_SCORER_ORDER.map((scorer) => {
            const meta = AI_SCORER_META[scorer]
            const overridden = overrides[scorer] !== undefined
            const current = overrides[scorer] ?? preset[scorer]
            const id = `ai-weight-${scorer}`
            const hintId = `ai-hint-${scorer}`
            const isExplained = explained.has(scorer)
            return (
              <div key={scorer} className="mb-5 break-inside-avoid">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <label
                      htmlFor={id}
                      className="font-display text-sm font-bold uppercase tracking-[0.06em] text-foreground"
                    >
                      {meta.label}
                    </label>
                    <button
                      type="button"
                      onClick={() => toggleExplain(scorer)}
                      aria-expanded={isExplained}
                      aria-controls={hintId}
                      aria-label={`${isExplained ? "Hide" : "Show"} explanation for ${meta.label}`}
                      className={cn(
                        "flex items-center gap-1 rounded-full border px-1.5 py-0.5 font-display text-[10px] font-bold uppercase tracking-wider transition-colors",
                        isExplained
                          ? "border-gold/50 bg-gold/15 text-gold"
                          : "border-white/10 text-muted-foreground hover:border-gold/40 hover:text-gold",
                      )}
                    >
                      <HelpCircle size={11} />
                      Explain
                    </button>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 font-display text-sm font-bold tabular-nums",
                      overridden ? "text-gold" : "text-muted-foreground",
                    )}
                  >
                    {current}
                  </span>
                </div>
                {isExplained && (
                  <p id={hintId} className="mb-2 mt-1 text-sm leading-snug text-muted-foreground">
                    {meta.hint}
                  </p>
                )}
                <input
                  id={id}
                  type="range"
                  min={meta.min}
                  max={meta.max}
                  step={meta.step}
                  value={current}
                  onChange={(e) => setWeight(scorer, Number(e.target.value))}
                  className={cn(
                    "h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-gold",
                    !isExplained && "mt-2",
                  )}
                />
              </div>
            )
          })}
        </div>
      </div>
    </Panel>
  )
}
