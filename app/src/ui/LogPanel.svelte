<script lang="ts">
  // BULLETIN (FR-8): last 6 engine-owned log lines, verbatim. Lines ending
  // "is sunk." carry the compact steel/ink balloon filing bullet (death mark).
  import type { GameSnapshot } from '../engine/contract';

  let { snapshot }: { snapshot: GameSnapshot | null } = $props();
</script>

<aside class="log-zone zone-panel" aria-label="Bulletin">
  <p class="zone-title">BULLETIN</p>
  <ol>
    {#each (snapshot?.log ?? []).slice(-6) as line}
      <li>
        {#if line.endsWith('is sunk.')}
          <svg class="balloon-mark" viewBox="0 0 16 20" aria-hidden="true"><path d="M8 1.5c-3.3 0-5.5 2.8-5.5 6.2 0 3.1 1.9 5.4 4.4 6l-.6 3.3L8 15.8l1.7 1.2-.6-3.3c2.5-.6 4.4-2.9 4.4-6C13.5 4.3 11.3 1.5 8 1.5Z" /></svg>
        {/if}
        <span>{line}</span>
      </li>
    {/each}
    {#if !(snapshot?.log?.length)}<li class="log-empty">No filing entered.</li>{/if}
  </ol>
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
  ol {
    min-height: 0;
    margin: 0;
    padding: var(--space-2) var(--space-3) var(--space-3);
    overflow: auto;
    list-style: none;
  }
  li {
    display: flex;
    gap: 0.35rem;
    padding: 0.28rem 0;
    color: var(--ivory-muted);
    font-size: 0.78rem;
    line-height: 1.35;
    border-bottom: 1px solid rgb(169 193 194 / 0.08);
  }
  .balloon-mark {
    flex: 0 0 0.75rem;
    width: 0.75rem;
    margin-top: 0.12rem;
    fill: var(--steel-light);
  }
  .log-empty { font-style: italic; }
</style>
