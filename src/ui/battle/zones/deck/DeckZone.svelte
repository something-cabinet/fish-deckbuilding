<script lang="ts">
  import { gameState } from '../../../../lib/state.svelte';
  import DeckViewer from '../../../battle/DeckViewer.svelte';

  let showDeck = $state(false);
</script>

<div class="deck-zone">
  <div class="deck-info-box">
    <div class="deck-count">Deck: {gameState.combat.battleDeck.length}</div>
    <button class="deck-view-btn" onclick={() => (showDeck = !showDeck)}>VIEW DECK</button>
  </div>
</div>

{#if showDeck}
  <div
    class="modal-overlay"
    role="button"
    tabindex="0"
    onclick={() => (showDeck = false)}
    onkeydown={(e) => e.key === 'Escape' && (showDeck = false)}
  >
    <div
      class="modal-content"
      role="dialog"
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
    >
      <DeckViewer />
      <button class="close-btn" onclick={() => (showDeck = false)}>CLOSE</button>
    </div>
  </div>
{/if}

<style>
  .deck-zone {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    min-width: 160px;
    max-width: 200px;
  }

  .deck-info-box {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.75rem;
    background: var(--ink-light);
    border: 1px solid var(--panel-border);
    border-radius: 8px;
    align-items: center;
  }

  .deck-count {
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--parchment-dim);
    letter-spacing: 0.1em;
  }

  .deck-view-btn {
    padding: 0.4rem 0.8rem;
    background: var(--shallow);
    border: 1px solid var(--panel-border);
    color: var(--parchment);
    font-size: 0.7rem;
    font-weight: 700;
    cursor: pointer;
    border-radius: 4px;
    letter-spacing: 0.05em;
    transition: all 0.2s ease;
  }

  .deck-view-btn:hover {
    background: var(--coral);
    border-color: var(--coral);
  }

  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(10, 22, 40, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    pointer-events: auto;
  }

  .modal-content {
    background: var(--deep);
    border: 1px solid var(--panel-border);
    border-radius: 8px;
    padding: 1.5rem;
    max-width: 600px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .close-btn {
    padding: 0.5rem 1rem;
    background: var(--shallow);
    border: 1px solid var(--panel-border);
    color: var(--parchment);
    font-weight: 700;
    cursor: pointer;
    border-radius: 4px;
    align-self: center;
    transition: all 0.2s ease;
  }

  .close-btn:hover {
    background: var(--coral);
    border-color: var(--coral);
  }
</style>
