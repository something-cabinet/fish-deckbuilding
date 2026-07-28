<script lang="ts">
  import { onMount } from 'svelte';
  import { gameState } from './lib/state.svelte';
  import { createEngine, startEngine, getEngine } from './game/engine';
  import { MenuScene } from './game/scenes/MenuScene';
  import { IslandScene } from './game/scenes/IslandScene';
  import { BattleScene } from './game/scenes/BattleScene';
  import { registerBridge, registerIslandScene, syncIslandScene } from './game/bridge';

  import MainMenu from './ui/screens/MainMenu.svelte';
  import BattleHUD from './ui/hud/BattleHUD.svelte';
  import MapOverlay from './ui/hud/MapOverlay.svelte';
  import ShopScreen from './ui/screens/ShopScreen.svelte';
  import RewardScreen from './ui/screens/RewardScreen.svelte';
  import DeckScreen from './ui/screens/DeckScreen.svelte';
  import SaveScreen from './ui/screens/SaveScreen.svelte';
  import SettingsScreen from './ui/screens/SettingsScreen.svelte';
  import RestScreen from './ui/screens/RestScreen.svelte';
  import DeathScreen from './ui/screens/DeathScreen.svelte';
  import VictoryScreen from './ui/screens/VictoryScreen.svelte';
  import DialogueBox from './ui/shared/DialogueBox.svelte';

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

    // Island overworld map (replaces the old STS-style MapScene)
    const islandScene = new IslandScene();
    registerIslandScene(islandScene);
    engine.add('map', islandScene);

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

  // C2: Reactively switch Excalibur scenes when gameState.screen changes
  $effect(() => {
    if (!engineInitialized) return;
    const screen = gameState.screen;
    const engine = getEngine();
    if (!engine) return;

    switch (screen) {
      case 'menu':
        engine.goToScene('menu');
        break;
      case 'map':
        engine.goToScene('map').then(syncIslandScene);
        break;
      case 'battle':
        engine.goToScene('battle');
        break;
      default:
        // Other screens (shop, cardReward, deck, save, settings, rest, death, victory)
        // These are pure Svelte overlays — keep the current Excalibur scene active
        break;
    }
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
      <ShopScreen />
    {:else if gameState.screen === 'cardReward'}
      <RewardScreen />
    {:else if gameState.screen === 'deck'}
      <DeckScreen />
    {:else if gameState.screen === 'save'}
      <SaveScreen />
    {:else if gameState.screen === 'settings'}
      <SettingsScreen />
    {:else if gameState.screen === 'rest'}
      <RestScreen />
    {:else if gameState.screen === 'death'}
      <DeathScreen />
    {:else if gameState.screen === 'victory'}
      <VictoryScreen />
    {:else if gameState.screen === 'dialogue'}
      <DialogueBox />
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
