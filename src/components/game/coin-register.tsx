"use client"

import { Coins } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  /** Coin available to spend this turn. */
  coin: number
  /** True during the player's turn — dims the register when it's not. */
  active: boolean
}

/**
 * The Coin register — a segmented-digit readout that replaces the old mana
 * dial (spec D12). Coin is the per-turn play resource; it does not ramp, so a
 * literal cash-register display fits better than a fill gauge.
 */
export function CoinRegister({ coin, active }: Props) {
  // pad to two digits so the register keeps a stable width as coin fluctuates
  const digits = String(Math.max(0, coin)).padStart(2, "0").split("")

  return (
    <div
      className={cn(
        "flex h-16 items-center gap-2 rounded-lg border border-gold/40 bg-ocean-deep px-2.5 shadow-inner transition-opacity",
        !active && "opacity-50",
      )}
      role="status"
      aria-label={`${coin} coin available this turn`}
    >
      <Coins size={18} className="text-gold" aria-hidden />
      <div className="flex items-stretch gap-1" aria-hidden>
        {digits.map((d, i) => (
          <span
            key={i}
            className="flex h-9 w-6 items-center justify-center rounded border border-gold/25 bg-[oklch(0.22_0.03_248)] font-mono text-xl font-bold leading-none text-gold tabular-nums shadow-[inset_0_-2px_0_oklch(0_0_0/0.35)]"
          >
            {d}
          </span>
        ))}
      </div>
      <span className="font-display text-[8px] uppercase tracking-widest text-muted-foreground">Coin</span>
    </div>
  )
}
