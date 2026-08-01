// P4 render layer: PixiJS board renderer with the locked motion pass.
//
// Consumes engine snapshots (D9 — engine is the single source of truth; render
// never duplicates rules) + render tokens/art from the designer lane. Motion
// follows the animate thesis (deepwork state file): walk 300ms/tile easeOutCubic,
// floating numbers 0.6–1.2s with 150ms merge window, ≥7 damage = 350ms shake +
// 2.5% zoom (non-stacking), authored telegraph entrance 650ms, story end-scenes
// 650ms. EVERY tween branches on `motionEnabled` (prefers-reduced-motion → instant).
// Input never blocked (D4): hit-testing reads snapshot positions, not view tweens.

import { Application, Container, Graphics, Rectangle, Text } from 'pixi.js';
import type { FederatedPointerEvent, Ticker } from 'pixi.js';
import { GRID_COLS, GRID_ROWS, MOVE_BUDGET } from '../engine/contract';
import type { GameEvent, GameSnapshot, GridPos, Phase, Unit, Winner } from '../engine/contract';
import { attackableTargets, inBounds, isAdjacent, key, parseKey, reachableTiles } from '../engine/grid';
import { diffSnapshots } from './snapshot-diff';
import type { SnapshotDiff } from './snapshot-diff';
import { TOKENS } from './tokens';
import { drawBalloonMark, drawBowlMark, drawIntentBadge, drawTile, drawUnitSprite } from './art';
import {
  BADGE_ENTER_MS,
  DRAMA_THRESHOLD,
  easeOutCubic,
  floatJitter,
  FLOAT_MS,
  FLOAT_RISE,
  MAX_TRANSIENTS,
  MERGE_WINDOW_MS,
  SHAKE_AMPLITUDE,
  SHAKE_MS,
  STORY_ENTER_MS,
  tweenDurationForTiles,
  tweenProgress,
  ZOOM_AMOUNT,
} from './motion';

const CANONICAL_UNIT_SIZE = 64; // unit art is authored at this size, then scaled
const DPR_CAP = 2; // devicePixelRatio capped at 2 (perf budget, NFR-2)
const HOVER_CLEAR_MS = 90; // hover previews clear within 100ms
const UNIT_FILL_RATIO = 0.78;
const ZOOM_IN_MS = 100; // focus zoom in 0.1s / out 0.25s
const ZOOM_OUT_MS = 250;

export interface DeskRenderer {
  mount(): void;
  destroy(): void;
  update(snapshot: GameSnapshot): void;
  handleEvent(e: GameEvent): void;
  /** Recompute layout from the host's current size (bridge forwards window resize). */
  handleResize(): void;
  readonly motionEnabled: boolean;
  /** Last computed snapshot diff (P4 consumes `moved` for the walk animation). */
  readonly diff: SnapshotDiff | null;
  /** Current alive-unit positions by uid (P4 convenience for continuity). */
  readonly lastPositions: ReadonlyMap<string, GridPos>;
  /** Convert client (page) coords into canvas-local coords; null when not mounted. */
  clientToLocal(clientX: number, clientY: number): { x: number; y: number } | null;
  /** Canvas-local coords → grid cell, or null when outside the 9×5 board. */
  tileAtPoint(localX: number, localY: number): GridPos | null;
  /** Canvas-local coords → uid of the living unit on that tile, or null. */
  unitAtPoint(localX: number, localY: number): string | null;
  /** World (canvas-local) coords of a tile's center. */
  tileCenter(pos: GridPos): { x: number; y: number };
}

interface UnitView {
  uid: string;
  root: Container;
  ring: Graphics;
  hpText: Text;
  blockText: Text;
}

interface HoverPreview {
  uid: string;
  color: 'move' | 'action';
  tiles: Set<string>;
}

interface WalkTween {
  uid: string;
  view: UnitView;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  start: number;
  duration: number;
}

interface FloatText {
  text: Text;
  start: number;
  x0: number;
  y0: number;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

function devicePixelRatioCapped(): number {
  const dpr = typeof window !== 'undefined' && window.devicePixelRatio ? window.devicePixelRatio : 1;
  return Math.min(dpr, DPR_CAP);
}

export function createDeskRenderer(host: HTMLElement): DeskRenderer {
  return new DeskRendererImpl(host);
}

class DeskRendererImpl implements DeskRenderer {
  readonly motionEnabled: boolean;

  private readonly host: HTMLElement;
  private app: Application | null = null;
  private ready = false;
  private mounted = false;
  private destroyed = false;
  private observer: ResizeObserver | null = null;

  // Camera wrapper: shake offsets + focus zoom apply to it, never to layout.
  private camera: Container | null = null;
  private readonly gridLayer = new Graphics();
  private readonly tileFxLayer = new Graphics();
  private readonly unitLayer = new Container();
  private readonly badgeLayer = new Container();
  private readonly floatLayer = new Container();
  private readonly storyLayer = new Container();

  private readonly unitViews = new Map<string, UnitView>();
  private latestSnapshot: GameSnapshot | null = null;
  private lastSnapshot: GameSnapshot | null = null;
  private _diff: SnapshotDiff | null = null;
  private readonly _lastPositions = new Map<string, GridPos>();

  private hover: HoverPreview | null = null;
  private hoverClearTimer: ReturnType<typeof setTimeout> | null = null;

  private tileSize = 0;
  private ox = 0;
  private oy = 0;

  // ---- motion state (P4) ----
  private readonly walkTweens = new Map<string, WalkTween>();
  private readonly floats: FloatText[] = [];
  private readonly pendingDamage = new Map<string, { total: number; timer: ReturnType<typeof setTimeout> }>();
  private shaking = false;
  private shakeStart = 0;
  private zoomStart = 0;
  private lastPhase: Phase | null = null;
  private lastWinner: Winner = null;
  private badgeEnterStart: number | null = null;
  private storyEnterStart: number | null = null;

  constructor(host: HTMLElement) {
    this.host = host;
    this.motionEnabled = !prefersReducedMotion();
  }

  mount(): void {
    if (this.mounted || this.destroyed) return;
    this.mounted = true;
    this.observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => this.handleResize()) : null;
    this.observer?.observe(this.host);
    this.app = new Application();
    void this.app
      .init({ antialias: true, backgroundAlpha: 0, resolution: devicePixelRatioCapped() })
      .then(() => this.onReady());
  }

  private onReady(): void {
    if (this.destroyed || !this.app) return;
    const app = this.app;
    app.stage.eventMode = 'static';
    // Camera wrapper for shake/zoom; layers paint: grid → tile fx → units →
    // badges → floats → story.
    this.camera = new Container();
    this.camera.eventMode = 'passive';
    app.stage.addChild(this.camera);
    this.camera.addChild(
      this.gridLayer,
      this.tileFxLayer,
      this.unitLayer,
      this.badgeLayer,
      this.floatLayer,
      this.storyLayer,
    );
    this.gridLayer.eventMode = 'none';
    this.tileFxLayer.eventMode = 'none';
    this.badgeLayer.eventMode = 'none';
    this.floatLayer.eventMode = 'none';
    this.storyLayer.eventMode = 'none';
    const canvas = app.canvas;
    canvas.style.display = 'block';
    canvas.style.position = 'absolute';
    canvas.style.inset = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    this.host.appendChild(canvas);
    this.host.querySelector('.board-placeholder')?.remove();
    this.ready = true;
    this.handleResize();
    app.ticker.add(this.tick);
    if (this.latestSnapshot) this.render(this.latestSnapshot);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.hoverClearTimer) {
      clearTimeout(this.hoverClearTimer);
      this.hoverClearTimer = null;
    }
    for (const p of this.pendingDamage.values()) clearTimeout(p.timer);
    this.pendingDamage.clear();
    this.walkTweens.clear();
    this.observer?.disconnect();
    this.observer = null;
    if (this.app) {
      this.app.ticker.remove(this.tick);
      this.app.destroy(true, { children: true, texture: true, textureSource: true, context: true });
      this.app = null;
    }
    this.unitViews.clear();
    this.floats.length = 0;
    this.ready = false;
    this.hover = null;
  }

  handleResize(): void {
    if (!this.ready || !this.app) return;
    const w = this.host.clientWidth;
    const h = this.host.clientHeight;
    if (!w || !h) return;
    const dpr = devicePixelRatioCapped();
    this.app.renderer.resize(w, h, dpr);
    const canvas = this.app.canvas;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    this.computeLayout(w, h);
    if (this.camera) {
      // Zoom pivots around the board center.
      this.camera.pivot.set(w / 2, h / 2);
      this.camera.position.set(w / 2, h / 2);
    }
    this.drawGrid();
    if (this.latestSnapshot) {
      this.reconcileUnits(this.latestSnapshot);
      this.renderBadges(this.latestSnapshot);
      this.renderStory(this.latestSnapshot);
      this.renderTileFx(this.latestSnapshot);
    }
  }

  update(snapshot: GameSnapshot): void {
    this.latestSnapshot = snapshot;
    this._diff = this.lastSnapshot ? diffSnapshots(this.lastSnapshot, snapshot) : null;
    this.lastSnapshot = snapshot;
    this._lastPositions.clear();
    for (const u of snapshot.units) {
      if (u.alive) this._lastPositions.set(u.uid, { x: u.pos.x, y: u.pos.y });
    }
    this.startWalkTweens(snapshot);
    this.spawnDamageFloats(snapshot);
    this.triggerDrama(snapshot);
    this.trackStoryEnter(snapshot);
    this.trackBadgeEnter(snapshot);
    if (this.ready) this.render(snapshot);
  }

  handleEvent(e: GameEvent): void {
    if (this.destroyed) return;
    // Block commitment pulse: when an attack lands on a shielded defender, pop
    // its block readout briefly (300ms) so commitment reads as accrual.
    if (e.type === 'attack-resolved') {
      const defender = this.latestSnapshot?.units.find((u) => u.uid === e.defenderUid);
      const view = defender ? this.unitViews.get(defender.uid) : undefined;
      if (view && defender && defender.block > 0 && this.motionEnabled) {
        view.blockText.scale.set(1.4, 1.4);
        setTimeout(() => {
          if (!this.destroyed) view.blockText.scale.set(1, 1);
        }, 300);
      }
    }
  }

  get diff(): SnapshotDiff | null {
    return this._diff;
  }

  get lastPositions(): ReadonlyMap<string, GridPos> {
    return this._lastPositions;
  }

  // ------------------------------------------------------------------ P3 hooks

  clientToLocal(clientX: number, clientY: number): { x: number; y: number } | null {
    if (!this.ready || !this.app) return null;
    const rect = this.app.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  tileAtPoint(localX: number, localY: number): GridPos | null {
    if (!this.ready || this.tileSize <= 0) return null;
    const gx = Math.floor((localX - this.ox) / this.tileSize);
    const gy = Math.floor((localY - this.oy) / this.tileSize);
    const p: GridPos = { x: gx, y: gy };
    return inBounds(p) ? p : null;
  }

  unitAtPoint(localX: number, localY: number): string | null {
    const tile = this.tileAtPoint(localX, localY);
    if (!tile || !this.latestSnapshot) return null;
    // Snapshot truth, not tween view — input never lags (D4).
    const u = this.latestSnapshot.units.find((x) => x.alive && x.pos.x === tile.x && x.pos.y === tile.y);
    return u ? u.uid : null;
  }

  tileCenter(pos: GridPos): { x: number; y: number } {
    return {
      x: this.ox + (pos.x + 0.5) * this.tileSize,
      y: this.oy + (pos.y + 0.5) * this.tileSize,
    };
  }

  // ------------------------------------------------------------- render internals

  private render(snapshot: GameSnapshot): void {
    this.reconcileUnits(snapshot);
    this.renderBadges(snapshot);
    this.renderStory(snapshot);
    this.renderTileFx(snapshot);
  }

  private computeLayout(w: number, h: number): void {
    this.tileSize = Math.min(w / GRID_COLS, h / GRID_ROWS);
    this.ox = (w - GRID_COLS * this.tileSize) / 2;
    this.oy = (h - GRID_ROWS * this.tileSize) / 2;
  }

  private drawGrid(): void {
    const g = this.gridLayer;
    g.clear();
    for (let x = 0; x < GRID_COLS; x++) {
      for (let y = 0; y < GRID_ROWS; y++) {
        drawTile(g, this.ox + x * this.tileSize, this.oy + y * this.tileSize, this.tileSize, this.tileSize, x, y);
      }
    }
    g.rect(this.ox, this.oy, GRID_COLS * this.tileSize, GRID_ROWS * this.tileSize).stroke({
      width: 1.5,
      color: TOKENS.colors.steel,
      alpha: 0.55,
    });
  }

  private reconcileUnits(snapshot: GameSnapshot | null): void {
    const seen = new Set<string>();
    const scale = (this.tileSize * UNIT_FILL_RATIO) / CANONICAL_UNIT_SIZE;
    for (const unit of snapshot?.units.filter((u) => u.alive) ?? []) {
      seen.add(unit.uid);
      let view = this.unitViews.get(unit.uid);
      if (!view) {
        view = this.createUnitView(unit);
        this.unitViews.set(unit.uid, view);
      }
      const c = this.tileCenter(unit.pos);
      // If a walk tween is running, the tick drives position; else place instantly.
      if (!this.walkTweens.has(unit.uid)) {
        view.root.position.set(c.x, c.y);
      }
      view.root.scale.set(scale, scale);
      view.root.visible = true;
      view.root.eventMode = 'static';
      view.hpText.text = String(unit.hp);
      view.blockText.visible = unit.block > 0;
      view.blockText.text = String(unit.block);
      this.drawSelectionRing(view, snapshot?.selectedUnitUid === unit.uid);
    }
    for (const [uid, view] of this.unitViews) {
      if (seen.has(uid)) continue;
      view.root.visible = false;
      view.root.eventMode = 'none';
    }
  }

  private createUnitView(unit: Unit): UnitView {
    const body = drawUnitSprite(unit, CANONICAL_UNIT_SIZE);
    body.eventMode = 'none';
    const root = new Container();
    root.eventMode = 'static';
    root.cursor = 'pointer';
    root.hitArea = new Rectangle(
      -CANONICAL_UNIT_SIZE / 2,
      -CANONICAL_UNIT_SIZE / 2,
      CANONICAL_UNIT_SIZE,
      CANONICAL_UNIT_SIZE,
    );
    root.addChild(body);

    const ring = new Graphics();
    ring.eventMode = 'none';
    root.addChild(ring);

    const hpText = new Text({
      text: String(unit.hp),
      style: {
        fontFamily: TOKENS.fonts.readout,
        fontSize: 16,
        fontWeight: '700',
        fill: TOKENS.colors.ivory,
      },
    });
    hpText.anchor.set(0.5, 0.5);
    hpText.position.set(0, CANONICAL_UNIT_SIZE / 2 - 9);

    const blockText = new Text({
      text: '',
      style: {
        fontFamily: TOKENS.fonts.readout,
        fontSize: 13,
        fontWeight: '700',
        fill: TOKENS.colors.moveLight,
      },
    });
    blockText.anchor.set(0.5, 0.5);
    blockText.position.set(0, -CANONICAL_UNIT_SIZE / 2 + 9);

    root.addChild(hpText, blockText);
    root.on('pointerover', (e: FederatedPointerEvent) => this.hoverUnit(unit.uid, e));
    root.on('pointerout', () => this.scheduleHoverClear());
    this.unitLayer.addChild(root);
    return { uid: unit.uid, root, ring, hpText, blockText };
  }

  private drawSelectionRing(view: UnitView, selected: boolean): void {
    const r = view.ring;
    r.clear();
    if (!selected) return;
    const half = CANONICAL_UNIT_SIZE / 2 + 4;
    r.roundRect(-half, -half, half * 2, half * 2, 10).stroke({
      width: 3,
      color: TOKENS.colors.move,
      alpha: 0.9,
    });
  }

  private renderBadges(snapshot: GameSnapshot): void {
    clearLayer(this.badgeLayer);
    for (const intent of snapshot.enemyIntents) {
      const u = snapshot.units.find((x) => x.uid === intent.unitUid && x.alive);
      if (!u) continue;
      const badge = drawIntentBadge(intent, u, this.tileSize);
      badge.eventMode = 'none';
      // Authored telegraph entrance: fade/scale in when entering the enemy phase.
      if (this.badgeEnterStart !== null && this.motionEnabled) {
        const p = tweenProgress(this.badgeEnterStart, BADGE_ENTER_MS, performance.now());
        const e = easeOutCubic(p);
        badge.alpha = e;
        badge.scale.set(0.6 + 0.4 * e, 0.6 + 0.4 * e);
      }
      const c = this.tileCenter(u.pos);
      badge.position.set(c.x, c.y - this.tileSize * 0.6);
      this.badgeLayer.addChild(badge);
    }
  }

  private renderStory(snapshot: GameSnapshot): void {
    clearLayer(this.storyLayer);
    if (!snapshot.winner) return;
    const mark =
      snapshot.winner === 'player' ? drawBowlMark(this.tileSize) : drawBalloonMark(this.tileSize);
    mark.eventMode = 'none';
    const cx = this.ox + (GRID_COLS * this.tileSize) / 2;
    const cy = this.oy + (GRID_ROWS * this.tileSize) / 2 - this.tileSize * 1.2;
    // Story entrance: defeat balloon descends from above; victory bowl rises.
    if (this.storyEnterStart !== null && this.motionEnabled) {
      const p = tweenProgress(this.storyEnterStart, STORY_ENTER_MS, performance.now());
      const e = easeOutCubic(p);
      mark.alpha = e;
      if (snapshot.winner === 'enemy') {
        mark.position.set(cx, cy - this.tileSize * 2.2 * (1 - e));
      } else {
        mark.position.set(cx, cy + this.tileSize * 1.6 * (1 - e));
      }
    } else {
      mark.position.set(cx, cy);
    }
    this.storyLayer.addChild(mark);
  }

  private renderTileFx(snapshot: GameSnapshot): void {
    const fx = this.tileFxLayer;
    fx.clear();
    if (this.tileSize <= 0) return;

    const validMoves = new Set(snapshot.validMoves.map(key));
    const attackTargets = new Set<string>();
    for (const uid of snapshot.validAttackTargets) {
      const u = snapshot.units.find((x) => x.uid === uid && x.alive);
      if (u) attackTargets.add(key(u.pos));
    }
    const danger = new Set<string>();
    for (const intent of snapshot.enemyIntents) {
      if (intent.kind !== 'attack') continue;
      const attacker = snapshot.units.find((x) => x.uid === intent.unitUid && x.alive);
      if (!attacker) continue;
      for (const t of attackableTargets(snapshot.units, attacker)) danger.add(key(t.pos));
      if (intent.targetUid) {
        const target = snapshot.units.find((x) => x.uid === intent.targetUid && x.alive);
        if (target) danger.add(key(target.pos));
      }
    }

    for (let x = 0; x < GRID_COLS; x++) {
      for (let y = 0; y < GRID_ROWS; y++) {
        const k = key({ x, y });
        const c = this.tileCenter({ x, y });
        if (validMoves.has(k)) {
          fillTile(fx, c, this.tileSize, TOKENS.colors.move, 0.3, this.tileSize * 0.08);
        } else if (attackTargets.has(k)) {
          fillTile(fx, c, this.tileSize, TOKENS.colors.action, 0.34, this.tileSize * 0.08);
        } else if (danger.has(k)) {
          fillTile(fx, c, this.tileSize, TOKENS.colors.action, 0.2, this.tileSize * 0.1);
        }
      }
    }

    if (this.hover) {
      const color = this.hover.color === 'move' ? TOKENS.colors.move : TOKENS.colors.action;
      for (const k of this.hover.tiles) {
        if (validMoves.has(k) || attackTargets.has(k) || danger.has(k)) continue;
        const p = parseKey(k);
        fillTile(fx, this.tileCenter(p), this.tileSize, color, 0.13, this.tileSize * 0.12);
      }
    }
  }

  // ------------------------------------------------------------------ P4 motion

  /** Walk tweens from the snapshot diff (300ms/tile easeOutCubic; snap if reduced motion). */
  private startWalkTweens(snapshot: GameSnapshot): void {
    this.walkTweens.clear();
    if (!this.motionEnabled || !this._diff) return;
    for (const mv of this._diff.moved) {
      const view = this.unitViews.get(mv.uid);
      const unit = snapshot.units.find((u) => u.uid === mv.uid);
      if (!view || !unit || !unit.alive) continue;
      const from = this.tileCenter(mv.from);
      const to = this.tileCenter(mv.to);
      const duration = tweenDurationForTiles(Math.max(Math.abs(mv.to.x - mv.from.x), Math.abs(mv.to.y - mv.from.y)));
      this.walkTweens.set(mv.uid, {
        uid: mv.uid,
        view,
        fromX: from.x,
        fromY: from.y,
        toX: to.x,
        toY: to.y,
        start: performance.now(),
        duration,
      });
    }
  }

  /** Floating numbers from hp deltas (damage red / heal success), merged per unit. */
  private spawnDamageFloats(snapshot: GameSnapshot): void {
    if (!this._diff || !this.motionEnabled) return;
    for (const hc of this._diff.hpChanges) {
      const delta = hc.after - hc.before;
      if (delta === 0) continue;
      const unit = snapshot.units.find((u) => u.uid === hc.uid);
      if (!unit || !unit.alive) continue;
      if (delta < 0) {
        // Merge successive hits on the same unit within the window.
        const pending = this.pendingDamage.get(hc.uid);
        if (pending) {
          pending.total += -delta;
          continue; // the existing flush timer emits one cumulative number
        }
        const timer = setTimeout(() => this.flushPendingDamage(hc.uid), MERGE_WINDOW_MS);
        this.pendingDamage.set(hc.uid, { total: -delta, timer });
      } else {
        this.spawnFloat(hc.uid, `+${delta}`, TOKENS.colors.success);
      }
    }
  }

  private flushPendingDamage(uid: string): void {
    const pending = this.pendingDamage.get(uid);
    if (!pending) return;
    this.pendingDamage.delete(uid);
    if (this.latestSnapshot) this.spawnFloat(uid, String(pending.total), TOKENS.colors.signalRedLight);
  }

  private spawnFloat(uid: string, label: string, color: string): void {
    if (!this.latestSnapshot) return;
    const unit = this.latestSnapshot.units.find((u) => u.uid === uid && u.alive);
    if (!unit) return;
    const c = this.tileCenter(unit.pos);
    const text = new Text({
      text: label,
      style: {
        fontFamily: TOKENS.fonts.readout,
        fontSize: 17,
        fontWeight: '700',
        fill: color,
      },
    });
    text.anchor.set(0.5, 0.5);
    const jitter = floatJitter(this.floats.length + uid.length);
    text.position.set(c.x + jitter, c.y - this.tileSize * 0.55);
    text.eventMode = 'none';
    this.floatLayer.addChild(text);
    this.floats.push({ text, start: performance.now(), x0: c.x + jitter, y0: c.y - this.tileSize * 0.55 });
    // NFR-2 transient budget: drop the oldest.
    while (this.floats.length > MAX_TRANSIENTS) {
      const oldest = this.floats.shift();
      if (oldest) oldest.text.destroy({ children: true });
    }
  }

  /** ≥7 single hit → 350ms shake + 2.5% zoom, never stacking. */
  private triggerDrama(snapshot: GameSnapshot): void {
    if (!this.motionEnabled || this.shaking || !this._diff) return;
    for (const hc of this._diff.hpChanges) {
      const delta = hc.before - hc.after;
      if (delta >= DRAMA_THRESHOLD) {
        this.shaking = true;
        this.shakeStart = performance.now();
        this.zoomStart = this.shakeStart;
        break;
      }
    }
    void snapshot;
  }

  private trackBadgeEnter(snapshot: GameSnapshot): void {
    if (this.lastPhase !== 'enemy' && snapshot.phase === 'enemy') {
      this.badgeEnterStart = performance.now();
    }
    this.lastPhase = snapshot.phase;
  }

  private trackStoryEnter(snapshot: GameSnapshot): void {
    if (snapshot.winner && this.lastWinner !== snapshot.winner) {
      this.storyEnterStart = performance.now();
    }
    this.lastWinner = snapshot.winner;
  }

  /** Single ticker callback: walk tweens, floats, shake/zoom, badge fade. */
  private readonly tick = (_ticker: Ticker): void => {
    const now = performance.now();
    const cam = this.camera;
    if (!cam) return;

    // Walk tweens.
    for (const [uid, t] of [...this.walkTweens]) {
      const p = tweenProgress(t.start, t.duration, now);
      if (p >= 1) {
        t.view.root.position.set(t.toX, t.toY);
        this.walkTweens.delete(uid);
      } else {
        const e = easeOutCubic(p);
        t.view.root.position.set(
          t.fromX + (t.toX - t.fromX) * e,
          t.fromY + (t.toY - t.fromY) * e,
        );
      }
    }

    // Shake + zoom (non-stacking, decaying).
    if (this.shaking) {
      const p = tweenProgress(this.shakeStart, SHAKE_MS, now);
      if (p >= 1) {
        this.shaking = false;
        cam.position.set(this.ox + (GRID_COLS * this.tileSize) / 2, this.oy + (GRID_ROWS * this.tileSize) / 2);
        cam.scale.set(1, 1);
      } else {
        const decay = 1 - easeOutCubic(p);
        cam.position.set(
          this.ox + (GRID_COLS * this.tileSize) / 2 + Math.sin(now * 0.09) * SHAKE_AMPLITUDE * decay,
          this.oy + (GRID_ROWS * this.tileSize) / 2 + Math.cos(now * 0.13) * SHAKE_AMPLITUDE * decay,
        );
        const zp = tweenProgress(this.zoomStart, ZOOM_IN_MS + ZOOM_OUT_MS, now);
        const zin = easeOutCubic(Math.min(1, tweenProgress(this.zoomStart, ZOOM_IN_MS, now)));
        const zout = 1 - easeOutCubic(Math.max(0, tweenProgress(this.zoomStart + ZOOM_IN_MS, ZOOM_OUT_MS, now)));
        const env = zin * zout * Math.max(0, 1 - Math.max(0, zp - 0.4) / 0.6);
        cam.scale.set(1 + ZOOM_AMOUNT * env, 1 + ZOOM_AMOUNT * env);
      }
    }

    // Floating numbers: rise + fade.
    for (let i = this.floats.length - 1; i >= 0; i--) {
      const f = this.floats[i]!;
      const p = tweenProgress(f.start, FLOAT_MS, now);
      if (p >= 1) {
        f.text.destroy({ children: true });
        this.floats.splice(i, 1);
      } else {
        const e = easeOutCubic(p);
        f.text.position.set(f.x0, f.y0 - FLOAT_RISE * e);
        f.text.alpha = 1 - p;
      }
    }

    // Authored badge entrance: continue fading in badges across frames.
    if (this.badgeEnterStart !== null && this.motionEnabled) {
      const p = tweenProgress(this.badgeEnterStart, BADGE_ENTER_MS, now);
      const e = easeOutCubic(p);
      for (const child of this.badgeLayer.children) {
        child.alpha = e;
        child.scale.set(0.6 + 0.4 * e, 0.6 + 0.4 * e);
      }
      if (p >= 1) this.badgeEnterStart = null;
    }
  };

  // ----------------------------------------------------------------- hover preview

  private hoverUnit(uid: string, _event: FederatedPointerEvent): void {
    if (this.hoverClearTimer) {
      clearTimeout(this.hoverClearTimer);
      this.hoverClearTimer = null;
    }
    const s = this.latestSnapshot;
    if (!s) return;
    const u = s.units.find((x) => x.uid === uid && x.alive);
    if (!u) return;
    let tiles: GridPos[];
    let color: 'move' | 'action';
    if (u.team === 'player') {
      if (s.phase !== 'player' || u.moved) {
        this.clearHover();
        return;
      }
      tiles = reachableTiles(s.units, u.pos, MOVE_BUDGET, u.uid);
      color = 'move';
    } else {
      tiles = adjacentTiles(u.pos);
      color = 'action';
    }
    this.hover = { uid, color, tiles: new Set(tiles.map(key)) };
    this.renderTileFx(s);
  }

  private scheduleHoverClear(): void {
    if (this.hoverClearTimer) clearTimeout(this.hoverClearTimer);
    this.hoverClearTimer = setTimeout(() => this.clearHover(), HOVER_CLEAR_MS);
  }

  private clearHover(): void {
    this.hoverClearTimer = null;
    if (!this.hover) return;
    this.hover = null;
    if (this.latestSnapshot) this.renderTileFx(this.latestSnapshot);
  }
}

/** 8-neighborhood of a cell, computed with engine inBounds/isAdjacent (no rule reimplementation). */
function adjacentTiles(pos: GridPos): GridPos[] {
  const out: GridPos[] = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue;
      const p = { x: pos.x + dx, y: pos.y + dy };
      if (inBounds(p) && isAdjacent(pos, p)) out.push(p);
    }
  }
  return out;
}

function fillTile(
  g: Graphics,
  center: { x: number; y: number },
  tileSize: number,
  color: string,
  alpha: number,
  inset: number,
): void {
  const half = tileSize / 2;
  g.roundRect(center.x - half + inset, center.y - half + inset, tileSize - inset * 2, tileSize - inset * 2, 4)
    .fill({ color, alpha });
}

/** Remove and destroy all transient children (badges/story marks). */
function clearLayer(layer: Container): void {
  const kids = layer.removeChildren(0, layer.children.length);
  for (const k of kids) k.destroy({ children: true });
}
