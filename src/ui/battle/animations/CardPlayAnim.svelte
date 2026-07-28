<script lang="ts">
  import { onMount } from 'svelte';

  interface Props {
    /** Unique ID so Svelte can re-trigger on new plays */
    animKey: string;
    /** Card element's bounding rect for start position */
    originRect: { x: number; y: number; width: number; height: number } | null;
    /** Target grid position on screen for the resolve flash */
    targetPosition: { x: number; y: number } | null;
    cardName: string;
    onComplete?: () => void;
  }

  let {
    animKey,
    originRect,
    targetPosition,
    cardName,
    onComplete,
  }: Props = $props();

  // Derive CSS values from rects so the component is reactive
  let startX = $derived(originRect ? originRect.x + originRect.width / 2 : '50%');
  let startY = $derived(originRect ? originRect.y + originRect.height / 2 : '50%');

  let flashX = $derived(targetPosition?.x ?? '50%');
  let flashY = $derived(targetPosition?.y ?? '50%');

  let phase: 'entering' | 'playing' | 'exiting' | 'done' = $state('entering');

  onMount(() => {
    // Stage 1: hold card at origin (brief)
    const t1 = setTimeout(() => {
      phase = 'playing';
    }, 50);

    // Stage 2: flash at target + fade card
    const t2 = setTimeout(() => {
      phase = 'exiting';
    }, 400);

    // Stage 3: done
    const t3 = setTimeout(() => {
      phase = 'done';
      onComplete?.();
    }, 700);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  });
</script>

{#if phase !== 'done'}
  <!-- Card fly-out from hand position -->
  {#if phase === 'entering' || phase === 'playing'}
    <div
      class="card-play-anim"
      class:fade-out={phase === 'playing'}
      style="
        --start-x: {typeof startX === 'number' ? startX + 'px' : startX};
        --start-y: {typeof startY === 'number' ? startY + 'px' : startY};
      "
      role="presentation"
    >
      <div class="card-ghost">
        {cardName}
      </div>
    </div>
  {/if}

  <!-- Resolve flash on target grid -->
  {#if phase === 'playing' || phase === 'exiting'}
    <div
      class="resolve-flash"
      style="
        --flash-x: {typeof flashX === 'number' ? flashX + 'px' : flashX};
        --flash-y: {typeof flashY === 'number' ? flashY + 'px' : flashY};
      "
      role="presentation"
    ></div>
  {/if}
{/if}

<style>
  .card-play-anim {
    position: fixed;
    z-index: 900;
    pointer-events: none;
    left: var(--start-x);
    top: var(--start-y);
    transform: translate(-50%, -50%);
    animation: card-scale-out 0.35s ease-in forwards;
  }

  .card-ghost {
    padding: 0.5rem 1rem;
    background: linear-gradient(135deg, var(--panel-bg) 0%, var(--deep) 100%);
    border: 2px solid var(--gold-dim);
    border-radius: 8px;
    color: var(--parchment);
    font-family: 'VT323', monospace;
    font-size: 0.9rem;
    font-weight: 700;
    white-space: nowrap;
    box-shadow: 0 4px 24px rgba(244, 196, 48, 0.3);
    opacity: 0.9;
  }

  @keyframes card-scale-out {
    0% {
      opacity: 0.9;
      transform: translate(-50%, -50%) scale(1);
    }
    100% {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.6);
    }
  }

  .fade-out {
    transition: opacity 0.2s ease;
  }

  .resolve-flash {
    position: fixed;
    z-index: 899;
    pointer-events: none;
    left: var(--flash-x);
    top: var(--flash-y);
    transform: translate(-50%, -50%);
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(244, 196, 48, 0.4) 0%, transparent 70%);
    animation: flash-pop 0.5s ease-out forwards;
  }

  @keyframes flash-pop {
    0% {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.3);
    }
    30% {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1.2);
    }
    100% {
      opacity: 0;
      transform: translate(-50%, -50%) scale(1.5);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .card-play-anim,
    .card-ghost,
    .resolve-flash {
      animation: none;
      display: none;
    }
  }
</style>
