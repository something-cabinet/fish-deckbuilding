<script lang="ts">
  import { onMount } from 'svelte';
  import { gameState } from './lib/state';
  import { createEngine, startEngine } from './game/engine';
  import { MenuScene } from './game/scenes/MenuScene';
  import { MapScene } from './game/scenes/MapScene';
  import { BattleScene } from './game/scenes/BattleScene';
  import { registerBridge } from './game/bridge';

  import MainMenu from './ui/screens/MainMenu.svelte';
  import BattleHUD from './ui/hud/BattleHUD.svelte';
  import MapOverlay from './ui/hud/MapOverlay.svelte';
  import ShopPanel from './ui/shared/ShopPanel.svelte';
  import RestScreen from './ui/screens/RestScreen.svelte';
  import DeathScreen from './ui/screens/DeathScreen.svelte';
  import VictoryScreen from './ui/screens/VictoryScreen.svelte';

  let engineInitialized = $state(false);

  onMount(() => {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (!canvas) {
      console.warn('Game canvas not found');
      return;
    }

    // Register the bridge so ECS events sync to Svelte $state
    registerBridge(gameState);

    const engine = createEngine(canvas);

    // Register scenes
    engine.add('menu', new MenuScene());
    engine.add('map', new MapScene());
    engine.add('battle', new BattleScene());

    // Start with menu scene
    engine.goToScene('menu');
    startEngine().then(() => {
      engineInitialized = true;
      console.log('Excalibur engine started');
    });

    return () => {
      engine.stop();
    };
  });
</script>

<div class="app-shell">
  <!-- Excalibur Canvas Container -->
  <div class="canvas-container">
    <canvas id="game-canvas"></canvas>
  </div>

  <!-- Svelte UI Overlay -->
  <div class="ui-overlay">
    {#if gameState.screen === 'menu'}
      <MainMenu />
    {:else if gameState.screen === 'map'}
      <MapOverlay />
    {:else if gameState.screen === 'battle'}
      <BattleHUD />
    {:else if gameState.screen === 'shop'}
      <ShopPanel />
    {:else if gameState.screen === 'rest'}
      <RestScreen />
    {:else if gameState.screen === 'death'}
      <DeathScreen />
    {:else if gameState.screen === 'victory'}
      <VictoryScreen />
    {/if}
  </div>
</div>

<style>
  .app-shell {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  .canvas-container {
    position: absolute;
    inset: 0;
    z-index: 1;
  }

  .canvas-container canvas {
    width: 100%;
    height: 100%;
    display: block;
  }

  .ui-overlay {
    position: absolute;
    inset: 0;
    z-index: 10;
    pointer-events: none;
  }

  .ui-overlay > :global(*) {
    pointer-events: auto;
  }
</style>
