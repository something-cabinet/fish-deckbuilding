// @vitest-environment jsdom
//
// Bridge tests: renderer mount + snapshot forwarding (smoke) AND the full P3
// input wiring — canvas pointer hits (select/move/attack/card-target/deselect),
// card arm/sell/drag-to-board, end-turn/restart, and the window keyboard map
// (Space / 1–5 / Esc). The render module is mocked so the hit-test hooks are
// stubbed per test; engine rules are asserted through real controller snapshots.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HERO_UID } from '../engine/contract';
import type { Controller, GameSnapshot, GridPos, Unit } from '../engine/contract';
import { createController } from '../engine/controller';
import { cardDef } from '../engine/cards';

const h = vi.hoisted(() => {
  const renderer = {
    mount: vi.fn(),
    destroy: vi.fn(),
    update: vi.fn(),
    handleEvent: vi.fn(),
    handleResize: vi.fn(),
    motionEnabled: true,
    diff: null,
    lastPositions: new Map(),
    clientToLocal: vi.fn(),
    tileAtPoint: vi.fn(),
    unitAtPoint: vi.fn(),
    tileCenter: vi.fn(),
  };
  return { renderer, createDeskRenderer: vi.fn(() => renderer) };
});

vi.mock('../render', () => ({ createDeskRenderer: h.createDeskRenderer }));

import { createGameBridge } from './game';
import type { GameBridge } from './game';

/** Deterministic RNG for reproducible tests. */
function seededRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function makeHost(): HTMLElement {
  const host = document.createElement('div');
  document.body.appendChild(host);
  return host;
}

function mountBridge(controller: Controller, host: HTMLElement): GameBridge {
  const bridge = createGameBridge({ controller, host });
  bridge.mount();
  return bridge;
}

/** Stub the renderer hit-test chain for the next pointer event. */
function stubHits(unitUid: string | null, tile: GridPos | null, client = { x: 10, y: 10 }): void {
  h.renderer.clientToLocal.mockReturnValue(client);
  h.renderer.unitAtPoint.mockReturnValue(unitUid);
  h.renderer.tileAtPoint.mockReturnValue(tile);
}

function clickBoard(host: HTMLElement, clientX = 50, clientY = 60): void {
  host.dispatchEvent(new MouseEvent('pointerdown', { clientX, clientY, button: 0, bubbles: true }));
}

function pressKey(key: string, code?: string, target?: HTMLElement): KeyboardEvent {
  const ev = new KeyboardEvent('keydown', {
    key,
    code: code ?? key,
    bubbles: true,
    cancelable: true,
  });
  (target ?? window).dispatchEvent(ev);
  return ev;
}

function snap(c: Controller): GameSnapshot {
  return c.getSnapshot();
}

/** First hand card (start() always deals 5, so this is defined). */
function firstCard(c: Controller) {
  return c.getSnapshot().hand[0]!;
}

/** First hand card is affordable on turn 1 (mana 1). */
function firstCardAffordable(c: Controller): boolean {
  return cardDef(firstCard(c).cardUid).cost <= 1;
}

/**
 * Scan seeds for one whose (post-start) starting hand satisfies `predicate`.
 * Deck shuffle is rng-only, so the seed transfers to custom-unit setups.
 */
function findSeed(predicate: (c: Controller) => boolean, maxSeeds = 500): number {
  for (let seed = 1; seed <= maxSeeds; seed++) {
    const c = createController(seededRng(seed));
    c.start();
    if (predicate(c)) return seed;
  }
  throw new Error('no matching seed found');
}

function unit(uid: string, team: Unit['team'], pos: GridPos, hp = 5, attack = 0): Unit {
  return { uid, name: uid, team, pos, hp, maxHp: hp, attack, block: 0, moved: false, acted: false, alive: true };
}

describe('createGameBridge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------- smoke (P2)

  it('mounts a desk renderer into the host and forwards controller snapshots', () => {
    const host = makeHost();
    const controller = createController(() => 0.5);
    mountBridge(controller, host);

    expect(h.createDeskRenderer).toHaveBeenCalledWith(host);
    expect(h.renderer.mount).toHaveBeenCalledTimes(1);

    controller.start();
    expect(h.renderer.update).toHaveBeenCalled();
    const lastSnapshot = h.renderer.update.mock.lastCall?.[0] as GameSnapshot;
    expect(lastSnapshot).toBeTruthy();
    expect(lastSnapshot.turn).toBe(1);
    expect(lastSnapshot.units.length).toBeGreaterThan(0);
  });

  it('seeds the current snapshot when the controller already started before mount', () => {
    const host = makeHost();
    const controller = createController(() => 0.5);
    controller.start();
    mountBridge(controller, host);
    expect(h.renderer.update).toHaveBeenCalled();
  });

  it('destroy() unsubscribes and destroys the renderer', () => {
    const host = makeHost();
    const controller = createController(() => 0.5);
    const bridge = mountBridge(controller, host);
    controller.start();
    const countBefore = h.renderer.update.mock.calls.length;

    bridge.destroy();
    controller.selectUnit('guppy');

    expect(h.renderer.update.mock.calls.length).toBe(countBefore);
    expect(h.renderer.destroy).toHaveBeenCalledTimes(1);
  });

  it('mount() is idempotent', () => {
    const host = makeHost();
    const controller = createController(() => 0.5);
    const bridge = mountBridge(controller, host);
    bridge.mount();
    expect(h.createDeskRenderer).toHaveBeenCalledTimes(1);
    expect(h.renderer.mount).toHaveBeenCalledTimes(1);
  });

  // ----------------------------------------------------------- canvas pointer

  it('click on an own unit selects it', () => {
    const host = makeHost();
    const controller = createController(() => 0.5);
    controller.start();
    mountBridge(controller, host);
    stubHits(HERO_UID, null);

    clickBoard(host);

    expect(snap(controller).selectedUnitUid).toBe(HERO_UID);
    expect(snap(controller).validMoves.length).toBeGreaterThan(0);
  });

  it('click on a valid-move tile moves the selected unit', () => {
    const host = makeHost();
    const controller = createController(() => 0.5);
    controller.start();
    mountBridge(controller, host);

    controller.selectUnit(HERO_UID);
    const target = snap(controller).validMoves[0] as GridPos;
    expect(target).toBeTruthy();
    stubHits(null, target);

    clickBoard(host);

    expect(snap(controller).units.find((u) => u.uid === HERO_UID)!.pos).toEqual(target);
  });

  it('click on a valid attack target attacks it (enemy hp drops)', () => {
    const host = makeHost();
    const units = [unit(HERO_UID, 'player', { x: 3, y: 2 }, 12, 2), unit('e1', 'enemy', { x: 4, y: 2 }, 5, 0)];
    const controller = createController(() => 0.5, units);
    controller.start();
    mountBridge(controller, host);

    controller.selectUnit(HERO_UID);
    expect(snap(controller).validAttackTargets).toContain('e1');
    stubHits('e1', null);

    clickBoard(host);

    expect(snap(controller).units.find((u) => u.uid === 'e1')!.hp).toBe(3);
  });

  it('click on empty ground deselects', () => {
    const host = makeHost();
    const controller = createController(() => 0.5);
    controller.start();
    mountBridge(controller, host);

    controller.selectUnit(HERO_UID);
    expect(snap(controller).selectedUnitUid).toBe(HERO_UID);
    // An empty tile that is not a valid move.
    stubHits(null, { x: 8, y: 4 });

    clickBoard(host);

    expect(snap(controller).selectedUnitUid).toBeNull();
  });

  it('click on an empty valid tile plays an armed empty-tile card', () => {
    // Turn 3 (mana 3) so hired-muscle (cost 3) is affordable; enemies placed far
    // away so the two simulated enemy phases never threaten the hero.
    const host = makeHost();
    const farUnits = [
      unit(HERO_UID, 'player', { x: 1, y: 2 }, 12, 2),
      unit('boss', 'enemy', { x: 8, y: 0 }, 10, 3),
      unit('thug-a', 'enemy', { x: 8, y: 2 }, 4, 2),
      unit('thug-b', 'enemy', { x: 8, y: 4 }, 4, 2),
    ];
    const seed = findSeed((c) => {
      c.endTurn();
      c.endTurn();
      const s = c.getSnapshot();
      return (
        s.phase === 'player' &&
        s.winner === null &&
        s.units.find((u) => u.uid === HERO_UID)?.alive === true &&
        s.hand.some((card) => card.cardUid === 'hired-muscle')
      );
    });
    const controller = createController(seededRng(seed), farUnits);
    controller.start();
    controller.endTurn();
    controller.endTurn();
    mountBridge(controller, host);

    const hired = snap(controller).hand.find((card) => card.cardUid === 'hired-muscle')!;
    expect(snap(controller).mana).toBe(3);
    controller.setActiveCard(hired.uid);
    const tile = snap(controller).activeCardTargets![0] as GridPos;
    stubHits(null, tile);

    clickBoard(host);

    const s = snap(controller);
    expect(s.hand.some((card) => card.uid === hired.uid)).toBe(false);
    expect(s.activeCardUid).toBeNull();
    expect(s.units.some((u) => u.name === 'Muscle')).toBe(true);
  });

  it('click on a unit while an enemy-unit card is armed targets and plays it', () => {
    const host = makeHost();
    const units = [unit(HERO_UID, 'player', { x: 3, y: 2 }, 12, 2), unit('e1', 'enemy', { x: 4, y: 2 }, 5, 0)];
    const seed = findSeed((c) => c.getSnapshot().hand.some((card) => cardDef(card.cardUid).target === 'enemy-unit' && cardDef(card.cardUid).cost <= 1));
    const controller = createController(seededRng(seed), units);
    controller.start();
    mountBridge(controller, host);

    const bridge = mountBridge(controller, host);
    const letter = snap(controller).hand.find((card) => cardDef(card.cardUid).uid === 'demand-letter')!;
    expect(letter).toBeTruthy();
    bridge.onSelectCard(letter.uid);
    expect(snap(controller).activeCardUid).toBe(letter.uid);
    stubHits('e1', null);

    clickBoard(host);

    const s = snap(controller);
    expect(s.hand.some((card) => card.uid === letter.uid)).toBe(false); // played
    expect(s.units.find((u) => u.uid === 'e1')!.hp).toBe(3); // 2 damage from demand-letter
    expect(s.activeCardUid).toBeNull();
  });

  // ------------------------------------------------------------------ hand input

  it('onSelectCard arms a card; re-selecting the armed card toggles it off', () => {
    const host = makeHost();
    const seed = findSeed(firstCardAffordable);
    const controller = createController(seededRng(seed));
    controller.start();
    const bridge = mountBridge(controller, host);
    const card = snap(controller).hand[0]!;

    bridge.onSelectCard(card.uid);
    expect(snap(controller).activeCardUid).toBe(card.uid);

    bridge.onSelectCard(card.uid);
    expect(snap(controller).activeCardUid).toBeNull();
  });

  it('onSellCard sells the card for 1 gold', () => {
    const host = makeHost();
    const seed = findSeed((c) => c.getSnapshot().hand.length === 5);
    const controller = createController(seededRng(seed));
    controller.start();
    const bridge = mountBridge(controller, host);
    const card = snap(controller).hand[0]!;

    bridge.onSellCard(card.uid);

    const s = snap(controller);
    expect(s.hand.some((c) => c.uid === card.uid)).toBe(false);
    expect(s.sellPile.some((c) => c.uid === card.uid)).toBe(true);
    expect(s.coins).toBe(1);
  });

  it('drag-to-board: dropping on a valid empty tile plays the armed card', () => {
    const host = makeHost();
    const farUnits = [
      unit(HERO_UID, 'player', { x: 1, y: 2 }, 12, 2),
      unit('boss', 'enemy', { x: 8, y: 0 }, 10, 3),
      unit('thug-a', 'enemy', { x: 8, y: 2 }, 4, 2),
      unit('thug-b', 'enemy', { x: 8, y: 4 }, 4, 2),
    ];
    const seed = findSeed((c) => {
      c.endTurn();
      c.endTurn();
      const s = c.getSnapshot();
      return (
        s.phase === 'player' &&
        s.winner === null &&
        s.units.find((u) => u.uid === HERO_UID)?.alive === true &&
        s.hand.some((card) => card.cardUid === 'hired-muscle')
      );
    });
    const controller = createController(seededRng(seed), farUnits);
    controller.start();
    controller.endTurn();
    controller.endTurn();
    const bridge = mountBridge(controller, host);

    const hired = snap(controller).hand.find((card) => card.cardUid === 'hired-muscle')!;
    bridge.onSelectCard(hired.uid);
    const tile = snap(controller).activeCardTargets![0] as GridPos;
    stubHits(null, tile, { x: 100, y: 100 });

    bridge.onCardDragStart(hired.uid);
    bridge.onCardDragEnd(hired.uid, { clientX: 100, clientY: 100 });

    const s = snap(controller);
    expect(s.hand.some((card) => card.uid === hired.uid)).toBe(false);
    expect(s.units.some((u) => u.name === 'Muscle')).toBe(true);
  });

  it('drag-to-board: dropping on an illegal tile just arms the card', () => {
    const host = makeHost();
    const seed = findSeed(firstCardAffordable);
    const controller = createController(seededRng(seed));
    controller.start();
    const bridge = mountBridge(controller, host);
    const card = snap(controller).hand[0]!;
    const before = snap(controller).hand.length;
    stubHits(null, { x: 0, y: 0 });

    bridge.onCardDragStart(card.uid);
    bridge.onCardDragEnd(card.uid, { clientX: 40, clientY: 50 });

    const s = snap(controller);
    expect(s.activeCardUid).toBe(card.uid); // armed, not played
    expect(s.hand.length).toBe(before);
  });

  // ------------------------------------------------------------- actions

  it('onEndTurn advances the turn and returns to the player phase', () => {
    const host = makeHost();
    const controller = createController(() => 0.5);
    controller.start();
    const bridge = mountBridge(controller, host);
    expect(snap(controller).turn).toBe(1);

    bridge.onEndTurn();

    const s = snap(controller);
    expect(s.phase).toBe('player');
    expect(s.turn).toBe(2);
    expect(s.mana).toBe(2);
  });

  it('onRestart resets to a fresh turn-1 snapshot', () => {
    const host = makeHost();
    const controller = createController(() => 0.5);
    controller.start();
    const bridge = mountBridge(controller, host);
    controller.selectUnit(HERO_UID);
    controller.endTurn();

    bridge.onRestart();

    const s = snap(controller);
    expect(s.turn).toBe(1);
    expect(s.phase).toBe('player');
    expect(s.selectedUnitUid).toBeNull();
    expect(s.hand).toHaveLength(5);
  });

  // ---------------------------------------------------------------- keyboard

  it('Space ends the turn (and prevents default page scroll)', () => {
    const host = makeHost();
    const controller = createController(() => 0.5);
    controller.start();
    mountBridge(controller, host);

    const ev = pressKey(' ', 'Space');

    expect(ev.defaultPrevented).toBe(true);
    expect(snap(controller).turn).toBe(2);
  });

  it('Digit keys 1–5 arm the matching hand card; pressing it again disarms', () => {
    const host = makeHost();
    const seed = findSeed(firstCardAffordable);
    const controller = createController(seededRng(seed));
    controller.start();
    mountBridge(controller, host);
    const first = snap(controller).hand[0]!;

    pressKey('1', 'Digit1');
    expect(snap(controller).activeCardUid).toBe(first.uid);

    pressKey('1', 'Digit1');
    expect(snap(controller).activeCardUid).toBeNull();
  });

  it('Escape cancels the armed card and the unit selection', () => {
    const host = makeHost();
    const seed = findSeed(firstCardAffordable);
    const controller = createController(seededRng(seed));
    controller.start();
    mountBridge(controller, host);
    const card = firstCard(controller);

    // Arming a card clears any unit selection (engine semantics), so the two
    // flags are mutually exclusive — Escape must clear whichever is active.
    controller.setActiveCard(card.uid);
    expect(snap(controller).activeCardUid).toBe(card.uid);
    pressKey('Escape', 'Escape');
    expect(snap(controller).activeCardUid).toBeNull();

    controller.selectUnit(HERO_UID);
    expect(snap(controller).selectedUnitUid).toBe(HERO_UID);
    pressKey('Escape', 'Escape');
    expect(snap(controller).selectedUnitUid).toBeNull();
  });

  it('keyboard input inside a form field is ignored (input never blocked)', () => {
    const host = makeHost();
    const controller = createController(() => 0.5);
    controller.start();
    mountBridge(controller, host);

    const input = document.createElement('input');
    document.body.appendChild(input);
    const ev = pressKey(' ', 'Space', input);

    expect(ev.defaultPrevented).toBe(false);
    expect(snap(controller).turn).toBe(1);
  });

  it('destroy() removes the window keyboard handlers', () => {
    const host = makeHost();
    const controller = createController(() => 0.5);
    controller.start();
    const bridge = mountBridge(controller, host);

    bridge.destroy();
    pressKey(' ', 'Space');

    expect(snap(controller).turn).toBe(1);
  });
});
