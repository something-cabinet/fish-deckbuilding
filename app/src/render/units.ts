import { Container, Graphics, Text } from 'pixi.js';
import type { Unit } from '../engine/contract';
import { BallisticNeedle } from './needle';

/** Desk tokens (mirrors app.css palette — single source for the canvas layer). */
export const TOKENS = {
  ivory: 0xf4eedf,
  ivoryDim: 0xc9bfa8,
  walnut: 0x1d120d,
  walnutLight: 0x65402a,
  steel: 0x626660,
  steelLight: 0xa8aaa0,
  brass: 0xb38b47,
  brassLight: 0xdfc27a,
  amber: 0xd69b36,
  move: 0x2f8785,
  moveLight: 0x9ed8ce,
  red: 0xb33b2e,
  redLight: 0xf0a394,
};

const FONT = 'IBM Plex Mono, ui-monospace, Menlo, monospace';

/**
 * A unit's instrument on the desk: a token plus a compact channel strip —
 * two state lamps (move green-blue, attack amber), name, exact HP/ATK
 * readout, a thin ballistic HP bar, and red Debt only when stacks exist
 * (des-2 handoff spec). HP bar is drawn from a BallisticNeedle (view state).
 */
export class UnitView extends Container {
  private readonly token = new Graphics();
  private readonly hpBar = new Graphics();
  private readonly moveLamp = new Graphics();
  private readonly attackLamp = new Graphics();
  private readonly nameText = new Text({ text: '' });
  private readonly statsText = new Text({ text: '' });
  private readonly debtText = new Text({ text: '' });
  private readonly hpNeedle = new BallisticNeedle(1);
  private readonly tokenRadius: number;
  private lastHp = -1;
  private lastArmor = -1;
  private lastDebt = -1;
  private lastMove = false;
  private lastAttack = false;

  constructor(readonly unitId: string, readonly faction: 'player' | 'enemy', tokenRadius: number) {
    super();
    this.tokenRadius = tokenRadius;
    this.addChild(this.token, this.hpBar, this.moveLamp, this.attackLamp, this.nameText, this.statsText, this.debtText);
    this.nameText.style = {
      fontFamily: FONT,
      fontSize: 11,
      fill: TOKENS.ivory,
    };
    this.nameText.anchor.set(0.5, 0);
    this.statsText.style = {
      fontFamily: FONT,
      fontSize: 10,
      fill: TOKENS.ivoryDim,
    };
    this.statsText.anchor.set(0.5, 0);
    this.debtText.style = {
      fontFamily: FONT,
      fontSize: 10,
      fill: TOKENS.redLight,
    };
    this.debtText.anchor.set(0.5, 0);
    this.drawToken();
  }

  /** Retarget the HP needle. Call once per snapshot (chases latest value). */
  setHpTarget(hp: number, maxHp: number): void {
    this.hpNeedle.setTarget(maxHp > 0 ? Math.max(0, hp / maxHp) : 0);
  }

  /** Snap the HP needle instantly (fresh spawn — no swing-in from full HP). */
  snapHp(hp: number, maxHp: number): void {
    this.hpNeedle.snapTo(maxHp > 0 ? Math.max(0, hp / maxHp) : 0);
  }

  /** Advance the ballistic needle. */
  update(dtMs: number, reducedMotion: boolean): void {
    this.hpNeedle.update(dtMs, reducedMotion);
  }

  /** Redraw the strip from snapshot unit state (only on change). */
  sync(unit: Unit): void {
    const changed =
      unit.hp !== this.lastHp ||
      unit.armor !== this.lastArmor ||
      unit.debt !== this.lastDebt ||
      unit.canMove !== this.lastMove ||
      unit.canAttack !== this.lastAttack;
    if (!changed) return;

    this.lastHp = unit.hp;
    this.lastArmor = unit.armor;
    this.lastDebt = unit.debt;
    this.lastMove = unit.canMove;
    this.lastAttack = unit.canAttack;

    // token color: player = ivory/brass, enemy = steel; red ring when dying
    this.drawToken(unit.hp <= 0);

    // state lamps
    this.drawLamp(this.moveLamp, 0, unit.canMove, TOKENS.move);
    this.drawLamp(this.attackLamp, 14, unit.canAttack, TOKENS.amber);

    this.nameText.text = unit.name;
    this.nameText.position.set(0, this.tokenRadius + 8);
    this.statsText.text = `${unit.hp}/${unit.maxHp}  ATK ${unit.attack}`;
    this.statsText.position.set(0, this.tokenRadius + 24);
    this.debtText.text = unit.debt > 0 ? `DEBT +${unit.debt}` : '';
    this.debtText.position.set(0, this.tokenRadius + 38);
  }

  /** Draw the HP bar from the current needle value (call in ticker). */
  drawHpBar(barWidth: number): void {
    const g = this.hpBar;
    g.clear();
    const y = this.tokenRadius + 18;
    // black track (scale arc)
    g.roundRect(-barWidth / 2, y, barWidth, 3, 1.5).fill(TOKENS.walnut);
    const ratio = Math.max(0, Math.min(1, this.hpNeedle.value));
    if (ratio > 0.001) {
      const color = ratio < 0.25 ? TOKENS.red : TOKENS.brassLight; // red only for critical
      g.roundRect(-barWidth / 2, y, barWidth * ratio, 3, 1.5).fill(color);
    }
  }

  private drawLamp(g: Graphics, x: number, on: boolean, color: number): void {
    g.clear();
    const y = this.tokenRadius + 2;
    g.circle(x, y, 3).fill(on ? color : TOKENS.walnutLight);
  }

  private drawToken(dying = false): void {
    const g = this.token;
    g.clear();
    const r = this.tokenRadius;
    if (this.faction === 'player') {
      g.circle(0, 0, r).fill(TOKENS.ivory).stroke({ width: 2, color: TOKENS.brass });
      // eye dot
      g.circle(-r * 0.25, -r * 0.15, r * 0.12).fill(TOKENS.walnut);
    } else {
      g.circle(0, 0, r).fill(TOKENS.steel).stroke({ width: 2, color: dying ? TOKENS.red : TOKENS.walnut });
      g.circle(-r * 0.25, -r * 0.15, r * 0.12).fill(TOKENS.walnut);
    }
  }
}
