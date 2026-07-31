import { BattleController } from '../engine/controller';
import type { EngineController, GameSnapshot, GridPos } from '../engine/contract';
import { canAfford } from '../engine/economy';
import { DeskRenderer } from '../render/desk';
import { damageOccurrences } from '../render/snapshot-diff';
import { AudioService } from './audio';
import { game } from './state.svelte';

/**
 * GameBridge — the single resync fan-out point (Gate 2 M1/Gate 3):
 * - controller.subscribe → one snapshot → Svelte store + DeskRenderer + audio
 * - controller.onEvent → transient flourishes (desk + audio)
 * - cell click: active card → play; own unit → select; valid move → move;
 *   valid attack target → attack; else deselect
 * - drag-to-board: pointerdown on a card + pointerup over the canvas plays it
 *   (HTML5 drag suppresses canvas pointer events, so drops ride on the DOM)
 * - keyboard: Space end turn, Esc deselect, 1-5 pick card, S sell, D debug
 * - Restart (FR-7): fresh controller + desk.reset()
 */
export interface GameBridge {
  controller: EngineController;
  desk: DeskRenderer;
  audio: AudioService;
  start(): void;
  restart(): void;
  destroy(): void;
}

export function createGameBridge(host: HTMLElement): GameBridge {
  const audio = new AudioService();
  const desk = new DeskRenderer();
  let controller = new BattleController();
  let lastSnap: GameSnapshot | null = game.snapshot;
  let unsub: (() => void) | null = null;
  let unsubEv: (() => void) | null = null;
  let dragFromCard = false;
  let reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const onReduced = (e: MediaQueryListEvent): void => {
    reduced = e.matches;
    audio.setReducedMotion(reduced);
  };
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', onReduced);
  audio.setReducedMotion(reduced);

  const cellClick = (pos: GridPos): void => {
    const s = controller.getSnapshot();
    if (s.winner) return;

    // active card → play it at this cell
    if (s.activeCardUid) {
      const res = controller.playCard(s.activeCardUid, pos);
      game.dropResult = res;
      audio.play(res.ok ? 'play' : 'reject');
      return;
    }

    // own unit → select
    const unitAt = s.units.find((u) => u.pos.x === pos.x && u.pos.y === pos.y);
    if (unitAt && unitAt.faction === 'player') {
      controller.selectUnit(unitAt.uid);
      return;
    }

    // selected unit: move or attack
    if (s.selectedUnitUid) {
      if (s.validMoves.some((p) => p.x === pos.x && p.y === pos.y)) {
        controller.moveSelectedTo(pos);
        return;
      }
      const target = s.validAttackTargets.find((uid) => {
        const u = s.units.find((x) => x.uid === uid);
        return u && u.pos.x === pos.x && u.pos.y === pos.y;
      });
      if (target) {
        controller.attackTarget(target);
        return;
      }
    }

    controller.selectUnit(null);
  };

  const onCellClick = (pos: GridPos): void => {
    cellClick(pos);
  };

  const onWindowPointerDown = (e: PointerEvent): void => {
    dragFromCard = (e.target as HTMLElement | null)?.closest('.channel-card') !== null;
  };

  const onWindowPointerUp = (e: PointerEvent): void => {
    // drag-to-board: started on a card, released over the canvas
    if (!dragFromCard) return;
    dragFromCard = false;
    const s = controller.getSnapshot();
    if (!s.activeCardUid || s.winner) return;
    const rect = host.getBoundingClientRect();
    const inside =
      e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
    if (!inside) return;
    const cell = desk.screenToCell(e.clientX, e.clientY);
    if (!cell) return;
    const res = controller.playCard(s.activeCardUid, cell);
    game.dropResult = res;
    audio.play(res.ok ? 'play' : 'reject');
  };

  const onKey = (e: KeyboardEvent): void => {
    const s = controller.getSnapshot();
    if (s.winner) {
      if (e.key === 'Enter' || e.key === 'r') restart();
      return;
    }
    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      if (s.phase === 'player') {
        audio.play('endturn');
        controller.endTurn();
      }
      return;
    }
    if (e.key === 'Escape') {
      controller.selectUnit(null);
      controller.setActiveCard(null);
      return;
    }
    if (e.key === 'd' || e.key === 'D') {
      game.debugVisible = !game.debugVisible;
      return;
    }
    if (e.key === 'm' || e.key === 'M') {
      const next = !audio.isMuted();
      audio.setMuted(next);
      game.muted = next;
      return;
    }
    if (s.phase !== 'player') return;
    if (/^[1-5]$/.test(e.key)) {
      const idx = Number(e.key) - 1;
      const card = s.hand[idx];
      if (card) controller.setActiveCard(s.activeCardUid === card.uid ? null : card.uid);
      return;
    }
    if (e.key === 's' || e.key === 'S') {
      const active = s.activeCardUid;
      if (active && s.hand.some((c) => c.uid === active)) {
        const res = controller.sellCard(active);
        game.dropResult = res;
        audio.play('sell');
      }
    }
  };

  const start = (): void => {
    void desk.mount(host, { onCellClick }).catch((err) => console.error('[bridge] desk.mount failed:', err));
    unsub?.();
    unsubEv?.();
    // subscribe BEFORE start() — the initial snapshot must reach subscribers
    unsub = controller.subscribe(handleSnapshot);
    unsubEv = controller.onEvent((ev) => {
      desk.applyEvent(ev);
      if (ev.kind === 'card-sold') audio.play('sell');
    });
    try {
      controller.start();
    } catch (err) {
      console.error('[bridge] controller.start() threw:', err);
    }
    window.addEventListener('pointerdown', onWindowPointerDown);
    window.addEventListener('pointerup', onWindowPointerUp);
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', () => audio.unlock(), { once: true });
  };

  const handleSnapshot = (snap: GameSnapshot): void => {
    game.snapshot = snap;
    try {
      desk.applySnapshot(snap);
    } catch (err) {
      // A renderer failure must NEVER kill the input wiring — log and carry on.
      console.error('DeskRenderer.applySnapshot failed:', err);
    }
    // audio from diff (Gate 3: impact + coin gain ride the snapshot seam)
    const dmg = damageOccurrences(lastSnap, snap);
    if (dmg.length > 0) audio.play('impact');
    if (lastSnap && snap.coins > lastSnap.coins) audio.play('coin');
    if (snap.winner && snap.winner !== lastSnap?.winner) {
      audio.play(snap.winner === 'player' ? 'victory' : 'defeat');
    }
    lastSnap = snap;
  };

  const restart = (): void => {
    game.dropResult = null;
    controller = new BattleController();
    desk.reset();
    unsub?.();
    unsubEv?.();
    unsub = controller.subscribe(handleSnapshot);
    unsubEv = controller.onEvent((ev) => {
      desk.applyEvent(ev);
      if (ev.kind === 'card-sold') audio.play('sell');
    });
    controller.start();
  };

  const destroy = (): void => {
    window.removeEventListener('pointerdown', onWindowPointerDown);
    window.removeEventListener('pointerup', onWindowPointerUp);
    window.removeEventListener('keydown', onKey);
    window.matchMedia('(prefers-reduced-motion: reduce)').removeEventListener('change', onReduced);
    unsub?.();
    unsubEv?.();
    audio.close();
    desk.destroy();
  };

  return { controller, desk, audio, start, restart, destroy };
}

// re-export for the hand's affordability check (single source, Gate 3 P3)
export { canAfford };


