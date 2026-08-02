"use client"

export interface ArrowState {
  fromX: number
  fromY: number
  toX: number
  toY: number
  valid: boolean
}

/**
 * A cursor-following targeting arrow (Hearthstone-style). Renders a curved
 * quadratic bezier from a source anchor (card slot or unit token) to the live
 * cursor position, with an arrowhead rotated to the curve tangent. Gold when
 * hovering a valid target, red when not. Used for both click-armed card casts
 * and drag-to-target unit attacks.
 */
export function TargetingArrow({ fromX, fromY, toX, toY, valid }: ArrowState) {
  const dx = toX - fromX
  const dy = toY - fromY
  const dist = Math.hypot(dx, dy) || 1

  // arc the curve upward so it reads as a lobbed "throw"
  const curve = Math.min(dist * 0.3, 170)
  const cx = (fromX + toX) / 2
  const cy = (fromY + toY) / 2 - curve

  // tangent at the end of a quadratic bezier points from control -> end
  const angle = (Math.atan2(toY - cy, toX - cx) * 180) / Math.PI

  const color = valid ? "var(--gold)" : "var(--enemy)"
  const path = `M ${fromX} ${fromY} Q ${cx} ${cy} ${toX} ${toY}`

  return (
    <svg
      className="pointer-events-none fixed inset-0 z-[55] h-full w-full"
      aria-hidden="true"
      style={{ opacity: valid ? 1 : 0.75 }}
    >
      {/* soft outer glow */}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={16}
        strokeLinecap="round"
        opacity={0.2}
        style={{ filter: `drop-shadow(0 0 10px ${color})` }}
      />
      {/* flowing dashed core */}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={5}
        strokeLinecap="round"
        strokeDasharray="3 13"
        className="animate-fm-arrow-flow"
        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
      />
      {/* origin nub */}
      <circle cx={fromX} cy={fromY} r={7} fill={color} opacity={0.85} />
      {/* arrowhead at the cursor */}
      <g transform={`translate(${toX} ${toY}) rotate(${angle})`}>
        <polygon
          points="4,0 -24,-13 -15,0 -24,13"
          fill={color}
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </g>
    </svg>
  )
}
