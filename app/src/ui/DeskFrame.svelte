<script lang="ts">
  // Composition root: static zone geography (FR-1/D4) — board center, named
  // fixed cells around it; zones never move or overlap the board. The Pixi
  // canvas mounts into the board zone (P2 renderer); HandRack + EndTurnTransport
  // are fixed-positioned siblings rendered by App.svelte.
  import '../app.css';
  import type { GameSnapshot } from '../engine/contract';
  import InterestGauge from './InterestGauge.svelte';
  import LogPanel from './LogPanel.svelte';
  import PilePanel from './PilePanel.svelte';

  let {
    snapshot,
    onCanvasReady = () => {},
    onRestart = () => {},
  }: {
    snapshot: GameSnapshot | null;
    onCanvasReady?: (host: HTMLElement) => void;
    onRestart?: () => void;
  } = $props();

  let canvasHost: HTMLDivElement;

  $effect(() => {
    const host = canvasHost;
    if (host) onCanvasReady(host);
  });
</script>

<main class="desk-frame" aria-label="Tactical battle desk">
  <div class="watermark" aria-hidden="true"></div>

  <header class="field-readout" aria-label="Field status">
    <p class="field-register">FIELD REGISTER</p>
    <h1>{snapshot?.phase === 'enemy' ? 'THE CITY ABOVE — human division collecting' : 'OPERATOR LIVE'}</h1>
    <p class="turn-readout">TURN {snapshot?.turn ?? '—'} · {snapshot?.mana ?? 0} MANA</p>
  </header>

  <InterestGauge {snapshot} />
  <PilePanel {snapshot} />

  <section class="board-shell" aria-label="Tactical grid board">
    <div class="board-cap" aria-hidden="true"><span>9 × 5 TACTICAL FIELD</span><i></i><span>LIVE CANVAS</span></div>
    <div bind:this={canvasHost} class="board-zone" aria-label="Tactical board canvas mount">
      <div class="board-placeholder" aria-hidden="true"><span>BOARD RENDER RESERVATION</span></div>
    </div>
  </section>

  <LogPanel {snapshot} />

  {#if snapshot?.winner || snapshot?.foreclosed}
    <section class="end-state" class:victory={snapshot.winner === 'player'} role="alert" aria-live="polite">
      {#if snapshot.foreclosed || snapshot.winner === 'enemy'}
        <strong>FORECLOSURE</strong><span>BALLOON ORDER SERVED — Guppy the Debtor</span>
      {:else}
        <strong>ACCOUNT SETTLED</strong><span>GUPPY REACHES THE BOWL — sanctuary, for now</span>
      {/if}
      <button type="button" class="restart" onclick={() => onRestart()}>RESTART</button>
    </section>
  {/if}
</main>

<style>
  .desk-frame {
    position: relative;
    isolation: isolate;
    min-height: 100svh;
    padding: clamp(0.75rem, 1.8vw, 1.75rem);
    display: grid;
    grid-template-columns: minmax(10.5rem, 0.72fr) minmax(0, 2.35fr) minmax(10.5rem, 0.72fr);
    grid-template-rows: auto minmax(18rem, 1fr) auto;
    grid-template-areas:
      "field field field"
      "economy board log"
      "piles . .";
    gap: clamp(0.75rem, 1.5vw, 1.25rem);
    overflow: clip;
  }
  .watermark {
    position: absolute;
    z-index: -1;
    inset: 0;
    pointer-events: none;
    opacity: 0.42;
    background-image:
      linear-gradient(90deg, transparent 49.7%, rgb(181 255 243 / 0.08) 50%, transparent 50.3%),
      linear-gradient(0deg, transparent 49.7%, rgb(181 255 243 / 0.06) 50%, transparent 50.3%);
    background-size: clamp(6rem, 10vw, 11rem) clamp(6rem, 10vw, 11rem);
    mask-image: radial-gradient(ellipse at center, black, transparent 75%);
  }
  .field-readout {
    grid-area: field;
    display: flex;
    align-items: baseline;
    gap: var(--space-3);
    min-width: 0;
    border-bottom: 1px solid var(--line-quiet);
    padding: 0 0 var(--space-3);
  }
  .field-readout p, .field-readout h1 { margin: 0; }
  .field-register { color: var(--move-light); font: 700 0.68rem/1 var(--font-readout); letter-spacing: 0.1em; white-space: nowrap; }
  .field-readout h1 { font: 700 clamp(0.9rem, 0.76rem + 0.6vw, 1.25rem)/1.1 var(--font-display); letter-spacing: 0.04em; color: var(--ivory); }
  .turn-readout { margin-left: auto; color: var(--ivory-muted); font: 700 0.68rem/1 var(--font-readout); letter-spacing: 0.1em; white-space: nowrap; }

  .board-shell { grid-area: board; min-width: 0; min-height: 0; align-self: center; display: grid; gap: var(--space-2); }
  .board-cap { display: flex; align-items: center; gap: var(--space-2); color: var(--steel-light); font: 700 0.65rem var(--font-readout); letter-spacing: 0.1em; }
  .board-cap i { height: 1px; flex: 1; background: var(--line-quiet); }
  .board-zone {
    position: relative;
    width: min(100%, calc(min(52vh, 490px) * 1.8));
    max-height: min(52vh, 490px);
    aspect-ratio: 9 / 5;
    justify-self: center;
    overflow: hidden;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-panel);
    background: radial-gradient(ellipse at 50% 46%, var(--ground-wet), var(--ground-deep) 70%);
    box-shadow: var(--shadow-deep), inset 0 0 0 4px rgb(7 16 22 / 0.55);
  }
  .board-placeholder {
    position: absolute;
    inset: 0.55rem;
    display: grid;
    place-items: center;
    border: 1px dashed rgb(181 255 243 / 0.25);
    color: rgb(181 255 243 / 0.45);
    font: 700 0.67rem var(--font-readout);
    letter-spacing: 0.15em;
  }
  .end-state {
    position: fixed;
    z-index: 3;
    inset: auto 50% 4rem auto;
    transform: translateX(50%);
    width: min(31rem, calc(100vw - 2rem));
    display: grid;
    gap: 0.35rem;
    padding: 1rem 1.25rem;
    color: var(--ivory);
    background: var(--panel-ink);
    border: 1px solid var(--signal-red);
    border-radius: var(--radius-panel);
    box-shadow: var(--shadow-deep);
    text-align: center;
  }
  .end-state strong { color: var(--signal-red-light); font: 800 1rem var(--font-display); letter-spacing: 0.12em; }
  .end-state span { font: 0.8rem var(--font-readout); }
  .end-state.victory { border-color: var(--success); }
  .end-state.victory strong { color: var(--success); }
  .restart {
    justify-self: center;
    margin-top: 0.4rem;
    padding: 0.5rem 1.4rem;
    color: var(--ink);
    background: var(--action);
    border: 1px solid var(--action-light);
    border-radius: var(--radius-tight);
    font: 800 0.75rem var(--font-display);
    letter-spacing: 0.08em;
  }
  .restart:hover { filter: brightness(1.08); }

  @media (max-width: 800px) {
    .desk-frame {
      min-height: 100svh;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      grid-template-rows: auto auto auto auto auto;
      grid-template-areas:
        "field field"
        "economy piles"
        "board board"
        "log log";
    }
    .field-readout { flex-wrap: wrap; }
    .turn-readout { margin-left: 0; }
  }
  @media (max-width: 520px) {
    .desk-frame {
      grid-template-columns: 1fr;
      grid-template-areas: "field" "economy" "piles" "board" "log";
    }
    .board-zone { width: 100%; }
  }
</style>
