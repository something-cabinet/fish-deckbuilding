<script lang="ts">
  // RECORD STACKS (FR-2 pile UX): fixed deck/discard stacks with live counts.
  // Click toggles a compact card-list popover (StS/Talishar pile preview).
  import type { CardInstance, GameSnapshot } from '../engine/contract';
  import { cardDef } from '../engine/cards';

  let { snapshot }: { snapshot: GameSnapshot | null } = $props();

  let openPile: 'deck' | 'discard' | null = null;

  function pileCards(): CardInstance[] {
    return openPile === 'deck' ? (snapshot?.deck ?? []) : (snapshot?.discard ?? []);
  }
</script>

<aside class="pile-zone zone-panel" aria-label="Card piles">
  <p class="zone-title">RECORD STACKS</p>
  <div class="pile-row">
    <button
      class="pile deck-pile"
      class:open={openPile === 'deck'}
      type="button"
      aria-label={`Deck: ${snapshot?.deck.length ?? 0} cards`}
      aria-expanded={openPile === 'deck'}
      onclick={() => (openPile = openPile === 'deck' ? null : 'deck')}
    >
      <span class="pile-sheets" aria-hidden="true"></span><span>DECK</span><strong>{snapshot?.deck.length ?? 0}</strong>
    </button>
    <button
      class="pile discard-pile"
      class:open={openPile === 'discard'}
      type="button"
      aria-label={`Discard: ${snapshot?.discard.length ?? 0} cards`}
      aria-expanded={openPile === 'discard'}
      onclick={() => (openPile = openPile === 'discard' ? null : 'discard')}
    >
      <span class="pile-sheets" aria-hidden="true"></span><span>DISCARD</span><strong>{snapshot?.discard.length ?? 0}</strong>
    </button>
  </div>
  {#if openPile}
    <div class="pile-popover" role="listbox" aria-label={`${openPile === 'deck' ? 'Deck' : 'Discard'} contents`}>
      {#if pileCards().length === 0}
        <p class="pile-empty">Empty.</p>
      {:else}
        <ol>
          {#each pileCards().slice(0, 20) as card}
            <li>{cardDef(card.cardUid).name}</li>
          {/each}
          {#if pileCards().length > 20}<li class="pile-more">+{pileCards().length - 20} more</li>{/if}
        </ol>
      {/if}
    </div>
  {/if}
</aside>

<style>
  .zone-panel {
    min-width: 0;
    background: linear-gradient(150deg, rgb(29 57 69 / 0.88), rgb(13 29 38 / 0.84));
    border: 1px solid var(--line-quiet);
    border-radius: var(--radius-panel);
    box-shadow: var(--shadow-panel);
  }
  .zone-title {
    margin: 0;
    padding: var(--space-3) var(--space-3) var(--space-2);
    color: var(--steel-light);
    font: 700 0.68rem/1 var(--font-readout);
    letter-spacing: 0.1em;
    border-bottom: 1px solid var(--line-quiet);
  }
  .pile-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); padding: var(--space-3); gap: var(--space-2); }
  .pile {
    position: relative;
    min-width: 0;
    min-height: 5.5rem;
    display: grid;
    place-items: end start;
    padding: 0.55rem;
    color: var(--ivory);
    text-align: left;
    background: var(--panel-ink);
    border: 1px solid var(--steel);
    border-radius: var(--radius-tight);
    box-shadow: 3px -3px 0 var(--ground-deep), 6px -6px 0 var(--panel-steel);
  }
  .pile:hover, .pile.open { border-color: var(--move); }
  .pile strong {
    position: absolute;
    top: 0.35rem;
    right: 0.4rem;
    min-width: 1.4rem;
    padding: 0.1rem 0.25rem;
    color: var(--ink);
    background: var(--ivory);
    text-align: center;
    border-radius: 999px;
    font: 700 0.73rem var(--font-readout);
  }
  .pile span:not(.pile-sheets) { font: 700 0.68rem/1 var(--font-readout); letter-spacing: 0.1em; }
  .pile-sheets { position: absolute; inset: 0.5rem 0.55rem auto; height: 0.55rem; background: linear-gradient(90deg, var(--panel-steel), var(--steel)); border-radius: 2px; opacity: 0.7; }
  .pile-popover { margin: 0 var(--space-3) var(--space-3); padding: var(--space-2) var(--space-3); background: var(--panel-ink); border: 1px solid var(--steel); border-radius: var(--radius-tight); max-height: 9rem; overflow: auto; }
  ol { margin: 0; padding: 0; list-style: none; }
  li { padding: 0.18rem 0; color: var(--ivory-muted); font: 0.68rem var(--font-readout); border-bottom: 1px solid rgb(169 193 194 / 0.08); }
  li:last-child { border: 0; }
  .pile-empty { margin: 0; color: var(--ivory-muted); font-style: italic; font-size: 0.72rem; }
  .pile-more { color: var(--steel-light); }
</style>
