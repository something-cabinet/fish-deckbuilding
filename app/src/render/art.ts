// ============================================================================
// P2 custom art — authored mobster-fish units for the tactical board.
// Contract (desk.ts consumes these EXACT signatures):
//   drawTile(g, x, y, w, h, col, row): void
//   drawUnitSprite(unit: Unit, size: number): Container   // centered (0,0)
//   drawIntentBadge(intent, unit, size): Container        // centered (0,0)
//   drawBalloonMark(size): Container                      // defeat motif
//   drawBowlMark(size): Container                         // victory motif
// All drawing pulls from TOKENS (single token source, NFR-6). No new colors;
// no signal-red outside damage/debt/defeat/foreclosure grammar. Shapes carry
// team/state (color-blind safe), colors reinforce.
// ============================================================================

import { Container, Graphics, Text } from 'pixi.js';
import type { EnemyIntent, Unit } from '../engine/contract';
import { TOKENS } from './tokens';

/** Wet-asphalt tile: recessed seam, top-edge highlight, faint checker variation. */
export function drawTile(
  g: Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  col: number,
  row: number,
): void {
  const checker = (col + row) % 2 === 0;
  const fill = checker ? TOKENS.colors.groundAsphalt : TOKENS.colors.groundWet;
  const seam = checker ? TOKENS.colors.groundDeep : TOKENS.colors.groundVoid;
  const inset = Math.max(1.5, w * 0.045);
  const radius = Math.max(2, w * 0.08);

  g.roundRect(x + inset, y + inset, w - inset * 2, h - inset * 2, radius)
    .fill({ color: fill, alpha: 1 })
    .stroke({ width: 1, color: seam, alpha: 0.85 });

  // Top inner highlight: the board reads as one wet surface with seams.
  g.roundRect(x + inset + w * 0.05, y + inset + h * 0.06, (w - inset * 2) * 0.9, h * 0.06, radius)
    .fill({ color: TOKENS.colors.ivory, alpha: 0.03 });
  // Low shadow lip.
  g.roundRect(x + inset, y + h - inset - h * 0.05, w - inset * 2, h * 0.05, radius)
    .fill({ color: TOKENS.colors.groundVoid, alpha: 0.28 });
}

/**
 * Authored mobster-fish unit body, centered on (0,0), ~size×size.
 * Player (Guppy): round guppy, lighter ivory/steel suit, cyan tie — hopeful.
 * Enemy (mobster): bulkier angular fish, dark suit with pinstripe hint, amber
 * tie — heavyset. Team reads by silhouette (color-blind safe); colors reinforce.
 * The renderer wraps this with HP/block readouts + selection ring.
 */
export function drawUnitSprite(unit: Unit, size: number): Container {
  const c = new Container();
  const s = size * 0.82; // body envelope within the tile
  const isPlayer = unit.team === 'player';

  const bodyColor = isPlayer ? TOKENS.colors.panelSteel : TOKENS.colors.groundDeep;
  const outline = isPlayer ? TOKENS.colors.ivory : TOKENS.colors.steelLight;
  const suitLapel = isPlayer ? TOKENS.colors.steelLight : TOKENS.colors.steel;
  const tie = isPlayer ? TOKENS.colors.move : TOKENS.colors.action;

  const body = new Graphics();

  if (isPlayer) {
    // Rounded guppy body, slightly taller than wide.
    body
      .roundRect(-s * 0.42, -s * 0.5, s * 0.84, s * 1.0, s * 0.38)
      .fill({ color: bodyColor, alpha: 1 })
      .stroke({ width: 2.5, color: outline, alpha: 0.95 });
  } else {
    // Angular mobster silhouette: broad shoulders, narrowed jaw.
    body
      .moveTo(-s * 0.5, -s * 0.34)
      .lineTo(-s * 0.42, -s * 0.5)
      .lineTo(s * 0.42, -s * 0.5)
      .lineTo(s * 0.5, -s * 0.34)
      .lineTo(s * 0.34, s * 0.12)
      .lineTo(s * 0.24, s * 0.5)
      .lineTo(-s * 0.24, s * 0.5)
      .lineTo(-s * 0.34, s * 0.12)
      .closePath()
      .fill({ color: bodyColor, alpha: 1 })
      .stroke({ width: 2.5, color: outline, alpha: 0.95 });
  }

  // Tail fin (left side).
  const tail = new Graphics();
  if (isPlayer) {
    tail
      .moveTo(-s * 0.42, -s * 0.1)
      .lineTo(-s * 0.78, -s * 0.3)
      .lineTo(-s * 0.72, 0.06)
      .lineTo(-s * 0.78, s * 0.38)
      .lineTo(-s * 0.42, s * 0.16)
      .closePath()
      .fill({ color: TOKENS.colors.panelSteel, alpha: 1 })
      .stroke({ width: 2, color: outline, alpha: 0.9 });
  } else {
    tail
      .moveTo(-s * 0.42, -s * 0.12)
      .lineTo(-s * 0.8, -s * 0.36)
      .lineTo(-s * 0.8, 0.1)
      .lineTo(-s * 0.8, s * 0.44)
      .lineTo(-s * 0.42, s * 0.18)
      .closePath()
      .fill({ color: TOKENS.colors.groundDeep, alpha: 1 })
      .stroke({ width: 2, color: outline, alpha: 0.9 });
  }

  // Suit: lapel V + shirt triangle read.
  const suit = new Graphics();
  if (isPlayer) {
    suit
      .moveTo(-s * 0.16, -s * 0.34)
      .lineTo(0, s * 0.02)
      .lineTo(s * 0.16, -s * 0.34)
      .lineTo(0, -s * 0.26)
      .closePath()
      .fill({ color: suitLapel, alpha: 0.92 });
    suit
      .moveTo(0, -s * 0.3)
      .lineTo(-s * 0.045, s * 0.2)
      .lineTo(s * 0.045, s * 0.2)
      .closePath()
      .fill({ color: tie, alpha: 0.95 });
  } else {
    // Pinstripe hint: two near-vertical steel lines across the torso.
    suit
      .moveTo(-s * 0.18, -s * 0.3)
      .lineTo(-s * 0.24, s * 0.4)
      .stroke({ width: 1.5, color: suitLapel, alpha: 0.55 });
    suit
      .moveTo(s * 0.18, -s * 0.3)
      .lineTo(s * 0.24, s * 0.4)
      .stroke({ width: 1.5, color: suitLapel, alpha: 0.55 });
    suit
      .moveTo(0, -s * 0.32)
      .lineTo(-s * 0.05, s * 0.22)
      .lineTo(s * 0.05, s * 0.22)
      .closePath()
      .fill({ color: tie, alpha: 0.95 });
  }

  // Fedora: brim ellipse + crown + band.
  const hat = new Graphics();
  hat
    .ellipse(0, -s * 0.52, s * 0.34, s * 0.09)
    .fill({ color: isPlayer ? TOKENS.colors.ink : TOKENS.colors.ink, alpha: 1 });
  hat
    .roundRect(-s * 0.17, -s * 0.78, s * 0.34, s * 0.3, s * 0.07)
    .fill({ color: isPlayer ? TOKENS.colors.ink : TOKENS.colors.ink, alpha: 1 });
  hat
    .roundRect(-s * 0.17, -s * 0.55, s * 0.34, s * 0.06, s * 0.03)
    .fill({ color: tie, alpha: 0.95 });

  // Eye: white sclera + pupil; player reads hopeful (centered), enemy heavy (half-lid).
  const eye = new Graphics();
  eye.circle(s * 0.2, -s * 0.1, s * 0.09).fill({ color: TOKENS.colors.ivory, alpha: 1 });
  eye
    .circle(s * 0.22, -s * 0.1, s * 0.045)
    .fill({ color: TOKENS.colors.ink, alpha: 1 });
  if (!isPlayer) {
    // Heavy lid line.
    eye
      .moveTo(s * 0.1, -s * 0.16)
      .lineTo(s * 0.32, -s * 0.13)
      .stroke({ width: 2, color: TOKENS.colors.ink, alpha: 0.9 });
  }

  // Gill arc (right side of head).
  const gill = new Graphics();
  gill
    .moveTo(s * 0.3, -s * 0.28)
    .quadraticCurveTo(s * 0.44, 0, s * 0.28, s * 0.3)
    .stroke({ width: 1.5, color: outline, alpha: 0.6 });

  c.addChild(tail, body, suit, hat, gill, eye);
  return c;
}

/**
 * Intent telegraph: always-visible precise number + shape glyph (StS-style).
 * Attack = weapon glyph scaled by damage tier (dagger 0–3 / cleaver 4–7 / axe 8+),
 * amber number + plate; Move = cyan chevron; Hold = steel dot.
 * Centered on (0,0); renderer positions it above the unit.
 */
export function drawIntentBadge(intent: EnemyIntent, _unit: Unit, size: number): Container {
  const c = new Container();
  const s = size * 0.52;
  const attacking = intent.kind === 'attack';
  const moving = intent.kind === 'move';
  const accent = attacking
    ? TOKENS.colors.action
    : moving
      ? TOKENS.colors.move
      : TOKENS.colors.steelLight;

  const plate = new Graphics();
  plate
    .roundRect(-s / 2, -s * 0.31, s, s * 0.62, 4)
    .fill({ color: TOKENS.colors.panelInk, alpha: 0.96 })
    .stroke({ width: 2, color: accent, alpha: 0.95 });

  const glyph = new Graphics();
  if (attacking) {
    const damage = intent.damage ?? 0;
    drawWeapon(glyph, damage, s, accent);
  } else if (moving) {
    glyph
      .moveTo(-s * 0.14, -s * 0.12)
      .lineTo(s * 0.1, 0)
      .lineTo(-s * 0.14, s * 0.12)
      .closePath()
      .fill({ color: accent, alpha: 1 });
  } else {
    glyph.circle(0, 0, s * 0.07).fill({ color: accent, alpha: 1 });
  }
  glyph.position.set(-s * 0.3, 0);

  const label = new Text({
    text: attacking ? String(intent.damage ?? 0) : moving ? 'MOVE' : 'HOLD',
    style: {
      fontFamily: TOKENS.fonts.readout,
      fontSize: Math.max(8, s * 0.22),
      fontWeight: '700',
      fill: attacking ? TOKENS.colors.actionLight : TOKENS.colors.ivoryMuted,
    },
  });
  label.anchor.set(0.5, 0.5);
  label.position.set(s * 0.3, 0);

  c.addChild(plate, glyph, label);
  return c;
}

/** Weapon glyph by damage tier: dagger 0–3, cleaver 4–7, axe 8+. */
function drawWeapon(g: Graphics, damage: number, s: number, accent: string): void {
  if (damage < 4) {
    // Dagger: short blade + guard + grip.
    g.moveTo(0, -s * 0.2)
      .lineTo(s * 0.07, s * 0.06)
      .lineTo(-s * 0.07, s * 0.06)
      .closePath()
      .fill({ color: accent, alpha: 1 });
    g.moveTo(-s * 0.12, s * 0.06)
      .lineTo(s * 0.12, s * 0.06)
      .stroke({ width: 2, color: accent, alpha: 1 });
    g.moveTo(0, s * 0.06).lineTo(0, s * 0.18).stroke({ width: 2.5, color: accent, alpha: 1 });
  } else if (damage < 8) {
    // Cleaver: broad rectangular blade + handle.
    g.roundRect(-s * 0.07, -s * 0.2, s * 0.14, s * 0.22, 2)
      .fill({ color: accent, alpha: 1 });
    g.moveTo(0, s * 0.02).lineTo(0, s * 0.18).stroke({ width: 3, color: accent, alpha: 1 });
  } else {
    // Axe: wide curved blade + handle.
    g.moveTo(-s * 0.02, -s * 0.22)
      .quadraticCurveTo(s * 0.22, -s * 0.2, s * 0.2, 0)
      .lineTo(-s * 0.02, s * 0.02)
      .closePath()
      .fill({ color: accent, alpha: 1 });
    g.moveTo(0, -s * 0.12).lineTo(0, s * 0.18).stroke({ width: 3, color: accent, alpha: 1 });
  }
}

/** Defeat motif — balloon: the mafia's execution device (death/danger only). */
export function drawBalloonMark(size: number): Container {
  const c = new Container();
  const s = size * 0.9;
  const g = new Graphics();
  // Envelope.
  g.circle(0, 0, s * 0.4).fill({ color: TOKENS.colors.balloon, alpha: 0.92 });
  // String.
  g.moveTo(-s * 0.06, s * 0.36)
    .quadraticCurveTo(s * 0.05, s * 0.56, -s * 0.02, s * 0.95)
    .stroke({ width: 2, color: TOKENS.colors.signalRedLight, alpha: 0.9 });
  // Highlight knot.
  g.circle(-s * 0.02, s * 0.95, s * 0.035).fill({ color: TOKENS.colors.ink, alpha: 0.9 });
  c.addChild(g);
  return c;
}

/** Victory motif — bowl: sanctuary, at peace (victory/sanctuary only). */
export function drawBowlMark(size: number): Container {
  const c = new Container();
  const s = size * 0.9;
  const g = new Graphics();
  // Open bowl arc.
  g.arc(0, 0, s * 0.5, Math.PI, 0).stroke({ width: 3, color: TOKENS.colors.bowl, alpha: 1 });
  g.moveTo(-s * 0.5, 0).lineTo(s * 0.5, 0).stroke({ width: 2.5, color: TOKENS.colors.bowl, alpha: 1 });
  // Warm interior water read (low alpha bowl tone).
  g.arc(0, 0, s * 0.34, Math.PI, 0).stroke({ width: 1.5, color: TOKENS.colors.moveLight, alpha: 0.5 });
  // Tiny bubble.
  g.circle(-s * 0.12, -s * 0.24, s * 0.045).fill({ color: TOKENS.colors.moveLight, alpha: 0.7 });
  c.addChild(g);
  return c;
}
