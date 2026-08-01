// Snapshot diffing: pure prev→next deltas for the render layer.
// P4 consumes `moved` for the walk animation, `hpChanges` for floating numbers,
// and `added`/`removed` for summon/death handling. Pure TS, no framework deps.

import type { GameSnapshot, GridPos } from '../engine/contract';

export interface MovedUnit {
  uid: string;
  from: GridPos;
  to: GridPos;
}

export interface HpChange {
  uid: string;
  before: number;
  after: number;
}

export interface SnapshotDiff {
  moved: MovedUnit[];
  hpChanges: HpChange[];
  added: string[];
  removed: string[];
}

/**
 * Diff two consecutive snapshots into unit-level deltas.
 * - `moved`: alive units whose position changed between snapshots.
 * - `hpChanges`: units whose HP changed, including the killing blow (a unit that
 *   dies keeps its entry with `after: 0`-ish corpse HP).
 * - `added`: uids alive in `next` but absent from `prev` (summons).
 * - `removed`: uids alive in `prev` but not alive in `next` (deaths).
 * Ordering is deterministic (sorted by uid) for stable tests/P4 consumption.
 */
export function diffSnapshots(prev: GameSnapshot, next: GameSnapshot): SnapshotDiff {
  const prevAlive = new Map<string, { hp: number; pos: GridPos }>();
  for (const u of prev.units) if (u.alive) prevAlive.set(u.uid, { hp: u.hp, pos: u.pos });
  const nextAlive = new Map<string, { hp: number; pos: GridPos }>();
  for (const u of next.units) if (u.alive) nextAlive.set(u.uid, { hp: u.hp, pos: u.pos });

  const all = new Set<string>([...prevAlive.keys(), ...nextAlive.keys()]);
  const moved: MovedUnit[] = [];
  const hpChanges: HpChange[] = [];
  const added: string[] = [];
  const removed: string[] = [];

  for (const uid of all) {
    const p = prevAlive.get(uid);
    const n = nextAlive.get(uid);
    if (p && n) {
      if (p.pos.x !== n.pos.x || p.pos.y !== n.pos.y) {
        moved.push({ uid, from: { ...p.pos }, to: { ...n.pos } });
      }
      if (p.hp !== n.hp) {
        hpChanges.push({ uid, before: p.hp, after: n.hp });
      }
    } else if (!p && n) {
      added.push(uid);
    } else if (p && !n) {
      removed.push(uid);
      // Capture the killing blow so floating numbers still fire for the death hit.
      const corpse = next.units.find((u) => u.uid === uid);
      hpChanges.push({ uid, before: p.hp, after: corpse ? corpse.hp : 0 });
    }
  }

  const cmp = (a: string, b: string): number => (a < b ? -1 : 1);
  moved.sort((a, b) => cmp(a.uid, b.uid));
  hpChanges.sort((a, b) => cmp(a.uid, b.uid));
  added.sort(cmp);
  removed.sort(cmp);

  return { moved, hpChanges, added, removed };
}
