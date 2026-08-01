<script lang="ts">
  import { onMount } from 'svelte';
  import type { GameSnapshot } from './engine';
  import { createController } from './engine';
  import DeskFrame from './ui/DeskFrame.svelte';
  import HandRack from './ui/HandRack.svelte';
  import EndTurnTransport from './ui/EndTurnTransport.svelte';
  import { createGameBridge } from './bridge/game';
  import type { GameBridge } from './bridge/game';

  let snapshot = $state<GameSnapshot | null>(null);
  let bridge: GameBridge | null = null;

  // Controller lifecycle: created once per instance, started exactly once on
  // mount (onMount runs a single time, so it can never start twice).
  const controller = createController();
  const unsubscribe = controller.subscribe((s) => {
    snapshot = s;
  });

  onMount(() => {
    controller.start();
    return () => {
      unsubscribe();
      bridge?.destroy();
    };
  });

  // P3 handoff: DeskFrame reports its canvas host once it binds; mount the desk
  // renderer + bridge there. All input (canvas, keyboard, DOM callbacks) lives
  // in the bridge — this component only routes component props to it.
  function onCanvasReady(host: HTMLElement) {
    if (bridge) return;
    bridge = createGameBridge({ controller, host });
    bridge.mount();
  }
</script>

<DeskFrame {snapshot} {onCanvasReady} onRestart={() => bridge?.onRestart()} />

{#if snapshot}
  <HandRack
    {snapshot}
    onSelectCard={(uid) => bridge?.onSelectCard(uid)}
    onSellCard={(uid) => bridge?.onSellCard(uid)}
    onCardDragStart={(uid) => bridge?.onCardDragStart(uid)}
    onCardDragEnd={(uid, e) => bridge?.onCardDragEnd(uid, e)}
  />
  <EndTurnTransport {snapshot} onEndTurn={() => bridge?.onEndTurn()} />
{/if}
