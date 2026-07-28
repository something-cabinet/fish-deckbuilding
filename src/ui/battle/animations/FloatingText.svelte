<script lang="ts">
  import { onMount } from 'svelte';

  interface Props {
    text: string;
    x: number;
    y: number;
    type: 'damage' | 'heal' | 'gold';
    /** Higher values float farther upward */
    magnitude?: number;
    onDestroy?: () => void;
  }

  let {
    text,
    x,
    y,
    type,
    magnitude = 1,
    onDestroy,
  }: Props = $props();

  let visible = $state(true);

  let duration = $derived(800 + magnitude * 200);
  let floatDistance = $derived(40 + magnitude * 20);

  onMount(() => {
    const timer = setTimeout(() => {
      visible = false;
      onDestroy?.();
    }, duration);
    return () => clearTimeout(timer);
  });
</script>

{#if visible}
  <div
    class="floating-text {type}"
    style="left: {x}px; top: {y}px; --float-distance: {floatDistance}px; --anim-duration: {duration}ms"
    role="status"
    aria-live="polite"
  >
    {text}
  </div>
{/if}

<style>
  .floating-text {
    position: fixed;
    pointer-events: none;
    font-weight: 900;
    font-size: 1.4rem;
    z-index: 1000;
    text-shadow:
      0 0 8px rgba(0, 0, 0, 0.8),
      0 2px 4px rgba(0, 0, 0, 0.6);
    white-space: nowrap;
    font-family: 'VT323', monospace;
    animation: float-up var(--anim-duration) ease-out forwards;
  }

  .damage {
    color: #e85d4e;
    text-shadow:
      0 0 8px rgba(232, 93, 78, 0.6),
      0 2px 4px rgba(0, 0, 0, 0.6);
  }

  .heal {
    color: #22c55e;
    text-shadow:
      0 0 8px rgba(34, 197, 94, 0.6),
      0 2px 4px rgba(0, 0, 0, 0.6);
  }

  .gold {
    color: #f4c430;
    text-shadow:
      0 0 8px rgba(244, 196, 48, 0.6),
      0 2px 4px rgba(0, 0, 0, 0.6);
  }

  @keyframes float-up {
    0% {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
    30% {
      opacity: 1;
      transform: translateY(calc(var(--float-distance) * -0.4)) scale(1.2);
    }
    100% {
      opacity: 0;
      transform: translateY(calc(var(--float-distance) * -1)) scale(0.8);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .floating-text {
      animation: none;
      opacity: 0;
      transition: opacity 0.3s ease;
    }
  }
</style>
