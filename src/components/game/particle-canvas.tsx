"use client"

import { useEffect, useRef } from "react"
import { COLS, ROWS, type FxEvent } from "@/lib/game/battle"

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
  size: number
  color: string
  gravity: number
  shape: "dot" | "square" | "ring" | "spark" | "plus"
  spin: number
  rot: number
}

interface Projectile {
  x: number
  y: number
  tx: number
  ty: number
  t: number
  speed: number
  color: string
  trail: string
  onArrive: (x: number, y: number) => void
}

const COLORS = {
  gold: "#eab74a",
  goldLight: "#f7d98a",
  paper: "#e9e2cf",
  teal: "#5fd0d6",
  red: "#e5533c",
  redDeep: "#b23a28",
  green: "#5fd08a",
  white: "#ffffff",
  ink: "#2a3550",
}

export function ParticleCanvas({ fx }: { fx: FxEvent[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particles = useRef<Particle[]>([])
  const projectiles = useRef<Projectile[]>([])
  const processed = useRef<Set<number>>(new Set())
  const size = useRef({ w: 0, h: 0, dpr: 1 })
  const raf = useRef(0)

  // grid -> pixel
  const toPx = (gx: number, gy: number) => ({
    x: ((gx + 0.5) / COLS) * size.current.w,
    y: ((gy + 0.5) / ROWS) * size.current.h,
  })

  const spawnBurst = (
    x: number,
    y: number,
    count: number,
    colors: string[],
    opts: Partial<Particle> & { speed?: number } = {},
  ) => {
    const speed = opts.speed ?? 3
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2
      const sp = speed * (0.4 + Math.random() * 0.9)
      particles.current.push({
        x,
        y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp - (opts.gravity ? 1.5 : 0),
        life: 0,
        max: opts.max ?? 40 + Math.random() * 20,
        size: opts.size ?? 2 + Math.random() * 3,
        color: colors[(Math.random() * colors.length) | 0],
        gravity: opts.gravity ?? 0,
        shape: opts.shape ?? "dot",
        spin: (Math.random() - 0.5) * 0.3,
        rot: Math.random() * Math.PI,
      })
    }
  }

  const spawnRings = (x: number, y: number, color: string, n = 3) => {
    for (let i = 0; i < n; i++) {
      particles.current.push({
        x,
        y,
        vx: 0,
        vy: 0,
        life: -i * 6,
        max: 34,
        size: 6,
        color,
        gravity: 0,
        shape: "ring",
        spin: 0,
        rot: 0,
      })
    }
  }

  const handleEvent = (e: FxEvent) => {
    const to = e.to ? toPx(e.to.x, e.to.y) : null
    const from = e.from ? toPx(e.from.x, e.from.y) : null
    switch (e.kind) {
      case "letter": {
        if (from && to) {
          projectiles.current.push({
            x: from.x,
            y: from.y,
            tx: to.x,
            ty: to.y,
            t: 0,
            speed: 0.06,
            color: COLORS.paper,
            trail: COLORS.paper,
            onArrive: (x, y) => spawnBurst(x, y, 18, [COLORS.paper, COLORS.white], { shape: "square", gravity: 0.12, speed: 4 }),
          })
        } else if (to) {
          spawnBurst(to.x, to.y, 18, [COLORS.paper, COLORS.white], { shape: "square", gravity: 0.12 })
        }
        break
      }
      case "phone": {
        if (to) {
          spawnRings(to.x, to.y, COLORS.teal, 3)
          spawnBurst(to.x, to.y, 16, [COLORS.teal, COLORS.white], { shape: "spark", speed: 4 })
        }
        break
      }
      case "gavel": {
        if (to) {
          spawnRings(to.x, to.y, COLORS.gold, 2)
          spawnBurst(to.x, to.y, 34, [COLORS.gold, COLORS.goldLight, COLORS.white], {
            shape: "square",
            gravity: 0.18,
            speed: 6,
            max: 55,
          })
        }
        break
      }
      case "shock":
      case "melee": {
        if (to) {
          spawnBurst(to.x, to.y, 22, [COLORS.red, COLORS.redDeep, COLORS.white], {
            shape: "spark",
            speed: 5,
          })
          spawnRings(to.x, to.y, COLORS.red, 1)
        }
        break
      }
      case "coin": {
        if (to) spawnBurst(to.x, to.y, 16, [COLORS.gold, COLORS.goldLight], { shape: "dot", gravity: 0.22, speed: 4 })
        break
      }
      case "heal": {
        if (to) spawnBurst(to.x, to.y, 16, [COLORS.green, COLORS.white], { shape: "plus", gravity: -0.05, speed: 2 })
        break
      }
      case "draw": {
        if (to) spawnBurst(to.x, to.y, 14, [COLORS.gold, COLORS.white], { shape: "spark", speed: 3 })
        break
      }
      case "summon": {
        if (to) {
          spawnRings(to.x, to.y, COLORS.teal, 3)
          spawnBurst(to.x, to.y, 22, [COLORS.teal, COLORS.white], { shape: "dot", speed: 4 })
        }
        break
      }
      case "move": {
        if (to) spawnBurst(to.x, to.y, 8, ["#9fc7e8", "#ffffff"], { shape: "dot", gravity: -0.04, speed: 1.5, max: 30 })
        break
      }
      case "death": {
        if (to) {
          spawnBurst(to.x, to.y, 40, [COLORS.ink, COLORS.redDeep, "#8fb6d8"], { shape: "dot", speed: 5, max: 60 })
          spawnRings(to.x, to.y, "#8fb6d8", 2)
        }
        break
      }
    }
  }

  // detect new fx events
  useEffect(() => {
    for (const e of fx) {
      if (processed.current.has(e.id)) continue
      processed.current.add(e.id)
      handleEvent(e)
    }
    // trim processed set occasionally
    if (processed.current.size > 400) processed.current = new Set()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fx])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")!

    const resize = () => {
      const parent = canvas.parentElement!
      const rect = parent.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      size.current = { w: rect.width, h: rect.height, dpr }
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas.parentElement!)

    const loop = () => {
      const { w, h } = size.current
      ctx.clearRect(0, 0, w, h)

      // projectiles
      const nextProj: Projectile[] = []
      for (const p of projectiles.current) {
        p.t += p.speed
        const x = p.x + (p.tx - p.x) * p.t
        const y = p.y + (p.ty - p.y) * p.t - Math.sin(p.t * Math.PI) * 24
        ctx.save()
        ctx.globalAlpha = 0.9
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.rect(x - 4, y - 3, 8, 6)
        ctx.fill()
        ctx.strokeStyle = "rgba(0,0,0,0.25)"
        ctx.strokeRect(x - 4, y - 3, 8, 6)
        ctx.restore()
        if (p.t >= 1) p.onArrive(p.tx, p.ty)
        else nextProj.push(p)
      }
      projectiles.current = nextProj

      // particles
      const next: Particle[] = []
      for (const p of particles.current) {
        p.life += 1
        if (p.life < 0) {
          next.push(p)
          continue
        }
        p.x += p.vx
        p.y += p.vy
        p.vy += p.gravity
        p.vx *= 0.96
        p.vy *= 0.98
        p.rot += p.spin
        const t = p.life / p.max
        if (t >= 1) continue
        const alpha = 1 - t
        ctx.save()
        ctx.globalAlpha = Math.max(0, alpha)
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillStyle = p.color
        if (p.shape === "ring") {
          const r = 6 + t * 26
          ctx.globalAlpha = Math.max(0, alpha * 0.8)
          ctx.strokeStyle = p.color
          ctx.lineWidth = 2.5
          ctx.beginPath()
          ctx.arc(0, 0, r, 0, Math.PI * 2)
          ctx.stroke()
        } else if (p.shape === "square") {
          ctx.fillRect(-p.size, -p.size, p.size * 2, p.size * 2)
        } else if (p.shape === "spark") {
          ctx.fillRect(-p.size * 0.4, -p.size * 1.6, p.size * 0.8, p.size * 3.2)
        } else if (p.shape === "plus") {
          ctx.fillRect(-p.size * 1.5, -p.size * 0.5, p.size * 3, p.size)
          ctx.fillRect(-p.size * 0.5, -p.size * 1.5, p.size, p.size * 3)
        } else {
          ctx.beginPath()
          ctx.arc(0, 0, p.size, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
      }
      particles.current = next

      raf.current = requestAnimationFrame(loop)
    }
    raf.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf.current)
      ro.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-30"
    />
  )
}
