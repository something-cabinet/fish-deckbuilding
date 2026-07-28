<script lang="ts">
  import { gameState } from '../../../../lib/state.svelte';
  import { eventBus } from '../../../../game/events';

  interface FloatingText {
    id: number;
    text: string;
    x: number;
    y: number;
    type: 'damage' | 'heal' | 'defeated';
  }

  let floaters = $state<FloatingText[]>([]);
  let nextId = 0;

  function getEnemyPosition(enemyIndex: number): { x: number; y: number } {
    const enemies = gameState.combat.enemies;
    const totalEnemies = enemies.length;
    const centerX = window.innerWidth / 2;
    const spacing = 130;
    const startX = centerX - ((totalEnemies - 1) * spacing) / 2;
    return {
      x: startX + enemyIndex * spacing,
      y: window.innerHeight * 0.32,
    };
  }

  function addFloater(text: string, x: number, y: number, type: FloatingText['type']) {
    const id = nextId++;
    const floater: FloatingText = { id, text, x, y, type };
    floaters = [...floaters, floater];
    setTimeout(() => {
      floaters = floaters.filter((f) => f.id !== id);
    }, 1000);
  }

  $effect(() => {
    const onEnemyKilled = (e: { enemyIndex: number }) => {
      const pos = getEnemyPosition(e.enemyIndex);
      addFloater('DEFEATED', pos.x, pos.y, 'defeated');
    };

    eventBus.on('enemy:killed', onEnemyKilled);

    return () => {
      eventBus.off('enemy:killed', onEnemyKilled);
    };
  });
</script>

{#each floaters as floater (floater.id)}
  <div
    class="floating-text {floater.type}"
    style="left: {floater.x}px; top: {floater.y}px"
  >
    {floater.text}
  </div>
{/each}

<style>
  .floating-text {
    position: fixed;
    pointer-events: none;
    font-weight: 700;
    font-size: 1.2rem;
    z-index: 1000;
    animation: float-up 1s ease-out forwards;
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
    white-space: nowrap;
  }

  .damage { color: var(--hp-bar); }
  .heal { color: var(--stat-def-light); }
  .defeated {
    color: var(--coral-light);
    font-size: 0.9rem;
    letter-spacing: 0.1em;
  }

  @keyframes float-up {
    0% { opacity: 1; transform: translateY(0) scale(1); }
    60% { opacity: 1; transform: translateY(-40px) scale(1.1); }
    100% { opacity: 0; transform: translateY(-60px) scale(0.8); }
  }
</style>
