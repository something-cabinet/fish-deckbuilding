import type { Faction, GameSnapshot, GridPos, Phase } from '../engine/contract';

export interface UnitChange {
  uid: string;
  hp: number;
  maxHp: number;
  armor: number;
  debt: number;
  pos: GridPos;
  /** True when the unit was not present in the previous snapshot. */
  added: boolean;
}

export interface DiffResult {
  units: UnitChange[];
  /** New coin value, or null when unchanged. */
  coins: number | null;
  coinDelta: number;
  /** Winner transition (from, to), or null when unchanged. */
  winner: { from: Faction | null; to: Faction | null } | null;
  /** Turn transition (from, to), or null when unchanged. */
  turn: { from: number; to: number } | null;
  phase: { from: Phase; to: Phase } | null;
}

/**
 * Pure snapshot diff — the single tested seam between engine snapshots and
 * renderer needle targets (Gate 2 P2 directive: ALL damage visuals drive off
 * this, never off un-emitted card events).
 */
export function diffSnapshots(prev: GameSnapshot | null, next: GameSnapshot): DiffResult {
  const units: UnitChange[] = [];
  if (prev === null) {
    for (const u of next.units) {
      units.push({ uid: u.uid, hp: u.hp, maxHp: u.maxHp, armor: u.armor, debt: u.debt, pos: { ...u.pos }, added: true });
    }
  } else {
    const prevByUid = new Map(prev.units.map((u) => [u.uid, u]));
    for (const u of next.units) {
      const p = prevByUid.get(u.uid);
      units.push({
        uid: u.uid,
        hp: u.hp,
        maxHp: u.maxHp,
        armor: u.armor,
        debt: u.debt,
        pos: { ...u.pos },
        added: p === undefined,
      });
    }
  }

  const coinsChanged = prev === null || prev.coins !== next.coins;
  const winnerChanged = prev === null || prev.winner !== next.winner;
  const turnChanged = prev === null || prev.turn !== next.turn;
  const phaseChanged = prev === null || prev.phase !== next.phase;

  return {
    units,
    coins: coinsChanged ? next.coins : null,
    coinDelta: prev === null ? next.coins : next.coins - prev.coins,
    winner: winnerChanged ? { from: prev?.winner ?? null, to: next.winner } : null,
    turn: turnChanged ? { from: prev?.turn ?? 0, to: next.turn } : null,
    phase: phaseChanged ? { from: prev?.phase ?? 'player', to: next.phase } : null,
  };
}

export interface DamageOccurrence {
  uid: string;
  damage: number;
}

/**
 * Units that LOST hp between two snapshots — the tested trigger for damage
 * visuals (impact bursts, needle slams). Pure: callers must pass the PREVIOUS
 * snapshot, never the current one (desk.ts bug class: assigning lastSnap
 * before diffing). Heals, new units, and unchanged units produce nothing.
 */
export function damageOccurrences(prev: GameSnapshot | null, next: GameSnapshot): DamageOccurrence[] {
  if (prev === null) return [];
  const out: DamageOccurrence[] = [];
  for (const u of next.units) {
    const p = prev.units.find((x) => x.uid === u.uid);
    if (p && u.hp < p.hp) out.push({ uid: u.uid, damage: p.hp - u.hp });
  }
  return out;
}
