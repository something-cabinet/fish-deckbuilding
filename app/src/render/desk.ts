import { Application, Container, Graphics, Point } from 'pixi.js';
import type { EngineEvent, GameSnapshot, GridPos } from '../engine/contract';
import { GRID_COLS, GRID_ROWS } from '../engine/contract';
import { damageOccurrences, diffSnapshots } from './snapshot-diff';
import { ParticlePool } from './particles';
import { UnitView, TOKENS } from './units';

export interface DeskCallbacks {
  onCellClick?: (pos: GridPos) => void;
  onCellHover?: (pos: GridPos | null) => void;
}

/**
 * The VU-Meter Desk canvas layer: 9×5 ivory patch field in a steel frame,
 * unit instruments (channel strips with ballistic HP needles), jack-point
 * highlights for valid targets, and hand-rolled vector particles.
 *
 * Single-input discipline (Gate 2): the ONLY data path in is applySnapshot
 * (full snapshot) + applyEvent (transient flourishes). All HP visuals derive
 * from the snapshot diff — never from per-card events.
 */
export class DeskRenderer {
  private app: Application | null = null;
  private host: HTMLElement | null = null;
  private reduced = false;
  private lastSnap: GameSnapshot | null = null;
  private cellSize = 48;
  private originX = 0;
  private originY = 0;
  private unitViews = new Map<string, UnitView>();
  private readonly tmp = new Point();
  private readonly gridLayer = new Container();
  private readonly highlightLayer = new Graphics();
  private readonly unitLayer = new Container();
  private readonly fxLayer = new Graphics();
  private readonly particles = new ParticlePool(this.fxLayer);
  private readonly reducedQuery: MediaQueryList | null =
    typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  private callbacks: DeskCallbacks = {};
  private disposed = false;

  async mount(host: HTMLElement, callbacks: DeskCallbacks = {}): Promise<void> {
    this.host = host;
    this.callbacks = callbacks;
    this.reduced = this.reducedQuery?.matches ?? false;
    this.reducedQuery?.addEventListener('change', this.onReducedChange);

    const app = new Application();
    await app.init({
      width: host.clientWidth || 900,
      height: host.clientHeight || 500,
      background: TOKENS.walnut,
      antialias: true,
      resolution: window.devicePixelRatio,
      autoDensity: true,
      resizeTo: host,
    });
    // destroy() may have raced the async init (HMR/$effect cleanup)
    if (this.disposed) {
      app.destroy(true, true);
      return;
    }
    this.app = app;
    host.appendChild(app.canvas);
    // P0-2: the desk-frame root and canvas-host wrapper are pointer-events:
    // none — the canvas itself must be interactive (NFR-6 exemption)
    app.canvas.style.pointerEvents = 'auto';
    app.stage.addChild(this.gridLayer, this.highlightLayer, this.unitLayer, this.fxLayer);

    app.stage.eventMode = 'static';
    app.stage.on('pointermove', this.onPointerMove);
    app.stage.on('pointerdown', this.onPointerDown);
    app.renderer.on('resize', this.onResize);

    this.recompute();
    app.ticker.add(this.onTick);
  }

  destroy(): void {
    this.disposed = true;
    this.reducedQuery?.removeEventListener('change', this.onReducedChange);
    this.app?.destroy(true, true);
    this.app = null;
    this.unitViews.clear();
    this.lastSnap = null;
  }

  /** Clear all battle state — call before wiring a fresh controller (Restart, FR-7). */
  reset(): void {
    this.lastSnap = null;
    for (const view of this.unitViews.values()) view.destroy();
    this.unitViews.clear();
    this.particles.clear();
    this.highlightLayer.clear();
    this.gridLayer.removeChildren().forEach((c) => c.destroy());
    this.drawGrid();
  }

  /** The ONLY snapshot entry point — full-resync from the controller fan-out. */
  applySnapshot(snap: GameSnapshot): void {
    if (this.disposed) return;
    // IMPORTANT: capture prev BEFORE reassigning lastSnap (P1a — the
    // damage-burst bug class: diffing against the NEW snapshot kills it).
    const prevSnap = this.lastSnap;
    const diff = diffSnapshots(prevSnap, snap);
    this.lastSnap = snap;

    // spawn/remove unit views
    const seen = new Set<string>();
    for (const u of snap.units) {
      seen.add(u.uid);
      let view = this.unitViews.get(u.uid);
      if (!view) {
        view = new UnitView(u.uid, u.faction, this.cellSize * 0.3);
        this.unitLayer.addChild(view);
        this.unitViews.set(u.uid, view);
        view.snapHp(u.hp, u.maxHp); // no swing-in from full HP on spawn
      }
      const change = diff.units.find((c) => c.uid === u.uid);
      if (change?.added) {
        this.burst(this.cellCenter(u.pos).x, this.cellCenter(u.pos).y, TOKENS.brassLight, 10, { size: 3 });
      }
      view.position.set(this.cellCenter(u.pos).x, this.cellCenter(u.pos).y);
      view.setHpTarget(u.hp, u.maxHp);
      view.sync(u);
    }
    for (const [uid, view] of this.unitViews) {
      if (!seen.has(uid)) {
        this.burst(view.position.x, view.position.y, TOKENS.red, 16, { size: 4 });
        this.unitLayer.removeChild(view);
        this.unitViews.delete(uid);
      }
    }

    // damage visuals drive off the diff ONLY (Gate 2 P2) — no double-bursting
    // with the unit-attacked event
    for (const occ of damageOccurrences(prevSnap, snap)) {
      const u = snap.units.find((x) => x.uid === occ.uid);
      if (u) this.spawnDamageBurst(u);
    }

    this.drawHighlights(snap);
  }

  /** Transient flourish events (movement, card plays, sells). */
  applyEvent(ev: EngineEvent): void {
    if (this.disposed) return;
    if (ev.kind === 'card-played') {
      const c = this.cellCenter(ev.pos);
      this.burst(c.x, c.y, TOKENS.brassLight, 10, { size: 2 });
    }
  }

  /** Raycast canvas-relative screen coords → grid cell (e.global space). */
  screenToCellScreen(screenX: number, screenY: number): GridPos | null {
    if (!this.app) return null;
    const local = this.app.stage.toLocal({ x: screenX, y: screenY }, undefined, this.tmp);
    const col = Math.floor((local.x - this.originX) / this.cellSize);
    const row = Math.floor((local.y - this.originY) / this.cellSize);
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return null;
    return { x: col, y: row };
  }

  /** Raycast viewport client coords (DOM event clientX/clientY) → grid cell. */
  screenToCell(clientX: number, clientY: number): GridPos | null {
    if (!this.app || !this.host) return null;
    const rect = this.host.getBoundingClientRect();
    return this.screenToCellScreen(clientX - rect.left, clientY - rect.top);
  }

  // -------------------------------------------------------------------------
  private onReducedChange = (): void => {
    this.reduced = this.reducedQuery?.matches ?? false;
  };

  private onResize = (): void => {
    this.recompute();
  };

  private onTick = (ticker: { deltaMS: number }): void => {
    const dt = ticker.deltaMS;
    for (const view of this.unitViews.values()) {
      view.update(dt, this.reduced);
      view.drawHpBar(this.cellSize * 0.7);
    }
    this.particles.update(dt);
    this.particles.draw();
  };

  private onPointerMove = (e: { global: Point }): void => {
    const cell = this.screenToCellScreen(e.global.x, e.global.y);
    this.callbacks.onCellHover?.(cell);
  };

  private onPointerDown = (e: { global: Point }): void => {
    const cell = this.screenToCellScreen(e.global.x, e.global.y);
    if (cell) this.callbacks.onCellClick?.(cell);
  };

  private recompute(): void {
    if (!this.app || !this.host) return;
    const w = this.host.clientWidth || 900;
    const h = this.host.clientHeight || 500;
    this.cellSize = Math.max(24, Math.min(w / (GRID_COLS + 2), h / (GRID_ROWS + 3)));
    this.originX = (w - this.cellSize * GRID_COLS) / 2;
    this.originY = (h - this.cellSize * GRID_ROWS) / 2;
    this.drawGrid();
    // reposition existing unit views on resize (P2a)
    if (this.lastSnap) {
      for (const u of this.lastSnap.units) {
        const view = this.unitViews.get(u.uid);
        if (view) view.position.set(this.cellCenter(u.pos).x, this.cellCenter(u.pos).y);
      }
      this.drawHighlights(this.lastSnap);
    }
  }

  private drawGrid(): void {
    const g = this.gridLayer;
    g.removeChildren().forEach((c) => c.destroy());
    // steel frame
    const frame = new Graphics();
    frame
      .roundRect(this.originX - 8, this.originY - 8, this.cellSize * GRID_COLS + 16, this.cellSize * GRID_ROWS + 16, 6)
      .fill(TOKENS.steel);
    g.addChild(frame);
    // ivory patch field + hairline ticks
    const field = new Graphics();
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const x = this.originX + col * this.cellSize;
        const y = this.originY + row * this.cellSize;
        field
          .roundRect(x + 1, y + 1, this.cellSize - 2, this.cellSize - 2, 3)
          .fill(TOKENS.ivory)
          .stroke({ width: 1, color: TOKENS.ivoryDim });
      }
    }
    g.addChild(field);
  }

  private drawHighlights(snap: GameSnapshot): void {
    const g = this.highlightLayer;
    g.clear();
    const size = this.cellSize;

    // move-valid: circular socket + chevron (green-blue)
    for (const p of snap.validMoves) {
      const c = this.cellCenter(p);
      g.circle(c.x, c.y, size * 0.36).fill({ color: TOKENS.move, alpha: 0.25 });
      g.circle(c.x, c.y, size * 0.36).stroke({ width: 2, color: TOKENS.moveLight });
      // chevron pointing outward from selection
      const sel = snap.units.find((u) => u.uid === snap.selectedUnitUid);
      if (sel) {
        const dx = p.x - sel.pos.x;
        const dy = p.y - sel.pos.y;
        const len = Math.max(1, Math.abs(dx) + Math.abs(dy));
        const ux = (dx / len) * size * 0.12;
        const uy = (dy / len) * size * 0.12;
        g.moveTo(c.x + ux * 0.6, c.y + uy * 0.6)
          .lineTo(c.x + ux * 1.6, c.y + uy * 1.6)
          .stroke({ width: 2, color: TOKENS.moveLight });
      }
    }
    // attack-valid: split-ring (ink/brass)
    for (const uid of snap.validAttackTargets) {
      const u = snap.units.find((x) => x.uid === uid);
      if (!u) continue;
      const c = this.cellCenter(u.pos);
      g.arc(c.x, c.y, size * 0.42, 0.3, Math.PI - 0.3).stroke({ width: 3, color: TOKENS.brass });
      g.arc(c.x, c.y, size * 0.42, Math.PI + 0.3, Math.PI * 2 - 0.3).stroke({ width: 3, color: TOKENS.brass });
    }
    // active card targets: jack points (socket for cells, ring for units)
    if (snap.activeCardTargets && snap.activeCardUid) {
      for (const p of snap.activeCardTargets.validCells) {
        const c = this.cellCenter(p);
        const isUnitCell = snap.activeCardTargets.validUnitUids.some((uid) => {
          const u = snap.units.find((x) => x.uid === uid);
          return u && u.pos.x === p.x && u.pos.y === p.y;
        });
        if (isUnitCell) {
          g.arc(c.x, c.y, size * 0.4, 0.4, Math.PI - 0.4).stroke({ width: 2.5, color: TOKENS.amber });
          g.arc(c.x, c.y, size * 0.4, Math.PI + 0.4, Math.PI * 2 - 0.4).stroke({ width: 2.5, color: TOKENS.amber });
        } else {
          g.circle(c.x, c.y, size * 0.32).fill({ color: TOKENS.move, alpha: 0.3 });
          g.circle(c.x, c.y, size * 0.32).stroke({ width: 2, color: TOKENS.moveLight });
        }
      }
    }
  }

  private cellCenter(p: GridPos): Point {
    return new Point(this.originX + (p.x + 0.5) * this.cellSize, this.originY + (p.y + 0.5) * this.cellSize);
  }

  /** Reduced-motion-gated particle spawn (P1b — suppressed entirely under reduce). */
  private burst(x: number, y: number, color: number, count: number, opts: { size?: number; speed?: number } = {}): void {
    if (this.reduced) return;
    this.particles.spawnBurst(x, y, color, count, opts);
  }

  private spawnDamageBurst(u: { pos: GridPos }): void {
    const c = this.cellCenter(u.pos);
    this.burst(c.x, c.y, TOKENS.red, 12, { size: 3, speed: 160 });
  }
}
