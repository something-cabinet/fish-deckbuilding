<script lang="ts">
  // Economy ledger (FR-9 economy read): coins, interest due, foreclosure
  // deadline. The foreclosure row carries the balloon glyph — the deadline is
  // the execution.
  import type { GameSnapshot } from '../engine/contract';

  let { snapshot }: { snapshot: GameSnapshot | null } = $props();
</script>

<aside class="economy-zone zone-panel" aria-label="Economy ledger">
  <p class="zone-title">LEDGER</p>
  <dl>
    <div><dt>COIN</dt><dd>{snapshot?.coins ?? 0}</dd></div>
    <div><dt>INTEREST DUE</dt><dd>{snapshot?.interestDue ?? 0}</dd></div>
    <div class:foreclosure={snapshot?.foreclosed}>
      <dt>FORECLOSURE</dt>
      <dd class="foreclosure-row">
        <svg class="balloon-glyph" viewBox="0 0 16 20" aria-hidden="true"><path d="M8 1.5c-3.3 0-5.5 2.8-5.5 6.2 0 3.1 1.9 5.4 4.4 6l-.6 3.3L8 15.8l1.7 1.2-.6-3.3c2.5-.6 4.4-2.9 4.4-6C13.5 4.3 11.3 1.5 8 1.5Z" /></svg>
        <span>TURN 16</span>
      </dd>
    </div>
  </dl>
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
  dl { margin: 0; padding: var(--space-2) var(--space-3); }
  dl div { display: flex; justify-content: space-between; align-items: center; gap: var(--space-2); padding: 0.42rem 0; border-bottom: 1px solid rgb(169 193 194 / 0.1); }
  dl div:last-child { border: 0; }
  dt { color: var(--ivory-muted); font: 600 0.67rem var(--font-readout); letter-spacing: 0.07em; }
  dd { margin: 0; color: var(--ivory); font: 700 0.9rem var(--font-readout); }
  .foreclosure dd, .foreclosure dt { color: var(--signal-red-light); }
  .foreclosure-row { display: flex; align-items: center; gap: 0.35rem; }
  .balloon-glyph { width: 0.7rem; fill: currentColor; }
</style>
