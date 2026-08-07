"use client"

import { ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Shared chrome for the Game Design screens (library, card editor, enemy
 * designer) so headers, labels, chips and steppers stay identical across them.
 */

export function DesignHeader({
  icon: Icon,
  title,
  accent,
  onBack,
  backLabel = "Back",
  children,
}: {
  icon: React.ElementType
  title: string
  accent: string
  onBack: () => void
  backLabel?: string
  children?: React.ReactNode
}) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-white/10 bg-ocean-deep/80 px-4 backdrop-blur-sm">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1.5 font-display text-xs font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:border-gold/40 hover:text-gold"
      >
        <ArrowLeft size={14} />
        {backLabel}
      </button>
      <h1 className="flex items-center gap-2 font-display text-xl font-bold uppercase tracking-widest text-foreground">
        <Icon size={18} className="text-gold" />
        {title} <span className="text-gold">{accent}</span>
      </h1>
      {children && <div className="ml-auto flex min-w-0 items-center gap-2">{children}</div>}
    </header>
  )
}

/** Gold call-to-action, the single primary button on any design screen. */
export function PrimaryButton({
  onClick,
  disabled,
  className,
  children,
}: {
  onClick: () => void
  disabled?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 font-display text-xs font-bold uppercase tracking-widest transition-all",
        disabled
          ? "cursor-not-allowed bg-white/10 text-muted-foreground"
          : "bg-gold text-ocean-deep hover:scale-[1.03]",
        className,
      )}
    >
      {children}
    </button>
  )
}

/** Bordered group with a small-caps heading; the editors are built from these. */
export function Panel({
  title,
  children,
  className,
  bodyClassName,
}: {
  title?: string
  children: React.ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section className={cn("rounded-xl border border-white/10 bg-white/[0.03] p-3", className)}>
      {title && (
        <h2 className="mb-3 border-b border-white/10 pb-2 font-display text-base font-bold uppercase tracking-[0.08em] text-gold">
          {title}
        </h2>
      )}
      <div className={cn("space-y-3", bodyClassName)}>{children}</div>
    </section>
  )
}

/**
 * Labelled control. Pass `htmlFor` only for real form controls — button groups
 * must not sit inside a <label>, or clicking the caption toggles the first one.
 */
export function Field({
  label,
  htmlFor,
  hint,
  children,
  className,
}: {
  label: string
  htmlFor?: string
  hint?: string
  children: React.ReactNode
  className?: string
}) {
  const caption = (
    <>
      {label}
      {hint && (
        <span className="ml-1.5 font-sans text-xs font-normal normal-case tracking-normal text-muted-foreground">
          {hint}
        </span>
      )}
    </>
  )
  const captionClass =
    "mb-1.5 block font-display text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground"

  return (
    <div className={cn("min-w-0", className)}>
      {htmlFor ? (
        <label htmlFor={htmlFor} className={captionClass}>
          {caption}
        </label>
      ) : (
        <span className={captionClass}>{caption}</span>
      )}
      {children}
    </div>
  )
}

export const inputClass =
  "w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-gold/50"

export const selectClass =
  "rounded-md border border-white/10 bg-ocean-deep px-2 py-1.5 font-display text-xs font-bold uppercase tracking-wider text-foreground outline-none focus:border-gold/50"

export function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full px-3 py-1.5 font-display text-xs font-bold uppercase tracking-wider transition-colors",
        active
          ? "bg-gold text-ocean-deep"
          : "border border-white/10 text-muted-foreground hover:border-gold/40 hover:text-gold",
      )}
    >
      {children}
    </button>
  )
}

/** −/value/+ control. One size everywhere so stat rows line up. */
export function Stepper({
  value,
  min,
  max,
  onChange,
  label,
}: {
  value: number
  min: number
  max: number
  onChange: (v: number) => void
  label: string
}) {
  const btn =
    "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/10 font-display text-base font-bold text-foreground transition-colors hover:border-gold/40 hover:text-gold"
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        onClick={() => onChange(Math.max(min, value - 1))}
        className={btn}
      >
        −
      </button>
      <span className="flex h-8 w-11 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] font-display text-base font-bold text-gold">
        {value}
      </span>
      <button
        type="button"
        aria-label={`Increase ${label}`}
        onClick={() => onChange(Math.min(max, value + 1))}
        className={btn}
      >
        +
      </button>
    </div>
  )
}

/**
 * Sticky right-hand rail holding the live preview and the save action, shared
 * by both editors so they read as one tool.
 */
export function PreviewRail({
  children,
  action,
  note,
}: {
  children: React.ReactNode
  action: React.ReactNode
  note?: string
}) {
  return (
    <aside className="shrink-0 border-white/10 md:sticky md:top-0 md:w-[190px] md:self-start md:border-l md:pl-4">
      <div className="flex flex-col items-center gap-3">
        <span className="font-display text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Preview
        </span>
        {children}
        <div className="w-full max-w-[170px]">{action}</div>
        {note && <p className="max-w-[170px] text-center text-xs text-muted-foreground">{note}</p>}
      </div>
    </aside>
  )
}

/**
 * Grid used by both library tabs. Fixed 150px tracks (not 1fr) keep the gutters
 * identical at every width instead of stretching them on wide screens.
 */
export const libraryGridClass =
  "grid grid-cols-[repeat(auto-fill,150px)] justify-center gap-x-3 gap-y-4"

/** Header chip naming the record an editor is currently changing. */
export function EditingBadge({ name }: { name: string }) {
  return (
    <span className="max-w-[240px] truncate rounded-full border border-gold/30 bg-gold/10 px-3 py-1 font-display text-xs font-bold uppercase tracking-wider text-gold">
      Editing {name}
    </span>
  )
}

/** Centred message for an empty or fully-filtered library tab. */
export function EmptyState({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-20 text-center">
      <Icon size={28} className="text-muted-foreground/40" />
      <p className="font-display text-sm uppercase tracking-[0.2em] text-muted-foreground">{children}</p>
    </div>
  )
}

/** Small ghost button used for the per-tile Edit / Delete actions. */
export function TileAction({
  onClick,
  danger,
  label,
  className,
  children,
}: {
  onClick: () => void
  danger?: boolean
  /** accessible name for icon-only actions */
  label?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "flex items-center justify-center gap-1 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 font-display text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-colors",
        danger ? "hover:border-red-400/40 hover:text-red-400" : "hover:border-gold/40 hover:text-gold",
        className,
      )}
    >
      {children}
    </button>
  )
}
