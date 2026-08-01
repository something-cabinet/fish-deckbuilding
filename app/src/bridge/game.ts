// Bridge between the pure engine controller, the PixiJS board renderer, and the
// DOM-UI lane. Owns ALL player input wiring (P3):
//   - canvas pointer hits: select / move / attack / card-target / play / deselect
//   - DOM hand callbacks: arm, sell, drag-to-board
//   - end-turn + restart callbacks
//   - window keyboard map (Space end turn, 1–5 arm cards, Esc cancel)
//
// D4 / NFR-4 discipline: handlers are fire-and-forget controller calls — no
// awaits, no timers, no animation gating. The engine validates every action
// (D9) and rejects anything illegal; the snapshot subscription drives redraws.

import type { Controller, GameSnapshot, GridPos } from '../engine/contract';
import { createDeskRenderer } from '../render';
import type { DeskRenderer } from '../render';

export interface GameBridgeOptions {
  controller: Controller;
  host: HTMLElement;
}

/** Minimal pointer payload the DOM-UI drag callback must provide (client coords). */
export interface PointerPayload {
  clientX: number;
  clientY: number;
}

export interface GameBridge {
  mount(): void;
  destroy(): void;
  getRenderer(): DeskRenderer | null;
  /** HandRack.onSelectCard — arm a hand card; re-clicking the armed card disarms it. */
  onSelectCard(uid: string | null): void;
  /** HandRack.onSellCard — sell a hand card for 1 gold. */
  onSellCard(uid: string): void;
  /** HandRack.onCardDragStart — record the card being dragged. */
  onCardDragStart(uid: string): void;
  /** HandRack.onCardDragEnd — drop on a valid empty tile plays the card; otherwise just arms it. */
  onCardDragEnd(uid: string, e: PointerPayload): void;
  /** EndTurnTransport.onEndTurn — pass the turn. */
  onEndTurn(): void;
  /** DeskFrame.onRestart — restart the run. */
  onRestart(): void;
}

export function createGameBridge({ controller, host }: GameBridgeOptions): GameBridge {
  let renderer: DeskRenderer | null = null;
  let unsubscribe: (() => void) | null = null;
  let unsubscribeEvents: (() => void) | null = null;
  let destroyed = false;
  let dragCandidate: string | null = null;

  /** Controller may not be started yet; never let that throw through a handler. */
  function safeSnapshot(): GameSnapshot | null {
    try {
      return controller.getSnapshot();
    } catch {
      return null;
    }
  }

  function onResize(): void {
    renderer?.handleResize();
  }

  // ---------------------------------------------------------------- board pointer

  function onPointerDown(e: PointerEvent | MouseEvent): void {
    if (destroyed || e.button !== 0) return;
    const r = renderer;
    const s = safeSnapshot();
    if (!r || !s || s.phase !== 'player') return;
    const local = r.clientToLocal(e.clientX, e.clientY);
    if (!local) return;

    // Units take priority over bare tiles (hover affordance matches).
    const unitUid = r.unitAtPoint(local.x, local.y);
    if (unitUid) {
      const u = s.units.find((x) => x.uid === unitUid);
      if (!u || !u.alive) return;
      if (u.team === 'enemy') {
        // Legal attack (selected friendly): resolve the attack.
        if (s.validAttackTargets.includes(unitUid)) {
          controller.attackTarget(unitUid);
          return;
        }
        // Armed unit-target card: engine selectUnit card-target mode targets it.
        if (s.activeCardUid) {
          controller.selectUnit(unitUid);
          controller.playCard(); // engine resolves from the selection; rejects if mismatched
          return;
        }
        return; // no legal action on this enemy
      }
      // Own unit: with an armed card the engine decides card-target vs reselect;
      // playCard() no-ops when selection was not a card target.
      controller.selectUnit(unitUid);
      if (s.activeCardUid) controller.playCard();
      return;
    }

    // Tile-level clicks.
    const tile = r.tileAtPoint(local.x, local.y);
    if (!tile) return;
    if (s.validMoves.some((t) => t.x === tile.x && t.y === tile.y)) {
      controller.moveSelectedTo(tile);
      return;
    }
    if (
      s.activeCardUid &&
      s.activeCardTargets?.some((t) => t.x === tile.x && t.y === tile.y)
    ) {
      controller.playCard(tile);
      return;
    }
    controller.selectUnit(null); // empty ground: deselect
  }

  // --------------------------------------------------------------- DOM hand input

  function onSelectCard(uid: string | null): void {
    const s = safeSnapshot();
    if (destroyed || !s) return;
    if (uid !== null && s.activeCardUid === uid) {
      controller.setActiveCard(null); // toggle off
    } else {
      controller.setActiveCard(uid);
    }
  }

  function onSellCard(uid: string): void {
    if (destroyed) return;
    controller.sellCard(uid);
  }

  function onCardDragStart(uid: string): void {
    if (destroyed) return;
    dragCandidate = uid;
  }

  function onCardDragEnd(uid: string, e: PointerPayload): void {
    if (destroyed) return;
    if (dragCandidate === uid) dragCandidate = null;
    const r = renderer;
    // Arm first — dropping nowhere/illegal falls back to select-card-only.
    controller.setActiveCard(uid);
    const s = safeSnapshot();
    if (!r || !s) return;
    const local = r.clientToLocal(e.clientX, e.clientY);
    if (!local) return;
    const tile = r.tileAtPoint(local.x, local.y);
    if (!tile) return;
    if (
      s.activeCardUid === uid &&
      s.activeCardTargets?.some((t) => t.x === tile.x && t.y === tile.y)
    ) {
      controller.playCard(tile);
    }
  }

  // --------------------------------------------------------------------- actions

  function onEndTurn(): void {
    if (destroyed) return;
    controller.endTurn();
  }

  function onRestart(): void {
    if (destroyed) return;
    controller.restart();
  }

  // ------------------------------------------------------------------ keyboard

  function onKeyDown(e: KeyboardEvent): void {
    if (destroyed) return;
    const target = e.target as HTMLElement | null;
    // Never steal keys from form fields (NFR-4: input never blocked).
    if (
      target &&
      (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
    ) {
      return;
    }
    const s = safeSnapshot();
    if (!s) return;

    if (e.code === 'Space' || e.key === ' ') {
      e.preventDefault(); // stop page scroll; engine ignores non-player phases
      controller.endTurn();
      return;
    }
    if (e.code === 'Escape' || e.key === 'Escape') {
      controller.setActiveCard(null);
      controller.selectUnit(null);
      return;
    }
    if (e.key >= '1' && e.key <= '5') {
      const card = s.hand[Number(e.key) - 1];
      if (!card) return;
      if (s.activeCardUid === card.uid) controller.setActiveCard(null);
      else controller.setActiveCard(card.uid);
    }
  }

  // ------------------------------------------------------------------- lifecycle

  function mount(): void {
    if (destroyed || renderer) return;
    renderer = createDeskRenderer(host);
    renderer.mount();
    unsubscribe = controller.subscribe((snapshot) => renderer?.update(snapshot));
    // P4: forward transient engine events (attack-resolved, unit-moved, …) so the
    // renderer can drive staged visuals (block commitment, drama, telegraphs).
    unsubscribeEvents = controller.subscribeEvents((e) => renderer?.handleEvent(e));
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', onResize);
      window.addEventListener('keydown', onKeyDown);
      host.addEventListener('pointerdown', onPointerDown);
    }
    seed();
  }

  /** Seed the board with the current state so it isn't empty before the first action. */
  function seed(): void {
    try {
      const s = controller.getSnapshot();
      if (s && typeof s.turn === 'number' && s.turn >= 1) renderer?.update(s);
    } catch {
      // Controller not started yet — the start() emit will deliver the first snapshot.
    }
  }

  function destroy(): void {
    if (destroyed) return;
    destroyed = true;
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKeyDown);
    }
    host.removeEventListener('pointerdown', onPointerDown);
    unsubscribe?.();
    unsubscribe = null;
    unsubscribeEvents?.();
    unsubscribeEvents = null;
    renderer?.destroy();
    renderer = null;
  }

  return { mount, destroy, getRenderer: () => renderer, onSelectCard, onSellCard, onCardDragStart, onCardDragEnd, onEndTurn, onRestart };
}
