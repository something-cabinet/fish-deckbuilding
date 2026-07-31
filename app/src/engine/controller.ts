import type {
  Card,
  CardTargeting,
  EngineController,
  EngineEvent,
  Faction,
  GameAction,
  GameSnapshot,
  GridPos,
  Phase,
  PlayResult,
  Unit,
} from './contract';
import {
  COIN_START,
  CREDIT_LIMIT,
  FORECLOSURE_TURN,
  HAND_LIMIT,
  INTEREST_START_TURN,
} from './contract';
import { decideEnemyAction } from './ai';
import { buildDeck, cardTargeting, resolveActions } from './cards';
import { resolveAttack } from './combat';
import { canAfford, totalInterestDue } from './economy';
import { adjacent, moveCells } from './grid';

export const UNIT_TEMPLATES: Record<
  string,
  { templateId: string; name: string; faction: Faction; maxHp: number; attack: number; movement: number }
> = {
  guppy: { templateId: 'guppy', name: 'Guppy', faction: 'player', maxHp: 10, attack: 2, movement: 2 },
  'loan-shark': { templateId: 'loan-shark', name: 'Loan Shark', faction: 'enemy', maxHp: 8, attack: 1, movement: 2 },
  hustler: { templateId: 'hustler', name: 'Hustler', faction: 'enemy', maxHp: 3, attack: 3, movement: 2 },
  'debt-collector': { templateId: 'debt-collector', name: 'Debt Collector', faction: 'enemy', maxHp: 5, attack: 2, movement: 2 },
};

const START_POSITIONS: Record<string, GridPos> = {
  guppy: { x: 2, y: 2 },
  'loan-shark': { x: 7, y: 1 },
  hustler: { x: 7, y: 3 },
};

const cloneUnit = (u: Unit): Unit => ({ ...u, pos: { ...u.pos } });
const cloneCard = (c: Card): Card => ({ ...c });

export interface BattleOptions {
  /** Override the starter deck (default: buildDeck()). */
  deck?: Card[];
  /** Override battle positions (defaults: guppy {2,2}, loan-shark {7,1}, hustler {7,3}). */
  positions?: Partial<Record<string, GridPos>>;
  /** Override hero max HP (default 10) — used by foreclosure tests. */
  heroHp?: number;
  /** Override enemy max HP (default per template) — keeps battles alive for clock tests. */
  enemyHp?: number;
}

/**
 * Pure engine controller — the single resync fan-out point.
 *
 * EMISSION CONTRACT: every mutating method emits EXACTLY ONE snapshot
 * synchronously after state settles; `start()` emits the initial snapshot;
 * `getSnapshot()` before `start()` throws. When `winner` is set, mutating
 * methods are no-ops (playCard/sellCard return a desk-language rejection).
 */
export class BattleController implements EngineController {
  private started = false;
  private turn = 1;
  private phase: Phase = 'player';
  private coins = COIN_START;
  private hand: Card[] = [];
  private deck: Card[] = [];
  private discard: Card[] = [];
  private sellPile: Card[] = [];
  private units: Unit[] = [];
  private heroUid = 'guppy';
  private selectedUnitUid: string | null = null;
  private activeCardUid: string | null = null;
  private winner: Faction | null = null;
  private log: string[] = [];
  private snapshots = new Set<(s: GameSnapshot) => void>();
  private events = new Set<(e: EngineEvent) => void>();
  private options: BattleOptions;

  constructor(opts: BattleOptions = {}) {
    this.deck = (opts.deck ?? buildDeck()).map(cloneCard);
    this.options = opts;
  }

  subscribe(fn: (snap: GameSnapshot) => void): () => void {
    this.snapshots.add(fn);
    return () => this.snapshots.delete(fn);
  }

  onEvent(fn: (ev: EngineEvent) => void): () => void {
    this.events.add(fn);
    return () => this.events.delete(fn);
  }

  getSnapshot(): GameSnapshot {
    if (!this.started) throw new Error('BattleController: getSnapshot() before start() is invalid.');
    return this.buildSnapshot();
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    this.turn = 1;
    this.phase = 'player';
    this.coins = COIN_START;
    this.hand = [];
    this.discard = [];
    this.sellPile = [];
    this.units = [];
    this.selectedUnitUid = null;
    this.activeCardUid = null;
    this.winner = null;
    this.log = [];

    // spawn ONLY the three battle units (guppy + loan-shark + hustler), at
    // their START_POSITIONS (overridable for deterministic tests)
    for (const key of Object.keys(START_POSITIONS)) {
      const tpl = UNIT_TEMPLATES[key]!;
      const pos = this.options.positions?.[key] ?? START_POSITIONS[key]!;
      const isHero = key === 'guppy';
      const maxHp = isHero
        ? (this.options.heroHp ?? tpl.maxHp)
        : (this.options.enemyHp ?? tpl.maxHp);
      this.units.push({
        uid: key,
        templateId: tpl.templateId,
        name: tpl.name,
        faction: tpl.faction,
        pos: { ...pos },
        hp: maxHp,
        maxHp,
        attack: tpl.attack,
        movement: tpl.movement,
        armor: 0,
        debt: 0,
        isBoss: false,
        canMove: true,
        canAttack: true,
      });
    }
    this.heroUid = 'guppy';
    this.draw(5);
    this.logLine('The desk opens. Turn 1.');
    this.emitSnapshot();
  }

  // -------------------------------------------------------------------------
  // Selection + base actions
  // -------------------------------------------------------------------------

  selectUnit(unitUid: string | null): void {
    if (this.frozen()) return;
    if (unitUid === null) {
      this.selectedUnitUid = null;
      this.emitSnapshot();
      return;
    }
    const u = this.findUnit(unitUid);
    if (!u || u.faction !== 'player') return; // only player units are actionable
    this.selectedUnitUid = unitUid;
    this.emitSnapshot();
  }

  moveSelectedTo(pos: GridPos): void {
    if (this.frozen()) return;
    const unit = this.selected();
    if (!unit || !unit.canMove || this.phase !== 'player') return;
    const valid = this.validMovesFor(unit);
    if (!valid.some((p) => p.x === pos.x && p.y === pos.y)) return;

    const from = { ...unit.pos };
    unit.pos = { ...pos };
    unit.canMove = false;
    this.logLine(`${unit.name} moves to (${pos.x}, ${pos.y}).`);
    this.fire({ kind: 'unit-moved', unitUid: unit.uid, from, to: { ...pos } });
    this.emitSnapshot();
  }

  attackTarget(unitUid: string): void {
    if (this.frozen()) return;
    const unit = this.selected();
    if (!unit || !unit.canAttack || this.phase !== 'player') return;
    const target = this.findUnit(unitUid);
    if (!target || target.faction !== 'enemy' || target.hp <= 0) return;
    if (!adjacent(unit.pos, target.pos)) return;

    const outcome = resolveAttack(unit, target, true);
    unit.hp = outcome.attackerHp;
    unit.armor = outcome.attackerArmor;
    target.hp = outcome.targetHp;
    target.armor = outcome.targetArmor;
    unit.canAttack = false;

    this.fire({
      kind: 'unit-attacked',
      attackerUid: unit.uid,
      targetUid: target.uid,
      damage: unit.attack + target.debt,
      counterDamage: outcome.counterDamage,
    });
    this.logLine(
      `${unit.name} strikes ${target.name} for ${unit.attack + target.debt} damage.` +
        (outcome.counterDamage ? ` ${target.name} counters for ${outcome.counterDamage}.` : ''),
    );

    if (outcome.targetDied) this.removeUnit(target);
    if (outcome.attackerDied) this.removeUnit(unit);

    this.checkWinner();
    this.emitSnapshot();
  }

  // -------------------------------------------------------------------------
  // Cards
  // -------------------------------------------------------------------------

  setActiveCard(cardUid: string | null): void {
    if (this.frozen()) return;
    this.activeCardUid = cardUid;
    this.emitSnapshot();
  }

  validCardTargets(cardUid: string): CardTargeting {
    const card = this.hand.find((c) => c.uid === cardUid);
    if (!card || this.phase !== 'player' || this.frozen()) {
      return { validCells: [], validUnitUids: [] };
    }
    if (!canAfford(card.cost, this.coins)) {
      return { validCells: [], validUnitUids: [] };
    }
    return this.targetingFor(card);
  }

  playCard(cardUid: string, pos: GridPos): PlayResult {
    if (this.frozen()) return { ok: false, reason: 'The desk is closed.' };
    if (this.phase !== 'player') {
      return this.rejectPlay('The desk is not in session.');
    }

    const card = this.hand.find((c) => c.uid === cardUid);
    if (!card) return this.rejectPlay('Card not in hand.');
    if (!canAfford(card.cost, this.coins)) return this.rejectPlay('Insufficient current.');

    const targeting = this.targetingFor(card);
    if (card.targetMode !== 'none') {
      const valid = targeting.validCells.some((p) => p.x === pos.x && p.y === pos.y);
      if (!valid) {
        return this.rejectPlay(card.targetMode === 'cell' ? 'Open channel required.' : 'Range: adjacent.');
      }
    }

    // pay + remove from hand
    this.coins -= card.cost;
    this.hand = this.hand.filter((c) => c.uid !== cardUid);
    this.discard.push(card);

    const actions = this.cardActions(card, pos);
    const drawCount = actions.reduce((n, a) => (a.type === 'draw_cards' ? n + a.amount : n), 0);
    const nonDraw = actions.filter((a): a is Exclude<GameAction, { type: 'draw_cards' }> => a.type !== 'draw_cards');

    const result = resolveActions(nonDraw, {
      units: this.units.map(cloneUnit),
      heroUid: this.heroUid,
      coins: this.coins,
      occupied: (p) => this.units.some((u) => u.pos.x === p.x && u.pos.y === p.y),
    });

    this.units = result.units.map(cloneUnit);
    this.coins = result.coins;
    for (const line of result.log) this.logLine(line);
    for (const ev of result.events) this.fire(ev);
    for (const uid of result.removedUids) {
      const u = this.findUnit(uid);
      if (u) this.removeUnit(u);
    }
    if (drawCount > 0) this.draw(drawCount);

    this.activeCardUid = null;
    this.fire({ kind: 'card-played', cardUid, pos: { ...pos } });
    this.logLine(`${card.name} played (${card.cost} coins).`);
    this.checkWinner();
    this.emitSnapshot();
    return { ok: true };
  }

  sellCard(cardUid: string): PlayResult {
    if (this.frozen()) return { ok: false, reason: 'The desk is closed.' };
    if (this.phase !== 'player') return { ok: false, reason: 'The desk is not in session.' };
    const card = this.hand.find((c) => c.uid === cardUid);
    if (!card) return { ok: false, reason: 'Card not in hand.' };

    this.coins += card.coinValue;
    this.hand = this.hand.filter((c) => c.uid !== cardUid);
    this.sellPile.push(card);
    this.activeCardUid = null;
    this.fire({ kind: 'card-sold', cardUid, coinValue: card.coinValue });
    this.logLine(`Sold ${card.name} for ${card.coinValue} coin${card.coinValue === 1 ? '' : 's'}.`);
    this.emitSnapshot();
    return { ok: true };
  }

  endTurn(): void {
    if (this.frozen()) return;
    if (this.phase !== 'player') return;

    // --- end of player turn ---
    if (this.coins < 0) {
      const interest = Math.abs(this.coins);
      const hero = this.findUnit(this.heroUid)!;
      hero.hp = Math.max(0, hero.hp - interest); // interest is debt — bypasses armor
      this.logLine(`Interest due — Guppy pays ${interest}.`);
      this.fire({
        kind: 'unit-attacked',
        attackerUid: 'interest',
        targetUid: this.heroUid,
        damage: interest,
        counterDamage: null,
      });
      if (hero.hp <= 0) this.removeUnit(hero);
      this.checkWinner();
    }
    this.coins = COIN_START;

    // sell pile → bottom of deck, in sell order
    this.deck.push(...this.sellPile);
    this.sellPile = [];

    // draw 1 at end of player turn
    this.draw(1);

    // --- enemy phase ---
    this.phase = 'enemy';
    const enemies = this.units
      .filter((u) => u.faction === 'enemy' && u.hp > 0)
      .sort((a, b) => (a.uid < b.uid ? -1 : 1));
    for (const e of enemies) {
      if (this.winner) break;
      e.canMove = true;
      e.canAttack = true;
      const decision = decideEnemyAction(e, {
        playerUnits: this.units.filter((u) => u.faction === 'player' && u.hp > 0),
        occupied: (p) => this.units.some((u) => u.pos.x === p.x && u.pos.y === p.y && u.uid !== e.uid),
      });
      if (decision.kind === 'attack') {
        const target = this.findUnit(decision.targetUid);
        if (!target || target.hp <= 0) continue;
        const outcome = resolveAttack(e, target, true);
        e.hp = outcome.attackerHp;
        e.armor = outcome.attackerArmor;
        target.hp = outcome.targetHp;
        target.armor = outcome.targetArmor;
        this.fire({
          kind: 'unit-attacked',
          attackerUid: e.uid,
          targetUid: target.uid,
          damage: e.attack + target.debt,
          counterDamage: outcome.counterDamage,
        });
        this.logLine(
          `${e.name} strikes ${target.name} for ${e.attack + target.debt} damage.` +
            (outcome.counterDamage ? ` ${target.name} counters for ${outcome.counterDamage}.` : ''),
        );
        if (outcome.targetDied) this.removeUnit(target);
        if (outcome.attackerDied) this.removeUnit(e);
        this.checkWinner();
      } else if (decision.kind === 'move' && decision.path.length > 0) {
        const from = { ...e.pos };
        const to = { ...decision.path[decision.path.length - 1]! };
        e.pos = to;
        e.canMove = false;
        this.fire({ kind: 'unit-moved', unitUid: e.uid, from, to });
        this.logLine(`${e.name} advances to (${to.x}, ${to.y}).`);
      }
    }

    // --- new player turn ---
    this.turn += 1;
    this.phase = 'player';
    for (const u of this.units) {
      if (u.faction === 'player') {
        u.canMove = true;
        u.canAttack = true;
        u.armor = 0; // armor expires at start of owner's turn
      }
    }
    this.selectedUnitUid = null;
    this.activeCardUid = null;

    // interest clock
    if (this.turn >= INTEREST_START_TURN) {
      const dmg = this.turn - (INTEREST_START_TURN - 1);
      const hero = this.findUnit(this.heroUid);
      if (hero) {
        hero.hp = Math.max(0, hero.hp - dmg);
        this.logLine(`Interest due — Guppy pays ${dmg}.`);
        this.fire({ kind: 'unit-attacked', attackerUid: 'interest', targetUid: this.heroUid, damage: dmg, counterDamage: null });
      }
      this.checkWinner();
    }
    if (this.turn >= FORECLOSURE_TURN && !this.winner) {
      this.winner = 'enemy';
      this.logLine('Foreclosure. Guppy loses the desk.');
    }
    if (!this.winner) {
      this.logLine(`Turn ${this.turn}.`);
    }

    this.emitSnapshot();
  }

  private rejectPlay(reason: string): PlayResult {
    // Contract: playCard clears activeCardUid on BOTH outcomes. Rejections
    // still emit exactly one snapshot so stale jack-point highlights clear.
    this.activeCardUid = null;
    this.emitSnapshot();
    return { ok: false, reason };
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  private frozen(): boolean {
    return this.winner !== null;
  }

  private findUnit(uid: string): Unit | undefined {
    return this.units.find((u) => u.uid === uid);
  }

  private selected(): Unit | undefined {
    return this.selectedUnitUid ? this.findUnit(this.selectedUnitUid) : undefined;
  }

  private occupied(p: GridPos): boolean {
    return this.units.some((u) => u.pos.x === p.x && u.pos.y === p.y);
  }

  private validMovesFor(unit: Unit): GridPos[] {
    if (!unit.canMove) return [];
    return moveCells(unit.pos, unit.movement, (p) => this.occupied(p));
  }

  private targetingFor(card: Card): CardTargeting {
    return cardTargeting(card, {
      heroPos: this.findUnit(this.heroUid)?.pos ?? { x: -1, y: -1 },
      enemyUnits: this.units.filter((u) => u.faction === 'enemy' && u.hp > 0),
      occupied: (p) => this.occupied(p),
    });
  }

  /** Translate a card + drop position into GameActions (draw handled by controller). */
  private cardActions(card: Card, pos: GridPos): GameAction[] {
    const hero = this.findUnit(this.heroUid)!;
    const targetAt = (p: GridPos) => this.units.find((u) => u.pos.x === p.x && u.pos.y === p.y);
    const adjacentEnemies = () => this.units.filter((u) => u.faction === 'enemy' && u.hp > 0 && adjacent(u.pos, hero.pos));
    switch (card.defId) {
      case 'strike':
        return [{ type: 'damage_unit', targetUid: targetAt(pos)?.uid ?? '', amount: 3 }];
      case 'slam':
        return [{ type: 'damage_unit', targetUid: targetAt(pos)?.uid ?? '', amount: 5 }];
      case 'riptide':
        return adjacentEnemies().map((u) => ({ type: 'damage_unit' as const, targetUid: u.uid, amount: 2 }));
      case 'shell':
        return [{ type: 'gain_armor', targetUid: hero.uid, amount: 2 }];
      case 'patches':
        return [{ type: 'heal_unit', targetUid: hero.uid, amount: 3 }];
      case 'undercurrent':
        return [{ type: 'move_unit', targetUid: targetAt(pos)?.uid ?? '', direction: 'push', tiles: 1, originUid: hero.uid }];
      case 'gulp':
        return [{ type: 'gain_coins', amount: 2 }];
      case 'borrowed_time':
        return [{ type: 'draw_cards', amount: 2 }];
      case 'harpoon':
        return [
          { type: 'move_unit', targetUid: targetAt(pos)?.uid ?? '', direction: 'pull', tiles: 2, originUid: hero.uid },
          { type: 'apply_debt', targetUid: targetAt(pos)?.uid ?? '', amount: 1 },
        ];
      case 'dart':
        return [{ type: 'move_self', unitUid: hero.uid, to: { ...pos } }];
      default:
        return [];
    }
  }

  private draw(count: number): void {
    for (let i = 0; i < count; i++) {
      if (this.deck.length === 0) {
        // reshuffle discard into deck
        if (this.discard.length === 0) break;
        this.deck = [...this.discard].reverse();
        this.discard = [];
      }
      const card = this.deck.shift()!;
      if (this.hand.length >= HAND_LIMIT) {
        this.discard.push(card);
        this.logLine('Hand full — drawn card to discard.');
      } else {
        this.hand.push(card);
      }
    }
  }

  private removeUnit(unit: Unit): void {
    if (unit.uid === this.heroUid) {
      // Hero death: keep the 0-HP hero on the board so the desk can pin its
      // needle (defeat visual) — combat, interest, and clock deaths share this.
      unit.hp = 0;
      unit.armor = 0;
      this.logLine(`${unit.name} is sunk.`);
      this.fire({ kind: 'unit-died', unitUid: unit.uid });
      return;
    }
    this.units = this.units.filter((u) => u.uid !== unit.uid);
    if (this.selectedUnitUid === unit.uid) this.selectedUnitUid = null;
    this.logLine(`${unit.name} is removed.`);
    this.fire({ kind: 'unit-died', unitUid: unit.uid });
  }

  private checkWinner(): void {
    if (this.winner) return;
    const enemiesAlive = this.units.some((u) => u.faction === 'enemy' && u.hp > 0);
    const heroAlive = this.units.some((u) => u.uid === this.heroUid && u.hp > 0);
    if (!enemiesAlive) {
      this.winner = 'player';
      this.logLine('All debts collected — Guppy wins the desk.');
    } else if (!heroAlive) {
      this.winner = 'enemy';
      this.logLine('Guppy is sunk.');
    }
  }

  private logLine(line: string): void {
    this.log.push(line);
    if (this.log.length > 50) this.log = this.log.slice(this.log.length - 50);
  }

  private fire(ev: EngineEvent): void {
    for (const fn of this.events) fn(ev);
  }

  private emitSnapshot(): void {
    const snap = this.buildSnapshot();
    for (const fn of this.snapshots) fn(snap);
  }

  private buildSnapshot(): GameSnapshot {
    const selected = this.selected();
    return {
      turn: this.turn,
      phase: this.phase,
      coins: this.coins,
      interestDue: totalInterestDue(this.coins, this.turn + 1),
      hand: this.hand.map(cloneCard),
      deck: this.deck.map(cloneCard),
      discard: this.discard.map(cloneCard),
      sellPile: this.sellPile.map(cloneCard),
      units: this.units.map(cloneUnit),
      heroUid: this.heroUid,
      selectedUnitUid: this.selectedUnitUid,
      validMoves: selected ? this.validMovesFor(selected) : [],
      validAttackTargets:
        selected && selected.canAttack
          ? this.units.filter((u) => u.faction === 'enemy' && u.hp > 0 && adjacent(u.pos, selected.pos)).map((u) => u.uid)
          : [],
      activeCardUid: this.activeCardUid,
      activeCardTargets: this.activeCardUid ? this.validCardTargets(this.activeCardUid) : null,
      log: [...this.log],
      winner: this.winner,
    };
  }
}

/** Factory — the bridge's one entry point. */
export function createBattleController(opts?: BattleOptions): EngineController {
  return new BattleController(opts);
}
