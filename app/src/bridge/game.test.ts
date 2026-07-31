// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameSnapshot } from '../engine/contract';

// --- hoisted mocks (Gate 4 P0-3: bridge orchestration tests) ---
const deskMock = vi.hoisted(() => ({
  mount: vi.fn(async () => {}),
  applySnapshot: vi.fn(),
  applyEvent: vi.fn(),
  reset: vi.fn(),
  destroy: vi.fn(),
  screenToCell: vi.fn(() => ({ x: 4, y: 2 })),
  cellClick: null as null | ((pos: { x: number; y: number }) => void),
}));

const audioMock = vi.hoisted(() => ({
  play: vi.fn(),
  unlock: vi.fn(),
  setMuted: vi.fn(),
  setReducedMotion: vi.fn(),
  isMuted: vi.fn(() => false),
  close: vi.fn(),
}));

vi.mock('../render/desk', () => ({
  DeskRenderer: class {
    mount = vi.fn(async (_host: HTMLElement, callbacks: { onCellClick: (pos: { x: number; y: number }) => void }) => {
      deskMock.cellClick = callbacks.onCellClick;
    });
    applySnapshot = deskMock.applySnapshot;
    applyEvent = deskMock.applyEvent;
    reset = deskMock.reset;
    destroy = deskMock.destroy;
    screenToCell = deskMock.screenToCell;
  },
}));

vi.mock('./audio', () => ({
  AudioService: class {
    play = audioMock.play;
    unlock = audioMock.unlock;
    setMuted = audioMock.setMuted;
    setReducedMotion = audioMock.setReducedMotion;
    isMuted = audioMock.isMuted;
    close = audioMock.close;
  },
}));

import { game } from './state.svelte';
import { createGameBridge } from './game';

function makeHost(): HTMLDivElement {
  const host = document.createElement('div');
  host.style.width = '800px';
  host.style.height = '600px';
  Object.defineProperty(host, 'getBoundingClientRect', {
    value: () => ({ left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600, x: 0, y: 0 }),
  });
  document.body.appendChild(host);
  return host;
}

describe('GameBridge (orchestration — Gate 4 P0-3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    game.snapshot = null;
    game.dropResult = null;
    game.debugVisible = false;
    game.hintVisible = true;
    game.muted = false;
    deskMock.cellClick = null;
    document.body.innerHTML = '';
    // jsdom lacks matchMedia — polyfill used by the bridge's reduced-motion gate
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((q: string) => ({
        matches: false,
        media: q,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  it('boot fan-out: start() delivers the initial snapshot (5 hand, 3 units) to desk + state', async () => {
    const host = makeHost();
    const bridge = createGameBridge(host);
    bridge.start();
    await Promise.resolve(); // allow async desk.mount
    expect(game.snapshot).not.toBeNull();
    expect(game.snapshot!.hand).toHaveLength(5);
    expect(game.snapshot!.units).toHaveLength(3);
    expect(game.snapshot!.phase).toBe('player');
    expect(deskMock.applySnapshot).toHaveBeenCalledWith(game.snapshot);
  });

  it('restart() delivers a fresh battle with no stale winner/state', async () => {
    const host = makeHost();
    const bridge = createGameBridge(host);
    bridge.start();
    await Promise.resolve();
    // force a winner through the controller (hero survives; just check restart freshness)
    bridge.controller.endTurn();
    bridge.restart();
    await Promise.resolve();
    expect(game.snapshot!.turn).toBe(1);
    expect(game.snapshot!.winner).toBeNull();
    expect(game.snapshot!.phase).toBe('player');
    expect(deskMock.reset).toHaveBeenCalled();
  });

  it('single-subscription discipline: each mutation emits exactly one snapshot to the desk', async () => {
    const host = makeHost();
    const bridge = createGameBridge(host);
    bridge.start();
    await Promise.resolve();
    deskMock.applySnapshot.mockClear();
    bridge.controller.sellCard(game.snapshot!.hand[0]!.uid);
    expect(deskMock.applySnapshot).toHaveBeenCalledTimes(1);
    deskMock.applySnapshot.mockClear();
    bridge.controller.endTurn();
    expect(deskMock.applySnapshot).toHaveBeenCalledTimes(1);
  });

  it('cell click with an active card plays it (no-target card works anywhere)', async () => {
    const host = makeHost();
    const bridge = createGameBridge(host);
    bridge.start();
    await Promise.resolve();
    // riptide: targetMode none (in opening hand) — playable at any cell
    const riptide = game.snapshot!.hand.find((c) => c.defId === 'riptide')!;
    bridge.controller.setActiveCard(riptide.uid);
    const coinsBefore = game.snapshot!.coins;
    deskMock.cellClick!({ x: 4, y: 2 });
    // riptide: cost 2 → coins -2
    expect(game.snapshot!.coins).toBe(coinsBefore - 2);
    expect(game.snapshot!.activeCardUid).toBeNull();
    expect(game.dropResult?.ok).toBe(true);
  });

  it('cell click routes move: selected unit moves to a valid cell', async () => {
    const host = makeHost();
    const bridge = createGameBridge(host);
    bridge.start();
    await Promise.resolve();
    bridge.controller.selectUnit('guppy');
    const valid = game.snapshot!.validMoves[0]!;
    const before = game.snapshot!.units.find((u) => u.uid === 'guppy')!.pos;
    deskMock.cellClick!(valid);
    const after = game.snapshot!.units.find((u) => u.uid === 'guppy')!.pos;
    expect(after).not.toEqual(before);
  });

  it('drag-to-board: pointerdown on a card + pointerup over the host plays it', async () => {
    const host = makeHost();
    const bridge = createGameBridge(host);
    bridge.start();
    await Promise.resolve();
    const riptide = game.snapshot!.hand.find((c) => c.defId === 'riptide')!;
    bridge.controller.setActiveCard(riptide.uid);
    const coinsBefore = game.snapshot!.coins;

    const card = document.createElement('div');
    card.className = 'channel-card';
    document.body.appendChild(card);
    card.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10 }));

    window.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 400, clientY: 300 }));
    expect(game.snapshot!.coins).toBe(coinsBefore - 2);
    expect(game.snapshot!.activeCardUid).toBeNull();
  });

  it('drag release outside the host does not play', async () => {
    const host = makeHost();
    const bridge = createGameBridge(host);
    bridge.start();
    await Promise.resolve();
    const riptide = game.snapshot!.hand.find((c) => c.defId === 'riptide')!;
    bridge.controller.setActiveCard(riptide.uid);
    const coinsBefore = game.snapshot!.coins;

    const card = document.createElement('div');
    card.className = 'channel-card';
    document.body.appendChild(card);
    card.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10 }));

    window.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 5000, clientY: 5000 }));
    expect(game.snapshot!.coins).toBe(coinsBefore);
    expect(game.snapshot!.activeCardUid).toBe(riptide.uid);
  });

  it('keyboard: Space ends the turn (player phase only)', async () => {
    const host = makeHost();
    const bridge = createGameBridge(host);
    bridge.start();
    await Promise.resolve();
    const turnBefore = game.snapshot!.turn;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }));
    expect(game.snapshot!.turn).toBe(turnBefore + 1);
    expect(game.snapshot!.phase).toBe('player'); // full cycle completed
  });

  it('keyboard: digits pick cards, D toggles debug, M toggles mute', async () => {
    const host = makeHost();
    const bridge = createGameBridge(host);
    bridge.start();
    await Promise.resolve();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '1', bubbles: true }));
    expect(game.snapshot!.activeCardUid).toBe(game.snapshot!.hand[0]!.uid);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', bubbles: true }));
    expect(game.debugVisible).toBe(true);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'm', bubbles: true }));
    expect(game.muted).toBe(true);
    expect(audioMock.setMuted).toHaveBeenCalledWith(true);
  });

  it('cell click on empty ground deselects', async () => {
    const host = makeHost();
    const bridge = createGameBridge(host);
    bridge.start();
    await Promise.resolve();
    bridge.controller.selectUnit('guppy');
    expect(game.snapshot!.selectedUnitUid).toBe('guppy');
    // a far, empty cell — no unit, not a valid move, not an attack target
    deskMock.cellClick!({ x: 0, y: 4 });
    expect(game.snapshot!.selectedUnitUid).toBeNull();
  });

  it('destroy tears down listeners and closes audio', () => {
    const host = makeHost();
    const bridge = createGameBridge(host);
    bridge.start();
    bridge.destroy();
    expect(deskMock.destroy).toHaveBeenCalled();
    expect(audioMock.close).toHaveBeenCalled();
  });
});
