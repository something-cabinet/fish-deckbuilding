<script lang="ts">
  import { onMount } from 'svelte';
  import type { GameSnapshot } from './engine/contract';
  import type { HoverContent } from './ui/HoverPanel.svelte';
  import DeskFrame from './ui/DeskFrame.svelte';
  import { createGameBridge } from './bridge/game';
  import type { GameBridge } from './bridge/game';
  import { game } from './bridge/state.svelte';

  // Boot snapshot so DeskFrame (and its canvas host) render immediately;
  // the real snapshot replaces it the moment the bridge subscribes.
  const BOOT_SNAPSHOT: GameSnapshot = {
    turn: 1, phase: 'player', coins: 0, interestDue: 0,
    hand: [], deck: [], discard: [], sellPile: [],
    units: [], heroUid: 'guppy',
    selectedUnitUid: null, validMoves: [], validAttackTargets: [],
    activeCardUid: null, activeCardTargets: null,
    log: ['The desk opens…'], winner: null,
  };

  let bridge: GameBridge | null = null;
  let hoveredUid = $state<string | null>(null);

  // One-shot bridge creation, driven by DeskFrame's canvas-host callback —
  // NO $bindable/$state element binding (that pattern re-renders in a loop,
  // spawning a fresh bridge every cycle — the boot smoke-test defect).
  onMount(() => () => bridge?.destroy());

  const onCanvasReady = (el: HTMLDivElement) => {
    if (bridge) return;
    bridge = createGameBridge(el);
    bridge.start();
  };

  const hoverContent = $derived.by(() => {
    const snap = game.snapshot;
    if (!hoveredUid || !snap) return null;
    const unit = snap.units.find((u) => u.uid === hoveredUid);
    if (unit) return { kind: 'unit', unit } satisfies HoverContent;
    const card = snap.hand.find((c) => c.uid === hoveredUid);
    if (card) return { kind: 'card', card } satisfies HoverContent;
    return null;
  });

  const pick = (uid: string | null) => {
    if (!bridge || !game.snapshot) return;
    if (game.snapshot.phase !== 'player' || game.snapshot.winner) return;
    bridge.controller.setActiveCard(uid);
    bridge.audio.play('pick');
  };
  const sell = (uid: string) => {
    if (!bridge || !game.snapshot) return;
    if (game.snapshot.phase !== 'player' || game.snapshot.winner) return;
    const res = bridge.controller.sellCard(uid);
    game.dropResult = res;
    bridge.audio.play('sell');
  };
  const endTurn = () => {
    if (!bridge || !game.snapshot) return;
    if (game.snapshot.phase !== 'player' || game.snapshot.winner) return;
    bridge.audio.play('endturn');
    bridge.controller.endTurn();
  };
  const restart = () => {
    bridge?.restart();
  };
  const dismissHint = () => {
    game.hintVisible = false;
  };
</script>

<!--
  THESIS: The battle is the debt department's broadcast console — the board is a patch field of ivory meter faces, and every consequence of play is carried by ballistic needles, never floating text. Refuses the fantasy-chrome tactics HUD.
  OWN-WORLD: warm ivory meter faces behind glass, black scale arcs and ballistic needles as working ink, walnut-and-steel desk frame; the arc past zero is the ONLY red — reserved for damage, debt, defeat.
  STORY: The player is an operator metering Guppy's debt in the underwater city; they read the battlefield in one sweep, commit positional decisions, and feel each commitment land in the needles.
  FIRST VIEWPORT: 9x5 patch field center on walnut; hand as channel-strip rack along the bottom; end-turn transport bottom-right; coin meter left edge; deck/discard instrument panels; Guppy is the master channel.
  FORM: VU-Meter Desk world (user-chosen direction; seed 273c8ea7, challenger signals-instruments-vu-meter-bridge), index 5 on the dealt hand, committed at full fidelity.
  FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md.
-->
<DeskFrame
  snapshot={game.snapshot ?? BOOT_SNAPSHOT}
  hintVisible={game.hintVisible}
  debugVisible={game.debugVisible}
  {hoverContent}
  dropResult={game.dropResult}
  onCanvasReady={onCanvasReady}
  onPick={pick}
  onSell={sell}
  onHover={(uid) => (hoveredUid = uid)}
  onEndTurn={endTurn}
  onDismissHint={dismissHint}
  onRestart={restart}
/>
