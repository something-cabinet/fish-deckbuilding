"use client"

import { cn } from "@/lib/utils"

interface Props {
  /** Coin available to spend this turn. */
  coin: number
  /** True during the player's turn — dims the register when it's not. */
  active: boolean
}

/**
 * The Coin register — a miniature vintage cash register (navy body, ornate
 * gold trim, glowing cyan LCD) that replaces the old mana dial (spec D12).
 * Coin is the per-turn play resource; it does not ramp, so a literal
 * cash-register readout fits better than a fill gauge.
 */
export function CoinRegister({ coin, active }: Props) {
  // pad to two digits so the LCD keeps a stable width as coin fluctuates
  const digits = String(Math.max(0, coin)).padStart(2, "0").split("")

  return (
    <div
      className={cn("relative transition-opacity", !active && "opacity-50")}
      role="status"
      aria-label={`${coin} coin available this turn`}
    >
      {/* gold crest on top */}
      <div
        aria-hidden
        className="absolute -top-1.5 left-1/2 h-2.5 w-10 -translate-x-1/2 rounded-t-md border border-b-0 border-gold/70 bg-gradient-to-b from-gold/80 to-gold/40"
      />

      {/* register body — navy with ornate gold frame */}
      <div className="relative flex h-16 flex-col rounded-lg border-2 border-gold/70 bg-gradient-to-b from-[oklch(0.32_0.06_255)] via-[oklch(0.26_0.05_255)] to-[oklch(0.2_0.04_258)] px-2 pb-1.5 pt-2 shadow-[0_2px_8px_oklch(0_0_0/0.5),inset_0_1px_0_oklch(1_0_0/0.12)]">
        {/* corner rivets */}
        <span aria-hidden className="absolute left-1 top-1 h-1 w-1 rounded-full bg-gold/80 shadow-[0_0_2px_oklch(0.75_0.15_85)]" />
        <span aria-hidden className="absolute right-1 top-1 h-1 w-1 rounded-full bg-gold/80 shadow-[0_0_2px_oklch(0.75_0.15_85)]" />

        {/* LCD panel — dark teal screen, glowing cyan digits */}
        <div className="flex flex-1 items-center justify-center gap-1 rounded-sm border border-gold/40 bg-[oklch(0.18_0.05_200)] px-1.5 shadow-[inset_0_2px_6px_oklch(0_0_0/0.6)]">
          {digits.map((d, i) => (
            <span
              key={i}
              aria-hidden
              className="font-mono text-2xl font-bold leading-none text-[oklch(0.85_0.13_195)] tabular-nums [text-shadow:0_0_6px_oklch(0.8_0.15_195/0.9),0_0_14px_oklch(0.7_0.15_195/0.5)]"
            >
              {d}
            </span>
          ))}
          <span className="ml-1 font-display text-[7px] uppercase tracking-widest text-[oklch(0.65_0.08_200)]">
            Coin
          </span>
        </div>

        {/* drawer — gold rail with keyhole */}
        <div aria-hidden className="mt-1 flex items-center justify-center gap-1.5">
          <span className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/60 to-gold/60" />
          <span className="h-1.5 w-1.5 rounded-full border border-gold/70 bg-[oklch(0.15_0.03_258)]" />
          <span className="h-px flex-1 bg-gradient-to-l from-transparent via-gold/60 to-gold/60" />
        </div>
      </div>

      {/* crank handle on the side */}
      <div
        aria-hidden
        className="absolute -right-2 top-1/2 h-6 w-1.5 -translate-y-1/2 rounded-r-sm border border-l-0 border-gold/60 bg-gradient-to-b from-gold/50 to-gold/25"
      />
    </div>
  )
}
