<script lang="ts">
  import { gameState } from '../../../../lib/state.svelte';

  let interestFlash = $state(0);

  $effect(() => {
    const interest = gameState.combat.interestDue;
    if (interest > 0) {
      interestFlash = interest;
      setTimeout(() => {
        interestFlash = 0;
      }, 2000);
    }
  });
</script>

{#if interestFlash > 0}
  <div class="interest-flash">
    INTEREST DAMAGE: {interestFlash}
  </div>
{/if}

<style>
  .interest-flash {
    text-align: center;
    padding: 0.5rem;
    background: rgba(232, 93, 78, 0.2);
    border: 1px solid var(--coral);
    color: var(--coral-light);
    font-weight: 700;
    font-size: 0.9rem;
    letter-spacing: 0.15em;
    animation: flash-fade 2s ease-out forwards;
  }

  @keyframes flash-fade {
    0% {
      opacity: 1;
    }
    70% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }
</style>
