import type {
  Card,
  CardDef,
  CardTargeting,
  GameAction,
  GridPos,
  PitchColor,
  Unit,
} from './contract';
import { HAND_LIMIT } from './contract';
import { applyDamage } from './combat';
import { adjacent, chebyshev, inBounds, moveCells } from './grid';

// ---------------------------------------------------------------------------
// Card definitions — 10 unique cards, 2 copies each (D8)
// ---------------------------------------------------------------------------

function def(
  defId: string,
  name: string,
  cost: number,
  coinValue: number,
  pitch: PitchColor,
  targetMode: CardDef['targetMode'],
  description: string,
): CardDef {
  return { defId, name, type: 'action', cost, coinValue, pitch, targetMode, description };
}

export const CARD_DEFS: readonly CardDef[] = [
  def('strike', 'Strike', 2, 1, 'red', 'unit', 'Deal 3 damage to an adjacent enemy unit.'),
  def('slam', 'Slam', 3, 1, 'red', 'unit', 'Deal 5 damage to an adjacent enemy unit.'),
  def('riptide', 'Riptide', 2, 2, 'yellow', 'none', 'Deal 2 damage to ALL enemies adjacent to Guppy.'),
  def('shell', 'Shell', 2, 1, 'red', 'none', 'Gain 2 armor (temporary shield, expires at end of turn).'),
  def('patches', 'Patches', 2, 2, 'yellow', 'none', 'Heal Guppy 3 HP.'),
  def('undercurrent', 'Undercurrent', 1, 2, 'yellow', 'unit', 'Push an adjacent enemy 1 tile away.'),
  def('gulp', 'Gulp', 1, 3, 'blue', 'none', 'Gain 2 coins.'),
  def('borrowed_time', 'Borrowed Time', 2, 3, 'blue', 'none', 'Draw 2 cards.'),
  def('harpoon', 'Harpoon', 3, 1, 'red', 'unit', 'Pull an enemy up to 2 tiles toward Guppy and apply 1 Debt.'),
  def('dart', 'Dart', 1, 2, 'yellow', 'cell', 'Move Guppy up to 2 tiles without using her move action.'),
];

const DEF_BY_ID = new Map(CARD_DEFS.map((d) => [d.defId, d]));

/** Deterministic starter deck: 20 cards, 2 copies of each def, unique uids. */
export function buildDeck(): Card[] {
  const deck: Card[] = [];
  let n = 0;
  for (const d of CARD_DEFS) {
    for (let copy = 0; copy < 2; copy++) {
      deck.push({ ...d, uid: `${d.defId}-${copy + 1}` });
      n++;
    }
  }
  return deck;
}

export function sellValue(card: Card): number {
  return card.coinValue;
}

// ---------------------------------------------------------------------------
// Targeting — single source of truth for valid targets
// ---------------------------------------------------------------------------

export interface TargetingCtx {
  heroPos: GridPos;
  enemyUnits: Unit[];
  occupied: (p: GridPos) => boolean;
}

export function cardTargeting(card: Card, ctx: TargetingCtx): CardTargeting {
  const adjacentEnemies = ctx.enemyUnits.filter((u) => adjacent(u.pos, ctx.heroPos));
  switch (card.defId) {
    case 'strike':
    case 'slam':
    case 'undercurrent':
      return {
        validCells: adjacentEnemies.map((u) => u.pos),
        validUnitUids: adjacentEnemies.map((u) => u.uid),
      };
    case 'harpoon':
      return {
        validCells: ctx.enemyUnits.filter((u) => chebyshev(u.pos, ctx.heroPos) <= 2).map((u) => u.pos),
        validUnitUids: ctx.enemyUnits.filter((u) => chebyshev(u.pos, ctx.heroPos) <= 2).map((u) => u.uid),
      };
    case 'dart':
      return {
        validCells: moveCells(ctx.heroPos, 2, ctx.occupied),
        validUnitUids: [],
      };
    case 'riptide':
    case 'shell':
    case 'patches':
    case 'gulp':
    case 'borrowed_time':
    default:
      // no-target cards resolve immediately on pick; pos is ignored
      return { validCells: [], validUnitUids: [] };
  }
}

// ---------------------------------------------------------------------------
// ActionResolver — applies GameActions safely, in order
// ---------------------------------------------------------------------------

export interface ResolveCtx {
  units: Unit[];
  heroUid: string;
  coins: number;
  occupied: (p: GridPos) => boolean;
}

export interface ResolveOutcome {
  units: Unit[];
  coins: number;
  removedUids: string[];
  log: string[];
  events: Array<{ kind: 'unit-moved'; unitUid: string; from: GridPos; to: GridPos }>;
}

const posKey = (p: GridPos) => `${p.x},${p.y}`;

/** Push/pull displacement; returns the new position or the same when blocked. */
function displace(
  unit: Unit,
  origin: GridPos,
  direction: 'push' | 'pull',
  tiles: number,
  occupied: (p: GridPos) => boolean,
  log: string[],
): GridPos {
  if (unit.isBoss) {
    log.push('Boss holds ground.');
    return unit.pos;
  }
  let cur = unit.pos;
  // unit vector from origin toward the target (clamped to axis steps)
  const stepX = origin.x === cur.x ? 0 : origin.x < cur.x ? -1 : 1;
  const stepY = origin.y === cur.y ? 0 : origin.y < cur.y ? -1 : 1;
  for (let i = 0; i < tiles; i++) {
    const next: GridPos =
      direction === 'push'
        ? { x: cur.x - stepX, y: cur.y - stepY } // away from origin
        : { x: cur.x + stepX, y: cur.y + stepY }; // toward origin
    if (!inBounds(next)) {
      log.push(`${unit.name} is blocked.`);
      break;
    }
    if (occupied(next)) {
      log.push(`${unit.name} is blocked.`);
      break;
    }
    cur = next;
    // pull stops adjacent to the origin
    if (direction === 'pull' && chebyshev(cur, origin) <= 1) break;
  }
  return cur;
}

export function resolveActions(actions: GameAction[], ctx: ResolveCtx): ResolveOutcome {
  let units = ctx.units.map((u) => ({ ...u }));
  let coins = ctx.coins;
  const removedUids: string[] = [];
  const log: string[] = [];
  const events: ResolveOutcome['events'] = [];
  const alive = () => units.filter((u) => !removedUids.includes(u.uid));
  const byUid = (uid: string) => alive().find((u) => u.uid === uid);

  for (const action of actions) {
    switch (action.type) {
      case 'damage_unit': {
        const target = byUid(action.targetUid);
        if (!target) {
          log.push('Target gone.');
          break;
        }
        const dmg = action.amount + target.debt;
        const r = applyDamage(target, dmg);
        target.hp = r.hp;
        target.armor = r.armor;
        if (r.died) {
          removedUids.push(target.uid);
          log.push(`${target.name} takes ${dmg} damage and is removed.`);
        } else {
          log.push(`${target.name} takes ${dmg} damage (${target.hp}/${target.maxHp} HP).`);
        }
        break;
      }
      case 'heal_unit': {
        const target = byUid(action.targetUid);
        if (!target) {
          log.push('Target gone.');
          break;
        }
        target.hp = Math.min(target.maxHp, target.hp + action.amount);
        log.push(`${target.name} recovers ${action.amount} HP.`);
        break;
      }
      case 'gain_armor': {
        const target = byUid(action.targetUid);
        if (!target) {
          log.push('Target gone.');
          break;
        }
        target.armor += action.amount;
        log.push(`${target.name} gains ${action.amount} armor.`);
        break;
      }
      case 'gain_coins': {
        coins += action.amount;
        log.push(`+${action.amount} coins.`);
        break;
      }
      case 'apply_debt': {
        const target = byUid(action.targetUid);
        if (!target) {
          log.push('Target gone.');
          break;
        }
        target.debt += action.amount;
        log.push(`${target.name} owes ${target.debt} debt.`);
        break;
      }
      case 'move_self': {
        const target = byUid(action.unitUid);
        if (!target) {
          log.push('Target gone.');
          break;
        }
        const from = target.pos;
        target.pos = action.to;
        events.push({ kind: 'unit-moved', unitUid: target.uid, from, to: action.to });
        break;
      }
      case 'move_unit': {
        const target = byUid(action.targetUid);
        const origin = byUid(action.originUid);
        if (!target || !origin) {
          log.push('Target gone.');
          break;
        }
        const from = target.pos;
        const to = displace(target, origin.pos, action.direction, action.tiles, ctx.occupied, log);
        target.pos = to;
        if (posKey(to) !== posKey(from)) {
          events.push({ kind: 'unit-moved', unitUid: target.uid, from, to });
        }
        break;
      }
    }
  }

  units = alive();
  return { units, coins, removedUids, log, events };
}
