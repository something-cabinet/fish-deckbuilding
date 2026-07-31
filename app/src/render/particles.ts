import { Graphics } from 'pixi.js';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: number;
}

export interface BurstOptions {
  speed?: number;
  size?: number;
  life?: number;
}

export const MAX_PARTICLES = 300;
export const BURST_CAP = 24;

/**
 * Hand-rolled particle pool on a single shared Graphics (lib-2 verdict:
 * NO @pixi/particle-emitter — v7-locked; NO Matter.js — hand springs suffice).
 * Vector particles match the desk aesthetic; suppressed entirely under
 * prefers-reduced-motion (the renderer gates spawns).
 */
export class ParticlePool {
  private particles: Particle[] = [];
  private readonly graphics: Graphics;

  constructor(graphics: Graphics) {
    this.graphics = graphics;
  }

  get count(): number {
    return this.particles.length;
  }

  /** Spawn a burst at (x, y); capped at BURST_CAP and MAX_PARTICLES total. */
  spawnBurst(x: number, y: number, color: number, count: number, opts: BurstOptions = {}): void {
    if (count <= 0 || this.particles.length >= MAX_PARTICLES) return;
    const n = Math.min(count, BURST_CAP, MAX_PARTICLES - this.particles.length);
    for (let i = 0; i < n; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (opts.speed ?? 120) * (0.5 + Math.random() * 0.8);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60, // upward bias
        life: opts.life ?? 500,
        maxLife: opts.life ?? 500,
        size: opts.size ?? 3,
        color,
      });
    }
  }

  /** Advance physics: gravity + drag + life. Frame-rate independent via dtMs. */
  update(dtMs: number): void {
    const dt = dtMs / 1000;
    for (const p of this.particles) {
      p.life -= dtMs;
      p.vx *= 0.96;
      p.vy = p.vy * 0.96 + 320 * dt; // gravity
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    if (this.particles.some((p) => p.life <= 0)) {
      this.particles = this.particles.filter((p) => p.life > 0);
    }
  }

  /** Redraw all live particles into the shared Graphics (batched in one draw call). */
  draw(): void {
    const g = this.graphics;
    g.clear();
    for (const p of this.particles) {
      const alpha = Math.max(0, Math.min(1, p.life / p.maxLife));
      g.circle(p.x, p.y, p.size).fill({ color: p.color, alpha });
    }
  }

  clear(): void {
    this.particles = [];
    this.graphics.clear();
  }
}
