"use client"

import { RotateCcw } from "lucide-react"
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

      <div className="mt-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="font-display text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Tuning
            {overrideCount > 0 && (
              <span className="ml-1.5 font-sans text-[9px] font-normal normal-case tracking-normal text-gold">
                {overrideCount} changed
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={resetAll}
            disabled={overrideCount === 0}
            className={cn(
              "flex items-center gap-1 rounded font-display text-[9px] font-bold uppercase tracking-wider transition-colors",
              overrideCount === 0
                ? "cursor-not-allowed text-muted-foreground/40"
                : "text-muted-foreground hover:text-gold",
            )}
          >
            <RotateCcw size={10} />
            Reset to preset
          </button>
        </div>

        {AI_SCORER_ORDER.map((scorer) => {
          const meta = AI_SCORER_META[scorer]
          const overridden = overrides[scorer] !== undefined
          const current = overrides[scorer] ?? preset[scorer]
          const id = `ai-weight-${scorer}`
          return (
            <div key={scorer}>
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <label
                  htmlFor={id}
                  className="font-display text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground"
                >
                  {meta.label}
                  <span className="ml-1.5 font-sans text-[9px] font-normal normal-case tracking-normal text-muted-foreground/60">
                    {meta.hint}
                  </span>
                </label>
                <span
                  className={cn(
                    "shrink-0 font-display text-xs font-bold tabular-nums",
                    overridden ? "text-gold" : "text-muted-foreground",
                  )}
                >
                  {current}
                </span>
              </div>
              <input
                id={id}
                type="range"
                min={meta.min}
                max={meta.max}
                step={meta.step}
                value={current}
                onChange={(e) => setWeight(scorer, Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-gold"
              />
            </div>
          )
        })}
      </div>
    </Panel>
  )
}
