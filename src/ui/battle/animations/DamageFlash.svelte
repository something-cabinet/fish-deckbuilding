<script lang="ts">
  import { onMount } from 'svelte';

  interface Props {
    /** Unique key to re-trigger the animation */
    animKey: string;
    /** Position of the damaged unit on screen */
    position: { x: number; y: number } | null;
    /** If true, triggers screen shake on heavy damage */
    heavy?: boolean;
    onComplete?: () => void;
  }

  let {
    animKey,
    position,
    heavy = false,
    onComplete,
  }: Props = $props();

  let flashVisible = $state(true);

  onMount(() => {
    const timer = setTimeout(() => {
      flashVisible = false;
      onComplete?.();
    }, 200);
    return () => clearTimeout(timer);
  });
</script>

{#if flashVisible && position}
  <!-- Red flash overlay on the damaged unit's tile -->
  <div
    class="damage-flash"
    class:heavy
    style="
      left: {position.x}px;
      top: {position.y}px;
    "
    role="presentation"
  ></div>

  {#if heavy}
    <!-- Screen shake for heavy damage -->
    <div class="screen-shake" role="presentation"></div>
  {/if}
{/if}

<style>
  .damage-flash {
    position: fixed;
    z-index: 950;
    pointer-events: none;
    width: 60px;
    height: 60px;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    background: radial-gradient(circle, rgba(232, 93, 78, 0.7) 0%, transparent 70%);
    animation: flash-fade 0.2s ease-out forwards;
  }

  @keyframes flash-fade {
    0% {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
    100% {
      opacity: 0;
      transform: translate(-50%, -50%) scale(2);
    }
  }

  .screen-shake {
    position: fixed;
    inset: 0;
    z-index: 998;
    pointer-events: none;
    animation: shake 0.2s ease-out;
  }

  @keyframes shake {
    0% { transform: translate(0, 0) scale(1); }
    15% { transform: translate(-3px, 2px) scale(1.01); }
    30% { transform: translate(3px, -2px) scale(1.01); }
    45% { transform: translate(-2px, 1px) scale(1); }
    60% { transform: translate(2px, -1px) scale(1); }
    75% { transform: translate(-1px, 1px) scale(1); }
    100% { transform: translate(0, 0) scale(1); }
  }

  .damage-flash.heavy {
    width: 100px;
    height: 100px;
    background: radial-gradient(circle, rgba(232, 93, 78, 0.9) 0%, rgba(255, 0, 0, 0.3) 40%, transparent 70%);
  }

  @media (prefers-reduced-motion: reduce) {
    .damage-flash,
    .damage-flash.heavy,
    .screen-shake {
      animation: none;
      opacity: 0;
      transition: opacity 0.2s ease;
    }
  }
</style>
