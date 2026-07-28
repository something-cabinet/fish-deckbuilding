/**
 * IslandScene — Excalibur Scene for the Cross Blitz-style overworld map.
 *
 * Renders:
 *  - decorative ocean background
 *  - path connections as lines between zone positions
 *  - zone markers as distinct shapes (circle, diamond, star, square, triangle)
 *  - hero avatar that travels along paths on click
 *
 * Emits events via the global eventBus which the bridge relays to Svelte $state.
 *
 * ── Sprite Fusion Integration ──
 * The `@excaliburjs/plugin-spritefusion` package is installed and available at:
 *   import { SpriteFusionResource } from '@excaliburjs/plugin-spritefusion';
 *
 * To replace the programmatic zone/path rendering with a tile map:
 *   1. Export your map from Sprite Fusion as a .json + .png tileset
 *   2. Place assets in `public/maps/<name>/`
 *   3. Load with: `const mapResource = new SpriteFusionResource('/maps/<name>/map.json');`
 *   4. Add the generated actors to the scene
 *   5. Overlay zone markers with Excalibur actors at the same pixel positions
 *      (zone position data in islandData.ts can remain as the source of truth)
 *
 * For now, the programmatic rendering is kept as it works reliably for the
 * current game scope. See wiki:specs:fish-roguelite-deckbuilding for future
 * tile map integration plans.
 */

import { Scene, Actor, Vector, Color, Engine, Line, Circle, Rectangle, Polygon } from 'excalibur';
import { type ZoneDefinition } from '../map/IslandTypes';
import { ZoneType } from '../map/IslandTypes';
import { ISLAND_ZONES, getZoneById, getStartingZone } from '../map/islandData';
import { eventBus } from '../events';

// ─── Colour map ───

const ZONE_COLORS: Record<ZoneType, string> = {
  [ZoneType.Town]: '#3b82f6',
  [ZoneType.Combat]: '#e85d4e',
  [ZoneType.Boss]: '#a855f7',
  [ZoneType.Shop]: '#f4c430',
  [ZoneType.Rest]: '#22c55e',
  [ZoneType.Event]: '#c084fc',
};

const COLOR_LOCKED = '#2d3748';
const COLOR_COMPLETED = '#2d6a4f';

// ─── Shape helpers ───

function diamondGraphic(color: Color, size = 22): Polygon {
  return new Polygon({
    points: [
      new Vector(0, -size),
      new Vector(size, 0),
      new Vector(0, size),
      new Vector(-size, 0),
    ],
    color,
    strokeColor: Color.White,
    lineWidth: 1.5,
  });
}

function starGraphic(color: Color, size = 24): Polygon {
  const outer = size;
  const inner = size * 0.45;
  const pts: Vector[] = [];
  for (let i = 0; i < 5; i++) {
    const outerAngle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    const innerAngle = outerAngle + Math.PI / 5;
    pts.push(new Vector(Math.cos(outerAngle) * outer, Math.sin(outerAngle) * outer));
    pts.push(new Vector(Math.cos(innerAngle) * inner, Math.sin(innerAngle) * inner));
  }
  return new Polygon({ points: pts, color, strokeColor: Color.White, lineWidth: 1.5 });
}

function triangleGraphic(color: Color, size = 24): Polygon {
  const h = size * 0.866;
  return new Polygon({
    points: [
      new Vector(0, -size),
      new Vector(h * 0.87, size * 0.5),
      new Vector(-h * 0.87, size * 0.5),
    ],
    color,
    strokeColor: Color.White,
    lineWidth: 1.5,
  });
}

function getZoneColor(type: ZoneType): Color {
  return Color.fromHex(ZONE_COLORS[type]);
}

function buildZoneGraphic(type: ZoneType, unlocked: boolean, completed: boolean): Circle | Rectangle | Polygon {
  let color: Color;
  if (completed) {
    color = Color.fromHex(COLOR_COMPLETED);
  } else if (!unlocked) {
    color = Color.fromHex(COLOR_LOCKED);
  } else {
    color = getZoneColor(type);
  }

  switch (type) {
    case ZoneType.Town:
      return new Circle({ radius: 20, color, strokeColor: unlocked ? Color.White : undefined, lineWidth: 2 });
    case ZoneType.Combat:
      return diamondGraphic(color);
    case ZoneType.Boss:
      return starGraphic(color);
    case ZoneType.Shop:
      return new Rectangle({ width: 32, height: 32, color, strokeColor: unlocked ? Color.White : undefined, lineWidth: 2 });
    case ZoneType.Rest:
      return new Circle({ radius: 16, color, strokeColor: unlocked ? Color.White : undefined, lineWidth: 2 });
    case ZoneType.Event:
      return triangleGraphic(color);
  }
}

// ─── Decorative particle dots ───

const DECORATIVE_DOTS: Array<[number, number, number]> = [
  [100, 100, 2], [300, 80, 1.5], [550, 120, 2], [700, 60, 1.5],
  [80, 300, 1], [750, 200, 2], [150, 550, 1.5], [600, 600, 2],
  [250, 180, 1], [450, 480, 1.5], [700, 400, 1], [50, 480, 2],
];

// ───── Scene ─────

export class IslandScene extends Scene {
  /** Runtime hero zone tracking (synced from bridge) */
  currentZoneId = 'guppy_cove';
  unlockedZoneIds = new Set<string>(['guppy_cove']);
  completedZoneIds = new Set<string>([]);

  private heroActor!: Actor;
  private zoneActors = new Map<string, { actor: Actor; def: ZoneDefinition }>();
  private pathActors: Actor[] = [];
  /** Guard: true after onInitialize completes. Prevents syncFromState crash before scene is ready. */
  private initialized = false;

  // ── Lifecycle ──

  onInitialize(_engine: Engine) {
    this.backgroundColor = Color.fromHex('#0a1628');
    this.createDecorations();
    this.createPaths();
    this.createZones();
    this.createHero();
    this.initialized = true;
  }

  onActivate() {
    this.refreshVisuals();
  }

  /** Called by the bridge whenever state.svelte.ts map data changes. */
  syncFromState(state: { currentZone: string; unlockedZones: string[]; completedZones: string[] }) {
    if (!this.initialized) return; // C1: prevent crash when called before onInitialize
    this.currentZoneId = state.currentZone;
    this.unlockedZoneIds = new Set(state.unlockedZones);
    this.completedZoneIds = new Set(state.completedZones);
    this.refreshVisuals();
  }

  // ── Scene building ──

  private createDecorations() {
    for (const [x, y, r] of DECORATIVE_DOTS) {
      const dot = new Actor({
        pos: new Vector(x, y),
        radius: r,
      });
      dot.graphics.use(new Circle({ radius: r, color: Color.fromHex('#ffffff15') }));
      this.add(dot);
    }
  }

  private createPaths() {
    const drawn = new Set<string>();

    for (const zone of ISLAND_ZONES) {
      for (const connId of zone.connections) {
        const key = [zone.id, connId].sort().join('--');
        if (drawn.has(key)) continue;
        drawn.add(key);

        const target = getZoneById(connId);
        if (!target) continue;

        const lineActor = new Actor({ pos: Vector.Zero, z: 0 });
        lineActor.graphics.use(
          new Line({
            start: new Vector(zone.position.x, zone.position.y),
            end: new Vector(target.position.x, target.position.y),
            color: Color.fromHex('#ffffff22'),
            thickness: 2,
          }),
        );
        this.add(lineActor);
        this.pathActors.push(lineActor);
      }
    }
  }

  private createZones() {
    for (const def of ISLAND_ZONES) {
      const unlocked = this.unlockedZoneIds.has(def.id);
      const completed = this.completedZoneIds.has(def.id);
      const graphic = buildZoneGraphic(def.type, unlocked, completed);

      const actor = new Actor({
        pos: new Vector(def.position.x, def.position.y),
        radius: 26, // circle collider for click detection
        z: 5,
      });
      actor.graphics.use(graphic);

      // Pointer interactions
      actor.on('pointerup', () => this.handleZoneClick(def.id));

      const origScale = new Vector(1, 1);
      actor.on('pointerenter', () => {
        if (!this.canVisit(def.id)) return;
        actor.scale = new Vector(1.25, 1.25);
      });
      actor.on('pointerleave', () => {
        actor.scale = origScale;
      });

      this.add(actor);
      this.zoneActors.set(def.id, { actor, def });
    }
  }

  private createHero() {
    const start = getZoneById(this.currentZoneId) ?? getStartingZone();
    this.heroActor = new Actor({
      pos: new Vector(start.position.x, start.position.y),
      radius: 10,
      z: 10,
    });
    this.heroActor.graphics.use(
      new Circle({ radius: 10, color: Color.fromHex('#f4c430'), strokeColor: Color.White, lineWidth: 2 }),
    );
    this.add(this.heroActor);
  }

  // ── Visual sync ──

  private refreshVisuals() {
    this.updateZoneGraphics();
    this.positionHero();
  }

  private updateZoneGraphics() {
    for (const [id, { actor, def }] of this.zoneActors) {
      const unlocked = this.unlockedZoneIds.has(id);
      const completed = this.completedZoneIds.has(id);
      actor.graphics.use(buildZoneGraphic(def.type, unlocked, completed));
    }
  }

  private positionHero() {
    const zone = getZoneById(this.currentZoneId);
    if (zone) {
      this.heroActor.pos = new Vector(zone.position.x, zone.position.y);
    }
  }

  // ── Zone interaction ──

  private canVisit(zoneId: string): boolean {
    const def = getZoneById(zoneId);
    if (!def) return false;
    if (!this.unlockedZoneIds.has(zoneId)) return false;
    if (this.completedZoneIds.has(zoneId)) return false;

    // Must be connected to current zone
    const current = getZoneById(this.currentZoneId);
    if (!current) return zoneId === getStartingZone().id;
    return current.connections.includes(zoneId);
  }

  private handleZoneClick(zoneId: string) {
    if (!this.canVisit(zoneId)) return;

    const def = getZoneById(zoneId);
    if (!def) return;

    // Animate hero sliding to destination (~350ms)
    const targetPos = new Vector(def.position.x, def.position.y);
    this.heroActor.actions.clearActions();
    this.heroActor.actions.moveTo(targetPos, 350);

    // After movement completes, emit arrival
    this.heroActor.actions.callMethod(() => {
      eventBus.emit('map:zoneEntered', { zoneId, zoneType: def.type });
    });
  }
}
